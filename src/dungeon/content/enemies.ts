// content/enemies.ts — Enemy templates across all 10 floors.

import type { EnemyTemplate } from "../types";

export const ENEMIES: Record<string, EnemyTemplate> = {
  // ─── Tier 1 (floors 1-3) ────────────────────────────────────────────────
  rat: {
    id: "rat", name: "Plague Rat", emoji: "🐀", sprite: "rat",
    baseHp: 10, damage: [2, 4], armor: 0, speed: 1,
    ai: "melee", xp: 8, gold: [1, 4], floors: [1, 3],
    abilities: ["attack"],
  },
  goblin: {
    id: "goblin", name: "Goblin", emoji: "👺", sprite: "goblin",
    baseHp: 18, damage: [3, 6], armor: 1, speed: 1,
    ai: "melee", xp: 14, gold: [3, 8], floors: [1, 4],
    abilities: ["attack", "bite"],
  },
  skeleton: {
    id: "skeleton", name: "Skeleton", emoji: "💀", sprite: "skeleton",
    baseHp: 22, damage: [4, 7], armor: 2, speed: 1,
    ai: "melee", xp: 18, gold: [4, 10], floors: [2, 5],
    abilities: ["attack"],
  },

  // ─── Tier 2 (floors 3-6) ────────────────────────────────────────────────
  orc: {
    id: "orc", name: "Orc Warrior", emoji: "👹", sprite: "orc",
    baseHp: 38, damage: [6, 11], armor: 3, speed: 1,
    ai: "melee", xp: 32, gold: [8, 16], floors: [3, 7],
    abilities: ["attack"],
    lootMod: 1.1,
  },
  archer: {
    id: "archer", name: "Goblin Archer", emoji: "🏹", sprite: "archer",
    baseHp: 24, damage: [5, 9], armor: 1, speed: 1,
    ai: "ranger", range: 5, xp: 28, gold: [6, 14], floors: [3, 7],
    abilities: ["attack"],
  },
  shaman: {
    id: "shaman", name: "Goblin Shaman", emoji: "🧙", sprite: "shaman",
    baseHp: 22, damage: [3, 6], armor: 1, speed: 1,
    ai: "caster", range: 5, xp: 36, gold: [8, 18], floors: [4, 7],
    abilities: ["attack", "dark_bolt"],
  },

  // ─── Tier 3 (floors 6-9) ────────────────────────────────────────────────
  troll: {
    id: "troll", name: "Cave Troll", emoji: "🧌", sprite: "troll",
    baseHp: 80, damage: [10, 18], armor: 5, speed: 2,
    ai: "melee", xp: 65, gold: [15, 30], floors: [6, 10],
    abilities: ["attack"],
    lootMod: 1.2,
  },
  spider: {
    id: "spider", name: "Giant Spider", emoji: "🕷️", sprite: "spider",
    baseHp: 50, damage: [7, 12], armor: 2, speed: 1,
    ai: "ranger", range: 3, xp: 50, gold: [10, 22], floors: [5, 9],
    abilities: ["attack", "venom_spit"],
  },
  wraith: {
    id: "wraith", name: "Wraith", emoji: "👻", sprite: "wraith",
    baseHp: 55, damage: [9, 14], armor: 3, speed: 1,
    ai: "caster", range: 4, xp: 60, gold: [14, 28], floors: [7, 10],
    abilities: ["attack", "dark_bolt"],
    lootMod: 1.3,
  },

  // ─── Tier 4 (floors 9-10 elite) ─────────────────────────────────────────
  knight: {
    id: "knight", name: "Fallen Knight", emoji: "🛡️", sprite: "knight",
    baseHp: 120, damage: [14, 22], armor: 8, speed: 1,
    ai: "melee", xp: 95, gold: [25, 50], floors: [8, 10],
    abilities: ["attack"],
    lootMod: 1.4,
  },

  // ─── Final boss (floor 10) ──────────────────────────────────────────────
  dungeon_lord: {
    id: "dungeon_lord", name: "The Dungeon Lord", emoji: "👑", sprite: "boss",
    baseHp: 400, damage: [18, 28], armor: 10, speed: 1,
    ai: "boss", range: 4, xp: 500, gold: [200, 400], floors: [10, 10],
    abilities: ["attack", "boss_smash", "dark_bolt", "boss_summon"],
    lootMod: 2.5,
  },
};

export const ENEMY_LIST = Object.values(ENEMIES);

/** Pick a random enemy template that can spawn on the given floor. */
export function spawnPool(floor: number): EnemyTemplate[] {
  return ENEMY_LIST.filter(e => e.id !== "dungeon_lord" && floor >= e.floors[0] && floor <= e.floors[1]);
}
