// Survivor — arena backdrop rendering.
//
// Replaces the placeholder dotted grid with a proper biome-specific
// scene. Each biome paints its own ground (gradient + tile pattern +
// vignette) plus a sparse layer of decals (grass tufts, ember motes,
// stars, cracked tiles).
//
// Decals are generated once per biome onto an offscreen tile (1024x1024)
// using a seeded RNG. The tile is then drawn repeated and scrolled by
// the camera. This keeps the GPU work flat and avoids re-rolling decals
// every frame (which would shimmer).

type Ctx = CanvasRenderingContext2D;

const TILE = 1024;

interface Cached {
  biomeId: string;
  canvas: HTMLCanvasElement;
}

let cache: Cached | null = null;

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function paintMeadow(c: Ctx, rand: () => number) {
  // Base — soft green wash
  c.fillStyle = "#0e3d23";
  c.fillRect(0, 0, TILE, TILE);
  // Mottle with darker patches
  for (let i = 0; i < 60; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    const r = 40 + rand() * 80;
    const grad = c.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(34,197,94,0.18)");
    grad.addColorStop(1, "rgba(34,197,94,0)");
    c.fillStyle = grad;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Grass tufts
  for (let i = 0; i < 240; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    const h = 4 + rand() * 7;
    c.strokeStyle = rand() > 0.5 ? "#22c55e" : "#65a30d";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y - h);
    c.moveTo(x, y);
    c.lineTo(x, y - h - 1);
    c.moveTo(x, y);
    c.lineTo(x + 2, y - h);
    c.stroke();
  }
  // Tiny flowers
  for (let i = 0; i < 30; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    c.fillStyle = ["#fde047", "#f9a8d4", "#fbbf24"][Math.floor(rand() * 3)];
    c.beginPath();
    c.arc(x, y, 1.8, 0, Math.PI * 2);
    c.fill();
  }
}

function paintAshlands(c: Ctx, rand: () => number) {
  c.fillStyle = "#1a0606";
  c.fillRect(0, 0, TILE, TILE);
  // Cracked terra-cotta plates
  for (let i = 0; i < 80; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    const r = 14 + rand() * 30;
    c.fillStyle = `rgba(124,45,18,${0.25 + rand() * 0.35})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(20,5,5,0.5)";
    c.lineWidth = 1;
    c.stroke();
  }
  // Cracks
  for (let i = 0; i < 30; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    c.strokeStyle = "rgba(0,0,0,0.5)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y);
    let cx = x, cy = y;
    for (let j = 0; j < 4; j++) {
      cx += (rand() - 0.5) * 20;
      cy += (rand() - 0.5) * 20;
      c.lineTo(cx, cy);
    }
    c.stroke();
  }
  // Glowing ember dots
  for (let i = 0; i < 50; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    c.fillStyle = "rgba(251,146,60,0.9)";
    c.beginPath();
    c.arc(x, y, 1.4, 0, Math.PI * 2);
    c.fill();
  }
}

function paintStarfield(c: Ctx, rand: () => number) {
  c.fillStyle = "#080626";
  c.fillRect(0, 0, TILE, TILE);
  // Nebula glow patches
  for (let i = 0; i < 14; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    const r = 80 + rand() * 140;
    const grad = c.createRadialGradient(x, y, 0, x, y, r);
    const hue = ["167,139,250", "94,234,212", "236,72,153"][Math.floor(rand() * 3)];
    grad.addColorStop(0, `rgba(${hue},0.18)`);
    grad.addColorStop(1, `rgba(${hue},0)`);
    c.fillStyle = grad;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Stars
  for (let i = 0; i < 400; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    const size = rand() * rand() * 1.8 + 0.4;
    c.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`;
    c.beginPath();
    c.arc(x, y, size, 0, Math.PI * 2);
    c.fill();
  }
  // A few bright twinkles with cross-flare
  for (let i = 0; i < 10; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(x - 4, y); c.lineTo(x + 4, y);
    c.moveTo(x, y - 4); c.lineTo(x, y + 4);
    c.stroke();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x, y, 1.2, 0, Math.PI * 2);
    c.fill();
  }
}

