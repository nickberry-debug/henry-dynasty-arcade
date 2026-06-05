import { useEffect } from "react";
import { motion } from "framer-motion";

// The nine worlds, shown as a staggered emoji constellation under the title.
const WORLDS = ["⚾", "🏈", "⚔️", "🎬", "💬", "🚀", "🕰️", "🧪", "🔤"];

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, rgba(192,132,252,0.20), transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.16), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}
    >
      {/* Faint starfield — cohesive with the Landing page. */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #fff, transparent), " +
            "radial-gradient(1px 1px at 32% 64%, #fff, transparent), " +
            "radial-gradient(1px 1px at 68% 22%, #fff, transparent), " +
            "radial-gradient(1.4px 1.4px at 48% 38%, #ffd54a, transparent), " +
            "radial-gradient(1.4px 1.4px at 22% 88%, #c084fc, transparent)",
        }} />

      <div className="text-center relative px-6">
        {/* Emblem — gradient arcade badge with a pulsing glow ring.
            Replaces the old empty white circle. */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 180, damping: 14 }}
          className="relative mx-auto mb-6"
          style={{ width: 128, height: 128 }}
        >
          {/* Pulsing glow */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-[28px]"
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.96, 1.04, 0.96] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "radial-gradient(circle, rgba(255,183,28,0.55), transparent 70%)", filter: "blur(8px)" }}
          />
          {/* Badge */}
          <div
            className="absolute inset-0 rounded-[28px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #c084fc 0%, #7c3aed 45%, #ffb302 100%)",
              boxShadow: "0 12px 40px -8px rgba(124,58,237,0.6), inset 0 2px 8px rgba(255,255,255,0.35), inset 0 -6px 14px rgba(0,0,0,0.35)",
              border: "2px solid rgba(255,255,255,0.25)",
            }}
          >
            <motion.span
              className="text-6xl"
              style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))" }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >🎮</motion.span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="font-display text-4xl md:text-5xl tracking-[0.12em] leading-tight"
          style={{ color: "#ffd54a", textShadow: "0 2px 16px rgba(255,213,74,0.35)" }}
        >
          BERRY KID'S<br className="sm:hidden" /> <span style={{ color: "#ffb302" }}>ARCADE</span>
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-ink-200 tracking-[0.3em] text-[11px] mt-3 uppercase"
        >
          Nine worlds · one playroom
        </motion.p>

        {/* Emoji constellation — the nine worlds fading in one by one. */}
        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap max-w-xs mx-auto" aria-hidden="true">
          {WORLDS.map((e, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.4, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.07, type: "spring", stiffness: 300, damping: 18 }}
              className="text-2xl"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
            >
              {e}
            </motion.span>
          ))}
        </div>

        {/* Loading sweep */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="w-48 h-1 bg-white/10 rounded-full mx-auto mt-8 overflow-hidden"
        >
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/3 rounded-full"
            style={{ background: "linear-gradient(90deg, #c084fc, #ffb302)" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
