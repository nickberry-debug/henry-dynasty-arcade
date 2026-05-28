// Movie Mogul — arcade entry. Either continue an existing studio,
// pick from saved slots, or start a fresh one.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMogul, listMogulStudios } from "../store";
import type { Era, Difficulty } from "../types";
import { ERA_LABEL, ERA_START_YEAR, DIFFICULTY_START_CASH } from "../types";
import { ArrowLeft, Trash2, Play, Plus, Settings as SettingsIcon } from "lucide-react";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";
import { hasAnthropicKey } from "../../arcade/keys";

const ERAS: Era[] = ["golden", "newHollywood", "blockbuster", "modern"];
const DIFFICULTIES: Difficulty[] = ["indie", "studio", "bigSix"];

const ERA_BLURB: Record<Era, string> = {
  golden: "Studio system, black & white, contract players.",
  newHollywood: "Director-driven auteur era. Films get gritty.",
  blockbuster: "Spielberg, Lucas, special effects. Summer tentpoles.",
  modern: "Franchises, streaming, global box office.",
};

const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  indie: "$10M starting cash. Lean and scrappy.",
  studio: "$25M starting cash. Comfortable footing.",
  bigSix: "$50M starting cash. You're already a major.",
};

const PRESET_PALETTES = [
  { primary: "#D4AF37", accent: "#0a0a0a", name: "Gold" },
  { primary: "#B91C2B", accent: "#fff0d4", name: "Crimson" },
  { primary: "#0E4D8F", accent: "#ffd700", name: "Navy" },
  { primary: "#2D4A3E", accent: "#dcc89f", name: "Forest" },
  { primary: "#5D2E8C", accent: "#ffd700", name: "Royal" },
  { primary: "#1c1c1c", accent: "#ff6b35", name: "Onyx" },
];

