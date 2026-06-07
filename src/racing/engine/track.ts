// Turbo Racers -- procedural oval test track. Phase 1 ships ONE track that
// doubles as a tuning rig for the driving feel. Phase 3 will spawn the five
// difficulty-scaled tracks.
//
// Construction:
//   - World is ~3000 x 2000.
//   - Centreline is a rounded-rect path (two straights + two semicircular
//     ends). We sample it as a polyline so surfaceAt() can do a fast
//     distance-to-segment lookup. ROAD_HALF_WIDTH controls the asphalt
//     ribbon. Outside the ribbon is grass (low grip, slow).
//   - Finish line sits at the bottom-of-screen straight, perpendicular to
//     the racing direction. Cars race COUNTER-CLOCKWISE -- start facing
//     left along the bottom straight.

import type { SurfaceKey } from "./physics";

export interface TrackDef {
  world: { w: number; h: number };
  /** Polyline samples of the racing line, in race order. */
  centreline: { x: number; y: number }[];
  /** Half-width of the asphalt ribbon (px). */
  roadHalfWidth: number;
  /** Half-width of the soft "kerb" zone (slower than asphalt, faster than grass). */
  kerbHalfWidth: number;
  /** Finish line: two endpoints; crossing in the race direction = +1 lap. */
  finishLine: { x1: number; y1: number; x2: number; y2: number };
  /** Where cars start. */
  startPos: { x: number; y: number; headingRad: number };
  /** Total laps for a quick race. */
  laps: number;
}

const WORLD_W = 3000;
const WORLD_H = 2000;

