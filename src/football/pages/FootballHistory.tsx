// Football — History page.
// Past champions table, Hall of Fame list, all-time records strip.
// Reads from lg.history and lg.retiredPlayers (populated by ageAndDevelop).
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import { useFootball } from "../store";

export default function FootballHistory() {
  const lg = useFootball(s => s.league);
  if (!lg) return <div className="p-8 text-ink-200">No league.</div>;

  const history = Array.isArray(lg.history) ? lg.history : [];
  const retired = Array.isArray(lg.retiredPlayers) ? lg.retiredPlayers : [];
  const hofers = retired.filter(p => p.hof).slice(0, 50);
  const teamById = new Map(lg.teams.map(t => [t.id, t]));

  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>
            {history.length} year{history.length === 1 ? "" : "s"} on record
          </div>
          <h1 className="font-display text-3xl">HISTORY</h1>
        </div>
      </header>

      {history.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-5xl mb-2">📜</div>
          <div className="font-display text-lg mb-1">No history yet</div>
          <div className="text-sm text-ink-200 max-w-md mx-auto">
            Complete your first season — when champions are crowned and the offseason rolls, this page fills with past winners, MVPs, and records.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Past champions */}
          <section className="rounded-2xl p-4 overflow-x-auto"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <h3 className="font-display text-sm uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#FFB81C" }}>
              <Trophy size={14} /> Past Champions
            </h3>
            <table className="w-full text-sm">
              <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-2 text-left">Year</th>
                  <th className="p-2 text-left">Champion</th>
                  <th className="p-2 text-left">Runner-Up</th>
                  <th className="p-2 text-left">MVP</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map(r => {
                  const champ = teamById.get(r.champion);
                  const ru = teamById.get(r.runnerUp);
                  return (
                    <tr key={r.season} className="border-t border-white/5">
                      <td className="p-2 font-mono">{r.season}</td>
                      <td className="p-2">
                        {champ ? (
                          <Link to={`/football/team/${champ.id}`} className="flex items-center gap-2 pressable">
                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-display shrink-0"
                              style={{ background: champ.primary, color: champ.accent }}>
                              {champ.abbr.slice(0, 3)}
                            </span>
                            <span style={{ color: champ.accent }} className="font-semibold">{champ.name}</span>
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="p-2 text-ink-200">{ru?.name ?? "—"}</td>
                      <td className="p-2 text-ink-200 text-xs">
                        {r.mvp ? <Link to={`/football/player/${r.mvp.playerId}`} className="pressable">{r.mvp.name}</Link> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Hall of Fame */}
          <section className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <h3 className="font-display text-sm uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#fcd34d" }}>
              <Crown size={14} /> Hall of Fame
            </h3>
            {hofers.length === 0 ? (
              <div className="text-ink-200 text-sm">No inductees yet — careers need to wrap before the doors open.</div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {hofers.map(p => (
                  <Link key={p.id} to={`/football/player/${p.id}`}
                    className="flex items-center justify-between gap-3 p-2 hover:bg-white/5 rounded-lg pressable">
                    <span className="flex-1 truncate">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-ink-300 text-xs ml-2">{p.position}</span>
                    </span>
                    <span className="text-amber-300 text-xs">{p.awards.length} award{p.awards.length === 1 ? "" : "s"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Per-year leader breakdown */}
          <section className="rounded-2xl p-4 overflow-x-auto lg:col-span-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <h3 className="font-display text-sm uppercase tracking-widest mb-3" style={{ color: "#FFB81C" }}>Yearly Leaders</h3>
            <table className="w-full text-sm">
              <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-2 text-left">Year</th>
                  <th className="p-2 text-left">Passing</th>
                  <th className="p-2 text-left">Rushing</th>
                  <th className="p-2 text-left">Receiving</th>
                  <th className="p-2 text-left">Sacks</th>
                  <th className="p-2 text-left">DPOY</th>
                  <th className="p-2 text-left">ROY</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 25).map(r => (
                  <tr key={r.season} className="border-t border-white/5">
                    <td className="p-2 font-mono">{r.season}</td>
                    <td className="p-2 text-xs text-ink-200">
                      {r.passLeader ? <Link to={`/football/player/${r.passLeader.playerId}`} className="pressable">{r.passLeader.name} <span className="text-ink-400">({r.passLeader.yards}y)</span></Link> : "—"}
                    </td>
                    <td className="p-2 text-xs text-ink-200">
                      {r.rushLeader ? <Link to={`/football/player/${r.rushLeader.playerId}`} className="pressable">{r.rushLeader.name} <span className="text-ink-400">({r.rushLeader.yards}y)</span></Link> : "—"}
                    </td>
                    <td className="p-2 text-xs text-ink-200">
                      {r.recLeader ? <Link to={`/football/player/${r.recLeader.playerId}`} className="pressable">{r.recLeader.name} <span className="text-ink-400">({r.recLeader.yards}y)</span></Link> : "—"}
                    </td>
                    <td className="p-2 text-xs text-ink-200">
                      {r.sackLeader ? <Link to={`/football/player/${r.sackLeader.playerId}`} className="pressable">{r.sackLeader.name} <span className="text-ink-400">({r.sackLeader.sacks})</span></Link> : "—"}
                    </td>
                    <td className="p-2 text-xs text-ink-200">
                      {r.dpoy ? <Link to={`/football/player/${r.dpoy.playerId}`} className="pressable">{r.dpoy.name}</Link> : "—"}
                    </td>
                    <td className="p-2 text-xs text-ink-200">
                      {r.roy ? <Link to={`/football/player/${r.roy.playerId}`} className="pressable">{r.roy.name}</Link> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
