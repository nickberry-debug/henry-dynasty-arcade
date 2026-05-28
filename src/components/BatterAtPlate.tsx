// MLB The Show-style pitcher POV. Batter on the left in stance, catcher squatting
// in center, strike-zone rectangle overlaid on the catcher's chest with hot/cold
// heatmap. ONE tap inside the box = pitch placed. ONE tap outside = wild ball.
// No follow-up buttons.
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BatterSprite, type BatterState } from "./BatterSprite";
import { CatcherSprite } from "./CatcherSprite";
import type { Team } from "../store/types";

interface Props {
  /** 3x3 hot/cold heatmap (0..1) for the current at-bat. */
  hotZones?: number[][];
  team?: Team | null;
  bats?: "R" | "L";
  batterName?: string;
  contact?: number;
  power?: number;
  /** Called with (x, y) ∈ [0..1]^2 (normalized within the strike zone rectangle)
   * and `inZone` indicating whether the tap was inside the strike zone. */
  onPitch: (x: number, y: number, inZone: boolean) => void;
  spriteState?: BatterState;
}

// Strike zone rectangle position within the SVG/container (in % of width/height).
// These match the MLB The Show overlay placement — over the catcher's chest.
const ZONE = { left: 0.46, top: 0.32, width: 0.30, height: 0.36 };

