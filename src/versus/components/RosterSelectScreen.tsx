// src/versus/components/RosterSelectScreen.tsx
//
// Shared roster-select screen for Boxing + Wrestling.
// Phase 3 spec: portrait grid + live preview (idle animation if procedural,
// recolour if shared) + stats bar (4 attributes) + signature/finisher
// name + FIGHT button.
//
// Both boxing and wrestling use procedural canvas drawers, so the preview
// here is a recoloured silhouette card with the fighter's accent colour.
// (The live in-match procedural draw is still done by the existing
// proceduralBoxer.ts / proceduralWrestler.ts inside the match page —
// this screen is the SELECT view, not the in-ring view.)

import { useState } from "react";
import { motion } from "framer-motion";
import { BOXERS, type BoxerDef } from "../../combat-sports/boxing/fighters";
import { WRESTLERS, type WrestlerDef } from "../../combat-sports/wrestling/wrestlers";

type SportTab = "boxing" | "wrestling";

interface Props {
  sport: SportTab;
  initialId?: string;
  onCancel?: () => void;
  onConfirm: (fighterId: string) => void;
}

interface UnifiedCard {
  id: string;
  name: string;
  archetype: string;
  color: string;
  bio: string;
  stats: { a: number; b: number; c: number; d: number; aL: string; bL: string; cL: string; dL: string };
  sigName: string;
  sigFlavour: string;
  sigEmoji: string;
}

function boxerToCard(b: BoxerDef): UnifiedCard {
  return {
    id: b.id, name: b.name, archetype: b.archetype, color: b.color, bio: b.bio,
    stats: {
      a: b.stats.power,   aL: "PWR",
      b: b.stats.speed,   bL: "SPD",
      c: b.stats.chin,    cL: "CHN",
      d: b.stats.stamina, dL: "STM",
    },
    sigName: `${b.nickname}`, sigFlavour: b.bio, sigEmoji: "🥊",
  };
}

function wrestlerToCard(w: WrestlerDef): UnifiedCard {
  return {
    id: w.id, name: w.name, archetype: w.archetype, color: w.color, bio: w.bio,
    stats: {
      a: w.stats.power,     aL: "PWR",
      b: w.stats.technique, bL: "TEC",
      c: w.stats.speed,     cL: "SPD",
      d: w.stats.charisma,  dL: "CHR",
    },
    sigName: w.finisher.name, sigFlavour: w.finisher.flavour, sigEmoji: w.finisher.emoji,
  };
}

export function RosterSelectScreen({ sport, initialId, onCancel, onConfirm }: Props) {
  const cards: UnifiedCard[] = sport === "boxing"
    ? BOXERS.map(boxerToCard)
    : WRESTLERS.map(wrestlerToCard);

  const [selectedId, setSelectedId] = useState<string>(initialId ?? cards[0]?.id ?? "");
  const selected = cards.find(c => c.id === selectedId) ?? cards[0];

  const sportLabel = sport === "boxing" ? "BOXING" : "PRO WRESTLING";
  const sigLabel   = sport === "boxing" ? "Signature" : "Finisher";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={onCancel}
          className="text-sm text-white/70 hover:text-white"
          aria-label="Back"
        >
          ← Back
        </button>
        <div className="text-sm font-semibold tracking-widest">{sportLabel} ROSTER</div>
        <div className="w-12" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-3 flex flex-col gap-3">
        {/* Preview card */}
        {selected && (
          <motion.section
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 p-3"
            style={{ background: `linear-gradient(180deg, ${selected.color}33 0%, rgba(0,0,0,0) 70%)` }}
          >
            <div className="flex items-center gap-3">
              <SilhouettePreview color={selected.color} sport={sport} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/50">{selected.archetype}</div>
                <div className="text-xl font-bold leading-tight truncate">{selected.name}</div>
                <div className="text-xs text-white/70 mt-1">
                  <span className="font-semibold" style={{ color: selected.color }}>
                    {selected.sigEmoji} {sigLabel}: {selected.sigName}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-white/60 mt-2 leading-snug">{selected.bio}</p>
            <StatsBar s={selected.stats} accent={selected.color} />
          </motion.section>
        )}

        {/* Portrait grid */}
        <section className="grid grid-cols-3 gap-2">
          {cards.map(c => {
            const isSel = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`relative rounded-lg p-2 text-left border transition-colors ${
                  isSel
                    ? "border-white bg-white/10"
                    : "border-white/10 bg-zinc-900/50 hover:bg-zinc-800/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ background: c.color, boxShadow: `0 0 0 2px ${c.color}55` }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate">{c.name}</div>
                    <div className="text-[9px] uppercase tracking-wide text-white/50">{c.archetype}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Confirm */}
        <button
          onClick={() => selected && onConfirm(selected.id)}
          className="mt-1 py-3 rounded-lg font-bold text-base tracking-widest"
          style={{ background: selected?.color ?? "#fbbf24", color: "#0c0a09" }}
        >
          FIGHT
        </button>
      </main>
    </div>
  );
}

/** Recolored silhouette with a subtle idle bob — keeps the procedural promise. */
function SilhouettePreview({ color, sport }: { color: string; sport: SportTab }) {
  // Slight differences keep the preview readable as boxer vs wrestler.
  const headR  = sport === "wrestling" ? 12 : 10;
  const bodyW  = sport === "wrestling" ? 36 : 28;
  return (
    <motion.svg
      viewBox="0 0 80 100"
      width={88}
      height={110}
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      {/* Glow ring */}
      <ellipse cx="40" cy="92" rx="22" ry="4" fill={color} opacity="0.25" />
      {/* Head */}
      <circle cx="40" cy={20} r={headR} fill={color} />
      {/* Body */}
      <rect x={40 - bodyW / 2} y={20 + headR - 2} width={bodyW} height={42} rx={8} fill={color} opacity="0.92" />
      {/* Trunks accent */}
      <rect x={40 - bodyW / 2} y={20 + headR + 24} width={bodyW} height={10} fill="#0c0a09" opacity="0.65" />
      {/* Arms */}
      <rect x={40 - bodyW / 2 - 6} y={20 + headR + 2} width={6} height={26} rx={3} fill={color} opacity="0.85" />
      <rect x={40 + bodyW / 2}     y={20 + headR + 2} width={6} height={26} rx={3} fill={color} opacity="0.85" />
      {/* Legs */}
      <rect x={40 - 10} y={20 + headR + 38} width={6} height={26} rx={3} fill={color} opacity="0.85" />
      <rect x={40 + 4}  y={20 + headR + 38} width={6} height={26} rx={3} fill={color} opacity="0.85" />
    </motion.svg>
  );
}

function StatsBar({ s, accent }: { s: { a: number; b: number; c: number; d: number; aL: string; bL: string; cL: string; dL: string }; accent: string }) {
  const rows: Array<[string, number]> = [
    [s.aL, s.a], [s.bL, s.b], [s.cL, s.c], [s.dL, s.d],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
      {rows.map(([label, val]) => (
        <div key={label} className="flex items-center gap-2">
          <div className="text-[10px] font-bold w-8 text-white/60">{label}</div>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(val / 10) * 100}%`, background: accent }}
            />
          </div>
          <div className="text-[10px] tabular-nums w-5 text-right text-white/70">{val}</div>
        </div>
      ))}
    </div>
  );
}
