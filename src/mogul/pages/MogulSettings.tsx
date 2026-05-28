// Mogul Settings — API keys live in the arcade-wide settings now (one
// paste, every game uses them). This page is a thin redirect to the
// arcade settings + a status pill.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import { hasAnthropicKey } from "../../arcade/keys";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";

export default function MogulSettings() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [keyOn, setKeyOn] = useState(hasAnthropicKey());
  const onClose = () => { setOpen(false); setKeyOn(hasAnthropicKey()); };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate("/mogul/studio")} className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center pressable touch-target" style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">BECKETT MOVIE STUDIOS</div>
          <h1 className="font-display text-2xl">⚙️ Settings</h1>
        </div>
      </header>

      <section className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.10), rgba(20,12,28,0.65))", border: "1px solid rgba(212,175,55,0.30)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} style={{ color: "#D4AF37" }} />
          <div className="font-display tracking-widest" style={{ color: "#D4AF37" }}>AI FEATURES</div>
        </div>
        <div className="text-[12px] text-ink-200 mb-3">
          API keys are managed <strong>arcade-wide</strong> — paste once on the
          Landing page and Beckett Movie Studios uses them along with Olympus
          and Wordplay Hub.
        </div>

        <div
          className="rounded-md px-3 py-2 mb-3 inline-flex items-center gap-1.5 text-[12px]"
          style={{
            background: keyOn ? "rgba(52,211,153,0.10)" : "rgba(239,68,68,0.10)",
            border: `1px solid ${keyOn ? "rgba(52,211,153,0.35)" : "rgba(239,68,68,0.30)"}`,
            color: keyOn ? "#86efac" : "#fca5a5",
          }}
        >
          {keyOn ? <><Check size={12} /> Anthropic key configured</> : <><AlertTriangle size={12} /> No key — using built-in templates</>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: "#D4AF37", color: "#0a0a0a", minHeight: 44, touchAction: "manipulation" }}
          >
            <ExternalLink size={12} /> OPEN ARCADE SETTINGS
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs pressable touch-target"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44, touchAction: "manipulation" }}
          >
            Go to Landing
          </button>
        </div>
      </section>

      <section className="rounded-2xl p-4 text-center" style={{ background: "rgba(20,12,28,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-[12px] text-ink-200">
          The studio works fully without an API key — 200+ template scripts ship
          built in. Add a key to unlock fresh AI-generated industry news, critic
          reviews, and award speeches.
        </div>
      </section>

      {open && <ArcadeSettings onClose={onClose} />}
    </div>
  );
}
