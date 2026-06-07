// Turbo Racers -- per-car stat triangle + upgrades.
//
// Stats are values in [0, 100] across four axes:
//   topSpeed   -- 0..100 maps to maxSpeed 380..620 px/s
//   accel      -- 0..100 maps to forward thrust 850..1450 px/s^2
//   grip       -- 0..100 maps to lateral-grip multiplier 0.7..1.3
//   handling   -- 0..100 maps to steerAuthority multiplier 0.75..1.35
//
// Each car has a base stat triangle. Upgrades add +12 per level to one
// stat (capped at 100). Levels are stored per-car in localStorage.

export type StatKey = "topSpeed" | "accel" | "grip" | "handling";

export interface CarStats {
  topSpeed: number;
  accel: number;
  grip: number;
  handling: number;
}

export interface UpgradeLevels {
  topSpeed: number;
  accel: number;
  grip: number;
  handling: number;
}

export const UPGRADE_CAP = 5;
export const UPGRADE_BUMP = 12;
export const UPGRADE_COST = [0, 120, 220, 360, 540, 760]; // cumulative cost per level

export function emptyLevels(): UpgradeLevels {
  return { topSpeed: 0, accel: 0, grip: 0, handling: 0 };
}

export function effectiveStats(base: CarStats, levels: UpgradeLevels): CarStats {
  return {
    topSpeed: clamp01_100(base.topSpeed + levels.topSpeed * UPGRADE_BUMP),
    accel: clamp01_100(base.accel + levels.accel * UPGRADE_BUMP),
    grip: clamp01_100(base.grip + levels.grip * UPGRADE_BUMP),
    handling: clamp01_100(base.handling + levels.handling * UPGRADE_BUMP),
  };
}

function clamp01_100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function statToMaxSpeed(s: number): number {
  return 380 + (s / 100) * 240;
}
export function statToAccel(s: number): number {
  return 850 + (s / 100) * 600;
}
export function statToGripMul(s: number): number {
  return 0.7 + (s / 100) * 0.6;
}
export function statToSteerMul(s: number): number {
  return 0.75 + (s / 100) * 0.6;
}
