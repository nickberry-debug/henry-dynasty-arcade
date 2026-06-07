// Hardball — fielding helpers.
// For Phase 1 we keep fielding light: ball trajectory + tap-to-catch
// window. The match canvas calls catchAttempt() when the player taps
// in the right window, and we resolve out/hit. Phase 2 will add a real
// d-pad + fielder switching.

import type { ContactKind } from "./swing";

export interface BallInPlay {
  /** Origin x in canvas px (plate). */
  ox: number;
  /** Origin y in canvas px (plate). */
  oy: number;
  /** Spray angle, -1 left .. +1 right. */
  spray: number;
  /** Launch angle deg. */
  angle: number;
  /** Launch speed in px/s. */
  speedPx: number;
  /** Hit kind (drives outcome rules). */
  kind: ContactKind;
  /** When pitch was contacted (ms epoch). */
  t0: number;
  /** Air time, ms (computed). */
  airMs: number;
}

const GRAVITY = 1.2; // arbitrary canvas gravity factor (px/ms^2-ish)

export function makeBallInPlay(
  ox: number,
  oy: number,
  swing: { angle: number; speedPx: number; spray: number; kind: ContactKind },
  now: number,
): BallInPlay {
  // crude airMs from angle + speed (parabola, peak at half flight)
  const rad = (swing.angle * Math.PI) / 180;
  // simple physics: time aloft ~ 2 * v * sin(theta) / g, scaled to ms
  const tSec = (2 * (swing.speedPx / 100) * Math.sin(rad)) / GRAVITY;
  const airMs = Math.max(400, Math.min(2400, tSec * 1000));
  return { ox, oy, spray: swing.spray, angle: swing.angle, speedPx: swing.speedPx, kind: swing.kind, t0: now, airMs };
}


/** Real-time ball position at time t (now-ms) during flight. */
export function ballAt(b: BallInPlay, nowMs: number, fieldW: number, fieldH: number) {
  const t = Math.max(0, Math.min(1, (nowMs - b.t0) / b.airMs));
  // Travel down the field upward (toward outfield = -y in canvas convention).
  // We treat plate at bottom-center, outfield at top.
  const distance = b.speedPx * (b.airMs / 1000) * t * 0.6;
  const dx = b.spray * fieldW * 0.32;
  const x = b.ox + dx * t;
  const y = b.oy - distance;
  // arc height — parabola, peak at t=0.5
  const peak = b.speedPx * 0.35 * Math.sin((b.angle * Math.PI) / 180);
  const arc = -4 * peak * t * (1 - t);
  // landing zone — if fly/HR clamp to a sensible point inside field
  const landingX = b.ox + dx;
  const landingY = Math.max(40, b.oy - distance / t || fieldH * 0.25);
  return { x, y: y + arc, t, landingX, landingY };
}

/** Where the ball lands (used to draw the catch ring). */
export function landingPoint(b: BallInPlay, fieldW: number, fieldH: number) {
  const distance = b.speedPx * (b.airMs / 1000) * 0.6;
  const dx = b.spray * fieldW * 0.32;
  const landingX = Math.max(20, Math.min(fieldW - 20, b.ox + dx));
  const landingY = Math.max(40, b.oy - distance);
  // home run sails out the top edge — let it leave
  if (b.kind === "homerun") {
    return { x: landingX, y: -40, gone: true };
  }
  return { x: landingX, y: Math.max(40, landingY), gone: false };
}
