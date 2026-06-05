// Style Studio — kid-safe drawing canvas. Brushes, colors, eraser,
// undo, clear, save to Gallery. Saved drawings persist per-profile in
// localStorage and sync to the cloud blob (so the family sees each
// other's art).

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eraser, Trash2, Save, Undo2, Download } from "lucide-react";
import { getActiveProfileId, profileKey, recordGameSession } from "../../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../../sync/cloudBlob";
import { useActiveProfile } from "../../profiles/store";

const CANVAS_W = 720, CANVAS_H = 540;
const PALETTE = [
  "#0a0a0a", "#dc2626", "#fb923c", "#fde047", "#86efac", "#67e8f9",
  "#a78bfa", "#f9a8d4", "#fef3c7", "#7c2d12", "#15803d", "#fff",
];
const SIZES = [3, 6, 12, 22];

type Tool = "brush" | "eraser";

interface Saved { id: string; dataUrl: string; createdAt: number; }

const SAVED_BASE = "dd_style_saved";
const SAVED_BLOB = "style_saved_v1";
function savedKey() { return profileKey(SAVED_BASE); }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(savedKey());
    return raw ? (JSON.parse(raw) as Saved[]) : [];
  } catch { return []; }
}
function persistSaved(list: Saved[]) {
  try { localStorage.setItem(savedKey(), JSON.stringify(list)); } catch { /* ignore */ }
  const pid = getActiveProfileId();
  if (pid) try { cloudSet(pid, SAVED_BLOB, list); } catch { /* ignore */ }
}

