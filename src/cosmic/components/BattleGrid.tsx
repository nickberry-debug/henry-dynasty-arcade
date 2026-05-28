// Cosmic Squad — SVG battlefield renderer with follow-camera.
//
// The world grid is large (GRID_W×GRID_H). The viewport shows only a
// ~14×10 window centered on the camera, which lerps to the selected
// player ship. The whole map is browsable via a minimap inset.
//
// Input model:
//   - Tap a ship → select it (and center camera on it)
//   - PointerDown on the selected ship + drag → live curved preview
//     of where the ship will actually fly given its inertia.
//   - PointerUp → commit moveTo (capped at the ship's per-turn range).
//   - Tap on the grid (no drag) → also sets the destination.
//   - Tap an enemy ship → set fire target for the selected ship.

import { useMemo, useRef, useState } from "react";
import type { Missile, ShipState, Obstacle } from "../types";
import { GRID_H, GRID_W, simulatePath, SUBTICKS } from "../engine";
import { getShipClass } from "../ships";
import { ShipSprite } from "./ShipSprite";

const CELL = 36;
// Visible viewport in cells. Tight enough that you have to scout for
// enemies; loose enough that a tight dogfight stays in frame.
const VIEW_W = 13;
const VIEW_H = 9;

interface Props {
  ships: ShipState[];
  missiles: Missile[];
  obstacles: Obstacle[];
  /** World-space cell coordinates of the camera center. */
  cameraX: number;
  cameraY: number;
  selectedShipId?: string;
  pendingMove?: { x: number; y: number } | null;
  onCellClick?: (x: number, y: number) => void;
  onShipClick?: (shipId: string) => void;
  onDragMove?: (shipId: string, endX: number, endY: number) => void;
  inputsLocked?: boolean;
}

