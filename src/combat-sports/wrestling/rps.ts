// src/combat-sports/wrestling/rps.ts
//
// Wrestling RPS triangle plus the high-risk ROPE option and the
// hype-building TAUNT (which gives the opponent a free strike that
// turn). Same shape as the boxing RPS config so it slots into the
// strategic core's resolveDecision(), but the matchup matrix is
// custom-tuned for wrestling.
//
// Triangle: STRIKE beats GRAPPLE, GRAPPLE beats REVERSAL,
//           REVERSAL beats STRIKE.
//
// ROPE: high-reward attacker option. Beats every defense EXCEPT
//       REVERSAL (which sends the runner crashing). Heavy stamina cost.
//
// TAUNT: handled outside the matchup matrix entirely — the engine
//        skips resolveDecision and applies a hype boost + a free
//        opponent strike. Listed here so the picker UI can render it.

import type { SportStrategyConfig } from "../../sports/strategic/types";

export const WRESTLING_RPS: SportStrategyConfig = {
  sportId: "wrestling",
  // Attacker order — index matches matchup row index.
  attackerActions: ["strike", "grapple", "rope", "taunt"],
  // Defender order — index matches matchup column index.
  defenderActions: ["counter_strike", "counter_grapple", "reversal"],
  matchup: [
    //                  ctrStrike  ctrGrapple  reversal
    /* strike      */ [   -0.20,    +0.40,     -0.45 ],
    /* grapple     */ [   -0.40,    -0.15,     +0.45 ],
    /* rope        */ [   +0.55,    +0.55,     -0.65 ],
    /* taunt       */ [   +0.00,    +0.00,     +0.00 ],
  ],
  signatureActionId: "rope",
  signatureTilt: 0.20,
};

export type AttackId = "strike" | "grapple" | "rope" | "taunt";
export type DefenseId = "counter_strike" | "counter_grapple" | "reversal";

export const ATTACK_META: Record<AttackId, {
  label: string; short: string; emoji: string;
  staminaCost: number; basePower: number; hypeOnLand: number;
  desc: string;
}> = {
  strike:  { label: "STRIKE",  short: "STR", emoji: "👊", staminaCost: 5,  basePower: 10, hypeOnLand: 5,  desc: "Quick punch / kick — beats GRAPPLE" },
  grapple: { label: "GRAPPLE", short: "GRP", emoji: "🤼", staminaCost: 8,  basePower: 14, hypeOnLand: 10, desc: "Lock + throw — beats REVERSAL" },
  rope:    { label: "ROPE",    short: "RUN", emoji: "💫", staminaCost: 15, basePower: 22, hypeOnLand: 15, desc: "Run the ropes — beats everything BUT reversal" },
  taunt:   { label: "TAUNT",   short: "MIC", emoji: "📣", staminaCost: 0,  basePower: 0,  hypeOnLand: 8,  desc: "Hype up the crowd — opponent gets a free strike" },
};

export const DEFENSE_META: Record<DefenseId, {
  label: string; short: string; emoji: string;
  staminaCost: number; desc: string;
}> = {
  counter_strike:  { label: "COUNTER-STRIKE",  short: "STR", emoji: "✊", staminaCost: 5, desc: "Trade strikes — beats incoming GRAPPLE" },
  counter_grapple: { label: "COUNTER-GRAPPLE", short: "GRP", emoji: "🫳", staminaCost: 8, desc: "Lock them up — neutralizes incoming STRIKE" },
  reversal:        { label: "REVERSAL",        short: "REV", emoji: "🔄", staminaCost: 5, desc: "Read + counter — beats STRIKE, fails GRAPPLE" },
};
