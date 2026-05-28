import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { fmt } from "../utils/format";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";

const HIT_CATS = [
  { key: "avg", label: "Batting Avg", fmt: (n: number) => fmt.avg(n), minAb: 200, sort: "desc" as const },
  { key: "hr", label: "Home Runs", fmt: (n: number) => String(n ?? 0), minAb: 0, sort: "desc" as const },
  { key: "rbi", label: "RBI", fmt: (n: number) => String(n ?? 0), minAb: 0, sort: "desc" as const },
  { key: "r", label: "Runs", fmt: (n: number) => String(n ?? 0), minAb: 0, sort: "desc" as const },
  { key: "sb", label: "Stolen Bases", fmt: (n: number) => String(n ?? 0), minAb: 0, sort: "desc" as const },
  { key: "obp", label: "OBP", fmt: (n: number) => fmt.avg(n), minAb: 200, sort: "desc" as const },
  { key: "slg", label: "SLG", fmt: (n: number) => fmt.avg(n), minAb: 200, sort: "desc" as const },
  { key: "ops", label: "OPS", fmt: (n: number) => fmt.avg(n), minAb: 200, sort: "desc" as const }
];
const PITCH_CATS = [
  { key: "era", label: "ERA", fmt: (n: number) => fmt.era(n), minIp: 60, sort: "asc" as const },
  { key: "w", label: "Wins", fmt: (n: number) => String(n ?? 0), minIp: 0, sort: "desc" as const },
  { key: "pk", label: "Strikeouts", fmt: (n: number) => String(n ?? 0), minIp: 0, sort: "desc" as const },
  { key: "sv", label: "Saves", fmt: (n: number) => String(n ?? 0), minIp: 0, sort: "desc" as const },
  { key: "whip", label: "WHIP", fmt: (n: number) => fmt.era(n), minIp: 60, sort: "asc" as const }
];

export default function Stats() {
  const league = useStore(s => s.league);
  const [tab, setTab] = useState<"Hitting" | "Pitching">("Hitting");
  // Build a teamId → Team lookup once per render instead of running .find()
  // 80+ times across every leaderboard card.
  const teamById = useMemo(() => {
    const m: Record<string, any> = {};
    if (league) for (const t of league.teams) m[t.id] = t;
    return m;
  }, [league?.teams]);
  // Cache each leaderboard's sorted top-10 so changing the Hitting/Pitching
  // tab doesn't recompute the OTHER tab and re-runs only fire when stats
  // actually change.
  const hitBoards = useMemo(() => {
    if (!league) return [];
    return HIT_CATS.map(c => {
      const elig = league.players.filter(p => !p.isPitcher && (p.seasonStats.ab ?? 0) >= (c as any).minAb);
      const sorted = elig.slice().sort((a: any, b: any) => {
        const va = a.seasonStats[c.key] ?? 0;
        const vb = b.seasonStats[c.key] ?? 0;
        return c.sort === "desc" ? vb - va : va - vb;
      });
      return { cat: c, top: sorted.slice(0, 10) };
    });
  }, [league?.players]);
  const pitchBoards = useMemo(() => {
    if (!league) return [];
    return PITCH_CATS.map(c => {
      const elig = league.players.filter(p => p.isPitcher && (p.seasonStats.ip ?? 0) >= (c as any).minIp);
      const sorted = elig.slice().sort((a: any, b: any) => {
        const va = a.seasonStats[c.key] ?? 0;
        const vb = b.seasonStats[c.key] ?? 0;
        return c.sort === "desc" ? vb - va : va - vb;
      });
      return { cat: c, top: sorted.slice(0, 10) };
    });
  }, [league?.players]);
  if (!league) return null;
  const boards = tab === "Hitting" ? hitBoards : pitchBoards;
  const allEmpty = boards.every(b => b.top.length === 0);
  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">Leaderboards</div>
          <h1 className="font-display text-4xl">STATS</h1>
        </div>
        <div className="flex gap-2">
          {["Hitting","Pitching"].map(t => <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-xl text-sm font-medium pressable touch-target ${tab === t ? "bg-accent text-ink-950" : "bg-white/5"}`}>{t}</button>)}
        </div>
      </header>
      {/* When everything's empty (Day 0, nothing played yet), show one
          consolidated friendly empty state instead of 8 identical
          "No qualifiers yet." cards. */}
      {allEmpty ? (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-5xl mb-2">📊</div>
          <div className="font-display text-lg mb-1">No stats yet</div>
          <div className="text-sm text-ink-200 max-w-md mx-auto">Sim a few days and the leaderboards will fill up — batting averages need ≥200 ABs, ERA needs ≥60 IP.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {boards.map(({ cat, top }) => (
            <div key={cat.key} className="glass rounded-2xl p-4">
              <h3 className="font-head text-lg uppercase tracking-widest mb-3">{cat.label}</h3>
              {top.length === 0 ? (
                <div className="text-ink-300 text-xs italic">Waiting for qualifiers…</div>
              ) : top.map((p: any, i: number) => {
                const team = teamById[p.teamId];
                return (
                  <Link to={`/player/${p.id}`} key={p.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-b-0 pressable">
                    <span className="font-mono text-ink-200 w-5 text-right">{i + 1}</span>
                    {team && <TeamLogo team={team} size={20} variant="cap" />}
                    <span className="flex-1 text-sm truncate">{p.name}</span>
                    <span className="font-mono font-bold text-sm">{cat.fmt((p.seasonStats as any)[cat.key] ?? 0)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
