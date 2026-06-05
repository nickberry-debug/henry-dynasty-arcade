// ⚡ Survivor — engine. Lives entirely in plain TypeScript so the page
// can drive ticks via requestAnimationFrame without coupling to React.
// All state mutated on the `Game` reference; the page reads it each
// frame and renders.

import type {
  Entity, Projectile, HeroStats, Weapon, WeaponId, Biome,
  RunStats, EnemyArchetype,
} from "./types";
import { WEAPON_TIERS, PASSIVES, BIOMES, ENEMY_GLYPHS } from "./catalog";
import type { Passive } from "./types";

export const ARENA_W = 1000;
export const ARENA_H = 700;
const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

let nextId = 1;
const id = () => nextId++;

/** Equipped weapon slot — references the WEAPON_TIERS table by tier
 *  index so upgrades are a single number bump. */
interface EquippedWeapon {
  weaponId: WeaponId;
  tier: 1 | 2 | 3 | 4;
  /** Cooldown until next fire (seconds). */
  cd: number;
  /** Per-weapon scratch state — used by orbit weapons to track angle. */
  orbitT?: number;
}

interface EquippedPassive {
  id: Passive["id"];
  stacks: number;       // 1..5
}

export interface Game {
  hero: Entity;
  stats: HeroStats;
  biome: Biome;
  /** Input state — set by the page from the joystick. */
  input: { dx: number; dy: number };
  /** Live entities. The hero lives in `hero` separately for clarity. */
  enemies: Entity[];
  gems: Entity[];
  pickups: Entity[];
  projectiles: Projectile[];
  weapons: EquippedWeapon[];
  passives: EquippedPassive[];
  /** Stats display. */
  run: RunStats;
  /** Floating damage numbers — drawn briefly above hit positions. */
  popups: Array<{ x: number; y: number; text: string; color: string; ttl: number }>;
  /** Screen-shake decay in pixels. */
  shake: number;
  /** When the next swarm wave should arrive. */
  nextSwarmAt: number;
  /** Difficulty curve seed — higher every minute. */
  difficulty: number;
  /** Run is over flag — set by the page from hp = 0 OR clock hitting target. */
  over: boolean;
  /** Whether the player won the run (survived the clock) or died. */
  win: boolean;
  /** Target survival length, seconds. */
  targetSeconds: number;
  /** Pause for level-up choice modal. */
  paused: boolean;
}

/** Bootstrap a fresh run. */
export function newGame(args: {
  heroBase: { hp: number; speed: number; pickupRadius: number; armor: number };
  startingWeapons: WeaponId[];
  biomeId: string;
  metaBoosts?: { hp?: number; speed?: number; power?: number; luck?: number; magnet?: number };
  targetSeconds?: number;
}): Game {
  const m = args.metaBoosts ?? {};
  const stats: HeroStats = {
    hp: args.heroBase.hp + (m.hp ?? 0),
    hpMax: args.heroBase.hp + (m.hp ?? 0),
    speed: args.heroBase.speed + (m.speed ?? 0),
    pickupRadius: args.heroBase.pickupRadius + (m.magnet ?? 0),
    armor: args.heroBase.armor,
    power: 1 + (m.power ?? 0) / 100,
    haste: 1,
    luck: 0 + (m.luck ?? 0) / 100,
  };
  const biome = BIOMES.find(b => b.id === args.biomeId) ?? BIOMES[0];
  const hero: Entity = {
    id: id(), kind: "hero",
    x: ARENA_W / 2, y: ARENA_H / 2, vx: 0, vy: 0,
    hp: stats.hp, hpMax: stats.hpMax, radius: 18,
    glyph: "🦸",
  };
  return {
    hero, stats, biome,
    input: { dx: 0, dy: 0 },
    enemies: [], gems: [], pickups: [], projectiles: [],
    weapons: args.startingWeapons.map(w => ({ weaponId: w, tier: 1, cd: 0 })),
    passives: [],
    run: { kills: 0, damage: 0, level: 1, xp: 0, xpToNext: 8, elapsed: 0, coins: 0 },
    popups: [],
    shake: 0,
    nextSwarmAt: 2.0,
    difficulty: 1,
    over: false, win: false,
    targetSeconds: args.targetSeconds ?? 600,  // 10 minutes
    paused: false,
  };
}

