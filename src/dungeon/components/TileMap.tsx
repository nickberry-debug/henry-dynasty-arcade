// components/TileMap.tsx — Canvas2D dungeon renderer.
//
// Mounts a single <canvas>, redraws on store changes via useEffect.
// Renders: tiles + fog of war + enemies + drops + hero + floating text.
// No framer-motion (60fps loop) — the canvas is the renderer.

import { useEffect, useRef } from "react";
import type { DungeonMap, DungeonRun, Hero } from "../types";
import { getSprite, warmSprites, TILE_SIZE, SpriteId } from "./SpriteFactory";

interface TileMapProps {
  run: DungeonRun;
  hero: Hero;
  /** Optional hover position from cursor (in tile coords). */
  hover?: { x: number; y: number } | null;
  onTileClick?: (x: number, y: number) => void;
}

const VIEW_TILES_X = 22; // visible columns
const VIEW_TILES_Y = 16; // visible rows
const CANVAS_W = VIEW_TILES_X * TILE_SIZE;
const CANVAS_H = VIEW_TILES_Y * TILE_SIZE;

function enemySpriteId(templateId: string): SpriteId {
  if (templateId === "dungeon_lord") return "boss";
  if (["rat", "goblin", "skeleton", "orc", "archer", "shaman", "troll", "spider", "wraith", "knight"].includes(templateId)) {
    return templateId as SpriteId;
  }
  return "goblin";
}

function heroSpriteId(classId: Hero["classId"]): SpriteId {
  return classId;
}

export function TileMap({ run, hero, hover, onTileClick }: TileMapProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  // Warm sprite cache once.
  useEffect(() => { warmSprites(); }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !run.map) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const map = run.map;
    const camX = Math.max(0, Math.min(map.width - VIEW_TILES_X, run.px - VIEW_TILES_X / 2));
    const camY = Math.max(0, Math.min(map.height - VIEW_TILES_Y, run.py - VIEW_TILES_Y / 2));

    // Bg
    ctx.fillStyle = "#0d0c18"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Tiles
    for (let vy = 0; vy < VIEW_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEW_TILES_X; vx++) {
        const mx = vx + camX, my = vy + camY;
        if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) continue;
        const t = map.tiles[my * map.width + mx];
        if (!t.seen) continue;
        const px = vx * TILE_SIZE, py = vy * TILE_SIZE;
        let spriteId: SpriteId = "floor";
        if (t.kind === "wall") spriteId = "wall";
        else if (t.kind === "stairsDown") spriteId = "stairsDown";
        else if (t.kind === "chest") spriteId = "chest";
        else if (t.kind === "shrine") spriteId = "shrine";
        else if (t.kind === "door") spriteId = "door";
        ctx.drawImage(getSprite(spriteId), px, py);
        // Fog overlay for seen-but-not-visible
        if (!t.visible) {
          ctx.fillStyle = "rgba(5,3,8,0.55)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Drops
    for (const d of run.drops) {
      const vx = d.x - camX, vy = d.y - camY;
      if (vx < 0 || vy < 0 || vx >= VIEW_TILES_X || vy >= VIEW_TILES_Y) continue;
      const t = map.tiles[d.y * map.width + d.x];
      if (!t || !t.visible) continue;
      ctx.drawImage(getSprite(d.kind === "gold" ? "gold" : "item"), vx * TILE_SIZE, vy * TILE_SIZE);
    }

    // Enemies
    for (const e of run.enemies) {
      const vx = e.x - camX, vy = e.y - camY;
      if (vx < 0 || vy < 0 || vx >= VIEW_TILES_X || vy >= VIEW_TILES_Y) continue;
      const t = map.tiles[e.y * map.width + e.x];
      if (!t || !t.visible) continue;
      const spr = getSprite(enemySpriteId(e.templateId));
      const isBoss = e.templateId === "dungeon_lord";
      const px = vx * TILE_SIZE - (isBoss ? 6 : 0);
      const py = vy * TILE_SIZE - (isBoss ? 6 : 0);
      ctx.drawImage(spr, px, py);
      // HP bar
      const pct = e.hp / e.maxHp;
      ctx.fillStyle = "#0f172a"; ctx.fillRect(vx * TILE_SIZE + 2, vy * TILE_SIZE - 3, TILE_SIZE - 4, 3);
      ctx.fillStyle = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#fbbf24" : "#dc2626";
      ctx.fillRect(vx * TILE_SIZE + 3, vy * TILE_SIZE - 2, (TILE_SIZE - 6) * pct, 1);
      // Status icons
      if (e.statuses.length) {
        ctx.fillStyle = "#c084fc";
        ctx.fillRect(vx * TILE_SIZE + TILE_SIZE - 4, vy * TILE_SIZE, 3, 3);
      }
    }

    // Hero
    {
      const vx = run.px - camX, vy = run.py - camY;
      ctx.drawImage(getSprite(heroSpriteId(hero.classId)), vx * TILE_SIZE, vy * TILE_SIZE);
      // Hero glow ring
      ctx.strokeStyle = "rgba(253, 224, 71, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(vx * TILE_SIZE + 1, vy * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // Hover highlight
    if (hover) {
      const vx = hover.x - camX, vy = hover.y - camY;
      if (vx >= 0 && vy >= 0 && vx < VIEW_TILES_X && vy < VIEW_TILES_Y) {
        ctx.strokeStyle = "rgba(192, 132, 252, 0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }, [run, hero, hover]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onTileClick) return;
    const canvas = ref.current;
    if (!canvas || !run.map) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const vx = Math.floor(cx / TILE_SIZE);
    const vy = Math.floor(cy / TILE_SIZE);
    const camX = Math.max(0, Math.min(run.map.width - VIEW_TILES_X, run.px - VIEW_TILES_X / 2));
    const camY = Math.max(0, Math.min(run.map.height - VIEW_TILES_Y, run.py - VIEW_TILES_Y / 2));
    onTileClick(vx + camX, vy + camY);
  }

  return (
    <canvas
      ref={ref}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={handleClick}
      className="block rounded-lg"
      style={{
        width: "100%",
        maxWidth: CANVAS_W * 2,
        imageRendering: "pixelated",
        background: "#0d0c18",
        border: "1px solid rgba(192, 132, 252, 0.25)",
        boxShadow: "0 0 40px rgba(124, 58, 237, 0.18) inset",
      }}
      aria-label={`Dungeon floor ${run.floor}`}
    />
  );
}

/** Mini-map for HUD. */
export function Minimap({ map, px, py, enemies }: { map: DungeonMap; px: number; py: number; enemies: { x: number; y: number; hp: number }[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const scale = 3;
    c.width = map.width * scale;
    c.height = map.height * scale;
    ctx.fillStyle = "#0d0c18"; ctx.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.tiles[y * map.width + x];
        if (!t.seen) continue;
        if (t.kind === "wall") continue;
        ctx.fillStyle = t.kind === "stairsDown" ? "#fde047" :
                        t.kind === "shrine" ? "#a78bfa" :
                        t.kind === "chest" ? "#fb923c" : "#475569";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
    }
    ctx.fillStyle = "#fde047";
    ctx.fillRect(px * scale - 1, py * scale - 1, scale + 2, scale + 2);
  }, [map, px, py, enemies]);
  return <canvas ref={ref} className="rounded" style={{ imageRendering: "pixelated", maxWidth: "100%", height: "auto" }} aria-label="Minimap" />;
}
