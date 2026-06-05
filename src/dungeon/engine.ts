// Dungeon Crawler — engine + dungeon generation + combat.
//
// Top-down action-RPG slice. World coords in pixels. Camera follows
// the player; the renderer maps world → screen with viewport math
// borrowed from the Maze Muncher lessons (DPR-safe setTransform,
// no off-screen drift, all inputs gated on grid-aware logic).
//
// Session 1 (this file): movement, dungeon gen, basic combat, loot.
// Future sessions: classes, gear/rarity, bosses, meta-progression.

// ── Constants ─────────────────────────────────────────────────────────

/** Pixel size of one dungeon cell (matches tiny-dungeon's 16px tile,
 *  rendered at 2x = 32px world units for visual size). */
export const CELL = 32;

/** Dungeon grid dimensions per level. */
export const COLS = 32;
export const ROWS = 24;
export const WORLD_W = COLS * CELL;  // 1024
export const WORLD_H = ROWS * CELL;  // 768

/** Cell kinds the generator can produce. */
export type Tile = "wall" | "floor" | "stairs" | "torch" | "door";

export interface DungeonLevel {
  depth: number;
  grid: Tile[][];      // [row][col]
  /** Spawn position for the player when entering this level (pixels). */
  spawn: { x: number; y: number };
  /** Where the stairs-down are (pixels), for the descend prompt. */
  stairs: { x: number; y: number };
  /** Pre-placed enemy spawns. */
  enemies: EnemySpawn[];
  /** Pre-placed chests / loot piles. */
  chests: { x: number; y: number; opened: boolean }[];
}

export type EnemyKind = "goblin" | "skeleton" | "mushroom";

interface EnemySpawn { kind: EnemyKind; x: number; y: number; }

// ── Player + entities ────────────────────────────────────────────────

export interface Player {
  x: number; y: number;
  vx: number; vy: number;     // velocity for animation interp
  facing: 1 | -1;             // sprite flip
  hp: number; hpMax: number;
  coins: number;
  /** Attack windup → 0..attackDur means swing in progress. */
  attackT: number;
  attackDur: number;
  /** Invuln window after taking damage. */
  iframes: number;
  /** Hit-flash timer for visual feedback. */
  flashT: number;
  /** "anim" state for rendering — idle / run / attack / hurt. */
  anim: "idle" | "run" | "attack" | "hurt";
  /** Sub-second anim time for frame indexing. */
  animT: number;
}

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number; y: number;
  hp: number; hpMax: number;
  facing: 1 | -1;
  /** AI state. */
  state: "idle" | "chase" | "attack";
  /** Cooldown on attacking the player. */
  atkCd: number;
  /** Hit-flash timer. */
  flashT: number;
  /** Death animation timer — when > 0, enemy is fading out. */
  deathT: number;
  /** Anim sub-second timer. */
  animT: number;
}

export interface Coin {
  id: string;
  x: number; y: number;
  /** Magnetic pull velocity once near player. */
  vx: number; vy: number;
  /** TTL — coins despawn after some time so the floor doesn't pile up. */
  ttl: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  ttl: number; size: number;
}

export interface Game {
  level: DungeonLevel;
  depth: number;             // current level number (1, 2, 3...)
  player: Player;
  enemies: Enemy[];
  coins: Coin[];
  particles: Particle[];
  state: "playing" | "descending" | "dead" | "cleared";
  cameraX: number;
  cameraY: number;
  /** Slow-mo / hit-stop timer — when > 0, all sim runs slower. */
  hitStop: number;
  /** Time spent in level — used for various pacing. */
  elapsed: number;
  /** Total coins picked up across the run. */
  runCoins: number;
  /** Total kills across the run. */
  runKills: number;
}

