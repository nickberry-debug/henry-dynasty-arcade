// Monster Forge — Builder. Three.js live preview + part picker tabs.
//
// Phase 1 deliverables:
//  - WebGL canvas with orbit-style rotate/zoom (touch + mouse)
//  - Real-time monster assembly: change part -> rebuild scene <30ms
//  - Side panel (bottom-sheet on mobile) with category tabs:
//      Body / Head / Horns / Wings / Tail / Spikes / Eyes / Color
//  - Name input + Save button -> profile-scoped localStorage
//
// Notes on Three.js wiring (matches dungeon3d patterns):
//  - DPR clamped to 2 (avoids brutal pixel cost on iPad Retina)
//  - Single ResizeObserver drives renderer + camera aspect
//  - Cleanup disposes geometries + textures on unmount to avoid GPU leaks

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { ArrowLeft, Save, Shuffle, Loader2 } from "lucide-react";
import {
  assembleMonster, loadSaved, newId, upsertMonster,
} from "../engine";
import {
  defaultMonsterConfig, loadManifest,
  type Manifest, type MonsterConfig, type SavedMonster,
} from "../partsManifest";

type Tab = "body" | "head" | "horns" | "wings" | "tail" | "spikes" | "eyes" | "color";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "body",   label: "Body",   emoji: "🦖" },
  { id: "head",   label: "Head",   emoji: "💀" },
  { id: "horns",  label: "Horns",  emoji: "👹" },
  { id: "wings",  label: "Wings",  emoji: "🪽" },
  { id: "tail",   label: "Tail",   emoji: "🐍" },
  { id: "spikes", label: "Spikes", emoji: "⚡" },
  { id: "eyes",   label: "Eyes",   emoji: "👀" },
  { id: "color",  label: "Color",  emoji: "🎨" },
];

export default function MonsterForgeBuilder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("id");

  // ── Manifest load ─────────────────────────────────────────────
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [config, setConfig] = useState<MonsterConfig | null>(null);
  const [name, setName] = useState<string>("");
  const [savedId, setSavedId] = useState<string | null>(editingId);
  const [tab, setTab] = useState<Tab>("body");
  const [busy, setBusy] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    loadManifest().then(m => {
      if (cancelled) return;
      setManifest(m);
      if (editingId) {
        const existing = loadSaved().find(x => x.id === editingId);
        if (existing) {
          setConfig(existing.config);
          setName(existing.name);
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

  // ── Three.js scene (refs to keep things out of React's re-render path) ─
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const monsterRootRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  // Camera orbit state — yaw, pitch, distance (touch-friendly own impl)
  const orbitRef = useRef({ yaw: 0.6, pitch: 0.45, dist: 4.5, targetY: 0.8 });

  // Bootstrap renderer once
  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12081a);

    // Camera
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    scene.add(cam);

    // Renderer
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

    // Lights — soft ambient + warm key + cool fill, all with shadows on key
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

    // Ground plane (round disc with soft purple)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x261339, roughness: 0.9, metalness: 0.0 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.5, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    // Subtle ring accent
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

    // Resize handling
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

    // Render loop — orbit camera around target each frame.
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
      renderer.render(scene, cam);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    // Pointer drag → orbit
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
    // Pinch (2-finger touch zoom)
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
      // Dispose geometries / materials in the scene.
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
    };
  }, []);

  // ── Rebuild monster every time config changes ─────────────────
  useEffect(() => {
    if (!manifest || !config || !sceneRef.current) return;
    let cancelled = false;
    setBusy(true);
    assembleMonster(config, manifest).then(({ root }) => {
      if (cancelled || !sceneRef.current) return;
      // Remove old monster
      if (monsterRootRef.current) {
        sceneRef.current.remove(monsterRootRef.current);
        // Dispose its meshes
        monsterRootRef.current.traverse(o => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
      }
      sceneRef.current.add(root);
      monsterRootRef.current = root;
      setBusy(false);
    }).catch(err => {
      console.error("[monster-forge] assemble failed", err);
      setBusy(false);
    });
    return () => { cancelled = true; };
  }, [config, manifest]);

  // ── Action handlers ─────────────────────────────────────────────
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

  const save = () => {
    if (!config) return;
    const id = savedId ?? newId();
    const trimmed = (name || "").trim() || "Untitled Monster";
    const now = Date.now();
    const monster: SavedMonster = {
      id,
      name: trimmed,
      config,
      createdAt: savedId ? (loadSaved().find(m => m.id === id)?.createdAt ?? now) : now,
      updatedAt: now,
    };
    upsertMonster(monster);
    setSavedId(id);
    setSavedToast(`Saved "${trimmed}"`);
    setTimeout(() => setSavedToast(""), 2000);
  };

  // ── Render ─────────────────────────────────────────────────────
  if (!manifest || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "#fef3c7" }}>
        <Loader2 size={20} className="animate-spin" /> &nbsp; Loading parts…
      </div>
    );
  }

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
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[13px] font-display tracking-wider"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fef3c7" }} />
        <button onClick={randomize} title="Randomize"
          className="w-10 h-10 rounded-lg flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(125,80,180,0.25)", border: "1px solid rgba(180,80,200,0.4)" }}>
          <Shuffle size={16} />
        </button>
        <button onClick={save} title="Save"
          className="px-3 h-10 rounded-lg flex items-center gap-1 pressable touch-target font-display tracking-wider text-[11px]"
          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}>
          <Save size={14} /> SAVE
        </button>
      </header>

      {/* 3D preview + busy spinner */}
      <div className="relative flex-1 min-h-0" style={{ minHeight: 320 }}>
        <div ref={hostRef} className="absolute inset-0" />
        {busy && (
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
        <div className="absolute bottom-2 right-2 text-[10px] opacity-60">
          drag · pinch · scroll
        </div>
      </div>

      {/* Part picker — bottom sheet */}
      <div className="flex-shrink-0"
        style={{ background: "rgba(10,5,20,0.95)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Tab strip */}
        <div className="flex overflow-x-auto px-2 py-2 gap-1" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
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
        {/* Choices */}
        <div className="px-2 pb-3 pt-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <Choices tab={tab} config={config} manifest={manifest} onPick={update} />
        </div>
      </div>
    </div>
  );
}

// ── Choices row ───────────────────────────────────────────────────────

function Choices({
  tab, config, manifest, onPick,
}: {
  tab: Tab; config: MonsterConfig; manifest: Manifest;
  onPick: (k: keyof MonsterConfig, v: string) => void;
}) {
  const mapping: Record<Tab, { configKey: keyof MonsterConfig; list: { id: string; label: string; hex?: string | null }[] }> = useMemo(() => ({
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
                {item.id === "none" ? "—" : "●"}
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

// ── Random name generator (kid-friendly, fits in 30 chars) ─────────

const ADJ = ["Spooky","Grumpy","Sparkly","Fuzzy","Cosmic","Tiny","Mighty","Wobbly","Frosty","Burning","Sneaky","Dizzy","Royal","Bouncy","Toxic","Lucky"];
const NOUN = ["Blorp","Snorgle","Fizz","Crumble","Wibble","Boop","Gribble","Glob","Snik","Murk","Zorp","Plop","Squish","Pog","Drak","Vomp"];

function randomMonsterName(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return `${a} ${n}`;
}
