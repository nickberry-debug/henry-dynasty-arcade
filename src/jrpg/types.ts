// AETHERSONG core type definitions.
// Original IP, original mechanics. No copyrighted material.

export interface Stats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  voice: number;
  resist: number;
  spd: number;
}

export interface AbilityRef {
  id: string;
  mp: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  use: ItemUse;
}
export type ItemUse =
  | { kind: "heal-hp"; amount: number }
  | { kind: "heal-mp"; amount: number }
  | { kind: "revive"; pctHp: number };

export interface InventoryEntry { itemId: string; qty: number; }

export interface Ability {
  id: string;
  name: string;
  description: string;
  mp: number;
  power: number;
  fx?: "lantern" | "flare" | "rest";
  kind: "damage" | "heal";
}

export interface Hero {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  stats: Stats;
  abilities: AbilityRef[];
  weaponName: string;
}

export interface EnemyTemplate {
  id: string;
  spriteId: "goblin" | "mushroom" | "skeleton" | "flying_eye";
  name: string;
  level: number;
  stats: Stats;
  scale: number;
  xpReward: number;
  goldReward: number;
  abilities?: AbilityRef[];
  isBoss?: boolean;
  introLine?: string;
}

export interface BattleEnemy extends EnemyTemplate {
  battleId: string;
  hpNow: number;
  mpNow: number;
  atb: number;
  dead: boolean;
  hitFlash: number;
}

export type BattleResult = "victory" | "defeat" | "fled";

export interface SavePayload {
  version: 1;
  hero: Hero;
  inventory: InventoryEntry[];
  location: "town" | "dungeon-room-1" | "dungeon-room-2" | "dungeon-room-3" | "dungeon-boss";
  pos: { x: number; y: number };
  flags: { metHalden?: boolean; gotLantern?: boolean; defeatedBoss?: boolean; firstSave?: boolean };
  gold: number;
  savedAt: number;
  seed: number;
}

export type DPadInput = { up: boolean; down: boolean; left: boolean; right: boolean; a: boolean; b: boolean };
