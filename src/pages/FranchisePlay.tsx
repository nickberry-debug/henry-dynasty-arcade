// FranchisePlay — the "PLAY" mode in franchise. Lets Henry pitch and
// bat his way through a single scheduled game without leaving the
// franchise. Uses the existing liveGame engine; on completion, applies
// the result (played/score/W/L/runs) to the schedule so the season
// reflects the real outcome.
//
// Intentionally tighter UI than the standalone /live screen — no
// setup screen, no Henry-personal-stats drawer — because we're
// already inside a season and already have the matchup.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { NetTapZone } from "../components/NetTapZone";
import { StrikeZoneGrid } from "../components/StrikeZoneGrid";
import { SpeedGun } from "../components/SpeedGun";
import {
  startLiveGame, resolvePitchInput, resolveSwingInput, endLiveGame,
  type LiveGameState,
} from "../engine/liveGame";
import { Trophy, ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";

const PITCH_TYPES = ["4-Seam", "2-Seam", "Changeup", "Curve", "Slider", "Other"];

export default function FranchisePlay() {
  const { gameId } = useParams();
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const navigate = useNavigate();

  const game = league.schedule.find(g => g.id === gameId);
  const home = game ? league.teams.find(t => t.id === game.homeId) : null;
  const away = game ? league.teams.find(t => t.id === game.awayId) : null;

  // Local live-game state (NOT in the franchise store — applied only
  // on completion). Innings: full 9. Difficulty matches user pick.
  const [state, setState] = useState<LiveGameState | null>(null);
  const [pendingTap, setPendingTap] = useState<{ x: number; y: number } | null>(null);
  const [pendingZone, setPendingZone] = useState<{ col: number; row: number } | null>(null);
  const [pitchType, setPitchType] = useState<string>(PITCH_TYPES[0]);
  const [applied, setApplied] = useState(false);

  // Auto-start the live game on mount.
  useEffect(() => {
    if (!game || !home || !away) return;
    setState(startLiveGame(league, {
      homeTeamId: home.id,
      awayTeamId: away.id,
      innings: 9,
      difficulty: "pro",
    }));
  }, [gameId]);

  // Once the live engine flips `completed = true`, write the result
  // back to the franchise. Guarded with `applied` so we only do it
  // once even though many state changes will land afterward.
  useEffect(() => {
    if (!state || !state.completed || applied || !game) return;
    setApplied(true);
    mutate(lg => {
      const g = lg.schedule.find(x => x.id === gameId);
      if (!g || g.played) return;
      g.played = true;
      g.score = { home: state.score.home, away: state.score.away };
      const h = lg.teams.find(t => t.id === g.homeId);
      const a = lg.teams.find(t => t.id === g.awayId);
      if (!h || !a) return;
      h.runsScored += state.score.home;
      h.runsAllowed += state.score.away;
      a.runsScored += state.score.away;
      a.runsAllowed += state.score.home;
      if (state.score.home > state.score.away) { h.wins++; a.losses++; }
      else if (state.score.away > state.score.home) { a.wins++; h.losses++; }
      // Tie game (extremely rare with extra innings, but possible if
      // user ends early) — record both as half-credit nothing; just
      // mark played.
    });
  }, [state?.completed]);

  if (!game) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-ink-200 pressable touch-target">
          <ArrowLeft size={16} /> Back to This Week
        </button>
        <div className="rounded-2xl p-6 text-center text-ink-200">Game not found.</div>
      </div>
    );
  }
  if (game.played && !state) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-6 text-center">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1">ALREADY PLAYED</div>
          <div className="font-display text-2xl">{away?.abbr} {game.score?.away} — {home?.abbr} {game.score?.home}</div>
          <button onClick={() => navigate("/dashboard")} className="mt-4 px-5 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-widest pressable touch-target">
            Back to This Week
          </button>
        </div>
      </div>
    );
  }
  if (!state || !home || !away) return <div className="text-ink-200">Loading…</div>;

  const pitcher = league.players.find(p => p.id === state.currentPitcherId)!;
  const batter = league.players.find(p => p.id === state.currentBatterId)!;
  const userTeamId = league.userTeamId;
  const henryIsPitching = pitcher.teamId === userTeamId;
  const lastPlays = state.plays.slice(-4).reverse();
  const winner = state.completed ? (state.score.home > state.score.away ? home : state.score.away > state.score.home ? away : null) : null;
  const userWon = winner ? winner.id === userTeamId : null;

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
    if (!confirm("End the game now? The current score will be locked into the season.")) return;
    endLiveGame(state);
    setState({ ...state });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header — clearer that we're inside franchise PLAY */}
      <header className="flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target" aria-label="Back to This Week">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">FRANCHISE · PLAY</div>
          <h1 className="font-display text-xl">{away.abbr} @ {home.abbr}</h1>
        </div>
      </header>

      {/* SCOREBOARD */}
      <div className="glass rounded-2xl p-4 card-elevated">
        <div className="grid grid-cols-3 gap-3 items-center">
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
              {Array.from({ length: 4 }).map((_, i) => <span key={`b${i}`} className={`w-2 h-2 rounded-full ${i < state.count.balls ? "bg-emerald-400" : "bg-white/10"}`} />)}
              <span className="text-[8px] text-ink-300 mx-0.5">B</span>
              {Array.from({ length: 3 }).map((_, i) => <span key={`s${i}`} className={`w-2 h-2 rounded-full ${i < state.count.strikes ? "bg-amber-400" : "bg-white/10"}`} />)}
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
          {winner ? (
            <>
              <div className="font-display text-2xl">{winner.name} WIN</div>
              <div className="text-sm text-ink-200">{state.score.away}-{state.score.home}</div>
              {userWon === true && <div className="text-emerald-400 font-display tracking-wider mt-2">YOU TOOK IT.</div>}
              {userWon === false && <div className="text-ink-300 mt-2">Tough one. On to the next.</div>}
            </>
          ) : (
            <div className="font-display text-xl">TIE GAME</div>
          )}
          <div className="text-[11px] text-ink-300 mt-3 italic">Result locked into the season record.</div>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-widest pressable touch-target"
            style={{ touchAction: "manipulation" }}
          >
            <Check size={16} /> CONTINUE TO NEXT DAY
          </button>
        </div>
      ) : (
        <>
          {/* MATCHUP */}
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <PlayerPortrait player={pitcher} team={league.teams.find(t => t.id === pitcher.teamId) ?? null} size={52} />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-ink-300 uppercase tracking-widest">Pitcher{henryIsPitching ? " (you)" : ""}</div>
              <div className="font-display text-sm truncate">{pitcher.name}</div>
              <div className="text-[10px] text-ink-200">OVR {pitcher.overall}</div>
            </div>
            <div className="text-xl text-ink-300">VS</div>
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[9px] text-ink-300 uppercase tracking-widest">Batter{!henryIsPitching ? " (you)" : ""}</div>
              <div className="font-display text-sm truncate">{batter.name}</div>
              <div className="text-[10px] text-ink-200">OVR {batter.overall}</div>
            </div>
            <PlayerPortrait player={batter} team={league.teams.find(t => t.id === batter.teamId) ?? null} size={52} />
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

          <button onClick={finalize} className="w-full px-4 py-3 rounded-xl bg-white/5 text-sm pressable touch-target text-ink-200">
            End Game Early
          </button>
        </>
      )}
    </motion.div>
  );
}

function ResultBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 bg-gradient-to-br ${color} text-white font-display tracking-wider pressable touch-target min-h-[80px] active:opacity-80 disabled:opacity-30 disabled:saturate-50 text-sm`}
      style={{ touchAction: "manipulation" }}
    >{label}</button>
  );
}
