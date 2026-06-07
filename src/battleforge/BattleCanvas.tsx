// BattleCanvas - Age of Empires 1 (1997) style isometric 2D renderer.
//
// Replaces the prior Three.js / TABS-style 3D renderer with a flat,
// hand-painted pixel-art look using a single HTMLCanvasElement.
//
// Key design notes:
//   • Same prop signature as the old BattleCanvas - drop-in replacement for
//     BattleForge.tsx.
//   • Tile-based isometric terrain (grass / dirt / water) painted from a
//     map config + a tiny per-map biome rule. Tiles are 64×32 (2:1 iso).
//   • Procedural pixel-art sprites generated in code (see spriteFactory.ts).
//     No external assets, no AI image generation, no copyrighted material.
//   • 4-direction facings (NE/SE/SW/NW). Each direction has idle / 4-frame
//     walk / 3-frame attack / 1-frame death pose.
//   • Painter's-algorithm depth sort: shadow → tiles → units → VFX → HUD.
//   • Pixel-perfect rendering via `imageSmoothingEnabled = false` and the
//     `image-rendering: pixelated` CSS hint on the canvas element.
//
// Keeps PlaybackData/recording compatible with the prior implementation so
// the existing replay UI in BattleForge.tsx keeps working.

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import type {
  CharacterDef, MapConfig, BattleUnit, Particle, BattleResult, BattleLogEntry, VFXEvent, UnitFrameData, MapFeature,
} from "./types";
import { createUnit, tickSimulation, getMVP, WORLD_W, WORLD_H } from "./simulation";
import { playSfx } from "../art";
import {
  TILE_W, TILE_H, TILE_WORLD, worldToScreen, depthKey, facingFromVelocity, facingToward,
  type IsoView, type Facing,
} from "./isoMath";
import {
  getSpriteSheet, getProjectileSprite, facingIndex, ANCHOR_X, ANCHOR_Y, SPRITE_H, SPRITE_W,
} from "./spriteFactory";

// ── public types (kept stable for BattleForge.tsx consumers) ───────────────
export interface TeamSlot { def: CharacterDef; count: number; }

export interface PlaybackData {
  frames: UnitFrameData[][];
  interval: number;
  currentTick: number;
}

interface BattleCanvasProps {
  teamA: TeamSlot[];
  teamB: TeamSlot[];
  map: MapConfig;
  speed: number;
  paused: boolean;
  onBattleEnd: (result: BattleResult) => void;
  onLogEntry: (entry: BattleLogEntry) => void;
  onStats: (aHp: number, aMax: number, bHp: number, bMax: number) => void;
  vfxQueue: VFXEvent[];
  onRecordingReady?: (frames: UnitFrameData[][], interval: number, totalTicks: number) => void;
  playbackData?: PlaybackData;
}

// ── internal constants ─────────────────────────────────────────────────────
const RECORD_INTERVAL = 8;
const DEATH_ANIM_TICKS = 58;

const TILES_X = Math.ceil(WORLD_W / TILE_WORLD); // 20
const TILES_Y = Math.ceil(WORLD_H / TILE_WORLD); // 12

type TerrainKind = "grass" | "dirt" | "water" | "sand" | "stone";

interface TileCell {
  kind: TerrainKind;
  variant: number; // 0..3 small jitter so the field doesn't look stamped
}

interface VFXState {
  id: number;
  kind: "burst" | "lightning" | "shockwave" | "laser" | "fire" | "frost" | "nature" | "projectile";
  x: number; y: number;
  tx?: number; ty?: number;
  life: number; maxLife: number;
  color: string;
}

let __vfxId = 1;

