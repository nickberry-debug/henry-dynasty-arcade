// Tank Duel — turn-based artillery duel. Two tanks on destructible
// terrain, wind affects shots, multiple weapons, health-pool duels,
// best-of formats, aim-assist toggle. Built on EffectsLibrary so
// rockets, explosions, and muzzle flashes are real visible effects.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Trophy, Wind, Crosshair } from "lucide-react";
import { recordGameSession, getActiveProfileId } from "../profiles/store";
import { EffectsLibrary, stepEffectsParticles, drawEffectsParticles, clearEffectsParticles, playSfx, unlockAudio } from "../art";

// Kenney tanks pack — preload all sprites once. Drawn at native size
// (~80x40 for hulls, smaller for barrels/bullets).
const TANK_ART = "/assets/kenney/tanks/PNG/Default size";
const IMG_CACHE = new Map<string, HTMLImageElement>();
function img(path: string): HTMLImageElement {
  let i = IMG_CACHE.get(path);
  if (!i) {
    i = new Image();
    i.src = path;
    IMG_CACHE.set(path, i);
  }
  return i;
}
// Two color schemes — green = P1, navy = P2/bot. Barrel uses grey + red tinting via color filter is hard on canvas, so we map: green hull → grey barrel, navy hull → red barrel.
const SPRITES = {
  hullGreen:   `${TANK_ART}/tanks_tankGreen_body3.png`,
  hullNavy:    `${TANK_ART}/tanks_tankNavy_body3.png`,
  barrelGreen: `${TANK_ART}/tanks_barrelGrey.png`,
  barrelNavy:  `${TANK_ART}/tanks_barrelRed.png`,
  treadsGreen: `${TANK_ART}/tanks_tankTracks1.png`,
  treadsNavy:  `${TANK_ART}/tanks_tankTracks2.png`,
  bulletShell:    `${TANK_ART}/tank_bullet1.png`,
  bulletCluster:  `${TANK_ART}/tank_bullet3.png`,
  bulletNuke:     `${TANK_ART}/tank_bullet5.png`,
  bulletBouncer:  `${TANK_ART}/tank_bullet2.png`,
  bulletDirt:     `${TANK_ART}/tank_bullet6.png`,
  bulletHoming:   `${TANK_ART}/tank_bulletFly5.png`,
  // 12-frame explosion animation
  explosionFrames: Array.from({ length: 12 }, (_, i) => `${TANK_ART}/tank_explosion${i + 1}.png`),
  crateArmor: `${TANK_ART}/tanks_crateArmor.png`,
  crateAmmo:  `${TANK_ART}/tanks_crateAmmo.png`,
};
// Eagerly trigger image loading at module init
Object.values(SPRITES).forEach(v => Array.isArray(v) ? v.forEach(img) : img(v));

const BULLET_BY_WEAPON: Record<string, string> = {
  shell:   SPRITES.bulletShell,
  cluster: SPRITES.bulletCluster,
  nuke:    SPRITES.bulletNuke,
  bouncer: SPRITES.bulletBouncer,
  dirt:    SPRITES.bulletDirt,
  homing:  SPRITES.bulletHoming,
};

// Animated explosion overlay (drawn on top of EffectsLibrary's procedural one)
interface ExplosionAnim { x: number; y: number; t: number; scale: number; }
const explosionAnims: ExplosionAnim[] = [];
function pushExplosionAnim(x: number, y: number, scale: number) {
  explosionAnims.push({ x, y, t: 0, scale });
}
function stepExplosionAnims(dt: number) {
  for (let i = explosionAnims.length - 1; i >= 0; i--) {
    explosionAnims[i].t += dt;
    if (explosionAnims[i].t > 0.6) explosionAnims.splice(i, 1);
  }
}
function drawExplosionAnims(ctx: CanvasRenderingContext2D) {
  for (const e of explosionAnims) {
    const frame = Math.min(11, Math.floor(e.t / 0.05));
    const sprite = img(SPRITES.explosionFrames[frame]);
    if (sprite.complete && sprite.naturalWidth > 0) {
      const w = sprite.naturalWidth * e.scale;
      const h = sprite.naturalHeight * e.scale;
      ctx.drawImage(sprite, e.x - w / 2, e.y - h / 2, w, h);
    }
  }
}

// Map size — increased from 720×480 → 1200×560 per user feedback
// "maps still too small". Max projectile speed scaled proportionally
// below so the entire map is reachable at any angle.
const W = 1200, H = 560;
const TERRAIN_RES = 4;       // 1 column per N pixels for the heightmap
const GRAVITY = 280;          // px/s^2 downward (positive y is down)
const COLS = Math.floor(W / TERRAIN_RES);

// Max projectile speed scales with map width so the farthest tank is
// always reachable. Range at 45° ≈ v²/g; for W=1200, gravity=280, we
// need v ≈ sqrt(1200 × 280) ≈ 580. We use 580 + 200 base for headroom.
const POWER_BASE_SPEED = 220;
const POWER_RANGE_SPEED = 540;  // power=1.0 → 760 px/s, range ≈ 2060 px