export function BattleGrid({
  ships, missiles, obstacles, cameraX, cameraY,
  selectedShipId, pendingMove, onCellClick, onShipClick, onDragMove, inputsLocked,
}: Props) {
  const worldW = GRID_W * CELL;
  const worldH = GRID_H * CELL;
  const viewW = VIEW_W * CELL;
  const viewH = VIEW_H * CELL;
  // Camera position in pixels, clamped so the viewBox never shows
  // outside the world.
  const camPxX = Math.max(viewW / 2, Math.min(worldW - viewW / 2, (cameraX + 0.5) * CELL));
  const camPxY = Math.max(viewH / 2, Math.min(worldH - viewH / 2, (cameraY + 0.5) * CELL));
  const vbX = camPxX - viewW / 2;
  const vbY = camPxY - viewH / 2;

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Star field — built in world coords once, scrolls naturally as the camera moves.
  const stars = useMemo(() => {
    const arr: { x: number; y: number; r: number }[] = [];
    let seed = 12345;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 220; i++) {
      arr.push({ x: rand() * worldW, y: rand() * worldH, r: 0.5 + rand() * 1.6 });
    }
    return arr;
  }, [worldW, worldH]);

  const selectedShip = useMemo(() => ships.find(s => s.id === selectedShipId) ?? null, [ships, selectedShipId]);
  const [drag, setDrag] = useState<{ shipId: string; toX: number; toY: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);

  /** Convert a client-space pointer event into world (cell) coords. */
  const toWorld = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x / CELL - 0.5, y: loc.y / CELL - 0.5 };
  };

  const beginDrag = (e: React.PointerEvent, shipId: string) => {
    if (inputsLocked) return;
    const ship = ships.find(s => s.id === shipId);
    if (!ship || ship.faction !== "player" || ship.destroyed) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (selectedShipId !== shipId) onShipClick?.(shipId);
    setDrag({ shipId, toX: ship.x, toY: ship.y });
    setDragMoved(false);
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    const w = toWorld(e.clientX, e.clientY);
    if (!w) return;
    const ship = ships.find(s => s.id === drag.shipId);
    if (!ship) return;
    const cls = getShipClass(ship.classId);
    const maxR = cls?.speed ?? 5;
    let dx = w.x - ship.x, dy = w.y - ship.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > maxR) {
      dx = (dx / mag) * maxR;
      dy = (dy / mag) * maxR;
    }
    if (mag > 0.4) setDragMoved(true);
    setDrag({ shipId: drag.shipId, toX: ship.x + dx, toY: ship.y + dy });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    e.stopPropagation();
    if (dragMoved && onDragMove) {
      onDragMove(drag.shipId, Math.round(drag.toX * 2) / 2, Math.round(drag.toY * 2) / 2);
    }
    setDrag(null);
    setDragMoved(false);
  };

  // Honest preview: simulate ahead with the same steering math the
  // engine will use, then render the resulting curve.
  const previewPath = useMemo(() => {
    if (!selectedShip || selectedShip.faction !== "player") return null;
    const target = drag && drag.shipId === selectedShip.id
      ? { x: drag.toX, y: drag.toY }
      : pendingMove;
    if (!target) return null;
    const cls = getShipClass(selectedShip.classId);
    if (!cls) return null;
    return simulatePath(selectedShip, target, cls, SUBTICKS);
  }, [selectedShip, drag, pendingMove]);

  return (
    <div className="relative rounded-xl select-none" style={{
      border: "1px solid rgba(155,227,255,0.25)",
      background: "#02060e",
      overflow: "hidden",
      touchAction: "none",
    }}>
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", width: "100%", height: "auto", maxHeight: "62vh" }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(e) => {
          if (inputsLocked || drag) return;
          const w = toWorld(e.clientX, e.clientY);
          if (!w || !selectedShip || selectedShip.faction !== "player") return;
          // Cap to per-turn range.
          const cls = getShipClass(selectedShip.classId);
          const maxR = cls?.speed ?? 5;
          let dx = w.x - selectedShip.x, dy = w.y - selectedShip.y;
          const mag = Math.sqrt(dx * dx + dy * dy);
          if (mag > maxR) { dx = (dx / mag) * maxR; dy = (dy / mag) * maxR; }
          onCellClick?.(
            Math.round((selectedShip.x + dx) * 2) / 2,
            Math.round((selectedShip.y + dy) * 2) / 2,
          );
        }}
      >
        {/* ── Star field ── */}
        {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(255,255,255,0.45)" />)}

        {/* ── Nebulae ── */}
        <defs>
          <radialGradient id="neb">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="60%" stopColor="#7c3aed" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </radialGradient>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <polygon points="0 0, 6 3, 0 6" fill="#ffd54a" />
          </marker>
        </defs>
        {obstacles.filter(o => o.kind === "nebula").map(o => (
          <circle key={o.id}
            cx={(o.x + 0.5) * CELL} cy={(o.y + 0.5) * CELL}
            r={o.radius * CELL} fill="url(#neb)" />
        ))}

        {/* ── Grid lines ── */}
        {Array.from({ length: GRID_W + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={worldH} stroke="rgba(155,227,255,0.05)" />
        ))}
        {Array.from({ length: GRID_H + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * CELL} x2={worldW} y2={i * CELL} stroke="rgba(155,227,255,0.05)" />
        ))}

        {/* ── Asteroids ── */}
        {obstacles.filter(o => o.kind === "asteroid").map(o => (
          <AsteroidGfx key={o.id} obstacle={o} />
        ))}

        {/* ── Missile trails ── */}
        {missiles.map(m => {
          const cx = (m.x + 0.5) * CELL;
          const cy = (m.y + 0.5) * CELL;
          const color = m.ownerFaction === "enemy" ? "#fb7185" : "#9be3ff";
          const tailX = cx - m.vx * 10;
          const tailY = cy - m.vy * 10;
          return (
            <g key={m.id}>
              <line x1={tailX} y1={tailY} x2={cx} y2={cy} stroke={color} strokeWidth={1} opacity={0.4} />
              <circle cx={cx} cy={cy} r={2.5} fill={color} />
              <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.25} />
            </g>
          );
        })}

        {/* ── Ships ── */}
        {ships.filter(s => !s.destroyed).map(s => {
          const cls = getShipClass(s.classId);
          if (!cls) return null;
          const cx = (s.x + 0.5) * CELL;
          const cy = (s.y + 0.5) * CELL;
          const angle = s.heading ?? Math.atan2(s.vy, s.vx || (s.faction === "player" ? 1 : -1));
          const angleDeg = (angle * 180) / Math.PI;
          const baseScale = cls.size === "capital" ? 2.6 : cls.size === "medium" ? 1.9 : 1.5;
          const selected = s.id === selectedShipId;
          return (
            <g key={s.id}>
              {selected && (
                <circle cx={cx} cy={cy} r={CELL * 0.7} fill="none" stroke="#ffd54a"
                  strokeWidth={1.5} strokeDasharray="4 4" opacity={0.85} />
              )}
              <g
                transform={`translate(${cx} ${cy}) rotate(${angleDeg})`}
                onPointerDown={(e) => beginDrag(e, s.id)}
                onClick={(e) => { e.stopPropagation(); onShipClick?.(s.id); }}
                style={{ cursor: s.faction === "player" ? "grab" : "crosshair" }}
              >
                <ShipSprite
                  classId={s.classId}
                  faction={s.faction}
                  primary={cls.primaryColor}
                  accent={cls.accent}
                  scale={baseScale}
                />
              </g>
              <rect x={cx - 16} y={cy + CELL * 0.5} width={32} height={3.5} fill="rgba(0,0,0,0.6)" />
              <rect x={cx - 16} y={cy + CELL * 0.5} width={32 * (s.hp / s.hpMax)} height={3.5}
                fill={s.faction === "enemy" ? "#fb7185" : "#86efac"} />
              <text x={cx} y={cy - CELL * 0.55} textAnchor="middle" fontSize="10"
                fill={s.faction === "enemy" ? "#fca5a5" : "#9be3ff"}
                style={{ fontFamily: "monospace", letterSpacing: 0.5, pointerEvents: "none" }}>
                {s.callsign}
              </text>
            </g>
          );
        })}

        {/* ── Drag-path preview (last layer) ── */}
        {previewPath && previewPath.length > 1 && (() => {
          const last = previewPath[previewPath.length - 1];
          const penult = previewPath[previewPath.length - 2];
          // Convert to pixel coords for polyline + arrowhead.
          const pts = previewPath.map(p => `${(p.x + 0.5) * CELL},${(p.y + 0.5) * CELL}`).join(" ");
          const tipX = (last.x + 0.5) * CELL;
          const tipY = (last.y + 0.5) * CELL;
          const prevX = (penult.x + 0.5) * CELL;
          const prevY = (penult.y + 0.5) * CELL;
          return (
            <g style={{ pointerEvents: "none" }}>
              <polyline points={pts} fill="none" stroke="#ffd54a"
                strokeWidth={2} strokeDasharray="6 4" opacity={0.9}
                strokeLinecap="round" strokeLinejoin="round" />
              {/* Arrowhead at the destination */}
              <line x1={prevX} y1={prevY} x2={tipX} y2={tipY}
                stroke="#ffd54a" strokeWidth={2.5} markerEnd="url(#arrowhead)" opacity={0.95} />
              <circle cx={tipX} cy={tipY} r={CELL * 0.18}
                fill="rgba(255,213,74,0.15)" stroke="#ffd54a" strokeWidth={1.2} />
            </g>
          );
        })()}
      </svg>

      {/* Minimap inset — shows the whole world so the player can scout. */}
      <Minimap
        ships={ships}
        obstacles={obstacles}
        cameraX={cameraX}
        cameraY={cameraY}
        viewW={VIEW_W}
        viewH={VIEW_H}
      />
    </div>
  );
}

