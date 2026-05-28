// J.4 — Weekly league newspaper front page.
// Generated deterministically from the league's news + standings for the current week.
import { useStore } from "../store";
import { leagueStandings } from "../engine/season";
import { TeamLogo } from "./TeamLogo";

export function Newspaper() {
  const league = useStore(s => s.league);
  if (!league) return null;
  const week = Math.floor(league.day / 7) + 1;
  const lo = Math.max(0, league.day - 7);
  const recentNews = league.newsLog.filter(n => n.day >= lo).slice(0, 8);
  const top = recentNews[0];
  const subs = recentNews.slice(1, 4);
  const standings = leagueStandings(league).slice(0, 5);

  return (
    <article className="rounded-2xl bg-amber-50 text-ink-900 shadow-2xl border-4 border-ink-900 overflow-hidden card-elevated max-w-3xl mx-auto" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
      <div className="border-b-2 border-ink-900 p-4 text-center bg-amber-100">
        <div className="text-[10px] uppercase tracking-widest text-ink-700">Volume {league.year - 2025} • Week {week}</div>
        <div className="text-3xl lg:text-5xl font-black mt-1" style={{ fontFamily: "'UnifrakturCook', 'Times New Roman', serif" }}>The Diamond Daily</div>
        <div className="text-[11px] text-ink-700 mt-1 italic">"All the news that's fit to swing at."</div>
      </div>
      <div className="grid md:grid-cols-3 gap-0 divide-x-2 divide-ink-900">
        <div className="md:col-span-2 p-5">
          {top && (
            <div className="border-b border-ink-300 pb-4 mb-4">
              <div className="text-[9px] uppercase tracking-widest text-ink-700">{top.category}</div>
              <h2 className="font-black text-2xl lg:text-3xl leading-tight mt-1">{top.headline}</h2>
              <div className="text-xs text-ink-600 mt-2">— Day {top.day}, Season {top.year}</div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {subs.map(s => (
              <div key={s.id} className="border-b border-ink-300 pb-3 last:border-b-0">
                <div className="text-[9px] uppercase tracking-widest text-ink-700">{s.category}</div>
                <h3 className="font-bold text-base leading-snug mt-1">{s.headline}</h3>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-amber-100">
          <div className="text-[10px] uppercase tracking-widest text-ink-700 font-bold border-b border-ink-900 pb-1 mb-2">Standings</div>
          {standings.map((row, i) => (
            <div key={row.team.id} className="flex items-center gap-2 text-xs py-1">
              <span className="font-mono w-4 text-right">{i + 1}</span>
              <TeamLogo team={row.team} size={18} variant="cap" />
              <span className="flex-1 font-semibold truncate">{row.team.abbr}</span>
              <span className="font-mono text-ink-700">{row.team.wins}-{row.team.losses}</span>
            </div>
          ))}
          <div className="mt-3 pt-2 border-t border-ink-300 text-[10px] text-ink-700 italic">Today's weather: clear skies and crispy peanuts.</div>
        </div>
      </div>
      <div className="border-t-2 border-ink-900 p-2 text-center text-[10px] text-ink-700 uppercase tracking-widest bg-amber-100">
        Diamond Daily • Established {league.year - 50}
      </div>
    </article>
  );
}
