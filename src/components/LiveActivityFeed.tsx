// Live family activity stream — last ~18 events from any family member,
// across all games. Updates in real time via Firestore onSnapshot.
// Shown on the Landing page as a small "What the family's up to" panel
// so a kid sees the others' wins as they happen.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeActivity, type ActivityEvent } from "../sync/liveActivity";

function fmtAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

interface Props {
  className?: string;
  style?: React.CSSProperties;
  /** Show at most N events (UI cap, on top of the server-side limit). */
  max?: number;
}

export function LiveActivityFeed({ className, style, max = 6 }: Props) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  // Re-render every 30s so "Xm ago" labels stay fresh without state churn.
  const [, force] = useState(0);
  useEffect(() => {
    return subscribeActivity(setEvents);
  }, []);
  useEffect(() => {
    const t = setInterval(() => force(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Empty/loading state — render nothing until we have data; the host
  // page should reserve no fixed space, this panel is decorative.
  if (!events || events.length === 0) return null;

  const visible = events.slice(0, max);

  return (
    <div className={className} style={style}>
      <div className="text-[9px] uppercase tracking-[0.3em] font-display mb-1.5 opacity-70" style={{ color: "#c9b6f0" }}>
        Family Activity
      </div>
      <ul className="space-y-1">
        <AnimatePresence initial={false}>
          {visible.map(e => (
            <motion.li key={e.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="rounded-lg px-2.5 py-1.5 flex items-start gap-2 text-[11px]"
              style={{
                background: `${e.profileColor}1f`,
                border: `1px solid ${e.profileColor}44`,
              }}>
              <span aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: e.profileColor }}>{e.emoji ?? "✨"}</span>
              <span className="flex-1 min-w-0 leading-snug" style={{ color: "rgba(229,231,235,0.92)" }}>
                {e.text}
              </span>
              <span className="shrink-0 text-[9px] opacity-60 tabular-nums">{fmtAgo(e.ts)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
