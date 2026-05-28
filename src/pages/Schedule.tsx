import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { fmt } from "../utils/format";
import { useState, useMemo } from "react";
import { GameWatch } from "./GameWatch";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";

export default function Schedule() {
  const league = useStore(s => s.league);
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  // Memoize the per-day grouping — walks the full 2,430-game schedule
  // once instead of every render. Visible-window slice is also cheap to
  // recompute when league.day advances.
  const { days, byDay } = useMemo(() => {
    const grouping: Record<number, any[]> = {};
    if (league) for (const g of league.schedule) (grouping[g.day] = grouping[g.day] || []).push(g);
    const dayList = Object.keys(grouping).map(Number).sort((a, b) => a - b);
    return { days: dayList, byDay: grouping };
  }, [league?.schedule]);
  if (!league) return null;
  const start = Math.max(0, league.day - 3);
  const end = Math.min(days[days.length - 1] ?? 0, league.day + 14);

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] text-ink-200 uppercase tracking-widest">Calendar</div>
        <h1 className="font-display text-4xl">SCHEDULE</h1>
      </header>
      {days.filter(d => d >= start && d <= end).map(d => (
        <div key={d}>
          <div className="text-[11px] uppercase tracking-widest text-ink-200 mb-2 px-1">
            Day {d} — {fmt.date(league.year, d)}
            {d === league.day && <span className="ml-2 px-2 py-0.5 rounded-full bg-accent text-ink-950 text-[10px]">TODAY</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {byDay[d].map(g => {
              const h = league.teams.find(t => t.id === g.homeId)!;
              const a = league.teams.find(t => t.id === g.awayId)!;
              const wonHome = g.score && g.score.home > g.score.away;
              return (
                <button key={g.id} onClick={() => setOpenGameId(g.id)} className="text-left bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl px-3 py-2 pressable touch-target flex items-center gap-2">
                  <TeamLogo team={a} size={28} variant="cap" />
                  <span className={`flex-1 font-medium text-sm ${g.played && !wonHome ? "text-white" : "text-ink-200"}`}>{a.abbr}</span>
                  {g.played ? (
                    <span className={`font-mono font-bold text-sm ${!wonHome ? "text-accent" : "text-ink-200"}`}>{g.score.away}</span>
                  ) : <span className="text-ink-200 text-xs">@</span>}
                  {g.played ? (
                    <span className={`font-mono font-bold text-sm ${wonHome ? "text-accent" : "text-ink-200"}`}>{g.score.home}</span>
                  ) : <span className="text-ink-200 text-xs">at</span>}
                  <span className={`flex-1 font-medium text-sm text-right ${g.played && wonHome ? "text-white" : "text-ink-200"}`}>{h.abbr}</span>
                  <TeamLogo team={h} size={28} variant="cap" />
                  {!g.played && (
                    <Link
                      to={`/live?gameId=${g.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 w-9 h-9 rounded-lg bg-emerald-500/80 flex items-center justify-center pressable touch-target"
                      title="Play this game live"
                    >
                      <Play size={14} className="text-white" />
                    </Link>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {openGameId && <GameWatch gameId={openGameId} onClose={() => setOpenGameId(null)} />}
    </div>
  );
}
