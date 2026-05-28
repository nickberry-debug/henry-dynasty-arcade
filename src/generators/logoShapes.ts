// 30+ container/badge shape templates rendered as SVG fragments
import type { Team } from "../store/types";

export type ShapeId =
  | "roundel" | "doubleRing" | "shieldHeater" | "shieldKite" | "shieldOgival"
  | "diamond" | "pennant" | "ribbonScroll" | "hex" | "octagon"
  | "starburst" | "arched" | "deco" | "varsity" | "ballRound"
  | "ballCrossedBats" | "bannerArch" | "ringFlame" | "ringWreath" | "gear"
  | "compass" | "hexFrame" | "trianglePoint" | "tabbedRoundel" | "ringNotched"
  | "halfChevron" | "diagonalCut" | "vintageCircle" | "raisedDiamond" | "gemFacet";

export const SHAPE_IDS: ShapeId[] = [
  "roundel","doubleRing","shieldHeater","shieldKite","shieldOgival",
  "diamond","pennant","ribbonScroll","hex","octagon",
  "starburst","arched","deco","varsity","ballRound",
  "ballCrossedBats","bannerArch","ringFlame","ringWreath","gear",
  "compass","hexFrame","trianglePoint","tabbedRoundel","ringNotched",
  "halfChevron","diagonalCut","vintageCircle","raisedDiamond","gemFacet"
];

interface ShapeArgs {
  p: string; // primary
  s: string; // secondary
  a: string; // accent
}

