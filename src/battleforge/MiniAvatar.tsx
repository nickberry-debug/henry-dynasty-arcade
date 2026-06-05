// MiniAvatar — renders one of Kenney's CC0 "Mini Characters" (isometric
// 3D-rendered, 64x64). Chosen for Battle Forge because it shares the exact
// isometric projection and art family as the "Mini Arena" scenery pack —
// so characters and set-dressing read as one cohesive world (the flat
// side-view Toon pack clashed with the iso battlefield).
//
// The pack has 12 generic characters (male a-f, female a-f), so it's weaker
// at evoking a SPECIFIC fighter than the archetype-rich Toon pack. We
// compensate two ways: (1) hue-tint each mini toward the fighter's primary
// palette colour, and (2) keep the fighter's emoji as a badge for canonical
// identity. Used in static contexts (title roster, MVP card) — the pack
// ships single-angle previews, not 4-facing animation frames, so it's not
// a drop-in for the live in-combat units.

const MALE = ["a", "b", "c", "d", "e", "f"] as const;
const FEMALE = ["a", "b", "c", "d", "e", "f"] as const;

export interface MiniInput {
  id?: string;
  name?: string;
  category?: string;
  emoji?: string;
  attackType?: string;
  color?: string;
}

/** Stable FNV-1a hash → 0..n-1. */
function hashIdx(seed: string, n: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % n;
}

/** Pick a mini character file for a fighter. Female-coded names get a female
 *  model; everyone else gets a male model. Within each gender the specific
 *  letter is chosen by a stable hash of the fighter id/name so the same
 *  fighter always shows the same mini. */
export function pickMiniFile(c: MiniInput): string {
  const bag = `${c.id || ""} ${c.name || ""} ${c.category || ""}`.toLowerCase();
  const female = /(\bshe[- ]|\bwoman\b|\bgirl\b|queen|princess|lady|sister|witch|valkyrie|amazon|mulan|joan|cleopatra|harley|wonder ?woman|sailor|leia|hermione|elsa|moana|\brey\b|black widow|catwoman|supergirl|batgirl|she-?ra|\bms\.?\b|\bmrs\.?\b|female)/.test(bag);
  const seed = c.id || c.name || "x";
  if (female) return `character-female-${FEMALE[hashIdx(seed, FEMALE.length)]}`;
  return `character-male-${MALE[hashIdx(seed, MALE.length)]}`;
}

/** Hue-rotate/saturate filter pushing a mini toward the fighter's colour. */
export function miniTint(hex?: string): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return "saturate(0.6) brightness(0.98)";
  const d = max - min;
  let hue = 0;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  // Mini characters average roughly a warm/orange hue (~30); rotate to target.
  const rot = Math.round(((hue - 30) + 360) % 360);
  return `saturate(1.15) hue-rotate(${rot}deg)`;
}

interface AvatarProps {
  fighter: MiniInput;
  /** Drawn size in px (square — the source is 64x64 iso). */
  size?: number;
  /** Render a small floor tile beneath the character for grounded iso look. */
  onFloor?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function MiniAvatar({ fighter, size = 72, onFloor = false, className, style }: AvatarProps) {
  const file = pickMiniFile(fighter);
  const tint = miniTint(fighter.color);
  return (
    <div className={className} style={{ position: "relative", width: size, height: size, ...style }}>
      {onFloor && (
        <img src="/assets/kenney/mini-arena/floor.png" alt="" aria-hidden="true" draggable={false}
          style={{
            position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)",
            width: size * 0.92, height: size * 0.92, imageRendering: "pixelated",
            objectFit: "contain", opacity: 0.95,
          }} />
      )}
      <img src={`/assets/kenney/mini/${file}.png`} alt="" aria-hidden="true" draggable={false}
        style={{
          position: "absolute", left: "50%", bottom: onFloor ? size * 0.16 : 0,
          transform: "translateX(-50%)",
          width: size, height: size, imageRendering: "pixelated", objectFit: "contain",
          filter: `${tint} drop-shadow(0 3px 8px rgba(0,0,0,0.45))`.trim(),
        }} />
    </div>
  );
}

/** A single mini character by index 0..11 (decorative, no fighter binding). */
export function MiniSample({ idx, size = 64, style }: { idx: number; size?: number; style?: React.CSSProperties }) {
  const all = [...MALE.map(l => `character-male-${l}`), ...FEMALE.map(l => `character-female-${l}`)];
  const file = all[((idx % all.length) + all.length) % all.length];
  return (
    <img src={`/assets/kenney/mini/${file}.png`} alt="" aria-hidden="true" draggable={false}
      style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "contain", ...style }} />
  );
}

/** Arena scenery prop (floor/wall/column/statue/banner/tree/trophy/etc). */
export function ArenaProp({ name, size = 56, style }: {
  name: "floor" | "wall" | "column" | "statue" | "banner" | "tree" | "trophy" | "weapon-rack" | "stairs";
  size?: number; style?: React.CSSProperties;
}) {
  return (
    <img src={`/assets/kenney/mini-arena/${name}.png`} alt="" aria-hidden="true" draggable={false}
      style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "contain", ...style }} />
  );
}

export const MINI_COUNT = 12;
