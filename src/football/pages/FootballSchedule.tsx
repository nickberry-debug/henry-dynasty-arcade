import { Link } from "react-router-dom";
import { useFootball } from "../store";
import { ArrowLeft, Play } from "lucide-react";
import { useState } from "react";

export default function FootballSchedule() {
  const lg = useFootball(s => s.league);
  if (!lg) return <div className="p-8">No league</div>;
  const [week, setWeek] = useState(lg.week);
  const games = lg.schedule.filter(g => g.week === week);
  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>17-week season</div>
          <h1 className="font-display text-3xl">SCHEDULE</h1>
        </div>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 17 }, (_, i) => i + 1).map(w => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`px-3 py-2 rounded-lg text-xs font-display tracking-wider pressable touch-target whitespace-nowrap ${week === w ? "bg-amber-400 text-ink-950" : "bg-white/5"}`}
          >
            Wk {w}{w === lg.week ? " ●" : ""}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {games.map(g => {
          const home = lg.teams.find(t => t.id === g.homeId)!;
          const away = lg.teams.find(t => t.id === g.awayId)!;
          const isMine = home.id === lg.userTeamId || away.id === lg.userTeamId;
          const homeWon = (g.score?.home ?? 0) > (g.score?.away ?? 0);
          // Only the current week's games are watchable — preventing the
          // user from "watching" a week-17 game while it's still week 3
          // (which would register wins out of order and corrupt standings).
          const watchable = !g.played && g.week === lg.week;
          const isFuture = !g.played && g.week > lg.week;
          const className = `flex items-center gap-3 px-3 py-3 rounded-xl border touch-target ${isMine ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/5"} ${isFuture ? "opacity-60" : "pressable"}`;
          const body = (
            <>
              <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className={`flex items-center gap-2 ${g.played && !homeWon ? "text-emerald-300" : "text-ink-100"}`}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-display" style={{ background: away.primary, color: away.accent }}>{away.abbr}</div>
                  <span className="font-display text-sm">{away.abbr}</span>
                  {g.played && <span className="font-mono text-sm ml-auto">{g.score?.away}</span>}
                </div>
                <div className="text-ink-400 text-xs">@</div>
                <div className={`flex items-center gap-2 ${g.played && homeWon ? "text-emerald-300" : "text-ink-100"}`}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-display" style={{ background: home.primary, color: home.accent }}>{home.abbr}</div>
                  <span className="font-display text-sm">{home.abbr}</span>
                  {g.played && <span className="font-mono text-sm ml-auto">{g.score?.home}</span>}
                </div>
              </div>
              {watchable && <Play size={14} className="text-ink-300" />}
              {g.played && <span className="text-[10px] text-ink-300 font-display tracking-widest">FINAL</span>}
              {isFuture && <span className="text-[10px] text-ink-400 font-display tracking-widest">UPCOMING</span>}
            </>
          );
          return watchable
            ? <Link key={g.id} to={`/football/game/${g.id}`} className={className}>{body}</Link>
            : <div key={g.id} className={className}>{body}</div>;
        })}
      </div>
    </div>
  );
}
