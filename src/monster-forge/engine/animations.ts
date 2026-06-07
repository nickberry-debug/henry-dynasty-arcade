// Monster Forge — Phase 3 procedural idle animations.
//
// Drives a per-body-type idle motion every frame on top of any baked clip
// the body GLB might ship with:
//
//   biped       → Y bob + small side sway
//   quadruped   → Y bob + breathing scale pulse
//   winged      → vertical hover + wing flap (any child whose name
//                 matches /wing/i rotates sinusoidally)
//   serpentine  → horizontal Y-axis sway + body Z tilt
//   floating    → slow Y oscillation + Z spin

import * as THREE from "three";
import type { BodyType } from "../partsManifest";
import type { AssembledMonster } from "../engine";

export interface IdleAnimator {
  update: (t: number, dt: number) => void;
}

export function buildIdleAnimator(am: AssembledMonster): IdleAnimator {
  const root = am.root;
  const body = am.bodyClone;
  const bodyType = am.bodyType;
  const baseY = root.position.y;
  const baseScaleY = body.scale.y;
  const wingGroups: THREE.Object3D[] = [];
  root.traverse(o => { if (/wing/i.test(o.name)) wingGroups.push(o); });
  const bodyBaseZ = body.rotation.z;
  const phase = Math.random() * Math.PI * 2;

  return {
    update: (t: number, dt: number) => {
      if (am.mixer) am.mixer.update(dt);
      switch (bodyType) {
        case "biped":
          root.position.y = baseY + Math.sin(t * 1.6 + phase) * 0.04;
          root.rotation.z = Math.sin(t * 1.1 + phase) * 0.02;
          break;
        case "quadruped": {
          root.position.y = baseY + Math.sin(t * 2.0 + phase) * 0.03;
          const s = 1 + Math.sin(t * 1.4 + phase) * 0.02;
          body.scale.y = baseScaleY * s;
          break;
        }
        case "winged":
          root.position.y = baseY + Math.sin(t * 2.2 + phase) * 0.15;
          for (const wg of wingGroups) wg.rotation.z = Math.sin(t * 6 + phase) * 0.35;
          break;
        case "serpentine":
          root.rotation.y = Math.sin(t * 1.0 + phase) * 0.08;
          body.rotation.z = bodyBaseZ + Math.sin(t * 1.6 + phase) * 0.06;
          root.position.y = baseY + Math.sin(t * 1.6 + phase) * 0.02;
          break;
        case "floating":
          root.position.y = baseY + Math.sin(t * 0.9 + phase) * 0.12;
          root.rotation.y = t * 0.15;
          break;
      }
    },
  };
}

export const BODY_TYPE_LABEL: Record<BodyType, string> = {
  biped: "Biped", quadruped: "Quadruped", winged: "Winged",
  serpentine: "Serpentine", floating: "Floating",
};
export const BODY_TYPE_EMOJI: Record<BodyType, string> = {
  biped: "🚶", quadruped: "🐾", winged: "🦋", serpentine: "🐍", floating: "👻",
};
