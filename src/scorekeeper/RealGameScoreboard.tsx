// L.3 — Real Game Mode: full scorekeeping with pitch tracker + linescore + in-play submenu.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Scorecard, EventKind } from "./types";
import { pitchOutcome, inPlay, undoLast, nextHalf, endGame, logFreeText } from "./engine";
import { Undo2, X, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  card: Scorecard;
  onUpdate: (c: Scorecard) => void;
  onClose: () => void;
}

const IN_PLAY_OPTIONS: Array<{ kind: EventKind; label: string; emoji?: string }> = [
  { kind: "single", label: "Single", emoji: "🟢" },
  { kind: "double", label: "Double", emoji: "🟢🟢" },
  { kind: "triple", label: "Triple", emoji: "🟢🟢🟢" },
  { kind: "homerun", label: "Home Run", emoji: "💥" },
  { kind: "groundOut", label: "Ground Out" },
  { kind: "flyOut", label: "Fly Out" },
  { kind: "lineOut", label: "Line Out" },
  { kind: "popOut", label: "Pop Out" },
  { kind: "sacFly", label: "Sac Fly" },
  { kind: "sacBunt", label: "Sac Bunt" },
  { kind: "fieldersChoice", label: "Fielder's Choice" },
  { kind: "error", label: "Error" },
  { kind: "hbp", label: "Hit by Pitch" },
  { kind: "sb", label: "Stolen Base" },
  { kind: "cs", label: "Caught Stealing" },
  { kind: "wp", label: "Wild Pitch" },
  { kind: "pb", label: "Passed Ball" },
  { kind: "balk", label: "Balk" },
  { kind: "dp", label: "Double Play" },
  { kind: "tp", label: "Triple Play", emoji: "🔥" }
];

