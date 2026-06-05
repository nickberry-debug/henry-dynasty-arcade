// Per-weapon gear icon — small SVG glyph matching the weapon's kind.
// Used in the Builder shop list so each weapon reads at a glance.
//
// Kenney-inspired chunky line work — bold outlines, primary palette.

import type { Weapon } from "./types";

interface Props {
  weapon: Weapon;
  size?: number;
}

export function WeaponIcon({ weapon, size = 26 }: Props) {
  const c = weapon.color;
  const dark = "#0a0a0a";
  switch (weapon.kind) {
    case "cannon":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <rect x="-10" y="-3" width="16" height="6" rx="1" fill={c} stroke={dark} strokeWidth="1.2" />
          <rect x="6" y="-2" width="4" height="4" fill={c} stroke={dark} strokeWidth="1" />
          <circle cx="-8" cy="0" r="1.4" fill={dark} />
        </svg>
      );
    case "beam":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <rect x="-10" y="-2" width="14" height="4" fill={c} stroke={dark} strokeWidth="1" />
          <line x1="6" y1="0" x2="11" y2="0" stroke={c} strokeWidth="2.6" />
          <circle cx="-6" cy="0" r="1.6" fill="#fff" />
        </svg>
      );
    case "missile":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <polygon points="-10,0 6,-4 10,0 6,4" fill={c} stroke={dark} strokeWidth="1.2" />
          <polygon points="-10,0 -7,-3 -7,3" fill="#fbbf24" />
          <line x1="6" y1="-4" x2="3" y2="-6" stroke={dark} strokeWidth="1" />
          <line x1="6" y1="4" x2="3" y2="6" stroke={dark} strokeWidth="1" />
        </svg>
      );
    case "rail":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <rect x="-10" y="-4" width="2" height="8" fill={c} stroke={dark} strokeWidth="1" />
          <rect x="8" y="-4" width="2" height="8" fill={c} stroke={dark} strokeWidth="1" />
          <line x1="-9" y1="0" x2="9" y2="0" stroke={c} strokeWidth="3" />
          <circle cx="9" cy="0" r="2" fill="#fef3c7" stroke={dark} strokeWidth="0.8" />
        </svg>
      );
    case "cluster":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          {[-6, -2, 2, 6].map((y, i) => (
            <polygon key={i} points={`-10,${y} 6,${y-1.4} 10,${y} 6,${y+1.4}`} fill={c} stroke={dark} strokeWidth="0.7" />
          ))}
        </svg>
      );
    case "flamer":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <path d="M -10 -3 L 4 -5 L 10 0 L 4 5 L -10 3 Z" fill={c} stroke={dark} strokeWidth="1" />
          <path d="M 4 -5 L 9 -2 L 4 0 L 9 2 L 4 5" fill="#fbbf24" />
        </svg>
      );
    case "saw":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <circle cx="3" cy="0" r="7" fill={c} stroke={dark} strokeWidth="1.2" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const x = 3 + Math.cos(a) * 9;
            const y = Math.sin(a) * 9;
            return <line key={i} x1={3 + Math.cos(a) * 7} y1={Math.sin(a) * 7} x2={x} y2={y} stroke={dark} strokeWidth="1.4" />;
          })}
          <rect x="-12" y="-1.5" width="6" height="3" fill="#7c2d12" stroke={dark} strokeWidth="0.8" />
        </svg>
      );
    case "shock":
      return (
        <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true">
          <polygon points="-8,-8 -2,-2 -6,-2 0,8 -4,1 4,1 -2,8 4,-2 2,-2 8,-8" fill={c} stroke={dark} strokeWidth="1" />
        </svg>
      );
    default:
      return null;
  }
}
