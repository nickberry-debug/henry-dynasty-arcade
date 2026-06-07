// Hardball — pitch math
// Each pitch type has: travel time (ms), straight-line component,
// and a curve function (t in [0,1]) → {dx, dy} offset from straight line.

export type PitchType = "fastball" | "curve" | "slider" | "changeup";

export interface PitchAim {
  /** -1..1, left-right relative to plate center */
  x: number;
  /** -1..1, high(-1)..low(1) relative to strike zone center */
  y: number;
}

export interface PitchSpec {
  type: PitchType;
  /** Display color for the tracer dots. */
  color: string;
  /** Total flight time, ms (mound → plate). */
  travelMs: number;
  /** Outcome-window difficulty multiplier (changeup throws off timing). */
  timingDifficulty: number;
  /** Curve in plate-x (px) at t. */
  curveX: (t: number) => number;
  /** Vertical drop in plate-y (px) at t (positive = downward). */
  curveY: (t: number) => number;
}


export const PITCHES: Record<PitchType, PitchSpec> = {
  fastball: {
    type: "fastball",
    color: "#ffffff",
    travelMs: 620,
    timingDifficulty: 1.0,
    curveX: () => 0,
    curveY: () => 0,
  },
  curve: {
    type: "curve",
    color: "#ef4444",
    travelMs: 820,
    timingDifficulty: 1.05,
    // bends down and slightly left late
    curveX: (t) => -22 * Math.pow(t, 2.2),
    curveY: (t) => 34 * Math.pow(t, 2.4),
  },
  slider: {
    type: "slider",
    color: "#facc15",
    travelMs: 720,
    timingDifficulty: 1.1,
    // late horizontal break
    curveX: (t) => 28 * Math.pow(t, 3.0),
    curveY: (t) => 8 * Math.pow(t, 2.5),
  },
  changeup: {
    type: "changeup",
    color: "#86efac",
    travelMs: 980, // looks slow → throws off timing
    timingDifficulty: 1.25,
    curveX: (t) => 6 * Math.sin(t * Math.PI),
    curveY: (t) => 18 * Math.pow(t, 1.8),
  },
};

/**
 * Resolve the ball's screen position at flight time `tMs`,
 * given a vertical pipe between mound (mY) and plate (pY), plate-aim,
 * and the field width in px.
 */
export function ballPositionAt(
  spec: PitchSpec,
  aim: PitchAim,
  tMs: number,
  mound: { x: number; y: number },
  plate: { x: number; y: number },
): { x: number; y: number; t: number } {
  const t = Math.max(0, Math.min(1, tMs / spec.travelMs));
  // straight-line interpolate mound → plate, biased by aim
  const aimedPlateX = plate.x + aim.x * 56;
  const aimedPlateY = plate.y + aim.y * 18;
  const sx = mound.x + (aimedPlateX - mound.x) * t;
  const sy = mound.y + (aimedPlateY - mound.y) * t;
  return { x: sx + spec.curveX(t), y: sy + spec.curveY(t), t };
}
