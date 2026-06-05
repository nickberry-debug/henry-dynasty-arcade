// Family Stats — overview of every profile's per-game progress.
// Reads from the per-profile stats keys written via recordGameSession()
// (see src/profiles/store.ts). Games that haven't started reporting yet
// will simply show "—" in their column — never an error.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useProfiles, loadStats, type GameStat, type Profile } from "./store";
import { getRecentMemories, type Memory } from "./memory";
import { subscribeBlob } from "../sync/cloudBlob";
import { SyncIndicator } from "../components/SyncIndicator";
import { MonsterCompositor } from "../art";

// Game registry — keys match what recordGameSession() is called with.
const GAMES: { id: string; label: string; emoji: string; accent: string }[] = [
  { id: "baseball",    label: "Baseball",     emoji: "⚾", accent: "#fbbf24" },
  { id: "football",    label: "Football",     emoji: "🏈", accent: "#FFB81C" },
  { id: "olympus",     label: "Olympus",      emoji: "⚔️", accent: "#DAA520" },
  { id: "mogul",       label: "Movie Studio", emoji: "🎬", accent: "#D4AF37" },
  { id: "wordplay",    label: "Wordplay",     emoji: "💬", accent: "#C084FC" },
  { id: "cosmic",      label: "Cosmic",       emoji: "🚀", accent: "#9be3ff" },
  { id: "temporal",    label: "Temporal",     emoji: "🕰️", accent: "#f5c518" },
  { id: "battleforge", label: "Battle Forge", emoji: "⚔️", accent: "#fca5a5" },
  { id: "potionlab",   label: "Potion Lab",   emoji: "🧪", accent: "#a78bfa" },
];

function fmtHours(seconds: number): string {
  if (!seconds) return "—";
  const h = seconds / 3600;
  if (h < 1) return `${Math.max(1, Math.round(seconds / 60))}m`;
  return `${h.toFixed(1)}h`;
}

interface PerProfile {
  profile: Profile;
  stats: Record<string, GameStat>;
  total: { hours: number; wins: number; sessions: number };
}