export default function StyleStudio() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const [color, setColor] = useState(PALETTE[1]);
  const [size, setSize] = useState(SIZES[1]);
  const [tool, setTool] = useState<Tool>("brush");
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved());
  const [showGallery, setShowGallery] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const drawingRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
  const startRef = useRef<number>(Date.now());

  // Initialize canvas with white background
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = CANVAS_W; c.height = CANVAS_H;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    pushUndo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cloud sync — pick up other profiles' drawings (own profile)
  useEffect(() => {
    if (!profile?.id) return;
    return cloudSubscribe<Saved[]>(profile.id, SAVED_BLOB, remote => {
      if (!remote || !Array.isArray(remote)) return;
      try { localStorage.setItem(savedKey(), JSON.stringify(remote)); } catch { /* ignore */ }
      setSaved(remote);
    });
  }, [profile?.id]);

  // Record session on unmount
  useEffect(() => {
    return () => {
      const pid = getActiveProfileId();
      if (!pid) return;
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      if (elapsed >= 5) {
        recordGameSession(pid, "stylestudio", { sessions: 1, seconds: elapsed, level: saved.length });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function pushUndo() {
    const k = ctx(); if (!k) return;
    const img = k.getImageData(0, 0, CANVAS_W, CANVAS_H);
    undoStack.current.push(img);
    if (undoStack.current.length > 12) undoStack.current.shift();
  }

  function undo() {
    const k = ctx(); if (!k) return;
    if (undoStack.current.length <= 1) return;
    undoStack.current.pop();
    const prev = undoStack.current[undoStack.current.length - 1];
    k.putImageData(prev, 0, 0);
  }

  function clearAll() {
    const k = ctx(); if (!k) return;
    pushUndo();
    k.fillStyle = "#fef3c7";
    k.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function pointerToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
    const c = canvasRef.current; if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pointerToCanvas(e.clientX, e.clientY); if (!p) return;
    drawingRef.current = { active: true, lastX: p.x, lastY: p.y };
    const k = ctx(); if (!k) return;
    // Dot for tap
    k.fillStyle = tool === "eraser" ? "#fef3c7" : color;
    k.beginPath();
    k.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    k.fill();
  }

  function onMove(e: React.PointerEvent) {
    if (!drawingRef.current.active) return;
    e.preventDefault();
    const p = pointerToCanvas(e.clientX, e.clientY); if (!p) return;
    const k = ctx(); if (!k) return;
    k.strokeStyle = tool === "eraser" ? "#fef3c7" : color;
    k.lineWidth = size;
    k.lineCap = "round";
    k.lineJoin = "round";
    k.beginPath();
    k.moveTo(drawingRef.current.lastX, drawingRef.current.lastY);
    k.lineTo(p.x, p.y);
    k.stroke();
    drawingRef.current.lastX = p.x;
    drawingRef.current.lastY = p.y;
  }

  function onUp() {
    if (!drawingRef.current.active) return;
    drawingRef.current.active = false;
    pushUndo();
  }

  function save() {
    const c = canvasRef.current; if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    const next: Saved[] = [...saved, { id: `${Date.now()}`, dataUrl, createdAt: Date.now() }].slice(-24);
    setSaved(next);
    persistSaved(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  function loadDrawing(s: Saved) {
    const k = ctx(); if (!k) return;
    const img = new Image();
    img.onload = () => {
      k.clearRect(0, 0, CANVAS_W, CANVAS_H);
      k.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
      pushUndo();
      setShowGallery(false);
    };
    img.src = s.dataUrl;
  }

  function deleteDrawing(id: string) {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    persistSaved(next);
  }

  function exportPng() {
    const c = canvasRef.current; if (!c) return;
    const link = document.createElement("a");
    link.download = `style-studio-${Date.now()}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0814" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 font-display text-[11px] tracking-widest" style={{ color: "#f9a8d4" }}>🎨 STYLE STUDIO</div>
        <button onClick={undo} aria-label="Undo"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <Undo2 size={14} />
        </button>
        <button onClick={save} aria-label="Save"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: savedFlash ? "#86efac" : "rgba(167,139,250,0.30)", color: savedFlash ? "#0a0a14" : "#a78bfa" }}>
          <Save size={14} />
        </button>
        <button onClick={() => setShowGallery(true)} aria-label="Gallery"
          className="px-2 h-9 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          GALLERY ({saved.length})
        </button>
      </header>

      <main className="flex-1 flex flex-col p-2 gap-2 max-w-4xl mx-auto w-full">
        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
          <canvas ref={canvasRef}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            style={{
              width: "min(100%, 720px)", aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
              touchAction: "none", borderRadius: 8, background: "#fef3c7",
              cursor: tool === "eraser" ? "cell" : "crosshair",
            }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2">
          {/* Colors */}
          <div className="flex flex-wrap items-center gap-1.5 justify-center">
            {PALETTE.map(c => (
              <button key={c}
                onClick={() => { setColor(c); setTool("brush"); }}
                className="touch-target pressable"
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: c,
                  border: `2px solid ${color === c && tool === "brush" ? "#fff" : "rgba(0,0,0,0.4)"}`,
                  boxShadow: color === c && tool === "brush" ? "0 0 0 2px #f9a8d4" : "none",
                }} />
            ))}
          </div>
          {/* Sizes + tools */}
          <div className="flex items-center gap-2 justify-center">
            {SIZES.map(s => (
              <button key={s} onClick={() => setSize(s)}
                aria-label={`Brush size ${s}`}
                className="touch-target pressable rounded-full flex items-center justify-center"
                style={{
                  width: 36, height: 36,
                  background: size === s ? "rgba(167,139,250,0.30)" : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${size === s ? "#a78bfa" : "rgba(255,255,255,0.20)"}`,
                }}>
                <div style={{ width: s, height: s, borderRadius: s, background: tool === "eraser" ? "#fef3c7" : color }} />
              </button>
            ))}
            <div style={{ width: 8 }} />
            <button onClick={() => setTool(t => t === "eraser" ? "brush" : "eraser")}
              className="touch-target pressable rounded-full flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: tool === "eraser" ? "rgba(248,113,113,0.30)" : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${tool === "eraser" ? "#f87171" : "rgba(255,255,255,0.20)"}`,
                color: "#fef3c7",
              }}>
              <Eraser size={16} />
            </button>
            <button onClick={clearAll} aria-label="Clear"
              className="touch-target pressable rounded-full flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.20)",
                color: "#fca5a5",
              }}>
              <Trash2 size={16} />
            </button>
            <button onClick={exportPng} aria-label="Download"
              className="touch-target pressable rounded-full flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.20)",
                color: "#fef3c7",
              }}>
              <Download size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* Gallery overlay */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowGallery(false)}>
          <div onClick={e => e.stopPropagation()}
            className="max-w-2xl w-full rounded-2xl p-4"
            style={{ background: "rgba(15,8,22,0.95)", border: "1.5px solid #a78bfa", maxHeight: "85vh", overflow: "auto" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display tracking-widest text-[12px]" style={{ color: "#f9a8d4" }}>YOUR GALLERY</div>
              <button onClick={() => setShowGallery(false)}
                className="px-3 py-1.5 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
                style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
                CLOSE
              </button>
            </div>
            {saved.length === 0 ? (
              <div className="text-center py-8 text-[12px]" style={{ color: "rgba(229,231,235,0.7)" }}>
                Nothing saved yet. Tap SAVE to keep your drawing.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {saved.slice().reverse().map(s => (
                  <div key={s.id} className="rounded-lg overflow-hidden relative group"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <img src={s.dataUrl} alt="" className="w-full block" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}`, objectFit: "cover" }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      <button onClick={() => loadDrawing(s)}
                        className="px-2 py-1 rounded text-[10px] font-display tracking-widest"
                        style={{ background: "#a78bfa", color: "#0a0a14" }}>OPEN</button>
                      <button onClick={() => deleteDrawing(s.id)}
                        className="px-2 py-1 rounded text-[10px] font-display tracking-widest"
                        style={{ background: "#f87171", color: "#0a0a14" }}>DELETE</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
