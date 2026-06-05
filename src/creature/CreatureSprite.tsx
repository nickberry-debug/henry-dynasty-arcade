// Creature Keeper — hand-crafted per-species sprites.
//
// Replaces the v1 generic body+spots renderer with a distinct silhouette
// per species line, stage-aware feature additions, type-themed accents,
// and a proper face. Every creature in the catalog gets its own art
// function below — Pokemon-style proportions: big head/eyes on babies,
// more imposing features on apex stages.
//
// All paths are pure SVG so they scale crisply and reuse one renderer.
// Variants (rare ~3% shiny rolls) swap to a gold accent and add a glow.

import type { Creature, CreatureType } from "./types";
import { TYPE_INFO } from "./types";
import { getSpecies } from "./catalog";

interface Props {
  creature: Creature;
  size?: number;
}

/** Per-creature deterministic randomness — used for tiny variations
 *  (head tilt, pupil offset) so two creatures of the same species don't
 *  look identical. */
function seeded(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
}

/** Eye pair — large for baby (stage 0), normal for teen+. Cute "pupil
 *  + highlight" combo gives every creature personality. */
function Eyes({ stage, dx = 0, dy = 0, spread = 16, size = 5 }: {
  stage: 0 | 1 | 2; dx?: number; dy?: number; spread?: number; size?: number;
}) {
  const s = stage === 0 ? size * 1.25 : stage === 2 ? size * 0.85 : size;
  return (
    <g>
      <circle cx={-spread + dx} cy={dy} r={s} fill="#fff" />
      <circle cx={ spread + dx} cy={dy} r={s} fill="#fff" />
      <circle cx={-spread + dx + s * 0.18} cy={dy + s * 0.18} r={s * 0.5} fill="#0a0a0a" />
      <circle cx={ spread + dx + s * 0.18} cy={dy + s * 0.18} r={s * 0.5} fill="#0a0a0a" />
      <circle cx={-spread + dx - s * 0.18} cy={dy - s * 0.18} r={s * 0.18} fill="#fff" />
      <circle cx={ spread + dx - s * 0.18} cy={dy - s * 0.18} r={s * 0.18} fill="#fff" />
    </g>
  );
}

