// luizmeloSprites.ts — luizmelo PNG sprite loader + framer.
//
// Loads CC0 / CC-BY luizmelo character packs from /public/assets/luizmelo/,
// slices their horizontal strips into per-state frame arrays, and lets the
// renderer pull the right frame for a given (pack, state, frame, facing,
// team, accent color) combination. Frames are pre-baked into 64×64 sprite
// canvases (the format the rest of the renderer already expects) with the
// fighter's signature color applied as a tint and the team color applied as
// a subtle wash, so every fighter ends up visually distinct even when they
// share a base pack.
//
// Packs available on disk (June 2026 inventory):
//   • martial-hero            — humanoid swordsman    (200×200 source frames)
//   • monsters-creatures-fantasy/Skeleton  — humanoid w/ sword + shield (150×150)
//   • monsters-creatures-fantasy/Goblin    — small green melee creature (150×150)
//   • monsters-creatures-fantasy/Mushroom  — chunky organic creature    (150×150)
//   • monsters-creatures-fantasy/Flying eye— floating eye, magical      (150×150)
//
// Mapping into the 5 in-game archetypes is in `packForArchetype()`.
//
// All loading is async (Image() onload), but `getLuizmeloSheet` is sync —
// it returns a "loading" placeholder if the pack hasn't finished, and the
// renderer (which calls it every frame) will pick up the real sheet as
// soon as the images finish loading. Sheets are cached by
// (pack,team,accent) so the per-frame tint cost is paid once.

import type { CharacterDef, SizeClass } from "./types";
import type { Archetype } from "./spriteFactory";

// ── output canvas dimensions ───────────────────────────────────────────────
// We keep the renderer's existing 64×64 sprite contract so BattleCanvas /
// MiniAvatar / SpectateLive don't need changes.
export const LUIZ_SPRITE_W = 64;
export const LUIZ_SPRITE_H = 64;
export const LUIZ_ANCHOR_X = 32;
export const LUIZ_ANCHOR_Y = 56; // feet line

// ── pack catalogue ─────────────────────────────────────────────────────────
export type PackName = "martial-hero" | "skeleton" | "goblin" | "mushroom" | "flying-eye";

interface SourceStateDef {
  /** Path under /assets/luizmelo/ (no leading slash). */
  url: string;
  /** Number of frames in the horizontal strip. */
  frames: number;
}

interface PackDef {
  name: PackName;
  /** Source frame dimensions in pixels. */
  srcW: number;
  srcH: number;
  /** State → source strip. `run` is whichever pack-specific "moving" anim exists. */
  states: {
    idle: SourceStateDef;
    run: SourceStateDef;
    attack: SourceStateDef;
    death: SourceStateDef;
  };
  /**
   * How much of the source frame to fit into the 64×64 sprite canvas.
   * Choose a scale so the character silhouette fills ~46–54 px tall.
   * (Iso renderer multiplies this further by size class + view zoom.)
   */
  fitScale: number;
  /**
   * The source-pixel Y position where the character's feet sit. Used to
   * line up against the renderer's ANCHOR_Y on the destination canvas.
   */
  srcFeetY: number;
  /**
   * Tiny visual offset in destination pixels (positive = down). Use to
   * nudge the silhouette so it reads centered.
   */
  destOffsetX?: number;
  destOffsetY?: number;
  /** Tint strength multiplier (0..1). Higher = more aggressive recolor. */
  tintStrength: number;
}

