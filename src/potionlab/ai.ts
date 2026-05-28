// Potion Lab — AI Brewmaster. Two responsibilities:
//   1. Narrate a brew when the player tries a combo (matched or not).
//   2. Suggest a hint when the player has been stuck.
// Falls back to handwritten templates when there's no Anthropic key.

import { callAI } from "../wordplay/ai";
import { INGREDIENTS, type Ingredient } from "./data/ingredients";
import type { Recipe } from "./data/recipes";

function ingredientNames(ids: string[]): string {
  return ids.map(id => INGREDIENTS.find(i => i.id === id)?.name ?? id).join(", ");
}

// ─── Narration ──────────────────────────────────────────────

const MATCH_TEMPLATES = [
  (r: Recipe) => `Beckett — that's ${r.name}! The cauldron hummed at "perfect." ${r.effect}`,
  (r: Recipe) => `Look at that color. ${r.name}, exactly as the grimoire describes. ${r.effect}`,
  (r: Recipe) => `Steady. Steady. Yes — ${r.name}. ${r.effect}`,
];

const MISS_TEMPLATES = [
  "Hm. The cauldron fizzed, then settled. Not a recipe I know — but the ingredients smell promising. Try one substitution?",
  "Interesting brew. It's stable, but it isn't a *named* potion yet. Maybe the grimoire is missing this one — or maybe you're one ingredient off.",
  "The color is unusual. Not bad, just… not a recipe yet. Take a deep breath and reconsider. What if one of those was a different element?",
  "Bubbles, but no glow. Close, perhaps. Sometimes the right combo is the same three ingredients with one extra.",
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

  const system = `You are the Brewmaster — a warm, slightly eccentric mentor for an 8-13 year old apprentice potion brewer.
Address the apprentice as Beckett. Speak in 2-4 sentences. Reference specific ingredients by name.
Tone: encouraging, curious, a little dramatic about good results. Never scolding.
${matched
    ? `Beckett just brewed: ${matched.name}. Effect: ${matched.effect}. This is a ${matched.kind === "easter" ? "RARE EASTER-EGG discovery — be excited" : matched.kind === "secret" ? "SECRET recipe — be delighted they found it" : "well-known recipe — gentle praise"}.`
    : `The combo doesn't match a known recipe. Comment kindly on what they tried, hint at what might be missing. Don't reveal any actual recipe.`}`;

  const user = `Ingredients used: ${names}.
${matched ? `Lore from the grimoire: ${matched.lore}` : ""}

Narrate the brew aloud, in character.`;

  const raw = await callAI({ system, user, maxTokens: 250, model: matched?.kind === "easter" ? "rich" : "fast" });
  if (raw && raw.length > 20 && raw.length < 800) return raw.trim();

  // Fallback to templates
  if (matched) {
    if (isEasterEgg) return `✨ Beckett — you found one! ${matched.name}. ${matched.effect}`;
    return MATCH_TEMPLATES[Math.floor(Math.random() * MATCH_TEMPLATES.length)](matched);
  }
  return MISS_TEMPLATES[Math.floor(Math.random() * MISS_TEMPLATES.length)];
}

// ─── Hints ──────────────────────────────────────────────────

export async function brewmasterHint(args: {
  discoveredCount: number;
  recentMisses: string[][];
}): Promise<string> {
  const { discoveredCount, recentMisses } = args;
  const system = `You are the Brewmaster mentoring 8-13yo apprentice Beckett. Give ONE hint about a kind of potion to try.
Don't reveal exact recipes. Be playful. 1-2 sentences. Reference ingredient *categories* (fire, water, calm, lucky, sleep) not specific ids.`;
  const user = `Beckett has discovered ${discoveredCount} recipes so far. Recent failed brews (most recent first):
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
