// Maze Muncher — original Pac-Man-lineage maze chase. Player gobbles
// pellets in a grid maze while ghosts roam. Big pellets in corners turn
// ghosts vulnerable for 6 seconds — eat them for bonus points. Three
// lives. Clear all pellets to win.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, RotateCcw, Trophy, Skull } from "lucide-react";
import { recordGameSession, getActiveProfileId } from "../../profiles/store";
import { playSfx, unlockAudio } from "../../art";

// 21 cols x 23 rows grid. '#' wall, '.' pellet, 'o' power pellet, ' '
// empty, 'P' player start, 'G' ghost pen.
const MAZE = [
  "#####################",
  "#o........#........o#",
  "#.##.####.#.####.##.#",
  "#...................#",
  "#.##.#.#######.#.##.#",
  "#....#....#....#....#",
  "####.### ### ###.####",
  "   #.#         #.#   ",
  "####.# ##GGG## #.####",
  "    .  #GGGGG#  .    ",
  "####.# ####### #.####",
  "   #.#         #.#   ",
  "####.# ####### #.####",
  "#.........#.........#",
  "#.##.####.#.####.##.#",
  "#o..#............#..o",
  "###.#.#.#######.#.#.#",
  "#.....#....#....#...#",
  "#.########.#.########",
  "#.........P.........#",
  "#.##.####.#.####.##.#",
  "#...................#",
  "#####################",
];

const COLS = MAZE[0].length;
const ROWS = MAZE.length;
const CELL = 16;
const W = COLS * CELL, H = ROWS * CELL;

type Cell = "wall" | "pellet" | "power" | "empty" | "pen";

interface Ghost { x: number; y: number; dx: number; dy: number; color: string; mode: "chase" | "scatter" | "scared" | "eaten"; }
interface Player { x: number; y: number; dx: number; dy: number; wantDx: number; wantDy: number; }
interface Game {
  grid: Cell[][];
  pelletsLeft: number;
  player: Player;
  ghosts: Ghost[];
  score: number;
  lives: number;
  scaredT: number;
  elapsed: number;
  state: "playing" | "won" | "lost";
  hitT: number;
}

function parseMaze(): { grid: Cell[][]; spawn: { x: number; y: number }; pelletsLeft: number } {
  const grid: Cell[][] = [];
  let spawn = { x: 0, y: 0 };
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c];
      if (ch === "#") row.push("wall");
      else if (ch === ".") row.push("pellet");
      else if (ch === "o") row.push("power");
      else if (ch === "G") row.push("pen");
      else if (ch === "P") { row.push("empty"); spawn = { x: c, y: r }; }
      else row.push("empty");
    }
    grid.push(row);
  }
  // Patch dead-ends so the maze is loopy (Pac-Man-style — no trap
  // corridors). Up to 4 passes since opening one wall can create new
  // dead-ends or eliminate them at distance. Tunnel-edge cells on
  // row 9 are excluded — they're the legitimate wrap-around exits.
  const isOpen = (x: number, y: number) =>
    y >= 0 && y < ROWS && x >= 0 && x < COLS && grid[y][x] !== "wall";
  const TUNNEL_ROW = 9;
  const isTunnelEdge = (x: number, y: number) =>
    y === TUNNEL_ROW && (x === 0 || x === COLS - 1);
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        if (!isOpen(x, y) || isTunnelEdge(x, y)) continue;
        // Skip ghost-pen interior — `pen` cells are walkable only by
        // eaten ghosts returning home; they're not gameplay dead ends.
        if (grid[y][x] === "pen") continue;
        const nb: [number, number][] = [];
        if (isOpen(x, y - 1)) nb.push([x, y - 1]);
        if (isOpen(x, y + 1)) nb.push([x, y + 1]);
        if (isOpen(x - 1, y)) nb.push([x - 1, y]);
        if (isOpen(x + 1, y)) nb.push([x + 1, y]);
        if (nb.length > 1) continue;
        // Pick a wall neighbour to open. Prefer one that isn't on the
        // grid border so we don't accidentally turn the outer wall
        // into a non-tunnel hole.
        const wallNb: [number, number][] = [];
        if (!isOpen(x, y - 1) && y - 1 > 0) wallNb.push([x, y - 1]);
        if (!isOpen(x, y + 1) && y + 1 < ROWS - 1) wallNb.push([x, y + 1]);
        if (!isOpen(x - 1, y) && x - 1 > 0) wallNb.push([x - 1, y]);
        if (!isOpen(x + 1, y) && x + 1 < COLS - 1) wallNb.push([x + 1, y]);
        if (wallNb.length === 0) continue;
        // Prefer the wall opposite to the existing neighbour so the
        // loop forms along the original corridor direction.
        let chosen: [number, number] = wallNb[0];
        if (nb.length === 1) {
          const [nx, ny] = nb[0];
          const opposite: [number, number] = [2 * x - nx, 2 * y - ny];
          const found = wallNb.find(([wx, wy]) => wx === opposite[0] && wy === opposite[1]);
          if (found) chosen = found;
        }
        grid[chosen[1]][chosen[0]] = "pellet";
        changed = true;
      }
    }
    if (!changed) break;
  }
  // Count pellets AFTER patching (newly-opened cells become pellets).
  let pelletsLeft = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === "pellet" || grid[r][c] === "power") pelletsLeft++;
    }
  }
  return { grid, spawn, pelletsLeft };
}

