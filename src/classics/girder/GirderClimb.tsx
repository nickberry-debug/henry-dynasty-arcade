// Girder Climb — original "rolling barrels + ladders" platformer in the
// style of Donkey Kong. Tilt-themed: a runaway crane-truck dumps girders
// off the top of an unfinished skyscraper; the player climbs up four
// floors of girders to reach the rescue point. Girders bounce off
// floor ends, ladders let you climb. Touch one = lose a life.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Trophy, RotateCcw } from "lucide-react";
import { recordGameSession, getActiveProfileId } from "../../profiles/store";
import { playSfx, unlockAudio } from "../../art";

const W = 360, H = 600;
const G = 1000;            // gravity px/s^2
const PLAYER_R = 12;
const SPEED = 110;
const CLIMB = 80;
const JUMP_V = -340;
const FLOOR_H = 110;       // distance between girders
const FLOOR_THICK = 8;
const BARREL_R = 10;
const BARREL_SPAWN = 1.8;  // seconds

type Floor = { y: number; tilt: number; ladders: number[] };
type Barrel = { x: number; y: number; vx: number; vy: number; onFloor: number };

interface Game {
  player: { x: number; y: number; vy: number; onLadder: boolean; onFloor: number };
  barrels: Barrel[];
  spawnT: number;
  elapsed: number;
  lives: number;
  score: number;
  state: "playing" | "won" | "lost";
  hitT: number; // invuln after hit
}

const FLOORS: Floor[] = [
  // bottom -> top
  { y: H - 60,  tilt:  0.04, ladders: [90, 220] },
  { y: H - 170, tilt: -0.04, ladders: [60, 250] },
  { y: H - 280, tilt:  0.04, ladders: [120, 280] },
  { y: H - 390, tilt: -0.04, ladders: [80, 200] },
  { y: H - 500, tilt:  0.00, ladders: [] }, // top platform
];

const GOAL = { x: 180, y: H - 520, r: 16 };

function newGame(): Game {
  return {
    player: { x: 30, y: H - 80, vy: 0, onLadder: false, onFloor: 0 },
    barrels: [],
    spawnT: 0.6,
    elapsed: 0,
    lives: 3,
    score: 0,
    state: "playing",
    hitT: 0,
  };
}

function floorYAt(f: Floor, x: number): number {
  // tilt is slope: floor center at H/2, rise/run = tilt
  return f.y + (x - W / 2) * f.tilt;
}

function onLadderAt(f: Floor, x: number, y: number): boolean {
  if (f.ladders.length === 0) return false;
  for (const lx of f.ladders) {
    if (Math.abs(x - lx) < 14) {
      const upperY = FLOORS[FLOORS.indexOf(f) + 1]?.y ?? f.y - FLOOR_H;
      if (y >= upperY - 6 && y <= f.y + 6) return true;
    }
  }
  return false;
}

