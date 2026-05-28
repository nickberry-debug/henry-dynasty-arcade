// Companion COIN medallion. Three stages → three metals:
//   Stage 1 = Silver (cool, polished) — cute, slightly oversized silhouette
//   Stage 2 = Gold (warm, ceremonial) — balanced, "tougher" feel
//   Stage 3 = Onyx (dark, iridescent) — fierce, larger + intensified
//
// The CREATURE itself is now an engraved single-color SVG silhouette
// at the center of the coin (the eagle-on-a-quarter look). Per stage,
// the silhouette gains scale and a stronger tint so the line visibly
// progresses from "cute baby" → "tougher" → "fierce".

import { motion } from "framer-motion";
import { CREATURE_SILHOUETTES, FALLBACK_SILHOUETTE } from "../creatureArt";

interface CompanionSpriteProps {
  /** Companion line id (e.g. "pegasus", "fire_sprite"). Drives which
   *  engraved silhouette is rendered. */
  lineId?: string;
  /** Stage 1 / 2 / 3 — picks the metal tier AND the silhouette scale. */
  stage?: 1 | 2 | 3;
  /** Player-customisable accent color (engraving ring + halo). */
  accentColor: string;
  /** Legacy props — accepted but ignored so older callsites don't break. */
  emoji?: string;
  primaryColor?: string;
  secondaryColor?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

const METAL: Record<1 | 2 | 3, {
  rim:        string;
  face:       string;
  pool:       string;
  edgeHi:     string;
  edgeLo:     string;
  engraving:  string; // color the silhouette is filled with
  label:      string;
}> = {
  1: {
    rim:       "linear-gradient(135deg, #d6d6db, #f5f5f7, #b8b8c0)",
    face:      "radial-gradient(circle at 30% 25%, #f0f0f5, #b8b8c0 70%)",
    pool:      "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), #7a7a85 60%, #2a2a32 100%)",
    edgeHi:    "#ffffff",
    edgeLo:    "#5a5a64",
    engraving: "#3a3a44",
    label:     "Silver",
  },
  2: {
    rim:       "linear-gradient(135deg, #e8c460, #fff1b8, #b8881e)",
    face:      "radial-gradient(circle at 30% 25%, #ffe28a, #b8881e 70%)",
    pool:      "radial-gradient(circle at 35% 30%, rgba(255,228,138,0.7), #8b5a14 60%, #3d2810 100%)",
    edgeHi:    "#fff8d8",
    edgeLo:    "#7a5410",
    engraving: "#3d2810",
    label:     "Gold",
  },
  3: {
    rim:       "linear-gradient(135deg, #2a2030, #4a3a55, #1a1620)",
    face:      "radial-gradient(circle at 30% 25%, #6a4a7a, #2a1a35 70%)",
    pool:      "radial-gradient(circle at 35% 30%, rgba(180,130,220,0.55), #1a0a25 60%, #08020f 100%)",
    edgeHi:    "#a070c0",
    edgeLo:    "#15101a",
    engraving: "#e8d8f0",
    label:     "Onyx",
  },
};

export function CompanionSprite({
  lineId,
  stage = 1,
  accentColor,
  size = "md",
  animated = true,
}: CompanionSpriteProps) {
  const px = { sm: 64, md: 112, lg: 160, xl: 212 }[size];
  const metal = METAL[stage];
  const silhouette = (lineId && CREATURE_SILHOUETTES[lineId]) || FALLBACK_SILHOUETTE;

  // Per-stage silhouette scaling: cute (slightly smaller, soft) →
  // tougher (full size, sharper) → fierce (oversized, drop-shadowed).
  const silhouetteScale  = stage === 1 ? 0.78 : stage === 2 ? 0.92 : 1.04;
  const silhouetteFilter = stage === 1
    ? `drop-shadow(0 1px 0 ${metal.edgeLo})`
    : stage === 2
      ? `drop-shadow(0 2px 1px ${metal.edgeLo}) drop-shadow(0 0 3px ${accentColor}66)`
      : `drop-shadow(0 2px 2px ${metal.edgeLo}) drop-shadow(0 0 8px ${accentColor}88) saturate(1.2) contrast(1.1)`;

  const coin = (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: px,
        height: px,
        background: metal.rim,
        boxShadow: `
          0 10px 24px rgba(0,0,0,0.45),
          inset 0 2px 0 ${metal.edgeHi}88,
          inset 0 -2px 0 ${metal.edgeLo}88,
          0 0 0 2px ${metal.edgeLo}66
        `,
      }}
    >
      {/* Greek-key dotted edge ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: px * 0.04, boxShadow: `inset 0 0 0 1px ${metal.edgeLo}88, inset 0 0 0 2px ${metal.edgeHi}33` }}
      />
      {/* Inner coin face */}
      <div
        className="absolute rounded-full"
        style={{
          inset: px * 0.08,
          background: metal.face,
          boxShadow: `inset 0 4px 10px ${metal.edgeHi}55, inset 0 -4px 10px ${metal.edgeLo}77`,
        }}
      />
      {/* Player-tinted laurel engraving ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: px * 0.14, boxShadow: `inset 0 0 0 1.5px ${accentColor}aa, inset 0 0 0 2.5px ${metal.edgeLo}55` }}
      />
      {/* Recessed center pool */}
      <div
        className="absolute rounded-full"
        style={{
          inset: px * 0.20,
          background: metal.pool,
          boxShadow: `inset 0 6px 14px rgba(0,0,0,0.65)`,
        }}
      />
      {/* The engraved silhouette — single-color SVG, scaled by stage */}
      <svg
        viewBox="0 0 100 100"
        className="absolute pointer-events-none"
        style={{
          width: `${72 * silhouetteScale}%`,
          height: `${72 * silhouetteScale}%`,
          color: metal.engraving,
          filter: silhouetteFilter,
        }}
      >
        <path d={silhouette.d} fill="currentColor" />
        {silhouette.detail && <path d={silhouette.detail} fill={metal.edgeLo} opacity={0.7} />}
      </svg>
      {/* Stage badge — small star count in the bottom-right rim. */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: px * 0.04,
          bottom: px * 0.04,
          width: px * 0.22,
          height: px * 0.22,
          fontSize: px * 0.10,
          letterSpacing: "0.05em",
          color: metal.edgeHi,
          textShadow: `0 1px 1px ${metal.edgeLo}`,
        }}
      >
        {"★".repeat(stage)}
      </div>
    </div>
  );

  if (!animated) return coin;
  return (
    <motion.div
      initial={{ scale: 0.94 }}
      animate={{ scale: [0.97, 1.0, 0.97], rotate: [-0.6, 0.6, -0.6] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {coin}
    </motion.div>
  );
}
