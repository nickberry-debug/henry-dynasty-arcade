// src/combat-sports/boxing/sprites.ts
//
// Side-view 2D sprite loader for Boxing. Pulls luizmelo's Martial Hero
// PNG strips from /public/assets/luizmelo/martial-hero/Sprites/ (already
// on disk for Battle Forge) and tints them per corner. See
// COMBATSPORTS_PROGRESS.md ⚠️ note about why we're reusing Martial Hero
// instead of a true boxing pack.

export type BoxerStateId =
  | "idle" | "move" | "jab" | "power"
  | "hit" | "block" | "dodge" | "knockdown" | "ko";

interface StateDef {
  url: string;
  frames: number;
  fps: number;
}

const STATES: Record<BoxerStateId, StateDef> = {
  idle:      { url: "/assets/luizmelo/martial-hero/Sprites/Idle.png",     frames: 8, fps: 8  },
  move:      { url: "/assets/luizmelo/martial-hero/Sprites/Run.png",      frames: 8, fps: 10 },
  jab:       { url: "/assets/luizmelo/martial-hero/Sprites/Attack1.png",  frames: 6, fps: 14 },
  power:     { url: "/assets/luizmelo/martial-hero/Sprites/Attack2.png",  frames: 6, fps: 12 },
  hit:       { url: "/assets/luizmelo/martial-hero/Sprites/Take Hit.png", frames: 4, fps: 12 },
  block:     { url: "/assets/luizmelo/martial-hero/Sprites/Idle.png",     frames: 8, fps: 8  },
  dodge:     { url: "/assets/luizmelo/martial-hero/Sprites/Jump.png",     frames: 2, fps: 6  },
  knockdown: { url: "/assets/luizmelo/martial-hero/Sprites/Fall.png",     frames: 2, fps: 4  },
  ko:        { url: "/assets/luizmelo/martial-hero/Sprites/Death.png",    frames: 6, fps: 6  },
};

export const FRAME_W = 200;
export const FRAME_H = 200;
export const DEST_W = 160;
export const DEST_H = 160;

const FIT = DEST_H / FRAME_H;

const imgCache = new Map<string, HTMLImageElement>();
const imgPromises = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  if (imgCache.has(url)) return Promise.resolve(imgCache.get(url)!);
  const cached = imgPromises.get(url);
  if (cached) return cached;
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imgCache.set(url, img); resolve(img); };
    img.onerror = () => reject(new Error(`failed: ${url}`));
    img.src = url;
  });
  imgPromises.set(url, p);
  return p;
}

export interface BoxerSheet {
  ready: boolean;
  frames: Record<BoxerStateId, HTMLCanvasElement[]>;
  states: Record<BoxerStateId, StateDef>;
}

export function getStateDef(id: BoxerStateId): StateDef {
  return STATES[id];
}

function makeCanvas(w = DEST_W, h = DEST_H): HTMLCanvasElement {
  const c = (typeof document !== "undefined")
    ? document.createElement("canvas")
    : ({ width: w, height: h, getContext: () => null } as unknown as HTMLCanvasElement);
  c.width = w;
  c.height = h;
  return c;
}

function bakeFrame(img: HTMLImageElement, frameIdx: number, tint: string, flip: boolean): HTMLCanvasElement {
  const out = makeCanvas();
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.imageSmoothingEnabled = false;

  const srcX = frameIdx * FRAME_W;
  const drawW = FRAME_W * FIT;
  const drawH = FRAME_H * FIT;
  const destX = (DEST_W - drawW) / 2;
  const destY = (DEST_H - drawH) / 2;

  ctx.save();
  if (flip) {
    ctx.translate(DEST_W, 0);
    ctx.scale(-1, 1);
  }
  try {
    ctx.drawImage(img, srcX, 0, FRAME_W, FRAME_H, destX, destY, drawW, drawH);
  } catch {
    /* image not ready / cross-origin — caller draws fallback */
  }
  ctx.restore();

  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(0, 0, DEST_W, DEST_H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  return out;
}

function placeholderSheet(): BoxerSheet {
  const blank = makeCanvas();
  const frames = {} as Record<BoxerStateId, HTMLCanvasElement[]>;
  (Object.keys(STATES) as BoxerStateId[]).forEach((s) => {
    frames[s] = Array.from({ length: STATES[s].frames }, () => blank);
  });
  return { ready: false, frames, states: STATES };
}

const sheetCache = new Map<string, BoxerSheet>();
let imagesLoaded = false;
const loadCallbacks: Array<() => void> = [];

export function preloadBoxingSprites(): void {
  if (typeof window === "undefined") return;
  if (imagesLoaded) return;
  const allUrls = Array.from(new Set(Object.values(STATES).map(s => s.url)));
  Promise.all(allUrls.map(u => loadImage(u))).then(() => {
    imagesLoaded = true;
    sheetCache.clear();
    loadCallbacks.splice(0).forEach(cb => cb());
  }).catch(() => { /* renderer has fallback */ });
}

export function onBoxingSpritesReady(cb: () => void): void {
  if (imagesLoaded) cb();
  else loadCallbacks.push(cb);
}

export function getBoxerSheet(corner: "red" | "blue", tint: string): BoxerSheet {
  const key = `${corner}|${tint}`;
  const hit = sheetCache.get(key);
  if (hit && hit.ready) return hit;
  if (!imagesLoaded) { preloadBoxingSprites(); return placeholderSheet(); }

  const flip = corner === "blue";
  const frames = {} as Record<BoxerStateId, HTMLCanvasElement[]>;
  (Object.keys(STATES) as BoxerStateId[]).forEach((s) => {
    const def = STATES[s];
    const img = imgCache.get(def.url);
    if (!img) {
      frames[s] = Array.from({ length: def.frames }, () => makeCanvas());
      return;
    }
    frames[s] = Array.from({ length: def.frames }, (_, i) => bakeFrame(img, i, tint, flip));
  });
  const sheet: BoxerSheet = { ready: true, frames, states: STATES };
  sheetCache.set(key, sheet);
  return sheet;
}

preloadBoxingSprites();
