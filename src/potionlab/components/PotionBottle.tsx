// SVG potion bottle. Color animates when filling; bubbles drift up
// when "active". Used in the cauldron result + the shelf grid.

import { motion } from "framer-motion";

interface Props {
  color: string;
  /** Display size in pixels (square). */
  size?: number;
  /** Filling animation level 0..1 (used while brewing). */
  fill?: number;
  /** Emit bubbles when true. */
  active?: boolean;
}

export function PotionBottle({ color, size = 80, fill = 1, active = false }: Props) {
  const liquidHeight = 28 * fill;
  const liquidY = 28 - liquidHeight + 18;
  return (
    <svg width={size} height={size} viewBox="0 0 32 48" aria-hidden="true" style={{ display: "block" }}>
      {/* Cork */}
      <rect x="13" y="3" width="6" height="5" rx="1" fill="#92400e" />
      <rect x="11" y="6" width="10" height="3" rx="1" fill="#a16207" />
      {/* Neck */}
      <rect x="14" y="9" width="4" height="6" fill="#a3a3a3" opacity="0.5" />
      {/* Bottle body */}
      <path d="M 9 17 Q 6 18 6 24 L 6 42 Q 6 46 10 46 L 22 46 Q 26 46 26 42 L 26 24 Q 26 18 23 17 L 9 17 Z" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      {/* Liquid clip */}
      <defs>
        <clipPath id={`p-clip-${color.replace(/[^a-z0-9]/gi, "")}`}>
          <path d="M 9 18 Q 6 19 6 24 L 6 42 Q 6 46 10 46 L 22 46 Q 26 46 26 42 L 26 24 Q 26 19 23 18 L 9 18 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#p-clip-${color.replace(/[^a-z0-9]/gi, "")})`}>
        <rect x="5" y={liquidY} width="22" height={liquidHeight + 12} fill={color} />
        {active && (
          <>
            <motion.circle cx="13" cy="42" r="1.5" fill="#fff" opacity={0.7}
              animate={{ cy: [42, 20], opacity: [0.7, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 0 }} />
            <motion.circle cx="18" cy="40" r="1.2" fill="#fff" opacity={0.6}
              animate={{ cy: [40, 19], opacity: [0.6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: 0.5 }} />
            <motion.circle cx="16" cy="44" r="1.0" fill="#fff" opacity={0.5}
              animate={{ cy: [44, 22], opacity: [0.5, 0] }}
              transition={{ duration: 2.0, repeat: Infinity, delay: 1.0 }} />
          </>
        )}
        {/* Highlight */}
        <rect x="9" y={liquidY + 1} width="2" height={Math.max(0, liquidHeight - 4)} fill="#fff" opacity="0.25" rx="1" />
      </g>
      {/* Label */}
      <rect x="9" y="32" width="14" height="6" rx="1" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
    </svg>
  );
}
