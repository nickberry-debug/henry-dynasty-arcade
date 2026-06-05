// Silent Depths — original submarine survival game. The player pilots a
// submarine moving left-right at adjustable depth. Mines drift down,
// enemy subs cruise across, and the player drops torpedoes upward at
// surface targets (cargo ships) while avoiding depth charges that fall
// from above. Survive waves; lose three lives = game over.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, RotateCcw, Skull } from "lucide-react";
import { recordGameSession, getActiveProfileId } from "../../profiles/store";
import { playSfx, unlockAudio } from "../../art";

const W = 360, H = 600;
const SURFACE_Y = 70;
const FLOOR_Y = H - 30;

interface Sub { x: number; y: number; vx: number; vy: number; }
interface Mine { x: number; y: number; vy: number; }
interface Charge { x: number; y: number; vy: number; }
interface Cargo { x: number; vx: number; w: number; }
interface EnemySub { x: number; y: number; vx: number; }
interface Torpedo { x: number; y: number; vy: number; from: "player" | "enemy"; }
interface Boom { x: number; y: number; t: number; r: number; color: string; }
interface Bubble { x: number; y: number; vy: number; r: number; }

interface Game {
  sub: Sub;
  mines: Mine[];
  charges: Charge[];
  cargo: Cargo[];
  enemies: EnemySub[];
  torpedoes: Torpedo[];
  booms: Boom[];
  bubbles: Bubble[];
  spawnT: number;
  cargoSpawnT: number;
  enemySpawnT: number;
  fireT: number;
  lives: number;
  score: number;
  elapsed: number;
  hitT: number;
  state: "playing" | "lost";
}

function newGame(): Game {
  return {
    sub: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
    mines: [], charges: [], cargo: [], enemies: [], torpedoes: [], booms: [], bubbles: [],
    spawnT: 1, cargoSpawnT: 2, enemySpawnT: 5, fireT: 0,
    lives: 3, score: 0, elapsed: 0, hitT: 0,
    state: "playing",
  };
}

