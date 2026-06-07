// Monster Forge — typed import of the parts manifest.
// The manifest lives at /public/assets/monster-parts/manifest.json so the
// Vite build serves it as a static file. This module just types it.

import type { StatBlock } from "./engine/stats";

export type CategoryId =
  | "body" | "headOverlay" | "horns" | "wings" | "tail" | "spikes" | "eyes" | "colors";

export interface BodyPart {
  id: string;
  file: string;
  scale: number;
  label: string;
  src: string;
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

/** Fetch and cache the manifest. Always called once on builder mount. */
export async function loadManifest(): Promise<Manifest> {
  if (cached) return cached;
  const res = await fetch("/assets/monster-parts/manifest.json", { cache: "force-cache" });
  if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
  cached = (await res.json()) as Manifest;
  return cached;
}

/** Default monster config — first body, no accessories, original color. */
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

/** A saved/in-progress monster — all IDs reference the manifest. */
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

export interface SavedMonster {
  id: string;
  name: string;
  config: MonsterConfig;
  /** Phase 2 — active potion ids currently applied to this monster. Max 5. */
  activePotions: string[];
  /** Phase 2 — final stat block (base + potion deltas, clamped). */
  stats: StatBlock;
  createdAt: number;
  updatedAt: number;
}
