// Silent Depths — Silent-Service-style submarine sim. Two stations:
//   • Nav Map — top-down ocean view; pilot the sub, plot course, watch
//     for convoy contacts and escort threats.
//   • Periscope — view from the conning tower; aim at a target ship,
//     dial in bearing/range/lead, fire a torpedo spread, watch the run.
//
// The original arcade Silent Depths lives at /classics/depths-arcade.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, Eye, Crosshair, Heart, Zap, Anchor } from "lucide-react";
import { recordGameSession, getActiveProfileId } from "../../profiles/store";
import { playSfx, unlockAudio } from "../../art";

// World dimensions in nautical pixels (1 px = ~50m).
const WORLD_W = 2000, WORLD_H = 1200;
const VIEW_W = 400, VIEW_H = 300;

type Station = "nav" | "scope";
type Depth = "surface" | "scope" | "deep";

interface Ship {
  id: number;
  kind: "cargo" | "tanker" | "destroyer";
  x: number; y: number;
  heading: number;        // radians
  speed: number;          // px/sec
  hp: number;
  alerted: boolean;       // destroyers actively hunting
  // For destroyer depth-charge runs
  chargeT: number;
}

interface Torpedo {
  x: number; y: number;
  vx: number; vy: number;
  ttl: number;            // seconds left
  runDistance: number;    // for arming
}

interface DepthCharge {
  x: number; y: number;
  fuseT: number;          // seconds to detonation
  detonated: boolean;
  blastR: number;
}

interface SubState {
  x: number; y: number;
  heading: number;        // radians
  speedSetting: number;   // 0..1 (throttle)
  depth: Depth;
  hp: number;             // 100
  battery: number;        // 100 (drains submerged, recharges on surface)
  fuel: number;           // 100 (drains at speed)
  detection: number;      // 0..100 — how aware escorts are of us
}

interface PatrolState {
  sub: SubState;
  ships: Ship[];
  torpedoes: Torpedo[];
  depthCharges: DepthCharge[];
  elapsed: number;
  tonnageSunk: number;
  tonnageGoal: number;
  station: Station;
  // Aim solution for periscope
  aimBearing: number;     // radians from sub to target
  aimRange: number;       // pixels
  aimLead: number;        // seconds — how far ahead to lead the target
  selectedShipId: number | null;
  state: "patrol" | "sunk" | "victory";
  log: string[];
}

function newPatrol(): PatrolState {
  const sub: SubState = {
    x: WORLD_W * 0.15, y: WORLD_H * 0.5,
    heading: 0, speedSetting: 0.3,
    depth: "surface", hp: 100,
    battery: 100, fuel: 100, detection: 0,
  };
  const ships: Ship[] = [];
  // Convoy — 3 cargo + 1 tanker headed east → west at low speed
  for (let i = 0; i < 3; i++) {
    ships.push({
      id: ships.length, kind: "cargo",
      x: WORLD_W * 0.7 + i * 60, y: WORLD_H * 0.4 + i * 30,
      heading: Math.PI, speed: 25, hp: 1, alerted: false, chargeT: 0,
    });
  }
  ships.push({
    id: ships.length, kind: "tanker",
    x: WORLD_W * 0.85, y: WORLD_H * 0.5,
    heading: Math.PI, speed: 18, hp: 2, alerted: false, chargeT: 0,
  });
  // 2 destroyer escorts circling the convoy
  ships.push({
    id: ships.length, kind: "destroyer",
    x: WORLD_W * 0.75, y: WORLD_H * 0.3,
    heading: Math.PI + 0.4, speed: 40, hp: 3, alerted: false, chargeT: 0,
  });
  ships.push({
    id: ships.length, kind: "destroyer",
    x: WORLD_W * 0.78, y: WORLD_H * 0.65,
    heading: Math.PI - 0.4, speed: 40, hp: 3, alerted: false, chargeT: 0,
  });
  return {
    sub, ships, torpedoes: [], depthCharges: [],
    elapsed: 0, tonnageSunk: 0, tonnageGoal: 30000,  // tons
    station: "nav",
    aimBearing: 0, aimRange: 0, aimLead: 0, selectedShipId: null,
    state: "patrol",
    log: ["Patrol begins. Find the convoy at 0700 hours."],
  };
}

