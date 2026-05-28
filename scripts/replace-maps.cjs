/**
 * Replace the MAPS array in src/battleforge/presets.ts with the polish-pass
 * v2 set: exactly 6 maps, each with 8-20 environmental features.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "src", "battleforge", "presets.ts");
let src = fs.readFileSync(FILE, "utf8");

const startMarker = "export const MAPS: MapConfig[] = [";
const i = src.indexOf(startMarker);
if (i < 0) { console.error("MAPS marker not found"); process.exit(1); }

// World is 20×12 tiles. Place features sensibly.
//
// Layout helper — uniform random distribution is ugly; we hand-place each
// map so the dressing reads at a glance.

const NEW_MAPS = `export const MAPS: MapConfig[] = [
  // ─── 1. Castle Walls ────────────────────────────────────────────────────
  {
    id: "castle_walls",
    name: "Castle Walls",
    emoji: "🏰",
    description: "Twin gates of a stone keep crown a fenced bailey. The crows watch.",
    bgTop: "#2A1E14",
    bgBottom: "#0E0904",
    groundColor: "#8B7A5A",
    groundLineColor: "#6B5A40",
    accentColor: "#D4AF37",
    speedMultiplier: 1.0,
    terrainQuirk: "Stone walls + gates funnel attackers — choke points form naturally",
    features: [
      // central 3x3 castle keep at the top
      { kind: "castle",     x: 8, y: 1, w: 3, h: 3 },
      // two gates flanking the keep
      { kind: "gate",       x:  6, y: 2 },
      { kind: "gate",       x: 12, y: 2 },
      // perimeter fence along the bottom + sides
      { kind: "fence",      x:  1, y:  9 },
      { kind: "fence",      x:  4, y:  9 },
      { kind: "fence",      x:  7, y:  9 },
      { kind: "fence",      x: 10, y:  9 },
      { kind: "fence",      x: 13, y:  9 },
      { kind: "fence",      x: 16, y:  9 },
      // banner trees framing the keep
      { kind: "tree",       x:  3, y:  2 },
      { kind: "tree",       x: 15, y:  2 },
      // sentry watchtowers at the corners
      { kind: "watchtower", x:  2, y:  6, w: 1, h: 2 },
      { kind: "watchtower", x: 17, y:  6, w: 1, h: 2 },
    ],
  },

  // ─── 2. River Crossing ──────────────────────────────────────────────────
  {
    id: "river_crossing",
    name: "River Crossing",
    emoji: "🌉",
    description: "A wooden bridge spans the dividing river. Trees crowd both banks.",
    bgTop: "#0F1F2A",
    bgBottom: "#050D14",
    groundColor: "#2D5A2D",
    groundLineColor: "#1E3F1E",
    accentColor: "#9be3ff",
    speedMultiplier: 0.95,
    terrainQuirk: "The bridge is the only fast route — wade through to your peril",
    features: [
      // bridge crossing the central water band (horizontal across middle row)
      { kind: "bridge",     x:  8, y: 5, w: 4, h: 1 },
      // trees on north bank
      { kind: "tree",       x:  2, y: 2 },
      { kind: "tree",       x:  5, y: 1 },
      { kind: "tree",       x:  7, y: 3 },
      { kind: "tree",       x: 14, y: 2 },
      { kind: "tree",       x: 17, y: 1 },
      // trees on south bank
      { kind: "tree",       x:  3, y: 8 },
      { kind: "tree",       x:  6, y: 9 },
      { kind: "tree",       x: 13, y: 8 },
      { kind: "tree",       x: 16, y: 9 },
      { kind: "tree",       x: 18, y: 8 },
      // a few rocks scattered near the bridge approach
      { kind: "rock",       x:  7, y: 5 },
      { kind: "rock",       x: 12, y: 5 },
    ],
  },

  // ─── 3. Stone Forest ────────────────────────────────────────────────────
  {
    id: "stone_forest",
    name: "Stone Forest",
    emoji: "🌲",
    description: "Crooked pines crowd weathered standing stones. Cover everywhere — sight lines nowhere.",
    bgTop: "#0A1A0A",
    bgBottom: "#050D05",
    groundColor: "#3F8A3F",
    groundLineColor: "#2D5A2D",
    accentColor: "#7FFF00",
    speedMultiplier: 0.95,
    terrainQuirk: "Dense cover breaks lines of sight — ranged units must close distance",
    features: [
      // scattered rocks
      { kind: "rock", x:  3, y:  2 },
      { kind: "rock", x:  6, y:  3 },
      { kind: "rock", x:  4, y:  7 },
      { kind: "rock", x: 11, y:  2 },
      { kind: "rock", x: 14, y:  6 },
      { kind: "rock", x: 17, y:  3 },
      { kind: "rock", x: 15, y:  9 },
      // scattered trees
      { kind: "tree", x:  2, y:  4 },
      { kind: "tree", x:  5, y:  5 },
      { kind: "tree", x:  8, y:  2 },
      { kind: "tree", x:  9, y:  7 },
      { kind: "tree", x: 12, y:  4 },
      { kind: "tree", x: 13, y:  8 },
      { kind: "tree", x: 16, y:  6 },
      { kind: "tree", x: 18, y:  9 },
      { kind: "tree", x:  7, y:  9 },
      { kind: "tree", x: 10, y:  9 },
    ],
  },

  // ─── 4. Watchtower Hill ─────────────────────────────────────────────────
  {
    id: "watchtower_hill",
    name: "Watchtower Hill",
    emoji: "🗼",
    description: "A lone watchtower commands the rise. Old walls hint at battles long past.",
    bgTop: "#1A2030",
    bgBottom: "#05080F",
    groundColor: "#7A8A6A",
    groundLineColor: "#5A6A4A",
    accentColor: "#FFD700",
    speedMultiplier: 1.0,
    terrainQuirk: "High ground favours the bold — control the centre, control the field",
    features: [
      // central 2x2 watchtower
      { kind: "watchtower", x:  9, y: 5, w: 2, h: 2 },
      // ring of low walls around the tower
      { kind: "wall",       x:  7, y:  4 },
      { kind: "wall",       x: 12, y:  4 },
      { kind: "wall",       x:  7, y:  7 },
      { kind: "wall",       x: 12, y:  7 },
      // a few rocks dotting the slopes
      { kind: "rock",       x:  3, y:  3 },
      { kind: "rock",       x: 16, y:  2 },
      { kind: "rock",       x:  4, y:  9 },
      { kind: "rock",       x: 17, y:  9 },
      // sentry trees marking the approach paths
      { kind: "tree",       x:  2, y:  6 },
      { kind: "tree",       x: 18, y:  6 },
      // a wooden fence section across the south approach
      { kind: "fence",      x:  8, y: 10 },
      { kind: "fence",      x: 11, y: 10 },
    ],
  },

  // ─── 5. Open Plains ─────────────────────────────────────────────────────
  {
    id: "open_plains",
    name: "Open Plains",
    emoji: "🌾",
    description: "Wind, grass, sky. Wooden corrals break the horizon. Nothing to hide behind.",
    bgTop: "#1A3A1A",
    bgBottom: "#0D1F0D",
    groundColor: "#5A8A3A",
    groundLineColor: "#3A6A2A",
    accentColor: "#4ADE80",
    speedMultiplier: 1.1,
    terrainQuirk: "Flat open ground — ranged units rule, cavalry rules harder",
    features: [
      // a corral (rectangle of fence) on the west
      { kind: "fence", x:  2, y:  3 },
      { kind: "fence", x:  3, y:  3 },
      { kind: "fence", x:  4, y:  3 },
      { kind: "fence", x:  2, y:  5 },
      { kind: "fence", x:  3, y:  5 },
      { kind: "fence", x:  4, y:  5 },
      // a second corral on the east
      { kind: "fence", x: 15, y:  7 },
      { kind: "fence", x: 16, y:  7 },
      { kind: "fence", x: 17, y:  7 },
      { kind: "fence", x: 15, y:  9 },
      { kind: "fence", x: 16, y:  9 },
      { kind: "fence", x: 17, y:  9 },
      // sparse rocks across the plain
      { kind: "rock",  x:  8, y:  2 },
      { kind: "rock",  x: 11, y:  4 },
      { kind: "rock",  x:  9, y:  8 },
      { kind: "rock",  x: 13, y:  6 },
    ],
  },

  // ─── 6. Ruins ───────────────────────────────────────────────────────────
  {
    id: "ruins",
    name: "Ruins",
    emoji: "🏚️",
    description: "Toppled stone, broken walls, withered trees. Something killed this place. Long ago.",
    bgTop: "#1A0E1A",
    bgBottom: "#0A050A",
    groundColor: "#5A4A3A",
    groundLineColor: "#3A2A1A",
    accentColor: "#9370DB",
    speedMultiplier: 0.9,
    terrainQuirk: "Rubble and ghost-walls slow movement, but the broken sight-lines reward cunning",
    features: [
      // broken wall stubs
      { kind: "ruins",  x:  3, y:  2 },
      { kind: "ruins",  x:  4, y:  2 },
      { kind: "ruins",  x:  3, y:  3 },
      { kind: "ruins",  x: 14, y:  3 },
      { kind: "ruins",  x: 15, y:  3 },
      { kind: "ruins",  x: 16, y:  4 },
      { kind: "ruins",  x:  6, y:  8 },
      { kind: "ruins",  x:  7, y:  8 },
      { kind: "ruins",  x: 12, y:  9 },
      // fallen stones
      { kind: "rock",   x:  9, y:  4 },
      { kind: "rock",   x: 11, y:  6 },
      { kind: "rock",   x:  5, y:  6 },
      { kind: "rock",   x: 16, y:  8 },
      // withered (still drawn as a tree, the renderer tints them based on map id)
      { kind: "tree",   x:  2, y:  9 },
      { kind: "tree",   x: 10, y:  2 },
      { kind: "tree",   x: 18, y:  6 },
    ],
  },
];
`;

const newSrc = src.slice(0, i) + NEW_MAPS;
fs.writeFileSync(FILE, newSrc);
console.log("Replaced MAPS array. New file length:", newSrc.length);