/** Pull the current Weapon for an equipped slot. */
export function weaponAt(slot: EquippedWeapon): Weapon {
  return WEAPON_TIERS[slot.weaponId][slot.tier - 1];
}

/** Apply passives to the live stat block. */
export function recomputeStats(g: Game, base: HeroStats): void {
  // Reset to base
  const s = g.stats;
  s.hpMax = base.hpMax;
  s.speed = base.speed;
  s.pickupRadius = base.pickupRadius;
  s.armor = base.armor;
  s.power = base.power;
  s.haste = base.haste;
  s.luck = base.luck;
  for (const p of g.passives) {
    const def = PASSIVES.find(pp => pp.id === p.id);
    if (def) def.apply(s, p.stacks);
  }
  if (s.hp > s.hpMax) s.hp = s.hpMax;
}

/** Add XP; return true if the player leveled up (caller should open choices). */
export function addXp(g: Game, amount: number): boolean {
  g.run.xp += amount;
  let leveled = false;
  while (g.run.xp >= g.run.xpToNext) {
    g.run.xp -= g.run.xpToNext;
    g.run.level += 1;
    g.run.xpToNext = Math.round(g.run.xpToNext * 1.25 + 4);
    leveled = true;
  }
  return leveled;
}

/** Spawn a swarm wave appropriate to current difficulty. */
function spawnWave(g: Game): void {
  const d = g.difficulty;
  const count = Math.min(48, Math.round(6 + d * 3));
  const pool: EnemyArchetype[] =
    d < 2 ? ["swarm"]
    : d < 4 ? ["swarm", "swarm", "fast"]
    : d < 7 ? ["swarm", "fast", "tank"]
    : ["swarm", "fast", "tank", "ranged"];
  for (let i = 0; i < count; i++) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    const ang = Math.random() * Math.PI * 2;
    // Spawn just off-screen relative to hero.
    const dist = 380;
    const ex = g.hero.x + Math.cos(ang) * dist;
    const ey = g.hero.y + Math.sin(ang) * dist;
    g.enemies.push(makeEnemy(a, ex, ey, d, g.biome));
  }
}

