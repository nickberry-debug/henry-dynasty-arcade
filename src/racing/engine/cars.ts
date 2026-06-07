// Turbo Racers -- car roster. Phase 2 ships a 20-car Turbo Garage with
// rarity tiers + per-car unlock costs. All names are ORIGINAL Berry Kids'
// Arcade IP -- nothing borrowed from Mario Kart or Micro Machines.
//
// Each car has a sprite (Kenney CC0), a 4-axis stat triangle (topSpeed,
// accel, grip, handling) in [0..100], and a render scale. The stat triangle
// determines effective physics via stats.ts.
//
// Rarity -> unlockCost: starter=0, common=500, rare=1500, epic=3500, legendary=7500.

import type { CarStats } from "./stats";

export type CarRarity = "starter" | "common" | "rare" | "epic" | "legendary";

export interface CarDef {
  id: string;
  name: string;
  tagline: string;
  /** Kenney sprite under /assets/racing/cars/. */
  sprite: string;
  /** Render scale -- raw Kenney sprites are ~71x131; display smaller. */
  renderScale: number;
  /** Base stat triangle (before upgrades). */
  stats: CarStats;
  /** UI accent colour. */
  accent: string;
  /** Rarity tier. */
  rarity: CarRarity;
  /** Coin cost to unlock (0 for starter). */
  unlockCost: number;
}

export const RARITY_COST: Record<CarRarity, number> = {
  starter: 0,
  common: 500,
  rare: 1500,
  epic: 3500,
  legendary: 7500,
};

