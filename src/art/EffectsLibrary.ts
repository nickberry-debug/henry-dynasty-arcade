// EffectsLibrary — drop-in canvas effects for any game.
//
// Every effect is callable as `EffectsLibrary.beam(ctx, ...)` etc. and
// returns a handle the caller can update each frame. The library also
// owns a particle pool so games can fire-and-forget short-lived effects
// (rocket trails, explosions, muzzle flashes) without maintaining their
// own particle lists.
//
// Design notes:
// - Pure procedural canvas/Math — no asset loading required. Combines
//   well with existing kenney/particles textures when those are wanted.
// - All time/duration values in seconds. Caller drives the update loop.
// - Color values accept any CSS color string. Add alpha suffix where
//   transparency is needed.

type Ctx = CanvasRenderingContext2D;

// ── Particle pool ─────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ax?: number; ay?: number;
  life: number; ttl: number;
  size: number; sizeEnd?: number;
  color: string; colorEnd?: string;
  /** Render style — 'smoke' = soft circle, 'spark' = sharp dot,
   *  'ember' = glowing dot with trail, 'flame' = warm gradient blob. */
  kind: "smoke" | "spark" | "ember" | "flame" | "ring";
  rotation?: number; rotationSpeed?: number;
}

const particles: Particle[] = [];

function pushParticle(p: Particle) { particles.push(p); }

/** Step every particle. Call once per frame. */
export function stepParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.ttl) { particles.splice(i, 1); continue; }
    if (p.ax) p.vx += p.ax * dt;
    if (p.ay) p.vy += p.ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.rotation !== undefined && p.rotationSpeed) p.rotation += p.rotationSpeed * dt;
  }
}

/** Draw every active particle. */
export function drawParticles(ctx: Ctx): void {
  for (const p of particles) {
    const k = p.life / p.ttl;
    const size = p.sizeEnd !== undefined ? p.size + (p.sizeEnd - p.size) * k : p.size;
    const alpha = 1 - k;
    ctx.globalAlpha = alpha;
    if (p.kind === "smoke") {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grad.addColorStop(0, "rgba(150,150,150,0.55)");
      grad.addColorStop(1, "rgba(120,120,120,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === "spark") {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
    } else if (p.kind === "ember") {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      grad.addColorStop(0, p.color);
      grad.addColorStop(0.5, p.color + "88");
      grad.addColorStop(1, p.color + "00");
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - size * 2, p.y - size * 2, size * 4, size * 4);
    } else if (p.kind === "flame") {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grad.addColorStop(0, "#fef3c7");
      grad.addColorStop(0.3, "#fb923c");
      grad.addColorStop(0.7, "#dc2626" + "aa");
      grad.addColorStop(1, "#7f1d1d" + "00");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === "ring") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 3 * (1 - k));
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

export function clearParticles(): void { particles.length = 0; }

// ── Effects ────────────────────────────────────────────────────────────

/** Single-frame muzzle flash at (x,y) facing angle (radians). */
export function muzzleFlash(ctx: Ctx, x: number, y: number, angle: number, scale = 1, color = "#fde047"): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const r = 14 * scale;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  // Forward streak
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -3 * scale);
  ctx.lineTo(18 * scale, 0);
  ctx.lineTo(0, 3 * scale);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Spark burst — 4 short-lived sparks
  for (let i = 0; i < 4; i++) {
    const a = angle + (Math.random() - 0.5) * 0.6;
    const v = 200 + Math.random() * 200;
    pushParticle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0, ttl: 0.15, size: 2 * scale, color,
      kind: "spark",
    });
  }
}

/** Ion-cannon beam from (x1,y1) to (x2,y2). Single-frame render; the
 *  caller decides how long it stays on screen by repeating the call. */
export function ionBeam(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, opts?: { color?: string; width?: number; intensity?: number }): void {
  const color = opts?.color ?? "#67e8f9";
  const width = opts?.width ?? 6;
  const intensity = opts?.intensity ?? 1;
  // Outer halo
  ctx.strokeStyle = color + "44";
  ctx.lineWidth = width * 3 * intensity;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  // Mid layer
  ctx.strokeStyle = color + "aa";
  ctx.lineWidth = width * 1.5 * intensity;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  // White-hot core
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, width * 0.4 * intensity);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.lineCap = "butt";
  // Endpoint glow
  const r = width * 2.5 * intensity;
  const grad = ctx.createRadialGradient(x2, y2, 0, x2, y2, r);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.5, color + "aa");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x2 - r, y2 - r, r * 2, r * 2);
}

/** Laser bolt — a short-lived streak. Call once and stash if you want
 *  multi-frame; this is the cheap variant. */
export function laserBolt(ctx: Ctx, x: number, y: number, vx: number, vy: number, color = "#fde047"): void {
  const trail = 14;
  ctx.strokeStyle = color + "55";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - vx * trail * 0.001, y - vy * trail * 0.001);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - vx * trail * 0.0006, y - vy * trail * 0.0006);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = "butt";
}

/** Rocket — draws a missile silhouette pointing along (vx,vy) and
 *  spawns propulsion flame + smoke trail particles. Call each frame
 *  the rocket is alive. */