function makeEnemy(a: EnemyArchetype, x: number, y: number, diff: number, biome: Biome): Entity {
  const tints = biome.enemyTints;
  const tint = tints[Math.floor(Math.random() * tints.length)];
  const base: Entity = {
    id: id(), kind: "enemy",
    x, y, vx: 0, vy: 0,
    hp: 10, hpMax: 10, radius: 16,
    glyph: pick(ENEMY_GLYPHS.swarm),
    spriteId: a,
    contactDamage: 6,
    tint, archetype: a,
  };
  switch (a) {
    case "swarm":
      base.hp = base.hpMax = Math.round(10 + diff * 4);
      base.radius = 14;
      base.contactDamage = 5;
      base.glyph = pick(ENEMY_GLYPHS.swarm);
      break;
    case "fast":
      base.hp = base.hpMax = Math.round(14 + diff * 4);
      base.radius = 14;
      base.contactDamage = 8;
      base.glyph = pick(ENEMY_GLYPHS.fast);
      break;
    case "tank":
      base.hp = base.hpMax = Math.round(80 + diff * 18);
      base.radius = 22;
      base.contactDamage = 14;
      base.glyph = pick(ENEMY_GLYPHS.tank);
      break;
    case "ranged":
      base.hp = base.hpMax = Math.round(20 + diff * 6);
      base.radius = 16;
      base.contactDamage = 8;
      base.glyph = pick(ENEMY_GLYPHS.ranged);
      break;
    case "shooter":
      base.hp = base.hpMax = Math.round(28 + diff * 8);
      base.radius = 16;
      base.contactDamage = 10;
      base.glyph = pick(ENEMY_GLYPHS.shooter);
      break;
    case "miniboss":
      base.kind = "enemy";
      base.hp = base.hpMax = Math.round(380 + diff * 80);
      base.radius = 32;
      base.contactDamage = 22;
      base.glyph = pick(ENEMY_GLYPHS.miniboss);
      break;
    case "boss":
      base.kind = "boss";
      base.hp = base.hpMax = 2400;
      base.radius = 48;
      base.contactDamage = 30;
      base.glyph = pick(ENEMY_GLYPHS.boss);
      break;
  }
  return base;
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

/** One simulation step. The page schedules these from rAF. */
export function tick(g: Game, dt: number): void {
  if (g.over || g.paused) return;

  g.run.elapsed += dt;
  // Difficulty climbs ~1 every 45s
  g.difficulty = 1 + g.run.elapsed / 45;

  // Periodic boss at the 5min mark + final boss at targetSeconds.
  if (g.run.elapsed > 300 && !g.enemies.some(e => e.archetype === "miniboss")) {
    if (Math.random() < 0.005) g.enemies.push(makeEnemy("miniboss",
      g.hero.x + (Math.random() < 0.5 ? -320 : 320),
      g.hero.y + (Math.random() < 0.5 ? -200 : 200),
      g.difficulty, g.biome));
  }
  if (g.run.elapsed >= g.targetSeconds && !g.enemies.some(e => e.archetype === "boss")) {
    g.enemies.push(makeEnemy("boss", g.hero.x, g.hero.y - 350, g.difficulty, g.biome));
  }

  // Spawn waves
  g.nextSwarmAt -= dt;
  if (g.nextSwarmAt <= 0) {
    spawnWave(g);
    // Faster as difficulty rises, never tighter than 1s
    g.nextSwarmAt = Math.max(1.0, 6 - g.difficulty * 0.3);
  }

  // Move hero from input
  const mag = Math.hypot(g.input.dx, g.input.dy);
  if (mag > 0.01) {
    const nx = g.input.dx / mag;
    const ny = g.input.dy / mag;
    g.hero.x += nx * g.stats.speed * dt;
    g.hero.y += ny * g.stats.speed * dt;
  }
  g.hero.x = clamp(g.hero.x, 30, ARENA_W - 30);
  g.hero.y = clamp(g.hero.y, 30, ARENA_H - 30);

  // Move enemies toward hero (or run a fast attack arc)
  for (const e of g.enemies) {
    if (e.flash && e.flash > 0) e.flash -= 1;
    const dx = g.hero.x - e.x;
    const dy = g.hero.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = e.archetype === "fast" ? 110
                : e.archetype === "tank" ? 50
                : e.archetype === "miniboss" ? 45
                : e.archetype === "boss" ? 38
                : 80;
    e.x += (dx / d) * speed * dt;
    e.y += (dy / d) * speed * dt;
    // Contact damage on overlap
    if (d < g.hero.radius + e.radius) {
      const dmg = Math.max(1, (e.contactDamage ?? 6) - g.stats.armor);
      g.hero.hp -= dmg * dt * 0.8;
      g.popups.push({ x: g.hero.x, y: g.hero.y - 24, text: `-${Math.ceil(dmg * 0.8)}`, color: "#f87171", ttl: 0.5 });
    }
  }

  // Fire weapons
  for (const slot of g.weapons) {
    slot.cd -= dt;
    if (slot.cd <= 0) {
      const w = weaponAt(slot);
      const fr = w.fireRate * g.stats.haste;
      slot.cd = 1 / fr;
      fireWeapon(g, slot, w);
    }
  }

  // Move projectiles + collisions
  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const p = g.projectiles[i];
    p.ttl -= dt;
    if (p.shape === "orbit") {
      p.orbitT = (p.orbitT ?? 0) + dt * 4;
      const radius = 70 + p.radius;
      p.x = g.hero.x + Math.cos(p.orbitT) * radius;
      p.y = g.hero.y + Math.sin(p.orbitT) * radius;
    } else if (p.shape === "aura") {
      p.x = g.hero.x;
      p.y = g.hero.y;
    } else if (p.shape === "wave") {
      // Wave expands outward
      p.radius += 200 * dt;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (p.ttl <= 0) {
      g.projectiles.splice(i, 1);
      continue;
    }
    // Collision against enemies
    for (let j = g.enemies.length - 1; j >= 0; j--) {
      const e = g.enemies[j];
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > p.radius + e.radius) continue;
      // Hit dedupe — orbit/aura projectiles can persist and tick the
      // same enemy repeatedly; we use a per-projectile cooldown map.
      if (!p.hitSet) p.hitSet = new Set();
      const persistent = p.shape === "orbit" || p.shape === "aura" || p.shape === "wave";
      if (persistent) {
        if (p.hitSet.has(e.id)) continue;
        p.hitSet.add(e.id);
      }
      const dmg = Math.round(p.damage * g.stats.power);
      e.hp -= dmg;
      e.flash = 6;
      g.run.damage += dmg;
      g.popups.push({ x: e.x, y: e.y - 20, text: `${dmg}`, color: p.color, ttl: 0.6 });
      if (e.hp <= 0) {
        killEnemy(g, e);
        g.enemies.splice(j, 1);
      }
      // Aim-shot dies after first hit
      if (p.shape === "aim") { p.ttl = 0; break; }
    }
  }

  // Pickups: gems + items
  for (let i = g.gems.length - 1; i >= 0; i--) {
    const gem = g.gems[i];
    const dx = g.hero.x - gem.x;
    const dy = g.hero.y - gem.y;
    const d = Math.hypot(dx, dy);
    if (d < g.stats.pickupRadius) {
      // Drift toward hero
      gem.x += (dx / d) * 280 * dt;
      gem.y += (dy / d) * 280 * dt;
    }
    if (d < g.hero.radius + gem.radius) {
      const leveled = addXp(g, gem.xpValue ?? 1);
      g.gems.splice(i, 1);
      if (leveled) {
        g.paused = true;
        g.shake = 4;
      }
    }
  }
  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const pk = g.pickups[i];
    const dx = g.hero.x - pk.x;
    const dy = g.hero.y - pk.y;
    const d = Math.hypot(dx, dy);
    if (d < g.hero.radius + pk.radius) {
      applyPickup(g, pk);
      g.pickups.splice(i, 1);
    }
  }

  // Pop damage numbers
  for (let i = g.popups.length - 1; i >= 0; i--) {
    g.popups[i].ttl -= dt;
    g.popups[i].y -= 30 * dt;
    if (g.popups[i].ttl <= 0) g.popups.splice(i, 1);
  }

  // Cap collections so memory stays bounded
  if (g.gems.length > 300) g.gems.splice(0, g.gems.length - 300);
  if (g.enemies.length > 120) g.enemies.splice(0, g.enemies.length - 120);

  // Screen-shake decay
  if (g.shake > 0) g.shake = Math.max(0, g.shake - 18 * dt);

  // Win / lose
  if (g.hero.hp <= 0) { g.over = true; g.win = false; g.hero.hp = 0; }
  if (g.run.elapsed >= g.targetSeconds && !g.enemies.some(e => e.archetype === "boss")) {
    g.over = true; g.win = true;
  }
}

