// Catcher squatting behind the plate — drawn in the same style as BatterSprite/PitcherSprite.
// Used in the MLB The Show-style pitcher POV.
import type { Team } from "../store/types";
import { lighten, darken } from "../generators/colorUtils";

const SKIN_TONES = ["#f5d0b0","#ebbf9d","#dba884","#c89870","#b88560","#a8704a","#8f5a3a","#73442a","#5a3220","#3d2014"];

interface Props {
  team?: Team | null;
  size?: number;
  skinTone?: number;
}

export function CatcherSprite({ team, size = 180, skinTone = 2 }: Props) {
  const primary = team?.primary ?? "#1e3a8a";
  const secondary = team?.secondary ?? "#fbbf24";
  const skin = SKIN_TONES[skinTone % SKIN_TONES.length];
  const primaryLight = lighten(primary, 0.15);
  const primaryDark = darken(primary, 0.25);
  const id = `cs${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg viewBox="0 0 200 280" width={size} height={size * 1.4} aria-label="Catcher" className="catcher-sprite">
      <defs>
        <linearGradient id={`${id}-gear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryLight}/>
          <stop offset="100%" stopColor={primaryDark}/>
        </linearGradient>
        <linearGradient id={`${id}-pant`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f4f5"/>
          <stop offset="100%" stopColor="#a1a1aa"/>
        </linearGradient>
        <radialGradient id={`${id}-skin`} cx="50%" cy="40%">
          <stop offset="0%" stopColor={lighten(skin, 0.12)}/>
          <stop offset="100%" stopColor={skin}/>
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="270" rx="62" ry="6" fill="rgba(0,0,0,0.45)"/>

      {/* Shin guards (left + right) */}
      <g>
        <path d="M 55 240 L 50 200 Q 50 180 65 175 L 80 175 L 88 235 L 80 268 L 55 268 Z" fill={`url(#${id}-gear)`} stroke={darken(primary, 0.35)} strokeWidth="1.4"/>
        <path d="M 145 240 L 150 200 Q 150 180 135 175 L 120 175 L 112 235 L 120 268 L 145 268 Z" fill={`url(#${id}-gear)`} stroke={darken(primary, 0.35)} strokeWidth="1.4"/>
        {/* Shin guard ridges */}
        <path d="M 56 215 L 86 215 M 58 230 L 84 230 M 60 245 L 82 245" stroke={darken(primary, 0.45)} strokeWidth="1.2" fill="none"/>
        <path d="M 144 215 L 114 215 M 142 230 L 116 230 M 140 245 L 118 245" stroke={darken(primary, 0.45)} strokeWidth="1.2" fill="none"/>
      </g>

      {/* Pants (between shin guards) */}
      <path d="M 80 175 L 120 175 L 124 210 L 76 210 Z" fill={`url(#${id}-pant)`}/>

      {/* Squatting body — chest protector */}
      <g>
        <path d="M 64 100 Q 60 130 70 175 L 130 175 Q 140 130 136 100 Q 130 92 100 90 Q 70 92 64 100 Z" fill={`url(#${id}-gear)`} stroke={darken(primary, 0.35)} strokeWidth="1.4"/>
        {/* Chest protector segment lines */}
        <path d="M 70 115 Q 100 122 130 115 M 70 135 Q 100 142 130 135 M 70 155 Q 100 162 130 155" stroke={darken(primary, 0.4)} strokeWidth="1.2" fill="none"/>
        {/* Team accent stripe down the middle */}
        <rect x="96" y="98" width="8" height="80" fill={secondary} opacity="0.85"/>
      </g>

      {/* Glove (left side — receives the pitch) */}
      <g>
        <path d="M 38 130 Q 25 122 22 138 Q 20 158 38 162 Q 56 158 60 142 Q 56 128 38 130 Z" fill="#5a1f0a" stroke="#3a1308" strokeWidth="1.4"/>
        {/* Glove webbing */}
        <path d="M 30 138 Q 38 132 50 138 M 28 148 Q 38 142 52 148" stroke="#fcd34d" strokeWidth="1" fill="none" opacity="0.7"/>
        {/* Arm into glove */}
        <path d="M 64 115 Q 50 122 50 135" stroke={`url(#${id}-skin)`} strokeWidth="14" fill="none" strokeLinecap="round"/>
      </g>

      {/* Throwing arm hidden behind chest */}
      <path d="M 136 115 Q 150 125 145 145" stroke={`url(#${id}-skin)`} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.85"/>

      {/* Head with mask */}
      <g>
        {/* Skin under mask */}
        <ellipse cx="100" cy="72" rx="18" ry="22" fill={`url(#${id}-skin)`}/>
        {/* Catcher's mask — cage outline */}
        <path d="M 80 54 Q 80 42 100 42 Q 120 42 120 54 L 122 86 Q 100 96 78 86 Z" fill="none" stroke={darken(primary, 0.3)} strokeWidth="3"/>
        {/* Cage bars (vertical) */}
        <line x1="86" y1="58" x2="86" y2="88" stroke="#222" strokeWidth="1"/>
        <line x1="94" y1="56" x2="94" y2="92" stroke="#222" strokeWidth="1"/>
        <line x1="100" y1="55" x2="100" y2="93" stroke="#222" strokeWidth="1"/>
        <line x1="106" y1="56" x2="106" y2="92" stroke="#222" strokeWidth="1"/>
        <line x1="114" y1="58" x2="114" y2="88" stroke="#222" strokeWidth="1"/>
        {/* Cage bars (horizontal) */}
        <line x1="82" y1="64" x2="118" y2="64" stroke="#222" strokeWidth="1"/>
        <line x1="80" y1="74" x2="120" y2="74" stroke="#222" strokeWidth="1"/>
        <line x1="80" y1="84" x2="120" y2="84" stroke="#222" strokeWidth="1"/>
        {/* Helmet top */}
        <path d="M 80 54 Q 80 38 100 36 Q 120 38 120 54" fill={`url(#${id}-gear)`} stroke={darken(primary, 0.3)} strokeWidth="1.4"/>
        {/* Team logo letter on helmet */}
        <text x="100" y="50" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="11" fill={secondary} fontWeight="800">{(team?.abbr ?? "H").charAt(0)}</text>
      </g>
    </svg>
  );
}
