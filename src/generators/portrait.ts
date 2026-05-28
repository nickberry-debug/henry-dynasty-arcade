// Studio-quality player portrait composer.
// Layered SVG: stadium silhouette BG → jersey shading → neck → head with 3-tone skin shading
// → hair with directional flow → facial features (multi-path eyes/nose/mouth) → facial hair texture
// → cap with brim shadow + perspective-warped initial → pose props → card frame.
import type { Player, Team } from "../store/types";
import { lighten, darken, mixColor, withAlpha } from "./colorUtils";

const SKIN_TONES = ["#f5d0b0","#ebbf9d","#dba884","#c89870","#b88560","#a8704a","#8f5a3a","#73442a","#5a3220","#3d2014"];
const HAIR_COLORS = ["#0d0d0d","#1f1612","#3a2410","#5a3a1c","#7c5a30","#a07a44","#c8a060","#d9b870","#9b9892","#cfcbc7"];
const EYE_COLORS = ["#3a2410","#4d2f1a","#3d6a4a","#27508c","#2a8aab","#7a5a2c"];

interface PortraitOpts {
  size?: number;
  pose?: "neutral" | "batting" | "pitching" | "catcher";
  starQuality?: boolean;
  rookie?: boolean;
  allStar?: boolean;
  /** Hide outer card frame (for inline use). */
  bare?: boolean;
}