function paintRuins(c: Ctx, rand: () => number) {
  c.fillStyle = "#15120f";
  c.fillRect(0, 0, TILE, TILE);
  // Tile grid — stone slabs
  const cell = 64;
  for (let gx = 0; gx < TILE; gx += cell) {
    for (let gy = 0; gy < TILE; gy += cell) {
      const shade = 30 + Math.floor(rand() * 20);
      c.fillStyle = `rgb(${shade},${shade},${shade - 6})`;
      c.fillRect(gx + 1, gy + 1, cell - 2, cell - 2);
      // crack
      if (rand() > 0.65) {
        c.strokeStyle = "rgba(0,0,0,0.6)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(gx + rand() * cell, gy);
        c.lineTo(gx + rand() * cell, gy + cell);
        c.stroke();
      }
    }
  }
  // Moss patches
  for (let i = 0; i < 60; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    c.fillStyle = `rgba(74,222,128,${0.05 + rand() * 0.12})`;
    c.beginPath();
    c.arc(x, y, 6 + rand() * 12, 0, Math.PI * 2);
    c.fill();
  }
  // Dust motes
  for (let i = 0; i < 80; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    c.fillStyle = "rgba(253,224,71,0.5)";
    c.beginPath();
    c.arc(x, y, 0.9, 0, Math.PI * 2);
    c.fill();
  }
}

function buildTile(biomeId: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE; canvas.height = TILE;
  const c = canvas.getContext("2d")!;
  const seed = (() => {
    let h = 5381;
    for (let i = 0; i < biomeId.length; i++) h = ((h << 5) + h) ^ biomeId.charCodeAt(i);
    return h | 0;
  })();
  const rand = rng(seed);
  if (biomeId === "meadow")      paintMeadow(c, rand);
  else if (biomeId === "ashlands") paintAshlands(c, rand);
  else if (biomeId === "starfield") paintStarfield(c, rand);
  else                            paintRuins(c, rand);
  return canvas;
}

/** Draw the biome backdrop tiled + offset by the camera. */
export function drawArenaBackdrop(
  ctx: Ctx,
  vw: number, vh: number,
  camX: number, camY: number,
  biomeId: string,
) {
  if (!cache || cache.biomeId !== biomeId) {
    cache = { biomeId, canvas: buildTile(biomeId) };
  }
  const tile = cache.canvas;
  // Offset within tile based on camera position
  const ox = ((camX % TILE) + TILE) % TILE;
  const oy = ((camY % TILE) + TILE) % TILE;
  // Draw 2x2 tile cluster covering viewport
  for (let dy = -1; dy <= Math.ceil(vh / TILE); dy++) {
    for (let dx = -1; dx <= Math.ceil(vw / TILE); dx++) {
      ctx.drawImage(tile, dx * TILE - ox, dy * TILE - oy);
    }
  }
  // Vignette — radial darkening from center
  const grad = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);
}

/** Glowing XP gem — replaces the 💎 emoji. Pulses based on `t`. */
export function drawGem(ctx: Ctx, x: number, y: number, t: number, value: number = 1) {
  const pulse = 0.85 + 0.15 * Math.sin(t * 6);
  const r = 7 * pulse;
  const color = value >= 5 ? "#a78bfa" : value >= 2 ? "#67e8f9" : "#86efac";
  // Glow halo
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  grad.addColorStop(0, color + "cc");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  // Diamond
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.85, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.85, y);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y - r * 0.3);
  ctx.lineTo(x + r * 0.1, y - r * 0.55);
  ctx.lineTo(x - r * 0.05, y - r * 0.05);
  ctx.closePath();
  ctx.fill();
}

/** Pickup chip — heal/bomb/magnet shown as a glowing icon plate. */
export function drawPickup(ctx: Ctx, x: number, y: number, kind: "heal" | "bomb" | "magnet" | string, t: number) {
  const bob = Math.sin(t * 4) * 1.5;
  const cx = x, cy = y + bob;
  const color =
    kind === "heal" ? "#86efac" :
    kind === "bomb" ? "#fb923c" :
    kind === "magnet" ? "#fde047" : "#67e8f9";
  // Glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
  grad.addColorStop(0, color + "aa");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - 22, cy - 22, 44, 44);
  // Plate
  ctx.fillStyle = "rgba(10,10,14,0.85)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx - 10, cy - 10, 20, 20, 4);
  ctx.fill(); ctx.stroke();
  // Symbol
  ctx.fillStyle = color;
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const sym = kind === "heal" ? "+" : kind === "bomb" ? "✦" : kind === "magnet" ? "▲" : "•";
  ctx.fillText(sym, cx, cy + 1);
}
