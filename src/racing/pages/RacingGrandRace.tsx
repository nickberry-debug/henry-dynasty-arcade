// Turbo Racers -- Grand Race. Full-featured race mode with:
//   - Up to 7 CPU racers across 4 difficulty tiers (Easy / Medium / Hard / Expert)
//   - 7 original weapons + item boxes
//   - Position tracking + final results screen + credits
//   - Top-right minimap
//   - Mirror track toggle (?reverse=1)
//   - Customizable laps (?laps=N)
//   - Time-trial mode (?mode=tt) -- solo + best-lap ghost
//   - Same-device hot-seat 2P (?mode=2p) -- P1 then P2 best-lap challenge
//   - Championship cup (?mode=cup&cup=N&trackList=ids) -- carries points across races
//   - Audio + mute toggle
//
// Rendering reuses Phase 1 baked-track + camera + smoke pool.
// CPU AI reuses engine/cpu.ts with per-driver throttle caps from engine/roster.ts.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stepCar, makeCar, speedKph, type CarState, type CarInput, type CarTuning } from "../engine/physics";
import { bakeTrack, surfaceAt, type TrackDef } from "../engine/track";
import { trackById, TRACKS } from "../engine/tracks";
import { makeJump, stepJump, isAirborne, airScale, shadowOffset } from "../engine/jumps";
import { makeDrift, stepDrift, driftTier } from "../engine/drift";
import { makeSlip, stepSlip } from "../engine/slipstream";
import { makeLap, stepLap, formatMs } from "../engine/lap";
import { makeCpu, cpuDrive } from "../engine/cpu";
import { CARS, carById, type CarDef } from "../engine/cars";
import { effectiveStats, statToMaxSpeed, statToAccel, statToGripMul, statToSteerMul } from "../engine/stats";
import {
  getUpgrades, recordRace, getBestRace, getBestLap, addCoins,
  isMuted, setMuted, isMirrorUnlocked,
} from "../store";
import {
  WEAPONS, type WeaponId, rollWeapon,
  makeItemBoxes, stepItemBoxes, type ItemBox,
  type SpikeHazard, type SmokeZone, type HomingDart,
  type CarEffect, makeCarEffect, stepCarEffect,
  applySlow, applySpin, applyShield, applyBoostMul,
} from "../engine/weapons";
import { CPU_DRIVERS, pickField, carForDriver, type CpuDriver } from "../engine/roster";
import { unlockAudio, playVo, playBoost, playCrash, startEngine, stopEngine, setEnginePitch } from "../engine/audio";

interface SmokeParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; r: number;
  rgb: string; baseA: number;
}
const SMOKE_MAX = 80;

interface RacerRuntime {
  car: CarState;
  def: CarDef;
  /** -1 for human, else index into CPU_DRIVERS field. */
  cpuIdx: number;
  /** CPU state if cpuIdx >= 0. */
  cpuState: ReturnType<typeof makeCpu> | null;
  /** Driver name (CPU name or player handle). */
  driverName: string;
  /** Effect (spin / slow / shield / boost). */
  fx: CarEffect;
  /** Tuning (after upgrades + stat triangle). */
  tuning: CarTuning;
  /** Sprite cache. */
  sprite: HTMLImageElement;
  /** Lap state -- mirrors LapState semantics but per-racer. */
  lap: number;
  lapStartMs: number;
  bestLapMs: number;
  splits: number[];
  finished: boolean;
  finishMs: number;
  /** Current weapon held (or null). */
  weapon: WeaponId | null;
  /** Progress -- (laps * cl.length + nearest idx) for sorting positions. */
  progress: number;
  /** Last finish-line cross direction sample. */
  lastX: number; lastY: number;
}

interface ResultsBlob {
  ordered: { name: string; def: CarDef; finishMs: number; bestLapMs: number; isPlayer: boolean; playerSlot?: number }[];
  trackId: string;
  reverse: boolean;
  coinsEarned: number;
  newBestRace: boolean;
  newBestLap: boolean;
  mirrorUnlocked: boolean;
  mode: "race" | "tt" | "cup" | "2p";
}

function difficultyBand(d: string): number {
  if (d === "easy") return 2;
  if (d === "medium") return 3;
  if (d === "hard") return 4;
  return 5; // expert
}

function reverseCentreline<T extends { x: number; y: number }>(cl: T[]): T[] {
  const out = cl.slice().reverse();
  return out;
}

/** Build a (potentially mirrored) TrackDef from a catalogue entry. */
function buildTrack(entryId: string, laps: number, reverse: boolean): { track: TrackDef; ramps: ReturnType<typeof trackById>["jumps"]; sceneryEntry: ReturnType<typeof trackById> } {
  const entry = trackById(entryId);
  const t = entry.make(laps);
  if (reverse) {
    t.centreline = reverseCentreline(t.centreline);
    // Flip finish-line direction by swapping endpoints (still a valid segment but the cross
    // direction is the opposite of the original direction).
    const tmpX = t.finishLine.x1, tmpY = t.finishLine.y1;
    t.finishLine.x1 = t.finishLine.x2; t.finishLine.y1 = t.finishLine.y2;
    t.finishLine.x2 = tmpX; t.finishLine.y2 = tmpY;
    // Flip start heading 180 degrees.
    t.startPos.headingRad = t.startPos.headingRad + Math.PI;
  }
  return { track: t, ramps: entry.jumps, sceneryEntry: entry };
}

/** Compute one-time item-box positions spaced along the centreline. */
function itemBoxPositionsFor(track: TrackDef, count: number): { x: number; y: number }[] {
  const cl = track.centreline;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i / count) * cl.length + cl.length / 4) % cl.length;
    const a = cl[idx];
    const b = cl[(idx + 1) % cl.length];
    const tx = b.x - a.x, ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    // Slight lateral offset so boxes alternate sides.
    const side = i % 3 === 0 ? 0 : (i % 3 === 1 ? 28 : -28);
    out.push({ x: a.x + nx * side, y: a.y + ny * side });
  }
  return out;
}

