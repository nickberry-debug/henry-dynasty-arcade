// Player health + checkpoint system.

import type { Vehicle } from "./vehicle";

export interface Checkpoint { y: number; reached: boolean; }

export function makeCheckpoints(levelHeight: number, count = 4): Checkpoint[] {
  const out: Checkpoint[] = [];
  for (let i = 1; i <= count; i++) {
    out.push({ y: levelHeight * (1 - i / (count + 1)), reached: false });
  }
  return out;
}

export function hit(v: Vehicle, amt: number): boolean {
  if (v.iFrames > 0) return false;
  v.hp -= amt;
  v.iFrames = 0.5;
  if (v.hp <= 0) { v.hp = 0; return true; }
  return false;
}

export function heal(v: Vehicle, amt: number) {
  v.hp = Math.min(v.maxHp, v.hp + amt);
}

export function respawn(v: Vehicle, checkpoints: Checkpoint[], levelHeight: number, centerX: number) {
  let respawnY = levelHeight - 60;
  for (const c of checkpoints) if (c.reached && c.y < respawnY) respawnY = c.y;
  v.x = centerX;
  v.y = respawnY;
  v.hp = v.maxHp;
  v.iFrames = 1.5;
  v.cdGun = 0;
  v.cdGrenade = 0;
}

export function touchCheckpoints(v: Vehicle, checkpoints: Checkpoint[]): Checkpoint | null {
  let touched: Checkpoint | null = null;
  for (const c of checkpoints) {
    if (!c.reached && v.y <= c.y) {
      c.reached = true;
      touched = c;
    }
  }
  return touched;
}