function step(g: Game, dt: number, input: { dx: number; dy: number; jump: boolean }) {
  if (g.state !== "playing") return;
  g.elapsed += dt;
  if (g.hitT > 0) g.hitT -= dt;

  const p = g.player;
  // Detect if standing on a girder for the current floor
  const curFloor = FLOORS[p.onFloor];
  const fy = curFloor ? floorYAt(curFloor, p.x) : H - 60;

  // Climbing logic
  const fAtPlayer = FLOORS[p.onFloor];
  const fAbove = FLOORS[p.onFloor + 1];
  const onLadderHere = fAtPlayer ? onLadderAt(fAtPlayer, p.x, p.y) :
    fAbove ? onLadderAt(fAbove, p.x, p.y) : false;

  if (onLadderHere && Math.abs(input.dy) > 0.1) {
    p.onLadder = true;
    p.vy = 0;
  }
  if (p.onLadder) {
    p.y += input.dy * CLIMB * dt;
    // Stepping off ladder onto next floor
    const aboveY = fAbove ? floorYAt(fAbove, p.x) : H - 500;
    if (p.y <= aboveY) {
      p.y = aboveY - PLAYER_R;
      p.onLadder = false;
      p.onFloor = Math.min(FLOORS.length - 1, p.onFloor + 1);
      p.vy = 0;
    }
    if (p.y >= fy - PLAYER_R) {
      p.y = fy - PLAYER_R;
      p.onLadder = false;
    }
    // horizontal nudge allowed on ladder
    p.x += input.dx * SPEED * 0.6 * dt;
  } else {
    // Walking on girder
    p.x += input.dx * SPEED * dt;
    p.vy += G * dt;
    p.y += p.vy * dt;
    if (p.y >= fy - PLAYER_R) {
      p.y = fy - PLAYER_R;
      p.vy = 0;
      if (input.jump) { p.vy = JUMP_V; playSfx("blip", { volume: 0.4, pitch: 1.3 }); }
    }
  }
  p.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x));

  // Check goal
  if (Math.hypot(p.x - GOAL.x, p.y - GOAL.y) < GOAL.r + PLAYER_R) {
    g.state = "won";
    playSfx("voYouWin", { volume: 0.9 });
    g.score += 1000 + Math.max(0, 300 - Math.floor(g.elapsed * 5));
    return;
  }

  // Spawn barrels at top
  g.spawnT -= dt;
  if (g.spawnT <= 0) {
    g.spawnT = BARREL_SPAWN + Math.random() * 0.8;
    const topF = FLOORS[FLOORS.length - 2];
    g.barrels.push({
      x: 20, y: floorYAt(topF, 20) - BARREL_R,
      vx: 60 + Math.random() * 30, vy: 0,
      onFloor: FLOORS.length - 2,
    });
  }

  // Barrels physics — roll down floors, fall off ends, switch floor on drop
  for (let i = g.barrels.length - 1; i >= 0; i--) {
    const b = g.barrels[i];
    const f = FLOORS[b.onFloor];
    if (!f) { g.barrels.splice(i, 1); continue; }
    // Tilt pulls barrel; combined with current velocity
    const direction = f.tilt >= 0 ? 1 : -1;
    b.vx += direction * 60 * dt;
    b.vx = Math.max(-160, Math.min(160, b.vx));
    b.x += b.vx * dt;
    const targetY = floorYAt(f, b.x) - BARREL_R;
    if (b.y < targetY - 1) {
      b.vy += G * dt;
      b.y += b.vy * dt;
      if (b.y >= targetY) { b.y = targetY; b.vy = 0; }
    } else {
      b.y = targetY;
      b.vy = 0;
    }
    // Fall off end of girder
    const offLeft = b.x < 6 && f.tilt < 0;
    const offRight = b.x > W - 6 && f.tilt > 0;
    if (offLeft || offRight) {
      // Drop to next floor below
      const nextIdx = b.onFloor - 1;
      if (nextIdx < 0) { g.barrels.splice(i, 1); continue; }
      b.onFloor = nextIdx;
      b.vy = 50;
      b.x = offLeft ? 12 : W - 12;
      b.vx = offLeft ? 60 : -60;
    }
    // Collide player
    if (g.hitT <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < BARREL_R + PLAYER_R - 2) {
      g.lives -= 1;
      g.hitT = 1.2;
      playSfx("playerHurt", { volume: 0.7 });
      if (g.lives <= 0) { g.state = "lost"; playSfx("voGameOver", { volume: 0.9 }); }
    }
    // Bonus for hopping a barrel (player Y above barrel and they cross horizontally)
    const bx = b as Barrel & { hopAwarded?: boolean };
    if (!bx.hopAwarded && p.y < b.y - PLAYER_R && Math.abs(b.x - p.x) < 8) {
      bx.hopAwarded = true;
      g.score += 50;
      playSfx("ding", { volume: 0.5, pitch: 1.4 });
    }
    // Cull off-screen
    if (b.y > H + 20) g.barrels.splice(i, 1);
  }
}

