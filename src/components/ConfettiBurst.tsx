// Confetti burst overlay — triggered on HOME RUN moments in practice.
// Uses Framer Motion for the particle physics; teardown after 1.8s.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  trigger: any; // Pass a changing value to fire (e.g. a counter or new HR id)
  /** If true, show the trigger sub-banner "HOME RUN" text */
  showBanner?: boolean;
}

const COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185"];

export function ConfettiBurst({ trigger, showBanner = true }: Props) {
  const [active, setActive] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger == null) return;
    setKey(k => k + 1);
    setActive(true);
    const t = setTimeout(() => setActive(false), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={key}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center"
        >
          {/* Particles */}
          {Array.from({ length: 32 }).map((_, i) => {
            const angle = (i / 32) * Math.PI * 2;
            const dist = 200 + Math.random() * 180;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist * 0.7 - 80;
            const color = COLORS[i % COLORS.length];
            const size = 6 + Math.random() * 8;
            const rotate = Math.random() * 720 - 360;
            return (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
                animate={{ x: dx, y: dy, opacity: 0, scale: 1, rotate }}
                transition={{ duration: 1.4 + Math.random() * 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute"
                style={{ width: size, height: size * 1.4, background: color, borderRadius: 2, boxShadow: `0 0 8px ${color}99` }}
              />
            );
          })}
          {/* Banner */}
          {showBanner && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className="font-display tracking-[0.3em] text-5xl lg:text-7xl text-amber-300"
              style={{ textShadow: "0 0 30px rgba(251,191,36,0.7), 0 0 60px rgba(251,191,36,0.4)" }}
            >
              HOME RUN!
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
