// Dungeon Crawler — sprite loading + frame indexing.
//
// Two on-disk sources:
//   1. luizmelo/martial-hero — animated player (200px frames)
//   2. luizmelo/monsters-creatures-fantasy — enemies (150px frames)
//
// Plus tiny-dungeon individual 16x16 tile PNGs for the floor/wall
// dungeon tilemap. Each tile served as its own file means we can
// pick a known tile index without spritesheet offset math.

const LM = "/assets/luizmelo";
const TD = "/assets/kenney/tiny-dungeon/Tiles";

// ── Image cache ──────────────────────────────────────────────────────

const imgCache = new Map<string, HTMLImageElement>();
const imgFailed = new Set<string>();

export function getImage(url: string): HTMLImageElement | null {
  if (imgFailed.has(url)) return null;
  let img = imgCache.get(url);
  if (img) return img.complete && img.naturalWidth > 0 ? img : null;
  img = new Image();
  img.src = url;
  img.onerror = () => {
    imgFailed.add(url);
    if (typeof console !== "undefined") console.warn("[dungeon] sprite failed:", url);
  };
  imgCache.set(url, img);
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// ── Animation specs ──────────────────────────────────────────────────

interface AnimSheet { url: string; frames: number; frameW: number; frameH: number; fps: number; }

/** Player (martial-hero) — 200×200 frames; counts come from sheet
 *  widths inventoried in the v1.10.78 Survivor build:
 *    Idle: 1600x200 = 8 frames
 *    Run: 1600x200 = 8 frames
 *    Attack1: 1200x200 = 6 frames
 *    Take Hit: 800x200 = 4 frames
 *    Death: 1200x200 = 6 frames
 */
export const PLAYER_SHEETS: Record<"idle"|"run"|"attack"|"hurt"|"death", AnimSheet> = {
  idle:   { url: `${LM}/martial-hero/Sprites/Idle.png`,    frames: 8, frameW: 200, frameH: 200, fps: 8 },
  run:    { url: `${LM}/martial-hero/Sprites/Run.png`,     frames: 8, frameW: 200, frameH: 200, fps: 12 },
  attack: { url: `${LM}/martial-hero/Sprites/Attack1.png`, frames: 6, frameW: 200, frameH: 200, fps: 18 },
  hurt:   { url: `${LM}/martial-hero/Sprites/Take Hit.png`,frames: 4, frameW: 200, frameH: 200, fps: 12 },
  death:  { url: `${LM}/martial-hero/Sprites/Death.png`,   frames: 6, frameW: 200, frameH: 200, fps: 8 },
};

/** Enemies — all luizmelo monsters share 150×150 frames. */
type AnimKey = "idle" | "move" | "attack" | "hit" | "death";

const MONSTER_FOLDERS: Record<"goblin"|"skeleton"|"mushroom", string> = {
  goblin:   "Goblin",
  skeleton: "Skeleton",
  mushroom: "Mushroom",
};
const MONSTER_SHEETS: Record<"goblin"|"skeleton"|"mushroom", Partial<Record<AnimKey, AnimSheet>>> = {
  goblin: {
    idle:   { url: `${LM}/monsters-creatures-fantasy/Goblin/Idle.png`,     frames: 4, frameW: 150, frameH: 150, fps: 6 },
    move:   { url: `${LM}/monsters-creatures-fantasy/Goblin/Run.png`,      frames: 8, frameW: 150, frameH: 150, fps: 10 },
    attack: { url: `${LM}/monsters-creatures-fantasy/Goblin/Attack.png`,   frames: 8, frameW: 150, frameH: 150, fps: 12 },
    hit:    { url: `${LM}/monsters-creatures-fantasy/Goblin/Take Hit.png`, frames: 4, frameW: 150, frameH: 150, fps: 12 },
    death:  { url: `${LM}/monsters-creatures-fantasy/Goblin/Death.png`,    frames: 4, frameW: 150, frameH: 150, fps: 8 },
  },
  skeleton: {
    idle:   { url: `${LM}/monsters-creatures-fantasy/Skeleton/Idle.png`,     frames: 4, frameW: 150, frameH: 150, fps: 6 },
    move:   { url: `${LM}/monsters-creatures-fantasy/Skeleton/Walk.png`,    frames: 4, frameW: 150, frameH: 150, fps: 8 },
    attack: { url: `${LM}/monsters-creatures-fantasy/Skeleton/Attack.png`, frames: 8, frameW: 150, frameH: 150, fps: 12 },
    hit:    { url: `${LM}/monsters-creatures-fantasy/Skeleton/Take Hit.png`,frames: 4, frameW: 150, frameH: 150, fps: 12 },
    death:  { url: `${LM}/monsters-creatures-fantasy/Skeleton/Death.png`,   frames: 4, frameW: 150, frameH: 150, fps: 8 },
  },
  mushroom: {
    idle:   { url: `${LM}/monsters-creatures-fantasy/Mushroom/Idle.png`,     frames: 4, frameW: 150, frameH: 150, fps: 6 },
    move:   { url: `${LM}/monsters-creatures-fantasy/Mushroom/Run.png`,    frames: 8, frameW: 150, frameH: 150, fps: 10 },
    attack: { url: `${LM}/monsters-creatures-fantasy/Mushroom/Attack.png`, frames: 8, frameW: 150, frameH: 150, fps: 12 },
    hit:    { url: `${LM}/monsters-creatures-fantasy/Mushroom/Take Hit.png`,frames: 4, frameW: 150, frameH: 150, fps: 12 },
    death:  { url: `${LM}/monsters-creatures-fantasy/Mushroom/Death.png`,   frames: 4, frameW: 150, frameH: 150, fps: 8 },
  },
};

export function preloadDungeonSprites() {
  for (const s of Object.values(PLAYER_SHEETS)) getImage(s.url);
  for (const m of Object.values(MONSTER_SHEETS)) {
    for (const a of Object.values(m)) if (a) getImage(a.url);
  }
  // Tile sprites — the ~10 we actually use (see TILE_INDICES below).
  for (const idx of Object.values(TILE_INDICES)) getImage(tileUrl(idx));
}

// ── Tile indices (tiny-dungeon) ──────────────────────────────────────
//
// tiny-dungeon ships 132 16x16 tiles. The exact mapping of tile → kind
// isn't documented in the pack, but inspecting the sample TMX gives
// reliable picks for the few we need. These are educated guesses
// based on the dominant tile uses in the sample dungeon — easy to
// swap if a tile reads wrong on the device.

export const TILE_INDICES = {
  floor:        40,    // common floor square seen filling interior of rooms
  floorDetail:  41,
  wallTop:      1,
  wallSide:     14,
  wallCorner:   16,
  wallDark:     17,
  stairs:       30,
  torch:        66,    // candle/lamp prop
  chestClosed:  91,
  chestOpen:    92,
} as const;

export function tileUrl(idx: number): string {
  // Pad to 4 digits (e.g. tile_0040.png).
  const pad = idx.toString().padStart(4, "0");
  return `${TD}/tile_${pad}.png`;
}

// ── Frame index from time ────────────────────────────────────────────

export function frameIndex(animT: number, fps: number, frames: number, loop = true): number {
  const idx = Math.floor(animT * fps);
  return loop ? idx % frames : Math.min(idx, frames - 1);
}

// ── Draw helpers ─────────────────────────────────────────────────────

interface DrawOpts {
  /** Optional white-flash overlay alpha. */
  flash?: number;
  /** Optional facing (1 right, -1 left) — flips sprite. */
  facing?: 1 | -1;
  /** Multiplier on the sprite's drawn size. Default 1. */
  scale?: number;
  /** Center offset (px) used when the sprite has empty padding above/below. */
  cyOffset?: number;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  anim: keyof typeof PLAYER_SHEETS,
  animT: number,
  opts: DrawOpts = {},
): boolean {
  const sheet = PLAYER_SHEETS[anim];
  const img = getImage(sheet.url);
  if (!img) return false;
  const idx = frameIndex(animT, sheet.fps, sheet.frames, anim !== "death");
  const sx = idx * sheet.frameW;
  const drawScale = (opts.scale ?? 0.42);  // 200 * 0.42 = ~84 px on screen
  const dw = sheet.frameW * drawScale;
  const dh = sheet.frameH * drawScale;
  const dx = x - dw / 2;
  const dy = y - dh / 2 + (opts.cyOffset ?? -10); // martial-hero sprite has air below feet

  const facing = opts.facing ?? 1;
  ctx.save();
  if (facing === -1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(img, sx, 0, sheet.frameW, sheet.frameH, dx, dy, dw, dh);
  if (opts.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = opts.flash;
    ctx.drawImage(img, sx, 0, sheet.frameW, sheet.frameH, dx, dy, dw, dh);
  }
  ctx.restore();
  return true;
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  kind: "goblin"|"skeleton"|"mushroom",
  anim: AnimKey, animT: number,
  opts: DrawOpts = {},
): boolean {
  const sheet = MONSTER_SHEETS[kind][anim] ?? MONSTER_SHEETS[kind].idle;
  if (!sheet) return false;
  const img = getImage(sheet.url);
  if (!img) return false;
  const idx = frameIndex(animT, sheet.fps, sheet.frames, anim !== "death");
  const sx = idx * sheet.frameW;
  const drawScale = (opts.scale ?? 0.54);  // 150 * 0.54 = 81 px
  const dw = sheet.frameW * drawScale;
  const dh = sheet.frameH * drawScale;
  const dx = x - dw / 2;
  const dy = y - dh / 2 + (opts.cyOffset ?? -8);

  const facing = opts.facing ?? 1;
  ctx.save();
  if (facing === -1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(img, sx, 0, sheet.frameW, sheet.frameH, dx, dy, dw, dh);
  if (opts.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = opts.flash;
    ctx.drawImage(img, sx, 0, sheet.frameW, sheet.frameH, dx, dy, dw, dh);
  }
  ctx.restore();
  return true;
}

/** Tile draw — 16x16 source PNG, scaled to CELL (32) on screen. */
export function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, tileIdx: number, cellSize: number) {
  const img = getImage(tileUrl(tileIdx));
  if (!img) {
    // Fallback: solid color so the dungeon still reads even before
    // the tile images have loaded.
    ctx.fillStyle = "#2a1f1a";
    ctx.fillRect(x, y, cellSize, cellSize);
    return;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, cellSize, cellSize);
}

/** Grounded shadow drawn under a sprite. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.6, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}
