// Monster Forge - Phase 5 evolution mechanic.
//
// When a monster has 3+ active potions from the same category it reaches
// "evolved" tier: visual purple glow aura + +2 to each stat (clamped).

import { POTIONS_BY_ID, type PotionCategory } from "../data/potions";
import type { StatBlock } from "./stats";

const EVOLVE_THRESHOLD = 3;

/** Returns true if the active potion list triggers evolution. */
export function isEvolved(activePotionIds: string[]): boolean {
  const counts: Partial<Record<PotionCategory, number>> = {};
  for (const pid of activePotionIds) {
    const p = POTIONS_BY_ID[pid];
    if (!p) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  return Object.values(counts).some(n => (n ?? 0) >= EVOLVE_THRESHOLD);
}

/** Apply evolution stat bump if applicable. Pure — returns a new block. */
export function applyEvolutionStats(s: StatBlock, activePotionIds: string[]): StatBlock {
  if (!isEvolved(activePotionIds)) return s;
  const bump = (v: number) => Math.min(30, v + 2);
  return { hp: bump(s.hp), atk: bump(s.atk), def: bump(s.def), spd: bump(s.spd), mag: bump(s.mag) };
}

/** Which category triggered the evolution (for UI), or null. */
export function evolutionSource(activePotionIds: string[]): PotionCategory | null {
  const counts: Partial<Record<PotionCategory, number>> = {};
  for (const pid of activePotionIds) {
    const p = POTIONS_BY_ID[pid];
    if (!p) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  for (const k of Object.keys(counts) as PotionCategory[]) {
    if ((counts[k] ?? 0) >= EVOLVE_THRESHOLD) return k;
  }
  return null;
}
