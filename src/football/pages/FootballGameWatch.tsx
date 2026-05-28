// StatCast-style football game viewer. Drives the FootballField with the
// pre-simulated Play stream. Pause/play/speed controls, big-play banners,
// play-by-play feed, win-probability bar.
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play as PlayIcon, SkipForward, Volume2, VolumeX, Repeat } from "lucide-react";
import { useFootball } from "../store";
import { simulateGame, applyResult } from "../sim";
import type { FootballPlay } from "../types";
import { FootballField } from "../components/FootballField";

/** Safe back navigation — if history is empty (e.g. user deep-linked to
 *  this URL), fall back to the football hub instead of exiting the app. */
function goBack(navigate: (to: any) => void) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
  } else {
    navigate("/football");
  }
}

export default function FootballGameWatch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lg = useFootball(s => s.league);
  const hydrated = useFootball(s => s.hydrated);
  const loadFromDb = useFootball(s => s.loadFromDb);
  const mutate = useFootball(s => s.mutate);
  useEffect(() => { if (!hydrated) loadFromDb(); }, [hydrated]);
  const [plays, setPlays] = useState<FootballPlay[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast" | "ultra">("normal");
  const [muted, setMuted] = useState(true);
  const [replay, setReplay] = useState<FootballPlay | null>(null);

  const game = lg?.schedule.find(g => g.id === id);

  useEffect(() => {
    if (!lg || !game) return;
    if (game.played && game.plays) {
      setPlays(game.plays);
      return;
    }
    // Refuse to simulate games in the future — that would register wins
    // out of order and corrupt standings. Show the user the played plays
    // we have (none) so the UI degrades gracefully; the Back button still
    // works.
    if (game.week > lg.week) {
      setPlays([]);
      return;
    }
    const result = simulateGame(lg, game);
    mutate(L => {
      const g = L.schedule.find(x => x.id === id);
      if (g) applyResult(L, g, result);
    });
    setPlays(result.plays);
  }, [id, lg?.id]);

  // Auto-advance
  useEffect(() => {
    if (paused || replay) return;
    if (idx >= plays.length) return;
    const ms = speed === "slow" ? 1600 : speed === "fast" ? 250 : speed === "ultra" ? 90 : 800;
    const cur = plays[idx];
    const linger = cur && (cur.kind === "touchdown" || cur.kind === "interception" || cur.kind === "longPass") ? 1.6 : 1;
    const t = setTimeout(() => setIdx(i => i + 1), ms * linger);
    return () => clearTimeout(t);
  }, [idx, plays, paused, speed, replay]);

  // TTS announcer
  useEffect(() => {
    if (muted || idx === 0 || idx > plays.length) return;
    const last = plays[idx - 1];
    if (!last || last.kind === "info") return;
    try {
      const u = new SpeechSynthesisUtterance(last.text);
      u.rate = speed === "fast" || speed === "ultra" ? 1.35 : 1.1;
      u.volume = 0.85;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
    return () => { try { speechSynthesis.cancel(); } catch {} };
  }, [idx, muted]);

  if (!lg) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl mb-3">🏈</div>
          <div className="font-display text-xl mb-1" style={{ color: "#FFB81C" }}>No football league yet</div>
          <div className="text-sm text-ink-200 mb-5 max-w-sm mx-auto">Create one to start watching games.</div>
          <button onClick={() => navigate("/football")} className="px-5 py-3 rounded-xl font-display tracking-wider text-sm" style={{ background: "#FFB81C", color: "#0a0d13" }}>Open Football</button>
        </div>
      </div>
    );
  }
  if (!game) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl mb-3">🤔</div>
          <div className="font-display text-xl mb-1" style={{ color: "#FFB81C" }}>Game not found</div>
          <div className="text-sm text-ink-200 mb-5 max-w-sm mx-auto">This link points to a game that doesn't exist in your league.</div>
          <button onClick={() => navigate("/football")} className="px-5 py-3 rounded-xl font-display tracking-wider text-sm" style={{ background: "#FFB81C", color: "#0a0d13" }}>Back to Football</button>
        </div>
      </div>
    );
  }
  // Defensive: refuse to render the StatCast view for a game scheduled in
  // the future. Direct-linking to /football/game/<future-id> would have
  // forced a sim and broken the standings ordering.
  if (!game.played && game.week > lg.week) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-6xl mb-3">📅</div>
          <div className="font-display text-2xl mb-1" style={{ color: "#FFB81C" }}>Not yet, gridiron fans</div>
          <div className="text-sm text-ink-200 max-w-md mx-auto mb-5">
            This game is scheduled for Week {game.week}. You're still in Week {lg.week} — sim some weeks first and we'll let you watch.
          </div>
          <button onClick={() => goBack(navigate)} className="px-5 py-3 rounded-xl font-display tracking-wider text-sm" style={{ background: "#FFB81C", color: "#0a0d13" }}>Back</button>
        </div>
      </div>
    );
  }

  const home = lg.teams.find(t => t.id === game.homeId)!;
  const away = lg.teams.find(t => t.id === game.awayId)!;
  const lastPlay = idx > 0 ? plays[idx - 1] : null;
  const isFinal = idx >= plays.length;
  const score = lastPlay ? { home: lastPlay.scoreHome, away: lastPlay.scoreAway } : { home: 0, away: 0 };
  const winProb = useMemo(() => calcWinProb(lastPlay, plays.length, idx), [lastPlay, idx, plays.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-1 sm:p-3">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full max-w-7xl flex flex-col rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #1A2526 0%, #0a0d13 100%)" }}
      >
        {/* Scoreboard */}
        <header className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-black/60 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-display tracking-widest">LIVE</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-display" style={{ background: away.primary, color: away.accent }}>{away.abbr}</div>
              <span className="font-display tracking-wide text-sm">{away.abbr}</span>
              <span className="font-display text-xl tabular-nums" style={{ color: away.accent }}>{score.away}</span>
            </div>
            <span className="text-ink-300 text-xs">at</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-display" style={{ background: home.primary, color: home.accent }}>{home.abbr}</div>
              <span className="font-display tracking-wide text-sm">{home.abbr}</span>
              <span className="font-display text-xl tabular-nums" style={{ color: home.accent }}>{score.home}</span>
            </div>
          </div>
          <div className="hidden sm:block text-center font-mono text-xs text-ink-200">
            {isFinal ? "FINAL" : lastPlay ? `Q${lastPlay.quarter} · ${formatClock(lastPlay.clock)}` : "Kickoff"}
          </div>
          <button onClick={() => goBack(navigate)} aria-label="Close" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 touch-target"><X size={18} /></button>
        </header>

        {/* Win prob */}
        <div className="px-3 sm:px-5 py-1.5 bg-black/40 flex items-center gap-2">
          <span className="text-[9px] text-ink-300 uppercase tracking-widest font-display w-12">{home.abbr}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10 relative">
            <motion.div animate={{ width: `${winProb.home * 100}%` }} transition={{ duration: 0.4 }} className="absolute inset-y-0 left-0" style={{ background: home.accent }} />
            <motion.div animate={{ width: `${winProb.away * 100}%` }} transition={{ duration: 0.4 }} className="absolute inset-y-0 right-0" style={{ background: away.accent }} />
          </div>
          <span className="text-[9px] text-ink-300 uppercase tracking-widest font-display w-12 text-right">{away.abbr}</span>
        </div>

        {/* Field + feed */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0">
          <div className="relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <FootballField
              lastPlay={lastPlay}
              home={home}
              away={away}
              ballYard={lastPlay?.endYard ?? 25}
              possessionId={lastPlay?.possessionId ?? home.id}
              toGo={lastPlay?.toGo ?? 10}
              down={(lastPlay?.down ?? 1) as any}
            />

            <AnimatePresence>
              {lastPlay && isBigPlay(lastPlay) && (
                <motion.div
                  key={`bp-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="text-center">
                    <div className="font-display text-6xl sm:text-7xl tracking-widest" style={{ color: bannerColor(lastPlay), textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}>
                      {bannerText(lastPlay)}
                    </div>
                    <div className="text-xs text-white/85 mt-1 max-w-md mx-auto">{lastPlay.text}</div>
                    <button
                      onClick={() => setReplay(lastPlay)}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-white text-xs font-display tracking-wider flex items-center gap-1.5 mx-auto pointer-events-auto"
                    >
                      <Repeat size={12} /> REPLAY
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isFinal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-display text-6xl tracking-widest" style={{ color: "#FFB81C" }}>FINAL</div>
                  <div className="mt-2 text-xl font-display flex items-center justify-center gap-4">
                    <span>{away.abbr} {score.away}</span>
                    <span className="text-ink-500">·</span>
                    <span>{home.abbr} {score.home}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* PBP feed */}
          <FeedPanel plays={plays.slice(0, idx)} home={home} away={away} />
        </div>

        {/* Controls */}
        <footer className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-black/60 border-t border-white/5">
          <button
            onClick={() => setPaused(p => !p)}
            disabled={isFinal}
            className="px-3 py-2 rounded-lg font-display tracking-wider text-xs pressable touch-target flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: "#FFB81C", color: "#0a0d13" }}
          >
            {paused ? <PlayIcon size={14} /> : <Pause size={14} />}
            {paused ? "Play" : "Pause"}
          </button>
          <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
            {(["slow", "normal", "fast", "ultra"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-display tracking-wider pressable touch-target ${speed === s ? "text-ink-950" : "text-ink-200"}`}
                style={speed === s ? { background: "#FFB81C" } : undefined}
              >
                {s === "slow" ? "0.5×" : s === "normal" ? "1×" : s === "fast" ? "3×" : "10×"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIdx(plays.length)}
            disabled={isFinal}
            className="px-3 py-2 rounded-lg bg-white/5 text-xs font-display tracking-wider pressable touch-target flex items-center gap-1.5 disabled:opacity-30"
          >
            <SkipForward size={14} /> End
          </button>
          <div className="flex-1" />
          <button onClick={() => setMuted(m => !m)} className="p-2 rounded-lg bg-white/5 pressable touch-target" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </footer>

        {/* Replay */}
        {replay && (
          <ReplayOverlay play={replay} home={home} away={away} onClose={() => setReplay(null)} />
        )}
      </motion.div>
    </div>
  );
}

function FeedPanel({ plays, home, away }: { plays: FootballPlay[]; home: any; away: any }) {
  return (
    <div className="lg:border-l border-white/5 flex flex-col min-h-0 bg-black/30">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-ink-200 uppercase tracking-widest font-display">Drive Log</span>
        <span className="text-[10px] text-ink-300 font-mono">{plays.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {plays.length === 0 && <div className="text-xs text-ink-300 italic">Pre-game…</div>}
        {plays.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-xs leading-snug py-1.5 px-2 rounded-md ${feedClass(p.kind)}`}
          >
            <span className="text-[8px] text-ink-300 font-mono mr-1.5">Q{p.quarter}</span>
            {p.text}
            {(p.kind === "touchdown" || p.kind === "fieldGoal" || p.kind === "extraPoint") && (
              <span className="ml-2 text-[9px] text-emerald-300 font-display tracking-wider">
                {away.abbr} {p.scoreAway} — {home.abbr} {p.scoreHome}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function feedClass(kind: FootballPlay["kind"]) {
  if (kind === "touchdown") return "bg-amber-500/20 text-amber-200 font-semibold";
  if (kind === "interception" || kind === "fumble" || kind === "sack") return "bg-red-500/15 text-red-200";
  if (kind === "longPass") return "bg-emerald-500/15 text-emerald-200";
  if (kind === "fieldGoal") return "bg-amber-500/10 text-amber-100";
  if (kind === "end-quarter" || kind === "end-half" || kind === "end-game") return "bg-white/5 text-ink-100 font-display tracking-wider";
  return "text-ink-100";
}

function isBigPlay(p: FootballPlay) {
  if (p.kind === "touchdown") return true;
  if (p.kind === "interception") return true;
  if (p.kind === "fieldGoal") return true;
  if (p.kind === "longPass" && p.yards >= 30) return true;
  if (p.kind === "sack" && p.yards <= -7) return true;
  return false;
}

function bannerText(p: FootballPlay): string {
  if (p.kind === "touchdown") return "TOUCHDOWN!";
  if (p.kind === "interception") return "INTERCEPTION!";
  if (p.kind === "fieldGoal") return "GOOD!";
  if (p.kind === "sack") return "SACK!";
  if (p.kind === "longPass") return "BOMB!";
  return "BIG PLAY!";
}

function bannerColor(p: FootballPlay): string {
  if (p.kind === "touchdown") return "#FFB81C";
  if (p.kind === "interception" || p.kind === "sack") return "#ef4444";
  return "#fff";
}

function calcWinProb(p: FootballPlay | null, total: number, idx: number) {
  if (!p) return { home: 0.5, away: 0.5 };
  const diff = p.scoreHome - p.scoreAway;
  const q = Math.min(4, p.quarter);
  const weight = q / 4 * 0.85 + 0.15;
  const home = 1 / (1 + Math.exp(-(diff * 0.18 * weight)));
  return { home, away: 1 - home };
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ReplayOverlay({ play, home, away, onClose }: { play: FootballPlay; home: any; away: any; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-6" onClick={onClose}>
      <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: "#FFB81C" }}>⏯ Replay · 0.5×</div>
      <div className="relative w-full max-w-4xl">
        <FootballField lastPlay={play} home={home} away={away} ballYard={play.endYard} possessionId={play.possessionId} toGo={play.toGo} down={(play.down ?? 1) as any} />
      </div>
      <div className="mt-3 text-sm text-white text-center max-w-2xl">{play.text}</div>
      <div className="mt-3 text-[10px] text-ink-300 uppercase tracking-widest">Tap anywhere to close</div>
    </motion.div>
  );
}
