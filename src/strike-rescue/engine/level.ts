// Level definitions — 4 levels, each with a biome, enemy spawns, POWs, huts,
// boss at the finish line.

import type { EnemyKind } from "./enemies";

export type Biome = "jungle" | "base" | "river" | "fortress";

export interface EnemySpawn { kind: EnemyKind; x: number; y: number }
export interface HutSpawn   { x: number; y: number }
export interface PowSpawn   { x: number; y: number }

export interface LevelDef {
  id: number;
  name: string;
  biome: Biome;
  height: number;
  width: number;
  enemies: EnemySpawn[];
  pows: PowSpawn[];
  huts: HutSpawn[];
  bossKind: EnemyKind;
  bossY: number;
  waterBand?: { y0: number; y1: number; bridgeX: number };
  concreteBands?: { y0: number; y1: number }[];
}

const WIDTH = 480;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildLevel(id: number, name: string, biome: Biome, height: number, bossKind: EnemyKind): LevelDef {
  const r = lcg(id * 9173 + 17);
  const enemies: EnemySpawn[] = [];
  const pows: PowSpawn[] = [];
  const huts: HutSpawn[] = [];

  const bossY = 140;
  const safeBandBottom = height - 200;
  const safeBandTop = 260;

  const enemyCounts = {
    foot: 14 + (id - 1) * 4,
    turret: 4 + (id - 1) * 2,
    jeep: 2 + (id - 1) * 2,
  };
  const powCount = 5 + (id - 1);
  const hutCount = 4 + (id - 1);

  for (let i = 0; i < enemyCounts.foot; i++)   enemies.push({ kind: "foot",   x: 60 + r() * (WIDTH - 120), y: safeBandTop + r() * (safeBandBottom - safeBandTop) });
  for (let i = 0; i < enemyCounts.turret; i++) enemies.push({ kind: "turret", x: 60 + r() * (WIDTH - 120), y: safeBandTop + r() * (safeBandBottom - safeBandTop) });
  for (let i = 0; i < enemyCounts.jeep; i++)   enemies.push({ kind: "jeep",   x: 60 + r() * (WIDTH - 120), y: safeBandTop + r() * (safeBandBottom - safeBandTop) });
  for (let i = 0; i < hutCount; i++)           huts.push({ x: 50 + r() * (WIDTH - 100), y: safeBandTop + 60 + r() * (safeBandBottom - safeBandTop - 60) });
  for (let i = 0; i < powCount; i++)           pows.push({ x: 70 + r() * (WIDTH - 140), y: safeBandTop + 40 + r() * (safeBandBottom - safeBandTop - 80) });

  const def: LevelDef = { id, name, biome, height, width: WIDTH, enemies, pows, huts, bossKind, bossY };
  if (biome === "river") {
    def.waterBand = { y0: Math.floor(height * 0.45), y1: Math.floor(height * 0.45) + 96, bridgeX: WIDTH / 2 };
  }
  if (biome === "base") {
    def.concreteBands = [
      { y0: Math.floor(height * 0.6), y1: Math.floor(height * 0.7) },
      { y0: Math.floor(height * 0.25), y1: Math.floor(height * 0.35) },
    ];
  }
  if (biome === "fortress") {
    def.concreteBands = [{ y0: Math.floor(height * 0.15), y1: Math.floor(height * 0.45) }];
  }
  return def;
}

export const LEVELS: LevelDef[] = [
  buildLevel(1, "Jungle Patrol",   "jungle",   2000, "boss_tank"),
  buildLevel(2, "Forward Base",    "base",     2400, "boss_chopper"),
  buildLevel(3, "River Crossing",  "river",    2600, "boss_bunker"),
  buildLevel(4, "Citadel Assault", "fortress", 3000, "boss_mega"),
];

export function levelById(id: number): LevelDef {
  return LEVELS.find(l => l.id === id) ?? LEVELS[0];
}
