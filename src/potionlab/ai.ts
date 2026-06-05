// Potion Lab — AI Brewmaster. Two responsibilities:
//   1. Narrate a brew when the player tries a combo (matched or not).
//   2. Suggest a hint when the player has been stuck.
// Falls back to handwritten templates when there's no Anthropic key.

import { callAI } from "../wordplay/ai";
import { INGREDIENTS, type Ingredient } from "./data/ingredients";
import type { Recipe } from "./data/recipes";
import { getActivePlayerName } from "../profiles/store";

function ingredientNames(ids: string[]): string {
  return ids.map(id => INGREDIENTS.find(i => i.id === id)?.name ?? id).join(", ");
}

// ─── Narration ──────────────────────────────────────────────

const MATCH_TEMPLATES = [
  (r: Recipe, name: string) => `That's ${r.name}, ${name}! ✨`,
  (r: Recipe) => `Yes — ${r.name}! Perfect.`,
  (r: Recipe) => `${r.name}! The cauldron loves it.`,
];

const MISS_TEMPLATES = [
  "Fizzed and settled — not a recipe yet. Try swapping one!",
  "Close! Maybe one different ingredient?",
  "Not a known potion yet. Tweak one and try again!",
];

const HINT_TEMPLATES = [
  "Try a moonlit-water base and add a calm-element. Apprentices learn that one first.",
  "If you want courage, fire-things tend to help. But fire alone isn't enough — what tempers fire?",
  "Sleep recipes usually involve cloud-stuff. And willow. Always willow.",
];

export async function narrateBrew(args: {
  ingredients: string[];
  matched: Recipe | null;
  isEasterEgg: boolean;
}): Promise<string> {
  const { ingredients, matched, isEasterEgg } = args;
  const names = ingredientNames(ingredients);
  const player = getActivePlayerName("friend");

  const system = `You are the Brewmaster, a warm mentor for the apprentice ${player}.
Reply in ONE short, cheerful sentence (max 14 words). No preamble. Mention the potion or one ingredient.
${matched
    ? `${player} brewed: ${matched.name}. ${matched.kind === "easter" ? "A rare easter egg — be thrilled!" : matched.kind === "secret" ? "A secret recipe — be delighted!" : "A known recipe — cheer them on."}`
    : `Not a known recipe. Encourage them warmly to try swapping one ingredient. Don't reveal any recipe.`}`;

  const user = `Ingredients: ${names}. One short cheerful line:`;

  const raw = await callAI({ system, user, maxTokens: 60, model: "fast" });
  if (raw && raw.length > 8 && raw.length < 200) return raw.trim();

  // Fallback to templates
  if (matched) {
    if (isEasterEgg) return `✨ ${player} — you found one! ${matched.name}. ${matched.effect}`;
    const tmpl = MATCH_TEMPLATES[Math.floor(Math.random() * MATCH_TEMPLATES.length)];
    return tmpl(matched, player);
  }
  return MISS_TEMPLATES[Math.floor(Math.random() * MISS_TEMPLATES.length)];
}

// ─── Hints ──────────────────────────────────────────────────

export async function brewmasterHint(args: {
  discoveredCount: number;
  recentMisses: string[][];
}): Promise<string> {
  const { discoveredCount, recentMisses } = args;
  const player = getActivePlayerName("the apprentice");
  const system = `You are the Brewmaster mentoring apprentice ${player}. Give ONE hint about a kind of potion to try.
Don't reveal exact recipes. Be playful. 1-2 sentences. Reference ingredient *categories* (fire, water, calm, lucky, sleep) not specific ids.`;
  const user = `${player} has discovered ${discoveredCount} recipes so far. Recent failed brews (most recent first):
${recentMisses.slice(0, 3).map((m, i) => `${i + 1}. ${ingredientNames(m)}`).join("\n") || "(none)"}

Suggest one direction to explore. Keep it warm and short.`;

  const raw = await callAI({ system, user, maxTokens: 120 });
  if (raw && raw.length > 10 && raw.length < 300) return raw.trim();
  return HINT_TEMPLATES[Math.floor(Math.random() * HINT_TEMPLATES.length)];
}

// ─── Bottle name generator (fun) ────────────────────────────

export async function bottleNickname(matched: Recipe): Promise<string> {
  const system = "You name potions in 1-3 words. Whimsical, never silly. No punctuation. Output the name only.";
  const user = `Recipe: ${matched.name}. Effect: ${matched.effect}. Give it a brewmaster's casual nickname.`;
  const raw = await callAI({ system, user, maxTokens: 30 });
  return (raw && raw.length > 1 && raw.length < 40) ? raw.replace(/["']/g, "").trim() : matched.name;
}

/** Used for the "siren" easter egg — generate a tiny lullaby line. */
export async function sirenLullaby(): Promise<string> {
  const system = "You write one-line lullabies for children. 8-15 words. Gentle. Output only the line.";
  const user = "Write a short lullaby line about a sleepy sea.";
  const raw = await callAI({ system, user, maxTokens: 40 });
  return raw?.replace(/["']/g, "").trim()
    || "Hush, little wave — the moon is your blanket, the tide is your song.";
}

export function ingredientLookup(): Ingredient[] { return INGREDIENTS; }
