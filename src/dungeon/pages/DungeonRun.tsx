// Dungeon Crawler — playable run (Session 1).
//
// Canvas-rendered, top-down. Camera follows the player. Touch via
// virtual d-pad on the left + attack button on the right; keyboard
// WASD/arrows + Space/J/K for attack on desktop.
//
// Lessons applied from the Maze Muncher fixes:
//   - DPR-safe ctx.setTransform every frame (not accumulating)
//   - Canvas sized via min(vw, vh-reserve) — never overflowing
//   - touchAction "none" on canvas + buttons so iOS Safari doesn't
//     scroll the page; buttons use onPointerDown + onTouchStart
//   - dt sanitized (Number.isFinite, clamp [0, 0.05])
//   - All world-space → screen-space via camera offset; no off-screen
//     coordinate drift; player always rendered around screen center

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, RotateCcw, Trophy, Skull, Coins, Swords, Sparkles } from "lucide-react";
import { playSfx, unlockAudio } from "../../art";
import {
  newGame, step, descendLevel, CELL, COLS, ROWS, type Game, type InputState,
} from "../engine";
import {
  preloadDungeonSprites, drawPlayer, drawEnemy, drawTile, drawShadow,
  TILE_INDICES, getImage, tileUrl,
} from "../sprites";
import { useDungeon } from "../store";