export function renderShape(shape: ShapeId, c: ShapeArgs): string {
  const { p, s, a } = c;
  switch (shape) {
    case "roundel":
      return `<circle cx="64" cy="64" r="60" fill="${p}" stroke="${s}" stroke-width="3"/>
              <circle cx="64" cy="64" r="56" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.7"/>`;
    case "doubleRing":
      return `<circle cx="64" cy="64" r="60" fill="${p}"/>
              <circle cx="64" cy="64" r="60" fill="none" stroke="${s}" stroke-width="4"/>
              <circle cx="64" cy="64" r="54" fill="none" stroke="${a}" stroke-width="2"/>`;
    case "shieldHeater":
      return `<path d="M64 8 L116 22 L116 60 Q116 102 64 122 Q12 102 12 60 L12 22 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
              <path d="M64 12 L112 24 L112 60 Q112 98 64 116 Q16 98 16 60 L16 24 Z" fill="none" stroke="${a}" stroke-width="1.5"/>`;
    case "shieldKite":
      return `<path d="M64 6 L118 30 L100 110 L64 122 L28 110 L10 30 Z" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "shieldOgival":
      return `<path d="M64 6 Q112 12 116 30 L112 100 Q98 122 64 124 Q30 122 16 100 L12 30 Q16 12 64 6 Z" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "diamond":
      return `<polygon points="64,6 122,64 64,122 6,64" fill="${p}" stroke="${s}" stroke-width="3"/>
              <polygon points="64,14 114,64 64,114 14,64" fill="none" stroke="${a}" stroke-width="1.5"/>`;
    case "pennant":
      return `<path d="M8 30 L120 30 L100 64 L120 98 L8 98 Z" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "ribbonScroll":
      return `<path d="M4 40 Q4 28 16 28 H112 Q124 28 124 40 V88 Q124 100 112 100 H16 Q4 100 4 88 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
              <path d="M0 36 L16 28 L0 30 Z" fill="${s}"/><path d="M128 36 L112 28 L128 30 Z" fill="${s}"/>
              <path d="M0 92 L16 100 L0 96 Z" fill="${s}"/><path d="M128 92 L112 100 L128 96 Z" fill="${s}"/>`;
    case "hex":
      return `<polygon points="64,6 116,32 116,96 64,122 12,96 12,32" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "octagon":
      return `<polygon points="44,6 84,6 122,44 122,84 84,122 44,122 6,84 6,44" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "starburst":
      return `<polygon points="64,4 73,46 116,40 86,72 124,98 76,86 64,124 52,86 4,98 42,72 12,40 55,46" fill="${p}" stroke="${s}" stroke-width="2.5"/>`;
    case "arched":
      return `<path d="M64 6 Q116 6 120 56 V118 Q120 124 114 124 H14 Q8 124 8 118 V56 Q12 6 64 6 Z" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "deco":
      return `<rect x="14" y="14" width="100" height="100" fill="${p}" stroke="${s}" stroke-width="3"/>
              <rect x="22" y="22" width="84" height="84" fill="none" stroke="${a}" stroke-width="1.5"/>
              <line x1="14" y1="32" x2="114" y2="32" stroke="${a}" stroke-width="1"/>
              <line x1="14" y1="96" x2="114" y2="96" stroke="${a}" stroke-width="1"/>`;
    case "varsity":
      return `<rect x="6" y="36" width="116" height="56" rx="12" fill="${p}" stroke="${s}" stroke-width="3"/>
              <rect x="6" y="36" width="116" height="56" rx="12" fill="none" stroke="${a}" stroke-width="1.5"/>`;
    case "ballRound":
      return `<circle cx="64" cy="64" r="58" fill="${p}" stroke="${s}" stroke-width="2"/>
              <circle cx="64" cy="64" r="48" fill="#ffffff"/>
              <path d="M30 38 Q64 50 98 38" stroke="${s}" stroke-width="2" fill="none" stroke-dasharray="3 4"/>
              <path d="M30 90 Q64 78 98 90" stroke="${s}" stroke-width="2" fill="none" stroke-dasharray="3 4"/>`;
    case "ballCrossedBats":
      return `<g><line x1="20" y1="20" x2="108" y2="108" stroke="#d6a14a" stroke-width="11" stroke-linecap="round"/>
              <line x1="108" y1="20" x2="20" y2="108" stroke="#d6a14a" stroke-width="11" stroke-linecap="round"/></g>
              <circle cx="64" cy="64" r="34" fill="#ffffff" stroke="${p}" stroke-width="3"/>
              <path d="M40 50 Q64 56 88 50" stroke="${s}" stroke-width="1.5" fill="none" stroke-dasharray="2 3"/>
              <path d="M40 78 Q64 72 88 78" stroke="${s}" stroke-width="1.5" fill="none" stroke-dasharray="2 3"/>`;
    case "bannerArch":
      return `<path d="M14 30 Q64 6 114 30 L110 90 Q64 110 18 90 Z" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "ringFlame":
      return `<circle cx="64" cy="64" r="56" fill="${p}"/>
              <path d="M64 8 C 54 18 50 26 54 36 C 46 38 50 48 64 50 C 78 48 82 38 74 36 C 78 26 74 18 64 8 Z" fill="${s}"/>
              <circle cx="64" cy="64" r="56" fill="none" stroke="${s}" stroke-width="3"/>`;
    case "ringWreath":
      return `<circle cx="64" cy="64" r="56" fill="${p}" stroke="${s}" stroke-width="3"/>
              <path d="M16 70 Q24 50 40 56 Q34 70 16 70 Z" fill="${a}"/>
              <path d="M112 70 Q104 50 88 56 Q94 70 112 70 Z" fill="${a}"/>`;
    case "gear":
      return `<g fill="${p}" stroke="${s}" stroke-width="2">
                <circle cx="64" cy="64" r="48"/>
                ${Array.from({length:8}).map((_,i)=>`<rect x="60" y="4" width="8" height="14" transform="rotate(${i*45} 64 64)"/>`).join("")}
              </g>
              <circle cx="64" cy="64" r="32" fill="${a}" stroke="${s}" stroke-width="2"/>`;
    case "compass":
      return `<circle cx="64" cy="64" r="58" fill="${p}" stroke="${s}" stroke-width="3"/>
              <circle cx="64" cy="64" r="44" fill="none" stroke="${a}" stroke-width="1.5"/>
              <polygon points="64,18 70,62 64,58 58,62" fill="${a}"/>
              <polygon points="64,110 70,66 64,70 58,66" fill="${s}"/>`;
    case "hexFrame":
      return `<polygon points="32,18 96,18 122,64 96,110 32,110 6,64" fill="${p}" stroke="${s}" stroke-width="3"/>
              <polygon points="40,28 88,28 110,64 88,100 40,100 18,64" fill="none" stroke="${a}" stroke-width="1.5"/>`;
    case "trianglePoint":
      return `<polygon points="64,8 120,116 8,116" fill="${p}" stroke="${s}" stroke-width="3"/>`;
    case "tabbedRoundel":
      return `<circle cx="64" cy="64" r="56" fill="${p}" stroke="${s}" stroke-width="3"/>
              <rect x="50" y="2" width="28" height="14" fill="${s}"/>
              <rect x="50" y="112" width="28" height="14" fill="${s}"/>`;
    case "ringNotched":
      return `<circle cx="64" cy="64" r="58" fill="${p}"/>
              <circle cx="64" cy="64" r="50" fill="${a}" opacity="0.18"/>
              ${Array.from({length:12}).map((_,i)=>`<rect x="62" y="2" width="4" height="10" fill="${s}" transform="rotate(${i*30} 64 64)"/>`).join("")}
              <circle cx="64" cy="64" r="38" fill="${p}" stroke="${s}" stroke-width="2"/>`;
    case "halfChevron":
      return `<rect x="6" y="6" width="116" height="116" rx="14" fill="${p}"/>
              <path d="M6 6 L122 6 L60 64 Z" fill="${s}"/>
              <path d="M6 122 L122 122 L60 64 Z" fill="${a}" opacity="0.85"/>`;
    case "diagonalCut":
      return `<rect x="6" y="6" width="116" height="116" rx="10" fill="${p}"/>
              <polygon points="6,6 122,6 6,80" fill="${s}"/>
              <polygon points="122,6 122,122 6,80" fill="${a}" opacity="0.55"/>`;
    case "vintageCircle":
      return `<circle cx="64" cy="64" r="60" fill="${p}" stroke="${s}" stroke-width="4"/>
              <circle cx="64" cy="64" r="48" fill="none" stroke="${a}" stroke-width="1"/>
              ${Array.from({length:24}).map((_,i)=>`<line x1="64" y1="6" x2="64" y2="10" stroke="${a}" stroke-width="1" transform="rotate(${i*15} 64 64)"/>`).join("")}`;
    case "raisedDiamond":
      return `<polygon points="64,6 122,64 64,122 6,64" fill="${p}"/>
              <polygon points="64,18 110,64 64,110 18,64" fill="${s}"/>
              <polygon points="64,30 98,64 64,98 30,64" fill="${a}" opacity="0.5"/>`;
    case "gemFacet":
      return `<polygon points="64,4 124,40 124,90 64,124 4,90 4,40" fill="${p}" stroke="${s}" stroke-width="2"/>
              <polygon points="64,4 124,40 64,64 4,40" fill="${s}" opacity="0.55"/>
              <polygon points="64,124 124,90 64,64 4,90" fill="${a}" opacity="0.3"/>`;
    default:
      return `<circle cx="64" cy="64" r="60" fill="${p}" stroke="${s}" stroke-width="3"/>`;
  }
}

export function pickShapeForTeam(team: Pick<Team, "id" | "logoVariant">): ShapeId {
  return SHAPE_IDS[Math.abs(team.logoVariant) % SHAPE_IDS.length];
}
