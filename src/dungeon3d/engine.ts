// Dungeon 3D — game state + step + dungeon generation.
//
// Coords: world-space XZ plane (Y is up). One grid cell = 4 world
// units, matching the modular-dungeon-kit's piece size. Player and
// enemies are point-radius colliders in 2D (XZ) for simplicity; the
// 3D model is positioned at (x, 0, z) in render.
//
// Conceptually ports the 2D dungeon crawler's engine: same gen
// strategy (rectangular rooms + L-corridors), same combat math
// (melee swing → hit-box → damage), same kid-friendly respawn.
// Only the renderer differs.

export const CELL = 4;            // world units per dungeon cell
export const COLS = 18;
export const ROWS = 14;
export const WORLD_W = COLS * CELL;  // 72
export const WORLD_H = ROWS * CELL;  // 56

export type Tile = "wall" | "floor" | "stairs" | "door";

export interface DungeonLevel {
  depth: number;
  grid: Tile[][];
  spawn: { x: number; z: number };
  stairs: { x: number; z: number };
  enemies: { kind: EnemyKind; x: number; z: number }[];
  chests: { x: number; z: number; opened: boolean }[];
  /** Used by the renderer to know where to put corner pieces vs walls. */
  wallOrientation: Map<string, "n" | "s" | "e" | "w" | "corner-nw" | "corner-ne" | "corner-sw" | "corner-se">;
  /** Room rectangles for fog-of-war reveal. Each rectangle is in grid
   *  coords (inclusive). A room becomes "discovered" when the player
   *  enters any of its cells; until then, the renderer hides its
   *  meshes. Corridors are revealed cell-by-cell as the player walks
   *  through them. */
  rooms: Array<{ x: number; z: number; w: number; h: number }>;
  /** Cells visited by the player (key = "x,z"). The renderer uses
   *  this to show/hide individual corridor cells beyond rooms. */
  visited: Set<string>;
  /** Rooms the player has entered. */
  visitedRooms: Set<number>;
}

export type EnemyKind = "grunt" | "brute" | "scout";

export interface Player {
  x: number; z: number;
  /** Facing angle in radians (around Y). 0 = +X. */
  facing: number;
  hp: number; hpMax: number;
  coins: number;
  attackT: number;       // > 0 means attack in progress
  attackDur: number;
  iframes: number;
  flashT: number;
  rangedCd: number;
  rangedCdDur: number;
  anim: "idle" | "walk" | "attack" | "hurt";
}

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number; z: number;
  hp: number; hpMax: number;
  facing: number;
  state: "idle" | "chase" | "attack";
  atkCd: number;
  flashT: number;
  deathT: number;
}

export interface Coin {
  id: string;
  x: number; z: number;
  vx: number; vz: number;
  y: number; vy: number;     // a tiny vertical bounce for visual life
  ttl: number;
}

export interface Projectile {
  id: string;
  x: number; z: number;
  vx: number; vz: number;
  ttl: number;    // seconds remaining
  damage: number;
}

export interface Game {
  level: DungeonLevel;
  depth: number;
  player: Player;
  enemies: Enemy[];
  coins: Coin[];
  projectiles: Projectile[];
  state: "playing" | "descending" | "cleared";
  /** Camera target in world coords — usually trails the player. */
  cameraTargetX: number;
  cameraTargetZ: number;
  hitStop: number;
  elapsed: number;
  runCoins: number;
  runKills: number;
}

// ── Random utilities ─────────────────────────────────────────────────

