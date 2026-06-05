// Unified asset manifest — single source of truth mapping LOGICAL names
// (intent) → actual file paths under /public/assets. Every game references
// assets by intent, not by path, so re-organizing files never breaks a game.
//
// Population sources:
//   • Kenney CC0 packs (dropped into /public/assets/kenney/…)
//   • game-icons.net CC-BY 3.0 SVGs (auto-fetched by scripts/fetch-assets.mjs;
//     attribution auto-logged to /public/assets/ATTRIBUTION.md)
//   • Procedural systems in this folder (ParticleSystem, ParallaxBackground,
//     ShadowRenderer, LightingOverlay) — no files needed.
//
// `scripts/verify-assets.mjs` checks that every `file:`-backed entry here
// resolves to a real file on disk.

const GI = "/assets/game-icons";       // CC-BY 3.0 (game-icons.net mirror)
const K = "/assets/kenney";            // CC0 (Kenney + curated)

export const ASSETS = {
  // ── Characters / sprites (CC0) ──────────────────────────────────────────
  characters: {
    // Kenney Mini Characters — isometric, used in Battle Forge.
    miniMale:   (l: "a"|"b"|"c"|"d"|"e"|"f") => `${K}/mini/character-male-${l}.png`,
    miniFemale: (l: "a"|"b"|"c"|"d"|"e"|"f") => `${K}/mini/character-female-${l}.png`,
  },

  // ── Arena / tiles / scenery (CC0) ───────────────────────────────────────
  scenery: {
    arenaFloor:  `${K}/mini-arena/floor.png`,
    arenaWall:   `${K}/mini-arena/wall.png`,
    arenaColumn: `${K}/mini-arena/column.png`,
    arenaStatue: `${K}/mini-arena/statue.png`,
    arenaBanner: `${K}/mini-arena/banner.png`,
    arenaTree:   `${K}/mini-arena/tree.png`,
    arenaTrophy: `${K}/mini-arena/trophy.png`,
    arenaRack:   `${K}/mini-arena/weapon-rack.png`,
    arenaStairs: `${K}/mini-arena/stairs.png`,
  },

  // ── Particles (CC0 textures; procedural fallback in ParticleSystem) ──────
  particles: {
    magic: `${K}/particles/magic.png`,
    spark: `${K}/particles/spark.png`,
    star:  `${K}/particles/star.png`,
    smoke: `${K}/particles/smoke.png`,
    smokeDark:  `${K}/smoke/dark-smoke.png`,
    smokeLight: `${K}/smoke/white-puff.png`,
    explosion:  `${K}/smoke/explosion.png`,
    flash:      `${K}/smoke/flash.png`,
  },

  // ── Space (CC0) — Cosmic Squad set dressing ─────────────────────────────
  space: {
    meteor: (n: 1|2|3|4) => `${K}/space/meteor-00${n}.png`,
    explosion: `${K}/space/explosion.png`,
  },

  // ── Sports equipment (CC0) ──────────────────────────────────────────────
  sports: {
    bat:        `${K}/sports/bat_wood.png`,
    baseball:   `${K}/sports/ball_baseball.png`,
    glove:      `${K}/sports/glove.png`,
    helmet:     `${K}/sports/helmet_white1.png`,
    football:   `${K}/sports/ball_football.png`,
    soccer:     `${K}/sports/ball_soccer1.png`,
    basketball: `${K}/sports/ball_basket1.png`,
    tennis:     `${K}/sports/ball_tennis1.png`,
  },

  // ── Fantasy UI frames (CC0) — Olympus ───────────────────────────────────
  ui: {
    divider: (n: 0|1|2|3|4|5) => `${K}/fui/divider-00${n}.png`,
    panelFrame: `${K}/fui/panel-frame.png`,
  },

  // ── Icons (CC-BY 3.0, game-icons.net — see ATTRIBUTION.md) ───────────────
  icons: {
    play:      `${GI}/gamepad-cross.svg`,
    console:   `${GI}/game-console.svg`,
    trophy:    `${GI}/trophy.svg`,
    podium:    `${GI}/podium.svg`,
    swords:    `${GI}/crossed-swords.svg`,
    lightning: `${GI}/lightning-tree.svg`,
    burst:     `${GI}/embrassed-energy.svg`,
    bat:       `${GI}/baseball-bat.svg`,
    glove:     `${GI}/baseball-glove.svg`,
    football:  `${GI}/american-football-ball.svg`,
    whistle:   `${GI}/whistle.svg`,
    temple:    `${GI}/greek-temple.svg`,
    helmet:    `${GI}/spartan-helmet.svg`,
    zeus:      `${GI}/zeus-sword.svg`,
    rocket:    `${GI}/rocket.svg`,
    hourglass: `${GI}/hourglass.svg`,
    clapper:   `${GI}/clapperboard.svg`,
    film:      `${GI}/film-strip.svg`,
    chat:      `${GI}/chat-bubble.svg`,
    book:      `${GI}/book-cover.svg`,
    cap:       `${GI}/graduate-cap.svg`,
    flask:     `${GI}/bubbling-flask.svg`,
    potion:    `${GI}/potion-ball.svg`,
    swirl:     `${GI}/magic-swirl.svg`,
  },
} as const;

/** Flat list of every concrete file path the manifest references, for the
 *  verifier. Resolver functions are sampled across their input domain. */
export function allAssetPaths(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") { out.push(v); return; }
    if (typeof v === "function") {
      // Sample resolver functions over a small input set.
      for (const arg of ["a", "b", "c", "d", "e", "f", 0, 1, 2, 3, 4, 5]) {
        try { const r = (v as (x: unknown) => unknown)(arg); if (typeof r === "string") out.push(r); } catch { /* skip */ }
      }
      return;
    }
    if (v && typeof v === "object") for (const k of Object.values(v)) walk(k);
  };
  walk(ASSETS);
  return [...new Set(out)];
}
