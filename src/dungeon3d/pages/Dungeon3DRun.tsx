// Dungeon 3D â€” main run page.
//
// Three.js scene with an orthographic isometric camera matching the
// Kenney promo render look (high pitch, ~45Â° yaw, soft shadows,
// purple-stone palette). Player + enemies are blocky-characters GLBs;
// dungeon pieces are real Kenney modular-dungeon-kit GLBs.
//
// All viewport + input lessons from the Maze Muncher and 2D crawler
// fixes are applied: DPR-safe, no transform accumulation, dt
// sanitized, touch via onPointerDown + onTouchStart with
// touchAction:none, virtual joystick + attack button, keyboard WASD.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, RotateCcw, Trophy, Skull, Coins, Swords, Sparkles, Zap, Hand, Backpack } from "lucide-react";
import * as THREE from "three";
import {
  newGame, step, descendLevel, CELL, COLS, ROWS, WORLD_W, WORLD_H,
  isCellVisible,
  CLASS_DEFS, RARITY_COLORS, RARITY_HEX, recomputePlayerStats,
  ABILITY_DEFS, META_UNLOCKS, getAbilityDef, applyAbilityChoice,
  type Game, type InputState, type ClassId, type Item, type Rarity,
  type AbilityDef,
} from "../engine";
import {
  loadModel, preloadCriticalModels, DUNGEON_MODELS, CHARACTER_MODELS, ENEMY_VARIANTS, tintModel,
} from "../modelCache";
import { useDungeon3D } from "../store";
import { playSfx, unlockAudio } from "../../art";

// BUILD_STAMP updated automatically by patch â€” confirms which build is live
const BUILD_STAMP = "2026-06-06T23:30:00Z";

// PHASE5_APPLIED — Phase 5 (XP + abilities + meta) ships in this build
// ── Phase 5: localStorage meta progression ────────────────────
//
// Schema: `henry-dungeon-meta-v1` = { shards: number; unlocks: Record<ClassId, string[]> }
// Defensive parse: malformed JSON -> reset to defaults.
const META_KEY = "henry-dungeon-meta-v1";
type MetaState = { shards: number; unlocks: Record<ClassId, string[]> };

function _defaultMeta(): MetaState {
  return { shards: 0, unlocks: { warrior: [], ranger: [], mage: [] } };
}

function loadMeta(): MetaState {
  if (typeof window === "undefined") return _defaultMeta();
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return _defaultMeta();
    const parsed = JSON.parse(raw);
    return {
      shards: typeof parsed?.shards === "number" ? parsed.shards : 0,
      unlocks: {
        warrior: Array.isArray(parsed?.unlocks?.warrior) ? parsed.unlocks.warrior : [],
        ranger:  Array.isArray(parsed?.unlocks?.ranger)  ? parsed.unlocks.ranger  : [],
        mage:    Array.isArray(parsed?.unlocks?.mage)    ? parsed.unlocks.mage    : [],
      },
    };
  } catch {
    return _defaultMeta();
  }
}

function saveMeta(m: MetaState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* quota / private mode */ }
}

