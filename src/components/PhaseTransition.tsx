import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { useScrollLock } from "../hooks/useScrollLock";
import type { PendingTransition } from "../store/types";

const CONTENT: Record<PendingTransition["type"], { title: string; subtitle: string; emoji: string; accent: string; cta: string }> = {
  openingDay: { title: "OPENING DAY", subtitle: "Play ball!", emoji: "⚾", accent: "#ffd54a", cta: "Start the Season" },
  allStarBreak: { title: "ALL-STAR BREAK", subtitle: "Stars come out to play.", emoji: "⭐", accent: "#60a5fa", cta: "Open All-Star Event" },
  tradeDeadline: { title: "TRADE DEADLINE", subtitle: "The wires are buzzing.", emoji: "📞", accent: "#f97316", cta: "Continue" },
  playoffRace: { title: "PLAYOFF RACE", subtitle: "Every game matters now.", emoji: "🔥", accent: "#ef4444", cta: "Continue" },
  playoffsStart: { title: "PLAYOFFS", subtitle: "Win or go home.", emoji: "🏟️", accent: "#a78bfa", cta: "View Bracket" },
  worldSeries: { title: "THE FALL CLASSIC", subtitle: "World Series.", emoji: "🏆", accent: "#fbbf24", cta: "Continue" },
  awardsNight: { title: "AWARDS NIGHT", subtitle: "Trophies handed out.", emoji: "🏅", accent: "#34d399", cta: "View Awards" },
  offseason: { title: "OFFSEASON", subtitle: "Time to retool.", emoji: "❄️", accent: "#7dd3fc", cta: "Continue" },
  newSeason: { title: "A NEW SEASON", subtitle: "Fresh slate.", emoji: "🌱", accent: "#86efac", cta: "Play Ball" }
};

export function PhaseTransition() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const pt = league?.pendingTransition;
  const [show, setShow] = useState(false);
  useScrollLock(show);

  useEffect(() => {
    if (pt && !pt.ack) setShow(true);
  }, [pt?.type, pt?.ack]);

  if (!league || !pt || pt.ack) return null;

  const c = CONTENT[pt.type];

  const ack = async () => {
    setShow(false);
    setTimeout(async () => {
      await mutate(lg => {
        if (!lg.pendingTransition) return;
        const type = lg.pendingTransition.type;
        lg.pendingTransition.ack = true;
        // Opening Day / New Season modals are the user's signal that the
        // regular season has begun. The engine only flips preseason→regular
        // inside simDay() — which is unreachable from preseason since the
        // CommandBar has no preseason sim button. So flip the phase here.
        if ((type === "openingDay" || type === "newSeason") && lg.phase === "preseason") {
          lg.phase = "regular";
        }
      });
    }, 300);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          style={{ background: `radial-gradient(circle at center, ${c.accent}22 0%, rgba(0,0,0,0.95) 70%)` }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="text-9xl mb-4"
            >
              {c.emoji}
            </motion.div>
            <div className="font-display text-5xl tracking-widest mb-2" style={{ color: c.accent, textShadow: `0 0 24px ${c.accent}66` }}>{c.title}</div>
            <div className="text-ink-100 text-lg mb-8">{c.subtitle}</div>
            <button
              onClick={ack}
              className="px-8 py-3.5 rounded-xl font-display tracking-widest text-lg pressable touch-target shadow-2xl"
              style={{ background: c.accent, color: "#0a0d13" }}
            >
              {c.cta}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
