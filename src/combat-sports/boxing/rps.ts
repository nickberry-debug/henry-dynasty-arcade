// src/combat-sports/boxing/rps.ts
//
// Boxing-specific RPS config that plugs into the strategic core at
// `src/sports/strategic/`. Defined LOCALLY here because at the time of
// writing the strategic-core package was still untracked on disk
// (parallel Sports Versus task hadn't committed yet) — keeping the
// boxing-specific config local avoids editing a file the other agent
// owns. Once Sports Versus lands its first commit, this object can be
// hoisted into `src/sports/strategic/sports.ts` next to BASEBALL_RPS /
// FOOTBALL_RPS, and Boxing.tsx can switch to importing
// `configForSport("boxing")`. See COMBATSPORTS_PROGRESS.md.
//
// Triangle (4 attacker strikes × 3 defender stances):
//
//                    BLOCK     DODGE     CLINCH
//   JAB        →     -0.30    +0.45     -0.30     (jab pierces dodge; block absorbs)
//   CROSS      →     -0.35    -0.40     +0.20     (predictable straight; smothered → tied up; clinch fighter eats one)
//   HOOK       →     +0.45    -0.40     -0.30     (sneaks around block; dodgable; smothered)
//   UPPERCUT   →     -0.10    +0.10     +0.55     (Tyson special — crushes a clinch)

import type { SportStrategyConfig } from "../../sports/strategic/types";

export const BOXING_RPS: SportStrategyConfig = {
  sportId: "boxing",
  attackerActions: ["jab", "cross", "hook", "uppercut"],
  defenderActions: ["block", "dodge", "clinch"],
  matchup: [
    //              block   dodge   clinch
    /* jab      */ [ -0.30, +0.45, -0.30 ],
    /* cross    */ [ -0.35, -0.40, +0.20 ],
    /* hook     */ [ +0.45, -0.40, -0.30 ],
    /* uppercut */ [ -0.10, +0.10, +0.55 ],
  ],
  signatureActionId: "uppercut",
  signatureTilt: 0.25,
};

export const STRIKE_META: Record<string, { label: string; emoji: string; staminaCost: number; basePower: number }> = {
  jab:      { label: "JAB",      emoji: "👊", staminaCost: 5,  basePower: 6  },
  cross:    { label: "CROSS",    emoji: "🥊", staminaCost: 10, basePower: 12 },
  hook:     { label: "HOOK",     emoji: "💥", staminaCost: 15, basePower: 16 },
  uppercut: { label: "UPPERCUT", emoji: "⚡", staminaCost: 20, basePower: 20 },
};

export const DEFENSE_META: Record<string, { label: string; emoji: string; staminaCost: number }> = {
  block:  { label: "BLOCK",  emoji: "🛡️",  staminaCost: 3 },
  dodge:  { label: "DODGE",  emoji: "💨", staminaCost: 8 },
  clinch: { label: "CLINCH", emoji: "🤝", staminaCost: 5 },
};

export type StrikeId = "jab" | "cross" | "hook" | "uppercut";
export type DefenseId = "block" | "dodge" | "clinch";
export type TargetZone = "head" | "body";
