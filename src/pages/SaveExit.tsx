// Save & Exit — the "leave franchise" tab. Wraps the existing
// SaveSlotsManager and provides an Exit button that takes the user
// back to the Baseball Hub.
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { SaveSlotsManager } from "../components/SaveSlotsManager";
import { motion } from "framer-motion";
import { LogOut, Save } from "lucide-react";

export default function SaveExit() {
  const navigate = useNavigate();
  const league = useStore(s => s.league);
  const modifiedAt = league?.modifiedAt;
  const lastSavedMs = modifiedAt ? Date.now() - modifiedAt : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl mx-auto">
      <header>
        <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">FRANCHISE</div>
        <h1 className="font-display text-3xl mt-1">💾 Save &amp; Exit</h1>
        <div className="text-sm text-ink-200 mt-1">
          Your progress auto-saves after every action.
          {lastSavedMs != null && <span className="ml-1">Last saved {prettyAgo(lastSavedMs)}.</span>}
        </div>
      </header>

      <div className="rounded-2xl p-5 card-elevated" style={{ background: "linear-gradient(135deg, rgba(255,179,2,0.10), rgba(15,25,45,0.6))", border: "1px solid rgba(255,179,2,0.30)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Save size={18} className="text-amber-300" />
          <div className="font-display tracking-widest text-amber-300">YOUR FRANCHISES</div>
        </div>
        <SaveSlotsManager />
      </div>

      <div className="rounded-2xl p-5 card-elevated text-center" style={{ background: "rgba(15,25,45,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-sm text-ink-200 mb-3">Done managing? Head back to the Baseball Hub.</div>
        <button
          onClick={() => navigate("/baseball")}
          className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-display tracking-widest pressable touch-target"
          style={{ background: "#ffb302", color: "#0a0d13", touchAction: "manipulation" }}
        >
          <LogOut size={16} /> EXIT TO BASEBALL HUB
        </button>
      </div>
    </motion.div>
  );
}

function prettyAgo(ms: number): string {
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
