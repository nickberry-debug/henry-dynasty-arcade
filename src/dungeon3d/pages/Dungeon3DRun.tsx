// Dungeon 3D — main run page.
//
// Three.js scene with an orthographic isometric camera matching the
// Kenney promo render look (high pitch, ~45° yaw, soft shadows,
// purple-stone palette). Player + enemies are blocky-characters GLBs;
// dungeon pieces are real Kenney modular-dungeon-kit GLBs.
//
// All viewport + input lessons from the Maze Muncher and 2D crawler
// fixes are applied: DPR-safe, no transform accumulation, dt
// sanitized, touch via onPointerDown + onTouchStart with
// touchAction:none, virtual joystick + attack button, keyboard WASD.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, RotateCcw, Trophy, Skull, Coins, Swords, Sparkles } from "lucide-react";
import * as THREE from "three";
import {
  newGame, step, descendLevel, CELL, COLS, ROWS, WORLD_W, WORLD_H,
  isCellVisible,
  type Game, type InputState,
} from "../engine";
import {
  loadModel, preloadCriticalModels, DUNGEON_MODELS, CHARACTER_MODELS, tintModel,
} from "../modelCache";
import { useDungeon3D } from "../store";
import { playSfx, unlockAudio } from "../../art";

export default function Dungeon3DRun() {
  const navigate = useNavigate();
  const dungeon = useDungeon3D();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game>(newGame());
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);
  const recordedRef = useRef(false);
  const [loading, setLoading] = useState(true);

  // Input snapshot.
  const inputRef = useRef<InputState>({ ax: 0, az: 0, attack: false });
  const keys = useRef({ up: false, down: false, left: false, right: false, attack: false });
  const joyRef = useRef<{ active: boolean; cx: number; cy: number; x: number; y: number; id: number | null }>({
    active: false, cx: 0, cy: 0, x: 0, y: 0, id: null,
  });

  useEffect(() => { unlockAudio(); }, []);

  // Keyboard wiring.
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "ArrowUp" || e.key === "w") k.up = true;
      else if (e.key === "ArrowDown" || e.key === "s") k.down = true;
      else if (e.key === "ArrowLeft" || e.key === "a") k.left = true;
      else if (e.key === "ArrowRight" || e.key === "d") k.right = true;
      else if (e.key === " " || e.key === "j" || e.key === "Enter") k.attack = true;
    }
    function onUp(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "ArrowUp" || e.key === "w") k.up = false;
      else if (e.key === "ArrowDown" || e.key === "s") k.down = false;
      else if (e.key === "ArrowLeft" || e.key === "a") k.left = false;
      else if (e.key === "ArrowRight" || e.key === "d") k.right = false;
      else if (e.key === " " || e.key === "j" || e.key === "Enter") k.attack = false;
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // ── THREE.JS SCENE — mounted once, never re-created across renders ─
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
    playerActions: { idle?: THREE.AnimationAction; walk?: THREE.AnimationAction };
    enemyObjs: Map<string, { obj: THREE.Object3D; mixer: THREE.AnimationMixer | null }>;
    dungeonGroup: THREE.Group;
    coinGroup: THREE.Group;
    chestGroup: THREE.Group;
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

    // Each Kenney piece is ~4×4 units; pieces are centered at origin
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

    // Walls — placed AROUND floor cells. We iterate every wall cell that
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
    // Coins use simple geometry (no GLB needed — keeps draw calls low).
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
    // Kenney blocky-characters typically come at ~2 units tall — fine
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

      await preloadCriticalModels();
      if (cancelled) return;

      // ── Scene + lighting ──────────────────────────────────────────
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

      // ── Camera (orthographic isometric) ─────────────────────────────
      // The Kenney promos use a 30-ish degree look-down with slight
      // perspective. We use orthographic to keep the chunky kit pieces
      // looking clean at any screen size. d controls zoom level.
      const aspect = container.clientWidth / container.clientHeight;
      // Pulled back from d=8 to d=14 — user feedback said too close.
      // Bigger d = more world visible in the orthographic frustum.
      const d = 14;
      const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
      // Iso angle: 35.264° pitch + 45° yaw is the "true" isometric
      // angle. Camera offset proportional to d so the pitch stays
      // consistent as we zoom.
      camera.position.set(18, 22, 18);
      camera.lookAt(0, 0, 0);

      // ── Renderer ──────────────────────────────────────────────────
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

      // ── Build initial dungeon + entities ──────────────────────────
      const dungeonGroup = await buildDungeon(scene, gameRef.current.level);
      if (cancelled) return;
      const coinGroup = buildCoinMeshes(scene);
      const chestGroup = buildChestMeshes(scene, gameRef.current.level);

      // Player character.
      const playerRes = await loadCharacter(CHARACTER_MODELS.player);
      if (cancelled) return;
      playerRes.obj.position.set(gameRef.current.player.x, 0, gameRef.current.player.z);
      // Slightly smaller than the dungeon to match the iso scale.
      playerRes.obj.scale.setScalar(0.9);
      scene.add(playerRes.obj);

      // Enemy meshes — load on demand and keyed by enemy.id.
      const enemyObjs = new Map<string, { obj: THREE.Object3D; mixer: THREE.AnimationMixer | null }>();
      async function ensureEnemyMesh(eId: string, kind: string, color: number) {
        if (enemyObjs.has(eId)) return;
        const url = kind === "brute" ? CHARACTER_MODELS.enemy3
                  : kind === "scout" ? CHARACTER_MODELS.enemy2
                  : CHARACTER_MODELS.enemy1;
        const res = await loadCharacter(url, color);
        if (cancelled) return;
        res.obj.scale.setScalar(0.9);
        scene.add(res.obj);
        enemyObjs.set(eId, { obj: res.obj, mixer: res.mixer });
      }
      // Kick off all enemy loads at once.
      for (const e of gameRef.current.enemies) {
        const color = e.kind === "brute" ? 0xff7777 : e.kind === "scout" ? 0x77ff77 : 0xff9944;
        await ensureEnemyMesh(e.id, e.kind, color);
      }

      threeRef.current = {
        renderer, scene, camera,
        playerObj: playerRes.obj,
        playerMixer: playerRes.mixer,
        playerActions: { idle: playerRes.actions.idle, walk: playerRes.actions.walk },
        enemyObjs,
        dungeonGroup,
        coinGroup,
        chestGroup,
        dispose: () => {
          renderer.dispose();
          if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
        },
      };
      setLoading(false);

      // ── Game loop ─────────────────────────────────────────────────
      let last = performance.now();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        let dt = (now - last) / 1000;
        if (!Number.isFinite(dt) || dt < 0) dt = 0;
        if (dt > 0.05) dt = 0.05;
        last = now;

        // ── Compose input from keyboard + joystick ──
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

        const g = gameRef.current;
        step(g, dt, inputRef.current);

        // Resize check.
        const t3 = threeRef.current;
        if (t3) {
          if (container.clientWidth !== renderer.domElement.width / renderer.getPixelRatio()
            || container.clientHeight !== renderer.domElement.height / renderer.getPixelRatio()) {
            renderer.setSize(container.clientWidth, container.clientHeight);
            const aspect = container.clientWidth / container.clientHeight;
            camera.left = -d * aspect; camera.right = d * aspect;
            camera.updateProjectionMatrix();
          }

          // Camera follows player at the iso offset matching the
          // zoomed-out d=14 framing.
          const cam = t3.camera;
          cam.position.x = g.cameraTargetX + 18;
          cam.position.z = g.cameraTargetZ + 18;
          cam.position.y = 22;
          cam.lookAt(g.cameraTargetX, 0, g.cameraTargetZ);

          // ── Fog of war: toggle visibility on each tile mesh based
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
          // Crossfade idle ↔ walk via weight.
          if (t3.playerActions.idle && t3.playerActions.walk) {
            const walking = g.player.anim === "walk" || g.player.anim === "attack";
            const tw = walking ? 1 : 0;
            t3.playerActions.walk.weight = lerp(t3.playerActions.walk.weight, tw, 0.2);
            t3.playerActions.idle.weight = 1 - t3.playerActions.walk.weight;
          }
          // Hit-flash overlay on player — tint the materials.
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
            const fadeOut = e.deathT > 0 ? (e.deathT / 0.6) : 1;
            handle.obj.scale.setScalar(0.9 * fadeOut);
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
          // Rebuild the group each frame for simplicity — the cost is
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

          renderer.render(scene, camera);
        }

        // Trigger React re-render for HUD updates (low-frequency
        // throttle so we don't constantly re-render the React tree).
        force(n => (n + 1) % 1_000_000);

        // ── Descend ──
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
  }, []);

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
      const url = e.kind === "brute" ? CHARACTER_MODELS.enemy3
                : e.kind === "scout" ? CHARACTER_MODELS.enemy2
                : CHARACTER_MODELS.enemy1;
      const res = await loadCharacter(url, color);
      res.obj.scale.setScalar(0.9);
      t3.scene.add(res.obj);
      t3.enemyObjs.set(e.id, { obj: res.obj, mixer: res.mixer });
    }
  }

  // ── Touch joystick handlers ─────────────────────────────────────────
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

  const g = gameRef.current;
  const hpPct = Math.max(0, g.player.hp / g.player.hpMax);

  // Record run-end stats once.
  useEffect(() => {
    if (recordedRef.current) return;
    if (g.state !== "playing" && !endShown) {
      setEndShown(true);
      recordedRef.current = true;
      dungeon.finishRun(g.runCoins, g.runKills, g.depth, g.state === "cleared");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state]);

  function newRun() {
    gameRef.current = newGame();
    setEndShown(false);
    recordedRef.current = false;
    rebuildLevel(gameRef.current);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0510", color: "#fef3c7" }}>
      <header className="px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
        <button onClick={() => navigate("/dungeon3d")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-[11px]">
          <div className="font-display tracking-widest" style={{ color: "#fde047" }}>DUNGEON</div>
          <div className="opacity-70">·  Lv {g.depth}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "#fca5a5" }}>
          <Heart size={11} fill="#fca5a5" /> {Math.max(0, Math.ceil(g.player.hp))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono ml-2" style={{ color: "#fbbf24" }}>
          <Coins size={11} /> {g.player.coins}
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

      <main className="flex-1 relative">
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)", color: "#fde047" }}>
            <div className="text-center">
              <div className="text-[11px] tracking-[0.4em] font-display">LOADING DUNGEON</div>
              <div className="text-[10px] opacity-70 mt-1">Streaming Kenney models…</div>
            </div>
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
          onPointerDown={attackPress}
          onTouchStart={attackPress}
          onClick={attackPress}
          style={{
            position: "absolute",
            right: "calc(24px + env(safe-area-inset-right, 0px))",
            bottom: "calc(36px + env(safe-area-inset-bottom, 0px))",
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
              Depth {g.depth}  ·  {g.runKills} foes felled  ·  {g.runCoins} coins
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

// Module-scope coin geometry/material — reused per frame for all coins.
const coinGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
const coinMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  emissive: 0x422600,
  metalness: 0.6, roughness: 0.4,
});

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