function randint(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function dist2(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// ── Dungeon generation ───────────────────────────────────────────────

export function genLevel(depth: number): DungeonLevel {
  const grid: Tile[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => "wall" as Tile));

  // Place 3-5 rooms, non-overlapping.
  const roomCount = 3 + Math.floor(Math.random() * 3);
  const rooms: { x: number; z: number; w: number; h: number; cx: number; cz: number }[] = [];
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 200) {
    attempts++;
    const w = randint(3, 5);
    const h = randint(3, 4);
    const x = randint(2, COLS - w - 2);
    const z = randint(2, ROWS - h - 2);
    const overlap = rooms.some(r =>
      x < r.x + r.w + 1 && x + w + 1 > r.x &&
      z < r.z + r.h + 1 && z + h + 1 > r.z);
    if (overlap) continue;
    rooms.push({ x, z, w, h, cx: x + Math.floor(w / 2), cz: z + Math.floor(h / 2) });
  }

  // Carve room floors.
  for (const r of rooms) {
    for (let zz = r.z; zz < r.z + r.h; zz++) {
      for (let xx = r.x; xx < r.x + r.w; xx++) {
        grid[zz][xx] = "floor";
      }
    }
  }

  // L-corridors between consecutive rooms.
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    carveCorridor(grid, a.cx, a.cz, b.cx, b.cz);
  }

  // Stairs in the last room.
  const last = rooms[rooms.length - 1];
  grid[last.cz][last.cx] = "stairs";

  // Build wall orientation map for the renderer.
  const wallOrientation = computeWallOrientations(grid);

  // Spawn position = center of first room.
  const first = rooms[0];
  const spawn = {
    x: (first.cx + 0.5) * CELL - WORLD_W / 2,
    z: (first.cz + 0.5) * CELL - WORLD_H / 2,
  };

  // Enemy spawns in non-spawn rooms.
  const enemies: DungeonLevel["enemies"] = [];
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const count = 1 + Math.floor(Math.random() * (1 + Math.min(2, depth)));
    for (let n = 0; n < Math.min(count, 3); n++) {
      const ex = (r.x + 0.5 + Math.random() * (r.w - 1)) * CELL - WORLD_W / 2;
      const ez = (r.z + 0.5 + Math.random() * (r.h - 1)) * CELL - WORLD_H / 2;
      const kind: EnemyKind = pick(["grunt", "brute", "scout"] as EnemyKind[]);
      enemies.push({ kind, x: ex, z: ez });
    }
  }

  // Chests in a couple interior rooms.
  const chests: DungeonLevel["chests"] = [];
  for (let i = 1; i < rooms.length - 1; i++) {
    if (Math.random() < 0.5) {
      const r = rooms[i];
      const cx = (r.cx + 0.5) * CELL - WORLD_W / 2;
      const cz = (r.cz + 0.5) * CELL - WORLD_H / 2;
      chests.push({ x: cx, z: cz, opened: false });
    }
  }

  // Mark the spawn room as already visited so it's visible on entry.
  const visitedRooms = new Set<number>([0]);
  const visited = new Set<string>();
  // Also seed visited with cells in spawn room for corridor reveal.
  for (let zz = first.z; zz < first.z + first.h; zz++) {
    for (let xx = first.x; xx < first.x + first.w; xx++) {
      visited.add(`${xx},${zz}`);
    }
  }
  return {
    depth, grid, spawn,
    stairs: {
      x: (last.cx + 0.5) * CELL - WORLD_W / 2,
      z: (last.cz + 0.5) * CELL - WORLD_H / 2,
    },
    enemies, chests, wallOrientation,
    rooms: rooms.map(r => ({ x: r.x, z: r.z, w: r.w, h: r.h })),
    visited,
    visitedRooms,
  };
}

/** Update fog-of-war state based on player's current world position.
 *  Reveals the current cell + any room the player is inside. */
export function updateFogOfWar(g: Game) {
  const p = g.player;
  const gx = Math.floor((p.x + WORLD_W / 2) / CELL);
  const gz = Math.floor((p.z + WORLD_H / 2) / CELL);
  if (gx < 0 || gx >= COLS || gz < 0 || gz >= ROWS) return;
  // Reveal a small radius around the player so corridors light up
  // before the player physically touches each cell.
  const radius = 1;
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const cx = gx + dx, cz = gz + dz;
      if (cx < 0 || cx >= COLS || cz < 0 || cz >= ROWS) continue;
      g.level.visited.add(`${cx},${cz}`);
    }
  }
  // Reveal any room the player has entered.
  for (let i = 0; i < g.level.rooms.length; i++) {
    const r = g.level.rooms[i];
    if (gx >= r.x && gx < r.x + r.w && gz >= r.z && gz < r.z + r.h) {
      g.level.visitedRooms.add(i);
      // Mark all room cells as visited too.
      for (let zz = r.z; zz < r.z + r.h; zz++) {
        for (let xx = r.x; xx < r.x + r.w; xx++) {
          g.level.visited.add(`${xx},${zz}`);
        }
      }
    }
  }
}