function step(g: Game, dt: number, input: { dx: number; dy: number; fire: boolean }) {
  if (g.state !== "playing") return;
  g.elapsed += dt;
  g.hitT = Math.max(0, g.hitT - dt);

  // Sub move
  const s = g.sub;
  s.vx = input.dx * 140;
  s.vy = input.dy * 110;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.x = Math.max(18, Math.min(W - 18, s.x));
  s.y = Math.max(SURFACE_Y + 16, Math.min(FLOOR_Y - 12, s.y));

  // Trail bubbles
  if (Math.random() < 0.4) {
    g.bubbles.push({ x: s.x - 12 * Math.sign(s.vx || 1), y: s.y + 4, vy: -20 - Math.random() * 30, r: 1.5 + Math.random() * 1.5 });
  }
  for (let i = g.bubbles.length - 1; i >= 0; i--) {
    const b = g.bubbles[i];
    b.y += b.vy * dt;
    if (b.y < SURFACE_Y + 4) g.bubbles.splice(i, 1);
  }

  // Fire torpedo (up)
  g.fireT -= dt;
  if (input.fire && g.fireT <= 0) {
    g.fireT = 0.6;
    g.torpedoes.push({ x: s.x, y: s.y - 10, vy: -220, from: "player" });
    playSfx("missilePop", { volume: 0.6, pitch: 0.9 + Math.random() * 0.2 });
  }

  // Mines
  g.spawnT -= dt;
  if (g.spawnT <= 0) {
    g.spawnT = 1.6 - Math.min(1.0, g.elapsed * 0.01);
    g.mines.push({ x: 20 + Math.random() * (W - 40), y: SURFACE_Y + 4, vy: 30 + Math.random() * 30 });
  }
  for (let i = g.mines.length - 1; i >= 0; i--) {
    const m = g.mines[i];
    m.y += m.vy * dt;
    if (m.y > FLOOR_Y - 6) { g.mines.splice(i, 1); continue; }
    if (g.hitT === 0 && Math.hypot(s.x - m.x, s.y - m.y) < 16) {
      g.mines.splice(i, 1);
      hitPlayer(g);
    }
  }

  // Cargo ships
  g.cargoSpawnT -= dt;
  if (g.cargoSpawnT <= 0) {
    g.cargoSpawnT = 3 + Math.random() * 2;
    const fromLeft = Math.random() < 0.5;
    g.cargo.push({ x: fromLeft ? -40 : W + 40, vx: fromLeft ? 40 + Math.random() * 30 : -(40 + Math.random() * 30), w: 50 });
  }
  for (let i = g.cargo.length - 1; i >= 0; i--) {
    const c = g.cargo[i];
    c.x += c.vx * dt;
    // Cargo drops depth charges
    if (Math.random() < 0.012) {
      g.charges.push({ x: c.x, y: SURFACE_Y + 8, vy: 60 });
    }
    if (c.x < -60 || c.x > W + 60) g.cargo.splice(i, 1);
  }

  // Charges
  for (let i = g.charges.length - 1; i >= 0; i--) {
    const c = g.charges[i];
    c.y += c.vy * dt;
    if (c.y > FLOOR_Y) { g.charges.splice(i, 1); continue; }
    if (g.hitT === 0 && Math.hypot(s.x - c.x, s.y - c.y) < 14) {
      g.charges.splice(i, 1);
      hitPlayer(g);
    }
  }

  // Enemy subs
  g.enemySpawnT -= dt;
  if (g.enemySpawnT <= 0) {
    g.enemySpawnT = 7 + Math.random() * 4;
    const fromLeft = Math.random() < 0.5;
    g.enemies.push({
      x: fromLeft ? -30 : W + 30,
      y: 200 + Math.random() * (FLOOR_Y - 250),
      vx: fromLeft ? 60 : -60,
    });
  }
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    e.x += e.vx * dt;
    // Enemy fires horizontally toward player at random moments
    if (Math.random() < 0.005 && Math.sign(s.x - e.x) === Math.sign(e.vx)) {
      g.torpedoes.push({ x: e.x + Math.sign(e.vx) * 14, y: e.y, vy: 0, from: "enemy" });
      (g.torpedoes[g.torpedoes.length - 1] as Torpedo & { vx?: number }).vx = e.vx * 1.8;
    }
    if (g.hitT === 0 && Math.hypot(s.x - e.x, s.y - e.y) < 22) {
      g.enemies.splice(i, 1);
      g.booms.push({ x: e.x, y: e.y, t: 0.5, r: 22, color: "#f87171" });
      hitPlayer(g);
      continue;
    }
    if (e.x < -50 || e.x > W + 50) g.enemies.splice(i, 1);
  }

  // Torpedoes
  for (let i = g.torpedoes.length - 1; i >= 0; i--) {
    const t = g.torpedoes[i] as Torpedo & { vx?: number };
    t.y += t.vy * dt;
    if (t.vx !== undefined) t.x += t.vx * dt;
    if (t.y < SURFACE_Y - 10 || t.y > FLOOR_Y + 10 || t.x < -20 || t.x > W + 20) {
      g.torpedoes.splice(i, 1); continue;
    }
    if (t.from === "player") {
      // Hit cargo
      let hit = false;
      for (let j = g.cargo.length - 1; j >= 0; j--) {
        const c = g.cargo[j];
        if (t.y < SURFACE_Y + 14 && Math.abs(c.x - t.x) < c.w / 2) {
          g.cargo.splice(j, 1);
          g.torpedoes.splice(i, 1);
          g.score += 200;
          playSfx("explosionBig", { volume: 0.8 });
          g.booms.push({ x: c.x, y: SURFACE_Y + 4, t: 0.6, r: 30, color: "#fde047" });
          hit = true;
          break;
        }
      }
      if (hit) continue;
      // Hit enemy sub
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (Math.hypot(e.x - t.x, e.y - t.y) < 14) {
          g.enemies.splice(j, 1);
          g.torpedoes.splice(i, 1);
          g.score += 300;
          playSfx("explosion", { volume: 0.75 });
          g.booms.push({ x: e.x, y: e.y, t: 0.5, r: 22, color: "#fb923c" });
          hit = true;
          break;
        }
      }
      if (hit) continue;
      // Hit mines
      for (let j = g.mines.length - 1; j >= 0; j--) {
        const m = g.mines[j];
        if (Math.hypot(m.x - t.x, m.y - t.y) < 10) {
          g.mines.splice(j, 1);
          g.torpedoes.splice(i, 1);
          g.score += 75;
          g.booms.push({ x: m.x, y: m.y, t: 0.4, r: 14, color: "#fb923c" });
          hit = true;
          break;
        }
      }
    } else {
      // Enemy torpedo vs player
      if (g.hitT === 0 && Math.hypot(t.x - s.x, t.y - s.y) < 14) {
        g.torpedoes.splice(i, 1);
        hitPlayer(g);
      }
    }
  }

  for (let i = g.booms.length - 1; i >= 0; i--) {
    g.booms[i].t -= dt;
    if (g.booms[i].t <= 0) g.booms.splice(i, 1);
  }
}

