// Turbo Racers -- match screen. Top-down canvas with touch HUD.
//
// Coordinate system: world is ~3000x2000 (see track.ts). The canvas viewport
// is centred on the player car (with a small lookahead in the velocity
// direction). Camera does NOT rotate -- Mario Kart-style world-up top-down.
//
// Touch HUD:
//   - Bottom-left: steering pad. Drag left/right, returns to centre on release.
//   - Bottom-right vertical stack (bottom-up): GAS (green), BRAKE (red), DRIFT (yellow).
//
// Keyboard fallback: arrows or WASD + Space (drift). Useful for desktop dev.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stepCar, makeCar, speedKph, type CarState, type CarInput } from "../engine/physics";
import { makeOvalTrack, bakeTrack, surfaceAt } from "../engine/track";
import { makeDrift, stepDrift, driftTier, DRIFT } from "../engine/drift";
import { makeSlip, stepSlip, SLIP } from "../engine/slipstream";
import { makeLap, stepLap, formatMs } from "../engine/lap";
import { makeCpu, cpuDrive } from "../engine/cpu";
import { CARS, carById } from "../engine/cars";
import { effectiveStats, statToMaxSpeed, statToAccel, statToGripMul, statToSteerMul } from "../engine/stats";
import { getUpgrades, recordRace, getBestRace, getBestLap } from "../store";
import type { CarTuning } from "../engine/physics";
import { unlockAudio, playVo, playBoost, playCrash, startEngine, stopEngine, setEnginePitch } from "../engine/audio";

interface SmokeParticle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; colour: string;
}

