// Monster Forge — assembly engine.
//
// HONEST APPROACH NOTES
// ---------------------
// The bodies are real CC0 Quaternius monster GLBs (from poly.pizza). Each is
// a whole-creature with its own bone rig + animations. They do NOT share a
// modular socket scheme, so we use a SOCKET-ATTACH system:
//
//   1. Load the body GLB and measure its world-space bounding box.
//   2. Compute named sockets from the bbox (TOP_OF_HEAD, BACK, REAR, FRONT).
//   3. Accessories are procedural Three.js Group meshes generated at runtime
//      (horns, wings, tails, spikes, eyes). They mount at sockets as
//      children of the body root.
//
// Phase 3: cache *both* scene and AnimationClips, clone via SkeletonUtils
// so skinned meshes survive the clone, and play any baked idle clip the
// body GLB ships with. Procedural body-type idle layers on top.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { MonsterConfig, Manifest, ColorPart, BodyType } from "./partsManifest";

// ── GLTF cache ─────────────────────────────────────────────────────────

interface CachedGLB {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const _glbCache = new Map<string, Promise<CachedGLB>>();
const _loader = new GLTFLoader();

function _loadGLBRaw(url: string): Promise<CachedGLB> {
  let p = _glbCache.get(url);
  if (!p) {
    p = new Promise<CachedGLB>((resolve, reject) => {
      _loader.load(
        url,
        (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations ?? [] }),
        undefined,
        (err) => reject(err),
      );
    });
    _glbCache.set(url, p);
  }
  return p;
}

async function loadGLB(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  const cached = await _loadGLBRaw(url);
  const cloned = skClone(cached.scene) as THREE.Group;
  return { scene: cloned, animations: cached.animations };
}

// ── Color tint helper ──────────────────────────────────────────────────

function tintMonster(root: THREE.Object3D, hex: string | null) {
  if (!hex) return;
  const target = new THREE.Color(hex);
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    const apply = (mat: THREE.Material) => {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.color) {
        std.color.lerp(target, 0.65);
        std.needsUpdate = true;
      }
    };
    if (Array.isArray(m)) m.forEach(apply); else apply(m);
  });
}

// ── Procedural accessory builders ──────────────────────────────────────

const ACCENT = new THREE.MeshStandardMaterial({
  color: 0x2c1810, roughness: 0.6, metalness: 0.1,
});
const SOFT = new THREE.MeshStandardMaterial({
  color: 0xd35400, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
});
const BONE = new THREE.MeshStandardMaterial({
  color: 0xfaf2dc, roughness: 0.7, metalness: 0.0,
});
const EYE_WHITE = new THREE.MeshStandardMaterial({
  color: 0xffffff, roughness: 0.3, metalness: 0.0,
});
const PUPIL = new THREE.MeshStandardMaterial({
  color: 0x111111, roughness: 0.2, metalness: 0.0,
});
const GLOW = new THREE.MeshStandardMaterial({
  color: 0xffeb3b, roughness: 0.2, metalness: 0.0,
  emissive: 0xffc107, emissiveIntensity: 1.5,
});

function hornMesh(material: THREE.Material, height = 0.5, radius = 0.08): THREE.Mesh {
  const g = new THREE.ConeGeometry(radius, height, 12, 1);
  g.translate(0, height / 2, 0);
  return new THREE.Mesh(g, material);
}

export function buildHorns(id: string, bodyHeight: number): THREE.Group {
  const g = new THREE.Group();
  const h = bodyHeight * 0.18;
  switch (id) {
    case "devil": {
      const a = hornMesh(ACCENT, h, 0.06); a.position.set(-0.15, 0, 0);  a.rotation.z =  0.35; g.add(a);
      const b = hornMesh(ACCENT, h, 0.06); b.position.set( 0.15, 0, 0);  b.rotation.z = -0.35; g.add(b);
      break;
    }
    case "ram": {
      for (const side of [-1, 1]) {
        const grp = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const seg = hornMesh(ACCENT, h * 0.45, 0.07 - i * 0.015);
          seg.position.set(0, i * (h * 0.35), 0);
          seg.rotation.z = side * (0.3 + i * 0.3);
          grp.add(seg);
        }
        grp.position.set(side * 0.2, 0, 0);
        g.add(grp);
      }
      break;
    }
    case "unicorn": {
      const c = hornMesh(BONE, h * 1.4, 0.07);
      c.position.set(0, 0, 0.05);
      g.add(c);
      break;
    }
    case "twin": {
      for (const side of [-1, 1]) {
        const m = hornMesh(BONE, h, 0.05);
        m.position.set(side * 0.12, 0, 0);
        g.add(m);
      }
      break;
    }
  }
  return g;
}