type WeaponId = "shell" | "cluster" | "nuke" | "bouncer" | "dirt" | "homing"
              | "mortar" | "piercing" | "scatter";
interface WeaponDef {
  id: WeaponId; name: string; emoji: string; color: string;
  radius: number;          // crater radius
  damage: number;          // damage to tank in radius
  ammo: number;            // max per round (-1 = inf)
  cluster?: number;        // shells split count
  homing?: boolean;
  dirt?: boolean;
  /** Multiplier applied to launch speed at fire — mortars launch
   *  slower so they arc higher; piercing rounds launch faster. */
  speedMult?: number;
  /** Adds vertical bias at launch (positive = more upward) — used
   *  by mortar to force a high arc regardless of aim angle. */
  arcBias?: number;
  /** Continues through tanks/terrain rather than exploding — for
   *  piercing rounds. Caller must handle hp damage. */
  piercing?: boolean;
  /** On explosion, spawns N small additional projectiles in a fan
   *  around the impact point — like a smaller version of cluster. */
  scatter?: number;
}
const WEAPONS: WeaponDef[] = [
  { id: "shell",    name: "Shell",       emoji: "💥", color: "#fb923c", radius: 26, damage: 35, ammo: -1 },
  { id: "cluster",  name: "Cluster",     emoji: "🎆", color: "#fde047", radius: 20, damage: 22, ammo: 3, cluster: 3 },
  { id: "nuke",     name: "Big Nuke",    emoji: "☢️", color: "#f87171", radius: 70, damage: 95, ammo: 1 },
  { id: "bouncer",  name: "Bouncer",     emoji: "🎱", color: "#a78bfa", radius: 22, damage: 30, ammo: 2 },
  { id: "dirt",    name: "Dirt Mover",  emoji: "⛰️", color: "#a16207", radius: 36, damage: 8,  ammo: 2, dirt: true },
  { id: "homing",   name: "Homing",      emoji: "🎯", color: "#67e8f9", radius: 22, damage: 30, ammo: 1, homing: true },
  // NEW (v1.11.2):
  { id: "mortar",   name: "Mortar",      emoji: "🚀", color: "#fca5a5", radius: 28, damage: 38, ammo: 2, speedMult: 0.85, arcBias: -0.55 },
  { id: "piercing", name: "Rail Slug",   emoji: "⚡", color: "#7dd3fc", radius: 14, damage: 50, ammo: 1, speedMult: 1.35, piercing: true },
  { id: "scatter",  name: "Scatter Pod", emoji: "🌟", color: "#86efac", radius: 18, damage: 18, ammo: 2, scatter: 5 },
];

interface Tank {
  x: number;
  hp: number;
  color: string;
  name: string;
  angle: number;
  power: number;
  ammo: Record<WeaponId, number>;
  weapon: WeaponId;
}

interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  weapon: WeaponDef;
  bounces?: number;
  prevX?: number; prevY?: number;
}

interface Game {
  heightmap: number[];          // surface y for each column (top of terrain)
  tanks: [Tank, Tank];
  turn: 0 | 1;
  projectile: Projectile | null;
  wind: number;                  // px/s^2 lateral
  state: "aiming" | "firing" | "between" | "over";
  winner: 0 | 1 | null;
  elapsed: number;
  fireTimer: number;             // time projectile has been in flight
  shake: number;
  cameraTarget: { x: number; y: number } | null;  // for following projectile
  wins: [number, number];
  bestOf: 1 | 3 | 5;
  aimAssist: boolean;
  vsBot: boolean;
}

function genHeightmap(): number[] {
  const arr: number[] = new Array(COLS);
  // Random phase shifts each round so terrain varies. Larger
  // amplitude than v1 so the bigger map has visible mountains —
  // before it was almost flat at this scale.
  const ph1 = Math.random() * Math.PI * 2;
  const ph2 = Math.random() * Math.PI * 2;
  const ph3 = Math.random() * Math.PI * 2;
  const ph4 = Math.random() * Math.PI * 2;
  // Roll a profile: standard / mountainous / valley.
  const profile = Math.random();
  let bigAmp = 70, midAmp = 30, smallAmp = 12;
  if (profile < 0.33) { bigAmp = 120; midAmp = 45; smallAmp = 14; }   // mountainous
  else if (profile < 0.66) { bigAmp = 90; midAmp = 38; smallAmp = 12; } // rolling hills
  // (else: standard)
  for (let c = 0; c < COLS; c++) {
    const x = c / COLS;
    arr[c] =
      H * 0.58 +
      Math.sin(x * Math.PI * 2 + ph1) * bigAmp +
      Math.sin(x * Math.PI * 4 + ph2) * midAmp +
      Math.sin(x * Math.PI * 8 + ph3) * smallAmp +
      Math.sin(x * Math.PI * 13 + ph4) * 5;
    // Clamp so the surface never dips above the tank's headroom or
    // below the screen bottom.
    arr[c] = Math.max(70, Math.min(H - 30, arr[c]));
  }
  return arr;
}

