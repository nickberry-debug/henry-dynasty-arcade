// content/items.ts — Item DB: 20+ unique base items across rarities.
//
// Each entry is a template; the loot engine clones + assigns affixes based on
// rolled rarity. Affixes (rare/epic/legendary) come from a separate pool below.

import type { Item, ItemSlot, Rarity, ItemAffix, DungeonClassId } from "../types";

export interface ItemTemplate {
  baseId: string;
  name: string;
  slot: ItemSlot;
  baseIlvl: number;
  damage?: [number, number];
  armor?: number;
  classLock?: DungeonClassId;
  icon: string;
  flavor?: string;
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // ─── Weapons (warrior preferred — swords/axes/maces) ───────────────────
  { baseId: "rusty_sword",       name: "Rusty Sword",       slot: "weapon", baseIlvl: 1, damage: [3, 6],   classLock: "warrior", icon: "sword", flavor: "Better than nothing. Barely." },
  { baseId: "iron_blade",        name: "Iron Blade",        slot: "weapon", baseIlvl: 3, damage: [6, 10],  classLock: "warrior", icon: "sword", flavor: "Honest steel." },
  { baseId: "warhammer",         name: "Warhammer",         slot: "weapon", baseIlvl: 5, damage: [10, 16], classLock: "warrior", icon: "hammer", flavor: "Subtlety is for cowards." },
  { baseId: "doomforged_axe",    name: "Doomforged Axe",    slot: "weapon", baseIlvl: 8, damage: [14, 22], classLock: "warrior", icon: "axe", flavor: "Quenched in tears." },
  { baseId: "skullsplitter",     name: "Skullsplitter",     slot: "weapon", baseIlvl: 10, damage: [20, 30], classLock: "warrior", icon: "axe", flavor: "It hums when blood is near." },

  // ─── Weapons (ranger — bows) ───────────────────────────────────────────
  { baseId: "shortbow",          name: "Shortbow",          slot: "weapon", baseIlvl: 1, damage: [2, 5],   classLock: "ranger",  icon: "bow", flavor: "Hand-strung. Smells like pine." },
  { baseId: "hunting_bow",       name: "Hunter's Bow",      slot: "weapon", baseIlvl: 3, damage: [5, 9],   classLock: "ranger",  icon: "bow", flavor: "Brought down a stag at 80 paces." },
  { baseId: "yew_longbow",       name: "Yew Longbow",       slot: "weapon", baseIlvl: 5, damage: [9, 14],  classLock: "ranger",  icon: "bow", flavor: "Two centuries old. Still whispers." },
  { baseId: "moonsilver_bow",    name: "Moonsilver Bow",    slot: "weapon", baseIlvl: 8, damage: [13, 20], classLock: "ranger",  icon: "bow", flavor: "Bowstrings of starlight." },
  { baseId: "stormcaller",       name: "Stormcaller",       slot: "weapon", baseIlvl: 10, damage: [18, 28], classLock: "ranger",  icon: "bow", flavor: "Each arrow drags a thunderclap." },

  // ─── Weapons (mage — staves/wands) ─────────────────────────────────────
  { baseId: "apprentice_staff",  name: "Apprentice Staff",  slot: "weapon", baseIlvl: 1, damage: [2, 4],   classLock: "mage",    icon: "staff", flavor: "First-year academy issue." },
  { baseId: "runed_wand",        name: "Runed Wand",        slot: "weapon", baseIlvl: 3, damage: [4, 8],   classLock: "mage",    icon: "staff", flavor: "Glows when angry." },
  { baseId: "wizards_staff",     name: "Wizard's Staff",    slot: "weapon", baseIlvl: 5, damage: [8, 13],  classLock: "mage",    icon: "staff", flavor: "Topped with an unblinking gem." },
  { baseId: "archmage_staff",    name: "Archmage's Staff",  slot: "weapon", baseIlvl: 8, damage: [12, 19], classLock: "mage",    icon: "staff", flavor: "Channels far more than it should." },
  { baseId: "void_scepter",      name: "Void Scepter",      slot: "weapon", baseIlvl: 10, damage: [16, 26], classLock: "mage",    icon: "staff", flavor: "The blackness at the tip is hungry." },

