// Data: hero archetype + starting state for Liora Vey.
import type { Hero, Ability, Item, InventoryEntry } from "../types";

export const ABILITIES: Record<string, Ability> = {
  lantern_strike: {
    id: "lantern_strike",
    name: "Lantern Strike",
    description: "Swing the silver lantern in a wide arc. Strong vs Hush-touched foes.",
    mp: 4, power: 1.6, fx: "lantern", kind: "damage",
  },
  silver_flare: {
    id: "silver_flare",
    name: "Silver Flare",
    description: "Open the lantern wide. Bursts of cold silver light scour the field.",
    mp: 10, power: 2.4, fx: "flare", kind: "damage",
  },
  hush_mend: {
    id: "hush_mend",
    name: "Hush-Mend",
    description: "Hum a fragment of half-remembered melody. Restores some HP.",
    mp: 6, power: 0, fx: "rest", kind: "heal",
  },
};

export const ITEMS: Record<string, Item> = {
  mendherb: { id: "mendherb", name: "Mendherb", description: "A pinch of clover-leaf paste. Restores 30 HP.",  use: { kind: "heal-hp", amount: 30 } },
  tonewater: { id: "tonewater", name: "Tonewater", description: "A vial of choir-spring water. Restores 15 MP.", use: { kind: "heal-mp", amount: 15 } },
  lantern_oil: { id: "lantern_oil", name: "Lantern Oil", description: "Restores 80 HP in a pinch.", use: { kind: "heal-hp", amount: 80 } },
};

export function xpToNext(level: number): number {
  return 24 + level * 18 + level * level * 4;
}

export function makeStartingHero(): Hero {
  return {
    id: "liora",
    name: "Liora",
    level: 1,
    xp: 0,
    xpToNext: xpToNext(1),
    stats: {
      hp: 48, maxHp: 48,
      mp: 12, maxMp: 12,
      atk: 11, def: 6,
      voice: 9, resist: 5,
      spd: 11,
    },
    abilities: [
      { id: "lantern_strike", mp: 4 },
      { id: "silver_flare",  mp: 10 },
      { id: "hush_mend",     mp: 6 },
    ],
    weaponName: "Mother's Shortsword",
  };
}

export function makeStartingInventory(): InventoryEntry[] {
  return [
    { itemId: "mendherb", qty: 3 },
    { itemId: "tonewater", qty: 1 },
  ];
}

export function applyLevelUp(hero: Hero): { newLevel: number; gains: Partial<Record<keyof Hero["stats"], number>> } {
  hero.level += 1;
  const gains: Partial<Record<keyof Hero["stats"], number>> = {
    maxHp: 7 + Math.floor(Math.random() * 3),
    maxMp: 3 + Math.floor(Math.random() * 2),
    atk: 1 + (hero.level % 2 === 0 ? 1 : 0),
    def: hero.level % 2 === 0 ? 1 : 0,
    voice: 1 + (hero.level % 3 === 0 ? 1 : 0),
    resist: hero.level % 2 === 1 ? 1 : 0,
    spd: hero.level % 3 === 0 ? 1 : 0,
  };
  hero.stats.maxHp += gains.maxHp ?? 0;
  hero.stats.maxMp += gains.maxMp ?? 0;
  hero.stats.atk   += gains.atk   ?? 0;
  hero.stats.def   += gains.def   ?? 0;
  hero.stats.voice += gains.voice ?? 0;
  hero.stats.resist+= gains.resist?? 0;
  hero.stats.spd   += gains.spd   ?? 0;
  hero.stats.hp = hero.stats.maxHp;
  hero.stats.mp = hero.stats.maxMp;
  hero.xpToNext = xpToNext(hero.level);
  return { newLevel: hero.level, gains };
}

export function awardXp(hero: Hero, amount: number): { levelUps: number; gains: Array<{ newLevel: number; gains: Partial<Record<keyof Hero["stats"], number>> }> } {
  hero.xp += amount;
  let levelUps = 0;
  const gains: Array<{ newLevel: number; gains: Partial<Record<keyof Hero["stats"], number>> }> = [];
  while (hero.xp >= hero.xpToNext && hero.level < 99) {
    hero.xp -= hero.xpToNext;
    gains.push(applyLevelUp(hero));
    levelUps += 1;
  }
  return { levelUps, gains };
}
