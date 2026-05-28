import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../store";
import { useNavigate } from "react-router-dom";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { TeamLogo } from "../components/TeamLogo";
import { nominateUserAllStar, simDerbyRound, simAllStarGame } from "../engine/allstar";
import { Trophy, ChevronRight } from "lucide-react";

export default function AllStarEvent() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"select" | "derby" | "game">("select");

  if (!league || !league.allStar) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <div className="text-5xl mb-3">⭐</div>
        <div className="font-display text-xl mb-2">No All-Star event active</div>
        <div className="text-sm text-ink-200">The All-Star Break opens halfway through the regular season.</div>
      </div>
    );
  }

  const ae = league.allStar;
  const team = league.teams.find(t => t.id === league.userTeamId);

  const nominate = async (pid: string) => {
    await mutate(lg => {
      nominateUserAllStar(lg, pid);
    });
  };

  const swingDerby = async () => {
    await mutate(lg => { simDerbyRound(lg); });
  };

  const simGame = async () => {
    await mutate(lg => {
      simAllStarGame(lg);
    });
  };

  const finishBreak = async () => {
    await mutate(lg => {
      lg.phase = "regular";
    });
    navigate("/dashboard");
  };

  const userPlayers = league.players.filter(p => p.teamId === league.userTeamId);

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 lg:p-7 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 30% 30%, #fbbf24 0%, transparent 50%), radial-gradient(circle at 80% 80%, #60a5fa 0%, transparent 50%)" }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-ink-300 tracking-widest">{league.year} MIDSUMMER CLASSIC</div>
            <div className="font-display text-3xl lg:text-4xl">⭐ All-Star Break</div>
          </div>
          {ae.game.played && (
            <button onClick={finishBreak} className="px-5 py-2.5 rounded-xl bg-accent text-ink-950 font-display tracking-wider text-sm pressable touch-target flex items-center gap-1">
              Resume Season <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ["select", "Select Your All-Star"],
          ["derby", "Home Run Derby"],
          ["game", "All-Star Game"]
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium pressable touch-target whitespace-nowrap ${tab === id ? "bg-accent text-ink-950" : "bg-white/5 text-ink-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "select" && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-xl">Pick your nominee</div>
            <div className="text-xs text-ink-200">Picks remaining: <span className="text-accent font-bold">{ae.userPicksRemaining}</span></div>
          </div>
          {team ? (
            <>
              <div className="text-sm text-ink-200 mb-3">Choose one of {team.name}'s players to send to the All-Star Game.</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {userPlayers.slice(0, 12).map(p => (
                  <button key={p.id} onClick={() => nominate(p.id)} disabled={ae.userPicksRemaining === 0} className="glass rounded-xl p-2 pressable touch-target text-left disabled:opacity-50">
                    <div className="aspect-[4/5] bg-black/30 rounded-lg overflow-hidden mb-1">
                      <PlayerPortrait player={p} team={team} size={120} />
                    </div>
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-ink-200">{p.position} • OVR {p.overall}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-ink-200">Pick your favorite team first in Settings to nominate players.</div>
          )}
        </div>
      )}

      {tab === "derby" && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-xl">💥 Home Run Derby</div>
            <button onClick={swingDerby} disabled={!!ae.derby.champion} className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-sm font-display tracking-wider pressable touch-target disabled:opacity-50">
              {ae.derby.champion ? "Complete" : ae.derby.round === 0 ? "Start Round 1" : ae.derby.round === 1 ? "Semifinals" : "Final"}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ae.derby.participants.map((dp, i) => {
              const p = league.players.find(pl => pl.id === dp.playerId);
              if (!p) return null;
              const t = league.teams.find(tm => tm.id === p.teamId);
              const eliminated = ae.derby.round >= 1 && [...ae.derby.participants].sort((a, b) => b.round1 - a.round1).slice(4).some(x => x.playerId === dp.playerId);
              const isChamp = ae.derby.champion === dp.playerId;
              return (
                <motion.div key={dp.playerId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass rounded-xl p-3 ${isChamp ? "ring-2 ring-amber-400" : eliminated ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {t && <TeamLogo team={t} size={32} variant="cap" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-ink-300">{t?.abbr} • Pwr {Math.round((p.ratings.powerL + p.ratings.powerR) / 2)}</div>
                    </div>
                    {isChamp && <Trophy size={20} className="text-amber-400" />}
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-[9px] text-ink-300">R1</div>
                      <div className="text-lg font-display">{dp.round1}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-ink-300">SF</div>
                      <div className="text-lg font-display">{dp.round2 || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-ink-300">F</div>
                      <div className="text-lg font-display">{dp.round3 || "—"}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "game" && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-xl">All-Star Game</div>
            {!ae.game.played && (
              <button onClick={simGame} className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-sm font-display tracking-wider pressable touch-target">
                Play Game
              </button>
            )}
          </div>
          {ae.game.played && ae.game.score ? (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`rounded-xl p-5 text-center ${ae.game.score.AL > ae.game.score.NL ? "bg-amber-500/20 border-2 border-amber-400" : "bg-white/5"}`}>
                  <div className="text-xs text-ink-300 tracking-widest">AMERICAN LEAGUE</div>
                  <div className="font-display text-5xl">{ae.game.score.AL}</div>
                </div>
                <div className={`rounded-xl p-5 text-center ${ae.game.score.NL > ae.game.score.AL ? "bg-amber-500/20 border-2 border-amber-400" : "bg-white/5"}`}>
                  <div className="text-xs text-ink-300 tracking-widest">NATIONAL LEAGUE</div>
                  <div className="font-display text-5xl">{ae.game.score.NL}</div>
                </div>
              </div>
              {ae.game.linescore && (
                <table className="w-full text-xs text-center mb-3">
                  <thead className="text-ink-300">
                    <tr><th></th>{Array.from({ length: 9 }).map((_, i) => <th key={i} className="px-1">{i + 1}</th>)}<th className="px-1 text-accent">R</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="text-left text-ink-200 px-1">AL</td>{ae.game.linescore.AL.map((v, i) => <td key={i}>{v}</td>)}<td className="text-accent font-bold">{ae.game.score.AL}</td></tr>
                    <tr><td className="text-left text-ink-200 px-1">NL</td>{ae.game.linescore.NL.map((v, i) => <td key={i}>{v}</td>)}<td className="text-accent font-bold">{ae.game.score.NL}</td></tr>
                  </tbody>
                </table>
              )}
              {ae.game.mvp && (() => {
                const mvp = league.players.find(p => p.id === ae.game.mvp);
                const mt = mvp && league.teams.find(t => t.id === mvp.teamId);
                return mvp ? (
                  <div className="glass rounded-xl p-4 flex items-center gap-3">
                    {mt && <TeamLogo team={mt} size={48} variant="cap" />}
                    <div className="flex-1">
                      <div className="text-xs text-amber-400 tracking-widest">MVP</div>
                      <div className="font-display text-lg">{mvp.name}</div>
                    </div>
                    <Trophy className="text-amber-400" />
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="text-sm text-ink-200">The game hasn't been played yet. Click Play Game above.</div>
          )}
        </div>
      )}
    </div>
  );
}
