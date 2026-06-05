// Football — Draft Class review page.
//
// After each offseason, ageAndDevelop drops a fresh rookie class onto
// the league and stamps `league.lastDraftClass`. This page surfaces
// that class so the user can scout it: filter by position, sort by OVR
// or potential, see who landed on their team highlighted, scout
// individual rookies to tighten the noisy potential estimate.

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Gem } from "lucide-react";
import { useFootball } from "../store";
import { scoutRookie } from "../development";
import type { FootballPosition } from "../types";

const POS_FILTERS: Array<FootballPosition | "ALL"> = ["ALL", "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"];

export default function FootballDraftClass() {
  const lg = useFootball(s => s.league);
  const mutate = useFootball(s => s.mutate);
  const [filter, setFilter] = useState<FootballPosition | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<"overall" | "potential">("overall");

  if (!lg) return <div className="p-8">No league</div>;

  // Pull the most recent class. If there isn't one yet, point the user
  // back to the home page to roll the offseason.
  const lastClass = lg.lastDraftClass;
  const rookies = useMemo(() => {
    if (!lastClass) return [];
    const ids = new Set(lastClass.rookieIds);
    return lg.players.filter(p => ids.has(p.id));
  }, [lg.players, lastClass]);

  const filtered = useMemo(() => {
    let pool = rookies;
    if (filter !== "ALL") pool = pool.filter(p => p.position === filter);
    return pool.slice().sort((a, b) => {
      if (sortKey === "overall") return b.overall - a.overall;
      const ap = (a as any).scoutedPotential ?? a.potential;
      const bp = (b as any).scoutedPotential ?? b.potential;
      return bp - ap;
    });
  }, [rookies, filter, sortKey]);

  const userTeam = lg.teams.find(t => t.id === lg.userTeamId);
  const userRookies = userTeam ? rookies.filter(r => r.teamId === userTeam.id) : [];

  async function doScout(playerId: string) {
    await mutate(lgs => {
      const p = lgs.players.find(x => x.id === playerId);
      if (p) scoutRookie(p);
    });
  }

  if (!lastClass || rookies.length === 0) {
    return (
      <div className="space-y-4 pb-32">
        <header className="flex items-center gap-3">
          <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
          <div>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>Draft Class</div>
            <h1 className="font-display text-3xl">DRAFT</h1>
          </div>
        </header>
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-2">🎓</div>
          <div className="font-display text-lg mb-1">No rookie class yet</div>
          <div className="text-sm text-ink-200">
            Finish a season — Sim through the playoffs, crown a champion, then roll the offseason from the home page. Your first rookie class lands here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>
            Class of {lastClass.season} · {rookies.length} prospects
          </div>
          <h1 className="font-display text-3xl">DRAFT CLASS</h1>
          <div className="text-xs text-ink-200 mt-1">
            Every rookie that joined the league this offseason. Tap SCOUT to tighten the potential estimate (3 scouts reveals the truth).
          </div>
        </div>
      </header>

      {/* Your team's rookies — highlight if present */}
      {userTeam && userRookies.length > 0 && (
        <section className="rounded-2xl p-3"
          style={{ background: `linear-gradient(135deg, ${userTeam.primary}33, rgba(15,8,22,0.85))`, border: `1px solid ${userTeam.primary}` }}>
          <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: userTeam.accent }}>
            {userTeam.city.toUpperCase()} {userTeam.name.toUpperCase()} · {userRookies.length} ROOKIE{userRookies.length === 1 ? "" : "S"}
          </div>
          <div className="space-y-1">
            {userRookies.sort((a, b) => b.overall - a.overall).map(p => (
              <RookieRow key={p.id} player={p} accent={userTeam.accent} onScout={() => doScout(p.id)} />
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {POS_FILTERS.map(p => (
          <button key={p} onClick={() => setFilter(p)}
            className="px-3 py-2 rounded-lg text-xs font-display tracking-wider pressable touch-target whitespace-nowrap"
            style={filter === p ? { background: "#FFB81C", color: "#0a0d13" } : { background: "rgba(255,255,255,0.05)" }}>
            {p}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setSortKey(k => k === "overall" ? "potential" : "overall")}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 pressable touch-target whitespace-nowrap"
        >
          Sort: {sortKey === "overall" ? "OVR ↓" : "POT ↓"}
        </button>
      </div>

      <div className="space-y-1">
        {filtered.slice(0, 80).map(p => {
          const team = lg.teams.find(t => t.id === p.teamId);
          const isUser = p.teamId === lg.userTeamId;
          return (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{
                background: isUser ? `${team?.primary ?? "#FFB81C"}22` : "rgba(255,255,255,0.03)",
                borderColor: isUser ? `${team?.primary ?? "#FFB81C"}66` : "rgba(255,255,255,0.10)",
              }}>
              <RookieRow player={p} accent={team?.accent ?? "#FFB81C"} onScout={() => doScout(p.id)} teamAbbr={team?.abbr} inline />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RookieRow({ player, accent, onScout, teamAbbr, inline }: {
  player: any;
  accent: string;
  onScout: () => void;
  teamAbbr?: string;
  inline?: boolean;
}) {
  const visits = player.scoutVisits ?? 0;
  const scoutedPot: number = player.scoutedPotential ?? player.potential;
  const noise = visits >= 3 ? 0 : visits === 2 ? 3 : visits === 1 ? 7 : 12;
  const potDisplay = noise === 0 ? `${scoutedPot}` : `${Math.max(40, scoutedPot - noise)}–${Math.min(99, scoutedPot + noise)}`;
  const revealed = visits >= 3 && player.hiddenGem;
  return (
    <>
      <div className="flex-1 min-w-0">
        <div className="font-display tracking-wide truncate flex items-center gap-1.5">
          {player.name}
          {revealed && <Gem size={11} className="text-purple-400" />}
          {teamAbbr && <span className="text-[9px] opacity-70" style={{ color: accent }}>· {teamAbbr}</span>}
        </div>
        <div className="text-[10px] text-ink-300">
          {player.position} · Age {player.age} ·
          <span className="ml-1">Pot: <span className="text-white font-mono">{potDisplay}</span></span>
          <span className="ml-1 opacity-70">· {visits} scout{visits === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className={`text-lg font-display w-10 text-center ${player.overall >= 85 ? "text-emerald-300" : player.overall >= 75 ? "text-amber-300" : "text-ink-200"}`}>{player.overall}</div>
      <button
        onClick={onScout}
        disabled={visits >= 3}
        className="text-[10px] px-2 py-1 rounded-md bg-white/8 border border-white/10 pressable touch-target disabled:opacity-30 inline-flex items-center gap-1"
        title="Scout this rookie — three scouts reveals the true potential."
      >
        <Search size={10} /> {visits >= 3 ? "DONE" : "SCOUT"}
      </button>
      {!inline && <div className="w-2" />}
    </>
  );
}
