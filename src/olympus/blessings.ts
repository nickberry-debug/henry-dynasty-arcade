// Olympus god blessings — the Infinity-Stones-style collection.
// Each completed adventure with a patron deity awards that god's
// blessing (if not already held). Collecting all 12 Olympians unlocks
// "The Titans' Return" — the end-game adventure.

import type { Hero } from "./types";

export interface BlessingDef {
  god: string;
  name: string;
  emoji: string;
  /** Domain — color cue for the UI. */
  hue: string;
  /** Short description shown on the hero profile. */
  desc: string;
  /** Mechanical effect (applied at award time as permanent stat shift). */
  effect: { stat?: keyof Hero["stats"]; delta?: number; hpMax?: number };
}

export const BLESSINGS: BlessingDef[] = [
  { god: "Zeus",       name: "Lightning Mantle",     emoji: "⚡", hue: "#facc15", desc: "Kings and storms favor you. +2 charisma, +5 max HP.", effect: { stat: "charisma", delta: 2, hpMax: 5 } },
  { god: "Athena",     name: "Aegis of Wisdom",      emoji: "🛡️", hue: "#60a5fa", desc: "Counsel of the gray-eyed goddess. +3 wisdom.", effect: { stat: "wisdom", delta: 3 } },
  { god: "Apollo",     name: "Light of the Sun",     emoji: "☀️", hue: "#fb923c", desc: "Truth and music ride with you. +2 wisdom, +3 max HP.", effect: { stat: "wisdom", delta: 2, hpMax: 3 } },
  { god: "Artemis",    name: "Huntress's Eye",       emoji: "🏹", hue: "#34d399", desc: "Wild lands open before you. +3 agility.", effect: { stat: "agility", delta: 3 } },
  { god: "Hermes",     name: "Winged Sandals",       emoji: "🪽", hue: "#a78bfa", desc: "The road is shorter for you. +2 agility, +2 luck.", effect: { stat: "agility", delta: 2 } },
  { god: "Poseidon",   name: "Trident's Reach",      emoji: "🌊", hue: "#06b6d4", desc: "The sea remembers your name. +3 strength.", effect: { stat: "strength", delta: 3 } },
  { god: "Aphrodite",  name: "Charm of Cythera",     emoji: "💞", hue: "#f472b6", desc: "Hearts turn toward you, sometimes against their better judgement. +3 charisma.", effect: { stat: "charisma", delta: 3 } },
  { god: "Ares",       name: "Bronze Fury",          emoji: "⚔️", hue: "#ef4444", desc: "Battle suits you. +2 strength, +5 max HP.", effect: { stat: "strength", delta: 2, hpMax: 5 } },
  { god: "Hephaestus", name: "Forge-Touched",        emoji: "🔥", hue: "#f97316", desc: "Crafts you wield grow more sure in your hand. +2 endurance, +3 max HP.", effect: { stat: "endurance", delta: 2, hpMax: 3 } },
  { god: "Demeter",    name: "Harvest's Patience",   emoji: "🌾", hue: "#a3e635", desc: "Wounds knit faster, hunger waits longer. +3 endurance.", effect: { stat: "endurance", delta: 3 } },
  { god: "Dionysus",   name: "Wine-Dark Joy",        emoji: "🍇", hue: "#a855f7", desc: "Crowds soften, masks fall away. +2 charisma, +2 luck.", effect: { stat: "charisma", delta: 2 } },
  { god: "Hades",      name: "Shade-Walker",         emoji: "💀", hue: "#64748b", desc: "Death has met you, and learned your name. +3 max HP, immunity to one fatal blow per adventure.", effect: { hpMax: 8 } },
];

/** Award a blessing for completing a patron's adventure. Returns the
 *  awarded BlessingDef, or null if already collected. */
export function awardBlessing(hero: Hero, patronGod: string): BlessingDef | null {
  if (!patronGod || patronGod === "No patron") return null;
  // Already have this god's blessing?
  if (hero.equipment.blessings.some(b => b.god === patronGod)) return null;
  const def = BLESSINGS.find(b => b.god === patronGod);
  if (!def) return null;
  hero.equipment.blessings.push({ god: def.god, name: def.name, tier: 1 });
  // Apply permanent stat bonuses
  if (def.effect.stat && def.effect.delta) {
    hero.stats[def.effect.stat] = Math.max(1, hero.stats[def.effect.stat] + def.effect.delta);
  }
  if (def.effect.hpMax) {
    hero.hpMax += def.effect.hpMax;
    hero.hp = Math.min(hero.hpMax, hero.hp + def.effect.hpMax);
  }
  return def;
}

/** Is the hero ready for "The Titans' Return" — all 12 Olympian
 *  blessings collected? */
export function readyForTitans(hero: Hero): boolean {
  const collected = new Set(hero.equipment.blessings.map(b => b.god));
  return BLESSINGS.every(b => collected.has(b.god));
}

/** How many Olympian blessings the hero has earned (0-12). */
export function blessingCount(hero: Hero): number {
  const collected = new Set(hero.equipment.blessings.map(b => b.god));
  return BLESSINGS.filter(b => collected.has(b.god)).length;
}
