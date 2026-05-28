// Cosmic Squad — combat engine.
//
// Movement model: each ship has continuous heading + speed + a steering
// target. Per sub-tick, the ship rotates its velocity vector toward the
// target by at most `maxTurnRate / SUBTICKS` radians, and accelerates
// or decelerates toward an effective speed (which is itself reduced
// during sharp turns). Heavy capitals (maneuverability ~2) take many
// turns to reverse direction; fighters (maneuverability ~10) can pivot
// almost in place. The drag-preview in the UI runs this exact
// simulation forward so what the player sees IS what the ship will fly.

import type {
  ShipState, Missile, MissileId, MissionTemplate, BattleEvent, Faction, Obstacle, ShipClass,
} from "./types";
import { MISSILE_TYPES } from "./types";
import { getShipClass } from "./ships";

// Bigger world than the visible viewport. The player has to scout —
// enemies start scattered, not lined up at the edge.
export const GRID_W = 44;
export const GRID_H = 30;
export const SUBTICKS = 16;

export interface Order {
  shipId: string;
  moveTo?: { x: number; y: number };
  fire?: MissileId;
  fireTargetId?: string;
}

export interface BattleStateLive {
  turn: number;
  ships: ShipState[];
  missiles: Missile[];
  obstacles: Obstacle[];
  events: BattleEvent[];
  history: Array<{ turn: number; ships: ShipState[]; missiles: Missile[]; events: BattleEvent[] }>;
  mission: MissionTemplate;
  result?: "victory" | "defeat";
}

