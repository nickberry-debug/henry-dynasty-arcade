// Football free agency — list of unsigned players, sortable by overall.
// User can sign any to their team during the offseason window. After the
// new season starts, the FA pool freezes (CPU has already snapped up
// the rest via cpuAutoSignFAs).
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFootball } from "../store";
import { signFreeAgent } from "../freeagency";
import type { FootballPosition } from "../types";
import { ArrowLeft } from "lucide-react";

const POS_FILTERS: Array<FootballPosition | "ALL"> = ["ALL", "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"];

export default function FootballFreeAgency() {
  const lg = useFootball(s => s.league);
  const mutate = useFootball(s => s.mutate);
  const [filter, setFilter] = useState<FootballPosition | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<"overall" | "age">("overall");

  if (!lg) return <div className="p-8">No league</div>;

  const userTeam = lg.teams.find(t => t.id === lg.userTeamId);

  const filtered = useMemo(() => {
    let pool = lg.freeAgents;
    if (filter !== "ALL") pool = pool.filter(p => p.position === filter);
    return pool.slice().sort((a, b) => sortKey === "overall" ? b.overall - a.overall : a.age - b.age);
  }, [lg.freeAgents, filter, sortKey]);

  const sign = async (playerId: string) => {
    if (!userTeam) return;
    await mutate(lgs => { signFreeAgent(lgs, playerId, userTeam.id); });
  };

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>{lg.freeAgents.length} available</div>
          <h1 className="font-display text-3xl">FREE AGENCY</h1>
          <div className="text-xs text-ink-200 mt-1">Sign players to {userTeam ? userTeam.city + " " + userTeam.name : "your team"}. CPU teams will snap up the best when the season starts.</div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {POS_FILTERS.map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className="px-3 py-2 rounded-lg text-xs font-display tracking-wider pressable touch-target whitespace-nowrap"
            style={filter === p ? { background: "#FFB81C", color: "#0a0d13" } : { background: "rgba(255,255,255,0.05)" }}
          >{p}</button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setSortKey(k => k === "overall" ? "age" : "overall")}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target whitespace-nowrap"
        >
          Sort: {sortKey === "overall" ? "OVR ↓" : "Age ↑"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-2">📋</div>
          <div className="font-display text-lg mb-1">No free agents available</div>
          <div className="text-sm text-ink-200">Free agency opens after each season ends.</div>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.slice(0, 100).map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 border border-white/10">
              <div className="flex-1 min-w-0">
                <div className="font-display tracking-wide truncate">{p.name}</div>
                <div className="text-[10px] text-ink-300">{p.position} · Age {p.age} · {p.yearsExp}y exp · Potential {p.potential}</div>
              </div>
              <div className={`text-lg font-display w-10 text-center ${p.overall >= 85 ? "text-emerald-300" : p.overall >= 75 ? "text-amber-300" : "text-ink-200"}`}>{p.overall}</div>
              <button
                onClick={() => sign(p.id)}
                disabled={!userTeam}
                className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider pressable touch-target disabled:opacity-40"
                style={{ background: "#FFB81C", color: "#0a0d13" }}
              >Sign</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
