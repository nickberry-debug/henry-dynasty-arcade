// Turbo Racers -- Phase 3 track catalogue. Five layouts with different
// centrelines, scenery + jumps.

import type { TrackDef } from "./track";

export interface SceneryItem {
  sprite: string;
  x: number;
  y: number;
  scale?: number;
  rot?: number;
  solid?: boolean;
}

type SceneryTemplate = Omit<SceneryItem, "x" | "y">;

export interface JumpRamp {
  x: number;
  y: number;
  half: number;
  strength: number;
  approachRad: number;
}

export interface TrackCatalogueEntry {
  id: string;
  name: string;
  blurb: string;
  difficulty: number;
  outdoorTone: string;
  make: (laps?: number) => TrackDef;
  scenery: SceneryItem[];
  jumps: JumpRamp[];
}

const WORLD = { w: 3000, h: 2000 };

function smoothLoop(samples: number, fn: (t: number) => { x: number; y: number }): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < samples; i++) out.push(fn(i / samples));
  return out;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function ovalCentreline(): { x: number; y: number }[] {
  const cx = WORLD.w / 2, cy = WORLD.h / 2;
  const halfW = 950, halfH = 480;
  const radius = halfH;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push({ x: cx + halfW * (1 - 2 * t), y: cy + halfH }); }
  for (let i = 1; i <= 24; i++) { const ang = Math.PI / 2 + (Math.PI * i) / 24; pts.push({ x: cx - halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius }); }
  for (let i = 1; i <= 24; i++) { const t = i / 24; pts.push({ x: cx - halfW + 2 * halfW * t, y: cy - halfH }); }
  for (let i = 1; i <= 24; i++) { const ang = -Math.PI / 2 + (Math.PI * i) / 24; pts.push({ x: cx + halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius }); }
  return pts;
}

function figure8Centreline(): { x: number; y: number }[] {
  return smoothLoop(120, t => {
    const ang = t * Math.PI * 2;
    const denom = 1 + Math.sin(ang) ** 2;
    const x = (Math.cos(ang) / denom) * 980 + WORLD.w / 2;
    const y = (Math.sin(ang) * Math.cos(ang) / denom) * 720 + WORLD.h / 2;
    return { x, y };
  });
}