const PACKS: Record<PackName, PackDef> = {
  "martial-hero": {
    name: "martial-hero",
    srcW: 200, srcH: 200,
    states: {
      idle:   { url: "luizmelo/martial-hero/Sprites/Idle.png",    frames: 8 },
      run:    { url: "luizmelo/martial-hero/Sprites/Run.png",     frames: 8 },
      attack: { url: "luizmelo/martial-hero/Sprites/Attack1.png", frames: 6 },
      death:  { url: "luizmelo/martial-hero/Sprites/Death.png",   frames: 6 },
    },
    fitScale: 0.40,
    srcFeetY: 175,
    destOffsetX: 0,
    destOffsetY: 0,
    tintStrength: 0.32,
  },
  "skeleton": {
    name: "skeleton",
    srcW: 150, srcH: 150,
    states: {
      idle:   { url: "luizmelo/monsters-creatures-fantasy/Skeleton/Idle.png",    frames: 4 },
      run:    { url: "luizmelo/monsters-creatures-fantasy/Skeleton/Walk.png",    frames: 4 },
      attack: { url: "luizmelo/monsters-creatures-fantasy/Skeleton/Attack.png",  frames: 8 },
      death:  { url: "luizmelo/monsters-creatures-fantasy/Skeleton/Death.png",   frames: 4 },
    },
    fitScale: 0.46,
    srcFeetY: 128,
    destOffsetX: 0,
    destOffsetY: 0,
    tintStrength: 0.34,
  },
  "goblin": {
    name: "goblin",
    srcW: 150, srcH: 150,
    states: {
      idle:   { url: "luizmelo/monsters-creatures-fantasy/Goblin/Idle.png",    frames: 4 },
      run:    { url: "luizmelo/monsters-creatures-fantasy/Goblin/Run.png",     frames: 8 },
      attack: { url: "luizmelo/monsters-creatures-fantasy/Goblin/Attack.png",  frames: 8 },
      death:  { url: "luizmelo/monsters-creatures-fantasy/Goblin/Death.png",   frames: 4 },
    },
    fitScale: 0.50,
    srcFeetY: 128,
    destOffsetX: 0,
    destOffsetY: 0,
    tintStrength: 0.36,
  },
  "mushroom": {
    name: "mushroom",
    srcW: 150, srcH: 150,
    states: {
      idle:   { url: "luizmelo/monsters-creatures-fantasy/Mushroom/Idle.png",    frames: 4 },
      run:    { url: "luizmelo/monsters-creatures-fantasy/Mushroom/Run.png",     frames: 8 },
      attack: { url: "luizmelo/monsters-creatures-fantasy/Mushroom/Attack.png",  frames: 8 },
      death:  { url: "luizmelo/monsters-creatures-fantasy/Mushroom/Death.png",   frames: 4 },
    },
    fitScale: 0.48,
    srcFeetY: 128,
    destOffsetX: 0,
    destOffsetY: 0,
    tintStrength: 0.34,
  },
  "flying-eye": {
    name: "flying-eye",
    srcW: 150, srcH: 150,
    states: {
      // Flying eye has no Idle/Run packs — Flight serves as both.
      idle:   { url: "luizmelo/monsters-creatures-fantasy/Flying eye/Flight.png", frames: 8 },
      run:    { url: "luizmelo/monsters-creatures-fantasy/Flying eye/Flight.png", frames: 8 },
      attack: { url: "luizmelo/monsters-creatures-fantasy/Flying eye/Attack.png", frames: 8 },
      death:  { url: "luizmelo/monsters-creatures-fantasy/Flying eye/Death.png",  frames: 4 },
    },
    fitScale: 0.50,
    srcFeetY: 100, // floating creature — feet line is its lower body
    destOffsetX: 0,
    destOffsetY: -4,
    tintStrength: 0.40,
  },
};

// ── archetype → pack mapping ───────────────────────────────────────────────
/**
 * Per-archetype pack assignment. Same idea as the prior `archetypeFor` but
 * now backed by real animated sprite packs.
 *
 * FLAGGED — Cavalry: we do not have a horse-mounted luizmelo sprite, so
 * cavalry units fall back to the Mushroom pack (chunky, low-profile
 * creature). This is the closest available silhouette but does not
 * resemble a true rider. To fix, drop a horse/cavalry luizmelo pack into
 * /public/assets/luizmelo/ and add it to PACKS above.
 */
export function packForArchetype(arch: Archetype, size: SizeClass): PackName {
  switch (arch) {
    case "swordsman": return "martial-hero";
    case "archer":    return "skeleton";
    case "mage":      return "flying-eye";
    case "cavalry":   return "mushroom"; // FLAG — no horse sprite available
    case "monster": {
      // Small/medium monsters → goblin. Larger ones use mushroom (more
      // bulk) so a Blue Whale vs T-Rex doesn't read identical to a goblin.
      if (size === "tiny" || size === "small" || size === "medium") return "goblin";
      return "mushroom";
    }
  }
}

// ── image loading ──────────────────────────────────────────────────────────
const imageCache = new Map<string, HTMLImageElement>();
const imagePromises = new Map<string, Promise<HTMLImageElement>>();

