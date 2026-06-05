// CrestGenerator — original procedural sports team crests.
//
// Real NFL/MLB/NHL/NBA/NCAA logos are trademarked. We generate ORIGINAL
// crests from a seeded combination of shield shape + mascot icon +
// team colors + banner text. Same team id always yields the same crest
// (deterministic), so the crest is stable across runs without needing
// to store the SVG.
//
// Used by: Baseball Dynasty, Football Dynasty, Hockey, Basketball,
// College Football, Sports Versus, Sports Hub.

import type { ReactElement } from "react";

export type ShieldShape = "round" | "shield" | "hexagon" | "banner" | "diamond" | "star";
export type MascotKind =
  | "lion" | "eagle" | "wolf" | "bear" | "hawk" | "tiger" | "shark" | "stag"
  | "thunder" | "flame" | "wave" | "mountain" | "comet" | "anchor" | "crown"
  | "lightning" | "sun" | "bull" | "ram" | "wing";

export interface CrestSpec {
  /** Stable team id, used as the seed. */
  id: string;
  /** 3-4 letter team abbreviation rendered on the banner. */
  abbr: string;
  /** Primary fill. */
  primary: string;
  /** Secondary fill (banner/accents). */
  secondary: string;
  /** Optional tertiary highlight. */
  tertiary?: string;
  shape?: ShieldShape;
  mascot?: MascotKind;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], n: number): T { return arr[n % arr.length]; }

const SHAPES: ShieldShape[] = ["round", "shield", "hexagon", "banner", "diamond", "star"];
const MASCOTS: MascotKind[] = [
  "lion", "eagle", "wolf", "bear", "hawk", "tiger", "shark", "stag",
  "thunder", "flame", "wave", "mountain", "comet", "anchor", "crown",
  "lightning", "sun", "bull", "ram", "wing",
];

/** Auto-fill spec fields from id when missing. */
export function resolveCrest(spec: CrestSpec): Required<CrestSpec> {
  const h = hash(spec.id);
  return {
    ...spec,
    tertiary: spec.tertiary ?? "#fef3c7",
    shape: spec.shape ?? pick(SHAPES, h),
    mascot: spec.mascot ?? pick(MASCOTS, h >> 4),
  };
}

// ── Shield outlines ────────────────────────────────────────────────────

function shieldPath(shape: ShieldShape): string {
  switch (shape) {
    case "round":
      return "M -40 0 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0 Z";
    case "shield":
      return "M -36 -40 L 36 -40 L 36 6 Q 36 30 0 44 Q -36 30 -36 6 Z";
    case "hexagon":
      return "M 0 -42 L 36 -22 L 36 22 L 0 42 L -36 22 L -36 -22 Z";
    case "banner":
      return "M -38 -36 L 38 -36 L 38 24 L 28 36 L 0 30 L -28 36 L -38 24 Z";
    case "diamond":
      return "M 0 -44 L 38 0 L 0 44 L -38 0 Z";
    case "star":
      return "M 0 -42 L 12 -14 L 42 -10 L 18 8 L 26 38 L 0 22 L -26 38 L -18 8 L -42 -10 L -12 -14 Z";
  }
}

// ── Mascot silhouettes (compact, original) ────────────────────────────

