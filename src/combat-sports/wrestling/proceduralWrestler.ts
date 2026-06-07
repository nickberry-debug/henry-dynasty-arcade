// src/combat-sports/wrestling/proceduralWrestler.ts
//
// Honest placeholder art: procedural canvas drawings of stylized
// wrestlers. Mirrors proceduralBoxer.ts in spirit — silhouette + tights
// + boots + arms — with wrestler-specific poses:
//
//   strike     — lead arm extended into a punch
//   grapple    — both arms forward, locked
//   rope       — body leaned + bouncing pose
//   reversal   — defensive crouch + arm spin
//   taunt      — both arms raised, head up
//   hit        — head snap + body tilt
//   down       — flat on the mat
//   pinned     — flat with opponent silhouette over (pose flag — caller
//                handles the second silhouette)
//   finisher   — flexed signature pose with glow
//   submission — locked hold (single-figure stretched pose)
//   victory    — both arms raised, leaned back
//
// When a real CC0 wrestler pack is dropped in /public/assets/wrestling/,
// replace this module with a sprite-based renderer. The in-app banner
// in WrestlingVersus.tsx asks for that drop.

import type { WrestlerStateId } from "./wrestlerState";

export const DEST_W = 160;
export const DEST_H = 180;

export interface WrestlerAnchors {
  headX: number;
  headY: number;
  headR: number;
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyH: number;
}

