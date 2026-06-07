// src/combat-sports/wrestling/wrestlerState.ts
//
// Shared WrestlerStateId enum used by the procedural wrestler renderer.
// Mirrors boxerState.ts in shape so the rendering layer stays simple.

export type WrestlerStateId =
  | "idle" | "strike" | "grapple" | "rope"
  | "reversal" | "taunt"
  | "hit" | "down" | "pinned"
  | "finisher" | "submission" | "victory";
