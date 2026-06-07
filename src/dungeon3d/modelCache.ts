// Dungeon 3D — GLTFLoader cache + clone helpers.
//
// Loads each Kenney GLB once, then hands out cheap clones for repeated
// placements. Geometry + materials are shared across clones; only the
// Object3D tree is duplicated, which keeps GPU memory + draw-call cost
// low even with hundreds of tiles placed.
//
// v2.1 (06/26): added the v2 character pack (KayKit Adventurers + Skeletons,
// both CC0 — https://kaylousberg.itch.io/kaykit-adventurers,
// https://kaylousberg.itch.io/kaykit-skeletons).  Behind the
// USE_V2_CHARACTERS feature flag.  The new GLBs are rigged Mixamo-style
// characters with proper idle/walk/run/attack/hit/death clips, replacing
// the blocky Kenney rigs we shipped in v1.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();

/** Load a GLB once; subsequent calls await the same promise. Returns
 *  a fresh clone of the scene each time so callers can position it
 *  independently. Animations are returned as a shared reference (used
 *  with each clone's own AnimationMixer).
 *
 *  v2: switched to SkeletonUtils.clone so skinned meshes (the new
 *  KayKit rigs) animate independently per instance.  Falls back to
 *  Object3D.clone for non-skinned dungeon pieces — SkeletonUtils.clone
 *  works for both, so we use it unconditionally. */
export async function loadModel(url: string): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  if (!cache.has(url)) {
    cache.set(url, loader.loadAsync(url).then(gltf => ({
      scene: gltf.scene,
      animations: gltf.animations,
    })));
  }
  const { scene, animations } = await cache.get(url)!;
  // SkeletonUtils.clone preserves skinning bindings so multiple
  // copies of the same rigged character can animate independently.
  const cloned = skClone(scene);
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

// ── v2.1 character pack feature flag ─────────────────────────────────
//
// Flip to `false` to fall back to the v1 Kenney blocky rigs (still
// staged at the BC URLs below).  When `true`, CHARACTER_MODELS,
// ENEMY_VARIANTS, BOSS_DEFS, and CLASS_DEFS resolve to the v2 GLBs
// in /public/models/v2/ (KayKit Adventurers + Skeletons, CC0).
export const USE_V2_CHARACTERS = true;

const BC = "/assets/kenney/blocky-characters/Models/GLB%20format";
const V2 = "/models/v2";

/** Old Kenney character set, kept for fallback when USE_V2_CHARACTERS=false. */
const KENNEY_CHARACTER_MODELS = {
  player:    `${BC}/character-a.glb`,
  grunt1:    `${BC}/character-h.glb`,
  grunt2:    `${BC}/character-d.glb`,
  grunt3:    `${BC}/character-i.glb`,
  scout1:    `${BC}/character-k.glb`,
  scout2:    `${BC}/character-l.glb`,
  scout3:    `${BC}/character-c.glb`,
  brute1:    `${BC}/character-p.glb`,
  brute2:    `${BC}/character-r.glb`,
  brute3:    `${BC}/character-q.glb`,
  enemy1:    `${BC}/character-h.glb`,
  enemy2:    `${BC}/character-k.glb`,
  enemy3:    `${BC}/character-p.glb`,
} as const;

/** v2 KayKit character set.
 *
 *  Player slot maps to the Knight (warrior); class-specific models are
 *  resolved in the engine via V2_CLASS_MODELS below.  Enemy variants
 *  reuse the four skeleton silhouettes (warrior/rogue/mage/minion) so
 *  the grunt/scout/brute kinds each look distinct.  Bosses pull from
 *  the same skeleton pool (scaled up + tinted in BOSS_DEFS). */
const V2_CHARACTER_MODELS = {
  player:    `${V2}/Knight.glb`,
  grunt1:    `${V2}/Skeleton_Minion.glb`,
  grunt2:    `${V2}/Skeleton_Warrior.glb`,
  grunt3:    `${V2}/Skeleton_Minion.glb`,
  scout1:    `${V2}/Skeleton_Rogue.glb`,
  scout2:    `${V2}/Skeleton_Rogue.glb`,
  scout3:    `${V2}/Skeleton_Minion.glb`,
  brute1:    `${V2}/Skeleton_Warrior.glb`,
  brute2:    `${V2}/Skeleton_Warrior.glb`,
  brute3:    `${V2}/Skeleton_Warrior.glb`,
  enemy1:    `${V2}/Skeleton_Minion.glb`,
  enemy2:    `${V2}/Skeleton_Rogue.glb`,
  enemy3:    `${V2}/Skeleton_Warrior.glb`,
} as const;

export const CHARACTER_MODELS = (USE_V2_CHARACTERS ? V2_CHARACTER_MODELS : KENNEY_CHARACTER_MODELS) as typeof KENNEY_CHARACTER_MODELS;

/** Per-class player model URLs (v2 only).  Falls back to the player
 *  slot when v1 is active. */
export const V2_CLASS_MODELS: Record<"warrior" | "ranger" | "mage", string> = {
  warrior: `${V2}/Knight.glb`,
  ranger:  `${V2}/Rogue.glb`,
  mage:    `${V2}/Mage.glb`,
};

/** Boss model URLs (v2).  Iron Tyrant → Skeleton Warrior, Hexblade →
 *  Skeleton Rogue, Hollowmage → Skeleton Mage.  Scaled + tinted at
 *  spawn (see BOSS_DEFS in engine.ts). */
