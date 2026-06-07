// Monster Forge — Phase 2 visual effects.
//
// Real Three.js implementations of each potion's visual modifier. The builder
// calls `applyPotionsToMonster(am, ids)` after `assembleMonster()` to layer
// scale, tint, glow, material, mutation geometry, and elemental auras onto
// the monster. Aura particles need per-frame animation, so this module
// returns an array of `update(t)` callbacks the render loop must call.

import * as THREE from "three";
import {
  POTIONS_BY_ID,
  type ElementId,
  type MutationId,
} from "../data/potions";
import {
  buildHorns, buildWings, buildSpikes, buildEyes, buildTail,
  type AssembledMonster,
} from "../engine";

// ─── Material helpers ───────────────────────────────────────────────────

export function applyTint(root: THREE.Object3D, hex: string, mix = 0.55) {
  const target = new THREE.Color(hex);
  root.traverse(o => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    const apply = (mat: THREE.Material) => {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.color) {
        std.color.lerp(target, mix);
        std.needsUpdate = true;
      }
    };
    if (Array.isArray(m)) m.forEach(apply); else apply(m);
  });
}

export function applyEmissiveGlow(
  root: THREE.Object3D,
  hex: string,
  intensity = 0.8,
) {
  const color = new THREE.Color(hex);
  root.traverse(o => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    const apply = (mat: THREE.Material) => {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.emissive) {
        std.emissive = color.clone();
        std.emissiveIntensity = intensity;
        std.needsUpdate = true;
      }
    };
    if (Array.isArray(m)) m.forEach(apply); else apply(m);
  });
}

export function applyMaterialMods(
  root: THREE.Object3D,
  mods: { metalness?: number; roughness?: number; transparent?: boolean; opacity?: number },
) {
  root.traverse(o => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    const apply = (mat: THREE.Material) => {
      const std = mat as THREE.MeshStandardMaterial;
      if (mods.metalness !== undefined && std.metalness !== undefined) std.metalness = mods.metalness;
      if (mods.roughness !== undefined && std.roughness !== undefined) std.roughness = mods.roughness;
      if (mods.transparent !== undefined) std.transparent = mods.transparent;
      if (mods.opacity !== undefined) std.opacity = mods.opacity;
      std.needsUpdate = true;
    };
    if (Array.isArray(m)) m.forEach(apply); else apply(m);
  });
}

// ─── Elemental auras ────────────────────────────────────────────────────

interface AuraSpec {
  particleColor: number;
  particleCount: number;
  radius: number;    // multiplier on max(bodyHeight, bodyWidth)
  speed: number;     // radians/sec
  bobAmp: number;
  particleSize: number;
  shape: "sphere" | "rock" | "cone";
  vertical?: boolean; // wind/tempest sweep vertically too
}

const AURA_SPECS: Record<ElementId, AuraSpec> = {
  fire:    { particleColor: 0xff6f00, particleCount: 14, radius: 0.55, speed: 1.6, bobAmp: 0.18, particleSize: 0.09, shape: "sphere" },
  ice:     { particleColor: 0x80deea, particleCount: 12, radius: 0.65, speed: 0.6, bobAmp: 0.08, particleSize: 0.07, shape: "cone" },
  spark:   { particleColor: 0xfff176, particleCount: 10, radius: 0.7,  speed: 2.5, bobAmp: 0.22, particleSize: 0.08, shape: "cone" },
  shade:   { particleColor: 0x4a148c, particleCount: 16, radius: 0.55, speed: 0.4, bobAmp: 0.10, particleSize: 0.10, shape: "sphere" },
  toxic:   { particleColor: 0x76ff03, particleCount: 14, radius: 0.55, speed: 0.9, bobAmp: 0.22, particleSize: 0.08, shape: "sphere" },
  aqua:    { particleColor: 0x039be5, particleCount: 12, radius: 0.6,  speed: 1.0, bobAmp: 0.15, particleSize: 0.07, shape: "sphere" },
  earth:   { particleColor: 0x6d4c41, particleCount: 7,  radius: 0.7,  speed: 0.5, bobAmp: 0.0,  particleSize: 0.10, shape: "rock" },
  wind:    { particleColor: 0xeceff1, particleCount: 18, radius: 0.75, speed: 2.0, bobAmp: 0.25, particleSize: 0.06, shape: "sphere", vertical: true },
  steam:   { particleColor: 0xffffff, particleCount: 18, radius: 0.65, speed: 1.3, bobAmp: 0.20, particleSize: 0.10, shape: "sphere", vertical: true },
  plague:  { particleColor: 0x33691e, particleCount: 16, radius: 0.6,  speed: 0.7, bobAmp: 0.15, particleSize: 0.10, shape: "sphere" },
  tempest: { particleColor: 0xfff59d, particleCount: 16, radius: 0.8,  speed: 2.8, bobAmp: 0.30, particleSize: 0.08, shape: "cone", vertical: true },
};

