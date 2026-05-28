// Olympus store — heroes + adventures + live save indicator.
// Each mutation writes to IndexedDB immediately (per the prompt's "live
// save every action" mandate). Firebase cloud sync would slot in here as
// a sibling write when wired up.
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Adventure, BaseChestItem, BaseInventoryCategory, BondStory, EchoVerse, Hero, OlympusClass, Scene, SaveStatus } from "./types";
import { generateBondStory, generateCityRumors, generateDream, generateEcho } from "./ai";
import { getStage, xpForLevel, xpRewardFor, canEvolve, EVOLUTION_LEVELS } from "./companions";
import {
  saveOlympusHero, loadOlympusHero, listOlympusHeroes, deleteOlympusHero,
  saveOlympusAdventure, loadOlympusAdventure, listAdventuresForHero,
} from "../db/dexie";
import { awardBlessing } from "./blessings";
import { pushHero, deleteHeroFromCloud, pushAdventure, subscribeHeroes, subscribeAdventures } from "../sync/heroes";
import { getRoomCode } from "../sync/firebase";

/** Fan-out write: Dexie + Firestore in parallel. Firestore push is best-effort. */
async function saveHeroEverywhere(hero: Hero): Promise<void> {
  await saveOlympusHero(hero);
  pushHero(hero).catch(() => {});
}
async function deleteHeroEverywhere(heroId: string): Promise<void> {
  await deleteOlympusHero(heroId);
  deleteHeroFromCloud(heroId).catch(() => {});
}
async function saveAdventureEverywhere(adv: Adventure): Promise<void> {
  await saveOlympusAdventure(adv);
  pushAdventure(adv).catch(() => {});
}

/** Merge remote heroes into local. Newer copy (by modifiedAt) wins. */
function mergeHeroLists(local: Hero[], remote: Hero[]): Hero[] {
  const byId = new Map<string, Hero>();
  for (const h of local) byId.set(h.id, h);
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) { byId.set(r.id, r); continue; }
    if ((r.modifiedAt ?? 0) > (l.modifiedAt ?? 0)) byId.set(r.id, r);
  }
  return Array.from(byId.values()).sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
}

/** Backfill heroes saved before the v2 class/stat restructure:
 *  - Map removed classes (mystic/bard/sailor/athlete/healer/wanderer)
 *    onto their closest surviving equivalent so existing characters
 *    keep working without losing identity.
 *  - Default the 5 new stat fields (intuition/courage/craft/heritage/
 *    magic) to 1 if missing.
 *  Idempotent. */
