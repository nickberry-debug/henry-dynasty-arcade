// Turbo Racers -- lap detection. Finish-line crossing is detected by
// segment-intersection between the car's previous frame position and
// current frame position. We require the cross direction to match the
// race direction (CCW on our oval = car moving with negative-X tangent)
// so that crossing the line backwards doesn't decrement laps.

import type { TrackDef } from "./track";

export interface LapState {
  lap: number;            // 1..N during race (counting current lap)
  totalLaps: number;
  finished: boolean;
  /** Time at race start (perf.now() ms). */
  raceStartMs: number;
  /** Per-lap completion timestamps relative to race start (ms). */
  splits: number[];
  /** Cumulative race time at finish (ms). 0 while racing. */
  finishMs: number;
  /** Last frame's position -- used to test segment crossing. */
  lastX: number;
  lastY: number;
  /** True for the first ~1 second after start, suppressing immediate re-cross. */
  startGraceUntilMs: number;
}

export function makeLap(track: TrackDef, x: number, y: number, nowMs: number): LapState {
  return {
    lap: 1,
    totalLaps: track.laps,
    finished: false,
    raceStartMs: nowMs,
    splits: [],
    finishMs: 0,
    lastX: x,
    lastY: y,
    startGraceUntilMs: nowMs + 1200,
  };
}

/** Return >0 if AB and CD intersect. (We only need a yes/no.) */
function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const s1x = bx - ax, s1y = by - ay;
  const s2x = dx - cx, s2y = dy - cy;
  const denom = -s2x * s1y + s1x * s2y;
  if (denom === 0) return false;
  const s = (-s1y * (ax - cx) + s1x * (ay - cy)) / denom;
  const t = ( s2x * (ay - cy) - s2y * (ax - cx)) / denom;
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

export interface LapStepInput {
  track: TrackDef;
  x: number;
  y: number;
  /** Forward direction unit vector for the car (used for direction check). */
  fx: number;
  fy: number;
  nowMs: number;
}

/** Returns true if a new lap completed this frame. */
export function stepLap(state: LapState, input: LapStepInput): boolean {
  if (state.finished) return false;
  const { track, x, y, nowMs } = input;
  if (nowMs < state.startGraceUntilMs) {
    state.lastX = x;
    state.lastY = y;
    return false;
  }
  const fl = track.finishLine;
  const crossed = segmentsIntersect(state.lastX, state.lastY, x, y, fl.x1, fl.y1, fl.x2, fl.y2);
  state.lastX = x;
  state.lastY = y;
  if (!crossed) return false;
  // Direction check: on our oval the race tangent at the finish line points -X
  // (CCW around the oval at the bottom straight), so the car's forward dir
  // should also have a negative X component for a "legal" crossing.
  if (input.fx >= -0.2) return false; // require leftward motion
  const elapsed = nowMs - state.raceStartMs;
  state.splits.push(elapsed);
  state.lap += 1;
  if (state.lap > state.totalLaps) {
    state.finished = true;
    state.finishMs = elapsed;
    state.lap = state.totalLaps; // clamp for display
    return true;
  }
  return true;
}

export function formatMs(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const c = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, "0")}.${c.toString().padStart(2, "0")}`;
}