/** Is a grid cell currently visible (revealed) by fog-of-war? */
export function isCellVisible(g: Game, gx: number, gz: number): boolean {
  if (g.level.visited.has(`${gx},${gz}`)) return true;
  // Also any room the player has entered.
  for (let i = 0; i < g.level.rooms.length; i++) {
    if (!g.level.visitedRooms.has(i)) continue;
    const r = g.level.rooms[i];
    if (gx >= r.x && gx < r.x + r.w && gz >= r.z && gz < r.z + r.h) return true;
  }
  return false;
}

function carveCorridor(grid: Tile[][], x1: number, z1: number, x2: number, z2: number) {
  const horizFirst = Math.random() < 0.5;
  const dx = x1 < x2 ? 1 : -1;
  const dz = z1 < z2 ? 1 : -1;
  if (horizFirst) {
    for (let x = x1; x !== x2 + dx; x += dx) if (grid[z1][x] === "wall") grid[z1][x] = "floor";
    for (let z = z1; z !== z2 + dz; z += dz) if (grid[z][x2] === "wall") grid[z][x2] = "floor";
  } else {
    for (let z = z1; z !== z2 + dz; z += dz) if (grid[z][x1] === "wall") grid[z][x1] = "floor";
    for (let x = x1; x !== x2 + dx; x += dx) if (grid[z2][x] === "wall") grid[z2][x] = "floor";
  }
}

function computeWallOrientations(grid: Tile[][]): DungeonLevel["wallOrientation"] {
  // For each wall cell, figure out which sides border floor — this
  // tells the renderer whether to place a flat wall, a corner, or skip.
  const map = new Map<string, any>();
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[z][x] !== "wall") continue;
      const isFloor = (xx: number, zz: number) =>
        zz >= 0 && zz < ROWS && xx >= 0 && xx < COLS && grid[zz][xx] !== "wall";
      const n = isFloor(x, z - 1);
      const s = isFloor(x, z + 1);
      const e = isFloor(x + 1, z);
      const w = isFloor(x - 1, z);
      if (!n && !s && !e && !w) continue; // isolated wall — won't render
      let key: string;
      if (n && e) key = "corner-ne";
      else if (n && w) key = "corner-nw";
      else if (s && e) key = "corner-se";
      else if (s && w) key = "corner-sw";
      else if (n) key = "n";
      else if (s) key = "s";
      else if (e) key = "e";
      else key = "w";
      map.set(`${x},${z}`, key);
    }
  }
  return map;
}

// ── Player + game construction ───────────────────────────────────────

export function newPlayer(level: DungeonLevel): Player {
  return {
    x: level.spawn.x, z: level.spawn.z, facing: 0,
    hp: 100, hpMax: 100, coins: 0,
    attackT: 0, attackDur: 0.34,
    iframes: 0, flashT: 0, rangedCd: 0, rangedCdDur: 0.55, anim: "idle",
  };
}

export function newGame(depth = 1): Game {
  const level = genLevel(depth);
  const player = newPlayer(level);
  const enemies: Enemy[] = level.enemies.map(mkEnemy);
  return {
    level, depth, player,
    enemies, coins: [], projectiles: [],
    state: "playing",
    cameraTargetX: player.x, cameraTargetZ: player.z,
    hitStop: 0, elapsed: 0, runCoins: 0, runKills: 0,
  };
}

function mkEnemy(s: { kind: EnemyKind; x: number; z: number }): Enemy {
  const hpMap: Record<EnemyKind, number> = { scout: 18, grunt: 28, brute: 44 };
  const hp = hpMap[s.kind];
  return {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: s.kind, x: s.x, z: s.z,
    hp, hpMax: hp, facing: 0,
    state: "idle", atkCd: 0, flashT: 0, deathT: 0,
  };
}

export function descendLevel(g: Game): Game {
  const next = genLevel(g.depth + 1);
  const player: Player = {
    ...g.player,
    x: next.spawn.x, z: next.spawn.z,
    attackT: 0, iframes: 1.0, flashT: 0, anim: "idle",
  };
  return {
    level: next, depth: g.depth + 1, player,
    enemies: next.enemies.map(mkEnemy),
    coins: [], projectiles: [],
    state: "playing",
    cameraTargetX: player.x, cameraTargetZ: player.z,
    hitStop: 0, elapsed: 0,
    runCoins: g.runCoins, runKills: g.runKills,
  };
}

