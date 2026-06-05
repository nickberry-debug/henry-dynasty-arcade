// Potion Lab — progressive hint library.
//
// For each known recipe, ship THREE escalating hints that teach the
// reasoning rather than reveal the answer:
//   • level 1 (conceptual): a property/theme nudge ("needs something
//     fiery", "think about what calms not excites").
//   • level 2 (category): narrow the field ("a root, not a flower",
//     "two of your picks are clashing").
//   • level 3 (specific): name one correct ingredient, leave the rest
//     for the player to figure out.
//
// Driven by save.recipeMisses[recipeId]:
//   misses === 0 → show level 1 (you haven't tried yet)
//   misses === 1 → show level 1 (the property nudge still)
//   misses === 2 → show level 2 (narrow the field)
//   misses >= 3  → show level 3 + the optional REVEAL escape hatch
//
// The escape-hatch reveal stays optional even at miss 3 — the player
// can keep trying. The kid never gets stuck on a required recipe.

export interface RecipeHints {
  level1: string;
  level2: string;
  level3: string;
}

export const HINTS: Record<string, RecipeHints> = {
  vitality_tonic: {
    level1: "An apprentice's first brew. Think energy — something cool, something fresh, and a little spark.",
    level2: "You need ONE fire element, ONE water element, and a green herb that wakes you up.",
    level3: "Mint is the key. The other two are the basics — fire and water in their plainest forms.",
  },
  calm_brew: {
    level1: "Opposite of excitement. Slow, watery, grounded. Think still pond.",
    level2: "Water + earth, no fire. The earth piece should be something that doesn't move.",
    level3: "River Pebble holds memory of the river. Pair it with moonwater and something quiet that grows.",
  },
  lucky_draught: {
    level1: "A polite request to fortune. Green, gold, and a little sweet.",
    level2: "One clover, one sweet, and a strand of metal that catches light.",
    level3: "Gold Thread is what fortune notices. Add the obvious lucky herb and a touch of honey.",
  },
  courage_cordial: {
    level1: "Heat, not warmth. A fire to steel shaky hands.",
    level2: "Two fire ingredients (one small, one sharp) and something that promises a wish.",
    level3: "Wishbone is the steadier — pair it with the spiciest pepper and a humble flame.",
  },
  sleep_syrup: {
    level1: "Drift. Soft. Cloud + water + a tree that bends in the wind.",
    level2: "One cloud-soft flower, water, and bark from a tree that knows yielding.",
    level3: "Cloudbloom for the drift, moonwater for the depth, willow bark for the bend.",
  },
  focus_elixir: {
    level1: "Sharp and bright. The kind of breath that wakes your mind.",
    level2: "An herb that clears the head, a sparkle, and a breeze.",
    level3: "Bright Mint focuses, Spirit Sugar sparkles, Windseed carries the focus.",
  },
  kindness_balm: {
    level1: "What does softness need? Something feathery, something sweet, something patient.",
    level2: "A soft white thing, a sweetener, and bark that bends.",
    level3: "White Feather + Honeydrop + Willow Bark — gentleness in three forms.",
  },
  summer_lemonade: {
    level1: "Not a potion really — a perfect afternoon in a cup.",
    level2: "Fire that warms (not burns), honey, and water-smoothed stone.",
    level3: "Dustflame for the spark, Honeydrop for the sweet, River Pebble for the chill.",
  },
  spirit_glow: {
    level1: "Light without heat. Bright but gentle.",
    level2: "Something soft and white, sparkly sugar, and a piece of the night sky.",
    level3: "White Feather, Spirit Sugar, Starlight — three flavors of glow.",
  },
  frog_chorus: {
    level1: "Listen to ponds. Water and dusk things.",
    level2: "A mushroom that croaks, moonwater, and a smoothed stone.",
    level3: "Frogspot Mushroom is the translator. Pair it with moonwater and a river pebble.",
  },
  feather_step: {
    level1: "Air, air, air. Nothing heavy. Float, don't stomp.",
    level2: "Three things that drift on a breeze.",
    level3: "White Feather, Windseed, Cloudbloom — pick all three soft-and-airy.",
  },
  warm_hearth: {
    level1: "Home in a cup. Warm, sweet, woody.",
    level2: "A flame, a sweet, and tree-wood.",
    level3: "Dustflame, Honeydrop, Willow Bark — fireside in a flask.",
  },
};

export function hintFor(recipeId: string, missCount: number): string | null {
  const h = HINTS[recipeId];
  if (!h) return null;
  if (missCount >= 3) return h.level3;
  if (missCount >= 2) return h.level2;
  return h.level1;
}

/** Used by the Cauldron to label the current hint level. */
export function hintLabel(missCount: number): { label: string; color: string } {
  if (missCount >= 3) return { label: "WHISPER — one ingredient revealed", color: "#fde047" };
  if (missCount >= 2) return { label: "GUIDANCE — narrowing the field", color: "#86efac" };
  return { label: "NUDGE — feel the theme", color: "#c084fc" };
}