interface AuraUpdate {
  group: THREE.Group;
  update: (t: number) => void;
}

function buildAura(
  element: ElementId,
  bodyHeight: number,
  bodyWidth: number,
  center: THREE.Vector3,
): AuraUpdate {
  const spec = AURA_SPECS[element];
  const g = new THREE.Group();
  const baseRadius = spec.radius * Math.max(bodyHeight, bodyWidth);
  const mat = new THREE.MeshStandardMaterial({
    color: spec.particleColor,
    emissive: spec.particleColor,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.88,
    roughness: 0.4,
    metalness: 0.0,
  });
  const geom =
    spec.shape === "rock"  ? new THREE.IcosahedronGeometry(spec.particleSize, 0) :
    spec.shape === "cone"  ? new THREE.ConeGeometry(spec.particleSize, spec.particleSize * 2.2, 6) :
                             new THREE.SphereGeometry(spec.particleSize, 8, 6);
  const particles: { mesh: THREE.Mesh; phase: number; verticalPhase: number }[] = [];
  for (let i = 0; i < spec.particleCount; i++) {
    const m = new THREE.Mesh(geom, mat);
    particles.push({
      mesh: m,
      phase: (i / spec.particleCount) * Math.PI * 2,
      verticalPhase: Math.random() * Math.PI * 2,
    });
    g.add(m);
  }
  // Center the aura at body center.
  g.position.copy(center);

  const update = (t: number) => {
    for (const p of particles) {
      const a = p.phase + t * spec.speed;
      const yOff = spec.vertical
        ? Math.sin(t * 1.5 + p.verticalPhase) * bodyHeight * 0.4
        : Math.sin(t * 2 + p.verticalPhase) * spec.bobAmp;
      p.mesh.position.set(
        Math.cos(a) * baseRadius,
        yOff,
        Math.sin(a) * baseRadius,
      );
      // Cones tilt outward so they look like flames/sparks pointing outward
      if (spec.shape === "cone") {
        p.mesh.rotation.set(0, -a, Math.PI / 2 + Math.sin(t * 4 + p.verticalPhase) * 0.2);
      }
    }
  };
  return { group: g, update };
}

// ─── Mutations ──────────────────────────────────────────────────────────

interface MutationParts {
  top?: THREE.Group;
  back?: THREE.Group;
  rear?: THREE.Group;
  head?: THREE.Group;
  sides?: THREE.Group[];
}

function buildMutation(
  mutation: MutationId,
  bodyHeight: number,
  bodyWidth: number,
  bodyLength: number,
): MutationParts {
  switch (mutation) {
    case "extra_horns": {
      const top = buildHorns("ram", bodyHeight);
      return { top };
    }
    case "bat_wings":
      return { back: buildWings("bat", bodyHeight, bodyWidth) };
    case "spike_coat": {
      const top = buildSpikes("crown", bodyHeight, bodyLength);
      const back = buildSpikes("row", bodyHeight, bodyLength);
      return { top, back };
    }
    case "extra_eyes": {
      const head = buildEyes("three", bodyHeight * 0.45);
      head.scale.setScalar(0.55);
      return { head };
    }
    case "extra_arms": {
      const sides: THREE.Group[] = [];
      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        const armMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6 });
        const upper = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.06, bodyHeight * 0.45, 10),
          armMat,
        );
        upper.position.set(side * (bodyWidth * 0.35), 0, 0);
        upper.rotation.z = side * Math.PI / 2.4;
        const hand = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.5 }),
        );
        hand.position.set(side * (bodyWidth * 0.55), -bodyHeight * 0.18, 0);
        g.add(upper, hand);
        sides.push(g);
      }
      return { sides };
    }
    case "tail_boost": {
      const rear = buildTail("spike", bodyHeight * 1.4);
      rear.scale.setScalar(1.4);
      return { rear };
    }
    case "demon_aspect": {
      const top = new THREE.Group();
      const horns = buildHorns("devil", bodyHeight);
      const crown = buildSpikes("crown", bodyHeight, bodyLength);
      top.add(horns);
      top.add(crown);
      return { top };
    }
  }
}