function findNearestIdx(cl: { x: number; y: number }[], x: number, y: number): number {
  let bestIdx = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < cl.length; i++) {
    const dx = cl[i].x - x;
    const dy = cl[i].y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
  }
  return bestIdx;
}

export default function RacingGrandRace() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const playerCarId = sp.get("car") ?? CARS[0].id;
  const trackId = sp.get("track") ?? "oval";
  const laps = Math.max(1, Math.min(10, parseInt(sp.get("laps") ?? "3", 10) || 3));
  const cpuCount = Math.max(0, Math.min(7, parseInt(sp.get("cpu") ?? "3", 10) || 3));
  const difficulty = sp.get("diff") ?? "medium";
  const weaponsOn = (sp.get("weapons") ?? "1") !== "0";
  const reverse = sp.get("reverse") === "1" && isMirrorUnlocked(trackId);
  const mode = (sp.get("mode") ?? "race") as ResultsBlob["mode"];
  const playerSlot = parseInt(sp.get("slot") ?? "1", 10) || 1;
  // Cup mode passes a cumulative score string back via URL: cup=N&pts=10|6|0 etc.
  const cupRound = parseInt(sp.get("cupRound") ?? "0", 10) || 0;
  const cupTracks = (sp.get("cupTracks") ?? "").split(",").filter(Boolean);
  const cupPoints = (sp.get("cupPts") ?? "").split(",").filter(Boolean).map(s => parseInt(s, 10) || 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({
    lap: 1, totalLaps: laps, kph: 0, countdown: "3",
    position: 1, totalRacers: cpuCount + 1,
    weapon: null as WeaponId | null,
    finished: false, finishedMs: 0,
    mutedFlag: isMuted(),
  });
  const [results, setResults] = useState<ResultsBlob | null>(null);

  useEffect(() => {
    const canvasMaybe = canvasRef.current;
    if (!canvasMaybe) return;
    const ctxMaybe = canvasMaybe.getContext("2d");
    if (!ctxMaybe) return;
    const canvas: HTMLCanvasElement = canvasMaybe;
    const ctx: CanvasRenderingContext2D = ctxMaybe;

    // ---- World setup ----
    const { track, ramps, sceneryEntry } = buildTrack(trackId, laps, reverse);

    // ---- Player tuning ----
    const playerDef = carById(playerCarId);
    const playerLevels = getUpgrades(playerCarId);
    const playerStats = effectiveStats(playerDef.stats, playerLevels);
    const playerTuning: CarTuning = {
      accel: statToAccel(playerStats.accel),
      maxSpeed: statToMaxSpeed(playerStats.topSpeed),
      gripMul: statToGripMul(playerStats.grip),
      steerMul: statToSteerMul(playerStats.handling),
    };

    // ---- Sprite cache ----
    const sprites = new Map<string, HTMLImageElement>();
    function img(path: string): HTMLImageElement {
      let i = sprites.get(path);
      if (!i) { i = new Image(); i.src = path; sprites.set(path, i); }
      return i;
    }

    // ---- Racers ----
    const racers: RacerRuntime[] = [];
    const startPt = track.startPos;
    // Player on the back row + a slight stagger so the field doesn't pile up.
    const playerCar = makeCar(startPt.x, startPt.y, startPt.headingRad);
    racers.push({
      car: playerCar, def: playerDef, cpuIdx: -1, cpuState: null,
      driverName: `Player ${playerSlot}`, fx: makeCarEffect(),
      tuning: playerTuning, sprite: img(playerDef.sprite),
      lap: 1, lapStartMs: 0, bestLapMs: Infinity, splits: [], finished: false, finishMs: 0,
      weapon: null, progress: 0, lastX: startPt.x, lastY: startPt.y,
    });
    // CPU field.
    const band = difficultyBand(difficulty);
    const cpuField: CpuDriver[] = cpuCount > 0 ? pickField(band, cpuCount, playerCarId) : [];
    cpuField.forEach((drv, i) => {
      const carDef = carForDriver(drv);
      // Stagger CPUs behind the player on a grid pattern.
      const row = Math.floor(i / 2) + 1;
      const side = i % 2 === 0 ? 1 : -1;
      const cx = startPt.x + side * 40;
      const cy = startPt.y + 60 * row;
      const cs = makeCar(cx, cy, startPt.headingRad);
      racers.push({
        car: cs, def: carDef, cpuIdx: i,
        cpuState: makeCpu(track),
        driverName: drv.name, fx: makeCarEffect(),
        tuning: {
          accel: statToAccel(carDef.stats.accel),
          maxSpeed: statToMaxSpeed(carDef.stats.topSpeed),
          gripMul: statToGripMul(carDef.stats.grip),
          steerMul: statToSteerMul(carDef.stats.handling),
        },
        sprite: img(carDef.sprite),
        lap: 1, lapStartMs: 0, bestLapMs: Infinity, splits: [], finished: false, finishMs: 0,
        weapon: null, progress: 0, lastX: cx, lastY: cy,
      });
    });
    // Tune CPU difficulty multiplier by band (Easy 70%, Medium 85%, Hard 95%, Expert 100%).
    const bandPower = difficulty === "easy" ? 0.70 : difficulty === "medium" ? 0.85 : difficulty === "hard" ? 0.95 : 1.00;
    racers.forEach(r => { if (r.cpuIdx >= 0) {
      r.tuning = {
        accel: (r.tuning.accel ?? 1000) * bandPower,
        maxSpeed: (r.tuning.maxSpeed ?? 500) * bandPower,
        gripMul: r.tuning.gripMul,
        steerMul: r.tuning.steerMul,
      };
      if (r.cpuState) r.cpuState.throttleCap = cpuField[r.cpuIdx].throttleCap;
    }});

    // ---- Item boxes + active hazards ----
    const itemBoxes: ItemBox[] = weaponsOn ? makeItemBoxes(itemBoxPositionsFor(track, 8)) : [];
    const spikes: SpikeHazard[] = [];
    const smokeZones: SmokeZone[] = [];
    const darts: HomingDart[] = [];

    // ---- Time-trial ghost (best lap recorded positions) ----
    const ghostKey = `turboRacers.ghost.${trackId}${reverse ? ".rev" : ""}.${playerCarId}`;
    let ghostRecord: { ts: number; x: number; y: number; heading: number }[] = [];
    let ghostBest: { ts: number; x: number; y: number; heading: number }[] = [];
    if (mode === "tt") {
      try {
        const raw = localStorage.getItem(ghostKey);
        if (raw) ghostBest = JSON.parse(raw);
      } catch { /* ignore */ }
    }

    // ---- Baked track ----
    const grassTile = img("/assets/racing/tracks/land_grass01.png");
    let baked: HTMLCanvasElement | null = null;
    const sceneryImgs = sceneryEntry.scenery.map(s => ({ sprite: img(s.sprite), x: s.x, y: s.y, scale: s.scale ?? 0.5, rot: s.rot ?? 0 }));
    function ensureBake() {
      if (baked) return;
      baked = bakeTrack(track, {
        grassTile: grassTile.complete && grassTile.naturalWidth > 0 ? grassTile : null,
        outdoorTone: sceneryEntry.outdoorTone,
        scenery: sceneryImgs,
      });
    }
    grassTile.addEventListener("load", () => { baked = null; ensureBake(); });
    ensureBake();

    // ---- Input ----
    const input: CarInput = { steer: 0, throttle: 0, brake: 0, drift: false };
    const keys = { left: false, right: false, up: false, down: false, drift: false, fire: false };
    let fireHeldFrame = false;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keys.left = true;
      if (k === "arrowright" || k === "d") keys.right = true;
      if (k === "arrowup" || k === "w") keys.up = true;
      if (k === "arrowdown" || k === "s") keys.down = true;
      if (k === " ") { keys.drift = true; e.preventDefault(); }
      if (k === "f" || k === "enter" || k === "shift") { keys.fire = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keys.left = false;
      if (k === "arrowright" || k === "d") keys.right = false;
      if (k === "arrowup" || k === "w") keys.up = false;
      if (k === "arrowdown" || k === "s") keys.down = false;
      if (k === " ") keys.drift = false;
      if (k === "f" || k === "enter" || k === "shift") keys.fire = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const touch = { steer: 0, gas: false, brake: false, drift: false, fire: false };
    (canvas as unknown as { _touch: typeof touch })._touch = touch;

    const smoke: SmokeParticle[] = [];
    function emitSmoke(x: number, y: number, vx: number, vy: number, rgb = "240,240,240", baseA = 0.65) {
      if (smoke.length >= SMOKE_MAX) smoke.shift();
      smoke.push({
        x, y,
        vx: vx * 0.15 + (Math.random() - 0.5) * 20,
        vy: vy * 0.15 + (Math.random() - 0.5) * 20,
        life: 0, max: 0.6 + Math.random() * 0.4,
        r: 6 + Math.random() * 4,
        rgb, baseA,
      });
    }

    function resize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const t0 = performance.now();
    let countdownPlayed = { c3: false, c2: false, c1: false, go: false };
    const raceStartMs = t0 + 3500;

    // Per-racer lap-state init.
    racers.forEach(r => { r.lapStartMs = raceStartMs; });

    // Drift + slip (player only).
    const drift = makeDrift();
    const slip = makeSlip();
    const jump = makeJump();
    let lastBoostActive = false;
    let crashedCooldown = 0;
    const camera = { x: playerCar.x, y: playerCar.y };

    let lastT = performance.now();
    let lastHudSyncMs = 0;
    let running = true;
    let finishLatch = false;

    function loop(nowRaw: number) {
      if (!running) return;
      const now = nowRaw;
      const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
      lastT = now;

      // ---- Countdown ----
      const sinceStart = now - t0;
      if (!countdownPlayed.c3 && sinceStart > 100) { playVo("3"); countdownPlayed.c3 = true; }
      if (!countdownPlayed.c2 && sinceStart > 1000) { playVo("2"); countdownPlayed.c2 = true; }
      if (!countdownPlayed.c1 && sinceStart > 2000) { playVo("1"); countdownPlayed.c1 = true; }
      if (!countdownPlayed.go && sinceStart > 3000) { playVo("go"); countdownPlayed.go = true; startEngine(); }
      const racing = now >= raceStartMs;

      // ---- Player input ----
      const keyboardSteer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      const steer = Math.max(-1, Math.min(1, keyboardSteer + touch.steer));
      const throttleHeld = keys.up || touch.gas;
      const brakeHeld = keys.down || touch.brake;
      const driftHeld = keys.drift || touch.drift;
      const fireNow = (keys.fire || touch.fire) && !fireHeldFrame;
      fireHeldFrame = keys.fire || touch.fire;
      input.steer = racing ? steer : 0;
      input.throttle = racing && !racers[0].finished ? (throttleHeld ? 1 : 0) : 0;
      input.brake = racing ? (brakeHeld ? 1 : 0) : 0;
      input.drift = racing ? driftHeld : false;

      // ---- Slipstream + drift (player) ----
      const others = racers.filter((_, i) => i !== 0).map(r => r.car);
      stepSlip(slip, { self: playerCar, others, steer: input.steer, dt });
      const speedMag = Math.hypot(playerCar.vx, playerCar.vy);
      stepDrift(drift, { drift: input.drift, steer: input.steer, speed: speedMag, dt });
      const playerBoost = drift.boostPxs + slip.boostPxs;
      if (playerBoost > 0 && !lastBoostActive) playBoost();
      lastBoostActive = playerBoost > 0;

      // ---- Step physics ----
      racers.forEach((r, idx) => {
        stepCarEffect(r.fx, dt);
        const surf = surfaceAt(track, r.car.x, r.car.y);
        let racerInput: CarInput;
        if (idx === 0) {
          racerInput = input;
        } else if (racing && !r.finished) {
          racerInput = cpuDrive(r.cpuState!, r.car, track);
        } else {
          racerInput = { steer: 0, throttle: 0, brake: 0, drift: false };
        }
        const effectiveTuning: CarTuning = {
          accel: (r.tuning.accel ?? 1000) * r.fx.boostMul,
          maxSpeed: (r.tuning.maxSpeed ?? 500) * r.fx.boostMul * r.fx.slowMul,
          gripMul: r.tuning.gripMul,
          steerMul: r.tuning.steerMul,
        };
        const boost = idx === 0 ? playerBoost : 0;
        stepCar(r.car, racerInput, { surface: surf, boostPxs: boost, tuning: effectiveTuning }, dt);
        // Spin-out forces a heading rotation.
        if (r.fx.spinRad !== 0) r.car.heading += r.fx.spinRad * dt;
      });

      // ---- Containment ----
      const margin = 30;
      racers.forEach(r => {
        if (r.car.x < margin) { r.car.x = margin; r.car.vx = Math.abs(r.car.vx) * 0.3; }
        if (r.car.x > track.world.w - margin) { r.car.x = track.world.w - margin; r.car.vx = -Math.abs(r.car.vx) * 0.3; }
        if (r.car.y < margin) { r.car.y = margin; r.car.vy = Math.abs(r.car.vy) * 0.3; }
        if (r.car.y > track.world.h - margin) { r.car.y = track.world.h - margin; r.car.vy = -Math.abs(r.car.vy) * 0.3; }
      });

      // ---- Car-car collisions (cheap O(N^2)) ----
      crashedCooldown = Math.max(0, crashedCooldown - dt);
      for (let i = 0; i < racers.length; i++) {
        for (let j = i + 1; j < racers.length; j++) {
          const a = racers[i].car;
          const b = racers[j].car;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 38 && d > 0.001) {
            const nx = dx / d, ny = dy / d;
            const overlap = 38 - d;
            a.x += nx * overlap * 0.5; a.y += ny * overlap * 0.5;
            b.x -= nx * overlap * 0.5; b.y -= ny * overlap * 0.5;
            a.vx *= 0.9; a.vy *= 0.9; b.vx *= 0.9; b.vy *= 0.9;
            if ((i === 0 || j === 0) && crashedCooldown <= 0) { playCrash(); crashedCooldown = 0.4; }
          }
        }
      }

      // ---- Item-box pickup (any racer) + weapon use ----
      if (weaponsOn && racing) {
        racers.forEach((r, idx) => {
          if (r.finished) return;
          const pickIdx = stepItemBoxes(itemBoxes, r.car, dt);
          if (pickIdx >= 0 && r.weapon == null) {
            // Use racer's current standings to allow Recovery Ring at back of pack.
            const place = positionRank(racers, idx);
            r.weapon = rollWeapon(Math.random, place);
          }
        });
      }
      // Player fires their weapon.
      if (fireNow && racers[0].weapon && racing && !racers[0].finished) {
        const w = racers[0].weapon;
        const r = racers[0];
        const head = r.car.heading;
        const fx2 = Math.sin(head), fy2 = -Math.cos(head);
        if (w === "booster") { applyBoostMul(r.fx, 1.45, 3.0); playBoost(); }
        else if (w === "shield") { applyShield(r.fx, 4.0); }
        else if (w === "spike") { spikes.push({ x: r.car.x - fx2 * 36, y: r.car.y - fy2 * 36, ttlS: 12, ownerIdx: 0 }); }
        else if (w === "smoke") { smokeZones.push({ x: r.car.x - fx2 * 36, y: r.car.y - fy2 * 36, ttlS: 3, radius: 70, ownerIdx: 0 }); }
        else if (w === "homing") {
          // Acquire nearest racer ahead by progress.
          const ahead = racers.findIndex((rr, ii) => ii !== 0 && rr.progress > r.progress);
          const targetIdx = ahead >= 0 ? ahead : (racers.length > 1 ? 1 : 0);
          if (targetIdx !== 0) {
            const sp2 = 420;
            darts.push({ x: r.car.x + fx2 * 24, y: r.car.y + fy2 * 24, vx: fx2 * sp2, vy: fy2 * sp2, targetIdx, ownerIdx: 0, ttlS: 4.0 });
          }
        }
        else if (w === "storm") {
          racers.forEach((rr, ii) => { if (ii !== 0 && rr.progress > r.progress) applySlow(rr.fx, 0.55, 1.6); });
        }
        else if (w === "recovery") { applyBoostMul(r.fx, 1.50, 3.0); }
        r.weapon = null;
      }
      // Hazard ticking + interactions.
      for (let i = spikes.length - 1; i >= 0; i--) {
        const s = spikes[i];
        s.ttlS -= dt;
        if (s.ttlS <= 0) { spikes.splice(i, 1); continue; }
        racers.forEach((r, idx) => {
          if (idx === s.ownerIdx) return;
          const dx = r.car.x - s.x, dy = r.car.y - s.y;
          if (dx * dx + dy * dy < 28 * 28 && r.fx.spinRad === 0) {
            applySpin(r.fx, 1.3, idx % 2 === 0 ? 1 : -1);
            spikes.splice(i, 1);
          }
        });
      }
      for (let i = smokeZones.length - 1; i >= 0; i--) {
        const z = smokeZones[i];
        z.ttlS -= dt;
        if (z.ttlS <= 0) { smokeZones.splice(i, 1); continue; }
        emitSmoke(z.x + (Math.random() - 0.5) * z.radius, z.y + (Math.random() - 0.5) * z.radius, 0, 0, "120,120,120", 0.5);
        racers.forEach((r, idx) => {
          if (idx === z.ownerIdx) return;
          const dx = r.car.x - z.x, dy = r.car.y - z.y;
          if (dx * dx + dy * dy < z.radius * z.radius) applySlow(r.fx, 0.85, 0.4);
        });
      }
      for (let i = darts.length - 1; i >= 0; i--) {
        const d = darts[i];
        d.ttlS -= dt;
        if (d.ttlS <= 0) { darts.splice(i, 1); continue; }
        const tgt = racers[d.targetIdx];
        if (tgt) {
          const tx = tgt.car.x - d.x, ty = tgt.car.y - d.y;
          const td = Math.hypot(tx, ty) || 1;
          const turnRate = 4.0 * dt;
          const desiredAng = Math.atan2(tx, -ty);
          const curAng = Math.atan2(d.vx, -d.vy);
          let diff = desiredAng - curAng;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          const newAng = curAng + Math.max(-turnRate, Math.min(turnRate, diff));
          const sp2 = 420;
          d.vx = Math.sin(newAng) * sp2;
          d.vy = -Math.cos(newAng) * sp2;
          if (td < 26) {
            applySlow(tgt.fx, 0.5, 1.4);
            darts.splice(i, 1);
            continue;
          }
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }

      // ---- Engine pitch ----
      setEnginePitch(Math.min(1, speedMag / 520));

      // ---- Jump ramps (player only -- CPUs implicit) ----
      stepJump(jump, { ramps, carX: playerCar.x, carY: playerCar.y, carHeadingRad: playerCar.heading, carSpeed: speedMag, dt });

      // ---- Lap detection per racer ----
      racers.forEach(r => {
        const cross = segmentsIntersect(
          r.lastX, r.lastY, r.car.x, r.car.y,
          track.finishLine.x1, track.finishLine.y1, track.finishLine.x2, track.finishLine.y2,
        );
        r.lastX = r.car.x; r.lastY = r.car.y;
        if (cross && now > r.lapStartMs + 800 && racing) {
          const lapTime = now - r.lapStartMs;
          r.splits.push(lapTime);
          r.bestLapMs = Math.min(r.bestLapMs, lapTime);
          r.lapStartMs = now;
          r.lap += 1;
          if (r.lap > laps && !r.finished) {
            r.finished = true;
            r.finishMs = now - raceStartMs;
          }
        }
      });

      // ---- Progress (laps * cl_len + idx) for position sort ----
      racers.forEach(r => {
        const idx = findNearestIdx(track.centreline, r.car.x, r.car.y);
        r.progress = (r.lap - 1) * track.centreline.length + idx;
      });
      const playerPlace = positionRank(racers, 0);

      // ---- Particles ----
      const fx2 = Math.sin(playerCar.heading), fy2 = -Math.cos(playerCar.heading);
      if (input.drift && Math.abs(input.steer) > 0.25 && speedMag > 100) {
        const rx = Math.cos(playerCar.heading);
        const ry = Math.sin(playerCar.heading);
        for (const side of [-1, 1]) {
          emitSmoke(playerCar.x + rx * 12 * side - fx2 * 18, playerCar.y + ry * 12 * side - fy2 * 18, -playerCar.vx, -playerCar.vy);
        }
      }
      if (slip.drafting) emitSmoke(playerCar.x - fx2 * 22, playerCar.y - fy2 * 22, 0, 0, "96,165,250", 0.55);
      if (playerBoost > 0 || racers[0].fx.boostMul > 1.0) {
        emitSmoke(playerCar.x - fx2 * 22, playerCar.y - fy2 * 22, -playerCar.vx * 0.5, -playerCar.vy * 0.5, "255,255,255", 0.55);
      }
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        p.life += dt;
        if (p.life >= p.max) { smoke.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }

      // ---- Camera ----
      const lookAheadX = Math.min(180, Math.max(-180, playerCar.vx * 0.35));
      const lookAheadY = Math.min(180, Math.max(-180, playerCar.vy * 0.35));
      camera.x += ((playerCar.x + lookAheadX) - camera.x) * 0.15;
      camera.y += ((playerCar.y + lookAheadY) - camera.y) * 0.15;

      // ---- Ghost record / replay (TT mode) ----
      if (mode === "tt" && racing && !racers[0].finished) {
        // Record only during current lap; we sample 30Hz.
        if (ghostRecord.length === 0 || (now - (raceStartMs + (ghostRecord[ghostRecord.length - 1]?.ts ?? 0))) > 33) {
          ghostRecord.push({ ts: now - raceStartMs, x: playerCar.x, y: playerCar.y, heading: playerCar.heading });
        }
      }

      // ---- DRAW ----
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      const tx = cw / 2 - camera.x;
      const ty = ch / 2 - camera.y;
      ctx.save();
      ctx.translate(tx, ty);

      // Baked track.
      if (baked) {
        const pad = 64;
        const sx = Math.max(0, Math.floor(camera.x - cw / 2 - pad));
        const sy = Math.max(0, Math.floor(camera.y - ch / 2 - pad));
        const sw = Math.min(baked.width - sx, Math.ceil(cw + pad * 2));
        const sh = Math.min(baked.height - sy, Math.ceil(ch + pad * 2));
        ctx.drawImage(baked, sx, sy, sw, sh, sx, sy, sw, sh);
      } else {
        ctx.fillStyle = "#2f5e2a";
        ctx.fillRect(0, 0, track.world.w, track.world.h);
      }

      // Smoke under cars.
      for (let i = 0; i < smoke.length; i++) {
        const p = smoke[i];
        const a = (1 - p.life / p.max) * p.baseA;
        ctx.fillStyle = `rgba(${p.rgb},${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.life * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }

      // Item boxes.
      if (weaponsOn) {
        for (const b of itemBoxes) {
          if (!b.active) continue;
          const pulse = 0.5 + 0.5 * Math.sin(b.pulse * 3);
          ctx.fillStyle = `rgba(252, 211, 77, ${0.6 + pulse * 0.4})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0a0510";
          ctx.font = "bold 16px system-ui";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("?", b.x, b.y);
        }
        // Spikes
        ctx.fillStyle = "#ef4444";
        for (const s of spikes) {
          ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
        }
        // Smoke zones already emit smoke particles
        // Homing darts
        ctx.fillStyle = "#a855f7";
        for (const d of darts) {
          ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Ghost (TT replay)
      if (mode === "tt" && ghostBest.length > 0) {
        const tNow = now - raceStartMs;
        let gi = 0;
        while (gi < ghostBest.length - 1 && ghostBest[gi + 1].ts < tNow) gi++;
        const g = ghostBest[gi];
        ctx.save();
        ctx.globalAlpha = 0.45;
        drawCarSprite(ctx, g.x, g.y, g.heading, racers[0].sprite, racers[0].def.renderScale);
        ctx.restore();
      }

      // Draw cars (sorted by progress so leader is on top -- looks better).
      const drawOrder = racers.map((r, idx) => ({ r, idx })).sort((a, b) => a.r.progress - b.r.progress);
      for (const { r, idx } of drawOrder) {
        if (idx === 0) {
          drawCarSprite(ctx, playerCar.x, playerCar.y, playerCar.heading, r.sprite, r.def.renderScale * airScale(jump), { shielded: r.fx.shielded, airborne: isAirborne(jump), shadow: shadowOffset(jump) });
        } else {
          drawCarSprite(ctx, r.car.x, r.car.y, r.car.heading, r.sprite, r.def.renderScale, { shielded: r.fx.shielded });
        }
      }

      ctx.restore();

      // ---- HUD overlays ----
      if (!racing) {
        const secondsLeft = Math.max(0, (raceStartMs - now) / 1000);
        const big = secondsLeft > 2 ? "3" : secondsLeft > 1 ? "2" : secondsLeft > 0 ? "1" : "GO!";
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, ch / 2 - 80, cw, 160);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 96px system-ui,-apple-system,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(big, cw / 2, ch / 2);
        ctx.restore();
      } else if (sinceStart < 4200) {
        ctx.save();
        ctx.fillStyle = "rgba(34,197,94,0.85)";
        ctx.font = "bold 64px system-ui,-apple-system,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("GO!", cw / 2, ch / 2);
        ctx.restore();
      }
      if (playerBoost > 0 || racers[0].fx.boostMul > 1.0) {
        const grad = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.2, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(255,255,255,0.35)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
      }

      // Minimap top-right.
      drawMinimap(ctx, track, racers, cw, ch);

      // HUD sync ~10Hz.
      if (now - lastHudSyncMs >= 100 || racers[0].finished) {
        lastHudSyncMs = now;
        setHud({
          lap: Math.min(laps, racers[0].lap), totalLaps: laps,
          kph: speedKph(playerCar), countdown: racing ? "" : (sinceStart > 2000 ? "1" : sinceStart > 1000 ? "2" : "3"),
          position: playerPlace, totalRacers: racers.length,
          weapon: racers[0].weapon,
          finished: racers[0].finished, finishedMs: racers[0].finishMs,
          mutedFlag: isMuted(),
        });
      }

      // ---- Finish handling ----
      // Wait for player + all CPUs to either finish OR for player to be done +3s (timeout). For TT/2P solo modes player-only.
      const allFinished = racers.every(r => r.finished);
      const playerDoneTimeout = racers[0].finished && (now - (raceStartMs + racers[0].finishMs) > 4000);
      if ((allFinished || playerDoneTimeout) && !finishLatch) {
        finishLatch = true;
        playVo("congratulations");
        stopEngine();
        // Force unfinished racers to "finish" with current progress (so positions still rank).
        const finalOrder = racers.slice().sort((a, b) => {
          if (a.finished && b.finished) return a.finishMs - b.finishMs;
          if (a.finished) return -1;
          if (b.finished) return 1;
          return b.progress - a.progress;
        }).map(r => ({
          name: r.driverName, def: r.def,
          finishMs: r.finished ? r.finishMs : (now - raceStartMs + 99999),
          bestLapMs: isFinite(r.bestLapMs) ? r.bestLapMs : 0,
          isPlayer: r === racers[0],
          playerSlot: r === racers[0] ? playerSlot : undefined,
        }));
        const playerResultIdx = finalOrder.findIndex(o => o.isPlayer);
        const playerPlaceFinal = playerResultIdx + 1;
        // Coin reward by finish place.
        let coinsEarned = 25;
        if (playerPlaceFinal === 1) coinsEarned = 200;
        else if (playerPlaceFinal === 2) coinsEarned = 100;
        else if (playerPlaceFinal === 3) coinsEarned = 50;
        const playerBest = finalOrder[playerResultIdx].bestLapMs || (racers[0].finishMs);
        const prevBest = getBestRace(trackId);
        const prevBestLap = getBestLap(trackId);
        if (prevBest == null || (racers[0].finished && racers[0].finishMs < prevBest)) coinsEarned += 40;
        if (prevBestLap == null || playerBest < prevBestLap) coinsEarned += 20;
        const rec = recordRace({ trackId, raceTimeMs: racers[0].finished ? racers[0].finishMs : (now - raceStartMs), bestLapMs: playerBest, coinsEarned, finishPlace: playerPlaceFinal });
        // TT ghost write.
        if (mode === "tt" && rec.newBestLap && ghostRecord.length > 0) {
          try { localStorage.setItem(ghostKey, JSON.stringify(ghostRecord.slice(0, 1500))); } catch { /* ignore */ }
        }
        setResults({
          ordered: finalOrder.map(o => ({ ...o })),
          trackId, reverse,
          coinsEarned, newBestRace: rec.newBestRace, newBestLap: rec.newBestLap,
          mirrorUnlocked: rec.mirrorUnlocked, mode,
        });
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    return () => {
      running = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      stopEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setTouchSteer(v: number) {
    const c = canvasRef.current as unknown as { _touch?: { steer: number; gas: boolean; brake: boolean; drift: boolean; fire: boolean } } | null;
    if (c?._touch) c._touch.steer = Math.max(-1, Math.min(1, v));
  }
  function setTouchBtn(k: "gas" | "brake" | "drift" | "fire", v: boolean) {
    const c = canvasRef.current as unknown as { _touch?: { steer: number; gas: boolean; brake: boolean; drift: boolean; fire: boolean } } | null;
    if (c?._touch) c._touch[k] = v;
  }

  // Build a "next race" handler for cup mode.
  function nextCupRace() {
    if (mode !== "cup" || !results) return;
    const playerPlace = results.ordered.findIndex(o => o.isPlayer) + 1;
    const pts = pointsForPlace(playerPlace);
    const updatedPts = [...cupPoints, pts];
    const nextRound = cupRound + 1;
    if (nextRound >= cupTracks.length) {
      // Final results screen will offer a "GO TO LEADERBOARD" button.
      const totalPts = updatedPts.reduce((s, p) => s + p, 0);
      nav(`/racing/leaderboard?cupTotal=${totalPts}&cupName=${encodeURIComponent("Player")}`);
      return;
    }
    const nextTrack = cupTracks[nextRound];
    nav(`/racing/race?car=${encodeURIComponent(playerCarId)}&track=${encodeURIComponent(nextTrack)}&laps=${laps}&cpu=${cpuCount}&diff=${difficulty}&weapons=${weaponsOn ? 1 : 0}&mode=cup&cupRound=${nextRound}&cupTracks=${encodeURIComponent(cupTracks.join(","))}&cupPts=${encodeURIComponent(updatedPts.join(","))}`);
  }

  // For 2P hot-seat, hand off to second player.
  function nextHotSeat() {
    if (mode !== "2p" || playerSlot !== 1 || !results) return;
    nav(`/racing/race?car=${encodeURIComponent(playerCarId)}&track=${encodeURIComponent(results.trackId)}&laps=${laps}&cpu=${cpuCount}&diff=${difficulty}&weapons=${weaponsOn ? 1 : 0}&mode=2p&slot=2&p1Best=${results.ordered[results.ordered.findIndex(o => o.isPlayer)].bestLapMs}`);
  }
  const p1Best = parseInt(sp.get("p1Best") ?? "0", 10) || 0;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000", touchAction: "none", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />

      {/* Top HUD */}
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", flexDirection: "column", gap: 6, color: "white", textShadow: "1px 1px 0 #000" }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>
          LAP <span style={{ color: "#fbbf24" }}>{hud.lap}</span>/{hud.totalLaps}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{hud.kph} km/h Â· pos <span style={{ color: "#fbbf24", fontWeight: 800 }}>{hud.position}/{hud.totalRacers}</span></div>
        {mode === "2p" && playerSlot === 2 && p1Best > 0 && (
          <div style={{ fontSize: 11, opacity: 0.85 }}>P1 best lap: <strong>{formatMs(p1Best)}</strong></div>
        )}
        {mode === "cup" && cupTracks.length > 0 && (
          <div style={{ fontSize: 11, opacity: 0.85 }}>Cup race {cupRound + 1}/{cupTracks.length}</div>
        )}
      </div>

      <div style={{ position: "absolute", top: 10, right: 12, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {hud.weapon && (
          <div style={{ background: WEAPONS[hud.weapon].accent, color: "#0a0510", padding: "6px 10px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>
            {WEAPONS[hud.weapon].name.toUpperCase()} READY
          </div>
        )}
        <button onClick={() => { const v = !isMuted(); setMuted(v); setHud(h => ({ ...h, mutedFlag: v })); }} style={{
          padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
          background: hud.mutedFlag ? "#ef4444" : "rgba(255,255,255,0.18)", color: "white", border: "none", cursor: "pointer",
        }}>{hud.mutedFlag ? "ðŸ”‡ MUTED" : "ðŸ”Š"}</button>
        <button onClick={() => nav("/racing")} style={{
          padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: "rgba(255,255,255,0.15)", color: "white", border: "none", cursor: "pointer",
        }}>â† Exit</button>
      </div>

      {/* Touch HUD */}
      <SteerPad onSteer={setTouchSteer} />
      <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <ActionBtn label="ITEM" color="#a855f7" size={60} onDown={() => setTouchBtn("fire", true)} onUp={() => setTouchBtn("fire", false)} />
        <ActionBtn label="DRIFT" color="#facc15" size={64} onDown={() => setTouchBtn("drift", true)} onUp={() => setTouchBtn("drift", false)} />
        <ActionBtn label="BRAKE" color="#ef4444" size={72} onDown={() => setTouchBtn("brake", true)} onUp={() => setTouchBtn("brake", false)} />
        <ActionBtn label="GAS" color="#22c55e" size={88} onDown={() => { unlockAudio(); setTouchBtn("gas", true); }} onUp={() => setTouchBtn("gas", false)} />
      </div>

      {/* Results overlay */}
      {results && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, color: "white", overflow: "auto" }}>
          <h2 style={{ fontSize: 28, letterSpacing: 4, margin: "0 0 10px", color: "#fbbf24", textShadow: "2px 2px 0 #000" }}>RESULTS</h2>
          <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {results.ordered.map((o, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 10,
                background: o.isPlayer ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${o.isPlayer ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
              }}>
                <div style={{ minWidth: 28, fontWeight: 900, fontSize: 18, color: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#fb923c" : "white" }}>{i + 1}</div>
                <img src={o.def.sprite} alt="" style={{ width: 20, height: 36, imageRendering: "pixelated" }} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{o.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>Â· {o.def.name}</span></div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {o.finishMs < 99999 ? formatMs(o.finishMs) : "DNF"}
                  {o.bestLapMs > 0 && <span style={{ opacity: 0.6, marginLeft: 6 }}>best {formatMs(o.bestLapMs)}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>You earned <strong style={{ color: "#fbbf24" }}>{results.coinsEarned}</strong> coins.</div>
          {results.newBestRace && <div style={{ color: "#22c55e", fontSize: 12 }}>âœ“ NEW BEST RACE</div>}
          {results.newBestLap && <div style={{ color: "#22c55e", fontSize: 12 }}>âœ“ NEW BEST LAP</div>}
          {results.mirrorUnlocked && <div style={{ color: "#a855f7", fontSize: 12 }}>â˜… MIRROR TRACK UNLOCKED</div>}
          {mode === "2p" && playerSlot === 2 && (() => {
            const myBest = results.ordered.find(o => o.isPlayer)?.bestLapMs ?? 0;
            const winner = (p1Best > 0 && myBest > 0) ? (myBest < p1Best ? "Player 2 wins!" : "Player 1 wins!") : "Player 2 finished.";
            return <div style={{ marginTop: 8, color: "#22d3ee", fontWeight: 800 }}>{winner} P1 {formatMs(p1Best)} Â· P2 {formatMs(myBest)}</div>;
          })()}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 }}>
            {mode === "cup" && cupTracks.length > 0 && cupRound + 1 < cupTracks.length && (
              <button onClick={nextCupRace} style={resultsBtn("#fbbf24")}>NEXT CUP RACE ({cupRound + 2}/{cupTracks.length}) â†’</button>
            )}
            {mode === "2p" && playerSlot === 1 && (
              <button onClick={nextHotSeat} style={resultsBtn("#22d3ee")}>HAND DEVICE TO PLAYER 2 â†’</button>
            )}
            <button onClick={() => { setResults(null); window.location.reload(); }} style={resultsBtn("#a78bfa")}>REMATCH</button>
            <button onClick={() => nav("/racing/garage")} style={resultsBtn("rgba(255,255,255,0.15)")}>â† GARAGE</button>
            <button onClick={() => nav("/racing")} style={resultsBtn("rgba(255,255,255,0.10)")}>â† HUB</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function positionRank(racers: RacerRuntime[], idx: number): number {
  const me = racers[idx];
  let rank = 1;
  for (let i = 0; i < racers.length; i++) {
    if (i === idx) continue;
    if (racers[i].progress > me.progress) rank++;
  }
  return rank;
}

function pointsForPlace(place: number): number {
  return [10, 8, 6, 4, 3, 2, 1, 0][Math.max(0, Math.min(7, place - 1))];
}

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

function drawMinimap(
  ctx: CanvasRenderingContext2D, track: TrackDef,
  racers: RacerRuntime[], cw: number, _ch: number,
) {
  const mmW = 100;
  const mmH = 70;
  const padR = 12, padT = 70;
  const x0 = cw - mmW - padR;
  const y0 = padT;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x0, y0, mmW, mmH);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, mmW - 1, mmH - 1);
  // Centreline.
  ctx.strokeStyle = "rgba(251,191,36,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const cl = track.centreline;
  const sx = mmW / track.world.w;
  const sy = mmH / track.world.h;
  for (let i = 0; i < cl.length; i++) {
    const p = cl[i];
    if (i === 0) ctx.moveTo(x0 + p.x * sx, y0 + p.y * sy);
    else ctx.lineTo(x0 + p.x * sx, y0 + p.y * sy);
  }
  ctx.closePath();
  ctx.stroke();
  // Racer dots.
  racers.forEach((r, i) => {
    ctx.fillStyle = i === 0 ? "#22c55e" : r.def.accent;
    ctx.beginPath();
    ctx.arc(x0 + r.car.x * sx, y0 + r.car.y * sy, i === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawCarSprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, heading: number,
  sprite: HTMLImageElement, scale: number,
  fx?: { shielded?: boolean; airborne?: boolean; shadow?: { x: number; y: number; opacity: number } },
) {
  if (!sprite.complete || sprite.naturalWidth === 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-12, -20, 24, 40);
    ctx.restore();
    return;
  }
  if (fx?.shadow && fx.shadow.opacity > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${fx.shadow.opacity.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x + fx.shadow.x, y + fx.shadow.y, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  if (fx?.shielded) {
    ctx.strokeStyle = "rgba(96,165,250,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(w, h) * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function resultsBtn(bg: string): React.CSSProperties {
  return {
    padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 900,
    background: bg, color: bg.includes("rgba") ? "white" : "#0a0510",
    border: "none", cursor: "pointer", letterSpacing: 1, textAlign: "center",
  };
}

function ActionBtn({ label, color, size, onDown, onUp }: {
  label: string; color: string; size: number;
  onDown: () => void; onUp: () => void;
}) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
      onTouchCancel={(e) => { e.preventDefault(); onUp(); }}
      onMouseDown={(e) => { e.preventDefault(); onDown(); }}
      onMouseUp={(e) => { e.preventDefault(); onUp(); }}
      onMouseLeave={() => onUp()}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: color, color: "#0a0510", border: "none",
        fontWeight: 900, fontSize: size > 70 ? 14 : 12, letterSpacing: 1,
        cursor: "pointer", userSelect: "none", touchAction: "none",
      }}>{label}</button>
  );
}

function SteerPad({ onSteer }: { onSteer: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const center = useRef<{ x: number; y: number } | null>(null);
  const padSize = 130;

  function onStart(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const _cy = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = cx - center.current.x;
    onSteer(Math.max(-1, Math.min(1, dx / (padSize / 2))));
    void _cy;
  }
  function onMove(e: React.TouchEvent | React.MouseEvent) {
    if (!center.current) return;
    e.preventDefault();
    const cx = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const dx = cx - center.current.x;
    onSteer(Math.max(-1, Math.min(1, dx / (padSize / 2))));
  }
  function onEnd(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    center.current = null;
    onSteer(0);
  }

  return (
    <div
      ref={ref}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}
      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      style={{
        position: "absolute", left: 14, bottom: 14,
        width: padSize, height: padSize, borderRadius: padSize / 2,
        background: "rgba(255,255,255,0.08)",
        border: "2px solid rgba(255,255,255,0.18)",
        touchAction: "none", userSelect: "none",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 800, letterSpacing: 1 }}>
        STEER
      </div>
    </div>
  );
}