/** Backfill stale heroes onto the current class/stat schema. Idempotent. */
function migrateHero(h: Hero): Hero {
  const removed: Record<string, OlympusClass> = {
    mystic: "oracle", bard: "rogue", sailor: "warrior",
    athlete: "champion", healer: "oracle", wanderer: "scholar",
  };
  const rawClass = (h.className as unknown as string) ?? "warrior";
  const className: OlympusClass = (rawClass in removed
    ? removed[rawClass]
    : rawClass) as OlympusClass;
  // Canonical 8 stats. Older 11-attr saves drop courage/craft/heritage
  // (their values get folded into adjacent surviving stats); 6-attr
  // saves get intuition/magic defaulted to 1.
  const s = (h.stats ?? {}) as any;
  const cap = (n: number) => Math.min(100, Math.max(0, n | 0));
  const stats = {
    strength:  cap(s.strength  ?? 1),
    agility:   cap((s.agility ?? 1) + (s.craft ?? 0)),    // craft folds into agility
    wisdom:    cap(s.wisdom    ?? 1),
    charisma:  cap(s.charisma  ?? 1),
    luck:      cap(s.luck      ?? 1),
    endurance: cap((s.endurance ?? 1) + (s.courage ?? 0) + (s.heritage ?? 0)), // both fold to endurance
    intuition: cap(s.intuition ?? 1),
    magic:     cap(s.magic     ?? 1),
  };
  // Companion migration — old shape had {id, name, primary/secondary/
  // accentColor}. New shape adds {lineId, stage, level, xp, xpToNext,
  // skills}. Map the old `id` onto the new lineId where it overlaps
  // ("wolf" → "cerberus" by feel, "owl" → "owl_of_athena", etc.) and
  // default the rest to stage-1 baseline.
  let companion = h.companion as any;
  if (companion && (companion.lineId === undefined || companion.stage === undefined)) {
    const idMap: Record<string, string> = {
      wolf: "cerberus", hound: "cerberus", cerberus_pup: "cerberus",
      owl: "owl_of_athena", golden_eagle: "griffin", griffin_chick: "griffin",
      lion: "nemean_lion", leopard: "nemean_lion", panther: "nemean_lion",
      horse: "pegasus", pegasus_foal: "pegasus", centaur_friend: "centaur",
      serpent: "hydra", lizard: "hydra",
      // Default everything else to the owl of Athena — solid neutral pick.
    };
    const lineId = idMap[companion.id as string] ?? "owl_of_athena";
    companion = {
      lineId,
      stage: 1 as 1 | 2 | 3,
      name: companion.name ?? "Companion",
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(2),
      skills: [],
      primaryColor: companion.primaryColor ?? "#8B4513",
      secondaryColor: companion.secondaryColor ?? "#D4A373",
      accentColor: companion.accentColor ?? "#FFD700",
    };
  }
  const mythicArtifacts = Array.isArray((h as any).mythicArtifacts) ? (h as any).mythicArtifacts : [];

  // Equipment migration — fold legacy single `weapon` + `armor` into
  // the new slot system (meleeWeapon / rangedWeapon for weapons by
  // kind, torso for the armor). Idempotent: skipped if a new slot is
  // already populated.
  const eq = { ...(h.equipment ?? { blessings: [] }) } as any;
  if (eq.weapon && !eq.meleeWeapon && !eq.rangedWeapon) {
    if (eq.weapon.kind === "bow") eq.rangedWeapon = eq.weapon;
    else if (eq.weapon.kind === "staff" || eq.weapon.kind === "wand") eq.magicWeapon = eq.weapon;
    else eq.meleeWeapon = eq.weapon;
    delete eq.weapon;
  }
  if (eq.armor && !eq.torso) {
    eq.torso = eq.armor;
    delete eq.armor;
  }
  // Cap pack at 10 — silently trim oldest entries beyond the cap.
  // Overflow goes to the base chest under "stuff" so nothing is lost.
  const inv = Array.isArray(h.inventory) ? h.inventory : [];
  let inventory = inv;
  const base: any[] = Array.isArray((h as any).baseInventory) ? [...(h as any).baseInventory] : [];
  if (inv.length > 10) {
    const overflow = inv.slice(0, inv.length - 10);
    for (const it of overflow) {
      base.push({ id: it.id, name: it.name, category: "stuff", qty: it.qty ?? 1, description: it.description, playerKept: true });
    }
    inventory = inv.slice(-10);
  }
  const baseInventory = base;

  const sameClass = className === h.className;
  const sameStats =
    s.strength === stats.strength && s.agility === stats.agility &&
    s.wisdom === stats.wisdom && s.charisma === stats.charisma &&
    s.luck === stats.luck && s.endurance === stats.endurance &&
    s.intuition === stats.intuition && s.magic === stats.magic &&
    !("courage" in s || "craft" in s || "heritage" in s);
  const sameCompanion = companion === h.companion;
  const sameArtifacts = mythicArtifacts === (h as any).mythicArtifacts;
  const sameEq = eq === h.equipment;
  const sameInv = inventory === h.inventory;
  const sameBase = baseInventory === (h as any).baseInventory;
  if (sameClass && sameStats && sameCompanion && sameArtifacts && sameEq && sameInv && sameBase) return h;
  return { ...h, className, stats, companion, mythicArtifacts, equipment: eq, inventory, baseInventory };
}

let heroesUnsub: (() => void) | null = null;
let advUnsub: (() => void) | null = null;

interface OlympusState {
  heroes: Hero[];
  /** Currently active hero (the one in the roster header / on an adventure). */
  activeHeroId: string | null;
  /** The adventure currently being played. */
  activeAdventure: Adventure | null;
  /** Save indicator state. */
  saveStatus: SaveStatus;
  /** Timestamp of last successful save. */
  lastSavedAt: number;
  /** True once loadAll has populated the heroes list from Dexie. Pages
   *  use this to avoid flashing an empty-state on first paint. */
  hydrated: boolean;

  // Lifecycle
  loadAll: () => Promise<void>;
  setActiveHero: (heroId: string | null) => Promise<void>;

  // Hero CRUD
  upsertHero: (hero: Hero) => Promise<void>;
  archiveHero: (heroId: string) => Promise<void>;
  unarchiveHero: (heroId: string) => Promise<void>;
  deleteHero: (heroId: string) => Promise<void>;
  patchHero: (heroId: string, patch: (h: Hero) => void) => Promise<void>;