/** Type-themed accent decorations layered on top of the body. */
function TypeAccent({ type, stage }: { type: CreatureType; stage: 0 | 1 | 2 }) {
  switch (type) {
    case "flame": return (
      <g>
        {/* Flame puff on the top of the head — bigger on apex. */}
        <path d={`M -10 ${-32 - stage * 4} Q -6 ${-42 - stage * 6} 0 ${-38 - stage * 5} Q 6 ${-42 - stage * 6} 10 ${-32 - stage * 4} Q 4 ${-30 - stage * 3} 0 ${-34 - stage * 4} Q -4 ${-30 - stage * 3} -10 ${-32 - stage * 4} Z`}
          fill="#fb923c" opacity="0.9" />
        <path d={`M -5 ${-34 - stage * 4} Q 0 ${-40 - stage * 5} 5 ${-34 - stage * 4} Q 0 ${-32 - stage * 3} -5 ${-34 - stage * 4} Z`}
          fill="#fde047" />
      </g>
    );
    case "tide": return (
      <g>
        {/* Water droplet crown. */}
        <path d="M 0 -36 Q -4 -32 -4 -28 Q -4 -24 0 -24 Q 4 -24 4 -28 Q 4 -32 0 -36 Z"
          fill="#7dd3fc" opacity="0.95" />
        {stage > 0 && (
          <>
            <circle cx={-18} cy={-22} r={2.5} fill="#7dd3fc" opacity="0.8" />
            <circle cx={ 18} cy={-22} r={2.5} fill="#7dd3fc" opacity="0.8" />
          </>
        )}
      </g>
    );
    case "stone": return (
      <g>
        {/* Rocky shards on the back. */}
        <polygon points={`-12,-26 -16,-32 -8,-30`} fill="#9a4a1a" stroke="#1a1a1a" strokeWidth="1" />
        <polygon points={`12,-26 16,-32 8,-30`} fill="#9a4a1a" stroke="#1a1a1a" strokeWidth="1" />
        {stage === 2 && <polygon points={`0,-32 -5,-40 5,-40`} fill="#b96528" stroke="#1a1a1a" strokeWidth="1" />}
      </g>
    );
    case "gale": return (
      <g>
        {/* Wisps trailing behind. */}
        <path d="M -28 -8 Q -34 -4 -30 4 Q -26 0 -28 -8 Z" fill="#a5f3fc" opacity="0.7" />
        <path d={`M 28 -10 Q ${34 + stage * 2} -6 ${30 + stage} 2 Q 26 -2 28 -10 Z`} fill="#a5f3fc" opacity="0.7" />
      </g>
    );
    case "spark": return (
      <g>
        {/* Lightning bolts. */}
        <polygon points={`-6,-30 -2,-22 -6,-22 0,-12 -2,-22 2,-22`} fill="#facc15" stroke="#1a1a1a" strokeWidth="0.8" />
        {stage > 0 && (
          <polygon points={`14,-26 18,-18 14,-18 20,-8 18,-18 22,-18`} fill="#facc15" stroke="#1a1a1a" strokeWidth="0.8" />
        )}
      </g>
    );
    case "shade": return (
      <g>
        {/* Smoky wisps. */}
        <path d="M -16 -28 Q -22 -36 -14 -38 Q -10 -34 -16 -28 Z" fill="#1f1f2a" opacity="0.7" />
        <path d={`M ${10 + stage} -28 Q ${20 + stage * 2} -36 ${14 + stage} -40 Q 8 -34 ${10 + stage} -28 Z`} fill="#1f1f2a" opacity="0.7" />
      </g>
    );
    case "bloom": return (
      <g>
        {/* Leaves on the back. */}
        <path d="M -10 -26 Q -16 -32 -22 -28 Q -16 -22 -10 -26 Z" fill="#22c55e" stroke="#0a3a1a" strokeWidth="0.8" />
        <path d="M 10 -26 Q 16 -32 22 -28 Q 16 -22 10 -26 Z" fill="#22c55e" stroke="#0a3a1a" strokeWidth="0.8" />
        {stage === 2 && <ellipse cx="0" cy="-30" rx="4" ry="6" fill="#ef4444" stroke="#0a3a1a" strokeWidth="0.6" />}
      </g>
    );
    case "light": return (
      <g>
        {/* Halo + small star sparkles. */}
        <ellipse cx="0" cy="-30" rx={12 + stage * 2} ry="3" fill="none" stroke="#fde047" strokeWidth="1.5" opacity="0.85" />
        <path d={`M -20 -16 l 2 2 l -2 2 l -2 -2 z`} fill="#fde047" opacity="0.95" />
        <path d={`M 22 -14 l 2 2 l -2 2 l -2 -2 z`} fill="#fde047" opacity="0.95" />
      </g>
    );
  }
}

/** Mouth — a tiny smile (or smirk on apex). */
function Mouth({ stage, y = 8 }: { stage: 0 | 1 | 2; y?: number }) {
  if (stage === 0) {
    return <path d={`M -4 ${y} Q 0 ${y + 3} 4 ${y}`} stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />;
  }
  if (stage === 1) {
    return <path d={`M -5 ${y} Q 0 ${y + 4} 5 ${y}`} stroke="#1a1a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />;
  }
  return (
    <g>
      <path d={`M -7 ${y - 1} Q 0 ${y + 5} 7 ${y - 1}`} stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* tiny fang for apex */}
      <path d={`M -3 ${y + 1} l 0 3 l 2 -1 z`} fill="#fff" stroke="#1a1a1a" strokeWidth="0.5" />
    </g>
  );
}

