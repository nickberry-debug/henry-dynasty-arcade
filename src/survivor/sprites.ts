// Survivor — hand-drawn canvas sprites.
//
// Replaces the placeholder emoji glyphs with proper silhouettes drawn
// in pure canvas. One dispatch entrypoint: drawSprite(ctx, x, y, id,
// radius, tint, flash). Looks-up by spriteId; falls back to a circle if
// unknown. Heroes get a class-distinct figure (Spartan = shield+helmet,
// Mage = robed + staff, Huntress = bow stance, etc); enemies dispatch
// on archetype so a "tank" looks chunky and a "swarm" looks small.
//
// All drawing is relative to the entity's anchor (x, y) and scaled to
// the entity's radius — so as enemies grow or shrink, sprites scale
// proportionally. No bitmaps, no asset loading, no FOUC.

type Ctx = CanvasRenderingContext2D;

function shade(c: string, alpha: number): string {
  // Convert "#rrggbb" + alpha to rgba string. Tolerant of short hex.
  let r = 255, g = 255, b = 255;
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    }
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

interface SpriteOpts {
  radius: number;
  tint: string;
  flash?: number;
  /** Facing direction (-1 left, +1 right). Most sprites are symmetric so
   *  this only matters for heroes with weapons. */
  facing?: 1 | -1;
}

// ── Heroes ────────────────────────────────────────────────────────────

/** Generic hero body: rounded torso + arms + helmet. Each hero overlays
 *  a class-specific accent (shield, hat, etc.) over this base. */
function drawHeroBase(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  const r = o.radius;
  const accent = o.flash ? "#fff" : o.tint;
  const dark = "#1a1a1a";
  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = accent;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - r * 0.55, y - r * 0.2, r * 1.1, r * 1.1, 4);
  ctx.fill();
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.arc(x, y - r * 0.55, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#f5d0b0";
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.stroke();
  // Eyes
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(x - r * 0.16, y - r * 0.58, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.16, y - r * 0.58, r * 0.06, 0, Math.PI * 2); ctx.fill();
}

function drawSpartan(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  drawHeroBase(ctx, x, y, o);
  const r = o.radius;
  // Crested helmet
  ctx.fillStyle = o.tint;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.55, r * 0.5, Math.PI, 2 * Math.PI);
  ctx.fill(); ctx.stroke();
  // Plume
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.05);
  ctx.lineTo(x - r * 0.12, y - r * 1.3);
  ctx.lineTo(x + r * 0.12, y - r * 1.3);
  ctx.closePath();
  ctx.fill();
  // Shield
  ctx.fillStyle = "#fbbf24";
  ctx.strokeStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(x - r * 0.7, y + r * 0.15, r * 0.35, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y + r * 0.1);
  ctx.lineTo(x - r * 0.55, y + r * 0.2);
  ctx.lineTo(x - r * 0.7,  y + r * 0.4);
  ctx.closePath();
  ctx.fill();
}

function drawMage(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  drawHeroBase(ctx, x, y, o);
  const r = o.radius;
  // Wizard hat
  ctx.fillStyle = o.tint;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y - r * 0.8);
  ctx.lineTo(x + r * 0.45, y - r * 0.8);
  ctx.lineTo(x + r * 0.05, y - r * 1.35);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Hat band
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(x - r * 0.45, y - r * 0.85, r * 0.9, r * 0.12);
  // Staff
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.6, y - r * 0.6);
  ctx.lineTo(x + r * 0.85, y + r * 0.5);
  ctx.stroke();
  // Orb
  ctx.fillStyle = "#a78bfa";
  ctx.beginPath();
  ctx.arc(x + r * 0.6, y - r * 0.7, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + r * 0.55, y - r * 0.75, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawHuntress(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  drawHeroBase(ctx, x, y, o);
  const r = o.radius;
  // Hood
  ctx.fillStyle = "#15803d";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.55, r * 0.55, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill(); ctx.stroke();
  // Bow
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + r * 0.7, y, r * 0.55, Math.PI * 1.3, Math.PI * 0.7);
  ctx.stroke();
  // Bowstring
  ctx.strokeStyle = "#fef3c7";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.7, y - r * 0.42);
  ctx.lineTo(x + r * 0.7, y + r * 0.42);
  ctx.stroke();
}

