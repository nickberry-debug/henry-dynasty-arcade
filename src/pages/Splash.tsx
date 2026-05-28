import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-ink-950 to-ink-900 z-50">
      <div className="text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white shadow-2xl border-[6px] border-crimson relative" style={{ boxShadow: "0 0 80px rgba(255,179,2,0.4)" }}>
            <div className="absolute inset-3 rounded-full border-2 border-crimson opacity-40" />
          </div>
        </motion.div>
        {/* Solid color instead of bg-clip-text gradient — gradient-text
            has a "goes invisible" failure mode on certain browsers
            (text-transparent + background-clip:text not supported). */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display text-4xl md:text-5xl tracking-widest"
          style={{ color: "#ffd54a", textShadow: "0 2px 12px rgba(255,213,74,0.3)" }}
        >
          BERRY KID'S ARCADE
        </motion.h1>
        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-ink-200 tracking-widest text-xs mt-2">⚾ BASEBALL · 🏈 FOOTBALL · ⚔️ OLYMPUS</motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-48 h-1 bg-white/10 rounded-full mx-auto mt-8 overflow-hidden">
          <motion.div animate={{ x: ["-100%","200%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="h-full w-1/3 bg-gradient-to-r from-accent to-accent-dark" />
        </motion.div>
      </div>
    </div>
  );
}
