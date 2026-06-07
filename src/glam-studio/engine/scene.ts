// Glam Studio — Three.js scene controller.
//
// Owns the renderer / camera / lights / animation loop. The Builder UI
// (React) calls into this controller via the GlamScene class — no React
// state lives down here. We hand the controller a canvas DOM node and a
// config, it updates the 3D world.
//
// Lifecycle:
//   const scene = new GlamScene(canvas);
//   scene.mount();
//   await scene.apply(config);   // call every time user changes anything
//   scene.unmount();             // on React unmount

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  loadDoll, tintSkinnedMeshes, disposeDoll,
  type LoadedDoll,
} from "./dollLoader";
import { makeHair, disposeGroup } from "./hair";
import { makeAccessory, disposeAccessoryGroup } from "./accessories";
import { createMakeupOverlay, type MakeupOverlay } from "./makeup";
import {
  BASE_DOLLS, HAIR_COLORS, SKIN_TINTS, LIP_COLORS, EYESHADOW_COLORS, BLUSH_COLORS,
  ACCESSORIES, POSES,
  type GlamConfig,
} from "../data/manifest";

function hexById(arr: { id: string; hex: string }[], id: string): string | null {
  const e = arr.find(x => x.id === id);
  if (!e || !e.hex) return null;
  if (e.hex === "#00000000") return null;
  return e.hex;
}

export class GlamScene {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private resizeObs?: ResizeObserver;

  private doll?: LoadedDoll;
  private hairGroup?: THREE.Group;
  private accessoryGroup?: THREE.Group;
  private makeupOverlay?: MakeupOverlay;
  private mixer?: THREE.AnimationMixer;
  private currentAction?: THREE.AnimationAction;
  private currentBaseId?: string;
  private mounted = false;

  // Sequence counter — every apply() bumps this and remembers its own seq.
  // After any await inside apply(), we re-check; if a newer apply() has
  // started, the stale call returns without mutating the scene. This
  // prevents the "two doll roots in scene" race that produced visible
  // stacking on iPhone (slower CPU widens the await window).
  private applySeq = 0;
  // All doll roots we've ever added to the scene. disposeCurrentDoll()
  // sweeps any orphans here — belt-and-braces in case a race ever slips
  // past the sequence guard.
  private dollRootsInScene = new Set<THREE.Object3D>();