// ─── Math helpers ────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function nearestEnemy(ship: ShipState, ships: ShipState[]): ShipState | null {
  let best: ShipState | null = null;
  let bd = Infinity;
  for (const s of ships) {
    if (s.destroyed || s.faction === ship.faction) continue;
    const d = dist(ship, s);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function getShipFacing(target: ShipState, from: { x: number; y: number }): "front" | "rear" | "side" {
  const heading = target.heading ?? Math.atan2(target.vy, target.vx || 0.01);
  const fx = Math.cos(heading), fy = Math.sin(heading);
  const dx = from.x - target.x, dy = from.y - target.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return "front";
  const cos = (fx * dx + fy * dy) / mag;
  if (cos > 0.5) return "front";
  if (cos < -0.5) return "rear";
  return "side";
}

function applyDamage(target: ShipState, dmg: number, from: { x: number; y: number }, events: BattleEvent[]): void {
  const facing = getShipFacing(target, from);
  let remaining = dmg;
  if (facing === "front" && target.shieldFront > 0) {
    const a = Math.min(target.shieldFront, remaining); target.shieldFront -= a; remaining -= a;
  } else if (facing === "rear" && target.shieldRear > 0) {
    const a = Math.min(target.shieldRear, remaining); target.shieldRear -= a; remaining -= a;
  } else if (facing === "side" && target.shieldLR > 0) {
    const a = Math.min(target.shieldLR, remaining); target.shieldLR -= a; remaining -= a;
  }
  if (remaining > 0) target.hp = Math.max(0, target.hp - remaining);
  events.push({ kind: "hit", shipId: target.id, damage: dmg, text: `${target.callsign} took ${dmg} (${facing})` });
  if (target.hp === 0 && !target.destroyed) {
    target.destroyed = true;
    events.push({ kind: "destroyed", shipId: target.id, text: `${target.callsign} destroyed` });
  }
}

function hitsObstacle(x: number, y: number, obstacles: Obstacle[]): Obstacle | null {
  for (const o of obstacles) {
    if (o.kind !== "asteroid") continue;
    if (dist({ x, y }, o) <= o.radius) return o;
  }
  return null;
}

// ─── Steering physics ────────────────────────────────────────

/** Mutate one ship's velocity + heading for one sub-tick of steering. */
export function steerOnce(ship: ShipState, cls: ShipClass): void {
  const speedCap = cls.speed;
  // Max turn per turn, in radians. Maneuverability 10 ≈ 144°/turn, 2 ≈ 29°/turn.
  const maxTurnPerTurn = (cls.maneuverability / 10) * Math.PI * 0.8;
  const turnPerTick = maxTurnPerTurn / SUBTICKS;
  // Accel per turn. Heavy ships accelerate slower (tied to maneuverability).
  const accelPerTurn = speedCap * (0.5 + cls.maneuverability / 20);
  const accelPerTick = accelPerTurn / SUBTICKS;

  let speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  let heading = speed > 0.001
    ? Math.atan2(ship.vy, ship.vx)
    : (ship.heading ?? (ship.faction === "player" ? 0 : Math.PI));

  const hasTarget = ship.targetX !== undefined && ship.targetY !== undefined;
  if (!hasTarget) {
    // Coast: bleed off velocity gently (no aerobraking — space).
    speed = Math.max(0, speed - accelPerTick * 0.25);
    ship.vx = Math.cos(heading) * speed;
    ship.vy = Math.sin(heading) * speed;
    ship.heading = heading;
    return;
  }

  const dx = (ship.targetX as number) - ship.x;
  const dy = (ship.targetY as number) - ship.y;
  const distToTarget = Math.sqrt(dx * dx + dy * dy);

  if (distToTarget < 0.35) {
    // Arrived — clear target and decelerate.
    ship.targetX = undefined;
    ship.targetY = undefined;
    speed = Math.max(0, speed - accelPerTick);
  } else {
    const desired = Math.atan2(dy, dx);
    const diff = normalizeAngle(desired - heading);
    const turnStep = clamp(diff, -turnPerTick, turnPerTick);
    heading += turnStep;

    // While turning hard, we can't run flat-out. While nearly aligned,
    // we accelerate to full speed. Approach-speed also tapers within
    // 2 cells of target so we don't overshoot.
    const turnPenalty = 1 - Math.min(1, Math.abs(diff) / Math.PI) * 0.6;
    const distPenalty = Math.min(1, distToTarget / 2.5);
    const targetSpeed = speedCap * turnPenalty * distPenalty;

    if (speed < targetSpeed) speed = Math.min(targetSpeed, speed + accelPerTick);
    else if (speed > targetSpeed) speed = Math.max(targetSpeed, speed - accelPerTick * 1.2);
  }

  ship.vx = Math.cos(heading) * speed;
  ship.vy = Math.sin(heading) * speed;
  ship.heading = heading;
}

/** Project a ship's flight path given a destination — used by the
 *  UI to draw an honest curved preview that matches what tickStep
 *  will actually do. Returns ~SUBTICKS points along the curve. */
export function simulatePath(ship: ShipState, target: { x: number; y: number }, cls: ShipClass, totalTicks = SUBTICKS): { x: number; y: number }[] {
  const sim: ShipState = JSON.parse(JSON.stringify(ship));
  sim.targetX = target.x;
  sim.targetY = target.y;
  const path: { x: number; y: number }[] = [{ x: sim.x, y: sim.y }];
  for (let i = 0; i < totalTicks; i++) {
    steerOnce(sim, cls);
    sim.x = clamp(sim.x + sim.vx / SUBTICKS, 0, GRID_W - 1);
    sim.y = clamp(sim.y + sim.vy / SUBTICKS, 0, GRID_H - 1);
    path.push({ x: sim.x, y: sim.y });
  }
  return path;
}

// ─── Order application ──────────────────────────────────────

export function applyOrders(state: BattleStateLive, orders: Order[]): void {
  const byId = new Map(state.ships.map(s => [s.id, s] as const));
  for (const o of orders) {
    const ship = byId.get(o.shipId);
    if (!ship || ship.destroyed) continue;
    if (o.moveTo) {
      // Steering target. The engine handles inertia.
      ship.targetX = o.moveTo.x;
      ship.targetY = o.moveTo.y;
    } else {
      ship.targetX = undefined;
      ship.targetY = undefined;
    }
    if (o.fire) {
      const spec = MISSILE_TYPES.find(m => m.id === o.fire);
      if (!spec) continue;
      const next = ship.cooldowns[spec.id] ?? 0;
      if (next > state.turn) continue;
      let aim: { x: number; y: number } | null = null;
      let targetId: string | undefined;
      if (spec.homing) {
        const t = nearestEnemy(ship, state.ships);
        if (!t) continue;
        aim = { x: t.x, y: t.y };
        targetId = t.id;
      } else if (o.fireTargetId) {
        const t = byId.get(o.fireTargetId);
        if (!t || t.destroyed) continue;
        aim = { x: t.x, y: t.y };
        targetId = t.id;
      } else {
        const h = ship.heading ?? 0;
        aim = { x: ship.x + Math.cos(h) * spec.range, y: ship.y + Math.sin(h) * spec.range };
      }
      const dx = aim.x - ship.x, dy = aim.y - ship.y;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      state.missiles.push({
        id: `m-${ship.id}-${state.turn}-${spec.id}`,
        type: spec.id,
        ownerId: ship.id,
        ownerFaction: ship.faction,
        x: ship.x, y: ship.y,
        vx: (dx / mag) * spec.speed,
        vy: (dy / mag) * spec.speed,
        range: spec.range,
        targetId,
      });
      ship.cooldowns[spec.id] = state.turn + spec.cooldown + 1;
      state.events.push({ kind: "fire", shipId: ship.id, missileType: spec.id, targetId, text: `${ship.callsign} fired ${spec.label}` });
    }
  }
}

// ─── Per-tick resolution ────────────────────────────────────

export function tickStep(state: BattleStateLive): void {
  const events = state.events;
  for (const s of state.ships) {
    if (s.destroyed) continue;
    const cls = getShipClass(s.classId);
    if (!cls) continue;
    steerOnce(s, cls);
    const nx = clamp(s.x + s.vx / SUBTICKS, 0, GRID_W - 1);
    const ny = clamp(s.y + s.vy / SUBTICKS, 0, GRID_H - 1);
    const rock = hitsObstacle(nx, ny, state.obstacles);
    if (rock) {
      applyDamage(s, 6, rock, events);
      s.vx *= -0.4; s.vy *= -0.4;
      s.targetX = undefined; s.targetY = undefined;
      events.push({ kind: "hit", shipId: s.id, text: `${s.callsign} scraped an asteroid` });
    } else {
      s.x = nx; s.y = ny;
    }
  }
  for (const m of state.missiles) {
    const spec = MISSILE_TYPES.find(t => t.id === m.type);
    if (!spec) continue;
    if (spec.homing) {
      const candidates = state.ships.filter(s => !s.destroyed && s.faction !== m.ownerFaction);
      let best: ShipState | null = null;
      let bd = Infinity;
      for (const c of candidates) {
        const d = dist(m, c);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) {
        m.targetId = best.id;
        const dx = best.x - m.x, dy = best.y - m.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        m.vx = (dx / mag) * spec.speed;
        m.vy = (dy / mag) * spec.speed;
      }
    }
    m.x += m.vx / SUBTICKS;
    m.y += m.vy / SUBTICKS;
    m.range -= Math.sqrt(m.vx * m.vx + m.vy * m.vy) / SUBTICKS;
  }
  const liveMissiles: Missile[] = [];
  for (const m of state.missiles) {
    const spec = MISSILE_TYPES.find(t => t.id === m.type);
    if (!spec) continue;
    if (m.range <= 0 || m.x < 0 || m.x >= GRID_W || m.y < 0 || m.y >= GRID_H) continue;
    if (hitsObstacle(m.x, m.y, state.obstacles)) {
      events.push({ kind: "hit", text: "Missile fizzled in the rocks." });
      continue;
    }
    let hit: ShipState | null = null;
    for (const s of state.ships) {
      if (s.destroyed || s.id === m.ownerId) continue;
      if (dist(m, s) < 0.9) { hit = s; break; }
    }
    if (hit) {
      if (spec.aoe) {
        for (const s of state.ships) {
          if (s.destroyed) continue;
          const d = dist(m, s);
          if (d <= spec.aoe) {
            const falloff = 1 - (d / (spec.aoe + 1));
            applyDamage(s, Math.round(spec.damage * falloff), m, events);
          }
        }
      } else {
        applyDamage(hit, spec.damage, m, events);
      }
    } else {
      liveMissiles.push(m);
    }
  }
  state.missiles = liveMissiles;
}

export function resolveTurn(state: BattleStateLive): void {
  for (let i = 0; i < SUBTICKS; i++) tickStep(state);
}

export function endTurn(state: BattleStateLive): void {
  state.history.push({
    turn: state.turn,
    ships: JSON.parse(JSON.stringify(state.ships)),
    missiles: JSON.parse(JSON.stringify(state.missiles)),
    events: state.events.slice(),
  });
  state.events = [];
  state.turn += 1;
  checkVictory(state);
}

export function checkVictory(state: BattleStateLive): void {
  const enemiesAlive = state.ships.some(s => s.faction === "enemy" && !s.destroyed);
  const playerAlive = state.ships.some(s => s.faction === "player" && s.ownerSlot === "player" && !s.destroyed);
  if (!playerAlive) { state.result = "defeat"; return; }
  if (state.mission.objective === "destroy_all" && !enemiesAlive) { state.result = "victory"; return; }
  if (state.mission.objective === "survive_turns" && state.turn >= state.mission.turnLimit) {
    state.result = playerAlive ? "victory" : "defeat";
    return;
  }
  if (state.turn >= state.mission.turnLimit) { state.result = "defeat"; }
}

// ─── Enemy AI ───────────────────────────────────────────────

export function planAiOrders(state: BattleStateLive): Order[] {
  const orders: Order[] = [];
  for (const ship of state.ships) {
    if (ship.destroyed) continue;
    if (ship.ownerSlot === "player") continue;
    const target = nearestEnemy(ship, state.ships);
    if (!target) continue;
    const moveTo = { x: target.x, y: target.y };
    let fire: MissileId | undefined;
    for (const mid of ship.loadout) {
      const next = ship.cooldowns[mid] ?? 0;
      if (next <= state.turn) {
        const spec = MISSILE_TYPES.find(m => m.id === mid);
        if (spec && dist(ship, target) <= spec.range) { fire = mid; break; }
      }
    }
    orders.push({ shipId: ship.id, moveTo, fire, fireTargetId: target.id });
  }
  return orders;
}

// ─── Setup ──────────────────────────────────────────────────

function makeRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateObstacles(missionId: string): Obstacle[] {
  const rand = makeRng(missionId.split("").reduce((a, c) => a + c.charCodeAt(0), 13));
  const out: Obstacle[] = [];
  const rockCount = 14 + Math.floor(rand() * 8);
  for (let i = 0; i < rockCount; i++) {
    out.push({
      id: `rock-${i}`,
      kind: "asteroid",
      x: 8 + rand() * (GRID_W - 14),
      y: rand() * (GRID_H - 1),
      radius: 0.4 + rand() * 1.0,
      seed: Math.floor(rand() * 1e6),
    });
  }
  const nebCount = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nebCount; i++) {
    out.push({
      id: `neb-${i}`,
      kind: "nebula",
      x: 8 + rand() * (GRID_W - 14),
      y: rand() * (GRID_H - 1),
      radius: 2 + rand() * 1.8,
      seed: Math.floor(rand() * 1e6),
    });
  }
  return out;
}

