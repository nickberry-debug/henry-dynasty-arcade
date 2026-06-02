// engine/turn.ts — High-level turn orchestration helpers.
//
// The store calls these to advance the game loop. Pure functions — they
// take inputs, return effects, and never touch React / Dexie themselves.

import type { Hero, Enemy, DungeonMap, Item, Projectile } from "../types";
import type { EnemyAction } from "./ai";

/** Result of one floor's spawn pass. */
export interface SpawnResult {
  enemies: Enemy[];
  drops: Array<{ id: string; x: number; y: number; kind: "gold" | "item"; amount?: number; item?: Item }>;
}

/** Make a fresh projectile instance for animation. */
export function makeProjectile(
  ownerSide: "hero" | "enemy",
  fromX: number, fromY: number,
  toX: number, toY: number,
  emoji: string,
  damage: number,
  damageType?: Projectile["damageType"],
): Projectile {
  return {
    id: "p_" + Math.random().toString(36).slice(2, 9),
    x: fromX, y: fromY, tx: toX, ty: toY,
    emoji, ownerSide, damage, damageType,
  };
}

/** Returns true if (x,y) is a walkable tile (floor, doors, stairs, shrine, chest). */
export function isWalkable(map: DungeonMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  const t = map.tiles[y * map.width + x];
  return t.kind !== "wall";
}

/** Is the position blocked by an enemy? */
export function isBlockedByEnemy(enemies: Enemy[], x: number, y: number): boolean {
  for (const e of enemies) if (e.hp > 0 && e.x === x && e.y === y) return true;
  return false;
}

/** Resolve an enemy action and return what changed. The store applies it. */
export type ResolvedEnemyAction =
  | { kind: "wait" }
  | { kind: "move"; x: number; y: number }
  | { kind: "attack"; abilityId: string };

export function describeAction(a: EnemyAction): string {
  switch (a.kind) {
    case "wait": return "waits";
    case "move": return `moves to (${a.x},${a.y})`;
    case "attack": return `attacks (${a.abilityId})`;
  }
}

/** Phase transitions enumerated for readability. */
export const Phases = {
  exploring: "exploring",
  combat: "combat",
  shopping: "shopping",
  victory: "victory",
  defeat: "defeat",
  loading: "loading",
} as const;
