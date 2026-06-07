// Hardball — swing timing → contact outcome
import type { PitchSpec, PitchAim } from "./pitch";

export type ContactKind =
  | "whiff"
  | "foul"
  | "grounder"
  | "liner"
  | "fly"
  | "homerun";

export interface SwingResult {
  kind: ContactKind;
  /** Launch angle, deg (0 = flat, 60 = popup). */
  angle: number;
  /** Launch speed in px/s for the canvas. */
  speedPx: number;
  /** Spray angle: -1 left, 0 center, +1 right. */
  spray: number;
  /** Timing error (ms, signed: + late, - early). */
  errorMs: number;
}

/**
 * @param pitchSpec   the pitch in flight
 * @param aim         where the ball is aimed (also where the batter is "looking")
 * @param plateTime   ms-from-release when the ball reaches the front of the plate
 * @param swingTime   ms-from-release the batter swung
 */
export function resolveSwing(
  pitchSpec: PitchSpec,
  aim: PitchAim,
  plateTime: number,
  swingTime: number,
): SwingResult {
  const errorMs = swingTime - plateTime;
  const abs = Math.abs(errorMs) * pitchSpec.timingDifficulty;

  // total whiff
  if (abs > 110) return { kind: "whiff", angle: 0, speedPx: 0, spray: 0, errorMs };


  // foul tip — late or very early but contacted
  if (abs > 70) {
    return {
      kind: "foul",
      angle: 75,
      speedPx: 280,
      spray: errorMs > 0 ? 0.9 : -0.9,
      errorMs,
    };
  }

  // location penalty — chasing way outside is harder
  const locPenalty = Math.min(1, Math.abs(aim.x) * 0.4 + Math.abs(aim.y) * 0.3);

  // contact zone — pick outcome from precision + a little randomness
  const precision = 1 - abs / 70; // 1 = perfect, 0 = edge of foul
  const roll = Math.random();

  // sweet-spot CRACK — HOME RUN
  if (precision > 0.78 && locPenalty < 0.35 && roll > 0.35) {
    return {
      kind: "homerun",
      angle: 28 + Math.random() * 12,
      speedPx: 760 + Math.random() * 80,
      spray: (Math.random() - 0.5) * 0.7,
      errorMs,
    };
  }

  // hard liner
  if (precision > 0.6) {
    return {
      kind: "liner",
      angle: 12 + Math.random() * 10,
      speedPx: 560 + Math.random() * 80,
      spray: (Math.random() - 0.5) * 1.2,
      errorMs,
    };
  }


  // fly ball
  if (precision > 0.4 && roll > 0.5) {
    return {
      kind: "fly",
      angle: 42 + Math.random() * 14,
      speedPx: 380 + Math.random() * 120,
      spray: (Math.random() - 0.5) * 1.4,
      errorMs,
    };
  }

  // default grounder
  return {
    kind: "grounder",
    angle: 5 + Math.random() * 6,
    speedPx: 320 + Math.random() * 100,
    spray: (Math.random() - 0.5) * 1.4,
    errorMs,
  };
}

/** Friendly label used by the toast + scoreboard. */
export function contactLabel(k: ContactKind): string {
  switch (k) {
    case "whiff":    return "STRIKE!";
    case "foul":     return "FOUL";
    case "grounder": return "GROUNDER";
    case "liner":    return "LINE DRIVE!";
    case "fly":      return "FLY BALL";
    case "homerun":  return "HOME RUN!!";
  }
}