/** Sample a rounded-rect centreline as ~N points in CCW race order. */
function makeOvalCentreline(): { x: number; y: number }[] {
  // Inset rectangle inside the world, with rounded ends.
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const halfW = 950;          // straight half-length
  const halfH = 480;          // distance from centreline to centre of curves
  const radius = halfH;       // semicircle radius == halfH for a smooth oval
  const pts: { x: number; y: number }[] = [];
  // Bottom straight, going LEFT (race direction CCW).
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push({ x: cx + halfW * (1 - 2 * t), y: cy + halfH });
  }
  // Left semicircle, from (cx-halfW, cy+halfH) to (cx-halfW, cy-halfH).
  for (let i = 1; i <= 24; i++) {
    const ang = Math.PI / 2 + (Math.PI * i) / 24;
    pts.push({ x: cx - halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
  }
  // Top straight, going RIGHT.
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    pts.push({ x: cx - halfW + 2 * halfW * t, y: cy - halfH });
  }
  // Right semicircle, from (cx+halfW, cy-halfH) to (cx+halfW, cy+halfH).
  for (let i = 1; i <= 24; i++) {
    const ang = -Math.PI / 2 + (Math.PI * i) / 24;
    pts.push({ x: cx + halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
  }
  return pts;
}

export function makeOvalTrack(laps = 3): TrackDef {
  const centreline = makeOvalCentreline();
  return {
    world: { w: WORLD_W, h: WORLD_H },
    centreline,
    roadHalfWidth: 110,
    kerbHalfWidth: 130,
    // Finish line is on the bottom straight, near the right side.
    // We pick a segment from the centreline and draw perpendicular.
    finishLine: (() => {
      const cy = WORLD_H / 2;
      const halfH = 480;
      const halfW = 950;
      const x = WORLD_W / 2 + halfW * 0.55;
      const y = cy + halfH;
      // Perpendicular to the bottom-straight tangent (which is along -X for CCW).
      // So the finish band is vertical: same x, spread along Y.
      return { x1: x, y1: y - 110, x2: x, y2: y + 110 };
    })(),
    startPos: {
      x: WORLD_W / 2 + 950 * 0.55 - 80, // slightly left of finish line
      y: WORLD_H / 2 + 480,
      // CCW race direction along bottom straight = pointing LEFT.
      // heading 0 = up; heading = -90 deg (== -PI/2) = pointing LEFT.
      headingRad: -Math.PI / 2,
    },
    laps,
  };
}

// ---- Surface lookup --------------------------------------------------------

/** Squared distance from point P to segment AB. */
function distSqToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

/** Minimum distance from (x,y) to the track centreline polyline. */
export function distToCentreline(track: TrackDef, x: number, y: number): number {
  const cl = track.centreline;
  let best = Infinity;
  for (let i = 0; i < cl.length; i++) {
    const a = cl[i];
    const b = cl[(i + 1) % cl.length];
    const d2 = distSqToSeg(x, y, a.x, a.y, b.x, b.y);
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

export function surfaceAt(track: TrackDef, x: number, y: number): SurfaceKey {
  const d = distToCentreline(track, x, y);
  if (d <= track.roadHalfWidth) return "asphalt";
  if (d <= track.kerbHalfWidth) return "dirt"; // kerb behaves like dirt
  return "grass";
}

// ---- Track baking (draws a static background to an offscreen canvas) ------

export interface TrackBakeOpts {
  grassTile?: HTMLImageElement | null;
}

/**
 * Render the static track surface to an offscreen canvas. Drawn ONCE per
 * race; the match loop then blits the visible portion every frame.
 */
export function bakeTrack(track: TrackDef, opts: TrackBakeOpts = {}): HTMLCanvasElement {
  const { w, h } = track.world;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return c;

  // ---- Grass background ----
  if (opts.grassTile && opts.grassTile.complete && opts.grassTile.naturalWidth > 0) {
    const pat = g.createPattern(opts.grassTile, "repeat");
    if (pat) {
      g.fillStyle = pat;
    } else {
      g.fillStyle = "#2f5e2a";
    }
  } else {
    // Solid grass-green fallback.
    g.fillStyle = "#2f5e2a";
  }
  g.fillRect(0, 0, w, h);
  // Soft vignette so the track pops.
  const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // ---- Kerb (slightly wider than asphalt, red-and-white striped) ----
  drawClosedPolyline(g, track.centreline, track.kerbHalfWidth * 2, "#c0392b");
  drawClosedPolyline(g, track.centreline, track.kerbHalfWidth * 2 - 6, "#ecf0f1");
  drawClosedPolyline(g, track.centreline, track.kerbHalfWidth * 2 - 12, "#c0392b");

  // ---- Asphalt ribbon ----
  drawClosedPolyline(g, track.centreline, track.roadHalfWidth * 2, "#2c2c2c");
  // Slight asphalt grain via dark stripes (subtle).
  g.save();
  g.globalAlpha = 0.10;
  drawClosedPolyline(g, track.centreline, track.roadHalfWidth * 2 - 4, "#1a1a1a");
  g.restore();

  // ---- Centre dashed line (white) ----
  g.save();
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 3;
  g.setLineDash([28, 22]);
  g.beginPath();
  const cl = track.centreline;
  g.moveTo(cl[0].x, cl[0].y);
  for (let i = 1; i < cl.length; i++) g.lineTo(cl[i].x, cl[i].y);
  g.closePath();
  g.stroke();
  g.restore();

  // ---- Finish line (checkered band) ----
  drawCheckeredBand(g, track.finishLine.x1, track.finishLine.y1, track.finishLine.x2, track.finishLine.y2, 22);

  return c;
}

function drawClosedPolyline(g: CanvasRenderingContext2D, pts: { x: number; y: number }[], width: number, colour: string) {
  g.save();
  g.strokeStyle = colour;
  g.lineWidth = width;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.stroke();
  g.restore();
}

function drawCheckeredBand(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, depth: number) {
  // The band is perpendicular to the racing tangent at the finish point.
  // For our oval the finish is a vertical segment, so depth extends in X.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular (right-handed).
  const px = -uy;
  const py = ux;
  // Two rows of squares.
  const cellSize = len / 6; // 6 squares across the line
  const rows = Math.max(1, Math.round(depth / cellSize));
  g.save();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 6; col++) {
      const black = (row + col) % 2 === 0;
      const sx = x1 + ux * col * cellSize + px * row * cellSize - px * depth / 2;
      const sy = y1 + uy * col * cellSize + py * row * cellSize - py * depth / 2;
      g.fillStyle = black ? "#111" : "#f4f4f4";
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + ux * cellSize, sy + uy * cellSize);
      g.lineTo(sx + ux * cellSize + px * cellSize, sy + uy * cellSize + py * cellSize);
      g.lineTo(sx + px * cellSize, sy + py * cellSize);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}
