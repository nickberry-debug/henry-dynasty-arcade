// Football — Stats leaderboards.
// Same shape as Baseball Stats: 8 leaderboards across 3 tabs (Passing,
// Rushing/Receiving, Defense), each top-10 with rank + team accent +
// player link. Reuses the live league.players[].seasonStats data.
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useFootball } from "../store";
import type { FootballPlayer } from "../types";

type Tab = "Passing" | "Rushing & Receiving" | "Defense";

interface Board {
  key: keyof FootballPlayer["seasonStats"];
  label: string;
  min: { stat: keyof FootballPlayer["seasonStats"]; value: number };
  sort: "desc" | "asc";
  fmt: (n: number) => string;
}

const PASS_BOARDS: Board[] = [
  { key: "passYds", label: "Passing Yards", min: { stat: "passAtt", value: 50 }, sort: "desc", fmt: n => n.toLocaleString() },
  { key: "passTD",  label: "Passing TDs",   min: { stat: "passAtt", value: 50 }, sort: "desc", fmt: n => String(n) },
  { key: "passComp",label: "Completions",   min: { stat: "passAtt", value: 50 }, sort: "desc", fmt: n => String(n) },
];
const RUSH_REC_BOARDS: Board[] = [
  { key: "rushYds",   label: "Rushing Yards",   min: { stat: "rushAtt", value: 30 },    sort: "desc", fmt: n => n.toLocaleString() },
  { key: "rushTD",    label: "Rushing TDs",     min: { stat: "rushAtt", value: 30 },    sort: "desc", fmt: n => String(n) },
  { key: "recYds",    label: "Receiving Yards", min: { stat: "receptions", value: 10 }, sort: "desc", fmt: n => n.toLocaleString() },
  { key: "receptions",label: "Receptions",      min: { stat: "receptions", value: 10 }, sort: "desc", fmt: n => String(n) },
  { key: "recTD",     label: "Receiving TDs",   min: { stat: "receptions", value: 10 }, sort: "desc", fmt: n => String(n) },
];
const DEF_BOARDS: Board[] = [
  { key: "tackles",       label: "Tackles",      min: { stat: "games", value: 3 }, sort: "desc", fmt: n => String(n) },
  { key: "sacks",         label: "Sacks",        min: { stat: "games", value: 3 }, sort: "desc", fmt: n => String(n) },
  { key: "interceptions", label: "Interceptions",min: { stat: "games", value: 3 }, sort: "desc", fmt: n => String(n) },
  { key: "forcedFumbles", label: "Forced Fumbles",min:{ stat: "games", value: 3 }, sort: "desc", fmt: n => String(n) },
];

export default function FootballStats() {
  const lg = useFootball(s => s.league);
  const [tab, setTab] = useState<Tab>("Passing");

  const teamById = useMemo(() => {
    const m: Record<string, any> = {};
    if (lg) for (const t of lg.teams) m[t.id] = t;
    return m;
  }, [lg?.teams]);

  const boards = useMemo<Array<{ board: Board; top: FootballPlayer[] }>>(() => {
    if (!lg) return [];
    const groups = tab === "Passing" ? PASS_BOARDS : tab === "Rushing & Receiving" ? RUSH_REC_BOARDS : DEF_BOARDS;
    return groups.map(b => {
      const elig = lg.players.filter(p => !p.retired && ((p.seasonStats as any)[b.min.stat] ?? 0) >= b.min.value);
      const sorted = elig.slice().sort((a, b2) => {
        const va = (a.seasonStats as any)[b.key] ?? 0;
        const vb = (b2.seasonStats as any)[b.key] ?? 0;
        return b.sort === "desc" ? vb - va : va - vb;
      });
      return { board: b, top: sorted.slice(0, 10) };
    });
  }, [lg?.players, tab]);

  if (!lg) return <div className="p-8 text-ink-200">No league.</div>;

  const allEmpty = boards.every(b => b.top.length === 0);

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
          <div>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>Leaderboards · Through Week {lg.week - 1}</div>
            <h1 className="font-display text-3xl">STATS</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {(["Passing", "Rushing & Receiving", "Defense"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-2 rounded-xl text-sm font-medium pressable touch-target"
              style={tab === t ? { background: "#FFB81C", color: "#0a0d13" } : { background: "rgba(255,255,255,0.05)" }}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {allEmpty ? (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-5xl mb-2">📊</div>
          <div className="font-display text-lg mb-1">No stats yet</div>
          <div className="text-sm text-ink-200 max-w-md mx-auto">
            Play through a few weeks of the season and the leaderboards will populate. QBs need ≥50 attempts, RBs ≥30, defenders ≥3 games.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {boards.map(({ board, top }) => (
            <section key={String(board.key)} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <h3 className="font-display text-sm uppercase tracking-widest mb-3" style={{ color: "#FFB81C" }}>{board.label}</h3>
              {top.length === 0 ? (
                <div className="text-ink-300 text-xs italic">Waiting for qualifiers…</div>
              ) : (
                <div className="space-y-0">
                  {top.map((p, i) => {
                    const team = teamById[p.teamId ?? ""];
                    return (
                      <Link key={p.id} to={`/football/player/${p.id}`}
                        className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-b-0 pressable touch-target">
                        <span className="font-mono text-ink-200 w-5 text-right">{i + 1}</span>
                        {team && (
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-display shrink-0"
                            style={{ background: team.primary, color: team.accent }}>
                            {team.abbr.slice(0, 3)}
                          </span>
                        )}
                        <span className="flex-1 text-sm truncate">{p.name}</span>
                        <span className="text-[10px] text-ink-300">{p.position}</span>
                        <span className="font-mono font-bold text-sm w-14 text-right">
                          {board.fmt((p.seasonStats as any)[board.key] ?? 0)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