export default function RacingMatch() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const playerCarDef = carById(sp.get("car") ?? CARS[0].id);
  // CPU always uses the next-distinct car for visual contrast.
  const cpuCarDef = CARS.find(c => c.id !== playerCarDef.id) ?? CARS[1];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // We mirror these into React state ONLY for HUD redraw (lap number, time,
  // countdown). The hot loop reads/writes ref'd objects to avoid re-renders.
  const [hud, setHud] = useState({
    lap: 1, totalLaps: 3, kph: 0, countdown: "3",
    boostActive: false, slipActive: false, finishedMs: 0, finished: false,
    driftTier: "none" as "none" | "blue" | "orange",
  });

  useEffect(() => {
    const canvasMaybe = canvasRef.current;
    if (!canvasMaybe) return;
    const ctxMaybe = canvasMaybe.getContext("2d");
    if (!ctxMaybe) return;
    const canvas: HTMLCanvasElement = canvasMaybe;
    const ctx: CanvasRenderingContext2D = ctxMaybe;

    // ---- Per-car tuning (effective stats from store) ----
    const playerLevels = getUpgrades(playerCarDef.id);
    const playerStats = effectiveStats(playerCarDef.stats, playerLevels);
    const playerTuning: CarTuning = {
      accel: statToAccel(playerStats.accel),
      maxSpeed: statToMaxSpeed(playerStats.topSpeed),
      gripMul: statToGripMul(playerStats.grip),
      steerMul: statToSteerMul(playerStats.handling),
    };

    // ---- World setup ----
    const track = makeOvalTrack(3);
    const player = makeCar(track.startPos.x, track.startPos.y, track.startPos.headingRad);
    const cpu = makeCar(track.startPos.x - 60, track.startPos.y - 30, track.startPos.headingRad);
    const drift = makeDrift();
    const slip = makeSlip();
    const cpuState = makeCpu(track);
    const lap = makeLap(track, player.x, player.y, performance.now() + 3500); // graceful start after countdown

    // Sprite cache.
    const sprites = new Map<string, HTMLImageElement>();
    function img(path: string): HTMLImageElement {
      let i = sprites.get(path);
      if (!i) { i = new Image(); i.src = path; sprites.set(path, i); }
      return i;
    }
    const playerSprite = img(playerCarDef.sprite);
    const cpuSprite = img(cpuCarDef.sprite);
    // Try to bake the track once a grass tile is available. If the tile
    // hasn't loaded yet we still bake (it'll fall back to solid colour) so
    // the player isn't staring at a blank canvas.
    const grassTile = img("/assets/racing/tracks/land_grass01.png");
    let baked: HTMLCanvasElement | null = null;
    function ensureBake() {
      if (baked) return;
      baked = bakeTrack(track, { grassTile: grassTile.complete && grassTile.naturalWidth > 0 ? grassTile : null });
    }
    grassTile.addEventListener("load", () => { baked = null; ensureBake(); });
    ensureBake();

    // ---- Input state ----
    const input: CarInput = { steer: 0, throttle: 0, brake: 0, drift: false };
    const keys = { left: false, right: false, up: false, down: false, drift: false };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keys.left = true;
      if (k === "arrowright" || k === "d") keys.right = true;
      if (k === "arrowup" || k === "w") keys.up = true;
      if (k === "arrowdown" || k === "s") keys.down = true;
      if (k === " ") { keys.drift = true; e.preventDefault(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keys.left = false;
      if (k === "arrowright" || k === "d") keys.right = false;
      if (k === "arrowup" || k === "w") keys.up = false;
      if (k === "arrowdown" || k === "s") keys.down = false;
      if (k === " ") keys.drift = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ---- Touch HUD state (mutable; HUD divs read via refs) ----
    // Touch state is read from window-attached refs hung off the canvas wrapper.
    // We expose simple setters the HUD components call.
    const touch = { steer: 0, gas: false, brake: false, drift: false };
    (canvas as unknown as { _touch: typeof touch })._touch = touch;

    // ---- Particles ----
    const smoke: SmokeParticle[] = [];
    function emitSmoke(x: number, y: number, vx: number, vy: number, colour = "rgba(240,240,240,0.65)") {
      smoke.push({ x, y, vx: vx * 0.15 + (Math.random() - 0.5) * 20, vy: vy * 0.15 + (Math.random() - 0.5) * 20, life: 0, max: 0.6 + Math.random() * 0.4, r: 6 + Math.random() * 4, colour });
    }

    // ---- DPR-safe canvas sizing ----
    function resize() {
      const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // ---- Race start state ----
    const t0 = performance.now();
    let countdownPlayed = { c3: false, c2: false, c1: false, go: false };
    let raceStartMs = t0 + 3500;
    let lastBoostActive = false;
    let finishLatch = false;
    let crashedCooldown = 0;
    // Re-align the lap timer once the GO fires.
    lap.raceStartMs = raceStartMs;
    lap.startGraceUntilMs = raceStartMs + 600;

    // ---- Camera ----
    const camera = { x: player.x, y: player.y };

    // ---- Main loop ----
    let lastT = performance.now();
    let running = true;
    function loop(nowRaw: number) {
      if (!running) return;
      const now = nowRaw;
      const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
      lastT = now;

      // ---- Countdown audio cues ----
      const sinceStart = now - t0;
      if (!countdownPlayed.c3 && sinceStart > 100) { playVo("3"); countdownPlayed.c3 = true; }
      if (!countdownPlayed.c2 && sinceStart > 1000) { playVo("2"); countdownPlayed.c2 = true; }
      if (!countdownPlayed.c1 && sinceStart > 2000) { playVo("1"); countdownPlayed.c1 = true; }
      if (!countdownPlayed.go && sinceStart > 3000) { playVo("go"); countdownPlayed.go = true; startEngine(); }
      const racing = now >= raceStartMs;

      // ---- Resolve input from keyboard + touch HUD ----
      const keyboardSteer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      const touchSteer = touch.steer;
      const steer = Math.max(-1, Math.min(1, keyboardSteer + touchSteer));
      const throttleHeld = keys.up || touch.gas;
      const brakeHeld = keys.down || touch.brake;
      const driftHeld = keys.drift || touch.drift;

      input.steer = racing ? steer : 0;
      input.throttle = racing && !lap.finished ? (throttleHeld ? 1 : 0) : 0;
      input.brake = racing ? (brakeHeld ? 1 : 0) : 0;
      input.drift = racing ? driftHeld : false;

      // ---- Slipstream (uses raw cars; updates state.boostPxs) ----
      stepSlip(slip, { self: player, others: [cpu], steer: input.steer, dt });
      // ---- Drift charge / release ----
      const speedMag = Math.hypot(player.vx, player.vy);
      stepDrift(drift, { drift: input.drift, steer: input.steer, speed: speedMag, dt });

      // ---- Boost combination (drift + slipstream stack additively) ----
      const boostPxs = drift.boostPxs + slip.boostPxs;
      if (boostPxs > 0 && !lastBoostActive) playBoost();
      lastBoostActive = boostPxs > 0;

      // ---- Step physics for player ----
      const surf = surfaceAt(track, player.x, player.y);
      stepCar(player, input, { surface: surf, boostPxs, tuning: playerTuning }, dt);

      // ---- Step CPU ----
      if (racing && !lap.finished) {
        const cpuInput = cpuDrive(cpuState, cpu, track);
        const cpuSurf = surfaceAt(track, cpu.x, cpu.y);
        stepCar(cpu, cpuInput, { surface: cpuSurf, boostPxs: 0 }, dt);
      }

      // ---- World-edge containment (simple bounce) ----
      const margin = 30;
      if (player.x < margin) { player.x = margin; player.vx = Math.abs(player.vx) * 0.3; }
      if (player.x > track.world.w - margin) { player.x = track.world.w - margin; player.vx = -Math.abs(player.vx) * 0.3; }
      if (player.y < margin) { player.y = margin; player.vy = Math.abs(player.vy) * 0.3; }
      if (player.y > track.world.h - margin) { player.y = track.world.h - margin; player.vy = -Math.abs(player.vy) * 0.3; }

      // ---- Car-car collision (cheap circle) ----
      crashedCooldown = Math.max(0, crashedCooldown - dt);
      const dxCC = player.x - cpu.x;
      const dyCC = player.y - cpu.y;
      const dCC = Math.hypot(dxCC, dyCC);
      if (dCC < 38) {
        const nx = dxCC / Math.max(0.01, dCC);
        const ny = dyCC / Math.max(0.01, dCC);
        const overlap = 38 - dCC;
        player.x += nx * overlap * 0.6;
        player.y += ny * overlap * 0.6;
        cpu.x -= nx * overlap * 0.4;
        cpu.y -= ny * overlap * 0.4;
        // Tangential energy loss.
        player.vx *= 0.85; player.vy *= 0.85;
        cpu.vx *= 0.92; cpu.vy *= 0.92;
        if (crashedCooldown <= 0) { playCrash(); crashedCooldown = 0.45; }
      }

      // ---- Engine pitch ----
      setEnginePitch(Math.min(1, speedMag / 520));

      // ---- Lap detection ----
      const fx = Math.sin(player.heading);
      const fy = -Math.cos(player.heading);
      stepLap(lap, { track, x: player.x, y: player.y, fx, fy, nowMs: now });

      // ---- Particles ----
      // Drift smoke: emit when drifting AND turning AND moving.
      if (input.drift && Math.abs(input.steer) > 0.25 && speedMag > 100) {
        const rx = Math.cos(player.heading);
        const ry = Math.sin(player.heading);
        for (const side of [-1, 1]) {
          emitSmoke(player.x + rx * 12 * side - fx * 18, player.y + ry * 12 * side - fy * 18, -player.vx, -player.vy);
        }
      }
      // Slipstream particles: blue trail when drafting.
      if (slip.drafting) {
        emitSmoke(player.x - fx * 22 + (Math.random() - 0.5) * 10, player.y - fy * 22 + (Math.random() - 0.5) * 10, 0, 0, "rgba(96,165,250,0.55)");
      }
      // Boost speed lines (white streaks behind the car).
      if (boostPxs > 0) {
        emitSmoke(player.x - fx * 22, player.y - fy * 22, -player.vx * 0.6, -player.vy * 0.6, "rgba(255,255,255,0.55)");
      }

      // Step + cull particles.
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        p.life += dt;
        if (p.life >= p.max) { smoke.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // ---- Camera (smooth lerp) ----
      const lookAheadX = Math.min(180, Math.max(-180, player.vx * 0.35));
      const lookAheadY = Math.min(180, Math.max(-180, player.vy * 0.35));
      camera.x += ((player.x + lookAheadX) - camera.x) * 0.15;
      camera.y += ((player.y + lookAheadY) - camera.y) * 0.15;

      // ---- DRAW ----
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      // World transform: translate so camera is centred.
      const tx = cw / 2 - camera.x;
      const ty = ch / 2 - camera.y;
      ctx.save();
      ctx.translate(tx, ty);

      // Blit baked track.
      if (baked) {
        ctx.drawImage(baked, 0, 0);
      } else {
        ctx.fillStyle = "#2f5e2a";
        ctx.fillRect(0, 0, track.world.w, track.world.h);
      }

      // Smoke (under cars).
      for (const p of smoke) {
        const a = 1 - p.life / p.max;
        ctx.fillStyle = p.colour.replace(/0?\.\d+\)$/, `${(a * 0.6).toFixed(2)})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.life * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw cars.
      drawCar(ctx, cpu, cpuSprite, cpuCarDef.renderScale);
      drawCar(ctx, player, playerSprite, playerCarDef.renderScale, { driftTier: driftTier(drift), boosting: boostPxs > 0 });

      ctx.restore();

      // ---- HUD overlays (screen space) ----
      // Countdown text.
      if (!racing) {
        const secondsLeft = Math.max(0, (raceStartMs - now) / 1000);
        const big = secondsLeft > 2 ? "3" : secondsLeft > 1 ? "2" : secondsLeft > 0 ? "1" : "GO!";
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, ch / 2 - 80, cw, 160);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 96px system-ui,-apple-system,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(big, cw / 2, ch / 2);
        ctx.restore();
      } else if (sinceStart < 4200) {
        // Brief GO! flash for 700ms after start.
        ctx.save();
        ctx.fillStyle = "rgba(34,197,94,0.85)";
        ctx.font = "bold 64px system-ui,-apple-system,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GO!", cw / 2, ch / 2);
        ctx.restore();
      }

      // Boost vignette.
      if (boostPxs > 0) {
        const grad = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.2, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(255,255,255,0.35)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
      }

      // HUD sync (cheap throttle: every ~6 frames).
      if (Math.floor(now / 100) !== Math.floor(lastT / 100 - 1)) {
        setHud({
          lap: lap.lap, totalLaps: lap.totalLaps, kph: speedKph(player),
          countdown: racing ? "" : (sinceStart > 2000 ? "1" : sinceStart > 1000 ? "2" : "3"),
          boostActive: boostPxs > 0, slipActive: slip.drafting && slip.charge > 0.2,
          finishedMs: lap.finishMs, finished: lap.finished,
          driftTier: driftTier(drift),
        });
      }

      // ---- One-time race-finish handler ----
      if (lap.finished && !finishLatch) {
        finishLatch = true;
        playVo("congratulations");
        // Best lap = min of splits[1..n] - splits[i-1] (per-lap times).
        let bestLapMs = Infinity;
        let prev = 0;
        for (const s of lap.splits) {
          bestLapMs = Math.min(bestLapMs, s - prev);
          prev = s;
        }
        if (!isFinite(bestLapMs)) bestLapMs = lap.finishMs;
        // Coin reward: 60 base + bonuses.
        const prevBest = getBestRace("oval");
        const prevBestLap = getBestLap("oval");
        let coinsEarned = 60;
        if (prevBest == null || lap.finishMs < prevBest) coinsEarned += 40;
        if (prevBestLap == null || bestLapMs < prevBestLap) coinsEarned += 20;
        recordRace({ trackId: "oval", raceTimeMs: lap.finishMs, bestLapMs, coinsEarned });
        stopEngine();
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

  // ---- Touch HUD handlers ----
  function setTouchSteer(v: number) {
    const c = canvasRef.current as unknown as { _touch?: { steer: number; gas: boolean; brake: boolean; drift: boolean } } | null;
    if (c?._touch) c._touch.steer = Math.max(-1, Math.min(1, v));
  }
  function setTouchBtn(k: "gas" | "brake" | "drift", v: boolean) {
    const c = canvasRef.current as unknown as { _touch?: { steer: number; gas: boolean; brake: boolean; drift: boolean } } | null;
    if (c?._touch) c._touch[k] = v;
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />

      {/* Top HUD: lap + speed + back */}
      <div style={{
        position: "absolute", top: 8, left: 8, right: 8,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        color: "white", fontFamily: "system-ui,-apple-system,sans-serif",
        pointerEvents: "none",
      }}>
        <button onClick={() => { stopEngine(); nav("/racing"); }} style={{
          pointerEvents: "auto",
          padding: "6px 10px", borderRadius: 8, fontSize: 12,
          background: "rgba(0,0,0,0.5)", color: "white",
          border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer",
        }}>{"â† Exit"}</button>
        <div style={{
          background: "rgba(0,0,0,0.55)", padding: "6px 14px",
          borderRadius: 10, textAlign: "center", minWidth: 80,
          border: "1px solid rgba(255,255,255,0.18)",
        }}>
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 2 }}>LAP</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
            {hud.lap}<span style={{ opacity: 0.55, fontSize: 14 }}>/{hud.totalLaps}</span>
          </div>
        </div>
        <div style={{
          background: "rgba(0,0,0,0.55)", padding: "6px 14px",
          borderRadius: 10, textAlign: "right", minWidth: 80,
          border: "1px solid rgba(255,255,255,0.18)",
        }}>
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 2 }}>KM/H</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{hud.kph}</div>
        </div>
      </div>

      {/* Charge bars row below the top HUD */}
      <div style={{
        position: "absolute", top: 62, left: 0, right: 0,
        display: "flex", justifyContent: "center", pointerEvents: "none",
      }}>
        <div style={{
          display: "flex", gap: 10, fontSize: 10, color: "white",
          fontFamily: "system-ui,-apple-system,sans-serif",
        }}>
          <Badge label="DRIFT" tone={hud.driftTier === "orange" ? "#fb923c" : hud.driftTier === "blue" ? "#60a5fa" : "rgba(255,255,255,0.35)"} active={hud.driftTier !== "none"} />
          <Badge label="DRAFT" tone="#60a5fa" active={hud.slipActive} />
          <Badge label="BOOST" tone="#facc15" active={hud.boostActive} />
        </div>
      </div>

      {/* Finish overlay */}
      {hud.finished && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14,
          background: "rgba(0,0,0,0.7)", color: "white",
          fontFamily: "system-ui,-apple-system,sans-serif",
        }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#fbbf24", letterSpacing: 3 }}>
            FINISH
          </div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Race time</div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2 }}>{formatMs(hud.finishedMs)}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={() => { stopEngine(); nav("/racing"); }} style={{
              padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800,
              background: "rgba(255,255,255,0.12)", color: "white",
              border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer",
            }}>Hub</button>
            <button onClick={() => { stopEngine(); window.location.reload(); }} style={{
              padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800,
              background: "#fbbf24", color: "#1a0a25",
              border: "1px solid #fbbf24", cursor: "pointer",
            }}>Race again</button>
          </div>
        </div>
      )}

      {/* Touch HUD: steering pad bottom-left */}
      <SteerPad onSteer={setTouchSteer} />

      {/* Touch HUD: gas / brake / drift bottom-right */}
      <div style={{
        position: "absolute", right: 14, bottom: 14,
        display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
      }}>
        <ActionBtn label="DRIFT" color="#facc15" size={62}
          onDown={() => setTouchBtn("drift", true)} onUp={() => setTouchBtn("drift", false)} />
        <ActionBtn label="BRAKE" color="#ef4444" size={74}
          onDown={() => setTouchBtn("brake", true)} onUp={() => setTouchBtn("brake", false)} />
        <ActionBtn label="GAS"   color="#22c55e" size={92}
          onDown={() => setTouchBtn("gas", true)} onUp={() => setTouchBtn("gas", false)} />
      </div>
    </div>
  );
}

function Badge({ label, tone, active }: { label: string; tone: string; active: boolean }) {
  return (
    <div style={{
      padding: "4px 10px", borderRadius: 10,
      background: active ? tone : "rgba(0,0,0,0.4)",
      color: active ? "#1a0a25" : "rgba(255,255,255,0.55)",
      border: `1px solid ${active ? tone : "rgba(255,255,255,0.18)"}`,
      fontWeight: 800, letterSpacing: 1, fontSize: 10,
    }}>
      {label}
    </div>
  );
}

function ActionBtn({ label, color, size, onDown, onUp }: {
  label: string; color: string; size: number;
  onDown: () => void; onUp: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); onDown(); }}
      onPointerUp={(e) => { e.preventDefault(); try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } onUp(); }}
      onPointerCancel={(e) => { e.preventDefault(); onUp(); }}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: color, color: "#0a0510",
        border: "3px solid rgba(0,0,0,0.45)",
        boxShadow: "0 4px 0 rgba(0,0,0,0.45)",
        fontWeight: 900, fontSize: 13,
        touchAction: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function SteerPad({ onSteer }: { onSteer: (v: number) => void }) {
  // 140-px wide horizontal pad. The dragger position maps linearly to
  // [-1, +1]. Releasing returns to zero.
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState(0); // -1..1
  const dragging = useRef<{ pid: number | null }>({ pid: null });
  const PAD_W = 160;
  const PAD_H = 90;

  const update = (clientX: number) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const local = clientX - (r.left + r.width / 2);
    const v = Math.max(-1, Math.min(1, (local / (r.width / 2)) * 1.0));
    setKnob(v);
    onSteer(v);
  };
  return (
    <div ref={padRef} style={{
      position: "absolute", left: 14, bottom: 22,
      width: PAD_W, height: PAD_H,
      borderRadius: 18,
      background: "rgba(0,0,0,0.45)",
      border: "2px solid rgba(255,255,255,0.18)",
      touchAction: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current.pid = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current.pid !== e.pointerId) return;
        update(e.clientX);
      }}
      onPointerUp={(e) => {
        if (dragging.current.pid !== e.pointerId) return;
        dragging.current.pid = null;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        setKnob(0);
        onSteer(0);
      }}
      onPointerCancel={() => {
        dragging.current.pid = null;
        setKnob(0);
        onSteer(0);
      }}
    >
      {/* Centre line + side hints */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontWeight: 800, fontSize: 18 }}>
        <span>{"<"}</span>
        <span>{">"}</span>
      </div>
      <div style={{ position: "absolute", left: "50%", top: 6, bottom: 6, width: 1, background: "rgba(255,255,255,0.18)", pointerEvents: "none" }} />
      {/* Knob */}
      <div style={{
        position: "absolute",
        left: `calc(50% + ${knob * (PAD_W / 2 - 28)}px - 26px)`,
        width: 52, height: PAD_H - 18, borderRadius: 14,
        background: "#fbbf24",
        boxShadow: "0 3px 0 rgba(0,0,0,0.45)",
        transition: dragging.current.pid == null ? "left 0.15s ease-out" : "none",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ---- Car sprite render -----------------------------------------------------

function drawCar(
  ctx: CanvasRenderingContext2D,
  car: CarState,
  sprite: HTMLImageElement,
  scale: number,
  fx: { driftTier?: "none" | "blue" | "orange"; boosting?: boolean } = {},
) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);
  // Boost / drift glow.
  if (fx.boosting) {
    ctx.shadowColor = "rgba(250,204,21,0.95)";
    ctx.shadowBlur = 26;
  } else if (fx.driftTier === "orange") {
    ctx.shadowColor = "rgba(251,146,60,0.9)";
    ctx.shadowBlur = 18;
  } else if (fx.driftTier === "blue") {
    ctx.shadowColor = "rgba(96,165,250,0.9)";
    ctx.shadowBlur = 14;
  }
  if (sprite.complete && sprite.naturalWidth > 0) {
    const w = sprite.naturalWidth * scale;
    const h = sprite.naturalHeight * scale;
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  } else {
    // Placeholder rectangle until sprite loads.
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(-12, -22, 24, 44);
    ctx.fillStyle = "#1f1f1f";
    ctx.fillRect(-12, -22, 24, 6);
  }
  ctx.restore();
}