// ── Random + utility ─────────────────────────────────────────────────

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function randint(a: number, b: number) { return Math.floor(rand(a, b + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── Dungeon generation ───────────────────────────────────────────────

/** Generate a dungeon level by placing rooms + carving corridors. */
export function genLevel(depth: number): DungeonLevel {
  // Start with all walls.
  const grid: Tile[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => "wall" as Tile));

  // Place 4-6 rooms.
  const roomCount = 4 + Math.floor(Math.random() * 3);
  const rooms: { x: number; y: number; w: number; h: number; cx: number; cy: number }[] = [];
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 200) {
    attempts++;
    const w = randint(5, 9);
    const h = randint(4, 7);
    const x = randint(2, COLS - w - 2);
    const y = randint(2, ROWS - h - 2);
    // Reject if too close to any existing room.
    const overlap = rooms.some(r =>
      x < r.x + r.w + 1 && x + w + 1 > r.x &&
      y < r.y + r.h + 1 && y + h + 1 > r.y);
    if (overlap) continue;
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }

  // Carve room floors.
  for (const r of rooms) {
    for (let yy = r.y; yy < r.y + r.h; yy++) {
      for (let xx = r.x; xx < r.x + r.w; xx++) {
        grid[yy][xx] = "floor";
      }
    }
  }

  // Connect rooms with L-shaped corridors (each room to the next in order).
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    carveCorridor(grid, a.cx, a.cy, b.cx, b.cy);
  }

  // Place stairs-down in the LAST room (farthest from spawn).
  const lastRoom = rooms[rooms.length - 1];
  grid[lastRoom.cy][lastRoom.cx] = "stairs";

  // Sprinkle torches along walls inside rooms (decor).
  for (const r of rooms) {
    if (Math.random() < 0.7) {
      const tx = r.x + randint(1, Math.max(1, r.w - 2));
      const ty = r.y;
      if (grid[ty][tx] === "floor") grid[ty][tx] = "torch";
    }
  }

  // Spawn point = first room center.
  const first = rooms[0];
  const spawn = {
    x: (first.cx + 0.5) * CELL,
    y: (first.cy + 0.5) * CELL,
  };

  // Pre-place enemies in non-spawn rooms.
  const enemies: EnemySpawn[] = [];
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    // Number of enemies scales with depth.
    const count = 1 + Math.floor(Math.random() * (1 + depth));
    for (let n = 0; n < Math.min(count, 4); n++) {
      const ex = (r.x + 1 + Math.random() * (r.w - 2) + 0.5) * CELL;
      const ey = (r.y + 1 + Math.random() * (r.h - 2) + 0.5) * CELL;
      const kind: EnemyKind = pick(["goblin", "skeleton", "mushroom"] as EnemyKind[]);
      enemies.push({ kind, x: ex, y: ey });
    }
  }

  // Chests in 1-2 random rooms (not spawn / not stairs).
  const chests: { x: number; y: number; opened: boolean }[] = [];
  for (let i = 1; i < rooms.length - 1; i++) {
    if (Math.random() < 0.6) {
      const r = rooms[i];
      const cx = (r.x + Math.floor(r.w / 2) + 0.5) * CELL;
      const cy = (r.y + Math.floor(r.h / 2) + 0.5) * CELL;
      chests.push({ x: cx, y: cy, opened: false });
    }
  }

  return {
    depth, grid, spawn,
    stairs: { x: (lastRoom.cx + 0.5) * CELL, y: (lastRoom.cy + 0.5) * CELL },
    enemies, chests,
  };
}

function carveCorridor(grid: Tile[][], x1: number, y1: number, x2: number, y2: number) {
  // First horizontal, then vertical (L-shape).
  const horizFirst = Math.random() < 0.5;
  const dx = x1 < x2 ? 1 : -1;
  const dy = y1 < y2 ? 1 : -1;
  if (horizFirst) {
    for (let x = x1; x !== x2 + dx; x += dx) if (grid[y1][x] === "wall") grid[y1][x] = "floor";
    for (let y = y1; y !== y2 + dy; y += dy) if (grid[y][x2] === "wall") grid[y][x2] = "floor";
  } else {
    for (let y = y1; y !== y2 + dy; y += dy) if (grid[y][x1] === "wall") grid[y][x1] = "floor";
    for (let x = x1; x !== x2 + dx; x += dx) if (grid[y2][x] === "wall") grid[y2][x] = "floor";
  }
}

// ── New game / new level ─────────────────────────────────────────────

export function newPlayer(level: DungeonLevel): Player {
  return {
    x: level.spawn.x, y: level.spawn.y,
    vx: 0, vy: 0, facing: 1,
    hp: 100, hpMax: 100, coins: 0,
    attackT: 0, attackDur: 0.32,
    iframes: 0, flashT: 0,
    anim: "idle", animT: 0,
  };
}

export function newGame(depth = 1): Game {
  const level = genLevel(depth);
  const player = newPlayer(level);
  const enemies: Enemy[] = level.enemies.map(spawn => mkEnemy(spawn));
  return {
    level, depth, player,
    enemies, coins: [], particles: [],
    state: "playing",
    cameraX: player.x, cameraY: player.y,
    hitStop: 0, elapsed: 0, runCoins: 0, runKills: 0,
  };
}

function mkEnemy(spawn: EnemySpawn): Enemy {
  const hpByKind: Record<EnemyKind, number> = { goblin: 18, skeleton: 26, mushroom: 38 };
  const hp = hpByKind[spawn.kind];
  return {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: spawn.kind, x: spawn.x, y: spawn.y,
    hp, hpMax: hp, facing: 1,
    state: "idle", atkCd: 0, flashT: 0, deathT: 0, animT: 0,
  };
}

