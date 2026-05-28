// isoMath.ts — Isometric projection helpers for Battle Forge AoE1 renderer.
//
// World coordinates: x/y on a flat 2D plane (0..WORLD_W, 0..WORLD_H), as
// produced by simulation.ts. The renderer projects them to screen using a
// classic 2:1 isometric ratio (TILE_W : TILE_H = 2 : 1).
//
// AoE1 used 96×48 tiles. We adopt 64×32 to keep sprites readable on mobile
// while preserving the same 2:1 silhouette.

export const TILE_W = 64;
export const TILE_H = 32;

// One "tile" in world units. The simulation world is 1000×560, so picking
// 50 world units per tile gives roughly 20×11 tiles — a comfortable battle
// arena that still leaves space at the edges of the diamond.
export const TILE_WORLD = 50;

export interface IsoView {
  // Screen origin where world (0,0) projects to. The renderer recomputes this
  // every frame so the arena stays centered as the canvas resizes.
  originX: number;
  originY: number;
  // Uniform zoom factor — 1 = native sprite size, 1.25 = 25% larger, etc.
  zoom: number;
}

/** Project a world point to screen (isometric, 2:1 ratio). */
export function worldToScreen(wx: number, wy: number, view: IsoView): { sx: number; sy: number } {
  // Convert world units → tile units
  const tx = wx / TILE_WORLD;
  const ty = wy / TILE_WORLD;
  // Classic iso: screenX = (tx - ty) * TILE_W/2 ; screenY = (tx + ty) * TILE_H/2
  const sx = view.originX + (tx - ty) * (TILE_W * 0.5) * view.zoom;
  const sy = view.originY + (tx + ty) * (TILE_H * 0.5) * view.zoom;
  return { sx, sy };
}

/** Convert a world point to a depth value for painter's-algorithm sorting. */
export function depthKey(wx: number, wy: number): number {
  // Units further "down/right" on the iso diamond render in front.
  return wx + wy;
}

/** 4-direction facing derived from a velocity vector (NE / SE / SW / NW). */
export type Facing = "NE" | "SE" | "SW" | "NW";

export function facingFromVelocity(vx: number, vy: number, fallback: Facing = "SE"): Facing {
  if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return fallback;
  // In our iso projection, +x screen-right and +y screen-down combine. We pick
  // a facing based on whether the unit is heading "east" (+x) or "west" (-x)
  // and "south" (+y) or "north" (-y) in WORLD space.
  const east = vx >= 0;
  const south = vy >= 0;
  if (east && south) return "SE";
  if (east && !south) return "NE";
  if (!east && south) return "SW";
  return "NW";
}

/** Facing from one world point toward another (used for attack facing). */
export function facingToward(fromX: number, fromY: number, toX: number, toY: number): Facing {
  return facingFromVelocity(toX - fromX, toY - fromY, "SE");
}
