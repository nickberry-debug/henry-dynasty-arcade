// components/SpriteFactory.ts — Runtime pixel-art sprite generator.
//
// Draws every dungeon sprite onto a small offscreen canvas at startup,
// caches by id, and returns ready-to-blit images. No PNG assets needed —
// keeps the build self-contained, and the look stays consistent across
// floors. Style: chunky 24x24 pixel-ish silhouettes, Minecraft-Dungeons
// palette (deep purples, ember oranges, slate greys).

export const TILE_SIZE = 24;

/** Off-screen pixel canvas. */
function newCanvas(size = TILE_SIZE): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  return c;
}

function ctxOf(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext("2d")!;
  x.imageSmoothingEnabled = false;
  return x;
}

/** Fill a rounded "pixel block" with a 1px lighter highlight and 1px darker shadow. */
function block(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, hi?: string, lo?: string) {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  if (hi) { c.fillStyle = hi; c.fillRect(x, y, w, 1); c.fillRect(x, y, 1, h); }
  if (lo) { c.fillStyle = lo; c.fillRect(x, y + h - 1, w, 1); c.fillRect(x + w - 1, y, 1, h); }
}

// ─── Tile sprites ─────────────────────────────────────────────────────────

function drawFloorTile(): HTMLCanvasElement {
  const c = newCanvas();
  const x = ctxOf(c);
  // Deep slate base.
  x.fillStyle = "#1f1d2e"; x.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Stone grid lines.
  x.strokeStyle = "#2a2740"; x.lineWidth = 1;
  x.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  // Random dot speckle deterministically per pixel position.
  for (let i = 0; i < 6; i++) {
    const px = (i * 47 + 11) % TILE_SIZE;
    const py = (i * 91 + 7) % TILE_SIZE;
    x.fillStyle = "#2c293f"; x.fillRect(px, py, 1, 1);
  }
  return c;
}

function drawWallTile(): HTMLCanvasElement {
  const c = newCanvas();
  const x = ctxOf(c);
  x.fillStyle = "#0d0c18"; x.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Brick pattern: 6-px rows, offset every other.
  x.fillStyle = "#1c1830";
  const rowH = 6;
  for (let row = 0; row < TILE_SIZE / rowH; row++) {
    const offset = row % 2 === 0 ? 0 : 6;
    for (let bx = 0; bx < TILE_SIZE; bx += 12) {
      x.fillRect(bx + offset, row * rowH + 1, 10, rowH - 1);
    }
  }
  // Mortar shine
  x.fillStyle = "#241f3d";
  x.fillRect(0, 0, TILE_SIZE, 1);
  return c;
}

function drawDoorTile(): HTMLCanvasElement {
  const c = drawFloorTile();
  const x = ctxOf(c);
  x.fillStyle = "#7c2d12"; x.fillRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
  x.fillStyle = "#fbbf24"; x.fillRect(TILE_SIZE - 8, TILE_SIZE / 2 - 1, 2, 2);
  return c;
}

function drawStairsDown(): HTMLCanvasElement {
  const c = drawFloorTile();
  const x = ctxOf(c);
  // Concentric receding bands ("descending into dark").
  const cx = TILE_SIZE / 2, cy = TILE_SIZE / 2;
  const colors = ["#3b3754", "#2a2740", "#1a1830", "#0d0c18"];
  for (let i = 0; i < 4; i++) {
    const sz = 18 - i * 4;
    x.fillStyle = colors[i]; x.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
  }
  // Arrow hint
  x.fillStyle = "#fde047";
  x.fillRect(cx - 1, cy - 4, 2, 6);
  x.fillRect(cx - 3, cy + 1, 6, 1);
  x.fillRect(cx - 2, cy + 2, 4, 1);
  return c;
}

function drawChest(): HTMLCanvasElement {
  const c = drawFloorTile();
  const x = ctxOf(c);
  block(x, 4, 8, 16, 12, "#92400e", "#b45309", "#451a03");
  block(x, 4, 8, 16, 3, "#fbbf24", "#fde047", "#92400e");
  x.fillStyle = "#fde047"; x.fillRect(11, 12, 2, 3);
  return c;
}

