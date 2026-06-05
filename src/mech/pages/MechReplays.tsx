// Scrapyard Kings — battle replays log. Pulls save.battles (capped to
// the last 20) and renders each as a tappable card showing the matchup,
// winner, duration, and prize. Tapping queues up a fresh fight against
// the same rival shape via the Family Roster "challenger" handoff.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Skull, Clock } from "lucide-react";
import { useMech } from "../store";
import { LEAGUE_INFO } from "../types";

export default function MechReplays() {
  const navigate = useNavigate();
  const { save } = useMech();

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 20% 0%, rgba(251,146,60,0.16), transparent 60%), " +
          "linear-gradient(180deg, #1a0a05 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/mech")} aria-label="Back to Scrapyard Hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fb923c" }}>SCRAPYARD KINGS</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>REPLAYS</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
            Last {save.battles.length} battle{save.battles.length === 1 ? "" : "s"} · {save.wins}W / {save.losses}L overall
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        {save.battles.length === 0 ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-4xl mb-2">🤖</div>
            <div className="font-display text-base" style={{ color: "#fef3c7" }}>No battles yet.</div>
            <div className="text-[12px] mt-1" style={{ color: "rgba(229,231,235,0.65)" }}>
              Win or lose, every fight goes in your replay log.
            </div>
            <button onClick={() => navigate("/mech")}
              className="mt-4 px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
              style={{ background: "#fb923c", color: "#0a0a14" }}>
              Find a Fight
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {save.battles.map((b, i) => {
              const won = b.winner === "left";
              const ago = Math.max(1, Math.round((Date.now() - b.whenMs) / 60_000));
              return (
                <motion.div key={b.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.4, i * 0.04) }}
                  className="rounded-2xl p-3"
                  style={{
                    background: won
                      ? "linear-gradient(135deg, rgba(134,239,172,0.10), rgba(10,10,20,0.85))"
                      : "linear-gradient(135deg, rgba(252,165,165,0.10), rgba(10,10,20,0.85))",
                    border: `1.5px solid ${won ? "#86efac" : "#fca5a5"}55`,
                  }}>
                  <div className="flex items-center gap-2">
                    {won
                      ? <Trophy size={16} style={{ color: "#86efac" }} aria-hidden="true" />
                      : <Skull  size={16} style={{ color: "#fca5a5" }} aria-hidden="true" />}
                    <div className="font-display text-[13px] flex-1 truncate" style={{ color: "#fef3c7" }}>
                      {b.left.botName} vs {b.right.botName}
                    </div>
                    <div className="text-[9px] tracking-widest uppercase" style={{ color: won ? "#86efac" : "#fca5a5" }}>
                      {won ? "WIN" : "LOSS"}
                    </div>
                  </div>
                  <div className="text-[11px] mt-1.5" style={{ color: "rgba(229,231,235,0.85)" }}>
                    {b.summary}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-white/8">
                    <div className="text-[10px] flex items-center gap-2" style={{ color: "rgba(229,231,235,0.7)" }}>
                      <span style={{ color: "#fb923c" }}>{LEAGUE_INFO[b.league]?.label ?? b.league}</span>
                      <Clock size={10} aria-hidden="true" />
                      <span>{(b.durationMs / 1000).toFixed(1)}s</span>
                      <span>·</span>
                      <span>{ago}m ago</span>
                    </div>
                    <button onClick={() => navigate("/mech/battle")}
                      className="text-[10px] tracking-widest px-3 py-1 rounded-full pressable touch-target"
                      style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.40)", color: "#fb923c" }}>
                      REMATCH →
                    </button>
                  </div>
                </motion.div>
              );
            })}
            <div className="text-[10px] text-center pt-4 opacity-60" style={{ color: "#fb923c" }}>
              Replay history caps at 20 battles per profile.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
