// Monster Forge - Phase 4 CPU monster generator.
//
// FIGHT CPU spawns a level-scaled random monster whose stat total roughly
// matches the player's monster (±20%). Pulls a random body from the manifest
// and 2-3 random potions for variety.

import type { Manifest, MonsterConfig, SavedMonster, BodyType } from "../partsManifest";
import { POTIONS } from "../data/potions";
import { computeStats, baseStatsFor, statTotal, type StatBlock } from "./stats";

const CPU_NAMES = [
  "Rogue Slime", "Wild Drake", "Shadow Prowler", "Cinder Beast", "Frost Stalker",
  "Bog Lurker", "Storm Wisp", "Stone Sentry", "Dust Whelp", "Glimmer Sprite",
  "Knotwood Spore", "Murk Imp", "Ember Tot", "Brine Snapper", "Husk Crawler",
  "Sky Wraith", "Ash Goblin", "Mossback", "Tideling", "Voidlet",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

/** Build a one-off SavedMonster-shaped CPU opponent matching the player's stat total. */
export function makeCpuMonster(manifest: Manifest, playerStats: StatBlock): { monster: SavedMonster; bodyType: BodyType } {
  const targetTotal = statTotal(playerStats);
  const minTotal = targetTotal * 0.8;
  const maxTotal = targetTotal * 1.2;

  // Try up to 12 random combos to land near the target total. Otherwise take last.
  let bestMonster: SavedMonster | null = null;
  let bestBodyType: BodyType = "biped";
  let bestDelta = Infinity;
  for (let attempt = 0; attempt < 12; attempt++) {
    const bodyDef = pick(manifest.parts.body);
    const numPotions = 2 + Math.floor(Math.random() * 2); // 2-3
    const pool = POTIONS.filter(p => !p.crafted);
    const chosen: string[] = [];
    for (let i = 0; i < numPotions; i++) {
      const p = pick(pool);
      if (!chosen.includes(p.id)) chosen.push(p.id);
    }
    const stats = computeStats(bodyDef.id, chosen);
    const total = statTotal(stats);

    const id = "cpu_" + Math.random().toString(36).slice(2, 9);
    const config: MonsterConfig = {
      body: bodyDef.id,
      headOverlay: "none",
      horns: Math.random() < 0.4 ? pick(["devil","ram","unicorn","twin"]) : "none",
      wings: Math.random() < 0.3 ? pick(["bat","feathered","butterfly","dragon"]) : "none",
      tail: Math.random() < 0.4 ? pick(["spike","fluff","lizard","fork"]) : "none",
      spikes: Math.random() < 0.3 ? pick(["row","crown","full"]) : "none",
      eyes: pick(["normal","angry","cute","glow"]),
      color: pick(["none","ember","violet","ocean","forest","gold","rose","shadow","frost"]),
    };
    const m: SavedMonster = {
      id, name: pick(CPU_NAMES),
      config, activePotions: chosen, stats,
      createdAt: Date.now(), updatedAt: Date.now(),
    };

    if (total >= minTotal && total <= maxTotal) {
      return { monster: m, bodyType: (bodyDef.bodyType ?? "biped") as BodyType };
    }
    const delta = Math.abs(total - targetTotal);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestMonster = m;
      bestBodyType = (bodyDef.bodyType ?? "biped") as BodyType;
    }
  }
  return { monster: bestMonster ?? makeFallback(manifest), bodyType: bestBodyType };
}

function makeFallback(manifest: Manifest): SavedMonster {
  const bodyDef = manifest.parts.body[0];
  return {
    id: "cpu_fallback", name: "Wild Slime",
    config: {
      body: bodyDef.id, headOverlay: "none", horns: "none", wings: "none",
      tail: "none", spikes: "none", eyes: "normal", color: "none",
    },
    activePotions: [],
    stats: baseStatsFor(bodyDef.id),
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}
