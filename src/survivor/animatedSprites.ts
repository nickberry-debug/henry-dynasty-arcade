// Survivor — animated monster sprite renderer.
//
// Wires luizmelo's monsters-creatures-fantasy spritesheets in place
// of the previous procedural canvas silhouettes for enemies. All
// sheets ship at 150-px-tall frames laid out horizontally:
//   Idle:     600x150  (4 frames)
//   Run/Walk/Flight: 1200x150 (8 frames)
//   Attack:   1200x150 (8 frames)
//   Take Hit: 600x150  (4 frames)
//   Death:    600x150  (4 frames)
//
// We render Run/Walk/Flight by default (enemies are always chasing
// the player). When the engine flashes the enemy (damage tick), we
// swap in the Take Hit frame instead — gives a satisfying recoil pulse.
//
// Facing: most sheets face right at base. We flip horizontally when
// the enemy is heading left (toward a player on the left).
//
// Tinting: when archetype needs differentiation (miniboss / boss
// reuse the same monster scaled up), we apply a color overlay using
// an off-screen canvas with source-atop blending — cached per
// (monster, anim, tint) key to keep the render loop cheap.

const ROOT = "/assets/luizmelo/monsters-creatures-fantasy";

const FRAME_PX = 150;
const FRAME_FPS = 10; // matches the 10fps cadence the sheets were drawn at

/** Per-monster animation file map + frame counts. */
type AnimKey = "idle" | "move" | "attack" | "hit" | "death";
interface MonsterDef {
  folder: string;
  /** Filename under the monster folder (with .png). */
  files: Partial<Record<AnimKey, { file: string; frames: number }>>;
}

const MONSTERS: Record<string, MonsterDef> = {
  goblin: {
    folder: "Goblin",
    files: {
      idle:   { file: "Idle.png",     frames: 4 },
      move:   { file: "Run.png",      frames: 8 },
      attack: { file: "Attack.png",   frames: 8 },
      hit:    { file: "Take Hit.png", frames: 4 },
      death:  { file: "Death.png",    frames: 4 },
    },
  },
  skeleton: {
    folder: "Skeleton",
    files: {
      idle:   { file: "Idle.png",     frames: 4 },
      // Skeleton ships Walk at 600x150 (4 frames), unlike the other
      // packs which ship Run at 1200x150 (8 frames).
      move:   { file: "Walk.png",     frames: 4 },
      attack: { file: "Attack.png",   frames: 8 },
      hit:    { file: "Take Hit.png", frames: 4 },
      death:  { file: "Death.png",    frames: 4 },
    },
  },
  mushroom: {
    folder: "Mushroom",
    files: {
      idle:   { file: "Idle.png",     frames: 4 },
      move:   { file: "Run.png",      frames: 8 },
      attack: { file: "Attack.png",   frames: 8 },
      hit:    { file: "Take Hit.png", frames: 4 },
      death:  { file: "Death.png",    frames: 4 },
    },
  },
  flying_eye: {
    folder: "Flying eye",
    files: {
      // Flying eye doesn't ship Idle — Flight serves both purposes.
      idle:   { file: "Flight.png",   frames: 8 },
      move:   { file: "Flight.png",   frames: 8 },
      attack: { file: "Attack.png",   frames: 8 },
      hit:    { file: "Take Hit.png", frames: 4 },
      death:  { file: "Death.png",    frames: 4 },
    },
  },
};

// ── Image cache ───────────────────────────────────────────────────────
//
// Images preload lazily on first use; all subsequent renders hit the
// cache. Failures get a one-line console warn + a fallback flag so we
// never throw inside the render loop.

const imgCache = new Map<string, HTMLImageElement>();
const imgFailed = new Set<string>();

