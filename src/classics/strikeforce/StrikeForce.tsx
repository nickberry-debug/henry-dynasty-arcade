// Strike Force — original top-down vertical-scroll shoot-em-up in the
// 1942 lineage. Player ship at bottom, enemy waves scroll down from
// the top, scrolling starfield background, auto-fire bullets, score
// climbs as enemies die. Three lives. Boss every 30 seconds.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, RotateCcw, Skull, Trophy } from "lucide-react";
import { recordGameSession, getActiveProfileId } from "../../profiles/store";
import { playSfx, unlockAudio } from "../../art";

// Kenney space-shooter-remastered — preload ships, lasers, enemies, meteors.
const SS = "/assets/kenney/space-shooter-remastered/PNG";
const IMG_CACHE = new Map<string, HTMLImageElement>();
function img(path: string): HTMLImageElement {
  let i = IMG_CACHE.get(path);
  if (!i) { i = new Image(); i.src = path; IMG_CACHE.set(path, i); }
  return i;
}
const SPRITES = {
  playerShip:   `${SS}/playerShip1_blue.png`,
  enemyScout:   `${SS}/Enemies/enemyRed3.png`,
  enemyWing:    `${SS}/Enemies/enemyGreen5.png`,
  enemyBoss:    `${SS}/Enemies/enemyBlack5.png`,
  laserPlayer:  `${SS}/Lasers/laserBlue01.png`,
  laserEnemy:   `${SS}/Lasers/laserRed01.png`,
  meteorBig:    `${SS}/Meteors/meteorGrey_big1.png`,
};
Object.values(SPRITES).forEach(img);

const W = 360, H = 600;
const PLAYER_W = 26, PLAYER_H = 22;
const PLAYER_Y = H - 60;

interface Bullet { x: number; y: number; vy: number; from: "player" | "enemy"; r: number; color: string; }
interface Enemy { x: number; y: number; vx: number; vy: number; hp: number; type: "scout" | "wing" | "boss"; r: number; t: number; fireT: number; }
interface Star { x: number; y: number; v: number; size: number; }
interface Boom { x: number; y: number; t: number; r: number; color: string; }

interface Game {
  px: number;
  bullets: Bullet[];
  enemies: Enemy[];
  stars: Star[];
  booms: Boom[];
  fireT: number;
  spawnT: number;
  bossT: number;
  bossCountdown: number;
  bossActive: boolean;
  lives: number;
  score: number;
  invuln: number;
  elapsed: number;
  state: "playing" | "lost" | "won";
}

function newGame(): Game {
  const stars: Star[] = [];
  for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, v: 30 + Math.random() * 80, size: Math.random() * 1.8 + 0.4 });
  }
  return {
    px: W / 2,
    bullets: [], enemies: [], stars, booms: [],
    fireT: 0, spawnT: 0.5, bossT: 0, bossCountdown: 30, bossActive: false,
    lives: 3, score: 0, invuln: 0, elapsed: 0,
    state: "playing",
  };
}

function spawnWave(g: Game) {
  const roll = Math.random();
  if (roll < 0.5) {
    // V formation of scouts
    const cx = 50 + Math.random() * (W - 100);
    for (let i = 0; i < 5; i++) {
      g.enemies.push({
        x: cx + (i - 2) * 22, y: -20 - Math.abs(i - 2) * 15,
        vx: 0, vy: 80, hp: 1, type: "scout", r: 10, t: 0, fireT: 1 + Math.random(),
      });
    }
  } else if (roll < 0.85) {
    // Side-sweep wing pair
    const fromLeft = Math.random() < 0.5;
    for (let i = 0; i < 3; i++) {
      g.enemies.push({
        x: fromLeft ? -20 - i * 20 : W + 20 + i * 20,
        y: 40 + i * 30,
        vx: fromLeft ? 90 : -90, vy: 20, hp: 2, type: "wing", r: 12,
        t: 0, fireT: 1.5 + Math.random(),
      });
    }
  } else {
    // Heavy
    g.enemies.push({
      x: 60 + Math.random() * (W - 120), y: -30,
      vx: 0, vy: 50, hp: 4, type: "wing", r: 16,
      t: 0, fireT: 0.7,
    });
  }
}

