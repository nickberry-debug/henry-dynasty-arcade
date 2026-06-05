// Pass-and-play handoff interstitial. Covers the screen between picks
// so the next player can't peek at what the previous one chose.
//
// Two-step: large "Pass to [Player] — don't peek!" panel, then a
// tap-anywhere "Ready" overlay that the receiving player taps to start
// their pick. The double-tap pattern stops a single accidental tap
// from skipping the reveal.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  toName: string;
  toColor: string;
  /** Optional explanatory line (e.g. "Pick your pitch privately.") */
  prompt?: string;
  onReady: () => void;
}

export function Handoff({ toName, toColor, prompt, onReady }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, ${toColor}22, transparent 60%), ` +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      {!confirmed && (
        <motion.div
          initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }}
          className="max-w-sm w-full rounded-2xl p-6 text-center"
          style={{
            background: `linear-gradient(135deg, ${toColor}22, rgba(10,10,20,0.95))`,
            border: `2px solid ${toColor}`,
            boxShadow: `0 20px 60px -20px ${toColor}88`,
          }}>
          <div className="text-6xl mb-2" aria-hidden="true">📲</div>
          <div className="text-[10px] tracking-[0.4em] font-display mb-1" style={{ color: toColor }}>
            PASS THE PHONE
          </div>
          <div className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>
            {toName.toUpperCase()}, YOUR TURN
          </div>
          {prompt && (
            <div className="text-[12px] mt-3 leading-relaxed" style={{ color: "rgba(229,231,235,0.78)" }}>
              {prompt}
            </div>
          )}
          <div className="text-[10px] mt-3 italic opacity-70" style={{ color: "#fde047" }}>
            🙈 Don't let them peek at your pick!
          </div>
          <button
            onClick={() => setConfirmed(true)}
            aria-label={`Ready, ${toName}`}
            className="mt-5 w-full px-4 py-3 rounded-xl pressable touch-target font-display tracking-widest text-[12px]"
            style={{ background: toColor, color: "#0a0a14", minHeight: 52 }}>
            I'M {toName.toUpperCase()} · TAP TO START
          </button>
        </motion.div>
      )}
      <AnimatePresence>
        {confirmed && (
          <motion.button
            key="ready"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onReady}
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Reveal pick screen"
            style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="text-center">
              <div className="font-display tracking-[0.3em] text-[14px]" style={{ color: toColor }}>
                READY?
              </div>
              <div className="font-display text-3xl mt-2 tracking-wider" style={{ color: "#fef3c7" }}>
                TAP TO REVEAL
              </div>
              <div className="text-[11px] mt-2 opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
                (one last screen-shield)
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
