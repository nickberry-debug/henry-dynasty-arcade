// Ash's Care Guide — six-tab care reference for a 2-month-old
// bearded dragon. Static markdown content; tab state persists in
// sessionStorage so reloads keep you on the same tab.

import { useEffect, useState } from "react";
import { Printer, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ResourcesShell } from "../components/ResourcesShell";
import { Markdown } from "../components/Markdown";
import { CARE_TABS } from "../data/ashCareContent";
import { speak, stopSpeaking } from "../../wordplay/voice";

const ACCENT = "#86efac";

export default function AshCareGuide() {
  const [activeId, setActiveId] = useState<string>(() => {
    try { return sessionStorage.getItem("ash_care_tab") ?? CARE_TABS[0].id; } catch { return CARE_TABS[0].id; }
  });

  useEffect(() => {
    try { sessionStorage.setItem("ash_care_tab", activeId); } catch {}
    return () => stopSpeaking();
  }, [activeId]);

  const tab = CARE_TABS.find(t => t.id === activeId) ?? CARE_TABS[0];

  const readAloud = () => {
    // Strip markdown for TTS — just speak the prose.
    const plain = tab.markdown
      .replace(/^#+\s+/gm, "")
      .replace(/[*_`]/g, "")
      .replace(/\|/g, " ")
      .replace(/^-\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/\n+/g, ". ");
    speak(plain);
  };

  return (
    <ResourcesShell
      title="Ash's Care Guide"
      subtitle="For Beckett — Ash is 2 months old (juvenile)"
      backTo="/resources/becketts-corner"
      emoji="🦎"
      accent={ACCENT}>

      {/* Tab nav */}
      <nav className="overflow-x-auto -mx-3 px-3 pb-2 mb-2" aria-label="Care guide sections">
        <div className="flex gap-1.5 w-max">
          {CARE_TABS.map(t => {
            const isActive = t.id === activeId;
            return (
              <button key={t.id} onClick={() => setActiveId(t.id)}
                aria-pressed={isActive}
                className="px-3 py-2 rounded-md text-[12px] font-display tracking-widest pressable touch-target whitespace-nowrap"
                style={{
                  background: isActive ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                  color: isActive ? "#bbf7d0" : "#e2e8f0",
                  border: `1px solid ${isActive ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                  minHeight: 40,
                }}>
                <span aria-hidden="true">{t.emoji} </span>{t.label.toUpperCase()}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.article key={tab.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="rounded-xl p-4 pb-2 mt-1"
          style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Markdown source={tab.markdown} />

          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t justify-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <button onClick={readAloud}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
              style={{ background: `${ACCENT}33`, color: ACCENT, border: `1px solid ${ACCENT}88`, minHeight: 44 }}>
              <Volume2 size={12} aria-hidden="true" /> READ ALOUD
            </button>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f0fdf4", minHeight: 44 }}>
              <Printer size={12} aria-hidden="true" /> PRINT
            </button>
          </div>
        </motion.article>
      </AnimatePresence>

      <p className="text-[11px] text-emerald-100/70 mt-3 leading-relaxed text-center px-2">
        This guide is for learning, not a vet. If something looks wrong with Ash, tell mom or dad first.
      </p>
    </ResourcesShell>
  );
}