export function buildWings(id: string, bodyHeight: number, bodyWidth: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "wing";
  if (id === "none") return g;
  const span = bodyHeight * 0.9;
  void bodyWidth;
  switch (id) {
    case "bat": {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(span, 0.2 * span);
      shape.lineTo(span * 0.8, -0.4 * span);
      shape.lineTo(span * 0.5, -0.1 * span);
      shape.lineTo(span * 0.4, -0.5 * span);
      shape.lineTo(0, -0.2 * span);
      shape.lineTo(0, 0);
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), ACCENT.clone());
        m.scale.x = side; m.position.set(side * 0.05, 0, 0); m.rotation.y = side * 0.2;
        g.add(m);
      }
      break;
    }
    case "feathered": {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const len = span * (0.55 - i * 0.05);
          const feather = new THREE.Mesh(
            new THREE.PlaneGeometry(len, 0.12 * span),
            new THREE.MeshStandardMaterial({ color: 0xfff8e7, side: THREE.DoubleSide, roughness: 0.6 }),
          );
          feather.position.set(side * (i * 0.05 + 0.1), -i * 0.05, 0);
          feather.rotation.y = side * (Math.PI / 2 - i * 0.06);
          feather.rotation.z = side * (-0.2 - i * 0.06);
          g.add(feather);
        }
      }
      break;
    }
    case "butterfly": {
      const ovalShape = new THREE.Shape();
      ovalShape.absellipse(0.3 * span, 0, 0.4 * span, 0.4 * span, 0, Math.PI * 2, false, 0);
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(
          new THREE.ShapeGeometry(ovalShape),
          new THREE.MeshStandardMaterial({ color: 0xff66cc, side: THREE.DoubleSide, roughness: 0.4, transparent: true, opacity: 0.92 }),
        );
        m.scale.x = side; g.add(m);
      }
      break;
    }
    case "dragon": {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(span * 1.2, span * 0.3);
      shape.lineTo(span * 1.05, -span * 0.2);
      shape.lineTo(span * 0.6, span * 0.1);
      shape.lineTo(span * 0.4, -span * 0.4);
      shape.lineTo(0, -span * 0.1);
      shape.lineTo(0, 0);
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x4a2a6b, side: THREE.DoubleSide, roughness: 0.55 }));
        m.scale.x = side; m.rotation.y = side * 0.3;
        g.add(m);
      }
      break;
    }
  }
  return g;
}

export function buildTail(id: string, bodyHeight: number): THREE.Group {
  const g = new THREE.Group();
  if (id === "none") return g;
  const len = bodyHeight * 0.7;
  switch (id) {
    case "spike": {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, len, 10), ACCENT);
      c.rotation.x = Math.PI / 2; c.position.z = -len / 2;
      g.add(c); break;
    }
    case "fluff": {
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.18 - i * 0.02, 12, 8), SOFT);
        s.position.z = -i * 0.16;
        g.add(s);
      }
      break;
    }
    case "lizard": {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.02, len, 12, 1),
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 }),
      );
      seg.rotation.x = Math.PI / 2; seg.position.z = -len / 2;
      g.add(seg);
      break;
    }
    case "fork": {
      for (const side of [-0.15, 0.15]) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.06, len * 0.7, 8), ACCENT);
        s.rotation.x = Math.PI / 2; s.position.set(side, 0, -len * 0.4);
        g.add(s);
      }
      break;
    }
  }
  return g;
}

