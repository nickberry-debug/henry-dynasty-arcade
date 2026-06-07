// Hardball — procedural pixel sprites painted to OffscreenCanvas at boot.
// Chunky two-tone retro silhouettes so the game has a coherent look without
// shipping a single binary asset. Phase 2 may swap to Kenney CC0 packs.

type Cv = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function make(w: number, h: number): { cv: Cv; ctx: Ctx } {
  // Prefer OffscreenCanvas where available, fallback to <canvas>.
  if (typeof OffscreenCanvas !== "undefined") {
    const cv = new OffscreenCanvas(w, h);
    return { cv, ctx: cv.getContext("2d") as OffscreenCanvasRenderingContext2D };
  }
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return { cv, ctx: cv.getContext("2d") as CanvasRenderingContext2D };
}

function px(ctx: Ctx, x: number, y: number, color: string, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}


// 24x32 batter sprite, side-view. Two-tone — body color + accent (jersey).
// frame: "idle" | "swing" | "follow" — different bat position.
export function batterSprite(bodyColor: string, accent: string, frame: "idle" | "swing" | "follow" = "idle"): Cv {
  const { cv, ctx } = make(24, 32);
  // helmet
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(8, 2, 8, 6);
  // face
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(9, 5, 6, 4);
  // jersey
  ctx.fillStyle = accent;
  ctx.fillRect(7, 9, 10, 8);
  // body shading
  ctx.fillStyle = bodyColor;
  ctx.fillRect(7, 17, 10, 7);
  // legs
  ctx.fillStyle = "#111827";
  ctx.fillRect(8, 24, 3, 7);
  ctx.fillRect(13, 24, 3, 7);
  // shoes
  ctx.fillStyle = "#374151";
  ctx.fillRect(7, 30, 5, 2);
  ctx.fillRect(13, 30, 5, 2);
  // bat
  ctx.fillStyle = "#d97706";
  if (frame === "idle") {
    // bat over shoulder
    for (let i = 0; i < 10; i++) ctx.fillRect(17 - i, 4 - Math.floor(i / 3), 2, 2);
  } else if (frame === "swing") {
    // bat horizontal forward
    for (let i = 0; i < 14; i++) ctx.fillRect(14 + i, 11, 2, 2);
  } else {
    // bat follow-through, downward right
    for (let i = 0; i < 12; i++) ctx.fillRect(15 + i, 14 + Math.floor(i / 3), 2, 2);
  }
  return cv;
}


// 20x28 pitcher sprite, top-down-ish. wind-up | release | follow.
export function pitcherSprite(accent: string, frame: "windup" | "release" | "follow" = "windup"): Cv {
  const { cv, ctx } = make(20, 28);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(6, 2, 8, 6);
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(7, 4, 6, 4);
  ctx.fillStyle = accent;
  ctx.fillRect(5, 9, 10, 8);
  ctx.fillStyle = "#374151";
  ctx.fillRect(5, 17, 10, 5);
  ctx.fillStyle = "#111827";
  ctx.fillRect(6, 22, 3, 6);
  ctx.fillRect(11, 22, 3, 6);
  // arm
  ctx.fillStyle = "#fde68a";
  if (frame === "windup") {
    for (let i = 0; i < 6; i++) ctx.fillRect(14, 8 - i, 2, 2);
  } else if (frame === "release") {
    for (let i = 0; i < 6; i++) ctx.fillRect(14 + i, 9, 2, 2);
  } else {
    for (let i = 0; i < 6; i++) ctx.fillRect(15 + Math.floor(i / 2), 12 + i, 2, 2);
  }
  return cv;
}

// 8x8 baseball sprite.
export function ballSprite(): Cv {
  const { cv, ctx } = make(8, 8);
  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(2, 1, 4, 6);
  ctx.fillRect(1, 2, 6, 4);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(2, 2, 1, 1);
  ctx.fillRect(5, 5, 1, 1);
  return cv;
}


// 20x24 fielder, top-down.
export function fielderSprite(accent: string): Cv {
  const { cv, ctx } = make(20, 24);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(6, 2, 8, 6);
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(7, 4, 6, 3);
  ctx.fillStyle = accent;
  ctx.fillRect(5, 8, 10, 7);
  ctx.fillStyle = "#374151";
  ctx.fillRect(6, 15, 3, 5);
  ctx.fillRect(11, 15, 3, 5);
  // glove
  ctx.fillStyle = "#92400e";
  ctx.fillRect(14, 11, 4, 4);
  return cv;
}

// Sprite cache by key — paint once, reuse.
const cache = new Map<string, Cv>();
export function get(key: string, builder: () => Cv): Cv {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = builder();
  cache.set(key, cv);
  return cv;
}

/** Convenience accessors used by the renderer. */
export const Sprites = {
  batter: (body: string, accent: string, frame: "idle" | "swing" | "follow") =>
    get(`b_${body}_${accent}_${frame}`, () => batterSprite(body, accent, frame)),
  pitcher: (accent: string, frame: "windup" | "release" | "follow") =>
    get(`p_${accent}_${frame}`, () => pitcherSprite(accent, frame)),
  ball: () => get(`ball`, () => ballSprite()),
  fielder: (accent: string) => get(`f_${accent}`, () => fielderSprite(accent)),
};