function drawShrine(): HTMLCanvasElement {
  const c = drawFloorTile();
  const x = ctxOf(c);
  // Pedestal
  block(x, 6, 14, 12, 6, "#475569", "#64748b", "#1e293b");
  // Glowing orb
  x.fillStyle = "#a78bfa"; x.beginPath(); x.arc(TILE_SIZE / 2, 10, 4, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#c4b5fd"; x.beginPath(); x.arc(TILE_SIZE / 2 - 1, 9, 1.5, 0, Math.PI * 2); x.fill();
  return c;
}

// ─── Character/enemy sprites ──────────────────────────────────────────────

/** Draw a generic humanoid sprite. */
function drawHumanoid(tint: string, accent: string, weapon?: string): HTMLCanvasElement {
  const c = newCanvas();
  const x = ctxOf(c);
  // Head
  block(x, 8, 3, 8, 6, "#fcd9b0", "#fed7aa", "#a16207");
  // Body
  block(x, 7, 9, 10, 9, tint, accent, "#1f2937");
  // Legs
  block(x, 8, 18, 3, 5, "#1f2937", "#374151", "#0f172a");
  block(x, 13, 18, 3, 5, "#1f2937", "#374151", "#0f172a");
  // Weapon (right hand)
  if (weapon === "sword") {
    block(x, 17, 6, 1, 10, "#94a3b8", "#cbd5e1", "#475569");
    block(x, 16, 14, 3, 2, "#92400e");
  } else if (weapon === "bow") {
    block(x, 18, 5, 1, 12, "#92400e", "#b45309", "#451a03");
    x.strokeStyle = "#fbbf24"; x.beginPath(); x.moveTo(18, 5); x.lineTo(18, 17); x.stroke();
  } else if (weapon === "staff") {
    block(x, 18, 3, 1, 14, "#451a03", "#92400e", "#1c1917");
    x.fillStyle = "#7c3aed"; x.beginPath(); x.arc(18, 3, 2, 0, Math.PI * 2); x.fill();
  }
  return c;
}

function drawWarrior(): HTMLCanvasElement { return drawHumanoid("#dc2626", "#ef4444", "sword"); }
function drawRanger(): HTMLCanvasElement { return drawHumanoid("#16a34a", "#4ade80", "bow"); }
function drawMage(): HTMLCanvasElement { return drawHumanoid("#7c3aed", "#a78bfa", "staff"); }

function drawCreature(bodyColor: string, accent: string, eyeColor = "#fde047"): HTMLCanvasElement {
  const c = newCanvas();
  const x = ctxOf(c);
  // Round body
  x.fillStyle = bodyColor; x.beginPath(); x.arc(12, 14, 8, 0, Math.PI * 2); x.fill();
  x.fillStyle = accent; x.beginPath(); x.arc(12, 11, 7, Math.PI, Math.PI * 2); x.fill();
  // Eyes
  x.fillStyle = "#0f172a"; x.fillRect(8, 12, 2, 2); x.fillRect(14, 12, 2, 2);
  x.fillStyle = eyeColor; x.fillRect(9, 13, 1, 1); x.fillRect(15, 13, 1, 1);
  // Feet/claws
  x.fillStyle = "#0f172a"; x.fillRect(7, 21, 2, 2); x.fillRect(15, 21, 2, 2);
  return c;
}

function drawRat() { return drawCreature("#6b7280", "#9ca3af", "#fbbf24"); }
function drawGoblin() { return drawCreature("#65a30d", "#84cc16", "#fef08a"); }
function drawSkeleton() {
  const c = newCanvas(); const x = ctxOf(c);
  // Skull
  block(x, 8, 3, 8, 7, "#f3f4f6", "#ffffff", "#9ca3af");
  x.fillStyle = "#0f172a"; x.fillRect(9, 6, 2, 2); x.fillRect(13, 6, 2, 2);
  // Ribcage
  block(x, 7, 10, 10, 8, "#e5e7eb", "#f3f4f6", "#9ca3af");
  x.fillStyle = "#9ca3af";
  x.fillRect(8, 12, 8, 1); x.fillRect(8, 14, 8, 1); x.fillRect(8, 16, 8, 1);
  // Legs
  block(x, 9, 18, 2, 5, "#f3f4f6"); block(x, 13, 18, 2, 5, "#f3f4f6");
  return c;
}
function drawOrc() { return drawHumanoid("#4d7c0f", "#65a30d", "sword"); }
function drawArcher() { return drawHumanoid("#65a30d", "#a3e635", "bow"); }
function drawShaman() { return drawHumanoid("#0e7490", "#06b6d4", "staff"); }
function drawTroll() {
  const c = newCanvas(); const x = ctxOf(c);
  block(x, 5, 3, 14, 9, "#65a30d", "#84cc16", "#365314"); // big head
  x.fillStyle = "#0f172a"; x.fillRect(8, 6, 2, 2); x.fillRect(14, 6, 2, 2);
  // tusks
  x.fillStyle = "#fef3c7"; x.fillRect(9, 9, 1, 2); x.fillRect(14, 9, 1, 2);
  block(x, 4, 12, 16, 8, "#4d7c0f", "#65a30d", "#1a2e05");
  block(x, 5, 20, 4, 3, "#1f2937"); block(x, 15, 20, 4, 3, "#1f2937");
  return c;
}
function drawSpider() {
  const c = newCanvas(); const x = ctxOf(c);
  x.fillStyle = "#1c1917"; x.beginPath(); x.arc(12, 13, 7, 0, Math.PI * 2); x.fill();
  // Legs
  x.strokeStyle = "#1c1917"; x.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const y = 10 + i * 2;
    x.beginPath(); x.moveTo(2, y); x.lineTo(12, 13); x.stroke();
    x.beginPath(); x.moveTo(22, y); x.lineTo(12, 13); x.stroke();
  }
  // Eyes
  x.fillStyle = "#dc2626"; x.fillRect(9, 11, 2, 2); x.fillRect(13, 11, 2, 2);
  return c;
}
function drawWraith() {
  const c = newCanvas(); const x = ctxOf(c);
  // Smoky body
  const grd = x.createLinearGradient(0, 0, 0, TILE_SIZE);
  grd.addColorStop(0, "#a78bfa"); grd.addColorStop(1, "#1e1b4b");
  x.fillStyle = grd;
  x.beginPath();
  x.moveTo(6, 4); x.lineTo(18, 4); x.lineTo(20, 20); x.lineTo(12, 22); x.lineTo(4, 20);
  x.closePath(); x.fill();
  // Glowing eyes
  x.fillStyle = "#fbbf24"; x.fillRect(9, 9, 2, 2); x.fillRect(13, 9, 2, 2);
  return c;
}
function drawKnight() { return drawHumanoid("#475569", "#94a3b8", "sword"); }
function drawBoss(): HTMLCanvasElement {
  const c = newCanvas(36); const x = ctxOf(c);
  // Big horned silhouette
  x.fillStyle = "#7c1d6f";
  x.beginPath(); x.moveTo(18, 2); x.lineTo(30, 12); x.lineTo(28, 32); x.lineTo(8, 32); x.lineTo(6, 12); x.closePath(); x.fill();
  // Horns
  x.fillStyle = "#1e1b4b";
  x.fillRect(8, 2, 2, 6); x.fillRect(26, 2, 2, 6);
  // Crown of bone
  x.fillStyle = "#fde047"; x.fillRect(12, 6, 12, 2);
  // Eyes
  x.fillStyle = "#fef08a"; x.fillRect(13, 14, 3, 3); x.fillRect(20, 14, 3, 3);
  // Mouth
  x.fillStyle = "#0f172a"; x.fillRect(13, 22, 10, 2);
  return c;
}

