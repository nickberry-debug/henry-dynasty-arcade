// Monster Forge — Builder. Three.js live preview + part picker + Phase 2 potions.
//
// Phase 1 deliverables (still active):
//   - WebGL canvas with orbit-style rotate/zoom (touch + mouse)
//   - Real-time monster assembly: change part -> rebuild scene <30ms
//   - Side panel (bottom-sheet on mobile) with category tabs:
//       Body / Head / Horns / Wings / Tail / Spikes / Eyes / Color
//   - Name input + Save button -> profile-scoped localStorage
//
// Phase 2 additions:
//   - New "Potions" tab with potion grid, active potion stack, stats panel,
//     and crafting bench.
//   - Potions visibly + statistically modify the monster (effects.ts).
//   - Stats panel (HP/ATK/DEF/SPD/MAG) with delta indicators.
//   - Crafting bench: drag 2 potions in to discover a new recipe.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { ArrowLeft, Save, Shuffle, Loader2, X, FlaskConical, Lock, Camera, Volume2, VolumeX } from "lucide-react";
import {
  assembleMonster, loadSaved, newId, upsertMonster,
} from "../engine";
import {
  defaultMonsterConfig, loadManifest,
  type Manifest, type MonsterConfig, type SavedMonster,
} from "../partsManifest";
import {
  POTIONS, getPotion, listVisiblePotions, MAX_ACTIVE_POTIONS,
  type Potion, type PotionCategory,
} from "../data/potions";
import {
  computeStats, baseStatsFor, totalDelta,
  STAT_LABELS, STAT_COLORS, STAT_ORDER,
  type StatBlock,
} from "../engine/stats";
import {
  tryCraft, loadDiscovered, addDiscovered,
} from "../engine/crafting";
import { applyPotionsToMonster } from "../engine/effects";
import { buildIdleAnimator, type IdleAnimator } from "../engine/animations";
import { powersFor, buildPowerEffect, type ActiveEffect, type Power } from "../engine/powers";
import { HABITATS, HABITAT_LIST } from "../engine/habitats";
import type { HabitatId } from "../partsManifest";
import { isEvolved, evolutionSource } from "../engine/evolution";
import { roarFor, isMuted, setMuted } from "../engine/audio";
import { snapshot, downloadDataUrl, savePhoto } from "../engine/photos";
import { randomIdleText } from "../engine/idleText";
import { unlockAchievement } from "../engine/achievements";

type Tab = "body" | "head" | "horns" | "wings" | "tail" | "spikes" | "eyes" | "color" | "potions";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "body",    label: "Body",    emoji: "🦖" },
  { id: "head",    label: "Head",    emoji: "💀" },
  { id: "horns",   label: "Horns",   emoji: "👹" },
  { id: "wings",   label: "Wings",   emoji: "🪽" },
  { id: "tail",    label: "Tail",    emoji: "🐍" },
  { id: "spikes",  label: "Spikes",  emoji: "⚡" },
  { id: "eyes",    label: "Eyes",    emoji: "👀" },
  { id: "color",   label: "Color",   emoji: "🎨" },
  { id: "potions", label: "Potions", emoji: "🧪" },
];

const CATEGORY_LABELS: Record<PotionCategory, string> = {
  size: "SIZE",
  color: "COLOR / GLOW",
  elemental: "ELEMENTAL",
  mutation: "MUTATION",
  stat: "STAT BOOST",
  texture: "TEXTURE / SKIN",
};

const RARITY_COLORS: Record<Potion["rarity"], string> = {
  common:    "rgba(180,180,180,0.7)",
  rare:      "#60a5fa",
  legendary: "#fbbf24",
};

