// J.14 — World Series celebration: confetti, trophy, banner-raising.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { useScrollLock } from "../hooks/useScrollLock";
import { TeamLogo } from "./TeamLogo";
import { Trophy, Sparkles, X } from "lucide-react";

export function ChampionshipCelebration() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const [show, setShow] = useState(false);
  useScrollLock(show);

  useEffect(() => {
    if (!league) return;
    const last = league.history[0];
    if (!last) return;
    // Show once per championship — flag by year stored in dismissedTips
    const key = `champCelebrated-${last.year}`;
    if (!league.tutorial.dismissedTips.includes(key) && league.phase === "offseason") {
      setShow(true);
    }
  }, [league?.phase, league?.history.length]);

  if (!league) return null;
  const last = league.history[0];
  if (!last) return null;
  const champ = league.teams.find(t => t.id === last.champion);
  const isUser = champ?.id === league.userTeamId;
  if (!champ) return null;

  const close = async () => {
    setShow(false);
    const key = `champCelebrated-${last.year}`;
    await mutate(lg => {
      if (!lg.tutorial.dismissedTips.includes(key)) lg.tutorial.dismissedTips.push(key);
      // K.42 — First championship letter (only first one for user)
      if (isUser) {
        const userChamps = lg.history.filter(h => h.champion === lg.userTeamId).length;
        if (userChamps === 1) {
          lg.newsLog.unshift({
            id: "champletter-" + last.year, day: lg.day, year: lg.year,
            category: "Off-Field",
            headline: `📜 A letter from the Commissioner: "Dear ${lg.gmProfile?.name ?? "GM"}, you've done it. Your first World Series title. From everyone in the league office — well earned. The party's on us."`,
            important: true
          });
        }
        // K.44 — Worst to first
        const yearsActive = lg.year - (lg.gmProfile?.createdAt ?? lg.year);
        if (yearsActive <= 5) {
          // (We'd need historical record to verify "worst" — for now treat any sub-5-year title as worth a nod)
          if (!lg.achievements.includes("first-championship")) lg.achievements.push("first-championship");
        }
      }
    });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center p-6"
          style={{
            background: `radial-gradient(circle at center, ${champ.primary}88 0%, rgba(0,0,0,0.96) 70%)`
          }}
        >
          {/* Confetti */}
          {league.settings.visual.confetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 60 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: `${Math.random() * 100}%`, rotate: 0 }}
                  animate={{ y: "120vh", rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
                  transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 2, ease: "linear" }}
                  className="absolute w-2 h-3"
                  style={{ background: i % 3 === 0 ? champ.primary : i % 3 === 1 ? champ.secondary : champ.accent }}
                />
              ))}
            </div>
          )}
          <button onClick={close} className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center pressable touch-target z-10" aria-label="Close"><X size={20} /></button>
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative text-center"
          >
            <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 120 }}>
              <Trophy size={140} className="text-amber-400 mx-auto drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 20px rgba(251,191,36,0.6))" }} />
            </motion.div>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4">
              <div className="text-xs tracking-[0.4em] text-amber-300 font-display">{last.year} CHAMPIONS</div>
              <div className="font-display text-5xl lg:text-7xl text-white mt-2" style={{ textShadow: "0 0 32px rgba(251,191,36,0.5)" }}>
                {champ.name.toUpperCase()}
              </div>
              <div className="flex items-center justify-center gap-3 mt-3">
                <Sparkles className="text-amber-400" />
                <TeamLogo team={champ} size={64} glow />
                <Sparkles className="text-amber-400" />
              </div>
              {last.mvp && <div className="text-sm text-ink-100 mt-4">WS MVP: <strong>{last.mvp}</strong></div>}
              {isUser && <div className="text-amber-300 mt-3 text-sm font-display tracking-wider">🎉 YOU JUST WON IT ALL 🎉</div>}
            </motion.div>
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
              onClick={close}
              className="mt-8 px-8 py-3.5 rounded-xl bg-amber-400 text-ink-950 font-display tracking-widest pressable touch-target shadow-2xl"
            >
              RAISE THE BANNER
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
