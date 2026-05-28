// Tap on a practice net visualization. Records normalized x,y of the tap.
// Used by both hitting (where ball hit) and pitching (where pitch hit).
import { useRef, useState } from "react";

interface Props {
  /** Last few taps to fade in dot trail. */
  recentDots?: Array<{ x: number; y: number; color?: string }>;
  /** Color overlay for hot/cold zones (optional). */
  heatMap?: number[][]; // 3x3 grid 0..1
  size?: "lg" | "md" | "sm";
  onTap: (x: number, y: number) => void;
  label?: string;
}

export function NetTapZone({ recentDots = [], heatMap, size = "lg", onTap, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState<{ x: number; y: number; t: number } | null>(null);

  const aspect = size === "lg" ? "aspect-[3/4]" : size === "md" ? "aspect-[4/5]" : "aspect-square";

  const handle = (e: React.PointerEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const cx = Math.max(0, Math.min(1, x));
    const cy = Math.max(0, Math.min(1, y));
    setPulse({ x: cx, y: cy, t: Date.now() });
    onTap(cx, cy);
    setTimeout(() => setPulse(null), 350);
  };

  return (
    <div className="select-none">
      {label && <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1 text-center">{label}</div>}
      <div
        ref={ref}
        onPointerDown={handle}
        className={`relative w-full ${aspect} rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-900/30 to-emerald-950/60 border-4 border-emerald-800 cursor-crosshair touch-none`}
        style={{ touchAction: "none" }}
      >
        {/* Net pattern */}
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 opacity-50">
          <defs>
            <pattern id="netP" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#netP)" />
        </svg>
        {/* Center cross for orientation */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
        {/* Heat map overlay */}
        {heatMap && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {heatMap.flat().map((v, i) => (
              <div key={i} style={{ background: v > 0.5 ? `rgba(239,68,68,${v * 0.5})` : `rgba(96,165,250,${(1 - v) * 0.3})` }} />
            ))}
          </div>
        )}
        {/* Recent dots fading */}
        {recentDots.map((d, i) => {
          const opacity = 0.2 + (i / Math.max(recentDots.length, 1)) * 0.6;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{
                left: `${d.x * 100}%`, top: `${d.y * 100}%`,
                background: d.color ?? "#fbbf24",
                opacity,
                boxShadow: `0 0 6px ${d.color ?? "#fbbf24"}`
              }}
            />
          );
        })}
        {/* Active pulse */}
        {pulse && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${pulse.x * 100}%`, top: `${pulse.y * 100}%` }}
          >
            <div className="w-4 h-4 rounded-full bg-amber-300 animate-ping" />
            <div className="absolute inset-0 w-4 h-4 rounded-full bg-amber-300" />
          </div>
        )}
      </div>
    </div>
  );
}