// ─── Drop / loot sprites ──────────────────────────────────────────────────

function drawGoldPile(): HTMLCanvasElement {
  const c = newCanvas(); const x = ctxOf(c);
  x.fillStyle = "#fbbf24"; x.beginPath(); x.arc(8, 18, 3, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(15, 18, 3, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(12, 14, 3, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#fde047";
  x.fillRect(7, 16, 1, 1); x.fillRect(14, 16, 1, 1); x.fillRect(11, 12, 1, 1);
  return c;
}

function drawItemDrop(): HTMLCanvasElement {
  const c = newCanvas(); const x = ctxOf(c);
  // Glowing box
  x.fillStyle = "#7c3aed"; x.fillRect(7, 10, 10, 10);
  x.fillStyle = "#c4b5fd"; x.fillRect(7, 10, 10, 2);
  x.fillStyle = "#fde047"; x.fillRect(11, 13, 2, 4);
  return c;
}

// ─── Registry ─────────────────────────────────────────────────────────────

const CACHE: Record<string, HTMLCanvasElement> = {};

export type SpriteId =
  | "floor" | "wall" | "door" | "stairsDown" | "stairsUp" | "chest" | "shrine"
  | "warrior" | "ranger" | "mage"
  | "rat" | "goblin" | "skeleton" | "orc" | "archer" | "shaman"
  | "troll" | "spider" | "wraith" | "knight" | "boss"
  | "gold" | "item";

const BUILDERS: Record<SpriteId, () => HTMLCanvasElement> = {
  floor: drawFloorTile,
  wall: drawWallTile,
  door: drawDoorTile,
  stairsDown: drawStairsDown,
  stairsUp: drawStairsDown,
  chest: drawChest,
  shrine: drawShrine,
  warrior: drawWarrior,
  ranger: drawRanger,
  mage: drawMage,
  rat: drawRat,
  goblin: drawGoblin,
  skeleton: drawSkeleton,
  orc: drawOrc,
  archer: drawArcher,
  shaman: drawShaman,
  troll: drawTroll,
  spider: drawSpider,
  wraith: drawWraith,
  knight: drawKnight,
  boss: drawBoss,
  gold: drawGoldPile,
  item: drawItemDrop,
};

export function getSprite(id: SpriteId): HTMLCanvasElement {
  if (!CACHE[id]) CACHE[id] = BUILDERS[id]();
  return CACHE[id];
}

/** Eagerly warm the cache so the first paint doesn't stutter. */
export function warmSprites() {
  for (const id of Object.keys(BUILDERS) as SpriteId[]) getSprite(id);
}
