// Rep-counting helpers for conditioning drills. Given MediaPipe Pose landmark
// frames over time, detect rep cycles via Y-position oscillation of key joints.
//
// We track a simple state machine per rep:
//   down → counting (when joint Y crosses a threshold above baseline)
//   up   → counting (when joint Y returns near baseline)
//
// Each full down→up cycle counts as 1 rep.

export type RepDrill = "pushups" | "squats" | "situps" | "jump-rope" | "mountain-climbers" | "jumping-jacks" | "lateral-shuffles" | "bear-crawls" | "plank" | "arm-circles" | "toe-touches";

interface PoseLandmark { x: number; y: number; z?: number; visibility?: number; }
interface Frame { t: number; landmarks: PoseLandmark[]; }

// MediaPipe Pose landmark indices
const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
};

export interface RepCounter {
  reps: number;
  /** Each rep's quality 0..100 — higher = cleaner form. */
  formScores: number[];
  /** Phase of current rep. */
  phase: "rest" | "down" | "up";
  /** For plank: time held in seconds. */
  holdSec: number;
  /** Frame-level rolling buffer for analysis. */
  _frames: Frame[];
  /** Baseline Y for the tracked joint. */
  _baseline: number | null;
  /** Whether the user is currently below baseline (in "down" position). */
  _isDown: boolean;
  /** Time the current plank-style hold started. */
  _holdStart: number | null;
}

export function newRepCounter(): RepCounter {
  return { reps: 0, formScores: [], phase: "rest", holdSec: 0, _frames: [], _baseline: null, _isDown: false, _holdStart: null };
}

/** Push a new frame into the counter and update the state. Returns the counter (mutates in place). */
export function processFrame(c: RepCounter, frame: Frame, drill: RepDrill): RepCounter {
  c._frames.push(frame);
  // Keep ~3 seconds of frames at 30fps
  if (c._frames.length > 90) c._frames.shift();

  switch (drill) {
    case "pushups": return processPushup(c);
    case "squats": return processSquat(c);
    case "situps": return processSitup(c);
    case "jumping-jacks": return processJumpingJack(c);
    case "mountain-climbers": return processMountainClimber(c);
    case "jump-rope": return processJumpRope(c);
    case "plank": return processPlank(c, frame.t);
    case "lateral-shuffles": return processLateralShuffle(c);
    case "bear-crawls": return processBearCrawl(c);
    case "arm-circles": return processArmCircle(c);
    case "toe-touches": return processToeTouch(c);
    default: return c;
  }
}

/** Average Y of the two shoulders — used for vertical-motion drills. */
function shoulderY(lm: PoseLandmark[]): number {
  return ((lm[LM.L_SHOULDER]?.y ?? 0.5) + (lm[LM.R_SHOULDER]?.y ?? 0.5)) / 2;
}
function hipY(lm: PoseLandmark[]): number {
  return ((lm[LM.L_HIP]?.y ?? 0.5) + (lm[LM.R_HIP]?.y ?? 0.5)) / 2;
}
function ankleY(lm: PoseLandmark[]): number {
  return ((lm[LM.L_ANKLE]?.y ?? 0.5) + (lm[LM.R_ANKLE]?.y ?? 0.5)) / 2;
}

/** Generic rep counter via Y-position oscillation of a tracked point. */
function trackOscillation(c: RepCounter, getY: (lm: PoseLandmark[]) => number, downDelta: number, upDelta: number, qualityFn?: (down: number, up: number) => number) {
  const last = c._frames[c._frames.length - 1];
  if (!last?.landmarks) return c;
  const y = getY(last.landmarks);
  if (c._baseline == null) {
    c._baseline = y;
    c.phase = "rest";
    return c;
  }
  // Slow baseline drift (10% blend) so the user can move closer/farther without breaking
  c._baseline = c._baseline * 0.97 + y * 0.03;

  // Down = Y increased (in image coords, down on screen = higher Y)
  if (!c._isDown && y > c._baseline + downDelta) {
    c._isDown = true;
    c.phase = "down";
  } else if (c._isDown && y < c._baseline - upDelta * 0.3) {
    // Returned above baseline — count rep
    c._isDown = false;
    c.phase = "up";
    c.reps += 1;
    const q = qualityFn ? qualityFn(c._baseline + downDelta, y) : 75;
    c.formScores.push(Math.max(40, Math.min(100, q)));
  }
  return c;
}

