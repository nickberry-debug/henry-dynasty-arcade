// Procedural overworld tileset.

export const TILE = 16;

export interface TileCanvases {
  by: Record<string, HTMLCanvasElement>;
}

function mk(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE; c.height = TILE;
  return c;
}

function noise(ctx: CanvasRenderingContext2D, base: string, dark: string, light: string, density = 0.4): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < TILE * TILE * density; i += 1) {
    const x = Math.floor(Math.random() * TILE);
    const y = Math.floor(Math.random() * TILE);
    ctx.fillStyle = Math.random() < 0.5 ? dark : light;
    ctx.fillRect(x, y, 1, 1);
  }
}

function rectBorder(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE, 1);
  ctx.fillRect(0, TILE - 1, TILE, 1);
  ctx.fillRect(0, 0, 1, TILE);
  ctx.fillRect(TILE - 1, 0, 1, TILE);
}

export function buildTileset(): TileCanvases {
  const by: Record<string, HTMLCanvasElement> = {};

  const grass = mk();
  {
    const g = grass.getContext("2d")!;
    noise(g, "#3a7d44", "#2e6638", "#4f9457", 0.5);
    for (let i = 0; i < 4; i += 1) {
      const x = Math.floor(Math.random() * (TILE - 2));
      const y = Math.floor(Math.random() * (TILE - 2));
      g.fillStyle = "#79c47b";
      g.fillRect(x, y, 2, 1);
      g.fillRect(x, y + 1, 1, 1);
    }
  }
  by["."] = grass;

  const path = mk();
  { const g = path.getContext("2d")!; noise(g, "#a78c61", "#856a44", "#cdb088", 0.5); }
  by[","] = path;

  const water = mk();
  {
    const g = water.getContext("2d")!;
    noise(g, "#3b66c9", "#2851ad", "#5d86e3", 0.6);
    g.fillStyle = "#9bb8ef";
    g.fillRect(2, 6, 4, 1);
    g.fillRect(10, 10, 4, 1);
  }
  by["W"] = water;

  const sand = mk();
  { const g = sand.getContext("2d")!; noise(g, "#e8d294", "#bfa86d", "#fbecbe", 0.4); }
  by["S"] = sand;

  const wall = mk();
  {
    const g = wall.getContext("2d")!;
    noise(g, "#5a5560", "#3e3a44", "#766f7d", 0.5);
    g.fillStyle = "#2c2930";
    g.fillRect(0, 0, TILE, 1);
    g.fillRect(0, TILE - 1, TILE, 1);
    g.fillRect(0, 0, 1, TILE);
    g.fillRect(TILE - 1, 0, 1, TILE);
    g.fillRect(0, 7, TILE, 1);
    g.fillRect(8, 0, 1, 7);
    g.fillRect(4, 8, 1, 7);
  }
  by["#"] = wall;

  const bwall = mk();
  {
    const g = bwall.getContext("2d")!;
    noise(g, "#7a5a36", "#5a3e24", "#a17a4e", 0.4);
    g.fillStyle = "#3a2818";
    g.fillRect(0, 0, TILE, 1);
    g.fillRect(0, TILE - 1, TILE, 1);
  }
  by["B"] = bwall;

  const door = mk();
  {
    const g = door.getContext("2d")!;
    noise(g, "#4a2d18", "#2a1808", "#6a4128", 0.3);
    g.fillStyle = "#fbbf24";
    g.fillRect(11, 8, 1, 1);
    rectBorder(g, "#1a0c04");
  }
  by["D"] = door;

  const roof = mk();
  {
    const g = roof.getContext("2d")!;
    noise(g, "#9e3434", "#742323", "#c25151", 0.4);
    g.fillStyle = "#4a1010";
    g.fillRect(0, 0, TILE, 2);
    g.fillRect(0, TILE - 1, TILE, 1);
    g.fillRect(0, 8, TILE, 1);
  }
  by["r"] = roof;

  const tree = mk();
  {
    const g = tree.getContext("2d")!;
    noise(g, "#3a7d44", "#2e6638", "#4f9457", 0.5);
    g.fillStyle = "#4a2d18";
    g.fillRect(7, 9, 2, 5);
    g.fillStyle = "#1f4d28";
    g.fillRect(3, 2, 10, 7);
    g.fillStyle = "#2e6e3a";
    g.fillRect(4, 3, 8, 5);
    g.fillStyle = "#4d9054";
    g.fillRect(5, 4, 5, 3);
    g.fillStyle = "#7ec077";
    g.fillRect(6, 5, 2, 1);
  }
  by["T"] = tree;

  const flower = mk();
  {
    const g = flower.getContext("2d")!;
    noise(g, "#3a7d44", "#2e6638", "#4f9457", 0.5);
    const dots: [number, number, string][] = [
      [3, 4, "#f472b6"], [9, 3, "#fde68a"], [6, 8, "#a78bfa"],
      [11, 10, "#f97316"], [4, 12, "#fde68a"],
    ];
    dots.forEach(([x, y, c]) => { g.fillStyle = c; g.fillRect(x, y, 2, 2); });
  }
  by["F"] = flower;

  const hush = mk();
  {
    const g = hush.getContext("2d")!;
    noise(g, "#3a7d44", "#2e6638", "#4f9457", 0.5);
    g.fillStyle = "#d4d4d8";
    g.globalAlpha = 0.6;
    g.fillRect(2, 2, 12, 12);
    g.globalAlpha = 1;
    g.fillStyle = "#f5f5f5";
    g.fillRect(4, 4, 2, 2);
    g.fillRect(10, 8, 2, 2);
    g.fillRect(7, 11, 2, 2);
  }
  by["X"] = hush;

  const chest = mk();
  {
    const g = chest.getContext("2d")!;
    noise(g, "#5a5560", "#3e3a44", "#766f7d", 0.5);
    g.fillStyle = "#7a4a18";
    g.fillRect(3, 5, 10, 8);
    g.fillStyle = "#a07028";
    g.fillRect(3, 5, 10, 2);
    g.fillStyle = "#fbbf24";
    g.fillRect(8, 9, 1, 2);
    rectBorder(g, "#1c1208");
  }
  by["C"] = chest;

  // Note: "B" was bwall above. We use the same "B" code for the bell-altar in
  // dungeon-boss; since the dungeon never has houses, that's fine.

  const shrine = mk();
  {
    const g = shrine.getContext("2d")!;
    noise(g, "#5a5560", "#3e3a44", "#766f7d", 0.5);
    g.fillStyle = "#fde68a";
    g.fillRect(7, 5, 2, 6);
    g.fillRect(5, 7, 6, 2);
    g.fillStyle = "#fef3c7";
    g.fillRect(7, 7, 2, 2);
  }
  by["S"] = shrine;

  return { by };
}

let cached: TileCanvases | null = null;
export function getTileset(): TileCanvases {
  if (!cached) cached = buildTileset();
  return cached;
}
