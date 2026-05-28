// Detailed animated pitcher sprite. Proper proportioned athletic character with
// cap, jersey, glove, baseball pants, cleats. Animation states cycle via CSS.
import type { Team } from "../store/types";
import { lighten, darken } from "../generators/colorUtils";

export type PitcherState = "idle" | "windup" | "release" | "followthrough" | "strike" | "ball" | "hrAllowed";

interface Props {
  state?: PitcherState;
  team?: Team | null;
  size?: number;
  throws?: "R" | "L";
  skinTone?: number;
}

const SKIN_TONES = ["#f5d0b0","#ebbf9d","#dba884","#c89870","#b88560","#a8704a","#8f5a3a","#73442a","#5a3220","#3d2014"];

export function PitcherSprite({ state = "idle", team, size = 280, throws = "R", skinTone = 1 }: Props) {
  const primary = team?.primary ?? "#7c2d12";
  const secondary = team?.secondary ?? "#fbbf24";
  const accent = team?.accent ?? "#ffffff";
  const skin = SKIN_TONES[skinTone % SKIN_TONES.length];
  const skinHi = lighten(skin, 0.12);
  const primaryLight = lighten(primary, 0.15);
  const primaryDark = darken(primary, 0.25);
  const id = `psx${Math.random().toString(36).slice(2, 7)}`;
  const flip = throws === "L" ? -1 : 1;

  return (
    <svg viewBox="0 0 200 280" width={size} height={size * 1.4} className={`pitcher-${state}`} aria-label={`Pitcher ${state}`}>
      <defs>
        <linearGradient id={`${id}-jers`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryLight}/>
          <stop offset="100%" stopColor={primaryDark}/>
        </linearGradient>
        <linearGradient id={`${id}-pant`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f4f5"/>
          <stop offset="100%" stopColor="#a1a1aa"/>
        </linearGradient>
        <radialGradient id={`${id}-skin`} cx="50%" cy="40%">
          <stop offset="0%" stopColor={skinHi}/>
          <stop offset="100%" stopColor={skin}/>
        </radialGradient>
      </defs>

      {/* Mound dirt shadow */}
      <ellipse cx="100" cy="265" rx="65" ry="8" fill="rgba(0,0,0,0.4)"/>
      <ellipse cx="100" cy="260" rx="50" ry="6" fill="#8a6939" opacity="0.7"/>

      {/* Plant leg (back) */}
      <g className="pitcher-plant-leg">
        <path d="M 100 175 Q 105 215 95 250" stroke={`url(#${id}-pant)`} strokeWidth="22" fill="none" strokeLinecap="round"/>
        <path d="M 100 178 Q 105 215 96 245" stroke={secondary} strokeWidth="1.5" fill="none" opacity="0.7"/>
        {/* Cleat */}
        <path d="M 80 248 Q 88 258 100 256 L 105 250 Z" fill="#0a0d13" stroke={secondary} strokeWidth="1.2"/>
      </g>

      {/* Lifted/striding leg — animates with state */}
      <g className="pitcher-stride-leg" style={{ transformOrigin: "100px 175px" }}>
        <path d={`M 100 175 Q ${100 + 20 * flip} 165 ${100 + 30 * flip} 145`} stroke={`url(#${id}-pant)`} strokeWidth="22" fill="none" strokeLinecap="round"/>
        <path d={`M ${100 + 30 * flip} 145 L ${100 + 38 * flip} 140`} stroke="#0a0d13" strokeWidth="14" strokeLinecap="round"/>
      </g>

      {/* Torso */}
      <g className="pitcher-torso">
        <path d="M 78 100 Q 70 130 75 175 L 125 175 Q 130 130 122 100 Z" fill={`url(#${id}-jers)`} stroke={darken(primary, 0.3)} strokeWidth="1.5"/>
        <text x="100" y="148" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="28" fill={accent} stroke={secondary} strokeWidth="1.2" paintOrder="stroke" fontWeight="800">{(team?.abbr ?? "H").charAt(0)}</text>
        {/* Belt */}
        <rect x="73" y="172" width="54" height="5" fill="#0a0d13"/>
      </g>

      {/* Glove arm */}
      <g className="pitcher-glove-arm">
        <path d={`M ${100 - 22 * flip} 110 Q ${100 - 40 * flip} 130 ${100 - 35 * flip} 150`} stroke={`url(#${id}-skin)`} strokeWidth="14" fill="none" strokeLinecap="round"/>
        {/* Glove */}
        <ellipse cx={`${100 - 35 * flip}`} cy="155" rx="14" ry="11" fill="#7c2d12" stroke="#3a1308" strokeWidth="1.5"/>
        <path d={`M ${100 - 42 * flip} 152 Q ${100 - 35 * flip} 147 ${100 - 28 * flip} 152`} stroke="#fcd34d" strokeWidth="1" fill="none"/>
      </g>

      {/* Pitching arm — animates with state */}
      <g className="pitcher-throwing-arm" style={{ transformOrigin: "100px 105px" }}>
        <path d={`M ${100 + 22 * flip} 110 Q ${100 + 50 * flip} 70 ${100 + 35 * flip} 30`} stroke={`url(#${id}-skin)`} strokeWidth="14" fill="none" strokeLinecap="round"/>
        {/* Ball in hand */}
        <circle cx={`${100 + 35 * flip}`} cy="28" r="6" fill="#ffffff" stroke="#0a0d13" strokeWidth="1"/>
        <path d={`M ${100 + 31 * flip} 26 Q ${100 + 35 * flip} 23 ${100 + 39 * flip} 26`} stroke="#dc2626" strokeWidth="0.8" fill="none"/>
        <path d={`M ${100 + 31 * flip} 30 Q ${100 + 35 * flip} 33 ${100 + 39 * flip} 30`} stroke="#dc2626" strokeWidth="0.8" fill="none"/>
      </g>

      {/* Head */}
      <g className="pitcher-head">
        <ellipse cx="100" cy="80" rx="18" ry="22" fill={`url(#${id}-skin)`}/>
        <circle cx="92" cy="78" r="1.6" fill="#0a0d13"/>
        <circle cx="108" cy="78" r="1.6" fill="#0a0d13"/>
        {/* Focused expression */}
        <path d="M 88 72 L 94 72 M 106 72 L 112 72" stroke="#3a2410" strokeWidth="2" strokeLinecap="round"/>
        <line x1="94" y1="90" x2="106" y2="90" stroke="#5a2222" strokeWidth="1.4" strokeLinecap="round"/>
      </g>

      {/* Cap */}
      <g className="pitcher-cap">
        <path d="M 78 64 Q 78 50 100 48 Q 122 50 122 64 L 124 70 L 76 70 Z" fill={`url(#${id}-jers)`} stroke={darken(primary, 0.3)} strokeWidth="1.2"/>
        {/* Cap brim */}
        <path d={`M 76 68 Q 100 78 124 68 L 126 73 Q 100 82 74 73 Z`} fill={primaryDark}/>
        {/* Logo */}
        <text x="100" y="63" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="14" fill={secondary} fontWeight="800">{(team?.abbr ?? "H").charAt(0)}</text>
        {/* Sheen */}
        <path d="M 84 56 Q 92 50 105 50" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none"/>
      </g>

      {/* State effects */}
      {state === "release" && (
        <path d={`M ${100 + 35 * flip} 28 Q ${100 + 70 * flip} 60 ${100 + 90 * flip} 140`} stroke={secondary} strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.6"/>
      )}
      {state === "strike" && (
        <text x="100" y="38" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="18" fill="#fbbf24" fontWeight="800">🔥</text>
      )}
      {state === "hrAllowed" && (
        <text x="100" y="38" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="18" fill="#f87171" fontWeight="800">😩</text>
      )}
    </svg>
  );
}