export function portraitSVG(player: Player, team: Team | null, opts: PortraitOpts = {}): string {
  const size = opts.size ?? 128;
  const seed = player.portraitSeed;
  const app = player.appearance;
  const skinBase = SKIN_TONES[app.skinTone % SKIN_TONES.length];
  const skinHi = lighten(skinBase, 0.14);
  const skinSh = darken(skinBase, 0.15);
  const hairBase = HAIR_COLORS[app.hairColor % HAIR_COLORS.length];
  const hairHi = lighten(hairBase, 0.18);
  const hairSh = darken(hairBase, 0.3);
  const eyeColor = EYE_COLORS[app.eyeColor % EYE_COLORS.length];
  const tp = team?.primary ?? "#1a2233";
  const ts = team?.secondary ?? "#bd9b60";
  const ta = team?.accent ?? "#ffffff";
  const tpHi = lighten(tp, 0.15);
  const tpLo = darken(tp, 0.25);
  const initial = (team?.name || "X").charAt(0).toUpperCase();
  const isPitcher = player.isPitcher;
  const isCatcher = player.position === "C";
  const isVeteran = player.age >= 33;
  const isElder = player.age >= 38;
  const isYoung = player.age <= 23;
  const id = `p${seed}`;

  const hairStyle = app.hairStyle;
  const grayMix = isVeteran && (seed % 100) < (player.age >= 37 ? 75 : 55);
  const grayAmount = isElder ? 0.6 : 0.4;
  const finalHair = grayMix ? mixColor(hairBase, "#cccccc", grayAmount) : hairBase;
  const finalHairHi = grayMix ? mixColor(hairHi, "#eaeaea", grayAmount) : hairHi;
  const finalHairSh = grayMix ? mixColor(hairSh, "#9c9c9c", grayAmount) : hairSh;
  const isBald = hairStyle % 12 === 0;
  const isCleanFaced = isYoung && (seed % 3 !== 0);
  const facialHair = isCleanFaced ? 0 : app.facialHair;
  const beardGrayMix = grayMix && facialHair > 0;
  const finalBeard = beardGrayMix ? mixColor(finalHair, "#a8a8a8", 0.3) : finalHair;

  const star = opts.starQuality ?? player.overall >= 90;
  const aging = player.age >= 35;

  return `
<svg viewBox="0 0 128 160" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.25)}" role="img" aria-label="${player.name} portrait">
  <defs>
    <linearGradient id="${id}BG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tpHi}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${tp}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${tpLo}" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="${id}SPOT" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <linearGradient id="${id}SKIN" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${skinHi}"/>
      <stop offset="55%" stop-color="${skinBase}"/>
      <stop offset="100%" stop-color="${skinSh}"/>
    </linearGradient>
    <linearGradient id="${id}HAIR" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${finalHairHi}"/>
      <stop offset="55%" stop-color="${finalHair}"/>
      <stop offset="100%" stop-color="${finalHairSh}"/>
    </linearGradient>
    <linearGradient id="${id}JERS" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tpHi}"/>
      <stop offset="100%" stop-color="${tpLo}"/>
    </linearGradient>
    <linearGradient id="${id}CAP" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tpHi}"/>
      <stop offset="100%" stop-color="${tpLo}"/>
    </linearGradient>
    ${star ? `<radialGradient id="${id}AURA" cx="50%" cy="50%" r="55%">
      <stop offset="60%" stop-color="rgba(255,210,90,0)"/>
      <stop offset="92%" stop-color="rgba(255,210,90,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,210,90,0)"/>
    </radialGradient>` : ""}
    <filter id="${id}SH" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>
      <feOffset dx="0" dy="1.6"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="${id}BEARD" width="2" height="2" patternUnits="userSpaceOnUse">
      <rect width="2" height="2" fill="${finalBeard}"/>
      <circle cx="0.5" cy="0.5" r="0.5" fill="${darken(finalBeard, 0.25)}"/>
    </pattern>
    <clipPath id="${id}FACECLIP">
      ${faceClipPath(app.faceShape)}
    </clipPath>
  </defs>

  <!-- Star aura -->
  ${star ? `<rect width="128" height="160" fill="url(#${id}AURA)"/>` : ""}

  <!-- Background gradient + spotlight -->
  <rect width="128" height="160" fill="url(#${id}BG)"/>
  <rect width="128" height="160" fill="url(#${id}SPOT)"/>

  <!-- Stadium silhouette (parametric per team) -->
  ${stadiumSilhouette(seed, ts)}

  <!-- Jersey + shoulders with shading -->
  <g filter="url(#${id}SH)">
    <path d="M-4 160 Q-4 130 22 122 L106 122 Q132 130 132 160 Z" fill="url(#${id}JERS)" stroke="${darken(ts, 0.1)}" stroke-width="1.4"/>
    <!-- Collar -->
    <path d="M44 122 Q54 134 64 134 Q74 134 84 122 L80 124 Q72 132 64 132 Q56 132 48 124 Z" fill="${ts}"/>
    <!-- Jersey shading -->
    <path d="M-4 160 L-4 150 Q20 140 64 140 Q108 140 132 150 L132 160 Z" fill="rgba(0,0,0,0.18)" pointer-events="none"/>
    <!-- Shoulder seams -->
    <path d="M22 122 Q40 132 64 134 Q88 132 106 122" fill="none" stroke="${darken(ts, 0.05)}" stroke-width="1.4" opacity="0.65"/>
    <!-- Chest number -->
    <text x="64" y="154" text-anchor="middle" font-family="'Bebas Neue','Anton',sans-serif" font-size="14" fill="${ta}" stroke="${darken(ts, 0.2)}" stroke-width="0.6" paint-order="stroke" font-weight="700">${player.jerseyNumber}</text>
  </g>

  <!-- Neck (with shadow under jaw) -->
  <path d="M54 100 L54 122 L74 122 L74 100 Z" fill="url(#${id}SKIN)"/>
  <path d="M54 116 Q64 122 74 116 L74 122 L54 122 Z" fill="rgba(0,0,0,0.22)"/>

  <!-- Head -->
  <g filter="url(#${id}SH)">
    ${renderHeadShaded(app.faceShape, id)}
  </g>
  <!-- Ears -->
  <ellipse cx="35" cy="76" rx="4" ry="6" fill="url(#${id}SKIN)" stroke="${skinSh}" stroke-width="0.5"/>
  <ellipse cx="93" cy="76" rx="4" ry="6" fill="url(#${id}SKIN)" stroke="${skinSh}" stroke-width="0.5"/>

  <!-- Hair back layer -->
  ${!isBald ? renderHairBack(hairStyle, `url(#${id}HAIR)`, finalHairSh) : ""}

  <!-- Face shading inside clip -->
  <g clip-path="url(#${id}FACECLIP)">
    <!-- Cheekbone highlights -->
    <ellipse cx="46" cy="78" rx="6" ry="3" fill="${skinHi}" opacity="0.45"/>
    <ellipse cx="82" cy="78" rx="6" ry="3" fill="${skinHi}" opacity="0.45"/>
    <!-- Jawline shadow -->
    <path d="M38 86 Q44 102 64 106 Q84 102 90 86 L90 100 Q72 110 64 110 Q56 110 38 100 Z" fill="${skinSh}" opacity="0.35"/>
    <!-- Brow ridge shadow -->
    <path d="M40 64 Q44 70 64 70 Q84 70 88 64 L88 68 Q72 74 64 74 Q56 74 40 68 Z" fill="${skinSh}" opacity="0.32"/>
    <!-- Nose bridge shadow -->
    <path d="M60 72 Q62 86 60 92 L66 92 Q64 84 64 72 Z" fill="${skinSh}" opacity="0.22"/>
    <!-- Aging detail -->
    ${aging ? `<path d="M40 78 L46 80 M40 80 L46 82" stroke="${darken(skinBase, 0.3)}" stroke-width="0.5" opacity="0.5"/>
               <path d="M82 78 L88 80 M82 80 L88 82" stroke="${darken(skinBase, 0.3)}" stroke-width="0.5" opacity="0.5"/>` : ""}
  </g>

  <!-- Eyebrows -->
  ${renderEyebrows(app.brow, finalHairSh)}
  <!-- Eyes (multi-path) -->
  ${renderEyes(app.eyeShape, eyeColor, app.eyeBlack, finalHairSh)}
  <!-- Nose -->
  ${renderNose(app.nose, skinSh, skinHi)}
  <!-- Mouth (top + bottom lip distinction) -->
  ${renderMouth(app.mouth)}
  <!-- Facial hair (stipple texture) -->
  ${facialHair > 0 ? renderFacialHair(facialHair, id) : ""}
  <!-- Glasses -->
  ${app.glasses ? renderGlasses() : ""}

  <!-- Hair front layer (over forehead, under cap) -->
  ${!isBald ? renderHairFront(hairStyle, `url(#${id}HAIR)`) : ""}

  <!-- Cap -->
  ${renderCap(app.brimStyle, app.capTilt, id, ts, ta, initial)}

  <!-- Chain -->
  ${app.chain ? `<path d="M54 122 Q64 134 74 122" stroke="#ffd54a" stroke-width="1.5" fill="none"/><circle cx="64" cy="130" r="2.4" fill="#ffd54a" stroke="#a78230" stroke-width="0.5"/>` : ""}

  <!-- Pose props -->
  ${isPitcher && opts.pose !== "neutral" ? renderGlove(tp, ts) : ""}
  ${!isPitcher && opts.pose === "batting" ? renderBat(ts) : ""}
  ${isCatcher ? renderCatcherMask(tp, ts) : ""}

  <!-- Position chip (top-right corner) -->
  ${!opts.bare ? `<g transform="translate(102,8)">
    <rect x="0" y="0" width="22" height="14" rx="3" fill="${darken(tp, 0.25)}" stroke="${ts}" stroke-width="0.8"/>
    <text x="11" y="10.5" text-anchor="middle" font-family="'Oswald','Bebas Neue',sans-serif" font-size="9" font-weight="700" fill="${ta}">${player.position}</text>
  </g>` : ""}

  <!-- Overall chip (top-left) -->
  ${!opts.bare ? `<g transform="translate(4,8)">
    <rect x="0" y="0" width="24" height="14" rx="3" fill="${ovrChipBg(player.overall)}" stroke="rgba(0,0,0,0.4)" stroke-width="0.6"/>
    <text x="12" y="11" text-anchor="middle" font-family="'Bebas Neue','Anton',sans-serif" font-size="10" font-weight="800" fill="#0a0d13">${player.overall}</text>
  </g>` : ""}

  <!-- Rookie/All-Star badges -->
  ${opts.rookie ? `<g transform="translate(4,142)"><rect width="24" height="12" rx="3" fill="#2dd4bf"/><text x="12" y="9.5" text-anchor="middle" font-family="'Oswald',sans-serif" font-size="8" font-weight="800" fill="#062925">RK</text></g>` : ""}
  ${opts.allStar ? `<g transform="translate(100,142)"><path d="M12 0 L14 7 L22 7 L16 12 L18 20 L12 15 L6 20 L8 12 L2 7 L10 7 Z" fill="#fde68a" stroke="#a16207" stroke-width="0.6"/></g>` : ""}

  <!-- Card frame -->
  ${!opts.bare ? `<rect x="2" y="2" width="124" height="156" rx="7" fill="none" stroke="url(#${id}JERS)" stroke-width="2.2"/>
                   <rect x="3.5" y="3.5" width="121" height="153" rx="6" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>` : ""}
</svg>`;
}

function ovrChipBg(ovr: number): string {
  if (ovr >= 90) return "#fde68a";
  if (ovr >= 80) return "#cbd5e1";
  if (ovr >= 70) return "#fbbf24";
  return "#94a3b8";
}

function faceClipPath(faceShape: number): string {
  const f = faceShape % 5;
  switch (f) {
    case 0: return `<ellipse cx="64" cy="76" rx="26" ry="32"/>`;
    case 1: return `<path d="M38 60 Q40 44 64 44 Q88 44 90 60 L88 92 Q80 108 64 108 Q48 108 40 92 Z"/>`;
    case 2: return `<path d="M40 64 Q44 44 64 44 Q84 44 88 64 L86 92 Q76 106 64 106 Q52 106 42 92 Z"/>`;
    case 3: return `<ellipse cx="64" cy="78" rx="24" ry="34"/>`;
    default: return `<path d="M40 56 Q44 42 64 42 Q84 42 88 56 L88 96 Q72 110 64 110 Q56 110 40 96 Z"/>`;
  }
}

function renderHeadShaded(faceShape: number, id: string): string {
  const f = faceShape % 5;
  const fill = `url(#${id}SKIN)`;
  switch (f) {
    case 0: return `<ellipse cx="64" cy="76" rx="26" ry="32" fill="${fill}"/>`;
    case 1: return `<path d="M38 60 Q40 44 64 44 Q88 44 90 60 L88 92 Q80 108 64 108 Q48 108 40 92 Z" fill="${fill}"/>`;
    case 2: return `<path d="M40 64 Q44 44 64 44 Q84 44 88 64 L86 92 Q76 106 64 106 Q52 106 42 92 Z" fill="${fill}"/>`;
    case 3: return `<ellipse cx="64" cy="78" rx="24" ry="34" fill="${fill}"/>`;
    default: return `<path d="M40 56 Q44 42 64 42 Q84 42 88 56 L88 96 Q72 110 64 110 Q56 110 40 96 Z" fill="${fill}"/>`;
  }
}

function renderHairBack(style: number, hairFill: string, sh: string): string {
  const s = style % 20;
  const stroke = `stroke="${sh}" stroke-width="0.4"`;
  if (s === 0) return "";
  if (s === 1) return `<path d="M38 60 Q44 38 64 38 Q84 38 90 60 L90 70 Q78 56 64 56 Q50 56 38 70 Z" fill="${hairFill}" ${stroke}/>`;
  if (s === 2) return `<path d="M36 58 Q44 32 64 34 Q84 32 92 58 L92 78 Q92 60 64 60 Q36 60 36 78 Z" fill="${hairFill}" ${stroke}/>`;
  if (s === 3) return `<path d="M30 84 Q26 50 60 38 Q98 32 96 70 L96 88 L88 70 Q72 58 56 62 L42 78 Z" fill="${hairFill}" ${stroke}/>`;
  if (s === 4) return `<path d="M34 68 Q34 40 64 38 Q94 40 94 68 L92 78 Q80 64 64 64 Q48 64 36 78 Z" fill="${hairFill}" ${stroke}/>`;
  if (s === 5) return `<circle cx="64" cy="40" r="11" fill="${hairFill}" ${stroke}/><path d="M40 60 Q44 36 64 34 Q84 36 88 60" fill="${hairFill}" ${stroke}/>`;
  if (s === 6) return `<path d="M28 110 Q26 50 56 36 Q98 30 100 70 L98 110 L88 78 Q72 60 56 64 L40 92 Z" fill="${hairFill}" ${stroke}/>`;
  if (s === 7) return `<g fill="${hairFill}" ${stroke}>${Array.from({length:10}).map((_,i)=>`<rect x="${36 + i*6}" y="38" width="3" height="22" rx="2"/>`).join("")}</g>`;
  if (s === 8) return `<path d="M40 60 Q44 36 64 36 Q84 36 88 60 Z" fill="${hairFill}" ${stroke}/><path d="M48 32 L52 50 M58 30 L60 50 M68 30 L70 50 M76 32 L78 50" stroke="${hairFill}" stroke-width="3" fill="none"/>`;
  if (s === 9) return `<path d="M40 56 Q44 28 64 22 Q84 28 88 56 L86 58 L74 28 L66 24 L60 28 L48 56 Z" fill="${hairFill}" ${stroke}/>`;
  if (s === 10) return `<path d="M38 58 Q42 36 64 38 Q86 36 90 58" fill="${hairFill}" ${stroke}/><path d="M30 100 L40 80 L36 100 M88 80 L98 100 L92 100" fill="${hairFill}" ${stroke}/>`;
  if (s === 11) return `<path d="M38 62 Q44 44 64 42 Q84 44 90 62" fill="${hairFill}" ${stroke}/>`;
  return `<path d="M38 60 Q44 36 64 36 Q84 36 90 60 L90 72 Q78 58 64 58 Q50 58 38 72 Z" fill="${hairFill}" ${stroke}/>`;
}

// Front hair: a layer that adds directional flow over the forehead, peeking under cap.
function renderHairFront(style: number, hairFill: string): string {
  const s = style % 20;
  if (s === 0 || s === 1) return "";
  if (s === 3) return `<path d="M44 56 Q54 50 62 56 Q68 50 78 56 L82 60 Q72 58 64 60 Q56 58 46 60 Z" fill="${hairFill}" opacity="0.95"/>`;
  if (s === 4) return `<path d="M42 56 Q60 48 86 56 L84 60 Q60 56 44 60 Z" fill="${hairFill}" opacity="0.92"/>`;
  if (s === 6) return `<path d="M40 56 Q50 50 60 58 Q70 50 84 56 L84 60 Q60 60 42 60 Z" fill="${hairFill}" opacity="0.9"/>`;
  return `<path d="M44 58 Q52 54 62 58 Q72 54 84 58 L82 60 Q60 60 46 60 Z" fill="${hairFill}" opacity="0.85"/>`;
}

function renderEyebrows(style: number, color: string): string {
  const s = style % 4;
  if (s === 0) return `<path d="M44 67 L58 64 M70 64 L84 67" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  if (s === 1) return `<path d="M44 68 Q50 60 58 66 M70 66 Q78 60 84 68" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (s === 2) return `<rect x="44" y="64" width="14" height="3" rx="2" fill="${color}"/><rect x="70" y="64" width="14" height="3" rx="2" fill="${color}"/>`;
  return `<path d="M44 66 L60 64 L58 68 M84 66 L68 64 L70 68" stroke="${color}" stroke-width="2.5" fill="${color}"/>`;
}

function renderEyes(style: number, color: string, eyeBlack: boolean, browColor: string): string {
  const s = style % 4;
  const eb = eyeBlack ? `<rect x="44" y="78" width="14" height="3" fill="#1c1c1c" rx="1"/><rect x="70" y="78" width="14" height="3" fill="#1c1c1c" rx="1"/>` : "";
  // Each eye: sclera + iris + pupil + highlight + eyelid shadow
  const eye = (cx: number) => {
    const lidShadow = `<path d="M${cx-4} 73 Q${cx} 71 ${cx+4} 73" stroke="${browColor}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
    if (s === 0) return `${lidShadow}
      <ellipse cx="${cx}" cy="74" rx="3.4" ry="2.6" fill="#fff"/>
      <circle cx="${cx}" cy="74" r="2.1" fill="${color}"/>
      <circle cx="${cx}" cy="74" r="1.1" fill="#0a0a0a"/>
      <circle cx="${cx-0.7}" cy="73.2" r="0.5" fill="#fff"/>`;
    if (s === 1) return `${lidShadow}
      <path d="M${cx-4} 74 Q${cx} 70 ${cx+4} 74 Q${cx} 76 ${cx-4} 74" fill="#fff"/>
      <ellipse cx="${cx}" cy="74" rx="1.5" ry="1.6" fill="${color}"/>
      <circle cx="${cx}" cy="74" r="0.8" fill="#0a0a0a"/>`;
    if (s === 2) return `${lidShadow}
      <circle cx="${cx}" cy="74" r="2.8" fill="#fff"/>
      <circle cx="${cx}" cy="74" r="1.7" fill="${color}"/>
      <circle cx="${cx}" cy="74" r="0.9" fill="#0a0a0a"/>
      <circle cx="${cx-0.6}" cy="73.2" r="0.5" fill="#fff"/>`;
    return `${lidShadow}
      <ellipse cx="${cx}" cy="74" rx="2.7" ry="3.1" fill="#fff"/>
      <circle cx="${cx}" cy="74" r="1.8" fill="${color}"/>
      <circle cx="${cx}" cy="74" r="0.9" fill="#0a0a0a"/>`;
  };
  return eye(52) + eye(76) + eb;
}

function renderNose(style: number, sh: string, hi: string): string {
  const s = style % 4;
  const shadow = withAlpha(sh, 0.55);
  if (s === 0) return `<path d="M64 78 L60 88 L68 88 Z" fill="${shadow}"/>
                       <path d="M62 80 L63 86" stroke="${hi}" stroke-width="0.5" opacity="0.6"/>`;
  if (s === 1) return `<path d="M62 80 Q64 90 66 80" stroke="${shadow}" stroke-width="1.4" fill="none"/>
                       <circle cx="62" cy="89" r="0.6" fill="${shadow}"/><circle cx="66" cy="89" r="0.6" fill="${shadow}"/>`;
  if (s === 2) return `<path d="M62 78 L62 88 Q64 90 66 88 L66 78" stroke="${shadow}" stroke-width="0.8" fill="none"/>
                       <path d="M62 80 L62 86" stroke="${hi}" stroke-width="0.4" opacity="0.5"/>`;
  return `<path d="M60 80 Q64 90 68 80" stroke="${shadow}" stroke-width="1.4" fill="none"/>
          <circle cx="61" cy="88" r="0.5" fill="${shadow}"/><circle cx="67" cy="88" r="0.5" fill="${shadow}"/>`;
}

function renderMouth(style: number): string {
  const s = style % 3;
  // Top + bottom lip distinction
  if (s === 0) return `<path d="M58 96 Q64 99 70 96" stroke="#5a2222" stroke-width="1.5" fill="none"/>
                       <path d="M58 96 Q64 97 70 96 Q64 99 58 96 Z" fill="#7a3030" opacity="0.6"/>`;
  if (s === 1) return `<path d="M58 96 Q64 100 70 96" stroke="#5a2222" stroke-width="1.5" fill="none"/>
                       <path d="M58 96 Q64 98 70 96 Q64 100 58 96 Z" fill="#8a3030" opacity="0.55"/>`;
  return `<line x1="58" y1="96" x2="70" y2="96" stroke="#5a2222" stroke-width="1.8"/>
          <line x1="58" y1="97" x2="70" y2="97" stroke="#8a3030" stroke-width="0.6" opacity="0.5"/>`;
}

function renderFacialHair(style: number, id: string): string {
  const s = style % 12;
  const pattern = `url(#${id}BEARD)`;
  if (s === 0) return "";
  if (s === 1) return `<path d="M48 92 Q64 104 80 92 Q72 108 56 108 Q48 100 48 92 Z" fill="${pattern}" opacity="0.55"/>`;
  if (s === 2) return `<path d="M58 98 L70 98 L72 106 L56 106 Z" fill="${pattern}"/>`;
  if (s === 3) return `<path d="M44 92 Q64 106 84 92 Q80 110 64 112 Q48 110 44 92 Z" fill="${pattern}"/>`;
  if (s === 4) return `<path d="M40 90 Q64 112 88 90 Q90 122 64 126 Q38 122 40 90 Z" fill="${pattern}"/>`;
  if (s === 5) return `<path d="M50 94 Q64 100 78 94 Q72 102 56 102 Q50 100 50 94 Z" fill="${pattern}"/>`;
  if (s === 6) return `<rect x="56" y="94" width="16" height="3" rx="1" fill="${pattern}"/>`;
  if (s === 7) return `<path d="M48 92 Q64 102 80 92 L78 100 L64 104 L50 100 Z" fill="${pattern}"/>`;
  if (s === 8) return `<rect x="62" y="100" width="4" height="6" fill="${pattern}"/>`;
  if (s === 9) return `<path d="M58 96 L62 104 L52 110 M70 96 L66 104 L76 110" stroke="${pattern}" stroke-width="3" fill="${pattern}"/>`;
  if (s === 10) return `<path d="M38 84 L44 100 L40 108 M90 84 L84 100 L88 108" stroke="${pattern}" stroke-width="6" fill="${pattern}"/>`;
  return `<path d="M44 92 Q64 104 84 92 Q78 108 64 110 Q50 108 44 92 Z" fill="${pattern}"/>`;
}

function renderGlasses(): string {
  return `<g stroke="#1a1a1a" stroke-width="1.4" fill="none">
    <rect x="40" y="69" width="20" height="13" rx="3"/>
    <rect x="68" y="69" width="20" height="13" rx="3"/>
    <line x1="60" y1="75" x2="68" y2="75"/>
    <rect x="40" y="69" width="20" height="13" rx="3" fill="rgba(255,255,255,0.05)" stroke="none"/>
    <rect x="68" y="69" width="20" height="13" rx="3" fill="rgba(255,255,255,0.05)" stroke="none"/>
  </g>`;
}

function renderCap(brimStyle: number, tilt: number, id: string, s: string, a: string, initial: string): string {
  const tiltDeg = (tilt % 7) - 3;
  const brimCurve = brimStyle % 2 === 0;
  return `<g transform="rotate(${tiltDeg} 64 50)" filter="url(#${id}SH)">
    <!-- Crown -->
    <path d="M28 56 Q34 32 64 28 Q94 32 100 56 L100 60 L28 60 Z" fill="url(#${id}CAP)" stroke="${darken(s, 0.2)}" stroke-width="1.2"/>
    <!-- Crown highlight -->
    <path d="M34 50 Q44 36 64 32 Q74 32 84 42" stroke="rgba(255,255,255,0.32)" stroke-width="1.4" fill="none"/>
    <!-- Brim with shadow below -->
    ${brimCurve
      ? `<path d="M28 56 Q60 70 100 56 L102 62 Q60 72 26 62 Z" fill="url(#${id}CAP)" stroke="${darken(s, 0.2)}" stroke-width="1.2"/>`
      : `<rect x="28" y="56" width="72" height="8" fill="url(#${id}CAP)" stroke="${darken(s, 0.2)}" stroke-width="1.2"/>`}
    <!-- Brim drop shadow on forehead -->
    <path d="M30 60 Q60 66 98 60 L98 64 Q60 70 30 64 Z" fill="rgba(0,0,0,0.32)"/>
    <!-- Logo on cap (curved) -->
    <text x="64" y="52" text-anchor="middle" font-family="'Anton','Bebas Neue',sans-serif" font-size="20" font-weight="800" fill="${a}" stroke="${darken(s, 0.2)}" stroke-width="0.7" paint-order="stroke">${initial}</text>
  </g>`;
}

function renderGlove(p: string, s: string): string {
  return `<g transform="translate(28,118)">
    <path d="M0 0 Q4 -16 22 -10 Q30 4 18 14 Q4 16 0 0 Z" fill="${p}" stroke="${darken(s, 0.1)}" stroke-width="1.4"/>
    <path d="M6 -2 Q14 -8 20 -2" stroke="${s}" stroke-width="1.4" fill="none"/>
    <path d="M4 4 Q10 0 16 4" stroke="${lighten(p, 0.2)}" stroke-width="0.6" fill="none"/>
  </g>`;
}
function renderBat(s: string): string {
  return `<g transform="translate(96,42) rotate(28)">
    <rect x="-2" y="-20" width="4" height="70" rx="2" fill="#d6a14a" stroke="#7a4b1c" stroke-width="1"/>
    <rect x="-1.4" y="-18" width="0.8" height="64" fill="#f0c476" opacity="0.7"/>
    <circle cx="0" cy="-22" r="4.2" fill="${s}" stroke="${darken(s, 0.25)}" stroke-width="0.6"/>
  </g>`;
}
function renderCatcherMask(_p: string, s: string): string {
  return `<g transform="translate(64,40)" opacity="0.4">
    <rect x="-22" y="-4" width="44" height="14" rx="6" fill="none" stroke="${s}" stroke-width="2"/>
    <path d="M-22 4 L22 4 M-22 10 L22 10" stroke="${s}" stroke-width="1.2"/>
  </g>`;
}

function stadiumSilhouette(seed: number, accent: string): string {
  // Parametric per-team variation
  const tilt = (seed % 5) - 2;
  return `<g opacity="0.18" transform="translate(0,0)">
    <path d="M0 134 L${20+tilt} 120 L${36+tilt} 126 L${52+tilt} 112 L${72+tilt} 124 L${92+tilt} 110 L${108+tilt} 122 L128 116 L128 160 L0 160 Z" fill="${accent}"/>
    <!-- Light towers -->
    <rect x="22" y="100" width="2" height="22" fill="${accent}" opacity="0.7"/>
    <rect x="14" y="98" width="18" height="3" fill="${accent}" opacity="0.7"/>
    <rect x="104" y="100" width="2" height="22" fill="${accent}" opacity="0.7"/>
    <rect x="96" y="98" width="18" height="3" fill="${accent}" opacity="0.7"/>
  </g>`;
}

export function portraitDataURL(player: Player, team: Team | null, opts: PortraitOpts = {}): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(portraitSVG(player, team, opts));
}
