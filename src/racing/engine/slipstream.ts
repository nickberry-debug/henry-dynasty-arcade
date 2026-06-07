// Turbo Racers -- slipstream / drafting boost.
//
// While you're within 60 px BEHIND another car AND moving in roughly the
// same direction (<30 deg heading diff), the draft charges. When you
// steer out of the draft (break left or right), the charge releases as
// a slingshot boost.
//
// Implementation is symmetric with drift.ts so the match loop can step
// it the same way.

import type { CarState } from "./physics";

export interface SlipState {
  /** Current draft charge (0..1). */
  charge: number;
  /** True if currently inside another car's draft zone. */
  drafting: boolean;
  /** Remaining boost time (s). */
  boostTimer: number;
  /** Active boost magnitude (px/s of extra top speed). 0 when idle. */
  boostPxs: number;
  /** Were we drafting last frame? Used to detect "broke out of the draft". */
  wasDrafting: boolean;
  /** Steering at last frame (for "broke left/right" detection). */
  lastSteerAbs: number;
}

export const SLIP = {
  /** Behind-distance cap (px) -- inside this and aligned = drafting. */
  range: 60,
  /** Charge rate per second while drafting. */
  chargeRate: 1.0,
  /** Max charge before release auto-fires. */
  maxCharge: 1.0,
  /** Min charge required for release to fire. */
  minReleaseCharge: 0.35,
  /** Boost duration on release (s). */
  releaseDuration: 0.9,
  /** Extra px/s of top-speed on a full-charge release. */
  releasePxs: 240,
  /** Min steering input to count as "broke out of the draft". */
  breakoutSteer: 0.4,
  /** Heading similarity threshold (rad). 30 deg. */
  alignThreshold: Math.PI / 6,
} as const;

export function makeSlip(): SlipState {
  return {
    charge: 0, drafting: false, boostTimer: 0, boostPxs: 0,
    wasDrafting: false, lastSteerAbs: 0,
  };
}

export interface SlipStepInput {
  self: CarState;
  others: CarState[];
  steer: number;
  dt: number;
}

/** Smallest angle between two headings (rad), in [0, pi]. */
function headingDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

export function stepSlip(state: SlipState, input: SlipStepInput): void {
  const { self, others, dt } = input;

  // Find best leader to draft.
  let drafting = false;
  for (const other of others) {
    if (other === self) continue;
    if (headingDiff(self.heading, other.heading) > SLIP.alignThreshold) continue;
    const dx = other.x - self.x;
    const dy = other.y - self.y;
    const dist = Math.hypot(dx, dy);
    if (dist > SLIP.range || dist < 6) continue;
    // "Behind" = the leader is in our forward direction (positive forward dot).
    const fx = Math.sin(self.heading);
    const fy = -Math.cos(self.heading);
    const forwardDot = dx * fx + dy * fy;
    if (forwardDot <= 0) continue;
    drafting = true;
    break;
  }
  state.drafting = drafting;

  // Charge / discharge.
  if (state.boostTimer > 0) {
    state.boostTimer -= dt;
    if (state.boostTimer <= 0) {
      state.boostTimer = 0;
      state.boostPxs = 0;
    }
  }

  if (drafting) {
    state.charge = Math.min(SLIP.maxCharge, state.charge + SLIP.chargeRate * dt);
  } else if (state.wasDrafting) {
    // Just left the draft -- did we steer out (the slingshot trigger)?
    const brokeOut = Math.abs(input.steer) > SLIP.breakoutSteer;
    if (brokeOut && state.charge >= SLIP.minReleaseCharge) {
      state.boostTimer = SLIP.releaseDuration;
      state.boostPxs = SLIP.releasePxs * state.charge;
    }
    state.charge = 0;
  } else {
    // Decay slowly even outside the draft so a brief drop doesn't nuke charge.
    state.charge = Math.max(0, state.charge - dt * 0.4);
  }

  state.wasDrafting = drafting;
  state.lastSteerAbs = Math.abs(input.steer);
}
