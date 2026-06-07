// Player weapons + projectiles.

import { facing, type Vehicle, type WeaponLevel } from "./vehicle";

export interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  owner: "p1" | "p2" | "enemy";
  damage: number;
}

export interface Grenade {
  x: number; y: number;
  vx: number; vy: number;
  age: number;
  flight: number;
  owner: "p1" | "p2";
}

export interface Explosion {
  x: number; y: number;
  t: number;
  duration: number;
  radius: number;
  damage: number;
  friendly: boolean;
  dealt: boolean;
}

export const WEAPON_STATS: Record<WeaponLevel, { rateHz: number; bullets: number; spread: number; damage: number }> = {
  machinegun: { rateHz: 8,  bullets: 1, spread: 0,    damage: 10 },
  rapid:      { rateHz: 14, bullets: 1, spread: 0.05, damage: 9 },
  spread:     { rateHz: 6,  bullets: 3, spread: 0.25, damage: 9 },
  dual:       { rateHz: 10, bullets: 2, spread: 0.08, damage: 11 },
};

export function tryFire(v: Vehicle, now: number): Bullet[] {
  if (v.cdGun > 0) return [];
  const stats = WEAPON_STATS[v.weapon];
  v.cdGun = 1 / stats.rateHz;
  const { fx, fy } = facing(v);
  const out: Bullet[] = [];
  const baseSpeed = 580;
  const muzzleOff = 18;
  for (let i = 0; i < stats.bullets; i++) {
    const t = stats.bullets === 1 ? 0 : (i - (stats.bullets - 1) / 2);
    const angleOff = t * stats.spread;
    const cos = Math.cos(angleOff), sin = Math.sin(angleOff);
    const dx = fx * cos - fy * sin;
    const dy = fx * sin + fy * cos;
    let ox = 0, oy = 0;
    if (v.weapon === "dual") {
      const px = fy, py = -fx;
      ox = px * (i === 0 ? -5 : 5);
      oy = py * (i === 0 ? -5 : 5);
    }
    out.push({
      x: v.x + dx * muzzleOff + ox,
      y: v.y + dy * muzzleOff + oy,
      vx: dx * baseSpeed,
      vy: dy * baseSpeed,
      life: 0.8,
      owner: v.player,
      damage: stats.damage,
    });
  }
  void now;
  return out;
}

const GRENADE_FLIGHT = 0.85;
const GRENADE_RANGE = 170;

export function tryGrenade(v: Vehicle): Grenade | null {
  if (v.cdGrenade > 0) return null;
  v.cdGrenade = 3.0;
  const { fx, fy } = facing(v);
  const speed = GRENADE_RANGE / GRENADE_FLIGHT;
  return {
    x: v.x, y: v.y,
    vx: fx * speed, vy: fy * speed,
    age: 0, flight: GRENADE_FLIGHT,
    owner: v.player,
  };
}

export function tickBullet(b: Bullet, dt: number): boolean {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
  return b.life > 0;
}

export function tickGrenade(g: Grenade, dt: number): Explosion | null {
  g.age += dt;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  if (g.age >= g.flight) {
    return {
      x: g.x, y: g.y,
      t: 0, duration: 0.55,
      radius: 60, damage: 60,
      friendly: true, dealt: false,
    };
  }
  return null;
}

export function grenadeAlt(g: Grenade): number {
  const t = g.age / g.flight;
  return Math.max(0, 4 * t * (1 - t));
}

export function tickExplosion(e: Explosion, dt: number): boolean {
  e.t += dt / e.duration;
  return e.t < 1;
}