export function buildSpikes(id: string, bodyHeight: number, bodyLength: number): THREE.Group {
  const g = new THREE.Group();
  if (id === "none") return g;
  const spikeMat = ACCENT;
  const spike = (h: number, r: number) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), spikeMat);
    return m;
  };
  switch (id) {
    case "row": {
      for (let i = 0; i < 5; i++) {
        const s = spike(bodyHeight * 0.18, 0.06);
        s.position.set(0, 0, -bodyLength * 0.25 + i * (bodyLength * 0.125));
        g.add(s);
      }
      break;
    }
    case "crown": {
      const r = 0.25;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const s = spike(bodyHeight * 0.18, 0.05);
        s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        s.rotation.z = Math.sin(a) * 0.4;
        s.rotation.x = Math.cos(a) * 0.4;
        g.add(s);
      }
      break;
    }
    case "full": {
      for (let i = 0; i < 9; i++) {
        const s = spike(bodyHeight * (0.22 - Math.abs(i - 4) * 0.025), 0.06);
        s.position.set(0, 0, -bodyLength * 0.35 + i * (bodyLength * 0.087));
        g.add(s);
      }
      break;
    }
  }
  return g;
}

export function buildEyes(id: string, bodyHeight: number): THREE.Group {
  const g = new THREE.Group();
  const r = bodyHeight * 0.07;
  const eyeBall = (mat: THREE.Material, scale = 1) => {
    const e = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 16, 12), mat);
    e.add(white);
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * scale * 0.45, 10, 8), PUPIL);
    p.position.z = r * scale * 0.65;
    e.add(p);
    return e;
  };
  switch (id) {
    case "normal": {
      const l = eyeBall(EYE_WHITE); l.position.set(-r * 1.4, 0, r);
      const rt = eyeBall(EYE_WHITE); rt.position.set( r * 1.4, 0, r);
      g.add(l, rt); break;
    }
    case "angry": {
      const l = eyeBall(EYE_WHITE); l.position.set(-r * 1.4, 0, r); l.rotation.z =  0.4;
      const rt = eyeBall(EYE_WHITE); rt.position.set( r * 1.4, 0, r); rt.rotation.z = -0.4;
      g.add(l, rt);
      for (const side of [-1, 1]) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, r * 0.3, r * 0.2), ACCENT);
        brow.position.set(side * r * 1.4, r * 1.1, r);
        brow.rotation.z = side * 0.5;
        g.add(brow);
      }
      break;
    }
    case "cute": {
      const l = eyeBall(EYE_WHITE, 1.3); l.position.set(-r * 1.6, 0, r);
      const rt = eyeBall(EYE_WHITE, 1.3); rt.position.set( r * 1.6, 0, r);
      g.add(l, rt); break;
    }
    case "cyclops": {
      g.add(eyeBall(EYE_WHITE, 1.8)); break;
    }
    case "three": {
      g.add(eyeBall(EYE_WHITE));
      (g.children[0] as THREE.Group).position.set(0, r * 1.4, r);
      const l = eyeBall(EYE_WHITE); l.position.set(-r * 1.5, -r * 0.3, r); g.add(l);
      const rt = eyeBall(EYE_WHITE); rt.position.set( r * 1.5, -r * 0.3, r); g.add(rt);
      break;
    }
    case "glow": {
      const l = eyeBall(GLOW); l.position.set(-r * 1.4, 0, r);
      const rt = eyeBall(GLOW); rt.position.set( r * 1.4, 0, r);
      g.add(l, rt); break;
    }
  }
  return g;
}

// ── Head socket helper ─────────────────────────────────────────────────
// Bug fix: previously head accessories used `bbox.max.y` as the anchor — but
// for winged/serpentine/floating bodies the bbox top captures wings/tendrils
// well above the actual head crown, so accessories float in mid-air.
//
// Strategy: prefer the position of a named "Head_End"/"head_top" bone (the
// tip of the skull in Quaternius rigs). Fall back to ~92% of body height,
// which empirically lands on the head for the bodies that lack a tip bone.
export function findHeadTipBone(body: THREE.Object3D): THREE.Object3D | null {
  let exactTip: THREE.Object3D | null = null;
  let headBase: THREE.Object3D | null = null;
  body.traverse((o) => {
    if (!o.name) return;
    const n = o.name.toLowerCase();
    if (n === "head_end" || n === "head_top" || n === "headtop" || n === "head_tip" || n === "headend") {
      exactTip ??= o;
    } else if (n === "head") {
      headBase ??= o;
    }
  });
  return exactTip ?? headBase;
}

