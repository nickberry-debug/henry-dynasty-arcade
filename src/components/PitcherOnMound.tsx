// MLB The Show-style BATTER POV. Looking out at the pitcher on the mound.
// Hot/cold heatmap projected on the strike zone area in front of the batter.
// ONE tap inside the zone = swing made. ONE tap outside = ball / check swing.
// No follow-up buttons. Single touch drives everything.
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PitcherSprite, type PitcherState } from "./PitcherSprite";
import type { Team } from "../store/types";

interface Props {
  /** 3x3 hot/cold heatmap for THIS PITCHER's tendency zones. */
  hotZones?: number[][];
  team?: Team | null;
  throws?: "R" | "L";
  pitcherName?: string;
  velo?: number;
  control?: number;
  /** (x, y) ∈ [0..1]^2 within the strike zone, inZone flag. */
  onSwing: (x: number, y: number, inZone: boolean) => void;
  spriteState?: PitcherState;
}

// Strike zone projected on the ground in front of the batter (trapezoidal perspective).
// We approximate with a centered rectangle for simplicity, slightly wider at top, narrower at bottom.
const ZONE = { left: 0.32, top: 0.50, width: 0.36, height: 0.36 };

export function PitcherOnMound({ hotZones, team, throws = "R", pitcherName, velo, control, onSwing, spriteState = "idle" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  const handleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const inZone =
      px >= ZONE.left && px <= ZONE.left + ZONE.width &&
      py >= ZONE.top && py <= ZONE.top + ZONE.height;
    let zx = (px - ZONE.left) / ZONE.width;
    let zy = (py - ZONE.top) / ZONE.height;
    zx = Math.max(0, Math.min(1, zx));
    zy = Math.max(0, Math.min(1, zy));

    setRipple({ x: px, y: py });
    setTimeout(() => setRipple(null), 400);
    onSwing(zx, zy, inZone);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleTap}
      className="relative w-full max-w-[520px] mx-auto rounded-3xl overflow-hidden cursor-crosshair select-none border-2 border-white/10 card-elevated"
      style={{ aspectRatio: "4 / 5", touchAction: "none" }}
    >
      {/* Stadium background looking out from home plate */}
      <BatterStadium />

      {/* Pitcher on the mound — center, mid-distance */}
      <div className="absolute pointer-events-none" style={{ left: "32%", top: "20%", width: "36%" }}>
        <PitcherSprite state={spriteState} team={team} size={170} throws={throws} />
      </div>

      {/* Strike-zone heatmap projection on the field/plate area */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${ZONE.left * 100}%`,
          top: `${ZONE.top * 100}%`,
          width: `${ZONE.width * 100}%`,
          height: `${ZONE.height * 100}%`,
          // Subtle perspective tilt — narrower at the bottom like MLB The Show
          transform: "perspective(600px) rotateX(28deg)",
          transformOrigin: "center bottom",
        }}
      >
        <FieldHeatmap hotZones={hotZones} />
      </div>

      {/* Pitcher badge */}
      {pitcherName && (
        <div className="absolute top-2 left-2 z-30 glass rounded-lg px-2 py-1 text-[10px] font-display tracking-wide pointer-events-none">
          <div className="text-amber-300 truncate max-w-[140px]">{pitcherName}</div>
          {(velo != null || control != null) && (
            <div className="text-ink-300 text-[9px]">V {velo ?? "?"} · CTRL {control ?? "?"}</div>
          )}
        </div>
      )}

      {/* Tap ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 3.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute w-10 h-10 rounded-full bg-amber-300 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
            style={{ left: `${ripple.x * 100}%`, top: `${ripple.y * 100}%`, boxShadow: "0 0 30px rgba(251,191,36,0.8)" }}
          />
        )}
      </AnimatePresence>

      {/* Hint */}
      <div className="absolute bottom-2 inset-x-0 text-center text-[11px] text-white/70 z-30 pointer-events-none font-display tracking-wider">
        Tap the zone to swing • Outside = take
      </div>
    </div>
  );
}

function BatterStadium() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d8ab8"/>
          <stop offset="100%" stopColor="#cbb88a"/>
        </linearGradient>
        <linearGradient id="pm-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a6a28"/>
          <stop offset="100%" stopColor="#2d5b1f"/>
        </linearGradient>
        <pattern id="pm-mow" width="22" height="12" patternUnits="userSpaceOnUse">
          <rect width="22" height="12" fill="#2d5b1f"/>
          <rect width="11" height="12" fill="#3a6a28"/>
        </pattern>
      </defs>
      <rect width="400" height="200" fill="url(#pm-sky)"/>
      {/* Distant grandstand */}
      <path d="M 0 180 Q 200 150 400 180 L 400 220 L 0 220 Z" fill="#3a4a6a" opacity="0.8"/>
      {/* Outfield wall */}
      <rect x="0" y="200" width="400" height="32" fill="#0f3a1a"/>
      {/* Crowd dots in stands */}
      <g opacity="0.45">
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i * 7) % 400;
          const y = 165 + (i * 5) % 25;
          const c = ["#dc2626","#3b82f6","#f59e0b","#10b981"][i % 4];
          return <circle key={i} cx={x} cy={y} r="2" fill={c}/>;
        })}
      </g>
      {/* Grass field */}
      <rect x="0" y="232" width="400" height="268" fill="url(#pm-grass)"/>
      <rect x="0" y="232" width="400" height="268" fill="url(#pm-mow)" opacity="0.4"/>
      {/* Infield dirt */}
      <ellipse cx="200" cy="320" rx="180" ry="50" fill="#8a6939" opacity="0.8"/>
      {/* Pitching mound */}
      <ellipse cx="200" cy="252" rx="42" ry="14" fill="#a07a4a"/>
      <ellipse cx="200" cy="252" rx="42" ry="14" fill="none" stroke="#7a5a30" strokeWidth="1"/>
      {/* Pitching rubber */}
      <rect x="190" y="254" width="20" height="3" fill="#ffffff" opacity="0.8"/>
      {/* Home plate area (foreground) */}
      <ellipse cx="200" cy="500" rx="180" ry="40" fill="#8a6939" opacity="0.9"/>
      <path d="M 160 475 L 240 475 L 245 488 L 200 500 L 155 488 Z" fill="#ffffff"/>
    </svg>
  );
}

function FieldHeatmap({ hotZones }: { hotZones?: number[][] }) {
  const cells: Array<{ row: number; col: number; heat: number }> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push({ row: r, col: c, heat: hotZones?.[r]?.[c] ?? 0.5 });
    }
  }
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        {cells.map((cell, i) => {
          const heat = cell.heat;
          const bg = heat > 0.6
            ? `rgba(239,68,68,${0.45 + (heat - 0.6) * 1.2})`
            : heat < 0.4
            ? `rgba(96,165,250,${0.4 + (0.4 - heat) * 1.2})`
            : `rgba(255,255,255,0.10)`;
          return <div key={i} style={{ background: bg, transition: "background 200ms" }} />;
        })}
      </div>
      <div className="absolute inset-0 rounded-sm border-2 border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
    </div>
  );
}

/** Per-pitcher hot/cold map: where they tend to throw + where they're most effective. */
export function generatePitcherHotZones(velo: number, control: number, seed: number): number[][] {
  const rng = (() => {
    let s = (seed | 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 1000) / 1000; };
  })();
  const skill = (control + (velo - 80) * 4) / 200;
  const hotCol = Math.floor(rng() * 3);
  const hotRow = Math.floor(rng() * 3);
  const grid: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      const dist = Math.abs(c - hotCol) + Math.abs(r - hotRow);
      let heat = 0.5 - skill * 0.15 + (1 - dist * 0.25) * 0.4 + (rng() - 0.5) * 0.12;
      heat = Math.max(0.1, Math.min(0.95, heat));
      row.push(heat);
    }
    grid.push(row);
  }
  return grid;
}