function drawBerserker(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  drawHeroBase(ctx, x, y, o);
  const r = o.radius;
  // Horned helmet
  ctx.fillStyle = "#7f1d1d";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.55, r * 0.5, Math.PI, 2 * Math.PI);
  ctx.fill(); ctx.stroke();
  // Horns
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.85);
  ctx.quadraticCurveTo(x - r * 0.7, y - r * 1.1, x - r * 0.85, y - r * 0.9);
  ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.9, x - r * 0.5, y - r * 0.85);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y - r * 0.85);
  ctx.quadraticCurveTo(x + r * 0.7, y - r * 1.1, x + r * 0.85, y - r * 0.9);
  ctx.quadraticCurveTo(x + r * 0.6, y - r * 0.9, x + r * 0.5, y - r * 0.85);
  ctx.fill();
  // Axe
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.1);
  ctx.lineTo(x + r * 0.9, y + r * 0.55);
  ctx.stroke();
  // Axe blade
  ctx.fillStyle = "#9ca3af";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.42, y - r * 0.05);
  ctx.lineTo(x + r * 0.75, y - r * 0.05);
  ctx.lineTo(x + r * 0.55, y + r * 0.2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

function drawMonk(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  drawHeroBase(ctx, x, y, o);
  const r = o.radius;
  // Headband
  ctx.fillStyle = "#67e8f9";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - r * 0.42, y - r * 0.72, r * 0.84, r * 0.12);
  ctx.strokeRect(x - r * 0.42, y - r * 0.72, r * 0.84, r * 0.12);
  // Belt
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.18);
  // Wind wisp behind
  ctx.strokeStyle = shade(o.tint, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.95, y + r * 0.2);
  ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.4, x - r * 0.7, y + r * 0.5);
  ctx.stroke();
}

function drawPyrekit(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  const r = o.radius;
  const accent = o.flash ? "#fff" : o.tint;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fox body
  ctx.fillStyle = accent;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.2, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.arc(x - r * 0.55, y - r * 0.2, r * 0.45, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Ears
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.5);
  ctx.lineTo(x - r * 0.7,  y - r * 0.9);
  ctx.lineTo(x - r * 0.5,  y - r * 0.55);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y - r * 0.5);
  ctx.lineTo(x - r * 0.2, y - r * 0.9);
  ctx.lineTo(x - r * 0.1, y - r * 0.5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Tail with fire tip
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y + r * 0.05);
  ctx.quadraticCurveTo(x + r * 1.05, y - r * 0.5, x + r * 1.0, y - r * 1.0);
  ctx.lineWidth = r * 0.35;
  ctx.lineCap = "round";
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";
  // Fire tip
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(x + r * 1.0, y - r * 1.0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(x - r * 0.55, y - r * 0.2, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

// ── Enemies ───────────────────────────────────────────────────────────

function drawSwarm(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Small bug — round body, antennae.
  const r = o.radius;
  const color = o.flash ? "#fff" : o.tint;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Stripe
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.85);
  ctx.lineTo(x, y + r * 0.85);
  ctx.stroke();
  // Antennae
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y - r * 0.85);
  ctx.lineTo(x - r * 0.5, y - r * 1.2);
  ctx.moveTo(x + r * 0.3, y - r * 0.85);
  ctx.lineTo(x + r * 0.5, y - r * 1.2);
  ctx.stroke();
  // Tiny eyes
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill();
}

function drawFast(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Wolf-like silhouette.
  const r = o.radius;
  const color = o.flash ? "#fff" : o.tint;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.5;
  // Body
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.15, r * 1.0, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.arc(x + r * 0.7, y - r * 0.15, r * 0.4, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Ears
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y - r * 0.4);
  ctx.lineTo(x + r * 0.6, y - r * 0.75);
  ctx.lineTo(x + r * 0.7, y - r * 0.4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Glowing eye
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.arc(x + r * 0.78, y - r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
}

function drawTank(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Boar / brute — wide stocky body.
  const r = o.radius;
  const color = o.flash ? "#fff" : o.tint;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  // Body
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Tusks
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y + r * 0.45);
  ctx.lineTo(x - r * 0.75, y + r * 0.25);
  ctx.lineTo(x - r * 0.50, y + r * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.55, y + r * 0.45);
  ctx.lineTo(x + r * 0.75, y + r * 0.25);
  ctx.lineTo(x + r * 0.50, y + r * 0.30);
  ctx.closePath();
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.2, r * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.2, r * 0.10, 0, Math.PI * 2); ctx.fill();
}

