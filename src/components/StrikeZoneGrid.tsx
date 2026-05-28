// 4x4 strike zone grid: outer 4 + inner 3x3 + outer 4 = 13 zones (inside 3x3 + edges).
// For pitching tap: where the pitch ended up.
import { useState } from "react";

interface Props {
  selected?: { col: number; row: number } | null;
  hotZones?: number[][]; // 3x3 hot/cold for current batter
  onTap: (col: number, row: number) => void;
  label?: string;
}

export function StrikeZoneGrid({ selected, hotZones, onTap, label }: Props) {
  const cells = Array.from({ length: 16 }).map((_, i) => ({ col: i % 4, row: Math.floor(i / 4) }));
  const isStrike = (col: number, row: number) => col >= 1 && col <= 2 && row >= 1 && row <= 2;
  return (
    <div className="select-none">
      {label && <div className="text-[10px] text-ink-300 uppercase tracking-widest mb-1 text-center">{label}</div>}
      <div className="grid grid-cols-4 grid-rows-4 gap-1 aspect-square w-full max-w-[260px] mx-auto p-2 rounded-2xl bg-ink-900/60 border-2 border-white/10 card-elevated touch-none" style={{ touchAction: "none" }}>
        {cells.map(({ col, row }) => {
          const inStrike = isStrike(col, row);
          let heat = 0.5;
          if (hotZones && inStrike) heat = hotZones[row - 1]?.[col - 1] ?? 0.5;
          const isSel = selected && selected.col === col && selected.row === row;
          const heatBg = inStrike
            ? heat > 0.65 ? "bg-red-500/30" : heat < 0.35 ? "bg-sky-500/25" : "bg-white/5"
            : "bg-white/3";
          return (
            <button
              key={`${col}-${row}`}
              onPointerDown={() => onTap(col, row)}
              className={`rounded-md ${heatBg} border ${isSel ? "border-amber-400 ring-2 ring-amber-300" : inStrike ? "border-white/20" : "border-white/5"} active:scale-95 transition pressable`}
              aria-label={`Zone ${col}-${row}`}
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {isSel && <span className="block w-2 h-2 rounded-full bg-amber-300 mx-auto" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