export function FamilyStats() {
  const navigate = useNavigate();
  const { profiles } = useProfiles();
  // Tick counter — bumped by cloud subscribers so loadStats() returns
  // fresh values when another device records a session.
  const [tick, setTick] = useState(0);

  // Live subscribe to every profile's stats blob. As soon as Henry's
  // iPad records a baseball win, every other device's Family Stats page
  // re-renders to show the new score. Stays unsubscribed cleanly on
  // unmount.
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    for (const p of profiles) {
      unsubs.push(subscribeBlob<Record<string, GameStat>>(
        p.id, "stats_v1", remote => {
          if (!remote) return;
          // Persist incoming snapshot locally so loadStats() returns it on
          // the next render pass. Key match the writer in profiles/store.ts.
          try { localStorage.setItem(`arcade_stats_v1::${p.id}`, JSON.stringify(remote)); } catch {}
          setTick(t => t + 1);
        }
      ));
      // Memory wall — also subscribe to each profile's memory blob so
      // moments from other devices land here live.
      unsubs.push(subscribeBlob<Memory[]>(
        p.id, "memory_v1", remote => {
          if (!Array.isArray(remote)) return;
          try { localStorage.setItem(`arcade_memory_v1::${p.id}`, JSON.stringify(remote)); } catch {}
          setTick(t => t + 1);
        }
      ));
    }
    return () => { for (const u of unsubs) try { u(); } catch { /* ignore */ } };
    // Only re-bind when the profile list changes, not on every tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length, profiles.map(p => p.id).join(",")]);

  const rows: PerProfile[] = profiles.map(p => {
    const stats = loadStats(p.id);
    let h = 0, w = 0, s = 0;
    for (const v of Object.values(stats)) { h += v.seconds; w += v.wins; s += v.sessions; }
    return { profile: p, stats, total: { hours: h, wins: w, sessions: s } };
  });
  // Keep `tick` referenced so React doesn't dead-code the dependency.
  void tick;

  // Leaderboard champions (informational, never punitive).
  const top = (metric: (p: PerProfile) => number, label: string) => {
    const best = rows.slice().sort((a, b) => metric(b) - metric(a))[0];
    if (!best || metric(best) === 0) return null;
    return { name: best.profile.name, color: best.profile.color, value: metric(best), label };
  };
  const champs = [
    top(p => p.total.hours, "Most Hours Played"),
    top(p => p.total.wins, "Most Wins"),
    top(p => Object.keys(p.stats).length, "Most Games Tried"),
    top(p => p.stats.potionlab?.level ?? 0, "Top Potion Brewer"),
    top(p => p.stats.potionlab?.discoveries ?? 0, "✦ Most Discoveries"),
    top(p => p.stats.battleforge?.wins ?? 0, "Forge Champion"),
  ].filter((x): x is { name: string; color: string; value: number; label: string } => !!x);

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, rgba(192,132,252,0.18), transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.14), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")}
          aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c9b6f0" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#ffd54a" }}>FAMILY STATS</h1>
        </div>
        <SyncIndicator />
      </header>

      <main className="flex-1 px-4 pb-8 max-w-5xl mx-auto w-full">
        {/* Family monster zoo — one deterministic Kenney monster per
         *  profile id. Same person = same monster every time. Tiny
         *  flourish so the page feels like the family has mascots. */}
        {profiles.length > 0 && (
          <section className="mb-4">
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fde047" }}>FAMILY MASCOTS</div>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
              {profiles.map(p => (
                <div key={p.id} className="flex-shrink-0 text-center rounded-xl p-2"
                  style={{
                    background: `${p.color}11`,
                    border: `1px solid ${p.color}44`,
                    minWidth: 72,
                  }}>
                  <MonsterCompositor id={p.id} size={56}
                    filter={`drop-shadow(0 2px 6px ${p.color}80)`} />
                  <div className="text-[9px] mt-1 font-display tracking-wider truncate" style={{ color: p.color, maxWidth: 60 }}>
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Champions strip */}
        {champs.length > 0 && (
          <section className="mb-4">
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#c9b6f0" }}>FAMILY CHAMPIONS</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {champs.map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-3"
                  style={{ background: `linear-gradient(135deg, ${c.color}22, rgba(10,10,20,0.7))`, border: `1px solid ${c.color}55` }}>
                  <div className="text-[9px] tracking-[0.2em] uppercase opacity-80" style={{ color: c.color }}>{c.label}</div>
                  <div className="font-display text-base mt-1" style={{ color: c.color }}>{c.name}</div>
                  <div className="text-[10px] opacity-70 mt-0.5" style={{ color: "#e5e7eb" }}>{c.value.toLocaleString()}</div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Per-profile cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((row, i) => (
            <motion.section key={row.profile.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${row.profile.color}1f, rgba(10,10,20,0.85))`,
                border: `1px solid ${row.profile.color}55`,
              }}>
              <header className="flex items-center gap-3 mb-3">
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `${row.profile.color}33`, border: `2px solid ${row.profile.color}88`,
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  <img src={row.profile.avatar} alt="" aria-hidden="true" draggable={false}
                    style={{ width: 40, height: 40, imageRendering: "pixelated", objectFit: "contain" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display tracking-wide" style={{ color: row.profile.color }}>{row.profile.name}</div>
                  <div className="text-[10px] opacity-70" style={{ color: "#e5e7eb" }}>{row.profile.tagline}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] tracking-[0.2em] uppercase opacity-60">Total</div>
                  <div className="font-display text-xs" style={{ color: row.profile.color }}>{fmtHours(row.total.hours)}</div>
                  <div className="text-[10px] opacity-70">{row.total.wins} W · {row.total.sessions} sessions</div>
                </div>
              </header>

              <div className="grid grid-cols-3 gap-1.5">
                {GAMES.map(g => {
                  const s = row.stats[g.id];
                  const has = !!s && (s.sessions > 0 || s.wins > 0 || s.level > 0);
                  return (
                    <div key={g.id} className="rounded-md p-2 text-center"
                      style={{
                        background: has ? `${g.accent}15` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${has ? g.accent + "55" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      <div className="text-base leading-none" aria-hidden="true">{g.emoji}</div>
                      <div className="text-[9px] mt-0.5 truncate" style={{ color: has ? g.accent : "#9aa6bf" }}>{g.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: has ? "#fff" : "#666" }}>
                        {has
                          ? (s.wins > 0 ? `${s.wins}W` : s.level > 0 ? `L${s.level}` : `${s.sessions}×`)
                          : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Recent moments wall for this profile. The arcade remembers
                  the cool things the player did. Cap at 4 here; full wall
                  is reachable later if we add a dedicated page. */}
              {(() => {
                const recent: Memory[] = getRecentMemories(row.profile.id, 4);
                if (recent.length === 0) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="text-[9px] uppercase tracking-[0.3em] mb-1.5" style={{ color: row.profile.color }}>
                      Recent Moments
                    </div>
                    <ul className="space-y-1">
                      {recent.map(m => (
                        <li key={m.id} className="text-[11px] leading-snug flex gap-1.5" style={{ color: "rgba(229,231,235,0.85)" }}>
                          <span aria-hidden="true">{m.emoji ?? "✨"}</span>
                          <span className="flex-1">{m.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </motion.section>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate("/family/roster")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full pressable touch-target"
            style={{
              background: "rgba(155,227,255,0.08)",
              border: "1px solid rgba(155,227,255,0.35)",
              color: "#9be3ff",
              minHeight: 36,
            }}>
            <span aria-hidden="true">⚔️</span>
            <span className="font-display tracking-widest text-[11px]">VIEW FAMILY ROSTER</span>
          </button>
        </div>

        <div className="mt-4 text-center text-[10px] opacity-70" style={{ color: "#9aa6bf" }}>
          Stats record automatically as you play. Switch player from the corner badge anytime.
        </div>
      </main>
    </div>
  );
}
