import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { leagueStandings, isRegularComplete } from "../engine/season";
import { startPlayoffs, simCurrentRound, simAllPlayoffs } from "../engine/playoffs";
import { Trophy, Loader } from "lucide-react";
import { useBusyAction } from "../hooks/useBusyAction";

export default function Playoffs() {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const [busy, run] = useBusyAction();

  if (!league.playoffs) {
    return (
      <div className="space-y-4">
        <header>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">Postseason</div>
          <h1 className="font-display text-4xl">PLAYOFFS</h1>
        </header>
        <div className="glass rounded-2xl p-6 text-center">
          <div className="mb-4 text-ink-200">
            {isRegularComplete(league)
              ? "Regular season is complete — start the playoffs."
              : `Regular season in progress (${league.schedule.filter(g => g.played).length}/${league.schedule.length} games).`}
          </div>
          <button
            disabled={!isRegularComplete(league) || busy}
            onClick={() => run(() => mutate(lg => startPlayoffs(lg)))}
            className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target disabled:opacity-40 inline-flex items-center gap-2"
          >
            {busy && <Loader size={14} className="animate-spin" />} Start Playoffs
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="font-head text-lg uppercase tracking-widest mb-2">Projected Seeds</h3>
            {leagueStandings(league).slice(0, 10).map((row, i) => (
              <div key={row.team.id} className="flex items-center gap-3 py-1.5">
                <span className="font-mono text-ink-200 w-6">{i + 1}</span>
                <TeamLogo team={row.team} size={22} variant="cap" />
                <span className="flex-1 truncate">{row.team.city} {row.team.name}</span>
                <span className="text-sm text-ink-200">{row.team.wins}-{row.team.losses}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const po = league.playoffs;
  const champ = po.rounds[po.rounds.length - 1]?.matches?.[0]?.winner;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] text-ink-200 uppercase tracking-widest">{league.year} Postseason</div>
          <h1 className="font-display text-4xl">PLAYOFFS</h1>
        </div>
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => run(() => mutate(lg => { simCurrentRound(lg); }))} className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader size={14} className="animate-spin" />} Sim Round
          </button>
          <button disabled={busy} onClick={() => run(() => mutate(lg => { simAllPlayoffs(lg); }))} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 pressable touch-target disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader size={14} className="animate-spin" />} Sim All
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-max p-2">
          {po.rounds.map((r, i) => (
            <div key={i} className="flex flex-col gap-3 min-w-[240px]">
              <div className="text-[11px] text-ink-200 uppercase tracking-widest">{r.name}</div>
              {r.matches.length === 0 ? <div className="text-ink-200 text-sm">TBD</div> : r.matches.map((m, j) => {
                const high = league.teams.find(t => t.id === m.high);
                const low = league.teams.find(t => t.id === m.low);
                if (!high || !low) return null;
                return (
                  <div key={j} className="bg-white/3 border border-white/5 rounded-xl p-3 text-sm">
                    <Side team={high} wins={m.wins.high} won={m.winner === m.high} />
                    <Side team={low} wins={m.wins.low} won={m.winner === m.low} />
                    <div className="text-[10px] text-ink-200 mt-1">Best of {m.bestOf}</div>
                  </div>
                );
              })}
            </div>
          ))}
          {champ && (
            <div className="flex flex-col gap-3 min-w-[240px]">
              <div className="text-[11px] text-gold uppercase tracking-widest">Champion</div>
              <div className="bg-gradient-to-br from-gold/20 to-transparent border border-gold/40 rounded-xl p-4 text-center">
                <Trophy className="mx-auto text-gold mb-2" size={48} />
                <TeamLogo team={league.teams.find(t => t.id === champ)!} size={80} glow />
                <div className="font-display text-2xl mt-2">{league.teams.find(t => t.id === champ)!.name}</div>
                <div className="text-gold text-xs uppercase tracking-widest mt-1">{league.year} World Series</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Side({ team, wins, won }: any) {
  return (
    <div className={`flex items-center gap-2 py-1 ${won ? "text-accent font-bold" : ""}`}>
      <TeamLogo team={team} size={20} variant="cap" />
      <span className="flex-1 truncate">{team.abbr} <span className="text-ink-200 text-xs">({team.playoffSeed})</span></span>
      <span className="font-mono">{wins}</span>
    </div>
  );
}