/**
 * Compute the world-space Y coordinate to anchor "on-head" accessories
 * (horns, hats, head overlays, top-mutation spikes/crowns).
 * Caller must have already called body.updateMatrixWorld(true).
 */
export function computeHeadSocketY(body: THREE.Object3D, bbox: THREE.Box3): number {
  const size = new THREE.Vector3(); bbox.getSize(size);
  // Bbox-based fallback — always at least this high, so accessories can never
  // be buried inside the body (e.g. Mushnub where the "Head" bone is in the
  // middle of the stem under the cap).
  const fallbackY = bbox.min.y + size.y * 0.92;
  const bone = findHeadTipBone(body);
  if (bone) {
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    // If the bone is named "Head_End/top/tip", treat its position as authoritative.
    // Otherwise it's likely the head BASE — nudge up by ~12% of body height.
    const isTip = /end|top|tip/i.test(bone.name);
    const bonedY = isTip ? worldPos.y : worldPos.y + size.y * 0.12;
    // Never below the bbox fallback — bodies whose head bone lies inside
    // the mesh (Mushnub) would otherwise bury the accessory.
    return Math.max(bonedY, fallbackY);
  }
  return fallbackY;
}

// ── Build a full monster (returns a Group) ─────────────────────────────

export interface AssembledMonster {
  root: THREE.Group;
  bodyClone: THREE.Group;
  bbox: THREE.Box3;
  /** Animation mixer if the body has clips. Caller must update it each frame. */
  mixer: THREE.AnimationMixer | null;
  /** Phase 3 — body animation clips. */
  animations: THREE.AnimationClip[];
  /** Phase 3 — body archetype, drives procedural idle when no baked clip. */
  bodyType: BodyType;
  bodyHeight: number;
  bodyWidth: number;
}

