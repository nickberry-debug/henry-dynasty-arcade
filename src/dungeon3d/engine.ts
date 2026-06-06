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

export type ClassId = "warrior" | "ranger" | "mage";

// ── Phase 4: loot rarity + item interface ──────────────────────────
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface Item {
  id: string;
  kind: "weapon" | "armor" | "trinket";
  name: string;
  rarity: Rarity;
  affixes: {
    dmgPct?: number;
    speedPct?: number;
    hpPct?: number;
    rangedCdPct?: number;
    meleeRangePct?: number;
  };
  x: number;
  z: number;
  pickedUp: boolean;
}

/** Three.js hex colors for the glowing prism + button glow. */
export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0xffffff,
  uncommon: 0x6ee07a,
  rare: 0x60a5fa,
  epic: 0xc8a0ff,
  legendary: 0xffa040,
};

/** CSS hex strings for HUD / toast / button styling. */
export const RARITY_HEX: Record<Rarity, string> = {
  common: "#ffffff",
  uncommon: "#6ee07a",
  rare: "#60a5fa",
  epic: "#c8a0ff",
  legendary: "#ffa040",
};

export interface ClassDef {
  id: ClassId;
  label: string;
  tagline: string;
  hpMax: number;
  speed: number;
  attackDmg: number;
  attackRange: number;
  attackDur: number;
  rangedCdDur: number;
  rangedDmg: number;
  rangedSpeed: number;
  rangedRadius: number;
  tint: number;
}

export const CLASS_DEFS: Record<ClassId, ClassDef> = {
  warrior: {
    id: "warrior", label: "Warrior", tagline: "Charge in, hit hard.",
    hpMax: 120, speed: 6.8,
    attackDmg: 22, attackRange: 2.6, attackDur: 0.34,
    // Warrior's Zap = dash, not a projectile. Cooldown lives in rangedCdDur.
    rangedCdDur: 0.7, rangedDmg: 22, rangedSpeed: 0, rangedRadius: 0,
    tint: 0xff8a4c,
  },
  ranger: {
    id: "ranger", label: "Ranger", tagline: "Two arrows, light feet.",
    hpMax: 80, speed: 8.5,
    attackDmg: 10, attackRange: 2.2, attackDur: 0.30,
    rangedCdDur: 0.32, rangedDmg: 10, rangedSpeed: 22, rangedRadius: 0.55,
    tint: 0x6ee07a,
  },
  mage: {
    id: "mage", label: "Mage", tagline: "Frost nova + fat fireball.",
    hpMax: 70, speed: 6.5,
    attackDmg: 15, attackRange: 3.0, attackDur: 0.55,
    rangedCdDur: 1.1, rangedDmg: 32, rangedSpeed: 14, rangedRadius: 0.9,
    tint: 0xc8a0ff,
  },
};

// PHASE5_APPLIED — Phase 5 (XP + abilities + meta) ships in this build
// ── Phase 5: Ability system + class ability pools ────────────────────
//
// "stat" abilities go through recomputePlayerStats (stack with gear).
// "tag" abilities live on player.abilities and gameplay code branches
// on them. Each class has 6 abilities; level-up offers 3 random unused.
// Empty pool falls back to a generic "Refined Edge" +5% all stats.

export type AbilityKind = "stat" | "tag";

export interface AbilityDef {
  id: string;
  kind: AbilityKind;
  name: string;
  desc: string;
  classId: ClassId;
  stat?: {
    hpPct?: number;
    dmgPct?: number;
    speedPct?: number;
    rangedCdPct?: number;
    meleeRangePct?: number;
    rangedDmgPct?: number;
    rangedRangePct?: number;
    dmgTakenPct?: number;       // negative = reduction
    meleeBelow40Pct?: number;   // applied only when hp < 40% of max
  };
}

