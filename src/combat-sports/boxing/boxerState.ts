// src/combat-sports/boxing/boxerState.ts
//
// Shared BoxerStateId enum used by both the (deprecated) sprite loader
// and the procedural renderer. Lives in its own file so the new
// procedural drawer doesn't need to import the old luizmelo sprites
// module (which we are stopping using — see proceduralBoxer.ts).

export type BoxerStateId =
  | "idle" | "move" | "jab" | "power"
  | "hit" | "block" | "dodge" | "knockdown" | "ko";