export default function Dungeon3DRun() {
  const navigate = useNavigate();
  const dungeon = useDungeon3D();
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Phase 3: game is null until the player picks a class.
  const gameRef = useRef<Game | null>(null);
  const [classChoice, setClassChoice] = useState<ClassId | null>(null);
  // Phase 5: meta progression + level-up modal state.
  const [meta, setMeta] = useState<MetaState>(() => loadMeta());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showSoulForge, setShowSoulForge] = useState(false);
  const [levelUpChoiceIds, setLevelUpChoiceIds] = useState<string[]>([]);
  const [runEndBanner, setRunEndBanner] = useState<{ kills: number; floor: number; shards: number } | null>(null);
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);
  const recordedRef = useRef(false);
  const [loading, setLoading] = useState(true);

  // Input snapshot.
  const inputRef = useRef<InputState>({ ax: 0, az: 0, attack: false, ranged: false, interact: false });
  // Camera tuning recomputed on resize/orientationchange so portrait gets
  // a wider frustum + larger lookAt offset (player stays nicely framed).
  const camTuningRef = useRef({ d: 14, lookAtZ: 1.5 });
  const [viewport, setViewport] = useState({
    w: typeof window === "undefined" ? 0 : window.innerWidth,
    h: typeof window === "undefined" ? 0 : window.innerHeight,
  });
  const keys = useRef({ up: false, down: false, left: false, right: false, attack: false, ranged: false, interact: false });
  const joyRef = useRef<{ active: boolean; cx: number; cy: number; x: number; y: number; id: number | null }>({
    active: false, cx: 0, cy: 0, x: 0, y: 0, id: null,
  });

  useEffect(() => { unlockAudio(); }, []);

  // Recompute camera tuning + viewport badge on resize / orientation change.
  useEffect(() => {
    function recompute() {
      const w = window.innerWidth, h = window.innerHeight;
      const portrait = h > w;
      camTuningRef.current.d = portrait ? 14 * 1.15 : 14;
      camTuningRef.current.lookAtZ = portrait ? 3.0 : 1.5;
      setViewport({ w, h });
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, []);

  // Keyboard wiring.
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "ArrowUp" || e.key === "w") k.up = true;
      else if (e.key === "ArrowDown" || e.key === "s") k.down = true;
      else if (e.key === "ArrowLeft" || e.key === "a") k.left = true;
      else if (e.key === "ArrowRight" || e.key === "d") k.right = true;
      else if (e.key === " " || e.key === "j" || e.key === "Enter") k.attack = true;
      else if (e.code === "KeyF" || e.code === "KeyL") { k.ranged = true; e.preventDefault(); }
      else if (e.code === "KeyE") { k.interact = true; e.preventDefault(); }
    }
    function onUp(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "ArrowUp" || e.key === "w") k.up = false;
      else if (e.key === "ArrowDown" || e.key === "s") k.down = false;
      else if (e.key === "ArrowLeft" || e.key === "a") k.left = false;
      else if (e.key === "ArrowRight" || e.key === "d") k.right = false;
      else if (e.key === " " || e.key === "j" || e.key === "Enter") k.attack = false;
      else if (e.code === "KeyF" || e.code === "KeyL") k.ranged = false;
      else if (e.code === "KeyE") k.interact = false;
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // â”€â”€ THREE.JS SCENE â€” mounted once, never re-created across renders â”€
  //
  // The whole scene lives inside this ref-bound effect. We keep handles
  // to the renderer / camera / scene + the per-frame draw + the level
  // mesh group so a "descend" can swap in a new dungeon without tearing
  // down the renderer.
  const threeRef = useRef<null | {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    playerObj: THREE.Object3D;
    playerMixer: THREE.AnimationMixer | null;
    playerActions: { idle?: THREE.AnimationAction; walk?: THREE.AnimationAction; attack?: THREE.AnimationAction };
    enemyObjs: Map<string, { obj: THREE.Object3D; mixer: THREE.AnimationMixer | null }>;
    dungeonGroup: THREE.Group;
    coinGroup: THREE.Group;
    chestGroup: THREE.Group;
    itemGroup: THREE.Group;
    dispose: () => void;
  }>(null);

  // Build (or rebuild) the dungeon meshes for the current level.
  async function buildDungeon(scene: THREE.Scene, level: Game["level"]): Promise<THREE.Group> {
    const group = new THREE.Group();

    // Load model handles we'll reuse.
    const [floor, floorBig, floorDetail, wall, wallCorner, wallTop, stairs, gate] = await Promise.all([
      loadModel(DUNGEON_MODELS.floor),
      loadModel(DUNGEON_MODELS.floorBig),
      loadModel(DUNGEON_MODELS.floorDetail),
      loadModel(DUNGEON_MODELS.wall),
      loadModel(DUNGEON_MODELS.wallCorner),
      loadModel(DUNGEON_MODELS.wallTop),
      loadModel(DUNGEON_MODELS.stairs),
      loadModel(DUNGEON_MODELS.gate),
    ]);

    // Each Kenney piece is ~4Ã—4 units; pieces are centered at origin
    // with their footprint covering [-2, 2]. We place at grid-cell
    // center (cell_x*CELL + CELL/2 - WORLD_W/2).
    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS; x++) {
        const t = level.grid[z][x];
        if (t === "wall") continue;  // walls below get their own pass

        const wx = (x + 0.5) * CELL - WORLD_W / 2;
        const wz = (z + 0.5) * CELL - WORLD_H / 2;

        // Floor for every walkable cell. Tag with grid coords for
        // fog-of-war reveal in the render loop.
        // Floor variety: occasional floorBig (15%) or floorDetail (10%) for visual interest.
        const _floorPick = Math.random();
        const _floorSrc = _floorPick < 0.10 ? floorDetail : _floorPick < 0.25 ? floorBig : floor;
        const f = _floorSrc.scene.clone(true);
        f.position.set(wx, 0, wz);
        f.userData = { gx: x, gz: z };
        group.add(f);

        if (t === "stairs") {
          const s = stairs.scene.clone(true);
          s.position.set(wx, 0, wz);
          // Tint stairs slightly bluish so they read as a goal.
          tintModel(s, 0x9ec5ff);
          s.userData = { gx: x, gz: z };
          group.add(s);
        }
      }
    }

    // Walls â€” placed AROUND floor cells. We iterate every wall cell that
    // borders a floor and place a flat wall facing inward.
    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS; x++) {
        if (level.grid[z][x] !== "wall") continue;
        const orient = level.wallOrientation.get(`${x},${z}`);
        if (!orient) continue;   // isolated wall, skip
        const wx = (x + 0.5) * CELL - WORLD_W / 2;
        const wz = (z + 0.5) * CELL - WORLD_H / 2;

        const useCorner = orient.startsWith("corner-");
        // Wall variety: 12% of non-corner walls use wallTop for visual interest.
        const _wallPick = Math.random();
        const _wallSrc = useCorner ? wallCorner : (_wallPick < 0.12 ? wallTop : wall);
        const piece = _wallSrc.scene.clone(true);
        piece.position.set(wx, 0, wz);
        // Walls reveal when ANY adjacent floor cell is visible.
        piece.userData = { gx: x, gz: z, isWall: true };

        // Rotate to face the adjacent floor cell.
        // 'n' = floor to the north (z-1); 's'=south; 'e'=east (x+1); 'w'=west (x-1).
        const rotMap: Record<string, number> = {
          "n": 0,
          "e": -Math.PI / 2,
          "s": Math.PI,
          "w": Math.PI / 2,
          "corner-ne": -Math.PI / 2,
          "corner-se": Math.PI,
          "corner-sw": Math.PI / 2,
          "corner-nw": 0,
        };
        piece.rotation.y = rotMap[orient] ?? 0;
        group.add(piece);
      }
    }

    // Gate piece at the spawn for atmosphere.
    {
      const g = gate.scene.clone(true);
      g.position.set(level.spawn.x, 0, level.spawn.z);
      g.rotation.y = Math.PI;
      g.scale.setScalar(0.8);
      group.add(g);
    }

    scene.add(group);
    return group;
  }

  function buildCoinMeshes(scene: THREE.Scene): THREE.Group {
    // Coins use simple geometry (no GLB needed â€” keeps draw calls low).
    const group = new THREE.Group();
    scene.add(group);
    return group;
  }
  function buildChestMeshes(scene: THREE.Scene, level: Game["level"]): THREE.Group {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.0, 0.7, 0.7);
    const mat = new THREE.MeshStandardMaterial({ color: 0xa67c52, roughness: 0.8 });
    const matOpen = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 });
    for (const ch of level.chests) {
      const mesh = new THREE.Mesh(geo, ch.opened ? matOpen : mat);
      mesh.position.set(ch.x, 0.35, ch.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.chest = ch;
      group.add(mesh);
    }
    scene.add(group);
    return group;
  }

  /** Pick first matching animation by name (case-insensitive). */
  function pickClip(clips: THREE.AnimationClip[], names: string[]): THREE.AnimationClip | null {
    for (const wanted of names) {
      const got = clips.find(c => c.name.toLowerCase().includes(wanted.toLowerCase()));
      if (got) return got;
    }
    return clips[0] ?? null;
  }

  async function loadCharacter(url: string, tint?: number): Promise<{ obj: THREE.Object3D; mixer: THREE.AnimationMixer; actions: { idle?: THREE.AnimationAction; walk?: THREE.AnimationAction; attack?: THREE.AnimationAction } }> {
    const { scene: obj, animations } = await loadModel(url);
    if (tint !== undefined) tintModel(obj, tint);
    // Kenney blocky-characters typically come at ~2 units tall â€” fine
    // for our 4-unit cells. No global scale needed.
    const mixer = new THREE.AnimationMixer(obj);
    const idleClip = pickClip(animations, ["idle", "rest", "stand"]);
    const walkClip = pickClip(animations, ["walk", "run", "move"]);
    const attackClip = pickClip(animations, ["attack", "hit", "punch", "swing"]);
    const actions: any = {};
    if (idleClip) { actions.idle = mixer.clipAction(idleClip); actions.idle.play(); }
    if (walkClip) { actions.walk = mixer.clipAction(walkClip); actions.walk.setEffectiveWeight(0); actions.walk.play(); }
    if (attackClip) {
      actions.attack = mixer.clipAction(attackClip);
      actions.attack.setEffectiveWeight(0);
      actions.attack.play();
    }
    return { obj, mixer, actions };
  }

  // Mount the scene on first render. Three.js is heavy, so the
  // container is empty + we render a loading indicator until ready.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    (async () => {
      const container = containerRef.current;
      if (!container) return;
      // Phase 3: don't mount the scene until the player picks a class.
      if (!classChoice) return;
      // Lazily construct the game with the chosen class.
      if (!gameRef.current) {
        const _unlocks = meta.unlocks[classChoice] ?? [];
        gameRef.current = newGame(1, classChoice, _unlocks);
      }

      await preloadCriticalModels();
      if (cancelled) return;

      // â”€â”€ Scene + lighting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x140510);
      scene.fog = new THREE.Fog(0x140510, 30, 65);

      // Soft hemisphere fill + a warm directional sun + a cool fill.
      // Tuned to roughly match the Kenney promo look: purple ambient
      // + a top-down warm light + low fill from the opposite side.
      scene.add(new THREE.AmbientLight(0x6a4a8a, 0.55));
      const sun = new THREE.DirectionalLight(0xffd9b5, 1.05);
      sun.position.set(12, 22, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 60;
      sun.shadow.bias = -0.0008;
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x6080ff, 0.3);
      fill.position.set(-8, 10, -8);
      scene.add(fill);

      // â”€â”€ Camera (orthographic isometric) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // The Kenney promos use a 30-ish degree look-down with slight
      // perspective. We use orthographic to keep the chunky kit pieces
      // looking clean at any screen size. d controls zoom level.
      const aspect = container.clientWidth / container.clientHeight;
      // Pulled back from d=8 to d=14 -- user feedback said too close.
      // Bigger d = more world visible in the orthographic frustum. Portrait
      // multiplies d by 1.15 (see camTuningRef recompute on resize).
      let d = camTuningRef.current.d;
      const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
      // Iso angle: 35.264Â° pitch + 45Â° yaw is the "true" isometric
      // angle. Camera offset proportional to d so the pitch stays
      // consistent as we zoom.
      camera.position.set(18, 22, 18);
      camera.lookAt(0, 0, 0);
      // Initial position is at world origin; the first RAF frame will snap to the
      // player via cameraTargetX/Z. On the very first frame this could flash, but
      // the snap below in rebuildLevel-after-genLevel mitigates it.

      // â”€â”€ Renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
      // touchAction none on the canvas so iOS Safari doesn't scroll
      // the page when the player presses through the joystick area.
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      // â”€â”€ Build initial dungeon + entities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const dungeonGroup = await buildDungeon(scene, gameRef.current!.level);
      if (cancelled) return;
      const coinGroup = buildCoinMeshes(scene);
      const chestGroup = buildChestMeshes(scene, gameRef.current!.level);
      const itemGroup = new THREE.Group();
      scene.add(itemGroup);

      // Player character. Phase 3: model + tint vary by class.
      const _classUrl: Record<ClassId, string> = {
        warrior: CHARACTER_MODELS.player,
        ranger:  "/assets/kenney/blocky-characters/Models/GLB%20format/character-b.glb",
        mage:    "/assets/kenney/blocky-characters/Models/GLB%20format/character-e.glb",
      };
      const _classTint = CLASS_DEFS[classChoice].tint;
      const playerRes = await loadCharacter(_classUrl[classChoice]);
      if (cancelled) return;
      tintModel(playerRes.obj, _classTint);
      playerRes.obj.position.set(gameRef.current!.player.x, 0, gameRef.current!.player.z);
      // Slightly smaller than the dungeon to match the iso scale.
      playerRes.obj.scale.setScalar(0.9);
      scene.add(playerRes.obj);

      // Enemy meshes â€” load on demand and keyed by enemy.id.
      const enemyObjs = new Map<string, { obj: THREE.Object3D; mixer: THREE.AnimationMixer | null }>();
      async function ensureEnemyMesh(eId: string, kind: string, color: number) {
        if (enemyObjs.has(eId)) return;
        // Variant pool per kind â€” each spawn picks randomly so a room of grunts
        // doesn't look like clones. Falls back to first variant if pool missing.
        const _pool = (ENEMY_VARIANTS as Record<string, readonly string[]>)[kind] ?? [CHARACTER_MODELS.enemy1];
        const url = _pool[Math.floor(Math.random() * _pool.length)] ?? CHARACTER_MODELS.enemy1;
        const res = await loadCharacter(url, color);
        if (cancelled) return;
        res.obj.scale.setScalar(0.9);
        scene.add(res.obj);
        enemyObjs.set(eId, { obj: res.obj, mixer: res.mixer });
      }
      // Kick off all enemy loads at once.
      for (const e of gameRef.current!.enemies) {
        const color = e.kind === "brute" ? 0xff7777 : e.kind === "scout" ? 0x77ff77 : 0xff9944;
        await ensureEnemyMesh(e.id, e.kind, color);
      }

      // Snap camera + game target to player so first frame isn't at world origin.
      {
        const _p = gameRef.current!.player;
        const _lookZ = camTuningRef.current.lookAtZ;
        camera.position.set(_p.x + 18, 22, _p.z + 18 + _lookZ);
        camera.lookAt(_p.x, 0, _p.z + _lookZ);
        gameRef.current!.cameraTargetX = _p.x;
        gameRef.current!.cameraTargetZ = _p.z;
      }

      threeRef.current = {
        renderer, scene, camera,
        playerObj: playerRes.obj,
        playerMixer: playerRes.mixer,
        playerActions: { idle: playerRes.actions.idle, walk: playerRes.actions.walk, attack: playerRes.actions.attack },
        enemyObjs,
        dungeonGroup,
        coinGroup,
        chestGroup,
        itemGroup,
        dispose: () => {
          renderer.dispose();
          if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
        },
      };
      setLoading(false);

      // â”€â”€ Game loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      let last = performance.now();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        let dt = (now - last) / 1000;
        if (!Number.isFinite(dt) || dt < 0) dt = 0;
        if (dt > 0.05) dt = 0.05;
        last = now;

        // â”€â”€ Compose input from keyboard + joystick â”€â”€
        const k = keys.current;
        const j = joyRef.current;
        let ax = 0, az = 0;
        if (k.left) ax -= 1;
        if (k.right) ax += 1;
        if (k.up) az -= 1;
        if (k.down) az += 1;
        if (j.active) {
          const jx = j.x - j.cx, jy = j.y - j.cy;
          const r = Math.hypot(jx, jy);
          const max = 40;  // tighter than 50 per iPad feedback
          const t = Math.min(1, r / max);
          if (r > 6) { ax += (jx / r) * t; az += (jy / r) * t; }
        }
        const mag = Math.hypot(ax, az);
        if (mag > 1) { ax /= mag; az /= mag; }
        inputRef.current.ax = ax;
        inputRef.current.az = az;
        inputRef.current.attack = k.attack;
        inputRef.current.ranged = k.ranged;
        inputRef.current.interact = k.interact;

        const g = gameRef.current;
        if (!g) return;
        // Phase 5: pause engine while level-up modal is up.
        if (g.pendingLevelUp && !showLevelUp) {
          setLevelUpChoiceIds(g.levelUpChoices);
          setShowLevelUp(true);
        }
        if (!g.pendingLevelUp && !showLevelUp) {
          step(g, dt, inputRef.current);
        }

        // Resize check.
        const t3 = threeRef.current;
        if (t3) {
          // Re-read d each frame so orientation flips update the frustum.
          const _tuning = camTuningRef.current;
          d = _tuning.d;
          const _curAspect = container.clientWidth / container.clientHeight;
          if (container.clientWidth !== renderer.domElement.width / renderer.getPixelRatio()
            || container.clientHeight !== renderer.domElement.height / renderer.getPixelRatio()
            || camera.top !== d) {
            renderer.setSize(container.clientWidth, container.clientHeight);
            camera.left = -d * _curAspect; camera.right = d * _curAspect;
            camera.top = d; camera.bottom = -d;
            camera.updateProjectionMatrix();
          }

          // Camera follows player at the iso offset. lookAt offset is
          // recomputed on resize/orientation change (portrait gets 3.0,
          // landscape 1.5) so the player stays well-framed above the UI.
          const cam = t3.camera;
          const LOOKAT_Z_OFFSET = _tuning.lookAtZ;
          cam.position.x = g.cameraTargetX + 18;
          cam.position.z = g.cameraTargetZ + 18 + LOOKAT_Z_OFFSET;
          cam.position.y = 22;
          cam.lookAt(g.cameraTargetX, 0, g.cameraTargetZ + LOOKAT_Z_OFFSET);

          // â”€â”€ Fog of war: toggle visibility on each tile mesh based
          //    on whether the player has discovered its cell. Walls
          //    are tagged with `isWall: true` and are revealed when
          //    ANY adjacent floor cell is visible (otherwise the
          //    walls bordering an unvisited room would never show).
          t3.dungeonGroup.traverse(o => {
            const ud = (o as any).userData;
            if (typeof ud?.gx === "number" && typeof ud?.gz === "number") {
              let visible: boolean;
              if (ud.isWall) {
                visible = isCellVisible(g, ud.gx, ud.gz)
                       || isCellVisible(g, ud.gx + 1, ud.gz)
                       || isCellVisible(g, ud.gx - 1, ud.gz)
                       || isCellVisible(g, ud.gx, ud.gz + 1)
                       || isCellVisible(g, ud.gx, ud.gz - 1);
              } else {
                visible = isCellVisible(g, ud.gx, ud.gz);
              }
              o.visible = visible;
            }
          });

          // Update player transform + anim weights.
          t3.playerObj.position.set(g.player.x, 0, g.player.z);
          t3.playerObj.rotation.y = g.player.facing;
          if (t3.playerMixer) t3.playerMixer.update(dt);

          // ── Projectile meshes ──
          if (!(t3 as any).projectileMeshes) {
            (t3 as any).projectileMeshes = new Map<string, THREE.Mesh>();
          }
          const projectileMeshes: Map<string, THREE.Mesh> = (t3 as any).projectileMeshes;
          const liveProjectileIds = new Set<string>();
          for (const pr of g.projectiles) {
            liveProjectileIds.add(pr.id);
            let pmesh = projectileMeshes.get(pr.id);
            if (!pmesh) {
              const pgeo = new THREE.SphereGeometry(0.28, 12, 12);
              const pmat = new THREE.MeshStandardMaterial({
                color: 0x60a5fa,
                emissive: 0x3b82f6,
                emissiveIntensity: 1.0,
              });
              pmesh = new THREE.Mesh(pgeo, pmat);
              t3.scene.add(pmesh);
              projectileMeshes.set(pr.id, pmesh);
            }
            pmesh.position.set(pr.x, 1.0, pr.z);
          }
          for (const [pid, pmesh] of Array.from(projectileMeshes.entries())) {
            if (!liveProjectileIds.has(pid)) {
              t3.scene.remove(pmesh);
              (pmesh.geometry as THREE.BufferGeometry).dispose();
              (pmesh.material as THREE.Material).dispose();
              projectileMeshes.delete(pid);
            }
          }

          // Attack action dominates when attackT > 0; otherwise crossfade idle/walk.
          const isAttacking = g.player.attackT > 0;
          const isWalking = g.player.anim === "walk";
          if (t3.playerActions.attack) {
            const targetAtk = isAttacking ? 1 : 0;
            t3.playerActions.attack.weight = lerp(t3.playerActions.attack.weight, targetAtk, 0.4);
          } else if (isAttacking) {
            // Procedural fallback: rotate rig ±20° as a half-sine pulse across the swing.
            const _atkProg = 1 - (g.player.attackT / g.player.attackDur);
            const _swing = Math.sin(_atkProg * Math.PI) * (20 * Math.PI / 180);
            t3.playerObj.rotation.y = g.player.facing + _swing;
          }
          if (t3.playerActions.idle && t3.playerActions.walk) {
            const atkW = t3.playerActions.attack?.weight ?? 0;
            const remaining = Math.max(0, 1 - atkW);
            const tw = (isWalking ? 1 : 0) * remaining;
            t3.playerActions.walk.weight = lerp(t3.playerActions.walk.weight, tw, 0.2);
            t3.playerActions.idle.weight = Math.max(0, remaining - t3.playerActions.walk.weight);
          }

          // ── Sword swing trail (additive arc, fades over the swing window). ──
          {
            let trailAnchor = (t3 as any).swordTrailAnchor as THREE.Object3D | undefined;
            let trailMat = (t3 as any).swordTrailMat as THREE.MeshBasicMaterial | undefined;
            if (!trailAnchor || !trailMat) {
              const tgeo = new THREE.RingGeometry(0.8, 1.8, 16, 1, Math.PI / 4, Math.PI / 2);
              trailMat = new THREE.MeshBasicMaterial({
                color: 0xfff8c5,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
              });
              const trailMesh = new THREE.Mesh(tgeo, trailMat);
              trailMesh.rotation.x = -Math.PI / 2;  // lay flat in XZ plane
              trailAnchor = new THREE.Object3D();
              trailAnchor.add(trailMesh);
              trailAnchor.visible = false;
              t3.scene.add(trailAnchor);
              (t3 as any).swordTrailAnchor = trailAnchor;
              (t3 as any).swordTrailMat = trailMat;
            }
            if (g.player.attackT > 0) {
              const atkProg = 1 - (g.player.attackT / g.player.attackDur);  // 0→1
              trailAnchor.visible = true;
              trailAnchor.position.set(g.player.x, 1.0, g.player.z);
              // Sweep the arc through ~46° across the swing window.
              trailAnchor.rotation.y = g.player.facing + (atkProg - 0.5) * 0.8;
              trailMat.opacity = (1 - atkProg) * 0.85;
            } else {
              trailAnchor.visible = false;
              trailMat.opacity = 0;
            }
          }
          // Hit-flash overlay on player â€” tint the materials.
          if (g.player.flashT > 0) {
            t3.playerObj.traverse(o => {
              const mesh = o as THREE.Mesh;
              if (!mesh.isMesh) return;
              const m = mesh.material as any;
              if (m && m.emissive) m.emissive.setHex(0xff4444);
            });
          } else {
            t3.playerObj.traverse(o => {
              const mesh = o as THREE.Mesh;
              if (!mesh.isMesh) return;
              const m = mesh.material as any;
              if (m && m.emissive) m.emissive.setHex(0x000000);
            });
          }

          // Update enemies.
          for (const e of g.enemies) {
            const handle = t3.enemyObjs.get(e.id);
            if (!handle) continue;
            handle.obj.position.set(e.x, 0, e.z);
            handle.obj.rotation.y = e.facing;
            // Hide enemies whose current grid cell is not yet revealed.
            const egx = Math.floor((e.x + WORLD_W / 2) / CELL);
            const egz = Math.floor((e.z + WORLD_H / 2) / CELL);
            handle.obj.visible = isCellVisible(g, egx, egz);
            if (handle.mixer) handle.mixer.update(dt);
            if (e.deathT > 0) {
              // Death window: scale Y 1→0.3, fade opacity 1→0 over 0.6s.
              const deathProg = 1 - (e.deathT / 0.6);  // 0→1
              handle.obj.scale.x = 0.9;
              handle.obj.scale.z = 0.9;
              handle.obj.scale.y = 0.9 * lerp(1, 0.3, deathProg);
              handle.obj.traverse(o => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const m = mesh.material as THREE.Material | THREE.Material[];
                const apply = (mm: THREE.Material) => {
                  mm.transparent = true;
                  (mm as any).opacity = 1 - deathProg;
                };
                if (Array.isArray(m)) m.forEach(apply);
                else if (m) apply(m);
              });
            } else {
              handle.obj.scale.setScalar(0.9);
            }
            // Hit-flash.
            if (e.flashT > 0) {
              handle.obj.traverse(o => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const m = mesh.material as any;
                if (m && m.emissive) m.emissive.setHex(0xffffaa);
              });
            } else {
              handle.obj.traverse(o => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const m = mesh.material as any;
                if (m && m.emissive) m.emissive.setHex(0x000000);
              });
            }
          }
          // Remove enemies that fully expired.
          for (const [id, handle] of Array.from(t3.enemyObjs.entries())) {
            if (!g.enemies.find(e => e.id === id)) {
              scene.remove(handle.obj);
              t3.enemyObjs.delete(id);
            }
          }

          // Refresh coins (small spinning gold cylinders).
          // Rebuild the group each frame for simplicity â€” the cost is
          // low since there are usually <20 coins at once.
          while (t3.coinGroup.children.length > 0) {
            t3.coinGroup.remove(t3.coinGroup.children[0]);
          }
          for (const c of g.coins) {
            const mesh = new THREE.Mesh(coinGeom, coinMat);
            mesh.position.set(c.x, c.y, c.z);
            mesh.rotation.x = Math.PI / 2;
            mesh.rotation.y = g.elapsed * 4 + c.id.charCodeAt(2) * 0.3;
            mesh.castShadow = true;
            t3.coinGroup.add(mesh);
          }

          // Refresh chest open state + fog visibility.
          for (let i = 0; i < t3.chestGroup.children.length; i++) {
            const mesh = t3.chestGroup.children[i] as THREE.Mesh;
            const ch = mesh.userData.chest;
            if (ch && ch.opened) {
              (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x6b4a2f);
              mesh.scale.y = 0.6;
              mesh.position.y = 0.21;
            }
            if (ch) {
              const cgx = Math.floor((ch.x + WORLD_W / 2) / CELL);
              const cgz = Math.floor((ch.z + WORLD_H / 2) / CELL);
              mesh.visible = isCellVisible(g, cgx, cgz);
            }
          }

          // ── Phase 4: loot prism meshes — rebuild each frame (low count). ──
          while (t3.itemGroup.children.length > 0) {
            const child = t3.itemGroup.children[0] as THREE.Mesh;
            t3.itemGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            const _mat = child.material as THREE.Material | THREE.Material[] | undefined;
            if (_mat && !Array.isArray(_mat)) _mat.dispose();
            else if (Array.isArray(_mat)) _mat.forEach(m => m.dispose());
          }
          for (const it of g.items) {
            if (it.pickedUp) continue;
            const igeo = new THREE.OctahedronGeometry(0.32, 0);
            const ihex = RARITY_COLORS[it.rarity];
            const imat = new THREE.MeshStandardMaterial({
              color: ihex,
              emissive: ihex,
              emissiveIntensity: 0.85,
              metalness: 0.45,
              roughness: 0.35,
            });
            const imesh = new THREE.Mesh(igeo, imat);
            const _bob = Math.sin(g.elapsed * 2 + it.id.charCodeAt(3) * 0.7) * 0.1;
            imesh.position.set(it.x, 0.85 + _bob, it.z);
            imesh.rotation.y = g.elapsed * 1.2 + it.id.charCodeAt(3) * 0.3;
            imesh.castShadow = true;
            const igx = Math.floor((it.x + WORLD_W / 2) / CELL);
            const igz = Math.floor((it.z + WORLD_H / 2) / CELL);
            imesh.visible = isCellVisible(g, igx, igz);
            t3.itemGroup.add(imesh);
          }

          renderer.render(scene, camera);
        }

        // Trigger React re-render for HUD updates (low-frequency
        // throttle so we don't constantly re-render the React tree).
        force(n => (n + 1) % 1_000_000);

        // â”€â”€ Descend â”€â”€
        if (g.state === "descending") {
          playSfx("powerUp", { volume: 0.5 });
          rebuildLevel(descendLevel(g));
        }
      };

      raf = requestAnimationFrame(loop);
    })();

    // Cleanup.
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      const t3 = threeRef.current;
      if (t3) t3.dispose();
      threeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classChoice]);

  // Rebuild scene contents for a new level (called on descend).
  async function rebuildLevel(nextGame: Game) {
    const t3 = threeRef.current;
    if (!t3) { gameRef.current = nextGame; return; }
    // Remove old dungeon + chests + enemies.
    t3.scene.remove(t3.dungeonGroup);
    t3.scene.remove(t3.chestGroup);
    for (const handle of t3.enemyObjs.values()) t3.scene.remove(handle.obj);
    t3.enemyObjs.clear();

    gameRef.current = nextGame;
    // Reposition player at new spawn (mesh stays mounted).
    t3.playerObj.position.set(nextGame.player.x, 0, nextGame.player.z);

    const newDungeon = await buildDungeon(t3.scene, nextGame.level);
    const newChests = buildChestMeshes(t3.scene, nextGame.level);
    t3.dungeonGroup = newDungeon;
    t3.chestGroup = newChests;
    // Load enemies for new level.
    for (const e of nextGame.enemies) {
      const color = e.kind === "brute" ? 0xff7777 : e.kind === "scout" ? 0x77ff77 : 0xff9944;
      const _pool2 = (ENEMY_VARIANTS as Record<string, readonly string[]>)[e.kind] ?? [CHARACTER_MODELS.enemy1];
      const url = _pool2[Math.floor(Math.random() * _pool2.length)] ?? CHARACTER_MODELS.enemy1;
      const res = await loadCharacter(url, color);
      res.obj.scale.setScalar(0.9);
      t3.scene.add(res.obj);
      t3.enemyObjs.set(e.id, { obj: res.obj, mixer: res.mixer });
    }
  }

  // â”€â”€ Touch joystick handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function onJoyStart(e: React.PointerEvent<HTMLDivElement>) {
    const j = joyRef.current;
    j.active = true; j.id = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    j.cx = e.clientX - rect.left; j.cy = e.clientY - rect.top;
    j.x = j.cx; j.y = j.cy;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onJoyMove(e: React.PointerEvent<HTMLDivElement>) {
    const j = joyRef.current;
    if (!j.active || j.id !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    j.x = e.clientX - rect.left; j.y = e.clientY - rect.top;
  }
  function onJoyEnd(e: React.PointerEvent<HTMLDivElement>) {
    const j = joyRef.current;
    if (j.id !== e.pointerId) return;
    j.active = false; j.id = null;
  }
  function attackPress(e: React.SyntheticEvent) {
    e.preventDefault();
    keys.current.attack = true;
    setTimeout(() => { keys.current.attack = false; }, 80);
  }
  function rangedPress(e: React.SyntheticEvent) {
    e.preventDefault();
    keys.current.ranged = true;
    setTimeout(() => { keys.current.ranged = false; }, 80);
  }
  function interactPress(e: React.SyntheticEvent) {
    e.preventDefault();
    keys.current.interact = true;
    setTimeout(() => { keys.current.interact = false; }, 120);
  }

  const g = gameRef.current;
  const hpPct = g ? Math.max(0, g.player.hp / g.player.hpMax) : 1;

  // Record run-end stats once.
  useEffect(() => {
    if (recordedRef.current) return;
    if (!g) return;
    if (g.state !== "playing" && !endShown) {
      setEndShown(true);
      recordedRef.current = true;
      dungeon.finishRun(g.runCoins, g.runKills, g.depth, g.state === "cleared");
      // Phase 5: persist shards + show banner if the player died.
      if (g.runEnded) {
        const next = { ...meta, shards: meta.shards + g.runShardsEarned };
        setMeta(next); saveMeta(next);
        setRunEndBanner({ kills: g.runKills, floor: g.depth, shards: g.runShardsEarned });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.state]);

  function newRun() {
    // Phase 3: send the player back to class-select.
    const t3 = threeRef.current;
    if (t3) t3.dispose();
    threeRef.current = null;
    gameRef.current = null;
    setEndShown(false);
    recordedRef.current = false;
    setShowLevelUp(false);
    setLevelUpChoiceIds([]);
    setRunEndBanner(null);
    setClassChoice(null);
  }

  // Phase 5: apply a level-up choice and resume the run.
  function pickLevelUp(abilityId: string) {
    const g = gameRef.current;
    if (!g) return;
    applyAbilityChoice(g.player, abilityId);
    g.pendingLevelUp = false;
    g.levelUpChoices = [];
    setShowLevelUp(false);
    setLevelUpChoiceIds([]);
  }

  // Phase 5: purchase a meta unlock if shards allow.
  function purchaseUnlock(unlockId: string) {
    const def = META_UNLOCKS.find(u => u.id === unlockId);
    if (!def) return;
    if (meta.shards < def.cost) return;
    if (meta.unlocks[def.classId].includes(unlockId)) return;
    const next: MetaState = {
      shards: meta.shards - def.cost,
      unlocks: {
        ...meta.unlocks,
        [def.classId]: [...meta.unlocks[def.classId], unlockId],
      },
    };
    setMeta(next); saveMeta(next);
  }

  // ── Class-select screen ────────────────────────────────────────────
  if (!classChoice || !g) {
    const order: ClassId[] = ["warrior", "ranger", "mage"];
    const cardBg: Record<ClassId, string> = {
      warrior: "linear-gradient(135deg, rgba(255,138,76,0.22), rgba(20,5,8,0.92))",
      ranger:  "linear-gradient(135deg, rgba(110,224,122,0.22), rgba(5,20,10,0.92))",
      mage:    "linear-gradient(135deg, rgba(200,160,255,0.22), rgba(10,5,20,0.92))",
    };
    const cardBorder: Record<ClassId, string> = {
      warrior: "#ff8a4c",
      ranger:  "#6ee07a",
      mage:    "#c8a0ff",
    };
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4"
           style={{
             background: "#0a0510", color: "#fef3c7",
             paddingTop: "env(safe-area-inset-top, 0px)",
             paddingBottom: "env(safe-area-inset-bottom, 0px)",
           }}>
        <header className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center gap-2"
                style={{ background: "rgba(0,0,0,0.65)" }}>
          <button onClick={() => navigate("/dungeon3d")} aria-label="Quit"
                  className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1 font-display tracking-widest text-[11px]"
               style={{ color: "#fde047" }}>CHOOSE YOUR HERO</div>
          <div className="text-[9px] font-mono opacity-60" style={{ color: "#fde047" }}
               title={`Build stamp: ${BUILD_STAMP}`}>
            {BUILD_STAMP.slice(5, 16).replace("T", " ")}
          </div>
        </header>
        <div className="w-full max-w-md grid gap-3 mt-12">
          {order.map(c => {
            const cd = CLASS_DEFS[c];
            const _tapClass = (e?: React.SyntheticEvent) => {
              if (e) { e.preventDefault(); e.stopPropagation(); }
              // HOTFIX: log so remote debugging on iPhone shows handler fired.
              try { console.log("[d3d] class tapped:", c); } catch { /* noop */ }
              setEndShown(false);
              recordedRef.current = false;
              setRunEndBanner(null);
              setClassChoice(c);
            };
            return (
              <button key={c}
                      onPointerDown={_tapClass}
                      onClick={_tapClass}
                      className="text-left rounded-2xl p-4 pressable touch-target"
                      style={{
                        background: cardBg[c],
                        border: `1.5px solid ${cardBorder[c]}`,
                        color: "#fef3c7",
                        touchAction: "manipulation",
                        pointerEvents: "auto",
                        WebkitTapHighlightColor: "rgba(253,224,71,0.18)",
                      }}>
                <div className="flex items-baseline gap-2">
                  <div className="font-display tracking-widest text-lg"
                       style={{ color: cardBorder[c] }}>{cd.label.toUpperCase()}</div>
                  <div className="text-[10px] opacity-75">{cd.tagline}</div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] font-mono opacity-90">
                  <div><div className="opacity-60">HP</div><div>{cd.hpMax}</div></div>
                  <div><div className="opacity-60">SPD</div><div>{cd.speed.toFixed(1)}</div></div>
                  <div><div className="opacity-60">MELEE</div><div>{cd.attackDmg}</div></div>
                  <div>
                    <div className="opacity-60">{c === "warrior" ? "DASH" : "RANGED"}</div>
                    <div>{c === "warrior" ? "4u/0.2s" : `${cd.rangedDmg}×${(1 / cd.rangedCdDur).toFixed(1)}/s`}</div>
                  </div>
                </div>
                <div className="mt-2 text-[9px] opacity-60">
                  {c === "warrior" && "Zap = forward dash w/ contact damage."}
                  {c === "ranger"  && "Zap = two arrows per shot, fast cooldown."}
                  {c === "mage"    && "Sword = frost nova (AoE + slow). Zap = fat fireball."}
                </div>
              </button>
            );
          })}
        </div>
        {/* Phase 5: run-end banner shown after death, on the class-select screen. */}
        {runEndBanner && (
          <div className="mt-3 rounded-xl px-4 py-3 text-center" style={{
            background: "linear-gradient(135deg, rgba(60,20,40,0.92), rgba(20,5,20,0.92))",
            border: "1.5px solid rgba(253,224,71,0.55)",
            color: "#fef3c7",
            maxWidth: 360,
            width: "100%",
          }}>
            <div className="font-display tracking-widest text-[11px]" style={{ color: "#fde047" }}>RUN OVER</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div><div className="opacity-60">KILLS</div><div className="text-[14px]">{runEndBanner.kills}</div></div>
              <div><div className="opacity-60">FLOOR</div><div className="text-[14px]">{runEndBanner.floor}</div></div>
              <div><div className="opacity-60">SHARDS</div><div className="text-[14px]" style={{ color: "#c8a0ff" }}>+{runEndBanner.shards}</div></div>
            </div>
          </div>
        )}
        <div className="mt-4 text-[10px] opacity-50">Tap a card to start the run.</div>
        {/* Phase 5: Soul Forge button. */}
        <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowSoulForge(true); }}
                onClick={(e) => { e.preventDefault(); setShowSoulForge(true); }}
                className="mt-3 rounded-full pressable touch-target px-4 py-2 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, rgba(200,160,255,0.18), rgba(20,5,30,0.9))",
                  border: "1.5px solid rgba(200,160,255,0.65)",
                  color: "#c8a0ff",
                  touchAction: "manipulation",
                  pointerEvents: "auto",
                }}>
          <Sparkles size={14} aria-hidden="true" />
          <span className="font-display tracking-widest text-[11px]">SOUL FORGE</span>
          <span className="text-[10px] font-mono opacity-80">{meta.shards} shards</span>
        </button>
        {/* Phase 5: Soul Forge modal. */}
        {showSoulForge && (
          <div onPointerDown={(e) => { e.stopPropagation(); }}
               onClick={(e) => { if (e.target === e.currentTarget) setShowSoulForge(false); }}
               style={{
                 position: "fixed", inset: 0, zIndex: 50,
                 background: "rgba(0,0,0,0.72)",
                 display: "flex", alignItems: "center", justifyContent: "center",
                 padding: 16,
                 backdropFilter: "blur(4px)",
                 touchAction: "manipulation",
               }}>
            <div style={{
              maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto",
              background: "linear-gradient(135deg, rgba(30,15,40,0.96), rgba(10,5,20,0.96))",
              border: "1.5px solid rgba(200,160,255,0.55)",
              borderRadius: 16, padding: 16, color: "#fef3c7",
            }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-display tracking-widest text-[13px]" style={{ color: "#c8a0ff" }}>SOUL FORGE</div>
                <div className="text-[11px] font-mono opacity-80">{meta.shards} shards</div>
              </div>
              <div className="text-[10px] opacity-70 mb-3">Persistent unlocks. Applied at the start of every run.</div>
              {(["warrior","ranger","mage"] as ClassId[]).map(cid => (
                <div key={cid} className="mb-3">
                  <div className="font-display tracking-widest text-[11px] mb-1"
                       style={{ color: cid === "warrior" ? "#ff8a4c" : cid === "ranger" ? "#6ee07a" : "#c8a0ff" }}>
                    {cid.toUpperCase()}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {META_UNLOCKS.filter(u => u.classId === cid).map(u => {
                      const owned = meta.unlocks[cid].includes(u.id);
                      const canAfford = meta.shards >= u.cost;
                      return (
                        <button key={u.id}
                                disabled={owned}
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); if (!owned) purchaseUnlock(u.id); }}
                                onClick={(e) => { e.preventDefault(); if (!owned) purchaseUnlock(u.id); }}
                                className="text-left rounded-lg p-2 pressable touch-target"
                                style={{
                                  background: owned ? "rgba(110,224,122,0.16)" : "rgba(255,255,255,0.04)",
                                  border: `1px solid ${owned ? "rgba(110,224,122,0.6)" : (canAfford ? "rgba(253,224,71,0.45)" : "rgba(255,255,255,0.15)")}`,
                                  color: owned ? "#86efac" : canAfford ? "#fef3c7" : "rgba(254,243,199,0.55)",
                                  touchAction: "manipulation", pointerEvents: "auto",
                                  opacity: owned ? 0.85 : (canAfford ? 1 : 0.7),
                                }}>
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="font-mono text-[11px]">{u.name}</div>
                            <div className="text-[10px] opacity-80">{owned ? "OWNED" : `${u.cost} shards`}</div>
                          </div>
                          <div className="text-[9px] opacity-75 mt-0.5">{u.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowSoulForge(false); }}
                      onClick={(e) => { e.preventDefault(); setShowSoulForge(false); }}
                      className="mt-2 w-full rounded-lg py-2 pressable touch-target font-display tracking-widest text-[11px]"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(254,243,199,0.25)",
                        color: "#fef3c7",
                        touchAction: "manipulation", pointerEvents: "auto",
                      }}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "#0a0510", color: "#fef3c7",
      overflow: "hidden",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
    }}>
      <header className="px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
        <button onClick={() => navigate("/dungeon3d")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-[11px]">
          <div className="font-display tracking-widest" style={{ color: "#fde047" }}>DUNGEON</div>
          <div className="font-display tracking-wider text-[10px]"
               style={{ color: CLASS_DEFS[classChoice].tint === 0xff8a4c ? "#ff8a4c"
                          : CLASS_DEFS[classChoice].tint === 0x6ee07a ? "#6ee07a"
                          : "#c8a0ff" }}>
            Â· {CLASS_DEFS[classChoice].label.toUpperCase()}
          </div>
          <div className="opacity-70">Â· Floor {g.depth}</div>
          <div className="font-display tracking-wider text-[10px] opacity-90" style={{ color: "#c8a0ff" }}>Â· Lv {g.player.level}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "#fca5a5" }}>
          <Heart size={11} fill="#fca5a5" /> {Math.max(0, Math.ceil(g.player.hp))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono ml-2" style={{ color: "#fbbf24" }}>
          <Coins size={11} /> {g.player.coins}
        </div>
        <div className="text-[9px] font-mono ml-2 opacity-60" style={{ color: "#fde047" }}
             title={`Build stamp: ${BUILD_STAMP}`}>
          {BUILD_STAMP.slice(5, 16).replace("T", " ")}
        </div>
        <div className="text-[9px] font-mono ml-2" style={{ color: "#a5b4fc", opacity: 0.4 }}
             title="Viewport debug">
          {viewport.w}×{viewport.h} {viewport.h > viewport.w ? "P" : "L"} {(viewport.w / Math.max(1, viewport.h)).toFixed(2)}
        </div>
        <button onClick={newRun} aria-label="Restart"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target ml-2"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <RotateCcw size={14} />
        </button>
      </header>
      <div className="h-1.5 mx-3 mt-1 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          width: `${hpPct * 100}%`, height: "100%",
          background: hpPct > 0.4 ? "#86efac" : "#fca5a5",
          transition: "width 0.2s ease",
        }} />
      </div>
      {/* Phase 5: XP bar, color-coded by class. */}
      <div className="h-1 mx-3 mt-1 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div style={{
          width: `${Math.min(100, (g.player.xp / Math.max(1, g.player.xpToNext)) * 100)}%`,
          height: "100%",
          background: CLASS_DEFS[g.player.classId].tint === 0xff8a4c ? "#ff8a4c"
                    : CLASS_DEFS[g.player.classId].tint === 0x6ee07a ? "#6ee07a" : "#c8a0ff",
          transition: "width 0.18s ease",
        }} />
      </div>

      <main className="flex-1 relative">
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {/* Phase 4: equipment HUD — three slots, color-coded by rarity. */}
        <div style={{
          position: "absolute",
          left: "max(8px, env(safe-area-inset-left, 0px))",
          top: 8,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 9,
          fontFamily: "monospace",
          letterSpacing: 1,
          background: "rgba(0,0,0,0.55)",
          padding: "6px 8px",
          borderRadius: 8,
          border: "1px solid rgba(254,243,199,0.18)",
          color: "#fef3c7",
          minWidth: 132,
          maxWidth: 168,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.7, marginBottom: 2 }}>
            <Backpack size={10} aria-hidden="true" />
            <span style={{ fontSize: 8, letterSpacing: 2 }}>GEAR</span>
          </div>
          {(["weapon", "armor", "trinket"] as const).map(slot => {
            const it = g.player.equipped[slot];
            const color = it ? RARITY_HEX[it.rarity] : "rgba(254,243,199,0.35)";
            return (
              <div key={slot} style={{ display: "flex", alignItems: "baseline", gap: 6, color }}>
                <span style={{ opacity: 0.55, width: 44 }}>{slot.toUpperCase()}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it ? it.name : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Phase 4: pickup toast — fades via g.toast.ttl. */}
        {g.toast && (
          <div style={{
            position: "absolute",
            left: "50%",
            top: 60,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.82)",
            border: `1.5px solid ${RARITY_HEX[g.toast.rarity]}`,
            color: RARITY_HEX[g.toast.rarity],
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: 1,
            whiteSpace: "nowrap",
            opacity: Math.min(1, g.toast.ttl / 0.6),
            transition: "opacity 0.2s ease",
            maxWidth: "90%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {g.toast.text}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)", color: "#fde047" }}>
            <div className="text-center">
              <div className="text-[11px] tracking-[0.4em] font-display">LOADING DUNGEON</div>
              <div className="text-[10px] opacity-70 mt-1">Streaming Kenney modelsâ€¦</div>
            </div>
          </div>
        )}

        {/* Phase 5: Level-up modal (engine paused via step() gate). */}
        {showLevelUp && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.78)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 16, gap: 12,
            backdropFilter: "blur(6px)",
            touchAction: "manipulation",
          }}>
            <div className="font-display tracking-[0.4em] text-[14px]" style={{ color: "#fde047" }}>LEVEL UP</div>
            <div className="font-mono text-[10px] opacity-80" style={{ color: "#fef3c7" }}>
              Level {g.player.level} · Choose an ability
            </div>
            <div className="w-full max-w-md grid gap-2 mt-2">
              {levelUpChoiceIds.map((id, idx) => {
                const def = getAbilityDef(id);
                if (!def) return null;
                const tint = CLASS_DEFS[g.player.classId].tint === 0xff8a4c ? "#ff8a4c"
                           : CLASS_DEFS[g.player.classId].tint === 0x6ee07a ? "#6ee07a" : "#c8a0ff";
                return (
                  <button key={id}
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); pickLevelUp(id); }}
                          onClick={(e) => { e.preventDefault(); pickLevelUp(id); }}
                          className={`text-left rounded-2xl p-4 pressable touch-target ${idx === 1 ? "phase5-pulse" : ""}`}
                          style={{
                            background: `linear-gradient(135deg, ${tint}26, rgba(10,5,20,0.92))`,
                            border: `1.5px solid ${tint}`,
                            color: "#fef3c7",
                            touchAction: "manipulation",
                            pointerEvents: "auto",
                            WebkitTapHighlightColor: "rgba(253,224,71,0.18)",
                          }}>
                    <div className="flex items-baseline gap-2">
                      <Sparkles size={12} aria-hidden="true" style={{ color: tint }} />
                      <div className="font-display tracking-widest text-[14px]" style={{ color: tint }}>{(def as AbilityDef).name.toUpperCase()}</div>
                      <div className="text-[9px] opacity-60 ml-auto">{(def as AbilityDef).kind === "stat" ? "STAT" : "TAG"}</div>
                    </div>
                    <div className="mt-1 text-[11px] opacity-90">{(def as AbilityDef).desc}</div>
                  </button>
                );
              })}
            </div>
            <style>{`
              @keyframes phase5pulse {
                0%, 100% { transform: scale(1.0); }
                50% { transform: scale(1.025); }
              }
              .phase5-pulse { animation: phase5pulse 1.6s ease-in-out infinite; }
            `}</style>
          </div>
        )}

        {/* Virtual joystick */}
        <div
          onPointerDown={onJoyStart}
          onPointerMove={onJoyMove}
          onPointerUp={onJoyEnd}
          onPointerCancel={onJoyEnd}
          style={{
            position: "absolute",
            left: "env(safe-area-inset-left, 0px)",
            bottom: "env(safe-area-inset-bottom, 0px)",
            width: "40%", height: "55%",
            touchAction: "none",
            background: "rgba(255,255,255,0.02)",
          }}
          aria-label="Move"
        >
          {joyRef.current.active && (
            <>
              <div style={{
                position: "absolute", pointerEvents: "none",
                left: joyRef.current.cx - 44, top: joyRef.current.cy - 44,
                width: 88, height: 88, borderRadius: "50%",
                background: "rgba(253,224,71,0.10)",
                border: "2px solid rgba(253,224,71,0.55)",
              }} />
              <div style={{
                position: "absolute", pointerEvents: "none",
                left: joyRef.current.x - 16, top: joyRef.current.y - 16,
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(253,224,71,0.55)",
              }} />
            </>
          )}
          {!joyRef.current.active && !loading && (
            <div style={{
              position: "absolute", left: 16, bottom: 16,
              fontSize: 10, letterSpacing: 3, opacity: 0.45,
              color: "#fde047",
            }}>TAP & DRAG TO MOVE</div>
          )}
        </div>

        <button
          onPointerDown={rangedPress}
          onTouchStart={rangedPress}
          onClick={rangedPress}
          style={{
            position: "absolute",
            right: "max(28%, calc(110px + env(safe-area-inset-right, 0px)))",
            bottom: "max(8%, calc(36px + env(safe-area-inset-bottom, 0px)))",
            width: 72, height: 72, borderRadius: "50%",
            background: classChoice === "warrior"
              ? "linear-gradient(135deg, rgba(255,160,90,0.9), rgba(220,90,30,0.9))"
              : classChoice === "ranger"
              ? "linear-gradient(135deg, rgba(110,224,122,0.9), rgba(30,160,80,0.9))"
              : "linear-gradient(135deg, rgba(255,170,90,0.9), rgba(220,60,30,0.9))",
            border: classChoice === "warrior"
              ? "3px solid rgba(255,220,170,0.7)"
              : classChoice === "ranger"
              ? "3px solid rgba(220,255,210,0.7)"
              : "3px solid rgba(255,210,180,0.75)",
            color: "#fff7ed",
            fontSize: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTapHighlightColor: "transparent",
            boxShadow: "0 6px 16px rgba(96,165,250,0.45)",
          }}
          aria-label="Ranged Attack">
          <Zap size={24} aria-hidden="true" />
        </button>
        {/* Phase 4: Interact / Pick up button — faded until something's nearby. */}
        <button
          onPointerDown={interactPress}
          onTouchStart={interactPress}
          onClick={interactPress}
          style={{
            position: "absolute",
            right: "max(15%, calc(58px + env(safe-area-inset-right, 0px)))",
            bottom: "max(18%, calc(110px + env(safe-area-inset-bottom, 0px)))",
            width: 50, height: 50, borderRadius: "50%",
            background: g.nearestPickable
              ? `linear-gradient(135deg, ${RARITY_HEX[g.nearestPickable.rarity]}d0, ${RARITY_HEX[g.nearestPickable.rarity]}90)`
              : "linear-gradient(135deg, rgba(214,182,128,0.85), rgba(160,128,84,0.85))",
            border: g.nearestPickable
              ? `2px solid ${RARITY_HEX[g.nearestPickable.rarity]}`
              : "2px solid rgba(214,182,128,0.55)",
            color: "#1a0505",
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTapHighlightColor: "transparent",
            opacity: g.nearestPickable ? 1.0 : 0.3,
            transition: "opacity 0.15s ease, border 0.15s ease, box-shadow 0.15s ease",
            boxShadow: g.nearestPickable
              ? `0 6px 16px ${RARITY_HEX[g.nearestPickable.rarity]}88`
              : "0 4px 10px rgba(0,0,0,0.4)",
          }}
          aria-label="Interact / Pick up">
          <Hand size={20} aria-hidden="true" />
        </button>
        {g.nearestPickable && (
          <div style={{
            position: "absolute",
            right: "max(15%, calc(58px + env(safe-area-inset-right, 0px)))",
            bottom: "max(18%, calc(168px + env(safe-area-inset-bottom, 0px)))",
            transform: "translateX(50%)",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.82)",
            border: `1.5px solid ${RARITY_HEX[g.nearestPickable.rarity]}`,
            color: RARITY_HEX[g.nearestPickable.rarity],
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 10,
            fontFamily: "monospace",
            letterSpacing: 1,
            whiteSpace: "nowrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.7)",
          }}>
            [E] {g.nearestPickable.name}
          </div>
        )}
        <button
          onPointerDown={attackPress}
          onTouchStart={attackPress}
          onClick={attackPress}
          style={{
            position: "absolute",
            right: "max(5%, calc(20px + env(safe-area-inset-right, 0px)))",
            bottom: "max(8%, calc(36px + env(safe-area-inset-bottom, 0px)))",
            width: 88, height: 88, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(248,113,113,0.85), rgba(220,38,38,0.85))",
            border: "3px solid rgba(254,243,199,0.65)",
            color: "#fef3c7",
            fontSize: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTapHighlightColor: "transparent",
            boxShadow: "0 6px 16px rgba(248,113,113,0.45)",
          }}
          aria-label="Attack">
          <Swords size={28} aria-hidden="true" />
        </button>
      </main>

      {g.state !== "playing" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.78)" }}>
          <div className="max-w-sm w-full rounded-2xl p-5 text-center"
            style={{
              background: g.state === "cleared"
                ? "linear-gradient(135deg, rgba(253,224,71,0.25), rgba(8,8,14,0.95))"
                : "linear-gradient(135deg, rgba(248,113,113,0.18), rgba(8,8,14,0.95))",
              border: `1.5px solid ${g.state === "cleared" ? "#fde047" : "#f87171"}`,
            }}>
            <div className="inline-flex items-center gap-2 mb-2"
              style={{ color: g.state === "cleared" ? "#fde047" : "#f87171" }}>
              {g.state === "cleared" ? <Trophy size={20} /> : <Skull size={20} />}
              <div className="font-display tracking-widest text-lg">
                {g.state === "cleared" ? "RUN COMPLETE" : "RUN ENDED"}
              </div>
            </div>
            <div className="text-[11px] font-mono mt-2" style={{ color: "#fef3c7" }}>
              Depth {g.depth}  Â·  {g.runKills} foes felled  Â·  {g.runCoins} coins
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => navigate("/dungeon3d")}
                className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                HUB
              </button>
              <button onClick={newRun}
                className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target inline-flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #fde047, #f59e0b)", color: "#1a0505" }}>
                <Sparkles size={12} /> NEW RUN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Module-scope coin geometry/material â€” reused per frame for all coins.
const coinGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
const coinMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  emissive: 0x422600,
  metalness: 0.6, roughness: 0.4,
});

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