export function RealGameScoreboard({ card, onUpdate, onClose }: Props) {
  const [inPlayOpen, setInPlayOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const mut = (fn: (c: Scorecard) => void) => {
    fn(card);
    onUpdate(card);
  };

  const battingSide = card.half === "top" ? card.away : card.home;
  const fieldingSide = card.half === "top" ? card.home : card.away;

  const pitch = (k: "ball" | "strikeSwing" | "strikeLook" | "foul" | "foulTip") => mut(c => pitchOutcome(c, k));
  const play = (kind: EventKind, label: string) => {
    setInPlayOpen(false);
    mut(c => inPlay(c, kind, label));
  };
  const undo = () => mut(c => undoLast(c));
  const half = () => mut(c => nextHalf(c));
  const finalize = () => mut(c => endGame(c));

  const linescoreCells = Math.max(card.innings, card.currentInning);

  return (
    <div className="space-y-4">
      {/* TOP — SCOREBOARD */}
      <div className="rounded-3xl p-5 relative overflow-hidden card-elevated" style={{ background: "linear-gradient(135deg, #0c1a3a, #050810)" }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center pressable touch-target z-10" aria-label="Close"><X size={18} /></button>
        <div className="text-[11px] text-sky-300 uppercase tracking-widest mb-3">{card.gameType ?? "Game"} • {card.gameName}</div>

        {/* Linescore */}
        <div className="overflow-x-auto pb-2">
          <table className="w-full text-xs text-center min-w-[400px]">
            <thead className="text-ink-300 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="text-left px-2 py-1">Team</th>
                {Array.from({ length: linescoreCells }).map((_, i) => (
                  <th key={i} className={`px-1 ${i + 1 === card.currentInning ? "text-accent" : ""}`}>{i + 1}</th>
                ))}
                <th className="px-2 text-accent">R</th>
                <th className="px-1">H</th>
                <th className="px-1">E</th>
              </tr>
            </thead>
            <tbody>
              {[card.away, card.home].map((s, idx) => (
                <tr key={idx} className="border-t border-white/5">
                  <td className="text-left px-2 py-1.5 font-semibold" style={{ color: s.color }}>{s.name.slice(0, 12)}</td>
                  {Array.from({ length: linescoreCells }).map((_, i) => {
                    const ls = s.linescore[i];
                    const isCurr = i + 1 === card.currentInning && ((idx === 0 && card.half === "top") || (idx === 1 && card.half === "bottom"));
                    return <td key={i} className={`px-1 ${isCurr ? "bg-accent/20" : ""}`}>{ls != null ? ls : "—"}</td>;
                  })}
                  <td className="px-2 font-bold text-base text-accent">{s.runs}</td>
                  <td className="px-1">{s.hits}</td>
                  <td className="px-1">{s.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inning + count + bases */}
        <div className="grid grid-cols-3 gap-3 mt-3 items-center">
          <div className="text-center">
            <div className="text-xs text-ink-300 uppercase tracking-widest">Inning</div>
            <div className="font-display text-3xl">{card.half === "top" ? "▲" : "▼"} {card.currentInning}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1">Count</div>
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < card.count.balls ? "bg-emerald-400" : "bg-white/10"}`} />)}
              <span className="text-[9px] text-ink-300 mx-1">B</span>
              {Array.from({ length: 3 }).map((_, i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < card.count.strikes ? "bg-amber-400" : "bg-white/10"}`} />)}
              <span className="text-[9px] text-ink-300 mx-1">S</span>
              {Array.from({ length: 3 }).map((_, i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < card.count.outs ? "bg-red-500" : "bg-white/10"}`} />)}
              <span className="text-[9px] text-ink-300 mx-1">O</span>
            </div>
          </div>
          <DiamondView bases={card.bases} />
        </div>
        <div className="text-center mt-2 text-xs text-ink-200">
          Batting: <span className="font-semibold" style={{ color: battingSide.color }}>{battingSide.name}</span> • Fielding: <span style={{ color: fieldingSide.color }}>{fieldingSide.name}</span>
        </div>
      </div>

      {card.completed && (
        <div className="glass rounded-2xl p-4 text-center border border-amber-400/50">
          <div className="font-display text-2xl">FINAL: {card.away.name} {card.away.runs} — {card.home.runs} {card.home.name}</div>
        </div>
      )}

      {/* PITCH TRACKER */}
      {!card.completed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <PitchButton color="bg-emerald-500" onClick={() => pitch("ball")}>BALL</PitchButton>
          <PitchButton color="bg-amber-500" onClick={() => pitch("foul")}>FOUL</PitchButton>
          <PitchButton color="bg-amber-500/70" onClick={() => pitch("foulTip")}>FOUL TIP</PitchButton>
          <PitchButton color="bg-red-500" onClick={() => pitch("strikeSwing")}>STRIKE — Swinging</PitchButton>
          <PitchButton color="bg-red-500/80" onClick={() => pitch("strikeLook")}>STRIKE — Looking</PitchButton>
          <button onClick={() => setInPlayOpen(true)} className="rounded-2xl p-4 bg-sky-500 text-white font-display text-xl tracking-wider pressable touch-target min-h-[80px] active:opacity-80">⚾ IN PLAY</button>
        </div>
      )}

      {/* CONTROL ROW */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={undo} className="px-4 py-3 rounded-xl bg-white/5 text-sm pressable touch-target flex items-center gap-1.5"><Undo2 size={14} /> Undo</button>
        <button onClick={half} className="px-4 py-3 rounded-xl bg-white/5 text-sm pressable touch-target">Next ½ Inning</button>
        <button onClick={() => setLogOpen(o => !o)} className="px-4 py-3 rounded-xl bg-white/5 text-sm pressable touch-target flex items-center gap-1.5">
          Game Log {logOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {!card.completed && <button onClick={finalize} className="ml-auto px-4 py-3 rounded-xl bg-amber-400 text-ink-950 font-display tracking-wider pressable touch-target text-sm">End Game</button>}
      </div>

      {/* GAME LOG */}
      {logOpen && (
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest text-ink-300 mb-2 font-display">Pitch-by-pitch log</div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {card.log.length === 0 && <div className="text-sm text-ink-300">Nothing yet — tap a pitch button.</div>}
            {card.log.slice().reverse().map(e => (
              <div key={e.id} className="text-xs border-b border-white/5 pb-1 flex items-center gap-2">
                <span className="text-[9px] text-ink-300 font-mono w-8">{e.inning}{e.half === "top" ? "▲" : "▼"}</span>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IN PLAY MODAL */}
      <AnimatePresence>
        {inPlayOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setInPlayOpen(false)}>
            <motion.div initial={{ y: 30 }} animate={{ y: 0 }} className="glass max-w-md w-full rounded-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-xl tracking-wide">⚾ What happened?</div>
                <button onClick={() => setInPlayOpen(false)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {IN_PLAY_OPTIONS.map(opt => (
                  <button key={opt.kind} onClick={() => play(opt.kind, opt.label)} className="px-3 py-3 rounded-xl bg-white/5 hover:bg-accent/10 text-sm pressable touch-target text-left">
                    {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PitchButton({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 ${color} text-white font-display tracking-wider pressable touch-target min-h-[80px] active:opacity-80`}
    >
      {children}
    </button>
  );
}

function DiamondView({ bases }: { bases: { first: string | null; second: string | null; third: string | null } }) {
  return (
    <svg width="84" height="68" viewBox="0 0 84 68" className="mx-auto" aria-label="Bases">
      <polygon points="42,8 76,38 42,64 8,38" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      {/* second */}
      <polygon points="42,8 50,16 42,24 34,16" fill={bases.second ? "#fbbf24" : "#1f2937"} stroke="#9ca3af" strokeWidth="1" />
      {/* third */}
      <polygon points="8,38 16,46 8,54 0,46" fill={bases.third ? "#fbbf24" : "#1f2937"} stroke="#9ca3af" strokeWidth="1" transform="translate(8,0)" />
      {/* first */}
      <polygon points="76,38 68,46 76,54 84,46" fill={bases.first ? "#fbbf24" : "#1f2937"} stroke="#9ca3af" strokeWidth="1" transform="translate(-8,0)" />
      {/* home */}
      <polygon points="42,52 50,60 42,66 34,60" fill="#fff" />
    </svg>
  );
}
