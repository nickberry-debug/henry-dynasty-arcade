// Olympus shops — the drachma economy. Three shop categories per city:
// Smithy (weapons + armor), Apothecary (consumables + tonics),
// Bazaar (cosmetics + curios). Stock is deterministic per hero per
// adventure-count, so opening the same shop twice without progressing
// shows the same inventory — but a completed adventure rotates the
// stock.

import type { Hero } from "./types";

export type ShopKind = "smithy" | "apothecary" | "bazaar";

export interface ShopItem {
  id: string;
  name: string;
  kind: "weapon" | "armor" | "accessory" | "consumable" | "cosmetic" | "artifact";
  /** Sub-kind for weapons. */
  weaponKind?: "sword" | "spear" | "bow" | "staff" | "dagger";
  /** Tier 1-5 for equipment. */
  tier?: number;
  /** Effect description shown in the shop card. */
  effect: string;
  /** Drachma cost. */
  cost: number;
  /** Stat or attribute mutation applied on use/equip. */
  applies?: {
    stat?: keyof Hero["stats"];
    delta?: number;
    hpHeal?: number;
    moraleBoost?: number;
  };
  /** Optional cosmetic appearance change. */
  cosmetic?: Partial<Hero["appearance"]>;
}

// ─── Item catalogs ────────────────────────────────────────────────────
const SMITHY_ITEMS: ShopItem[] = [
  { id: "iron-sword",       name: "Iron Sword",            kind: "weapon", weaponKind: "sword",  tier: 1, effect: "+2 to strikes",                cost: 80 },
  { id: "bronze-spear",     name: "Bronze Spear",          kind: "weapon", weaponKind: "spear",  tier: 1, effect: "Reach. +2 to defensive lines", cost: 75 },
  { id: "horn-bow",         name: "Curved Horn Bow",       kind: "weapon", weaponKind: "bow",    tier: 2, effect: "Ranged. +3 to ambush",         cost: 140 },
  { id: "oak-staff",        name: "Carved Oak Staff",      kind: "weapon", weaponKind: "staff",  tier: 2, effect: "+3 to spellwork",              cost: 150 },
  { id: "hooked-dagger",    name: "Hooked Dagger",         kind: "weapon", weaponKind: "dagger", tier: 2, effect: "+4 to stealth strikes",        cost: 130 },
  { id: "fine-sword",       name: "Damascened Sword",      kind: "weapon", weaponKind: "sword",  tier: 3, effect: "+5 to strikes, fast",          cost: 320 },
  { id: "olympian-spear",   name: "Olympian Spear",        kind: "weapon", weaponKind: "spear",  tier: 4, effect: "+7 to strikes, blessed",       cost: 680 },
  { id: "linen-tunic",      name: "Linen Tunic",           kind: "armor",  tier: 1, effect: "Light protection",                                   cost: 50 },
  { id: "leather-cuirass",  name: "Leather Cuirass",       kind: "armor",  tier: 2, effect: "Moderate protection",                                cost: 180 },
  { id: "bronze-plate",     name: "Bronze Plate",          kind: "armor",  tier: 3, effect: "Heavy protection. -1 agility while worn",            cost: 420, applies: { stat: "agility", delta: -1 } },
  { id: "phalanx-shield",   name: "Phalanx Shield",        kind: "accessory", tier: 3, effect: "+2 endurance, +HP",                               cost: 280, applies: { stat: "endurance", delta: 2 } },
  { id: "hermes-sandals",   name: "Light-Footed Sandals",  kind: "accessory", tier: 3, effect: "+2 agility",                                     cost: 300, applies: { stat: "agility", delta: 2 } },
];

