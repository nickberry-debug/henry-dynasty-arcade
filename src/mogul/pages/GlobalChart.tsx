// Movie Mogul — family-shared Top 50 Highest Grossing chart.
// Every family member's released movies compete against each other (and
// against a seeded roster of original AI-flavored filler films so the
// chart is full from day one). Cross-profile, read-only.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Trophy } from "lucide-react";
import { subscribeTopGrossing, ensureFillerSeeded, type ChartEntry } from "../globalChart";
import { useProfiles } from "../../profiles/store";
import { SyncIndicator } from "../../components/SyncIndicator";

function fmtBO(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(2)}B`;
  return `$${m.toFixed(1)}M`;
}

export default function GlobalChart() {
  const [rows, setRows] = useState<ChartEntry[] | null>(null);
  const { profiles } = useProfiles();
  const profileById = useMemo(() => {
    const m = new Map<string, { name: string; color: string; handle: string }>();
    for (const p of profiles) m.set(p.id, { name: p.name, color: p.color, handle: p.handle });
    return m;
  }, [profiles]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      // Seed filler once so the chart isn't empty, then live-subscribe so
      // any family member's release shows up here in real time.
      await ensureFillerSeeded();
      unsub = subscribeTopGrossing(50, top => setRows(top));
    })();
    return () => { if (unsub) try { unsub(); } catch { /* ignore */ } };
  }, []);

  return (
    <div className="space-y-4">
        <header className="flex items-start gap-3">
          <Trophy size={22} style={{ color: "#D4AF37" }} aria-hidden="true" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: "#D4AF37" }}>FAMILY LEADERBOARD</div>
            <h1 className="font-display text-2xl tracking-wide" style={{ color: "#fef3c7" }}>TOP 50 HIGHEST GROSSING</h1>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(254,243,199,0.7)" }}>
              Every family member competes on one chart. Your releases climb past the filler films as their box office grows.
            </p>
          </div>
          <SyncIndicator />
        </header>

        {!rows && (
          <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "rgba(254,243,199,0.7)" }}>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span className="text-sm">Loading the family chart…</span>
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="rounded-xl p-6 text-center"
            style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", color: "#fef3c7" }}>
            <div className="font-display text-base mb-1">The chart is empty.</div>
            <div className="text-[12px] opacity-80">Release a movie or refresh — the family list will appear here.</div>
          </div>
        )}

        {rows && rows.length > 0 && (
          <ol className="space-y-1.5">
            {rows.map((r, i) => {
              const prof = r.profileId ? profileById.get(r.profileId) : null;
              const isReal = r.source === "real";
              const accent = prof?.color || (isReal ? "#86efac" : "#9aa6bf");
              return (
                <motion.li key={r.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.4, i * 0.012) }}
                  className="rounded-lg px-3 py-2 flex items-center gap-3"
                  style={{
                    background: isReal
                      ? `linear-gradient(135deg, ${accent}28, rgba(15,10,5,0.85))`
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isReal ? accent + "66" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  <span className="font-display text-base tabular-nums w-8 text-center"
                    style={{ color: i < 3 ? "#fde047" : "rgba(254,243,199,0.7)" }}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm tracking-wide truncate" style={{ color: "#fef3c7" }}>
                      {r.title}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "rgba(254,243,199,0.6)" }}>
                      {r.genre} · {r.releaseYear} ·{" "}
                      <span style={{ color: accent }}>
                        {isReal ? (prof?.handle ?? r.releasedBy) : "filler"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm tabular-nums" style={{ color: isReal ? accent : "#fef3c7" }}>
                      {fmtBO(r.totalBO)}
                    </div>
                    <div className="text-[9px]" style={{ color: "rgba(254,243,199,0.5)" }}>
                      C {r.criticScore} · A {r.audienceScore}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}

        <div className="text-[10px] mt-3 text-center" style={{ color: "rgba(254,243,199,0.45)" }}>
          Filler films are original placeholder titles seeded so the chart is never empty. Real releases displace filler as their gross climbs.
        </div>
    </div>
  );
}
