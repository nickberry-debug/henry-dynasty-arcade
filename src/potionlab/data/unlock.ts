// Potion Lab — progressive ingredient unlocking.
//
// New apprentices were overwhelmed by all 80 ingredients at once with no
// idea what combined into what. Instead we reveal a small starter set and
// unlock more as the player discovers recipes. The reveal order is hand-
// tuned so the ingredients needed for the next Grimoire recipe are always
// unlocked by the time the guide points the player at it.
//
// SAFETY NET (B.1): visibleIngredientIds() also unions in every ingredient
// of the NEXT undiscovered known recipe, so even if PRIORITY ever drifts
// out of sync with KNOWN_RECIPES order, the player can ALWAYS tap every
// ingredient the guide is asking them to add. Locked bonus ingredients
// only ever appear in optional/secret recipes — never block progress.

import { INGREDIENTS } from "./ingredients";
import { KNOWN_RECIPES } from "./recipes";

// First the recipe-critical commons, ordered so each batch of 3 enables the
// next known recipes (see KNOWN_RECIPES order in recipes.ts). After these,
// every remaining ingredient is appended in catalog order for late-game
// secret-recipe hunting.
const PRIORITY: string[] = [
  // Starter 6 — makes Vitality Tonic + Calm Brew right away.
  "moonwater", "dustflame", "mint_leaf", "river_pebble", "moss_of_quiet", "willow_bark",
  // +3 → Lucky Draught, Summer Lemonade, Warm Hearth
  "honey_drop", "clovergreen", "gold_thread",
  // +3 → Sleep Syrup, Courage Cordial
  "cloudbloom", "ember_pepper", "wishbone",
  // +3 → Focus Elixir, Kindness Balm, Featherstep
  "feather_white", "windseed", "spirit_sugar",
  // +3 → Spirit Glow, Frog Chorus
  "starlight", "frogspot", "salt_of_dawn",
];

export const UNLOCK_SEQUENCE: string[] = (() => {
  const seen = new Set(PRIORITY);
  const rest = INGREDIENTS.map(i => i.id).filter(id => !seen.has(id));
  return [...PRIORITY, ...rest];
})();

/** How many ingredients are unlocked at a given discovery count.
 *  Start with 6, reveal 3 more per recipe discovered. */
export function unlockedCount(discovered: number): number {
  return Math.min(UNLOCK_SEQUENCE.length, 6 + discovered * 3);
}

/** Set of currently-unlocked ingredient ids. The next undiscovered known
 *  recipe's ingredients are ALWAYS unioned in, so progression can never
 *  block on a locked ingredient (B.1 safety net).
 *
 *  TIER GATING (added with the discovery layer): legendary + mythic
 *  ingredients ('Epic' + 'Ultra' in the user-facing copy) are stripped
 *  from the base reveal — they unlock one-by-one as the player makes
 *  HIDDEN recipe discoveries (curiosity is rewarded with power). The
 *  safety-net still auto-unlocks any legendary/mythic a KNOWN recipe
 *  needs, so the required path never blocks. */
export function visibleIngredientIds(
  discovered: number,
  discoveredIds: string[] = [],
  hiddenDiscoveryCount: number = 0,
): Set<string> {
  const set = new Set<string>();
  // Pull common/uncommon/rare from the existing progressive reveal.
  for (const id of UNLOCK_SEQUENCE.slice(0, unlockedCount(discovered))) {
    const ing = INGREDIENTS.find(i => i.id === id);
    if (!ing) continue;
    if (ing.rarity === "legendary" || ing.rarity === "mythic") continue;
    set.add(id);
  }
  // Safety net: ingredients in the next undiscovered known recipe are
  // always unlocked, regardless of tier.
  const next = KNOWN_RECIPES.find(r => !discoveredIds.includes(r.id));
  if (next) for (const id of next.ingredients) set.add(id);
  // Epic/Ultra unlocks via hidden-recipe discovery — curiosity layer.
  // Each hidden discovery unlocks one Legendary in catalog order;
  // every 3 hidden discoveries unlocks one Mythic.
  const legendaries = INGREDIENTS.filter(i => i.rarity === "legendary").map(i => i.id);
  const legendariesToShow = Math.min(legendaries.length, hiddenDiscoveryCount);
  for (let i = 0; i < legendariesToShow; i++) set.add(legendaries[i]);
  const mythics = INGREDIENTS.filter(i => i.rarity === "mythic").map(i => i.id);
  const mythicsToShow = Math.min(mythics.length, Math.floor(hiddenDiscoveryCount / 3));
  for (let i = 0; i < mythicsToShow; i++) set.add(mythics[i]);
  return set;
}

/** How many Legendary/Mythic slots are still locked behind hidden discovery. */
export function epicUltraLockedCount(hiddenDiscoveryCount: number): { epic: number; ultra: number } {
  const legendaryTotal = INGREDIENTS.filter(i => i.rarity === "legendary").length;
  const mythicTotal = INGREDIENTS.filter(i => i.rarity === "mythic").length;
  return {
    epic: Math.max(0, legendaryTotal - Math.min(legendaryTotal, hiddenDiscoveryCount)),
    ultra: Math.max(0, mythicTotal - Math.min(mythicTotal, Math.floor(hiddenDiscoveryCount / 3))),
  };
}

/** How many ingredients are still locked (for the "X more to discover" hint). */
export function lockedRemaining(discovered: number): number {
  return UNLOCK_SEQUENCE.length - unlockedCount(discovered);
}
