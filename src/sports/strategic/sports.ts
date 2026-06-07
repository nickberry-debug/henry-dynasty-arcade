// src/sports/strategic/sports.ts
//
// Sport-specific RPS configs. Each sport ships an attacker-side action
// triangle, a defender-side action triangle, a 3x3 matchup matrix from
// the attacker POV, and a signature play. Matrices are zero-sum so a
// random vs random match converges on 50/50.

import type { SportStrategyConfig } from "./types";

const WIN = 0.45;

export const BASEBALL_RPS: SportStrategyConfig = {
  sportId: "baseball",
  attackerActions: ["swing_power", "swing_contact", "swing_take"],
  defenderActions: ["pitch_fast",  "pitch_curve",   "pitch_change"],
  matchup: [
    [  0.00, -WIN,   +WIN ],
    [ +WIN,   0.00,  -WIN ],
    [ -WIN,  +WIN,    0.00 ],
  ],
  signatureActionId: "swing_power",
  signatureTilt: 0.20,
};

export const FOOTBALL_RPS: SportStrategyConfig = {
  sportId: "football",
  attackerActions: ["call_run",  "call_pass",  "call_trick"],
  defenderActions: ["def_blitz", "def_cover",  "def_balanced"],
  matchup: [
    [ +WIN,  -WIN,     0.00 ],
    [  0.00, +WIN,    -WIN ],
    [ -WIN,   0.00,   +WIN ],
  ],
  signatureActionId: "call_trick",
  signatureTilt: 0.25,
};

export const BASKETBALL_RPS: SportStrategyConfig = {
  sportId: "basketball",
  attackerActions: ["drive", "shoot", "pass"],
  defenderActions: ["lane",  "contest","double"],
  matchup: [
    [ -WIN, +WIN,   0.00 ],
    [ +WIN,  0.00, -WIN ],
    [  0.00,-WIN,  +WIN ],
  ],
  signatureActionId: "drive",
  signatureTilt: 0.22,
};

export const HOCKEY_RPS: SportStrategyConfig = {
  sportId: "hockey",
  attackerActions: ["shoot", "deke",  "pass"],
  defenderActions: ["block", "poke",  "screen"],
  matchup: [
    [ -WIN,   0.00,  +WIN ],
    [ +WIN,  -WIN,    0.00 ],
    [  0.00, +WIN,   -WIN ],
  ],
  signatureActionId: "shoot",
  signatureTilt: 0.24,
};

export function configForSport(sportId: string): SportStrategyConfig {
  switch (sportId) {
    case "baseball":   return BASEBALL_RPS;
    case "football":   return FOOTBALL_RPS;
    case "basketball": return BASKETBALL_RPS;
    case "hockey":     return HOCKEY_RPS;
    default: throw new Error(`No strategic config for sport: ${sportId}`);
  }
}