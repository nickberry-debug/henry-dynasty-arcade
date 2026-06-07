// Enemy units + simple AI. Bosses included.

import type { Bullet } from "./weapons";

export type EnemyKind =
  | "foot"
  | "turret"
  | "jeep"
  | "boss_tank"
  | "boss_chopper"
  | "boss_bunker"
  | "boss_mega";

export interface Enemy {
  kind: EnemyKind;
  x: number; y: number;
  rot: number;
  hp: number; maxHp: number;
  score: number;
  fireCd: number;
  state: number;
  vx: number; vy: number;
  r: number;
  phase: number;
  dead: boolean;
  homeX?: number;
  homeY?: number;
}

export function makeEnemy(kind: EnemyKind, x: number, y: number): Enemy {
  const base: Enemy = {
    kind, x, y, rot: Math.PI,
    hp: 20, maxHp: 20,
    score: 50,
    fireCd: 1 + Math.random() * 1.5,
    state: 0,
    vx: 0, vy: 0,
    r: 9,
    phase: 0,
    dead: false,
  };
  switch (kind) {
    case "foot":   return { ...base, hp: 20, maxHp: 20, score: 50, r: 9 };
    case "turret": return { ...base, hp: 60, maxHp: 60, score: 150, r: 14, fireCd: 1.5 };
    case "jeep":   return { ...base, hp: 50, maxHp: 50, score: 120, r: 14 };
    case "boss_tank":    return { ...base, hp: 600,  maxHp: 600,  score: 1000, r: 34, fireCd: 1.2 };
    case "boss_chopper": return { ...base, hp: 500,  maxHp: 500,  score: 1200, r: 26, fireCd: 0.9 };
    case "boss_bunker":  return { ...base, hp: 800,  maxHp: 800,  score: 1500, r: 48, fireCd: 1.4 };
    case "boss_mega":    return { ...base, hp: 1100, maxHp: 1100, score: 2500, r: 52, fireCd: 1.0 };
  }
}

export function tickEnemy(e: Enemy, dt: number, target: { x: number; y: number }, sightRange: number): Bullet[] {
  const dx = target.x - e.x, dy = target.y - e.y;
  const dist = Math.hypot(dx, dy);
  const angleToTarget = Math.atan2(dy, dx);
  const out: Bullet[] = [];

  switch (e.kind) {
    case "foot": {
      if (dist > 110 && dist < 280) {
        const sp = 60;
        e.x += (dx / dist) * sp * dt;
        e.y += (dy / dist) * sp * dt;
      }
      e.rot = angleToTarget + Math.PI / 2;
      e.fireCd -= dt;
      if (dist < 280 && e.fireCd <= 0) {
        out.push(spawnBullet(e, angleToTarget, 200));
        e.fireCd = 1.8 + Math.random();
      }
      break;
    }
    case "turret": {
      e.rot = angleToTarget + Math.PI / 2;
      e.fireCd -= dt;
      if (dist < 320 && e.fireCd <= 0) {
        for (let i = -1; i <= 1; i++) out.push(spawnBullet(e, angleToTarget + i * 0.18, 220));
        e.fireCd = 1.6;
      }
      break;
    }
    case "jeep": {
      const sp = 110;
      if (dist > 30) {
        e.vx = (dx / dist) * sp; e.vy = (dy / dist) * sp;
        e.x += e.vx * dt; e.y += e.vy * dt;
      }
      e.rot = angleToTarget + Math.PI / 2;
      e.fireCd -= dt;
      if (dist < 250 && e.fireCd <= 0) {
        out.push(spawnBullet(e, angleToTarget, 240));
        e.fireCd = 1.4;
      }
      break;
    }
    case "boss_tank": {
      e.state += dt;
      const sway = Math.sin(e.state * 0.6) * 80;
      if (e.homeX == null) e.homeX = e.x;
      e.x = e.homeX + sway;
      e.rot = angleToTarget + Math.PI / 2;
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        out.push({ ...spawnBullet(e, angleToTarget, 200), damage: 18 });
        e.fireCd = 1.1;
        if (e.hp < e.maxHp * 0.5) {
          out.push({ ...spawnBullet(e, angleToTarget - 0.2, 200), damage: 14 });
          out.push({ ...spawnBullet(e, angleToTarget + 0.2, 200), damage: 14 });
        }
      }
      break;
    }
    case "boss_chopper": {
      e.state += dt;
      if (e.homeX == null) e.homeX = e.x;
      if (e.homeY == null) e.homeY = e.y;
      e.x = e.homeX + Math.cos(e.state * 0.9) * 140;
      e.y = e.homeY + Math.sin(e.state * 0.5) * 30;
      e.rot = Math.PI;
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        for (let i = 0; i < 4; i++) {
          out.push({ ...spawnBullet(e, angleToTarget + (Math.random() - 0.5) * 0.18, 230), damage: 10 });
        }
        e.fireCd = 0.9;
      }
      break;
    }
    case "boss_bunker": {
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        out.push({ ...spawnBullet({ ...e, x: e.x - 30 }, angleToTarget, 210), damage: 14 });
        out.push({ ...spawnBullet({ ...e, x: e.x + 30 }, angleToTarget, 210), damage: 14 });
        e.fireCd = 1.3;
        if (e.hp < e.maxHp * 0.5) out.push({ ...spawnBullet(e, angleToTarget, 260), damage: 18 });
      }
      break;
    }
    case "boss_mega": {
      e.state += dt;
      if (e.homeX == null) e.homeX = e.x;
      e.x = e.homeX + Math.sin(e.state * 0.45) * 110;
      e.rot = angleToTarget + Math.PI / 2;
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        for (let i = -2; i <= 2; i++) {
          out.push({ ...spawnBullet(e, angleToTarget + i * 0.16, 220), damage: 12 });
        }
        e.fireCd = 1.1;
        if (e.hp < e.maxHp * 0.4) out.push({ ...spawnBullet(e, angleToTarget, 280), damage: 22 });
      }
      break;
    }
  }
  void sightRange;
  return out;
}

function spawnBullet(e: Enemy, angle: number, speed: number): Bullet {
  return {
    x: e.x + Math.cos(angle) * (e.r + 4),
    y: e.y + Math.sin(angle) * (e.r + 4),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.3,
    owner: "enemy",
    damage: 10,
  };
}

export function damage(e: Enemy, amt: number): boolean {
  e.hp -= amt;
  if (e.hp <= 0) {
    e.dead = true;
    return true;
  }
  return false;
}

export function isBoss(e: Enemy): boolean {
  return e.kind === "boss_tank" || e.kind === "boss_chopper" || e.kind === "boss_bunker" || e.kind === "boss_mega";
}