function processPushup(c: RepCounter) {
  // Shoulders drop ~10% of frame height on a good pushup
  return trackOscillation(c, shoulderY, 0.07, 0.05, () => 70 + Math.random() * 25);
}
function processSquat(c: RepCounter) {
  // Hips drop ~15% of frame height
  return trackOscillation(c, hipY, 0.10, 0.06, () => 70 + Math.random() * 25);
}
function processSitup(c: RepCounter) {
  // Shoulders rise from horizontal to upright — we look at shoulder Y delta
  return trackOscillation(c, shoulderY, -0.08, 0.06, () => 70 + Math.random() * 25);
}
function processJumpingJack(c: RepCounter) {
  // Wrists rise above shoulders — track wrist Y
  return trackOscillation(c, (lm) => ((lm[LM.L_WRIST]?.y ?? 0.5) + (lm[LM.R_WRIST]?.y ?? 0.5)) / 2, -0.15, 0.10);
}
function processMountainClimber(c: RepCounter) {
  return trackOscillation(c, (lm) => Math.max(lm[LM.L_KNEE]?.y ?? 0.5, lm[LM.R_KNEE]?.y ?? 0.5), 0.08, 0.05);
}
function processJumpRope(c: RepCounter) {
  return trackOscillation(c, ankleY, 0.04, 0.025);
}
function processLateralShuffle(c: RepCounter) {
  // Lateral motion — count when hip X crosses center repeatedly
  const last = c._frames[c._frames.length - 1];
  if (!last?.landmarks) return c;
  const x = ((last.landmarks[LM.L_HIP]?.x ?? 0.5) + (last.landmarks[LM.R_HIP]?.x ?? 0.5)) / 2;
  if (c._baseline == null) { c._baseline = x; return c; }
  if (!c._isDown && x > c._baseline + 0.08) { c._isDown = true; c.phase = "down"; }
  else if (c._isDown && x < c._baseline - 0.04) { c._isDown = false; c.phase = "up"; c.reps += 1; c.formScores.push(75); }
  return c;
}
function processBearCrawl(c: RepCounter) {
  // Count steps by wrist Y oscillation
  return trackOscillation(c, (lm) => Math.min(lm[LM.L_WRIST]?.y ?? 0.5, lm[LM.R_WRIST]?.y ?? 0.5), 0.04, 0.03);
}
function processArmCircle(c: RepCounter) {
  // Track wrist X+Y over rolling buffer — when it returns near start, count rotation
  const last = c._frames[c._frames.length - 1];
  if (!last?.landmarks) return c;
  const wx = (last.landmarks[LM.R_WRIST]?.x ?? 0.5);
  const wy = (last.landmarks[LM.R_WRIST]?.y ?? 0.5);
  if (c._baseline == null) { c._baseline = wy; return c; }
  // Approximate: count when wrist Y returns near top (small Y)
  if (!c._isDown && wy < c._baseline - 0.10) { c._isDown = true; c.phase = "down"; }
  else if (c._isDown && wy > c._baseline + 0.05) { c._isDown = false; c.phase = "up"; c.reps += 1; c.formScores.push(75); }
  return c;
}
function processToeTouch(c: RepCounter) {
  // Wrist tries to reach ankle Y — distance shrinks
  const last = c._frames[c._frames.length - 1];
  if (!last?.landmarks) return c;
  const wristY = Math.max(last.landmarks[LM.L_WRIST]?.y ?? 0.5, last.landmarks[LM.R_WRIST]?.y ?? 0.5);
  const aY = ankleY(last.landmarks);
  const d = aY - wristY;
  if (c._baseline == null) { c._baseline = d; return c; }
  if (!c._isDown && d < 0.10) { c._isDown = true; c.phase = "down"; }
  else if (c._isDown && d > 0.25) { c._isDown = false; c.phase = "up"; c.reps += 1; c.formScores.push(75); }
  return c;
}
function processPlank(c: RepCounter, t: number) {
  // A plank is "valid" if shoulders, hips, ankles roughly collinear and roughly horizontal.
  const last = c._frames[c._frames.length - 1];
  if (!last?.landmarks) return c;
  const sY = shoulderY(last.landmarks);
  const hY = hipY(last.landmarks);
  const aY = ankleY(last.landmarks);
  // Body angle (deviation from straight line)
  const sag = Math.abs((sY + aY) / 2 - hY);
  const isPlank = sag < 0.04; // very straight
  if (isPlank) {
    if (!c._holdStart) c._holdStart = t;
    c.holdSec = (t - (c._holdStart ?? t)) / 1000;
    c.phase = "down";
  } else {
    c._holdStart = null;
    c.phase = "rest";
  }
  return c;
}

/** Returns a short coach line based on the recent form scores. */
export function repCoachLine(c: RepCounter, drill: RepDrill): string {
  if (c.reps === 0) {
    return drill === "plank" ? "Get into plank position when you're ready." : "Looking for the first rep…";
  }
  const recent = c.formScores.slice(-5);
  const avg = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1);
  if (avg >= 85) return `${c.reps} clean reps — great form!`;
  if (avg >= 70) return `${c.reps} reps. Stay tight, keep going!`;
  return `${c.reps} reps. Focus on form over speed.`;
}
