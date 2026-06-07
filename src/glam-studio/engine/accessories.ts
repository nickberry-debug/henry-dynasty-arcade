// Glam Studio — procedural accessories.
//
// Same approach as the hair generators: small THREE.Groups built from
// primitives. Each returns a group anchored at the relevant socket
// (head / face / ears / neck) — the builder positions it appropriately.

import * as THREE from "three";
import type { Accessory } from "../data/manifest";

function mat(hex: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.45, metalness: 0.25, ...opts });
}
function metalMat(hex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.2, metalness: 0.85 });
}

const HEAD_R = 0.13; // base head radius

export function makeAccessory(kind: Accessory): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case "none": return g;
    case "glasses_round":
    case "glasses_heart":
    case "sunglasses": {
      const frameColor = kind === "sunglasses" ? "#0a0a0a" : "#fde047";
      const lensColor  = kind === "sunglasses" ? "#1f2937" : "#cbd5e1";
      const lensOpacity = kind === "sunglasses" ? 0.85 : 0.35;
      // Frame
      const lensR = HEAD_R * 0.38;
      const sep = HEAD_R * 0.55;
      for (const sign of [-1, 1] as const) {
        if (kind === "glasses_heart") {
          // Two overlapping spheres as a chunky cartoon heart
          const heart = new THREE.Group();
          const s1 = new THREE.Mesh(new THREE.SphereGeometry(lensR * 0.55, 12, 8),
            mat(frameColor));
          s1.position.set(-lensR * 0.25, lensR * 0.1, 0);
          const s2 = s1.clone(); s2.position.x = lensR * 0.25;
          heart.add(s1, s2);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(lensR * 0.45, lensR * 0.9, 12),
            mat(frameColor));
          cone.position.y = -lensR * 0.5;
          cone.rotation.x = Math.PI;
          heart.add(cone);
          heart.position.set(sign * sep, 0, 0);
          g.add(heart);
        } else {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(lensR, lensR * 0.08, 8, 24),
            mat(frameColor));
          ring.position.set(sign * sep, 0, 0);
          g.add(ring);
          const lens = new THREE.Mesh(new THREE.CircleGeometry(lensR * 0.92, 24),
            new THREE.MeshStandardMaterial({ color: lensColor, transparent: true, opacity: lensOpacity }));
          lens.position.set(sign * sep, 0, -0.005);
          g.add(lens);
        }
      }
      // Bridge
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(sep * 0.6, HEAD_R * 0.04, HEAD_R * 0.06), mat(frameColor));
      g.add(bridge);
      break;
    }
    case "earrings_stud": {
      for (const sign of [-1, 1] as const) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.10, 10, 8), metalMat("#fbbf24"));
        stud.position.set(sign * HEAD_R * 0.95, 0, 0);
        g.add(stud);
      }
      break;
    }
    case "earrings_hoop": {
      for (const sign of [-1, 1] as const) {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(HEAD_R * 0.18, HEAD_R * 0.03, 8, 18),
          metalMat("#fbbf24"));
        hoop.position.set(sign * HEAD_R * 0.95, -HEAD_R * 0.18, 0);
        hoop.rotation.y = Math.PI / 2;
        g.add(hoop);
      }
      break;
    }
    case "necklace_chain": {
      const chain = new THREE.Mesh(
        new THREE.TorusGeometry(HEAD_R * 0.55, HEAD_R * 0.04, 8, 36),
        metalMat("#fbbf24"));
      chain.rotation.x = Math.PI / 2;
      g.add(chain);
      const pendant = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.10, 12, 10), metalMat("#f43f5e"));
      pendant.position.set(0, -HEAD_R * 0.55, 0);
      g.add(pendant);
      break;
    }
    case "hat_beanie": {
      const beanieGeom = new THREE.SphereGeometry(HEAD_R * 1.05, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const beanie = new THREE.Mesh(beanieGeom, mat("#a78bfa", { roughness: 0.8 }));
      beanie.position.y = HEAD_R * 0.10;
      g.add(beanie);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(HEAD_R * 1.05, HEAD_R * 1.05, HEAD_R * 0.18, 24),
        mat("#67e8f9", { roughness: 0.8 }));
      cuff.position.y = HEAD_R * 0.55;
      g.add(cuff);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.22, 14, 12), mat("#f9a8d4", { roughness: 0.9 }));
      pom.position.y = HEAD_R * 1.18;
      g.add(pom);
      break;
    }
    case "hat_sunhat": {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(HEAD_R * 1.95, HEAD_R * 1.95, HEAD_R * 0.05, 32),
        mat("#fef3c7", { roughness: 0.95 }));
      brim.position.y = HEAD_R * 0.35;
      g.add(brim);
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(HEAD_R * 1.05, HEAD_R * 1.10, HEAD_R * 0.7, 24),
        mat("#fef3c7", { roughness: 0.95 }));
      crown.position.y = HEAD_R * 0.70;
      g.add(crown);
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(HEAD_R * 1.08, HEAD_R * 1.08, HEAD_R * 0.12, 24),
        mat("#e11d48", { roughness: 0.6 }));
      ribbon.position.y = HEAD_R * 0.45;
      g.add(ribbon);
      break;
    }
    case "bow": {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.12, 10, 8), mat("#f9a8d4"));
      g.add(knot);
      for (const sign of [-1, 1] as const) {
        const loop = new THREE.Mesh(
          new THREE.SphereGeometry(HEAD_R * 0.18, 12, 10),
          mat("#f9a8d4"));
        loop.position.set(sign * HEAD_R * 0.2, 0, 0);
        loop.scale.set(1, 0.55, 0.55);
        g.add(loop);
      }
      g.position.y = HEAD_R * 0.95;
      break;
    }
    case "tiara": {
      const band = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R * 1.02, HEAD_R * 0.04, 8, 32),
        metalMat("#fbbf24"));
      band.rotation.x = Math.PI / 2;
      band.position.y = HEAD_R * 0.30;
      g.add(band);
      // Three points up front
      for (const dx of [-HEAD_R * 0.4, 0, HEAD_R * 0.4]) {
        const point = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.08, HEAD_R * 0.35, 6), metalMat("#fbbf24"));
        point.position.set(dx, HEAD_R * 0.5, HEAD_R * 0.95);
        g.add(point);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.06, 10, 8),
          new THREE.MeshStandardMaterial({ color: "#67e8f9", metalness: 0.3, roughness: 0.15 }));
        gem.position.set(dx, HEAD_R * 0.55, HEAD_R * 0.95);
        g.add(gem);
      }
      break;
    }
    case "headband": {
      const band = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R * 1.05, HEAD_R * 0.06, 10, 30),
        mat("#f9a8d4"));
      band.rotation.x = Math.PI / 2;
      band.position.y = HEAD_R * 0.25;
      g.add(band);
      break;
    }
  }
  return g;
}

export function disposeAccessoryGroup(g: THREE.Group) {
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