// Tonnage rewarded per ship type
const TONNAGE = { cargo: 6000, tanker: 12000, destroyer: 4000 } as const;

function step(s: PatrolState, dt: number, input: { throttle: number; turn: number }) {
  if (s.state !== "patrol") return;
  s.elapsed += dt;

  // ── Sub physics ──
  s.sub.speedSetting = Math.max(0, Math.min(1, s.sub.speedSetting + input.throttle * dt * 0.6));
  s.sub.heading += input.turn * dt * 0.8;
  const speedMul = s.sub.depth === "deep" ? 0.6 : s.sub.depth === "scope" ? 0.8 : 1.0;
  const speed = s.sub.speedSetting * 60 * speedMul;
  s.sub.x += Math.cos(s.sub.heading) * speed * dt;
  s.sub.y += Math.sin(s.sub.heading) * speed * dt;
  s.sub.x = Math.max(50, Math.min(WORLD_W - 50, s.sub.x));
  s.sub.y = Math.max(50, Math.min(WORLD_H - 50, s.sub.y));

  // Battery / fuel — battery drains submerged, fuel on surface at speed
  if (s.sub.depth === "surface") {
    s.sub.battery = Math.min(100, s.sub.battery + 4 * dt);
    s.sub.fuel = Math.max(0, s.sub.fuel - s.sub.speedSetting * 0.5 * dt);
  } else {
    s.sub.battery = Math.max(0, s.sub.battery - s.sub.speedSetting * 1.5 * dt);
    if (s.sub.battery <= 0) {
      // Forced surface if battery dies
      s.sub.depth = "surface";
      s.log.push("BATTERY DEAD — forced to surface!");
    }
  }

  // Detection — surface visible always; periscope visible at moderate range
  // when escorts are nearby; deep is mostly silent unless we're at full
  // throttle (cavitation).
  const surfaceVisibility = s.sub.depth === "surface" ? 1.0 : s.sub.depth === "scope" ? 0.5 : 0.15;
  for (const ship of s.ships) {
    if (ship.kind !== "destroyer") continue;
    const dist = Math.hypot(ship.x - s.sub.x, ship.y - s.sub.y);
    if (dist < 300 && surfaceVisibility > 0.2) {
      const rate = (1 - dist / 300) * surfaceVisibility * 25 * dt;
      s.sub.detection = Math.min(100, s.sub.detection + rate);
      if (s.sub.detection > 35 && !ship.alerted) {
        ship.alerted = true;
        s.log.push(`Destroyer ${ship.id} has spotted you!`);
      }
    } else if (s.sub.detection > 0) {
      // Slow decay
      s.sub.detection = Math.max(0, s.sub.detection - 4 * dt);
    }
  }
  // Silent running — deep + low throttle clears the alert
  if (s.sub.depth === "deep" && s.sub.speedSetting < 0.2) {
    s.sub.detection = Math.max(0, s.sub.detection - 8 * dt);
    if (s.sub.detection < 15) for (const ship of s.ships) if (ship.kind === "destroyer") ship.alerted = false;
  }

  // ── Ship AI ──
  for (const ship of s.ships) {
    if (ship.kind === "destroyer" && ship.alerted) {
      // Steer toward sub
      const dx = s.sub.x - ship.x, dy = s.sub.y - ship.y;
      const desired = Math.atan2(dy, dx);
      // Smooth turn
      let dh = desired - ship.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      ship.heading += dh * Math.min(1, dt * 1.5);
      // Drop depth charges if close
      const distSq = dx * dx + dy * dy;
      if (distSq < 200 * 200) {
        ship.chargeT -= dt;
        if (ship.chargeT <= 0) {
          ship.chargeT = 3;
          s.depthCharges.push({ x: ship.x, y: ship.y, fuseT: 4, detonated: false, blastR: 60 });
          s.log.push(`Depth charges away from ${ship.id}!`);
        }
      }
    }
    ship.x += Math.cos(ship.heading) * ship.speed * dt;
    ship.y += Math.sin(ship.heading) * ship.speed * dt;
    // Wrap ships at edges so the convoy doesn't escape forever
    if (ship.x < 0) ship.x = WORLD_W;
    if (ship.x > WORLD_W) ship.x = 0;
  }

  // ── Torpedoes ──
  for (let i = s.torpedoes.length - 1; i >= 0; i--) {
    const t = s.torpedoes[i];
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.ttl -= dt;
    t.runDistance += Math.hypot(t.vx, t.vy) * dt;
    if (t.ttl <= 0 || t.x < 0 || t.x > WORLD_W || t.y < 0 || t.y > WORLD_H) {
      s.torpedoes.splice(i, 1);
      continue;
    }
    // Hit detection
    for (let j = s.ships.length - 1; j >= 0; j--) {
      const ship = s.ships[j];
      const hitR = ship.kind === "tanker" ? 35 : ship.kind === "cargo" ? 28 : 22;
      if (Math.hypot(ship.x - t.x, ship.y - t.y) < hitR && t.runDistance > 80) {
        ship.hp -= 1;
        s.torpedoes.splice(i, 1);
        playSfx("explosionBig", { volume: 0.7 });
        if (ship.hp <= 0) {
          s.tonnageSunk += TONNAGE[ship.kind];
          s.log.push(`${ship.kind.toUpperCase()} sunk! ${TONNAGE[ship.kind]} tons.`);
          s.ships.splice(j, 1);
          if (s.tonnageSunk >= s.tonnageGoal) {
            s.state = "victory";
            playSfx("voYouWin", { volume: 0.9 });
            return;
          }
        } else {
          s.log.push(`${ship.kind.toUpperCase()} hit — still afloat.`);
        }
        break;
      }
    }
  }

  // ── Depth charges ──
  for (let i = s.depthCharges.length - 1; i >= 0; i--) {
    const dc = s.depthCharges[i];
    if (dc.detonated) {
      s.depthCharges.splice(i, 1);
      continue;
    }
    dc.fuseT -= dt;
    if (dc.fuseT <= 0) {
      dc.detonated = true;
      // Damage sub if within blast — depth matters
      const dist = Math.hypot(dc.x - s.sub.x, dc.y - s.sub.y);
      if (dist < dc.blastR) {
        const depthFactor = s.sub.depth === "deep" ? 0.4 : s.sub.depth === "scope" ? 0.7 : 1.0;
        const damage = Math.round((1 - dist / dc.blastR) * 35 * depthFactor);
        s.sub.hp -= damage;
        playSfx("explosion", { volume: 0.7 });
        s.log.push(`Depth charge! -${damage} hull`);
        if (s.sub.hp <= 0) {
          s.state = "sunk";
          playSfx("voGameOver", { volume: 0.9 });
        }
      }
    }
  }

  // Aim solution recompute if a target is selected
  if (s.selectedShipId !== null) {
    const target = s.ships.find(sh => sh.id === s.selectedShipId);
    if (target) {
      const dx = target.x - s.sub.x, dy = target.y - s.sub.y;
      s.aimRange = Math.hypot(dx, dy);
      s.aimBearing = Math.atan2(dy, dx);
      // Lead suggestion: torpedo travels at ~120 px/s, target moves at ship.speed
      const torpSpeed = 120;
      const timeToImpact = s.aimRange / torpSpeed;
      s.aimLead = timeToImpact;
    } else {
      s.selectedShipId = null;
    }
  }
}

