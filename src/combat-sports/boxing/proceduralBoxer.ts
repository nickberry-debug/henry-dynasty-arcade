// src/combat-sports/boxing/proceduralBoxer.ts
//
// Honest placeholder art: procedural canvas drawings of stylized boxers.
// REPLACES the luizmelo Martial Hero samurai-silhouette sprites that
// shipped with the standalone /boxing build (Nick called the samurai
// vibe out directly — it read wrong for boxing).
//
// A drawn boxer is a head circle + body trapezoid + trunks band + two
// arms with stub gloves. The arms animate per state: punches extend
// forward, blocks raise in front of the head, dodges shift the whole
// silhouette + tuck the head, knockdowns rotate the whole figure flat.
//
// No sprite sheet load, no remote assets, no IP issues — and crucially
// it actually looks like a boxer instead of a samurai. When a real
// CC0 boxer pack is dropped in /public/assets/boxing/ later, replace
// this module with a sprite-based renderer.
//
// Coords: caller passes the top-left (x, y) of a DEST_W x DEST_H box.
// We draw inside that box, sized for ~160 px wide.

import type { BoxerStateId } from "./boxerState";

export const DEST_W = 160;
export const DEST_H = 160;

/** Where to draw the boxer's head/body for hit-flash positioning by callers. */
export interface BoxerAnchors {
  headX: number;
  headY: number;
  headR: number;
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyH: number;
}