export const RARITY_ACCENT: Record<CarRarity, string> = {
  starter: "#22c55e",
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export const CARS: CarDef[] = [
  // -- STARTER (free) --
  { id: "comet", name: "Comet Crimson", tagline: "Balanced all-rounder", sprite: "/assets/racing/cars/car_red_3.png", renderScale: 0.45,
    stats: { topSpeed: 60, accel: 60, grip: 60, handling: 60 }, accent: "#dc2626", rarity: "starter", unlockCost: 0 },

  // -- COMMON --
  { id: "bluejay", name: "Bluejay Bolt", tagline: "Top-speed missile", sprite: "/assets/racing/cars/car_blue_3.png", renderScale: 0.45,
    stats: { topSpeed: 80, accel: 50, grip: 52, handling: 52 }, accent: "#3b82f6", rarity: "common", unlockCost: 500 },
  { id: "lemon", name: "Lemon Lightning", tagline: "Off-the-line rocket", sprite: "/assets/racing/cars/car_yellow_3.png", renderScale: 0.45,
    stats: { topSpeed: 60, accel: 82, grip: 50, handling: 56 }, accent: "#facc15", rarity: "common", unlockCost: 500 },
  { id: "midnight", name: "Midnight Mach", tagline: "Heavy bruiser", sprite: "/assets/racing/cars/car_black_3.png", renderScale: 0.45,
    stats: { topSpeed: 70, accel: 56, grip: 70, handling: 50 }, accent: "#1f2937", rarity: "common", unlockCost: 500 },
  { id: "boulder", name: "Boulder Buster", tagline: "Off-road bruiser", sprite: "/assets/racing/cars/car_green_small_4.png", renderScale: 0.52,
    stats: { topSpeed: 58, accel: 62, grip: 80, handling: 60 }, accent: "#65a30d", rarity: "common", unlockCost: 500 },
  { id: "dust", name: "Dust Devil", tagline: "Dirt-track stalwart", sprite: "/assets/racing/cars/car_yellow_small_1.png", renderScale: 0.50,
    stats: { topSpeed: 58, accel: 68, grip: 72, handling: 60 }, accent: "#ca8a04", rarity: "common", unlockCost: 500 },
  { id: "saffron", name: "Saffron Sprint", tagline: "Bright + zippy", sprite: "/assets/racing/cars/car_yellow_4.png", renderScale: 0.45,
    stats: { topSpeed: 64, accel: 70, grip: 56, handling: 62 }, accent: "#eab308", rarity: "common", unlockCost: 500 },
  { id: "iron", name: "Iron Iguana", tagline: "Slow + steady tank", sprite: "/assets/racing/cars/car_green_small_2.png", renderScale: 0.50,
    stats: { topSpeed: 55, accel: 50, grip: 86, handling: 55 }, accent: "#15803d", rarity: "common", unlockCost: 500 },

  // -- RARE --
  { id: "verdant", name: "Verdant Vortex", tagline: "Corner carver", sprite: "/assets/racing/cars/car_green_3.png", renderScale: 0.45,
    stats: { topSpeed: 60, accel: 60, grip: 82, handling: 84 }, accent: "#22c55e", rarity: "rare", unlockCost: 1500 },
  { id: "wisp", name: "Wisp Whisper", tagline: "Nimble featherweight", sprite: "/assets/racing/cars/car_blue_small_2.png", renderScale: 0.50,
    stats: { topSpeed: 55, accel: 75, grip: 70, handling: 90 }, accent: "#06b6d4", rarity: "rare", unlockCost: 1500 },
  { id: "cobalt", name: "Cobalt Cruiser", tagline: "Polished tourer", sprite: "/assets/racing/cars/car_blue_4.png", renderScale: 0.45,
    stats: { topSpeed: 72, accel: 64, grip: 70, handling: 68 }, accent: "#2563eb", rarity: "rare", unlockCost: 1500 },
  { id: "pearl", name: "Pearl Pulse", tagline: "Bright + balanced", sprite: "/assets/racing/cars/car_black_5.png", renderScale: 0.45,
    stats: { topSpeed: 68, accel: 70, grip: 70, handling: 68 }, accent: "#d4d4d8", rarity: "rare", unlockCost: 1500 },
  { id: "tangerine", name: "Tangerine Torpedo", tagline: "Burst-accel zinger", sprite: "/assets/racing/cars/car_red_small_1.png", renderScale: 0.50,
    stats: { topSpeed: 70, accel: 84, grip: 58, handling: 64 }, accent: "#f97316", rarity: "rare", unlockCost: 1500 },
  { id: "ember", name: "Ember Engine", tagline: "Hot-blooded grip car", sprite: "/assets/racing/cars/car_red_4.png", renderScale: 0.45,
    stats: { topSpeed: 65, accel: 66, grip: 80, handling: 70 }, accent: "#dc2626", rarity: "rare", unlockCost: 1500 },

  // -- EPIC --
  { id: "fang", name: "Fang Fury", tagline: "Glass cannon", sprite: "/assets/racing/cars/car_red_small_5.png", renderScale: 0.50,
    stats: { topSpeed: 84, accel: 82, grip: 44, handling: 56 }, accent: "#ef4444", rarity: "epic", unlockCost: 3500 },
  { id: "nighthawk", name: "Neon Nighthawk", tagline: "Glowing speedster", sprite: "/assets/racing/cars/car_blue_5.png", renderScale: 0.45,
    stats: { topSpeed: 86, accel: 70, grip: 60, handling: 72 }, accent: "#22d3ee", rarity: "epic", unlockCost: 3500 },
  { id: "tornado", name: "Tornado Tilt", tagline: "Hyper-handling drift kit", sprite: "/assets/racing/cars/car_green_5.png", renderScale: 0.45,
    stats: { topSpeed: 70, accel: 72, grip: 78, handling: 92 }, accent: "#10b981", rarity: "epic", unlockCost: 3500 },
  { id: "glacier", name: "Glacier Glider", tagline: "Ice-track specialist", sprite: "/assets/racing/cars/car_blue_2.png", renderScale: 0.45,
    stats: { topSpeed: 70, accel: 68, grip: 88, handling: 78 }, accent: "#60a5fa", rarity: "epic", unlockCost: 3500 },

  // -- LEGENDARY --
  { id: "magma", name: "Magma Maverick", tagline: "Apex predator", sprite: "/assets/racing/cars/car_red_5.png", renderScale: 0.45,
    stats: { topSpeed: 92, accel: 80, grip: 76, handling: 78 }, accent: "#f59e0b", rarity: "legendary", unlockCost: 7500 },
  { id: "phantom", name: "Phantom Phantom", tagline: "Ghost of the grid", sprite: "/assets/racing/cars/car_black_4.png", renderScale: 0.45,
    stats: { topSpeed: 88, accel: 84, grip: 82, handling: 84 }, accent: "#a855f7", rarity: "legendary", unlockCost: 7500 },
];

export function carById(id: string): CarDef {
  return CARS.find(c => c.id === id) ?? CARS[0];
}
