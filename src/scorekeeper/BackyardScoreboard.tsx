// L.2 — Backyard Mode: ultra-simple, BIG buttons, confetti on HR.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Scorecard } from "./types";
import { addRuns, addOut, nextHalf, undoLast, endGame, logFreeText } from "./engine";
import { Undo2, Trophy, Camera, Sparkles, X } from "lucide-react";

interface Props {
  card: Scorecard;
  onUpdate: (c: Scorecard) => void;
  onClose: () => void;
}

export function BackyardScoreboard({ card, onUpdate, onClose }: Props) {
  const [confettiKey, setConfettiKey] = useState(0);
  const [funnyOpen, setFunnyOpen] = useState(false);
  const [funnyText, setFunnyText] = useState("");

  const mut = (fn: (c: Scorecard) => void) => {
    fn(card);
    onUpdate(card);
  };

  const score = (side: "home" | "away", n = 1) => mut(c => addRuns(c, side, n));
  const homer = (side: "home" | "away") => {
    setConfettiKey(k => k + 1);
    mut(c => { addRuns(c, side, 1); logFreeText(c, "homerun", `💥 HOME RUN for ${side === "home" ? c.home.name : c.away.name}!`); });
  };
  const out = () => mut(c => addOut(c));
  const half = () => mut(c => nextHalf(c));
  const undo = () => mut(c => undoLast(c));
  const finalize = () => mut(c => endGame(c));
  const greatPlay = () => mut(c => logFreeText(c, "amazingCatch", "🧤 AMAZING CATCH!"));
  const ktagger = () => mut(c => logFreeText(c, "strikeout", "⚾ STRIKEOUT!"));
  const funnySave = () => {
    if (!funnyText.trim()) return setFunnyOpen(false);
    mut(c => logFreeText(c, "funny", `😂 ${funnyText.trim()}`));
    setFunnyText("");
    setFunnyOpen(false);
  };

  const winningSide = card.home.runs > card.away.runs ? "home" : card.away.runs > card.home.runs ? "away" : null;

  return (
    <div className="space-y-4">
      {/* SCOREBOARD */}
      <div className="rounded-3xl p-5 lg:p-7 relative overflow-hidden card-elevated" style={{ background: "linear-gradient(135deg, #052e16, #0a0d13)" }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center pressable touch-target z-10" aria-label="Close"><X size={18} /></button>
        <div className="text-center text-emerald-300 text-xs tracking-widest uppercase mb-3">Backyard • {card.gameName}</div>
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-xs text-ink-200">{card.away.name}</div>
            <div className="font-display text-6xl lg:text-8xl" style={{ color: card.away.color }}>{card.away.runs}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-ink-200">Inning</div>
            <div className="font-display text-3xl lg:text-4xl">{card.half === "top" ? "▲" : "▼"} {card.currentInning}</div>
            <div className="text-xs text-ink-200">of {card.innings}</div>
            <div className="mt-2 flex justify-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`w-3 h-3 rounded-full ${i < card.count.outs ? "bg-red-500" : "bg-white/15"}`} />
              ))}
              <span className="text-[10px] text-ink-300 ml-1">OUTS</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-ink-200">{card.home.name}</div>
            <div className="font-display text-6xl lg:text-8xl" style={{ color: card.home.color }}>{card.home.runs}</div>
          </div>
        </div>
      </div>

      {card.completed && winningSide && (
        <div className="glass rounded-2xl p-5 text-center border border-amber-400/50">
          <Trophy size={48} className="text-amber-400 mx-auto" />
          <div className="font-display text-2xl mt-2">{winningSide === "home" ? card.home.name : card.away.name} WIN!</div>
          <div className="text-ink-200">{card.home.runs} - {card.away.runs}</div>
        </div>
      )}

      {/* MAIN ACTION BUTTONS */}
      {!card.completed && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => score("away")} className="rounded-2xl p-6 lg:p-8 font-display text-2xl lg:text-3xl tracking-wider pressable touch-target text-white card-elevated active:opacity-80" style={{ background: card.away.color, minHeight: 110 }}>
            +1 RUN<br/><span className="text-sm font-sans">{card.away.name}</span>
          </button>
          <button onClick={() => score("home")} className="rounded-2xl p-6 lg:p-8 font-display text-2xl lg:text-3xl tracking-wider pressable touch-target text-white card-elevated active:opacity-80" style={{ background: card.home.color, minHeight: 110 }}>
            +1 RUN<br/><span className="text-sm font-sans">{card.home.name}</span>
          </button>
        </div>
      )}

      {/* SECONDARY ACTIONS */}
      {!card.completed && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => homer(card.half === "top" ? "away" : "home")} className="rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-ink-950 font-display tracking-wider pressable touch-target text-lg min-h-[80px]">💥 HOME RUN!</button>
          <button onClick={out} className="rounded-2xl p-4 bg-red-500/80 font-display tracking-wider pressable touch-target text-lg min-h-[80px] text-white">🚫 OUT</button>
          <button onClick={greatPlay} className="rounded-2xl p-4 bg-emerald-500/70 font-display tracking-wider pressable touch-target min-h-[70px] text-white">🧤 Amazing Catch</button>
          <button onClick={ktagger} className="rounded-2xl p-4 bg-purple-500/70 font-display tracking-wider pressable touch-target min-h-[70px] text-white">⚾ Strikeout</button>
          <button onClick={half} className="rounded-2xl p-4 bg-white/10 font-display tracking-wider pressable touch-target min-h-[70px]">▶ Next Half-Inning</button>
          <button onClick={() => setFunnyOpen(true)} className="rounded-2xl p-4 bg-white/10 font-display tracking-wider pressable touch-target min-h-[70px]">😂 Funny Moment</button>
        </div>
      )}

      {/* CONTROL BAR */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={undo} className="px-5 py-3 rounded-xl bg-white/5 pressable touch-target flex items-center gap-2"><Undo2 size={16} /> Undo</button>
        {!card.completed && <button onClick={finalize} className="px-5 py-3 rounded-xl bg-amber-400 text-ink-950 font-display tracking-wider pressable touch-target ml-auto">End Game</button>}
      </div>

      {/* GAME LOG */}
      <div className="glass rounded-2xl p-4">
        <div className="text-xs uppercase tracking-widest text-ink-300 mb-2 font-display">Game Log</div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {card.log.length === 0 && <div className="text-sm text-ink-300">No plays yet — tap a button to start scoring!</div>}
          {card.log.slice().reverse().map(e => (
            <div key={e.id} className="text-sm border-b border-white/5 pb-1">
              <span className="text-[10px] text-ink-300 mr-2">I{e.inning}{e.half === "top" ? "▲" : "▼"}</span>
              {e.text}
            </div>
          ))}
        </div>
      </div>

      {/* HR CONFETTI BURST */}
      <AnimatePresence>
        {confettiKey > 0 && (
          <motion.div
            key={confettiKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            onAnimationComplete={() => {}}
            className="fixed inset-0 z-[60] pointer-events-none"
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: "50vw", y: "50vh", opacity: 1, scale: 1 }}
                animate={{ x: `${Math.random() * 100}vw`, y: `${Math.random() * 100}vh`, opacity: 0, rotate: 360 }}
                transition={{ duration: 1.6, delay: Math.random() * 0.2 }}
                className="absolute w-3 h-4"
                style={{ background: ["#ffd54a","#34d399","#60a5fa","#f472b6","#a78bfa"][i % 5] }}
              />
            ))}
            <motion.div
              initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1.4, rotate: 0 }} exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="absolute inset-0 flex items-center justify-center text-7xl pointer-events-none"
            >💥</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FUNNY MODAL */}
      <AnimatePresence>
        {funnyOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setFunnyOpen(false)}>
            <motion.div initial={{ y: 30 }} animate={{ y: 0 }} className="glass max-w-md w-full rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <div className="font-display text-xl tracking-wide mb-3">😂 Funny Moment</div>
              <input
                value={funnyText}
                onChange={e => setFunnyText(e.target.value)}
                placeholder="e.g., Dog ran onto the field"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3"
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                enterKeyHint="done"
                onKeyDown={(e) => { if (e.key === "Enter") funnySave(); }}
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setFunnyOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 pressable touch-target">Cancel</button>
                <button onClick={funnySave} className="flex-1 px-4 py-3 rounded-xl bg-accent text-ink-950 font-display tracking-wider pressable touch-target">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
