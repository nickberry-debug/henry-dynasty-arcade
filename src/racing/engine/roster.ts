// Turbo Racers -- CPU racer roster with difficulty bands. Original IP.
//
// Difficulty bands govern: throttle cap, drift use, lookahead distance,
// reaction to weapons. Each driver also picks a preferred CarDef.

import type { CarDef } from "./cars";
import { CARS } from "./cars";

export interface CpuDriver {
  id: string;
  name: string;
  /** 1 (easy) ... 5 (savage). */
  band: number;
  carId: string;
  /** 0..1 throttle cap (lower = forgiving). */
  throttleCap: number;
  /** Probability of using a weapon when armed (0..1). */
  weaponAggression: number;
}

export const CPU_DRIVERS: CpuDriver[] = [
  { id: "rusty",  name: "Rusty Roadrunner",  band: 1, carId: "midnight", throttleCap: 0.62, weaponAggression: 0.25 },
  { id: "minty",  name: "Minty Mercury",     band: 2, carId: "verdant",  throttleCap: 0.70, weaponAggression: 0.35 },
  { id: "ember",  name: "Ember Edge",        band: 3, carId: "comet",    throttleCap: 0.78, weaponAggression: 0.50 },
  { id: "vortex", name: "Vortex Vex",        band: 3, carId: "wisp",     throttleCap: 0.78, weaponAggression: 0.55 },
  { id: "halo",   name: "Halo Heatwave",     band: 4, carId: "lemon",    throttleCap: 0.85, weaponAggression: 0.65 },
  { id: "fang",   name: "Fang Phantom",      band: 4, carId: "fang",     throttleCap: 0.88, weaponAggression: 0.7  },
  { id: "nova",   name: "Nova Nightingale",  band: 5, carId: "bluejay",  throttleCap: 0.92, weaponAggression: 0.8  },
  { id: "obsidian", name: "Obsidian Oracle", band: 5, carId: "boulder",  throttleCap: 0.95, weaponAggression: 0.85 },
];

/** Pick a balanced CPU field for a given difficulty band and race size. */
export function pickField(band: number, count: number, excludeCarId?: string): CpuDriver[] {
  // Choose drivers whose band is within +/-1 of the requested band, prefer match.
  const candidates = CPU_DRIVERS
    .filter(d => Math.abs(d.band - band) <= 1)
    .filter(d => d.carId !== excludeCarId);
  // Stable pick: sort by |band-target| then alpha, take `count`.
  const sorted = candidates.slice().sort((a, b) => Math.abs(a.band - band) - Math.abs(b.band - band));
  const out: CpuDriver[] = [];
  for (let i = 0; i < count && i < sorted.length; i++) out.push(sorted[i]);
  // Pad with any remaining drivers (avoiding excludeCarId).
  for (const d of CPU_DRIVERS) {
    if (out.length >= count) break;
    if (d.carId === excludeCarId) continue;
    if (out.includes(d)) continue;
    out.push(d);
  }
  return out;
}

export function carForDriver(d: CpuDriver): CarDef {
  return CARS.find(c => c.id === d.carId) ?? CARS[0];
}