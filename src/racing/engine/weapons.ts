// Turbo Racers -- weapons. Original Berry Kids' Arcade IP. NOT Mario Kart.
//
// 7 weapons. Each one is picked up by driving over an item box, then armed
// (queued for use). Pressing the FIRE button consumes it.
//
//   Booster      -- instant short speed boost (like nitro). Stacks with drift.
//   SpikeTrap    -- drops a stationary hazard behind you; cars hitting it spin.
//   HomingDart   -- forward-fires a projectile that auto-tracks the nearest racer ahead.
//   AegisShield  -- ~4-second damage immunity; you can also ram other cars.
//   StormBolt    -- "lightning" hits all racers AHEAD of you, slowing them briefly. Rare.
//   SmokeCloud   -- drops a vision-obscuring zone behind you; cars driving through it slow.
//   RecoveryRing -- back-of-pack catch-up boost (+50% speed for ~3s). Only drops if you're 4th+.
//
// All weapons are visual-effect only on others (slow / spin / shield) -- no
// health system in Phase 4; weapons just cost time.

import type { CarState } from "./physics";

export type WeaponId = "booster" | "spike" | "homing" | "shield" | "storm" | "smoke" | "recovery";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  glyph: string;
  /** Higher = more common in the item-box random roll. */
  rarity: number;
  /** UI accent. */
  accent: string;
  /** Short flavour string. */
  desc: string;
  /** True if only awarded when the player is in 4th place or worse (rubber-band). */
  catchupOnly?: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  booster:  { id: "booster",  name: "Booster",       glyph: ">>", rarity: 30, accent: "#facc15", desc: "Instant nitro boost." },
  spike:    { id: "spike",    name: "Spike Trap",    glyph: "X",  rarity: 25, accent: "#ef4444", desc: "Drop a hazard behind you." },
  homing:   { id: "homing",   name: "Homing Dart",   glyph: ">-", rarity: 18, accent: "#a855f7", desc: "Locks onto the racer ahead." },
  shield:   { id: "shield",   name: "Aegis Shield",  glyph: "()", rarity: 10, accent: "#60a5fa", desc: "4s immunity + ram damage." },
  storm:    { id: "storm",    name: "Storm Bolt",    glyph: "/Z", rarity: 5,  accent: "#22d3ee", desc: "Slows every racer ahead." },
  smoke:    { id: "smoke",    name: "Smoke Cloud",   glyph: "**", rarity: 12, accent: "#71717a", desc: "Vision-blocking smoke trail." },
  recovery: { id: "recovery", name: "Recovery Ring", glyph: "O>", rarity: 14, accent: "#22c55e", desc: "Catch-up boost (back of pack only).", catchupOnly: true },
};

const WEAPON_LIST = Object.values(WEAPONS);

/** Roll a weapon weighted by rarity. `place` is the player's 1-based finish position; cars in 4th+ can roll catchupOnly weapons. */
export function rollWeapon(rng: () => number = Math.random, place = 1): WeaponId {
  const list = WEAPON_LIST.filter(w => !w.catchupOnly || place >= 4);
  const total = list.reduce((s, w) => s + w.rarity, 0);
  let pick = rng() * total;
  for (const w of list) {
    pick -= w.rarity;
    if (pick <= 0) return w.id;
  }
  return "booster";
}

// ---- Item boxes ------------------------------------------------------------

export interface ItemBox {
  x: number;
  y: number;
  /** True while available; false during respawn cooldown. */
  active: boolean;
  /** Seconds until respawn. */
  respawnS: number;
  /** Pulse phase for the box visual. */
  pulse: number;
}

export function makeItemBoxes(positions: { x: number; y: number }[]): ItemBox[] {
  return positions.map(p => ({ x: p.x, y: p.y, active: true, respawnS: 0, pulse: Math.random() * Math.PI * 2 }));
}

/** Pickup detection. Returns the index of the box picked up, or -1. */
export function stepItemBoxes(boxes: ItemBox[], car: CarState, dt: number): number {
  let pickedIdx = -1;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    b.pulse += dt * 2;
    if (!b.active) {
      b.respawnS -= dt;
      if (b.respawnS <= 0) b.active = true;
      continue;
    }
    const dx = b.x - car.x;
    const dy = b.y - car.y;
    if (dx * dx + dy * dy < 32 * 32) {
      b.active = false;
      b.respawnS = 4.0;
      pickedIdx = i;
    }
  }
  return pickedIdx;
}

// ---- Active projectiles + effects -----------------------------------------

export interface SpikeHazard {
  x: number;
  y: number;
  ttlS: number;
  ownerIdx: number;
}

export interface SmokeZone {
  x: number;
  y: number;
  ttlS: number;
  radius: number;
  ownerIdx: number;
}

export interface HomingDart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetIdx: number;
  ownerIdx: number;
  ttlS: number;
}

/** Lightweight per-car effect: spin / slow / shield / boost. */
export interface CarEffect {
  /** Slow factor 0..1 applied to top speed. */
  slowMul: number;
  /** Boost factor >=1 applied to top speed (e.g. 1.5 for Recovery Ring). */
  boostMul: number;
  /** Spinning angular velocity (rad/s). 0 if not spinning. */
  spinRad: number;
  /** Remaining seconds the slow/spin effect lasts. */
  ttlS: number;
  /** Remaining seconds the boost lasts. */
  boostTtl: number;
  /** Active shield -- prevents incoming hits. */
  shielded: boolean;
  shieldTtl: number;
}

export function makeCarEffect(): CarEffect {
  return { slowMul: 1, boostMul: 1, spinRad: 0, ttlS: 0, boostTtl: 0, shielded: false, shieldTtl: 0 };
}

export function stepCarEffect(fx: CarEffect, dt: number): void {
  if (fx.ttlS > 0) {
    fx.ttlS -= dt;
    if (fx.ttlS <= 0) {
      fx.ttlS = 0;
      fx.slowMul = 1;
      fx.spinRad = 0;
    }
  }
  if (fx.boostTtl > 0) {
    fx.boostTtl -= dt;
    if (fx.boostTtl <= 0) {
      fx.boostTtl = 0;
      fx.boostMul = 1;
    }
  }
  if (fx.shieldTtl > 0) {
    fx.shieldTtl -= dt;
    if (fx.shieldTtl <= 0) {
      fx.shieldTtl = 0;
      fx.shielded = false;
    }
  }
}

export function applySlow(fx: CarEffect, slowMul: number, ttlS: number): void {
  if (fx.shielded) return;
  fx.slowMul = Math.min(fx.slowMul, slowMul);
  fx.ttlS = Math.max(fx.ttlS, ttlS);
}

export function applySpin(fx: CarEffect, ttlS: number, dir = 1): void {
  if (fx.shielded) return;
  fx.spinRad = 12 * dir;
  fx.ttlS = Math.max(fx.ttlS, ttlS);
  fx.slowMul = Math.min(fx.slowMul, 0.4);
}

export function applyShield(fx: CarEffect, ttlS: number): void {
  fx.shielded = true;
  fx.shieldTtl = ttlS;
}

export function applyBoostMul(fx: CarEffect, boostMul: number, ttlS: number): void {
  fx.boostMul = Math.max(fx.boostMul, boostMul);
  fx.boostTtl = Math.max(fx.boostTtl, ttlS);
}