export async function assembleMonster(
  cfg: MonsterConfig,
  manifest: Manifest,
): Promise<AssembledMonster> {
  const bodyDef = manifest.parts.body.find(b => b.id === cfg.body) ?? manifest.parts.body[0];
  const headDef = manifest.parts.headOverlay.find(h => h.id === cfg.headOverlay);
  const colorDef: ColorPart | undefined = manifest.parts.colors.find(c => c.id === cfg.color);

  const root = new THREE.Group();
  root.name = "monster-root";

  // 1) Body — SkeletonUtils.clone so skinned meshes survive
  const { scene: body, animations } = await loadGLB(bodyDef.file);
  body.name = "body";
  body.scale.setScalar(bodyDef.scale);
  body.traverse(o => { if ((o as THREE.Mesh).isMesh) {
    (o as THREE.Mesh).castShadow = true;
    (o as THREE.Mesh).receiveShadow = true;
  } });

  // 2) Tint
  if (colorDef?.hex) tintMonster(body, colorDef.hex);
  root.add(body);

  // 3) Measure bbox for sockets
  body.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(body);
  const size = new THREE.Vector3(); bbox.getSize(size);
  const center = new THREE.Vector3(); bbox.getCenter(center);
  const bodyHeight = Math.max(size.y, 0.5);

  const targetHeight = 1.6;
  const scale = targetHeight / bodyHeight;
  body.scale.multiplyScalar(scale);
  body.updateMatrixWorld(true);
  bbox.setFromObject(body);
  bbox.getSize(size);
  bbox.getCenter(center);

  body.position.y -= bbox.min.y;
  body.updateMatrixWorld(true);
  bbox.setFromObject(body);
  bbox.getSize(size);
  bbox.getCenter(center);

  // 4) Sockets
  const topY    = bbox.max.y;
  const headY   = computeHeadSocketY(body, bbox); // on-head anchor (see helper above)
  const midY    = center.y + size.y * 0.18;
  const rearZ   = bbox.min.z;
  const frontZ  = bbox.max.z;
  const bodyMidZ = center.z;

  // 5) Head overlay
  if (headDef && headDef.kind === "glb" && headDef.file) {
    const { scene: hover } = await loadGLB(headDef.file);
    hover.scale.setScalar((headDef.scale ?? 0.5) * scale);
    // Per-accessory offsetY (manifest opt-in; default 0). Antlers may extend
    // up, a crown sits flat — overlay authors can dial it in.
    const offsetY = (headDef.offsetY ?? 0) * size.y;
    hover.position.set(center.x, headY + offsetY, bodyMidZ);
    hover.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    root.add(hover);
  }

  // 6) Procedural accessories
  const horns = buildHorns(cfg.horns, size.y);
  horns.position.set(center.x, headY, bodyMidZ);
  horns.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  root.add(horns);

  const wings = buildWings(cfg.wings, size.y, size.x);
  wings.position.set(center.x, midY, rearZ);
  wings.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  root.add(wings);

  const tail = buildTail(cfg.tail, size.y);
  tail.position.set(center.x, center.y, rearZ);
  tail.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  root.add(tail);

  const spikes = buildSpikes(cfg.spikes, size.y, size.z);
  spikes.position.set(center.x, topY * 0.92, bodyMidZ);
  spikes.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  root.add(spikes);

  const eyes = buildEyes(cfg.eyes, size.y);
  eyes.position.set(center.x, topY - size.y * 0.12, frontZ * 0.6);
  eyes.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  root.add(eyes);

  // 7) Animation mixer — Phase 3: play baked idle clip if available
  let mixer: THREE.AnimationMixer | null = null;
  if (animations.length > 0) {
    mixer = new THREE.AnimationMixer(body);
    const idle = animations.find(c => /idle|rest|stand/i.test(c.name)) ?? animations[0];
    if (idle) {
      const action = mixer.clipAction(idle);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    }
  }
  const bodyType: BodyType = bodyDef.bodyType ?? "biped";
  return {
    root, bodyClone: body, bbox, mixer, animations, bodyType,
    bodyHeight: size.y, bodyWidth: size.x,
  };
}

// ── Save / load (per-profile localStorage) ─────────────────────────────

import { profileKey } from "../profiles/store";
import type { SavedMonster } from "./partsManifest";
import { baseStatsFor } from "./engine/stats";

const SAVE_KEY = "henry-monster-forge-monsters-v1";

export function loadSaved(): SavedMonster[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(profileKey(SAVE_KEY));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isSavedMonsterLoose).map(normalize);
  } catch { return []; }
}

function isSavedMonsterLoose(v: unknown): v is Partial<SavedMonster> {
  if (!v || typeof v !== "object") return false;
  const m = v as SavedMonster;
  return typeof m.id === "string" && typeof m.name === "string"
    && !!m.config && typeof m.config.body === "string";
}

function normalize(raw: Partial<SavedMonster>): SavedMonster {
  const config = raw.config!;
  const activePotions = Array.isArray(raw.activePotions)
    ? raw.activePotions.filter((s): s is string => typeof s === "string")
    : [];
  const stats = raw.stats && typeof raw.stats === "object"
    ? raw.stats
    : baseStatsFor(config.body);
  return {
    id: raw.id!,
    name: raw.name!,
    config,
    activePotions,
    stats,
    record: raw.record,
    habitat: raw.habitat,
    sizeMul: raw.sizeMul,
    evolved: raw.evolved,
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

export function saveAll(list: SavedMonster[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(profileKey(SAVE_KEY), JSON.stringify(list)); }
  catch { /* quota or private mode — silently ignore */ }
}

export function upsertMonster(m: SavedMonster) {
  const list = loadSaved();
  const i = list.findIndex(x => x.id === m.id);
  if (i >= 0) list[i] = m; else list.push(m);
  saveAll(list);
}

export function deleteMonster(id: string) {
  saveAll(loadSaved().filter(m => m.id !== id));
}

export function newId(): string {
  return "m_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
