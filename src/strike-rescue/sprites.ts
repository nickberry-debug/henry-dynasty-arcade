// Strike Rescue — procedural canvas sprite renderers.
// Each fn draws at a logical "world" position (x,y = center) with optional
// rotation. All shapes are flat-shaded geometry so we don't pay any image
// bytes. Names match keys in /public/assets/strikerescue/manifest.json so
// the eventual Kenney swap is one-to-one.
//
// IP: hero is a generic armored visor-helmet soldier (gray plate, blue trim) —
// explicitly NOT Master Chief. Buggy is olive-drab roll-cage 4-wheeler with
// roof-mounted twin MG — explicitly NOT a Warthog.

type Ctx = CanvasRenderingContext2D;

function withRot(ctx: Ctx, x: number, y: number, rot: number, fn: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fn();
  ctx.restore();
}

export function drawPlayerBuggy(ctx: Ctx, x: number, y: number, rot: number, p2 = false) {
  withRot(ctx, x, y, rot, () => {
    const body = p2 ? "#a07840" : "#4a5a32";
    const accent = p2 ? "#6a4a20" : "#3a4a22";
    const trim = p2 ? "#dc2626" : "#1e3a8a";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(2, 2, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = body;   ctx.fillRect(-14, -18, 28, 36);
    ctx.fillStyle = accent; ctx.fillRect(-12, -18, 24, 6);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-16, -14, 4, 8); ctx.fillRect(12, -14, 4, 8);
    ctx.fillRect(-16, 6, 4, 8);   ctx.fillRect(12, 6, 4, 8);
    ctx.fillStyle = "#222";
    ctx.fillRect(-12, -10, 3, 3); ctx.fillRect(9, -10, 3, 3);
    ctx.fillRect(-12, 7, 3, 3);   ctx.fillRect(9, 7, 3, 3);
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(-7, -4, 14, 12);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(-4, -16, 2, 12); ctx.fillRect(2, -16, 2, 12);
    drawHero(ctx, 0, 2, 0, p2);
    ctx.fillStyle = trim; ctx.fillRect(-14, 16, 28, 2);
  });
}

export function drawHero(ctx: Ctx, x: number, y: number, rot: number, p2 = false) {
  withRot(ctx, x, y, rot, () => {
    const armor = p2 ? "#7c2d12" : "#52525b";
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3f3f46";
    ctx.beginPath(); ctx.arc(0, -1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(-2.5, -2.5, 5, 1.5);
  });
}

export function drawFootSoldier(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(1, 1, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a1f1f";
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a1010";
    ctx.beginPath(); ctx.arc(0, -1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.fillRect(-1, -10, 2, 7);
  });
}

export function drawTurret(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "#8b6f3a";
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b4f25";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 12, Math.sin(a) * 12, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#444";
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.fillRect(-1.5, -14, 3, 12);
  });
}

export function drawEnemyJeep(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(2, 2, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b1717"; ctx.fillRect(-12, -16, 24, 32);
    ctx.fillStyle = "#4a0e0e"; ctx.fillRect(-10, -16, 20, 6);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(-14, -12, 3, 7); ctx.fillRect(11, -12, 3, 7);
    ctx.fillRect(-14, 5, 3, 7);   ctx.fillRect(11, 5, 3, 7);
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.fillRect(-1.5, -12, 3, 10);
  });
}

export function drawBossTank(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(-32, -36, 68, 76);
    ctx.fillStyle = "#3a3a1a";         ctx.fillRect(-30, -34, 60, 68);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-34, -34, 6, 68); ctx.fillRect(28, -34, 6, 68);
    ctx.fillStyle = "#2a2a14";
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(-3, -42, 6, 28);
  });
}

export function drawBossChopper(ctx: Ctx, x: number, y: number, rot: number, time: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.ellipse(4, 6, 30, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a1c1c";
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a1c1c"; ctx.fillRect(-3, 14, 6, 26);
    ctx.beginPath(); ctx.arc(0, 40, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath(); ctx.ellipse(0, -6, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    const a = time * 0.03;
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const ang = a + (i * Math.PI) / 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 36, Math.sin(ang) * 36); ctx.stroke();
    }
  });
}

export function drawBossBunker(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(-50, -38, 104, 80);
    ctx.fillStyle = "#5a5a4a";         ctx.fillRect(-48, -36, 96, 72);
    ctx.fillStyle = "#111";
    ctx.fillRect(-40, -28, 18, 4); ctx.fillRect(22, -28, 18, 4);
    ctx.fillRect(-10, -32, 20, 4);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(-32, -50, 6, 18); ctx.fillRect(26, -50, 6, 18);
  });
}

export function drawBossMegaTank(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-50, -56, 104, 116);
    ctx.fillStyle = "#2a2a14";         ctx.fillRect(-46, -54, 92, 108);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-50, -54, 8, 108); ctx.fillRect(42, -54, 8, 108);
    ctx.fillStyle = "#3a3a1a";
    ctx.beginPath(); ctx.arc(-16, -12, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -12, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(-19, -50, 6, 36); ctx.fillRect(13, -50, 6, 36);
  });
}