function killEnemy(g: Game, e: Entity): void {
  g.run.kills += 1;
  // Drop gem(s)
  const value = e.archetype === "tank" ? 4
              : e.archetype === "miniboss" ? 20
              : e.archetype === "boss" ? 120
              : e.archetype === "fast" ? 2
              : 1;
  const drops = e.archetype === "miniboss" ? 6 : e.archetype === "boss" ? 30 : 1;
  for (let i = 0; i < drops; i++) {
    g.gems.push({
      id: id(), kind: "gem",
      x: e.x + (Math.random() - 0.5) * 30,
      y: e.y + (Math.random() - 0.5) * 30,
      vx: 0, vy: 0, hp: 1, hpMax: 1, radius: 8,
      glyph: "💎", xpValue: value,
    });
  }
  // Lucky pickup chance
  if (Math.random() < 0.02 + g.stats.luck) {
    const r = Math.random();
    const pickup: Entity["pickup"] = r < 0.5 ? "heal" : r < 0.85 ? "magnet" : "bomb";
    g.pickups.push({
      id: id(), kind: "pickup",
      x: e.x, y: e.y, vx: 0, vy: 0, hp: 1, hpMax: 1, radius: 14,
      glyph: pickup === "heal" ? "🍗" : pickup === "magnet" ? "🧲" : "💥",
      pickup,
    });
  }
  // Coin per kill (meta currency)
  g.run.coins += 1;
}

