// Turbo Racers -- ghost CPU racer.
//
// Phase 1 ships ONE CPU that follows the racing line at a moderate pace so
// Nick can validate slipstream. No drift, no item use. Phase 5 will spawn
// difficulty-banded CPU roster with rubber-band AI.

import type { CarState } from "./physics";
import type { CarInput } from "./physics";
import type { TrackDef } from "./track";

export interface CpuState {
  /** Index of last-targeted centreline point -- used so the CPU advances around the loop instead of getting stuck on the nearest point. */
  targetIdx: number;
  /** Tuning: 0..1 throttle cap. */
  throttleCap: number;
}

export function makeCpu(track: TrackDef): CpuState {
  // Start the CPU's target a few points ahead of the start so it doesn't
  // immediately try to U-turn.
  return { targetIdx: findNearestCentrelineIdx(track, track.startPos.x, track.startPos.y) + 6, throttleCap: 0.78 };
}

function findNearestCentrelineIdx(track: TrackDef, x: number, y: number): number {
  const cl = track.centreline;
  let bestIdx = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < cl.length; i++) {
    const dx = cl[i].x - x;
    const dy = cl[i].y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Compute a steering+throttle input that drives the CPU toward the next centreline point. */
export function cpuDrive(state: CpuState, car: CarState, track: TrackDef): CarInput {
  const cl = track.centreline;
  // Advance target until it's at least ~110 px ahead -- gives the CPU a smooth lookahead.
  let safety = 0;
  while (safety++ < cl.length) {
    const tgt = cl[state.targetIdx % cl.length];
    const dx = tgt.x - car.x;
    const dy = tgt.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 110) break;
    state.targetIdx = (state.targetIdx + 1) % cl.length;
  }
  const tgt = cl[state.targetIdx % cl.length];
  const dx = tgt.x - car.x;
  const dy = tgt.y - car.y;
  // Desired heading in our convention (0 = up).
  const desiredHeading = Math.atan2(dx, -dy);
  // Smallest signed angle diff (target - current).
  let diff = desiredHeading - car.heading;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  // Map angle diff to steer input. 0.4 rad (~23 deg) saturates.
  const steer = Math.max(-1, Math.min(1, diff / 0.4));
  // Throttle: ease off in tight turns.
  const turnEase = 1 - Math.min(1, Math.abs(diff) / 0.8) * 0.45;
  const throttle = Math.max(0.3, state.throttleCap * turnEase);
  return { steer, throttle, brake: 0, drift: false };
}
