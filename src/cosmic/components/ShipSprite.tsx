// Cosmic Squad — bespoke ship sprites. Each of the 20 ship classes
// gets its own SVG silhouette so it actually looks like the IP it's
// modeled on (X-Wing has X-foils, TIE has two solar panels, Galaxy
// has saucer + nacelles, Bird of Prey has wings-down, etc.). All
// sprites render at unit size centered at (0,0); the parent <g>
// applies translate + rotate + scale.

import type { ShipClassId } from "../types";

export function ShipSprite({ classId, faction, primary, accent, scale = 1 }: {
  classId: ShipClassId;
  faction: "player" | "enemy";
  primary: string;
  accent: string;
  scale?: number;
}) {
  const stroke = faction === "enemy" ? "#fca5a5" : "#9be3ff";
  const props = { primary, accent, stroke };
  return (
    <g transform={`scale(${scale})`}>
      {render(classId, props)}
    </g>
  );
}

interface P { primary: string; accent: string; stroke: string }

function render(id: ShipClassId, p: P): JSX.Element {
  switch (id) {
    case "rebel_x_class":          return XWing(p);
    case "imperial_ty_fighter":    return TieFighter(p);
    case "rebel_a_class":          return AWing(p);
    case "imperial_destroyer":     return StarDestroyer(p);
    case "spartan_lancer":         return SpartanLancer(p);
    case "covenant_seraph":        return Seraph(p);
    case "covenant_phantom":       return Phantom(p);
    case "federation_explorer":    return Galaxy(p);
    case "klingon_raider":         return BirdOfPrey(p);
    case "romulan_warbird":        return Warbird(p);
    case "shuttle_orbiter":        return Shuttle(p);
    case "dragon_capsule":         return DragonCapsule(p);
    case "apollo_capsule":         return ApolloCapsule(p);
    case "viper_mark_seven":       return Viper(p);
    case "normandy":               return Normandy(p);
    case "rapier_two":             return Rapier(p);
    case "interceptor_drone":      return InterceptorDrone(p);
    case "minbari_flyer":          return MinbariFlyer(p);
    case "aegis_destroyer":        return AegisDestroyer(p);
    case "recon_scout":            return ReconScout(p);
  }
}

// ─── Sprites (face +x by default; 18-unit baseline canvas) ──

const SW = 0.6;  // common stroke width

function XWing({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* S-foils — open X */}
      <line x1={-3} y1={-4} x2={5} y2={-1.5} stroke={accent} strokeWidth={1} />
      <line x1={-3} y1={4} x2={5} y2={1.5} stroke={accent} strokeWidth={1} />
      <line x1={-3} y1={-4} x2={5} y2={1.5} stroke={accent} strokeWidth={1} />
      <line x1={-3} y1={4} x2={5} y2={-1.5} stroke={accent} strokeWidth={1} />
      {/* Wingtip cannons */}
      <circle cx={5} cy={-1.5} r={0.7} fill={accent} />
      <circle cx={5} cy={1.5} r={0.7} fill={accent} />
      {/* Fuselage */}
      <polygon points="9,0 -4,-2 -6,0 -4,2" fill={primary} />
      {/* Cockpit */}
      <circle cx={3} cy={0} r={1.2} fill={accent} opacity={0.7} />
    </g>
  );
}

function TieFighter({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Hex solar panels */}
      <polygon points="0,-7 -2.5,-4 -2.5,4 0,7 2.5,4 2.5,-4" fill={primary} transform="translate(-4,0)" />
      <polygon points="0,-7 -2.5,-4 -2.5,4 0,7 2.5,4 2.5,-4" fill={primary} transform="translate(4,0)" />
      {/* Connector struts */}
      <line x1={-4} y1={0} x2={4} y2={0} stroke={accent} strokeWidth={1.5} />
      {/* Spherical cockpit */}
      <circle cx={0} cy={0} r={2.2} fill="#1a1a1a" stroke={accent} strokeWidth={0.8} />
      <circle cx={1} cy={0} r={0.7} fill={accent} opacity={0.6} />
    </g>
  );
}

function AWing({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Triangular wedge */}
      <polygon points="8,0 -5,-3 -5,3" fill={primary} />
      {/* Side engine pods */}
      <rect x={-5} y={-4} width={5} height={1.5} fill={accent} />
      <rect x={-5} y={2.5} width={5} height={1.5} fill={accent} />
      {/* Cockpit */}
      <polygon points="4,0 0,-1 0,1" fill="#0a1020" opacity={0.85} />
    </g>
  );
}

