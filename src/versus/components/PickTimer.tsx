// Versus Mode — shared pick-timer countdown bar. Used at the top of
// every picker screen when setup.pickTimerSec > 0. Counts down to the
// configured deadline; the picker calls onAutoLock when it expires.
//
// Visual: thin pulsing bar across the top of the pick card. Color
// gradient eases red as time runs out so kids feel the pressure.

import { useEffect, useState } from "react";

interface Props {
  /** Total seconds for the timer (e.g. 15, 30). 0 disables. */
  durationSec: number;
  /** Stable key — when this changes, the timer resets (e.g. one
   *  timer per pitch, not per render). */
  resetKey: string | number;
  /** Called once when the timer hits 0. */
  onExpire: () => void;
  /** Tint when low on time. Defaults to red. */
  urgentColor?: string;
  /** Tint when high on time. Defaults to green. */
  calmColor?: string;
}

export function PickTimer({
  durationSec, resetKey, onExpire,
  urgentColor = "#ef4444", calmColor = "#86efac",
}: Props) {
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [expired, setExpired] = useState(false);

  // Reset whenever the resetKey changes (e.g. new pitch).
  useEffect(() => {
    setStartedAt(Date.now());
    setNow(Date.now());
    setExpired(false);
  }, [resetKey]);

  useEffect(() => {
    if (durationSec <= 0 || expired) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [durationSec, startedAt, expired]);

  useEffect(() => {
    if (durationSec <= 0 || expired) return;
    if (now - startedAt < durationSec * 1000) return;
    setExpired(true);
    onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, startedAt, durationSec, expired]);

  if (durationSec <= 0) return null;
  const elapsed = (now - startedAt) / 1000;
  const remain = Math.max(0, durationSec - elapsed);
  const pct = Math.max(0, Math.min(100, (remain / durationSec) * 100));
  const color = pct < 25 ? urgentColor : pct < 50 ? "#fbbf24" : calmColor;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-[9px] tracking-widest mb-1">
        <span style={{ color }}>PICK TIMER</span>
        <span className="tabular-nums" style={{ color }}>{remain.toFixed(1)}s</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
        <div className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: pct < 25 ? `0 0 8px ${color}` : undefined,
          }} />
      </div>
    </div>
  );
}