function Mascot({ kind, color }: { kind: MascotKind; color: string }): ReactElement {
  const stroke = "rgba(0,0,0,0.6)";
  switch (kind) {
    case "lion": return (
      <g>
        <circle cx="0" cy="-2" r="14" fill={color} stroke={stroke} strokeWidth="1.2" />
        <path d="M -16 -12 Q -22 -4 -16 4 M 16 -12 Q 22 -4 16 4 M -14 -16 Q -18 -22 -8 -20 M 14 -16 Q 18 -22 8 -20"
          stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M -5 -4 L -2 0 L -5 0 Z M 5 -4 L 2 0 L 5 0 Z" fill="#0a0a0a" />
        <path d="M -3 4 Q 0 8 3 4 L 1 6 L 0 8 L -1 6 Z" fill="#0a0a0a" />
      </g>
    );
    case "eagle": return (
      <g>
        <path d="M 0 -12 Q -6 -14 -8 -8 L -22 -2 L -16 -4 L -10 -2 L -4 4 L 0 8 L 4 4 L 10 -2 L 16 -4 L 22 -2 L 8 -8 Q 6 -14 0 -12 Z"
          fill={color} stroke={stroke} strokeWidth="1.2" />
        <polygon points="0,4 -2,12 2,12" fill="#fbbf24" />
        <circle cx="-3" cy="-7" r="1.5" fill="#fff" />
      </g>
    );
    case "wolf": return (
      <g>
        <path d="M -16 -8 L -12 -16 L -6 -10 L 6 -10 L 12 -16 L 16 -8 L 14 4 Q 0 12 -14 4 Z"
          fill={color} stroke={stroke} strokeWidth="1.2" />
        <path d="M -6 -2 L -3 2 L -6 2 Z M 6 -2 L 3 2 L 6 2 Z" fill="#0a0a0a" />
        <path d="M -2 6 L 0 10 L 2 6 Z" fill="#fff" />
      </g>
    );
    case "bear": return (
      <g>
        <circle cx="-12" cy="-12" r="6" fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="12" cy="-12" r="6" fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="0" cy="0" r="16" fill={color} stroke={stroke} strokeWidth="1.2" />
        <path d="M -5 -2 L -3 2 L -5 2 Z M 5 -2 L 3 2 L 5 2 Z" fill="#0a0a0a" />
        <ellipse cx="0" cy="6" rx="4" ry="3" fill="#0a0a0a" />
      </g>
    );
    case "hawk": return (
      <g>
        <path d="M 0 -14 Q -10 -10 -18 -2 L -22 8 L -10 4 L -2 6 L 6 4 L 14 0 L 22 8 L 18 -2 Q 10 -10 0 -14 Z"
          fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="-2" cy="-8" r="2" fill="#fff" />
        <circle cx="-2" cy="-8" r="1" fill="#0a0a0a" />
        <polygon points="0,-2 -4,6 4,6" fill="#fbbf24" />
      </g>
    );
    case "tiger": return (
      <g>
        <circle cx="0" cy="0" r="16" fill={color} stroke={stroke} strokeWidth="1.2" />
        <path d="M -10 -10 L -6 -6 M 10 -10 L 6 -6 M -14 0 L -8 2 M 14 0 L 8 2 M -6 10 L -3 6 M 6 10 L 3 6"
          stroke="#0a0a0a" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M -5 -2 L -2 1 L -5 1 Z M 5 -2 L 2 1 L 5 1 Z" fill="#0a0a0a" />
        <path d="M -2 4 Q 0 8 2 4 L 0 7 Z" fill="#0a0a0a" />
      </g>
    );
    case "shark": return (
      <g>
        <path d="M -22 0 Q -18 -6 -8 -8 L 8 -10 L 22 -2 L 8 4 L -8 6 Q -18 4 -22 0 Z"
          fill={color} stroke={stroke} strokeWidth="1.2" />
        <polygon points="-2,-10 -6,-18 2,-12" fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="8" cy="-4" r="1.5" fill="#0a0a0a" />
        <path d="M 18 -2 L 22 -2 L 20 1 Z" fill="#fff" />
      </g>
    );
    case "stag": return (
      <g>
        <path d="M -12 -22 L -18 -16 L -14 -14 M -8 -22 L -10 -16 M 12 -22 L 18 -16 L 14 -14 M 8 -22 L 10 -16"
          stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx="0" cy="-4" rx="14" ry="12" fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="-5" cy="-6" r="1.5" fill="#fff" />
        <circle cx="5" cy="-6" r="1.5" fill="#fff" />
        <ellipse cx="0" cy="4" rx="3" ry="2" fill="#0a0a0a" />
      </g>
    );
    case "thunder": case "lightning": return (
      <g>
        <polygon points="-4,-22 8,-4 -2,-2 6,18 -8,2 2,0" fill="#fde047" stroke={stroke} strokeWidth="1" />
      </g>
    );
    case "flame": return (
      <g>
        <path d="M 0 -22 Q 14 -6 8 8 Q 4 0 0 6 Q -4 0 -8 8 Q -14 -6 0 -22 Z" fill="#fb923c" stroke={stroke} strokeWidth="1" />
        <path d="M 0 -10 Q 6 -2 4 8 Q 0 2 -4 8 Q -6 -2 0 -10 Z" fill="#fde047" />
      </g>
    );
    case "wave": return (
      <g>
        <path d="M -22 4 Q -16 -4 -10 4 Q -4 -4 2 4 Q 8 -4 14 4 Q 20 -4 22 4 L 22 12 L -22 12 Z" fill={color} stroke={stroke} strokeWidth="1.2" />
        <path d="M -16 0 Q -8 -6 0 0 Q 8 -6 16 0" stroke="#fff" strokeWidth="1.5" fill="none" />
      </g>
    );
    case "mountain": return (
      <g>
        <polygon points="-22,12 -8,-18 0,-2 8,-22 22,12" fill={color} stroke={stroke} strokeWidth="1.2" />
        <polygon points="-12,-2 -8,-18 -4,-2 -8,-10" fill="#fff" />
        <polygon points="4,-8 8,-22 12,-8 8,-16" fill="#fff" />
      </g>
    );
    case "comet": return (
      <g>
        <path d="M 12 -10 L -20 14 L -10 8 L -16 16 L -4 10 Z" fill="#fde047" stroke={stroke} strokeWidth="1" />
        <circle cx="14" cy="-12" r="6" fill="#fb923c" />
        <circle cx="13" cy="-13" r="2" fill="#fff" />
      </g>
    );
    case "anchor": return (
      <g>
        <circle cx="0" cy="-18" r="4" fill="none" stroke={color} strokeWidth="2.5" />
        <line x1="0" y1="-14" x2="0" y2="14" stroke={color} strokeWidth="3" />
        <line x1="-8" y1="-8" x2="8" y2="-8" stroke={color} strokeWidth="3" />
        <path d="M -16 8 Q -8 18 0 14 Q 8 18 16 8" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
    case "crown": return (
      <g>
        <path d="M -22 8 L -16 -16 L -8 -4 L 0 -20 L 8 -4 L 16 -16 L 22 8 Z" fill="#fde047" stroke={stroke} strokeWidth="1.5" />
        <circle cx="0" cy="0" r="2" fill="#dc2626" />
        <circle cx="-12" cy="0" r="1.5" fill="#3b82f6" />
        <circle cx="12" cy="0" r="1.5" fill="#3b82f6" />
      </g>
    );
    case "sun": return (
      <g>
        <circle cx="0" cy="0" r="10" fill="#fde047" stroke={stroke} strokeWidth="1.2" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <line key={i} x1={Math.cos(a) * 14} y1={Math.sin(a) * 14} x2={Math.cos(a) * 20} y2={Math.sin(a) * 20} stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />;
        })}
      </g>
    );
    case "bull": return (
      <g>
        <path d="M -18 -16 Q -22 -10 -16 -6 M 18 -16 Q 22 -10 16 -6" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="0" cy="0" rx="16" ry="14" fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="-5" cy="-2" r="1.5" fill="#0a0a0a" />
        <circle cx="5" cy="-2" r="1.5" fill="#0a0a0a" />
        <ellipse cx="0" cy="6" rx="4" ry="2.5" fill="#0a0a0a" />
      </g>
    );
    case "ram": return (
      <g>
        <path d="M -16 -10 Q -22 0 -16 8 Q -20 4 -22 -2 M 16 -10 Q 22 0 16 8 Q 20 4 22 -2" stroke={color} strokeWidth="2.5" fill="none" />
        <ellipse cx="0" cy="-2" rx="12" ry="14" fill={color} stroke={stroke} strokeWidth="1.2" />
        <circle cx="-4" cy="-4" r="1.5" fill="#0a0a0a" />
        <circle cx="4" cy="-4" r="1.5" fill="#0a0a0a" />
      </g>
    );
    case "wing": return (
      <g>
        <path d="M -22 -10 Q -14 -16 -2 -12 L 0 4 L -2 -8 Q -10 -10 -14 -4 L -16 -8 Q -20 -4 -22 -10 Z" fill={color} stroke={stroke} strokeWidth="1.2" />
        <path d="M 22 -10 Q 14 -16 2 -12 L 0 4 L 2 -8 Q 10 -10 14 -4 L 16 -8 Q 20 -4 22 -10 Z" fill={color} stroke={stroke} strokeWidth="1.2" />
      </g>
    );
  }
}