function newGame(): Game {
  const { grid, spawn, pelletsLeft } = parseMaze();
  // Ghost spawns inside the pen
  const ghosts: Ghost[] = [
    { x: 10 * CELL + CELL / 2, y: 8 * CELL + CELL / 2, dx: 0, dy: -1, color: "#f87171", mode: "scatter" },
    { x: 9  * CELL + CELL / 2, y: 9 * CELL + CELL / 2, dx: -1, dy: 0, color: "#f9a8d4", mode: "scatter" },
    { x: 11 * CELL + CELL / 2, y: 9 * CELL + CELL / 2, dx: 1, dy: 0, color: "#67e8f9", mode: "scatter" },
    { x: 10 * CELL + CELL / 2, y: 9 * CELL + CELL / 2, dx: 0, dy: 1, color: "#fb923c", mode: "scatter" },
  ];
  return {
    grid,
    pelletsLeft,
    player: { x: spawn.x * CELL + CELL / 2, y: spawn.y * CELL + CELL / 2, dx: -1, dy: 0, wantDx: -1, wantDy: 0 },
    ghosts,
    score: 0, lives: 3, scaredT: 0, elapsed: 0, state: "playing", hitT: 0,
  };
}

function cellAt(g: Game, x: number, y: number): Cell | null {
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return g.grid[r][c];
}

function isWall(g: Game, x: number, y: number): boolean {
  // CRITICAL: treat OUT-OF-BOUNDS as wall, not as passable. Previously
  // cellAt returned null off-grid, and `cellAt() === "wall"` is false for
  // null → canMove let entities drift off the playfield. The horizontal
  // tunnel wrap caught most cases but on slow frames (iPad rAF lag, dt
  // cap = 50ms × speed = 60 = 3px/step that can land just past the wrap
  // trigger) the player could end up several pixels outside the
  // expected wrap-snap and then NOT match `p.x < 0` cleanly. Treating
  // off-grid as wall means canMove will only ever allow movement INTO
  // valid grid cells; the tunnel wrap below is responsible for crossing
  // the edge, and it now does so symmetrically and pre-emptively.
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  // NaN coords (from a corrupt dt or input) compare false in every
  // direction — explicitly reject them as walls so they can't index
  // into the grid as g.grid[NaN][NaN].
  if (!Number.isFinite(c) || !Number.isFinite(r)) return true;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return g.grid[r][c] === "wall";
}

function canMove(g: Game, e: { x: number; y: number; dx: number; dy: number }, speed: number): boolean {
  const r = 6;
  const nx = e.x + e.dx * speed, ny = e.y + e.dy * speed;
  // Check the leading edge corners
  return !isWall(g, nx + r * e.dx + 1 * (e.dy ? 1 : 0), ny + r * e.dy + 1 * (e.dx ? 1 : 0))
      && !isWall(g, nx + r * e.dx - 1 * (e.dy ? 1 : 0), ny + r * e.dy - 1 * (e.dx ? 1 : 0));
}

