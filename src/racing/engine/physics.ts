// Turbo Racers -- top-down car physics. Pure functions, no React.
//
// World coordinates: +X right, +Y down (canvas convention).
// Heading is in radians, 0 = car nose pointing UP (-Y direction) because
// the Kenney top-down car sprites are portrait-oriented with the nose at
// the top. So forward = (sin(heading), -cos(heading)).
//
// We use a simplified bicycle-style model with explicit lateral-grip
// damping so drift mode (reduced grip) actually slides instead of feeling
// like glued-down arcade steering.

export interface CarState {
  /** World position of car centre. */
  x: number;
  y: number;
  /** Velocity vector in world units / second. */
  vx: number;
  vy: number;
  /** Heading in radians; 0 = pointing up (-Y). */
  heading: number;
  /** Angular velocity, radians / second. */
  angularVel: number;
}

export interface CarInput {
  /** -1 (full left) ... +1 (full right). */
  steer: number;
  /** 0 ... 1, throttle. */
  throttle: number;
  /** 0 ... 1, brake. */
  brake: number;
  /** True while drift button is held. */
  drift: boolean;
}

/** Tunables shared across cars (Phase 2 will let each car override). */
export const PHYSICS = {
  accel: 1200,            // px/s^2 forward thrust at full throttle
  brake: 2000,            // px/s^2 decel when brake held and moving forward
  reverseAccel: 600,      // gentle reverse if brake held while stopped
  steerAuthority: 3.5,    // multiplier on (speed/200) -> angular velocity
  steerSpeedRef: 200,     // speed at which steering authority is "normal"
  angularDamp: 8.0,       // angular velocity decay (1/s); higher = snappier centring
  gripLateral: 14.0,      // how fast lateral velocity is cancelled (1/s) on asphalt
  gripDrift: 4.0,         // lateral cancel rate while drifting (sliding allowed)
  rollingDecay: 0.985,    // multiplicative speed decay per frame on coast
  maxSpeed: 520,          // px/s top speed
  /** Per-surface grip + speed multipliers. Looked up via Track.surfaceAt(). */
  surface: {
    asphalt: { gripMul: 1.0, speedMul: 1.0 },
    grass:   { gripMul: 0.55, speedMul: 0.65 },
    dirt:    { gripMul: 0.75, speedMul: 0.85 },
  },
} as const;

export type SurfaceKey = keyof typeof PHYSICS.surface;

export interface StepEnv {
  surface: SurfaceKey;
  /** Extra boost from drift release or slipstream slingshot (px/s of bonus top-speed). */
  boostPxs: number;
}

/** Advance one fixed step. dt in seconds (we cap at 1/30 to stay sane). */
export function stepCar(car: CarState, input: CarInput, env: StepEnv, dt: number): void {
  if (dt > 1 / 30) dt = 1 / 30;

  const surf = PHYSICS.surface[env.surface];
  const sin = Math.sin(car.heading);
  const cos = Math.cos(car.heading);
  // Forward unit vector: 0 heading = up, so forward = (sin, -cos).
  const fx = sin;
  const fy = -cos;
  // Right-perpendicular unit vector (for lateral grip).
  const rx = cos;
  const ry = sin;

  // ---- Throttle / brake / coast ----
  const forwardSpeed = car.vx * fx + car.vy * fy;
  let throttleAccel = input.throttle * PHYSICS.accel;
  let brakeAccel = 0;
  if (input.brake > 0) {
    if (forwardSpeed > 5) {
      brakeAccel = -PHYSICS.brake * input.brake;
    } else if (forwardSpeed > -120) {
      // Gentle reverse when stopped or rolling backward slightly.
      brakeAccel = -PHYSICS.reverseAccel * input.brake;
    }
  }
  const longAccel = throttleAccel + brakeAccel;
  car.vx += fx * longAccel * dt;
  car.vy += fy * longAccel * dt;

  // ---- Steering ----
  // Authority scales with speed so the car doesn't pivot in place.
  const speed = Math.hypot(car.vx, car.vy);
  const authority = Math.min(speed / PHYSICS.steerSpeedRef, 2.0) * PHYSICS.steerAuthority;
  // Reverse steering when reversing so wheel-input matches expectation.
  const dirSign = forwardSpeed >= 0 ? 1 : -1;
  const targetAngVel = input.steer * authority * dirSign;
  // First-order chase toward target angular velocity.
  car.angularVel += (targetAngVel - car.angularVel) * Math.min(PHYSICS.angularDamp * dt, 1);
  car.heading += car.angularVel * dt;
  // Wrap heading.
  if (car.heading > Math.PI) car.heading -= 2 * Math.PI;
  if (car.heading < -Math.PI) car.heading += 2 * Math.PI;

  // ---- Lateral grip (kill sideslip; less when drifting) ----
  const lateralSpeed = car.vx * rx + car.vy * ry;
  const baseGrip = input.drift ? PHYSICS.gripDrift : PHYSICS.gripLateral;
  const grip = baseGrip * surf.gripMul;
  const lateralKill = Math.min(grip * dt, 1);
  car.vx -= rx * lateralSpeed * lateralKill;
  car.vy -= ry * lateralSpeed * lateralKill;

  // ---- Rolling decay when coasting ----
  if (input.throttle < 0.05 && input.brake < 0.05) {
    car.vx *= PHYSICS.rollingDecay;
    car.vy *= PHYSICS.rollingDecay;
  }

  // ---- Cap speed (with surface + boost) ----
  const maxSpd = PHYSICS.maxSpeed * surf.speedMul + env.boostPxs;
  const newSpeed = Math.hypot(car.vx, car.vy);
  if (newSpeed > maxSpd) {
    const k = maxSpd / newSpeed;
    car.vx *= k;
    car.vy *= k;
  }

  // ---- Integrate position ----
  car.x += car.vx * dt;
  car.y += car.vy * dt;
}

/** Convenience -- forward speed (signed). Useful for HUD speedometer. */
export function forwardSpeed(car: CarState): number {
  const fx = Math.sin(car.heading);
  const fy = -Math.cos(car.heading);
  return car.vx * fx + car.vy * fy;
}

export function speedKph(car: CarState): number {
  // 1 px/s -> ~0.6 km/h is arbitrary; tune to a fun-feeling HUD number.
  return Math.round(Math.hypot(car.vx, car.vy) * 0.55);
}

export function makeCar(x: number, y: number, headingRad = 0): CarState {
  return { x, y, vx: 0, vy: 0, heading: headingRad, angularVel: 0 };
}