export default function MogulHub() {
  const studio = useMogul(s => s.studio);
  const hydrated = useMogul(s => s.hydrated);
  const loadFromDb = useMogul(s => s.loadFromDb);
  const switchStudio = useMogul(s => s.switchStudio);
  const removeStudio = useMogul(s => s.removeStudio);
  const newStudio = useMogul(s => s.newStudio);
  const navigate = useNavigate();

  const [showWizard, setShowWizard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyOn, setKeyOn] = useState(hasAnthropicKey());
  const [saves, setSaves] = useState<Awaited<ReturnType<typeof listMogulStudios>>>([]);
  const closeSettings = () => { setSettingsOpen(false); setKeyOn(hasAnthropicKey()); };

  useEffect(() => { if (!hydrated) loadFromDb(); }, [hydrated]);
  useEffect(() => { listMogulStudios().then(setSaves); }, [studio?.id, studio?.modifiedAt]);

  const enterCurrent = () => { if (studio) navigate("/mogul/studio"); };

  return (
    <div className="min-h-screen safe-top safe-bottom" style={{ background: "linear-gradient(180deg, #1a0a14 0%, #050306 100%)" }}>
      <header className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/play")}
          className="rounded-full bg-white/5 flex items-center justify-center pressable touch-target"
          aria-label="Back to arcade"
          style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#D4AF37" }}>BERRY KID'S ARCADE</div>
          <div className="font-display text-2xl tracking-widest">🎬 BECKETT MOVIE STUDIOS</div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-full flex items-center justify-center pressable touch-target relative"
          aria-label="Arcade settings"
          style={{
            width: 44, height: 44, minWidth: 44, minHeight: 44, touchAction: "manipulation",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: keyOn ? "#D4AF37" : "#9aa6bf",
          }}
        >
          <SettingsIcon size={18} />
          {!keyOn && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />}
        </button>
      </header>

      <div className="px-4 pb-12 max-w-2xl mx-auto space-y-4">
        {studio && (
          <button
            onClick={enterCurrent}
            className="w-full text-left rounded-2xl p-5 pressable touch-target flex items-center gap-4 min-h-[88px]"
            style={{
              background: `linear-gradient(135deg, ${studio.player.primary}55, rgba(15,8,20,0.85))`,
              border: `1px solid ${studio.player.primary}aa`,
              boxShadow: `0 12px 40px ${studio.player.primary}33`,
              touchAction: "manipulation",
            }}
          >
            <div className="text-4xl shrink-0">🎬</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em]" style={{ color: studio.player.accent }}>CONTINUE</div>
              <div className="font-display text-xl truncate" style={{ color: "#fff" }}>{studio.player.name}</div>
              <div className="text-[12px] text-ink-100 mt-0.5">
                {ERA_LABEL[studio.era]} · {studio.year} · ${studio.player.cash.toFixed(1)}M · {"★".repeat(studio.player.prestige)}
              </div>
            </div>
            <Play size={20} style={{ color: studio.player.accent }} />
          </button>
        )}

        <button
          onClick={() => setShowWizard(true)}
          className="w-full text-left rounded-2xl p-5 pressable touch-target flex items-center gap-4 min-h-[80px]"
          style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(15,8,20,0.7))", border: "1px solid rgba(212,175,55,0.5)", touchAction: "manipulation" }}
        >
          <div className="text-3xl shrink-0">⭐</div>
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-widest text-lg" style={{ color: "#D4AF37" }}>NEW STUDIO</div>
            <div className="text-[12px] text-ink-100 mt-0.5">Build a Hollywood empire from scratch.</div>
          </div>
          <Plus size={20} style={{ color: "#D4AF37" }} />
        </button>

        {saves.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1 mt-4">SAVED STUDIOS · {saves.length}</div>
            {saves.map(rec => {
              const isActive = rec.id === studio?.id;
              return (
                <div
                  key={rec.id}
                  className="rounded-xl p-3"
                  style={{
                    background: isActive ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display tracking-widest text-sm truncate">
                        {rec.data.player.name}
                        {isActive && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#D4AF37", color: "#0a0a0a" }}>ACTIVE</span>}
                      </div>
                      <div className="text-[11px] text-ink-200 truncate">
                        {rec.data.player.moguleName} · {rec.data.year} · ${rec.data.player.cash.toFixed(1)}M cash · {"★".repeat(rec.data.player.prestige)}
                      </div>
                    </div>
                    {!isActive && (
                      <button onClick={() => switchStudio(rec.id).then(() => navigate("/mogul/studio"))} className="px-3 py-2 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }}>
                        Load
                      </button>
                    )}
                    <button onClick={() => { if (confirm(`Delete ${rec.data.player.name}?`)) removeStudio(rec.id); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-red-300 pressable touch-target bg-white/5 border border-white/10" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showWizard && (
        <NewStudioWizard
          onCancel={() => setShowWizard(false)}
          onCreate={async (opts) => {
            await newStudio(opts);
            setShowWizard(false);
            navigate("/mogul/studio");
          }}
        />
      )}

      {settingsOpen && <ArcadeSettings onClose={closeSettings} />}
    </div>
  );
}

function NewStudioWizard({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (opts: { moguleName: string; studioName: string; era: Era; difficulty: Difficulty; primary: string; accent: string }) => Promise<void>;
}) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [moguleName, setMoguleName] = useState("");
  const [studioName, setStudioName] = useState("");
  const [era, setEra] = useState<Era>("blockbuster");
  const [diff, setDiff] = useState<Difficulty>("studio");
  const [palette, setPalette] = useState(PRESET_PALETTES[0]);
  const [busy, setBusy] = useState(false);

  const canNext = step === 0 ? moguleName.trim().length > 0 && studioName.trim().length > 0 : true;

  const submit = async () => {
    setBusy(true);
    await onCreate({
      moguleName: moguleName.trim(),
      studioName: studioName.trim(),
      era, difficulty: diff,
      primary: palette.primary, accent: palette.accent,
    });
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-md rounded-3xl p-5 shadow-2xl" style={{ background: "linear-gradient(180deg, rgba(20,12,28,0.98), rgba(8,4,12,0.98))", border: "1px solid rgba(212,175,55,0.45)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#D4AF37" }}>NEW STUDIO · STEP {step + 1} / 4</div>
          <button onClick={onCancel} className="text-ink-300 text-xs pressable touch-target">Cancel</button>
        </div>

        {step === 0 && (
          <>
            <h2 className="font-display text-2xl mb-3">Who are you, and what's the studio?</h2>
            <label className="block text-[11px] text-ink-200 mb-1">Your name (the mogul)</label>
            <input value={moguleName} onChange={e => setMoguleName(e.target.value)} placeholder="Henry Spielberg" className="w-full px-3 py-2 rounded-lg mb-3 bg-white/10 border border-white/15" />
            <label className="block text-[11px] text-ink-200 mb-1">Studio name</label>
            <input value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="Apex Pictures" className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15" />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-2xl mb-3">Pick an era to start in.</h2>
            <div className="space-y-2">
              {ERAS.map(e => (
                <button key={e} onClick={() => setEra(e)} className="w-full text-left p-3 rounded-xl pressable touch-target" style={{ background: era === e ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${era === e ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.08)"}` }}>
                  <div className="flex items-baseline justify-between">
                    <div className="font-display tracking-widest text-sm" style={{ color: era === e ? "#D4AF37" : "#fff" }}>{ERA_LABEL[e]}</div>
                    <div className="text-[10px] text-ink-300">{ERA_START_YEAR[e]}</div>
                  </div>
                  <div className="text-[11px] text-ink-200">{ERA_BLURB[e]}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-2xl mb-3">Pick your difficulty.</h2>
            <div className="space-y-2">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDiff(d)} className="w-full text-left p-3 rounded-xl pressable touch-target" style={{ background: diff === d ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${diff === d ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.08)"}` }}>
                  <div className="flex items-baseline justify-between">
                    <div className="font-display tracking-widest text-sm capitalize" style={{ color: diff === d ? "#D4AF37" : "#fff" }}>{d === "bigSix" ? "Big Six" : d}</div>
                    <div className="text-[10px] text-ink-300">${DIFFICULTY_START_CASH[d]}M</div>
                  </div>
                  <div className="text-[11px] text-ink-200">{DIFFICULTY_BLURB[d]}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-2xl mb-3">Pick your studio colors.</h2>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_PALETTES.map(p => (
                <button key={p.name} onClick={() => setPalette(p)} className="rounded-xl p-3 pressable touch-target" style={{ background: p.primary, border: palette.name === p.name ? `2px solid ${p.accent}` : "2px solid transparent" }}>
                  <div className="text-xs font-display" style={{ color: p.accent }}>{p.name}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-between mt-5">
          <button onClick={() => setStep((step - 1) as 0 | 1 | 2 | 3)} disabled={step === 0} className="px-4 py-2 rounded-lg text-xs pressable touch-target bg-white/5 border border-white/10 disabled:opacity-30">Back</button>
          {step < 3 ? (
            <button onClick={() => setStep((step + 1) as 0 | 1 | 2 | 3)} disabled={!canNext} className="px-5 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: "#D4AF37", color: "#0a0a0a" }}>
              Next →
            </button>
          ) : (
            <button onClick={submit} disabled={busy} className="px-5 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target disabled:opacity-40" style={{ background: "#D4AF37", color: "#0a0a0a" }}>
              {busy ? "Opening…" : "Open the studio →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