export const ABILITY_DEFS: AbilityDef[] = [
  // Warrior
  { id: "bulwark",   kind: "stat", classId: "warrior", name: "Bulwark",   desc: "+20% max HP",                   stat: { hpPct: 20 } },
  { id: "vampiric",  kind: "tag",  classId: "warrior", name: "Vampiric",  desc: "Melee hits heal 10% of dmg" },
  { id: "cleave",    kind: "tag",  classId: "warrior", name: "Cleave",    desc: "Melee hits a 90° cone" },
  { id: "momentum",  kind: "tag",  classId: "warrior", name: "Momentum",  desc: "Dash refunds 50% CD on hit" },
  { id: "ironhide",  kind: "stat", classId: "warrior", name: "Ironhide",  desc: "-15% damage taken",             stat: { dmgTakenPct: -15 } },
  { id: "berserker", kind: "stat", classId: "warrior", name: "Berserker", desc: "+30% melee dmg below 40% HP",   stat: { meleeBelow40Pct: 30 } },
  // Ranger
  { id: "swift",       kind: "stat", classId: "ranger", name: "Swift",       desc: "+15% speed",                 stat: { speedPct: 15 } },
  { id: "pierce",      kind: "tag",  classId: "ranger", name: "Pierce",      desc: "Arrows pass through 1 enemy" },
  { id: "triple_shot", kind: "tag",  classId: "ranger", name: "Triple Shot", desc: "Fire 3 arrows per press" },
  { id: "eagle_eye",   kind: "stat", classId: "ranger", name: "Eagle Eye",   desc: "+30% ranged dmg, +50% range", stat: { rangedDmgPct: 30, rangedRangePct: 50 } },
  { id: "evasion",     kind: "tag",  classId: "ranger", name: "Evasion",     desc: "25% chance to dodge a hit" },
  { id: "quickdraw",   kind: "stat", classId: "ranger", name: "Quickdraw",   desc: "-20% ranged cooldown",       stat: { rangedCdPct: 20 } },
  // Mage
  { id: "arcane_battery",  kind: "stat", classId: "mage", name: "Arcane Battery",  desc: "-25% ranged cooldown", stat: { rangedCdPct: 25 } },
  { id: "frost_nova_plus", kind: "tag",  classId: "mage", name: "Frost Nova+",     desc: "Nova hitstun doubles" },
  { id: "fireball_split",  kind: "tag",  classId: "mage", name: "Fireball Split",  desc: "Fireball splits into 4" },
  { id: "mana_shield",     kind: "tag",  classId: "mage", name: "Mana Shield",     desc: "First hit per floor negated" },
  { id: "meteor",          kind: "tag",  classId: "mage", name: "Meteor",          desc: "Every 8th shot is a meteor (3× dmg)" },
  { id: "chilling_aura",   kind: "tag",  classId: "mage", name: "Chilling Aura",   desc: "Enemies within 4u slowed 30%" },
];

/** XP required to reach the next level. Curve: 100, 145, 210, 305, 442, ... */
export function xpForLevel(level: number): number {
  return 100 * Math.floor(Math.pow(1.45, Math.max(0, level - 1)));
}

/** XP awarded per kill, scaling with floor depth. */
export function xpForKill(kind: EnemyKind, depth: number): number {
  const base = kind === "scout" ? 14 : kind === "brute" ? 22 : 8;
  return base * Math.max(1, depth);
}

export function unusedAbilities(p: Player): AbilityDef[] {
  return ABILITY_DEFS.filter(a => a.classId === p.classId && !p.abilities.includes(a.id));
}

function _sampleN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/** Pick up to 3 level-up choices. Empty pool returns the fallback id. */
export function pickLevelUpChoices(p: Player): string[] {
  const pool = unusedAbilities(p);
  if (pool.length === 0) return ["refined_edge"];
  return _sampleN(pool, 3).map(a => a.id);
}

/** Look up an ability by id. Handles the synthetic "refined_edge" fallback. */
export function getAbilityDef(id: string): AbilityDef | null {
  if (id === "refined_edge") {
    return {
      id: "refined_edge",
      classId: "warrior",
      kind: "stat",
      name: "Refined Edge",
      desc: "+5% all stats",
      stat: { hpPct: 5, dmgPct: 5, speedPct: 5, rangedCdPct: 5, rangedDmgPct: 5 },
    };
  }
  return ABILITY_DEFS.find(a => a.id === id) ?? null;
}

// ── Phase 5: Meta progression (soul shards + persistent unlocks) ────

export type MetaUnlockId =
  | "warrior_veteran" | "warrior_sharpened" | "warrior_ironclad"
  | "ranger_trained"  | "ranger_marksman"   | "ranger_eaglescout"
  | "mage_apprentice" | "mage_adept"        | "mage_archmage";

export interface MetaUnlockDef {
  id: MetaUnlockId;
  classId: ClassId;
  name: string;
  desc: string;
  cost: number;
  apply: (base: ClassDef) => ClassDef;
  /** Player-side hook: e.g. ironclad reduces dmg taken. */
  dmgTakenPct?: number;
}

export const META_UNLOCKS: MetaUnlockDef[] = [
  { id: "warrior_veteran",   classId: "warrior", name: "Veteran",     desc: "+10% max HP",          cost: 50,  apply: b => ({ ...b, hpMax: Math.round(b.hpMax * 1.1) }) },
  { id: "warrior_sharpened", classId: "warrior", name: "Sharpened",   desc: "+10% melee dmg",       cost: 75,  apply: b => ({ ...b, attackDmg: b.attackDmg * 1.1 }) },
  { id: "warrior_ironclad",  classId: "warrior", name: "Ironclad",    desc: "-10% dmg taken",       cost: 150, apply: b => b, dmgTakenPct: -10 },
  { id: "ranger_trained",    classId: "ranger",  name: "Trained",     desc: "+10% speed",           cost: 50,  apply: b => ({ ...b, speed: b.speed * 1.1 }) },
  { id: "ranger_marksman",   classId: "ranger",  name: "Marksman",    desc: "+10% ranged dmg",      cost: 75,  apply: b => ({ ...b, rangedDmg: b.rangedDmg * 1.1 }) },
  { id: "ranger_eaglescout", classId: "ranger",  name: "Eagle Scout", desc: "-10% ranged cooldown", cost: 150, apply: b => ({ ...b, rangedCdDur: b.rangedCdDur * 0.9 }) },
  { id: "mage_apprentice",   classId: "mage",    name: "Apprentice",  desc: "+10% max HP",          cost: 50,  apply: b => ({ ...b, hpMax: Math.round(b.hpMax * 1.1) }) },
  { id: "mage_adept",        classId: "mage",    name: "Adept",       desc: "+10% nova dmg",        cost: 75,  apply: b => ({ ...b, attackDmg: b.attackDmg * 1.1 }) },
  { id: "mage_archmage",     classId: "mage",    name: "Archmage",    desc: "-10% ranged cooldown", cost: 150, apply: b => ({ ...b, rangedCdDur: b.rangedCdDur * 0.9 }) },
];

