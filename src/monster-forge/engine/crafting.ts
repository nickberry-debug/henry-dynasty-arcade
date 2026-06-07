// Monster Forge — Phase 2 crafting bench.
//
// Recipes are unordered pairs of potion ids → an output potion id.
// We normalize each pair by sorting alphabetically so order doesn't matter
// (Fire + Ice == Ice + Fire). Multiple "alt paths" can land on the same
// output potion so kids stumble onto recipes more often during exploration.
//
// Discovered recipe ids persist per-profile in localStorage so the player
// keeps their progression across sessions.

import { profileKey } from "../../profiles/store";

export interface CraftRecipe {
  /** Sorted alphabetically — [a,b] always normalized. */
  inputs: [string, string];
  output: string;
}

const RECIPES_RAW: Array<{ a: string; b: string; out: string }> = [
  // Canonical recipes from the Phase 2 spec
  { a: "fire",        b: "ice",         out: "steam_burst" },
  { a: "grow",        b: "vigor",       out: "titan_brew" },
  { a: "shade",       b: "toxic",       out: "plague_mist" },
  { a: "spark",       b: "wind",        out: "tempest_surge" },
  { a: "crystal",     b: "golden_glow", out: "prism" },
  { a: "metallic",    b: "fury",        out: "warforged" },
  { a: "extra_horns", b: "spike_coat",  out: "demon_aspect" },
  // Alt paths — kids land on the same recipe via thematic combinations.
  { a: "ice",         b: "wind",        out: "tempest_surge" },
  { a: "shade",       b: "ghost_glow",  out: "plague_mist" },
  { a: "giant",       b: "iron_skin",   out: "titan_brew" },
  { a: "fire",        b: "fury",        out: "warforged" },
  { a: "crystal",     b: "ghost_glow",  out: "prism" },
  { a: "spike_coat",  b: "extra_arms",  out: "demon_aspect" },
  { a: "fire",        b: "aqua",        out: "steam_burst" },
];

const RECIPES: CraftRecipe[] = RECIPES_RAW.map(r => {
  const [a, b] = [r.a, r.b].sort();
  return { inputs: [a, b], output: r.out };
});

/** Try to craft from two potion ids. Returns the output potion id, or null. */
export function tryCraft(potionA: string, potionB: string): string | null {
  if (!potionA || !potionB || potionA === potionB) return null;
  const [a, b] = [potionA, potionB].sort();
  const found = RECIPES.find(r => r.inputs[0] === a && r.inputs[1] === b);
  return found ? found.output : null;
}

/** Count of unique craftable output potions. */
export function recipeOutputCount(): number {
  return new Set(RECIPES.map(r => r.output)).size;
}

/** Count of total recipe paths (incl. alt routes). */
export function recipePathCount(): number {
  return RECIPES.length;
}

// ─── Per-profile localStorage persistence ───────────────────────────────

const KEY = "henry-monster-forge-recipes-v1";

export function loadDiscovered(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(profileKey(KEY));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function saveDiscovered(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(profileKey(KEY), JSON.stringify(ids));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export function addDiscovered(id: string): string[] {
  const cur = loadDiscovered();
  if (cur.includes(id)) return cur;
  const next = [...cur, id];
  saveDiscovered(next);
  return next;
}