/** Carry the player + run-totals forward to the next level. */
export function descendLevel(g: Game): Game {
  const next = genLevel(g.depth + 1);
  const player: Player = {
    ...g.player,
    x: next.spawn.x, y: next.spawn.y,
    attackT: 0, iframes: 1.0,   // brief invuln on entry
    flashT: 0, anim: "idle", animT: 0,
  };
  return {
    level: next, depth: g.depth + 1, player,
    enemies: next.enemies.map(mkEnemy),
    coins: [], particles: [],
    state: "playing",
    cameraX: player.x, cameraY: player.y,
    hitStop: 0, elapsed: 0,
    runCoins: g.runCoins, runKills: g.runKills,
  };
}

// ── Collision / walkability ──────────────────────────────────────────

export function isWalkable(level: DungeonLevel, x: number, y: number): boolean {
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (!Number.isFinite(c) || !Number.isFinite(r)) return false;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  const t = level.grid[r][c];
  return t !== "wall";   // floor, stairs, torch, door all walkable
}

/** Player/enemy collision radius — used for wall + entity hit checks. */
const PLAYER_RADIUS = 12;
const ENEMY_RADIUS = 12;

function tryMove(level: DungeonLevel, ent: { x: number; y: number }, dx: number, dy: number, r: number) {
  // Move in x and y separately so a corner doesn't lock the entity.
  const nx = ent.x + dx;
  if (isWalkable(level, nx + r, ent.y + r) && isWalkable(level, nx - r, ent.y + r)
   && isWalkable(level, nx + r, ent.y - r) && isWalkable(level, nx - r, ent.y - r)) {
    ent.x = nx;
  }
  const ny = ent.y + dy;
  if (isWalkable(level, ent.x + r, ny + r) && isWalkable(level, ent.x - r, ny + r)
   && isWalkable(level, ent.x + r, ny - r) && isWalkable(level, ent.x - r, ny - r)) {
    ent.y = ny;
  }
}

// ── Step ────────────────────────────────────────────────────────────
//
// One simulation tick. dt is real seconds (clamped). `input` is the
// current input snapshot from the React page (movement axes + attack).

export interface InputState {
  ax: number;   // -1..1 (left/right)
  ay: number;   // -1..1 (up/down)
  attack: boolean;
}

const PLAYER_SPEED = 145;   // px/sec
const ENEMY_SPEED = 65;     // px/sec — slower than player so they can flee
const ATTACK_RANGE = 38;
const ATTACK_DAMAGE = 14;
const ENEMY_DAMAGE = 8;
const ENEMY_ATTACK_RANGE = 30;
const COIN_MAGNET_RANGE = 80;