  // ─── Armor ─────────────────────────────────────────────────────────────
  { baseId: "leather_jerkin",    name: "Leather Jerkin",    slot: "armor",  baseIlvl: 1, armor: 3,  classLock: "warrior", icon: "armor", flavor: "Stiff. Squeaks." },
  { baseId: "scout_leathers",    name: "Scout Leathers",    slot: "armor",  baseIlvl: 1, armor: 2,  classLock: "ranger",  icon: "armor", flavor: "Camouflage stitched into the seams." },
  { baseId: "novice_robes",      name: "Novice Robes",      slot: "armor",  baseIlvl: 1, armor: 1,  classLock: "mage",    icon: "armor", flavor: "Threadbare. Still warm." },
  { baseId: "chainmail",         name: "Chainmail",         slot: "armor",  baseIlvl: 3, armor: 6,  icon: "armor", flavor: "Heavy. Clinks." },
  { baseId: "plate_harness",     name: "Plate Harness",     slot: "armor",  baseIlvl: 6, armor: 12, icon: "armor", flavor: "Forged for a knight who didn't come back." },
  { baseId: "dragonscale",       name: "Dragonscale Armor", slot: "armor",  baseIlvl: 9, armor: 20, icon: "armor", flavor: "Each scale still warm from the fire." },

  // ─── Trinkets (universal) ──────────────────────────────────────────────
  { baseId: "copper_ring",       name: "Copper Ring",       slot: "trinket", baseIlvl: 1, icon: "ring", flavor: "Tarnished. Probably cursed." },
  { baseId: "amulet_of_focus",   name: "Amulet of Focus",   slot: "trinket", baseIlvl: 3, icon: "amulet", flavor: "Faint hum of concentration." },
  { baseId: "ring_of_vigor",     name: "Ring of Vigor",     slot: "trinket", baseIlvl: 5, icon: "ring", flavor: "Warm against the skin." },
  { baseId: "talisman_of_woe",   name: "Talisman of Woe",   slot: "trinket", baseIlvl: 7, icon: "amulet", flavor: "It weeps when you forget it." },
  { baseId: "crown_shard",       name: "Crown Shard",       slot: "trinket", baseIlvl: 10, icon: "crown", flavor: "Part of something older than the dungeon." },
];

export const TEMPLATE_BY_ID: Record<string, ItemTemplate> = Object.fromEntries(
  ITEM_TEMPLATES.map(t => [t.baseId, t])
);

// ─── Affix pool — tiers 1..3 (rare/epic/legendary stack count) ────────────
export const AFFIX_POOL: ItemAffix[] = [
  { label: "+%d Strength",  stat: "strength",  bonus: 0 },
  { label: "+%d Intellect", stat: "intellect", bonus: 0 },
  { label: "+%d Agility",   stat: "agility",   bonus: 0 },
  { label: "+%d Vitality",  stat: "vitality",  bonus: 0 },
  { label: "+%d Damage",    damageBonus: 0 },
  { label: "+%d Armor",     armorBonus: 0 },
  { label: "+%d%% Lifesteal", lifesteal: 0 },
  { label: "+%d%% Critical Strike", critBonus: 0 },
];

/** How many affixes each rarity rolls. */
export const RARITY_AFFIX_COUNT: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 4,
};

/** Rarity-to-color for UI. */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#cbd5e1",   // slate-300
  rare: "#60a5fa",     // blue-400
  epic: "#c084fc",     // purple-400
  legendary: "#fbbf24" // amber-400
};

export const RARITY_NAME: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** Damage scaling per affix tier (for "+X Damage" rolls). */
export const AFFIX_VALUE_BANDS = {
  stat:        { common: [0, 0], rare: [1, 2], epic: [2, 4],  legendary: [4, 7] },
  damageBonus: { common: [0, 0], rare: [1, 3], epic: [3, 6],  legendary: [6, 12] },
  armorBonus:  { common: [0, 0], rare: [1, 2], epic: [2, 4],  legendary: [4, 8] },
  lifesteal:   { common: [0, 0], rare: [3, 5], epic: [5, 8],  legendary: [8, 15] },
  critBonus:   { common: [0, 0], rare: [3, 5], epic: [5, 10], legendary: [10, 20] },
} as const;