function atCellCenter(x: number, y: number): boolean {
  const fx = (x % CELL), fy = (y % CELL);
  return Math.abs(fx - CELL / 2) < 1.5 && Math.abs(fy - CELL / 2) < 1.5;
}

function step(g: Game, dt: number) {
  if (g.state !== "playing") return;
  g.elapsed += dt;
  g.hitT = Math.max(0, g.hitT - dt);
  g.scaredT = Math.max(0, g.scaredT - dt);
  if (g.scaredT === 0) {
    for (const gh of g.ghosts) if (gh.mode === "scared") gh.mode = "chase";
  }

  const speed = 60 * dt;

  // Player turn buffering — try desired direction at the next center
  const p = g.player;

  // INSTANT REVERSAL: if the player wants to go the opposite way they're
  // currently going, apply that immediately. Real Pac-Man does this —
  // it makes controls feel snappy. No grid alignment needed for a
  // straight reversal because the player is already on the lane.
  if (p.wantDx === -p.dx && p.wantDx !== 0) { p.dx = p.wantDx; p.dy = p.wantDy; }
  else if (p.wantDy === -p.dy && p.wantDy !== 0) { p.dx = p.wantDx; p.dy = p.wantDy; }

  // Turn evaluation gates: a perpendicular turn needs grid alignment.
  // Fire the turn check when EITHER:
  //   (a) the player is near a cell center (normal turn opportunity), OR
  //   (b) the player is blocked by a wall in the current direction
  //       (without this, a player stuck at a wall sits in a tolerance
  //       dead-zone — p.x % CELL ≈ 6 after canMove halts them — where
  //       atCellCenter is false, so the turn block never evaluates and
  //       inputs do nothing. This was the iPad "controls dead" bug.)
  const canKeepMoving = canMove(g, p, speed);
  const atCenter = atCellCenter(p.x, p.y);
  if (atCenter || !canKeepMoving) {
    // Direction-change snap ONLY: align the player to the current
    // cell's center before turning, so the new direction starts from
    // a clean grid position. Math.floor (not Math.round): at an exact
    // center coord like x=24, round(24/16)=round(1.5)=2 would warp to
    // col 2 (one tile off); floor(24/16)=1 correctly keeps the player
    // at col 1.
    if (p.wantDx !== p.dx || p.wantDy !== p.dy) {
      const snapX = Math.floor(p.x / CELL) * CELL + CELL / 2;
      const snapY = Math.floor(p.y / CELL) * CELL + CELL / 2;
      if (canMove(g, { x: snapX, y: snapY, dx: p.wantDx, dy: p.wantDy }, speed)) {
        p.x = snapX; p.y = snapY;
        p.dx = p.wantDx; p.dy = p.wantDy;
      }
    }
    // PRE-EMPTIVE TUNNEL WRAP: only meaningful when actually at a cell
    // center — not when stuck against a wall. If the player is at the
    // cell-center of a tunnel-edge cell and pointed at the off-grid
    // edge, snap them to the opposite edge BEFORE canMove sees the
    // off-grid coord as a wall.
    if (atCenter) {
      const pc = Math.floor(p.x / CELL), pr = Math.floor(p.y / CELL);
      if (pr >= 0 && pr < ROWS) {
        if (pc === 0 && p.dx === -1 && g.grid[pr][COLS - 1] !== "wall") {
          p.x = (COLS - 1) * CELL + CELL / 2;
        } else if (pc === COLS - 1 && p.dx === 1 && g.grid[pr][0] !== "wall") {
          p.x = CELL / 2;
        }
      }
    }
  }
  if (canMove(g, p, speed)) {
    p.x += p.dx * speed;
    p.y += p.dy * speed;
  }
  // Defensive clamp — the player should never end up off-grid (the
  // new isWall + pre-emptive wrap together guarantee this in normal
  // play). This catch-net handles any frame-timing edge case so the
  // player is ALWAYS in the visible playfield.
  if (p.x < CELL / 2) p.x = CELL / 2;
  else if (p.x > W - CELL / 2) p.x = W - CELL / 2;
  if (p.y < CELL / 2) p.y = CELL / 2;
  else if (p.y > H - CELL / 2) p.y = H - CELL / 2;

  // Eat pellets
  const pc = Math.floor(p.x / CELL), pr = Math.floor(p.y / CELL);
  if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS) {
    const cell = g.grid[pr][pc];
    if (cell === "pellet") {
      g.grid[pr][pc] = "empty"; g.pelletsLeft--; g.score += 10;
      playSfx("blip", { volume: 0.18, pitch: 1 + (g.pelletsLeft % 2) * 0.1 });
    } else if (cell === "power") {
      g.grid[pr][pc] = "empty"; g.pelletsLeft--; g.score += 50;
      // 12-second vulnerable window (was 6s). Last 4 seconds flash
      // as a "ghosts about to revert" warning — see render block.
      g.scaredT = 12;
      for (const gh of g.ghosts) if (gh.mode !== "eaten") gh.mode = "scared";
      playSfx("powerUp", { volume: 0.6 });
    }
  }
  if (g.pelletsLeft <= 0) { g.state = "won"; g.score += 500; playSfx("voYouWin", { volume: 0.9 }); return; }

  // Ghost AI — simple: at each cell center pick the direction (not
  // back the way they came) that minimizes/maximizes distance to player.
  for (const gh of g.ghosts) {
    const gSpeed = (gh.mode === "scared" ? 38 : gh.mode === "eaten" ? 110 : 55) * dt;
    if (atCellCenter(gh.x, gh.y)) {
      // Direction-pick snap. Same rationale as the player snap above:
      // only fire when the ghost is choosing a new direction, and use
      // Math.floor so we don't warp +1 tile at exact centers.
      const snapX = Math.floor(gh.x / CELL) * CELL + CELL / 2;
      const snapY = Math.floor(gh.y / CELL) * CELL + CELL / 2;
      const opts = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
      ].filter(([dx, dy]) =>
        !(dx === -gh.dx && dy === -gh.dy) &&
        canMove(g, { x: gh.x, y: gh.y, dx, dy }, gSpeed)
      );
      if (opts.length > 0) {
        const target = gh.mode === "eaten"
          ? { x: 10 * CELL + CELL / 2, y: 9 * CELL + CELL / 2 }
          : { x: p.x, y: p.y };
        const wantClose = gh.mode === "chase" || gh.mode === "eaten";
        let best = opts[0], bestD = wantClose ? Infinity : -Infinity;
        for (const [dx, dy] of opts) {
          const nx = gh.x + dx * CELL, ny = gh.y + dy * CELL;
          const d = Math.hypot(nx - target.x, ny - target.y);
          if (wantClose ? d < bestD : d > bestD) { bestD = d; best = [dx, dy]; }
        }
        // Commit direction + align to cell center for clean turning.
        gh.x = snapX; gh.y = snapY;
        gh.dx = best[0]; gh.dy = best[1];
      } else if (canMove(g, { x: gh.x, y: gh.y, dx: -gh.dx, dy: -gh.dy }, gSpeed)) {
        gh.x = snapX; gh.y = snapY;
        gh.dx = -gh.dx; gh.dy = -gh.dy;
      }
    }
    if (canMove(g, gh, gSpeed)) {
      gh.x += gh.dx * gSpeed;
      gh.y += gh.dy * gSpeed;
    }
    // Eaten ghost reaches pen → respawn
    if (gh.mode === "eaten" && Math.hypot(gh.x - (10 * CELL + CELL / 2), gh.y - (9 * CELL + CELL / 2)) < 4) {
      gh.mode = "chase";
    }
    // Collide player
    if (g.hitT === 0 && Math.hypot(gh.x - p.x, gh.y - p.y) < 10) {
      if (gh.mode === "scared") {
        gh.mode = "eaten"; g.score += 200;
        playSfx("ding", { volume: 0.8, pitch: 1.4 });
      } else if (gh.mode !== "eaten") {
        g.lives -= 1;
        g.hitT = 1.5;
        playSfx("playerHurt", { volume: 0.7 });
        // Reset player + ghosts
        p.x = 10 * CELL + CELL / 2;
        p.y = 19 * CELL + CELL / 2;
        p.dx = -1; p.dy = 0; p.wantDx = -1; p.wantDy = 0;
        for (const gh2 of g.ghosts) {
          gh2.x = 10 * CELL + CELL / 2;
          gh2.y = 9 * CELL + CELL / 2;
          gh2.mode = "scatter";
        }
        if (g.lives <= 0) { g.state = "lost"; playSfx("voGameOver", { volume: 0.9 }); }
        return;
      }
    }
  }
}

