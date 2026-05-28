import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";

export default function History() {
  const league = useStore(s => s.league)!;
  const hofers = league.retiredPlayers.filter(p => p.hof).slice(0, 60);
  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] text-ink-200 uppercase tracking-widest">{league.history.length} years on record</div>
        <h1 className="font-display text-4xl">HISTORY</h1>
      </header>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4 overflow-x-auto">
          <h3 className="font-head text-lg uppercase tracking-widest mb-3">Past Champions</h3>
          <table className="w-full text-sm">
            <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
              <tr><th className="text-left p-2">Year</th><th>Champion</th><th>Runner-Up</th><th>MVP</th><th>Cy Young</th></tr>
            </thead>
            <tbody>
              {league.history.slice(0, 50).map(r => {
                const c = league.teams.find(t => t.id === r.champion);
                const ru = league.teams.find(t => t.id === r.runnerUp);
                return (
                  <tr key={r.year} className="border-t border-white/5">
                    <td className="p-2 font-mono">{r.year}</td>
                    <td className="p-2 flex items-center gap-2">{c && <TeamLogo team={c} size={20} variant="cap" />}<span>{c?.name ?? "—"}</span></td>
                    <td className="p-2 text-ink-200">{ru?.name ?? "—"}</td>
                    <td className="p-2 text-ink-200 text-xs">{r.mvp}</td>
                    <td className="p-2 text-ink-200 text-xs">{r.cy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="font-head text-lg uppercase tracking-widest mb-3 flex items-center gap-2"><Crown className="text-gold" size={18} />Hall of Fame</h3>
          {hofers.length === 0 ? <div className="text-ink-200 text-sm">No inductees yet.</div> : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {hofers.map(p => (
                <Link to={`/player/${p.id}`} key={p.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg pressable">
                  <span>{p.name} <span className="text-ink-200 text-xs">{p.position}</span></span>
                  <span className="text-gold text-xs">{p.awards.length} awards</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
