// Studio-quality logo composer.
// Multi-layer SVG: back glow → outer shape → inner bevel → mascot → highlight/specular → frame.
// Gradient fills, inner shadow, specular highlights, stitching detail, metallic accents.
import type { Team } from "../store/types";
import { renderShape, pickShapeForTeam } from "./logoShapes";
import { SYMBOLS } from "./logoSymbols";
import { lighten, darken } from "./colorUtils";

interface LogoOpts {
  size?: number;
  variant?: "primary" | "cap" | "wordmark";
  glow?: boolean;
  /** Render at 2x crispness for retina */
  hd?: boolean;
}

export function teamLogoSVG(team: Team, opts: LogoOpts = {}): string {
  const size = opts.size ?? 128;
  const variant = opts.variant ?? "primary";

  if (variant === "cap") return capLogoSVG(team, size);
  if (variant === "wordmark") return wordmarkSVG(team, size);
  return primaryLogoSVG(team, size, opts.glow ?? false);
}

function primaryLogoSVG(team: Team, size: number, glow: boolean): string {
  const shape = pickShapeForTeam(team);
  const sym = SYMBOLS[team.symbol] || SYMBOLS.star;
  const p = team.primary, s = team.secondary, a = team.accent;
  const id = `t${team.id.replace(/[^a-z0-9]/gi, "")}`;
  const letter = team.name.charAt(0).toUpperCase();

  // Bevel/depth colors
  const pHi = lighten(p, 0.18);
  const pLo = darken(p, 0.22);
  const sHi = lighten(s, 0.22);
  const sLo = darken(s, 0.18);
  const aHi = lighten(a, 0.2);

  // Premium metallic for accent on certain teams (logoVariant odd => gold trim)
  const metallic = team.logoVariant % 3 === 0;

  return `
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" role="img" aria-label="${team.name} primary logo">
  <defs>
    <!-- Primary fill gradient with subtle range -->
    <linearGradient id="${id}P" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pHi}"/>
      <stop offset="55%" stop-color="${p}"/>
      <stop offset="100%" stop-color="${pLo}"/>
    </linearGradient>
    <!-- Secondary fill gradient -->
    <linearGradient id="${id}S" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sHi}"/>
      <stop offset="100%" stop-color="${sLo}"/>
    </linearGradient>
    <!-- Accent fill (with optional metallic shimmer) -->
    <linearGradient id="${id}A" x1="0" y1="0" x2="1" y2="1">
      ${metallic
        ? `<stop offset="0%" stop-color="#fff5cf"/><stop offset="35%" stop-color="${aHi}"/><stop offset="55%" stop-color="${a}"/><stop offset="100%" stop-color="${darken(a, 0.25)}"/>`
        : `<stop offset="0%" stop-color="${aHi}"/><stop offset="100%" stop-color="${darken(a, 0.18)}"/>`}
    </linearGradient>
    <!-- Specular top-left highlight overlay -->
    <radialGradient id="${id}HI" cx="32%" cy="22%" r="65%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.42)"/>
      <stop offset="55%" stop-color="rgba(255,255,255,0.06)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <!-- Inner shadow vignette -->
    <radialGradient id="${id}SH" cx="50%" cy="55%" r="62%">
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.45)"/>
    </radialGradient>
    <!-- Inner glow on accent -->
    <filter id="${id}DS" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.4"/>
      <feOffset dx="0" dy="1.4" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Outer glow -->
    ${glow ? `<filter id="${id}G" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>` : ""}
    <!-- Subtle noise/grain pattern -->
    <pattern id="${id}N" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="3" fill="rgba(255,255,255,0.0)"/>
      <circle cx="0.5" cy="0.5" r="0.4" fill="rgba(255,255,255,0.05)"/>
      <circle cx="2" cy="2" r="0.4" fill="rgba(0,0,0,0.05)"/>
    </pattern>
    <!-- Stitching dasharray for baseball detail -->
    <linearGradient id="${id}ST" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cb2929"/>
      <stop offset="100%" stop-color="#7a1a1a"/>
    </linearGradient>
  </defs>

  <g ${glow ? `filter="url(#${id}G)"` : ""}>
    <!-- Back glow -->
    <circle cx="64" cy="66" r="62" fill="${darken(p, 0.6)}" opacity="0.35"/>
    <!-- Shape (uses url(#${id}P) automatically via color substitution) -->
    <g filter="url(#${id}DS)">
      ${renderShapeWithGradients(shape, id, p, s, a, pHi, pLo, sHi, sLo, aHi)}
    </g>
    <!-- Specular highlight on top-left -->
    <rect x="0" y="0" width="128" height="128" fill="url(#${id}HI)" pointer-events="none"/>
    <!-- Inner shadow vignette -->
    <rect x="0" y="0" width="128" height="128" fill="url(#${id}SH)" pointer-events="none"/>
    <!-- Subtle grain -->
    <rect x="0" y="0" width="128" height="128" fill="url(#${id}N)" pointer-events="none" opacity="0.55"/>
    <!-- Mascot symbol (rendered with depth) -->
    <g filter="url(#${id}DS)">${sym({ p, s, a, letter })}</g>
    <!-- Top edge highlight stroke -->
    <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" pointer-events="none"/>
  </g>
</svg>`;
}

