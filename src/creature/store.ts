// Creature Keeper — per-profile save store, cloud-synced like every
// other game. Hatches a starter on first launch so the player has
// something to care for from minute one.

import { useEffect, useState } from "react";
import type { Creature, CreatureSave, CreatureStats } from "./types";
import { freshNeeds, xpForLevel, EVO_LEVELS } from "./types";
import { getSpecies, rollStarter } from "./catalog";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

const BLOB_KEY = "creature_save_v1";
function lsKey(): string { return profileKey(`dd_${BLOB_KEY}`); }

const PERSONALITIES = ["playful", "stoic", "shy", "bold", "loyal", "curious"] as const;
function rollPersonality(): typeof PERSONALITIES[number] {
  return PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
}

/** Roll the starter creature for a fresh profile. */
function rollStarterCreature(): Creature {
  const species = rollStarter();
  return makeCreatureFor(species.id);
}

/** Make a freshly-hatched creature of the given species. */
export function makeCreatureFor(speciesId: string): Creature {
  const sp = getSpecies(speciesId);
  if (!sp) throw new Error(`Unknown species ${speciesId}`);
  const variant = Math.random() < 0.03;  // ~3% shiny
  const stats: CreatureStats = {
    hp: 40, attack: 10, defense: 8, speed: 9, special: 9, energy: 30,
  };
  return {
    id: `crt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    speciesId,
    nickname: sp.stageNames[0],
    stage: 0,
    level: 1, xp: 0, bond: 10,
    personality: rollPersonality(),
    variant,
    stats,
    learnedMoveIds: sp.movesByStage[0],
    activeMoveIds: sp.movesByStage[0].slice(0, 4),
    needs: freshNeeds(),
    careStreak: 0,
    bornAt: Date.now(),
    modifiedAt: Date.now(),
  };
}

function defaultSave(profileId: string): CreatureSave {
  // Fresh saves start empty — the player picks one of three starters
  // via the StarterPicker overlay on the hub.
  return {
    profileId,
    activeIds: [],
    archive: [],
    items: { food_basic: 5, treat: 2, soap: 3, potion: 1 },
    wins: 0, losses: 0,
    achievements: [],
    berries: 30,
    habitatId: "meadow",
    seenSpeciesIds: [],
    pickedStarter: false,
    modifiedAt: Date.now(),
  };
}

function loadSave(profileId: string): CreatureSave {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return defaultSave(profileId);
    const parsed = JSON.parse(raw);
    const merged: CreatureSave = { ...defaultSave(profileId), ...parsed };
    // Backfill fields added after the original save was created.
    if (typeof merged.berries !== "number") merged.berries = 30;
    if (typeof merged.habitatId !== "string") merged.habitatId = "meadow";
    if (!Array.isArray(merged.seenSpeciesIds)) merged.seenSpeciesIds = [];
    if (!Array.isArray(merged.archive)) merged.archive = [];
    if (!Array.isArray(merged.activeIds)) merged.activeIds = [];
    // Migration: any pre-starter-flow save with creatures in the archive
    // counts as already-picked. Empty archives need the picker.
    if (typeof merged.pickedStarter !== "boolean") {
      merged.pickedStarter = merged.archive.length > 0;
    }
    return merged;
  } catch { return defaultSave(profileId); }
}

function persist(save: CreatureSave): void {
  try { localStorage.setItem(lsKey(), JSON.stringify(save)); } catch { /* ignore */ }
  try { cloudSet(save.profileId, BLOB_KEY, save); } catch { /* ignore */ }
}

/** Apply gentle time-based needs decay. Called on load + at intervals
 *  from the hub. Decay is mild — neglect makes creatures sad/sick,
 *  never punishing for the kid. */
function applyDecay(save: CreatureSave): CreatureSave {
  const now = Date.now();
  const elapsedHours = (now - save.modifiedAt) / 3_600_000;
  if (elapsedHours <= 0) return save;
  const archive = save.archive.map(c => {
    if (!save.activeIds.includes(c.id)) return c; // archived ones don't decay
    const decay = Math.min(1, elapsedHours / 6);   // cap to 1/6 of full bar per stale hour
    const n = c.needs;
    return {
      ...c,
      needs: {
        hunger:      Math.max(0, n.hunger      - decay * 22),
        happiness:   Math.max(0, n.happiness   - decay * 14),
        energy:      Math.max(0, n.energy      - decay * 10),
        cleanliness: Math.max(0, n.cleanliness - decay * 12),
        health:      Math.max(20, n.health     - (n.hunger < 20 || n.cleanliness < 20 ? decay * 8 : 0)),
      },
    };
  });
  return { ...save, archive, modifiedAt: now };
}

export type CareAction = "feed" | "play" | "clean" | "rest" | "heal";
const CARE_EFFECT: Record<CareAction, Partial<Creature["needs"]>> = {
  feed:  { hunger: +28, happiness: +4 },
  play:  { happiness: +22, energy: -6, bond: +0 } as never, // bond bumped separately
  clean: { cleanliness: +30, happiness: +6 },
  rest:  { energy: +30, happiness: +2 },
  heal:  { health: +40, happiness: +4 },
};

const BOND_BUMP: Record<CareAction, number> = {
  feed: 1, play: 3, clean: 1, rest: 1, heal: 2,
};

export function useCreature() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [save, setSave] = useState<CreatureSave>(() => applyDecay(loadSave(pid ?? "guest")));
  useEffect(() => setSave(applyDecay(loadSave(pid ?? "guest"))), [pid]);

  // Live cloud subscribe
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<CreatureSave>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch { /* ignore */ }
      setSave(applyDecay(remote));
    });
  }, [pid]);

  function update(mutator: (s: CreatureSave) => CreatureSave) {
    setSave(prev => {
      const next = { ...mutator(prev), modifiedAt: Date.now() };
      persist(next);
      return next;
    });
  }

  return {
    save,
    activeCreatures: save.activeIds
      .map(id => save.archive.find(c => c.id === id))
      .filter((c): c is Creature => !!c),

    /** Apply a care action to the named creature. */
    careFor(creatureId: string, action: CareAction) {
      update(s => {
        const archive = s.archive.map(c => {
          if (c.id !== creatureId) return c;
          const eff = CARE_EFFECT[action];
          const needs = { ...c.needs };
          for (const k of Object.keys(eff) as Array<keyof typeof eff>) {
            const v = eff[k];
            if (typeof v === "number") {
              const target = k as keyof Creature["needs"];
              needs[target] = Math.max(0, Math.min(100, needs[target] + v));
            }
          }
          return {
            ...c, needs, bond: Math.min(100, c.bond + BOND_BUMP[action]),
            modifiedAt: Date.now(),
          };
        });
        return { ...s, archive };
      });
    },

    /** Award xp to a creature; level up + evolve if thresholds hit. */
    awardXp(creatureId: string, amount: number) {
      update(s => {
        const archive = s.archive.map(c => {
          if (c.id !== creatureId) return c;
          let { xp, level, stage, stats, learnedMoveIds, activeMoveIds } = c;
          xp += amount;
          while (xp >= xpForLevel(level + 1) && level < 100) {
            xp -= xpForLevel(level + 1);
            level += 1;
            stats = { ...stats,
              hp: stats.hp + 4, attack: stats.attack + 2,
              defense: stats.defense + 2, speed: stats.speed + 1,
              special: stats.special + 2, energy: stats.energy + 2,
            };
            // Evolve?
            const sp = getSpecies(c.speciesId);
            if (sp && stage < 2) {
              const gate = EVO_LEVELS[stage as 0 | 1];
              if (level >= gate) {
                stage = (stage + 1) as 1 | 2;
                const newMoves = sp.movesByStage[stage].filter(m => !learnedMoveIds.includes(m));
                learnedMoveIds = [...learnedMoveIds, ...newMoves];
                if (activeMoveIds.length < 4) {
                  activeMoveIds = [...activeMoveIds, ...newMoves].slice(0, 4);
                }
              }
            }
          }
          return { ...c, xp, level, stage, stats, learnedMoveIds, activeMoveIds, modifiedAt: Date.now() };
        });
        return { ...s, archive };
      });
    },

    renameCreature(creatureId: string, nickname: string) {
      update(s => ({
        ...s,
        archive: s.archive.map(c => c.id === creatureId ? { ...c, nickname, modifiedAt: Date.now() } : c),
      }));
    },

    /** Swap an active slot for an archived creature. */
    setActiveSlot(slot: 0 | 1 | 2, creatureId: string | null) {
      update(s => {
        const next = s.activeIds.slice() as string[];
        if (creatureId === null) next.splice(slot, 1);
        else next[slot] = creatureId;
        return { ...s, activeIds: next.slice(0, 3) };
      });
    },

    /** Pokemon-style starter selection. One-time on a fresh save: the
     *  player picks one of three offered species. After this returns
     *  pickedStarter flips to true so the picker disappears. */
    chooseStarter(speciesId: string) {
      update(s => {
        if (s.pickedStarter) return s;
        const fresh = makeCreatureFor(speciesId);
        return {
          ...s,
          archive: [...s.archive, fresh],
          activeIds: [fresh.id],
          seenSpeciesIds: s.seenSpeciesIds.includes(speciesId)
            ? s.seenSpeciesIds
            : [...s.seenSpeciesIds, speciesId],
          pickedStarter: true,
        };
      });
    },

    /** Catch-on-win: when the player defeats a wild creature, add a fresh
     *  level-1 copy of that species to the archive (if they don't already
     *  have any of that species). */
    catchCreature(speciesId: string) {
      update(s => {
        const owned = s.archive.some(c => c.speciesId === speciesId);
        if (owned) return s; // No duplicates from the catch-on-win flow.
        const fresh = makeCreatureFor(speciesId);
        return {
          ...s,
          archive: [...s.archive, fresh],
          activeIds: s.activeIds.length < 3 ? [...s.activeIds, fresh.id] : s.activeIds,
          seenSpeciesIds: s.seenSpeciesIds.includes(speciesId)
            ? s.seenSpeciesIds
            : [...s.seenSpeciesIds, speciesId],
        };
      });
    },

    /** Hatch a new creature into the archive (and slot it active if room). */
    hatchNew(speciesId: string) {
      update(s => {
        const fresh = makeCreatureFor(speciesId);
        const archive = [...s.archive, fresh];
        const activeIds = s.activeIds.length < 3 ? [...s.activeIds, fresh.id] : s.activeIds;
        return { ...s, archive, activeIds };
      });
    },

    /** Buy a stack of an item with berries. No-op if not enough berries. */
    buyItem(itemId: string, price: number) {
      update(s => {
        if (s.berries < price) return s;
        const items = { ...s.items, [itemId]: (s.items[itemId] ?? 0) + 1 };
        return { ...s, items, berries: s.berries - price };
      });
    },

    /** Use a hub-level care item on a creature. Subtracts from inventory. */
    useCareItem(creatureId: string, itemId: string, needs: Partial<Creature["needs"]>, bondBump?: number) {
      update(s => {
        const have = s.items[itemId] ?? 0;
        if (have <= 0) return s;
        const items = { ...s.items, [itemId]: have - 1 };
        const archive = s.archive.map(c => {
          if (c.id !== creatureId) return c;
          const next = { ...c.needs };
          for (const k of Object.keys(needs) as Array<keyof typeof needs>) {
            const v = needs[k];
            if (typeof v === "number") {
              next[k as keyof Creature["needs"]] = Math.max(0, Math.min(100, (c.needs[k as keyof Creature["needs"]] as number) + v));
            }
          }
          return { ...c, needs: next, bond: Math.min(100, c.bond + (bondBump ?? 0)), modifiedAt: Date.now() };
        });
        return { ...s, items, archive };
      });
    },

    /** Set the active habitat. Unlock-gated by berries — buys it on demand. */
    setHabitat(habitatId: string, unlockCost: number) {
      update(s => {
        // Already unlocked / free → just switch.
        if (unlockCost === 0 || s.berries >= unlockCost) {
          const berries = unlockCost > 0 && s.habitatId !== habitatId ? s.berries - unlockCost : s.berries;
          // Heuristic: charge only on first switch. We track "unlocks" implicitly
          // by storing a one-time flag in items under a habitat key.
          const habitatKey = `habitat_${habitatId}`;
          const owned = (s.items[habitatKey] ?? 0) > 0;
          if (owned || unlockCost === 0) {
            return { ...s, habitatId };
          }
          return {
            ...s,
            habitatId,
            berries,
            items: { ...s.items, [habitatKey]: 1 },
          };
        }
        return s;
      });
    },

    /** Resolve a finished battle — credit berries/xp, post a win/loss.
     *  Kid-friendly tuning: a loss still awards ~30% of the XP so kids
     *  who get steamrolled still feel progress every fight. */
    finishBattle(creatureId: string, won: boolean, berries: number, xp: number, dropId?: string) {
      update(s => {
        const archive = s.archive.map(c => {
          if (c.id !== creatureId) return c;
          let nextXp = c.xp;
          let nextLvl = c.level;
          let nextStage = c.stage;
          let nextStats = c.stats;
          let learnedMoves = c.learnedMoveIds;
          let activeMoves = c.activeMoveIds;
          // Award XP on win OR consolation XP on loss.
          const xpGained = won ? xp : Math.max(6, Math.round(xp * 0.3));
          {
            nextXp += xpGained;
            while (nextXp >= xpForLevel(nextLvl + 1) && nextLvl < 100) {
              nextXp -= xpForLevel(nextLvl + 1);
              nextLvl += 1;
              nextStats = { ...nextStats,
                hp: nextStats.hp + 4, attack: nextStats.attack + 2,
                defense: nextStats.defense + 2, speed: nextStats.speed + 1,
                special: nextStats.special + 2, energy: nextStats.energy + 2,
              };
              const sp = getSpecies(c.speciesId);
              if (sp && nextStage < 2) {
                const gate = EVO_LEVELS[nextStage as 0 | 1];
                if (nextLvl >= gate) {
                  nextStage = (nextStage + 1) as 1 | 2;
                  const newMoves = sp.movesByStage[nextStage].filter(m => !learnedMoves.includes(m));
                  learnedMoves = [...learnedMoves, ...newMoves];
                  if (activeMoves.length < 4) {
                    activeMoves = [...activeMoves, ...newMoves].slice(0, 4);
                  }
                }
              }
            }
          }
          return {
            ...c,
            xp: nextXp, level: nextLvl, stage: nextStage,
            stats: nextStats, learnedMoveIds: learnedMoves, activeMoveIds: activeMoves,
            // After a battle the creature is a bit tired + hungry.
            needs: {
              ...c.needs,
              energy: Math.max(20, c.needs.energy - 18),
              hunger: Math.max(10, c.needs.hunger - 12),
              happiness: won ? Math.min(100, c.needs.happiness + 10) : Math.max(20, c.needs.happiness - 8),
            },
            bond: won ? Math.min(100, c.bond + 1) : c.bond,
            modifiedAt: Date.now(),
          };
        });
        const items = dropId ? { ...s.items, [dropId]: (s.items[dropId] ?? 0) + 1 } : s.items;
        return {
          ...s,
          archive,
          items,
          berries: won ? s.berries + berries : s.berries,
          wins: won ? s.wins + 1 : s.wins,
          losses: won ? s.losses : s.losses + 1,
        };
      });
    },

    /** Track a species the player has fought, for the future Pokedex view. */
    markSeen(speciesId: string) {
      update(s => {
        if (s.seenSpeciesIds.includes(speciesId)) return s;
        return { ...s, seenSpeciesIds: [...s.seenSpeciesIds, speciesId] };
      });
    },

    /** Breeding: combine two parents into a fresh baby. Inherits species
     *  from one parent (50/50), gets a small stat bump from the other. */
    breed(parentAId: string, parentBId: string, cost: number) {
      update(s => {
        const a = s.archive.find(c => c.id === parentAId);
        const b = s.archive.find(c => c.id === parentBId);
        if (!a || !b || a.id === b.id) return s;
        if (s.berries < cost) return s;
        if (a.bond < 40 || b.bond < 40) return s; // friendship gate
        // Pick a parent for species (favor the higher-level one slightly).
        const speciesParent = a.level >= b.level
          ? (Math.random() < 0.6 ? a : b)
          : (Math.random() < 0.4 ? a : b);
        const otherParent = speciesParent === a ? b : a;
        const fresh = makeCreatureFor(speciesParent.speciesId);
        // Inherit a bond/stat boost from the other parent.
        const inheritBoost = Math.floor((otherParent.level - 1) / 2);
        const baby: Creature = {
          ...fresh,
          parentIds: [a.id, b.id],
          stats: {
            ...fresh.stats,
            hp: fresh.stats.hp + inheritBoost * 2,
            attack: fresh.stats.attack + inheritBoost,
            defense: fresh.stats.defense + inheritBoost,
          },
          // Variant chance bumped if EITHER parent is a variant.
          variant: (a.variant || b.variant) ? Math.random() < 0.18 : Math.random() < 0.03,
        };
        return {
          ...s,
          archive: [...s.archive, baby],
          activeIds: s.activeIds.length < 3 ? [...s.activeIds, baby.id] : s.activeIds,
          berries: s.berries - cost,
        };
      });
    },

    /** Training: award XP from a mini-game; consumes some energy. */
    train(creatureId: string, xpEarned: number) {
      update(s => {
        const archive = s.archive.map(c => {
          if (c.id !== creatureId) return c;
          let xp = c.xp + xpEarned;
          let level = c.level;
          let stage = c.stage;
          let stats = c.stats;
          let learned = c.learnedMoveIds;
          let active = c.activeMoveIds;
          while (xp >= xpForLevel(level + 1) && level < 100) {
            xp -= xpForLevel(level + 1);
            level += 1;
            stats = { ...stats,
              hp: stats.hp + 4, attack: stats.attack + 2,
              defense: stats.defense + 2, speed: stats.speed + 1,
              special: stats.special + 2, energy: stats.energy + 2,
            };
            const sp = getSpecies(c.speciesId);
            if (sp && stage < 2) {
              const gate = EVO_LEVELS[stage as 0 | 1];
              if (level >= gate) {
                stage = (stage + 1) as 1 | 2;
                const newMoves = sp.movesByStage[stage].filter(m => !learned.includes(m));
                learned = [...learned, ...newMoves];
                if (active.length < 4) active = [...active, ...newMoves].slice(0, 4);
              }
            }
          }
          return {
            ...c,
            xp, level, stage, stats, learnedMoveIds: learned, activeMoveIds: active,
            needs: {
              ...c.needs,
              energy: Math.max(10, c.needs.energy - 22),
              hunger: Math.max(8, c.needs.hunger - 8),
            },
            modifiedAt: Date.now(),
          };
        });
        return { ...s, archive };
      });
    },

    /** Link a creature to an Olympus hero for cross-game bond. */
    linkHero(creatureId: string, heroId: string | null) {
      update(s => ({
        ...s,
        archive: s.archive.map(c => c.id === creatureId
          ? { ...c, linkedHeroId: heroId ?? undefined, modifiedAt: Date.now() }
          : c),
      }));
    },
  };
}
