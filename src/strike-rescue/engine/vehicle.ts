// Top-down vehicle physics.

export interface Vehicle {
  x: number; y: number;
  vx: number; vy: number;
  rot: number;
  speed: number;
  hp: number; maxHp: number;
  player: "p1" | "p2";
  weapon: WeaponLevel;
  cdGun: number;
  cdGrenade: number;
  iFrames: number;
  carrying: number;
  rescued: number;
  score: number;
}

export type WeaponLevel = "machinegun" | "rapid" | "spread" | "dual";

export interface VehicleInput {
  dx: number;
  dy: number;
  fire: boolean;
  grenade: boolean;
}

export function makeVehicle(x: number, y: number, player: "p1" | "p2" = "p1"): Vehicle {
  return {
    x, y, vx: 0, vy: 0,
    rot: 0,
    speed: 240,
    hp: 100, maxHp: 100,
    player,
    weapon: "machinegun",
    cdGun: 0, cdGrenade: 0,
    iFrames: 0,
    carrying: 0, rescued: 0, score: 0,
  };
}

export function tickVehicle(v: Vehicle, input: VehicleInput, dt: number, levelBoundsX: { minX: number; maxX: number }) {
  let { dx, dy } = input;
  const mag = Math.hypot(dx, dy);
  if (mag > 1) { dx /= mag; dy /= mag; }
  v.vx = dx * v.speed;
  v.vy = dy * v.speed;
  v.x += v.vx * dt;
  v.y += v.vy * dt;
  v.x = Math.max(levelBoundsX.minX, Math.min(levelBoundsX.maxX, v.x));
  if (mag > 0.15) {
    const target = Math.atan2(dy, dx) + Math.PI / 2;
    const diff = wrapPi(target - v.rot);
    const turnRate = 9;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), turnRate * dt);
    v.rot += step;
  }
  v.cdGun = Math.max(0, v.cdGun - dt);
  v.cdGrenade = Math.max(0, v.cdGrenade - dt);
  v.iFrames = Math.max(0, v.iFrames - dt);
}

function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function facing(v: Vehicle): { fx: number; fy: number } {
  return { fx: Math.sin(v.rot), fy: -Math.cos(v.rot) };
}
