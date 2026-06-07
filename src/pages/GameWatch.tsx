import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import { simulateGame, applyGameResult, type Play } from "../engine/sim";
import { X, Play as PlayIcon, Pause, FastForward, SkipForward, Tv } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatCastBaseball } from "../components/StatCastBaseball";

export function GameWatch({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const league = useStore(s => s.league)!;
  const mutate = useStore(s => s.mutate);
  const game = league.schedule.find(g => g.id === gameId);
  if (!game) return null;
  const home = league.teams.find(t => t.id === game.homeId)!;
  const away = league.teams.find(t => t.id === game.awayId)!;
  const playerName = (id: string) => league.players.find(p => p.id === id)?.name ?? "";

  // If already played, just show box. Otherwise play live.
  const [plays, setPlays] = useState<Play[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [immersive, setImmersive] = useState(false);
  // `startedFresh` = the game hadn't been played when we opened the modal,
  // so we're playing it back live. While playing back, we hide the final
  // score until the animation reaches the end — otherwise the user sees
  // the spoiler the instant the modal opens because the sim has already
  // mutated the schedule.
  const startedFreshRef = useRef(!game.played);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (game.played) { setPlays([]); return; }
    // Simulate the game live (synchronously computes plays, we play back)
    const result = simulateGame(league, game, { recordPlays: true, universalDH: league.settings.gameplay.universalDH });
    mutate(lg => {
      const g = lg.schedule.find(x => x.id === gameId);
      if (g) applyGameResult(lg, g, result);
    });
    setPlays(result.plays);
  }, [gameId]);

  useEffect(() => {
    if (!plays || paused || idx >= plays.length) return;
    const intervalMs = speed === "slow" ? 700 : speed === "fast" ? 90 : 340;
    const t = setTimeout(() => setIdx(idx + 1), intervalMs);
    return () => clearTimeout(t);
  }, [plays, idx, paused, speed]);

  const lastPlay = plays && idx > 0 ? plays[idx - 1] : null;
  const playbackDone = !!plays && idx >= plays.length;
  // `revealed` gates the final score + "FINAL" labels. For a fresh
  // playback we only reveal once the user has watched (or skipped) to
  // the end. For an already-played game opened from history, the result
  // is already known and there's nothing to hide.
  const revealed = startedFreshRef.current ? playbackDone : true;
  const isFinal = revealed;
  const score = lastPlay
    ? { home: lastPlay.scoreHome, away: lastPlay.scoreAway }
    : (startedFreshRef.current ? { home: 0, away: 0 } : (game.score || { home: 0, away: 0 }));
  const linescore = useMemo(() => buildLinescore(plays || [], idx), [plays, idx]);

  // Immersive mode delegates to StatCast view. Kept AFTER all hooks above so
  // that we never short-circuit a hook (Rules of Hooks / React #300).
  if (immersive && plays) {
    return <StatCastBaseball plays={plays} home={home} away={away} onClose={onClose} playerName={playerName} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-ink-700 to-ink-900 border border-white/10 shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="font-head text-sm uppercase tracking-widest">{away.name} at {home.name}</div>
          <button onClick={onClose} className="text-ink-200 hover:text-white touch-target p-1"><X size={22} /></button>
        </header>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <TeamLogo team={away} size={64} />
            <div>
              <div className="font-display text-2xl">{away.abbr}</div>
              <div className="text-[11px] text-ink-200">{away.wins}-{away.losses}</div>
            </div>
            <div className="font-display text-5xl ml-auto" style={{ color: away.accent }}>{score.away}</div>
          </div>
          <div className="text-center">
            <div className="font-display text-xl text-accent">{isFinal ? "FINAL" : `${lastPlay?.top ? "Top" : "Bot"} ${lastPlay?.inning ?? 1}`}</div>
            <div className="text-[11px] text-ink-200 mt-1">{isFinal ? "" : `${lastPlay?.outs ?? 0} out${(lastPlay?.outs ?? 0) === 1 ? "" : "s"}`}</div>
          </div>
          <div className="flex items-center gap-3 flex-row-reverse">
            <TeamLogo team={home} size={64} />
            <div className="text-right">
              <div className="font-display text-2xl">{home.abbr}</div>
              <div className="text-[11px] text-ink-200">{home.wins}-{home.losses}</div>
            </div>
            <div className="font-display text-5xl mr-auto" style={{ color: home.accent }}>{score.home}</div>
          </div>
        </div>
        <Linescore data={linescore} home={home} away={away} />
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[200px] max-h-[260px] border-y border-white/5">
          <AnimatePresence initial={false}>
            {(plays || []).slice(0, idx).map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`feed-line text-sm py-1.5 border-b border-white/5 ${kindColor(p.kind)}`}>
                {p.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {isFinal && (
            <div className="text-center pt-3 text-gold font-display text-lg">
              FINAL — {away.abbr} {score.away} • {home.abbr} {score.home}
            </div>
          )}
        </div>
        <footer className="flex gap-2 p-4 flex-wrap">
          {plays && plays.length > 0 && (
            <button
              onClick={() => setImmersive(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-ink-950 font-display tracking-wider pressable touch-target flex items-center gap-2"
              title="StatCast-style field view with animations and play-by-play"
            >
              <Tv size={16} /> Immersive
            </button>
          )}
          {!isFinal && (
            <button onClick={() => setPaused(!paused)} className="px-4 py-2 rounded-xl bg-accent text-ink-950 font-semibold pressable touch-target flex items-center gap-2">
              {paused ? <PlayIcon size={16} /> : <Pause size={16} />}
              {paused ? "Resume" : "Pause"}
            </button>
          )}
          {!isFinal && (
            <button onClick={() => setSpeed(speed === "fast" ? "normal" : "fast")} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 pressable touch-target flex items-center gap-2">
              <FastForward size={16} />
              {speed === "fast" ? "Normal" : "Fast"}
            </button>
          )}
          {!isFinal && plays && (
            <button onClick={() => setIdx(plays.length)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 pressable touch-target flex items-center gap-2">
              <SkipForward size={16} />Finish
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 pressable touch-target">Close</button>
        </footer>
      </motion.div>
    </div>
  );
}

function kindColor(k: Play["kind"]) {
  if (k === "hr") return "text-accent font-bold";
  if (k === "k") return "text-crimson";
  if (k === "hit") return "text-emerald";
  if (k === "event") return "text-sky italic";
  if (k === "end") return "text-gold font-semibold";
  return "";
}

function buildLinescore(plays: Play[], idx: number) {
  // Track inning-by-inning runs
  const home: number[] = [];
  const away: number[] = [];
  for (let i = 0; i < idx; i++) {
    const p = plays[i];
    if (p.kind === "end") {
      const inning = p.inning - 1;
      if (p.top) {
        away[inning] = p.runs ?? 0;
      } else {
        home[inning] = p.runs ?? 0;
      }
    }
  }
  return { home, away };
}

function Linescore({ data, home, away }: any) {
  const rH = data.home.reduce((a: number, b: number) => a + (b || 0), 0);
  const rA = data.away.reduce((a: number, b: number) => a + (b || 0), 0);
  return (
    <div className="px-6 py-3 overflow-x-auto">
      <div className="grid gap-1 text-xs" style={{ gridTemplateColumns: "60px repeat(9, 1fr) 36px" }}>
        <div></div>
        {Array.from({ length: 9 }, (_, i) => <div key={i} className="text-center text-ink-200 font-mono">{i + 1}</div>)}
        <div className="text-center text-accent font-mono font-bold">R</div>
        <div className="text-ink-200">{away.abbr}</div>
        {Array.from({ length: 9 }, (_, i) => <div key={i} className="text-center font-mono bg-white/3 rounded">{data.away[i] != null ? data.away[i] : "–"}</div>)}
        <div className="text-center font-mono font-bold text-accent">{rA}</div>
        <div className="text-ink-200">{home.abbr}</div>
        {Array.from({ length: 9 }, (_, i) => <div key={i} className="text-center font-mono bg-white/3 rounded">{data.home[i] != null ? data.home[i] : "–"}</div>)}
        <div className="text-center font-mono font-bold text-accent">{rH}</div>
      </div>
    </div>
  );
}