function spawnBoss(g: Game) {
  g.enemies.push({
    x: W / 2, y: -60, vx: 60, vy: 25, hp: 30, type: "boss", r: 34, t: 0, fireT: 1.2,
  });
  g.bossActive = true;
}

function step(g: Game, dt: number, input: { dx: number; dy: number; fire: boolean }) {
  if (g.state !== "playing") return;
  g.elapsed += dt;
  g.invuln = Math.max(0, g.invuln - dt);

  // Star scroll
  for (const s of g.stars) {
    s.y += s.v * dt;
    if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
  }

  // Player
  g.px += input.dx * 220 * dt;
  g.px = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, g.px));

  // Auto-fire (always on)
  g.fireT -= dt;
  if (g.fireT <= 0 || input.fire) {
    g.fireT = 0.15;
    g.bullets.push({ x: g.px, y: PLAYER_Y - 12, vy: -460, from: "player", r: 3, color: "#fde047" });
    if (g.score > 200) g.bullets.push({ x: g.px - 8, y: PLAYER_Y - 6, vy: -460, from: "player", r: 2.5, color: "#fde047" });
    if (g.score > 200) g.bullets.push({ x: g.px + 8, y: PLAYER_Y - 6, vy: -460, from: "player", r: 2.5, color: "#fde047" });
    playSfx("laserSmall", { volume: 0.35, pitch: 0.9 + Math.random() * 0.15 });
  }

  // Spawning
  if (!g.bossActive) {
    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      spawnWave(g);
      g.spawnT = 1.4 - Math.min(0.8, g.elapsed * 0.012);
    }
    g.bossT += dt;
    if (g.bossT >= g.bossCountdown) {
      g.bossT = 0;
      spawnBoss(g);
    }
  }

  // Bullets
  for (let i = g.bullets.length - 1; i >= 0; i--) {
    const b = g.bullets[i];
    b.y += b.vy * dt;
    if (b.y < -10 || b.y > H + 10) { g.bullets.splice(i, 1); continue; }
    if (b.from === "player") {
      for (const e of g.enemies) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          e.hp -= 1;
          g.bullets.splice(i, 1);
          if (e.hp <= 0) {
            g.score += e.type === "boss" ? 500 : e.type === "wing" ? 30 : 10;
            g.booms.push({ x: e.x, y: e.y, t: 0.4, r: e.r * 1.6, color: e.type === "boss" ? "#fde047" : "#fb923c" });
            playSfx(e.type === "boss" ? "explosionBig" : "explosion", { volume: 0.7, pitch: 0.9 + Math.random() * 0.2 });
            if (e.type === "boss") g.bossActive = false;
          } else {
            playSfx("impactMetal", { volume: 0.3 });
          }
          break;
        }
      }
    } else {
      if (g.invuln <= 0 && Math.hypot(g.px - b.x, PLAYER_Y - b.y) < PLAYER_W / 2 + b.r) {
        g.bullets.splice(i, 1);
        g.lives -= 1;
        g.invuln = 1.6;
        playSfx("playerHurt", { volume: 0.7 });
        g.booms.push({ x: g.px, y: PLAYER_Y, t: 0.5, r: 24, color: "#f87171" });
        if (g.lives <= 0) g.state = "lost";
      }
    }
  }

  // Enemies
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    e.t += dt;
    if (e.type === "scout") {
      e.x += Math.sin(e.t * 2) * 30 * dt;
      e.y += e.vy * dt;
    } else if (e.type === "wing") {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx); }
      if (e.x > W - e.r) { e.x = W - e.r; e.vx = -Math.abs(e.vx); }
    } else {
      // boss — sine-sweep at top
      e.x += e.vx * dt;
      if (e.y < 80) e.y += e.vy * dt;
      if (e.x < e.r + 10) e.vx = Math.abs(e.vx);
      if (e.x > W - e.r - 10) e.vx = -Math.abs(e.vx);
    }
    // Off-screen cleanup
    if (e.y > H + 40 || e.x < -60 || e.x > W + 60) { g.enemies.splice(i, 1); continue; }
    // Fire
    e.fireT -= dt;
    if (e.fireT <= 0 && e.y > 0) {
      e.fireT = e.type === "boss" ? 0.6 : 2.2;
      const dx = g.px - e.x, dy = PLAYER_Y - e.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      g.bullets.push({ x: e.x, y: e.y + e.r, vy: 180 * (dy / d) + 80, from: "enemy", r: 4, color: "#f87171" });
      // Boss spreads three
      if (e.type === "boss") {
        g.bullets.push({ x: e.x - 10, y: e.y + e.r, vy: 200, from: "enemy", r: 3.5, color: "#f87171" });
        g.bullets.push({ x: e.x + 10, y: e.y + e.r, vy: 200, from: "enemy", r: 3.5, color: "#f87171" });
      }
    }
    // Collide with player
    if (g.invuln <= 0 && Math.hypot(g.px - e.x, PLAYER_Y - e.y) < PLAYER_W / 2 + e.r - 2) {
      g.lives -= 1;
      g.invuln = 1.6;
      e.hp -= 5;
      g.booms.push({ x: g.px, y: PLAYER_Y, t: 0.5, r: 24, color: "#f87171" });
      if (g.lives <= 0) g.state = "lost";
    }
  }

  // Booms
  for (let i = g.booms.length - 1; i >= 0; i--) {
    g.booms[i].t -= dt;
    if (g.booms[i].t <= 0) g.booms.splice(i, 1);
  }
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean) {
  const sprite = img(SPRITES.playerShip);
  if (flash) ctx.globalAlpha = 0.4;
  if (sprite.complete && sprite.naturalWidth > 0) {
    const scale = 0.5;
    const w = sprite.naturalWidth * scale, h = sprite.naturalHeight * scale;
    ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
  } else {
    // Fallback if sprite hasn't loaded yet
    ctx.fillStyle = "#86efac";
    ctx.beginPath();
    ctx.moveTo(x, y - 12); ctx.lineTo(x - 12, y + 10); ctx.lineTo(x + 12, y + 10);
    ctx.closePath(); ctx.fill();
  }
  // Engine glow flicker (procedural — looks nicer than the static sprite's tail)
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 12); ctx.lineTo(x, y + 16 + Math.random() * 3); ctx.lineTo(x + 4, y + 12);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.type === "scout") {
    const sprite = img(SPRITES.enemyScout);
    if (sprite.complete && sprite.naturalWidth > 0) {
      const scale = 0.45;
      const w = sprite.naturalWidth * scale, h = sprite.naturalHeight * scale;
      // Flip vertically since enemies face down
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI);
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h); ctx.restore();
    } else {
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 9); ctx.lineTo(e.x - 9, e.y - 4); ctx.lineTo(e.x + 9, e.y - 4);
      ctx.closePath(); ctx.fill();
    }
  } else if (e.type === "wing") {
    const sprite = img(SPRITES.enemyWing);
    if (sprite.complete && sprite.naturalWidth > 0) {
      const scale = 0.55;
      const w = sprite.naturalWidth * scale, h = sprite.naturalHeight * scale;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI);
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h); ctx.restore();
    } else {
      ctx.fillStyle = "#a855f7";
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Boss — bigger sprite with HP bar
    const sprite = img(SPRITES.enemyBoss);
    if (sprite.complete && sprite.naturalWidth > 0) {
      const scale = 0.9;
      const w = sprite.naturalWidth * scale, h = sprite.naturalHeight * scale;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI);
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h); ctx.restore();
    } else {
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    }
    // HP bar
    const w = e.r * 2, h = 4;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w, h);
    ctx.fillStyle = "#f87171"; ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w * (e.hp / 30), h);
  }
}

