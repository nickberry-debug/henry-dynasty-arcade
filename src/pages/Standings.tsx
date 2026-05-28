import { useStore } from "../store";
import { useMemo } from "react";
import { divisionStandings } from "../engine/season";
import { TeamLogo } from "../components/TeamLogo";
import { Sparkline } from "../components/Sparkline";
import { StatTip } from "../components/Tooltip";
import { HelpButton } from "../components/HelpButton";
import { Link } from "react-router-dom";
import { fmt } from "../utils/format";

export default function Standings() {
  const league = useStore(s => s.league);
  if (!league) return null;
  // Memoize division standings — divisionStandings() walks all games to
  // compute records, and re-running it on every news-feed mutation is wasted
  // work. Re-derives only when teams or schedule actually change.
  const divs = useMemo(() => divisionStandings(league), [league.teams, league.schedule]);

  // last-10 sparkline data. Same memoization story: this walks the entire
  // schedule once per team — for a 30-team / 162-game season that's 73k
  // iterations on every render without the memo.
  const last10ByTeam = useMemo(() => {
    const out: Record<string, number[]> = {};
    league.teams.forEach(t => {
      const played = league.schedule.filter(g => g.played && (g.homeId === t.id || g.awayId === t.id));
      const recent = played.slice(-10);
      out[t.id] = recent.map(g => {
        if (!g.score) return 0;
        const isHome = g.homeId === t.id;
        const won = isHome ? g.score.home > g.score.away : g.score.away > g.score.home;
        return won ? 1 : -1;
      });
    });
    return out;
  }, [league.teams, league.schedule]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">Season {league.year}</div>
          <h1 className="font-display text-4xl">STANDINGS</h1>
        </div>
        <HelpButton topic="Reading Standings" title="Help">
          <p>Each division's teams are ranked by win percentage. The team at the top makes the playoffs automatically.</p>
          <p><strong>GB</strong> means "Games Back" — how far behind the leader. <strong>DIFF</strong> is runs scored minus runs allowed.</p>
          <p>The sparkline shows your last 10 games (up = wins, down = losses).</p>
        </HelpButton>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        {league.divisions.map(d => (
          <div key={d.id} className="glass rounded-2xl p-5 card-elevated overflow-x-auto">
            <h3 className="font-head text-lg uppercase tracking-widest mb-3">{d.name} Division</h3>
            <table className="w-full text-sm">
              <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="text-left p-2">Team</th>
                  <th><StatTip term="W">W</StatTip></th>
                  <th><StatTip term="L">L</StatTip></th>
                  <th>PCT</th>
                  <th><StatTip term="GB">GB</StatTip></th>
                  <th><StatTip term="R">RS</StatTip></th>
                  <th>RA</th>
                  <th>DIFF</th>
                  <th>L10</th>
                </tr>
              </thead>
              <tbody>
                {divs[d.id].map((r, i) => (
                  <tr key={r.team.id} className={`border-t border-white/5 hover:bg-white/3 ${i === 0 ? "bg-emerald-500/5" : ""}`}>
                    <td className="p-2">
                      <Link to={`/team/${r.team.id}`} className="flex items-center gap-2 pressable">
                        <TeamLogo team={r.team} size={26} variant="cap" />
                        <span className="font-semibold">{r.team.abbr}</span>
                        <span className="text-ink-200 text-xs hidden sm:inline">{r.team.name}</span>
                        {r.team.id === league.userTeamId && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold">YOU</span>}
                      </Link>
                    </td>
                    <td className="text-center font-mono">{r.team.wins}</td>
                    <td className="text-center font-mono">{r.team.losses}</td>
                    <td className="text-center font-mono">{fmt.avg(r.pct)}</td>
                    <td className="text-center font-mono">{r.gb === 0 ? "—" : r.gb.toFixed(1)}</td>
                    <td className="text-center font-mono">{r.team.runsScored}</td>
                    <td className="text-center font-mono">{r.team.runsAllowed}</td>
                    <td className={`text-center font-mono font-bold ${r.diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{r.diff >= 0 ? "+" : ""}{r.diff}</td>
                    <td className="text-center">
                      <Sparkline values={last10ByTeam[r.team.id]} width={50} height={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
