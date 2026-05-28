// Mascot symbol library — dynamic silhouettes
// Each renderer takes color args and returns SVG fragments centered on viewBox 0 0 128 128
// All silhouettes are bold, sports-style; not cartoony.

export interface SymArgs {
  p: string; s: string; a: string; letter?: string;
}

type Renderer = (c: SymArgs) => string;

// Helper: layered stroke for "edge" feel
const edge = (path: string, fill: string, stroke: string, w = 2) =>
  `<path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;

export const SYMBOLS: Record<string, Renderer> = {
  letter: ({ a, p, letter }) =>
    `<text x="64" y="86" text-anchor="middle" font-family="'Anton','Bebas Neue','Oswald',sans-serif" font-size="78" font-weight="900" fill="${a}" stroke="${p}" stroke-width="2">${letter || "X"}</text>`,
  star: ({ s, a }) =>
    `<polygon points="64,22 76,58 116,58 84,80 96,118 64,94 32,118 44,80 12,58 52,58" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  diamond: ({ s, a }) =>
    `<polygon points="64,22 102,64 64,106 26,64" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="64" cy="64" r="9" fill="${s}"/>`,
  crown: ({ s, a }) =>
    `${edge("M22 86 L34 50 L48 78 L64 38 L80 78 L94 50 L106 86 Z", a, s)}
     <rect x="22" y="86" width="84" height="10" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="34" cy="48" r="3" fill="${s}"/><circle cx="64" cy="36" r="3" fill="${s}"/><circle cx="94" cy="48" r="3" fill="${s}"/>`,
  bolt: ({ a, s }) =>
    `<polygon points="74,18 38,68 60,68 50,114 92,58 70,58 86,18" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  flame: ({ a, s }) =>
    `${edge("M64 18 C 48 36 42 50 50 62 C 38 62 42 78 50 84 C 38 88 46 108 64 110 C 82 108 90 88 78 84 C 86 78 90 62 78 62 C 86 50 80 36 64 18 Z", a, s, 2)}`,
  storm: ({ a, s }) =>
    `<path d="M30 60 Q26 44 42 40 Q44 28 60 30 Q72 22 86 32 Q104 30 100 54 Q108 56 104 70 H32 Q24 70 30 60 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <polygon points="58,72 50,94 64,90 58,114 78,78 64,82 74,68" fill="${s}"/>`,
  snow: ({ a, s }) =>
    `<g stroke="${a}" stroke-width="4" stroke-linecap="round">
       <line x1="64" y1="22" x2="64" y2="106"/>
       <line x1="22" y1="64" x2="106" y2="64"/>
       <line x1="34" y1="34" x2="94" y2="94"/>
       <line x1="94" y1="34" x2="34" y2="94"/>
     </g>
     <circle cx="64" cy="64" r="6" fill="${s}"/>`,
  wave: ({ a, s }) =>
    `<path d="M14 80 Q30 60 46 76 Q62 92 78 76 Q94 60 114 80 V100 H14 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M14 60 Q30 44 46 56 Q62 68 78 56 Q94 44 114 60" stroke="${a}" stroke-width="3" fill="none"/>`,
  tornado: ({ a, s }) =>
    `<path d="M20 30 L108 30 L96 46 L32 46 L40 60 L88 60 L80 74 L48 74 L56 88 L72 88 L68 100 L60 100 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  mountain: ({ a, s }) =>
    `<polygon points="14,104 44,46 56,68 76,30 110,104" fill="${a}" stroke="${s}" stroke-width="2"/>
     <polygon points="44,46 56,68 50,70" fill="#ffffff" opacity="0.85"/>
     <polygon points="76,30 86,46 76,46" fill="#ffffff" opacity="0.85"/>`,
  sun: ({ a, s }) =>
    `<circle cx="64" cy="64" r="22" fill="${a}" stroke="${s}" stroke-width="2"/>
     ${Array.from({length:12}).map((_,i)=>`<line x1="64" y1="22" x2="64" y2="34" stroke="${a}" stroke-width="5" stroke-linecap="round" transform="rotate(${i*30} 64 64)"/>`).join("")}`,
  comet: ({ a, s }) =>
    `<circle cx="96" cy="40" r="14" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M88 50 L18 110 L36 92 L24 110 L50 88 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  tree: ({ a, s }) =>
    `${edge("M64 20 L86 50 L74 50 L98 86 L80 86 L106 116 H22 L48 86 L30 86 L54 50 L42 50 Z", a, s, 2)}`,
  cactus: ({ a, s }) =>
    `<path d="M58 30 H70 V60 H82 Q90 60 90 72 V90 H78 V72 H70 V108 H58 V72 H50 V90 H38 V72 Q38 60 50 60 H58 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  // ----- Animals -----
  eagle: ({ a, s }) =>
    `${edge("M18 62 L40 50 L46 28 L60 44 L72 28 L82 50 L106 62 L94 70 L106 80 L82 76 L72 96 L60 76 L46 96 L36 80 L48 70 Z", a, s, 2)}
     <circle cx="64" cy="46" r="3" fill="${s}"/>`,
  hawk: ({ a, s }) =>
    `${edge("M14 70 Q34 40 60 56 Q56 30 76 28 Q92 36 88 54 Q108 64 110 86 Q88 80 70 74 Q56 92 38 86 Q22 88 14 70 Z", a, s, 2)}
     <circle cx="78" cy="42" r="3" fill="${s}"/>`,
  falcon: ({ a, s }) =>
    `${edge("M20 88 Q40 50 64 50 L74 30 L90 46 Q106 56 102 78 Q80 70 64 78 Q44 92 20 88 Z", a, s, 2)}
     <circle cx="86" cy="42" r="2.5" fill="${s}"/>`,
  raven: ({ a, s }) =>
    `${edge("M18 80 Q34 50 60 56 L72 36 L94 50 Q110 60 100 82 Q80 80 64 86 Q42 92 18 80 Z", a, s, 2)}
     <polygon points="94,50 110,46 100,56" fill="${a}"/>
     <circle cx="86" cy="50" r="2.5" fill="${s}"/>`,
  bear: ({ a, s }) =>
    `${edge("M30 64 Q24 40 40 30 Q50 38 56 38 Q64 26 72 38 Q80 38 88 30 Q104 40 98 64 Q102 88 84 96 Q66 100 64 100 Q62 100 44 96 Q26 88 30 64 Z", a, s, 2)}
     <circle cx="40" cy="34" r="6" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="88" cy="34" r="6" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="54" cy="64" r="3" fill="${s}"/><circle cx="74" cy="64" r="3" fill="${s}"/>
     <ellipse cx="64" cy="80" rx="6" ry="4" fill="${s}"/>`,
  grizzly: ({ a, s }) =>
    `${edge("M24 70 Q18 42 38 30 Q44 40 54 38 Q58 26 64 26 Q70 26 74 38 Q84 40 90 30 Q110 42 104 70 Q108 96 86 102 Q64 108 42 102 Q20 96 24 70 Z", a, s, 2)}
     <circle cx="52" cy="60" r="4" fill="${s}"/><circle cx="76" cy="60" r="4" fill="${s}"/>
     <path d="M50 86 Q64 92 78 86" stroke="${s}" stroke-width="3" fill="none"/>`,
  polar: ({ a, s }) =>
    `${edge("M30 70 Q24 44 40 34 Q44 44 54 42 Q58 30 64 30 Q70 30 74 42 Q84 44 88 34 Q104 44 98 70 Q102 96 80 102 Q64 106 48 102 Q26 96 30 70 Z", "#ffffff", s, 2)}
     <circle cx="52" cy="62" r="3" fill="${s}"/><circle cx="76" cy="62" r="3" fill="${s}"/>
     <ellipse cx="64" cy="80" rx="6" ry="4" fill="${s}"/>`,
  wolf: ({ a, s }) =>
    `${edge("M22 92 L34 58 L20 30 L48 50 L64 36 L80 50 L108 30 L94 58 L106 92 L86 78 L80 96 L64 90 L48 96 L42 78 Z", a, s, 2)}
     <polygon points="56,66 60,72 52,72" fill="${s}"/>
     <polygon points="72,66 76,72 68,72" fill="${s}"/>`,
  fox: ({ a, s }) =>
    `${edge("M26 88 L36 56 L18 38 L42 46 L52 28 L64 44 L76 28 L86 46 L110 38 L92 56 L102 88 L84 76 L78 90 L64 84 L50 90 L44 76 Z", a, s, 2)}`,
  lion: ({ a, s }) =>
    `${edge("M64 26 Q80 22 90 32 Q108 36 104 52 Q116 60 108 74 Q116 86 100 92 Q92 108 76 102 Q70 116 58 116 Q44 108 36 102 Q20 108 24 92 Q12 86 20 74 Q8 60 24 52 Q20 36 38 32 Q48 22 64 26 Z", a, s, 2)}
     <circle cx="52" cy="60" r="3" fill="${s}"/><circle cx="76" cy="60" r="3" fill="${s}"/>
     <path d="M52 78 Q64 86 76 78" stroke="${s}" stroke-width="3" fill="none"/>`,
  tiger: ({ a, s }) =>
    `${edge("M30 70 Q24 42 42 32 Q50 42 60 40 Q64 28 64 28 Q64 28 68 40 Q78 42 86 32 Q104 42 98 70 Q102 92 80 100 Q64 104 48 100 Q26 92 30 70 Z", a, s, 2)}
     <path d="M40 50 L46 60 M88 50 L82 60 M50 80 L46 90 M78 80 L82 90" stroke="${s}" stroke-width="3"/>
     <circle cx="52" cy="62" r="3" fill="${s}"/><circle cx="76" cy="62" r="3" fill="${s}"/>`,
  jaguar: ({ a, s }) =>
    `${edge("M26 76 Q22 46 44 36 Q50 46 60 44 Q64 32 64 32 Q64 32 68 44 Q78 46 84 36 Q106 46 102 76 Q106 96 82 102 Q64 106 46 102 Q22 96 26 76 Z", a, s, 2)}
     <circle cx="46" cy="60" r="2" fill="${s}"/><circle cx="58" cy="64" r="2" fill="${s}"/>
     <circle cx="74" cy="64" r="2" fill="${s}"/><circle cx="86" cy="60" r="2" fill="${s}"/>
     <circle cx="64" cy="80" r="2" fill="${s}"/>`,
  panther: ({ a, s }) =>
    `${edge("M14 80 Q20 50 50 50 Q40 38 56 32 Q72 24 84 36 Q104 36 110 56 Q120 70 108 84 Q98 100 80 96 Q70 108 56 100 Q40 100 26 96 Q14 92 14 80 Z", a, s, 2)}
     <polygon points="60,46 66,52 58,52" fill="${s}"/>
     <polygon points="78,46 84,52 76,52" fill="${s}"/>`,
  puma: ({ a, s }) =>
    `${edge("M16 86 Q12 56 36 50 Q34 36 50 32 Q66 22 80 36 Q98 38 104 56 Q116 70 106 84 Q98 96 84 92 Q78 102 64 100 Q50 102 38 96 Q22 94 16 86 Z", a, s, 2)}`,
  bull: ({ a, s }) =>
    `${edge("M64 34 Q44 30 38 50 Q22 46 18 64 Q24 76 36 70 Q44 96 64 100 Q84 96 92 70 Q104 76 110 64 Q106 46 90 50 Q84 30 64 34 Z", a, s, 2)}
     <path d="M38 50 Q22 38 22 28" stroke="${s}" stroke-width="4" fill="none"/>
     <path d="M90 50 Q106 38 106 28" stroke="${s}" stroke-width="4" fill="none"/>
     <circle cx="52" cy="68" r="3" fill="${s}"/><circle cx="76" cy="68" r="3" fill="${s}"/>`,
  ram: ({ a, s }) =>
    `${edge("M64 34 Q44 30 40 50 Q24 50 26 70 Q34 78 44 76 Q50 96 64 100 Q78 96 84 76 Q94 78 102 70 Q104 50 88 50 Q84 30 64 34 Z", a, s, 2)}
     <path d="M40 50 C 24 56 18 70 28 80" stroke="${s}" stroke-width="4" fill="none"/>
     <path d="M88 50 C 104 56 110 70 100 80" stroke="${s}" stroke-width="4" fill="none"/>`,
  horse: ({ a, s }) =>
    `${edge("M40 28 Q56 18 70 28 L78 40 Q90 48 96 64 L106 80 L96 96 L86 90 L78 100 Q68 108 56 100 L36 108 L26 92 L36 76 L34 60 L40 44 Z", a, s, 2)}
     <polygon points="56,30 50,18 48,30" fill="${a}" stroke="${s}" stroke-width="2"/>
     <polygon points="68,30 74,18 76,30" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  longhorn: ({ a, s }) =>
    `${edge("M40 60 Q40 40 64 40 Q88 40 88 60 Q88 80 64 86 Q40 80 40 60 Z", a, s, 2)}
     <path d="M40 56 C 14 50 4 70 24 84" stroke="${s}" stroke-width="6" fill="none"/>
     <path d="M88 56 C 114 50 124 70 104 84" stroke="${s}" stroke-width="6" fill="none"/>
     <circle cx="56" cy="64" r="3" fill="${s}"/><circle cx="72" cy="64" r="3" fill="${s}"/>`,
  bison: ({ a, s }) =>
    `${edge("M22 64 Q20 38 44 32 Q58 24 78 30 Q104 28 110 50 Q112 70 96 78 Q102 96 80 100 Q60 104 44 98 Q26 92 22 64 Z", a, s, 2)}
     <path d="M40 32 Q34 24 38 18" stroke="${s}" stroke-width="3" fill="none"/>
     <circle cx="62" cy="58" r="3" fill="${s}"/>`,
  elk: ({ a, s }) =>
    `${edge("M52 58 Q44 40 50 30 Q58 26 64 32 Q70 26 78 30 Q84 40 76 58 Q88 64 84 84 L78 100 H50 L44 84 Q40 64 52 58 Z", a, s, 2)}
     <path d="M50 30 L34 16 L42 28 M50 28 L30 24 M78 30 L94 16 L86 28 M78 28 L98 24" stroke="${s}" stroke-width="3" fill="none"/>`,
  moose: ({ a, s }) =>
    `${edge("M48 56 Q40 38 48 28 Q58 24 64 30 Q70 24 80 28 Q88 38 80 56 Q92 64 88 84 L82 100 H46 L40 84 Q36 64 48 56 Z", a, s, 2)}
     <path d="M48 30 L20 22 L40 32 M48 28 L26 30 M80 30 L108 22 L88 32 M80 28 L102 30" stroke="${s}" stroke-width="3" fill="none"/>`,
  shark: ({ a, s }) =>
    `${edge("M10 70 Q40 30 80 50 L106 36 L100 70 L116 76 L96 86 Q70 110 30 96 L20 110 L18 92 L10 86 Z", a, s, 2)}
     <circle cx="74" cy="60" r="3" fill="${s}"/>
     <path d="M40 78 L60 78 L48 86 Z" fill="${s}"/>`,
  marlin: ({ a, s }) =>
    `${edge("M10 76 Q40 50 80 60 Q100 48 110 26 Q108 56 96 70 L114 80 Q98 92 80 88 Q40 104 10 76 Z", a, s, 2)}
     <line x1="80" y1="60" x2="110" y2="26" stroke="${s}" stroke-width="2"/>
     <circle cx="100" cy="74" r="2.5" fill="${s}"/>`,
  dolphin: ({ a, s }) =>
    `${edge("M14 86 Q28 50 64 50 Q88 38 106 50 Q92 60 88 76 Q96 82 92 96 Q70 102 44 94 Q22 98 14 86 Z", a, s, 2)}
     <circle cx="50" cy="68" r="2.5" fill="${s}"/>`,
  whale: ({ a, s }) =>
    `${edge("M10 70 Q24 40 60 44 Q92 38 110 60 Q116 76 102 86 Q88 110 60 94 Q26 100 10 70 Z", a, s, 2)}
     <path d="M30 50 Q34 32 40 36" stroke="${a}" stroke-width="3" fill="none"/>
     <circle cx="58" cy="68" r="2.5" fill="${s}"/>`,
  stingray: ({ a, s }) =>
    `${edge("M64 30 Q104 30 114 70 L96 76 Q72 86 64 86 Q56 86 32 76 L14 70 Q24 30 64 30 Z", a, s, 2)}
     <line x1="64" y1="86" x2="64" y2="116" stroke="${s}" stroke-width="3"/>`,
  pelican: ({ a, s }) =>
    `${edge("M30 56 Q56 34 86 50 L106 44 L96 64 Q98 78 84 84 Q66 92 50 84 Q42 76 32 78 Q22 70 30 56 Z", a, s, 2)}
     <path d="M50 70 Q62 90 74 70" fill="${s}"/>`,
  snake: ({ a, s }) =>
    `<path d="M18 88 Q38 56 60 76 Q82 96 100 64 Q116 40 106 24" stroke="${a}" stroke-width="14" fill="none" stroke-linecap="round"/>
     <path d="M18 88 Q38 56 60 76 Q82 96 100 64 Q116 40 106 24" stroke="${s}" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="6 8"/>
     <polygon points="100,18 116,18 108,30" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  cobra: ({ a, s }) =>
    `${edge("M40 100 Q40 70 60 60 Q40 50 44 30 L84 30 Q88 50 68 60 Q88 70 88 100 Z", a, s, 2)}
     <circle cx="56" cy="40" r="3" fill="${s}"/><circle cx="72" cy="40" r="3" fill="${s}"/>`,
  gator: ({ a, s }) =>
    `${edge("M10 76 L34 70 L42 60 L66 60 L86 70 L108 68 L120 78 L102 84 L82 86 Q60 96 38 86 Z", a, s, 2)}
     <circle cx="40" cy="68" r="2" fill="${s}"/>
     <path d="M22 76 L18 70 L24 72 M30 78 L26 72 M40 78 L36 72 M50 78 L46 72 M62 80 L58 74 M74 80 L70 74 M86 80 L82 74 M98 80 L94 74" stroke="${s}" stroke-width="2"/>`,
  raptor: ({ a, s }) =>
    `${edge("M32 108 Q24 80 36 64 Q30 50 40 38 L60 36 L66 22 L76 36 L94 42 Q104 52 96 70 L110 84 L92 88 Q92 102 76 108 L60 100 Z", a, s, 2)}
     <circle cx="62" cy="38" r="2.5" fill="${s}"/>`,
  dragon: ({ a, s }) =>
    `${edge("M18 94 Q26 60 46 56 L52 32 L66 50 L86 36 L82 60 L106 70 L88 80 L100 100 Q78 102 70 92 Q54 102 38 92 Z", a, s, 2)}
     <circle cx="60" cy="44" r="2.5" fill="${s}"/>`,
  phoenix: ({ a, s }) =>
    `${edge("M22 80 Q40 40 64 44 Q88 40 106 80 Q90 92 80 80 Q70 90 64 80 Q58 90 48 80 Q38 92 22 80 Z", a, s, 2)}
     <circle cx="62" cy="50" r="2.5" fill="${s}"/>
     <path d="M40 88 Q48 110 56 96 M88 88 Q80 110 72 96" stroke="${a}" stroke-width="4" fill="none"/>`,
  // Pros & objects
  knight: ({ a, s }) =>
    `${edge("M40 32 L60 26 L62 50 L86 56 L86 80 L74 96 L74 110 H46 V96 L34 80 L34 56 Q34 36 40 32 Z", a, s, 2)}
     <rect x="46" y="58" width="6" height="14" fill="${s}"/><rect x="62" y="58" width="6" height="14" fill="${s}"/>
     <rect x="78" y="58" width="6" height="14" fill="${s}"/>`,
  viking: ({ a, s }) =>
    `${edge("M30 64 Q24 36 64 30 Q104 36 98 64 Q96 90 64 96 Q32 90 30 64 Z", a, s, 2)}
     <path d="M30 56 Q20 30 28 18 L36 36 M98 56 Q108 30 100 18 L92 36" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="52" cy="62" r="3" fill="${s}"/><circle cx="76" cy="62" r="3" fill="${s}"/>`,
  samurai: ({ a, s }) =>
    `${edge("M30 70 Q40 30 64 30 Q88 30 98 70 Q98 86 80 88 Q72 78 64 78 Q56 78 48 88 Q30 86 30 70 Z", a, s, 2)}
     <rect x="40" y="50" width="48" height="10" fill="${s}"/>
     <circle cx="56" cy="68" r="2.5" fill="${s}"/><circle cx="72" cy="68" r="2.5" fill="${s}"/>`,
  gladiator: ({ a, s }) =>
    `${edge("M40 110 L36 60 L28 46 L36 30 L52 36 L60 24 L68 36 L80 30 L92 30 L100 46 L92 60 L88 110 Z", a, s, 2)}
     <line x1="60" y1="36" x2="60" y2="80" stroke="${s}" stroke-width="3"/>
     <line x1="68" y1="36" x2="68" y2="80" stroke="${s}" stroke-width="3"/>`,
  centurion: ({ a, s }) =>
    `${edge("M40 90 L40 50 Q40 30 64 30 Q88 30 88 50 L88 90 Z", a, s, 2)}
     <polygon points="40,30 64,18 88,30 80,40 64,32 48,40" fill="${a}" stroke="${s}" stroke-width="2"/>
     <line x1="52" y1="56" x2="76" y2="56" stroke="${s}" stroke-width="3"/>`,
  spartan: ({ a, s }) =>
    `${edge("M30 60 Q30 30 64 30 Q98 30 98 60 Q98 90 64 96 Q30 90 30 60 Z", a, s, 2)}
     <path d="M58 50 L58 80 L70 80 L70 50 Z" fill="${s}"/>
     <path d="M44 50 L40 70 L52 70 M84 50 L88 70 L76 70" fill="${s}"/>`,
  titan: ({ a, s }) =>
    `${edge("M40 110 V70 L30 50 L40 30 H88 L98 50 L88 70 V110 Z", a, s, 2)}
     <circle cx="64" cy="50" r="8" fill="${s}"/>`,
  griffin: ({ a, s }) =>
    `${edge("M20 80 L40 60 L40 40 L60 30 L72 44 L92 36 L100 56 L92 80 L100 92 L80 94 L60 110 L50 92 L34 92 Z", a, s, 2)}`,
  pirate: ({ a, s }) =>
    `<circle cx="64" cy="64" r="36" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M28 56 Q40 38 64 38 Q88 38 100 56 L100 50 Q100 38 88 38 H40 Q28 38 28 50 Z" fill="${s}"/>
     <rect x="52" y="32" width="24" height="8" fill="${s}"/>
     <circle cx="54" cy="66" r="4" fill="${s}"/>
     <line x1="74" y1="60" x2="80" y2="72" stroke="${s}" stroke-width="3"/>
     <line x1="80" y1="60" x2="74" y2="72" stroke="${s}" stroke-width="3"/>`,
  anchor: ({ a, s }) =>
    `<circle cx="64" cy="32" r="8" fill="none" stroke="${a}" stroke-width="5"/>
     <line x1="64" y1="40" x2="64" y2="100" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
     <line x1="48" y1="52" x2="80" y2="52" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
     <path d="M30 88 Q44 110 64 100 Q84 110 98 88" stroke="${a}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  ship: ({ a, s }) =>
    `<rect x="34" y="36" width="6" height="56" fill="${a}"/>
     <polygon points="40,36 90,40 40,90" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M14 96 L114 96 L100 110 L28 110 Z" fill="${s}" stroke="${a}" stroke-width="2"/>`,
  lighthouse: ({ a, s }) =>
    `<rect x="54" y="30" width="20" height="60" fill="${a}" stroke="${s}" stroke-width="2"/>
     <polygon points="48,30 80,30 70,18 58,18" fill="${s}"/>
     <rect x="48" y="90" width="32" height="20" fill="${a}" stroke="${s}" stroke-width="2"/>
     <line x1="64" y1="14" x2="64" y2="2" stroke="${s}" stroke-width="2"/>`,
  rocket: ({ a, s }) =>
    `${edge("M64 16 Q80 30 80 70 L78 90 L88 100 L70 100 L64 110 L58 100 L40 100 L50 90 L48 70 Q48 30 64 16 Z", a, s, 2)}
     <circle cx="64" cy="50" r="6" fill="${s}"/>`,
  cannon: ({ a, s }) =>
    `<rect x="20" y="60" width="68" height="16" rx="6" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="20" cy="68" r="14" fill="${a}" stroke="${s}" stroke-width="2"/>
     <polygon points="80,46 96,30 110,46 96,60" fill="${s}"/>`,
  pickaxe: ({ a, s }) =>
    `<line x1="34" y1="34" x2="94" y2="94" stroke="#a36a3a" stroke-width="6" stroke-linecap="round"/>
     <path d="M64 36 Q80 28 96 36 Q104 50 96 60 Q80 50 64 36 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M32 64 Q24 80 36 96 Q52 88 60 76 Q48 70 32 64 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  axe: ({ a, s }) =>
    `<line x1="44" y1="106" x2="84" y2="22" stroke="#a36a3a" stroke-width="7" stroke-linecap="round"/>
     <path d="M70 30 Q104 28 102 56 Q88 64 70 56 Q60 44 70 30 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  cowboy: ({ a, s }) =>
    `<path d="M20 70 Q40 50 64 50 Q88 50 108 70 Q88 76 64 76 Q40 76 20 70 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M44 70 Q44 36 64 36 Q84 36 84 70 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  captain: ({ a, s }) =>
    `<path d="M30 50 L98 50 L94 70 L34 70 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <rect x="56" y="56" width="16" height="12" fill="${s}"/>
     <path d="M40 50 Q40 40 64 38 Q88 40 88 50" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  sailor: ({ a, s }) =>
    `<circle cx="64" cy="64" r="20" fill="${a}" stroke="${s}" stroke-width="2"/>
     <path d="M50 50 L78 50 L88 30 L40 30 Z" fill="${s}"/>
     <rect x="56" y="78" width="16" height="20" fill="${s}"/>`,
  train: ({ a, s }) =>
    `<rect x="14" y="56" width="100" height="40" rx="6" fill="${a}" stroke="${s}" stroke-width="2"/>
     <rect x="80" y="36" width="20" height="20" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="34" cy="100" r="10" fill="${s}"/>
     <circle cx="64" cy="100" r="10" fill="${s}"/>
     <circle cx="94" cy="100" r="10" fill="${s}"/>
     <path d="M82 36 Q72 24 80 18" stroke="${s}" stroke-width="3" fill="none"/>`,
  shield: ({ a, s }) =>
    `${edge("M64 22 L100 32 L100 60 Q100 92 64 106 Q28 92 28 60 L28 32 Z", a, s, 2)}
     <line x1="64" y1="36" x2="64" y2="92" stroke="${s}" stroke-width="3"/>
     <line x1="40" y1="64" x2="88" y2="64" stroke="${s}" stroke-width="3"/>`,
  bird: ({ a, s }) =>
    `${edge("M22 80 Q38 56 62 60 L80 38 L96 56 Q108 70 96 86 Q72 90 60 86 Q40 92 22 80 Z", a, s, 2)}
     <circle cx="84" cy="56" r="2.5" fill="${s}"/>
     <polygon points="96,56 110,52 100,62" fill="${a}"/>`,
  ace: ({ a, s }) =>
    `<rect x="36" y="22" width="56" height="84" rx="6" fill="${a}" stroke="${s}" stroke-width="2"/>
     <text x="46" y="46" font-family="serif" font-size="22" font-weight="800" fill="${s}">A</text>
     <text x="84" y="92" font-family="serif" font-size="22" font-weight="800" fill="${s}" transform="rotate(180 84 92)">A</text>
     <text x="64" y="78" text-anchor="middle" font-family="serif" font-size="40" font-weight="900" fill="${s}">♠</text>`,
  halo: ({ a, s }) =>
    `<ellipse cx="64" cy="32" rx="28" ry="8" fill="none" stroke="${a}" stroke-width="4"/>
     <path d="M48 96 Q48 60 64 60 Q80 60 80 96 Z" fill="${a}" stroke="${s}" stroke-width="2"/>`,
  skull: ({ a, s }) =>
    `<path d="M36 64 Q32 36 64 32 Q96 36 92 64 L90 84 L72 88 L72 96 L56 96 L56 88 L38 84 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <circle cx="50" cy="64" r="6" fill="${s}"/><circle cx="78" cy="64" r="6" fill="${s}"/>
     <rect x="60" y="76" width="8" height="6" fill="${s}"/>`,
  friar: ({ a, s }) =>
    `<path d="M44 50 Q44 26 64 26 Q84 26 84 50 L84 96 H44 Z" fill="${a}" stroke="${s}" stroke-width="2"/>
     <ellipse cx="64" cy="48" rx="10" ry="8" fill="#f5d0b0"/>
     <path d="M52 50 Q52 38 64 36 Q76 38 76 50" fill="${a}"/>`
};

export const SYMBOL_KEYS = Object.keys(SYMBOLS);