function applyPickup(g: Game, p: Entity): void {
  switch (p.pickup) {
    case "heal":
      g.hero.hp = Math.min(g.stats.hpMax, g.hero.hp + 30);
      g.popups.push({ x: g.hero.x, y: g.hero.y - 30, text: "+30 HP", color: "#86efac", ttl: 1 });
      break;
    case "magnet":
      // Pull all gems toward hero
      for (const gem of g.gems) {
        const dx = g.hero.x - gem.x;
        const dy = g.hero.y - gem.y;
        const d = Math.hypot(dx, dy) || 1;
        gem.x += (dx / d) * 600;
        gem.y += (dy / d) * 600;
      }
      g.popups.push({ x: g.hero.x, y: g.hero.y - 30, text: "MAGNET", color: "#fde047", ttl: 1 });
      break;
    case "bomb":
      // Clear all on-screen swarms
      for (const e of g.enemies) {
        if (e.archetype === "miniboss" || e.archetype === "boss") {
          e.hp -= 200; e.flash = 8;
        } else {
          e.hp = 0;
          killEnemy(g, e);
        }
      }
      g.enemies = g.enemies.filter(e => e.hp > 0);
      g.shake = 16;
      g.popups.push({ x: g.hero.x, y: g.hero.y - 30, text: "BOOM!", color: "#fb923c", ttl: 1.2 });
      break;
  }
}

function fireWeapon(g: Game, slot: EquippedWeapon, w: Weapon): void {
  if (w.shape === "aim") {
    const target = nearestEnemy(g);
    if (!target) return;
    const dx = target.x - g.hero.x;
    const dy = target.y - g.hero.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 320 + w.tier * 40;
    g.projectiles.push({
      id: id(), weaponId: slot.weaponId,
      x: g.hero.x, y: g.hero.y,
      vx: (dx / d) * speed, vy: (dy / d) * speed,
      ttl: w.range / speed,
      damage: w.damage,
      radius: 12 + w.tier * 2,
      color: w.color,
      shape: "aim",
    });
    // Tier 3+ fires extras
    if (w.tier >= 3) {
      const spread = 0.18;
      for (const off of [-spread, spread]) {
        const a = Math.atan2(dy, dx) + off;
        g.projectiles.push({
          id: id(), weaponId: slot.weaponId,
          x: g.hero.x, y: g.hero.y,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          ttl: w.range / speed,
          damage: Math.round(w.damage * 0.8),
          radius: 10 + w.tier,
          color: w.color,
          shape: "aim",
        });
      }
    }
  } else if (w.shape === "aura") {
    // Persistent radial damage tied to hero
    const lifetime = 1 / w.fireRate;
    g.projectiles.push({
      id: id(), weaponId: slot.weaponId,
      x: g.hero.x, y: g.hero.y, vx: 0, vy: 0,
      ttl: lifetime,
      damage: w.damage,
      radius: w.range,
      color: w.color,
      shape: "aura",
    });
  } else if (w.shape === "orbit") {
    // Spawn N orbiters (clear previous orbiters first to avoid stacking)
    g.projectiles = g.projectiles.filter(p => !(p.weaponId === slot.weaponId && p.shape === "orbit"));
    const count = w.tier === 1 ? 1 : w.tier === 2 ? 2 : w.tier === 3 ? 3 : 4;
    for (let i = 0; i < count; i++) {
      g.projectiles.push({
        id: id(), weaponId: slot.weaponId,
        x: g.hero.x, y: g.hero.y, vx: 0, vy: 0,
        ttl: 1 / w.fireRate * 2,
        damage: w.damage,
        radius: 14,
        color: w.color,
        shape: "orbit",
        orbitT: (i * Math.PI * 2) / count,
      });
    }
  } else if (w.shape === "wave") {
    g.projectiles.push({
      id: id(), weaponId: slot.weaponId,
      x: g.hero.x, y: g.hero.y, vx: 0, vy: 0,
      ttl: 0.7,
      damage: w.damage,
      radius: 30,
      color: w.color,
      shape: "wave",
    });
  }
}

function nearestEnemy(g: Game): Entity | null {
  let best: Entity | null = null;
  let bd = Infinity;
  for (const e of g.enemies) {
    const dx = e.x - g.hero.x;
    const dy = e.y - g.hero.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bd) { bd = d2; best = e; }
  }
  return best;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
