// Monster Forge - Phase 5 personality idle text.
//
// Random one-liner phrases shown above the monster every 8-12s during
// builder view, keyed to body type so a serpent talks different from a frog.

import type { BodyType } from "../partsManifest";

const COMMON = [
  "rawr",
  "*hums*",
  "stares at you",
  "wonders about clouds",
  "considers a snack",
];

const BY_TYPE: Record<BodyType, string[]> = {
  biped: [
    "flexes a bicep",
    "thinks about adventures",
    "scratches an ear",
    "practices a roar",
    "looks for treasure",
  ],
  quadruped: [
    "wags happily",
    "sniffs the air",
    "chases a tail",
    "rolls onto its back",
    "scratches with a paw",
  ],
  winged: [
    "preens a feather",
    "dreams of flying",
    "stretches one wing",
    "watches the wind",
    "flaps once",
  ],
  serpentine: [
    "slithers in place",
    "tastes the air",
    "coils up tight",
    "wiggles dramatically",
    "considers a nap",
  ],
  floating: [
    "drifts gently",
    "shimmers slightly",
    "hums a ghostly tune",
    "phases briefly",
    "twinkles",
  ],
};

export function randomIdleText(bodyType: BodyType): string {
  const pool = [...COMMON, ...(BY_TYPE[bodyType] ?? [])];
  return pool[Math.floor(Math.random() * pool.length)];
}
