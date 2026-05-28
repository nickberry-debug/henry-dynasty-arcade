// Iconic single-color SVG silhouettes for each companion line — used
// as the engraved center of the medallion (think the eagle on a US
// quarter). Each path is hand-tuned to fit a 100x100 viewBox, anchored
// roughly at center, single color so it can be filled with the coin's
// engraving tint.

export interface CreatureSilhouette {
  /** SVG <path> data. Single shape, designed for `fill="currentColor"`. */
  d: string;
  /** Optional second path for detail (eye highlight, secondary feature). */
  detail?: string;
}

export const CREATURE_SILHOUETTES: Record<string, CreatureSilhouette> = {
  pegasus: {
    // Rearing horse with wings up
    d: "M 28 70 Q 30 50 38 42 L 42 26 Q 46 20 52 22 Q 56 24 56 30 L 58 40 Q 70 36 78 28 L 76 36 Q 68 46 62 50 L 60 56 L 66 58 L 70 70 L 60 72 L 58 64 L 54 64 L 52 72 L 42 72 L 40 64 L 36 64 L 34 72 Z M 16 30 Q 24 22 38 28 Q 32 36 22 38 Q 18 36 16 30 Z",
  },
  nemean_lion: {
    // Lion head with mane
    d: "M 50 18 C 38 18 28 28 28 40 C 18 44 18 56 28 60 C 28 70 38 78 50 78 C 62 78 72 70 72 60 C 82 56 82 44 72 40 C 72 28 62 18 50 18 Z M 42 44 Q 44 50 42 54 M 58 44 Q 56 50 58 54 M 46 64 Q 50 68 54 64",
    detail: "M 44 44 a 2 2 0 1 1 4 0 a 2 2 0 1 1 -4 0 M 52 44 a 2 2 0 1 1 4 0 a 2 2 0 1 1 -4 0",
  },
  cerberus: {
    // Three dog heads
    d: "M 22 50 C 18 38 26 28 36 30 L 38 40 L 42 38 L 46 30 C 56 28 60 38 56 50 L 58 50 C 54 38 62 28 72 30 L 74 40 L 78 38 L 82 30 C 78 50 70 56 60 56 L 60 70 L 40 70 L 40 56 C 30 56 22 50 22 50 Z",
  },
  griffin: {
    // Eagle head + lion body silhouette
    d: "M 26 70 Q 22 50 32 42 Q 38 38 46 40 L 50 30 Q 52 18 64 22 L 60 28 L 70 30 L 64 36 L 62 42 Q 70 48 76 56 L 78 70 L 64 70 L 60 60 L 50 60 L 46 70 Z",
    detail: "M 56 26 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0",
  },
  phoenix: {
    // Bird with spread fiery wings
    d: "M 50 20 Q 54 26 52 32 Q 56 30 60 26 Q 70 22 76 28 Q 72 36 64 40 Q 72 44 78 52 Q 70 58 60 54 Q 56 60 50 64 Q 44 60 40 54 Q 30 58 22 52 Q 28 44 36 40 Q 28 36 24 28 Q 30 22 40 26 Q 44 30 48 32 Q 46 26 50 20 Z",
  },
  hydra: {
    // Three serpent heads on coiled body
    d: "M 26 70 C 26 60 30 56 38 56 C 34 48 36 38 44 36 C 40 28 44 22 50 22 C 56 22 60 28 56 36 C 64 38 66 48 62 56 C 70 56 74 60 74 70 C 60 74 40 74 26 70 Z M 38 50 Q 40 44 42 50 M 50 36 Q 50 30 52 36 M 60 50 Q 60 44 62 50",
  },
  centaur: {
    // Centaur upper body
    d: "M 28 70 Q 26 56 32 48 L 36 38 Q 40 32 46 34 L 50 22 Q 54 16 60 22 L 60 30 L 56 38 L 62 42 L 68 50 L 70 60 L 72 70 L 62 70 L 60 60 L 50 56 L 42 56 L 40 70 Z",
  },
  sphinx: {
    // Lion body, human-faced head
    d: "M 22 68 C 22 56 28 50 36 50 C 34 38 42 28 50 28 C 58 28 66 38 64 50 C 72 50 78 56 78 68 L 70 70 L 64 64 L 60 60 L 40 60 L 36 64 L 30 70 Z",
    detail: "M 46 44 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0 M 53 44 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0",
  },
  minotaur_calf: {
    // Bull head with horns
    d: "M 30 38 Q 22 28 18 22 Q 26 28 36 32 Q 50 22 64 32 Q 74 28 82 22 Q 78 28 70 38 L 72 50 Q 70 64 60 70 L 40 70 Q 30 64 28 50 Z",
    detail: "M 42 48 a 2 2 0 1 1 4 0 a 2 2 0 1 1 -4 0 M 54 48 a 2 2 0 1 1 4 0 a 2 2 0 1 1 -4 0",
  },
  owl_of_athena: {
    // Owl perched
    d: "M 30 30 Q 50 16 70 30 Q 76 42 72 56 Q 60 78 50 78 Q 40 78 28 56 Q 24 42 30 30 Z",
    detail: "M 40 42 a 4 4 0 1 1 8 0 a 4 4 0 1 1 -8 0 M 52 42 a 4 4 0 1 1 8 0 a 4 4 0 1 1 -8 0 M 46 52 L 50 58 L 54 52 Z",
  },
  harpy: {
    // Bird-woman in flight
    d: "M 50 18 Q 56 22 56 30 L 60 38 Q 70 36 78 30 Q 76 38 70 44 L 64 48 L 60 64 Q 56 70 50 70 Q 44 70 40 64 L 36 48 L 30 44 Q 24 38 22 30 Q 30 36 40 38 L 44 30 Q 44 22 50 18 Z",
  },
  satyr: {
    // Goat-man with horns
    d: "M 38 22 Q 38 12 44 16 L 50 22 L 56 16 Q 62 12 62 22 L 58 30 Q 64 36 62 46 L 64 60 L 60 70 L 40 70 L 36 60 L 38 46 Q 36 36 42 30 Z",
    detail: "M 44 38 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0 M 53 38 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0",
  },
  dryad: {
    // Tree-spirit with leafy crown
    d: "M 28 30 Q 38 18 50 16 Q 62 18 72 30 Q 76 42 70 50 L 64 54 L 62 70 L 38 70 L 36 54 L 30 50 Q 24 42 28 30 Z M 50 30 L 50 70",
  },
  chimera: {
    // Three-headed silhouette
    d: "M 22 56 C 18 44 24 36 32 38 L 32 30 L 40 36 L 44 30 L 50 36 L 56 30 L 60 36 L 68 30 L 68 38 C 76 36 82 44 78 56 L 70 70 L 30 70 Z",
  },
  stymphalian: {
    // Hawk with sharp beak
    d: "M 24 36 L 40 32 L 50 22 L 60 32 L 76 36 L 72 46 L 78 50 L 70 60 L 60 70 L 50 64 L 40 70 L 30 60 L 22 50 L 28 46 Z",
  },
  fire_sprite: {
    // Flame
    d: "M 50 18 Q 56 26 56 36 Q 60 30 64 30 Q 66 40 60 46 Q 70 48 70 60 Q 70 72 50 78 Q 30 72 30 60 Q 30 48 40 46 Q 34 40 36 30 Q 40 30 44 36 Q 44 26 50 18 Z",
  },
  water_nereid: {
    // Wave with droplet
    d: "M 22 56 Q 30 48 38 52 Q 46 56 54 52 Q 62 48 70 52 Q 78 56 78 64 L 78 72 L 22 72 Z M 50 16 Q 56 28 56 36 Q 56 46 50 46 Q 44 46 44 36 Q 44 28 50 16 Z",
  },
  stone_kobalos: {
    // Jagged mountain peak
    d: "M 14 72 L 30 40 L 38 52 L 46 28 L 56 50 L 64 38 L 80 60 L 86 72 Z",
    detail: "M 44 40 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0 M 52 42 a 1.5 1.5 0 1 1 3 0 a 1.5 1.5 0 1 1 -3 0",
  },
};

/** Used as a last-resort fallback if a lineId isn't recognized. */
export const FALLBACK_SILHOUETTE: CreatureSilhouette = {
  d: "M 50 28 a 14 14 0 1 0 0.01 0 z M 28 72 q 22 -16 44 0 L 72 78 L 28 78 Z",
};
