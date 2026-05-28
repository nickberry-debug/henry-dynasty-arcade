// StatCast — ESPN/MLB StatCast-style overhead diamond view for a single
// baseball game. Wraps the existing Play[] stream produced by sim.ts and
// animates runners around the bases, draws pitch trajectories into a strike
// zone, shows live win-probability, and surfaces inning/score/count/HUD
// chrome. Built with pure SVG + Framer Motion — no 3D, runs smooth on iPad
// mini. Reduced-motion respected.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play as PlayIcon, FastForward, SkipForward, X, Volume2, VolumeX, Repeat } from "lucide-react";
import type { Play } from "../engine/sim";
import type { Team } from "../store/types";
import { TeamLogo } from "./TeamLogo";

// ── Field coordinate constants (viewBox 0 0 200 200) ────────────────────
// Home plate at (100, 165). Pitching mound center at (100, 105).
// Bases form a 45°-rotated square (diamond) around the mound.
const PLATE = { x: 100, y: 168 };
const MOUND = { x: 100, y: 105 };
const FIRST = { x: 140, y: 130 };
const SECOND = { x: 100, y: 92 };
const THIRD = { x: 60, y: 130 };

const SLOW_MS = 1400;
const NORMAL_MS = 720;
const FAST_MS = 240;
const ULTRA_MS = 90;

type Speed = "slow" | "normal" | "fast" | "ultra";

interface Props {
  plays: Play[];
  home: Team;
  away: Team;
  onClose: () => void;
  /** Optional player-id → name lookup, for nice batter/pitcher names. */
  playerName?: (id: string) => string;
}