export function step(g: Game, dtRaw: number, input: InputState) {
  let dt = Number.isFinite(dtRaw) && dtRaw > 0 ? Math.min(dtRaw, 0.05) : 0;
  // Hit-stop slows the whole sim briefly for impact feel.
  if (g.hitStop > 0) { g.hitStop = Math.max(0, g.hitStop - dt); dt *= 0.25; }
  if (g.state !== "playing") return;
  g.elapsed += dt;
  const p = g.player;

  // ── Player movement ──
  const mag = Math.hypot(input.ax, input.ay);
  if (mag > 0.01) {
    const nx = (input.ax / mag) * PLAYER_SPEED * dt;
    const ny = (input.ay / mag) * PLAYER_SPEED * dt;
    tryMove(g.level, p, nx, ny, PLAYER_RADIUS);
    p.vx = nx / dt; p.vy = ny / dt;
    if (input.ax > 0.1) p.facing = 1;
    else if (input.ax < -0.1) p.facing = -1;
    p.anim = p.attackT > 0 ? "attack" : "run";
  } else {
    p.vx = 0; p.vy = 0;
    p.anim = p.attackT > 0 ? "attack" : "idle";
  }
  if (p.flashT > 0) p.anim = "hurt";

  // ── Player attack ──
  if (input.attack && p.attackT <= 0 && p.iframes <= 0) {
    p.attackT = p.attackDur;
    // Resolve hits at the start of the swing — single frame of damage.
    // Hitbox is a small rect in front of the player.
    const hbX = p.x + (p.facing === 1 ? ATTACK_RANGE / 2 : -ATTACK_RANGE / 2);
    const hbY = p.y;
    const hbR = ATTACK_RANGE * 0.8;
    for (const e of g.enemies) {
      if (e.deathT > 0) continue;
      if (dist({ x: hbX, y: hbY }, e) < hbR) {
        e.hp -= ATTACK_DAMAGE;
        e.flashT = 0.18;
        spawnParticles(g, e.x, e.y, "#fde047", 8);
        if (e.hp <= 0) {
          e.deathT = 0.6;
          g.runKills++;
          spawnParticles(g, e.x, e.y, "#f87171", 14);
          // Drop coins (1-3).
          const n = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < n; k++) {
            g.coins.push({
              id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              x: e.x + rand(-12, 12), y: e.y + rand(-12, 12),
              vx: rand(-30, 30), vy: rand(-40, -10),
              ttl: 12,
            });
          }
          g.hitStop = 0.12;
        } else {
          g.hitStop = 0.05;
        }
      }
    }
  }
  if (p.attackT > 0) p.attackT -= dt;
  if (p.iframes > 0) p.iframes -= dt;
  if (p.flashT > 0) p.flashT -= dt;
  p.animT += dt;

  // ── Enemies ──
  for (const e of g.enemies) {
    if (e.deathT > 0) { e.deathT = Math.max(0, e.deathT - dt); e.animT += dt; continue; }
    if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt);
    e.animT += dt;
    const d = dist(e, p);
    if (d < 200) e.state = d < ENEMY_ATTACK_RANGE ? "attack" : "chase";
    else e.state = "idle";
    if (e.state === "chase") {
      const dx = p.x - e.x, dy = p.y - e.y;
      const m = Math.hypot(dx, dy);
      if (m > 0.1) {
        const speed = ENEMY_SPEED * dt;
        tryMove(g.level, e, (dx / m) * speed, (dy / m) * speed, ENEMY_RADIUS);
        e.facing = dx > 0 ? 1 : -1;
      }
    }
    e.atkCd = Math.max(0, e.atkCd - dt);
    if (e.state === "attack" && e.atkCd <= 0 && p.iframes <= 0) {
      // Damage the player.
      p.hp -= ENEMY_DAMAGE;
      p.flashT = 0.3;
      p.iframes = 0.6;
      g.hitStop = 0.08;
      spawnParticles(g, p.x, p.y, "#fca5a5", 12);
      e.atkCd = 0.9;
      if (p.hp <= 0) {
        // Kid-friendly: respawn at level start with reduced HP.
        p.hp = Math.max(20, Math.floor(p.hpMax * 0.4));
        p.x = g.level.spawn.x;
        p.y = g.level.spawn.y;
        p.iframes = 1.5;
        p.coins = Math.max(0, p.coins - 5);
      }
    }
  }
  // Drop fully-dead enemies.
  g.enemies = g.enemies.filter(e => e.deathT > 0 || e.hp > 0);

  // ── Coins ──
  for (const c of g.coins) {
    const d = dist(c, p);
    if (d < COIN_MAGNET_RANGE) {
      const dx = p.x - c.x, dy = p.y - c.y;
      const m = Math.hypot(dx, dy);
      c.vx += (dx / m) * 800 * dt;
      c.vy += (dy / m) * 800 * dt;
    }
    // Damping
    c.vx *= 0.9; c.vy *= 0.9;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.ttl -= dt;
    if (d < 14) {
      // Pickup
      p.coins++;
      g.runCoins++;
      c.ttl = -1;  // mark for removal
    }
  }
  g.coins = g.coins.filter(c => c.ttl > 0);

  // ── Particles ──
  for (const part of g.particles) {
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vx *= 0.92; part.vy *= 0.92;
    part.ttl -= dt;
    part.size *= 0.97;
  }
  g.particles = g.particles.filter(part => part.ttl > 0 && part.size > 0.3);

  // ── Chest interaction (proximity) ──
  for (const ch of g.level.chests) {
    if (ch.opened) continue;
    if (dist(ch, p) < 22) {
      ch.opened = true;
      // 3-6 coins from a chest.
      const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        g.coins.push({
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: ch.x + rand(-20, 20), y: ch.y + rand(-20, 20),
          vx: rand(-50, 50), vy: rand(-80, -20),
          ttl: 12,
        });
      }
      spawnParticles(g, ch.x, ch.y, "#fde047", 22);
    }
  }

  // ── Descend check ──
  if (dist(p, g.level.stairs) < 22) g.state = "descending";

  // ── Camera follows player smoothly ──
  const camLerp = 1 - Math.exp(-dt * 6);
  g.cameraX += (p.x - g.cameraX) * camLerp;
  g.cameraY += (p.y - g.cameraY) * camLerp;
}

function spawnParticles(g: Game, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 120;
    g.particles.push({
      x, y,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      color, ttl: 0.4 + Math.random() * 0.3,
      size: 3 + Math.random() * 2,
    });
  }
}