function drawRanged(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Hooded caster shape.
  const r = o.radius;
  const color = o.flash ? "#fff" : o.tint;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  // Robe — trapezoid
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.6);
  ctx.lineTo(x + r * 0.4, y - r * 0.6);
  ctx.lineTo(x + r * 0.8, y + r * 0.85);
  ctx.lineTo(x - r * 0.8, y + r * 0.85);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Hood shadow
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.5, r * 0.45, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Glowing eyes inside hood
  ctx.fillStyle = "#67e8f9";
  ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.5, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.5, r * 0.07, 0, Math.PI * 2); ctx.fill();
}

function drawShooter(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Boxy robot.
  const r = o.radius;
  const color = o.flash ? "#fff" : o.tint;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  // Body
  ctx.beginPath();
  ctx.roundRect(x - r * 0.7, y - r * 0.5, r * 1.4, r * 1.3, 4);
  ctx.fill(); ctx.stroke();
  // Visor
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(x - r * 0.5, y - r * 0.3, r * 1.0, r * 0.3);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x - r * 0.4, y - r * 0.22, r * 0.8, r * 0.1);
  // Antenna
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.5);
  ctx.lineTo(x, y - r * 0.8);
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.85, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniboss(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Dragon-ish — big body, wings, glowing eyes.
  const r = o.radius;
  const color = o.flash ? "#fff" : o.tint;
  // Wings behind
  ctx.fillStyle = shade(color, 0.7);
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.3);
  ctx.lineTo(x - r * 1.4, y - r * 0.9);
  ctx.lineTo(x - r * 1.1, y - r * 0.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.3);
  ctx.lineTo(x + r * 1.4, y - r * 0.9);
  ctx.lineTo(x + r * 1.1, y - r * 0.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Body
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.85, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Horns
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.65);
  ctx.lineTo(x - r * 0.55, y - r * 1.05);
  ctx.lineTo(x - r * 0.25, y - r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.65);
  ctx.lineTo(x + r * 0.55, y - r * 1.05);
  ctx.lineTo(x + r * 0.25, y - r * 0.75);
  ctx.closePath();
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#fde047";
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.2, r * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.2, r * 0.10, 0, Math.PI * 2); ctx.fill();
}

function drawBoss(ctx: Ctx, x: number, y: number, o: SpriteOpts) {
  // Crowned final boss — bigger version of miniboss with a crown.
  drawMiniboss(ctx, x, y, o);
  const r = o.radius;
  // Crown
  ctx.fillStyle = "#fde047";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 1.05);
  ctx.lineTo(x - r * 0.35, y - r * 1.35);
  ctx.lineTo(x - r * 0.15, y - r * 1.10);
  ctx.lineTo(x,           y - r * 1.45);
  ctx.lineTo(x + r * 0.15, y - r * 1.10);
  ctx.lineTo(x + r * 0.35, y - r * 1.35);
  ctx.lineTo(x + r * 0.5,  y - r * 1.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

// ── Dispatch ──────────────────────────────────────────────────────────

const HERO_DRAWERS: Record<string, (c: Ctx, x: number, y: number, o: SpriteOpts) => void> = {
  spartan: drawSpartan,
  mage: drawMage,
  huntress: drawHuntress,
  berserker: drawBerserker,
  monk: drawMonk,
  pyrekit: drawPyrekit,
};

const ENEMY_DRAWERS: Record<string, (c: Ctx, x: number, y: number, o: SpriteOpts) => void> = {
  swarm: drawSwarm,
  fast: drawFast,
  tank: drawTank,
  ranged: drawRanged,
  shooter: drawShooter,
  miniboss: drawMiniboss,
  boss: drawBoss,
};

/** Main entry: render a sprite at (x, y) on the canvas. Returns true if
 *  a hand-drawn sprite was used; false if the caller should fall back to
 *  rendering the emoji glyph. */
export function drawSprite(
  ctx: Ctx,
  x: number,
  y: number,
  spriteId: string | undefined,
  opts: SpriteOpts,
): boolean {
  if (!spriteId) return false;
  const drawer = HERO_DRAWERS[spriteId] ?? ENEMY_DRAWERS[spriteId];
  if (!drawer) return false;
  drawer(ctx, x, y, opts);
  return true;
}
