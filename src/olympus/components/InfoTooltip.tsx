// Universal hover/tap tooltip for class, subclass, stat, and companion
// info. On desktop, hovers open and closes follow the cursor. On touch
// devices, tap the ⓘ to toggle and tap elsewhere to dismiss.

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InfoTooltipProps {
  title: string;
  description?: string;
  storyImpact?: string;
  examples?: string[];
  bonuses?: string[];
  size?: "sm" | "md";
}

export function InfoTooltip({ title, description, storyImpact, examples = [], bonuses = [], size = "sm" }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = isOpen || isHovered;

  useEffect(() => {
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", onOutside);
      document.addEventListener("touchstart", onOutside);
    }
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setIsOpen(v => !v); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${size === "sm" ? "w-5 h-5" : "w-6 h-6"} rounded-full flex items-center justify-center transition-colors pressable touch-target`}
        style={{ background: "rgba(218,165,32,0.18)", color: "#DAA520" }}
        aria-label={`More info: ${title}`}
      >
        <Info className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] w-72 sm:w-80 p-4 rounded-xl top-full mt-2 left-1/2 -translate-x-1/2 shadow-2xl text-left"
            style={{ background: "rgba(10,16,28,0.97)", border: "1px solid rgba(218,165,32,0.45)" }}
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-display text-base tracking-wider mb-1" style={{ color: "#DAA520", fontFamily: "'Cinzel', serif" }}>{title}</h4>
            {description && <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(233,227,210,0.85)" }}>{description}</p>}
            {bonuses.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>Bonuses</p>
                <ul className="text-[11px] space-y-0.5" style={{ color: "rgba(233,227,210,0.9)" }}>
                  {bonuses.map((b, i) => <li key={i}>· {b}</li>)}
                </ul>
              </div>
            )}
            {storyImpact && (
              <div className="mb-2">
                <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>Shapes Your Story</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(233,227,210,0.8)" }}>{storyImpact}</p>
              </div>
            )}
            {examples.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>For example</p>
                <ul className="text-[11px] leading-relaxed space-y-0.5" style={{ color: "rgba(233,227,210,0.75)" }}>
                  {examples.map((ex, i) => <li key={i}>· {ex}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
