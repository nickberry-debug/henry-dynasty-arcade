// Mini-sprite painter - small top-down characters drawn procedurally.

import { TILE } from "./tileset";

export type Facing = "down" | "up" | "left" | "right";

export interface MiniSpriteSheet {
  frames: Record<Facing, [HTMLCanvasElement, HTMLCanvasElement]>;
}

function mk(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE; c.height = TILE;
  return c;
}

interface MiniOpts {
  skin?: string;
  top?: string;
  bot?: string;
  trim?: string;
  lantern?: boolean;
  role?: "innkeeper" | "shop" | "save" | "kid" | "elder" | "guard";
}

export function buildMiniSprite(opts: MiniOpts): MiniSpriteSheet {
  const skin = opts.skin ?? "#f3c891";
  const top = opts.top ?? "#3b66c9";
  const bot = opts.bot ?? "#2a3b5e";
  const trim = opts.trim ?? "#1f2a44";
  const lantern = !!opts.lantern;

  function draw(facing: Facing, walkPhase: 0 | 1): HTMLCanvasElement {
    const c = mk();
    const g = c.getContext("2d")!;
    g.fillStyle = top;
    g.fillRect(5, 6, 6, 5);
    g.fillStyle = trim;
    g.fillRect(5, 6, 6, 1);
    g.fillStyle = bot;
    g.fillRect(5, 11, 6, 3);
    g.fillStyle = trim;
    if (walkPhase === 0) {
      g.fillRect(5, 14, 2, 2);
      g.fillRect(9, 14, 2, 2);
    } else {
      g.fillRect(4, 14, 2, 2);
      g.fillRect(10, 14, 2, 2);
    }
    g.fillStyle = skin;
    g.fillRect(5, 1, 6, 5);
    g.fillStyle = trim;
    g.fillRect(5, 1, 6, 2);
    g.fillStyle = "#0a0a0a";
    if (facing === "down") {
      g.fillRect(6, 4, 1, 1); g.fillRect(9, 4, 1, 1);
    } else if (facing === "left") {
      g.fillRect(6, 4, 1, 1);
    } else if (facing === "right") {
      g.fillRect(9, 4, 1, 1);
    }
    if (lantern) {
      g.fillStyle = "#cbd5e1";
      g.fillRect(11, 8, 2, 3);
      g.fillStyle = "#fde68a";
      g.fillRect(11, 8, 2, 1);
      g.fillStyle = "#94a3b8";
      g.fillRect(11, 11, 2, 1);
    }
    g.strokeStyle = "rgba(0,0,0,0.3)";
    g.strokeRect(4.5, 0.5, 7, 14);
    return c;
  }

  return {
    frames: {
      down:  [draw("down", 0),  draw("down", 1)],
      up:    [draw("up", 0),    draw("up", 1)],
      left:  [draw("left", 0),  draw("left", 1)],
      right: [draw("right", 0), draw("right", 1)],
    },
  };
}

let liora: MiniSpriteSheet | null = null;
export function getLioraSprite(): MiniSpriteSheet {
  if (!liora) liora = buildMiniSprite({
    skin: "#f3c891", top: "#7c4dff", bot: "#2a1f48", trim: "#1a1232",
    lantern: true,
  });
  return liora;
}

const npcCache: Record<string, MiniSpriteSheet> = {};
export function getNpcSprite(tint: string | undefined, role: MiniOpts["role"]): MiniSpriteSheet {
  const key = (tint ?? "default") + "|" + (role ?? "");
  if (npcCache[key]) return npcCache[key];
  const sprite = buildMiniSprite({
    top: tint ?? "#94a3b8",
    bot: "#374151",
    trim: "#1f2937",
    role,
  });
  npcCache[key] = sprite;
  return sprite;
}
