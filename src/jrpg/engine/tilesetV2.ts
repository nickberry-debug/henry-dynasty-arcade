// AETHERSONG v2 overworld tileset — Kenney "Roguelike/RPG pack" (CC0).
// https://kenney.nl/assets/roguelike-rpg-pack
// 16x16 tiles, 1px margin (stride 17). Two contexts: town and dungeon.
//
// We pre-render each tile to a 16x16 canvas so the existing renderer can keep
// calling drawImage(tile, ...) exactly as it did with the procedural v1 tiles.

export const TILE_V2_SHEET = "/assets/jrpg/overworld-v2/roguelikeSheet_transparent.png";
const STRIDE = 17;
const TILE_PX = 16;

export interface TilesetV2 {
  loaded: boolean;
  // Two glyph→tile maps, one per location context.
  town: Record<string, HTMLCanvasElement>;
  dungeon: Record<string, HTMLCanvasElement>;
}

// (col, row) coords picked from the Kenney sheet — see scripts/inspect-tiles
// in this commit's PR description for the visual reference.
const TOWN_MAP: Record<string, [number, number]> = {
  ".": [5, 0],   // bright green grass
  ",": [6, 0],   // brown dirt path
  "W": [0, 1],   // solid water
  "S": [8, 0],   // tan sand (water beach in town)
  "#": [6, 2],   // brown brick wall (used very rarely in town)
  "B": [6, 2],   // brown brick (house body)
  "D": [26, 4],  // wooden door
  "r": [11, 0],  // orange/white striped awning (reads as a roof slope)
  "T": [13, 9],  // round green tree
  "F": [1, 7],   // grass + red flowers
  "X": [5, 0],   // grass base — silver Hush shimmer is composited on top
  "C": [34, 10], // closed wooden chest
};

const DUNGEON_MAP: Record<string, [number, number]> = {
  ".": [5, 13],  // gray cobblestone floor (corridor / passable)
  ",": [6, 13],  // brown stone floor variant (open room)
  "#": [6, 2],   // brown brick (wall)
  "B": [44, 10], // gray gravestone / altar (bell altar in boss room)
  "D": [26, 4],  // wooden door
  "C": [34, 10], // closed chest
  "S": [50, 9],  // silvery sigil — the chapel's save chime/shrine
};

const CACHE: TilesetV2 = {
  loaded: false,
  town: {},
  dungeon: {},
};

let sheetImg: HTMLImageElement | null = null;
let loadPromise: Promise<void> | null = null;

function cropTile(img: HTMLImageElement, col: number, row: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE_PX;
  c.height = TILE_PX;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, col * STRIDE, row * STRIDE, TILE_PX, TILE_PX, 0, 0, TILE_PX, TILE_PX);
  return c;
}

function compositeShimmer(base: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE_PX;
  c.height = TILE_PX;
  const ctx = c.getContext("2d");
  if (!ctx) return base;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0);
  // Silver Hush overlay — translucent radial wash + a few specular dots.
  const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 9);
  grad.addColorStop(0, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.7, "rgba(228,228,231,0.32)");
  grad.addColorStop(1, "rgba(228,228,231,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  ctx.fillStyle = "rgba(245,245,250,0.85)";
  ctx.fillRect(4, 4, 2, 2);
  ctx.fillRect(10, 9, 2, 2);
  ctx.fillRect(7, 12, 2, 2);
  return c;
}

function placeholder(color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE_PX;
  c.height = TILE_PX;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  return c;
}

function seedPlaceholders(): void {
  // Quick procedural fallback so the first frames don't render black.
  CACHE.town["."] = placeholder("#3a7d44");
  CACHE.town[","] = placeholder("#a78c61");
  CACHE.town["W"] = placeholder("#3b66c9");
  CACHE.town["S"] = placeholder("#e8d294");
  CACHE.town["#"] = placeholder("#5a5560");
  CACHE.town["B"] = placeholder("#7a5a36");
  CACHE.town["D"] = placeholder("#4a2d18");
  CACHE.town["r"] = placeholder("#9e3434");
  CACHE.town["T"] = placeholder("#1f4d28");
  CACHE.town["F"] = placeholder("#a76aab");
  CACHE.town["X"] = placeholder("#d4d4d8");
  CACHE.town["C"] = placeholder("#7a4a18");
  CACHE.dungeon["."] = placeholder("#7a7a82");
  CACHE.dungeon[","] = placeholder("#7a5a36");
  CACHE.dungeon["#"] = placeholder("#3e3a44");
  CACHE.dungeon["B"] = placeholder("#5a5560");
  CACHE.dungeon["D"] = placeholder("#4a2d18");
  CACHE.dungeon["C"] = placeholder("#7a4a18");
  CACHE.dungeon["S"] = placeholder("#fde68a");
}

export function getTilesetV2(): TilesetV2 { return CACHE; }

export function preloadTilesetV2(): Promise<void> {
  if (loadPromise) return loadPromise;
  seedPlaceholders();
  loadPromise = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      sheetImg = img;
      for (const [glyph, [col, row]] of Object.entries(TOWN_MAP)) {
        CACHE.town[glyph] = cropTile(img, col, row);
      }
      for (const [glyph, [col, row]] of Object.entries(DUNGEON_MAP)) {
        CACHE.dungeon[glyph] = cropTile(img, col, row);
      }
      // Hush shimmer is grass + overlay
      CACHE.town["X"] = compositeShimmer(CACHE.town["."]);
      CACHE.loaded = true;
      console.log("[AETHERSONG] tileset v2 (Kenney roguelike) loaded");
      resolve();
    };
    img.onerror = (err) => {
      console.warn("[AETHERSONG] tileset v2 sheet failed to load — staying on procedural fallback", err);
      resolve();
    };
    img.src = TILE_V2_SHEET;
  });
  return loadPromise;
}

// Convenience: the renderer asks for a glyph in a given context.
export function getV2Tile(context: "town" | "dungeon", glyph: string): HTMLCanvasElement | undefined {
  const ctxMap = context === "town" ? CACHE.town : CACHE.dungeon;
  return ctxMap[glyph];
}

// Marker used elsewhere so we can opt into v2 without touching every call site.
export const USE_V2_TILES = true;
