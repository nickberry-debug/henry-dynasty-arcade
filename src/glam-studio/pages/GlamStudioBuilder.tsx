// Glam Studio Builder — the actual 3D doll dress-up.
//
// React owns the panel/UI state and pushes a GlamConfig into the
// GlamScene controller on every change. The controller does the live 3D
// updates.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Save, Camera, RotateCw, Sparkles, Check,
} from "lucide-react";
import {
  BASE_DOLLS, HAIR_STYLES, HAIR_COLORS, SKIN_TINTS,
  LIP_COLORS, EYESHADOW_COLORS, BLUSH_COLORS, ACCESSORIES, POSES,
  DEFAULT_CONFIG, GLAM_STUDIO_ENABLED,
  type GlamConfig, type SavedLook,
} from "../data/manifest";
import { GlamScene } from "../engine/scene";
import { loadLookbook, addLook } from "../engine/lookbook";
import {
  getActiveProfileId, profileKey, recordGameSession,
} from "../../profiles/store";

const ACCENT = "#a78bfa";
const PINK   = "#f9a8d4";

type Tab = "outfit" | "hair" | "color" | "makeup" | "extras" | "pose";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "outfit", label: "Outfit",  emoji: "👗" },
  { id: "hair",   label: "Hair",    emoji: "💇" },
  { id: "color",  label: "Color",   emoji: "🎨" },
  { id: "makeup", label: "Makeup",  emoji: "💄" },
  { id: "extras", label: "Extras",  emoji: "✨" },
  { id: "pose",   label: "Pose",    emoji: "🤸" },
];

// Per-profile "last unsaved config" key, so users don't lose changes when
// they navigate away accidentally.
const DRAFT_BASE = "dd_glam_draft";
function draftKey() { return profileKey(DRAFT_BASE); }

function loadDraft(fallback: GlamConfig): GlamConfig {
  try {
    const raw = localStorage.getItem(draftKey());
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<GlamConfig>) } : fallback;
  } catch { return fallback; }
}
function saveDraft(cfg: GlamConfig) {
  try { localStorage.setItem(draftKey(), JSON.stringify(cfg)); } catch { /* ignore */ }
}

