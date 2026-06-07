// Monster Forge — Phase 2 stat system.
//
// Each monster has 5 stats: HP / ATK / DEF / SPD / MAG.
// Base stats are derived from the body archetype (a Squidle is fast & magical;
// a Giant is slow & tanky). Potions apply stat deltas via `statDelta`.
//
// Stats are clamped to [1, 30] so a stack of buffs can't push them into wild
// territory. Final stats are stored on SavedMonster for fast Hub rendering.

import { POTIONS_BY_ID } from "../data/potions";

export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mag: number;
}

// ─── Per-body base stats ────────────────────────────────────────────────
// Hand-tuned so each Quaternius body feels distinct. Totals roughly 30-35.
const BODY_BASE: Record<string, StatBlock> = {
  alien:            { hp: 5,  atk: 6, def: 4, spd: 8, mag: 9 },
  blue_demon:       { hp: 7,  atk: 8, def: 6, spd: 6, mag: 7 },
  demon:            { hp: 7,  atk: 9, def: 6, spd: 6, mag: 8 },
  dino:             { hp: 8,  atk: 8, def: 7, spd: 5, mag: 4 },
  dragon_evolved:   { hp: 9,  atk: 9, def: 7, spd: 6, mag: 8 },
  frog:             { hp: 5,  atk: 4, def: 4, spd: 8, mag: 5 },
  ghost:            { hp: 4,  atk: 5, def: 3, spd: 8, mag: 10 },
  giant:            { hp: 10, atk: 8, def: 9, spd: 3, mag: 3 },
  green_blob:       { hp: 6,  atk: 4, def: 5, spd: 4, mag: 5 },
  green_spiky_blob: { hp: 7,  atk: 6, def: 7, spd: 4, mag: 5 },
  mimic:            { hp: 7,  atk: 7, def: 7, spd: 5, mag: 6 },
  mushnub:          { hp: 5,  atk: 4, def: 5, spd: 5, mag: 7 },
  orc:              { hp: 8,  atk: 9, def: 7, spd: 5, mag: 3 },
  skeleton:         { hp: 4,  atk: 7, def: 4, spd: 7, mag: 6 },
  squidle:          { hp: 5,  atk: 5, def: 4, spd: 7, mag: 8 },
  tribal:           { hp: 6,  atk: 7, def: 6, spd: 6, mag: 5 },
  yeti:             { hp: 9,  atk: 8, def: 8, spd: 4, mag: 4 },
  zombie:           { hp: 6,  atk: 6, def: 5, spd: 4, mag: 4 },
};

const DEFAULT_BASE: StatBlock = { hp: 6, atk: 6, def: 6, spd: 6, mag: 6 };

const STAT_MIN = 1;
const STAT_MAX = 30;

function clamp(v: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(v)));
}

export function baseStatsFor(bodyId: string): StatBlock {
  return { ...(BODY_BASE[bodyId] ?? DEFAULT_BASE) };
}

/** Compute final stats from a body + active potion ids. */
export function computeStats(bodyId: string, activePotionIds: string[]): StatBlock {
  const out = baseStatsFor(bodyId);
  for (const pid of activePotionIds) {
    const p = POTIONS_BY_ID[pid];
    if (!p?.effect?.statDelta) continue;
    const d = p.effect.statDelta;
    out.hp  += d.hp  ?? 0;
    out.atk += d.atk ?? 0;
    out.def += d.def ?? 0;
    out.spd += d.spd ?? 0;
    out.mag += d.mag ?? 0;
  }
  return { hp: clamp(out.hp), atk: clamp(out.atk), def: clamp(out.def),
           spd: clamp(out.spd), mag: clamp(out.mag) };
}

export function totalDelta(base: StatBlock, current: StatBlock): StatBlock {
  return {
    hp:  current.hp  - base.hp,
    atk: current.atk - base.atk,
    def: current.def - base.def,
    spd: current.spd - base.spd,
    mag: current.mag - base.mag,
  };
}

export const STAT_LABELS: Record<keyof StatBlock, string> = {
  hp: "HP", atk: "ATK", def: "DEF", spd: "SPD", mag: "MAG",
};

export const STAT_COLORS: Record<keyof StatBlock, string> = {
  hp:  "#ef4444",
  atk: "#f97316",
  def: "#3b82f6",
  spd: "#22c55e",
  mag: "#a855f7",
};

export const STAT_ORDER: (keyof StatBlock)[] = ["hp", "atk", "def", "spd", "mag"];

/** Sum of all stats — used for Hub card "power level" summary. */
export function statTotal(s: StatBlock): number {
  return s.hp + s.atk + s.def + s.spd + s.mag;
}