/** ── PER-SPECIES BODY ART ────────────────────────────────────────────
 *  Each function returns a layered SVG group for that species. Stage
 *  controls overall size + feature complexity. Color is the type tint.
 *  All paths assume the centered viewBox -50 -50 100 100. */

function pyrekitBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Fox-like quadruped. Apex has a big mane.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Tail */}
      <path d={`M ${24 + stage * 2} ${4} Q ${36 + stage * 4} ${-4} ${30 + stage * 3} ${-18} Q ${28 + stage * 2} ${-6} ${22 + stage * 2} ${0}`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Body */}
      <ellipse cx="0" cy="8" rx="26" ry="16" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Legs */}
      <rect x="-18" y="18" width="6" height="14" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <rect x="12" y="18" width="6" height="14" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Head */}
      <ellipse cx="-2" cy="-8" rx="18" ry="16" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Ears */}
      <polygon points={`-14,-22 -10,-30 -6,-20`} fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <polygon points={` 6,-22  10,-30  14,-20`} fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Mane (apex only) */}
      {stage === 2 && (
        <path d="M -22 -2 Q -28 -10 -22 -14 Q -16 -8 -22 -2 Z M 22 -2 Q 28 -10 22 -14 Q 16 -8 22 -2 Z"
          fill={color} stroke="#1a1a1a" strokeWidth="1.4" />
      )}
      {/* Snout */}
      <ellipse cx="-2" cy="0" rx="4" ry="3" fill="#1a1a1a" />
    </g>
  );
}

function emberbugBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Beetle. Apex gets wings.
  const s = 0.8 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {stage === 2 && (
        <g opacity="0.85">
          <ellipse cx="-22" cy="-2" rx="14" ry="8" fill={color} stroke="#1a1a1a" strokeWidth="1.2" transform="rotate(-20 -22 -2)" />
          <ellipse cx="22" cy="-2" rx="14" ry="8" fill={color} stroke="#1a1a1a" strokeWidth="1.2" transform="rotate(20 22 -2)" />
        </g>
      )}
      <ellipse cx="0" cy="2" rx="22" ry="26" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Shell line */}
      <line x1="0" y1="-22" x2="0" y2="26" stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Antennae */}
      <line x1="-8" y1="-22" x2="-14" y2="-32" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <line x1=" 8" y1="-22" x2="14" y2="-32" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="-14" cy="-32" r="2" fill={color} stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="14" cy="-32" r="2" fill={color} stroke="#1a1a1a" strokeWidth="1" />
      {/* Legs */}
      <line x1="-22" y1="2" x2="-30" y2="-4" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="-22" y1="8" x2="-30" y2="10" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="2" x2="30" y2="-4" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="8" x2="30" y2="10" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function tidelingBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Round mollusk blob with a shell on the back. Apex has a wider mouth.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="0" cy="6" rx={28 + stage * 2} ry={22 + stage * 2} fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Shell spiral */}
      <ellipse cx="0" cy="-2" rx="14" ry="12" fill="#fbbf24" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.85" />
      <path d="M 0 -10 Q 6 -6 6 -2 Q 4 4 -2 2 Q -6 -2 -2 -8 Q 2 -10 4 -6"
        fill="none" stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Tiny "foot" lip */}
      <ellipse cx="0" cy="28" rx={20 + stage} ry="4" fill={color} opacity="0.6" stroke="#1a1a1a" strokeWidth="1" />
    </g>
  );
}

function riverhoundBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Wolf-pup with fin tail. Apex more imposing.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Fin-tail */}
      <path d={`M ${22} ${4} Q ${36 + stage * 4} ${-4} ${36 + stage * 4} ${12} Q ${28 + stage * 2} ${10} ${22} ${8}`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.5" />
      <ellipse cx="0" cy="8" rx="26" ry="14" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      <rect x="-18" y="18" width="6" height="14" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <rect x="12" y="18" width="6" height="14" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <ellipse cx="-3" cy="-8" rx="17" ry="16" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Wolf ears */}
      <polygon points={`-16,-24 -12,-32 -8,-22`} fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <polygon points={` 4,-22   8,-32   12,-22`} fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Snout */}
      <ellipse cx="-3" cy="2" rx="5" ry="3.5" fill="#1a1a1a" />
    </g>
  );
}

function crackbeetleBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Boulder with legs.
  const s = 0.8 + stage * 0.12;
  return (
    <g transform={`scale(${s})`}>
      <path d={`M -28 8 Q -34 -10 -16 -22 Q 0 -28 16 -22 Q 34 -10 28 8 Q 28 22 0 22 Q -28 22 -28 8 Z`}
        fill={color} stroke="#1a1a1a" strokeWidth="2" />
      {/* Cracks */}
      <path d="M -10 -8 L -4 0 L -12 8" stroke="#1a1a1a" strokeWidth="1.4" fill="none" />
      <path d="M 12 -4 L 6 4 L 14 12" stroke="#1a1a1a" strokeWidth="1.4" fill="none" />
      {/* Stubby legs */}
      <rect x="-20" y="20" width="6" height="10" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <rect x="14" y="20" width="6" height="10" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
    </g>
  );
}

function pebblepupBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Stone dog made of round pebbles. Apex larger + plate armor.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="0" cy="10" rx="24" ry="14" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      <circle cx="-22" cy="-2" r="14" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Stone pebbles */}
      <circle cx="-14" cy="-12" r="4" fill={color} stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="6" cy="-8" r="5" fill={color} stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="14" cy="2" r="6" fill={color} stroke="#1a1a1a" strokeWidth="1" />
      {stage === 2 && <polygon points="-26,-10 -20,-18 -14,-10" fill="#a16207" stroke="#1a1a1a" strokeWidth="1" />}
      {/* Stubby legs */}
      <rect x="-16" y="20" width="6" height="10" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <rect x="10" y="20" width="6" height="10" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
    </g>
  );
}

function breezefluffBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Cloud with face. Apex puffs bigger + has lightning trim.
  const s = 0.85 + stage * 0.12;
  return (
    <g transform={`scale(${s})`}>
      <path d={`M -28 4 Q -34 -8 -20 -16 Q -14 -22 -4 -18 Q 6 -24 16 -18 Q 30 -16 30 0 Q 36 8 24 14 Q 14 18 0 16 Q -16 18 -26 14 Q -34 12 -28 4 Z`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.6" opacity="0.95" />
      {/* Little puffs */}
      <circle cx="-16" cy="-10" r="6" fill={color} opacity="0.95" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="10" cy="-14" r="7" fill={color} opacity="0.95" stroke="#1a1a1a" strokeWidth="1.2" />
      {stage === 2 && (
        <polygon points="-4,16 0,22 -2,22 2,30 -2,22 4,22" fill="#facc15" stroke="#1a1a1a" strokeWidth="0.8" />
      )}
    </g>
  );
}

function kitebirdBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Stylized bird with broad wings. Apex wings span wider.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Wings */}
      <path d={`M -30 -4 Q ${-42 - stage * 4} -16 ${-26 - stage * 2} -22 Q -16 -10 -10 -2 Z`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      <path d={`M 30 -4 Q ${42 + stage * 4} -16 ${26 + stage * 2} -22 Q 16 -10 10 -2 Z`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      {/* Body */}
      <ellipse cx="0" cy="4" rx="14" ry="22" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Tail feathers */}
      <polygon points="0,24 -6,32 0,28 6,32" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Beak */}
      <polygon points="0,-8 -4,-2 4,-2" fill="#fbbf24" stroke="#1a1a1a" strokeWidth="1.2" />
    </g>
  );
}

function buzzbugBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Stinger-tailed beetle.
  const s = 0.8 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="0" cy="2" rx="20" ry="22" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Stripes */}
      <ellipse cx="0" cy="-6" rx="20" ry="3" fill="#1a1a1a" opacity="0.75" />
      <ellipse cx="0" cy="6" rx="20" ry="3" fill="#1a1a1a" opacity="0.75" />
      {/* Stinger */}
      <polygon points="0,22 -3,28 3,28" fill="#fde047" stroke="#1a1a1a" strokeWidth="1.2" />
      {/* Antennae */}
      <line x1="-6" y1="-20" x2="-10" y2="-30" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <line x1=" 6" y1="-20" x2="10" y2="-30" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="-10" cy="-30" r="2.4" fill="#facc15" stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="10" cy="-30" r="2.4" fill="#facc15" stroke="#1a1a1a" strokeWidth="1" />
    </g>
  );
}

function voltkitBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Bristling kitten.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Spiky back */}
      <polygon points="-18,-20 -14,-30 -10,-20" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <polygon points=" -6,-22  -2,-32   2,-22" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <polygon points="  6,-22  10,-32  14,-22" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Body */}
      <ellipse cx="0" cy="8" rx="22" ry="14" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Head */}
      <ellipse cx="0" cy="-6" rx="16" ry="14" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Cat ears */}
      <polygon points="-14,-18 -10,-24 -6,-16" fill={color} stroke="#1a1a1a" strokeWidth="1.2" />
      <polygon points=" 6,-16   10,-24  14,-18" fill={color} stroke="#1a1a1a" strokeWidth="1.2" />
      {/* Legs */}
      <rect x="-16" y="18" width="5" height="12" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <rect x="11" y="18" width="5" height="12" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
    </g>
  );
}

function dimwispBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Floating ghostly wisp.
  const s = 0.85 + stage * 0.12;
  return (
    <g transform={`scale(${s})`}>
      <path d={`M -22 -10 Q -24 ${10 + stage * 4} -14 ${22 + stage * 2} Q -4 ${28 + stage * 4} 4 ${22 + stage * 2} Q 14 ${28 + stage * 4} 22 ${10 + stage * 2} Q 24 -8 14 -20 Q 0 -28 -14 -20 Q -24 -8 -22 -10 Z`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.6" opacity="0.92" />
      {/* Inner glow */}
      <ellipse cx="0" cy="0" rx="12" ry="14" fill="#fff" opacity="0.18" />
      {stage === 2 && (
        <>
          <circle cx="-18" cy="-22" r="3" fill={color} stroke="#1a1a1a" strokeWidth="1" />
          <circle cx="18" cy="-22" r="3" fill={color} stroke="#1a1a1a" strokeWidth="1" />
        </>
      )}
    </g>
  );
}

function mosslingBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Cat-shaped plant.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Body */}
      <ellipse cx="0" cy="8" rx="24" ry="14" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Head */}
      <ellipse cx="0" cy="-8" rx="17" ry="15" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Leaf ears */}
      <path d="M -14 -20 Q -22 -28 -16 -18 Q -10 -16 -14 -20 Z" fill="#16a34a" stroke="#0a3a1a" strokeWidth="1.2" />
      <path d="M 14 -20 Q 22 -28 16 -18 Q 10 -16 14 -20 Z" fill="#16a34a" stroke="#0a3a1a" strokeWidth="1.2" />
      {/* Tail */}
      <path d={`M ${22} ${0} Q ${32 + stage * 2} ${-10} ${30 + stage * 2} ${-22} Q ${22} -16 ${20} -4`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.4" />
      <rect x="-16" y="18" width="5" height="12" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <rect x="11" y="18" width="5" height="12" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
    </g>
  );
}

function glimmerlingBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Star-shaped sprite.
  const s = 0.85 + stage * 0.12;
  return (
    <g transform={`scale(${s})`}>
      <polygon points="0,-26 8,-8 26,-8 12,4 18,22 0,12 -18,22 -12,4 -26,-8 -8,-8"
        fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      <circle cx="0" cy="0" r="10" fill="#fff" opacity="0.35" />
      {stage === 2 && (
        <>
          <circle cx="-18" cy="-14" r="2" fill="#fff" />
          <circle cx="18" cy="-14" r="2" fill="#fff" />
          <circle cx="0" cy="14" r="2" fill="#fff" />
        </>
      )}
    </g>
  );
}

function crystalitBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Crystal cluster with face.
  const s = 0.85 + stage * 0.12;
  return (
    <g transform={`scale(${s})`}>
      <polygon points="-22,4 -12,-26 12,-26 22,4 12,28 -12,28"
        fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Inner facet */}
      <polygon points="-10,2 -4,-14 4,-14 10,2 4,14 -4,14"
        fill="#fff" opacity="0.30" stroke="#fff" strokeWidth="0.6" />
      {stage > 0 && (
        <>
          <polygon points="-26,-8 -32,-22 -22,-18" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
          <polygon points="26,-8 32,-22 22,-18" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
        </>
      )}
    </g>
  );
}

function snakeBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Coiled serpent — apex larger with hood / fangs.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Lower coil */}
      <ellipse cx="0" cy="18" rx={26 + stage * 2} ry="10" fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      {/* Mid coil */}
      <ellipse cx="-4" cy="6" rx={22 + stage} ry="8" fill={color} stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Rising body to head */}
      <path d={`M -8 0 Q -14 -10 -6 -18 Q 4 -24 12 -18 Q 18 -10 12 -2 Z`}
        fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      {/* Head */}
      <ellipse cx="6" cy="-18" rx="15" ry="13" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Apex hood */}
      {stage === 2 && (
        <path d="M -10 -16 Q -2 -32 18 -16 Q 8 -22 -10 -16 Z"
          fill={color} stroke="#1a1a1a" strokeWidth="1.3" opacity="0.85" />
      )}
      {/* Forked tongue */}
      <path d={`M 18 -14 L ${28 + stage * 2} -14 M 22 -14 L 26 -16 M 22 -14 L 26 -12`}
        stroke="#ef4444" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Fangs */}
      {stage > 0 && (
        <>
          <polygon points="2,-14 4,-10 6,-14" fill="#fff" stroke="#1a1a1a" strokeWidth="0.6" />
          <polygon points="10,-14 12,-10 14,-14" fill="#fff" stroke="#1a1a1a" strokeWidth="0.6" />
        </>
      )}
    </g>
  );
}

function golemBody(stage: 0 | 1 | 2, color: string): JSX.Element {
  // Blocky humanoid earth-golem. Apex gets a stone crown.
  const s = 0.85 + stage * 0.1;
  return (
    <g transform={`scale(${s})`}>
      {/* Legs */}
      <rect x="-14" y="14" width="8" height="16" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      <rect x="6" y="14" width="8" height="16" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.6" />
      {/* Torso (blocky) */}
      <path d="M -18 -8 L 18 -8 L 22 16 L -22 16 Z" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Chest plate */}
      <rect x="-10" y="-2" width="20" height="14" rx="1" fill="#1a1a1a" opacity="0.25" />
      {/* Arms */}
      <rect x="-28" y="-4" width="8" height="20" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.5" />
      <rect x="20" y="-4" width="8" height="20" rx="2" fill={color} stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Shoulder plates */}
      <path d="M -28 -10 Q -24 -16 -16 -10 Z" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      <path d="M 16 -10 Q 24 -16 28 -10 Z" fill={color} stroke="#1a1a1a" strokeWidth="1.3" />
      {/* Head */}
      <rect x="-12" y="-26" width="24" height="20" rx="3" fill={color} stroke="#1a1a1a" strokeWidth="1.8" />
      {/* Stone crown apex */}
      {stage === 2 && (
        <polygon points="-14,-26 -8,-34 -2,-26 2,-34 8,-26 14,-34" fill="#a16207" stroke="#1a1a1a" strokeWidth="1.2" />
      )}
      {/* Cracks */}
      <line x1="-6" y1="-8" x2="-4" y2="2" stroke="#1a1a1a" strokeWidth="1" opacity="0.7" />
      <line x1="8" y1="-4" x2="10" y2="8" stroke="#1a1a1a" strokeWidth="1" opacity="0.7" />
    </g>
  );
}

