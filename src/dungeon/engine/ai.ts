// engine/ai.ts — Enemy decision-making. Pure functions.
//
// chooseEnemyAction returns the action an enemy wants to take this turn,
// given the current map + hero position. The store applies it.

import type { DungeonMap, Enemy, Hero } from "../types";
import { findPath } from "./generator";
import { ABILITIES } from "../content/abilities";

export type EnemyAction =
  | { kind: "wait" }
  | { kind: "move"; x: number; y: number }
  | { kind: "attack"; abilityId: string };

function chebyshev(ax: number, ay: number, bx: number, by: number) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function manhattan(ax: number, ay: number, bx: number, by: number) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/** Walk one step from (ex,ey) toward (hx,hy) using A*. Returns the next tile to enter or null. */
function stepToward(
  map: DungeonMap,
  ex: number, ey: number,
  hx: number, hy: number,
  occupied: Set<string>,
): { x: number; y: number } | null {
  const key = (x: number, y: number) => `${x},${y}`;
  const isBlocked = (x: number, y: number) => occupied.has(key(x, y));
  const path = findPath(map, ex, ey, hx, hy, isBlocked);
  if (!path.length) return null;
  return path[0];
}

/** Pick the best (highest-priority) ability the enemy can use this turn. */
function pickAbility(enemy: Enemy, distToHero: number): string | null {
  // Filter: in range, off cooldown.
  const candidates = enemy.abilities
    .map(id => ({ id, a: ABILITIES[id] }))
    .filter(c => !!c.a)
    .filter(c => (enemy.cooldowns[c.id] ?? 0) <= 0)
    .filter(c => distToHero <= c.a.range);

  if (!candidates.length) return null;

  // Prefer abilities with higher damage potential (rough heuristic).
  candidates.sort((a, b) => {
    const sa = (a.a.flatDamage ?? 0) + (a.a.damageMult ?? 0) * 6;
    const sb = (b.a.flatDamage ?? 0) + (b.a.damageMult ?? 0) * 6;
    return sb - sa;
  });
  // Save basic attack as a fallback so cooldown abilities pop first.
  const nonBasic = candidates.filter(c => c.id !== "attack");
  return (nonBasic[0] ?? candidates[0]).id;
}

export function chooseEnemyAction(
  enemy: Enemy,
  hero: Hero,
  map: DungeonMap,
  px: number, py: number,
  occupied: Set<string>,
): EnemyAction {
  // Stunned? Sleep this turn.
  if (enemy.statuses.some(s => s.kind === "stun" && s.duration > 0)) {
    return { kind: "wait" };
  }

  const dCheb = chebyshev(enemy.x, enemy.y, px, py);
  const dMan = manhattan(enemy.x, enemy.y, px, py);

  // Awareness: only act when the hero is within ~10 tiles or already alerted.
  if (!enemy.alerted) {
    if (dMan > 10) return { kind: "wait" };
    enemy.alerted = true;
  }

  switch (enemy.ai) {
    case "melee": {
      // In melee range? Attack.
      if (dCheb <= 1) {
        const id = pickAbility(enemy, dMan) ?? "attack";
        return { kind: "attack", abilityId: id };
      }
      // Otherwise close the gap.
      const step = stepToward(map, enemy.x, enemy.y, px, py, occupied);
      return step ? { kind: "move", ...step } : { kind: "wait" };
    }

    case "ranger": {
      const range = enemy.range || 5;
      // If in range, shoot.
      if (dMan <= range) {
        const id = pickAbility(enemy, dMan) ?? "attack";
        return { kind: "attack", abilityId: id };
      }
      // Move closer until in range.
      const step = stepToward(map, enemy.x, enemy.y, px, py, occupied);
      return step ? { kind: "move", ...step } : { kind: "wait" };
    }

    case "caster": {
      const range = enemy.range || 5;
      // Caster stays at max range — kite if hero is adjacent.
      if (dCheb <= 1) {
        // Try to back away to a tile that increases manhattan distance.
        const offsets: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const map_w = map.width;
        for (const [dx, dy] of offsets) {
          const nx = enemy.x + dx, ny = enemy.y + dy;
          if (nx < 0 || ny < 0 || nx >= map_w || ny >= map.height) continue;
          if (occupied.has(`${nx},${ny}`)) continue;
          const tile = map.tiles[ny * map_w + nx];
          if (tile.kind === "wall") continue;
          if (manhattan(nx, ny, px, py) > dMan) return { kind: "move", x: nx, y: ny };
        }
        // Cornered — attack.
        const id = pickAbility(enemy, dMan) ?? "attack";
        return { kind: "attack", abilityId: id };
      }
      if (dMan <= range) {
        const id = pickAbility(enemy, dMan) ?? "attack";
        return { kind: "attack", abilityId: id };
      }
      const step = stepToward(map, enemy.x, enemy.y, px, py, occupied);
      return step ? { kind: "move", ...step } : { kind: "wait" };
    }

    case "boss": {
      // Boss prefers a powerful AoE if off cooldown, else dark_bolt, else attack.
      const order = ["boss_smash", "dark_bolt", "boss_summon", "attack"];
      for (const id of order) {
        const a = ABILITIES[id];
        if (!a) continue;
        if (!enemy.abilities.includes(id)) continue;
        if ((enemy.cooldowns[id] ?? 0) > 0) continue;
        if (dMan > a.range) continue;
        return { kind: "attack", abilityId: id };
      }
      // Default: close the gap.
      const step = stepToward(map, enemy.x, enemy.y, px, py, occupied);
      return step ? { kind: "move", ...step } : { kind: "wait" };
    }
  }

  return { kind: "wait" };
}

/** Decrement all cooldowns by 1 (called at start of enemy turn). */
export function tickCooldowns(enemy: Enemy) {
  for (const k of Object.keys(enemy.cooldowns)) {
    enemy.cooldowns[k] = Math.max(0, enemy.cooldowns[k] - 1);
  }
}