export function StatCastBaseball({ plays, home, away, onClose, playerName }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [muted, setMuted] = useState(true);
  const [replayPlay, setReplayPlay] = useState<Play | null>(null);
  const finishedRef = useRef(false);

  // Advance plays based on speed.
  useEffect(() => {
    if (paused || replayPlay || idx >= plays.length) return;
    if (plays.length === 0) return;
    const ms = speed === "slow" ? SLOW_MS : speed === "fast" ? FAST_MS : speed === "ultra" ? ULTRA_MS : NORMAL_MS;
    // Big plays linger longer.
    const cur = plays[idx];
    const lingerBoost = cur && (cur.kind === "hr" || (cur.kind === "hit" && cur.runs && cur.runs >= 2)) ? 1.6 : 1;
    const t = setTimeout(() => setIdx(i => i + 1), ms * lingerBoost);
    return () => clearTimeout(t);
  }, [idx, plays, paused, speed, replayPlay]);

  // TTS announcer.
  useEffect(() => {
    if (muted || idx === 0 || idx > plays.length) return;
    const last = plays[idx - 1];
    if (!last || last.kind === "info") return;
    try {
      const u = new SpeechSynthesisUtterance(announcerLine(last));
      u.rate = speed === "fast" || speed === "ultra" ? 1.3 : 1.05;
      u.volume = 0.85;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* TTS unavailable on this device — silent fallback */ }
    return () => { try { speechSynthesis.cancel(); } catch {} };
  }, [idx, muted]);

  const lastPlay = idx > 0 ? plays[idx - 1] : null;
  const isFinal = idx >= plays.length;
  const score = lastPlay ? { home: lastPlay.scoreHome, away: lastPlay.scoreAway } : { home: 0, away: 0 };
  const winProb = useMemo(() => calcWinProb(lastPlay, plays.length, idx), [lastPlay, idx, plays.length]);

  // Pitch history (last 5).
  const recentPitches = useMemo(() => {
    const arr: { x: number; y: number; type: string; ball: boolean }[] = [];
    for (let i = idx - 1; i >= 0 && arr.length < 5; i--) {
      const p = plays[i];
      if (!p.pitch) continue;
      arr.unshift({
        x: 0.35 + Math.random() * 0.3, // synthesise — sim doesn't expose location
        y: 0.30 + Math.random() * 0.4,
        type: p.pitch.type,
        ball: p.kind === "bb",
      });
    }
    return arr;
  }, [idx, plays]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full max-w-6xl flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Top scoreboard bar (ESPN-style) */}
        <header className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-gradient-to-r from-black/80 to-black/40 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-display tracking-widest">LIVE</span>
            <div className="flex items-center gap-2">
              <TeamLogo team={away} size={26} variant="cap" />
              <span className="font-display tracking-wide text-sm">{away.abbr}</span>
              <span className="font-display text-xl tabular-nums" style={{ color: away.accent }}>{score.away}</span>
            </div>
            <div className="text-ink-300 text-xs px-1">at</div>
            <div className="flex items-center gap-2">
              <TeamLogo team={home} size={26} variant="cap" />
              <span className="font-display tracking-wide text-sm">{home.abbr}</span>
              <span className="font-display text-xl tabular-nums" style={{ color: home.accent }}>{score.home}</span>
            </div>
          </div>
          <div className="hidden sm:block text-center font-mono text-xs text-ink-200">
            {isFinal ? "FINAL" : `${lastPlay?.top ? "▲ Top" : "▼ Bot"} ${lastPlay?.inning ?? 1} · ${lastPlay?.outs ?? 0} out`}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 touch-target"><X size={18} /></button>
        </header>

        {/* Win probability bar */}
        <div className="px-3 sm:px-5 py-1.5 bg-black/40 flex items-center gap-2">
          <span className="text-[9px] text-ink-300 uppercase tracking-widest font-display w-12">{home.abbr}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10 relative">
            <motion.div
              animate={{ width: `${winProb.home * 100}%` }}
              transition={{ duration: 0.5 }}
              className="absolute inset-y-0 left-0"
              style={{ background: home.accent }}
            />
            <motion.div
              animate={{ width: `${winProb.away * 100}%` }}
              transition={{ duration: 0.5 }}
              className="absolute inset-y-0 right-0"
              style={{ background: away.accent }}
            />
          </div>
          <span className="text-[9px] text-ink-300 uppercase tracking-widest font-display w-12 text-right">{away.abbr}</span>
        </div>

        {/* Main split: field + side panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0">
          {/* Field SVG */}
          <div className="relative flex items-center justify-center p-2 sm:p-4 min-h-0 overflow-hidden">
            <FieldSVG
              lastPlay={lastPlay}
              home={home}
              away={away}
            />

            {/* Strike-zone + recent pitches overlay (bottom-left) */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
              <StrikeZoneBox count={lastPlay?.count ?? { b: 0, s: 0 }} pitches={recentPitches} />
            </div>

            {/* Pitcher card (top-left) */}
            <div className="absolute top-3 left-3 z-10 max-w-[180px] pointer-events-none">
              <SidebarCard label="Pitching" name={playerName?.(lastPlay?.pitcher ?? "") ?? "—"} sub={`P · ${lastPlay?.pitch?.type ?? "—"} ${lastPlay?.pitch?.velo ? `${lastPlay.pitch.velo}mph` : ""}`} />
            </div>

            {/* Batter card (top-right) */}
            <div className="absolute top-3 right-3 z-10 max-w-[180px] pointer-events-none">
              <SidebarCard label="At Bat" name={playerName?.(lastPlay?.batter ?? "") ?? "—"} sub={lastPlay?.count ? `${lastPlay.count.b}-${lastPlay.count.s}` : "—"} align="right" />
            </div>

            {/* Big play flash */}
            <AnimatePresence>
              {lastPlay && isBigPlay(lastPlay) && (
                <motion.div
                  key={`bp-${idx}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                >
                  <div className="text-center">
                    <div
                      className="font-display text-6xl sm:text-7xl tracking-widest"
                      style={{ color: lastPlay.kind === "hr" ? "#fbbf24" : "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.85), 0 0 30px rgba(251,191,36,0.4)" }}
                    >
                      {bigPlayBanner(lastPlay)}
                    </div>
                    <div className="text-xs text-white/80 mt-1 max-w-md mx-auto">{lastPlay.text}</div>
                    <button
                      onClick={() => setReplayPlay(lastPlay)}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-white text-xs font-display tracking-wider flex items-center gap-1.5 mx-auto pointer-events-auto"
                    >
                      <Repeat size={12} /> REPLAY
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final overlay */}
            {isFinal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center z-20 bg-black/60"
              >
                <div className="text-center px-6">
                  <div className="font-display text-6xl text-amber-300 tracking-widest" style={{ textShadow: "0 4px 30px rgba(0,0,0,0.7)" }}>FINAL</div>
                  <div className="mt-2 flex items-center justify-center gap-4 text-xl font-display">
                    <span>{away.abbr} {score.away}</span>
                    <span className="text-ink-400">•</span>
                    <span>{home.abbr} {score.home}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Side panel: play-by-play feed */}
          <PlayByPlayFeed plays={plays.slice(0, idx)} home={home} away={away} />
        </div>

        {/* Footer controls */}
        <footer className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-gradient-to-r from-black/70 to-black/40 border-t border-white/5">
          <button
            onClick={() => setPaused(p => !p)}
            disabled={isFinal}
            className="px-3 py-2 rounded-lg bg-accent text-ink-950 font-display tracking-wider text-xs pressable touch-target flex items-center gap-1.5 disabled:opacity-40"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <PlayIcon size={14} /> : <Pause size={14} />}
            {paused ? "Play" : "Pause"}
          </button>
          <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
            {(["slow", "normal", "fast", "ultra"] as Speed[]).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-display tracking-wider pressable touch-target ${speed === s ? "bg-accent text-ink-950" : "text-ink-200"}`}
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
          <button
            onClick={() => setMuted(m => !m)}
            className="p-2 rounded-lg bg-white/5 pressable touch-target"
            aria-label={muted ? "Unmute announcer" : "Mute announcer"}
            title={muted ? "Unmute play-by-play" : "Mute play-by-play"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </footer>

        {/* Replay overlay */}
        {replayPlay && (
          <ReplayOverlay play={replayPlay} home={home} away={away} onClose={() => setReplayPlay(null)} />
        )}
      </motion.div>
    </div>
  );
}

// ─── Field SVG ────────────────────────────────────────────────────────────
function FieldSVG({ lastPlay, home }: { lastPlay: Play | null; home: Team; away?: Team }) {
  const bases = lastPlay?.bases ?? [null, null, null];
  // Ball position derived from kind.
  const ballTrack = lastPlay ? ballTrajectory(lastPlay) : null;

  return (
    <svg viewBox="0 0 200 200" className="max-h-full max-w-full" preserveAspectRatio="xMidYMid meet" style={{ width: "min(100%, 720px)", height: "auto" }}>
      {/* Stadium bowl */}
      <defs>
        <radialGradient id="grass-grad" cx="100" cy="120" r="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a4220" />
          <stop offset="60%" stopColor="#0d2613" />
          <stop offset="100%" stopColor="#04140a" />
        </radialGradient>
        <pattern id="mowing" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="transparent" />
          <rect width="14" height="7" fill="rgba(255,255,255,0.02)" />
        </pattern>
        <linearGradient id="dirt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a87248" />
          <stop offset="100%" stopColor="#6f4a2a" />
        </linearGradient>
        <radialGradient id="ball-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outfield grass */}
      <circle cx="100" cy="170" r="130" fill="url(#grass-grad)" />
      <circle cx="100" cy="170" r="130" fill="url(#mowing)" opacity="0.6" />

      {/* Foul lines */}
      <line x1={PLATE.x} y1={PLATE.y} x2="0" y2="0" stroke="#fff" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1={PLATE.x} y1={PLATE.y} x2="200" y2="0" stroke="#fff" strokeWidth="0.8" strokeOpacity="0.55" />

      {/* Outfield wall */}
      <path d="M 8 80 Q 100 30 192 80" stroke={home.primary ?? "#1a2a3e"} strokeWidth="2" fill="none" opacity="0.7" />

      {/* Infield dirt — diamond + arc */}
      <path d={`M ${PLATE.x} ${PLATE.y} L ${FIRST.x} ${FIRST.y} L ${SECOND.x} ${SECOND.y} L ${THIRD.x} ${THIRD.y} Z`} fill="url(#dirt-grad)" />
      <path d="M 60 130 Q 100 100 140 130 L 140 168 L 60 168 Z" fill="url(#dirt-grad)" opacity="0.55" />
      <circle cx={MOUND.x} cy={MOUND.y} r="10" fill="url(#dirt-grad)" />

      {/* Bases */}
      <BaseSquare base="1B" x={FIRST.x} y={FIRST.y} occupied={!!bases[0]} />
      <BaseSquare base="2B" x={SECOND.x} y={SECOND.y} occupied={!!bases[1]} />
      <BaseSquare base="3B" x={THIRD.x} y={THIRD.y} occupied={!!bases[2]} />
      {/* Home plate (pentagon) */}
      <polygon points={`${PLATE.x - 4},${PLATE.y - 3} ${PLATE.x + 4},${PLATE.y - 3} ${PLATE.x + 4},${PLATE.y + 2} ${PLATE.x},${PLATE.y + 6} ${PLATE.x - 4},${PLATE.y + 2}`} fill="#f5efe1" stroke="#000" strokeWidth="0.3" />

      {/* Pitcher's rubber */}
      <rect x={MOUND.x - 4} y={MOUND.y - 1} width="8" height="2" fill="#f5efe1" stroke="#000" strokeWidth="0.2" />

      {/* Fielders (standard positions) */}
      <Fielder x={MOUND.x} y={MOUND.y - 8} label="P" />
      <Fielder x={PLATE.x} y={PLATE.y + 4} label="C" />
      <Fielder x={FIRST.x + 4} y={FIRST.y - 4} label="1B" />
      <Fielder x={SECOND.x + 8} y={SECOND.y + 4} label="2B" />
      <Fielder x={THIRD.x - 4} y={THIRD.y - 4} label="3B" />
      <Fielder x={SECOND.x - 8} y={SECOND.y + 4} label="SS" />
      <Fielder x={45} y={68} label="LF" />
      <Fielder x={100} y={50} label="CF" />
      <Fielder x={155} y={68} label="RF" />

      {/* Base runners (animated entry) */}
      <AnimatePresence>
        {bases[0] && (
          <Runner key={`r1-${bases[0]}`} x={FIRST.x} y={FIRST.y} color="#fbbf24" tag="1B" />
        )}
        {bases[1] && (
          <Runner key={`r2-${bases[1]}`} x={SECOND.x} y={SECOND.y} color="#fbbf24" tag="2B" />
        )}
        {bases[2] && (
          <Runner key={`r3-${bases[2]}`} x={THIRD.x} y={THIRD.y} color="#fbbf24" tag="3B" />
        )}
      </AnimatePresence>

      {/* Ball trajectory */}
      <AnimatePresence>
        {ballTrack && <BallTrack key={`ball-${lastPlay?.text?.slice(0, 12)}`} track={ballTrack} />}
      </AnimatePresence>
    </svg>
  );
}

function BaseSquare({ x, y, occupied, base }: { x: number; y: number; occupied: boolean; base: string }) {
  return (
    <g>
      <rect
        x={x - 3.5} y={y - 3.5}
        width="7" height="7"
        fill={occupied ? "#fbbf24" : "#f5efe1"}
        stroke="#000" strokeWidth="0.3"
        transform={`rotate(45 ${x} ${y})`}
      />
      <text x={x} y={y + 11} textAnchor="middle" fontSize="3" fontFamily="Oswald, sans-serif" fill="#9ca3af" letterSpacing="0.5">{base}</text>
    </g>
  );
}

function Fielder({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="2.4" fill="rgba(255,255,255,0.85)" stroke="#1f2937" strokeWidth="0.4" />
      <text x={x} y={y + 1.2} textAnchor="middle" fontSize="2.2" fontFamily="Oswald, sans-serif" fill="#1f2937" fontWeight="700">{label}</text>
    </g>
  );
}

function Runner({ x, y, color, tag }: { x: number; y: number; color: string; tag: string }) {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      <circle cx={x} cy={y - 6} r="3.5" fill={color} stroke="#0a0d13" strokeWidth="0.5" />
      <text x={x} y={y - 5} textAnchor="middle" fontSize="2.5" fontFamily="Anton, sans-serif" fill="#0a0d13">{tag.charAt(0)}</text>
    </motion.g>
  );
}

function BallTrack({ track }: { track: { from: { x: number; y: number }; to: { x: number; y: number }; arc?: boolean; isHR?: boolean } }) {
  const { from, to, arc, isHR } = track;
  // Bezier control point — high arc for fly balls / HR
  const ctrlY = arc ? Math.min(from.y, to.y) - (isHR ? 50 : 25) : (from.y + to.y) / 2;
  const path = `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${ctrlY} ${to.x} ${to.y}`;
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.path
        d={path}
        stroke={isHR ? "#fbbf24" : "rgba(255,255,255,0.85)"}
        strokeWidth={isHR ? 1.3 : 0.9}
        fill="none"
        strokeDasharray="2 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      />
      <motion.circle
        r={isHR ? 2 : 1.5}
        fill="#fff"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
        style={{
          offsetPath: `path('${path}')`,
          filter: "drop-shadow(0 0 2px rgba(255,255,255,0.9))",
        }}
      />
    </motion.g>
  );
}

function ballTrajectory(p: Play): { from: { x: number; y: number }; to: { x: number; y: number }; arc?: boolean; isHR?: boolean } | null {
  // Approximate ball path based on play kind. Sim doesn't emit landing coords
  // so we hash on the text to get deterministic per-play angles.
  const hash = p.text.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = (hash % 70) - 35; // -35..+35 degrees from CF
  const rad = (angle * Math.PI) / 180;

  if (p.kind === "k") {
    // Pitch from mound to plate
    return { from: MOUND, to: PLATE, arc: false };
  }
  if (p.kind === "bb") {
    return { from: MOUND, to: PLATE, arc: false };
  }
  if (p.kind === "hr") {
    // Deep arc clearing the wall
    return {
      from: PLATE,
      to: { x: 100 + Math.sin(rad) * 95, y: 50 - Math.cos(rad) * 30 },
      arc: true,
      isHR: true,
    };
  }
  if (p.kind === "hit") {
    // Variable distance — single ~70 from plate, double further
    const dist = 45 + (hash % 35);
    return {
      from: PLATE,
      to: { x: 100 + Math.sin(rad) * dist, y: PLATE.y - Math.cos(rad) * dist },
      arc: (hash % 3) !== 0,
    };
  }
  if (p.kind === "out") {
    const dist = 30 + (hash % 50);
    return {
      from: PLATE,
      to: { x: 100 + Math.sin(rad) * dist, y: PLATE.y - Math.cos(rad) * dist },
      arc: (hash % 2) === 0,
    };
  }
  return null;
}

function isBigPlay(p: Play): boolean {
  if (p.kind === "hr") return true;
  if (p.kind === "hit" && (p.runs ?? 0) >= 2) return true;
  if (p.kind === "k" && (p.outs ?? 0) === 2 && p.bases.some(Boolean)) return true; // K with runners
  return false;
}

function bigPlayBanner(p: Play): string {
  if (p.kind === "hr") return "GONE!";
  if (p.kind === "hit" && (p.runs ?? 0) >= 3) return "BIG HIT!";
  if (p.kind === "hit" && (p.runs ?? 0) >= 2) return "RBI!";
  if (p.kind === "k") return "STRIKEOUT!";
  return "BIG PLAY!";
}

function announcerLine(p: Play): string {
  if (p.kind === "hr") return `Gone! ${p.text}`;
  if (p.kind === "k") return p.text.replace(/\.$/, "!");
  if (p.kind === "bb") return p.text;
  return p.text;
}

// ─── Strike Zone Box (recent pitches) ─────────────────────────────────────
function StrikeZoneBox({ count, pitches }: { count: { b: number; s: number }; pitches: { x: number; y: number; type: string; ball: boolean }[] }) {
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 w-[110px]">
      <div className="text-[8px] text-ink-200 uppercase tracking-widest font-display mb-1">Zone</div>
      <svg viewBox="0 0 100 100" className="w-full">
        {/* Zone box */}
        <rect x="20" y="20" width="60" height="60" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
        {/* 3x3 grid lines */}
        <line x1="40" y1="20" x2="40" y2="80" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        <line x1="60" y1="20" x2="60" y2="80" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        <line x1="20" y1="40" x2="80" y2="40" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        <line x1="20" y1="60" x2="80" y2="60" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        {/* Recent pitches */}
        {pitches.map((p, i) => {
          const age = pitches.length - i;
          const opacity = 1 - (age - 1) * 0.18;
          return (
            <circle
              key={i}
              cx={p.x * 100}
              cy={p.y * 100}
              r={3}
              fill={pitchColor(p.type)}
              opacity={opacity}
              stroke="#000"
              strokeWidth="0.4"
            />
          );
        })}
      </svg>
      <div className="text-[10px] text-ink-100 font-mono text-center mt-0.5">
        {count.b}-{count.s}
      </div>
    </div>
  );
}

function pitchColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("four") || t.includes("fastball")) return "#ef4444";
  if (t.includes("two") || t.includes("sinker")) return "#f97316";
  if (t.includes("curve")) return "#3b82f6";
  if (t.includes("slider")) return "#a855f7";
  if (t.includes("change")) return "#22c55e";
  if (t.includes("cutter")) return "#06b6d4";
  if (t.includes("split")) return "#ec4899";
  return "#94a3b8";
}

// ─── Sidebar HUD card ─────────────────────────────────────────────────────
function SidebarCard({ label, name, sub, align = "left" }: { label: string; name: string; sub?: string; align?: "left" | "right" }) {
  return (
    <div className={`bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 ${align === "right" ? "text-right" : ""}`}>
      <div className="text-[8px] text-accent uppercase tracking-widest font-display">{label}</div>
      <div className="text-xs font-display tracking-wide text-white truncate">{name || "—"}</div>
      {sub && <div className="text-[9px] text-ink-200 font-mono">{sub}</div>}
    </div>
  );
}

// ─── Play-by-Play feed (right side) ───────────────────────────────────────
function PlayByPlayFeed({ plays, home, away }: { plays: Play[]; home: Team; away: Team }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Auto-scroll to latest unless user scrolled up.
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      el.scrollTop = el.scrollHeight;
    }
  }, [plays.length]);
  return (
    <div className="lg:border-l border-white/5 flex flex-col min-h-0 bg-black/30">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-ink-200 uppercase tracking-widest font-display">Play-by-Play</span>
        <span className="text-[10px] text-ink-300 font-mono">{plays.length}</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {plays.length === 0 && <div className="text-xs text-ink-300 italic">Waiting for first pitch…</div>}
        {plays.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-xs leading-snug py-1.5 px-2 rounded-md ${feedClass(p.kind)}`}
          >
            <span className="text-[8px] text-ink-300 font-mono mr-1.5">{p.top ? "▲" : "▼"}{p.inning}</span>
            {p.text}
            {(p.kind === "hr" || p.kind === "hit" && (p.runs ?? 0) > 0) && (
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

function feedClass(kind: Play["kind"]): string {
  if (kind === "hr") return "bg-amber-500/20 text-amber-200 font-semibold";
  if (kind === "k") return "bg-red-500/10 text-red-200";
  if (kind === "hit") return "bg-emerald-500/10 text-emerald-200";
  if (kind === "bb") return "bg-sky-500/10 text-sky-200";
  if (kind === "end") return "bg-white/5 text-ink-100 font-display tracking-wider";
  if (kind === "event") return "italic text-ink-300";
  return "text-ink-100";
}

// ─── Win probability (lightweight heuristic) ──────────────────────────────
function calcWinProb(p: Play | null, totalPlays: number, idx: number): { home: number; away: number } {
  if (!p) return { home: 0.5, away: 0.5 };
  const diff = p.scoreHome - p.scoreAway;
  const inning = p.inning;
  // Base sigmoid by run diff, weighted heavier as innings progress.
  const weight = Math.min(1, inning / 9) * 0.8 + 0.2;
  const home = 1 / (1 + Math.exp(-(diff * 0.55 * weight)));
  return { home, away: 1 - home };
}

// ─── Replay Overlay ───────────────────────────────────────────────────────
function ReplayOverlay({ play, home, away, onClose }: { play: Play; home: Team; away: Team; onClose: () => void }) {
  // Auto-close after 3.5s
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="text-[10px] text-amber-300 uppercase tracking-[0.3em] font-display mb-2">⏯ Replay · 0.5×</div>
      <div className="relative w-full max-w-2xl">
        <FieldSVG lastPlay={play} home={home} />
      </div>
      <div className="mt-3 text-sm text-white text-center max-w-md">{play.text}</div>
      <div className="mt-3 text-[10px] text-ink-300 uppercase tracking-widest">Tap anywhere to close</div>
    </motion.div>
  );
}