// ── biome / terrain generation ─────────────────────────────────────────────
// We don't import the full presets module; instead we infer biome from the
// map's id. Each map gets a fixed-seed terrain layout so the field is
// consistent across renders.
function biomeForMap(map: MapConfig): { base: TerrainKind; accent: TerrainKind; water: TerrainKind } {
  const id = map.id.toLowerCase();
  // v2 maps (polish-pass): six hand-tuned biomes.
  if (id === "castle_walls")    return { base: "sand",  accent: "stone", water: "dirt"  };
  if (id === "river_crossing")  return { base: "grass", accent: "dirt",  water: "water" };
  if (id === "stone_forest")    return { base: "grass", accent: "stone", water: "water" };
  if (id === "watchtower_hill") return { base: "grass", accent: "stone", water: "dirt"  };
  if (id === "open_plains")     return { base: "grass", accent: "dirt",  water: "dirt"  };
  if (id === "ruins")           return { base: "dirt",  accent: "stone", water: "dirt"  };
  // Legacy fallback heuristics (keep so older saves don't break).
  if (/snow|ice|tundra/.test(id))      return { base: "stone",  accent: "dirt",  water: "water" };
  if (/desert|canyon|volcano/.test(id)) return { base: "sand",   accent: "dirt",  water: "dirt"  };
  if (/space|station/.test(id))         return { base: "stone",  accent: "dirt",  water: "dirt"  };
  if (/forest|enchant/.test(id))        return { base: "grass",  accent: "dirt",  water: "water" };
  if (/colosseum|arena/.test(id))       return { base: "sand",   accent: "stone", water: "water" };
  return { base: "grass", accent: "dirt", water: "water" }; // default
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTerrain(map: MapConfig): TileCell[][] {
  const biome = biomeForMap(map);
  const rng = mulberry32(hashStr(map.id));
  const grid: TileCell[][] = [];
  // Lay base, then sprinkle a small "river" of accent or water along the
  // middle Y-strip. Keeps things readable + adds 3 tile types as required.
  for (let y = 0; y < TILES_Y; y++) {
    const row: TileCell[] = [];
    for (let x = 0; x < TILES_X; x++) {
      let kind: TerrainKind = biome.base;
      const r = rng();

      // Wandering accent patches (~12% of field) - keeps battles visually
      // grounded even on uniform biomes.
      if (r < 0.12) kind = biome.accent;

      // A horizontal "stream" of water across the middle, broken into a few
      // segments. Skip entirely on biomes where water doesn't make sense
      // (volcano / space - those keep base = sand/stone).
      if (biome.water === "water") {
        const midY = Math.floor(TILES_Y / 2);
        if (Math.abs(y - midY) <= 0 && (x % 7) >= 2 && (x % 7) <= 4 && rng() < 0.6) {
          kind = "water";
        }
      }

      row.push({ kind, variant: Math.floor(rng() * 4) });
    }
    grid.push(row);
  }
  return grid;
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── tile painter ────────────────────────────────────────────────────────────
function tileColors(kind: TerrainKind, variant: number, map: MapConfig): { top: string; left: string; right: string; outline: string } {
  // We respect the map's ground hint when feasible but keep the tile palette
  // distinct enough that grass vs dirt vs water reads clearly.
  const v = variant / 4;
  switch (kind) {
    case "grass": {
      const base = adjust("#3F8A3F", -0.04 + v * 0.08);
      return { top: base, left: shade(base, 0.75), right: shade(base, 0.88), outline: shade(base, 0.55) };
    }
    case "dirt": {
      const base = adjust("#8C6A3A", -0.04 + v * 0.08);
      return { top: base, left: shade(base, 0.72), right: shade(base, 0.85), outline: shade(base, 0.55) };
    }
    case "water": {
      const base = adjust("#3070B0", -0.04 + v * 0.08);
      return { top: base, left: shade(base, 0.80), right: shade(base, 0.92), outline: "#1C3F6A" };
    }
    case "sand": {
      const base = adjust(map.groundColor || "#C8A872", -0.04 + v * 0.08);
      return { top: base, left: shade(base, 0.78), right: shade(base, 0.90), outline: shade(base, 0.55) };
    }
    case "stone": {
      const base = adjust("#A5B0BC", -0.04 + v * 0.08);
      return { top: base, left: shade(base, 0.72), right: shade(base, 0.86), outline: shade(base, 0.55) };
    }
  }
}

function shade(hex: string, mul: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${(r*mul)|0},${(g*mul)|0},${(b*mul)|0})`;
}
function adjust(hex: string, delta: number): string {
  // delta in [-1..1], scales each channel.
  const [r,g,b] = hexToRgb(hex);
  const f = 1 + delta;
  return `rgb(${Math.max(0,Math.min(255,r*f))|0},${Math.max(0,Math.min(255,g*f))|0},${Math.max(0,Math.min(255,b*f))|0})`;
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}

function drawIsoDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  colTop: string, colOutline: string,
) {
  // Filled iso diamond (2:1) - center (cx,cy), width w, height h.
  ctx.fillStyle = colTop;
  ctx.beginPath();
  ctx.moveTo(cx,           cy - h * 0.5);
  ctx.lineTo(cx + w * 0.5, cy);
  ctx.lineTo(cx,           cy + h * 0.5);
  ctx.lineTo(cx - w * 0.5, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colOutline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ── arena dressing ──────────────────────────────────────────────────────────
function drawArenaFrame(ctx: CanvasRenderingContext2D, view: IsoView, accent: string) {
  // Trace the outer diamond around the playable tile field.
  const corners = [
    worldToScreen(0, 0, view),
    worldToScreen(WORLD_W, 0, view),
    worldToScreen(WORLD_W, WORLD_H, view),
    worldToScreen(0, WORLD_H, view),
  ];
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(corners[0].sx, corners[0].sy);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].sx, corners[i].sy);
  ctx.closePath();
  ctx.stroke();
}

// ── map features (polish-pass v2) ───────────────────────────────────────────
// Visual-only dressing painted between tiles and units. No collision.
function drawFeature(
  ctx: CanvasRenderingContext2D,
  feat: MapFeature,
  view: IsoView,
  mapId: string,
) {
  // Tile coords (centre of feature footprint) → screen.
  const cx = (feat.x + (feat.w ?? 1) * 0.5) * TILE_WORLD;
  const cy = (feat.y + (feat.h ?? 1) * 0.5) * TILE_WORLD;
  const { sx, sy } = worldToScreen(cx, cy, view);
  const z = view.zoom;
  ctx.lineWidth = 1;
  ctx.imageSmoothingEnabled = false;

  switch (feat.kind) {
    case "castle": {
      const w = (feat.w ?? 3) * TILE_W * z * 0.55;
      const h = (feat.h ?? 3) * TILE_H * z * 1.8;
      // base block
      ctx.fillStyle = "#8C8478";
      ctx.fillRect(sx - w * 0.5, sy - h * 0.95, w, h * 0.7);
      ctx.strokeStyle = "#3A3530"; ctx.strokeRect(sx - w * 0.5, sy - h * 0.95, w, h * 0.7);
      // upper block (slightly inset)
      ctx.fillStyle = "#A39A8C";
      ctx.fillRect(sx - w * 0.35, sy - h * 1.25, w * 0.7, h * 0.4);
      ctx.strokeRect(sx - w * 0.35, sy - h * 1.25, w * 0.7, h * 0.4);
      // crenellations
      ctx.fillStyle = "#3A3530";
      const cn = 5;
      for (let i = 0; i < cn; i++) {
        const cx2 = sx - w * 0.35 + (i + 0.25) * (w * 0.7 / cn);
        ctx.fillRect(cx2, sy - h * 1.32, w * 0.7 / cn * 0.5, h * 0.08);
      }
      // door
      ctx.fillStyle = "#3A2410";
      ctx.fillRect(sx - w * 0.08, sy - h * 0.35, w * 0.16, h * 0.35);
      // flag
      ctx.strokeStyle = "#3A3530"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - h * 1.4); ctx.lineTo(sx, sy - h * 1.7); ctx.stroke();
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(sx, sy - h * 1.7, w * 0.18, h * 0.12);
      return;
    }
    case "watchtower": {
      const w = TILE_W * z * 0.55;
      const h = TILE_H * z * 3.4;
      ctx.fillStyle = "#8C8478";
      ctx.fillRect(sx - w * 0.4, sy - h * 0.9, w * 0.8, h * 0.7);
      ctx.strokeStyle = "#3A3530"; ctx.strokeRect(sx - w * 0.4, sy - h * 0.9, w * 0.8, h * 0.7);
      // top platform with crenellations
      ctx.fillStyle = "#A39A8C";
      ctx.fillRect(sx - w * 0.5, sy - h * 1.05, w, h * 0.18);
      ctx.fillStyle = "#3A3530";
      for (let i = 0; i < 4; i++) {
        const cx2 = sx - w * 0.5 + (i + 0.25) * (w / 4);
        ctx.fillRect(cx2, sy - h * 1.15, w / 4 * 0.5, h * 0.08);
      }
      // window
      ctx.fillStyle = "#1A1410";
      ctx.fillRect(sx - w * 0.08, sy - h * 0.55, w * 0.16, h * 0.18);
      return;
    }
    case "gate": {
      const w = TILE_W * z * 0.7;
      const h = TILE_H * z * 2.0;
      // arch (two pillars + lintel)
      ctx.fillStyle = "#7A6E5C";
      ctx.fillRect(sx - w * 0.5, sy - h * 0.8, w * 0.18, h * 0.8);
      ctx.fillRect(sx + w * 0.32, sy - h * 0.8, w * 0.18, h * 0.8);
      ctx.fillRect(sx - w * 0.5, sy - h * 0.95, w, h * 0.15);
      ctx.strokeStyle = "#3A3530";
      ctx.strokeRect(sx - w * 0.5, sy - h * 0.95, w, h * 0.95);
      // bars
      ctx.strokeStyle = "#2A2520"; ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) {
        const bx = sx - w * 0.5 + i * (w / 4);
        ctx.beginPath(); ctx.moveTo(bx, sy - h * 0.78); ctx.lineTo(bx, sy); ctx.stroke();
      }
      return;
    }
    case "wall": {
      const w = TILE_W * z * 0.95;
      const h = TILE_H * z * 0.9;
      ctx.fillStyle = "#8C8478";
      ctx.fillRect(sx - w * 0.5, sy - h, w, h);
      ctx.strokeStyle = "#3A3530"; ctx.strokeRect(sx - w * 0.5, sy - h, w, h);
      // brick lines
      ctx.strokeStyle = "#5A5045"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.5, sy - h * 0.6); ctx.lineTo(sx + w * 0.5, sy - h * 0.6);
      ctx.moveTo(sx - w * 0.5, sy - h * 0.3); ctx.lineTo(sx + w * 0.5, sy - h * 0.3);
      ctx.stroke();
      return;
    }
    case "fence": {
      const w = TILE_W * z * 0.95;
      const h = TILE_H * z * 0.6;
      // posts
      ctx.fillStyle = "#6B4A28";
      for (let i = 0; i < 3; i++) {
        const px = sx - w * 0.5 + (i + 0.5) * (w / 3);
        ctx.fillRect(px - 1, sy - h, 2, h);
      }
      // rails
      ctx.strokeStyle = "#7A5A30"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.5, sy - h * 0.75); ctx.lineTo(sx + w * 0.5, sy - h * 0.75);
      ctx.moveTo(sx - w * 0.5, sy - h * 0.3); ctx.lineTo(sx + w * 0.5, sy - h * 0.3);
      ctx.stroke();
      return;
    }
    case "bridge": {
      const w = (feat.w ?? 4) * TILE_W * z * 0.55;
      const h = TILE_H * z * 0.5;
      // deck (planks)
      ctx.fillStyle = "#8B5A2B";
      ctx.fillRect(sx - w * 0.5, sy - h * 0.5, w, h);
      ctx.strokeStyle = "#5A3A1A"; ctx.lineWidth = 1;
      const planks = Math.max(4, Math.floor(w / 8));
      for (let i = 0; i <= planks; i++) {
        const px = sx - w * 0.5 + i * (w / planks);
        ctx.beginPath(); ctx.moveTo(px, sy - h * 0.5); ctx.lineTo(px, sy + h * 0.5); ctx.stroke();
      }
      // side rails
      ctx.strokeStyle = "#4A2A0A"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.5, sy - h * 0.7); ctx.lineTo(sx + w * 0.5, sy - h * 0.7);
      ctx.moveTo(sx - w * 0.5, sy + h * 0.7); ctx.lineTo(sx + w * 0.5, sy + h * 0.7);
      ctx.stroke();
      return;
    }
    case "tree": {
      const r = TILE_W * z * 0.28;
      const trunkH = TILE_H * z * 0.7;
      // trunk
      ctx.fillStyle = "#5A3A1A";
      ctx.fillRect(sx - r * 0.2, sy - trunkH, r * 0.4, trunkH);
      // canopy (triangle + circle blob for fluffiness)
      const tinted = mapId === "ruins";
      ctx.fillStyle = tinted ? "#4A4030" : "#2D6A2D";
      ctx.beginPath();
      ctx.moveTo(sx,           sy - trunkH - r * 1.8);
      ctx.lineTo(sx - r * 1.2, sy - trunkH + r * 0.2);
      ctx.lineTo(sx + r * 1.2, sy - trunkH + r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = tinted ? "#5A4838" : "#3F8A3F";
      ctx.beginPath();
      ctx.arc(sx, sy - trunkH - r * 0.6, r, 0, Math.PI * 2);
      ctx.fill();
      // dark trunk outline
      ctx.strokeStyle = "#3A2410"; ctx.lineWidth = 1;
      ctx.strokeRect(sx - r * 0.2, sy - trunkH, r * 0.4, trunkH);
      return;
    }
    case "rock": {
      const r = TILE_W * z * 0.32;
      // irregular polygon
      ctx.fillStyle = "#7A7468";
      ctx.beginPath();
      ctx.moveTo(sx - r,         sy - r * 0.2);
      ctx.lineTo(sx - r * 0.5,   sy - r * 0.8);
      ctx.lineTo(sx + r * 0.3,   sy - r * 0.9);
      ctx.lineTo(sx + r,         sy - r * 0.3);
      ctx.lineTo(sx + r * 0.6,   sy + r * 0.2);
      ctx.lineTo(sx - r * 0.3,   sy + r * 0.2);
      ctx.closePath();
      ctx.fill();
      // darker shadow side
      ctx.fillStyle = "#5A5448";
      ctx.beginPath();
      ctx.moveTo(sx,             sy - r * 0.85);
      ctx.lineTo(sx + r,         sy - r * 0.3);
      ctx.lineTo(sx + r * 0.6,   sy + r * 0.2);
      ctx.lineTo(sx,             sy + r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#3A3530"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - r,         sy - r * 0.2);
      ctx.lineTo(sx - r * 0.5,   sy - r * 0.8);
      ctx.lineTo(sx + r * 0.3,   sy - r * 0.9);
      ctx.lineTo(sx + r,         sy - r * 0.3);
      ctx.lineTo(sx + r * 0.6,   sy + r * 0.2);
      ctx.lineTo(sx - r * 0.3,   sy + r * 0.2);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    case "ruins": {
      const w = TILE_W * z * 0.85;
      const h = TILE_H * z * 0.9;
      // broken wall stub
      ctx.fillStyle = "#7A6E5C";
      ctx.fillRect(sx - w * 0.5, sy - h * 0.6, w * 0.4, h * 0.6);
      ctx.fillRect(sx - w * 0.1, sy - h * 0.4, w * 0.35, h * 0.4);
      // jagged top suggestion
      ctx.strokeStyle = "#3A3530"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.5, sy - h * 0.6);
      ctx.lineTo(sx - w * 0.4, sy - h * 0.72);
      ctx.lineTo(sx - w * 0.3, sy - h * 0.58);
      ctx.lineTo(sx - w * 0.2, sy - h * 0.68);
      ctx.lineTo(sx - w * 0.1, sy - h * 0.6);
      ctx.stroke();
      // crack lines
      ctx.strokeStyle = "#5A5045";
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.4, sy - h * 0.3); ctx.lineTo(sx - w * 0.25, sy);
      ctx.stroke();
      return;
    }
  }
}

// ── main component ──────────────────────────────────────────────────────────
export default function BattleCanvas({
  teamA, teamB, map, speed, paused,
  onBattleEnd, onLogEntry, onStats, vfxQueue,
  onRecordingReady, playbackData,
}: BattleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  const playbackDataRef = useRef<PlaybackData | null>(playbackData ?? null);
  const unitsRef = useRef<BattleUnit[]>([]);
  const [resizeNonce, setResizeNonce] = useState(0);

  // ── User-controlled zoom + pan (Item 2 of the BattleForge fix pass) ─────
  // Auto-camera still tracks the centroid of alive units. These three refs
  // layer on top: userZoom multiplies the auto-zoom, userPanX/Y shift the
  // tracked centroid in world units. Touch (pinch + drag), mouse wheel,
  // and the +/-/reset overlay buttons all write to these.
  const userZoomRef = useRef(1);
  const userPanXRef = useRef(0);
  const userPanYRef = useRef(0);
  // Mirror to state so the overlay UI re-renders to show current zoom.
  const [userZoom, setUserZoom] = useState(1);
  // Force-render hook for the overlay's reset button availability.
  const updateZoomUI = useCallback((v: number) => {
    userZoomRef.current = v;
    setUserZoom(v);
  }, []);
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.5;
  const clampUserZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { playbackDataRef.current = playbackData ?? null; }, [playbackData]);

  // POV mode is dead in AoE1 view - keep the callbacks as no-ops so any
  // existing UI hooked into them still compiles, but we don't expose them.
  // (BattleForge.tsx doesn't reference cyclePOV/exitPOV directly.)

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Canvas setup ────────────────────────────────────────────────────────
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.imageRendering = "pixelated";
    // Vendor fallbacks for older engines
    (canvas.style as unknown as Record<string, string>)["msInterpolationMode"] = "nearest-neighbor";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    let cssW = container.clientWidth || 800;
    let cssH = container.clientHeight || 500;
    function resize() {
      cssW = container!.clientWidth || 800;
      cssH = container!.clientHeight || 500;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      ctx.imageSmoothingEnabled = false;
      setResizeNonce(n => n + 1);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ── User input: pinch-zoom (touch), wheel (desktop), drag-pan ───────────
    // Two-finger pinch sets zoom; one-finger drag pans (only when zoomed
    // in past 1× to avoid hijacking taps). Mouse-wheel works on desktop.
    // All listeners are attached to the container (not the canvas) so the
    // canvas can be re-created on resize without losing handlers.
    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    let panLastX = 0;
    let panLastY = 0;
    let panning = false;
    const dist2 = (a: Touch, b: Touch) => {
      const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist = dist2(e.touches[0], e.touches[1]);
        pinchStartZoom = userZoomRef.current;
        panning = false;
        e.preventDefault();
      } else if (e.touches.length === 1 && userZoomRef.current > 1.0) {
        panning = true;
        panLastX = e.touches[0].clientX;
        panLastY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = dist2(e.touches[0], e.touches[1]);
        if (pinchStartDist > 0) {
          const ratio = d / pinchStartDist;
          const next = clampUserZoom(pinchStartZoom * ratio);
          updateZoomUI(next);
        }
        e.preventDefault();
      } else if (panning && e.touches.length === 1) {
        const dx = e.touches[0].clientX - panLastX;
        const dy = e.touches[0].clientY - panLastY;
        panLastX = e.touches[0].clientX;
        panLastY = e.touches[0].clientY;
        // Convert screen-px drag into iso world-space pan. The iso
        // projection scales world by TILE_W/2 horizontally and TILE_H/2
        // vertically, then rotates 45°. Dragging "right" on screen should
        // move the camera right, which means subtracting from finalCx.
        // We approximate by scaling delta by the current zoom inverse.
        const zNow = Math.max(0.2, userZoomRef.current * 2.4); // base camZoom ~2.4
        // Reverse the iso projection: dx,dy → world dx,dy
        const wx = (dx / (TILE_W * 0.5) + dy / (TILE_H * 0.5)) * 0.5 / zNow * TILE_WORLD;
        const wy = (dy / (TILE_H * 0.5) - dx / (TILE_W * 0.5)) * 0.5 / zNow * TILE_WORLD;
        userPanXRef.current -= wx;
        userPanYRef.current -= wy;
      }
    };
    const onTouchEnd = (_e: TouchEvent) => {
      pinchStartDist = 0;
      panning = false;
    };
    const onWheel = (e: WheelEvent) => {
      // Trackpad / mousewheel zoom. Sensitivity tuned so a normal wheel
      // tick moves ~10% of zoom range per click.
      const factor = Math.pow(1.0015, -e.deltaY);
      const next = clampUserZoom(userZoomRef.current * factor);
      updateZoomUI(next);
      e.preventDefault();
    };
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove",  onTouchMove,  { passive: false });
    container.addEventListener("touchend",   onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);
    container.addEventListener("wheel",      onWheel,      { passive: false });

    // ── Terrain ─────────────────────────────────────────────────────────────
    const terrain = buildTerrain(map);

    // ── Units ───────────────────────────────────────────────────────────────
    const units: BattleUnit[] = [];
    const totalA = teamA.reduce((s, sl) => s + sl.count, 0);
    const totalB = teamB.reduce((s, sl) => s + sl.count, 0);
    let aIdx = 0, bIdx = 0;
    for (const slot of teamA) {
      for (let i = 0; i < slot.count; i++) {
        units.push(createUnit(slot.def, "A", aIdx, totalA, `A-${aIdx}-${Date.now()}`));
        aIdx++;
      }
    }
    for (const slot of teamB) {
      for (let i = 0; i < slot.count; i++) {
        units.push(createUnit(slot.def, "B", bIdx, totalB, `B-${bIdx}-${Date.now()}`));
        bIdx++;
      }
    }
    unitsRef.current = units;

    // Pre-warm sprite sheets so we don't stutter on first render.
    for (const u of units) {
      const def = (teamA.find(s => s.def.id === u.defId)?.def) || (teamB.find(s => s.def.id === u.defId)?.def);
      if (def) getSpriteSheet(def, u.team);
    }
    // Fast lookup defId → def (needed to refetch sprites at draw time).
    const defById = new Map<string, CharacterDef>();
    for (const s of teamA) defById.set(s.def.id, s.def);
    for (const s of teamB) defById.set(s.def.id, s.def);

    // Per-unit animation/facing state, parallel to units array.
    // (polish-pass) Added prevX/prevY + interpTime to interpolate visual
    // position between sim ticks so units glide smoothly instead of
    // teleporting per tick (especially noticeable in playback at
    // interval=8). facingHoldTicks throttles facing flips so the sprite
    // doesn't rapid-flicker between NE/SE when velocity is jittery.
    type UnitVisual = {
      facing: Facing;
      facingHoldTicks: number; // ticks until next facing flip is allowed
      animTick: number;     // frame counter
      lastAttackCd: number; // detect cooldown reset → trigger attack anim
      attackTimer: number;  // ticks remaining in attack animation
      prevX: number;        // unit world x at start of current segment
      prevY: number;        // unit world y at start of current segment
      segStart: number;     // performance.now() when current segment began
      segEnd: number;       // expected end time of current segment
    };
    const visuals: UnitVisual[] = units.map(u => ({
      facing: u.team === "A" ? "SE" : "SW",
      facingHoldTicks: 0,
      animTick: 0,
      lastAttackCd: u.attackCooldown,
      attackTimer: 0,
      prevX: u.x,
      prevY: u.y,
      segStart: performance.now(),
      segEnd: performance.now() + 16.67,
    }));

    // ── Particle / VFX state ────────────────────────────────────────────────
    const particles: Particle[] = [];
    const vfx: VFXState[] = [];

    // ── Recording ───────────────────────────────────────────────────────────
    const recordedFrames: UnitFrameData[][] = [];
    let recordingDone = false;

    // ── Battle bookkeeping ──────────────────────────────────────────────────
    const log: BattleLogEntry[] = [];
    let tick = 0;
    let battleStartTime = performance.now();
    let battleEnded = false;
    const totalMaxA = units.filter(u => u.team === "A").reduce((s, u) => s + u.maxHp, 0);
    const totalMaxB = units.filter(u => u.team === "B").reduce((s, u) => s + u.maxHp, 0);

    onLogEntry({ tick: 0, text: `⚔️ Battle begins on ${map.name}`, type: "start" });

    // ── Camera ──────────────────────────────────────────────────────────────
    // Close-up follow camera. Tracks the centroid of all currently-alive
    // units (weighted by HP fraction so dying combatants don't drag the
    // camera back as hard) and zooms inversely to the LARGEST combatant in
    // play. So a normal humanoid duel fills the screen at ~3.5x zoom, but
    // when a colossal kaiju is on the field the view pulls back to ~1.8x
    // so it still fits. Smooth-lerped per frame so movement feels cinematic.
    const SIZE_MUL: Record<string, number> = {
      tiny: 0.6, small: 0.85, medium: 1.0, large: 1.25, huge: 1.6, colossal: 2.0,
    };
    let camCx = WORLD_W / 2;
    let camCy = WORLD_H / 2;
    let camZoom = 2.2;
    let camInitialized = false;

    function makeView(): IsoView {
      const w = canvas.clientWidth || cssW || 800;
      const h = canvas.clientHeight || cssH || 500;

      // Compute target centroid + target zoom from currently alive units.
      let targetCx = WORLD_W / 2;
      let targetCy = WORLD_H / 2;
      let targetZoom = camZoom;
      const alive = units.filter(u => u.state === "alive");
      if (alive.length > 0) {
        let weightedX = 0, weightedY = 0, weightSum = 0;
        let maxMul = 0.6;
        let cx0 = 0, cy0 = 0;
        for (const u of alive) { cx0 += u.x; cy0 += u.y; }
        cx0 /= alive.length; cy0 /= alive.length;
        let maxDist2 = 0;
        for (const u of alive) {
          const wgt = Math.max(0.2, u.hp / Math.max(1, u.maxHp));
          weightedX += u.x * wgt; weightedY += u.y * wgt; weightSum += wgt;
          const m = SIZE_MUL[u.size] ?? 1.0;
          if (m > maxMul) maxMul = m;
          const dx = u.x - cx0, dy = u.y - cy0;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxDist2) maxDist2 = d2;
        }
        targetCx = weightedX / weightSum;
        targetCy = weightedY / weightSum;
        // Base zoom: medium fighter -> 3.6, colossal -> 1.8.
        let z = 3.6 / maxMul;
        // Pull back when combatants are spread far apart so the whole
        // fight stays in frame. Spread > 220 world units dampens linearly.
        const spread = Math.sqrt(maxDist2);
        if (spread > 220) z *= Math.max(0.55, 220 / spread);
        // Also fit zoom to canvas — never tighter than the canvas can hold
        // ~280 world units across the short axis.
        const minZ = Math.min(w, h) / 480;
        targetZoom = Math.max(minZ, Math.min(4.5, z));
      }

      if (!camInitialized) {
        camCx = targetCx; camCy = targetCy; camZoom = targetZoom;
        camInitialized = true;
      } else {
        camCx += (targetCx - camCx) * 0.07;
        camCy += (targetCy - camCy) * 0.07;
        camZoom += (targetZoom - camZoom) * 0.05;
      }

      // Apply user-controlled zoom + pan on top of the auto-camera. Pan
      // values are in world units and only kick in when the user has
      // explicitly dragged (default 0). Zoom multiplies the auto-zoom so
      // pinch-in still respects the unit-size aware base framing.
      const finalZoom = camZoom * userZoomRef.current;
      const finalCx = camCx + userPanXRef.current;
      const finalCy = camCy + userPanYRef.current;
      // Project (finalCx, finalCy) to canvas center.
      const tx = finalCx / TILE_WORLD;
      const ty = finalCy / TILE_WORLD;
      const originX = w * 0.5 - (tx - ty) * (TILE_W * 0.5) * finalZoom;
      const originY = h * 0.5 - (tx + ty) * (TILE_H * 0.5) * finalZoom;
      return { originX, originY, zoom: finalZoom };
    }

    // ── Main loop ───────────────────────────────────────────────────────────
    let raf = 0;
    let last = performance.now();
    let tickAccumulator = 0;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last);
      last = now;

      const playback = playbackDataRef.current;

      if (playback) {
        // ── Playback path: pull frame data straight from the recording ─────
        // (polish-pass) Lerp visual position between adjacent frame
        // snapshots so playback at interval=8 looks smooth, not jittery.
        const rawIdx = playback.currentTick / playback.interval;
        const idx = Math.max(0, Math.min(
          Math.floor(rawIdx),
          playback.frames.length - 1,
        ));
        const nextIdx = Math.min(idx + 1, playback.frames.length - 1);
        const lerpT = Math.max(0, Math.min(1, rawIdx - idx));
        const frameData = playback.frames[idx];
        const frameNext = playback.frames[nextIdx];
        for (let i = 0; i < units.length && i < frameData.length; i++) {
          const u = units[i];
          const fd = frameData[i];
          const fn = frameNext[i] ?? fd;
          // Smooth-blended visual position; keep the underlying logic
          // (hp/state/etc.) from the current snapshot so the HP bar +
          // death timer stay in step with the tick clock.
          u.x = fd.x + (fn.x - fd.x) * lerpT;
          u.y = fd.y + (fn.y - fd.y) * lerpT;
          u.vx = fd.vx; u.vy = fd.vy;
          // Facing change with hold-off so we don't flip on micro-jitter.
          const wantFacing = facingFromVelocity(fd.vx, fd.vy, visuals[i].facing);
          if (visuals[i].facingHoldTicks <= 0 && wantFacing !== visuals[i].facing) {
            visuals[i].facing = wantFacing;
            visuals[i].facingHoldTicks = 6;
          } else if (visuals[i].facingHoldTicks > 0) {
            visuals[i].facingHoldTicks--;
          }
          u.hp = fd.hp; u.maxHp = fd.maxHp;
          // K.O. detection — state just flipped to dying
          if (u.state !== "dying" && fd.state === "dying") {
            playSfx("playerHurt", { volume: 0.45, pitch: 0.7 + Math.random() * 0.2 });
          }
          // Rage mode just activated
          if (!u.rageMode && fd.rageMode) {
            playSfx("powerUp", { volume: 0.5 });
          }
          u.state = fd.state;
          u.flashTimer = fd.flashTimer;
          u.attackCooldown = fd.attackCooldown;
          u.deathTimer = fd.deathTimer;
          u.rageMode = fd.rageMode;
          // Trigger attack anim when cooldown just reset (high → low)
          if (visuals[i].lastAttackCd > fd.attackCooldown + 5) {
            visuals[i].attackTimer = 12;
            // Random sfx per swing; rate-limit by skipping ~85% so it
            // doesn't clatter with many units.
            if (Math.random() < 0.15) {
              playSfx("impactMetal", { volume: 0.3, pitch: 0.9 + Math.random() * 0.3 });
            }
          }
          visuals[i].lastAttackCd = fd.attackCooldown;
        }
      } else if (!pausedRef.current && !battleEnded) {
        // ── Live simulation ────────────────────────────────────────────────
        // Accumulate fractional ticks so slow-mo (speed=0.1) actually slows.
        // The simulation expects ~60 ticks/sec at speed=1.
        tickAccumulator += (dt / 16.67) * speedRef.current * (map.speedMultiplier || 1);
        const ticksThisFrame = Math.min(8, Math.floor(tickAccumulator));
        tickAccumulator -= ticksThisFrame;
        for (let t = 0; t < ticksThisFrame; t++) {
          // (polish-pass) Snapshot pre-tick positions so the next render
          // can lerp from old→new across the frame interval.
          for (let i = 0; i < units.length; i++) {
            visuals[i].prevX = units[i].x;
            visuals[i].prevY = units[i].y;
            visuals[i].segStart = now;
            visuals[i].segEnd = now + 16.67;
          }
          tickSimulation(units, particles, map, tick, log, vfxQueue);
          tick++;

          // Drain log entries the sim pushed
          while (log.length) {
            const entry = log.shift()!;
            onLogEntry(entry);
          }

          // Drain VFX events
          while (vfxQueue.length) {
            const ev = vfxQueue.shift()!;
            vfx.push({
              id: __vfxId++,
              kind: (ev.effect || "burst"),
              x: ev.x, y: ev.y,
              tx: ev.targetX, ty: ev.targetY,
              life: 30, maxLife: 30,
              color: ev.color || "#FFEE55",
            });
          }

          // Recording snapshot
          if (!recordingDone && tick % RECORD_INTERVAL === 0) {
            recordedFrames.push(units.map(u => ({
              x: u.x, y: u.y, vx: u.vx, vy: u.vy,
              hp: u.hp, maxHp: u.maxHp, state: u.state,
              flashTimer: u.flashTimer, attackCooldown: u.attackCooldown,
              attackCooldownMax: u.attackCooldownMax,
              deathTimer: u.deathTimer, deathVx: u.deathVx, rageMode: u.rageMode,
            })));
          }

          // Update visual animation state alongside the sim.
          for (let i = 0; i < units.length; i++) {
            const u = units[i];
            const v = visuals[i];
            // (polish-pass) Facing change with hold-off: avoid rapid
            // flip-flop on jittery velocity. Hold for 6 ticks after each
            // change. Targets still allow a flip when stationary.
            const wantFacing =
              Math.abs(u.vx) + Math.abs(u.vy) > 0.05
                ? facingFromVelocity(u.vx, u.vy, v.facing)
                : (() => {
                    if (!u.targetUid) return v.facing;
                    const t = units.find(o => o.uid === u.targetUid);
                    return t ? facingToward(u.x, u.y, t.x, t.y) : v.facing;
                  })();
            if (v.facingHoldTicks <= 0 && wantFacing !== v.facing) {
              v.facing = wantFacing;
              v.facingHoldTicks = 6;
            } else if (v.facingHoldTicks > 0) {
              v.facingHoldTicks--;
            }
            // Attack animation trigger: cooldown jumped back up
            if (v.lastAttackCd < u.attackCooldown - 5) {
              v.attackTimer = 12;
              // For ranged units, spawn a projectile VFX heading at target.
              if (u.attackType !== "melee" && u.targetUid) {
                const target = units.find(o => o.uid === u.targetUid);
                if (target) {
                  vfx.push({
                    id: __vfxId++, kind: "projectile",
                    x: u.x, y: u.y, tx: target.x, ty: target.y,
                    life: 16, maxLife: 16,
                    color: u.color || "#FFE066",
                  });
                }
              }
            }
            v.lastAttackCd = u.attackCooldown;
            if (v.attackTimer > 0) v.attackTimer--;
            v.animTick++;
          }

          // Stats
          let aHp = 0, bHp = 0;
          for (const u of units) {
            if (u.team === "A") aHp += Math.max(0, u.hp);
            else bHp += Math.max(0, u.hp);
          }
          onStats(aHp, totalMaxA, bHp, totalMaxB);

          // End condition — strict team elimination. A side is "still
          // fighting" only when they have at least one ACTIVELY alive unit;
          // a unit mid-death-animation doesn't count, so the battle ends
          // cleanly as soon as one team's last fighter falls instead of
          // dragging on while bodies are flying.
          const aAlive = units.some(u => u.team === "A" && u.state === "alive");
          const bAlive = units.some(u => u.team === "B" && u.state === "alive");
          if (!battleEnded && (!aAlive || !bAlive)) {
            battleEnded = true;
            const winner: "A" | "B" | "draw" = aAlive && !bAlive ? "A" : bAlive && !aAlive ? "B" : "draw";
            const aSurv = units.filter(u => u.team === "A" && u.state === "alive").length;
            const bSurv = units.filter(u => u.team === "B" && u.state === "alive").length;
            const mvp = getMVP(units);
            const result: BattleResult = {
              winner,
              teamAName: teamA[0]?.def.name || "Team A",
              teamBName: teamB[0]?.def.name || "Team B",
              teamASurvivors: aSurv,
              teamBSurvivors: bSurv,
              mvp,
              durationMs: performance.now() - battleStartTime,
              totalKills: units.reduce((s, u) => s + u.kills, 0),
            };
            onLogEntry({ tick, text: winner === "draw" ? "🤝 Draw!" : `🏆 Team ${winner} wins!`, type: "end" });
            onBattleEnd(result);
            if (!recordingDone) {
              recordingDone = true;
              onRecordingReady?.(recordedFrames, RECORD_INTERVAL, tick);
            }
            break;
          }
        }
      }

      // ── Render ────────────────────────────────────────────────────────────
      const view = makeView();
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      // Background - soft gradient using map colors
      const grad = ctx.createLinearGradient(0, 0, 0, cssH);
      grad.addColorStop(0, map.bgTop || "#1A2030");
      grad.addColorStop(1, map.bgBottom || "#05080F");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);

      // Tiles
      // Painter's order on the iso plane: from back to front by (x+y).
      for (let y = 0; y < TILES_Y; y++) {
        for (let x = 0; x < TILES_X; x++) {
          const cell = terrain[y][x];
          const colors = tileColors(cell.kind, cell.variant, map);
          // Tile center is at the centre of its world footprint
          const wx = (x + 0.5) * TILE_WORLD;
          const wy = (y + 0.5) * TILE_WORLD;
          const { sx, sy } = worldToScreen(wx, wy, view);
          drawIsoDiamond(ctx, sx, sy, TILE_W * view.zoom, TILE_H * view.zoom, colors.top, colors.outline);
          // Water gets a tiny ripple highlight
          if (cell.kind === "water") {
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fillRect(sx - 4 * view.zoom, sy - 1, 8 * view.zoom, 1);
          }
        }
      }

      // Arena border (subtle accent ring)
      drawArenaFrame(ctx, view, map.accentColor || "#FFD700");

      // Map features (v2): drawn between tiles and units.
      if (map.features && map.features.length) {
        // Sort by (y+x) so features further back paint first → painter's order.
        const sorted = [...map.features].sort((a, b) =>
          ((a.y + (a.h ?? 1) * 0.5) + (a.x + (a.w ?? 1) * 0.5)) -
          ((b.y + (b.h ?? 1) * 0.5) + (b.x + (b.w ?? 1) * 0.5)),
        );
        for (const feat of sorted) drawFeature(ctx, feat, view, map.id);
      }

      // Build draw list for depth sort: shadows + units + projectiles + bursts
      type DrawItem = {
        depth: number;
        kind: "shadow" | "unit" | "vfx";
        // for unit
        unitIdx?: number;
        // for vfx
        vfxIdx?: number;
      };
      const drawList: DrawItem[] = [];

      // (polish-pass) Compute the interpolated visual position per unit
      // once per frame so shadow + sprite + HP bar all anchor to the
      // same spot. In playback mode we already wrote a lerped u.x/u.y
      // above, so visualPos = u.x/u.y. In live mode we lerp from the
      // pre-tick snapshot toward u.x/u.y over the ~16.67ms segment.
      const visualPos: { vx: number; vy: number }[] = new Array(units.length);
      const nowMs = now;
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const v = visuals[i];
        if (playback) {
          visualPos[i] = { vx: u.x, vy: u.y };
        } else {
          const dur = Math.max(1, v.segEnd - v.segStart);
          const t = Math.max(0, Math.min(1, (nowMs - v.segStart) / dur));
          visualPos[i] = { vx: v.prevX + (u.x - v.prevX) * t, vy: v.prevY + (u.y - v.prevY) * t };
        }
      }

      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (u.state === "dead") continue;
        const vp = visualPos[i];
        drawList.push({ depth: depthKey(vp.vx, vp.vy) - 0.1, kind: "shadow", unitIdx: i });
        drawList.push({ depth: depthKey(vp.vx, vp.vy), kind: "unit", unitIdx: i });
      }
      for (let i = 0; i < vfx.length; i++) {
        const v = vfx[i];
        drawList.push({ depth: depthKey(v.x, v.y) + 0.05, kind: "vfx", vfxIdx: i });
      }
      drawList.sort((a, b) => a.depth - b.depth);

      // Render the list
      for (const item of drawList) {
        if (item.kind === "shadow" && item.unitIdx !== undefined) {
          const u = units[item.unitIdx];
          const vp = visualPos[item.unitIdx];
          const { sx, sy } = worldToScreen(vp.vx, vp.vy, view);
          // Heavier grounding shadow — bigger, darker, slightly under the
          // sprite — so fighters feel like they have actual weight on the
          // ground instead of floating against the tiles.
          const r = (u.radius * 0.45) * view.zoom;
          // Soft outer halo
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.ellipse(sx, sy + 1, Math.max(6, r * 1.85), Math.max(3, r * 0.9), 0, 0, Math.PI * 2);
          ctx.fill();
          // Core shadow
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.beginPath();
          ctx.ellipse(sx, sy, Math.max(4, r * 1.4), Math.max(2, r * 0.65), 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.kind === "unit" && item.unitIdx !== undefined) {
          const u = units[item.unitIdx];
          const def = defById.get(u.defId);
          if (!def) continue;
          // Defensive: getSpriteSheet has been observed to fail silently
          // on some character defs in production. If it throws, render
          // the unit as a colored circle so it remains visible.
          let sheet: ReturnType<typeof getSpriteSheet> | null = null;
          try { sheet = getSpriteSheet(def, u.team); } catch (err) {
            console.warn("[battleforge] sprite generation failed for", def.id, err);
          }
          if (!sheet) {
            const v = visuals[item.unitIdx];
            const vp = visualPos[item.unitIdx];
            const { sx, sy } = worldToScreen(vp.vx, vp.vy, view);
            const fallbackColor = u.team === "A" ? "#5599FF" : "#FF5544";
            const scale = view.zoom;
            ctx.fillStyle = fallbackColor;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = Math.max(1, view.zoom);
            ctx.beginPath();
            ctx.arc(sx, sy - 6 * scale, Math.max(4, u.radius * 0.45 * view.zoom), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Keep v referenced so TS doesn't complain in some lint modes.
            void v;
            continue;
          }
          const v = visuals[item.unitIdx];
          const vp = visualPos[item.unitIdx];
          const { sx, sy } = worldToScreen(vp.vx, vp.vy, view);

          let canvas2: HTMLCanvasElement;
          let alpha = 1;
          if (u.state === "dying") {
            canvas2 = sheet.anim.death;
            // Fade toward 0 across the death window
            const t = Math.max(0, Math.min(1, u.deathTimer / DEATH_ANIM_TICKS));
            alpha = 1 - t;
          } else if (v.attackTimer > 0) {
            const fIdx = Math.min(2, Math.floor((12 - v.attackTimer) / 4));
            canvas2 = sheet.anim.attack[facingIndex(v.facing)][fIdx];
          } else if (Math.abs(u.vx) + Math.abs(u.vy) > 0.05) {
            const fIdx = Math.floor((v.animTick / 6) % 4);
            canvas2 = sheet.anim.walk[facingIndex(v.facing)][fIdx];
          } else {
            canvas2 = sheet.anim.idle[facingIndex(v.facing)];
          }

          // Sprite scaling factor: size class → sprite pixel scale.
          // Multiplied by COMBAT_SCALE so fighters feel weightier on screen
          // (the previous 1.0-base read too small against the iso tiles).
          const sizeMul: Record<string, number> = {
            tiny: 0.6, small: 0.85, medium: 1.0, large: 1.25, huge: 1.6, colossal: 2.0,
          };
          const COMBAT_SCALE = 1.35;
          const scale = (sizeMul[u.size] || 1.0) * COMBAT_SCALE * view.zoom;
          const drawW = SPRITE_W * scale;
          const drawH = SPRITE_H * scale;
          // Anchor: sprite's feet (ANCHOR_X, ANCHOR_Y) should align with (sx, sy)
          const dx = sx - ANCHOR_X * scale;
          const dy = sy - ANCHOR_Y * scale;

          ctx.globalAlpha = alpha;
          // Defensive fallback: if sprite generation produced an
          // undefined/zero-dim canvas (rare but observed in production
          // as a "green screen with no characters" bug), render a
          // visible colored circle so the unit is at least on-screen.
          // The team accent + size class make it readable.
          const spriteOk = canvas2 && canvas2.width > 0 && canvas2.height > 0;
          if (!spriteOk) {
            const fallbackColor = u.team === "A" ? "#5599FF" : "#FF5544";
            ctx.fillStyle = fallbackColor;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = Math.max(1, view.zoom);
            ctx.beginPath();
            ctx.arc(sx, sy - 6 * scale, Math.max(4, u.radius * 0.45 * view.zoom), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            continue;
          }
          // Hit flash: brief white wash on top of sprite
          ctx.drawImage(canvas2, dx, dy, drawW, drawH);
          if (u.flashTimer > 0) {
            ctx.globalAlpha = Math.min(0.65, u.flashTimer / 10) * alpha;
            ctx.globalCompositeOperation = "lighter";
            ctx.drawImage(canvas2, dx, dy, drawW, drawH);
            ctx.globalCompositeOperation = "source-over";
          }
          // Rage glow ring
          if (u.rageMode && u.state === "alive") {
            ctx.globalAlpha = 0.7 * alpha;
            ctx.strokeStyle = "#FF4444";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(sx, sy, (u.radius * 0.85) * view.zoom, (u.radius * 0.42) * view.zoom, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;

          // ── HP bar (above sprite) ─────────────────────────────────────────
          if (u.state === "alive") {
            const barW = Math.max(14, drawW * 0.55);
            const barH = Math.max(2, 3 * view.zoom);
            const bx = sx - barW / 2;
            const by = sy - drawH * 0.95;
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
            const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
            ctx.fillStyle = u.team === "A" ? "#3D9BFF" : "#FF5544";
            ctx.fillRect(bx, by, barW * pct, barH);
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, barW - 1, barH - 1);
          }
        } else if (item.kind === "vfx" && item.vfxIdx !== undefined) {
          const v = vfx[item.vfxIdx];
          drawVFX(ctx, v, view);
        }
      }

      // Particles — the sim already populates this array (spawnImpact,
      // spawnDeath, spawnSpecial) but the previous renderer never drew
      // them. Drawing them adds a lot of free visual juice: sparks on
      // every hit, stars on KOs, colored debris from specials.
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const { sx, sy } = worldToScreen(p.x, p.y, view);
        const alpha = Math.max(0, Math.min(1, p.life / Math.max(1, p.maxLife)));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.type === "star") {
          // Draw a tiny + sprite to read as a sparkle.
          const r = (p.radius ?? 2) * view.zoom * 0.9;
          ctx.fillRect(sx - r, sy - 1, r * 2, 2);
          ctx.fillRect(sx - 1, sy - r, 2, r * 2);
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1, (p.radius ?? 2) * view.zoom * 0.75), 0, Math.PI * 2);
          ctx.fill();
        }
        // Advance physics
        p.vy += 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // VFX lifetime tick
      for (let i = vfx.length - 1; i >= 0; i--) {
        vfx[i].life--;
        if (vfx[i].life <= 0) vfx.splice(i, 1);
      }

      ctx.restore();
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove",  onTouchMove);
      container.removeEventListener("touchend",   onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      container.removeEventListener("wheel",      onWheel);
      if (canvas.parentNode === container) container.removeChild(canvas);
      canvasRef.current = null;
    };
    // We intentionally re-run the whole setup if these inputs change - that
    // matches the prior renderer's behaviour and keeps things simple.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamA, teamB, map.id, onBattleEnd, onLogEntry, onStats, onRecordingReady]);

  const handleZoomIn = useCallback(() => {
    updateZoomUI(clampUserZoom(userZoomRef.current * 1.25));
  }, [updateZoomUI]);
  const handleZoomOut = useCallback(() => {
    updateZoomUI(clampUserZoom(userZoomRef.current / 1.25));
  }, [updateZoomUI]);
  const handleZoomReset = useCallback(() => {
    userPanXRef.current = 0;
    userPanYRef.current = 0;
    updateZoomUI(1);
  }, [updateZoomUI]);
  const zoomDirty = Math.abs(userZoom - 1) > 0.01;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          background: map.bgBottom || "#05080F",
          overflow: "hidden",
          touchAction: "none",
        }}
        data-nonce={resizeNonce}
      />
      {/* Zoom controls — sits over the canvas, top-right. Touch-friendly
          44×44 buttons. Pinch + wheel also update the same userZoom. */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 5,
          pointerEvents: "auto",
        }}
      >
        <button
          aria-label="Zoom in"
          onClick={handleZoomIn}
          style={zoomBtnStyle()}
        >+</button>
        <div style={zoomReadoutStyle()}>{Math.round(userZoom * 100)}%</div>
        <button
          aria-label="Zoom out"
          onClick={handleZoomOut}
          style={zoomBtnStyle()}
        >−</button>
        {zoomDirty && (
          <button
            aria-label="Reset zoom"
            onClick={handleZoomReset}
            style={{ ...zoomBtnStyle(), fontSize: 11, letterSpacing: 1 }}
          >RESET</button>
        )}
      </div>
    </div>
  );
}

function zoomBtnStyle(): CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(5,2,10,0.78)",
    border: "1px solid rgba(255,215,0,0.4)",
    color: "#FFD700",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    userSelect: "none",
    touchAction: "manipulation",
  };
}
function zoomReadoutStyle(): CSSProperties {
  return {
    width: 44,
    textAlign: "center",
    fontSize: 10,
    fontFamily: "monospace",
    color: "#FFD700",
    background: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: "2px 0",
    letterSpacing: 1,
  };
}

// ── VFX drawing ─────────────────────────────────────────────────────────────
function drawVFX(ctx: CanvasRenderingContext2D, v: VFXState, view: IsoView) {
  const { sx, sy } = worldToScreen(v.x, v.y, view);
  const t = 1 - v.life / v.maxLife;

  if (v.kind === "projectile" && v.tx !== undefined && v.ty !== undefined) {
    const { sx: tx, sy: ty } = worldToScreen(v.tx, v.ty, view);
    const px = sx + (tx - sx) * t;
    const py = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 16 * view.zoom; // little arc
    const sprite = getProjectileSprite();
    const scale = view.zoom * 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, px - 4 * scale, py - 4 * scale, 8 * scale, 8 * scale);
    return;
  }

  if (v.kind === "lightning") {
    ctx.strokeStyle = "#FFE066";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let x = sx, y = sy - 40 * view.zoom;
    ctx.moveTo(x, y);
    for (let i = 0; i < 4; i++) {
      x += (Math.random() - 0.5) * 14;
      y += 10 * view.zoom;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    return;
  }

  if (v.kind === "shockwave") {
    const radius = 8 + 36 * t * view.zoom;
    ctx.strokeStyle = `rgba(255,180,80,${1 - t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, radius, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (v.kind === "laser" && v.tx !== undefined && v.ty !== undefined) {
    const { sx: tx, sy: ty } = worldToScreen(v.tx, v.ty, view);
    ctx.strokeStyle = `rgba(255,80,80,${1 - t})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 8);
    ctx.lineTo(tx, ty - 8);
    ctx.stroke();
    return;
  }

  if (v.kind === "fire") {
    const r = (8 + 14 * (1 - t)) * view.zoom;
    ctx.fillStyle = `rgba(255,120,40,${1 - t})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 4, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,230,120,${1 - t})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 6, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (v.kind === "frost") {
    ctx.strokeStyle = `rgba(160,220,255,${1 - t})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 18 * view.zoom * (0.5 + t * 0.5);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(sx + Math.cos(a) * r, sy - 6 + Math.sin(a) * r);
      ctx.stroke();
    }
    return;
  }

  if (v.kind === "nature") {
    ctx.fillStyle = `rgba(120,255,140,${1 - t})`;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 2;
      const r = 14 * view.zoom;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(a) * r, sy - 6 + Math.sin(a) * r, 2 * view.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Default "burst"
  const r = (10 + 22 * (1 - t)) * view.zoom;
  ctx.fillStyle = `rgba(255,238,85,${1 - t})`;
  ctx.beginPath();
  ctx.arc(sx, sy - 8, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${(1 - t) * 0.6})`;
  ctx.beginPath();
  ctx.arc(sx, sy - 8, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

// Suppress unused-import warning on Particle in the editor - the simulation
// needs the type to be importable here even if we don't render its content.
export type { Particle };