/** Effective base ClassDef given the player's purchased meta unlocks. */
export function classDefWithMeta(classId: ClassId, unlockIds: string[]): ClassDef {
  let base: ClassDef = { ...CLASS_DEFS[classId] };
  for (const u of META_UNLOCKS) {
    if (u.classId !== classId) continue;
    if (!unlockIds.includes(u.id)) continue;
    base = u.apply(base);
  }
  return base;
}

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
  // ── Phase 3: class data ────────────────────────────────────────
  classId: ClassId;
  speed: number;
  attackDmg: number;
  attackRange: number;
  rangedDmg: number;
  rangedSpeed: number;
  rangedRadius: number;
  // Warrior dash state. dashT > 0 means we're dashing; dashHit tracks
  // enemy ids already damaged so one dash doesn't tick repeatedly.
  dashT: number;
  dashVx: number;
  dashVz: number;
  dashHit: Set<string>;
  // ── Phase 4: equipped gear + interact debounce ─────────────────
  equipped: { weapon?: Item; armor?: Item; trinket?: Item };
  interactCd: number;
  // Phase 5: progression
  xp: number;
  xpToNext: number;
  level: number;
  /** Ability ids picked this run. */
  abilities: string[];
  /** Meta unlocks the player owns (persists across runs). */
  metaUnlocks: string[];
  /** Derived: 1.0 = no change, <1 = reduction. */
  dmgTakenMult: number;
  /** Derived: bonus melee dmg applied only when hp < 40% of max. */
  meleeBelow40Mult: number;
  /** Phase 5 tag-runtime state. */
  manaShieldUsedThisFloor: boolean;
  /** Number of ranged shots fired this run (drives meteor cadence). */
  shotCount: number;
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
  hitStun: number;
  kbX: number;
  kbZ: number;
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
  /** Override collision radius. Defaults to RANGED_RADIUS if absent. */
  radius?: number;
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
  // ── Phase 4: loot on the ground + interact state ───────────────
  items: Item[];
  toast: { text: string; rarity: Rarity; ttl: number } | null;
  nearestPickable: Item | null;
  // ── Phase 5 ─────────────────────────────
  /** When true, the engine pauses while the level-up modal is open. */
  pendingLevelUp: boolean;
  /** Ability ids offered in the level-up modal. */
  levelUpChoices: string[];
  /** Shards earned this run (becomes runShards on death). */
  runShardsEarned: number;
  /** Set to true after death so the UI can show the banner once. */
  runEnded: boolean;
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

export function newPlayer(level: DungeonLevel, classId: ClassId = "warrior", metaUnlocks: string[] = []): Player {
  // Phase 5: base = CLASS_DEFS + meta unlocks (applied BEFORE gear/ability math).
  const cd = classDefWithMeta(classId, metaUnlocks);
  const p: Player = {
    x: level.spawn.x, z: level.spawn.z, facing: 0,
    hp: cd.hpMax, hpMax: cd.hpMax, coins: 0,
    attackT: 0, attackDur: cd.attackDur,
    iframes: 0, flashT: 0,
    rangedCd: 0, rangedCdDur: cd.rangedCdDur,
    anim: "idle",
    classId,
    speed: cd.speed,
    attackDmg: cd.attackDmg,
    attackRange: cd.attackRange,
    rangedDmg: cd.rangedDmg,
    rangedSpeed: cd.rangedSpeed,
    rangedRadius: cd.rangedRadius,
    dashT: 0, dashVx: 0, dashVz: 0, dashHit: new Set<string>(),
    equipped: {},
    interactCd: 0,
    xp: 0, xpToNext: xpForLevel(1), level: 1,
    abilities: [],
    metaUnlocks: [...metaUnlocks],
    dmgTakenMult: 1.0,
    meleeBelow40Mult: 1.0,
    manaShieldUsedThisFloor: false,
    shotCount: 0,
  };
  return p;
}

export function newGame(depth = 1, classId: ClassId = "warrior", metaUnlocks: string[] = []): Game {
  const level = genLevel(depth);
  const player = newPlayer(level, classId, metaUnlocks);
  // Phase 5: recompute stats once so any % bumps are reflected on frame 1.
  recomputePlayerStats(player);
  const enemies: Enemy[] = level.enemies.map(mkEnemy);
  return {
    level, depth, player,
    enemies, coins: [], projectiles: [],
    state: "playing",
    cameraTargetX: player.x, cameraTargetZ: player.z,
    hitStop: 0, elapsed: 0, runCoins: 0, runKills: 0,
    items: [], toast: null, nearestPickable: null,
    pendingLevelUp: false, levelUpChoices: [], runShardsEarned: 0, runEnded: false,
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
    hitStun: 0, kbX: 0, kbZ: 0,
  };
}