export function drawProceduralWrestler(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  state: WrestlerStateId,
  cornerColor: string,
  facing: "right" | "left",
  tickMs: number,
  flashHit: boolean = false,
  glow: boolean = false,
): WrestlerAnchors {
  ctx.save();
  ctx.translate(x, y);

  if (facing === "left") {
    ctx.translate(DEST_W, 0);
    ctx.scale(-1, 1);
  }

  const t01 = ((tickMs / 1000) % 1.6) / 1.6;
  const bob = Math.sin(t01 * Math.PI * 2) * 2;

  const punchT = (tickMs % 220) / 220;
  const punchExt = punchTriangle(punchT);

  let leadAng = -0.35, rearAng = -0.55;
  let leadExt = 0.30, rearExt = 0.22;
  let headOff = { x: 0, y: bob };
  let bodyTilt = 0;
  let downed = false;
  let armsUp = false;
  let crouched = false;

  switch (state) {
    case "idle":
      leadAng = -0.45 + Math.sin(t01 * Math.PI * 2) * 0.08;
      rearAng = -0.55 + Math.sin(t01 * Math.PI * 2 + 1.0) * 0.06;
      leadExt = 0.30; rearExt = 0.22;
      break;
    case "strike":
      leadAng = -0.05;
      leadExt = 0.30 + 0.70 * punchExt;
      rearAng = -0.55; rearExt = 0.22;
      break;
    case "grapple":
      leadAng = -0.15; rearAng = -0.25;
      leadExt = 0.50 + 0.40 * punchExt;
      rearExt = 0.40 + 0.50 * punchExt;
      break;
    case "rope":
      leadAng = -0.15;
      rearAng = -0.25;
      leadExt = 0.40;
      rearExt = 0.30;
      headOff.x += Math.sin(tickMs / 80) * 8;
      headOff.y += Math.abs(Math.sin(tickMs / 60)) * -3;
      bodyTilt = Math.sin(tickMs / 90) * 0.10;
      break;
    case "reversal":
      crouched = true;
      leadAng = -0.85 + Math.sin(tickMs / 100) * 0.40;
      rearAng = -1.05 + Math.sin(tickMs / 100 + 1.5) * 0.40;
      leadExt = 0.45; rearExt = 0.45;
      bodyTilt = -0.10;
      break;
    case "taunt":
      armsUp = true;
      leadAng = -1.50; rearAng = -1.55;
      leadExt = 0.60 + Math.sin(t01 * Math.PI * 4) * 0.10;
      rearExt = 0.60 + Math.sin(t01 * Math.PI * 4 + 0.8) * 0.10;
      break;
    case "hit":
      headOff = { x: -6, y: -3 };
      bodyTilt = 0.12;
      leadAng = -0.20; rearAng = -0.35;
      leadExt = 0.22; rearExt = 0.20;
      break;
    case "down":
    case "pinned":
      downed = true;
      bodyTilt = -1.20;
      headOff = { x: 0, y: 0 };
      break;
    case "finisher":
      armsUp = true;
      leadAng = -1.20; rearAng = -1.25;
      leadExt = 0.55; rearExt = 0.55;
      bodyTilt = -0.08;
      break;
    case "submission":
      crouched = true;
      leadAng = -0.10; rearAng = -0.20;
      leadExt = 0.65; rearExt = 0.65;
      bodyTilt = -0.18;
      break;
    case "victory":
      armsUp = true;
      leadAng = -1.45 + Math.sin(t01 * Math.PI * 2) * 0.06;
      rearAng = -1.55 + Math.sin(t01 * Math.PI * 2 + 1.2) * 0.06;
      leadExt = 0.65; rearExt = 0.65;
      bodyTilt = -0.05;
      break;
  }

  // Layout.
  const groundY = DEST_H - 6;
  const hipX = DEST_W * 0.40;
  const hipY = groundY - (crouched ? 60 : 78);
  const shoulderY = hipY - 34;
  const headR = 15;
  const headCX = hipX + (downed ? 32 : 4);
  const headCY = shoulderY - (downed ? 4 : 20) + headOff.y;

  // Glow halo for finisher / hype-full state.
  if (glow) {
    const grd = ctx.createRadialGradient(hipX, hipY, 4, hipX, hipY, 90);
    grd.addColorStop(0, `${cornerColor}aa`);
    grd.addColorStop(1, `${cornerColor}00`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(hipX, hipY, 90, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(bodyTilt);
  ctx.translate(-hipX, -hipY);

  // Tights band (corner color).
  ctx.fillStyle = cornerColor;
  ctx.globalAlpha = 0.95;
  roundedRect(ctx, hipX - 30, hipY - 8, 60, 24, 5);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Stars on the tights — kid-friendly wrestler look.
  ctx.fillStyle = "#fef3c7";
  drawStar(ctx, hipX - 14, hipY + 4, 3);
  drawStar(ctx, hipX + 0, hipY + 4, 3);
  drawStar(ctx, hipX + 14, hipY + 4, 3);

  // Legs (tights extend down).
  ctx.fillStyle = cornerColor;
  ctx.globalAlpha = 0.75;
  roundedRect(ctx, hipX - 20, hipY + 16, 14, 36, 3);
  ctx.fill();
  roundedRect(ctx, hipX + 6,  hipY + 16, 14, 36, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Boots (knee-high wrestling boots).
  ctx.fillStyle = "#0a0a14";
  roundedRect(ctx, hipX - 22, hipY + 48, 18, 18, 3);
  ctx.fill();
  roundedRect(ctx, hipX + 4, hipY + 48, 18, 18, 3);
  ctx.fill();
  // Boot laces / accent stripe.
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(hipX - 21, hipY + 56, 16, 2);
  ctx.fillRect(hipX + 5, hipY + 56, 16, 2);

  // Torso — broader than boxing for wrestling beefiness. Skin-toned
  // (no shirt, wrestler-style).
  ctx.fillStyle = "#c9966a";
  ctx.beginPath();
  ctx.moveTo(hipX - 22, hipY);
  ctx.lineTo(hipX + 22, hipY);
  ctx.lineTo(hipX + 34, shoulderY + 6);
  ctx.lineTo(hipX - 34, shoulderY + 6);
  ctx.closePath();
  ctx.fill();
  // Torso outline.
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chest cross-strap (wrestler harness look).
  ctx.strokeStyle = cornerColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hipX - 22, hipY);
  ctx.lineTo(hipX + 18, shoulderY + 8);
  ctx.stroke();

  // Hit flash.
  if (flashHit) {
    ctx.fillStyle = "#fef3c7";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(hipX - 22, hipY);
    ctx.lineTo(hipX + 22, hipY);
    ctx.lineTo(hipX + 34, shoulderY + 6);
    ctx.lineTo(hipX - 34, shoulderY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Shoulder pads.
  ctx.fillStyle = cornerColor;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(hipX - 30, shoulderY + 8, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hipX + 30, shoulderY + 8, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Head — skin tone + corner-color mask/hair.
  ctx.fillStyle = "#c9966a";
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Mask / hair cap.
  ctx.fillStyle = cornerColor;
  ctx.beginPath();
  ctx.arc(headCX, headCY - 4, headR, Math.PI, 2 * Math.PI);
  ctx.fill();
  // Mask outline detail.
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(headCX - 5, headCY - 3, 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(headCX + 5, headCY - 3, 2.5, 0, Math.PI * 2);
  ctx.stroke();

  if (flashHit) {
    ctx.fillStyle = "#fef3c7";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Arms.
  const armLen = 38;
  const rearOrigin = { x: hipX - 14, y: shoulderY + 8 };
  const leadOrigin = { x: hipX + 20, y: shoulderY + 8 };

  drawArm(ctx, rearOrigin.x, rearOrigin.y, rearAng, rearExt, armLen, cornerColor);
  drawArm(ctx, leadOrigin.x, leadOrigin.y, leadAng, leadExt, armLen, cornerColor);

  // Arms-up overlay (taunt / finisher / victory) — extra glow fists.
  if (armsUp) {
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(leadOrigin.x + Math.cos(leadAng) * (armLen * (0.6 + leadExt * 0.6)) - 0,
            leadOrigin.y + Math.sin(leadAng) * (armLen * (0.6 + leadExt * 0.6)),
            4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // bodyTilt

  // State labels.
  if (state === "down" || state === "pinned") {
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("✦ DOWN ✦", DEST_W / 2, 14);
    ctx.textAlign = "start";
  }
  if (state === "submission") {
    ctx.fillStyle = "#fca5a5";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("✦ LOCKED ✦", DEST_W / 2, 14);
    ctx.textAlign = "start";
  }

  ctx.restore();

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
  color: string,
): void {
  const len = baseLen * (0.6 + extension * 0.6);
  const tipX = ox + Math.cos(angle) * len;
  const tipY = oy + Math.sin(angle) * len;
  // Upper arm (skin).
  ctx.strokeStyle = "#c9966a";
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Arm outline for definition.
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Wrist tape (corner color).
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  const wx = ox + Math.cos(angle) * len * 0.85;
  const wy = oy + Math.sin(angle) * len * 0.85;
  ctx.moveTo(wx, wy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Fist.
  ctx.fillStyle = "#c9966a";
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a2) * r * 0.4, cy + Math.sin(a2) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
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
  if (t < 0.35) return t / 0.35;
  if (t < 0.50) return 1;
  return Math.max(0, 1 - (t - 0.50) / 0.50);
}
