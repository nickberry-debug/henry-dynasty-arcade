// Glam Studio — makeup as a canvas-painted face overlay.
//
// Quaternius faces have block-painted features baked into a tiny texture
// atlas. We can't easily paint into that atlas without unwrapping the
// model. Instead we put a flat plane just in front of the face socket
// and paint lipstick / blush / eyeshadow onto a dynamically-generated
// canvas texture. From normal viewing angles this reads as makeup on the
// doll's face — the cheat works because the plane tracks the head bone
// (or, if no head bone, the face socket).

import * as THREE from "three";

export interface MakeupConfig {
  lipHex: string | null;        // null/00000000 hex => skip
  eyeshadowHex: string | null;
  blushHex: string | null;
}

const W = 256, H = 320;

function hexAlpha(hex: string | null): { rgba: string; on: boolean } {
  if (!hex) return { rgba: "rgba(0,0,0,0)", on: false };
  if (hex === "#00000000" || hex.endsWith("00000000")) return { rgba: "rgba(0,0,0,0)", on: false };
  // CSS handles short hex naturally.
  return { rgba: hex, on: true };
}

export function paintFaceCanvas(cfg: MakeupConfig): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);

  // Approx face landmark positions on a 256x320 portrait canvas
  const eyeL = { x: W * 0.34, y: H * 0.42 };
  const eyeR = { x: W * 0.66, y: H * 0.42 };
  const cheekL = { x: W * 0.28, y: H * 0.62 };
  const cheekR = { x: W * 0.72, y: H * 0.62 };
  const mouth = { x: W * 0.50, y: H * 0.78 };

  // ── Eyeshadow ──────────────────────────────────────────────────────
  const es = hexAlpha(cfg.eyeshadowHex);
  if (es.on) {
    ctx.fillStyle = es.rgba;
    ctx.globalAlpha = 0.55;
    for (const eye of [eyeL, eyeR]) {
      ctx.beginPath();
      ctx.ellipse(eye.x, eye.y - 14, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Blush ──────────────────────────────────────────────────────────
  const bl = hexAlpha(cfg.blushHex);
  if (bl.on) {
    for (const cheek of [cheekL, cheekR]) {
      const grad = ctx.createRadialGradient(cheek.x, cheek.y, 2, cheek.x, cheek.y, 32);
      grad.addColorStop(0, bl.rgba);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cheek.x, cheek.y, 32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Lipstick ───────────────────────────────────────────────────────
  const lp = hexAlpha(cfg.lipHex);
  if (lp.on) {
    ctx.fillStyle = lp.rgba;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(mouth.x, mouth.y, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  return c;
}

export interface MakeupOverlay {
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  apply(cfg: MakeupConfig): void;
  dispose(): void;
}

export function createMakeupOverlay(): MakeupOverlay {
  // Will be repainted whenever apply() is called.
  let canvas = paintFaceCanvas({ lipHex: null, eyeshadowHex: null, blushHex: null });
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  // Match aspect ratio of canvas. Plane is in metres; sized to a typical
  // Quaternius head (~0.30m wide).
  const planeW = 0.30, planeH = planeW * (H / W);
  const geom = new THREE.PlaneGeometry(planeW, planeH);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 999;          // draw on top of the doll

  function apply(cfg: MakeupConfig) {
    canvas = paintFaceCanvas(cfg);
    tex.image = canvas;
    tex.needsUpdate = true;
  }
  function dispose() {
    geom.dispose(); mat.dispose(); tex.dispose();
  }
  return { mesh, texture: tex, apply, dispose };
}