  // Adventure CRUD
  startNewAdventure: (adventure: Adventure) => Promise<void>;
  saveAdventure: (adventure: Adventure) => Promise<void>;
  appendSceneToAdventure: (sceneIndex: number, scene: Scene, history?: Adventure["history"][number]) => Promise<void>;
  loadAdventure: (id: string) => Promise<Adventure | null>;
  abandonActiveAdventure: () => Promise<void>;
  completeActiveAdventure: () => Promise<void>;
  /** Ensure today's Oracle dream exists for the given hero. */
  ensureDailyDream: (heroId: string) => Promise<void>;
  /** Advance the companion to its next evolution stage. No-op if the
   *  companion isn't eligible (stage 3 or under the required level). */
  evolveCompanion: (heroId: string) => Promise<void>;
  /** Drop an item from the adventure pack entirely. */
  dropPackItem: (heroId: string, itemId: string) => Promise<void>;
  /** Move a pack item to the base chest under a category. */
  stashPackItem: (heroId: string, itemId: string, category?: BaseInventoryCategory) => Promise<void>;
  /** Move a base item back into the pack (skipped if pack is full). */
  takeBaseItem: (heroId: string, itemId: string) => Promise<void>;
}

async function flushSave<T>(fn: () => Promise<T>, set: any): Promise<T | null> {
  set((s: OlympusState) => { s.saveStatus = "saving"; });
  try {
    const out = await fn();
    set((s: OlympusState) => { s.saveStatus = "saved"; s.lastSavedAt = Date.now(); });
    return out;
  } catch (err) {
    console.warn("[olympus] save failed", err);
    set((s: OlympusState) => { s.saveStatus = "failed"; });
    return null;
  }
}