// ─── Top-level: apply all potions to an assembled monster ───────────────

export interface AppliedPotions {
  /** Per-frame update callbacks (auras animate). Call each tick. */
  updates: ((t: number) => void)[];
}

export function applyPotionsToMonster(
  am: AssembledMonster,
  potionIds: string[],
): AppliedPotions {
  const updates: ((t: number) => void)[] = [];
  if (potionIds.length === 0) return { updates };

  // Compute body geometry from the bbox (already up to date from assembly).
  const size = new THREE.Vector3();   am.bbox.getSize(size);
  const center = new THREE.Vector3(); am.bbox.getCenter(center);
  const bodyHeight = Math.max(size.y, 0.5);
  const bodyWidth  = Math.max(size.x, 0.5);
  const bodyLength = Math.max(size.z, 0.5);
  const topY    = am.bbox.max.y;
  const midY    = center.y + size.y * 0.18;
  const rearZ   = am.bbox.min.z;
  const frontZ  = am.bbox.max.z;
  const bodyMidZ = center.z;

  // Apply effects in a deterministic order: material/glow/tint first
  // (so later ones can override), then scale (so geometry positions are
  // computed at original size), then mutations + auras.
  for (const pid of potionIds) {
    const p = POTIONS_BY_ID[pid];
    if (!p) continue;
    const eff = p.effect;
    if (eff.tintHex)  applyTint(am.bodyClone, eff.tintHex);
    if (eff.glowHex)  applyEmissiveGlow(am.bodyClone, eff.glowHex, eff.glowIntensity ?? 0.8);
    if (eff.material) applyMaterialMods(am.bodyClone, eff.material);
  }

  // Mutations — placed in original (unscaled) coords. Add to root so they
  // scale together with the body when we scale the root later.
  for (const pid of potionIds) {
    const eff = POTIONS_BY_ID[pid]?.effect;
    if (!eff?.mutation) continue;
    const parts = buildMutation(eff.mutation, bodyHeight, bodyWidth, bodyLength);
    const tagMesh = (g: THREE.Group) => {
      g.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    };
    if (parts.top)  { parts.top.position.set(center.x, topY,        bodyMidZ);                tagMesh(parts.top);  am.root.add(parts.top); }
    if (parts.back) { parts.back.position.set(center.x, midY,       rearZ);                   tagMesh(parts.back); am.root.add(parts.back); }
    if (parts.rear) { parts.rear.position.set(center.x, center.y,   rearZ);                   tagMesh(parts.rear); am.root.add(parts.rear); }
    if (parts.head) { parts.head.position.set(center.x, topY - size.y * 0.12, frontZ * 0.6); tagMesh(parts.head); am.root.add(parts.head); }
    if (parts.sides) for (const s of parts.sides) { s.position.set(center.x, midY, bodyMidZ); tagMesh(s); am.root.add(s); }
  }

  // Auras — particles orbit at body center. Add to root so they scale too.
  for (const pid of potionIds) {
    const eff = POTIONS_BY_ID[pid]?.effect;
    if (!eff?.aura) continue;
    const aura = buildAura(eff.aura, bodyHeight, bodyWidth, center);
    am.root.add(aura.group);
    updates.push(aura.update);
  }

  // Size — multiplies onto root scale. Multiple size potions chain.
  let scale = 1;
  for (const pid of potionIds) {
    const eff = POTIONS_BY_ID[pid]?.effect;
    if (eff?.scaleMul) scale *= eff.scaleMul;
  }
  if (scale !== 1) am.root.scale.multiplyScalar(scale);

  return { updates };
}