export function drawProceduralBoxer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  state: BoxerStateId,
  cornerColor: string,
  facing: "right" | "left",
  tickMs: number,
  flashHead: boolean = false,
  flashBody: boolean = false,
): BoxerAnchors {
  ctx.save();
  ctx.translate(x, y);

  // For "left" facing, mirror around the box center so the canonical
  // drawing always faces right; this keeps the arm math one-sided.
  if (facing === "left") {
    ctx.translate(DEST_W, 0);
    ctx.scale(-1, 1);
  }

  // ── State-derived pose params ──────────────────────────────────────
  // t01: 0..1 cycle for breathing/bobbing.
  const t01 = ((tickMs / 1000) % 1.6) / 1.6;
  const bob = Math.sin(t01 * Math.PI * 2) * 2;

  // punchT: 0..1 once-per-call rough animation; we drive off tickMs % 220
  // for active punches so the arm jabs forward then snaps back.
  const punchT = ((tickMs % 220) / 220);
  const punchExt = punchTriangle(punchT); // 0..1..0

  // Per-state pose:
  // - leadArm:   relative angle (0 = horizontal forward; -π/2 = up)
  // - rearArm:   relative angle
  // - leadExt:   0..1 extension along the arm
  // - rearExt:   0..1 extension
  // - headOff:   {x, y} offset for snap/dodge
  // - bodyTilt:  rotation around hip in radians (for knockdown)
  // - guardUp:   bring both gloves up to the face (block)
  let leadAng = -0.30, rearAng = -0.55;
  let leadExt = 0.25, rearExt = 0.18;
  let headOff = { x: 0, y: bob };
  let bodyTilt = 0;
  let guardUp = false;
  let downed = false;

  switch (state) {
    case "idle":
      // Subtle guard.
      leadAng = -0.45 + Math.sin(t01 * Math.PI * 2) * 0.06;
      rearAng = -0.60 + Math.sin(t01 * Math.PI * 2 + 1.0) * 0.05;
      leadExt = 0.30;
      rearExt = 0.22;
      break;
    case "move":
      leadAng = -0.35 + Math.sin(t01 * Math.PI * 4) * 0.10;
      rearAng = -0.55 + Math.sin(t01 * Math.PI * 4 + 1.5) * 0.10;
      leadExt = 0.30;
      rearExt = 0.22;
      headOff.y += Math.sin(t01 * Math.PI * 4) * 1.5;
      break;
    case "jab":
      // Quick lead-hand straight.
      leadAng = -0.05;
      leadExt = 0.30 + 0.70 * punchExt;
      rearAng = -0.55;
      rearExt = 0.22;
      break;
    case "power":
      // Rear-hand cross / uppercut arc.
      rearAng = -0.10 + (punchExt - 0.5) * 0.4;
      rearExt = 0.25 + 0.75 * punchExt;
      leadAng = -0.50;
      leadExt = 0.30;
      headOff.x += punchExt * 3;
      break;
    case "block":
      // Both gloves up by the chin.
      guardUp = true;
      leadAng = -1.10;
      rearAng = -1.20;
      leadExt = 0.45;
      rearExt = 0.45;
      break;
    case "dodge":
      // Slip to the side + duck.
      headOff = { x: -10, y: bob + 6 };
      bodyTilt = -0.18;
      leadAng = -0.55;
      rearAng = -0.70;
      leadExt = 0.30;
      rearExt = 0.22;
      break;
    case "hit":
      // Head snaps back.
      headOff = { x: -6, y: -3 };
      bodyTilt = 0.10;
      leadAng = -0.20;
      rearAng = -0.40;
      leadExt = 0.22;
      rearExt = 0.18;
      break;
    case "knockdown":
      downed = true;
      bodyTilt = -1.1;
      headOff = { x: 0, y: 0 };
      break;
    case "ko":
      downed = true;
      bodyTilt = -1.45;
      headOff = { x: 0, y: 0 };
      break;
  }

  // ── Layout anchors (canonical "facing right" coordinates) ──────────
  // Feet at the bottom-center. Body is a trapezoid. Head is a circle.
  const groundY = DEST_H - 6;
  const hipX = DEST_W * 0.40;
  const hipY = groundY - 70;
  const shoulderY = hipY - 32;
  const headR = 14;
  const headCX = hipX + (downed ? 28 : 4);
  const headCY = shoulderY - (downed ? 4 : 18) + headOff.y;

  // Knockdown rotation: pivot around the hip.
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(bodyTilt);
  ctx.translate(-hipX, -hipY);

  // Trunks band (corner-color stripe across hips).
  ctx.fillStyle = cornerColor;
  ctx.globalAlpha = 0.95;
  roundedRect(ctx, hipX - 28, hipY - 6, 56, 22, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Legs (simple verticals).
  ctx.fillStyle = "#1f1814";
  roundedRect(ctx, hipX - 18, hipY + 14, 12, 50, 3);
  ctx.fill();
  roundedRect(ctx, hipX + 6,  hipY + 14, 12, 50, 3);
  ctx.fill();

  // Boots.
  ctx.fillStyle = "#0a0a14";
  roundedRect(ctx, hipX - 21, hipY + 60, 18, 8, 3);
  ctx.fill();
  roundedRect(ctx, hipX + 3,  hipY + 60, 18, 8, 3);
  ctx.fill();

  // Torso — trapezoid wider at shoulders.
  ctx.fillStyle = "#2a2118";
  ctx.beginPath();
  ctx.moveTo(hipX - 22, hipY);          // left hip
  ctx.lineTo(hipX + 22, hipY);          // right hip
  ctx.lineTo(hipX + 30, shoulderY + 6); // right shoulder
  ctx.lineTo(hipX - 30, shoulderY + 6); // left shoulder
  ctx.closePath();
  ctx.fill();

  // Body hit flash overlay.
  if (flashBody) {
    ctx.fillStyle = "#fef3c7";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(hipX - 22, hipY);
    ctx.lineTo(hipX + 22, hipY);
    ctx.lineTo(hipX + 30, shoulderY + 6);
    ctx.lineTo(hipX - 30, shoulderY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Corner-color shoulder pads.
  ctx.fillStyle = cornerColor;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(hipX - 26, shoulderY + 8, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hipX + 26, shoulderY + 8, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Head (skin tone neutral; tinted-ish to feel like a silhouette but
  // not just black). Slight outline so it pops against the ring bg.
  ctx.fillStyle = "#c9966a";
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Hair cap — corner color so each fighter reads as red/blue.
  ctx.fillStyle = cornerColor;
  ctx.beginPath();
  ctx.arc(headCX, headCY - 4, headR, Math.PI, 2 * Math.PI);
  ctx.fill();
  // Head hit flash.
  if (flashHead) {
    ctx.fillStyle = "#fef3c7";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Arms ───────────────────────────────────────────────────────────
  // Rear arm first (drawn behind), then lead arm in front.
  const armLen = 36;
  const rearOrigin = { x: hipX - 12, y: shoulderY + 8 };
  const leadOrigin = { x: hipX + 18, y: shoulderY + 8 };

  drawArm(ctx, rearOrigin.x, rearOrigin.y, rearAng, rearExt, armLen, cornerColor, false);
  if (guardUp) {
    // Re-position the lead glove right at the face for clarity.
    const gx = headCX - 6;
    const gy = headCY + 2;
    drawGlove(ctx, gx, gy, cornerColor);
  }
  drawArm(ctx, leadOrigin.x, leadOrigin.y, leadAng, leadExt, armLen, cornerColor, true);

  ctx.restore(); // bodyTilt

  // ── KO / KD overlay text ──────────────────────────────────────────
  if (state === "knockdown" || state === "ko") {
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("✦ DOWN ✦", DEST_W / 2, 14);
    ctx.textAlign = "start";
  }

  ctx.restore(); // facing flip + translate

  return {
    headX: x + (facing === "left" ? DEST_W - headCX : headCX),
    headY: y + headCY,
    headR,
    bodyX: x + (facing === "left" ? DEST_W - (hipX + 22) : hipX - 22),
    bodyY: y + shoulderY + 6,
    bodyW: 60,
    bodyH: hipY - shoulderY + 4,
  };
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  angle: number, extension: number, baseLen: number,
  color: string, isLead: boolean,
): void {
  const len = baseLen * (0.6 + extension * 0.6);
  const tipX = ox + Math.cos(angle) * len;
  const tipY = oy + Math.sin(angle) * len;
  // Upper arm.
  ctx.strokeStyle = "#3a2d20";
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Forearm/wrist accent (slightly slimmer).
  ctx.strokeStyle = "#2a2118";
  ctx.lineWidth = 6;
  ctx.beginPath();
  const mx = ox + Math.cos(angle) * len * 0.5;
  const my = oy + Math.sin(angle) * len * 0.5;
  ctx.moveTo(mx, my);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Glove.
  drawGlove(ctx, tipX, tipY, color, isLead);
}

function drawGlove(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, color: string, isLead = true,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, isLead ? 8 : 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cuff dash for definition.
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 4);
  ctx.lineTo(cx + 5, cy + 4);
  ctx.stroke();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function punchTriangle(t: number): number {
  // 0 → 1 → 0 across [0,1], with a sharper extension peak.
  if (t < 0.35) return t / 0.35;
  if (t < 0.50) return 1;
  return Math.max(0, 1 - (t - 0.50) / 0.50);
}