export const V2_BOSS_MODELS = {
  iron_tyrant: `${V2}/Skeleton_Warrior.glb`,
  hexblade:    `${V2}/Skeleton_Rogue.glb`,
  hollowmage:  `${V2}/Skeleton_Mage.glb`,
} as const;

// Per-kind variant pools used by ensureEnemyMesh to vary enemy silhouettes.
export const ENEMY_VARIANTS = {
  grunt: [CHARACTER_MODELS.grunt1, CHARACTER_MODELS.grunt2, CHARACTER_MODELS.grunt3],
  scout: [CHARACTER_MODELS.scout1, CHARACTER_MODELS.scout2, CHARACTER_MODELS.scout3],
  brute: [CHARACTER_MODELS.brute1, CHARACTER_MODELS.brute2, CHARACTER_MODELS.brute3],
} as const;

// ── v2 character scale calibration ───────────────────────────────────
//
// KayKit rigs are ~1.8 world units tall (vs Kenney's ~1.5).  We previously
// applied a uniform 0.9 to Kenney rigs to make them fit in a 4-unit cell.
// For v2, drop to ~0.55 so the new characters don't tower over walls.
export const V2_PLAYER_SCALE = 0.55;
export const V2_ENEMY_SCALE  = 0.55;
/** Apply this multiplier on top of BOSS_DEFS[kind].scale for v2 bosses. */
export const V2_BOSS_SCALE_MULT = 0.55;

/** v1 Kenney scaling, kept so feature-flag toggle returns to the
 *  exact pre-v2 sizing. */
export const V1_PLAYER_SCALE = 0.9;
export const V1_ENEMY_SCALE  = 0.9;
export const V1_BOSS_SCALE_MULT = 0.9;

export const PLAYER_SCALE = USE_V2_CHARACTERS ? V2_PLAYER_SCALE : V1_PLAYER_SCALE;
export const ENEMY_SCALE  = USE_V2_CHARACTERS ? V2_ENEMY_SCALE  : V1_ENEMY_SCALE;
export const BOSS_SCALE_MULT = USE_V2_CHARACTERS ? V2_BOSS_SCALE_MULT : V1_BOSS_SCALE_MULT;

// ── Animation clip resolver ──────────────────────────────────────────
//
// Both v1 (Kenney) and v2 (KayKit) GLBs ship with multiple animations
// per file under different naming schemes.  This resolver matches by
// regex so the same engine code works against either pack.  Patterns
// are tried in order; first match wins.
export type ClipIntent = "idle" | "walk" | "attack" | "hurt" | "death";

const CLIP_PATTERNS: Record<ClipIntent, RegExp[]> = {
  idle:   [/^idle$/i, /^idle_combat$/i, /idle/i, /breathe/i, /stand/i, /rest/i],
  // Prefer walking over running so locomotion looks calmer in the iso view.
  walk:   [/^walking_a$/i, /^walking_b$/i, /walk/i, /running_a/i, /running_b/i, /run/i, /move/i],
  // 1H_Melee_Attack_Slice_Diagonal is the most "swing-like" clip available
  // across every KayKit rig, so we prefer it; fall back to broader patterns.
  attack: [/1h_melee_attack_slice_diagonal/i, /1h_melee_attack_slice/i, /1h_melee_attack_chop/i, /melee_attack/i, /attack/i, /slash/i, /sword/i, /swing/i, /punch/i, /hit/i],
  // For hurt we want flinches, not death.
  hurt:   [/^hit_a$/i, /^hit_b$/i, /hurt/i, /^hit/i, /damage/i, /react/i, /flinch/i],
  // Prefer Death_A over Death_A_Pose so the clip plays through.
  death:  [/^death_a$/i, /^death_b$/i, /^death$/i, /die$/i, /death/i, /fall/i, /defeat/i],
};

/** Find the best-matching AnimationClip for the requested intent.
 *  Tries each regex pattern in order; returns null if nothing matches. */
export function findClip(
  animations: THREE.AnimationClip[],
  desired: ClipIntent,
): THREE.AnimationClip | null {
  const patterns = CLIP_PATTERNS[desired];
  for (const p of patterns) {
    const found = animations.find(a => p.test(a.name));
    if (found) return found;
  }
  return null;
}

/** Resolve idle / walk / attack / hurt / death clips in one pass. */
export function resolveCharacterClips(animations: THREE.AnimationClip[]): {
  idle:   THREE.AnimationClip | null;
  walk:   THREE.AnimationClip | null;
  attack: THREE.AnimationClip | null;
  hurt:   THREE.AnimationClip | null;
  death:  THREE.AnimationClip | null;
} {
  return {
    idle:   findClip(animations, "idle"),
    walk:   findClip(animations, "walk"),
    attack: findClip(animations, "attack"),
    hurt:   findClip(animations, "hurt"),
    death:  findClip(animations, "death"),
  };
}

/** Preload everything we need at scene boot so the first few frames
 *  don't have to wait for network. Resolves once all critical models
 *  are loaded. Non-critical extras can be loaded lazily.
 *
 *  v2.1: only the chosen class's player GLB is critical; the rest
 *  load lazily on first enemy spawn so a Warrior run doesn't pay the
 *  cost of the Mage / Rogue GLBs. */
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