function newRound(prev: Game | null, bestOf: 1 | 3 | 5, vsBot: boolean, aimAssist: boolean, wins: [number, number]): Game {
  const heightmap = genHeightmap();
  const xA = W * 0.15, xB = W * 0.85;
  const colA = Math.floor(xA / TERRAIN_RES), colB = Math.floor(xB / TERRAIN_RES);
  // Flatten landing pads
  for (let d = -3; d <= 3; d++) {
    heightmap[colA + d] = heightmap[colA];
    heightmap[colB + d] = heightmap[colB];
  }
  const a: Tank = {
    x: xA, hp: 100, color: "#67e8f9", name: prev?.tanks[0].name ?? "Cyan",
    angle: Math.PI - 0.8, power: 0.6,
    ammo: weaponAmmoMap(),
    weapon: "shell",
  };
  const b: Tank = {
    x: xB, hp: 100, color: "#f87171", name: prev?.tanks[1].name ?? "Crimson",
    angle: -Math.PI + 0.8, power: 0.6,
    ammo: weaponAmmoMap(),
    weapon: "shell",
  };
  return {
    heightmap,
    tanks: [a, b],
    turn: Math.random() < 0.5 ? 0 : 1,
    projectile: null,
    wind: (Math.random() - 0.5) * 80,
    state: "aiming",
    winner: null,
    elapsed: 0,
    fireTimer: 0,
    shake: 0,
    cameraTarget: null,
    wins,
    bestOf,
    aimAssist,
    vsBot,
  };
}

function weaponAmmoMap(): Record<WeaponId, number> {
  const out = {} as Record<WeaponId, number>;
  for (const w of WEAPONS) out[w.id] = w.ammo;
  return out;
}

function terrainAt(g: Game, x: number): number {
  const c = Math.max(0, Math.min(COLS - 1, Math.floor(x / TERRAIN_RES)));
  return g.heightmap[c];
}

function placeTank(g: Game, tank: Tank): void {
  tank.x = Math.max(20, Math.min(W - 20, tank.x));
}

function fireProjectile(g: Game): void {
  const t = g.tanks[g.turn];
  const wpn = WEAPONS.find(w => w.id === t.weapon)!;
  if (t.ammo[t.weapon] !== -1) {
    if (t.ammo[t.weapon] <= 0) return;
    t.ammo[t.weapon]--;
  }
  const muzzleLen = 18;
  const px = t.x + Math.cos(t.angle) * muzzleLen;
  const py = terrainAt(g, t.x) - 10 + Math.sin(t.angle) * muzzleLen;
  const speed = (POWER_BASE_SPEED + t.power * POWER_RANGE_SPEED) * (wpn.speedMult ?? 1);
  // Mortar adds vertical bias at launch — forces high arc regardless
  // of aim angle, so the shell lobs over terrain.
  const angle = t.angle + (wpn.arcBias ?? 0);
  EffectsLibrary.muzzleFlash(_dummyCtx(), 0, 0, 0); // no-op; real flash drawn in tick
  // Fire SFX — rockets get a rocket whoosh, others get a shell bang
  if (wpn.id === "homing" || wpn.id === "nuke") {
    playSfx("rocketLaunch", { volume: 0.7 });
  } else {
    playSfx("shellFire", { volume: 0.8, pitch: 0.9 + Math.random() * 0.2 });
  }
  g.projectile = {
    x: px, y: py,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    weapon: wpn,
    bounces: wpn.id === "bouncer" ? 3 : 0,
  };
  g.state = "firing";
  g.fireTimer = 0;
  // Spawn flash via global helper — store in module ctx ref so the
  // next frame paints it (using stepParticles).
  pendingMuzzles.push({
    x: t.x + Math.cos(t.angle) * 12,
    y: terrainAt(g, t.x) - 10 + Math.sin(t.angle) * 12,
    angle: t.angle,
    color: wpn.color,
  });
}

const pendingMuzzles: Array<{ x: number; y: number; angle: number; color: string }> = [];
function _dummyCtx(): CanvasRenderingContext2D {
  // EffectsLibrary.muzzleFlash needs a ctx parameter even though it
  // queues particle spawns separately. We supply a no-op canvas here.
  const c = document.createElement("canvas").getContext("2d")!;
  return c;
}

