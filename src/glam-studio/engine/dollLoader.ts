// Glam Studio — base-doll GLTF loader.
//
// Mirrors the Monster Forge approach: cache GLBs by URL and return a deep
// clone of the scene so multiple builders (or tab switches) don't share
// transforms. SkinnedMesh.clone() does the right thing in Three r184 —
// it rebinds the cloned mesh to a cloned skeleton, so animations on the
// clone don't drag the cached original around.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// SkeletonUtils.clone preserves SkinnedMesh -> Skeleton bindings so animations
// on the clone don't drag the cached original around. Matches the pattern
// used by src/dungeon3d/modelCache.ts.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — three's SkeletonUtils ships JS without an accompanying .d.ts
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";

export interface LoadedDoll {
  root: THREE.Group;                  // freshly-cloned scene root
  animations: THREE.AnimationClip[];  // shared clips (safe — we use AnimationMixer per-doll)
  bbox: THREE.Box3;                   // world-space bbox of the cloned root
  sockets: Record<SocketName, THREE.Vector3>;
  skinnedMeshes: THREE.SkinnedMesh[]; // for tint / material swap
  headBone?: THREE.Bone;              // best-guess "head" bone for hair attachment
}

export type SocketName = "head" | "face" | "ears_l" | "ears_r" | "neck" | "chest";

// ── cache ────────────────────────────────────────────────────────────

interface CacheEntry { scene: THREE.Group; animations: THREE.AnimationClip[]; }
const _cache = new Map<string, Promise<CacheEntry>>();
const _loader = new GLTFLoader();

function loadRaw(url: string): Promise<CacheEntry> {
  let p = _cache.get(url);
  if (!p) {
    p = new Promise<CacheEntry>((resolve, reject) => {
      _loader.load(
        url,
        (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations ?? [] }),
        undefined,
        (err) => reject(err),
      );
    });
    _cache.set(url, p);
  }
  return p;
}

export async function loadDoll(url: string): Promise<LoadedDoll> {
  const entry = await loadRaw(url);
  // SkeletonUtils.clone preserves SkinnedMesh -> Skeleton bindings so
  // animations on the clone don't tug the cached original.
  const root = skClone(entry.scene) as THREE.Group;

  // Quaternius women import as ~2m tall. Normalise display so any pack we
  // adopt later still fits the camera frame.
  // (We don't change the original cached scene scale — only the clone.)
  root.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(root);
  const size = bbox.getSize(new THREE.Vector3());
  if (size.y > 0 && Math.abs(size.y - 1.8) > 0.5) {
    const targetHeight = 1.8;
    const k = targetHeight / size.y;
    root.scale.multiplyScalar(k);
    root.updateMatrixWorld(true);
    bbox.setFromObject(root);
  }

  // Centre horizontally, plant feet on y=0.
  const centre = bbox.getCenter(new THREE.Vector3());
  root.position.x -= centre.x;
  root.position.z -= centre.z;
  root.position.y -= bbox.min.y;
  root.updateMatrixWorld(true);
  bbox.setFromObject(root);

  // Collect skinned meshes for later tint operations.
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  let headBone: THREE.Bone | undefined;
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      skinnedMeshes.push(o as THREE.SkinnedMesh);
    }
    if ((o as THREE.Bone).isBone) {
      const n = (o.name || "").toLowerCase();
      if (!headBone && (n === "head" || n.endsWith("head") || n.includes("head"))) {
        headBone = o as THREE.Bone;
      }
    }
  });

  return {
    root,
    animations: entry.animations,
    bbox,
    sockets: computeSocketsFromBBox(bbox),
    skinnedMeshes,
    headBone,
  };
}

// ── sockets ──────────────────────────────────────────────────────────
// Cheap-and-cheerful: derive everything from the world-space bbox so the
// solution works whether or not the asset ships with named bones.

export function computeSocketsFromBBox(bbox: THREE.Box3): Record<SocketName, THREE.Vector3> {
  const min = bbox.min, max = bbox.max;
  const cx = (min.x + max.x) / 2;
  const cz = (min.z + max.z) / 2;
  const height = max.y - min.y;
  const width  = max.x - min.x;

  // Quaternius women are head-up-along-Y; head occupies the top ~14% of the
  // bbox. These ratios were calibrated against woman_dress.glb visually.
  const headY     = min.y + height * 0.92;
  const faceY     = min.y + height * 0.88;
  const earY      = min.y + height * 0.88;
  const neckY     = min.y + height * 0.80;
  const chestY    = min.y + height * 0.68;

  const earOffsetX = width * 0.16;
  const faceOffsetZ = width * 0.22; // slightly in front of the face

  return {
    head:   new THREE.Vector3(cx,                 headY,  cz),
    face:   new THREE.Vector3(cx,                 faceY,  cz + faceOffsetZ),
    ears_l: new THREE.Vector3(cx - earOffsetX,    earY,   cz),
    ears_r: new THREE.Vector3(cx + earOffsetX,    earY,   cz),
    neck:   new THREE.Vector3(cx,                 neckY,  cz),
    chest:  new THREE.Vector3(cx,                 chestY, cz),
  };
}

// ── tinting ──────────────────────────────────────────────────────────
// Apply an additive colour blend to all skinned meshes — used by skin tint
// and by hair color when hair is procedural. We clone the material on first
// touch so we don't mutate the cached GLTF material.

export function tintSkinnedMeshes(meshes: THREE.SkinnedMesh[], hex: string | null) {
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const raw of mats) {
      const mat = raw as THREE.MeshStandardMaterial;
      if (!mat.userData.glamCloned) {
        const cloned = mat.clone();
        cloned.userData.glamCloned = true;
        cloned.userData.glamOriginalColor = (mat.color ?? new THREE.Color(0xffffff)).getHex();
        if (Array.isArray(m.material)) {
          const idx = m.material.indexOf(mat);
          if (idx >= 0) m.material[idx] = cloned;
        } else {
          m.material = cloned;
        }
      }
    }
    const finalMats = Array.isArray(m.material) ? m.material : [m.material];
    for (const raw of finalMats) {
      const mat = raw as THREE.MeshStandardMaterial;
      if (hex) {
        // multiply: apply tint as a soft overlay so the original outfit
        // textures still read through.
        const original = mat.userData.glamOriginalColor as number ?? 0xffffff;
        const tint = new THREE.Color(hex);
        const base = new THREE.Color(original);
        mat.color = base.clone().lerp(tint, 0.6);
      } else {
        const original = mat.userData.glamOriginalColor as number ?? 0xffffff;
        mat.color = new THREE.Color(original);
      }
    }
  }
}

// ── disposal ─────────────────────────────────────────────────────────

export function disposeDoll(d: LoadedDoll) {
  // IMPORTANT: do NOT dispose geometries here. SkeletonUtils.clone shares
  // BufferGeometries by reference with the cached source GLB. Calling
  // geometry.dispose() releases the GPU buffer that the *cache* still
  // hands out on every subsequent loadDoll() — so swapping outfits would
  // start rendering zombie / blank meshes. The cache holds geometries for
  // the lifetime of the page; that's the intended ownership.
  // Only dispose materials we explicitly cloned (tagged glamCloned).
  d.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.material) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if ((mat as THREE.Material).userData?.glamCloned) (mat as THREE.Material).dispose();
      }
    }
  });
}