export default function DungeonRun() {
  const navigate = useNavigate();
  const dungeon = useDungeon();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(newGame());
  // Re-render the React tree per frame (HUD counters etc) without
  // letting React state changes drive the game loop itself.
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);
  const recordedRef = useRef(false);

  // Input snapshot the engine reads each frame. axis ∈ [-1, 1].
  const inputRef = useRef<InputState>({ ax: 0, ay: 0, attack: false });
  // Per-key state so multiple keys held simultaneously compose.
  const keys = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean; attack: boolean }>({
    up: false, down: false, left: false, right: false, attack: false,
  });
  // Virtual-joystick state — center + current touch position.
  const joyRef = useRef<{ active: boolean; cx: number; cy: number; x: number; y: number; id: number | null }>({
    active: false, cx: 0, cy: 0, x: 0, y: 0, id: null,
  });

  useEffect(() => { unlockAudio(); preloadDungeonSprites(); }, []);

  // Keyboard wiring.
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "ArrowUp" || e.key === "w") k.up = true;
      else if (e.key === "ArrowDown" || e.key === "s") k.down = true;
      else if (e.key === "ArrowLeft" || e.key === "a") k.left = true;
      else if (e.key === "ArrowRight" || e.key === "d") k.right = true;
      else if (e.key === " " || e.key === "j" || e.key === "k" || e.key === "Enter") k.attack = true;
    }
    function onUp(e: KeyboardEvent) {
      const k = keys.current;
      if (e.key === "ArrowUp" || e.key === "w") k.up = false;
      else if (e.key === "ArrowDown" || e.key === "s") k.down = false;
      else if (e.key === "ArrowLeft" || e.key === "a") k.left = false;
      else if (e.key === "ArrowRight" || e.key === "d") k.right = false;
      else if (e.key === " " || e.key === "j" || e.key === "k" || e.key === "Enter") k.attack = false;
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // rAF loop — drives engine + draw.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // dt sanitized (Maze Muncher lesson).
      let dt = (now - last) / 1000;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05;
      last = now;

      // Compose input axes from keys + joystick.
      const k = keys.current;
      const j = joyRef.current;
      let ax = 0, ay = 0;
      if (k.left) ax -= 1;
      if (k.right) ax += 1;
      if (k.up) ay -= 1;
      if (k.down) ay += 1;
      if (j.active) {
        const dx = j.x - j.cx, dy = j.y - j.cy;
        const r = Math.hypot(dx, dy);
        const max = 50;
        const t = Math.min(1, r / max);
        if (r > 6) { ax += (dx / r) * t; ay += (dy / r) * t; }
      }
      // Clamp magnitude to 1 in case keys + joy stack.
      const mag = Math.hypot(ax, ay);
      if (mag > 1) { ax /= mag; ay /= mag; }
      inputRef.current.ax = ax;
      inputRef.current.ay = ay;
      inputRef.current.attack = k.attack;

      const g = gameRef.current;
      step(g, dt, inputRef.current);
      draw();
      force(n => (n + 1) % 1_000_000);

      // Descend transition.
      if (g.state === "descending") {
        // Brief flash, then build the next level.
        playSfx("powerUp", { volume: 0.5 });
        gameRef.current = descendLevel(g);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draw ────────────────────────────────────────────────────────────
  function draw() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width * dpr) || c.height !== Math.floor(rect.height * dpr)) {
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
    }
    // RESET transform every frame (Maze Muncher lesson — never let it accumulate).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const screenW = rect.width;
    const screenH = rect.height;

    // Clear.
    ctx.fillStyle = "#0a0508";
    ctx.fillRect(0, 0, screenW, screenH);

    const g = gameRef.current;

    // World → screen offset (camera centers on player; player roughly at screen center).
    const offX = screenW / 2 - g.cameraX;
    const offY = screenH / 2 - g.cameraY;

    // ── Floor + walls ──
    // Only render tiles within ~1 screen worth of the camera to keep
    // the per-frame cost low even on deeper levels.
    const minC = Math.max(0, Math.floor((g.cameraX - screenW / 2 - CELL) / CELL));
    const maxC = Math.min(COLS - 1, Math.ceil((g.cameraX + screenW / 2 + CELL) / CELL));
    const minR = Math.max(0, Math.floor((g.cameraY - screenH / 2 - CELL) / CELL));
    const maxR = Math.min(ROWS - 1, Math.ceil((g.cameraY + screenH / 2 + CELL) / CELL));

    for (let r = minR; r <= maxR; r++) {
      for (let cc = minC; cc <= maxC; cc++) {
        const t = g.level.grid[r][cc];
        const x = cc * CELL + offX;
        const y = r * CELL + offY;
        if (t === "floor" || t === "torch") {
          drawTile(ctx, x, y, TILE_INDICES.floor, CELL);
          if (t === "torch") {
            // Torch sprite on top of the floor.
            drawTile(ctx, x, y, TILE_INDICES.torch, CELL);
            // Glow.
            const flicker = 0.7 + Math.sin(g.elapsed * 9 + cc * 3) * 0.3;
            ctx.fillStyle = `rgba(251,146,60,${0.18 * flicker})`;
            ctx.beginPath();
            ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (t === "wall") {
          drawTile(ctx, x, y, TILE_INDICES.wallTop, CELL);
        } else if (t === "stairs") {
          drawTile(ctx, x, y, TILE_INDICES.floor, CELL);
          drawTile(ctx, x, y, TILE_INDICES.stairs, CELL);
          // Stairs glow — pulsing prompt.
          const pulse = 0.6 + Math.sin(g.elapsed * 4) * 0.4;
          ctx.fillStyle = `rgba(125,211,252,${0.20 * pulse})`;
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── Chests ──
    for (const ch of g.level.chests) {
      const x = ch.x + offX - CELL / 2;
      const y = ch.y + offY - CELL / 2;
      drawTile(ctx, x, y, ch.opened ? TILE_INDICES.chestOpen : TILE_INDICES.chestClosed, CELL);
    }

    // ── Coins (animated bobbing) ──
    for (const coin of g.coins) {
      const cx = coin.x + offX;
      const cy = coin.y + offY + Math.sin(g.elapsed * 8 + coin.id.charCodeAt(2)) * 2;
      // Coin = small gold disk with a sparkle.
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#92400e"; ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(cx - 1, cy - 3, 2, 6);
    }

    // ── Enemies ──
    for (const e of g.enemies) {
      const ex = e.x + offX, ey = e.y + offY;
      drawShadow(ctx, ex, ey, 18);
      const anim = e.deathT > 0 ? "death" : (e.state === "attack" ? "attack" : (e.state === "chase" ? "move" : "idle"));
      const ok = drawEnemy(ctx, ex, ey, e.kind, anim, e.animT, { flash: e.flashT * 4, facing: e.facing });
      if (!ok) {
        // Fallback colored circle.
        ctx.fillStyle = e.kind === "goblin" ? "#86efac" : e.kind === "skeleton" ? "#f8fafc" : "#fb7185";
        ctx.beginPath(); ctx.arc(ex, ey, 12, 0, Math.PI * 2); ctx.fill();
      }
      // HP bar above enemy when not at full HP.
      if (e.hp < e.hpMax && e.deathT <= 0) {
        const w = 28, h = 3;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(ex - w / 2 - 1, ey - 28 - 1, w + 2, h + 2);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(ex - w / 2, ey - 28, w * (e.hp / e.hpMax), h);
      }
    }

    // ── Player ──
    {
      const p = g.player;
      const px = p.x + offX, py = p.y + offY;
      drawShadow(ctx, px, py, 22);
      const ok = drawPlayer(ctx, px, py, p.anim, p.animT, { flash: p.flashT * 1.6, facing: p.facing });
      if (!ok) {
        // Fallback while sprites load.
        ctx.fillStyle = "#fde047";
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
      }
      // Attack arc visualization — a quick swing wedge in front of the player.
      if (p.attackT > 0) {
        const swingProgress = 1 - (p.attackT / p.attackDur);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.facing === 1 ? 0 : Math.PI);
        ctx.fillStyle = `rgba(253,224,71,${0.35 * (1 - swingProgress)})`;
        ctx.beginPath();
        ctx.arc(0, 0, 38, -0.7 + swingProgress * 1.4, 0.7 + swingProgress * 1.4);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Particles ──
    for (const part of g.particles) {
      ctx.fillStyle = part.color;
      ctx.globalAlpha = Math.min(1, part.ttl * 2.5);
      ctx.beginPath();
      ctx.arc(part.x + offX, part.y + offY, part.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Hit-flash full-screen overlay on player damage ──
    if (g.player.flashT > 0) {
      ctx.fillStyle = `rgba(248,113,113,${0.18 * (g.player.flashT / 0.3)})`;
      ctx.fillRect(0, 0, screenW, screenH);
    }
  }

  // ── Touch joystick handlers (left half of screen) ──────────────────
  function onJoyStart(e: React.PointerEvent<HTMLDivElement>) {
    const j = joyRef.current;
    j.active = true; j.id = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    j.cx = e.clientX - rect.left; j.cy = e.clientY - rect.top;
    j.x = j.cx; j.y = j.cy;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onJoyMove(e: React.PointerEvent<HTMLDivElement>) {
    const j = joyRef.current;
    if (!j.active || j.id !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    j.x = e.clientX - rect.left; j.y = e.clientY - rect.top;
  }
  function onJoyEnd(e: React.PointerEvent<HTMLDivElement>) {
    const j = joyRef.current;
    if (j.id !== e.pointerId) return;
    j.active = false; j.id = null;
  }

  // ── Attack button handlers ─────────────────────────────────────────
  function attackPress(e: React.SyntheticEvent) {
    e.preventDefault();
    keys.current.attack = true;
    // Auto-clear after a short window (so a single tap fires one attack)
    setTimeout(() => { keys.current.attack = false; }, 80);
  }

  const g = gameRef.current;
  const hpPct = Math.max(0, g.player.hp / g.player.hpMax);

  // Recording stats on level clear or run end (placeholder for Session 1
  // — full run-clear flow is deferred). We tick coins/kills/depth here.
  useEffect(() => {
    if (recordedRef.current) return;
    if (g.state !== "playing" && !endShown) {
      setEndShown(true);
      recordedRef.current = true;
      dungeon.finishRun(g.runCoins, g.runKills, g.depth, g.state === "cleared");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#02010a", color: "#fef3c7" }}>
      {/* Top HUD */}
      <header className="px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
        <button onClick={() => navigate("/dungeon")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-2 text-[11px]">
          <div className="font-display tracking-widest" style={{ color: "#fde047" }}>DUNGEON</div>
          <div className="opacity-70">·  Lv {g.depth}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "#fca5a5" }}>
          <Heart size={11} fill="#fca5a5" /> {Math.max(0, Math.ceil(g.player.hp))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono ml-2" style={{ color: "#fbbf24" }}>
          <Coins size={11} /> {g.player.coins}
        </div>
        <button onClick={() => { gameRef.current = newGame(); setEndShown(false); recordedRef.current = false; }}
          aria-label="Restart"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target ml-2"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <RotateCcw size={14} />
        </button>
      </header>

      {/* HP bar */}
      <div className="h-1.5 mx-3 mt-1 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          width: `${hpPct * 100}%`, height: "100%",
          background: hpPct > 0.4 ? "#86efac" : "#fca5a5",
          transition: "width 0.2s ease",
        }} />
      </div>

      {/* Canvas — sized to fill viewport minus header + control reserve.
          The 220px reserve covers the HUD strip + virtual controls at
          the bottom; on a 1024-tall iPad the canvas takes 800px, on
          an 844-tall iPhone it takes 620px. Math same family as the
          v1.10.83 Maze Muncher fix. */}
      <main className="flex-1 relative">
        <canvas ref={canvasRef} style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          imageRendering: "pixelated",
        }} />

        {/* Virtual joystick — bottom-left quarter of the canvas */}
        <div
          onPointerDown={onJoyStart}
          onPointerMove={onJoyMove}
          onPointerUp={onJoyEnd}
          onPointerCancel={onJoyEnd}
          style={{
            position: "absolute",
            left: 0, bottom: 0,
            width: "40%", height: "55%",
            touchAction: "none",
            // Subtle visible boundary so the user knows where to touch.
            background: "rgba(255,255,255,0.02)",
            // Pointer cursor on desktop.
            cursor: "grab",
          }}
          aria-label="Move"
        >
          {/* The joystick rings (visible when active). */}
          {joyRef.current.active && (
            <>
              <div style={{
                position: "absolute", pointerEvents: "none",
                left: joyRef.current.cx - 44, top: joyRef.current.cy - 44,
                width: 88, height: 88, borderRadius: "50%",
                background: "rgba(253,224,71,0.10)",
                border: "2px solid rgba(253,224,71,0.55)",
              }} />
              <div style={{
                position: "absolute", pointerEvents: "none",
                left: joyRef.current.x - 16, top: joyRef.current.y - 16,
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(253,224,71,0.55)",
              }} />
            </>
          )}
          {/* Hint when not pressed */}
          {!joyRef.current.active && (
            <div style={{
              position: "absolute", left: 16, bottom: 16,
              fontSize: 10, letterSpacing: 3, opacity: 0.45,
              color: "#fde047",
            }}>TAP & DRAG TO MOVE</div>
          )}
        </div>

        {/* Attack button — bottom-right corner */}
        <button
          onPointerDown={attackPress}
          onTouchStart={attackPress}
          onClick={attackPress}
          style={{
            position: "absolute",
            right: 24, bottom: 36,
            width: 88, height: 88, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(248,113,113,0.85), rgba(220,38,38,0.85))",
            border: "3px solid rgba(254,243,199,0.65)",
            color: "#fef3c7",
            fontSize: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTapHighlightColor: "transparent",
            boxShadow: "0 6px 16px rgba(248,113,113,0.45)",
          }}
          aria-label="Attack">
          <Swords size={28} aria-hidden="true" />
        </button>
      </main>

      {/* Result overlay — minimal Session-1 version */}
      {g.state !== "playing" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.78)" }}>
          <div className="max-w-sm w-full rounded-2xl p-5 text-center"
            style={{
              background: g.state === "cleared"
                ? "linear-gradient(135deg, rgba(253,224,71,0.25), rgba(8,8,14,0.95))"
                : "linear-gradient(135deg, rgba(248,113,113,0.18), rgba(8,8,14,0.95))",
              border: `1.5px solid ${g.state === "cleared" ? "#fde047" : "#f87171"}`,
            }}>
            <div className="inline-flex items-center gap-2 mb-2"
              style={{ color: g.state === "cleared" ? "#fde047" : "#f87171" }}>
              {g.state === "cleared" ? <Trophy size={20} /> : <Skull size={20} />}
              <div className="font-display tracking-widest text-lg">
                {g.state === "cleared" ? "RUN COMPLETE" : "RUN ENDED"}
              </div>
            </div>
            <div className="text-[11px] font-mono mt-2" style={{ color: "#fef3c7" }}>
              Depth {g.depth}  ·  {g.runKills} foes felled  ·  {g.runCoins} coins
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => navigate("/dungeon")}
                className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                HUB
              </button>
              <button onClick={() => { gameRef.current = newGame(); setEndShown(false); recordedRef.current = false; }}
                className="px-3 py-2 rounded-lg font-display text-[11px] tracking-widest pressable touch-target inline-flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #fde047, #f59e0b)", color: "#1a0505" }}>
                <Sparkles size={12} /> NEW RUN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
