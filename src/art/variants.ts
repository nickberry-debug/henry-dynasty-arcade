// variants.ts — palette-swap / recolor system. Turns ONE base sprite into
// many distinct-looking characters (per fighter, per team, per region) with
// zero extra downloads, by deriving a CSS filter that pushes a sprite's
// hue toward a target accent color.
//
// Consolidates the tint logic that previously lived inline in MiniAvatar,
// the (removed) ToonAvatar, and kenney-manifest, into one reusable place.

/** Parse #rrggbb → [r,g,b] 0..1, or null if invalid. */
function rgb01(hex?: string): [number, number, number] | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

/** Hue (0..360) of a color, or null for greys. */
function hueOf(hex?: string): number | null {
  const c = rgb01(hex);
  if (!c) return null;
  const [r, g, b] = c;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return null; // grey — no hue
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/**
 * CSS filter that recolors a sprite toward `targetHex`.
 * @param targetHex  desired accent color (#rrggbb)
 * @param baseHue    the sprite art's dominant hue (defaults to ~30°, the
 *                   warm/orange average of Kenney's mini + toon art)
 * @param sat        saturation multiplier
 */
export function recolorFilter(targetHex?: string, baseHue = 30, sat = 1.15): string {
  const h = hueOf(targetHex);
  if (h === null) return "saturate(0.6) brightness(0.98)"; // grey target → desaturate
  const rot = Math.round(((h - baseHue) + 360) % 360);
  return `saturate(${sat}) hue-rotate(${rot}deg)`;
}

/** Stable FNV-1a hash → 0..n-1, for deterministically assigning a base
 *  sprite/variant to a logical entity (fighter id, team id, …). */
export function variantIndex(seed: string, n: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % n;
}

/** Convenience: a drop-shadow + recolor filter string for sprite <img>s. */
export function spriteFilter(targetHex?: string, baseHue = 30): string {
  return `${recolorFilter(targetHex, baseHue)} drop-shadow(0 3px 8px rgba(0,0,0,0.45))`;
}