function StarDestroyer({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Wedge */}
      <polygon points="14,0 -8,-7 -8,7" fill={primary} />
      {/* Tower */}
      <rect x={-6} y={-1.5} width={5} height={3} fill={accent} />
      {/* Engines */}
      <rect x={-9} y={-5} width={1.5} height={2} fill={accent} />
      <rect x={-9} y={-1} width={1.5} height={2} fill={accent} />
      <rect x={-9} y={3} width={1.5} height={2} fill={accent} />
      {/* Detail lines */}
      <line x1={4} y1={-3.5} x2={-7} y2={-5} stroke={accent} strokeWidth={0.4} />
      <line x1={4} y1={3.5} x2={-7} y2={5} stroke={accent} strokeWidth={0.4} />
    </g>
  );
}

function SpartanLancer({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      <polygon points="7,0 5,-3 -4,-3.5 -6,-1 -6,1 -4,3.5 5,3" fill={primary} />
      <rect x={-2} y={-1.2} width={4} height={2.4} fill={accent} opacity={0.8} />
      <rect x={-7} y={-1} width={1.5} height={2} fill={accent} />
      {/* MAC cannon */}
      <rect x={5} y={-0.5} width={4} height={1} fill={accent} />
    </g>
  );
}

function Seraph({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Crescent body */}
      <path d="M -5 -4 Q 8 0 -5 4 Q 2 0 -5 -4 Z" fill={primary} />
      <circle cx={2} cy={0} r={1.2} fill={accent} opacity={0.75} />
      {/* Energy glow */}
      <circle cx={2} cy={0} r={2.5} fill="none" stroke={accent} strokeWidth={0.3} opacity={0.5} />
    </g>
  );
}

function Phantom({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* V-shape dropship */}
      <polygon points="8,0 -3,-5 -6,-2 -6,2 -3,5" fill={primary} />
      <polygon points="3,0 -2,-3 -2,3" fill={accent} opacity={0.7} />
      <circle cx={5} cy={0} r={0.8} fill={accent} />
    </g>
  );
}

function Galaxy({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Saucer section */}
      <ellipse cx={3} cy={0} rx={7} ry={5} fill={primary} />
      {/* Secondary hull */}
      <ellipse cx={-3} cy={0} rx={4} ry={1.5} fill={primary} />
      {/* Two nacelles on pylons */}
      <rect x={-7} y={-5} width={6} height={1.2} fill={accent} />
      <rect x={-7} y={3.8} width={6} height={1.2} fill={accent} />
      <line x1={-3} y1={-1.5} x2={-3} y2={-4.5} stroke={accent} strokeWidth={0.6} />
      <line x1={-3} y1={1.5} x2={-3} y2={4.5} stroke={accent} strokeWidth={0.6} />
      {/* Bridge dot */}
      <circle cx={5} cy={0} r={0.6} fill={accent} />
    </g>
  );
}

function BirdOfPrey({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Wings-down attack posture */}
      <polygon points="-7,0 -5,-2 5,-1 8,0 5,1 -5,2" fill={primary} />
      {/* Down-swept wings */}
      <polygon points="0,1 4,4 -2,5 -3,2" fill={primary} />
      <polygon points="0,-1 4,-4 -2,-5 -3,-2" fill={primary} />
      {/* Head */}
      <polygon points="8,0 6,-1 6,1" fill={accent} />
    </g>
  );
}

function Warbird({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Talon-shape — twin hull */}
      <path d="M 8 0 L 2 -5 L -6 -3 L -4 0 L -6 3 L 2 5 Z" fill={primary} />
      {/* Center hollow */}
      <ellipse cx={0} cy={0} rx={3.5} ry={1.5} fill="#02060e" />
      {/* Singularity glow */}
      <circle cx={0} cy={0} r={1} fill={accent} opacity={0.8} />
    </g>
  );
}

function Shuttle({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Delta wing */}
      <polygon points="6,0 -5,-5 -5,5" fill={primary} />
      {/* Tail fin */}
      <polygon points="-5,0 -7,-2 -3,-2" fill={accent} />
      {/* Cargo doors */}
      <rect x={-2} y={-0.6} width={6} height={1.2} fill={accent} opacity={0.6} />
    </g>
  );
}

