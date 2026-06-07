// Turbo Racers -- jump ramps. Visual hop with parabolic z trajectory.

import type { JumpRamp } from "./tracks";

export interface JumpState {
  z: number;
  remainingS: number;
  peakZ: number;
  totalS: number;
  cooldownS: number;
}

export function makeJump(): JumpState {
  return { z: 0, remainingS: 0, peakZ: 0, totalS: 0, cooldownS: 0 };
}

export function isAirborne(state: JumpState): boolean {
  return state.remainingS > 0;
}

function headingDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

export interface JumpStepInput {
  ramps: JumpRamp[];
  carX: number;
  carY: number;
  carHeadingRad: number;
  carSpeed: number;
  dt: number;
}

export function stepJump(state: JumpState, input: JumpStepInput): void {
  state.cooldownS = Math.max(0, state.cooldownS - input.dt);
  if (state.remainingS > 0) {
    state.remainingS -= input.dt;
    if (state.remainingS <= 0) {
      state.z = 0;
      state.remainingS = 0;
      state.cooldownS = 0.3;
    } else {
      const t = 1 - state.remainingS / state.totalS;
      state.z = 4 * state.peakZ * t * (1 - t);
    }
    return;
  }
  if (state.cooldownS > 0) return;
  if (input.carSpeed < 120) return;
  for (const r of input.ramps) {
    const dx = input.carX - r.x;
    const dy = input.carY - r.y;
    if (Math.abs(dx) > r.half && Math.abs(dy) > r.half) continue;
    const inside = (dx * dx + dy * dy) < r.half * r.half * 1.5;
    if (!inside) continue;
    if (headingDiff(input.carHeadingRad, r.approachRad) > Math.PI / 3) continue;
    const speedScale = Math.min(1.2, input.carSpeed / 350);
    state.peakZ = r.strength * speedScale;
    state.totalS = 0.65 + speedScale * 0.2;
    state.remainingS = state.totalS;
    state.z = 0.01;
    return;
  }
}

export function airScale(state: JumpState): number {
  if (state.z <= 0) return 1.0;
  return 1.0 + Math.min(0.5, state.z / 180);
}

export function shadowOffset(state: JumpState): { x: number; y: number; opacity: number } {
  return { x: state.z * 0.3, y: state.z * 0.7, opacity: state.z > 0 ? 0.45 : 0 };
}