// ── Collision ────────────────────────────────────────────────────────

export function isWalkable(level: DungeonLevel, x: number, z: number): boolean {
  // Convert world coords to grid coords (level is centered around 0,0).
  const gx = Math.floor((x + WORLD_W / 2) / CELL);
  const gz = Math.floor((z + WORLD_H / 2) / CELL);
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return false;
  if (gx < 0 || gx >= COLS || gz < 0 || gz >= ROWS) return false;
  return level.grid[gz][gx] !== "wall";
}

const PLAYER_R = 1.0;
const ENEMY_R = 1.0;

function tryMove(level: DungeonLevel, ent: { x: number; z: number }, dx: number, dz: number, r: number) {
  // Move x + z separately so corners don't lock the entity.
  const nx = ent.x + dx;
  if (isWalkable(level, nx + r, ent.z + r) && isWalkable(level, nx - r, ent.z + r)
   && isWalkable(level, nx + r, ent.z - r) && isWalkable(level, nx - r, ent.z - r)) {
    ent.x = nx;
  }
  const nz = ent.z + dz;
  if (isWalkable(level, ent.x + r, nz + r) && isWalkable(level, ent.x - r, nz + r)
   && isWalkable(level, ent.x + r, nz - r) && isWalkable(level, ent.x - r, nz - r)) {
    ent.z = nz;
  }
}

// ── Step ─────────────────────────────────────────────────────────────

export interface InputState {
  ax: number;   // -1..1
  az: number;
  attack: boolean;
  ranged: boolean;
}

const PLAYER_SPEED = 7.5;     // world units / sec (bumped from 6.5 per iPad feedback)
const ENEMY_SPEED = 3.0;
const ATTACK_RANGE = 2.2;
const ATTACK_DAMAGE = 16;
const RANGED_RANGE = 9;
const RANGED_SPEED = 18;
const RANGED_DAMAGE = 12;
const RANGED_TTL = 1.2;
const RANGED_RADIUS = 0.6;
const ENEMY_DAMAGE = 10;
const ENEMY_ATTACK_RANGE = 1.4;
const COIN_MAGNET_RANGE = 3.5;
const PICKUP_RANGE = 0.7;