export default function GirderClimb() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(newGame());
  const inputRef = useRef({ dx: 0, dy: 0, jump: false });
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
      inputRef.current.dx = dx;
      inputRef.current.dy = dy;
    }
    function down(e: KeyboardEvent) {
      keys.add(e.key);
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") inputRef.current.jump = true;
      sync();
    }
    function up(e: KeyboardEvent) { keys.delete(e.key); sync(); }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      step(g, dt, inputRef.current);
      inputRef.current.jump = false;
      draw();
      force(n => n + 1);
      if ((g.state === "won" || g.state === "lost") && !endShown) {
        setEndShown(true);
        const pid = getActiveProfileId();
        if (pid) recordGameSession(pid, "girder", {
          sessions: 1, wins: g.state === "won" ? 1 : 0, losses: g.state === "won" ? 0 : 1,
          seconds: Math.round(g.elapsed), level: g.score,
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

    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, "#0a0814");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // City silhouette
    ctx.fillStyle = "#1a1a2e";
    for (let i = 0; i < 8; i++) {
      const bx = i * 50, bw = 30 + (i * 7) % 18, bh = 60 + (i * 13) % 80;
      ctx.fillRect(bx, H - bh - 40, bw, bh);
      // windows
      ctx.fillStyle = "#fde047";
      for (let wy = H - bh - 36; wy < H - 44; wy += 12) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
          if ((wx + wy) % 17 < 8) ctx.fillRect(wx, wy, 3, 5);
        }
      }
      ctx.fillStyle = "#1a1a2e";
    }

    const g = gameRef.current;

    // Girders
    FLOORS.forEach((f, i) => {
      ctx.save();
      ctx.translate(W / 2, f.y);
      ctx.rotate(f.tilt);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-W / 2 + 4, -FLOOR_THICK / 2, W - 8, FLOOR_THICK);
      // rivets
      ctx.fillStyle = "#7f1d1d";
      for (let x = -W / 2 + 14; x < W / 2 - 8; x += 22) {
        ctx.beginPath(); ctx.arc(x, 0, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // Ladders rising to next floor
      const nf = FLOORS[i + 1];
      if (nf) {
        for (const lx of f.ladders) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx - 6, floorYAt(f, lx)); ctx.lineTo(lx - 6, floorYAt(nf, lx));
          ctx.moveTo(lx + 6, floorYAt(f, lx)); ctx.lineTo(lx + 6, floorYAt(nf, lx));
          ctx.stroke();
          for (let ly = floorYAt(f, lx) - 10; ly > floorYAt(nf, lx); ly -= 14) {
            ctx.beginPath(); ctx.moveTo(lx - 6, ly); ctx.lineTo(lx + 6, ly); ctx.stroke();
          }
        }
      }
    });

    // Goal — rescue beacon
    const beacon = Math.sin(g.elapsed * 4) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(253,224,71,${0.4 + beacon * 0.5})`;
    ctx.beginPath(); ctx.arc(GOAL.x, GOAL.y, GOAL.r + 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fde047"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5;
    ctx.fillRect(GOAL.x - 10, GOAL.y - 14, 20, 28);
    ctx.strokeRect(GOAL.x - 10, GOAL.y - 14, 20, 28);
    ctx.fillStyle = "#f87171"; ctx.fillRect(GOAL.x - 7, GOAL.y - 11, 14, 4);
    ctx.font = "10px system-ui"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText("SOS", GOAL.x, GOAL.y + 3);

    // Barrels
    for (const b of g.barrels) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.x * 0.08) % (Math.PI * 2));
      ctx.fillStyle = "#a16207"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, BARREL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-BARREL_R, -2); ctx.lineTo(BARREL_R, -2);
      ctx.moveTo(-BARREL_R, 2); ctx.lineTo(BARREL_R, 2); ctx.stroke();
      ctx.restore();
    }

    // Player
    const p = g.player;
    const flash = g.hitT > 0 && Math.floor(g.hitT * 10) % 2 === 0;
    ctx.fillStyle = flash ? "rgba(0,0,0,0)" : "#86efac";
    ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y - 4, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = flash ? "rgba(0,0,0,0)" : "#34d399";
    ctx.fillRect(p.x - 7, p.y - 2, 14, 12);
    ctx.strokeRect(p.x - 7, p.y - 2, 14, 12);
    // legs
    ctx.fillStyle = flash ? "rgba(0,0,0,0)" : "#1a1a1a";
    ctx.fillRect(p.x - 5, p.y + 9, 3, 4);
    ctx.fillRect(p.x + 2, p.y + 9, 3, 4);
    // eye
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x + 2, p.y - 5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.arc(p.x + 2.5, p.y - 5, 0.9, 0, Math.PI * 2); ctx.fill();
  }

  const g = gameRef.current;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050308" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="font-display text-[11px] tracking-widest" style={{ color: "#dc2626" }}>GIRDER CLIMB</div>
          <div className="flex items-center gap-1 text-[11px] font-mono" style={{ color: "#f87171" }}>
            {Array.from({ length: g.lives }).map((_, i) => <Heart key={i} size={10} />)}
          </div>
          <div className="text-[11px] font-mono" style={{ color: "#fde047" }}>SCORE {g.score}</div>
        </div>
        <button onClick={() => { gameRef.current = newGame(); setEndShown(false); }} aria-label="Restart"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <RotateCcw size={14} />
        </button>
      </header>

      <main className="flex-1 relative flex items-center justify-center">
        <canvas ref={canvasRef} style={{ width: "min(100%, 360px)", aspectRatio: `${W}/${H}` }} />

        {/* Touch controls */}
        <div className="absolute left-2 bottom-2 grid grid-cols-3 gap-1" style={{ width: 150 }}>
          <div />
          <TouchBtn label="▲" onDown={() => inputRef.current.dy = -1} onUp={() => inputRef.current.dy = 0} />
          <TouchBtn label="↑" onDown={() => inputRef.current.jump = true} onUp={() => {}} />
          <TouchBtn label="◀" onDown={() => inputRef.current.dx = -1} onUp={() => inputRef.current.dx = 0} />
          <TouchBtn label="▼" onDown={() => inputRef.current.dy = 1} onUp={() => inputRef.current.dy = 0} />
          <TouchBtn label="▶" onDown={() => inputRef.current.dx = 1} onUp={() => inputRef.current.dx = 0} />
        </div>

        {(g.state === "won" || g.state === "lost") && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="max-w-xs w-full rounded-2xl p-5 text-center"
              style={{
                background: g.state === "won" ? "linear-gradient(135deg, rgba(134,239,172,0.2), rgba(8,8,14,0.95))" : "linear-gradient(135deg, rgba(248,113,113,0.2), rgba(8,8,14,0.95))",
                border: `1.5px solid ${g.state === "won" ? "#86efac" : "#f87171"}`,
              }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: g.state === "won" ? "#86efac" : "#f87171" }}>
                <Trophy size={20} />
                <div className="font-display tracking-widest text-lg">{g.state === "won" ? "RESCUED!" : "FELL"}</div>
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
                  style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "#1a0505" }}>
                  CLIMB AGAIN
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TouchBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={(e) => { e.preventDefault(); onUp(); }}
      onPointerCancel={() => onUp()}
      onPointerLeave={() => onUp()}
      className="rounded-full font-mono text-[14px] touch-target"
      style={{
        height: 44, background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.25)", color: "#fef3c7",
        touchAction: "none",
      }}>
      {label}
    </button>
  );
}