function snakeCentreline(): { x: number; y: number }[] {
  const cx = WORLD.w / 2, cy = WORLD.h / 2;
  const halfW = 950, halfH = 520;
  const radius = halfH;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = cx + halfW * (1 - 2 * t);
    const wiggle = Math.sin(t * Math.PI * 3) * 90;
    pts.push({ x, y: cy + halfH + wiggle });
  }
  for (let i = 1; i <= 24; i++) {
    const ang = Math.PI / 2 + (Math.PI * i) / 24;
    pts.push({ x: cx - halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
  }
  for (let i = 1; i <= 40; i++) {
    const t = i / 40;
    const x = cx - halfW + 2 * halfW * t;
    const wiggle = Math.sin(t * Math.PI * 3 + Math.PI) * 90;
    pts.push({ x, y: cy - halfH + wiggle });
  }
  for (let i = 1; i <= 24; i++) {
    const ang = -Math.PI / 2 + (Math.PI * i) / 24;
    pts.push({ x: cx + halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
  }
  return pts;
}

function craterCentreline(): { x: number; y: number }[] {
  const cx = WORLD.w / 2, cy = WORLD.h / 2;
  const halfW = 950, halfH = 520;
  const radius = halfH;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = cx + halfW * (1 - 2 * t);
    const bump = Math.exp(-((t - 0.33) ** 2) / 0.003) * 80 + Math.exp(-((t - 0.66) ** 2) / 0.003) * 80;
    pts.push({ x, y: cy + halfH + bump });
  }
  for (let i = 1; i <= 24; i++) {
    const ang = Math.PI / 2 + (Math.PI * i) / 24;
    pts.push({ x: cx - halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
  }
  for (let i = 1; i <= 40; i++) {
    const t = i / 40;
    const x = cx - halfW + 2 * halfW * t;
    const bump = Math.exp(-((t - 0.33) ** 2) / 0.003) * -80 + Math.exp(-((t - 0.66) ** 2) / 0.003) * -80;
    pts.push({ x, y: cy - halfH + bump });
  }
  for (let i = 1; i <= 24; i++) {
    const ang = -Math.PI / 2 + (Math.PI * i) / 24;
    pts.push({ x: cx + halfW + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
  }
  return pts;
}

function spiralCentreline(): { x: number; y: number }[] {
  return smoothLoop(140, t => {
    const ang = t * Math.PI * 2;
    const r1 = 700 + Math.sin(ang * 2) * 240 + Math.cos(ang * 3) * 90;
    return { x: WORLD.w / 2 + Math.cos(ang) * r1 * 0.85 + Math.sin(ang) * 60, y: WORLD.h / 2 + Math.sin(ang) * r1 * 0.55 };
  });
}

function buildTrack(opts: {
  centreline: { x: number; y: number }[];
  roadHalfWidth?: number;
  kerbHalfWidth?: number;
  laps?: number;
  startIdx?: number;
}): TrackDef {
  const cl = opts.centreline;
  const startIdx = opts.startIdx ?? 0;
  const startPt = cl[startIdx];
  const next = cl[(startIdx + 2) % cl.length];
  const dx = next.x - startPt.x;
  const dy = next.y - startPt.y;
  const tangentLen = Math.hypot(dx, dy) || 1;
  const tx = dx / tangentLen;
  const ty = dy / tangentLen;
  const headingRad = Math.atan2(tx, -ty);
  const finishPt = cl[(startIdx + 3) % cl.length];
  const px = -ty;
  const py = tx;
  const halfBand = 110;
  return {
    world: { w: WORLD.w, h: WORLD.h },
    centreline: cl,
    roadHalfWidth: opts.roadHalfWidth ?? 110,
    kerbHalfWidth: opts.kerbHalfWidth ?? 130,
    finishLine: {
      x1: finishPt.x + px * halfBand, y1: finishPt.y + py * halfBand,
      x2: finishPt.x - px * halfBand, y2: finishPt.y - py * halfBand,
    },
    startPos: {
      x: startPt.x - tx * 30,
      y: startPt.y - ty * 30,
      headingRad,
    },
    laps: opts.laps ?? 3,
  };
}

export const TRACKS: TrackCatalogueEntry[] = [
  {
    id: "oval", name: "Sandy Oval", blurb: "Beginner-friendly. Wide curves. Good drift training.",
    difficulty: 1, outdoorTone: "#4a7d3a",
    make: (laps = 3) => buildTrack({ centreline: ovalCentreline(), laps, startIdx: 12 }),
    scenery: scatterScenery("oval", ovalCentreline(), [
      { sprite: "/assets/racing/scenery/tent_blue_large.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/tent_red.png", scale: 0.5 },
      { sprite: "/assets/racing/scenery/barrier_white_race.png", scale: 0.45 },
      { sprite: "/assets/racing/scenery/barrier_red.png", scale: 0.5 },
      { sprite: "/assets/racing/scenery/tires_red.png", scale: 0.6 },
      { sprite: "/assets/racing/scenery/cone_straight.png", scale: 0.55 },
    ], 24),
    jumps: [ { x: 1500, y: 1500, half: 90, strength: 60, approachRad: -Math.PI / 2 } ],
  },
  {
    id: "figure8", name: "Pinetop Pinch", blurb: "Figure-8 with a crossing apex. Mind the centre.",
    difficulty: 2, outdoorTone: "#3a6e3a",
    make: (laps = 3) => buildTrack({ centreline: figure8Centreline(), laps, startIdx: 0, roadHalfWidth: 100, kerbHalfWidth: 120 }),
    scenery: scatterScenery("figure8", figure8Centreline(), [
      { sprite: "/assets/racing/scenery/rock1.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/rock2.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/rock3.png", scale: 0.6 },
      { sprite: "/assets/racing/scenery/barrel_blue.png", scale: 0.6 },
      { sprite: "/assets/racing/scenery/barrel_red.png", scale: 0.6 },
    ], 32),
    jumps: [ { x: 1500, y: 1000, half: 110, strength: 90, approachRad: 0 } ],
  },
  {
    id: "snake", name: "Slipstone Snake", blurb: "S-curve straights reward late drifters.",
    difficulty: 3, outdoorTone: "#56462a",
    make: (laps = 3) => buildTrack({ centreline: snakeCentreline(), laps, startIdx: 20, roadHalfWidth: 95, kerbHalfWidth: 115 }),
    scenery: scatterScenery("snake", snakeCentreline(), [
      { sprite: "/assets/racing/scenery/barrier_red_race.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/barrier_white.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/cone_down.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/tires_red.png", scale: 0.55 },
    ], 36),
    jumps: [
      { x: 800, y: 1490, half: 80, strength: 55, approachRad: -Math.PI / 2 },
      { x: 2200, y: 510, half: 80, strength: 55, approachRad: Math.PI / 2 },
    ],
  },
  {
    id: "crater", name: "Crater Loop", blurb: "Pinch chicanes squeeze the back straight.",
    difficulty: 4, outdoorTone: "#5a3a28",
    make: (laps = 3) => buildTrack({ centreline: craterCentreline(), laps, startIdx: 20, roadHalfWidth: 90, kerbHalfWidth: 108 }),
    scenery: scatterScenery("crater", craterCentreline(), [
      { sprite: "/assets/racing/scenery/rock1.png", scale: 0.6 },
      { sprite: "/assets/racing/scenery/rock2.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/rock3.png", scale: 0.65 },
      { sprite: "/assets/racing/scenery/barrel_red_down.png", scale: 0.55 },
      { sprite: "/assets/racing/scenery/barrel_blue_down.png", scale: 0.55 },
    ], 40),
    jumps: [
      { x: 1500, y: 1520, half: 100, strength: 75, approachRad: -Math.PI / 2 },
      { x: 1500, y: 480, half: 100, strength: 75, approachRad: Math.PI / 2 },
    ],
  },
  {
    id: "spiral", name: "Skybridge Spiral", blurb: "Expert. Winding apexes. Stay on the line.",
    difficulty: 5, outdoorTone: "#3b5160",
    make: (laps = 3) => buildTrack({ centreline: spiralCentreline(), laps, startIdx: 0, roadHalfWidth: 88, kerbHalfWidth: 105 }),
    scenery: scatterScenery("spiral", spiralCentreline(), [
      { sprite: "/assets/racing/scenery/tent_blue.png", scale: 0.45 },
      { sprite: "/assets/racing/scenery/tent_red_large.png", scale: 0.5 },
      { sprite: "/assets/racing/scenery/tires_red.png", scale: 0.5 },
      { sprite: "/assets/racing/scenery/cone_straight.png", scale: 0.5 },
      { sprite: "/assets/racing/scenery/barrier_white_race.png", scale: 0.5 },
    ], 44),
    jumps: [
      { x: 1500, y: 1450, half: 90, strength: 80, approachRad: -Math.PI / 2 },
      { x: 1500, y: 600, half: 90, strength: 80, approachRad: Math.PI / 2 },
    ],
  },
];

export function trackById(id: string): TrackCatalogueEntry {
  return TRACKS.find(t => t.id === id) ?? TRACKS[0];
}

function scatterScenery(seed: string, cl: { x: number; y: number }[], palette: SceneryTemplate[], count: number): SceneryItem[] {
  const rng = mulberry32(hashString(seed));
  const items: SceneryItem[] = [];
  for (let i = 0; i < count; i++) {
    const segIdx = Math.floor(rng() * cl.length);
    const a = cl[segIdx];
    const b = cl[(segIdx + 1) % cl.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len, ty = dy / len;
    const px = -ty, py = tx;
    const t = rng();
    const dist = lerp(155, 280, rng()) * (rng() > 0.5 ? 1 : -1);
    const wobble = lerp(-10, 10, rng());
    const x = a.x + tx * len * t + px * dist + tx * wobble;
    const y = a.y + ty * len * t + py * dist + ty * wobble;
    if (x < 60 || x > WORLD.w - 60 || y < 60 || y > WORLD.h - 60) continue;
    const tpl = palette[Math.floor(rng() * palette.length)];
    items.push({ ...tpl, x, y, rot: rng() * Math.PI * 2 });
  }
  return items;
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}