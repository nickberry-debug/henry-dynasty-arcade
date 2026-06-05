// Live Battle Forge spectator. Subscribes to the room's liveBattle doc
// and renders the host's match as a HUD: HP bars, alive counts, map
// name, latest log line. Closes itself when the host clears the doc.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Tv } from "lucide-react";
import { subscribeLiveBattle, type LiveBattleFrame } from "../sync/liveBattle";

export default function SpectateLive() {
  const navigate = useNavigate();
  const [frame, setFrame] = useState<LiveBattleFrame | null | undefined>(undefined);

  useEffect(() => {
    return subscribeLiveBattle(setFrame);
  }, []);

  // Auto-leave after the host clears (frame becomes null after a "done"
  // result was shown for 30s).
  useEffect(() => {
    if (frame === null) {
      const t = setTimeout(() => navigate("/"), 3000);
      return () => clearTimeout(t);
    }
  }, [frame, navigate]);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background: "radial-gradient(900px 600px at 50% 0%, rgba(255,68,68,0.18), transparent 60%), linear-gradient(180deg, #1a0808 0%, #050208 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display flex items-center gap-1.5" style={{ color: "#fca5a5" }}>
            <Tv size={11} aria-hidden="true" /> SPECTATE · LIVE
          </div>
          <h1 className="font-display text-xl tracking-wider" style={{ color: "#fde047" }}>BATTLE FORGE</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        {frame === undefined && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#fef3c7" }}>
            Connecting to the room…
          </div>
        )}
        {frame === null && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#fef3c7" }}>
            <Eye size={28} aria-hidden="true" className="mx-auto mb-2 opacity-70" />
            <div className="font-display text-base mb-1">No live battle right now.</div>
            <div className="text-[12px] opacity-70">A family member needs to start a Battle Forge fight for it to appear here. Returning home shortly…</div>
          </div>
        )}
        {frame && (
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${frame.hostProfileColor}22, rgba(20,5,5,0.95))`,
              border: `1.5px solid ${frame.hostProfileColor}88`,
              boxShadow: `0 8px 24px -8px ${frame.hostProfileColor}66`,
            }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[9px] tracking-[0.3em] uppercase" style={{ color: frame.hostProfileColor }}>
                  Hosted by {frame.hostProfileName}
                </div>
                <div className="font-display text-base tracking-wide" style={{ color: "#fef3c7" }}>
                  {frame.mapName}
                </div>
              </div>
              {frame.phase === "battle" && (
                <span className="text-[9px] tracking-[0.3em] font-display px-2 py-0.5 rounded-full"
                  style={{ background: "#fca5a5", color: "#3a0505" }}>● LIVE</span>
              )}
              {frame.phase === "done" && (
                <span className="text-[9px] tracking-[0.3em] font-display px-2 py-0.5 rounded-full"
                  style={{ background: "#fde047", color: "#3a2a05" }}>RESULT</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TeamPanel
                label={frame.teamALabel}
                color="#3D9BFF"
                hpFrac={frame.aHp / Math.max(1, frame.aMax)}
                alive={frame.aAlive}
                winning={frame.winner === "A"}
              />
              <TeamPanel
                label={frame.teamBLabel}
                color="#FF5544"
                hpFrac={frame.bHp / Math.max(1, frame.bMax)}
                alive={frame.bAlive}
                winning={frame.winner === "B"}
              />
            </div>

            {frame.lastLog && (
              <div className="mt-3 text-[12px] text-center italic" style={{ color: "rgba(229,231,235,0.8)" }}>
                "{frame.lastLog}"
              </div>
            )}

            {frame.phase === "done" && (
              <div className="mt-3 rounded-xl p-3 text-center"
                style={{ background: "rgba(253,224,71,0.15)", border: "1.5px solid #fde047", color: "#fde047" }}>
                <div className="font-display tracking-widest text-sm">
                  {frame.winner === "draw" ? "DEAD HEAT" : `${frame.winner === "A" ? frame.teamALabel : frame.teamBLabel} WINS`}
                </div>
              </div>
            )}
          </motion.section>
        )}
      </main>
    </div>
  );
}

function TeamPanel({ label, color, hpFrac, alive, winning }: { label: string; color: string; hpFrac: number; alive: number; winning: boolean }) {
  return (
    <div className="rounded-xl p-3"
      style={{
        background: `linear-gradient(135deg, ${color}1f, rgba(0,0,0,0.5))`,
        border: `1.5px solid ${winning ? "#fde047" : color + "55"}`,
        boxShadow: winning ? `0 0 16px ${"#fde047"}55` : undefined,
      }}>
      <div className="font-display text-sm tracking-wide truncate" style={{ color }}>{label}</div>
      <div className="h-2.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(0,0,0,0.55)" }}>
        <motion.div animate={{ width: `${Math.max(0, hpFrac * 100)}%` }} transition={{ duration: 0.2 }}
          className="h-full" style={{ background: hpFrac > 0.5 ? "#86efac" : hpFrac > 0.25 ? "#fbbf24" : "#f87171" }} />
      </div>
      <div className="text-[10px] mt-1 opacity-80" style={{ color: "#fef3c7" }}>{alive} alive</div>
    </div>
  );
}