/** Resolves a public asset URL with the right base path (works with `vite`). */
function assetUrl(path: string): string {
  // Vite serves /public/* at /<base>/<path>. Most arcade games use the
  // root, so a plain absolute path works.
  return `/assets/${path.replace(/^\/?assets\//, "")}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!);
  const cached = imagePromises.get(url);
  if (cached) return cached;
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(url, img); resolve(img); };
    img.onerror = () => reject(new Error(`failed: ${url}`));
    img.src = assetUrl(url);
  });
  imagePromises.set(url, p);
  return p;
}

// ── loaded pack state ──────────────────────────────────────────────────────
interface LoadedPack {
  def: PackDef;
  images: { idle: HTMLImageElement; run: HTMLImageElement; attack: HTMLImageElement; death: HTMLImageElement };
}
const loadedPacks = new Map<PackName, LoadedPack>();
const loadingPacks = new Map<PackName, Promise<LoadedPack>>();

async function loadPack(name: PackName): Promise<LoadedPack> {
  const hit = loadedPacks.get(name);
  if (hit) return hit;
  const inFlight = loadingPacks.get(name);
  if (inFlight) return inFlight;

  const def = PACKS[name];
  const promise = (async () => {
    const [idle, run, attack, death] = await Promise.all([
      loadImage(def.states.idle.url),
      loadImage(def.states.run.url),
      loadImage(def.states.attack.url),
      loadImage(def.states.death.url),
    ]);
    const lp: LoadedPack = { def, images: { idle, run, attack, death } };
    loadedPacks.set(name, lp);
    return lp;
  })();
  loadingPacks.set(name, promise);
  return promise;
}

/** Kick off all pack loads in the background. Safe to call repeatedly. */
export function preloadAllLuizmeloPacks(): void {
  if (typeof window === "undefined") return;
  (Object.keys(PACKS) as PackName[]).forEach((n) => { void loadPack(n); });
}

/** Returns the loaded pack if ready, else null. */
export function getLoadedPack(name: PackName): LoadedPack | null {
  return loadedPacks.get(name) || null;
}

// ── frame slicing + tinting ────────────────────────────────────────────────
function makeCanvas(w = LUIZ_SPRITE_W, h = LUIZ_SPRITE_H): HTMLCanvasElement {
  const c = (typeof document !== "undefined")
    ? document.createElement("canvas")
    : ({ width: w, height: h, getContext: () => null } as unknown as HTMLCanvasElement);
  c.width = w;
  c.height = h;
  return c;
}

/** Bake one source frame into a destination 64×64 canvas, with tint applied. */
function bakeFrame(
  pack: LoadedPack,
  img: HTMLImageElement,
  frameIdx: number,
  team: "A" | "B",
  accent: string,
  flip: boolean,
): HTMLCanvasElement {
  const def = pack.def;
  const out = makeCanvas();
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, LUIZ_SPRITE_W, LUIZ_SPRITE_H);

  const srcX = frameIdx * def.srcW;
  const drawW = def.srcW * def.fitScale;
  const drawH = def.srcH * def.fitScale;
  // Align source feet (def.srcFeetY) at destination ANCHOR_Y.
  const feetDest = LUIZ_ANCHOR_Y + (def.destOffsetY || 0);
  const destX = LUIZ_ANCHOR_X - drawW * 0.5 + (def.destOffsetX || 0);
  const destY = feetDest - def.srcFeetY * def.fitScale;

  ctx.save();
  if (flip) {
    ctx.translate(LUIZ_SPRITE_W, 0);
    ctx.scale(-1, 1);
  }
  try {
    ctx.drawImage(img, srcX, 0, def.srcW, def.srcH, destX, destY, drawW, drawH);
  } catch {
    // ignore — drawImage can throw on cross-origin images, fall through to
    // leave the canvas blank (renderer has a colored-circle fallback).
  }
  ctx.restore();

  // Tint pass — colors only the visible (non-transparent) pixels.
  // 1) accent (fighter's signature color) as a soft wash
  // 2) team color as an even softer wash, so allies/enemies stay
  //    readable at distance.
  ctx.globalCompositeOperation = "source-atop";

  ctx.fillStyle = accent;
  ctx.globalAlpha = def.tintStrength;
  ctx.fillRect(0, 0, LUIZ_SPRITE_W, LUIZ_SPRITE_H);

  ctx.fillStyle = team === "A" ? "#3D6BD8" : "#C92E2E";
  ctx.globalAlpha = 0.18;
  ctx.fillRect(0, 0, LUIZ_SPRITE_W, LUIZ_SPRITE_H);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  return out;
}

// ── public sheet API ───────────────────────────────────────────────────────
export interface LuizmeloSheet {
  ready: boolean;
  packName: PackName;
  /** [facingIdx] → 1 frame */
  idle: HTMLCanvasElement[];
  /** [facingIdx] → 4 frames */
  walk: HTMLCanvasElement[][];
  /** [facingIdx] → 3 frames */
  attack: HTMLCanvasElement[][];
  /** single frame */
  death: HTMLCanvasElement;
}

// 4 facings: NE / SE / SW / NW.
// luizmelo sprites face RIGHT by default. We map:
//   NE = right view (no flip — character looks "into screen-right")
//   SE = right view (same)  — they're 2D so we don't have true 3/4 angles
//   SW = mirrored
//   NW = mirrored
// This keeps team A (mostly facing SE) and team B (facing SW) looking
// at each other across the iso field.
const FACING_FLIP = [false, false, true, true] as const;

function placeholderSheet(packName: PackName): LuizmeloSheet {
  const blank = makeCanvas();
  return {
    ready: false,
    packName,
    idle:   [blank, blank, blank, blank],
    walk:   [[blank, blank, blank, blank], [blank, blank, blank, blank], [blank, blank, blank, blank], [blank, blank, blank, blank]],
    attack: [[blank, blank, blank], [blank, blank, blank], [blank, blank, blank], [blank, blank, blank]],
    death:  blank,
  };
}

const sheetCache = new Map<string, LuizmeloSheet>();

function pickFrames(total: number, want: number): number[] {
  if (want >= total) return Array.from({ length: total }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < want; i++) out.push(Math.floor((i + 0.5) * (total / want)));
  return out;
}

/** Build the sheet for a (packName, team, accent) triple. */
function buildSheetSync(pack: LoadedPack, team: "A" | "B", accent: string): LuizmeloSheet {
  const def = pack.def;

  const idle: HTMLCanvasElement[] = [];
  const walk: HTMLCanvasElement[][] = [];
  const attack: HTMLCanvasElement[][] = [];

  // Idle: pick frame 0 per facing (good readable pose)
  // Walk: 4 frames evenly distributed across the run strip
  // Attack: 3 frames evenly distributed across the attack strip
  const walkFrames = pickFrames(def.states.run.frames, 4);
  const attackFrames = pickFrames(def.states.attack.frames, 3);

  for (let fi = 0; fi < 4; fi++) {
    const flip = FACING_FLIP[fi];
    idle.push(bakeFrame(pack, pack.images.idle, 0, team, accent, flip));
    walk.push(walkFrames.map(f => bakeFrame(pack, pack.images.run, f, team, accent, flip)));
    attack.push(attackFrames.map(f => bakeFrame(pack, pack.images.attack, f, team, accent, flip)));
  }
  // Death: use last frame so the body is on the ground
  const death = bakeFrame(pack, pack.images.death, def.states.death.frames - 1, team, accent, false);

  return { ready: true, packName: def.name, idle, walk, attack, death };
}

/**
 * Synchronous sheet getter — returns the real sheet if the pack is loaded,
 * else returns a placeholder (the caller renders a fallback circle in that
 * case). Side-effect: kicks off async pack loading. On load completion the
 * placeholder is invalidated so the next call returns the real sheet.
 */
export function getLuizmeloSheet(def: CharacterDef, team: "A" | "B", arch: Archetype): LuizmeloSheet {
  const packName = packForArchetype(arch, def.size);
  const accent = def.color || "#7AA7E8";
  const key = `${packName}|${team}|${accent}`;
  const hit = sheetCache.get(key);
  if (hit && hit.ready) return hit;

  const loaded = loadedPacks.get(packName);
  if (loaded) {
    const sheet = buildSheetSync(loaded, team, accent);
    sheetCache.set(key, sheet);
    return sheet;
  }
  // Not yet — start loading (idempotent) and return placeholder.
  void loadPack(packName).then(() => {
    // Drop any placeholders for this pack so callers rebuild.
    for (const k of [...sheetCache.keys()]) {
      if (k.startsWith(`${packName}|`)) {
        const s = sheetCache.get(k);
        if (s && !s.ready) sheetCache.delete(k);
      }
    }
  }).catch(() => {/* renderer has fallback circle */});

  const ph = placeholderSheet(packName);
  sheetCache.set(key, ph);
  return ph;
}

/** Clear all caches — useful for hot-reload / hard refresh. */
export function clearLuizmeloCaches(): void {
  sheetCache.clear();
}

// Kick off background loading immediately on module import. This means
// by the time the user finishes the character-select / forging screens,
// the packs are typically ready before BattleCanvas mounts.
preloadAllLuizmeloPacks();