export function descendLevel(g: Game): Game {
  const next = genLevel(g.depth + 1);
  const player: Player = {
    ...g.player,
    x: next.spawn.x, z: next.spawn.z,
    attackT: 0, iframes: 1.0, flashT: 0, anim: "idle",
    dashT: 0, dashVx: 0, dashVz: 0, dashHit: new Set<string>(),
    interactCd: 0,
    // Phase 5: refresh mana shield each floor.
    manaShieldUsedThisFloor: false,
  };
  // Phase 4: floor-clear bonus — guaranteed uncommon+ drop near the new spawn.
  const _bonusItem = rollLoot(
    next.spawn.x + (Math.random() - 0.5) * 2,
    next.spawn.z + (Math.random() - 0.5) * 2,
    pickRarityMin("uncommon"),
  );
  return {
    level: next, depth: g.depth + 1, player,
    enemies: next.enemies.map(mkEnemy),
    coins: [], projectiles: [],
    state: "playing",
    cameraTargetX: player.x, cameraTargetZ: player.z,
    hitStop: 0, elapsed: 0,
    runCoins: g.runCoins, runKills: g.runKills,
    items: [_bonusItem], toast: null, nearestPickable: null,
    // Phase 5: carry over the level-up + shards bookkeeping (game-level).
    pendingLevelUp: g.pendingLevelUp, levelUpChoices: g.levelUpChoices,
    runShardsEarned: g.runShardsEarned, runEnded: g.runEnded,
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

// ── Phase 4: Loot generation + helpers ───────────────────────────────

const LOOT_BASE_CHANCE_PCT = 18;
const PICKUP_LOOT_RANGE = 1.2;

const ITEM_NAMES: Record<Item["kind"], string[]> = {
  weapon: ["Iron Sword", "Hunter's Bow", "Frost Staff", "Reaver Blade", "Stalker's Edge", "Ember Wand", "Thorn Spike"],
  armor: ["Hunter's Cloak", "Plate Vest", "Mage Robe", "Shadow Wraps", "Bulwark Vest", "Wraith Mantle"],
  trinket: ["Ember Charm", "Sigil of Sight", "Howling Talisman", "Stone of Brawn", "Whisper Stone", "Ember Pendant"],
};

function pickRarity(): Rarity {
  // Weights: common 55, uncommon 25, rare 13, epic 6, legendary 1.
  const r = Math.random() * 100;
  if (r < 1) return "legendary";
  if (r < 7) return "epic";
  if (r < 20) return "rare";
  if (r < 45) return "uncommon";
  return "common";
}

function pickRarityMin(min: Rarity): Rarity {
  const order: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
  const minIdx = order.indexOf(min);
  // Bounded reroll — keeps natural distribution above the floor.
  for (let i = 0; i < 8; i++) {
    const r = pickRarity();
    if (order.indexOf(r) >= minIdx) return r;
  }
  return min;
}

function rollAffixes(rarity: Rarity): Item["affixes"] {
  const cfg: Record<Rarity, { count: [number, number]; range: [number, number] }> = {
    common:    { count: [1, 1], range: [3, 6] },
    uncommon:  { count: [1, 2], range: [5, 10] },
    rare:      { count: [2, 2], range: [10, 15] },
    epic:      { count: [2, 3], range: [15, 25] },
    legendary: { count: [3, 3], range: [25, 40] },
  };
  const c = cfg[rarity];
  const n = randint(c.count[0], c.count[1]);
  const keys: Array<keyof Item["affixes"]> = ["dmgPct", "speedPct", "hpPct", "rangedCdPct", "meleeRangePct"];
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  const aff: Item["affixes"] = {};
  for (let i = 0; i < n && i < shuffled.length; i++) {
    const v = c.range[0] + Math.random() * (c.range[1] - c.range[0]);
    aff[shuffled[i]] = Math.round(v);
  }
  return aff;
}

/** Spawn a fresh ground item at (x, z). Optional rarity override is used
 *  by the descend-bonus path; otherwise picks per the global weights. */
export function rollLoot(x: number, z: number, rarityOverride?: Rarity): Item {
  const rarity = rarityOverride ?? pickRarity();
  const kinds: Array<Item["kind"]> = ["weapon", "armor", "trinket"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const pool = ITEM_NAMES[kind];
  const name = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind, name, rarity,
    affixes: rollAffixes(rarity),
    x, z,
    pickedUp: false,
  };
}

function tryEnemyLoot(g: Game, e: Enemy) {
  // Base 18%, +5% on brutes, +3% on scouts.
  const base = LOOT_BASE_CHANCE_PCT;
  const bonus = e.kind === "brute" ? 5 : e.kind === "scout" ? 3 : 0;
  if (Math.random() * 100 < base + bonus) {
    g.items.push(rollLoot(e.x, e.z));
  }
}

/** Apply equipped affixes as percentage multipliers on top of class base
 *  stats. Call after every equip / unequip so the next frame sees the
 *  new derived values. Current HP scales with new max so a heal effect
 *  doesn't pop the player below 1 HP. */
export function recomputePlayerStats(p: Player) {
  // Phase 5: base ClassDef -> meta unlocks -> ability stat bumps -> gear affixes.
  const base = classDefWithMeta(p.classId, p.metaUnlocks ?? []);
  let dmg = 0, spd = 0, hp = 0, rcd = 0, mrange = 0;
  let rngDmg = 0, rngRange = 0;
  let dmgTakenPct = 0;
  let meleeBelow40Pct = 0;
  // Meta-unlock damage-taken hooks (e.g. warrior_ironclad: -10%).
  for (const m of META_UNLOCKS) {
    if (m.classId !== p.classId) continue;
    if (!(p.metaUnlocks ?? []).includes(m.id)) continue;
    if (m.dmgTakenPct) dmgTakenPct += m.dmgTakenPct;
  }
  // Ability stat bumps (stat-kind abilities only).
  for (const aid of (p.abilities ?? [])) {
    const def = getAbilityDef(aid);
    if (!def || !def.stat) continue;
    const s = def.stat;
    if (s.hpPct)            hp += s.hpPct;
    if (s.dmgPct)           dmg += s.dmgPct;
    if (s.speedPct)         spd += s.speedPct;
    if (s.rangedCdPct)      rcd += s.rangedCdPct;
    if (s.meleeRangePct)    mrange += s.meleeRangePct;
    if (s.rangedDmgPct)     rngDmg += s.rangedDmgPct;
    if (s.rangedRangePct)   rngRange += s.rangedRangePct;
    if (s.dmgTakenPct)      dmgTakenPct += s.dmgTakenPct;
    if (s.meleeBelow40Pct)  meleeBelow40Pct += s.meleeBelow40Pct;
  }
  // Gear affixes (Phase 4).
  for (const slot of ["weapon", "armor", "trinket"] as const) {
    const it = p.equipped[slot];
    if (!it) continue;
    if (it.affixes.dmgPct) dmg += it.affixes.dmgPct;
    if (it.affixes.speedPct) spd += it.affixes.speedPct;
    if (it.affixes.hpPct) hp += it.affixes.hpPct;
    if (it.affixes.rangedCdPct) rcd += it.affixes.rangedCdPct;
    if (it.affixes.meleeRangePct) mrange += it.affixes.meleeRangePct;
  }
  const prevMax = p.hpMax || base.hpMax;
  const newMax = Math.max(1, Math.round(base.hpMax * (1 + hp / 100)));
  p.hp = Math.max(1, Math.min(newMax, Math.round((p.hp || base.hpMax) * (newMax / prevMax))));
  p.hpMax = newMax;
  p.speed = base.speed * (1 + spd / 100);
  p.attackDmg = base.attackDmg * (1 + dmg / 100);
  p.attackRange = base.attackRange * (1 + mrange / 100);
  p.rangedDmg = base.rangedDmg * (1 + (dmg + rngDmg) / 100);
  p.rangedCdDur = Math.max(0.05, base.rangedCdDur * (1 - rcd / 100));
  // Phase 5: derived multipliers.
  p.dmgTakenMult = Math.max(0.1, 1 + dmgTakenPct / 100);
  p.meleeBelow40Mult = 1 + meleeBelow40Pct / 100;
  // eagle_eye's +50% range extends ranged engagement distance (used in step()).
  (p as any).rangedRangeMult = 1 + rngRange / 100;
}

/** Award XP from a kill, level up + queue the modal if threshold crossed. */
export function awardXpForKill(g: Game, kind: EnemyKind) {
  const p = g.player;
  const gained = xpForKill(kind, g.depth);
  p.xp += gained;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level += 1;
    p.xpToNext = xpForLevel(p.level);
    g.pendingLevelUp = true;
    g.levelUpChoices = pickLevelUpChoices(p);
  }
}

/** Apply a chosen ability id. Stat-kind = added + recompute. */
export function applyAbilityChoice(p: Player, abilityId: string) {
  if (!p.abilities.includes(abilityId)) p.abilities.push(abilityId);
  recomputePlayerStats(p);
}


// ── Step ─────────────────────────────────────────────────────────────

export interface InputState {
  ax: number;   // -1..1
  az: number;
  attack: boolean;
  ranged: boolean;
  interact: boolean;
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
  // Phase 3: Warrior dash overrides regular movement while dashT > 0.
  if (p.dashT > 0) {
    p.dashT = Math.max(0, p.dashT - dt);
    tryMove(g.level, p, p.dashVx * dt, p.dashVz * dt, PLAYER_R);
    // Contact damage to enemies whose hitbox the dash crosses.
    for (const e of g.enemies) {
      if (e.deathT > 0) continue;
      if (p.dashHit.has(e.id)) continue;
      const ddx = e.x - p.x, ddz = e.z - p.z;
      const rsum = PLAYER_R + ENEMY_R + 0.2;
      if (ddx * ddx + ddz * ddz < rsum * rsum) {
        p.dashHit.add(e.id);
        const _dashDmg = p.attackDmg * ((p.hp < p.hpMax * 0.4) ? (p.meleeBelow40Mult ?? 1) : 1);
        e.hp -= _dashDmg;
        e.flashT = 0.18;
        // Phase 5: Vampiric heal on dash impact.
        if (p.abilities.includes("vampiric")) {
          p.hp = Math.min(p.hpMax, p.hp + _dashDmg * 0.10);
        }
        // Phase 5: Momentum refunds 50% of the ranged CD on dash hits.
        if (p.abilities.includes("momentum")) {
          p.rangedCd = Math.max(0, p.rangedCd - p.rangedCdDur * 0.5);
        }
        const _vm = Math.hypot(p.dashVx, p.dashVz) || 1;
        e.hitStun = 0.15;
        e.kbX = p.dashVx / _vm;
        e.kbZ = p.dashVz / _vm;
        if (e.hp <= 0) {
          e.deathT = 0.6;
          g.runKills++; awardXpForKill(g, e.kind);
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
          tryEnemyLoot(g, e);
          g.hitStop = Math.max(g.hitStop, 0.10);
        } else {
          g.hitStop = Math.max(g.hitStop, 0.04);
        }
      }
    }
    p.facing = Math.atan2(p.dashVx, p.dashVz);
    p.anim = "attack";
  } else {
    const mag = Math.hypot(input.ax, input.az);
    if (mag > 0.01) {
      const nx = (input.ax / mag) * p.speed * dt;
      const nz = (input.az / mag) * p.speed * dt;
      tryMove(g.level, p, nx, nz, PLAYER_R);
      p.facing = Math.atan2(input.ax, input.az);
      p.anim = p.attackT > 0 ? "attack" : "walk";
    } else {
      p.anim = p.attackT > 0 ? "attack" : "idle";
    }
  }
  if (p.flashT > 0) p.anim = "hurt";

  // ── Player attack ──
  if (input.attack && p.attackT <= 0 && p.iframes <= 0 && p.dashT <= 0) {
    p.attackT = p.attackDur;
    // Phase 5: cleave widens to a 90° cone; frost_nova_plus doubles nova hitstun.
    const isNova = p.classId === "mage";
    const hasCleave = p.abilities.includes("cleave") && !isNova;
    const hasFrostPlus = isNova && p.abilities.includes("frost_nova_plus");
    const ahead = p.attackRange * 0.5;
    const hbX = (isNova || hasCleave) ? p.x : p.x + Math.sin(p.facing) * ahead;
    const hbZ = (isNova || hasCleave) ? p.z : p.z - Math.cos(p.facing) * ahead;
    const hitR = hasCleave ? p.attackRange * 1.2 : p.attackRange;
    // Phase 5: Berserker bonus when hp < 40% of max.
    const _meleeMult = (p.hp < p.hpMax * 0.4) ? (p.meleeBelow40Mult ?? 1) : 1;
    const _outDmg = p.attackDmg * _meleeMult;
    for (const e of g.enemies) {
      if (e.deathT > 0) continue;
      let _inHit: boolean;
      if (hasCleave) {
        const _dx = e.x - p.x, _dz = e.z - p.z;
        const _d = Math.hypot(_dx, _dz);
        if (_d >= hitR) _inHit = false;
        else {
          const _fx = Math.sin(p.facing), _fz = Math.cos(p.facing);
          const _cosA = (_dx * _fx + _dz * _fz) / Math.max(0.01, _d);
          _inHit = _cosA > Math.SQRT1_2; // ~45° half-angle = 90° cone
        }
      } else {
        _inHit = dist2({ x: hbX, z: hbZ }, e) < hitR;
      }
      if (_inHit) {
        e.hp -= _outDmg;
        e.flashT = 0.18;
        // Phase 5: Vampiric heal (non-mage melee).
        if (p.abilities.includes("vampiric") && !isNova) {
          p.hp = Math.min(p.hpMax, p.hp + _outDmg * 0.10);
        }
        // Hit-react: stun + knockback away from player. frost_nova_plus -> 0.5s.
        {
          const _kdx = e.x - p.x, _kdz = e.z - p.z;
          const _km = Math.hypot(_kdx, _kdz) || 1;
          e.hitStun = isNova ? (hasFrostPlus ? 0.5 : 0.25) : 0.12;
          e.kbX = _kdx / _km;
          e.kbZ = _kdz / _km;
        }
        if (e.hp <= 0) {
          e.deathT = 0.6;
          g.runKills++; awardXpForKill(g, e.kind);
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
          tryEnemyLoot(g, e);
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
  if (input.ranged && p.rangedCd <= 0 && p.iframes <= 0 && p.dashT <= 0) {
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
    if (p.classId === "warrior") {
      // Warrior dash: 4u forward over 0.2s, contact damage handled in
      // movement block via dashHit set.
      p.dashT = 0.2;
      p.dashVx = dirX * (4 / 0.2);
      p.dashVz = dirZ * (4 / 0.2);
      p.dashHit = new Set<string>();
      p.iframes = Math.max(p.iframes, 0.22);
      g.hitStop = Math.max(g.hitStop, 0.04);
    } else if (p.classId === "ranger") {
      // Phase 5: Triple Shot fires 3 arrows in a fan; otherwise 2.
      const triple = p.abilities.includes("triple_shot");
      const spd = p.rangedSpeed;
      const fire = (oX: number, oZ: number, tag: string) => {
        g.projectiles.push({
          id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${tag}`,
          x: p.x + oX * 0.7, z: p.z + oZ * 0.7,
          vx: oX * spd, vz: oZ * spd,
          ttl: RANGED_TTL, damage: p.rangedDmg, radius: p.rangedRadius,
        });
      };
      const ang = (15 * Math.PI) / 180;
      if (triple) {
        fire(dirX, dirZ, "c");
        const cA = Math.cos(ang), sA = Math.sin(ang);
        fire(dirX * cA - dirZ * sA, dirX * sA + dirZ * cA, "l");
        fire(dirX * cA + dirZ * sA, -dirX * sA + dirZ * cA, "r");
      } else {
        const sign = Math.random() < 0.5 ? -1 : 1;
        const cosA = Math.cos(ang * sign);
        const sinA = Math.sin(ang * sign);
        fire(dirX, dirZ, "a");
        fire(dirX * cosA - dirZ * sinA, dirX * sinA + dirZ * cosA, "b");
      }
      g.hitStop = Math.max(g.hitStop, 0.03);
    } else {
      // Phase 5: count shots for meteor cadence.
      p.shotCount = (p.shotCount | 0) + 1;
      const _hasMeteor = p.abilities.includes("meteor");
      const _isMeteor = _hasMeteor && (p.shotCount % 8 === 0);
      const _hasSplit = p.abilities.includes("fireball_split");
      g.projectiles.push({
        id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: p.x + dirX * 0.7, z: p.z + dirZ * 0.7,
        vx: dirX * p.rangedSpeed * (_isMeteor ? 0.6 : 1), vz: dirZ * p.rangedSpeed * (_isMeteor ? 0.6 : 1),
        ttl: RANGED_TTL + 0.4, damage: p.rangedDmg * (_isMeteor ? 3 : 1), radius: (_isMeteor ? p.rangedRadius * 1.8 : p.rangedRadius),
      });
      // Fireball Split: scatter 4 mini fireballs in a forward fan.
      if (_hasSplit && !_isMeteor) {
        const ang0 = Math.atan2(dirX, dirZ);
        for (let k = 0; k < 4; k++) {
          const off = (k - 1.5) * 0.22;
          const a = ang0 + off;
          const ox = Math.sin(a), oz = Math.cos(a);
          g.projectiles.push({
            id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_s${k}`,
            x: p.x + ox * 0.9, z: p.z + oz * 0.9,
            vx: ox * p.rangedSpeed * 0.9, vz: oz * p.rangedSpeed * 0.9,
            ttl: RANGED_TTL, damage: 12, radius: 0.4,
          });
        }
      }
      g.hitStop = Math.max(g.hitStop, 0.05);
    }
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
      const rsum = (pr.radius ?? RANGED_RADIUS) + ENEMY_R;
      if (dx * dx + dz * dz < rsum * rsum) {
        e.hp -= pr.damage;
        e.flashT = 0.18;
        // Hit-react: stun + knockback along projectile velocity.
        {
          const _vm = Math.hypot(pr.vx, pr.vz) || 1;
          e.hitStun = 0.12;
          e.kbX = pr.vx / _vm;
          e.kbZ = pr.vz / _vm;
        }
        if (e.hp <= 0) {
          e.deathT = 0.6;
          g.runKills++; awardXpForKill(g, e.kind);
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
          tryEnemyLoot(g, e);
          g.hitStop = Math.max(g.hitStop, 0.10);
        }
        hit = true;
        break;
      }
    }
    if (hit) {
      // Phase 5: Pierce lets a projectile pass through 1 enemy.
      const _hasPierce = g.player.abilities.includes("pierce");
      const pr2 = g.projectiles[i];
      if (_hasPierce && pr2 && !(pr2 as any).pierced) {
        (pr2 as any).pierced = true;
        // Nudge past the enemy so the next frame doesn't re-collide.
        pr2.x += pr2.vx * 0.04;
        pr2.z += pr2.vz * 0.04;
      } else {
        g.projectiles.splice(i, 1);
      }
    }
  }

  // ── Enemies ──
  for (const e of g.enemies) {
    if (e.deathT > 0) { e.deathT = Math.max(0, e.deathT - dt); continue; }
    if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt);
    // Hit-stun: apply knockback push, skip AI/movement while stunned.
    if (e.hitStun > 0) {
      e.hitStun = Math.max(0, e.hitStun - dt);
      const KB_SPEED = 4.0;  // ~0.4 units over ~0.1s
      if (e.kbX !== 0 || e.kbZ !== 0) {
        tryMove(g.level, e, e.kbX * KB_SPEED * dt, e.kbZ * KB_SPEED * dt, ENEMY_R);
      }
      continue;
    }
    const d = dist2(e, p);
    if (d < 10) e.state = d < ENEMY_ATTACK_RANGE ? "attack" : "chase";
    else e.state = "idle";
    if (e.state === "chase") {
      const dx = p.x - e.x, dz = p.z - e.z;
      const m = Math.hypot(dx, dz);
      if (m > 0.1) {
        // Phase 5: Chilling Aura slows enemies within 4u by 30%.
        const _aura = p.abilities.includes("chilling_aura") && m < 4 ? 0.7 : 1.0;
        const speed = ENEMY_SPEED * dt * _aura;
        tryMove(g.level, e, (dx / m) * speed, (dz / m) * speed, ENEMY_R);
        // Same facing-fix as the player.
        e.facing = Math.atan2(dx, dz);
      }
    }
    e.atkCd = Math.max(0, e.atkCd - dt);
    if (e.state === "attack" && e.atkCd <= 0 && p.iframes <= 0) {
      // Phase 5 hit-take pipeline: evasion -> mana_shield -> dmgTakenMult.
      let _incoming = ENEMY_DAMAGE * (p.dmgTakenMult ?? 1);
      let _negated = false;
      if (p.abilities.includes("evasion") && Math.random() < 0.25) {
        _incoming = 0;
        _negated = true;
        p.iframes = 0.4;
        p.flashT = 0.12;
      } else if (p.abilities.includes("mana_shield") && !p.manaShieldUsedThisFloor) {
        _incoming = 0;
        _negated = true;
        p.manaShieldUsedThisFloor = true;
        p.iframes = 0.5;
        p.flashT = 0.24;
      }
      p.hp -= _incoming;
      if (!_negated) p.flashT = 0.32;
      p.iframes = Math.max(p.iframes, 0.7);
      g.hitStop = 0.08;
      e.atkCd = 1.0;
      if (p.hp <= 0) {
        // Phase 5: real death. Award shards = runKills + floor*5.
        if (!g.runEnded) {
          g.runShardsEarned = g.runKills + g.depth * 5;
          g.runEnded = true;
        }
        p.hp = 0;
        p.iframes = 999;
        g.state = "cleared"; // re-use existing terminal state for UI gating
      }
    }
  }
  g.enemies = g.enemies.filter(e => e.deathT > 0 || e.hp > 0);

  // ── Body-block / shoulder-bump ──
  // Player-enemy overlap pushes them apart. If either is mid-attack we
  // amplify the push and add a tiny hit-stop so contact has weight.
  for (const e of g.enemies) {
    if (e.deathT > 0) continue;
    const dx = e.x - p.x, dz = e.z - p.z;
    const d = Math.hypot(dx, dz);
    const minDist = PLAYER_R + ENEMY_R;
    if (d > 0.001 && d < minDist) {
      const nx = dx / d, nz = dz / d;
      const overlap = minDist - d;
      const amped = (p.attackT > 0 || e.state === "attack");
      const push = overlap * (amped ? 1.6 : 0.8);
      tryMove(g.level, e, nx * push, nz * push, ENEMY_R);
      tryMove(g.level, p, -nx * push * 0.5, -nz * push * 0.5, PLAYER_R);
      if (amped) g.hitStop = Math.max(g.hitStop, 0.03);
    }
  }

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

  // ── Phase 4: nearest pickable + interact press ──
  {
    let nearest: Item | null = null;
    let nearestD = PICKUP_LOOT_RANGE;
    for (const it of g.items) {
      if (it.pickedUp) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < nearestD) { nearestD = d; nearest = it; }
    }
    g.nearestPickable = nearest;
    p.interactCd = Math.max(0, p.interactCd - dt);
    if (input.interact && nearest && p.interactCd <= 0) {
      p.interactCd = 0.3;
      const slot = nearest.kind;
      const prev = p.equipped[slot];
      if (prev) {
        // Replacing: drop the OLD item at the new pickup location for re-pickup.
        prev.x = nearest.x + (Math.random() - 0.5) * 0.6;
        prev.z = nearest.z + (Math.random() - 0.5) * 0.6;
        prev.pickedUp = false;
        g.items.push(prev);
      }
      nearest.pickedUp = true;
      p.equipped[slot] = nearest;
      g.items = g.items.filter(i => !i.pickedUp);
      g.nearestPickable = null;
      recomputePlayerStats(p);
      const a = nearest.affixes;
      const aStr: string[] = [];
      if (a.dmgPct)         aStr.push(`+${a.dmgPct}% dmg`);
      if (a.speedPct)       aStr.push(`+${a.speedPct}% spd`);
      if (a.hpPct)          aStr.push(`+${a.hpPct}% hp`);
      if (a.rangedCdPct)    aStr.push(`+${a.rangedCdPct}% fire rate`);
      if (a.meleeRangePct)  aStr.push(`+${a.meleeRangePct}% reach`);
      g.toast = {
        text: `${nearest.rarity.toUpperCase()} ${nearest.name} — ${aStr.join(", ")}`,
        rarity: nearest.rarity,
        ttl: 2.0,
      };
    }
    if (g.toast) {
      g.toast.ttl -= dt;
      if (g.toast.ttl <= 0) g.toast = null;
    }
  }

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