function DragonCapsule({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Cone */}
      <polygon points="5,0 -2,-3 -2,3" fill={primary} />
      {/* Cylinder */}
      <rect x={-5} y={-2.5} width={3} height={5} fill={primary} />
      {/* Solar panel */}
      <rect x={-5} y={-4} width={3} height={0.8} fill={accent} />
      <rect x={-5} y={3.2} width={3} height={0.8} fill={accent} />
    </g>
  );
}

function ApolloCapsule({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      <polygon points="4,0 -1,-2.5 -1,2.5" fill={primary} />
      <rect x={-4} y={-2} width={3} height={4} fill={primary} />
      <circle cx={2} cy={0} r={0.6} fill={accent} opacity={0.7} />
    </g>
  );
}

function Viper({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Sleek triangular jet */}
      <polygon points="7,0 -4,-3 -2,0 -4,3" fill={primary} />
      {/* Engines */}
      <rect x={-5} y={-2.5} width={1.5} height={1} fill={accent} />
      <rect x={-5} y={1.5} width={1.5} height={1} fill={accent} />
      {/* Cockpit */}
      <polygon points="3,0 0,-1 0,1" fill="#0a1020" opacity={0.85} />
    </g>
  );
}

function Normandy({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Long sleek frigate */}
      <polygon points="9,0 6,-1.5 -5,-2.5 -7,-1 -7,1 -5,2.5 6,1.5" fill={primary} />
      {/* Wing fins */}
      <polygon points="0,-2 3,-4 -2,-4" fill={accent} />
      <polygon points="0,2 3,4 -2,4" fill={accent} />
      {/* Engines */}
      <rect x={-7.5} y={-1} width={0.8} height={2} fill={accent} />
    </g>
  );
}

function Rapier({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Twin-engine fighter */}
      <polygon points="7,0 -3,-3 -5,-2 -5,2 -3,3" fill={primary} />
      <rect x={-5} y={-3.5} width={2} height={1.5} fill={accent} />
      <rect x={-5} y={2} width={2} height={1.5} fill={accent} />
      <polygon points="3,0 -1,-1 -1,1" fill={accent} opacity={0.7} />
    </g>
  );
}

function InterceptorDrone({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Tiny dart */}
      <polygon points="6,0 -3,-1.5 -4,0 -3,1.5" fill={primary} />
      {/* Sweep fins */}
      <polygon points="-1,-1 -4,-3 -4,-1" fill={accent} />
      <polygon points="-1,1 -4,3 -4,1" fill={accent} />
      <circle cx={2} cy={0} r={0.5} fill={accent} />
    </g>
  );
}

function MinbariFlyer({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Three-prong crystal */}
      <polygon points="8,0 -3,0 -5,-3" fill={primary} />
      <polygon points="8,0 -3,0 -5,3" fill={primary} />
      <polygon points="-3,0 -7,0 -5,-3" fill={accent} opacity={0.7} />
      <polygon points="-3,0 -7,0 -5,3" fill={accent} opacity={0.7} />
      <circle cx={2} cy={0} r={0.8} fill={accent} />
    </g>
  );
}

function AegisDestroyer({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Long boxy capital */}
      <rect x={-9} y={-3.5} width={18} height={7} fill={primary} rx={1} />
      {/* Bridge tower */}
      <rect x={-2} y={-5} width={4} height={1.5} fill={accent} />
      <rect x={-2} y={3.5} width={4} height={1.5} fill={accent} />
      {/* Forward gun */}
      <rect x={7} y={-0.6} width={3} height={1.2} fill={accent} />
      {/* Hull lines */}
      <line x1={-8} y1={-1} x2={8} y2={-1} stroke={accent} strokeWidth={0.3} opacity={0.7} />
      <line x1={-8} y1={1} x2={8} y2={1} stroke={accent} strokeWidth={0.3} opacity={0.7} />
    </g>
  );
}

function ReconScout({ primary, accent, stroke }: P) {
  return (
    <g stroke={stroke} strokeWidth={SW} strokeLinejoin="round">
      {/* Needle profile */}
      <polygon points="7,0 -4,-1 -5,0 -4,1" fill={primary} />
      {/* Sensor dish */}
      <circle cx={-2} cy={0} r={1.5} fill="none" stroke={accent} strokeWidth={0.6} />
      <circle cx={-2} cy={0} r={0.5} fill={accent} />
    </g>
  );
}
