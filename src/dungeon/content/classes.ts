// content/classes.ts — 3 hero classes for the dungeon crawler.

import type { DungeonClass, DungeonClassId } from "../types";

export const CLASSES: Record<DungeonClassId, DungeonClass> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    emoji: "⚔️",
    description: "Frontline bruiser. Wades into melee, breaks armor, never falls down.",
    tagline: "Steel breaks. Bone breaks. The Warrior just bleeds and keeps going.",
    baseStats: { strength: 8, intellect: 2, agility: 4, vitality: 8 },
    primary: "strength",
    abilities: ["slash", "shield_bash", "whirlwind"],
    startGear: { weapon: "rusty_sword", armor: "leather_jerkin" },
    spriteRow: 0,
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    emoji: "🏹",
    description: "Bow & dagger specialist. Lays traps, kites enemies, crits everything.",
    tagline: "Saw you ten seconds before you knew there was a fight.",
    baseStats: { strength: 4, intellect: 4, agility: 9, vitality: 5 },
    primary: "agility",
    abilities: ["quick_shot", "piercing_arrow", "rain_of_arrows"],
    startGear: { weapon: "shortbow", armor: "scout_leathers" },
    spriteRow: 1,
  },
  mage: {
    id: "mage",
    name: "Mage",
    emoji: "🔮",
    description: "Glass cannon. Lights enemies on fire from across the room.",
    tagline: "Made a deal with something old. Doesn't talk about it.",
    baseStats: { strength: 2, intellect: 9, agility: 4, vitality: 4 },
    primary: "intellect",
    abilities: ["spark", "fireball", "frost_nova"],
    startGear: { weapon: "apprentice_staff", armor: "novice_robes" },
    spriteRow: 2,
  },
};

export const CLASS_LIST = Object.values(CLASSES);

/** Stat-pool to spend at hero creation. */
export const CREATION_POINTS = 5;
/** Stat points awarded per level-up. */
export const POINTS_PER_LEVEL = 3;

/** XP curve: xpToNext(level) → 50 * level * 1.4^(level-1). */
export function xpToNext(level: number): number {
  return Math.floor(50 * level * Math.pow(1.4, level - 1));
}

/** Derived max-HP from stats + level + class. */
export function maxHpFor(classId: DungeonClassId, stats: { strength: number; vitality: number }, level: number): number {
  const base = classId === "warrior" ? 40 : classId === "ranger" ? 28 : 22;
  return base + stats.vitality * 6 + stats.strength * 2 + level * 8;
}

/** Derived max-MP. */
export function maxMpFor(classId: DungeonClassId, stats: { intellect: number }, level: number): number {
  const base = classId === "mage" ? 25 : classId === "ranger" ? 12 : 8;
  return base + stats.intellect * 5 + level * 3;
}