/** Dispatch table — speciesId -> body renderer. */
const BODY_RENDERERS: Record<string, (stage: 0 | 1 | 2, color: string) => JSX.Element> = {
  pyrekit:     pyrekitBody,
  emberbug:    emberbugBody,
  tideling:    tidelingBody,
  riverhound:  riverhoundBody,
  crackbeetle: crackbeetleBody,
  pebblepup:   pebblepupBody,
  breezefluff: breezefluffBody,
  kitebird:    kitebirdBody,
  buzzbug:     buzzbugBody,
  voltkit:     voltkitBody,
  dimwisp:     dimwispBody,
  mossling:    mosslingBody,
  glimmerling: glimmerlingBody,
  crystalit:   crystalitBody,
  // Wave 2 species — share base body shapes with the originals so they
  // look distinct from a circle. Type tint + class accents differentiate.
  scaldsprout: glimmerlingBody,
  kindlesnake: snakeBody,
  dewdrip:     tidelingBody,
  seapearl:    crystalitBody,
  dustkit:     pyrekitBody,
  clayling:    golemBody,
  staticfox:   pyrekitBody,
  hexpup:      riverhoundBody,
  petalbug:    emberbugBody,
  vinekit:     mosslingBody,
  sunbug:      buzzbugBody,
  eclipsekit:  voltkitBody,
};

/** Fallback: pick a body renderer by silhouette.body when speciesId is unknown. */
const BODY_BY_SILHOUETTE: Record<string, (stage: 0 | 1 | 2, color: string) => JSX.Element> = {
  blob:      tidelingBody,
  quadruped: pyrekitBody,
  bird:      kitebirdBody,
  crystal:   crystalitBody,
  sprite:    glimmerlingBody,
  bug:       emberbugBody,
  snake:     snakeBody,
  golem:     golemBody,
};

