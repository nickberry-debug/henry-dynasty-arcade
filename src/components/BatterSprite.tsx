// Detailed animated batter sprite. Pure SVG with team-color recoloring,
// CSS keyframe animation states. Way beyond stick figures — proper proportioned
// athletic character with helmet, jersey, batting gloves, pants, cleats.
import type { Team } from "../store/types";
import { lighten, darken } from "../generators/colorUtils";

export type BatterState = "idle" | "load" | "swing" | "whiff" | "homer" | "take" | "walk";

interface Props {
  state?: BatterState;
  team?: Team | null;
  size?: number;
  /** Right-handed batter stands on the right (the more common stance). */
  bats?: "R" | "L";
  /** Skin tone variation 0-9. */
  skinTone?: number;
}

const SKIN_TONES = ["#f5d0b0","#ebbf9d","#dba884","#c89870","#b88560","#a8704a","#8f5a3a","#73442a","#5a3220","#3d2014"];

export function BatterSprite({ state = "idle", team, size = 280, bats = "R", skinTone = 1 }: Props) {
  const primary = team?.primary ?? "#1e3a8a";
  const secondary = team?.secondary ?? "#fbbf24";
  const accent = team?.accent ?? "#ffffff";
  const skin = SKIN_TONES[skinTone % SKIN_TONES.length];
  const skinShadow = darken(skin, 0.15);
  const skinHi = lighten(skin, 0.12);
  const primaryLight = lighten(primary, 0.15);
  const primaryDark = darken(primary, 0.25);
  const id = `bsx${Math.random().toString(36).slice(2, 7)}`;
  const flip = bats === "L" ? -1 : 1;

  return (
    <svg viewBox="0 0 200 280" width={size} height={size * 1.4} className={`batter-${state}`} aria-label={`Batter ${state}`}>
      <defs>
        <linearGradient id={`${id}-jers`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryLight}/>
          <stop offset="100%" stopColor={primaryDark}/>
        </linearGradient>
        <linearGradient id={`${id}-pant`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f4f5"/>
          <stop offset="100%" stopColor="#a1a1aa"/>
        </linearGradient>
        <linearGradient id={`${id}-bat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdd183"/>
          <stop offset="50%" stopColor="#d6a14a"/>
          <stop offset="100%" stopColor="#a76b1c"/>
        </linearGradient>
        <radialGradient id={`${id}-skin`} cx="50%" cy="40%">
          <stop offset="0%" stopColor={skinHi}/>
          <stop offset="100%" stopColor={skin}/>
        </radialGradient>
      </defs>

      {/* Shadow on ground */}
      <ellipse cx="100" cy="260" rx="50" ry="6" fill="rgba(0,0,0,0.4)" className="batter-shadow"/>

      {/* Cleats / feet */}
      <g className="batter-feet">
        <path d={`M ${100 - 22 * flip} 252 Q ${100 - 32 * flip} 258 ${100 - 14 * flip} 260 L ${100 - 5 * flip} 256 Z`} fill="#0a0d13" stroke={secondary} strokeWidth="1.2"/>
        <path d={`M ${100 + 16 * flip} 252 Q ${100 + 26 * flip} 258 ${100 + 8 * flip} 260 L ${100 + 2 * flip} 256 Z`} fill="#0a0d13" stroke={secondary} strokeWidth="1.2"/>
      </g>

      {/* Legs in athletic stance */}
      <g className="batter-legs">
        {/* Back leg (bent) */}
        <path d={`M ${100 - 12 * flip} 175 Q ${100 - 22 * flip} 210 ${100 - 16 * flip} 250`} stroke={`url(#${id}-pant)`} strokeWidth="22" fill="none" strokeLinecap="round"/>
        {/* Front leg */}
        <path d={`M ${100 + 8 * flip} 175 Q ${100 + 18 * flip} 215 ${100 + 12 * flip} 250`} stroke={`url(#${id}-pant)`} strokeWidth="22" fill="none" strokeLinecap="round"/>
        {/* Pant stripe */}
        <path d={`M ${100 - 13 * flip} 178 Q ${100 - 22 * flip} 210 ${100 - 18 * flip} 248`} stroke={secondary} strokeWidth="1.5" fill="none" opacity="0.7"/>
        <path d={`M ${100 + 9 * flip} 178 Q ${100 + 18 * flip} 215 ${100 + 14 * flip} 248`} stroke={secondary} strokeWidth="1.5" fill="none" opacity="0.7"/>
      </g>

      {/* Torso / jersey */}
      <g className="batter-torso">
        <path d="M 78 100 Q 70 130 75 175 L 125 175 Q 130 130 122 100 Z" fill={`url(#${id}-jers)`} stroke={darken(primary, 0.3)} strokeWidth="1.5"/>
        {/* Jersey shading on side */}
        <path d="M 75 175 L 80 175 Q 78 140 84 110 L 78 100 Q 70 130 75 175 Z" fill="rgba(0,0,0,0.2)"/>
        {/* Number on chest */}
        <text x="100" y="148" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="28" fill={accent} stroke={secondary} strokeWidth="1.2" paintOrder="stroke" fontWeight="800">7</text>
        {/* Team color trim */}
        <path d="M 78 100 Q 70 110 75 122 L 125 122 Q 130 110 122 100 Z" fill={secondary} opacity="0.85"/>
        {/* Belt */}
        <rect x="73" y="172" width="54" height="5" fill="#0a0d13"/>
        <rect x="73" y="172" width="54" height="2" fill={secondary} opacity="0.7"/>
      </g>

      {/* Arms gripping bat */}
      <g className="batter-arms">
        {/* Back arm */}
        <path d={`M ${100 - 22 * flip} 110 Q ${100 - 38 * flip} 95 ${100 - 30 * flip} 75`} stroke={`url(#${id}-skin)`} strokeWidth="14" fill="none" strokeLinecap="round"/>
        {/* Front arm */}
        <path d={`M ${100 + 22 * flip} 110 Q ${100 + 38 * flip} 95 ${100 + 30 * flip} 75`} stroke={`url(#${id}-skin)`} strokeWidth="14" fill="none" strokeLinecap="round"/>
        {/* Batting gloves */}
        <ellipse cx={`${100 - 30 * flip}`} cy="73" rx="8" ry="6" fill={secondary} stroke={darken(secondary, 0.3)} strokeWidth="1"/>
        <ellipse cx={`${100 + 30 * flip}`} cy="73" rx="8" ry="6" fill={secondary} stroke={darken(secondary, 0.3)} strokeWidth="1"/>
      </g>

      {/* Bat */}
      <g className="batter-bat" style={{ transformOrigin: `${100 + 30 * flip}px 73px` }}>
        <line x1={`${100 + 30 * flip}`} y1="73" x2={`${100 + 60 * flip}`} y2="20" stroke={`url(#${id}-bat)`} strokeWidth="9" strokeLinecap="round"/>
        <line x1={`${100 + 30 * flip}`} y1="73" x2={`${100 + 33 * flip}`} y2="65" stroke="#0a0d13" strokeWidth="3" strokeLinecap="round"/>
        {/* Bat highlight */}
        <line x1={`${100 + 32 * flip}`} y1="70" x2={`${100 + 58 * flip}`} y2="22" stroke="#fff5d6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </g>

      {/* Head + face */}
      <g className="batter-head">
        <ellipse cx="100" cy="78" rx="18" ry="22" fill={`url(#${id}-skin)`}/>
        {/* Jaw shadow */}
        <path d="M 88 88 Q 100 100 112 88 L 110 92 Q 100 102 90 92 Z" fill={skinShadow} opacity="0.4"/>
        {/* Eye black */}
        <rect x="86" y="76" width="6" height="2" fill="#1a1a1a" rx="0.5"/>
        <rect x="108" y="76" width="6" height="2" fill="#1a1a1a" rx="0.5"/>
        {/* Eyes */}
        <circle cx="92" cy="74" r="1.6" fill="#0a0d13"/>
        <circle cx="108" cy="74" r="1.6" fill="#0a0d13"/>
        {/* Mouth (determined line) */}
        <line x1="94" y1="86" x2="106" y2="86" stroke="#5a2222" strokeWidth="1.4" strokeLinecap="round"/>
      </g>

      {/* Helmet */}
      <g className="batter-helmet">
        <path d="M 78 62 Q 78 44 100 42 Q 122 44 122 62 L 124 70 L 76 70 Z" fill={`url(#${id}-jers)`} stroke={darken(primary, 0.3)} strokeWidth="1.2"/>
        {/* Helmet sheen */}
        <path d="M 84 50 Q 92 44 105 44" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none"/>
        {/* Brim */}
        <path d={`M ${72 - 6 * flip} 64 L 76 70 L 124 70 L ${128 + 6 * flip} 64 Z`} fill={primaryDark}/>
        {/* Logo on helmet */}
        <text x="100" y="60" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="14" fill={secondary} fontWeight="800">{(team?.abbr ?? "H").charAt(0)}</text>
        {/* Ear flap (on front side) */}
        <ellipse cx={`${100 + 16 * flip}`} cy="78" rx="6" ry="9" fill={`url(#${id}-jers)`} stroke={darken(primary, 0.3)} strokeWidth="1"/>
      </g>

      {/* Action effect overlays */}
      {state === "swing" && (
        <g className="swing-effects">
          {/* Bat trail */}
          <path d={`M ${100 + 30 * flip} 73 Q ${100 - 5 * flip} 50 ${100 - 50 * flip} 90`} stroke={secondary} strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round"/>
          <path d={`M ${100 + 30 * flip} 73 Q ${100 - 5 * flip} 60 ${100 - 45 * flip} 100`} stroke="#fff" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round"/>
        </g>
      )}
      {state === "homer" && (
        <g className="homer-effects">
          <text x="100" y="38" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="22" fill="#fbbf24" stroke="#0a0d13" strokeWidth="1" paintOrder="stroke" fontWeight="800">💥</text>
          {/* Sparkles */}
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx={100 + Math.cos((i / 6) * Math.PI * 2) * 60} cy={140 + Math.sin((i / 6) * Math.PI * 2) * 30} r="2" fill="#fde68a"/>
          ))}
        </g>
      )}
      {state === "whiff" && (
        <text x="100" y="38" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="18" fill="#94a3b8" fontWeight="800">💨</text>
      )}
    </svg>
  );
}