export default function GlamStudioBuilder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sceneRef = useRef<GlamScene | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef<number>(Date.now());

  // If ?look=<id> present, hydrate from the saved lookbook entry.
  const [config, setConfig] = useState<GlamConfig>(() => {
    const lookId = params.get("look");
    if (lookId) {
      const lb = loadLookbook();
      const hit = lb.find(s => s.id === lookId);
      if (hit) return hit.config;
    }
    return loadDraft(DEFAULT_CONFIG);
  });
  const [tab, setTab] = useState<Tab>("outfit");
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Scene lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const scene = new GlamScene(c);
    sceneRef.current = scene;
    scene.mount();
    let cancelled = false;
    (async () => {
      await scene.apply(config);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
      scene.unmount();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push every config change into the scene.
  useEffect(() => {
    saveDraft(config);
    const s = sceneRef.current;
    if (!s) return;
    s.apply(config);
  }, [config]);

  // Switch camera focus when entering Makeup tab.
  useEffect(() => {
    const s = sceneRef.current; if (!s) return;
    s.setFocus(tab === "makeup" ? "face" : "full");
  }, [tab]);

  // Record session length on unmount.
  useEffect(() => {
    return () => {
      const pid = getActiveProfileId();
      if (!pid) return;
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      if (elapsed >= 5) {
        recordGameSession(pid, "glamstudio", { sessions: 1, seconds: elapsed, level: 1 });
      }
    };
  }, []);

  // ── Patch helpers ─────────────────────────────────────────────────
  function patch<K extends keyof GlamConfig>(k: K, v: GlamConfig[K]) {
    setConfig(prev => ({ ...prev, [k]: v }));
  }

  function saveLook() {
    const s = sceneRef.current;
    const preview = s?.snapshot() ?? undefined;
    const look: SavedLook = {
      id: `${Date.now()}`,
      createdAt: Date.now(),
      config,
      preview,
    };
    addLook(loadLookbook(), look);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  function randomize() {
    function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
    const next: GlamConfig = {
      baseId:         pick(BASE_DOLLS).id,
      hairStyle:      pick(HAIR_STYLES).id,
      hairColor:      pick(HAIR_COLORS).id,
      skinTint:       pick(SKIN_TINTS).id,
      lipColor:       pick(LIP_COLORS).id,
      eyeshadowColor: pick(EYESHADOW_COLORS).id,
      blushColor:     pick(BLUSH_COLORS).id,
      accessory:      pick(ACCESSORIES).id,
      pose:           pick(POSES).id,
    };
    setConfig(next);
  }

  // ── Render helpers ────────────────────────────────────────────────
  const swatch = (active: boolean, hex: string): CSSProperties => ({
    width: 36, height: 36, borderRadius: 18,
    background: hex === "#00000000" ? "transparent" : hex,
    border: `2.5px solid ${active ? "#fff" : "rgba(0,0,0,0.45)"}`,
    boxShadow: active ? `0 0 0 2px ${PINK}` : "none",
    backgroundImage: hex === "#00000000"
      ? "repeating-linear-gradient(45deg, #555 0 4px, #888 4px 8px)"
      : undefined,
  });
  const chip = (active: boolean): CSSProperties => ({
    padding: "8px 12px", borderRadius: 999, fontSize: 11, letterSpacing: 1,
    background: active ? `${ACCENT}40` : "rgba(255,255,255,0.06)",
    border: `1.5px solid ${active ? ACCENT : "rgba(255,255,255,0.16)"}`,
    color: "#fef3c7", textTransform: "uppercase",
    fontFamily: "var(--font-display, inherit)",
  });
  const baseTile = (active: boolean): CSSProperties => ({
    border: `2px solid ${active ? PINK : "rgba(255,255,255,0.16)"}`,
    borderRadius: 12, overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
    boxShadow: active ? `0 0 0 2px ${ACCENT}80` : "none",
  });

  if (!GLAM_STUDIO_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0814", color: "#fef3c7" }}>
        Glam Studio is temporarily disabled.
      </div>
    );
  }

  const panelLabel = useMemo(() => TABS.find(t => t.id === tab)?.label ?? "", [tab]);

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(180deg, #1a0a22 0%, #0a0410 100%)", color: "#fef3c7" }}>
      <header className="px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.45)", borderBottom: `1px solid ${ACCENT}40` }}>
        <button onClick={() => navigate("/glam-studio")} aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 font-display text-[11px] tracking-widest" style={{ color: PINK }}>
          <Sparkles size={11} style={{ display: "inline", marginRight: 4 }} />
          GLAM STUDIO · {panelLabel}
        </div>
        <button onClick={randomize} aria-label="Randomize"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <RotateCw size={14} />
        </button>
        <button onClick={saveLook} aria-label="Save Look"
          className="px-3 h-9 rounded-full flex items-center justify-center gap-1.5 pressable touch-target font-display text-[10px] tracking-widest"
          style={{ background: savedFlash ? "#86efac" : ACCENT, color: "#0a0a14" }}>
          {savedFlash ? <Check size={12} /> : <Save size={12} />}
          {savedFlash ? "SAVED" : "SAVE LOOK"}
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {/* 3D viewport */}
        <div className="flex-1 relative" style={{ minHeight: 300, background: "radial-gradient(ellipse at center, #2a1230 0%, #0a0410 80%)" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] tracking-widest font-display" style={{ color: PINK, background: "rgba(0,0,0,0.5)" }}>
              <Camera size={14} style={{ marginRight: 8 }} /> LOADING DOLL…
            </div>
          )}
        </div>

        {/* Tab strip */}
        <nav className="flex items-center gap-1 px-2 pt-2 overflow-x-auto"
          style={{ background: "rgba(0,0,0,0.55)", borderTop: `1px solid ${ACCENT}30` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}
              className="pressable touch-target whitespace-nowrap">
              <span style={{ marginRight: 4 }}>{t.emoji}</span>{t.label}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <section className="px-3 py-3"
          style={{ background: "rgba(0,0,0,0.55)", maxHeight: "38vh", overflowY: "auto", minHeight: 150 }}>
          {tab === "outfit" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BASE_DOLLS.map(d => (
                <button key={d.id} onClick={() => patch("baseId", d.id)} style={baseTile(config.baseId === d.id)}
                  className="pressable touch-target">
                  <img src={d.preview} alt={d.label} style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }} />
                  <div className="px-2 py-1 text-[10px] font-display tracking-widest text-center">{d.label}</div>
                </button>
              ))}
            </div>
          )}

          {tab === "hair" && (
            <div className="flex flex-wrap gap-2">
              {HAIR_STYLES.map(h => (
                <button key={h.id} onClick={() => patch("hairStyle", h.id)}
                  style={chip(config.hairStyle === h.id)} className="pressable touch-target">
                  {h.label}
                </button>
              ))}
            </div>
          )}

          {tab === "color" && (
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[10px] tracking-widest opacity-75 mb-1.5">HAIR COLOR</div>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map(c => (
                    <button key={c.id} onClick={() => patch("hairColor", c.id)}
                      style={swatch(config.hairColor === c.id, c.hex)}
                      aria-label={c.label} title={c.label}
                      className="pressable touch-target" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest opacity-75 mb-1.5">SKIN TINT</div>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TINTS.map(c => (
                    <button key={c.id} onClick={() => patch("skinTint", c.id)}
                      style={swatch(config.skinTint === c.id, c.hex)}
                      aria-label={c.label} title={c.label}
                      className="pressable touch-target" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "makeup" && (
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[10px] tracking-widest opacity-75 mb-1.5">LIPSTICK</div>
                <div className="flex flex-wrap gap-2">
                  {LIP_COLORS.map(c => (
                    <button key={c.id} onClick={() => patch("lipColor", c.id)}
                      style={swatch(config.lipColor === c.id, c.hex)}
                      aria-label={c.label} title={c.label} className="pressable touch-target" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest opacity-75 mb-1.5">EYESHADOW</div>
                <div className="flex flex-wrap gap-2">
                  {EYESHADOW_COLORS.map(c => (
                    <button key={c.id} onClick={() => patch("eyeshadowColor", c.id)}
                      style={swatch(config.eyeshadowColor === c.id, c.hex)}
                      aria-label={c.label} title={c.label} className="pressable touch-target" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest opacity-75 mb-1.5">BLUSH</div>
                <div className="flex flex-wrap gap-2">
                  {BLUSH_COLORS.map(c => (
                    <button key={c.id} onClick={() => patch("blushColor", c.id)}
                      style={swatch(config.blushColor === c.id, c.hex)}
                      aria-label={c.label} title={c.label} className="pressable touch-target" />
                  ))}
                </div>
              </div>
              <div className="text-[10px] opacity-65">
                Tip: makeup view zooms the camera in close — drag with one finger to look around her face.
              </div>
            </div>
          )}

          {tab === "extras" && (
            <div className="flex flex-wrap gap-2">
              {ACCESSORIES.map(a => (
                <button key={a.id} onClick={() => patch("accessory", a.id)}
                  style={chip(config.accessory === a.id)} className="pressable touch-target">
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {tab === "pose" && (
            <div className="flex flex-wrap gap-2">
              {POSES.map(p => (
                <button key={p.id} onClick={() => patch("pose", p.id)}
                  style={chip(config.pose === p.id)} className="pressable touch-target">
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
