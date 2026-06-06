// Dungeon 3D — GLTFLoader cache + clone helpers.
//
// Loads each Kenney GLB once, then hands out cheap clones for repeated
// placements. Geometry + materials are shared across clones; only the
// Object3D tree is duplicated, which keeps GPU memory + draw-call cost
// low even with hundreds of tiles placed.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();

/** Load a GLB once; subsequent calls await the same promise. Returns
 *  a fresh clone of the scene each time so callers can position it
 *  independently. Animations are returned as a shared reference (used
 *  with each clone's own AnimationMixer). */
export async function loadModel(url: string): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  if (!cache.has(url)) {
    cache.set(url, loader.loadAsync(url).then(gltf => ({
      scene: gltf.scene,
      animations: gltf.animations,
    })));
  }
  const { scene, animations } = await cache.get(url)!;
  // SkeletonUtils.clone preserves skinning; for now most dungeon
  // pieces are static, so plain clone(true) is enough.
  const cloned = scene.clone(true);
  // Walk the clone and prepare materials for our scene (shadow casting).
  cloned.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return { scene: cloned, animations };
}

/** Discard everything we've loaded (used when the dungeon scene
 *  unmounts so memory is reclaimed on iOS where the page can stay
 *  alive in the background). */
export function disposeAllModels() {
  cache.clear();
}

// ── Pre-set model URLs ────────────────────────────────────────────────
//
// Picked from the 39 on-disk GLBs in modular-dungeon-kit. We use only
// a handful of pieces for the Session 1 slice; the full catalog gets
// wired in later sessions when biomes / variety land.

const MD = "/assets/kenney/modular-dungeon-kit/Models/GLB%20format";

export const DUNGEON_MODELS = {
  floor:           `${MD}/template-floor.glb`,
  floorBig:        `${MD}/template-floor-big.glb`,
  floorDetail:     `${MD}/template-floor-detail.glb`,
  wall:            `${MD}/template-wall.glb`,
  wallCorner:      `${MD}/template-wall-corner.glb`,
  wallHalf:        `${MD}/template-wall-half.glb`,
  wallStairs:      `${MD}/template-wall-stairs.glb`,
  wallTop:         `${MD}/template-wall-top.glb`,
  corridor:        `${MD}/corridor.glb`,
  corridorCorner:  `${MD}/corridor-corner.glb`,
  corridorEnd:     `${MD}/corridor-end.glb`,
  roomSmall:       `${MD}/room-small.glb`,
  roomWide:        `${MD}/room-wide.glb`,
  roomCorner:      `${MD}/room-corner.glb`,
  stairs:          `${MD}/stairs.glb`,
  stairsWide:      `${MD}/stairs-wide.glb`,
  gate:            `${MD}/gate.glb`,
  gateDoor:        `${MD}/gate-door.glb`,
} as const;

const BC = "/assets/kenney/blocky-characters/Models/GLB%20format";

/** Character GLBs — letters a..r. We use 'a' for the player and a few
 *  others for enemies (tinted via material color tweaks). */
export const CHARACTER_MODELS = {
  player:    `${BC}/character-a.glb`,
  // Three variants per enemy kind so the same kind can look distinctly different
  // when multiple spawn in one dungeon. Picked at spawn time in ensureEnemyMesh.
  grunt1:    `${BC}/character-h.glb`,
  grunt2:    `${BC}/character-d.glb`,
  grunt3:    `${BC}/character-i.glb`,
  scout1:    `${BC}/character-k.glb`,
  scout2:    `${BC}/character-l.glb`,
  scout3:    `${BC}/character-c.glb`,
  brute1:    `${BC}/character-p.glb`,
  brute2:    `${BC}/character-r.glb`,
  brute3:    `${BC}/character-q.glb`,
  // Aliases kept for any legacy code paths still using enemy1/2/3
  enemy1:    `${BC}/character-h.glb`,
  enemy2:    `${BC}/character-k.glb`,
  enemy3:    `${BC}/character-p.glb`,
} as const;

// Per-kind variant pools used by ensureEnemyMesh to vary enemy silhouettes.
export const ENEMY_VARIANTS = {
  grunt: [CHARACTER_MODELS.grunt1, CHARACTER_MODELS.grunt2, CHARACTER_MODELS.grunt3],
  scout: [CHARACTER_MODELS.scout1, CHARACTER_MODELS.scout2, CHARACTER_MODELS.scout3],
  brute: [CHARACTER_MODELS.brute1, CHARACTER_MODELS.brute2, CHARACTER_MODELS.brute3],
} as const;

/** Preload everything we need at scene boot so the first few frames
 *  don't have to wait for network. Resolves once all critical models
 *  are loaded. Non-critical extras can be loaded lazily. */
export async function preloadCriticalModels(): Promise<void> {
  const critical = [
    DUNGEON_MODELS.floor,
    DUNGEON_MODELS.floorBig,
    DUNGEON_MODELS.floorDetail,
    DUNGEON_MODELS.wall,
    DUNGEON_MODELS.wallCorner,
    DUNGEON_MODELS.wallTop,
    DUNGEON_MODELS.stairs,
    DUNGEON_MODELS.gate,
    CHARACTER_MODELS.player,
    CHARACTER_MODELS.enemy1,
  ];
  await Promise.all(critical.map(url => loadModel(url).catch(e => {
    console.warn("[dungeon3d] failed to preload", url, e);
  })));
}

/** Apply a uniform color tint to all meshes in an Object3D tree.
 *  Used to differentiate enemy variants without needing separate models. */
export function tintModel(obj: THREE.Object3D, color: number) {
  obj.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
    const apply = (m: THREE.Material) => {
      const std = m as THREE.MeshStandardMaterial;
      if (std.color) {
        // Clone the material so tinting one instance doesn't affect
        // the shared cached material (which other clones rely on).
        const clone = std.clone();
        clone.color = new THREE.Color(color);
        (mesh as any).material = clone;
      }
    };
    if (Array.isArray(mat)) mat.forEach(apply);
    else if (mat) apply(mat);
  });
}