export default function MonsterForgeBuilder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("id");

  // ── Manifest + config + potion state ──────────────────────────────────
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [config, setConfig] = useState<MonsterConfig | null>(null);
  const [activePotions, setActivePotions] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [name, setName] = useState<string>("");
  const [savedId, setSavedId] = useState<string | null>(editingId);
  const [tab, setTab] = useState<Tab>("body");
  const [busy, setBusy] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string>("");
  const [craftSlotA, setCraftSlotA] = useState<string | null>(null);
  const [craftSlotB, setCraftSlotB] = useState<string | null>(null);
  const [craftMessage, setCraftMessage] = useState<{ kind: "ok" | "fail"; text: string } | null>(null);
  // Phase 5
  const [habitat, setHabitat] = useState<HabitatId>("ember_cavern");
  const [sizeMul, setSizeMul] = useState<number>(1.0);
  const [muted, setMutedState] = useState<boolean>(false);
  const [idleText, setIdleText] = useState<string>("");
  const habitatGroupRef = useRef<THREE.Group | null>(null);
  const habitatDisposeRef = useRef<(() => void) | null>(null);
  const habitatParticlesRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    setDiscovered(loadDiscovered());
    setMutedState(isMuted());
  }, []);

  // Personality idle text — random phrase every 8-12s
  useEffect(() => {
    if (!manifest || !config) return;
    const bt = manifest.parts.body.find(b => b.id === config.body)?.bodyType ?? "biped";
    const tick = () => {
      setIdleText(randomIdleText(bt));
      setTimeout(() => setIdleText(""), 3000);
    };
    tick();
    const iv = setInterval(tick, 9000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, [manifest, config?.body]);

  useEffect(() => {
    let cancelled = false;
    loadManifest().then(m => {
      if (cancelled) return;
      setManifest(m);
      if (editingId) {
        const existing = loadSaved().find(x => x.id === editingId);
        if (existing) {
          setConfig(existing.config);
          setActivePotions(existing.activePotions ?? []);
          setName(existing.name);
          if (existing.habitat) setHabitat(existing.habitat);
          if (typeof existing.sizeMul === "number") setSizeMul(existing.sizeMul);
          return;
        }
      }
      setConfig(defaultMonsterConfig(m));
      setName(randomMonsterName());
    }).catch(err => {
      console.error("[monster-forge] manifest load failed", err);
    });
    return () => { cancelled = true; };
  }, [editingId]);

  // ── Computed stats ────────────────────────────────────────────────────
  const stats: StatBlock = useMemo(() => {
    if (!config) return baseStatsFor("alien");
    return computeStats(config.body, activePotions);
  }, [config, activePotions]);

  const base: StatBlock = useMemo(() => baseStatsFor(config?.body ?? "alien"), [config?.body]);
  const delta: StatBlock = useMemo(() => totalDelta(base, stats), [base, stats]);

  // ── Three.js scene refs ───────────────────────────────────────────────
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const monsterRootRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const auraUpdatesRef = useRef<((t: number) => void)[]>([]);
  const idleAnimatorRef = useRef<IdleAnimator | null>(null);
  const activeEffectsRef = useRef<ActiveEffect[]>([]);
  const monsterAssemblyRef = useRef<import("../engine").AssembledMonster | null>(null);
  const orbitRef = useRef({ yaw: 0.6, pitch: 0.45, dist: 4.5, targetY: 0.8 });

  // Bootstrap renderer once
  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12081a);

    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    scene.add(cam);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff1c4, 1.1);
    key.position.set(4, 6, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9b8dff, 0.4);
    fill.position.set(-3, 4, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff8866, 0.3);
    rim.position.set(0, 2, -5);
    scene.add(rim);

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x261339, roughness: 0.9, metalness: 0.0 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.5, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.45, 2.6, 48),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x5b21b6, emissiveIntensity: 0.5, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    scene.add(ring);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = cam;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Render loop — orbit camera + tick aura particle animations.
    const tick = () => {
      const o = orbitRef.current;
      const tx = 0;
      const ty = o.targetY;
      const tz = 0;
      cam.position.set(
        tx + o.dist * Math.cos(o.pitch) * Math.sin(o.yaw),
        ty + o.dist * Math.sin(o.pitch),
        tz + o.dist * Math.cos(o.pitch) * Math.cos(o.yaw),
      );
      cam.lookAt(tx, ty, tz);
      // getDelta() advances internal clock — read elapsedTime *after* it
      const dt = clockRef.current.getDelta();
      const t = clockRef.current.elapsedTime;
      const updates = auraUpdatesRef.current;
      for (let i = 0; i < updates.length; i++) updates[i](t);
      const idle = idleAnimatorRef.current;
      if (idle) idle.update(t, dt);
      const fx = activeEffectsRef.current;
      if (fx.length > 0) {
        const next: ActiveEffect[] = [];
        for (const e of fx) {
          if (e.update(t, dt)) next.push(e);
        }
        if (next.length !== fx.length) activeEffectsRef.current = next;
      }
      renderer.render(scene, cam);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    let dragging = false; let lastX = 0; let lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const o = orbitRef.current;
      o.yaw   -= dx * 0.008;
      o.pitch  = Math.max(-0.4, Math.min(1.3, o.pitch + dy * 0.008));
    };
    const onUp = () => { dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const o = orbitRef.current;
      o.dist = Math.max(2, Math.min(8, o.dist + e.deltaY * 0.003));
    };
    let pinchStart = 0; let pinchDistStart = 0;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (pinchStart === 0) {
          pinchStart = d;
          pinchDistStart = orbitRef.current.dist;
        } else {
          const ratio = pinchStart / d;
          orbitRef.current.dist = Math.max(2, Math.min(8, pinchDistStart * ratio));
        }
      }
    };
    const onTouchEnd = () => { pinchStart = 0; };

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      try { host.removeChild(renderer.domElement); } catch { /* ignore */ }
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
          else (m.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      auraUpdatesRef.current = [];
    };
  }, []);

  // ── Rebuild monster on config OR activePotions change ─────────────────
  useEffect(() => {
    if (!manifest || !config || !sceneRef.current) return;
    let cancelled = false;
    setBusy(true);
    assembleMonster(config, manifest).then(am => {
      if (cancelled || !sceneRef.current) return;
      // Apply potions (mutation geometry, auras, material mods, scale).
      const applied = applyPotionsToMonster(am, activePotions);
      auraUpdatesRef.current = applied.updates;
      // Clear lingering power effects from previous build
      for (const e of activeEffectsRef.current) e.group.parent?.remove(e.group);
      activeEffectsRef.current = [];
      // Phase 3: body-type-aware procedural idle animator + assembly ref
      idleAnimatorRef.current = buildIdleAnimator(am);
      monsterAssemblyRef.current = am;
      // Remove + dispose old monster
      if (monsterRootRef.current) {
        sceneRef.current.remove(monsterRootRef.current);
        monsterRootRef.current.traverse(o => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
      }
      sceneRef.current.add(am.root);
      monsterRootRef.current = am.root;
      // Apply size slider + evolution glow
      am.root.scale.multiplyScalar(sizeMul);
      if (isEvolved(activePotions)) {
        const glow = new THREE.PointLight(0xb39ddb, 1.4, 4.0);
        glow.position.set(0, am.bodyHeight * 0.5, 0);
        glow.name = "evolution-glow";
        am.root.add(glow);
      }
      setBusy(false);
    }).catch(err => {
      console.error("[monster-forge] assemble failed", err);
      setBusy(false);
    });
    return () => { cancelled = true; };
  }, [config, manifest, activePotions]);

  // Phase 5: Apply size slider live without rebuilding
  useEffect(() => {
    const root = monsterRootRef.current;
    if (!root) return;
    // Find base scale (was multiplied by sizeMul at build time). Read back
    // and reapply: simplest is to set scale to sizeMul if root is normalized,
    // but because assembleMonster targetHeight already normalizes via body
    // scaling, we keep root scale == sizeMul.
    root.scale.setScalar(sizeMul);
  }, [sizeMul]);

  // Phase 5: Swap habitat group when habitat changes
  useEffect(() => {
    if (!sceneRef.current) return;
    // Remove previous habitat updates from the render loop
    if (habitatParticlesRef.current) {
      const prev = habitatParticlesRef.current as unknown as { __update?: (t: number) => void };
      auraUpdatesRef.current = auraUpdatesRef.current.filter(u => u !== prev.__update);
    }
    if (habitatGroupRef.current) {
      sceneRef.current.remove(habitatGroupRef.current);
      try { habitatDisposeRef.current?.(); } catch { /* */ }
    }
    const def = HABITATS[habitat];
    const built = def.build();
    habitatGroupRef.current = built.group;
    habitatParticlesRef.current = built.particles ?? null;
    habitatDisposeRef.current = built.dispose;
    sceneRef.current.add(built.group);
    if (built.particles) {
      const upd = (built.particles as unknown as { __update?: (t: number) => void }).__update;
      if (upd) auraUpdatesRef.current = [...auraUpdatesRef.current, upd];
    }
    return () => { /* cleanup handled on next swap or unmount */ };
  }, [habitat]);

  // ── Part-picker action handlers ───────────────────────────────────────
  const update = (k: keyof MonsterConfig, v: string) => {
    setConfig(prev => prev ? { ...prev, [k]: v } : prev);
  };

  const randomize = () => {
    if (!manifest) return;
    const pick = <T extends { id: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].id;
    setConfig({
      body:        pick(manifest.parts.body),
      headOverlay: pick(manifest.parts.headOverlay),
      horns:       pick(manifest.parts.horns),
      wings:       pick(manifest.parts.wings),
      tail:        pick(manifest.parts.tail),
      spikes:      pick(manifest.parts.spikes),
      eyes:        pick(manifest.parts.eyes),
      color:       pick(manifest.parts.colors),
    });
    setName(randomMonsterName());
  };

  // ── Potion action handlers ────────────────────────────────────────────
  const applyPotion = (potionId: string) => {
    if (activePotions.includes(potionId)) return;
    if (activePotions.length >= MAX_ACTIVE_POTIONS) {
      setSavedToast(`Max ${MAX_ACTIVE_POTIONS} potions per monster`);
      setTimeout(() => setSavedToast(""), 1800);
      return;
    }
    setActivePotions(prev => [...prev, potionId]);
  };

  const removePotion = (potionId: string) => {
    setActivePotions(prev => prev.filter(p => p !== potionId));
  };

  // ── Crafting bench ────────────────────────────────────────────────────
  const placeInSlot = (slot: "a" | "b", potionId: string) => {
    if (slot === "a") setCraftSlotA(potionId);
    else setCraftSlotB(potionId);
    setCraftMessage(null);
  };

  const clearCraftSlot = (slot: "a" | "b") => {
    if (slot === "a") setCraftSlotA(null);
    else setCraftSlotB(null);
    setCraftMessage(null);
  };

  // ── Powers (Phase 3) ──────────────────────────────────────────────────
  const bodyType = useMemo(() => {
    if (!manifest || !config) return "biped" as const;
    return manifest.parts.body.find(b => b.id === config.body)?.bodyType ?? "biped";
  }, [manifest, config]);
  const powers: Power[] = useMemo(
    () => powersFor(bodyType, activePotions),
    [bodyType, activePotions],
  );
  const triggerPower = (power: Power) => {
    const am = monsterAssemblyRef.current;
    if (!am) return;
    const fx = buildPowerEffect(power, am);
    activeEffectsRef.current = [...activeEffectsRef.current, fx];
  };

  const doCraft = () => {
    if (!craftSlotA || !craftSlotB) return;
    const out = tryCraft(craftSlotA, craftSlotB);
    if (out) {
      const wasNew = !discovered.includes(out);
      const next = addDiscovered(out);
      setDiscovered(next);
      const potion = getPotion(out);
      setCraftMessage({
        kind: "ok",
        text: wasNew
          ? `★ Discovered ${potion?.name ?? out}!`
          : `${potion?.name ?? out} (already known)`,
      });
    } else {
      setCraftMessage({ kind: "fail", text: "💨 Nothing happened — try another combination!" });
    }
  };

  const save = () => {
    if (!config) return;
    const id = savedId ?? newId();
    const trimmed = (name || "").trim() || "Untitled Monster";
    const now = Date.now();
    const evolved = isEvolved(activePotions);
    const monster: SavedMonster = {
      id,
      name: trimmed,
      config,
      activePotions,
      stats,
      habitat,
      sizeMul,
      evolved,
      createdAt: savedId ? (loadSaved().find(m => m.id === id)?.createdAt ?? now) : now,
      updatedAt: now,
    };
    upsertMonster(monster);
    setSavedId(id);
    setSavedToast(`Saved "${trimmed}"`);
    setTimeout(() => setSavedToast(""), 2000);
    // Achievements
    if (loadSaved().length === 1) unlockAchievement("first_build");
    if (loadSaved().length >= 5) unlockAchievement("mad_scientist");
    if (evolved) unlockAchievement("evolutionary");
  };

  // Phase 5: Photo capture
  const takePhoto = () => {
    const r = rendererRef.current, sc = sceneRef.current, cam = cameraRef.current;
    if (!r || !sc || !cam || !config) return;
    const data = snapshot(r, sc, cam, 1024);
    const safe = (name || "monster").replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadDataUrl(data, `${safe}.png`);
    savePhoto(savedId ?? "unsaved", name || "Monster", data);
    setSavedToast("📸 Photo saved");
    setTimeout(() => setSavedToast(""), 1800);
  };

  // Phase 5: Mute toggle
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  // Phase 5: Roar when body changes (feature 19)
  useEffect(() => {
    if (!config || !manifest) return;
    const bt = manifest.parts.body.find(b => b.id === config.body)?.bodyType ?? "biped";
    roarFor(bt, config.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.body]);

  // ── Render ────────────────────────────────────────────────────────────
  // IMPORTANT: render the host div unconditionally — the Three.js bootstrap
  // useEffect needs hostRef.current to be live on first mount.
  const loading = !manifest || !config;

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0a040c 0%, #1a0820 100%)",
        color: "#fef3c7",
      }}>
      {/* Top bar */}
      <header className="px-3 py-2 flex items-center gap-2 safe-top"
        style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/monster-forge")} aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft size={16} />
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name your monster"
          maxLength={30}
          disabled={loading}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[13px] font-display tracking-wider"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fef3c7" }} />
        <button onClick={randomize} title="Randomize" disabled={loading}
          className="w-10 h-10 rounded-lg flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(125,80,180,0.25)", border: "1px solid rgba(180,80,200,0.4)" }}>
          <Shuffle size={16} />
        </button>
        <button onClick={save} title="Save" disabled={loading}
          className="px-3 h-10 rounded-lg flex items-center gap-1 pressable touch-target font-display tracking-wider text-[11px]"
          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}>
          <Save size={14} /> SAVE
        </button>
      </header>

      {/* 3D preview + active potion stack + busy spinner */}
      <div className="relative flex-1 min-h-0" style={{ minHeight: 280 }}>
        <div ref={hostRef} className="absolute inset-0" />

        {/* Active potion stack — top center */}
        {activePotions.length > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {activePotions.map(pid => {
              const p = getPotion(pid);
              if (!p) return null;
              return (
                <button key={pid} onClick={() => removePotion(pid)} title={`Remove ${p.name}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg pressable touch-target relative"
                  style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${RARITY_COLORS[p.rarity]}` }}>
                  <span>{p.emoji}</span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                    style={{ background: "#ef4444", color: "#fff" }}>×</span>
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", color: "#fef3c7" }}>
            <Loader2 size={20} className="animate-spin" />&nbsp; Loading parts…
          </div>
        )}

        {/* Phase 5: habitat picker + photo + mute (top-right) */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-1.5 py-1 rounded-full pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <select value={habitat} onChange={e => setHabitat(e.target.value as HabitatId)}
            disabled={loading}
            className="bg-transparent text-[10px] font-display tracking-wider outline-none"
            style={{ color: "#fde047", maxWidth: 110 }}>
            {HABITAT_LIST.map(h => (
              <option key={h.id} value={h.id} style={{ background: "#1a0a20", color: "#fde047" }}>
                {h.emoji} {h.label}
              </option>
            ))}
          </select>
          <button onClick={takePhoto} title="Take photo" disabled={loading}
            className="w-7 h-7 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(125,80,180,0.30)", border: "1px solid rgba(180,80,200,0.4)" }}>
            <Camera size={12} style={{ color: "#fde047" }} />
          </button>
          <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} disabled={loading}
            className="w-7 h-7 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: muted ? "rgba(180,80,80,0.30)" : "rgba(34,197,94,0.20)", border: "1px solid rgba(255,255,255,0.15)" }}>
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        </div>

        {/* Phase 5: Idle personality text bubble */}
        {idleText && (
          <div className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-2xl text-[11px] font-display tracking-wider pointer-events-none animate-idleBubble"
            style={{
              top: "20%", background: "rgba(255,255,255,0.85)", color: "#1a0820",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}>
            {idleText}
          </div>
        )}

        {/* Phase 5: Size slider (bottom-center of preview) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-[10px] font-display tracking-widest" style={{ color: "rgba(229,231,235,0.7)" }}>SIZE</span>
          <input type="range" min={0.5} max={2.0} step={0.05} value={sizeMul}
            onChange={e => setSizeMul(parseFloat(e.target.value))}
            disabled={loading}
            className="w-32 accent-purple-400"
            style={{ accentColor: "#c084fc" }} />
          <span className="text-[10px] font-display tracking-widest tabular-nums" style={{ color: "#fde047", width: 32, textAlign: "right" }}>{sizeMul.toFixed(2)}×</span>
        </div>

        {/* Phase 5: Evolution badge */}
        {isEvolved(activePotions) && (
          <div className="absolute top-12 left-2 px-2 py-1 rounded-full text-[9px] font-display tracking-widest pointer-events-none"
            style={{ background: "rgba(124,77,255,0.85)", color: "#fff", border: "1px solid rgba(254,240,138,0.5)" }}>
            ✨ EVOLVED ({evolutionSource(activePotions)?.toUpperCase()})
          </div>
        )}
        {!loading && busy && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] flex items-center gap-1"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fef3c7" }}>
            <Loader2 size={12} className="animate-spin" /> assembling…
          </div>
        )}
        {savedToast && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-[12px] font-display tracking-wider"
            style={{ background: "rgba(22,163,74,0.95)", color: "#fff" }}>
            ✓ {savedToast}
          </div>
        )}
        {!loading && powers.length > 0 && (
          <div className="absolute bottom-12 left-2 flex flex-col gap-1.5"
            style={{ pointerEvents: "auto" }}>
            <div className="text-[8px] tracking-[0.3em] font-display px-2 py-1 rounded"
              style={{ color: "#fda4af", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(180,80,80,0.35)" }}>
              POWERS
            </div>
            {powers.map(p => (
              <button key={p.id} onClick={() => triggerPower(p)} title={`${p.name} — ${p.description}`}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg pressable touch-target"
                style={{
                  background: "linear-gradient(135deg, rgba(125,80,180,0.32), rgba(0,0,0,0.55))",
                  border: "1px solid rgba(180,80,200,0.5)",
                  color: "#fef3c7",
                  minWidth: 110,
                  pointerEvents: "auto",
                }}>
                <span className="text-lg leading-none">{p.emoji}</span>
                <span className="text-[10px] font-display tracking-wider">{p.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="absolute bottom-2 right-2 text-[10px] opacity-60">
          drag · pinch · scroll · v0.3
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="flex-shrink-0"
        style={{ background: "rgba(10,5,20,0.95)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Tab strip */}
        <div className="flex overflow-x-auto px-2 py-2 gap-1" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} disabled={loading}
              className="px-3 py-1.5 rounded-full text-[11px] font-display tracking-wider flex items-center gap-1 pressable touch-target whitespace-nowrap"
              style={{
                background: tab === t.id ? "linear-gradient(135deg, #b91c1c, #7e22ce)" : "rgba(255,255,255,0.05)",
                border: "1px solid " + (tab === t.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"),
                color: tab === t.id ? "#fff" : "rgba(254,243,199,0.7)",
              }}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!loading && manifest && config && (
          tab === "potions" ? (
            <PotionPanel
              activePotions={activePotions}
              stats={stats} base={base} delta={delta}
              discovered={discovered}
              onApply={applyPotion}
              onRemove={removePotion}
              craftSlotA={craftSlotA} craftSlotB={craftSlotB}
              onPlaceCraftSlot={placeInSlot}
              onClearCraftSlot={clearCraftSlot}
              onCraft={doCraft}
              craftMessage={craftMessage}
            />
          ) : (
            <div className="px-2 pb-3 pt-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <Choices tab={tab} config={config} manifest={manifest} onPick={update} />
            </div>
          )
        )}
      </div>
      <style>{`
        @keyframes idleBubble {
          0%   { opacity: 0; transform: translate(-50%, 8px) scale(0.85); }
          15%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
          85%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -8px) scale(0.95); }
        }
        .animate-idleBubble { animation: idleBubble 3s ease-out forwards; }
      `}</style>
    </div>
  );
}

// ── Standard part choices row ───────────────────────────────────────────

function Choices({
  tab, config, manifest, onPick,
}: {
  tab: Exclude<Tab, "potions">; config: MonsterConfig; manifest: Manifest;
  onPick: (k: keyof MonsterConfig, v: string) => void;
}) {
  const mapping: Record<Exclude<Tab, "potions">, { configKey: keyof MonsterConfig; list: { id: string; label: string; hex?: string | null }[] }> = useMemo(() => ({
    body:   { configKey: "body",        list: manifest.parts.body },
    head:   { configKey: "headOverlay", list: manifest.parts.headOverlay },
    horns:  { configKey: "horns",       list: manifest.parts.horns },
    wings:  { configKey: "wings",       list: manifest.parts.wings },
    tail:   { configKey: "tail",        list: manifest.parts.tail },
    spikes: { configKey: "spikes",      list: manifest.parts.spikes },
    eyes:   { configKey: "eyes",        list: manifest.parts.eyes },
    color:  { configKey: "color",       list: manifest.parts.colors },
  }), [manifest]);

  const m = mapping[tab];
  const current = config[m.configKey];

  return (
    <div className="flex gap-2 min-w-min">
      {m.list.map(item => {
        const selected = current === item.id;
        const hex = (item as { hex?: string | null }).hex ?? null;
        return (
          <button key={item.id} onClick={() => onPick(m.configKey, item.id)}
            className="flex flex-col items-center justify-center px-3 py-2 rounded-xl pressable touch-target flex-shrink-0"
            style={{
              minWidth: 76, minHeight: 64,
              background: selected ? "linear-gradient(135deg, rgba(185,28,28,0.4), rgba(126,34,206,0.35))" : "rgba(255,255,255,0.04)",
              border: "1px solid " + (selected ? "rgba(253,164,175,0.6)" : "rgba(255,255,255,0.08)"),
            }}>
            {tab === "color" ? (
              <div className="w-8 h-8 rounded-full mb-1"
                style={{
                  background: hex ?? "linear-gradient(135deg, #d1d5db, #6b7280)",
                  border: "2px solid rgba(255,255,255,0.4)",
                }} />
            ) : (
              <div className="text-[10px] tracking-[0.18em] font-display mb-0.5" style={{ color: selected ? "#fde047" : "rgba(254,243,199,0.55)" }}>
                {item.id === "none" ? "—" : "◉"}
              </div>
            )}
            <div className="text-[10px] font-display tracking-wider truncate max-w-[68px] text-center"
              style={{ color: selected ? "#fef3c7" : "rgba(254,243,199,0.75)" }}>
              {item.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Potion panel (active + stats + grid + craft bench) ─────────────────

function PotionPanel({
  activePotions, stats, base, delta, discovered,
  onApply, onRemove,
  craftSlotA, craftSlotB, onPlaceCraftSlot, onClearCraftSlot, onCraft,
  craftMessage,
}: {
  activePotions: string[];
  stats: StatBlock; base: StatBlock; delta: StatBlock;
  discovered: string[];
  onApply: (id: string) => void;
  onRemove: (id: string) => void;
  craftSlotA: string | null; craftSlotB: string | null;
  onPlaceCraftSlot: (slot: "a" | "b", id: string) => void;
  onClearCraftSlot: (slot: "a" | "b") => void;
  onCraft: () => void;
  craftMessage: { kind: "ok" | "fail"; text: string } | null;
}) {
  const [pickingFor, setPickingFor] = useState<"a" | "b" | null>(null);
  const visiblePotions = useMemo(() => listVisiblePotions(discovered), [discovered]);

  // Group potions by category for the grid section.
  const byCategory = useMemo(() => {
    const groups: Record<PotionCategory, Potion[]> = {
      size: [], color: [], elemental: [], mutation: [], stat: [], texture: [],
    };
    for (const p of visiblePotions) groups[p.category].push(p);
    return groups;
  }, [visiblePotions]);

  // Locked potion count for the "?" silhouettes at the end of each section.
  const lockedCount = POTIONS.filter(p => p.crafted && !discovered.includes(p.id)).length;

  return (
    <div className="px-3 pt-1 pb-3 overflow-y-auto" style={{ maxHeight: "min(60vh, 420px)" }}>
      {/* Stats panel */}
      <div className="mb-3 px-3 py-2 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fda4af" }}>STATS</div>
          <div className="text-[10px]" style={{ color: "rgba(254,243,199,0.55)" }}>
            potions: {activePotions.length} / {MAX_ACTIVE_POTIONS}
          </div>
        </div>
        {STAT_ORDER.map(k => {
          const cur = stats[k]; const b = base[k]; const d = delta[k];
          const pct = Math.max(0, Math.min(1, cur / 30));
          return (
            <div key={k} className="flex items-center gap-2 mb-0.5">
              <div className="text-[10px] font-display tracking-wider w-9" style={{ color: STAT_COLORS[k] }}>{STAT_LABELS[k]}</div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div style={{ width: `${pct * 100}%`, height: "100%", background: STAT_COLORS[k], transition: "width 0.3s" }} />
              </div>
              <div className="text-[10px] font-mono w-7 text-right" style={{ color: "#fef3c7" }}>{cur}</div>
              <div className="text-[10px] font-mono w-8 text-right"
                style={{ color: d > 0 ? "#4ade80" : d < 0 ? "#f87171" : "rgba(255,255,255,0.25)" }}>
                {d === 0 ? "" : (d > 0 ? `+${d}` : `${d}`)}
              </div>
              <div className="text-[9px] font-mono w-7 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>({b})</div>
            </div>
          );
        })}
      </div>

      {/* Crafting bench */}
      <div className="mb-3 px-3 py-2 rounded-xl"
        style={{ background: "linear-gradient(135deg, rgba(125,80,180,0.18), rgba(0,0,0,0.4))", border: "1px solid rgba(180,80,200,0.4)" }}>
        <div className="flex items-center gap-1 mb-1.5">
          <FlaskConical size={12} style={{ color: "#fda4af" }} />
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fda4af" }}>CRAFTING BENCH</div>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <CraftSlot
            potionId={craftSlotA}
            label="A"
            onTap={() => setPickingFor(pickingFor === "a" ? null : "a")}
            picking={pickingFor === "a"}
            onClear={() => onClearCraftSlot("a")}
          />
          <div className="text-[14px] font-display" style={{ color: "#fda4af" }}>+</div>
          <CraftSlot
            potionId={craftSlotB}
            label="B"
            onTap={() => setPickingFor(pickingFor === "b" ? null : "b")}
            picking={pickingFor === "b"}
            onClear={() => onClearCraftSlot("b")}
          />
          <button onClick={onCraft}
            disabled={!craftSlotA || !craftSlotB}
            className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-display tracking-wider pressable touch-target"
            style={{
              background: craftSlotA && craftSlotB
                ? "linear-gradient(135deg, #f59e0b, #b45309)"
                : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: craftSlotA && craftSlotB ? "#fff" : "rgba(255,255,255,0.4)",
            }}>
            CRAFT
          </button>
        </div>
        {pickingFor && (
          <div className="px-2 py-1.5 rounded-lg mb-1.5"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[9px] tracking-[0.2em] mb-1" style={{ color: "rgba(254,243,199,0.55)" }}>
              PICK POTION FOR SLOT {pickingFor.toUpperCase()}
            </div>
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {visiblePotions.filter(p => !p.crafted).map(p => (
                <button key={p.id} onClick={() => { onPlaceCraftSlot(pickingFor, p.id); setPickingFor(null); }}
                  title={p.name}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${RARITY_COLORS[p.rarity]}` }}>
                  {p.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        {craftMessage && (
          <div className="text-[11px] px-2 py-1 rounded font-display tracking-wider"
            style={{
              background: craftMessage.kind === "ok" ? "rgba(22,163,74,0.25)" : "rgba(255,255,255,0.04)",
              color: craftMessage.kind === "ok" ? "#86efac" : "rgba(254,243,199,0.65)",
              border: `1px solid ${craftMessage.kind === "ok" ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {craftMessage.text}
          </div>
        )}
        <div className="text-[9px] mt-1" style={{ color: "rgba(254,243,199,0.45)" }}>
          Discovered recipes: {discovered.length} / 7 · Try unusual combinations.
        </div>
      </div>

      {/* Potion grid by category */}
      {(Object.keys(byCategory) as PotionCategory[]).map(cat => {
        const items = byCategory[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="text-[10px] tracking-[0.3em] font-display mb-1.5" style={{ color: "#fda4af" }}>
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {items.map(p => {
                const active = activePotions.includes(p.id);
                return (
                  <button key={p.id} onClick={() => active ? onRemove(p.id) : onApply(p.id)}
                    title={`${p.name} — ${p.description}`}
                    className="px-1.5 py-2 rounded-lg pressable touch-target flex flex-col items-center text-center"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, rgba(22,163,74,0.3), rgba(126,34,206,0.25))"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? "rgba(74,222,128,0.5)" : RARITY_COLORS[p.rarity]}`,
                      minHeight: 58,
                    }}>
                    <div className="text-lg leading-tight">{p.emoji}</div>
                    <div className="text-[9px] font-display tracking-wider mt-0.5 leading-tight" style={{ color: active ? "#86efac" : "#fef3c7" }}>
                      {p.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {lockedCount > 0 && (
        <div className="mb-3">
          <div className="text-[10px] tracking-[0.3em] font-display mb-1.5" style={{ color: "rgba(254,243,199,0.45)" }}>
            UNDISCOVERED ({lockedCount})
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {Array.from({ length: lockedCount }).map((_, i) => (
              <div key={i} className="px-1.5 py-2 rounded-lg flex flex-col items-center text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.15)", minHeight: 58 }}>
                <Lock size={16} style={{ color: "rgba(255,255,255,0.25)" }} />
                <div className="text-[9px] font-display tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>???</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CraftSlot({
  potionId, label, picking, onTap, onClear,
}: {
  potionId: string | null; label: string; picking: boolean;
  onTap: () => void; onClear: () => void;
}) {
  const p = potionId ? getPotion(potionId) : null;
  return (
    <div className="relative">
      <button onClick={onTap}
        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl pressable touch-target"
        style={{
          background: p ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
          border: `1px ${p ? "solid" : "dashed"} ${picking ? "#fbbf24" : "rgba(255,255,255,0.18)"}`,
        }}>
        {p ? p.emoji : <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{label}</span>}
      </button>
      {p && (
        <button onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#ef4444", color: "#fff" }}>
          <X size={9} />
        </button>
      )}
    </div>
  );
}

// ── Random name generator (kid-friendly, fits in 30 chars) ─────────────

const ADJ = ["Spooky","Grumpy","Sparkly","Fuzzy","Cosmic","Tiny","Mighty","Wobbly","Frosty","Burning","Sneaky","Dizzy","Royal","Bouncy","Toxic","Lucky"];
const NOUN = ["Blorp","Snorgle","Fizz","Crumble","Wibble","Boop","Gribble","Glob","Snik","Murk","Zorp","Plop","Squish","Pog","Drak","Vomp"];

function randomMonsterName(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return `${a} ${n}`;
}