const APOTHECARY_ITEMS: ShopItem[] = [
  { id: "healing-tonic",      name: "Healing Tonic",     kind: "consumable", effect: "Restores 25 HP",                  cost: 40,  applies: { hpHeal: 25 } },
  { id: "stout-tonic",        name: "Stout Tonic",       kind: "consumable", effect: "Restores 60 HP",                  cost: 90,  applies: { hpHeal: 60 } },
  { id: "ambrosia-vial",      name: "Vial of Ambrosia",  kind: "consumable", effect: "Restores full HP",                cost: 240, applies: { hpHeal: 999 } },
  { id: "courage-draught",    name: "Courage Draught",   kind: "consumable", effect: "+10 morale for the next adventure", cost: 55, applies: { moraleBoost: 10 } },
  { id: "wisdom-elixir",      name: "Elixir of Wisdom",  kind: "consumable", effect: "Permanent +1 wisdom",            cost: 380, applies: { stat: "wisdom", delta: 1 } },
  { id: "strength-elixir",    name: "Elixir of Strength",kind: "consumable", effect: "Permanent +1 strength",          cost: 380, applies: { stat: "strength", delta: 1 } },
  { id: "luck-charm",         name: "Olive-Leaf Charm",  kind: "consumable", effect: "Permanent +1 luck",              cost: 280, applies: { stat: "luck", delta: 1 } },
  { id: "swift-tincture",     name: "Swift Tincture",    kind: "consumable", effect: "Permanent +1 agility",           cost: 380, applies: { stat: "agility", delta: 1 } },
  { id: "ironheart-tonic",    name: "Ironheart Tonic",   kind: "consumable", effect: "Permanent +1 endurance",         cost: 340, applies: { stat: "endurance", delta: 1 } },
];

const BAZAAR_ITEMS: ShopItem[] = [
  { id: "scar-cheek",     name: "Cheek Scar (story)",     kind: "cosmetic", effect: "A small scar across the cheek",   cost: 20, cosmetic: { scarLayer: "cheek" } },
  { id: "scar-brow",      name: "Brow Scar",              kind: "cosmetic", effect: "A scar through the brow",         cost: 20, cosmetic: { scarLayer: "brow" } },
  { id: "scar-lip",       name: "Lip Scar",               kind: "cosmetic", effect: "A faint scar at the lip",         cost: 20, cosmetic: { scarLayer: "lip" } },
  { id: "scar-clear",     name: "Healing Salve",          kind: "cosmetic", effect: "Removes existing scars",          cost: 40, cosmetic: { scarLayer: "none" } },
  { id: "haircut-short",  name: "Athenian Haircut",       kind: "cosmetic", effect: "Cropped close",                   cost: 12, cosmetic: { hairStyle: 0 } },
  { id: "haircut-long",   name: "Long Style",             kind: "cosmetic", effect: "Long and wavy",                   cost: 14, cosmetic: { hairStyle: 1 } },
  { id: "haircut-curls",  name: "Curled Cut",             kind: "cosmetic", effect: "Curly on top",                    cost: 14, cosmetic: { hairStyle: 2 } },
  { id: "haircut-knot",   name: "Top Knot",               kind: "cosmetic", effect: "Bound and high",                  cost: 14, cosmetic: { hairStyle: 3 } },
  { id: "haircut-braid",  name: "Braid",                  kind: "cosmetic", effect: "A long braid",                    cost: 14, cosmetic: { hairStyle: 5 } },
  { id: "tunic-red",      name: "Crimson Tunic Dye",      kind: "cosmetic", effect: "Recolour to crimson",             cost: 18, cosmetic: { tunicColor: "#8b1a1a" } },
  { id: "tunic-blue",     name: "Azure Tunic Dye",        kind: "cosmetic", effect: "Recolour to deep blue",           cost: 18, cosmetic: { tunicColor: "#1a3a8b" } },
  { id: "tunic-gold",     name: "Gilded Tunic Dye",       kind: "cosmetic", effect: "Recolour to gold",                cost: 24, cosmetic: { tunicColor: "#DAA520" } },
  { id: "cloak-black",    name: "Midnight Cloak",         kind: "cosmetic", effect: "Recolour cloak to black",         cost: 22, cosmetic: { cloakColor: "#1a1a1a" } },
  { id: "cloak-purple",   name: "Tyrian Cloak",           kind: "cosmetic", effect: "Recolour cloak to royal purple",  cost: 28, cosmetic: { cloakColor: "#4a1a5a" } },
  { id: "beard-stubble",  name: "Stubble",                kind: "cosmetic", effect: "Just a hint of beard",            cost: 8,  cosmetic: { facialHair: 1 } },
  { id: "beard-full",     name: "Full Beard",             kind: "cosmetic", effect: "Full beard",                      cost: 14, cosmetic: { facialHair: 2 } },
  { id: "beard-goatee",   name: "Goatee",                 kind: "cosmetic", effect: "Pointed goatee",                  cost: 14, cosmetic: { facialHair: 3 } },
  { id: "beard-clean",    name: "Clean Shave",            kind: "cosmetic", effect: "Razor-clean",                     cost: 8,  cosmetic: { facialHair: 0 } },
];