// ── Main component ────────────────────────────────────────────────────

export function Crest({ spec, size = 96 }: { spec: CrestSpec; size?: number }) {
  const c = resolveCrest(spec);
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size}
      style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
      <defs>
        <radialGradient id={`crest-hl-${c.id}`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`crest-sh-${c.id}`} cx="65%" cy="80%" r="70%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.40" />
        </radialGradient>
      </defs>
      {/* Outer rim */}
      <path d={shieldPath(c.shape)} fill={c.secondary} stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
      {/* Inner shield */}
      <g transform="scale(0.88)">
        <path d={shieldPath(c.shape)} fill={c.primary} stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />
        <path d={shieldPath(c.shape)} fill={`url(#crest-hl-${c.id})`} />
        <path d={shieldPath(c.shape)} fill={`url(#crest-sh-${c.id})`} />
      </g>
      {/* Mascot */}
      <g transform="translate(0 -2)">
        <Mascot kind={c.mascot} color={c.tertiary} />
      </g>
      {/* Banner with abbr */}
      <g transform="translate(0 32)">
        <rect x="-32" y="-6" width="64" height="12" rx="2" fill={c.secondary} stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
        <text x="0" y="0" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="10"
          textAnchor="middle" dominantBaseline="central" fill={c.tertiary}
          style={{ letterSpacing: "0.12em" }}>
          {c.abbr.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

/** Build a CrestSpec from just a team id + name + colors. Shape and
 *  mascot are derived deterministically from the id. */
export function autoCrest(args: { id: string; abbr: string; primary: string; secondary: string }): CrestSpec {
  return args;
}
