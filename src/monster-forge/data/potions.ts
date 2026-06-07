// Monster Forge — Phase 2 potion library.
//
// 32 base potions across 6 categories + 7 crafted potions (unlocked via the
// crafting bench). Each potion's `effect` is a declarative spec consumed by
// engine/effects.ts at assembly time and engine/stats.ts for stat math.
//
// Categories:
//   size       — multiply monster root scale
//   color      — hex tint on body materials (lerp toward target)
//   elemental  — visual particle aura around the monster (real Three.js)
//   mutation   — procedural geometry attached at body sockets
//   stat       — pure stat delta, no visual change
//   texture    — material property override (metalness/roughness/opacity)

import type { StatBlock } from "../engine/stats";

export type PotionCategory =
  | "size" | "color" | "elemental" | "mutation" | "stat" | "texture";

export type Rarity = "common" | "rare" | "legendary";

export type ElementId =
  | "fire" | "ice" | "spark" | "shade" | "toxic" | "aqua" | "earth" | "wind"
  // crafted
  | "steam" | "plague" | "tempest";

export type MutationId =
  | "extra_horns" | "bat_wings" | "spike_coat"
  | "extra_eyes" | "extra_arms" | "tail_boost"
  // crafted
  | "demon_aspect";

export interface PotionEffect {
  /** Multiply monster root scale (chains multiplicatively across active potions) */
  scaleMul?: number;
  /** Lerp body materials toward this hex (0.55 mix so original shading reads) */
  tintHex?: string;
  /** Emissive material override hex */
  glowHex?: string;
  /** Emissive intensity (default 0.8) */
  glowIntensity?: number;
  /** Spawns a Three.js particle aura around the monster */
  aura?: ElementId;
  /** Spawns procedural mutation geometry at body sockets */
  mutation?: MutationId;
  /** Material property overrides */
  material?: {
    metalness?: number;
    roughness?: number;
    transparent?: boolean;
    opacity?: number;
  };
  /** Stat delta applied to base stats */
  statDelta?: Partial<StatBlock>;
}

export interface Potion {
  id: string;
  name: string;
  emoji: string;
  category: PotionCategory;
  rarity: Rarity;
  description: string;
  effect: PotionEffect;
  /** True for crafted potions — hidden until discovered. */
  crafted?: boolean;
}

