import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Target, Zap } from "lucide-react";

const ACCENT = "#34D399";

function fmtCount(n: number): string {
  return n.toLocaleString();
}

function loadStats() {
  try {
    const raw = localStorage.getItem("dd_standalone_training_stats");
    if (raw) return JSON.parse(raw) as { swings: number; pitches: number; crushed: number; painted: number };
  } catch {}
  return { swings: 0, pitches: 0, crushed: 0, painted: 0 };
}

export default function BaseballTraining() {
  const navigate = useNavigate();
  const stats = loadStats();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #020d08 0%, #030c15 100%)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
      }}
    >
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => navigate("/resources")}
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "rgba(255,255,255,0.4)" }}>RESOURCES</div>
          <div className="font-display text-2xl tracking-widest" style={{ color: ACCENT }}>⚾ TRAINING CENTER</div>
        </div>
      </header>

      <div className="flex-1 px-4 max-w-2xl mx-auto w-full space-y-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Practice hitting and pitching with AI coaching feedback and camera form analysis.
          No franchise required — just pick up and practice.
        </motion.div>

        {/* Stat chips */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Swings", value: stats.swings },
            { label: "Pitches", value: stats.pitches },
            { label: "Crushed", value: stats.crushed },
            { label: "Painted", value: stats.painted },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="font-display text-xl" style={{ color: ACCENT }}>{fmtCount(s.value)}</div>
              <div className="text-[9px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label.toUpperCase()}</div>
            </motion.div>
          ))}
        </div>

        {/* Main mode cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 220, damping: 22 }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate("/resources/baseball-training/hit")}
            className="relative text-left rounded-2xl overflow-hidden p-6 pressable touch-target min-h-[200px] flex flex-col justify-end"
            style={{
              background: "linear-gradient(135deg, rgba(52,211,153,0.24), rgba(2,15,10,0.97))",
              border: "1px solid rgba(52,211,153,0.35)",
              touchAction: "manipulation",
            }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(300px 120px at 70% -5%, #34d399, transparent)" }} />
            <div className="relative">
              <div className="text-6xl mb-3">🥎</div>
              <div className="font-display text-[10px] tracking-[0.3em] mb-1" style={{ color: "#34d399" }}>BATTING PRACTICE</div>
              <div className="font-display text-2xl tracking-wide" style={{ color: "white" }}>HITTING</div>
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>Tap the zone to swing. AI Coach Billy gives real-time tips on every at-bat.</p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, type: "spring", stiffness: 220, damping: 22 }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate("/resources/baseball-training/pitch")}
            className="relative text-left rounded-2xl overflow-hidden p-6 pressable touch-target min-h-[200px] flex flex-col justify-end"
            style={{
              background: "linear-gradient(135deg, rgba(96,165,250,0.24), rgba(5,12,30,0.97))",
              border: "1px solid rgba(96,165,250,0.35)",
              touchAction: "manipulation",
            }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(300px 120px at 70% -5%, #60a5fa, transparent)" }} />
            <div className="relative">
              <div className="text-6xl mb-3">⚾</div>
              <div className="font-display text-[10px] tracking-[0.3em] mb-1" style={{ color: "#60a5fa" }}>BULLPEN PRACTICE</div>
              <div className="font-display text-2xl tracking-wide" style={{ color: "white" }}>PITCHING</div>
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>Tap the strike zone to pitch. Works full count, tracks arm safety, camera form check.</p>
            </div>
          </motion.button>
        </div>

        {/* Tips strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-[10px] tracking-[0.3em] font-display mb-3 flex items-center gap-2" style={{ color: ACCENT }}>
            <Target size={12} /> COACH BILLY'S TIPS
          </div>
          <div className="space-y-2 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            <div className="flex items-start gap-2"><Zap size={11} className="mt-0.5 shrink-0" style={{ color: ACCENT }} /><span>Keep your elbow up through the swing — it's the #1 thing that creates power.</span></div>
            <div className="flex items-start gap-2"><Zap size={11} className="mt-0.5 shrink-0" style={{ color: "#60a5fa" }} /><span>Pitchers: stay balanced on your plant foot. Balance = control.</span></div>
            <div className="flex items-start gap-2"><Zap size={11} className="mt-0.5 shrink-0" style={{ color: "#f472b6" }} /><span>Turn on Camera Coach to get pose-based form feedback on every rep.</span></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
