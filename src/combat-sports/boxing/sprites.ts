// src/combat-sports/boxing/sprites.ts
//
// DEPRECATED — this file used to load the luizmelo Martial Hero sprite
// strips and tint them per corner. That produced a samurai silhouette
// which Nick called out as "not a boxer." Boxing now uses procedural
// canvas drawings via `proceduralBoxer.ts`. This module is reduced to
// re-exporting the BoxerStateId type so any lingering import keeps
// compiling; remove it entirely once the host filesystem allows.

export type { BoxerStateId } from "./boxerState";