export function initBattle(args: {
  mission: MissionTemplate;
  playerShip: ShipState;
  wingmen: ShipState[];
  enemies: ShipState[];
}): BattleStateLive {
  const rand = makeRng(args.mission.id.split("").reduce((a, c) => a + c.charCodeAt(0) * 7, 31));
  const ships: ShipState[] = [];
  // Player spawns at the western edge.
  args.playerShip.x = 4;
  args.playerShip.y = Math.floor(GRID_H / 2);
  args.playerShip.heading = 0;
  ships.push(args.playerShip);
  args.wingmen.forEach((w, i) => {
    w.x = 2 + (i % 2);
    w.y = clamp(Math.floor(GRID_H / 2) + (i % 2 === 0 ? -(i + 1) : i + 1), 1, GRID_H - 2);
    w.heading = 0;
    ships.push(w);
  });
  // Enemies scattered across the eastern 2/3rds — player must scout.
  args.enemies.forEach((e, i) => {
    e.x = clamp(GRID_W * 0.55 + rand() * GRID_W * 0.35, GRID_W * 0.5, GRID_W - 2);
    e.y = clamp(rand() * (GRID_H - 2) + 1, 1, GRID_H - 2);
    e.heading = Math.PI;
    e.faction = "enemy";
    ships.push(e);
  });
  return {
    turn: 1,
    ships,
    missiles: [],
    obstacles: generateObstacles(args.mission.id),
    events: [],
    history: [],
    mission: args.mission,
  };
}

export function buildShipState(args: {
  id: string;
  ownerSlot: ShipState["ownerSlot"];
  classId: ShipState["classId"];
  faction: Faction;
  callsign: string;
  loadout: MissileId[];
  wingmanId?: string;
}): ShipState {
  const cls = getShipClass(args.classId);
  if (!cls) throw new Error(`Unknown ship class ${args.classId}`);
  return {
    id: args.id,
    ownerSlot: args.ownerSlot,
    wingmanId: args.wingmanId,
    classId: args.classId,
    faction: args.faction,
    x: 0, y: 0,
    vx: 0, vy: 0,
    heading: args.faction === "player" ? 0 : Math.PI,
    hp: cls.hp,
    hpMax: cls.hp,
    shieldFront: cls.shieldFront,
    shieldRear: cls.shieldRear,
    shieldLR: cls.shieldLR,
    loadout: args.loadout.slice(0, cls.weaponSlots),
    cooldowns: {},
    callsign: args.callsign,
  };
}