function explode(g: Game, x: number, y: number, wpn: WeaponDef) {
  // Carve terrain (or raise it for dirt mover)
  const cStart = Math.max(0, Math.floor((x - wpn.radius) / TERRAIN_RES));
  const cEnd = Math.min(COLS - 1, Math.floor((x + wpn.radius) / TERRAIN_RES));
  for (let c = cStart; c <= cEnd; c++) {
    const cx = c * TERRAIN_RES;
    const dx = cx - x;
    const dy = Math.sqrt(Math.max(0, wpn.radius * wpn.radius - dx * dx));
    if (wpn.dirt) {
      // Raise terrain (lower y by dy/2)
      g.heightmap[c] = Math.max(40, g.heightmap[c] - dy);
    } else {
      g.heightmap[c] = Math.min(H - 4, g.heightmap[c] + dy);
    }
  }
  // Damage tanks
  for (const t of g.tanks) {
    const dist = Math.hypot(t.x - x, terrainAt(g, t.x) - 10 - y);
    if (dist < wpn.radius * 1.4) {
      const falloff = Math.max(0, 1 - dist / (wpn.radius * 1.4));
      t.hp -= Math.round(wpn.damage * falloff);
    }
  }
  // Settle tanks to terrain after carve
  for (const t of g.tanks) placeTank(g, t);
  EffectsLibrary.explosion(_dummyCtx(), x, y, { scale: wpn.radius / 24, color: wpn.color });
  g.shake = Math.min(20, wpn.radius * 0.35);
}

function botPlay(g: Game): void {
  const me = g.tanks[g.turn];
  const enemy = g.tanks[1 - g.turn];
  // Crude aim — angle toward enemy with some variation
  const dx = enemy.x - me.x;
  const dy = (terrainAt(g, enemy.x) - 10) - (terrainAt(g, me.x) - 10);
  const horizPower = 0.7;
  me.angle = Math.atan2(-Math.abs(dy) - 60, dx) + (Math.random() - 0.5) * 0.15;
  me.power = Math.min(1, Math.max(0.4, horizPower + Math.abs(dx) / 1400 + (Math.random() - 0.5) * 0.1));
  me.weapon = (["shell", "cluster", "homing"][Math.floor(Math.random() * 3)] as WeaponId);
  if (me.ammo[me.weapon] === 0) me.weapon = "shell";
}

function step(g: Game, dt: number) {
  g.elapsed += dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - 20 * dt);

  // Snap tanks down to terrain each frame
  for (const t of g.tanks) {
    /* keep on top */
  }

  if (g.state === "firing" && g.projectile) {
    const p = g.projectile;
    g.fireTimer += dt;
    // Camera follow
    g.cameraTarget = { x: p.x, y: p.y };
    // Homing: nudge toward enemy if applicable
    if (p.weapon.homing) {
      const enemy = g.tanks[1 - g.turn];
      const tx = enemy.x;
      const ty = terrainAt(g, enemy.x) - 14;
      const ddx = tx - p.x, ddy = ty - p.y;
      const dd = Math.max(1, Math.hypot(ddx, ddy));
      const homingForce = 360;
      p.vx += (ddx / dd) * homingForce * dt;
      p.vy += (ddy / dd) * homingForce * dt;
    }
    // Physics
    p.prevX = p.x; p.prevY = p.y;
    p.vx += g.wind * dt;
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Emit smoke trail for rockets
    if (p.weapon.id === "homing" || p.weapon.id === "nuke") {
      EffectsLibrary.smokeTrail(_dummyCtx(), p.x, p.y, { size: 3, ttl: 0.5 });
    }
    // Out of bounds (left/right) = miss
    if (p.x < -40 || p.x > W + 40 || p.y > H + 80) {
      g.projectile = null;
      endTurn(g);
      return;
    }
    // Terrain hit
    const ground = terrainAt(g, p.x);
    if (p.y >= ground - 2) {
      if ((p.bounces ?? 0) > 0 && p.vy > 0 && p.x > 0 && p.x < W) {
        p.bounces! -= 1;
        p.y = ground - 4;
        p.vy = -Math.abs(p.vy) * 0.6;
        p.vx *= 0.85;
        EffectsLibrary.impactSpark(_dummyCtx(), p.x, ground, p.weapon.color);
      } else if (p.weapon.piercing) {
        // Piercing slug damages terrain lightly and continues. It
        // resolves when it leaves the screen.
        explode(g, p.x, ground - 2, { ...p.weapon, radius: 10, damage: 0 });
        p.y = ground - 2;
        // Keep momentum, lose a chunk to friction.
        p.vy = Math.abs(p.vy) * 0.4;
        p.vx *= 0.92;
      } else {
        triggerExplosion(g, p);
      }
      return;
    }
    // Tank hit
    for (const t of g.tanks) {
      const ty = terrainAt(g, t.x) - 10;
      if (Math.hypot(p.x - t.x, p.y - ty) < 16) {
        if (p.weapon.piercing) {
          // Piercing slug damages the tank and continues without exploding.
          t.hp = Math.max(0, t.hp - p.weapon.damage);
          EffectsLibrary.impactSpark(_dummyCtx(), t.x, ty, p.weapon.color);
        } else {
          triggerExplosion(g, p);
          return;
        }
      }
    }
  } else if (g.state === "between") {
    g.fireTimer += dt;
    if (g.fireTimer > 1.2) endTurn(g);
  } else if (g.state === "aiming" && g.vsBot && g.turn === 1) {
    g.fireTimer += dt;
    if (g.fireTimer > 0.6) {
      botPlay(g);
      fireProjectile(g);
    }
  }
}