export function CreatureSprite({ creature, size = 96 }: Props) {
  const sp = getSpecies(creature.speciesId);
  if (!sp) return null;
  const type = TYPE_INFO[sp.type];
  const variant = creature.variant;
  const accent = variant ? "#fde047" : type.color;
  const rand = seeded(creature.id);

  // Slight head-tilt + eye offset so two of the same species feel distinct.
  const tilt = (rand() - 0.5) * 6;
  const eyeDx = (rand() - 0.5) * 1.2;

  const Body = BODY_RENDERERS[creature.speciesId] ?? BODY_BY_SILHOUETTE[sp.silhouette?.body ?? "blob"];
  // Stage-based eye Y: babies have eyes lower (bigger head, lower position).
  const eyeY = creature.stage === 0 ? -8 : creature.stage === 1 ? -10 : -12;
  // Mouth Y similar.
  const mouthY = creature.stage === 0 ? 4 : 2;

  // Personality-driven eye direction so a "playful" creature looks
  // bouncy + curious; a "stoic" one stares straight ahead, etc.
  const personalityShift =
    creature.personality === "playful" ? { dx: 1.5, dy: -1 } :
    creature.personality === "curious" ? { dx: 2.0, dy: 0 } :
    creature.personality === "shy"     ? { dx: -1.5, dy: 1.5 } :
    creature.personality === "bold"    ? { dx: 0, dy: -1.5 } :
    creature.personality === "loyal"   ? { dx: 0.5, dy: 0 } :
    { dx: 0, dy: 0 };

  // CSS idle bob animation — different speed per creature so a row of
  // them doesn't sync up. Stage 0 babies bob more (cuter); apex less.
  const bobDuration = 1.6 + rand() * 0.8;
  const bobAmp = creature.stage === 0 ? 2.4 : creature.stage === 1 ? 1.8 : 1.2;

  const bodyGradId = `creature-body-${creature.id.slice(-6)}`;
  const shadeGradId = `creature-shade-${creature.id.slice(-6)}`;
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden="true"
      style={{
        filter: variant
          ? `drop-shadow(0 0 16px ${accent}cc) drop-shadow(0 4px 8px rgba(0,0,0,0.35))`
          : `drop-shadow(0 2px 8px ${accent}66) drop-shadow(0 4px 8px rgba(0,0,0,0.35))`,
      }}>
      <defs>
        {/* Subtle painted highlight overlay — no blurry specular filter,
            just a clean radial gradient that gives each species a glossy
            top-left highlight. */}
        <radialGradient id={bodyGradId} cx="32%" cy="28%" r="72%">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.50" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {/* Bottom-right ambient occlusion — darkens the body opposite the
            highlight so the creature reads as a 3D form, not a flat sticker. */}
        <radialGradient id={shadeGradId} cx="68%" cy="78%" r="70%">
          <stop offset="0%"  stopColor="#000000" stopOpacity="0" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.38" />
        </radialGradient>
      </defs>
      {/* Cast shadow */}
      <ellipse cx="0" cy="34" rx="22" ry="4" fill="#000" opacity="0.32" />
      <g style={{
        animation: `creature-bob ${bobDuration}s ease-in-out infinite`,
        transformOrigin: "center",
        ["--bob-amp" as never]: `${bobAmp}px`,
      } as React.CSSProperties}>
        <g transform={`rotate(${tilt})`}>
          {Body
            ? Body(creature.stage, type.color)
            : <circle cx="0" cy="0" r="32" fill={type.color} stroke="#1a1a1a" strokeWidth="2" />}
          {/* Bottom shade — adds depth opposite the highlight. */}
          <ellipse cx="10" cy="14" rx="30" ry="22" fill={`url(#${shadeGradId})`}
            opacity="0.9" pointerEvents="none" />
          {/* Soft sheen overlay — painted highlight on top of any body. */}
          <ellipse cx="-8" cy="-12" rx="22" ry="16" fill={`url(#${bodyGradId})`}
            opacity="0.9" pointerEvents="none" />
          <TypeAccent type={sp.type} stage={creature.stage} />
          {/* Baby blush cheeks */}
          {creature.stage === 0 && (
            <>
              <ellipse cx={-16} cy={eyeY + 8} rx="4" ry="2.5" fill="#fca5a5" opacity="0.75" />
              <ellipse cx={16}  cy={eyeY + 8} rx="4" ry="2.5" fill="#fca5a5" opacity="0.75" />
            </>
          )}
          <Eyes stage={creature.stage}
            dx={eyeDx + personalityShift.dx}
            dy={eyeY + personalityShift.dy}
            spread={creature.stage === 0 ? 11 : 13}
            size={creature.stage === 0 ? 5 : 4} />
          <Mouth stage={creature.stage} y={mouthY} />
          {/* Variant sparkle overlay */}
          {variant && (
            <>
              <circle cx={-22} cy={-22} r="1.6" fill="#fde047" />
              <circle cx={24} cy={-18} r="1.4" fill="#fde047" />
              <circle cx={-18} cy={22} r="1.2" fill="#fde047" />
              {/* Extra sparkles for visible "shiny" feel */}
              <path d="M 18 -28 l 1.5 1.5 l -1.5 1.5 l -1.5 -1.5 z" fill="#fde047" />
              <path d="M -28 -8 l 1.2 1.2 l -1.2 1.2 l -1.2 -1.2 z" fill="#fde047" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