/** Compute the rotated stock for a given hero + shop. The hero's
 *  adventuresCompleted count is used as a seed so the stock changes
 *  after each adventure. */
export function getShopStock(hero: Hero, kind: ShopKind): ShopItem[] {
  const allItems = kind === "smithy" ? SMITHY_ITEMS : kind === "apothecary" ? APOTHECARY_ITEMS : BAZAAR_ITEMS;
  // Bazaar always shows everything (cosmetics are always available).
  if (kind === "bazaar") return allItems;
  // Smithy + Apothecary: rotate stock based on adventuresCompleted.
  // Take 6 items, picked deterministically.
  const seed = hero.adventuresCompleted * 7 + hero.id.charCodeAt(0);
  const rng = mulberry32(seed);
  const shuffled = allItems.slice().sort(() => rng() - 0.5);
  return shuffled.slice(0, 8);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Apply a purchase to the hero. Returns the updated hero (caller is
 *  responsible for saving). Returns null if insufficient drachma. */
export function purchaseItem(hero: Hero, item: ShopItem): { ok: boolean; reason?: string } {
  if (hero.drachma < item.cost) return { ok: false, reason: "Not enough drachma" };
  hero.drachma -= item.cost;

  if (item.kind === "weapon") {
    hero.equipment.weapon = { name: item.name, kind: item.weaponKind ?? "sword", tier: item.tier ?? 1 };
  } else if (item.kind === "armor") {
    hero.equipment.armor = { name: item.name, tier: item.tier ?? 1 };
  } else if (item.kind === "accessory") {
    hero.equipment.accessory = { name: item.name };
  } else if (item.kind === "consumable") {
    // Some consumables are instant-use (healing, morale, permanent stat
    // boost). Apply right away; otherwise drop into inventory.
    if (item.applies?.hpHeal) {
      hero.hp = Math.min(hero.hpMax, hero.hp + item.applies.hpHeal);
    }
    // moraleBoost — Hero type doesn't carry a morale field at the top level;
    // we just count this as a flavor consumable in inventory.
    // For tinctures granting permanent stat — apply immediately and also
    // record in inventory as a flavor entry.
    hero.inventory.push({
      id: `inv-${Date.now()}-${item.id}`,
      name: item.name,
      kind: "consumable",
      qty: 1,
      description: item.effect,
    });
  } else if (item.kind === "cosmetic" && item.cosmetic) {
    hero.appearance = { ...hero.appearance, ...item.cosmetic };
  }

  // Permanent stat changes (also applies to non-consumables)
  if (item.applies?.stat && item.applies.delta) {
    hero.stats[item.applies.stat] = Math.max(1, hero.stats[item.applies.stat] + item.applies.delta);
  }

  hero.modifiedAt = Date.now();
  return { ok: true };
}

export const SHOP_INFO: Record<ShopKind, { name: string; tagline: string; emoji: string; greeting: string }> = {
  smithy: {
    name: "The Smithy",
    tagline: "Weapons and armor, forged in fire",
    emoji: "⚒️",
    greeting: "Welcome to old Theron's forge. Bronze, iron, and the occasional piece worth more than gold.",
  },
  apothecary: {
    name: "Phaedra's Apothecary",
    tagline: "Tinctures, tonics, and ambrosia for the bold",
    emoji: "🧪",
    greeting: "I have what you need, traveller. Drink carefully — some bottles are stronger than they look.",
  },
  bazaar: {
    name: "The Marketplace",
    tagline: "Cosmetics, cuts, and curios",
    emoji: "🪶",
    greeting: "A haircut? A new tunic? A scar to give people something to wonder about? All here. Browse a while.",
  },
};
