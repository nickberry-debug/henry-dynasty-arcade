// Turbo Racers -- drift state machine + boost release.
//
// Hold DRIFT while STEERING to charge. Charge ticks up while:
//   - drift button held
//   - |steer| > 0.25
//   - speed above a minimum threshold (no charging in place)
// Charge tops out at 3.0. When the drift button is released:
//   - boost = min(charge, 3) * 200 px/s for 0.8 s
//   - the longer you held, the bigger the slingshot exit
//
// The charge level maps to a colour ramp so the player gets visual
// feedback: 0..1 = none, 1..2 = "blue spark", 2..3 = "orange spark"
// (Mario Kart -style mini-turbo cue).

export type DriftPhase = "idle" | "charging" | "boosting";

export interface DriftState {
  phase: DriftPhase;
  /** Accumulated charge (0..3). */
  charge: number;
  /** Remaining boost time (s) when phase === "boosting". */
  boostTimer: number;
  /** Strength of the current boost in extra px/s. 0 when not boosting. */
  boostPxs: number;
  /** Was the drift button held last frame? Used to detect release. */
  wasHeld: boolean;
}

export const DRIFT = {
  chargePerSecond: 1.5,
  maxCharge: 3.0,
  minSpeedToCharge: 140,        // px/s -- can't charge slow
  minSteerToCharge: 0.25,
  releaseDuration: 0.8,         // s of boost on release
  releasePxsPerCharge: 200,     // px/s extra top speed per charge point
  /** Charge tiers for the UI / glow colour. */
  tierBlue: 1.0,
  tierOrange: 2.0,
} as const;

export function makeDrift(): DriftState {
  return { phase: "idle", charge: 0, boostTimer: 0, boostPxs: 0, wasHeld: false };
}

export interface DriftStepInput {
  drift: boolean;
  steer: number;
  speed: number; // |velocity|
  dt: number;    // seconds
}

export function stepDrift(state: DriftState, input: DriftStepInput): void {
  const held = input.drift;
  const eligibleToCharge =
    held &&
    Math.abs(input.steer) > DRIFT.minSteerToCharge &&
    input.speed > DRIFT.minSpeedToCharge;

  if (state.phase === "boosting") {
    state.boostTimer -= input.dt;
    if (state.boostTimer <= 0) {
      state.boostTimer = 0;
      state.boostPxs = 0;
      state.phase = "idle";
    }
  }

  if (held) {
    if (eligibleToCharge) {
      state.charge = Math.min(DRIFT.maxCharge, state.charge + DRIFT.chargePerSecond * input.dt);
      state.phase = "charging";
    }
    // Charging-without-turning still keeps state.phase === "charging" (we
    // don't reset the bar mid-corner; player might briefly straighten).
  } else if (state.wasHeld) {
    // Just released.
    if (state.charge > DRIFT.tierBlue) {
      state.phase = "boosting";
      state.boostTimer = DRIFT.releaseDuration;
      state.boostPxs = state.charge * DRIFT.releasePxsPerCharge;
    } else {
      state.phase = "idle";
    }
    state.charge = 0;
  }

  state.wasHeld = held;
}

/** UI helper -- coloured glow based on charge tier. */
export function driftTier(state: DriftState): "none" | "blue" | "orange" {
  if (state.charge >= DRIFT.tierOrange) return "orange";
  if (state.charge >= DRIFT.tierBlue) return "blue";
  return "none";
}
