// Live Game mode — Henry is every pitcher AND every batter on both teams.
// His inputs drive the simulation, fictional player ratings modify outcomes,
// and his personal stat line is recorded in parallel.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { NetTapZone } from "../components/NetTapZone";
import { StrikeZoneGrid } from "../components/StrikeZoneGrid";
import { SpeedGun } from "../components/SpeedGun";
import { startLiveGame, resolvePitchInput, resolveSwingInput, endLiveGame, type LiveGameState, type Difficulty } from "../engine/liveGame";
import { ArrowLeft, Trophy } from "lucide-react";
import { getActiveProfileId, recordGameSession } from "../profiles/store";

const PITCH_TYPES = ["4-Seam","2-Seam","Changeup","Curve","Slider","Other"];

export default function LiveGame() {
  const league = useStore(s => s.league)!;
  const [params] = useSearchParams();
  const [state, setState] = useState<LiveGameState | null>(null);
  const [setupHome, setSetupHome] = useState<string>(league.userTeamId ?? league.teams[0].id);
  const [setupAway, setSetupAway] = useState<string>(league.teams.find(t => t.id !== (league.userTeamId ?? league.teams[0].id))?.id ?? league.teams[1]?.id ?? league.teams[0].id);
  const [innings, setInnings] = useState<number>(3);
  const [diff, setDiff] = useState<Difficulty>("pro");
  const [pendingTap, setPendingTap] = useState<{ x: number; y: number } | null>(null);
  const [pendingZone, setPendingZone] = useState<{ col: number; row: number } | null>(null);
  const [pitchType, setPitchType] = useState<string>(PITCH_TYPES[0]);
  const [showStats, setShowStats] = useState(false);

  // Auto-save state every play via localStorage as a backup beyond IndexedDB
  useEffect(() => {
    if (state) localStorage.setItem("dd_live_game", JSON.stringify(state));
  }, [state?.plays.length, state?.completed]);

  // On mount, try to restore an in-progress game
  useEffect(() => {
    const stored = localStorage.getItem("dd_live_game");
    if (stored && !state) {
      try { const s = JSON.parse(stored); if (!s.completed) setState(s); } catch {}
    }
  }, []);

  // If we have a ?gameId query param, prefill setup from that schedule game
  useEffect(() => {
    const gid = params.get("gameId");
    if (gid && !state) {
      const g = league.schedule.find(x => x.id === gid);
      if (g) { setSetupHome(g.homeId); setSetupAway(g.awayId); }
    }
  }, [params, league.schedule]);

  if (!state) {
    return (
      <div className="space-y-5 pb-24">
        <header className="flex items-center gap-2">
          <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18}/></Link>
          <div className="flex-1">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest">Training</div>
            <h1 className="font-display text-3xl">🎬 LIVE GAME</h1>
            <div className="text-sm text-ink-200">Pitch and bat as every player. Your real reps drive the game.</div>
          </div>
        </header>

        <div className="glass rounded-2xl p-5 card-elevated space-y-4">
          <div>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">Away team</div>
            <select value={setupAway} onChange={e => setSetupAway(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3">
              {league.teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">Home team (yours)</div>
            <select value={setupHome} onChange={e => setSetupHome(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3">
              {league.teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">Length</div>
            <div className="flex gap-2">
              {[3, 6, 9].map(n => (
                <button key={n} onClick={() => setInnings(n)} className={`flex-1 px-3 py-3 rounded-xl pressable touch-target ${innings === n ? "bg-accent text-ink-950 font-display tracking-wider" : "bg-white/5"}`}>{n} innings</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">Difficulty</div>
            <div className="flex gap-2">
              {(["rookie","pro","allstar"] as const).map(d => (
                <button key={d} onClick={() => setDiff(d)} className={`flex-1 px-3 py-3 rounded-xl pressable touch-target capitalize ${diff === d ? "bg-accent text-ink-950 font-display tracking-wider" : "bg-white/5"}`}>{d === "allstar" ? "All-Star" : d}</button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setState(startLiveGame(league, { homeTeamId: setupHome, awayTeamId: setupAway, innings, difficulty: diff }))}
            className="w-full px-5 py-4 rounded-2xl bg-accent text-ink-950 font-display tracking-widest text-lg pressable touch-target"
          >PLAY BALL</button>
        </div>
      </div>
    );
  }

  // === Active game ===
  const home = league.teams.find(t => t.id === state.homeTeamId)!;
  const away = league.teams.find(t => t.id === state.awayTeamId)!;
  const pitcher = league.players.find(p => p.id === state.currentPitcherId)!;
  const batter = league.players.find(p => p.id === state.currentBatterId)!;
  const userTeamId = league.userTeamId ?? state.homeTeamId;
  const henryIsPitching = pitcher.teamId === userTeamId;

  const handlePitch = (result: "strike" | "painted" | "close" | "ball") => {
    if (!pendingZone) return;
    resolvePitchInput(league, state, { zoneCol: pendingZone.col, zoneRow: pendingZone.row, result, pitchType });
    setPendingZone(null);
    setState({ ...state });
  };
  const handleSwing = (quality: "crushed" | "okay" | "weak" | "whiff") => {
    const tap = pendingTap ?? { x: 0.5, y: 0.5 };
    resolveSwingInput(league, state, { quality, netX: tap.x, netY: tap.y });
    setPendingTap(null);
    setState({ ...state });
  };
  const finalize = () => {
    endLiveGame(state);
    // Family stats — credit the active profile for the live-game session.
    const pid = getActiveProfileId();
    if (pid) {
      const userTeamId = league.userTeamId ?? state.homeTeamId;
      const isHome = userTeamId === state.homeTeamId;
      const userScore = isHome ? state.score.home : state.score.away;
      const oppScore = isHome ? state.score.away : state.score.home;
      recordGameSession(pid, "baseball", {
        sessions: 1,
        wins: userScore > oppScore ? 1 : 0,
        losses: userScore < oppScore ? 1 : 0,
      });
    }
    setState({ ...state });
  };
  const newGame = () => { setState(null); localStorage.removeItem("dd_live_game"); };

  const lastPlays = state.plays.slice(-4).reverse();
  const winner = state.completed ? (state.score.home > state.score.away ? home : away) : null;

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center gap-2">
        <Link to="/training" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target" onClick={() => localStorage.setItem("dd_live_game", JSON.stringify(state))}><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <div className="text-[10px] text-ink-300 uppercase tracking-widest">Live Game</div>
          <h1 className="font-display text-2xl">{away.abbr} @ {home.abbr}</h1>
        </div>
        <button onClick={() => setShowStats(s => !s)} className="px-3 py-2 rounded-xl bg-white/5 text-xs pressable touch-target">{showStats ? "Box Score" : "Henry's Stats"}</button>
      </header>

      {/* SCOREBOARD */}
      <div className="glass rounded-2xl p-4 card-elevated">
        <div className="grid grid-cols-3 gap-3 items-center mb-2">
          <div className="text-center">
            <TeamLogo team={away} size={42} variant="cap" />
            <div className="text-xs mt-1">{away.abbr}</div>
            <div className="font-display text-4xl">{state.score.away}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest">{state.completed ? "FINAL" : "Inning"}</div>
            <div className="font-display text-2xl">{state.half === "top" ? "▲" : "▼"} {state.inning}</div>
            <div className="text-[10px] text-ink-300 mt-1">{state.outs} outs</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {Array.from({length:4}).map((_,i) => <span key={`b${i}`} className={`w-2 h-2 rounded-full ${i < state.count.balls ? "bg-emerald-400" : "bg-white/10"}`} />)}
              <span className="text-[8px] text-ink-300 mx-0.5">B</span>
              {Array.from({length:3}).map((_,i) => <span key={`s${i}`} className={`w-2 h-2 rounded-full ${i < state.count.strikes ? "bg-amber-400" : "bg-white/10"}`} />)}
              <span className="text-[8px] text-ink-300 ml-0.5">S</span>
            </div>
          </div>
          <div className="text-center">
            <TeamLogo team={home} size={42} variant="cap" />
            <div className="text-xs mt-1">{home.abbr}</div>
            <div className="font-display text-4xl">{state.score.home}</div>
          </div>
        </div>
      </div>

      {state.completed ? (
        <div className="glass rounded-2xl p-5 text-center border border-amber-400/40">
          <Trophy className="text-amber-400 mx-auto mb-2" size={36} />
          <div className="font-display text-2xl">{winner?.name} WIN</div>
          <div className="text-sm text-ink-200">{state.score.away}-{state.score.home}</div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-left">
            <div className="glass rounded-xl p-3 bg-white/3">
              <div className="text-[10px] text-ink-300 uppercase tracking-widest">Henry — pitching</div>
              <div className="text-sm">{state.henryStats.pitchesThrown} pitches · {state.henryStats.strikes} strikes ({state.henryStats.pitchesThrown ? Math.round(state.henryStats.strikes / state.henryStats.pitchesThrown * 100) : 0}%)</div>
              <div className="text-sm">{state.henryStats.paintedCorners} painted corners</div>
            </div>
            <div className="glass rounded-xl p-3 bg-white/3">
              <div className="text-[10px] text-ink-300 uppercase tracking-widest">Henry — hitting</div>
              <div className="text-sm">{state.henryStats.swings} swings · {state.henryStats.hits} hits · {state.henryStats.crushed} crushed</div>
              <div className="text-sm">{state.henryStats.whiffs} whiffs</div>
            </div>
          </div>
          <button onClick={newGame} className="mt-4 px-5 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target">Play Another</button>
        </div>
      ) : (
        <>
          {/* CURRENT MATCHUP */}
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <PlayerPortrait player={pitcher} team={league.teams.find(t => t.id === pitcher.teamId) ?? null} size={56} />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-ink-300 uppercase tracking-widest">Pitcher{henryIsPitching ? " (you)" : ""}</div>
              <div className="font-display text-base truncate">{pitcher.name}</div>
              <div className="text-[11px] text-ink-200">OVR {pitcher.overall} · CTRL {pitcher.ratings.pitches?.[0]?.ctrl ?? 50}</div>
            </div>
            <div className="text-2xl">VS</div>
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[9px] text-ink-300 uppercase tracking-widest">Batter{!henryIsPitching ? " (you)" : ""}</div>
              <div className="font-display text-base truncate">{batter.name}</div>
              <div className="text-[11px] text-ink-200">OVR {batter.overall} · Pwr {Math.round((batter.ratings.powerL + batter.ratings.powerR) / 2)}</div>
            </div>
            <PlayerPortrait player={batter} team={league.teams.find(t => t.id === batter.teamId) ?? null} size={56} />
          </div>

          {/* INPUT */}
          {henryIsPitching ? (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <StrikeZoneGrid selected={pendingZone} onTap={(col, row) => setPendingZone({ col, row })} label="Tap where your pitch hit" />
                <div className="flex gap-1 flex-wrap justify-center">
                  {PITCH_TYPES.map(p => (
                    <button key={p} onClick={() => setPitchType(p)} className={`px-3 py-2 rounded-lg text-xs pressable touch-target ${pitchType === p ? "bg-accent text-ink-950" : "bg-white/5"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <ResultBtn label="🟢 STRIKE" color="from-emerald-500 to-emerald-600" disabled={!pendingZone} onClick={() => handlePitch("strike")} />
                  <ResultBtn label="🔵 PAINTED" color="from-sky-500 to-sky-600" disabled={!pendingZone} onClick={() => handlePitch("painted")} />
                  <ResultBtn label="🟡 CLOSE" color="from-amber-400 to-amber-500" disabled={!pendingZone} onClick={() => handlePitch("close")} />
                  <ResultBtn label="🔴 BALL" color="from-red-500 to-red-600" disabled={!pendingZone} onClick={() => handlePitch("ball")} />
                </div>
                <SpeedGun />
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <NetTapZone size="lg" label="Tap where the ball went" onTap={(x, y) => setPendingTap({ x, y })} />
              <div className="grid grid-cols-2 gap-2">
                <ResultBtn label="🟢 CRUSHED" color="from-emerald-500 to-emerald-600" disabled={!pendingTap} onClick={() => handleSwing("crushed")} />
                <ResultBtn label="🟡 OKAY" color="from-amber-400 to-amber-500" disabled={!pendingTap} onClick={() => handleSwing("okay")} />
                <ResultBtn label="🔴 WEAK" color="from-red-500 to-red-600" disabled={!pendingTap} onClick={() => handleSwing("weak")} />
                <ResultBtn label="⚫ WHIFF" color="from-ink-600 to-ink-700" onClick={() => handleSwing("whiff")} />
              </div>
            </div>
          )}

          {/* PLAY-BY-PLAY */}
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1.5">Play-by-Play</div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {lastPlays.map(p => (
                <div key={p.id} className="text-sm">
                  <span className="text-[10px] text-ink-300 font-mono mr-2">{p.inning}{p.half === "top" ? "▲" : "▼"}</span>
                  {p.outcome}
                </div>
              ))}
              {state.plays.length === 0 && <div className="text-xs text-ink-300">Start pitching or swinging to begin.</div>}
            </div>
          </div>

          {/* HENRY STATS DRAWER */}
          {showStats && (
            <div className="glass rounded-2xl p-4">
              <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">Your real stats in this game</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="font-display tracking-wide">Pitching</div>
                  <div>{state.henryStats.pitchesThrown} thrown</div>
                  <div>{state.henryStats.strikes} strikes ({state.henryStats.pitchesThrown ? Math.round(state.henryStats.strikes / state.henryStats.pitchesThrown * 100) : 0}%)</div>
                  <div>{state.henryStats.paintedCorners} painted</div>
                </div>
                <div>
                  <div className="font-display tracking-wide">Hitting</div>
                  <div>{state.henryStats.swings} swings</div>
                  <div>{state.henryStats.crushed} crushed · {state.henryStats.whiffs} whiffs</div>
                  <div>{state.henryStats.hits} hits</div>
                </div>
              </div>
            </div>
          )}

          <button onClick={finalize} className="w-full px-4 py-3 rounded-xl bg-white/5 text-sm pressable touch-target">End Game Early</button>
        </>
      )}
    </div>
  );
}

function ResultBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 bg-gradient-to-br ${color} text-white font-display tracking-wider pressable touch-target min-h-[80px] active:opacity-80 disabled:opacity-30 disabled:saturate-50 text-sm`}
    >{label}</button>
  );
}