export function BatterAtPlate({ hotZones, team, bats = "R", batterName, contact, power, onPitch, spriteState = "idle" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  const handleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Map absolute tap → strike zone local coords
    const inZone =
      px >= ZONE.left && px <= ZONE.left + ZONE.width &&
      py >= ZONE.top && py <= ZONE.top + ZONE.height;
    let zx = (px - ZONE.left) / ZONE.width;
    let zy = (py - ZONE.top) / ZONE.height;
    zx = Math.max(0, Math.min(1, zx));
    zy = Math.max(0, Math.min(1, zy));

    setRipple({ x: px, y: py });
    setTimeout(() => setRipple(null), 400);
    onPitch(zx, zy, inZone);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleTap}
      className="relative w-full max-w-[520px] mx-auto rounded-3xl overflow-hidden cursor-crosshair select-none border-2 border-white/10 card-elevated"
      style={{ aspectRatio: "4 / 5", touchAction: "none" }}
    >
      {/* Stadium background (sky + crowd + field) */}
      <Stadium />

      {/* Batter sprite — LEFT side, in stance */}
      <div className="absolute pointer-events-none" style={{ left: "2%", top: "20%", width: "42%" }}>
        <BatterSprite state={spriteState} team={team} size={240} bats={bats} />
      </div>

      {/* Catcher sprite — CENTER, squatting */}
      <div className="absolute pointer-events-none" style={{ left: "42%", top: "35%", width: "36%" }}>
        <CatcherSprite team={team} size={180} />
      </div>

      {/* STRIKE ZONE rectangle with hot/cold heatmap */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${ZONE.left * 100}%`,
          top: `${ZONE.top * 100}%`,
          width: `${ZONE.width * 100}%`,
          height: `${ZONE.height * 100}%`,
        }}
      >
        <StrikeZoneOverlay hotZones={hotZones} />
      </div>

      {/* Batter name/ratings badge */}
      {batterName && (
        <div className="absolute top-2 left-2 z-30 glass rounded-lg px-2 py-1 text-[10px] font-display tracking-wide pointer-events-none">
          <div className="text-amber-300 truncate max-w-[140px]">{batterName}</div>
          {(contact != null || power != null) && (
            <div className="text-ink-300 text-[9px]">C {contact ?? "?"} · P {power ?? "?"}</div>
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
        Tap inside the box to throw a strike • Outside = ball
      </div>
    </div>
  );
}

function Stadium() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a5e8a"/>
          <stop offset="60%" stopColor="#6a8db4"/>
          <stop offset="100%" stopColor="#b27e3a"/>
        </linearGradient>
        <linearGradient id="bp-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a6a28"/>
          <stop offset="100%" stopColor="#1c3a13"/>
        </linearGradient>
        <pattern id="bp-mow" width="22" height="12" patternUnits="userSpaceOnUse">
          <rect width="22" height="12" fill="#2d5b1f"/>
          <rect width="11" height="12" fill="#3a6a28"/>
        </pattern>
      </defs>
      {/* Sky */}
      <rect width="400" height="260" fill="url(#bp-sky)"/>
      {/* Distant cityscape */}
      <g opacity="0.55">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = i * 26;
          const h = 22 + ((i * 13) % 28);
          return <rect key={i} x={x} y={258 - h} width="22" height={h} fill="#1a2a3e"/>;
        })}
      </g>
      {/* Stadium upper deck */}
      <path d="M 0 240 Q 200 200 400 240 L 400 280 L 0 280 Z" fill="#1f2937" opacity="0.85"/>
      {/* Crowd texture */}
      <g opacity="0.5">
        {Array.from({ length: 80 }).map((_, i) => {
          const x = (i * 5) % 400;
          const y = 240 + (i * 7) % 30;
          const c = ["#dc2626","#f59e0b","#3b82f6","#10b981","#a855f7","#ec4899"][i % 6];
          return <circle key={i} cx={x} cy={y} r="2" fill={c}/>;
        })}
      </g>
      {/* Suite ring */}
      <rect x="0" y="280" width="400" height="6" fill="#0f172a"/>
      {/* Grass */}
      <rect x="0" y="286" width="400" height="214" fill="url(#bp-grass)"/>
      <rect x="0" y="286" width="400" height="214" fill="url(#bp-mow)" opacity="0.4"/>
      {/* Infield dirt arc */}
      <ellipse cx="200" cy="500" rx="280" ry="80" fill="#8a6939" opacity="0.85"/>
      {/* Home plate (white pentagon at bottom) */}
      <path d="M 170 480 L 230 480 L 240 490 L 200 500 L 160 490 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
      {/* Batters box outline (chalky) */}
      <path d="M 110 460 L 160 460 L 160 500 L 110 500 Z" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6" strokeDasharray="3 3"/>
    </svg>
  );
}

function StrikeZoneOverlay({ hotZones }: { hotZones?: number[][] }) {
  // Render 3x3 heatmap cells inside the rectangle.
  const cells: Array<{ row: number; col: number; heat: number }> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push({ row: r, col: c, heat: hotZones?.[r]?.[c] ?? 0.5 });
    }
  }
  return (
    <div className="relative w-full h-full">
      {/* Heatmap cells */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        {cells.map((cell, i) => {
          const heat = cell.heat;
          const bg = heat > 0.65
            ? `rgba(239,68,68,${0.35 + (heat - 0.65) * 1.2})`
            : heat < 0.35
            ? `rgba(96,165,250,${0.35 + (0.35 - heat) * 1.2})`
            : `rgba(255,255,255,0.08)`;
          return <div key={i} style={{ background: bg, transition: "background 200ms" }} />;
        })}
      </div>
      {/* Pulse on hot zones */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
        {cells.map((cell, i) => (
          cell.heat > 0.7 ? <div key={i} className="animate-pulse" style={{ background: "rgba(239,68,68,0.15)" }} /> : <div key={i}/>
        ))}
      </div>
      {/* White outline rectangle (the actual strike zone box) */}
      <div className="absolute inset-0 rounded-sm border-2 border-white/80 shadow-[0_0_24px_rgba(255,255,255,0.5)]" />
    </div>
  );
}

/** Generate a per-batter 3x3 hot/cold heatmap from their ratings. */
export function generateHotZones(contact: number, power: number, seed: number): number[][] {
  const rng = (() => {
    let s = (seed | 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 1000) / 1000; };
  })();
  const base = (contact + power) / 200;
  const hotCol = Math.floor(rng() * 3);
  const hotRow = Math.floor(rng() * 3);
  const coldCol = (hotCol + 1 + Math.floor(rng() * 2)) % 3;
  const coldRow = (hotRow + 1 + Math.floor(rng() * 2)) % 3;
  const grid: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      const distHot = Math.abs(c - hotCol) + Math.abs(r - hotRow);
      const distCold = Math.abs(c - coldCol) + Math.abs(r - coldRow);
      let heat = base + (1 - distHot * 0.2) * 0.35 - (1 - distCold * 0.2) * 0.3 + (rng() - 0.5) * 0.1;
      heat = Math.max(0.1, Math.min(0.95, heat));
      row.push(heat);
    }
    grid.push(row);
  }
  return grid;
}