export function rocket(ctx: Ctx, x: number, y: number, vx: number, vy: number, opts?: { scale?: number; color?: string }): void {
  const scale = opts?.scale ?? 1;
  const color = opts?.color ?? "#a8a29e";
  const angle = Math.atan2(vy, vx);
  // Smoke trail spawns
  const back = { x: x - Math.cos(angle) * 14 * scale, y: y - Math.sin(angle) * 14 * scale };
  pushParticle({
    x: back.x, y: back.y,
    vx: -Math.cos(angle) * 30 + (Math.random() - 0.5) * 20,
    vy: -Math.sin(angle) * 30 + (Math.random() - 0.5) * 20 - 18,
    life: 0, ttl: 0.7 + Math.random() * 0.4,
    size: 4 * scale, sizeEnd: 12 * scale,
    color: "rgba(180,180,180,1)",
    kind: "smoke",
  });
  // Hot flame at the nozzle
  pushParticle({
    x: back.x, y: back.y,
    vx: -Math.cos(angle) * 60, vy: -Math.sin(angle) * 60,
    life: 0, ttl: 0.18,
    size: 6 * scale, sizeEnd: 2,
    color: "#fb923c",
    kind: "flame",
  });
  // Rocket body
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(10 * scale, 0);
  ctx.lineTo(0, -4 * scale);
  ctx.lineTo(-12 * scale, -4 * scale);
  ctx.lineTo(-14 * scale, 0);
  ctx.lineTo(-12 * scale, 4 * scale);
  ctx.lineTo(0, 4 * scale);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Fins
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -4 * scale);
  ctx.lineTo(-12 * scale, -8 * scale);
  ctx.lineTo(-12 * scale, -4 * scale);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8 * scale, 4 * scale);
  ctx.lineTo(-12 * scale, 8 * scale);
  ctx.lineTo(-12 * scale, 4 * scale);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Explosion — big multi-stage burst. Call once when the boom happens. */
export function explosion(ctx: Ctx, x: number, y: number, opts?: { scale?: number; color?: string }): void {
  const scale = opts?.scale ?? 1;
  const color = opts?.color ?? "#fb923c";
  // Inner white flash
  const r = 24 * scale;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Shockwave ring
  pushParticle({
    x, y, vx: 0, vy: 0,
    life: 0, ttl: 0.4,
    size: 8 * scale, sizeEnd: 60 * scale,
    color: "#fff",
    kind: "ring",
  });
  // Flame chunks
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const v = (80 + Math.random() * 100) * scale;
    pushParticle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      ay: 80,
      life: 0, ttl: 0.4 + Math.random() * 0.4,
      size: 4 * scale, sizeEnd: 10 * scale,
      color: i % 2 ? "#fb923c" : "#fde047",
      kind: "flame",
    });
  }
  // Smoke
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (40 + Math.random() * 60) * scale;
    pushParticle({
      x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 4,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
      life: 0, ttl: 0.9 + Math.random() * 0.5,
      size: 10 * scale, sizeEnd: 28 * scale,
      color: "rgba(140,140,140,1)",
      kind: "smoke",
    });
  }
  // Sparks
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (150 + Math.random() * 200) * scale;
    pushParticle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      ay: 200,
      life: 0, ttl: 0.3 + Math.random() * 0.2,
      size: 2 * scale,
      color: "#fde047",
      kind: "spark",
    });
  }
}

/** Energy shield — ring around (x,y) that flickers and ripples. Call
 *  every frame while active. `t` should be elapsed seconds. */
export function energyShield(ctx: Ctx, x: number, y: number, radius: number, t: number, color = "#67e8f9"): void {
  const wobble = Math.sin(t * 8) * 1.5;
  const r = radius + wobble;
  // Outer glow
  const grad = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.15);
  grad.addColorStop(0, color + "00");
  grad.addColorStop(0.7, color + "33");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
  // Ring with hex segments
  ctx.strokeStyle = color + "cc";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    const px = x + Math.cos(a + t) * r;
    const py = y + Math.sin(a + t) * r;
    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Impact-ready highlights
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 3; k++) {
    const a = (t * 1.3 + k * 2.1) % (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(x, y, r, a, a + 0.6);
    ctx.stroke();
  }
}

/** Magic burst — point-source spell ignition (gathering then radiating). */
export function magicBurst(ctx: Ctx, x: number, y: number, color = "#a78bfa"): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 30);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - 30, y - 30, 60, 60);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const v = 80 + Math.random() * 80;
    pushParticle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0, ttl: 0.5,
      size: 3, sizeEnd: 8,
      color,
      kind: "ember",
    });
  }
  pushParticle({ x, y, vx: 0, vy: 0, life: 0, ttl: 0.5, size: 8, sizeEnd: 50, color, kind: "ring" });
}

/** Impact spark — short burst at point of contact. */
export function impactSpark(ctx: Ctx, x: number, y: number, color = "#fde047"): void {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 100 + Math.random() * 150;
    pushParticle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      ay: 300,
      life: 0, ttl: 0.25,
      size: 2,
      color,
      kind: "spark",
    });
  }
  // Inner flash
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 10);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - 10, y - 10, 20, 20);
}

/** Smoke trail — call repeatedly to emit a single puff each call. */
export function smokeTrail(_ctx: Ctx, x: number, y: number, opts?: { drift?: number; ttl?: number; size?: number }): void {
  pushParticle({
    x, y, vx: (Math.random() - 0.5) * (opts?.drift ?? 20),
    vy: -10 - Math.random() * 12,
    life: 0, ttl: opts?.ttl ?? 0.6,
    size: opts?.size ?? 4, sizeEnd: (opts?.size ?? 4) * 3,
    color: "rgba(180,180,180,1)",
    kind: "smoke",
  });
}
