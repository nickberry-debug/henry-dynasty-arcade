// Shared art manifest — single source of truth for the arcade's visual
// foundation. Maps logical asset names to file paths under
// /public/assets/kenney/.
//
// IMPORTANT: This registry is built to accept real Kenney.nl CC0 packs
// dropped into /public/assets/kenney/ (see ASSETS-README.md for the
// download list). Until those PNGs are present, every consumer falls
// back to the procedural renderers in this folder (ParticleSystem,
// ShadowRenderer, ParallaxBackground, etc.), so the arcade looks
// cohesive RIGHT NOW and gets *sharper* the moment real packs land —
// no code changes needed, just files.

export interface AssetEntry {
  /** Path under /public once the Kenney pack is installed. */
  path: string;
  /** True once the real file is confirmed present (flip per-asset as
   *  you drop packs in). Consumers check this to decide procedural vs
   *  real-art rendering. */
  installed: boolean;
}

/** Helper: build an entry. Defaults to not-installed so we use
 *  procedural fallbacks until you confirm the file exists. */
const a = (path: string, installed = false): AssetEntry => ({ path, installed });

export const KENNEY = {
  // Characters (Kenney "Toon Characters 1")
  character: {
    base:   a("/assets/kenney/toon-characters/character_base.png"),
    sheet:  a("/assets/kenney/toon-characters/character_sheet.png"),
  },
  // Platformer tiles (Kenney "Platformer Pack Redux")
  tiles: {
    terrain: a("/assets/kenney/platformer/terrain_sheet.png"),
    props:   a("/assets/kenney/platformer/props_sheet.png"),
  },
  // Parallax background elements (Kenney "Background Elements Redux")
  background: {
    hills:     a("/assets/kenney/backgrounds/hills.png"),
    trees:     a("/assets/kenney/backgrounds/trees.png"),
    clouds:    a("/assets/kenney/backgrounds/clouds.png"),
    mountains: a("/assets/kenney/backgrounds/mountains.png"),
  },
  // Sports (Kenney "Sports Pack")
  sports: {
    field:     a("/assets/kenney/sports/field_sheet.png"),
    equipment: a("/assets/kenney/sports/equipment_sheet.png"),
  },
  // Particles (Kenney "Particle Pack")
  particles: {
    smoke: a("/assets/kenney/particles/smoke.png", true),
    spark: a("/assets/kenney/particles/spark.png", true),
    star:  a("/assets/kenney/particles/star.png", true),
    magic: a("/assets/kenney/particles/magic.png", true),
  },
  // Smoke (Kenney "Smoke Particles") — natural-colour grayscale textures,
  // NOT meant to be tinted (they already have their own value range).
  smoke: {
    darkSmoke:  a("/assets/kenney/smoke/dark-smoke.png", true),
    whitePuff:  a("/assets/kenney/smoke/white-puff.png", true),
    explosion:  a("/assets/kenney/smoke/explosion.png", true),
    flash:      a("/assets/kenney/smoke/flash.png", true),
  },
  // UI (Kenney "UI Pack" + "RPG Expansion")
  ui: {
    panel:  a("/assets/kenney/ui/panel.png"),
    button: a("/assets/kenney/ui/button.png"),
    bar:    a("/assets/kenney/ui/bar.png"),
  },
} as const;

/** Programmatic recolor — tints a logical entity (fighter, team) with a
 *  hue without needing per-character PNGs. Used by procedural sprite
 *  renderers as the "6 distinct palettes" identity layer the prompt
 *  asks for. Returns a CSS filter string. */
export function tintFilter(hexAccent: string): string {
  // Convert accent hex → approximate hue-rotate + saturate. Cheap and
  // deterministic; good enough for per-fighter/per-team identity.
  const h = hexAccent.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return `saturate(1.25) hue-rotate(${Math.round(hue)}deg)`;
}

/** Whether the real Kenney foundation has been installed at all. UIs can
 *  read this to show a one-time "art packs not yet installed" hint in
 *  dev, and to decide global procedural-vs-real strategy. */
export function kenneyInstalled(): boolean {
  return KENNEY.character.base.installed || KENNEY.tiles.terrain.installed;
}