// ─── Base library (32 potions, visible immediately) ─────────────────────
export const POTIONS: Potion[] = [
  // ─── Size (4) ────────────────────────────────────────────────────────
  { id: "shrink", name: "Shrink Sip", emoji: "🤏", category: "size", rarity: "common",
    description: "Makes your monster small and quick.",
    effect: { scaleMul: 0.6, statDelta: { spd: +2, def: -1 } } },
  { id: "tiny", name: "Pocket Brew", emoji: "🫧", category: "size", rarity: "rare",
    description: "Pocket-sized monster, lightning fast.",
    effect: { scaleMul: 0.3, statDelta: { spd: +4, hp: -2 } } },
  { id: "grow", name: "Grow Juice", emoji: "🌱", category: "size", rarity: "common",
    description: "Bigger monster, more punch.",
    effect: { scaleMul: 1.5, statDelta: { hp: +2, atk: +1 } } },
  { id: "giant", name: "Giant Gulp", emoji: "🦣", category: "size", rarity: "legendary",
    description: "Towering colossus.",
    effect: { scaleMul: 2.2, statDelta: { hp: +5, atk: +3, spd: -2 } } },

  // ─── Color / Glow (6) ────────────────────────────────────────────────
  { id: "crimson_wash", name: "Crimson Wash", emoji: "🟥", category: "color", rarity: "common",
    description: "Stains your monster blood red.",
    effect: { tintHex: "#e53935" } },
  { id: "azure_wash", name: "Azure Wash", emoji: "🟦", category: "color", rarity: "common",
    description: "Cool sapphire blue.",
    effect: { tintHex: "#1e88e5" } },
  { id: "emerald_wash", name: "Emerald Wash", emoji: "🟩", category: "color", rarity: "common",
    description: "Forest emerald green.",
    effect: { tintHex: "#43a047" } },
  { id: "onyx_wash", name: "Onyx Wash", emoji: "⬛", category: "color", rarity: "rare",
    description: "Inky shadow black.",
    effect: { tintHex: "#1a1a1a" } },
  { id: "golden_glow", name: "Golden Glow", emoji: "✨", category: "color", rarity: "rare",
    description: "Shimmering gold halo.",
    effect: { glowHex: "#ffd54f", glowIntensity: 0.9, statDelta: { mag: +1 } } },
  { id: "ghost_glow", name: "Ghost Glow", emoji: "👻", category: "color", rarity: "rare",
    description: "Eerie translucent shimmer.",
    effect: { glowHex: "#b39ddb", glowIntensity: 0.6, material: { transparent: true, opacity: 0.7 } } },

  // ─── Elemental (8) ───────────────────────────────────────────────────
  { id: "fire", name: "Fire Vial", emoji: "🔥", category: "elemental", rarity: "common",
    description: "Wreathes your monster in flame.",
    effect: { aura: "fire", tintHex: "#e25822", statDelta: { atk: +2, mag: +1 } } },
  { id: "ice", name: "Ice Vial", emoji: "❄️", category: "elemental", rarity: "common",
    description: "Frosty chilling aura.",
    effect: { aura: "ice", tintHex: "#80deea", statDelta: { def: +2, spd: -1 } } },
  { id: "spark", name: "Spark Vial", emoji: "⚡", category: "elemental", rarity: "common",
    description: "Crackling electric storm.",
    effect: { aura: "spark", tintHex: "#fff176", statDelta: { spd: +2, mag: +1 } } },
  { id: "shade", name: "Shade Vial", emoji: "🌑", category: "elemental", rarity: "rare",
    description: "Shadow smoke clings to your monster.",
    effect: { aura: "shade", tintHex: "#4a148c", statDelta: { mag: +3 } } },
  { id: "toxic", name: "Toxic Vial", emoji: "☣️", category: "elemental", rarity: "rare",
    description: "Bubbling green poison.",
    effect: { aura: "toxic", tintHex: "#558b2f", statDelta: { atk: +1, mag: +2 } } },
  { id: "aqua", name: "Aqua Vial", emoji: "💧", category: "elemental", rarity: "common",
    description: "Splashy water droplets.",
    effect: { aura: "aqua", tintHex: "#039be5", statDelta: { hp: +1, spd: +1 } } },
  { id: "earth", name: "Earth Vial", emoji: "🪨", category: "elemental", rarity: "common",
    description: "Stone chunks orbit your monster.",
    effect: { aura: "earth", tintHex: "#6d4c41", statDelta: { def: +3, spd: -1 } } },
  { id: "wind", name: "Wind Vial", emoji: "💨", category: "elemental", rarity: "common",
    description: "Swirling white wind currents.",
    effect: { aura: "wind", statDelta: { spd: +3 } } },

  // ─── Mutation (6) ────────────────────────────────────────────────────
  { id: "extra_horns", name: "Horn Tonic", emoji: "🐂", category: "mutation", rarity: "common",
    description: "Sprouts two extra horns on top.",
    effect: { mutation: "extra_horns", statDelta: { atk: +2 } } },
  { id: "bat_wings", name: "Wing Elixir", emoji: "🦇", category: "mutation", rarity: "rare",
    description: "Grows leathery bat wings.",
    effect: { mutation: "bat_wings", statDelta: { spd: +2, mag: +1 } } },
  { id: "spike_coat", name: "Spike Serum", emoji: "🦔", category: "mutation", rarity: "common",
    description: "Coats your monster in sharp spikes.",
    effect: { mutation: "spike_coat", statDelta: { def: +2, atk: +1 } } },
  { id: "extra_eyes", name: "Eye Drops", emoji: "👁️", category: "mutation", rarity: "rare",
    description: "Three extra eyes appear.",
    effect: { mutation: "extra_eyes", statDelta: { mag: +2, spd: +1 } } },
  { id: "extra_arms", name: "Arm Brew", emoji: "💪", category: "mutation", rarity: "rare",
    description: "Two extra arm stubs sprout.",
    effect: { mutation: "extra_arms", statDelta: { atk: +3 } } },
  { id: "tail_boost", name: "Tail Tonic", emoji: "🦎", category: "mutation", rarity: "common",
    description: "Longer, spikier tail.",
    effect: { mutation: "tail_boost", statDelta: { atk: +1, def: +1 } } },

  // ─── Stat boost (4) ──────────────────────────────────────────────────
  { id: "vigor", name: "Vigor Tonic", emoji: "❤️", category: "stat", rarity: "common",
    description: "+4 HP",
    effect: { statDelta: { hp: +4 } } },
  { id: "fury", name: "Fury Brew", emoji: "🗡️", category: "stat", rarity: "common",
    description: "+4 ATK",
    effect: { statDelta: { atk: +4 } } },
  { id: "iron_skin", name: "Iron Skin", emoji: "🛡️", category: "stat", rarity: "common",
    description: "+4 DEF",
    effect: { statDelta: { def: +4 } } },
  { id: "swift", name: "Swift Draft", emoji: "🏃", category: "stat", rarity: "common",
    description: "+4 SPD",
    effect: { statDelta: { spd: +4 } } },

  // ─── Texture / Skin (4) ──────────────────────────────────────────────
  { id: "metallic", name: "Metallic Coat", emoji: "🔩", category: "texture", rarity: "rare",
    description: "Polished metal finish.",
    effect: { material: { metalness: 0.85, roughness: 0.2 }, statDelta: { def: +2 } } },
  { id: "crystal", name: "Crystal Bath", emoji: "💎", category: "texture", rarity: "rare",
    description: "Translucent, glowing crystal.",
    effect: { glowHex: "#80deea", glowIntensity: 0.5,
              material: { transparent: true, opacity: 0.8, metalness: 0.1 },
              statDelta: { mag: +2 } } },
  { id: "goo", name: "Goo Bath", emoji: "🟢", category: "texture", rarity: "common",
    description: "Wet slimy texture.",
    effect: { material: { roughness: 0.1, metalness: 0.0 }, tintHex: "#4caf50" } },
  { id: "stone", name: "Stone Skin", emoji: "🗿", category: "texture", rarity: "common",
    description: "Rough rocky surface.",
    effect: { material: { roughness: 0.95, metalness: 0.0 }, tintHex: "#757575",
              statDelta: { def: +3, spd: -1 } } },

  // ─── Crafted (hidden until discovered via crafting bench) ────────────
  { id: "steam_burst", name: "Steam Burst", emoji: "♨️", category: "elemental", rarity: "rare", crafted: true,
    description: "Fire + Ice = explosive steam aura.",
    effect: { aura: "steam", statDelta: { atk: +2, def: +2, mag: +2 } } },
  { id: "titan_brew", name: "Titan's Brew", emoji: "🏔️", category: "size", rarity: "legendary", crafted: true,
    description: "Grow + Vigor = unstoppable colossus.",
    effect: { scaleMul: 2.0, statDelta: { hp: +6, atk: +3, def: +2 } } },
  { id: "plague_mist", name: "Plague Mist", emoji: "☠️", category: "elemental", rarity: "rare", crafted: true,
    description: "Shade + Toxic = creeping plague aura.",
    effect: { aura: "plague", tintHex: "#33691e", statDelta: { mag: +3, atk: +2 } } },
  { id: "tempest_surge", name: "Tempest Surge", emoji: "🌩️", category: "elemental", rarity: "rare", crafted: true,
    description: "Spark + Wind = chain lightning storm.",
    effect: { aura: "tempest", statDelta: { spd: +3, mag: +3 } } },
  { id: "prism", name: "Prism Bath", emoji: "🌈", category: "texture", rarity: "legendary", crafted: true,
    description: "Crystal + Glow = rainbow refraction.",
    effect: { glowHex: "#ec407a", glowIntensity: 1.0,
              material: { transparent: true, opacity: 0.85, metalness: 0.3 },
              statDelta: { mag: +4 } } },
  { id: "warforged", name: "Warforged", emoji: "⚔️", category: "texture", rarity: "rare", crafted: true,
    description: "Metallic + Fury = armored juggernaut.",
    effect: { material: { metalness: 0.9, roughness: 0.25 }, tintHex: "#9e9e9e",
              statDelta: { atk: +4, def: +3 } } },
  { id: "demon_aspect", name: "Demon Aspect", emoji: "😈", category: "mutation", rarity: "rare", crafted: true,
    description: "Horns + Spikes = full demon transformation.",
    effect: { mutation: "demon_aspect", tintHex: "#b71c1c",
              statDelta: { atk: +3, def: +2 } } },
];

export const POTIONS_BY_ID: Record<string, Potion> = Object.fromEntries(
  POTIONS.map(p => [p.id, p])
);

export function getPotion(id: string): Potion | undefined {
  return POTIONS_BY_ID[id];
}

/** Returns base potions + any crafted potions the player has discovered. */
export function listVisiblePotions(discoveredIds: string[]): Potion[] {
  return POTIONS.filter(p => !p.crafted || discoveredIds.includes(p.id));
}

/** Max active potions a single monster can hold (kid-friendly cap). */
export const MAX_ACTIVE_POTIONS = 5;