function hitPlayer(g: Game) {
  g.lives -= 1;
  g.hitT = 1.6;
  g.booms.push({ x: g.sub.x, y: g.sub.y, t: 0.5, r: 22, color: "#f87171" });
  playSfx("playerHurt", { volume: 0.7 });
  if (g.lives <= 0) { g.state = "lost"; playSfx("voGameOver", { volume: 0.9 }); }
}

function drawSub(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean) {
  if (flash) ctx.globalAlpha = 0.4;
  // Hull
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Tower
  ctx.fillStyle = "#eab308";
  ctx.fillRect(x - 6, y - 12, 12, 6);
  ctx.strokeRect(x - 6, y - 12, 12, 6);
  // Portholes
  ctx.fillStyle = "#67e8f9";
  ctx.beginPath(); ctx.arc(x - 8, y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 2, y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4, y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 10, y, 2, 0, Math.PI * 2); ctx.fill();
  // Periscope
  ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 18); ctx.lineTo(x + 4, y - 18); ctx.stroke();
  // Prop
  ctx.fillStyle = "#a16207";
  ctx.fillRect(x - 24, y - 1, 4, 3);
  ctx.globalAlpha = 1;
}

export default function SilentDepths() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(newGame());
  const inputRef = useRef({ dx: 0, dy: 0, fire: false });
  useEffect(() => { unlockAudio(); }, []);
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);

  useEffect(() => {
    const keys = new Set<string>();
    function sync() {
      let dx = 0, dy = 0;
      if (keys.has("a") || keys.has("ArrowLeft"))  dx -= 1;
      if (keys.has("d") || keys.has("ArrowRight")) dx += 1;
      if (keys.has("w") || keys.has("ArrowUp"))    dy -= 1;
      if (keys.has("s") || keys.has("ArrowDown"))  dy += 1;
      inputRef.current.dx = dx; inputRef.current.dy = dy;
    }
    function down(e: KeyboardEvent) {
      keys.add(e.key);
      if (e.key === " ") inputRef.current.fire = true;
      sync();
    }
    function up(e: KeyboardEvent) {
      keys.delete(e.key);
      if (e.key === " ") inputRef.current.fire = false;
      sync();
    }
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
        if (pid) recordGameSession(pid, "silentdepths", {
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

    // Water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#67e8f9");
    grad.addColorStop(0.1, "#0ea5e9");
    grad.addColorStop(0.5, "#1e3a8a");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Surface line + waves
    const g = gameRef.current;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 8) {
      const y = SURFACE_Y + Math.sin(x * 0.1 + g.elapsed * 2) * 2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sea floor
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    for (let x = 0; x <= W; x += 16) {
      ctx.lineTo(x, FLOOR_Y + Math.sin(x * 0.4) * 3);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Bubbles
    for (const b of g.bubbles) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    // Cargo ships (at surface)
    for (const c of g.cargo) {
      ctx.fillStyle = "#7c2d12";
      ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1;
      ctx.fillRect(c.x - c.w / 2, SURFACE_Y - 14, c.w, 12);
      ctx.strokeRect(c.x - c.w / 2, SURFACE_Y - 14, c.w, 12);
      // cabin
      ctx.fillStyle = "#a8a29e";
      ctx.fillRect(c.x - 8, SURFACE_Y - 22, 16, 8);
      ctx.strokeRect(c.x - 8, SURFACE_Y - 22, 16, 8);
      // smokestack
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(c.x - 2, SURFACE_Y - 28, 4, 6);
      // smoke
      ctx.fillStyle = "rgba(200,200,200,0.5)";
      ctx.beginPath(); ctx.arc(c.x, SURFACE_Y - 32 + Math.sin(g.elapsed * 3) * 2, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Mines
    for (const m of g.mines) {
      ctx.fillStyle = "#1a1a1a";
      ctx.strokeStyle = "#7f1d1d"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // spikes
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2;
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(angle) * 8, m.y + Math.sin(angle) * 8);
        ctx.lineTo(m.x + Math.cos(angle) * 12, m.y + Math.sin(angle) * 12);
        ctx.stroke();
      }
      // chain
      ctx.strokeStyle = "rgba(168,162,158,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, SURFACE_Y); ctx.stroke();
    }

    // Charges
    for (const c of g.charges) {
      ctx.fillStyle = "#1f2937";
      ctx.strokeStyle = "#fde047"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.font = "8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("!", c.x, c.y);
    }

    // Enemy subs
    for (const e of g.enemies) {
      const facing = Math.sign(e.vx);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(facing, 1);
      ctx.fillStyle = "#7f1d1d";
      ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(-5, -10, 10, 5);
      ctx.strokeRect(-5, -10, 10, 5);
      ctx.fillStyle = "#fca5a5";
      ctx.beginPath(); ctx.arc(8, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Torpedoes
    for (const t of g.torpedoes) {
      const tx = t as Torpedo & { vx?: number };
      ctx.fillStyle = t.from === "player" ? "#fde047" : "#fca5a5";
      const horiz = (tx.vx ?? 0) !== 0;
      if (horiz) {
        ctx.fillRect(t.x - 5, t.y - 2, 10, 4);
      } else {
        ctx.fillRect(t.x - 2, t.y - 6, 4, 12);
      }
    }

    // Booms
    for (const b of g.booms) {
      const k = 1 - b.t / 0.6;
      const grad2 = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad2.addColorStop(0, b.color + "ff");
      grad2.addColorStop(1, b.color + "00");
      ctx.fillStyle = grad2;
      ctx.globalAlpha = 1 - k * 0.5;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      ctx.globalAlpha = 1;
    }

    // Player sub
    if (g.state !== "lost") drawSub(ctx, g.sub.x, g.sub.y, g.hitT > 0 && Math.floor(g.hitT * 12) % 2 === 0);
  }

  const g = gameRef.current;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#020617" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="font-display text-[11px] tracking-widest" style={{ color: "#67e8f9" }}>SILENT DEPTHS</div>
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

        {/* Touch controls — left joystick + right fire button */}
        <div className="absolute left-2 bottom-2" style={{ width: 110, height: 110, touchAction: "none" }}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const move = (ev: PointerEvent) => {
              const dx = (ev.clientX - cx) / 40;
              const dy = (ev.clientY - cy) / 40;
              inputRef.current.dx = Math.max(-1, Math.min(1, dx));
              inputRef.current.dy = Math.max(-1, Math.min(1, dy));
            };
            move(e.nativeEvent);
            const up = () => {
              inputRef.current.dx = 0; inputRef.current.dy = 0;
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}>
          <div className="absolute inset-0 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.18)" }} />
        </div>
        <button className="absolute right-2 bottom-2 rounded-full font-display text-[12px] tracking-widest touch-target"
          style={{
            width: 80, height: 80, background: "rgba(253,224,71,0.20)",
            border: "2px solid #fde047", color: "#fde047",
            touchAction: "none",
          }}
          onPointerDown={(e) => { e.preventDefault(); inputRef.current.fire = true; }}
          onPointerUp={() => { inputRef.current.fire = false; }}
          onPointerCancel={() => { inputRef.current.fire = false; }}>
          FIRE
        </button>

        {g.state === "lost" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="max-w-xs w-full rounded-2xl p-5 text-center"
              style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.2), rgba(8,8,14,0.95))", border: "1.5px solid #f87171" }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: "#f87171" }}>
                <Skull size={20} />
                <div className="font-display tracking-widest text-lg">DESTROYED</div>
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
                  DIVE AGAIN
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
