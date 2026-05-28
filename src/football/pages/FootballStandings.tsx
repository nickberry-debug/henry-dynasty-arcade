import { Link } from "react-router-dom";
import { useFootball } from "../store";
import { ArrowLeft } from "lucide-react";

export default function FootballStandings() {
  const lg = useFootball(s => s.league);
  if (!lg) return <div className="p-8">No league</div>;

  const byDiv = lg.divisions.map(d => ({
    div: d,
    teams: lg.teams
      .filter(t => t.divisionId === d.id)
      .sort((a, b) => (b.wins - a.wins) || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))),
  }));

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>Through Week {lg.week - 1}</div>
          <h1 className="font-display text-3xl">STANDINGS</h1>
        </div>
      </header>
      <div className="grid sm:grid-cols-2 gap-4">
        {byDiv.map(({ div, teams }) => (
          <div key={div.id} className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: "#FFB81C" }}>{div.name}</div>
            <div className="space-y-1">
              {teams.map((t, i) => (
                <Link key={t.id} to={`/football/team/${t.id}`} className={`flex items-center gap-2 px-2 py-2 rounded-xl pressable touch-target ${t.id === lg.userTeamId ? "bg-amber-400/15 border border-amber-400/40" : "hover:bg-white/5"}`}>
                  <span className="font-mono text-ink-300 w-5 text-right">{i + 1}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-display" style={{ background: t.primary, color: t.accent }}>{t.abbr}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.city} {t.name}</div>
                  </div>
                  <div className="text-xs font-mono w-14 text-right">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ""}</div>
                  <div className={`text-xs font-mono w-12 text-right ${(t.pointsFor - t.pointsAgainst) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{(t.pointsFor - t.pointsAgainst) >= 0 ? "+" : ""}{t.pointsFor - t.pointsAgainst}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
