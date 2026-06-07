// Glam Studio — procedural hair generators.
//
// Each function returns a THREE.Group sized to the doll's HEAD socket.
// CC0 hair meshes that fit a Quaternius-style head do not exist online —
// generating hair as procedural Three.js geometry is the honest choice
// and lets us recolor and combine without artists.
//
// All hair groups face +Z by convention and sit on origin = TOP_OF_HEAD.
// The builder rotates the group to face the camera when it parents into
// the scene.

import * as THREE from "three";
import type { HairStyle } from "../data/manifest";

interface HairContext {
  hex: string;          // base color
  scale: number;        // matches the doll bbox width — typically ~0.3
}

function mat(hex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: 0.55,
    metalness: 0.05,
    flatShading: false,
  });
}

// ── Helper: cap = half-sphere sitting on top of the head ──────────────

function cap(radius: number, ctx: HairContext): THREE.Mesh {
  const g = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  return new THREE.Mesh(g, mat(ctx.hex));
}

// ── Styles ────────────────────────────────────────────────────────────

export function makeHair(style: HairStyle, ctx: HairContext): THREE.Group {
  const g = new THREE.Group();
  if (style === "none") return g;
  const r = 0.13 * ctx.scale;          // head radius approximation
  switch (style) {
    case "bob": {
      const head = cap(r, ctx);
      head.position.y = -r * 0.25;
      g.add(head);
      // chin-length sides
      const sideGeom = new THREE.CylinderGeometry(r * 0.95, r * 0.85, r * 1.5, 24, 1, true);
      const sides = new THREE.Mesh(sideGeom, mat(ctx.hex));
      sides.position.y = -r * 1.0;
      g.add(sides);
      break;
    }
    case "long": {
      const head = cap(r * 1.05, ctx); head.position.y = -r * 0.25; g.add(head);
      const backGeom = new THREE.CylinderGeometry(r * 0.95, r * 0.6, r * 4.5, 24, 1, true);
      const back = new THREE.Mesh(backGeom, mat(ctx.hex));
      back.position.set(0, -r * 2.3, -r * 0.4);
      g.add(back);
      // taper tip
      const tipGeom = new THREE.ConeGeometry(r * 0.6, r * 0.9, 16);
      const tip = new THREE.Mesh(tipGeom, mat(ctx.hex));
      tip.position.set(0, -r * 4.8, -r * 0.4);
      tip.rotation.x = Math.PI;
      g.add(tip);
      break;
    }
    case "ponytail": {
      const head = cap(r, ctx); head.position.y = -r * 0.2; g.add(head);
      const ponyGeom = new THREE.CylinderGeometry(r * 0.45, r * 0.15, r * 3.5, 16);
      const pony = new THREE.Mesh(ponyGeom, mat(ctx.hex));
      pony.position.set(0, -r * 1.7, -r * 1.0);
      pony.rotation.x = -0.4;
      g.add(pony);
      break;
    }
    case "bun": {
      const head = cap(r, ctx); head.position.y = -r * 0.2; g.add(head);
      const bunGeom = new THREE.SphereGeometry(r * 0.55, 20, 14);
      const bun = new THREE.Mesh(bunGeom, mat(ctx.hex));
      bun.position.set(0, r * 0.55, -r * 0.4);
      g.add(bun);
      break;
    }
    case "pigtails": {
      const head = cap(r, ctx); head.position.y = -r * 0.2; g.add(head);
      const tailGeom = new THREE.CylinderGeometry(r * 0.32, r * 0.10, r * 2.4, 14);
      const tip = new THREE.SphereGeometry(r * 0.32, 12, 8);
      for (const sign of [-1, 1] as const) {
        const t = new THREE.Mesh(tailGeom, mat(ctx.hex));
        t.position.set(sign * r * 1.05, -r * 0.7, -r * 0.4);
        t.rotation.z = sign * 0.5;
        g.add(t);
        const tipMesh = new THREE.Mesh(tip, mat(ctx.hex));
        tipMesh.position.set(sign * r * 1.6, -r * 1.8, -r * 0.4);
        g.add(tipMesh);
      }
      break;
    }
    case "pixie": {
      const head = cap(r * 0.95, ctx);
      head.position.y = -r * 0.15;
      g.add(head);
      break;
    }
    case "afro": {
      const puff = new THREE.SphereGeometry(r * 1.7, 24, 18);
      const m = new THREE.Mesh(puff, mat(ctx.hex));
      m.position.y = r * 0.25;
      g.add(m);
      break;
    }
    case "braid": {
      const head = cap(r, ctx); head.position.y = -r * 0.2; g.add(head);
      // 6 stacked spheres = simple braid
      for (let i = 0; i < 6; i++) {
        const bead = new THREE.SphereGeometry(r * (0.42 - i * 0.025), 14, 10);
        const m = new THREE.Mesh(bead, mat(ctx.hex));
        m.position.set(0, -r * (0.5 + i * 0.7), -r * 0.6);
        g.add(m);
      }
      break;
    }
  }
  // Rainbow special-case for any style: replace base material with vertex-coloured stack.
  // (Cheap implementation: tint each child mesh a different hue.)
  if (ctx.hex.toLowerCase() === "#f43f5e" /* rainbow sentinel from palette */) {
    const hues = ["#f43f5e","#fb923c","#fde047","#86efac","#67e8f9","#a78bfa","#ec4899"];
    let i = 0;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(hues[i % hues.length]);
        i++;
      }
    });
  }
  return g;
}

// ── Disposal ──────────────────────────────────────────────────────────

export function disposeGroup(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) (mat as THREE.Material).dispose();
      }
    }
  });
}