export function drawPOW(ctx: Ctx, x: number, y: number, time: number) {
  const bob = Math.sin(time * 0.005) * 1.5;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(0, 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath(); ctx.arc(0, -1, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e40af"; ctx.fillRect(-2.5, -3.5, 5, 1.5);
  const wave = Math.sin(time * 0.012);
  ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, -1); ctx.lineTo(-5 - wave, -5 - wave);
  ctx.moveTo(3, -1);  ctx.lineTo(5 + wave, -5 - wave);
  ctx.stroke();
  ctx.restore();
}

export function drawExtractionChopper(ctx: Ctx, x: number, y: number, time: number, landed: boolean) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = landed ? "rgba(34,197,94,0.6)" : "rgba(251,191,36,0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 38 + Math.sin(time * 0.005) * 3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(3, 5, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a4a22";
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a3a18"; ctx.fillRect(-3, 10, 6, 20);
  ctx.beginPath(); ctx.arc(0, 30, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath(); ctx.ellipse(0, -5, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  const a = time * (landed ? 0.02 : 0.05);
  ctx.strokeStyle = "rgba(220,220,220,0.75)"; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const ang = a + (i * Math.PI) / 2;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 28, Math.sin(ang) * 28); ctx.stroke();
  }
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-3, -2, 6, 1.5); ctx.fillRect(-0.75, -4.5, 1.5, 6);
  ctx.restore();
}

export function drawGrass(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#3f6b1a"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#4d8021";
  for (let i = 0; i < 4; i++) {
    const px = x + ((i * 7 + 3) % 22);
    const py = y + ((i * 11 + 5) % 22);
    ctx.fillRect(px, py, 2, 2);
  }
}
export function drawDirt(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#8b6f3a"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#6b4f25";
  ctx.fillRect(x + 4, y + 6, 3, 2); ctx.fillRect(x + 14, y + 16, 4, 2);
}
export function drawRoad(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#3f3f3f"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#facc15";
  if (((y / 24) | 0) % 2 === 0) ctx.fillRect(x + 11, y + 4, 2, 16);
}
export function drawWater(ctx: Ctx, x: number, y: number, time: number) {
  ctx.fillStyle = "#1e40af"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#2563eb";
  const off = Math.floor((time / 200) % 12);
  ctx.fillRect(x + off, y + 4, 4, 1);
  ctx.fillRect(x + (off + 6) % 18, y + 14, 4, 1);
}
export function drawBridge(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#7a4a1f"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#5a330f";
  ctx.fillRect(x, y + 2, 24, 2); ctx.fillRect(x, y + 20, 24, 2);
}
export function drawConcrete(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#6b7280"; ctx.fillRect(x, y, 24, 24);
  ctx.strokeStyle = "#4b5563"; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 23, 23);
}
export function drawHut(ctx: Ctx, x: number, y: number, damaged: boolean) {
  ctx.fillStyle = damaged ? "#5b3a1a" : "#8b5a2b"; ctx.fillRect(x - 16, y - 16, 32, 32);
  ctx.fillStyle = damaged ? "#3a200a" : "#5b3a1a"; ctx.fillRect(x - 16, y - 18, 32, 4);
  ctx.fillStyle = "#2b1a0a"; ctx.fillRect(x - 4, y - 2, 8, 18);
  if (damaged) { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 12, y - 12, 24, 24); }
}
export function drawFortressWall(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#52525b"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#3f3f46";
  ctx.fillRect(x, y, 24, 4);
  ctx.fillRect(x + 4, y + 4, 4, 4); ctx.fillRect(x + 16, y + 4, 4, 4);
}

export function drawBullet(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#fde047";
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(253,224,71,0.5)";
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
}
export function drawEnemyBullet(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#fb7185";
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
}
export function drawGrenade(ctx: Ctx, x: number, y: number, alt: number) {
  const r = 4 + alt * 4;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(x, y + 2, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3f6b1a";
  ctx.beginPath(); ctx.arc(x, y - alt * 16, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(x - 1, y - alt * 16 - r - 2, 2, 3);
}
export function drawBossShell(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#9a1a1a";
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(154,26,26,0.5)";
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
}
export function drawMuzzleFlash(ctx: Ctx, x: number, y: number, rot: number) {
  withRot(ctx, x, y, rot, () => {
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(0, -8); ctx.closePath();
    ctx.fill();
  });
}
export function drawExplosion(ctx: Ctx, x: number, y: number, t: number) {
  const r = 8 + t * 50; const a = 1 - t;
  ctx.fillStyle = `rgba(251,146,60,${a})`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(253,224,71,${a * 0.8})`;
  ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
  ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, Math.PI * 2); ctx.fill();
}
export function drawHitBurst(ctx: Ctx, x: number, y: number, t: number) {
  const a = 1 - t;
  ctx.strokeStyle = `rgba(255,235,150,${a})`; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const r1 = 4 + t * 6, r2 = 8 + t * 12;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
    ctx.lineTo(x + Math.cos(ang) * r2, y + Math.sin(ang) * r2);
    ctx.stroke();
  }
}
export function drawPickupGlow(ctx: Ctx, x: number, y: number, color: string, time: number) {
  const r = 9 + Math.sin(time * 0.008) * 2;
  ctx.fillStyle = color + "55";
  ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