/** Lumpy procedural asteroid silhouette. */
function AsteroidGfx({ obstacle }: { obstacle: Obstacle }) {
  const points = useMemo(() => {
    let s = obstacle.seed || 1;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const r = obstacle.radius * CELL;
    const n = 11;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const rr = r * (0.7 + rand() * 0.45);
      pts.push(`${Math.cos(ang) * rr},${Math.sin(ang) * rr}`);
    }
    return pts.join(" ");
  }, [obstacle.seed, obstacle.radius]);

  const cx = (obstacle.x + 0.5) * CELL;
  const cy = (obstacle.y + 0.5) * CELL;
  return (
    <g transform={`translate(${cx} ${cy})`} style={{ pointerEvents: "none" }}>
      <polygon points={points} fill="#4a443f" stroke="#7d7569" strokeWidth={0.6} />
      <polygon points={points} fill="rgba(255,200,150,0.06)" transform="translate(-1.5,-1.5)" />
      <circle cx={obstacle.radius * 2.4} cy={-obstacle.radius * 2} r={obstacle.radius * 1.6} fill="rgba(0,0,0,0.30)" />
      <circle cx={-obstacle.radius * 3.2} cy={obstacle.radius * 1.6} r={obstacle.radius * 1.2} fill="rgba(0,0,0,0.22)" />
      <circle cx={obstacle.radius * 0.5} cy={obstacle.radius * 2.5} r={obstacle.radius * 0.7} fill="rgba(0,0,0,0.18)" />
    </g>
  );
}

/** Whole-map minimap. Friendly ships are blue dots, enemies are red.
 *  A bright box shows the current viewport. */
function Minimap({ ships, obstacles, cameraX, cameraY, viewW, viewH }: {
  ships: ShipState[];
  obstacles: Obstacle[];
  cameraX: number;
  cameraY: number;
  viewW: number;
  viewH: number;
}) {
  const mmW = 130, mmH = (130 * GRID_H) / GRID_W;
  const sx = mmW / GRID_W;
  const sy = mmH / GRID_H;
  return (
    <div className="absolute pointer-events-none"
      style={{ top: 8, right: 8, padding: 6, background: "rgba(2,6,14,0.85)", border: "1px solid rgba(155,227,255,0.3)", borderRadius: 6 }}>
      <svg width={mmW} height={mmH} style={{ display: "block" }}>
        <rect x={0} y={0} width={mmW} height={mmH} fill="#02060e" />
        {obstacles.filter(o => o.kind === "asteroid").map(o => (
          <circle key={o.id} cx={o.x * sx} cy={o.y * sy} r={Math.max(0.8, o.radius * sx * 0.6)}
            fill="#4a443f" />
        ))}
        {obstacles.filter(o => o.kind === "nebula").map(o => (
          <circle key={o.id} cx={o.x * sx} cy={o.y * sy} r={o.radius * sx * 0.8}
            fill="#7c3aed" opacity={0.2} />
        ))}
        {ships.filter(s => !s.destroyed).map(s => (
          <circle key={s.id} cx={s.x * sx} cy={s.y * sy} r={s.faction === "enemy" ? 2 : 2.2}
            fill={s.faction === "enemy" ? "#fb7185" : "#86efac"} />
        ))}
        {/* Viewport box */}
        <rect
          x={Math.max(0, (cameraX - viewW / 2) * sx)}
          y={Math.max(0, (cameraY - viewH / 2) * sy)}
          width={Math.min(mmW, viewW * sx)}
          height={Math.min(mmH, viewH * sy)}
          fill="none" stroke="#ffd54a" strokeWidth={1} opacity={0.85} />
      </svg>
    </div>
  );
}
