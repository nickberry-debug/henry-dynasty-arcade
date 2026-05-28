// Save & Exit — manage saves, leave for the Mogul Hub.
import { useNavigate } from "react-router-dom";
import { useMogul, listMogulStudios } from "../store";
import { useEffect, useState } from "react";
import { LogOut, Save, Copy, Trash2 } from "lucide-react";

export default function MogulSaveExit() {
  const navigate = useNavigate();
  const studio = useMogul(s => s.studio);
  const switchStudio = useMogul(s => s.switchStudio);
  const removeStudio = useMogul(s => s.removeStudio);
  const duplicateCurrent = useMogul(s => s.duplicateCurrent);
  const [saves, setSaves] = useState<Awaited<ReturnType<typeof listMogulStudios>>>([]);
  const refresh = async () => setSaves(await listMogulStudios());
  useEffect(() => { refresh(); }, [studio?.id, studio?.modifiedAt]);

  if (!studio) return null;
  const lastSavedMs = Date.now() - studio.modifiedAt;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <header>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">FRANCHISE</div>
        <h1 className="font-display text-3xl mt-1">💾 Save &amp; Exit</h1>
        <div className="text-sm text-ink-200 mt-1">Auto-saves after every action. Last saved {prettyAgo(lastSavedMs)}.</div>
      </header>

      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.10), rgba(15,8,20,0.6))", border: "1px solid rgba(212,175,55,0.30)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Save size={16} style={{ color: "#D4AF37" }} />
          <div className="font-display tracking-widest" style={{ color: "#D4AF37" }}>YOUR STUDIOS</div>
        </div>
        <div className="flex gap-2 flex-wrap mb-3">
          <button onClick={async () => { await duplicateCurrent(`${studio.player.name} — Copy`); refresh(); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs pressable touch-target">
            <Copy size={12} /> Duplicate Current
          </button>
        </div>
        {saves.length === 0 && <div className="text-[12px] text-ink-300 italic">No saves yet.</div>}
        {saves.map(s => {
          const isActive = s.id === studio.id;
          return (
            <div key={s.id} className="rounded-xl p-3 mb-2" style={{
              background: isActive ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${isActive ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.07)"}`,
            }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-display tracking-widest text-sm">
                  {s.data.player.name}
                  {isActive && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#D4AF37", color: "#0a0a0a" }}>ACTIVE</span>}
                </div>
              </div>
              <div className="text-[11px] text-ink-200 mb-2">
                {s.data.year}, {s.data.player.moguleName} · ${s.data.player.cash.toFixed(1)}M cash · {"★".repeat(s.data.player.prestige)}
              </div>
              <div className="flex gap-1.5">
                {!isActive && (
                  <button onClick={() => switchStudio(s.id)} className="text-xs px-2.5 py-1.5 rounded inline-flex items-center gap-1 pressable touch-target" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }}>
                    Load
                  </button>
                )}
                <button onClick={() => { if (confirm(`Delete ${s.data.player.name}?`)) { removeStudio(s.id).then(refresh); } }} className="text-xs px-2.5 py-1.5 rounded inline-flex items-center gap-1 bg-white/5 border border-white/10 text-red-300 pressable touch-target">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(15,8,20,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-sm text-ink-200 mb-3">Done managing? Head back to the Beckett Movie Studios hub.</div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button onClick={() => navigate("/mogul/studio/settings")} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-display tracking-widest pressable touch-target" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37", touchAction: "manipulation" }}>
            ⚙️ Settings
          </button>
          <button onClick={() => navigate("/mogul")} className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-display tracking-widest pressable touch-target" style={{ background: "#D4AF37", color: "#0a0a0a", touchAction: "manipulation" }}>
            <LogOut size={16} /> EXIT TO STUDIO HUB
          </button>
        </div>
      </div>
    </div>
  );
}

function prettyAgo(ms: number): string {
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}