export const useOlympus = create<OlympusState>()(
  immer((set, get) => ({
    heroes: [],
    activeHeroId: null,
    activeAdventure: null,
    saveStatus: "saved",
    lastSavedAt: 0,
    hydrated: false,

    async loadAll() {
      const heroes = (await listOlympusHeroes(true)).map(migrateHero);
      let activeHeroId: string | null = null;
      try { activeHeroId = localStorage.getItem("dd_olympus_last_hero"); } catch {}
      // If active hero has an in-progress adventure, hydrate it.
      let activeAdventure: Adventure | null = null;
      if (activeHeroId) {
        const hero = heroes.find(h => h.id === activeHeroId);
        if (hero?.activeAdventureId) {
          activeAdventure = await loadOlympusAdventure(hero.activeAdventureId);
        }
      }
      set(s => {
        s.heroes = heroes;
        s.activeHeroId = activeHeroId && heroes.find(h => h.id === activeHeroId) ? activeHeroId : null;
        s.activeAdventure = activeAdventure;
        s.saveStatus = "saved";
        s.lastSavedAt = Date.now();
        s.hydrated = true;
      });

      // Subscribe to remote sync if a room code is configured. Each
      // snapshot merges remote heroes (by modifiedAt) and writes any
      // remote-only heroes into local Dexie so they survive offline.
      if (getRoomCode()) {
        if (heroesUnsub) { heroesUnsub(); heroesUnsub = null; }
        const unsub = subscribeHeroes(remote => {
          // CRITICAL: run remote heroes through migrateHero before
          // merging. Otherwise stale class names + stale stat shapes
          // saved to Firestore from older builds keep overwriting the
          // local heroes every time the listener fires — that's why
          // "old characters" kept reappearing on the game screen.
          const remoteMigrated = remote.map(migrateHero);
          set(s => { s.heroes = mergeHeroLists(s.heroes, remoteMigrated); });
          const localIds = new Set(get().heroes.map(h => h.id));
          for (const r of remoteMigrated) {
            if (!localIds.has(r.id)) saveOlympusHero(r).catch(() => {});
          }
        });
        if (unsub) heroesUnsub = unsub;

        if (advUnsub) { advUnsub(); advUnsub = null; }
        const advU = subscribeAdventures(advs => {
          // Only update the currently-active adventure live — others are
          // loaded on demand. Newer modifiedAt wins.
          const active = get().activeAdventure;
          if (!active) return;
          const remote = advs.find(a => a.id === active.id);
          if (!remote) return;
          // Adventure has no modifiedAt — use currentIndex as the
          // monotonic progress marker. The further-along copy wins.
          if ((remote.currentIndex ?? 0) > (active.currentIndex ?? 0)) {
            set(s => { s.activeAdventure = remote; });
            saveOlympusAdventure(remote).catch(() => {});
          }
        });
        if (advU) advUnsub = advU;
      }
    },

    async setActiveHero(heroId) {
      set(s => { s.activeHeroId = heroId; });
      try {
        if (heroId) localStorage.setItem("dd_olympus_last_hero", heroId);
        else localStorage.removeItem("dd_olympus_last_hero");
      } catch {}
      // If the new hero has an active adventure, hydrate it.
      if (heroId) {
        const hero = get().heroes.find(h => h.id === heroId);
        if (hero?.activeAdventureId) {
          const adv = await loadOlympusAdventure(hero.activeAdventureId);
          set(s => { s.activeAdventure = adv; });
        } else {
          set(s => { s.activeAdventure = null; });
        }
      } else {
        set(s => { s.activeAdventure = null; });
      }
    },

    async upsertHero(hero) {
      await flushSave(async () => {
        await saveHeroEverywhere(hero);
        set(s => {
          const idx = s.heroes.findIndex(h => h.id === hero.id);
          if (idx >= 0) s.heroes[idx] = hero;
          else s.heroes.unshift(hero);
        });
      }, set);
    },

    async archiveHero(heroId) {
      await flushSave(async () => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        const archived = { ...hero, archived: true, modifiedAt: Date.now() };
        await saveHeroEverywhere(archived);
        set(s => {
          const idx = s.heroes.findIndex(h => h.id === heroId);
          if (idx >= 0) s.heroes[idx] = archived;
        });
      }, set);
    },

    async unarchiveHero(heroId) {
      await flushSave(async () => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        const restored = { ...hero, archived: false, modifiedAt: Date.now() };
        await saveHeroEverywhere(restored);
        set(s => {
          const idx = s.heroes.findIndex(h => h.id === heroId);
          if (idx >= 0) s.heroes[idx] = restored;
        });
      }, set);
    },

    async deleteHero(heroId) {
      // Hard delete intentionally restricted by the prompt; only used for cleanup paths.
      await flushSave(async () => {
        await deleteHeroEverywhere(heroId);
        set(s => { s.heroes = s.heroes.filter(h => h.id !== heroId); });
      }, set);
    },

    async patchHero(heroId, patch) {
      const hero = get().heroes.find(h => h.id === heroId);
      if (!hero) return;
      const next = structuredClone(hero);
      patch(next);
      next.modifiedAt = Date.now();
      await flushSave(async () => {
        await saveHeroEverywhere(next);
        set(s => {
          const idx = s.heroes.findIndex(h => h.id === heroId);
          if (idx >= 0) s.heroes[idx] = next;
        });
      }, set);
    },

    async startNewAdventure(adventure) {
      // Save adventure + patch hero.activeAdventureId in one swoop.
      await flushSave(async () => {
        await saveAdventureEverywhere(adventure);
        const hero = get().heroes.find(h => h.id === adventure.heroId);
        if (hero) {
          const next = { ...hero, activeAdventureId: adventure.id, modifiedAt: Date.now() };
          await saveHeroEverywhere(next);
          set(s => {
            const idx = s.heroes.findIndex(h => h.id === hero.id);
            if (idx >= 0) s.heroes[idx] = next;
          });
        }
        set(s => { s.activeAdventure = adventure; });
      }, set);
    },

    async saveAdventure(adventure) {
      await flushSave(async () => {
        await saveAdventureEverywhere(adventure);
        set(s => { s.activeAdventure = adventure; });
      }, set);
    },

    async appendSceneToAdventure(sceneIndex, scene, history) {
      const adv = get().activeAdventure;
      if (!adv) return;
      const next: Adventure = {
        ...adv,
        scenes: [...adv.scenes, scene],
        currentIndex: sceneIndex,
        history: history ? [...adv.history, history] : adv.history,
        status: scene.isEnding ? "completed" : adv.status,
        completedAt: scene.isEnding ? Date.now() : adv.completedAt,
      };
      await flushSave(async () => {
        await saveAdventureEverywhere(next);
        set(s => { s.activeAdventure = next; });
      }, set);
    },

    async loadAdventure(id) {
      return loadOlympusAdventure(id);
    },

    async abandonActiveAdventure() {
      const adv = get().activeAdventure;
      if (!adv) return;
      const next = { ...adv, status: "abandoned" as const };
      await flushSave(async () => {
        await saveAdventureEverywhere(next);
        const heroId = next.heroId;
        const hero = get().heroes.find(h => h.id === heroId);
        if (hero) {
          const updated = { ...hero, activeAdventureId: undefined, modifiedAt: Date.now() };
          await saveHeroEverywhere(updated);
          set(s => {
            const idx = s.heroes.findIndex(h => h.id === heroId);
            if (idx >= 0) s.heroes[idx] = updated;
          });
        }
        set(s => { s.activeAdventure = null; });
      }, set);
    },

    async completeActiveAdventure() {
      const adv = get().activeAdventure;
      if (!adv) return;
      const next = { ...adv, status: "completed" as const, completedAt: Date.now() };
      await flushSave(async () => {
        await saveAdventureEverywhere(next);
        const hero = get().heroes.find(h => h.id === next.heroId);
        if (hero) {
          // Drachma reward — base 50 + 5 per scene, modest randomness.
          // Outcome flavor: triumph pays best, tragic pays the least.
          const sceneCount = next.scenes.length;
          const outcomeMultiplier = next.outcome === "triumph" ? 1.4 : next.outcome === "tragic" ? 0.6 : 1.0;
          const drachmaReward = Math.round((50 + sceneCount * 5) * outcomeMultiplier + Math.floor(Math.random() * 30));
          const updated = {
            ...hero,
            activeAdventureId: undefined,
            adventuresCompleted: hero.adventuresCompleted + 1,
            drachma: hero.drachma + drachmaReward,
            modifiedAt: Date.now(),
          };
          // Companion XP — every adventure grants XP scaled by scene
          // count and outcome. Level-ups don't auto-evolve; the player
          // must opt in from the hero profile when an evolution
          // threshold (10 or 25) is reached.
          if (updated.companion) {
            let c = { ...updated.companion };
            const award = xpRewardFor(next.outcome as any, sceneCount);
            c.xp += award;
            while (c.xp >= c.xpToNext && c.level < 50) {
              c.xp -= c.xpToNext;
              c.level += 1;
              c.xpToNext = xpForLevel(c.level + 1);
            }
            updated.companion = c;
          }
          // God blessing on triumphant patron adventures (one-time per god)
          if (next.patron && next.outcome !== "tragic") {
            const blessing = awardBlessing(updated, next.patron);
            if (blessing) {
              // Record blessing acquisition in the journal trail.
              updated.journal.push(`A blessing has settled on me. ${blessing.god} of ${blessing.name}. I do not yet know what it will cost.`);
              updated.visualDescription = `${updated.visualDescription} A faint mark of ${blessing.god}'s favor now rests on them.`;
            }
          }
          // Hero's Echo — generate a verse for this adventure and
          // append it to the hero's growing collected mythology.
          // Best-effort: a failed AI call shouldn't block the
          // adventure-complete pipeline.
          try {
            const echo = await generateEcho(updated, next);
            const entry: EchoVerse = {
              id: `echo-${next.id}-${Date.now()}`,
              adventureId: next.id,
              title: echo.title,
              verse: echo.verse,
              createdAt: Date.now(),
            };
            updated.echo = [...(updated.echo ?? []), entry];
          } catch { /* skip verse on failure */ }

          // Companion bond story — more frequent early so first-time
          // players see one within their first couple adventures, then
          // tapering off so they stay special. Every 2 for the first
          // six, every 3 thereafter.
          const newCount = updated.adventuresCompleted;
          const cadence = newCount <= 6 ? 2 : 3;
          if (updated.companion && newCount > 0 && newCount % cadence === 0) {
            try {
              const bond = await generateBondStory(updated, next);
              const story: BondStory = {
                id: `bond-${next.id}-${Date.now()}`,
                title: bond.title,
                body: bond.body,
                createdAt: Date.now(),
              };
              updated.bondStories = [...(updated.bondStories ?? []), story];
            } catch { /* skip on failure */ }
          }

          // Refresh city rumors when reputation has shifted enough.
          try {
            const rumors = await generateCityRumors(updated);
            if (Object.keys(rumors).length > 0) updated.rumors = rumors;
          } catch { /* skip on failure */ }
          await saveHeroEverywhere(updated);
          set(s => {
            const idx = s.heroes.findIndex(h => h.id === hero.id);
            if (idx >= 0) s.heroes[idx] = updated;
          });
        }
        set(s => { s.activeAdventure = next; });
      }, set);
    },

    async ensureDailyDream(heroId) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const hero = get().heroes.find(h => h.id === heroId);
      if (!hero) return;
      const already = (hero.dreams ?? []).some(d => d.dayKey === today);
      if (already) return;
      try {
        const text = await generateDream(hero);
        const dream = { id: `dream-${heroId}-${today}`, dayKey: today, text, createdAt: Date.now() };
        const updated = { ...hero, dreams: [...(hero.dreams ?? []), dream], modifiedAt: Date.now() };
        await saveHeroEverywhere(updated);
        set(s => {
          const idx = s.heroes.findIndex(h => h.id === heroId);
          if (idx >= 0) s.heroes[idx] = updated;
        });
      } catch { /* skip on failure */ }
    },

    async evolveCompanion(heroId) {
      const hero = get().heroes.find(h => h.id === heroId);
      if (!hero?.companion) return;
      const c = hero.companion;
      if (c.stage >= 3) return;
      const need = EVOLUTION_LEVELS[c.stage + 1];
      if (c.level < need) return;
      const nextStageIdx = (c.stage + 1) as 2 | 3;
      const nextStage = getStage(c.lineId, nextStageIdx);
      if (!nextStage) return;
      const evolved = {
        ...c,
        stage: nextStageIdx,
        // Carry the evolved-name forward only if the player kept the
        // default (still matches an earlier-stage name).
        name: c.name === getStage(c.lineId, c.stage)?.name ? nextStage.name : c.name,
        skills: [...nextStage.skills],
      };
      const updated = { ...hero, companion: evolved, modifiedAt: Date.now() };
      await saveHeroEverywhere(updated);
      set(s => {
        const idx = s.heroes.findIndex(h => h.id === heroId);
        if (idx >= 0) s.heroes[idx] = updated;
      });
    },

    async dropPackItem(heroId, itemId) {
      const hero = get().heroes.find(h => h.id === heroId);
      if (!hero) return;
      const updated = { ...hero, inventory: hero.inventory.filter(x => x.id !== itemId), modifiedAt: Date.now() };
      await saveHeroEverywhere(updated);
      set(s => { const i = s.heroes.findIndex(h => h.id === heroId); if (i >= 0) s.heroes[i] = updated; });
    },

    async stashPackItem(heroId, itemId, category) {
      const hero = get().heroes.find(h => h.id === heroId);
      if (!hero) return;
      const item = hero.inventory.find(x => x.id === itemId);
      if (!item) return;
      const cat: BaseInventoryCategory = category ?? (
        item.kind === "weapon" ? "weapon" :
        item.kind === "armor"  ? "armor"  :
        item.kind === "consumable" ? "consumable" :
        item.kind === "quest" ? "quest" :
        item.kind === "trophy" ? "trophy" : "stuff"
      );
      const chestItem: BaseChestItem = {
        id: item.id, name: item.name, category: cat, qty: item.qty,
        description: (item as any).description, playerKept: cat === "stuff",
      };
      const updated = {
        ...hero,
        inventory: hero.inventory.filter(x => x.id !== itemId),
        baseInventory: [...(hero.baseInventory ?? []), chestItem],
        modifiedAt: Date.now(),
      };
      await saveHeroEverywhere(updated);
      set(s => { const i = s.heroes.findIndex(h => h.id === heroId); if (i >= 0) s.heroes[i] = updated; });
    },

    async takeBaseItem(heroId, itemId) {
      const hero = get().heroes.find(h => h.id === heroId);
      if (!hero) return;
      if ((hero.inventory ?? []).length >= 10) return; // pack full
      const base = hero.baseInventory ?? [];
      const item = base.find(x => x.id === itemId);
      if (!item) return;
      const updated = {
        ...hero,
        inventory: [
          ...hero.inventory,
          { id: item.id, name: item.name, kind: (item.category === "stuff" ? "trophy" : item.category) as any, qty: item.qty, description: item.description },
        ],
        baseInventory: base.filter(x => x.id !== itemId),
        modifiedAt: Date.now(),
      };
      await saveHeroEverywhere(updated);
      set(s => { const i = s.heroes.findIndex(h => h.id === heroId); if (i >= 0) s.heroes[i] = updated; });
    },
  })),
);

export { listAdventuresForHero, loadOlympusAdventure };
