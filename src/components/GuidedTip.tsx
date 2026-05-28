// Contextual guidance card — shown when tutorial.guidedSeason is ON.
// Each tip is dismissable per-league; once dismissed it won't reappear.
import { useStore } from "../store";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  id: string;
  title: string;
  body: string;
  cta?: { label: string; to?: string; onClick?: () => void };
}

export function GuidedTip({ id, title, body, cta }: Props) {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  if (!league || !league.tutorial.guidedSeason) return null;
  if (league.tutorial.dismissedTips.includes(id)) return null;

  const dismiss = async () => {
    await mutate(lg => {
      if (!lg.tutorial.dismissedTips.includes(id)) lg.tutorial.dismissedTips.push(id);
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass rounded-2xl p-4 border border-accent/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, #ffb302 0%, transparent 60%)" }} />
        <button onClick={dismiss} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/5 flex items-center justify-center pressable touch-target" aria-label="Dismiss tip">
          <X size={16} />
        </button>
        <div className="relative flex items-start gap-3 pr-8">
          <Sparkles className="text-accent shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <div className="font-display text-base tracking-wide text-accent mb-1">{title}</div>
            <div className="text-sm text-ink-100 mb-2">{body}</div>
            {cta && (cta.to ? (
              <Link to={cta.to} onClick={dismiss} className="inline-flex items-center gap-1 text-xs text-accent font-display tracking-wider pressable touch-target">
                {cta.label} <ChevronRight size={12} />
              </Link>
            ) : (
              <button onClick={() => { cta.onClick?.(); dismiss(); }} className="inline-flex items-center gap-1 text-xs text-accent font-display tracking-wider pressable touch-target">
                {cta.label} <ChevronRight size={12} />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
