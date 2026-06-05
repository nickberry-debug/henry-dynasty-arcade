// Level-up offering generator. Each level we present 3 cards: new
// weapons / new passives / upgrades to existing ones. Heart of the
// "survivors" loop.

import type { Choice } from "./types";
import type { Game } from "./engine";
import { recomputeStats } from "./engine";
import { PASSIVES, WEAPON_TIERS, EVOLUTIONS } from "./catalog";
import type { WeaponId } from "./types";
import type { Passive } from "./types";

const MAX_WEAPONS = 6;
const MAX_PASSIVES = 6;

/** Find the passive required to evolve a given weapon, if any. */
function evolutionPassiveFor(weaponId: WeaponId): string | null {
  return EVOLUTIONS.find(e => e.weapon === weaponId)?.passive ?? null;
}

/** Is the player's matching passive at max stack? (5/5) */
function evolutionUnlocked(g: Game, weaponId: WeaponId): boolean {
  const passiveId = evolutionPassiveFor(weaponId);
  if (!passiveId) return false;
  const passive = g.passives.find(p => p.id === passiveId);
  return Boolean(passive && passive.stacks >= 5);
}

export function rollChoices(g: Game, heroBase: import("./types").HeroStats): Choice[] {
  const choices: Choice[] = [];
  const pool: Choice[] = [];

  // Weapon upgrades. Tier 1→2→3 is always offered. Tier 3→4 ("evolved")
  // is gated by the EVOLUTIONS table: the matching passive must be at
  // max stacks. This creates Vampire Survivors-style combo unlocks
  // mid-run.
  for (const slot of g.weapons) {
    if (slot.tier < 4) {
      const isEvolutionStep = slot.tier === 3;
      const evoUnlocked = isEvolutionStep && evolutionUnlocked(g, slot.weaponId);
      if (isEvolutionStep && !evoUnlocked) {
        // Tier 4 is locked until the player maxes the matching passive.
        // Surface the requirement on the existing tier-3 card so they
        // see the combo path.
        const passiveId = evolutionPassiveFor(slot.weaponId);
        const passiveDef = passiveId ? PASSIVES.find(p => p.id === passiveId) : null;
        if (passiveDef) {
          // Add a hint card so the player learns the combo.
          pool.push({
            id: `evohint_${slot.weaponId}`,
            kind: "weapon-up",
            title: `${WEAPON_TIERS[slot.weaponId][2].name} (evolved soon)`,
            description: `Max out ${passiveDef.emoji} ${passiveDef.name} (5/5) to unlock the evolved form.`,
            emoji: "🔒",
            color: "#9aa6bf",
            apply: () => { /* no-op — informational only */ },
          });
        }
        continue;
      }
      const next = WEAPON_TIERS[slot.weaponId][slot.tier];
      const evolved = slot.tier === 3 && evoUnlocked;
      pool.push({
        id: `wup_${slot.weaponId}`,
        kind: "weapon-up",
        title: evolved ? `✦ ${next.name} ✦` : `${next.name} +`,
        description: evolved
          ? `EVOLVED FORM! ${next.flavor}`
          : `Upgrade to tier ${slot.tier + 1}. ${next.flavor}`,
        emoji: next.emoji,
        color: evolved ? "#fde047" : next.color,
        apply: () => {
          slot.tier = (slot.tier + 1) as 1 | 2 | 3 | 4;
          if (evolved) {
            // Stash an evolution announcement on the game state so the
            // UI can pop a celebration overlay.
            (g as Game & { lastEvolution?: { weaponName: string; emoji: string; color: string } }).lastEvolution = {
              weaponName: next.name, emoji: next.emoji, color: next.color,
            };
          }
        },
      });
    }
  }

  // New weapons (if we have slots left)
  if (g.weapons.length < MAX_WEAPONS) {
    const owned = new Set(g.weapons.map(w => w.weaponId));
    const candidates: WeaponId[] = (Object.keys(WEAPON_TIERS) as WeaponId[]).filter(w => !owned.has(w));
    for (const wid of candidates) {
      const def = WEAPON_TIERS[wid][0];
      pool.push({
        id: `wnew_${wid}`,
        kind: "weapon-new",
        title: def.name,
        description: def.flavor,
        emoji: def.emoji,
        color: def.color,
        apply: () => { g.weapons.push({ weaponId: wid, tier: 1, cd: 0 }); },
      });
    }
  }

  // Passive upgrades
  for (const p of g.passives) {
    if (p.stacks < 5) {
      const def = PASSIVES.find(pp => pp.id === p.id)!;
      pool.push({
        id: `pup_${p.id}`,
        kind: "passive-up",
        title: `${def.name} ${p.stacks + 1}/5`,
        description: def.flavor,
        emoji: def.emoji,
        color: "#fde047",
        apply: () => { p.stacks += 1; recomputeStats(g, heroBase); },
      });
    }
  }

  // New passives
  if (g.passives.length < MAX_PASSIVES) {
    const ownedP = new Set(g.passives.map(p => p.id));
    for (const def of PASSIVES) {
      if (ownedP.has(def.id)) continue;
      pool.push({
        id: `pnew_${def.id}`,
        kind: "passive-new",
        title: def.name,
        description: def.flavor,
        emoji: def.emoji,
        color: "#fde047",
        apply: () => { g.passives.push({ id: def.id as Passive["id"], stacks: 1 }); recomputeStats(g, heroBase); },
      });
    }
  }

  // Healing fallback so the player always sees something
  pool.push({
    id: "heal",
    kind: "passive-new",
    title: "Eat a Snack",
    description: "Heal 30 HP. Sometimes the right move.",
    emoji: "🍗",
    color: "#86efac",
    apply: () => { g.hero.hp = Math.min(g.stats.hpMax, g.hero.hp + 30); },
  });

  // Shuffle + take 3
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(3, shuffled.length); i++) choices.push(shuffled[i]);
  return choices;
}