export function step(g: Game, dtRaw: number, input: InputState) {
  let dt = Number.isFinite(dtRaw) && dtRaw > 0 ? Math.min(dtRaw, 0.05) : 0;
  if (g.hitStop > 0) { g.hitStop = Math.max(0, g.hitStop - dt); dt *= 0.25; }
  if (g.state !== "playing") return;
  g.elapsed += dt;
  const p = g.player;

  // ── Player movement ──
  const mag = Math.hypot(input.ax, input.az);
  if (mag > 0.01) {
    const nx = (input.ax / mag) * PLAYER_SPEED * dt;
    const nz = (input.az / mag) * PLAYER_SPEED * dt;
    tryMove(g.level, p, nx, nz, PLAYER_R);
    // Facing: model's default forward is +Z, so rotation.y = 0 → +Z.
    // With camera looking down at the world, input.az = +1 (south)
    // means the player moves +Z and should face +Z. The old formula
    // used atan2(ax, -az) which made the model face the OPPOSITE
    // direction (backward bug). atan2(ax, az) is the right mapping.
    p.facing = Math.atan2(input.ax, input.az);
    p.anim = p.attackT > 0 ? "attack" : "walk";
  } else {
    p.anim = p.attackT > 0 ? "attack" : "idle";
  }
  if (p.flashT > 0) p.anim = "hurt";

  // ── Player attack ──
  if (input.attack && p.attackT <= 0 && p.iframes <= 0) {
    p.attackT = p.attackDur;
    // Hitbox: a small circle in front of the player based on facing.
    const ahead = ATTACK_RANGE * 0.5;
    const hbX = p.x + Math.sin(p.facing) * ahead;
    const hbZ = p.z - Math.cos(p.facing) * ahead;
    for (const e of g.enemies) {
      if (e.deathT > 0) continue;
      if (dist2({ x: hbX, z: hbZ }, e) < ATTACK_RANGE) {
        e.hp -= ATTACK_DAMAGE;
        e.flashT = 0.18;
        if (e.hp <= 0) {
          e.deathT = 0.6;
          g.runKills++;
          // Drop coins (2-4).
          const n = 2 + Math.floor(Math.random() * 3);
          for (let k = 0; k < n; k++) {
            g.coins.push({
              id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              x: e.x + (Math.random() - 0.5) * 1.2,
              z: e.z + (Math.random() - 0.5) * 1.2,
              y: 0.5,
              vx: (Math.random() - 0.5) * 2,
              vz: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 1.5,
              ttl: 14,
            });
          }
          g.hitStop = 0.10;
        } else {
          g.hitStop = 0.04;
        }
      }
    }
  }
  if (p.attackT > 0) p.attackT -= dt;
  if (p.iframes > 0) p.iframes -= dt;
  if (p.flashT > 0) p.flashT -= dt;

  // ── Player ranged auto-aim ──
  p.rangedCd = Math.max(0, p.rangedCd - dt);
  if (input.ranged && p.rangedCd <= 0 && p.iframes <= 0) {
    p.rangedCd = p.rangedCdDur;
    // Nearest living enemy within RANGED_RANGE.
    let nearest: Enemy | null = null;
    let nearestD = RANGED_RANGE;
    for (const e of g.enemies) {
      if (e.deathT > 0) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < nearestD) { nearestD = d; nearest = e; }
    }
    let dirX: number, dirZ: number;
    if (nearest) {
      const dx = nearest.x - p.x, dz = nearest.z - p.z;
      const m = Math.hypot(dx, dz) || 1;
      dirX = dx / m; dirZ = dz / m;
      p.facing = Math.atan2(dirX, dirZ);
    } else {
      dirX = Math.sin(p.facing);
      dirZ = Math.cos(p.facing);
    }
    g.projectiles.push({
      id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: p.x + dirX * 0.7,
      z: p.z + dirZ * 0.7,
      vx: dirX * RANGED_SPEED,
      vz: dirZ * RANGED_SPEED,
      ttl: RANGED_TTL,
      damage: RANGED_DAMAGE,
    });
    g.hitStop = Math.max(g.hitStop, 0.04);
  }

  // ── Projectile step ──
  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const pr = g.projectiles[i];
    pr.ttl -= dt;
    if (pr.ttl <= 0) { g.projectiles.splice(i, 1); continue; }
    pr.x += pr.vx * dt;
    pr.z += pr.vz * dt;
    // Wall collision.
    const cx = Math.floor((pr.x + WORLD_W / 2) / CELL);
    const cz = Math.floor((pr.z + WORLD_H / 2) / CELL);
    if (cx < 0 || cx >= COLS || cz < 0 || cz >= ROWS
        || g.level.grid[cz][cx] === "wall") {
      g.projectiles.splice(i, 1);
      continue;
    }
    // Enemy collision (squared distance, same pattern as melee).
    let hit = false;
    for (const e of g.enemies) {
      if (e.deathT > 0) continue;
      const dx = e.x - pr.x, dz = e.z - pr.z;
      const rsum = RANGED_RADIUS + ENEMY_R;
      if (dx * dx + dz * dz < rsum * rsum) {
        e.hp -= pr.damage;
        e.flashT = 0.18;
        if (e.hp <= 0) {
          e.deathT = 0.6;
          g.runKills++;
          const n = 2 + Math.floor(Math.random() * 3);
          for (let k = 0; k < n; k++) {
            g.coins.push({
              id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              x: e.x + (Math.random() - 0.5) * 1.2,
              z: e.z + (Math.random() - 0.5) * 1.2,
              y: 0.5,
              vx: (Math.random() - 0.5) * 2,
              vz: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 1.5,
              ttl: 14,
            });
          }
          g.hitStop = Math.max(g.hitStop, 0.10);
        }
        hit = true;
        break;
      }
    }
    if (hit) g.projectiles.splice(i, 1);
  }

  // ── Enemies ──
  for (const e of g.enemies) {
    if (e.deathT > 0) { e.deathT = Math.max(0, e.deathT - dt); continue; }
    if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt);
    const d = dist2(e, p);
    if (d < 10) e.state = d < ENEMY_ATTACK_RANGE ? "attack" : "chase";
    else e.state = "idle";
    if (e.state === "chase") {
      const dx = p.x - e.x, dz = p.z - e.z;
      const m = Math.hypot(dx, dz);
      if (m > 0.1) {
        const speed = ENEMY_SPEED * dt;
        tryMove(g.level, e, (dx / m) * speed, (dz / m) * speed, ENEMY_R);
        // Same facing-fix as the player (was atan2(dx, -dz) — backward).
        e.facing = Math.atan2(dx, dz);
      }
    }
    e.atkCd = Math.max(0, e.atkCd - dt);
    if (e.state === "attack" && e.atkCd <= 0 && p.iframes <= 0) {
      p.hp -= ENEMY_DAMAGE;
      p.flashT = 0.32;
      p.iframes = 0.7;
      g.hitStop = 0.08;
      e.atkCd = 1.0;
      if (p.hp <= 0) {
        // Kid-friendly respawn at level spawn with reduced HP.
        p.hp = Math.max(20, Math.floor(p.hpMax * 0.4));
        p.x = g.level.spawn.x;
        p.z = g.level.spawn.z;
        p.iframes = 1.5;
        p.coins = Math.max(0, p.coins - 5);
      }
    }
  }
  g.enemies = g.enemies.filter(e => e.deathT > 0 || e.hp > 0);

  // ── Coins ──
  for (const c of g.coins) {
    // Vertical bounce — gravity + floor at y=0.3
    c.vy -= 8 * dt;
    c.y += c.vy * dt;
    if (c.y < 0.3) { c.y = 0.3; c.vy = Math.max(0, c.vy * -0.4); }
    const d = dist2(c, p);
    if (d < COIN_MAGNET_RANGE) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const m = Math.hypot(dx, dz);
      if (m > 0.01) {
        c.vx += (dx / m) * 18 * dt;
        c.vz += (dz / m) * 18 * dt;
      }
    }
    c.vx *= 0.9; c.vz *= 0.9;
    c.x += c.vx * dt;
    c.z += c.vz * dt;
    c.ttl -= dt;
    if (d < PICKUP_RANGE) {
      p.coins++;
      g.runCoins++;
      c.ttl = -1;
    }
  }
  g.coins = g.coins.filter(c => c.ttl > 0);

  // ── Chest pickup ──
  for (const ch of g.level.chests) {
    if (ch.opened) continue;
    if (dist2(ch, p) < 1.2) {
      ch.opened = true;
      const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        g.coins.push({
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: ch.x + (Math.random() - 0.5) * 1.5,
          z: ch.z + (Math.random() - 0.5) * 1.5,
          y: 0.5,
          vx: (Math.random() - 0.5) * 3,
          vz: (Math.random() - 0.5) * 3,
          vy: 3 + Math.random() * 2,
          ttl: 14,
        });
      }
    }
  }

  // ── Stairs / descend ──
  if (dist2(p, g.level.stairs) < 1.2) g.state = "descending";

  // ── Camera lerp ──
  const camLerp = 1 - Math.exp(-dt * 9);
  g.cameraTargetX += (p.x - g.cameraTargetX) * camLerp;
  g.cameraTargetZ += (p.z - g.cameraTargetZ) * camLerp;

  // ── Camera bounds: keep target inside the playable interior so we
  //    don't show out-of-world void when the player is near a wall.
  //    Inset of CELL*3 keeps the iso frame inside the map rectangle.
  const CAM_INSET_X = CELL * 3;
  const CAM_INSET_Z = CELL * 3;
  if (g.cameraTargetX < CAM_INSET_X) g.cameraTargetX = CAM_INSET_X;
  if (g.cameraTargetX > WORLD_W - CAM_INSET_X) g.cameraTargetX = WORLD_W - CAM_INSET_X;
  if (g.cameraTargetZ < CAM_INSET_Z) g.cameraTargetZ = CAM_INSET_Z;
  if (g.cameraTargetZ > WORLD_H - CAM_INSET_Z) g.cameraTargetZ = WORLD_H - CAM_INSET_Z;

  // ── Fog-of-war reveal ──
  updateFogOfWar(g);
}
