// Monster Forge - Phase 5 3D habitat backgrounds.
//
// Each habitat returns a Three.js Group + a hex tint for ambient light.
// Attached to the scene as a backdrop; the Builder swaps habitats on demand.

import * as THREE from "three";
import type { HabitatId } from "../partsManifest";

export interface HabitatDef {
  id: HabitatId;
  label: string;
  emoji: string;
  /** Background gradient (CSS-style for the host canvas wrapper). */
  cssBg: string;
  /** Ambient + key light colors for the scene. */
  ambient: { color: number; intensity: number };
  key: { color: number };
  /** Backdrop builder — disposes itself in the returned dispose() */
  build: () => { group: THREE.Group; particles?: THREE.Group; dispose: () => void };
}

function mkSimple(color: number, accent: number, particleMode: "ember" | "snow" | "leaf" | "void" | "warm"): HabitatDef["build"] {
  return () => {
    const group = new THREE.Group();
    group.name = "habitat";
    // Backdrop dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: false }),
    );
    dome.position.y = -2;
    group.add(dome);
    // Accent floor ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.0, 64),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.4, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    group.add(ring);

    // Particles
    const particles = new THREE.Group();
    const N = particleMode === "void" ? 36 : 24;
    const speeds: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number; sway: number }[] = [];
    for (let i = 0; i < N; i++) {
      let mat: THREE.MeshStandardMaterial;
      let geo: THREE.BufferGeometry;
      switch (particleMode) {
        case "ember":
          mat = new THREE.MeshStandardMaterial({ color: 0xff7043, emissive: 0xff5722, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 });
          geo = new THREE.SphereGeometry(0.04, 6, 4); break;
        case "snow":
          mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb3e5fc, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
          geo = new THREE.IcosahedronGeometry(0.04, 0); break;
        case "leaf":
          mat = new THREE.MeshStandardMaterial({ color: 0x90caf9, emissive: 0xb3e5fc, emissiveIntensity: 0.4, transparent: true, opacity: 0.8 });
          geo = new THREE.SphereGeometry(0.05, 6, 4); break;
        case "void":
          mat = new THREE.MeshStandardMaterial({ color: 0xb39ddb, emissive: 0x7c4dff, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 });
          geo = new THREE.SphereGeometry(0.05, 6, 4); break;
        case "warm":
          mat = new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffa726, emissiveIntensity: 0.7, transparent: true, opacity: 0.7 });
          geo = new THREE.SphereGeometry(0.04, 6, 4); break;
      }
      const m = new THREE.Mesh(geo, mat);
      const r = 2.5 + Math.random() * 2.5;
      const a = Math.random() * Math.PI * 2;
      const y = 0.4 + Math.random() * 3.5;
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      particles.add(m);
      speeds.push({ mesh: m, baseY: y, speed: 0.3 + Math.random() * 0.6, phase: Math.random() * Math.PI * 2, sway: Math.random() * 0.4 });
    }
    (particles as unknown as { __update?: (t: number) => void }).__update = (t: number) => {
      for (const p of speeds) {
        const yMod = Math.sin(t * p.speed + p.phase) * 0.6;
        p.mesh.position.y = p.baseY + yMod;
        p.mesh.rotation.y += 0.01;
      }
    };
    group.add(particles);

    const dispose = () => {
      group.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(x => x.dispose());
      });
    };
    return { group, particles, dispose };
  };
}

export const HABITATS: Record<HabitatId, HabitatDef> = {
  ember_cavern: {
    id: "ember_cavern", label: "Ember Cavern", emoji: "🔥",
    cssBg: "radial-gradient(800px 600px at 50% 100%, rgba(225,107,40,0.35), transparent 60%), linear-gradient(180deg, #2b0e08 0%, #100503 100%)",
    ambient: { color: 0xffccaa, intensity: 0.55 },
    key: { color: 0xffb74d },
    build: mkSimple(0x4e1a0a, 0xe57c45, "ember"),
  },
  crystal_grotto: {
    id: "crystal_grotto", label: "Crystal Grotto", emoji: "💎",
    cssBg: "radial-gradient(800px 600px at 50% 100%, rgba(64,156,255,0.30), transparent 60%), linear-gradient(180deg, #0a1830 0%, #050a18 100%)",
    ambient: { color: 0xaaccff, intensity: 0.55 },
    key: { color: 0x90caf9 },
    build: mkSimple(0x10203a, 0x60a5fa, "snow"),
  },
  sky_garden: {
    id: "sky_garden", label: "Sky Garden", emoji: "☁️",
    cssBg: "radial-gradient(800px 600px at 50% 100%, rgba(180,225,255,0.35), transparent 60%), linear-gradient(180deg, #c8e6ff 0%, #80b4dd 100%)",
    ambient: { color: 0xffffff, intensity: 0.85 },
    key: { color: 0xffffff },
    build: mkSimple(0xc8e6ff, 0xffffff, "leaf"),
  },
  void_realm: {
    id: "void_realm", label: "Void Realm", emoji: "🌌",
    cssBg: "radial-gradient(800px 600px at 50% 100%, rgba(124,77,255,0.35), transparent 60%), linear-gradient(180deg, #0a0418 0%, #02000a 100%)",
    ambient: { color: 0xb39ddb, intensity: 0.55 },
    key: { color: 0xb39ddb },
    build: mkSimple(0x0a0418, 0x7c4dff, "void"),
  },
  cozy_den: {
    id: "cozy_den", label: "Cozy Den", emoji: "🏡",
    cssBg: "radial-gradient(800px 600px at 50% 100%, rgba(255,193,7,0.30), transparent 60%), linear-gradient(180deg, #3e2723 0%, #1a0d0a 100%)",
    ambient: { color: 0xffd180, intensity: 0.65 },
    key: { color: 0xffa726 },
    build: mkSimple(0x3e2723, 0xffa726, "warm"),
  },
};

export const HABITAT_LIST: HabitatDef[] = Object.values(HABITATS);