function fireTorpedo(s: PatrolState, leadOverride?: number): boolean {
  if (s.selectedShipId === null) return false;
  const target = s.ships.find(sh => sh.id === s.selectedShipId);
  if (!target) return false;
  // Aim with lead — predicted target position
  const torpSpeed = 120;
  const lead = leadOverride ?? s.aimLead;
  const predictX = target.x + Math.cos(target.heading) * target.speed * lead;
  const predictY = target.y + Math.sin(target.heading) * target.speed * lead;
  const fireAngle = Math.atan2(predictY - s.sub.y, predictX - s.sub.x);
  s.torpedoes.push({
    x: s.sub.x, y: s.sub.y,
    vx: Math.cos(fireAngle) * torpSpeed,
    vy: Math.sin(fireAngle) * torpSpeed,
    ttl: 20, runDistance: 0,
  });
  playSfx("missilePop", { volume: 0.7 });
  s.log.push(`Torpedo away! Range ${Math.round(s.aimRange / 20)}00 yards.`);
  return true;
}

// ── Component ────────────────────────────────────────────────────────

export default function SilentDepthsSim() {
  const navigate = useNavigate();
  const stateRef = useRef<PatrolState>(newPatrol());
  const inputRef = useRef({ throttle: 0, turn: 0 });
  const navCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => { unlockAudio(); }, []);

  // Keyboard input — W/S throttle, A/D turn, Q/E depth, F fire
  useEffect(() => {
    const keys = new Set<string>();
    function sync() {
      let t = 0, turn = 0;
      if (keys.has("w") || keys.has("ArrowUp")) t += 1;
      if (keys.has("s") || keys.has("ArrowDown")) t -= 1;
      if (keys.has("a") || keys.has("ArrowLeft")) turn -= 1;
      if (keys.has("d") || keys.has("ArrowRight")) turn += 1;
      inputRef.current.throttle = t;
      inputRef.current.turn = turn;
    }
    function down(e: KeyboardEvent) {
      keys.add(e.key);
      if (e.key === " " || e.key === "f") {
        if (stateRef.current.station === "scope") fireTorpedo(stateRef.current);
      } else if (e.key === "q") setDepth("surface");
      else if (e.key === "w" || e.key === "s") {}
      else if (e.key === "e") setDepth(stateRef.current.sub.depth === "scope" ? "deep" : "scope");
      sync();
    }
    function up(e: KeyboardEvent) { keys.delete(e.key); sync(); }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(stateRef.current, dt, inputRef.current);
      drawNav();
      drawScope();
      force(n => n + 1);
      if ((stateRef.current.state === "victory" || stateRef.current.state === "sunk") && !endShown) {
        setEndShown(true);
        const pid = getActiveProfileId();
        if (pid) recordGameSession(pid, "silentdepths", {
          sessions: 1,
          wins: stateRef.current.state === "victory" ? 1 : 0,
          losses: stateRef.current.state === "sunk" ? 1 : 0,
          seconds: Math.round((Date.now() - startedAt.current) / 1000),
          level: stateRef.current.tonnageSunk,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStation(st: Station) { stateRef.current.station = st; force(n => n + 1); }
  function setDepth(d: Depth) { stateRef.current.sub.depth = d; playSfx("blip", { volume: 0.4 }); force(n => n + 1); }
  function setThrottle(v: number) { stateRef.current.sub.speedSetting = Math.max(0, Math.min(1, v)); force(n => n + 1); }
  function setHeading(rad: number) { stateRef.current.sub.heading = rad; }
  function selectShip(id: number | null) { stateRef.current.selectedShipId = id; force(n => n + 1); }

  function drawNav() {
    const c = navCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width * dpr) || c.height !== Math.floor(rect.height * dpr)) {
      c.width = Math.floor(rect.width * dpr); c.height = Math.floor(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = rect.width / VIEW_W, sy = rect.height / VIEW_H;
    ctx.scale(sx, sy);
    const s = stateRef.current;
    // Camera centers on sub
    const camX = s.sub.x - VIEW_W / 2;
    const camY = s.sub.y - VIEW_H / 2;
    // Ocean
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, "#0a2540");
    grad.addColorStop(1, "#020615");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Grid
    ctx.strokeStyle = "rgba(99,179,237,0.12)";
    ctx.lineWidth = 0.5;
    const grid = 100;
    const x0 = -((camX % grid) + grid) % grid;
    const y0 = -((camY % grid) + grid) % grid;
    for (let x = x0; x < VIEW_W; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke();
    }
    for (let y = y0; y < VIEW_H; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke();
    }
    // Ships
    for (const ship of s.ships) {
      const sxx = ship.x - camX, syy = ship.y - camY;
      if (sxx < -20 || sxx > VIEW_W + 20 || syy < -20 || syy > VIEW_H + 20) continue;
      ctx.save();
      ctx.translate(sxx, syy);
      ctx.rotate(ship.heading);
      // Hull
      const color = ship.kind === "destroyer" ? (ship.alerted ? "#f87171" : "#dc2626")
                  : ship.kind === "tanker" ? "#a16207" : "#94a3b8";
      ctx.fillStyle = color;
      ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(-6, -3); ctx.lineTo(-8, 0); ctx.lineTo(-6, 3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      // Selection ring
      if (ship.id === s.selectedShipId) {
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sxx, syy, 16 + Math.sin(s.elapsed * 4) * 2, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // Torpedoes
    for (const t of s.torpedoes) {
      const tx = t.x - camX, ty = t.y - camY;
      ctx.strokeStyle = "rgba(253,224,71,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - t.vx * 0.05, ty - t.vy * 0.05); ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
    }
    // Depth charges
    for (const dc of s.depthCharges) {
      const dx = dc.x - camX, dy = dc.y - camY;
      ctx.fillStyle = "#fb923c";
      ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
      // Pulse ring as fuse runs out
      ctx.strokeStyle = `rgba(248,113,113,${0.4 + Math.sin(s.elapsed * 8) * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dx, dy, 5 + (4 - dc.fuseT) * 4, 0, Math.PI * 2); ctx.stroke();
    }
    // Sub
    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H / 2);
    ctx.rotate(s.sub.heading);
    ctx.fillStyle = s.sub.depth === "deep" ? "#1e3a5f" : s.sub.depth === "scope" ? "#3b82f6" : "#67e8f9";
    ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (s.sub.depth !== "deep") {
      // Periscope mast
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-1, -8, 2, 4);
    }
    ctx.restore();
    // Heading indicator
    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H / 2);
    ctx.rotate(s.sub.heading);
    ctx.strokeStyle = "rgba(103,232,249,0.4)";
    ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawScope() {
    const c = scopeCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width * dpr) || c.height !== Math.floor(rect.height * dpr)) {
      c.width = Math.floor(rect.width * dpr); c.height = Math.floor(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = rect.width / VIEW_W, sy = rect.height / VIEW_H;
    ctx.scale(sx, sy);
    const s = stateRef.current;
    // Periscope eyepiece — circular vignette + ocean horizon
    ctx.fillStyle = "#04060c";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Sky + ocean
    const horizon = VIEW_H * 0.45;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#1e3a5f"); sky.addColorStop(1, "#4a6fa5");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, horizon);
    const ocean = ctx.createLinearGradient(0, horizon, 0, VIEW_H);
    ocean.addColorStop(0, "#1a4080"); ocean.addColorStop(1, "#020618");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, horizon, VIEW_W, VIEW_H - horizon);
    // Horizon line
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(VIEW_W, horizon); ctx.stroke();

    // Render ships in periscope view — only if at scope depth and in view arc
    if (s.sub.depth === "surface" || s.sub.depth === "scope") {
      // View arc — directly ahead from sub.heading, +/- 45°
      const viewAngle = Math.PI / 4;
      for (const ship of s.ships) {
        const dx = ship.x - s.sub.x, dy = ship.y - s.sub.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 600) continue; // out of scope range
        const bearing = Math.atan2(dy, dx);
        let relB = bearing - s.sub.heading;
        while (relB > Math.PI) relB -= Math.PI * 2;
        while (relB < -Math.PI) relB += Math.PI * 2;
        if (Math.abs(relB) > viewAngle) continue;
        // Project relB to screen X
        const screenX = VIEW_W / 2 + (relB / viewAngle) * (VIEW_W / 2);
        const scaleY = 1 - dist / 600;       // closer = bigger
        const shipH = 30 * scaleY;
        const shipW = 60 * scaleY;
        const yPos = horizon + 6 - shipH * 0.4;
        // Hull
        const color = ship.kind === "destroyer" ? "#7f1d1d"
                    : ship.kind === "tanker" ? "#7c2d12" : "#475569";
        ctx.fillStyle = color;
        ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 0.8;
        ctx.fillRect(screenX - shipW / 2, yPos, shipW, shipH * 0.6);
        ctx.strokeRect(screenX - shipW / 2, yPos, shipW, shipH * 0.6);
        // Superstructure
        ctx.fillStyle = "#374151";
        ctx.fillRect(screenX - shipW / 4, yPos - shipH * 0.3, shipW / 2, shipH * 0.3);
        // Smoke stack
        ctx.fillRect(screenX - 1.5 * scaleY, yPos - shipH * 0.55, 3 * scaleY, shipH * 0.25);
        // Label
        ctx.fillStyle = "#fef3c7";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${ship.kind.toUpperCase()} · ${Math.round(dist)}m`, screenX, yPos - shipH * 0.7);
        // Selection ring
        if (ship.id === s.selectedShipId) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(screenX - shipW / 2 - 3, yPos - shipH * 0.4, shipW + 6, shipH * 1.1);
          ctx.stroke();
        }
      }
    } else {
      // Deep — nothing visible
      ctx.fillStyle = "#020615";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#fef3c7";
      ctx.font = "14px monospace"; ctx.textAlign = "center";
      ctx.fillText("DEEP DIVE — PERISCOPE STOWED", VIEW_W / 2, VIEW_H / 2);
    }

    // Crosshair reticle
    ctx.strokeStyle = "rgba(253,224,71,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(VIEW_W / 2 - 30, VIEW_H / 2); ctx.lineTo(VIEW_W / 2 - 5, VIEW_H / 2);
    ctx.moveTo(VIEW_W / 2 + 5, VIEW_H / 2); ctx.lineTo(VIEW_W / 2 + 30, VIEW_H / 2);
    ctx.moveTo(VIEW_W / 2, VIEW_H / 2 - 30); ctx.lineTo(VIEW_W / 2, VIEW_H / 2 - 5);
    ctx.moveTo(VIEW_W / 2, VIEW_H / 2 + 5); ctx.lineTo(VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.stroke();
    ctx.strokeStyle = "rgba(253,224,71,0.4)";
    ctx.beginPath(); ctx.arc(VIEW_W / 2, VIEW_H / 2, 60, 0, Math.PI * 2); ctx.stroke();

    // Circular eyepiece vignette
    const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_W / 4, VIEW_W / 2, VIEW_H / 2, VIEW_W / 1.5);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.7, "rgba(0,0,0,0.4)");
    vignette.addColorStop(1, "rgba(0,0,0,0.95)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const s = stateRef.current;
  const visibleContacts = s.ships.filter(sh => Math.hypot(sh.x - s.sub.x, sh.y - s.sub.y) < 500);

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(180deg, #050a1a 0%, #020308 100%)",
    }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.6)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-[10px] font-display tracking-widest">
          <span style={{ color: "#67e8f9" }}>SILENT DEPTHS</span>
          <span style={{ color: "#fef3c7" }}>·</span>
          <span style={{ color: "#86efac" }}>TONS {Math.round(s.tonnageSunk / 1000)}k / {s.tonnageGoal / 1000}k</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setStation("nav")}
            className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: s.station === "nav" ? "rgba(103,232,249,0.30)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${s.station === "nav" ? "#67e8f9" : "rgba(255,255,255,0.15)"}`,
              color: s.station === "nav" ? "#67e8f9" : "#fef3c7",
            }}>
            <Compass size={11} className="inline mr-1" /> NAV
          </button>
          <button onClick={() => setStation("scope")}
            className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: s.station === "scope" ? "rgba(253,224,71,0.30)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${s.station === "scope" ? "#fde047" : "rgba(255,255,255,0.15)"}`,
              color: s.station === "scope" ? "#fde047" : "#fef3c7",
            }}>
            <Eye size={11} className="inline mr-1" /> SCOPE
          </button>
        </div>
      </header>

      {/* Instrument panel — always visible */}
      <div className="px-3 py-2 flex items-center gap-3 text-[10px] font-mono"
        style={{ background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="flex items-center gap-1">
          <Heart size={11} style={{ color: s.sub.hp > 50 ? "#86efac" : "#f87171" }} />
          <span style={{ color: "#fef3c7" }}>HULL {s.sub.hp}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap size={11} style={{ color: s.sub.battery > 30 ? "#fde047" : "#f87171" }} />
          <span style={{ color: "#fef3c7" }}>{Math.round(s.sub.battery)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Anchor size={11} style={{ color: s.sub.depth === "deep" ? "#67e8f9" : s.sub.depth === "scope" ? "#3b82f6" : "#86efac" }} />
          <span style={{ color: "#fef3c7" }}>{s.sub.depth.toUpperCase()}</span>
        </div>
        {s.sub.detection > 0 && (
          <div className="flex items-center gap-1 ml-auto" style={{ color: s.sub.detection > 50 ? "#f87171" : "#fb923c" }}>
            <Crosshair size={11} />
            DETECT {Math.round(s.sub.detection)}%
          </div>
        )}
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-2 max-w-3xl mx-auto w-full">
        {/* Canvases */}
        <div className="relative w-full" style={{ aspectRatio: `${VIEW_W}/${VIEW_H}` }}>
          <canvas ref={navCanvasRef}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              borderRadius: 8,
              border: "1.5px solid rgba(103,232,249,0.40)",
              display: s.station === "nav" ? "block" : "none",
            }} />
          <canvas ref={scopeCanvasRef}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              borderRadius: 8,
              border: "1.5px solid rgba(253,224,71,0.40)",
              display: s.station === "scope" ? "block" : "none",
            }} />
        </div>

        {/* Controls — context-sensitive per station */}
        <div className="w-full mt-3 space-y-2">
          {/* Depth controls — both stations */}
          <div className="flex gap-2 justify-center">
            {(["surface", "scope", "deep"] as Depth[]).map(d => (
              <button key={d} onClick={() => setDepth(d)}
                className="flex-1 max-w-32 py-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
                style={{
                  background: s.sub.depth === d ? "rgba(103,232,249,0.25)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${s.sub.depth === d ? "#67e8f9" : "rgba(255,255,255,0.15)"}`,
                  color: s.sub.depth === d ? "#67e8f9" : "#fef3c7",
                }}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Throttle */}
          <div className="rounded-lg p-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[9px] tracking-widest mb-1" style={{ color: "#86efac" }}>
              THROTTLE {Math.round(s.sub.speedSetting * 100)}%
            </div>
            <input type="range" min={0} max={100} step={5}
              value={Math.round(s.sub.speedSetting * 100)}
              onChange={e => setThrottle(parseInt(e.target.value, 10) / 100)}
              className="w-full" />
          </div>

          {/* Heading */}
          <div className="rounded-lg p-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[9px] tracking-widest mb-1" style={{ color: "#67e8f9" }}>
              HEADING {Math.round(((s.sub.heading * 180) / Math.PI + 360) % 360)}°
            </div>
            <input type="range" min={0} max={360} step={1}
              value={Math.round(((s.sub.heading * 180) / Math.PI + 360) % 360)}
              onChange={e => setHeading((parseInt(e.target.value, 10) * Math.PI) / 180)}
              className="w-full" />
          </div>

          {/* Contacts — Nav station */}
          {s.station === "nav" && (
            <div className="rounded-lg p-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[9px] tracking-widest mb-1" style={{ color: "#fde047" }}>
                CONTACTS · {visibleContacts.length} IN RANGE
              </div>
              <div className="space-y-1 max-h-32 overflow-auto">
                {visibleContacts.map(ship => {
                  const dist = Math.hypot(ship.x - s.sub.x, ship.y - s.sub.y);
                  return (
                    <button key={ship.id} onClick={() => selectShip(ship.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-[10px] pressable touch-target text-left"
                      style={{
                        background: ship.id === s.selectedShipId ? "rgba(253,224,71,0.18)" : "rgba(0,0,0,0.3)",
                        border: `1px solid ${ship.id === s.selectedShipId ? "#fde047" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      <span style={{ color: ship.kind === "destroyer" ? "#f87171" : ship.kind === "tanker" ? "#fbbf24" : "#cbd5e1" }}>
                        {ship.kind.toUpperCase()}
                      </span>
                      <span className="font-mono" style={{ color: "#fef3c7" }}>{Math.round(dist)}m</span>
                      {ship.alerted && <span className="text-[9px]" style={{ color: "#f87171" }}>ALERTED</span>}
                    </button>
                  );
                })}
                {visibleContacts.length === 0 && (
                  <div className="text-[10px] opacity-60 px-2" style={{ color: "#fef3c7" }}>No contacts. Sweep ahead.</div>
                )}
              </div>
            </div>
          )}

          {/* Firing solution — Scope station */}
          {s.station === "scope" && s.selectedShipId !== null && (
            <div className="rounded-lg p-2"
              style={{ background: "rgba(253,224,71,0.10)", border: "1.5px solid #fde047" }}>
              <div className="text-[9px] tracking-widest mb-1" style={{ color: "#fde047" }}>FIRING SOLUTION</div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div>
                  <div className="opacity-70" style={{ color: "#fef3c7" }}>BEARING</div>
                  <div style={{ color: "#fde047" }}>{Math.round(((s.aimBearing * 180) / Math.PI + 360) % 360)}°</div>
                </div>
                <div>
                  <div className="opacity-70" style={{ color: "#fef3c7" }}>RANGE</div>
                  <div style={{ color: "#fde047" }}>{Math.round(s.aimRange)}m</div>
                </div>
                <div>
                  <div className="opacity-70" style={{ color: "#fef3c7" }}>LEAD</div>
                  <div style={{ color: "#fde047" }}>{s.aimLead.toFixed(1)}s</div>
                </div>
              </div>
              <button onClick={() => fireTorpedo(s)}
                className="mt-2 w-full py-2 rounded font-display tracking-widest text-[11px] pressable touch-target"
                style={{ background: "linear-gradient(135deg, #fde047, #f59e0b)", color: "#1a0505" }}>
                🐟 FIRE TORPEDO
              </button>
            </div>
          )}
          {s.station === "scope" && s.selectedShipId === null && (
            <div className="text-[10px] text-center opacity-70" style={{ color: "#fef3c7" }}>
              Select a contact from the Nav station to lock a firing solution.
            </div>
          )}
        </div>

        {/* Latest log line */}
        <div className="w-full mt-3 text-[10px] truncate" style={{ color: "rgba(229,231,235,0.7)" }}>
          {s.log[s.log.length - 1]}
        </div>

        {/* Result modal */}
        {(s.state === "victory" || s.state === "sunk") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="max-w-sm w-full rounded-2xl p-5 text-center"
              style={{
                background: s.state === "victory"
                  ? "linear-gradient(135deg, rgba(134,239,172,0.25), rgba(8,8,14,0.95))"
                  : "linear-gradient(135deg, rgba(248,113,113,0.25), rgba(8,8,14,0.95))",
                border: `1.5px solid ${s.state === "victory" ? "#86efac" : "#f87171"}`,
              }}>
              <div className="inline-flex items-center gap-2 mb-2"
                style={{ color: s.state === "victory" ? "#86efac" : "#f87171" }}>
                <div className="font-display tracking-widest text-lg">
                  {s.state === "victory" ? "PATROL COMPLETE" : "BOAT LOST"}
                </div>
              </div>
              <div className="text-[11px] font-mono mt-2" style={{ color: "#fef3c7" }}>
                {Math.round(s.tonnageSunk / 1000)}k tons sunk
              </div>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => navigate("/")}
                  className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                  HOME
                </button>
                <button onClick={() => { stateRef.current = newPatrol(); setEndShown(false); force(n => n + 1); }}
                  className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                  style={{ background: "linear-gradient(135deg, #67e8f9, #06b6d4)", color: "#012" }}>
                  NEW PATROL
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