export default function StrikeForce() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(newGame());
  const inputRef = useRef({ dx: 0, dy: 0, fire: false });
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);

  // Unlock audio context on mount — first user gesture (the route nav)
  useEffect(() => { unlockAudio(); }, []);

  useEffect(() => {
    const keys = new Set<string>();
    function sync() {
      let dx = 0;
      if (keys.has("a") || keys.has("ArrowLeft"))  dx -= 1;
      if (keys.has("d") || keys.has("ArrowRight")) dx += 1;
      inputRef.current.dx = dx;
    }
    function down(e: KeyboardEvent) { keys.add(e.key); sync(); }
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
      step(gameRef.current, dt, inputRef.current);
      draw();
      force(n => n + 1);
      const g = gameRef.current;
      if (g.state === "lost" && !endShown) {
        setEndShown(true);
        const pid = getActiveProfileId();
        if (pid) recordGameSession(pid, "strikeforce", {
          sessions: 1, losses: 1, seconds: Math.round(g.elapsed), level: g.score,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Space bg
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a0420");
    grad.addColorStop(1, "#02010a");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    const g = gameRef.current;
    // Stars
    for (const s of g.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + s.size * 0.35})`;
      ctx.fillRect(s.x, s.y, s.size, s.size + 1);
    }

    // Booms (under entities)
    for (const b of g.booms) {
      const k = 1 - b.t / 0.5;
      const grad2 = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad2.addColorStop(0, b.color + "ff");
      grad2.addColorStop(1, b.color + "00");
      ctx.fillStyle = grad2;
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      ctx.globalAlpha = 1;
    }

    // Bullets — Kenney laser sprites
    for (const b of g.bullets) {
      const sprite = img(b.from === "player" ? SPRITES.laserPlayer : SPRITES.laserEnemy);
      if (sprite.complete && sprite.naturalWidth > 0) {
        const scale = 0.45;
        const w = sprite.naturalWidth * scale, h = sprite.naturalHeight * scale;
        // Enemy lasers point down — flip vertically
        ctx.save(); ctx.translate(b.x, b.y);
        if (b.from === "enemy") ctx.rotate(Math.PI);
        ctx.drawImage(sprite, -w / 2, -h / 2, w, h); ctx.restore();
      } else {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - b.r, b.y - b.r * 2, b.r * 2, b.r * 4);
      }
    }

    // Enemies
    for (const e of g.enemies) drawEnemy(ctx, e);

    // Player
    if (g.state !== "lost") drawShip(ctx, g.px, PLAYER_Y, g.invuln > 0 && Math.floor(g.invuln * 12) % 2 === 0);
  }

  const g = gameRef.current;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#020108" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="font-display text-[11px] tracking-widest" style={{ color: "#67e8f9" }}>STRIKE FORCE</div>
          <div className="flex items-center gap-1 text-[11px] font-mono" style={{ color: "#86efac" }}>
            {Array.from({ length: g.lives }).map((_, i) => <Heart key={i} size={10} />)}
          </div>
          <div className="text-[11px] font-mono" style={{ color: "#fde047" }}>SCORE {g.score}</div>
        </div>
        <button onClick={() => { gameRef.current = newGame(); setEndShown(false); }}
          aria-label="Restart" className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <RotateCcw size={14} />
        </button>
      </header>

      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} style={{ width: "min(100%, 360px)", aspectRatio: `${W}/${H}` }} />

        {/* Touch drag — anywhere in viewport */}
        <div className="absolute inset-0"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startPx = g.px;
            const move = (ev: PointerEvent) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const scale = W / rect.width;
              g.px = startPx + (ev.clientX - startX) * scale;
              g.px = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, g.px));
            };
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
          style={{ touchAction: "none" }} />

        {g.state === "lost" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="max-w-xs w-full rounded-2xl p-5 text-center"
              style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.2), rgba(8,8,14,0.95))", border: "1.5px solid #f87171" }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: "#f87171" }}>
                <Skull size={20} />
                <div className="font-display tracking-widest text-lg">SHOT DOWN</div>
              </div>
              <div className="text-[11px] font-mono mt-2" style={{ color: "#fef3c7" }}>SCORE {g.score} · TIME {Math.round(g.elapsed)}s</div>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => navigate("/")}
                  className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                  HOME
                </button>
                <button onClick={() => { gameRef.current = newGame(); setEndShown(false); }}
                  className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                  style={{ background: "linear-gradient(135deg, #67e8f9, #06b6d4)", color: "#012" }}>
                  RE-LAUNCH
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
