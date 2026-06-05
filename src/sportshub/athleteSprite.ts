// Map a team's crest primary color to a Kenney sports-pack athlete palette,
// then pick one of the 14 athlete variants deterministically by player id.
//
// The user vendored the Kenney sports-pack under
//   public/assets/kenney/sports-pack/PNG/{Blue,Red,Green,White,Special}/
//     character<Color> (<1..14>).png
// (Color/14 mirror what's on disk — note "Special" only has 12 variants,
//  and the filenames contain a literal space + parenthesised index.)

const PALETTES = ["Blue", "Red", "Green", "White"] as const;
type Palette = typeof PALETTES[number];

// Hex → palette bucket. Compares the team's primary against each palette's
// canonical RGB and picks the closest one. This means a navy-blue jersey gets
// Blue athletes, a brick-red gets Red, etc., without hand-mapping every team.
const PALETTE_RGB: Record<Palette, [number, number, number]> = {
  Blue:  [40,  90, 200],
  Red:   [200, 40,  40],
  Green: [40,  140, 60],
  White: [220, 220, 220],
};

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").trim();
  const v = m.length === 3
    ? m.split("").map(c => parseInt(c + c, 16))
    : [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  return [v[0] || 0, v[1] || 0, v[2] || 0];
}

function paletteForColor(hex: string): Palette {
  const [r, g, b] = hexToRgb(hex);
  let best: Palette = "Blue";
  let bestDist = Infinity;
  for (const p of PALETTES) {
    const [pr, pg, pb] = PALETTE_RGB[p];
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

// Tiny FNV-1a hash so we get a stable variant index per player id without
// pulling in a hash library.
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface AthleteSprite {
  url: string;
  palette: Palette;
  variant: number; // 1..14
}

/** Pick a sports-pack athlete sprite for this player on this team. */
export function athleteSpriteFor(playerId: string, teamPrimaryHex: string): AthleteSprite {
  const palette = paletteForColor(teamPrimaryHex);
  const variant = (hashId(playerId) % 14) + 1; // 1..14
  // The on-disk filename contains a space + parens, which need URL-encoding.
  const filename = `character${palette} (${variant}).png`;
  const url = `/assets/kenney/sports-pack/PNG/${palette}/${encodeURIComponent(filename)}`;
  return { url, palette, variant };
}