export default function MazeMuncher() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(newGame());
  const [, force] = useState(0);
  const [endShown, setEndShown] = useState(false);

  useEffect(() => { unlockAudio(); }, []);

  useEffect(() => {
    function set(dx: number, dy: number) {
      const g = gameRef.current;
      g.player.wantDx = dx; g.player.wantDy = dy;
    }
    function down(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") set(-1, 0);
      else if (e.key === "ArrowRight" || e.key === "d") set(1, 0);
      else if (e.key === "ArrowUp" || e.key === "w") set(0, -1);
      else if (e.key === "ArrowDown" || e.key === "s") set(0, 1);
    }
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // dt clamped to [0, 0.05] — negative dt (clock skew, NaN) could
      // reverse motion or corrupt coords; >50ms steps would let the
      // player skip across cells faster than canMove can gate.
      let dt = (now - last) / 1000;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05;
      last = now;
      step(gameRef.current, dt);
      draw();
      force(n => n + 1);
      const g = gameRef.current;
      if ((g.state === "won" || g.state === "lost") && !endShown) {
        setEndShown(true);
        const pid = getActiveProfileId();
        if (pid) recordGameSession(pid, "mazemuncher", {
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

    const g = gameRef.current;
    ctx.fillStyle = "#050314";
    ctx.fillRect(0, 0, W, H);

    // Walls + pellets
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g.grid[r][c];
        const x = c * CELL, y = r * CELL;
        if (cell === "wall") {
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          ctx.strokeStyle = "#4338ca";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        } else if (cell === "pellet") {
          ctx.fillStyle = "#fde047";
          ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 1.8, 0, Math.PI * 2); ctx.fill();
        } else if (cell === "power") {
          const pulse = 0.7 + Math.sin(g.elapsed * 6) * 0.3;
          ctx.fillStyle = "#fde047";
          ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 4 * pulse, 0, Math.PI * 2); ctx.fill();
        } else if (cell === "pen") {
          ctx.fillStyle = "#312e81";
          ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // Ghosts
    for (const gh of g.ghosts) {
      // Flash the last 4 seconds — wider warning since the vulnerable
      // window itself is now 12s (was 6s/2s). Toggles ~5/sec.
      const blink = g.scaredT > 0 && g.scaredT < 4 && Math.floor(g.scaredT * 5) % 2 === 0;
      const color = gh.mode === "eaten" ? "rgba(255,255,255,0.18)"
        : gh.mode === "scared" ? (blink ? "#fff" : "#3b82f6")
        : gh.color;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(gh.x, gh.y - 1, 7, Math.PI, 0);
      ctx.lineTo(gh.x + 7, gh.y + 6);
      ctx.lineTo(gh.x + 4, gh.y + 4);
      ctx.lineTo(gh.x + 2, gh.y + 6);
      ctx.lineTo(gh.x, gh.y + 4);
      ctx.lineTo(gh.x - 2, gh.y + 6);
      ctx.lineTo(gh.x - 4, gh.y + 4);
      ctx.lineTo(gh.x - 7, gh.y + 6);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(gh.x - 2.5, gh.y - 1, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gh.x + 2.5, gh.y - 1, 2, 0, Math.PI * 2); ctx.fill();
      if (gh.mode !== "eaten") {
        ctx.fillStyle = "#0a0a1a";
        ctx.beginPath(); ctx.arc(gh.x - 2.5 + gh.dx * 0.8, gh.y - 1 + gh.dy * 0.8, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(gh.x + 2.5 + gh.dx * 0.8, gh.y - 1 + gh.dy * 0.8, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Player (Muncher)
    const p = g.player;
    const angle = Math.atan2(p.dy, p.dx);
    const mouth = Math.abs(Math.sin(g.elapsed * 10)) * 0.6;
    ctx.fillStyle = g.hitT > 0 && Math.floor(g.hitT * 8) % 2 === 0 ? "rgba(0,0,0,0)" : "#fde047";
    ctx.strokeStyle = "#a16207"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, 7, angle + mouth, angle + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  const g = gameRef.current;

  function setDir(dx: number, dy: number) {
    g.player.wantDx = dx; g.player.wantDy = dy;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#02010a" }}>
      <header className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.5)" }}>
        <button onClick={() => navigate("/")} aria-label="Quit"
          className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="font-display text-[11px] tracking-widest" style={{ color: "#fde047" }}>MAZE MUNCHER</div>
          <div className="flex items-center gap-1 text-[11px] font-mono" style={{ color: "#86efac" }}>
            {Array.from({ length: g.lives }).map((_, i) => <Heart key={i} size={10} />)}
          </div>
          <div className="text-[11px] font-mono" style={{ color: "#fde047" }}>{g.score}</div>
        </div>
        <button onClick={() => { gameRef.current = newGame(); setEndShown(false); }}
          aria-label="Restart" className="w-9 h-9 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>
          <RotateCcw size={14} />
        </button>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center px-2 py-2 gap-3">
        {/*
          Canvas sized to fill the screen at any device size. Width is
          min(96vw, calc((100dvh - 240px) * 21/23), 640px). 21/23 is
          the maze aspect ratio (COLS/ROWS) — keeps the canvas tall
          enough to actually fit the reserved 240px (header + arrow
          buttons + margins) without overflow. 100dvh is the dynamic
          viewport height so iOS Safari's toolbar collapse doesn't
          push the canvas off-screen.

          touchAction: "none" stops iOS from scrolling/zooming the
          page when the player taps the canvas — without this, the
          page can drift visually and make the playfield look like
          the player went off-screen.

          imageRendering: pixelated for crisp wall edges at any DPR.
        */}
        <canvas ref={canvasRef} style={{
          width: "min(96vw, calc((100dvh - 280px) * 21 / 23), 640px)",
          aspectRatio: `${W} / ${H}`,
          display: "block",
          touchAction: "none",
          imageRendering: "pixelated",
          flexShrink: 0,
        }} />

        <div className="grid grid-cols-3 gap-2" style={{ width: 200 }}>
          <div />
          <TouchBtn label="▲" onPress={() => setDir(0, -1)} />
          <div />
          <TouchBtn label="◀" onPress={() => setDir(-1, 0)} />
          <div />
          <TouchBtn label="▶" onPress={() => setDir(1, 0)} />
          <div />
          <TouchBtn label="▼" onPress={() => setDir(0, 1)} />
          <div />
        </div>

        {(g.state === "won" || g.state === "lost") && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="max-w-xs w-full rounded-2xl p-5 text-center"
              style={{
                background: g.state === "won" ? "linear-gradient(135deg, rgba(253,224,71,0.2), rgba(8,8,14,0.95))" : "linear-gradient(135deg, rgba(248,113,113,0.2), rgba(8,8,14,0.95))",
                border: `1.5px solid ${g.state === "won" ? "#fde047" : "#f87171"}`,
              }}>
              <div className="inline-flex items-center gap-2 mb-2" style={{ color: g.state === "won" ? "#fde047" : "#f87171" }}>
                {g.state === "won" ? <Trophy size={20} /> : <Skull size={20} />}
                <div className="font-display tracking-widest text-lg">{g.state === "won" ? "CLEARED" : "CAUGHT"}</div>
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
                  style={{ background: "linear-gradient(135deg, #fde047, #f59e0b)", color: "#1a0505" }}>
                  RUN IT BACK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TouchBtn({ label, onPress }: { label: string; onPress: () => void }) {
  // Belt-and-suspenders input wiring:
  //   - onPointerDown: modern unified touch/mouse/pen path
  //   - onTouchStart: older iOS Safari fallback (some iOS versions
  //     deliver touchstart but not pointerdown before user gesture)
  //   - onClick: keyboard / accessibility / desktop click
  // The handler is idempotent (just writes wantDx/wantDy on the
  // game state) so double-firing doesn't cause issues.
  const fire = (e: React.SyntheticEvent) => { e.preventDefault(); onPress(); };
  return (
    <button
      type="button"
      onPointerDown={fire}
      onTouchStart={fire}
      onClick={fire}
      className="rounded-full font-mono text-[20px] touch-target"
      style={{
        height: 56, background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.28)", color: "#fef3c7",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Prevent iOS tap-highlight from absorbing the gesture visually
        WebkitTapHighlightColor: "transparent",
      }}>
      {label}
    </button>
  );
}