// Wraps renderShape but replaces flat fills with our gradients.
// renderShape returns SVG using ${p}/${s}/${a} as raw color strings,
// so we'll do a post-process substitution.
function renderShapeWithGradients(
  shape: ReturnType<typeof pickShapeForTeam>,
  id: string,
  p: string, s: string, a: string,
  _pHi: string, _pLo: string, _sHi: string, _sLo: string, _aHi: string
): string {
  let body = renderShape(shape, { p, s, a });
  // Replace only FILL attributes (not strokes) with gradient refs — keeps strokes crisp.
  body = body.replace(new RegExp(`fill="${escape(p)}"`, "g"), `fill="url(#${id}P)"`);
  body = body.replace(new RegExp(`fill="${escape(a)}"`, "g"), `fill="url(#${id}A)"`);
  body = body.replace(new RegExp(`fill="${escape(s)}"`, "g"), `fill="url(#${id}S)"`);
  return body;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capLogoSVG(team: Team, size: number): string {
  const initial = team.name.charAt(0).toUpperCase();
  const id = `c${team.id.replace(/[^a-z0-9]/gi, "")}`;
  const pHi = lighten(team.primary, 0.18);
  const pLo = darken(team.primary, 0.25);
  const aHi = lighten(team.accent, 0.2);
  return `
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" role="img" aria-label="${team.abbr} cap logo">
  <defs>
    <radialGradient id="${id}P" cx="38%" cy="32%" r="70%">
      <stop offset="0%" stop-color="${pHi}"/>
      <stop offset="65%" stop-color="${team.primary}"/>
      <stop offset="100%" stop-color="${pLo}"/>
    </radialGradient>
    <linearGradient id="${id}A" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${aHi}"/>
      <stop offset="100%" stop-color="${team.accent}"/>
    </linearGradient>
    <radialGradient id="${id}HI" cx="35%" cy="25%" r="55%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.42)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="65" r="61" fill="rgba(0,0,0,0.45)"/>
  <circle cx="64" cy="64" r="60" fill="url(#${id}P)" stroke="${team.secondary}" stroke-width="2.5"/>
  <text x="64" y="92" text-anchor="middle" font-family="'Anton','Bebas Neue','Oswald',sans-serif" font-size="84" font-weight="900" fill="url(#${id}A)" stroke="${darken(team.secondary, 0.15)}" stroke-width="2.5" paint-order="stroke">${initial}</text>
  <circle cx="64" cy="64" r="60" fill="url(#${id}HI)" pointer-events="none"/>
  <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
</svg>`;
}

function wordmarkSVG(team: Team, size: number): string {
  const id = `w${team.id.replace(/[^a-z0-9]/gi, "")}`;
  return `
<svg viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg" width="${size * 2.5}" height="${size * 0.62}" role="img" aria-label="${team.name} wordmark">
  <defs>
    <linearGradient id="${id}P" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${lighten(team.primary, 0.18)}"/>
      <stop offset="100%" stop-color="${darken(team.primary, 0.1)}"/>
    </linearGradient>
  </defs>
  <text x="160" y="58" text-anchor="middle" font-family="'Anton','Bebas Neue',sans-serif" font-size="58" font-weight="900" fill="url(#${id}P)" stroke="${team.secondary}" stroke-width="2.2" paint-order="stroke" letter-spacing="2">${team.name.toUpperCase()}</text>
  <text x="160" y="58" text-anchor="middle" font-family="'Anton','Bebas Neue',sans-serif" font-size="58" font-weight="900" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="0.4">${team.name.toUpperCase()}</text>
</svg>`;
}

export function logoDataURL(team: Team, opts: LogoOpts = {}): string {
  const svg = teamLogoSVG(team, opts);
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
