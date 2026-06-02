// engine/generator.ts — Seeded BSP-ish dungeon room generator.
//
// Produces a grid of tiles + a list of rooms. The first room is the spawn
// room, the last is the stairs-down room. On floor 10 we generate one
// large boss arena instead.

import type { DungeonMap, Tile, Room } from "../types";
import { RNG } from "../rng";

const MAP_W = 48;
const MAP_H = 32;
const ROOM_TRIES = 30;
const MIN_ROOM = 4;
const MAX_ROOM = 9;

function emptyTiles(w: number, h: number): Tile[] {
  const arr: Tile[] = new Array(w * h);
  for (let i = 0; i < arr.length; i++) arr[i] = { kind: "wall", seen: false, visible: false };
  return arr;
}

function idx(x: number, y: number, w: number) {
  return y * w + x;
}

function carveRoom(tiles: Tile[], r: Room, w: number) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      tiles[idx(x, y, w)].kind = "floor";
    }
  }
}

function carveCorridor(tiles: Tile[], ax: number, ay: number, bx: number, by: number, w: number, rng: RNG) {
  // L-corridor; randomize horizontal-first vs vertical-first.
  if (rng.chance(0.5)) {
    const fromX = Math.min(ax, bx), toX = Math.max(ax, bx);
    for (let x = fromX; x <= toX; x++) tiles[idx(x, ay, w)].kind = "floor";
    const fromY = Math.min(ay, by), toY = Math.max(ay, by);
    for (let y = fromY; y <= toY; y++) tiles[idx(bx, y, w)].kind = "floor";
  } else {
    const fromY = Math.min(ay, by), toY = Math.max(ay, by);
    for (let y = fromY; y <= toY; y++) tiles[idx(ax, y, w)].kind = "floor";
    const fromX = Math.min(ax, bx), toX = Math.max(ax, bx);
    for (let x = fromX; x <= toX; x++) tiles[idx(x, by, w)].kind = "floor";
  }
}

function roomsOverlap(a: Room, b: Room): boolean {
  return !(a.x + a.w + 1 < b.x || b.x + b.w + 1 < a.x ||
           a.y + a.h + 1 < b.y || b.y + b.h + 1 < a.y);
}

/**
 * Generate the dungeon map for a given floor & seed.
 * Floor 10 is a single boss arena with a shrine to one side.
 */
export function generateMap(floor: number, seed: number): DungeonMap {
  const rng = new RNG(seed ^ (floor * 0x9e3779b9));

  if (floor === 10) {
    return generateBossArena(floor, rng);
  }

  const w = MAP_W, h = MAP_H;
  const tiles = emptyTiles(w, h);
  const rooms: Room[] = [];

  for (let i = 0; i < ROOM_TRIES; i++) {
    const rw = rng.int(MIN_ROOM, MAX_ROOM);
    const rh = rng.int(MIN_ROOM, MAX_ROOM);
    const rx = rng.int(2, w - rw - 2);
    const ry = rng.int(2, h - rh - 2);
    const candidate: Room = {
      x: rx, y: ry, w: rw, h: rh,
      cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2),
      kind: "normal",
    };
    if (rooms.some(r => roomsOverlap(r, candidate))) continue;
    carveRoom(tiles, candidate, w);
    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1];
      carveCorridor(tiles, prev.cx, prev.cy, candidate.cx, candidate.cy, w, rng);
    }
    rooms.push(candidate);
  }

  if (rooms.length < 3) {
    // Fallback: just three rooms in a row, deterministic
    rooms.length = 0;
    for (let i = 0; i < 3; i++) {
      const r: Room = { x: 4 + i * 14, y: 12, w: 8, h: 8, cx: 8 + i * 14, cy: 16, kind: "normal" };
      carveRoom(tiles, r, w);
      if (i > 0) carveCorridor(tiles, rooms[i - 1].cx, rooms[i - 1].cy, r.cx, r.cy, w, rng);
      rooms.push(r);
    }
  }

  rooms[0].kind = "start";
  // Shop room: every 3 floors, mid-dungeon room becomes a shop
  if (floor % 3 === 0 && rooms.length >= 4) {
    rooms[Math.floor(rooms.length / 2)].kind = "shop";
  }
  // Treasure rooms — random
  for (let i = 1; i < rooms.length - 1; i++) {
    if (rng.chance(0.18) && rooms[i].kind === "normal") rooms[i].kind = "treasure";
  }
  const lastRoom = rooms[rooms.length - 1];
  lastRoom.kind = "normal";

  // Stairs down — center of last room
  tiles[idx(lastRoom.cx, lastRoom.cy, w)].kind = "stairsDown";

  // Treasure room: place a chest
  for (const r of rooms) {
    if (r.kind === "treasure") {
      tiles[idx(r.cx, r.cy, w)].kind = "chest";
    }
    if (r.kind === "shop") {
      // Mark with a shrine sprite where merchant stands
      tiles[idx(r.cx, r.cy, w)].kind = "shrine";
    }
  }

  return {
    floor,
    width: w,
    height: h,
    tiles,
    rooms,
    start: { x: rooms[0].cx, y: rooms[0].cy },
    stairsDown: { x: lastRoom.cx, y: lastRoom.cy },
    seed,
  };
}