  // Camera focus mode — "full" shows the whole doll, "face" zooms in for makeup.
  private focusMode: "full" | "face" = "full";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent — UI puts a gradient behind us

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
    this.applyFocus();

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 6.0;
    this.controls.minPolarAngle = Math.PI * 0.15;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, 1.0, 0);

    // Lights
    const hemi = new THREE.HemisphereLight(0xfff1e0, 0x303040, 0.85);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.5, 4.0, 3.0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -1;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc9b6f0, 0.45);
    rim.position.set(-3, 2.5, -2.5);
    this.scene.add(rim);

    // Soft pink floor for grounding
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a1828, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Initial sizing
    this.resize();
    // ResizeObserver keeps the canvas crisp on layout changes.
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.canvas);
    }
    // Animation loop
    this.clock.start();
    const tick = () => {
      if (!this.mounted) return;
      const dt = this.clock.getDelta();
      if (this.mixer) this.mixer.update(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  unmount() {
    this.mounted = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    this.disposeCurrentDoll();
    this.renderer?.dispose();
  }

  private disposeCurrentDoll() {
    if (this.hairGroup) { this.scene.remove(this.hairGroup); disposeGroup(this.hairGroup); this.hairGroup = undefined; }
    if (this.accessoryGroup) { this.scene.remove(this.accessoryGroup); disposeAccessoryGroup(this.accessoryGroup); this.accessoryGroup = undefined; }
    if (this.makeupOverlay) { this.scene.remove(this.makeupOverlay.mesh); this.makeupOverlay.dispose(); this.makeupOverlay = undefined; }
    if (this.mixer) { this.mixer.stopAllAction(); this.mixer = undefined; }
    if (this.doll) {
      this.scene.remove(this.doll.root);
      disposeDoll(this.doll);
      this.dollRootsInScene.delete(this.doll.root);
      this.doll = undefined;
    }
    // Defensive: nuke any orphan doll roots that may have leaked into the
    // scene (e.g. from a pre-fix race). The dollRootsInScene set is the
    // source of truth for every doll we've ever added.
    for (const root of this.dollRootsInScene) {
      this.scene.remove(root);
    }
    this.dollRootsInScene.clear();
    this.currentBaseId = undefined;
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setFocus(mode: "full" | "face") {
    if (this.focusMode === mode) return;
    this.focusMode = mode;
    this.applyFocus();
  }

  private applyFocus() {
    if (this.focusMode === "face") {
      this.camera.position.set(0, 1.65, 1.1);
      this.controls?.target.set(0, 1.6, 0);
      this.controls?.update();
    } else {
      this.camera.position.set(0.8, 1.4, 3.0);
      this.controls?.target.set(0, 1.0, 0);
      this.controls?.update();
    }
  }

  /** Capture the current canvas as a PNG dataURL — used by Save Look. */
  snapshot(): string | null {
    try {
      // Re-render once to flush the latest frame before reading the pixels.
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL("image/png");
    } catch { return null; }
  }

  /** Apply a full config — loads new base GLB if base changed, otherwise patches in place. */
  async apply(cfg: GlamConfig) {
    // Capture our seq token. If a newer apply() begins while we're awaiting
    // anything below, the seq comparison will tell us to bail out so we
    // never double-add a doll root to the scene.
    const seq = ++this.applySeq;

    // ── Base swap ─────────────────────────────────────────────────────
    if (cfg.baseId !== this.currentBaseId) {
      const def = BASE_DOLLS.find(d => d.id === cfg.baseId) ?? BASE_DOLLS[0];
      this.disposeCurrentDoll();
      let loaded: LoadedDoll;
      try { loaded = await loadDoll(def.file); }
      catch (e) { console.error("[glam] loadDoll failed for", def.file, e); return; }
      // If a newer apply() came in while we awaited loadDoll, drop this
      // stale clone. Without this guard, two concurrent apply() calls each
      // add a cloned doll root to the scene — visible stacking on iPhone
      // (slower CPU + WebGL widens the race window).
      if (seq !== this.applySeq) return;
      if (!this.mounted) return;
      // Belt-and-braces: nuke any orphan that slipped in during the race.
      this.disposeCurrentDoll();
      this.doll = loaded;
      this.dollRootsInScene.add(loaded.root);
      // Quaternius women face -Z by default — rotate the doll 180° so her
      // face is on +Z (toward the camera). Without this we see her back
      // with the makeup overlay floating in front like a Cheshire cat face
      // — exactly the "model on top of everything" overlay bug.
      loaded.root.rotation.y = Math.PI;
      // shadows
      loaded.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
      });
      this.scene.add(loaded.root);
      // mixer + initial pose
      this.mixer = new THREE.AnimationMixer(loaded.root);
      this.currentBaseId = cfg.baseId;
    }
    if (!this.doll) return;
    // After this point we're synchronous — hair / accessory / makeup
    // blocks all dispose-then-replace atomically. No further race window
    // within a single apply() invocation.

    // ── Skin tint ─────────────────────────────────────────────────────
    const skinHex = cfg.skinTint === "none" ? null : hexById(SKIN_TINTS, cfg.skinTint);
    tintSkinnedMeshes(this.doll.skinnedMeshes, skinHex);

    // ── Hair ──────────────────────────────────────────────────────────
    if (this.hairGroup) { this.scene.remove(this.hairGroup); disposeGroup(this.hairGroup); this.hairGroup = undefined; }
    const hairHex = hexById(HAIR_COLORS, cfg.hairColor) ?? "#6b3a17";
    const hairScale = this.doll.bbox.getSize(new THREE.Vector3()).x / 0.3;
    const hair = makeHair(cfg.hairStyle, { hex: hairHex, scale: hairScale });
    if (hair.children.length) {
      const socket = this.doll.sockets.head;
      hair.position.copy(socket);
      // Doll is rotated to face +Z (see Base swap above), so the hair
      // group's +Z-facing convention already aligns — no rotation needed.
      this.scene.add(hair);
      this.hairGroup = hair;
    }

    // ── Accessory ─────────────────────────────────────────────────────
    if (this.accessoryGroup) { this.scene.remove(this.accessoryGroup); disposeAccessoryGroup(this.accessoryGroup); this.accessoryGroup = undefined; }
    const accDef = ACCESSORIES.find(a => a.id === cfg.accessory);
    if (accDef && accDef.id !== "none") {
      const ag = makeAccessory(accDef.id);
      let pos: THREE.Vector3;
      switch (accDef.socket) {
        case "head":  pos = this.doll.sockets.head.clone(); break;
        case "face":  pos = this.doll.sockets.face.clone(); break;
        case "ears":  pos = this.doll.sockets.face.clone(); break; // ears centre at face socket; mesh extends to L/R
        case "neck":  pos = this.doll.sockets.neck.clone(); break;
        default: pos = this.doll.sockets.head.clone();
      }
      ag.position.copy(pos);
      this.scene.add(ag);
      this.accessoryGroup = ag;
    }

    // ── Makeup overlay ────────────────────────────────────────────────
    const lipHex = hexById(LIP_COLORS, cfg.lipColor);
    const eyeHex = hexById(EYESHADOW_COLORS, cfg.eyeshadowColor);
    const bluHex = hexById(BLUSH_COLORS, cfg.blushColor);
    const wantMakeup = !!(lipHex || eyeHex || bluHex);
    if (wantMakeup) {
      if (!this.makeupOverlay) {
        this.makeupOverlay = createMakeupOverlay();
        this.scene.add(this.makeupOverlay.mesh);
      }
      this.makeupOverlay.apply({ lipHex, eyeshadowHex: eyeHex, blushHex: bluHex });
      // Position the overlay just in front of the face socket
      this.makeupOverlay.mesh.position.copy(this.doll.sockets.face);
      this.makeupOverlay.mesh.position.y -= 0.04;
      // Push 0.05m in front of the face socket — earlier 0.015 was prone
      // to z-fighting with the head mesh on iOS (where depth precision is
      // tighter).
      this.makeupOverlay.mesh.position.z += 0.05;
      // Plane normal already points +Z; doll now faces +Z (rotated above),
      // so the camera sees the painted side without further rotation.
      this.makeupOverlay.mesh.rotation.set(0, 0, 0);
    } else if (this.makeupOverlay) {
      this.scene.remove(this.makeupOverlay.mesh);
      this.makeupOverlay.dispose();
      this.makeupOverlay = undefined;
    }

    // ── Pose / animation ──────────────────────────────────────────────
    this.playPose(cfg);
  }

  private playPose(cfg: GlamConfig) {
    if (!this.mixer || !this.doll || this.doll.animations.length === 0) return;
    const poseDef = POSES.find(p => p.id === cfg.pose);
    if (!poseDef) return;
    // Fuzzy-match a clip by name.
    let clip: THREE.AnimationClip | undefined;
    for (const hint of poseDef.clipNameHints) {
      clip = this.doll.animations.find(c => (c.name || "").toLowerCase().includes(hint));
      if (clip) break;
    }
    if (!clip) clip = this.doll.animations[0]; // fall back to first
    if (this.currentAction && this.currentAction.getClip() === clip) return;
    if (this.currentAction) this.currentAction.fadeOut(0.2);
    const next = this.mixer.clipAction(clip);
    next.reset().fadeIn(0.2).play();
    this.currentAction = next;
  }
}