function triggerExplosion(g: Game, p: Projectile) {
  explode(g, p.x, p.y, p.weapon);
  // Animated explosion overlay + sound
  pushExplosionAnim(p.x, p.y, p.weapon.radius / 30 + 0.6);
  playSfx(p.weapon.id === "nuke" ? "explosionBig" : "explosion", { volume: 0.85, pitch: 0.9 + Math.random() * 0.2 });
  // Scatter: fan N small projectiles outward from the impact point.
  if (p.weapon.scatter && p.weapon.scatter > 0) {
    const n = p.weapon.scatter;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI + (i / (n - 1)) * Math.PI;  // half-circle upward fan
      const sp = 200 + Math.random() * 100;
      const sub: Projectile = {
        x: p.x, y: p.y - 6,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        weapon: { ...p.weapon, scatter: 0, radius: p.weapon.radius * 0.6, damage: p.weapon.damage * 0.55 },
      };
      let tick = 0;
      while (tick < 200) {
        sub.x += sub.vx * 0.016;
        sub.y += sub.vy * 0.016;
        sub.vx += g.wind * 0.016;
        sub.vy += GRAVITY * 0.016;
        if (sub.y >= terrainAt(g, sub.x) - 2 || sub.x < 0 || sub.x > W || sub.y > H) {
          explode(g, sub.x, sub.y, sub.weapon);
          pushExplosionAnim(sub.x, sub.y, 0.7);
          break;
        }
        tick++;
      }
    }
  }
  if (p.weapon.cluster) {
    for (let i = 0; i < p.weapon.cluster; i++) {
      const sub: Projectile = {
        x: p.x, y: p.y - 8,
        vx: (Math.random() - 0.5) * 180,
        vy: -120 - Math.random() * 80,
        weapon: { ...p.weapon, cluster: undefined, radius: p.weapon.radius * 0.75, damage: p.weapon.damage * 0.6 },
      };
      // Run mini-physics inline (split shells land same turn)
      let tick = 0;
      while (tick < 200) {
        sub.x += sub.vx * 0.016;
        sub.y += sub.vy * 0.016;
        sub.vx += g.wind * 0.016;
        sub.vy += GRAVITY * 0.016;
        if (sub.y >= terrainAt(g, sub.x) - 2 || sub.x < 0 || sub.x > W || sub.y > H) {
          explode(g, sub.x, sub.y, sub.weapon);
          break;
        }
        tick++;
      }
    }
  }
  g.projectile = null;
  // Check death
  if (g.tanks[0].hp <= 0 || g.tanks[1].hp <= 0) {
    const winner: 0 | 1 = g.tanks[0].hp > 0 ? 0 : 1;
    g.winner = winner;
    g.wins[winner] = g.wins[winner] + 1;
    const needed = Math.ceil(g.bestOf / 2);
    if (g.wins[winner] >= needed) {
      g.state = "over";
    } else {
      g.state = "between";
      g.fireTimer = 0;
    }
    return;
  }
  g.state = "between";
  g.fireTimer = 0;
}

function endTurn(g: Game) {
  g.turn = (g.turn === 0 ? 1 : 0) as 0 | 1;
  g.state = "aiming";
  g.fireTimer = 0;
  g.cameraTarget = null;
  g.wind = (Math.random() - 0.5) * 100;
}