function generateBossArena(floor: number, rng: RNG): DungeonMap {
  const w = 24, h = 18;
  const tiles = emptyTiles(w, h);
  const arena: Room = { x: 3, y: 3, w: 18, h: 12, cx: 12, cy: 9, kind: "boss" };
  carveRoom(tiles, arena, w);
  // Stairs (placeholder — not used, victory ends the run)
  tiles[idx(arena.cx, arena.cy, w)].kind = "shrine"; // throne marker
  return {
    floor,
    width: w,
    height: h,
    tiles,
    rooms: [arena],
    start: { x: 6, y: 9 },
    stairsDown: { x: arena.cx, y: arena.cy },
    seed: rng.int(0, 0xffffffff),
  };
}

/** A* pathfinding on the tile grid (4-way). Returns array of {x,y} from sx,sy → tx,ty (exclusive of start). */
export function findPath(
  map: DungeonMap,
  sx: number, sy: number,
  tx: number, ty: number,
  isBlocked: (x: number, y: number) => boolean,
): Array<{ x: number; y: number }> {
  const key = (x: number, y: number) => y * map.width + x;
  if (sx === tx && sy === ty) return [];
  const open = new Set<number>();
  const came = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();
  const h = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);
  const startK = key(sx, sy);
  open.add(startK);
  gScore.set(startK, 0);
  fScore.set(startK, h(sx, sy));

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < map.width && y < map.height;

  let safety = 4000;
  while (open.size && safety-- > 0) {
    let curK = -1, curF = Infinity;
    for (const k of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < curF) { curF = f; curK = k; }
    }
    if (curK < 0) break;
    const cx = curK % map.width;
    const cy = Math.floor(curK / map.width);
    if (cx === tx && cy === ty) {
      const path: Array<{ x: number; y: number }> = [];
      let k = curK;
      while (came.has(k)) {
        const px = k % map.width, py = Math.floor(k / map.width);
        path.unshift({ x: px, y: py });
        k = came.get(k)!;
      }
      return path;
    }
    open.delete(curK);
    const neighbors: Array<[number, number]> = [
      [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (!inBounds(nx, ny)) continue;
      const tile = map.tiles[key(nx, ny)];
      const isEnd = (nx === tx && ny === ty);
      if (!isEnd && (tile.kind === "wall" || isBlocked(nx, ny))) continue;
      const tentative = (gScore.get(curK) ?? Infinity) + 1;
      const nK = key(nx, ny);
      if (tentative < (gScore.get(nK) ?? Infinity)) {
        came.set(nK, curK);
        gScore.set(nK, tentative);
        fScore.set(nK, tentative + h(nx, ny));
        open.add(nK);
      }
    }
  }
  return [];
}

/** Recompute fog of view from player position. Radius = visibility tiles. */
export function recomputeVisibility(map: DungeonMap, px: number, py: number, radius = 6) {
  // Pass 1: hide all
  for (const t of map.tiles) t.visible = false;
  // Pass 2: simple shadowcasting via ray traces along the perimeter
  const w = map.width, h = map.height;
  const rays = 80;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let x = px + 0.5, y = py + 0.5;
    for (let step = 0; step < radius; step++) {
      const ix = Math.floor(x), iy = Math.floor(y);
      if (ix < 0 || iy < 0 || ix >= w || iy >= h) break;
      const t = map.tiles[iy * w + ix];
      t.visible = true;
      t.seen = true;
      if (t.kind === "wall") break;
      x += dx; y += dy;
    }
  }
  // Always reveal player tile
  map.tiles[py * w + px].visible = true;
  map.tiles[py * w + px].seen = true;
}
