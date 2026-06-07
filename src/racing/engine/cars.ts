// Turbo Racers -- car roster. Phase 2 expands to a full Turbo Garage roster
// with per-car stat triangles. All names are ORIGINAL Berry Kids' Arcade IP --
// nothing borrowed from Mario Kart or Micro Machines.
//
// Each car has a sprite (Kenney CC0), a 4-axis stat triangle (topSpeed,
// accel, grip, handling) in [0..100], and a render scale. The stat triangle
// determines effective physics via stats.ts.

import type { CarStats } from "./stats";

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
}

export const CARS: CarDef[] = [
  // Balanced all-rounder
  { id: "comet",    name: "Comet Crimson",     tagline: "Balanced all-rounder",   sprite: "/assets/racing/cars/car_red_3.png",         renderScale: 0.45,
    stats: { topSpeed: 60, accel: 60, grip: 60, handling: 60 }, accent: "#dc2626" },
  // Speed demon -- top speed king but slow off the line, low handling
  { id: "bluejay",  name: "Bluejay Bolt",       tagline: "Top-speed missile",      sprite: "/assets/racing/cars/car_blue_3.png",        renderScale: 0.45,
    stats: { topSpeed: 88, accel: 45, grip: 50, handling: 50 }, accent: "#3b82f6" },
  // Drift specialist -- huge handling + grip, modest top speed
  { id: "verdant",  name: "Verdant Vortex",     tagline: "Corner carver",          sprite: "/assets/racing/cars/car_green_3.png",       renderScale: 0.45,
    stats: { topSpeed: 52, accel: 60, grip: 82, handling: 82 }, accent: "#22c55e" },
  // Drag racer -- monstrous acceleration, weak in the corners
  { id: "lemon",    name: "Lemon Lightning",    tagline: "Off-the-line rocket",    sprite: "/assets/racing/cars/car_yellow_3.png",      renderScale: 0.45,
    stats: { topSpeed: 60, accel: 88, grip: 48, handling: 55 }, accent: "#facc15" },
  // Heavy bruiser -- decent everything but stiff steering
  { id: "midnight", name: "Midnight Mach",      tagline: "Heavy bruiser",          sprite: "/assets/racing/cars/car_black_3.png",       renderScale: 0.45,
    stats: { topSpeed: 70, accel: 56, grip: 70, handling: 48 }, accent: "#1f2937" },
  // Small-frame nimble -- low top speed but lightning handling
  { id: "wisp",     name: "Wisp Whisper",       tagline: "Nimble featherweight",   sprite: "/assets/racing/cars/car_blue_small_2.png",  renderScale: 0.50,
    stats: { topSpeed: 50, accel: 75, grip: 70, handling: 90 }, accent: "#06b6d4" },
  // Off-road specialist (better on dirt -- see physics.ts surface multipliers; we approximate via grip)
  { id: "boulder",  name: "Boulder Buster",     tagline: "Off-road bruiser",       sprite: "/assets/racing/cars/car_green_small_4.png", renderScale: 0.52,
    stats: { topSpeed: 58, accel: 62, grip: 85, handling: 65 }, accent: "#65a30d" },
  // Glass cannon -- super high accel + top speed, terrible grip
  { id: "fang",     name: "Fang Fury",          tagline: "Glass cannon",           sprite: "/assets/racing/cars/car_red_small_5.png",   renderScale: 0.50,
    stats: { topSpeed: 80, accel: 80, grip: 38, handling: 52 }, accent: "#ef4444" },
];

export function carById(id: string): CarDef {
  return CARS.find(c => c.id === id) ?? CARS[0];
}
