// Monster Forge - typed import of the parts manifest.
// Phase 3 adds bodyType + rarity to BodyPart.

import type { StatBlock } from "./engine/stats";

export type CategoryId =
  | "body" | "headOverlay" | "horns" | "wings" | "tail" | "spikes" | "eyes" | "colors";

export type BodyType = "biped" | "quadruped" | "winged" | "serpentine" | "floating";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface BodyPart {
  id: string;
  file: string;
  scale: number;
  label: string;
  src: string;
  bodyType?: BodyType;
  rarity?: Rarity;
}

export interface HeadOverlayPart {
  id: string;
  label: string;
  kind: "procedural" | "glb";
  file?: string;
  scale?: number;
  src?: string;
}

export interface SimplePart  { id: string; label: string; }
export interface ColorPart   { id: string; label: string; hex: string | null; }

export interface Manifest {
  version: number;
  approach: "socket-attach" | "rigged-modular";
  approachNotes: string;
  license: string;
  sources: string[];
  parts: {
    body: BodyPart[];
    headOverlay: HeadOverlayPart[];
    horns: SimplePart[];
    wings: SimplePart[];
    tail: SimplePart[];
    spikes: SimplePart[];
    eyes: SimplePart[];
    colors: ColorPart[];
  };
}

let cached: Manifest | null = null;

export async function loadManifest(): Promise<Manifest> {
  if (cached) return cached;
  const res = await fetch("/assets/monster-parts/manifest.json", { cache: "force-cache" });
  if (!res.ok) throw new Error("manifest fetch failed: " + res.status);
  cached = (await res.json()) as Manifest;
  return cached;
}

export function defaultMonsterConfig(m: Manifest): MonsterConfig {
  return {
    body: m.parts.body[0]?.id ?? "alien",
    headOverlay: "none",
    horns: "none",
    wings: "none",
    tail: "none",
    spikes: "none",
    eyes: "normal",
    color: "none",
  };
}

export interface MonsterConfig {
  body: string;
  headOverlay: string;
  horns: string;
  wings: string;
  tail: string;
  spikes: string;
  eyes: string;
  color: string;
}

export interface MonsterRecord {
  wins: number;
  losses: number;
  ko: number;
}

export type HabitatId = "ember_cavern" | "crystal_grotto" | "sky_garden" | "void_realm";

export interface SavedMonster {
  id: string;
  name: string;
  config: MonsterConfig;
  activePotions: string[];
  stats: StatBlock;
  record?: MonsterRecord;
  habitat?: HabitatId;
  sizeMul?: number;
  evolved?: boolean;
  createdAt: number;
  updatedAt: number;
}