function getImage(url: string): HTMLImageElement | null {
  if (imgFailed.has(url)) return null;
  let img = imgCache.get(url);
  if (img) return img.complete && img.naturalWidth > 0 ? img : null;
  img = new Image();
  img.src = url;
  img.onerror = () => {
    imgFailed.add(url);
    console.warn("[survivor] sprite failed to load:", url);
  };
  imgCache.set(url, img);
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Preload all monster sheets — call once on first render so the player
 *  doesn't see a blink as new enemy types spawn. */
export function preloadMonsterSprites(): void {
  for (const m of Object.values(MONSTERS)) {
    for (const a of Object.values(m.files)) {
      if (!a) continue;
      getImage(`${ROOT}/${encodeURI(m.folder)}/${a.file}`);
    }
  }
}

// ── Tint cache ────────────────────────────────────────────────────────
//
// Tinted variants are baked into off-screen canvases once per
// (monster, anim, tint). Cache key: `${monster}|${anim}|${tint}`.
// Without this the source-atop blend would run every draw call.

const tintCache = new Map<string, HTMLCanvasElement>();

function getTintedSheet(monster: string, anim: AnimKey, tint: string): HTMLCanvasElement | null {
  const def = MONSTERS[monster];
  if (!def) return null;
  const a = def.files[anim];
  if (!a) return null;
  const url = `${ROOT}/${encodeURI(def.folder)}/${a.file}`;
  const src = getImage(url);
  if (!src) return null;
  const key = `${monster}|${anim}|${tint}`;
  let canvas = tintCache.get(key);
  if (canvas && canvas.width === src.naturalWidth) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = src.naturalWidth;
  canvas.height = src.naturalHeight;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = tint;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.globalCompositeOperation = "source-over";
  tintCache.set(key, canvas);
  return canvas;
}

// ── Draw API ──────────────────────────────────────────────────────────

export interface AnimSpriteOpts {
  /** Entity collision radius — sprite is drawn at ~3.5x this. */
  radius: number;
  /** Damage flash 0..1 — if >0 we render the Take Hit frame + white wash. */
  flash?: number;
  /** Facing direction: 1 = right, -1 = left. Default 1. */
  facing?: 1 | -1;
  /** Optional color tint applied via source-atop. */
  tint?: string;
  /** Sprite-pixel scale on top of the radius math — used by minibosses
   *  and bosses to look chunky. */
  scale?: number;
  /** Override the animation state. Defaults to "move". */
  anim?: AnimKey;
}

/** Grounded shadow under the sprite — gives the enemy weight on the
 *  ground plane. Flying enemies get a softer, smaller shadow set lower
 *  on the screen to imply altitude. */
export function drawGroundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flying = false) {
  ctx.fillStyle = flying ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.45)";
  ctx.beginPath();
  const rx = flying ? r * 0.55 : r * 0.85;
  const ry = flying ? r * 0.12 : r * 0.22;
  const cy = flying ? y + r * 1.25 : y + r * 0.85;
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Render an animated monster sprite at (x, y). Returns true on success. */
export function drawAnimatedMonster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  monster: string,
  opts: AnimSpriteOpts,
): boolean {
  const def = MONSTERS[monster];
  if (!def) return false;

  // Flash takes priority — show the recoil frame.
  const flash = (opts.flash ?? 0) > 0;
  const animKey: AnimKey = flash ? "hit" : (opts.anim ?? "move");
  const a = def.files[animKey] ?? def.files.move ?? def.files.idle;
  if (!a) return false;

  const url = `${ROOT}/${encodeURI(def.folder)}/${a.file}`;
  const src = opts.tint
    ? getTintedSheet(monster, animKey, opts.tint)
    : getImage(url);
  if (!src) return false;

  // Frame from clock.
  const t = Date.now() / 1000;
  const frame = Math.floor(t * FRAME_FPS) % a.frames;
  const sx = frame * FRAME_PX;

  // Destination size — sprite occupies ~3.5x radius for nice visual
  // weight (the 150px frame includes plenty of empty space around the
  // character art). Scale knob lets bosses look chunkier.
  const scale = opts.scale ?? 1;
  const dh = opts.radius * 3.6 * scale;
  const dw = dh; // square frames
  const dx = x - dw / 2;
  // Drop the sprite so its FEET land at the entity center — gives the
  // shadow a place to live underneath.
  const dy = y - dh * 0.62;

  const facing = opts.facing ?? 1;
  ctx.save();
  if (facing === -1) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }
  // Slight white flash overlay on damage. Drawn underneath via globalAlpha
  // so the sprite reads "lit up" rather than overdrawn.
  if (flash) ctx.globalAlpha = 0.95;
  ctx.drawImage(src, sx, 0, FRAME_PX, FRAME_PX, dx, dy, dw, dh);
  ctx.globalAlpha = 1;
  ctx.restore();

  // White damage wash — multiplies the silhouette briefly.
  if (flash) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.4;
    ctx.drawImage(src, sx, 0, FRAME_PX, FRAME_PX, dx, dy, dw, dh);
    ctx.restore();
  }

  return true;
}

/** Map Survivor's 7 archetype ids to (monster, scale, tint, flying) tuples. */
export const ARCHETYPE_MAP: Record<string, { monster: string; scale: number; tint?: string; flying?: boolean }> = {
  swarm:    { monster: "goblin",      scale: 0.85 },
  fast:     { monster: "flying_eye",  scale: 1.0,  flying: true },
  tank:     { monster: "mushroom",    scale: 1.15 },
  ranged:   { monster: "skeleton",    scale: 1.0 },
  // Shooter reuses goblin recolored darker so it reads as "ranged
  // attacker" without needing a 5th monster pack.
  shooter:  { monster: "goblin",      scale: 1.0,  tint: "rgba(80,40,140,0.45)" },
  // Miniboss: chunky mushroom with a red wash.
  miniboss: { monster: "mushroom",    scale: 1.45, tint: "rgba(200,40,40,0.45)" },
  // Boss: scaled-up skeleton with a deep crimson wash.
  boss:     { monster: "skeleton",    scale: 1.7,  tint: "rgba(200,20,40,0.55)" },
};