export default function TankDuel() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [vsBot, setVsBot] = useState<boolean | null>(null);
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [aimAssist, setAimAssist] = useState(true);
  const [stats, force] = useState(0);
  const gameRef = useRef<Game | null>(null);
  const [endShown, setEndShown] = useState(false);

  // Setup screen → start
  function start(mode: boolean) {
    unlockAudio();   // grants AudioContext.resume() on first user gesture (iOS)
    setVsBot(mode);
    gameRef.current = newRound(null, bestOf, mode, aimAssist, [0, 0]);
    setEndShown(false);
    clearEffectsParticles();
  }

  // Game loop
  useEffect(() => {
    if (vsBot === null) return;
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (!g) return;
      step(g, dt);
      // Drain pending muzzle flashes
      while (pendingMuzzles.length > 0) {
        const m = pendingMuzzles.shift()!;
        // can't run on stored ctx — re-emit at draw time via flag
        (g as Game & { _muzzles?: typeof pendingMuzzles })._muzzles = (g as Game & { _muzzles?: typeof pendingMuzzles })._muzzles || [];
        (g as Game & { _muzzles?: typeof pendingMuzzles })._muzzles!.push(m);
      }
      stepEffectsParticles(dt);
      stepExplosionAnims(dt);
      draw();
      force(s => s + 1);
      if (g.state === "over" && !endShown) {
        setEndShown(true);
        const pid = getActiveProfileId();
        if (pid) recordGameSession(pid, "tankduel", {
          sessions: 1,
          wins: g.winner === 0 ? 1 : 0,
          losses: g.winner === 1 ? 1 : 0,
          seconds: Math.round(g.elapsed),
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot, stats]);

  function draw() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width * dpr) || c.height !== Math.floor(rect.height * dpr)) {
      c.width = Math.floor(rect.width * dpr); c.height = Math.floor(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = rect.width / W, sy = rect.height / H;
    ctx.scale(sx, sy);
    const g = gameRef.current; if (!g) return;
    const shakeX = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;
    const shakeY = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#f9a8d4");
    sky.addColorStop(0.5, "#fb923c");
    sky.addColorStop(1, "#fde047");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Distant mountains
    ctx.fillStyle = "rgba(60,40,80,0.55)";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.65);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H * 0.6 + Math.sin(x * 0.02) * 14 + Math.sin(x * 0.05) * 8);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // Mid hills
    ctx.fillStyle = "rgba(40,25,60,0.7)";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.75);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, H * 0.7 + Math.sin(x * 0.04 + 1.2) * 18);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    // Terrain
    const terrainGrad = ctx.createLinearGradient(0, 0, 0, H);
    terrainGrad.addColorStop(0, "#22c55e");
    terrainGrad.addColorStop(0.4, "#16a34a");
    terrainGrad.addColorStop(1, "#365314");
    ctx.fillStyle = terrainGrad;
    ctx.beginPath();
    ctx.moveTo(0, g.heightmap[0]);
    for (let c2 = 1; c2 < COLS; c2++) ctx.lineTo(c2 * TERRAIN_RES, g.heightmap[c2]);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // Grass cap line
    ctx.strokeStyle = "rgba(34,197,94,1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, g.heightmap[0]);
    for (let c2 = 1; c2 < COLS; c2++) ctx.lineTo(c2 * TERRAIN_RES, g.heightmap[c2]);
    ctx.stroke();

    // Aim-assist trajectory preview (current turn, before fire)
    if (g.state === "aiming" && (g.aimAssist || (!g.vsBot)) && (g.vsBot ? g.turn === 0 : true)) {
      const t = g.tanks[g.turn];
      const wpn = WEAPONS.find(w => w.id === t.weapon)!;
  const speed = (POWER_BASE_SPEED + t.power * POWER_RANGE_SPEED) * (wpn.speedMult ?? 1);
      let px = t.x + Math.cos(t.angle) * 18;
      let py = terrainAt(g, t.x) - 10 + Math.sin(t.angle) * 18;
      let pvx = Math.cos(t.angle) * speed;
      let pvy = Math.sin(t.angle) * speed;
      ctx.strokeStyle = t.color + "88";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let n = 0; n < 60; n++) {
        pvx += g.wind * 0.04;
        pvy += GRAVITY * 0.04;
        px += pvx * 0.04;
        py += pvy * 0.04;
        if (py >= terrainAt(g, px) || px < 0 || px > W) break;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tanks — Kenney side-view sprites with rotatable barrel
    g.tanks.forEach((t, i) => {
      const ty = terrainAt(g, t.x);
      const isP1 = i === 0;
      const hull = img(isP1 ? SPRITES.hullGreen : SPRITES.hullNavy);
      const barrel = img(isP1 ? SPRITES.barrelGreen : SPRITES.barrelNavy);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.ellipse(t.x, ty + 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Hull — scaled to ~44px wide
      const hullScale = 0.55;
      if (hull.complete && hull.naturalWidth > 0) {
        const hw = hull.naturalWidth * hullScale;
        const hh = hull.naturalHeight * hullScale;
        ctx.drawImage(hull, t.x - hw / 2, ty - hh + 2, hw, hh);
      } else {
        // Fallback rectangle if sprite not loaded yet
        ctx.fillStyle = t.color; ctx.fillRect(t.x - 18, ty - 14, 36, 14);
      }
      // Barrel — rotated around the turret pivot (center-top of hull)
      const barrelPivotY = ty - (hull.naturalHeight * hullScale) * 0.65;
      ctx.save();
      ctx.translate(t.x, barrelPivotY);
      // Barrel points right at angle=0; tank facing left aims at -PI..0
      // Kenney barrel sprite points up; rotate by t.angle + PI/2 to align.
      ctx.rotate(t.angle + Math.PI / 2);
      if (barrel.complete && barrel.naturalWidth > 0) {
        const bScale = 0.45;
        const bw = barrel.naturalWidth * bScale;
        const bh = barrel.naturalHeight * bScale;
        // Pivot at bottom-center of the barrel sprite
        ctx.drawImage(barrel, -bw / 2, -bh + 4, bw, bh);
      } else {
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-2, -18, 4, 18);
      }
      ctx.restore();
      // HP bar
      const hp = Math.max(0, t.hp);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(t.x - 20, ty - 32, 40, 5);
      ctx.fillStyle = hp > 50 ? "#86efac" : hp > 25 ? "#fde047" : "#f87171";
      ctx.fillRect(t.x - 20, ty - 32, 40 * (hp / 100), 5);
      // Turn marker
      if (g.state === "aiming" && i === g.turn) {
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        const bob = Math.sin(g.elapsed * 6) * 2;
        ctx.moveTo(t.x, ty - 38 + bob);
        ctx.lineTo(t.x - 5, ty - 44 + bob);
        ctx.lineTo(t.x + 5, ty - 44 + bob);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Projectile + drained queued muzzles
    const muzzles = (g as Game & { _muzzles?: typeof pendingMuzzles })._muzzles;
    if (muzzles) {
      for (const m of muzzles) {
        EffectsLibrary.muzzleFlash(ctx, m.x, m.y, m.angle, 1, m.color);
      }
      muzzles.length = 0;
    }
    if (g.projectile) {
      const p = g.projectile;
      // Rockets still get the EffectsLibrary smoke trail on top
      if (p.weapon.id === "homing" || p.weapon.id === "nuke") {
        EffectsLibrary.rocket(ctx, p.x, p.y, p.vx, p.vy, { color: p.weapon.color, scale: 0.6 });
      }
      // Sprite-based bullet — rotated to match velocity
      const sprite = img(BULLET_BY_WEAPON[p.weapon.id] ?? SPRITES.bulletShell);
      if (sprite.complete && sprite.naturalWidth > 0) {
        const angle = Math.atan2(p.vy, p.vx);
        const scale = p.weapon.id === "nuke" ? 0.7 : p.weapon.id === "bouncer" ? 0.6 : 0.5;
        const w = sprite.naturalWidth * scale;
        const h = sprite.naturalHeight * scale;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle + Math.PI / 2);   // bullet sprites point up by default
        ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    // Animated Kenney explosion overlay (12 frames)
    drawExplosionAnims(ctx);

    // Effects particles layer
    drawEffectsParticles(ctx);

    ctx.restore();

    // Wind indicator (top center)
    const windDir = Math.sign(g.wind);
    const windMag = Math.abs(g.wind);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(W / 2 - 70, 8, 140, 22);
    ctx.fillStyle = "#fef3c7";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`WIND ${windDir > 0 ? "→" : windDir < 0 ? "←" : "—"} ${Math.round(windMag)}`, W / 2, 19);
  }

  // Setup screen
  if (vsBot === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: "radial-gradient(800px 500px at 50% 0%, rgba(251,146,60,0.18), transparent), #0a0814" }}>
        <button onClick={() => navigate("/")} aria-label="Back"
          className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={16} />
        </button>
        <div className="max-w-md w-full space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">💣</div>
            <h1 className="font-display text-2xl tracking-widest" style={{ color: "#fb923c" }}>TANK DUEL</h1>
            <p className="text-[12px] mt-2" style={{ color: "rgba(229,231,235,0.8)" }}>
              Turn-based artillery. Aim, set power, fire. Wind matters. Terrain breaks.
            </p>
          </div>
          <section className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fb923c" }}>FORMAT</div>
            <div className="flex gap-2">
              {([1, 3, 5] as const).map(n => (
                <button key={n} onClick={() => setBestOf(n)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-display tracking-widest pressable touch-target"
                  style={{
                    background: bestOf === n ? "rgba(251,146,60,0.25)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${bestOf === n ? "#fb923c" : "rgba(255,255,255,0.15)"}`,
                    color: bestOf === n ? "#fb923c" : "#fef3c7",
                  }}>
                  BEST OF {n}
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-xl p-3 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div>
              <div className="text-[11px] font-display tracking-widest" style={{ color: "#fef3c7" }}>AIM ASSIST</div>
              <div className="text-[10px] opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>Shows the shot trajectory</div>
            </div>
            <button onClick={() => setAimAssist(a => !a)}
              className="px-3 py-1.5 rounded-full text-[10px] font-display tracking-widest pressable touch-target"
              style={{
                background: aimAssist ? "#86efac" : "rgba(255,255,255,0.10)",
                color: aimAssist ? "#0a1a0a" : "#fef3c7",
              }}>
              {aimAssist ? "ON" : "OFF"}
            </button>
          </section>
          <button onClick={() => start(false)}
            className="w-full py-4 rounded-2xl font-display tracking-widest text-[14px] pressable touch-target"
            style={{ background: "linear-gradient(135deg, #fb923c, #dc2626)", color: "#1a0505" }}>
            ⚔️ 2 PLAYERS (SAME DEVICE)
          </button>
          <button onClick={() => start(true)}
            className="w-full py-4 rounded-2xl font-display tracking-widest text-[14px] pressable touch-target"
            style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
            🤖 VS BOT
          </button>
        </div>
      </div>
    );
  }

  const g = gameRef.current;
  if (!g) return null;
  const me = g.tanks[g.turn];
  const wpn = WEAPONS.find(w => w.id === me.weapon)!;
  const ammo = me.ammo[wpn.id];
  const myTurnHuman = g.state === "aiming" && !(g.vsBot && g.turn === 1);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050308" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-[10px] font-display tracking-widest">
          <span style={{ color: g.tanks[0].color }}>P1 {g.tanks[0].hp}HP</span>
          <span style={{ color: "#fef3c7" }}>{g.wins[0]}—{g.wins[1]}</span>
          <span style={{ color: g.tanks[1].color }}>{g.vsBot ? "BOT" : "P2"} {g.tanks[1].hp}HP</span>
        </div>
        <button onClick={() => start(g.vsBot)} aria-label="Reset"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <RotateCcw size={14} />
        </button>
      </header>

      <main className="flex-1 relative flex flex-col items-center">
        <div className="w-full flex items-center justify-center p-2">
          <canvas ref={canvasRef} style={{ width: "min(100%, 720px)", aspectRatio: `${W}/${H}`, background: "#000", borderRadius: 8 }} />
        </div>

        {/* Aim + power controls — only when human turn */}
        {myTurnHuman && (
          <div className="w-full max-w-3xl px-3 pb-3 grid grid-cols-3 gap-3">
            <section className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[9px] tracking-widest mb-1 flex items-center gap-1" style={{ color: me.color }}>
                <Crosshair size={10} /> ANGLE
              </div>
              <input type="range" min={-180} max={0} step={1}
                value={Math.round((me.angle / Math.PI) * 180)}
                onChange={(e) => { me.angle = (parseInt(e.target.value, 10) / 180) * Math.PI; force(s => s + 1); }}
                className="w-full" />
              <div className="text-center text-[10px] font-mono" style={{ color: "#fef3c7" }}>{Math.round((me.angle / Math.PI) * 180)}°</div>
            </section>
            <section className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[9px] tracking-widest mb-1" style={{ color: me.color }}>POWER</div>
              <input type="range" min={20} max={100} step={1}
                value={Math.round(me.power * 100)}
                onChange={(e) => { me.power = parseInt(e.target.value, 10) / 100; force(s => s + 1); }}
                className="w-full" />
              <div className="text-center text-[10px] font-mono" style={{ color: "#fef3c7" }}>{Math.round(me.power * 100)}%</div>
            </section>
            <section className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[9px] tracking-widest mb-1" style={{ color: me.color }}>WEAPON</div>
              <select value={me.weapon}
                onChange={(e) => { me.weapon = e.target.value as WeaponId; force(s => s + 1); }}
                className="w-full rounded px-2 py-1 text-[11px]"
                style={{ background: "rgba(0,0,0,0.4)", color: "#fef3c7", border: "1px solid rgba(255,255,255,0.18)" }}>
                {WEAPONS.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.emoji} {w.name}{w.ammo > 0 ? ` (×${me.ammo[w.id]})` : ""}
                  </option>
                ))}
              </select>
              <button onClick={() => fireProjectile(g)}
                disabled={ammo === 0}
                className="mt-1.5 w-full py-2 rounded font-display tracking-widest text-[11px] pressable touch-target"
                style={{
                  background: ammo === 0 ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #fb923c, #dc2626)",
                  color: ammo === 0 ? "#9aa6bf" : "#1a0505",
                  opacity: ammo === 0 ? 0.5 : 1,
                }}>
                🔥 FIRE
              </button>
            </section>
          </div>
        )}
        {!myTurnHuman && g.state === "aiming" && (
          <div className="w-full max-w-3xl px-3 pb-3 text-center text-[11px] font-display tracking-widest" style={{ color: "#fb923c" }}>
            🤖 BOT THINKING…
          </div>
        )}

        {/* Round + match end */}
        {(g.state === "over" || (g.state === "between" && g.winner !== null && g.wins[g.winner] < Math.ceil(g.bestOf / 2))) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="max-w-xs w-full rounded-2xl p-5 text-center"
              style={{
                background: `linear-gradient(135deg, ${g.tanks[g.winner ?? 0].color}33, rgba(8,8,14,0.95))`,
                border: `1.5px solid ${g.tanks[g.winner ?? 0].color}`,
              }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: g.tanks[g.winner ?? 0].color }}>
                <Trophy size={20} />
                <div className="font-display tracking-widest text-lg">
                  {g.state === "over" ? "MATCH OVER" : "ROUND END"}
                </div>
              </div>
              <div className="text-[11px] font-mono mt-2" style={{ color: "#fef3c7" }}>
                {g.tanks[g.winner ?? 0].name} wins · {g.wins[0]}—{g.wins[1]}
              </div>
              <div className="flex gap-2 justify-center mt-4">
                {g.state === "over" ? (
                  <>
                    <button onClick={() => navigate("/")}
                      className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                      HOME
                    </button>
                    <button onClick={() => start(g.vsBot)}
                      className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                      style={{ background: "linear-gradient(135deg, #fb923c, #dc2626)", color: "#1a0505" }}>
                      REMATCH
                    </button>
                  </>
                ) : (
                  <button onClick={() => {
                    gameRef.current = newRound(g, g.bestOf, g.vsBot, g.aimAssist, g.wins);
                    force(s => s + 1);
                  }}
                    className="px-4 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                    style={{ background: "linear-gradient(135deg, #fb923c, #dc2626)", color: "#1a0505" }}>
                    NEXT ROUND
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
