// spriteFactory.ts — Procedural pixel-art sprite generator (Path A).
//
// Generates AoE1-style isometric unit sprite sheets entirely in code by
// drawing pixels onto offscreen canvases. No external image assets, no AI
// generation, no licensed material. Each sprite is 64×64 with a "ground
// anchor" at (32, 56) — i.e. the unit's feet sit at the bottom-center.
//
// A "SpriteSheet" for one unit contains four directions × multiple frames per
// animation state (idle / walk / attack / death). The renderer indexes into
// it via a simple key. Sheets are cached per (archetype, team) pair so we
// only pay the per-pixel cost once per character flavour.

import type { CharacterDef } from "./types";
import type { Facing } from "./isoMath";
import { getLuizmeloSheet } from "./luizmeloSprites";

// ── sprite canvas dimensions ────────────────────────────────────────────────
// 64×64 matches the luizmelo sheet output so the renderer's anchor math is
// consistent across both sprite paths.
export const SPRITE_W = 64;
export const SPRITE_H = 64;
export const ANCHOR_X = 32;
export const ANCHOR_Y = 56; // feet line — drop shadow renders here

// ── archetypes ──────────────────────────────────────────────────────────────
// We classify every character into one of a handful of body templates. The
// goal isn't fidelity — it's recognisable AoE1-ish silhouettes (swordsman,
// archer, cavalry-ish, brute monster, robed mage).
export type Archetype =
  | "swordsman"
  | "archer"
  | "cavalry"
  | "monster"
  | "mage";

const FACINGS: Facing[] = ["NE", "SE", "SW", "NW"];

export interface AnimSet {
  idle: HTMLCanvasElement[];   // per facing → 1 frame
  walk: HTMLCanvasElement[][]; // per facing → 4 frames
  attack: HTMLCanvasElement[][]; // per facing → 3 frames
  death: HTMLCanvasElement;    // single frame
}

export interface SpriteSheet {
  archetype: Archetype;
  team: "A" | "B";
  anim: AnimSet;
}

// ── archetype inference from CharacterDef ───────────────────────────────────
// Heuristic mapping. Keeps in sync with presets.ts categories + ids.
export function archetypeFor(def: CharacterDef): Archetype {
  const id = (def.id || "").toLowerCase();
  const cat = (def.category || "").toLowerCase();
  const size = def.size;

  // Huge / colossal — always read as "monster"
  if (size === "huge" || size === "colossal") return "monster";

  // Ranged attack types map to archer or mage
  if (def.attackType === "ranged" || def.attackType === "indirect") {
    if (/(mage|wizard|sorcer|witch|warlock|priest|monk|cleric|psychic|telepath|oracle|seer|shaman|druid|necro|enchant|cosmic|astral|spirit|ghost|spectre|spectral|magic|arcane|spell)/.test(id) ||
        /(mage|magic|psychic|cosmic|gods|myth|anime|fantasy)/.test(cat) ||
        def.specialVfx === "lightning" || def.specialVfx === "frost" || def.specialVfx === "fire") {
      return "mage";
    }
    return "archer";
  }

  // Animal / mounted / fast melee → cavalry silhouette
  if (/(wolf|dog|lion|tiger|cat|panther|horse|rider|cavalry|knight|jockey|hound|cheetah|bear|fox)/.test(id) ||
      /wild kingdom/.test(cat)) {
    return "cavalry";
  }

  // Fallback: swordsman
  return swordsmanOrMonster(def);
}

function swordsmanOrMonster(def: CharacterDef): Archetype {
  if (def.size === "large") return "monster";
  return "swordsman";
}

// ── palette helpers ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}
function rgb(r: number, g: number, b: number): string {
  return `rgb(${r|0},${g|0},${b|0})`;
}
function shade(hex: string, mul: number): string {
  const [r,g,b] = hexToRgb(hex);
  return rgb(Math.min(255, r*mul), Math.min(255, g*mul), Math.min(255, b*mul));
}

interface Palette {
  team: string;     // banner / shield / cape — red or blue
  teamDark: string;
  skin: string;
  skinDark: string;
  cloth: string;
  clothDark: string;
  metal: string;
  metalDark: string;
  weapon: string;
  hair: string;
  outline: string;
}

function makePalette(team: "A" | "B", accent: string): Palette {
  const teamColor = team === "A" ? "#3D6BD8" : "#C92E2E";
  const teamDark  = team === "A" ? "#1F3A8C" : "#6E1717";
  // Blend accent slightly into cloth so different chars look distinct.
  const cloth = accent || (team === "A" ? "#7AA7E8" : "#E89797");
  return {
    team: teamColor,
    teamDark,
    skin: "#E6BB87",
    skinDark: "#9E7548",
    cloth,
    clothDark: shade(cloth, 0.55),
    metal: "#C8C8D2",
    metalDark: "#6E6E80",
    weapon: "#D8D8E0",
    hair: "#3A2418",
    outline: "#1A1108",
  };
}

// ── low-level canvas helpers ────────────────────────────────────────────────
function makeCanvas(): HTMLCanvasElement {
  // SSR-safe-ish: we never call this server-side because BattleCanvas only
  // mounts client-side, but guard regardless.
  const c = (typeof document !== "undefined")
    ? document.createElement("canvas")
    : ({ width: SPRITE_W, height: SPRITE_H, getContext: () => null } as unknown as HTMLCanvasElement);
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  return c;
}

function ctxOf(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x|0, y|0, w|0, h|0);
}

/** Outline a vertical column of body pixels — saves repetition. */
function vcol(ctx: CanvasRenderingContext2D, color: string, x: number, y0: number, y1: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x|0, y0|0, 1, (y1 - y0 + 1)|0);
}

// ── direction helpers ───────────────────────────────────────────────────────
// We draw the "south-east" facing canonical pose and then derive other
// facings by horizontal mirroring (SE↔SW, NE↔NW) and a small palette tweak
// for "back" facings (NE / NW = back view — hide face).
function isBackFacing(f: Facing): boolean {
  return f === "NE" || f === "NW";
}
function isMirrored(f: Facing): boolean {
  return f === "SW" || f === "NW";
}

/** Draw the body once into a "canonical" SE pose, return ctx for overlay. */
function drawBaseHumanoid(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  opts: {
    bob?: number;           // -2..2 vertical bob for walk anim
    legSwing?: number;      // -2..2 leg stride
    armSwing?: number;      // -2..2 arm swing
    armRaise?: number;      // 0..4 raise weapon arm
    back?: boolean;         // is this a back-facing pose?
    helmet?: boolean;
    cape?: boolean;
    robe?: boolean;
  },
) {
  const { bob = 0, legSwing = 0, armSwing = 0, armRaise = 0, back = false, helmet = true, cape = false, robe = false } = opts;
  const cx = ANCHOR_X;
  const feet = ANCHOR_Y;
  const o = pal.outline;

  // ── legs (2 px wide each, feet-anchored) ─────────────────────────────────
  // Left foot at cx-3, right foot at cx+2 (5px stance).
  const leftFootY = feet + Math.min(0, legSwing);
  const rightFootY = feet - Math.min(0, legSwing); // mirrored swing
  // Slight horizontal offset for stride
  const leftFootX = cx - 3 + Math.max(0, legSwing);
  const rightFootX = cx + 2 - Math.max(0, legSwing);

  // Legs
  vcol(ctx, pal.clothDark, leftFootX, leftFootY - 5, leftFootY - 1);
  vcol(ctx, pal.cloth,     leftFootX + 1, leftFootY - 5, leftFootY - 1);
  vcol(ctx, pal.clothDark, rightFootX - 1, rightFootY - 5, rightFootY - 1);
  vcol(ctx, pal.cloth,     rightFootX,     rightFootY - 5, rightFootY - 1);
  // Boots
  px(ctx, o, leftFootX, leftFootY, 2, 1);
  px(ctx, o, rightFootX - 1, rightFootY, 2, 1);

  // Robe overlay (mages): widens the lower half.
  if (robe) {
    for (let dy = 0; dy < 8; dy++) {
      const w = 8 + Math.floor(dy * 0.6);
      px(ctx, pal.clothDark, cx - w/2, feet - 7 + dy, w, 1);
      if (dy % 2 === 0) px(ctx, pal.cloth, cx - w/2 + 1, feet - 7 + dy, w - 2, 1);
    }
    // Hem outline
    px(ctx, o, cx - 6, feet, 1, 1);
    px(ctx, o, cx + 5, feet, 1, 1);
  }

  // ── torso ────────────────────────────────────────────────────────────────
  const torsoTop = feet - 14 + bob;
  const torsoBot = feet - 7 + bob;
  // Body block (6px wide)
  for (let y = torsoTop; y <= torsoBot; y++) {
    px(ctx, pal.cloth, cx - 3, y, 6, 1);
  }
  // Side shading
  vcol(ctx, pal.clothDark, cx - 3, torsoTop, torsoBot);
  vcol(ctx, pal.clothDark, cx + 2, torsoTop, torsoBot);
  // Team belt / sash
  px(ctx, pal.team, cx - 3, torsoBot, 6, 1);
  px(ctx, pal.teamDark, cx - 3, torsoBot, 1, 1);
  px(ctx, pal.teamDark, cx + 2, torsoBot, 1, 1);

  // ── arms ─────────────────────────────────────────────────────────────────
  // Off-hand arm
  const offY = torsoTop + 1 + armSwing;
  vcol(ctx, pal.cloth, cx - 4, offY, offY + 4);
  vcol(ctx, pal.clothDark, cx - 4, offY + 4, offY + 4);
  px(ctx, pal.skin, cx - 4, offY + 5, 1, 1);

  // Weapon arm
  const weapY = torsoTop + 1 - armSwing - armRaise;
  vcol(ctx, pal.cloth, cx + 3, weapY, weapY + 4);
  vcol(ctx, pal.clothDark, cx + 3, weapY + 4, weapY + 4);
  px(ctx, pal.skin, cx + 3, weapY + 5, 1, 1);

  // ── head ─────────────────────────────────────────────────────────────────
  const headTop = torsoTop - 6;
  // Head 4×5
  for (let dy = 0; dy < 5; dy++) {
    px(ctx, pal.skin, cx - 2, headTop + dy, 4, 1);
  }
  // Head outline
  px(ctx, o, cx - 2, headTop, 4, 1);
  px(ctx, o, cx - 2, headTop + 4, 4, 1);
  vcol(ctx, o, cx - 3, headTop + 1, headTop + 3);
  vcol(ctx, o, cx + 2, headTop + 1, headTop + 3);

  if (!back) {
    // Face: tiny eye dot + mouth
    px(ctx, o, cx - 1, headTop + 2);
    px(ctx, o, cx + 1, headTop + 2);
    px(ctx, pal.skinDark, cx, headTop + 3);
  } else {
    // Back of head: hair
    px(ctx, pal.hair, cx - 2, headTop + 1, 4, 2);
  }

  // Hair top tuft (everyone gets a little)
  px(ctx, pal.hair, cx - 2, headTop, 4, 1);

  // Helmet (team-tinted dome)
  if (helmet) {
    px(ctx, pal.metal, cx - 2, headTop - 1, 4, 1);
    px(ctx, pal.metalDark, cx - 2, headTop - 1, 1, 1);
    px(ctx, pal.metalDark, cx + 1, headTop - 1, 1, 1);
    // Crest
    px(ctx, pal.team, cx - 1, headTop - 2, 2, 1);
  }

  // Cape (knights)
  if (cape) {
    for (let dy = 0; dy < 8; dy++) {
      px(ctx, pal.team, cx - 3 - (dy === 0 ? 0 : 0), torsoTop + dy, 1, 1);
      px(ctx, pal.team, cx + 3, torsoTop + dy, 1, 1);
      if (dy >= 4) {
        px(ctx, pal.teamDark, cx - 3, torsoTop + dy, 1, 1);
        px(ctx, pal.teamDark, cx + 3, torsoTop + dy, 1, 1);
      }
    }
  }

  // Outline pass on torso silhouette
  px(ctx, o, cx - 4, torsoTop, 1, 1);
  px(ctx, o, cx + 3, torsoTop, 1, 1);
  px(ctx, o, cx - 3, torsoTop - 1, 6, 1);

  return { cx, headTop, torsoTop, torsoBot, weapY, offY };
}

// ── archetype-specific overlays ─────────────────────────────────────────────
function drawSword(ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, raise: number) {
  // Sword leaning toward upper-right
  const sx = x + 2;
  const sy = y - 1 - raise;
  px(ctx, pal.weapon, sx, sy, 1, 6);
  px(ctx, pal.metalDark, sx, sy + 6, 1, 1);
  // Crossguard
  px(ctx, pal.metalDark, sx - 1, sy + 5, 3, 1);
  // Tip highlight
  px(ctx, "#FFFFFF", sx, sy, 1, 1);
}

function drawBow(ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, drawn: boolean) {
  const sx = x + 2;
  const sy = y;
  // Bow arc
  px(ctx, pal.weapon, sx + 1, sy - 2);
  px(ctx, pal.weapon, sx + 2, sy - 1);
  px(ctx, pal.weapon, sx + 2, sy);
  px(ctx, pal.weapon, sx + 2, sy + 1);
  px(ctx, pal.weapon, sx + 1, sy + 2);
  // String + arrow
  px(ctx, pal.outline, sx, sy - 1);
  px(ctx, pal.outline, sx, sy + 1);
  if (drawn) {
    px(ctx, "#A07040", sx - 1, sy, 2, 1);
  } else {
    px(ctx, pal.outline, sx, sy);
  }
}

function drawStaff(ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, glow: boolean) {
  const sx = x + 2;
  // Vertical staff
  for (let dy = -5; dy <= 4; dy++) {
    px(ctx, pal.skinDark, sx, y + dy);
  }
  // Orb
  px(ctx, pal.team, sx - 1, y - 6, 3, 1);
  px(ctx, pal.team, sx, y - 7);
  px(ctx, pal.team, sx, y - 5);
  if (glow) {
    px(ctx, "#FFFFFF", sx, y - 6);
  }
}

function drawSpear(ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, thrust: number) {
  const sx = x + 2 + thrust;
  const sy = y;
  // Shaft (diagonal)
  for (let i = 0; i < 7; i++) {
    px(ctx, pal.skinDark, sx + i, sy - i);
  }
  // Tip
  px(ctx, pal.weapon, sx + 7, sy - 7);
  px(ctx, pal.metalDark, sx + 6, sy - 6);
}

// ── per-archetype canonical pose drawers ────────────────────────────────────
function drawSwordsman(c: HTMLCanvasElement, pal: Palette, frame: number, mode: "idle" | "walk" | "attack", back: boolean) {
  const ctx = ctxOf(c);
  let bob = 0, legSwing = 0, armSwing = 0, armRaise = 0;
  if (mode === "walk") {
    const t = frame % 4;
    legSwing = [ -2, 0, 2, 0 ][t];
    armSwing = [ 2, 0, -2, 0 ][t];
    bob = [0, -1, 0, -1][t];
  } else if (mode === "attack") {
    const t = frame % 3;
    armRaise = [0, 4, 2][t];
    bob = [0, -1, 0][t];
  }
  const ref = drawBaseHumanoid(ctx, pal, { bob, legSwing, armSwing, armRaise, back, helmet: true, cape: true });
  // Sword in weapon hand (drawn after body so it sits on top)
  drawSword(ctx, pal, ref.cx + 3, ref.weapY + 4, armRaise);
  // Shield in off hand
  px(ctx, pal.team, ref.cx - 5, ref.offY + 1, 1, 3);
  px(ctx, pal.teamDark, ref.cx - 5, ref.offY + 4);
  px(ctx, pal.outline, ref.cx - 5, ref.offY);
}

function drawArcher(c: HTMLCanvasElement, pal: Palette, frame: number, mode: "idle" | "walk" | "attack", back: boolean) {
  const ctx = ctxOf(c);
  let bob = 0, legSwing = 0, armSwing = 0;
  let drawn = false;
  if (mode === "walk") {
    const t = frame % 4;
    legSwing = [ -2, 0, 2, 0 ][t];
    armSwing = [ 1, 0, -1, 0 ][t];
    bob = [0, -1, 0, -1][t];
  } else if (mode === "attack") {
    const t = frame % 3;
    drawn = t === 1;
    armSwing = [0, 2, -1][t];
  }
  const ref = drawBaseHumanoid(ctx, pal, { bob, legSwing, armSwing, back, helmet: false });
  // Hood instead of helmet
  px(ctx, pal.clothDark, ref.cx - 2, ref.headTop - 1, 4, 2);
  px(ctx, pal.cloth, ref.cx - 2, ref.headTop, 4, 1);
  // Bow
  drawBow(ctx, pal, ref.cx + 3, ref.weapY + 3, drawn);
  // Quiver on back
  if (back) {
    px(ctx, "#5A3818", ref.cx - 1, ref.torsoTop + 1, 2, 4);
    px(ctx, pal.team, ref.cx - 1, ref.torsoTop, 2, 1);
  }
}

function drawCavalry(c: HTMLCanvasElement, pal: Palette, frame: number, mode: "idle" | "walk" | "attack", back: boolean) {
  const ctx = ctxOf(c);
  const cx = ANCHOR_X;
  const feet = ANCHOR_Y;
  const o = pal.outline;

  // ── Mount body (horse-like quadruped) ────────────────────────────────────
  let gallop = 0;
  if (mode === "walk") gallop = [0, 1, 0, -1][frame % 4];
  if (mode === "attack") gallop = [0, -1, 1][frame % 3];

  // Body block 12×5
  const bodyY = feet - 10 + gallop;
  for (let dy = 0; dy < 5; dy++) {
    px(ctx, pal.skinDark, cx - 6, bodyY + dy, 12, 1);
  }
  px(ctx, "#3A2A1A", cx - 6, bodyY, 12, 1);
  px(ctx, pal.cloth, cx - 5, bodyY + 1, 10, 1); // team blanket

  // Legs (4)
  px(ctx, o, cx - 5, feet - 3, 1, 3);
  px(ctx, o, cx - 2, feet - 3, 1, 3);
  px(ctx, o, cx + 2, feet - 3, 1, 3);
  px(ctx, o, cx + 5, feet - 3, 1, 3);

  // Tail
  px(ctx, "#3A2A1A", cx - 7, bodyY + 1, 1, 4);

  // Head + neck
  const headX = cx + 6;
  px(ctx, "#3A2A1A", headX, bodyY - 2, 2, 4);
  px(ctx, pal.skinDark, headX + 1, bodyY - 3, 2, 2);
  px(ctx, o, headX + 2, bodyY - 2); // eye

  // ── Rider ────────────────────────────────────────────────────────────────
  const riderFeet = bodyY + 1;
  const torsoTop = riderFeet - 7;
  for (let y = torsoTop; y <= riderFeet - 1; y++) {
    px(ctx, pal.cloth, cx - 2, y, 5, 1);
  }
  px(ctx, pal.clothDark, cx - 2, torsoTop, 5, 1);
  px(ctx, pal.team, cx - 2, riderFeet - 1, 5, 1);
  // Head
  for (let dy = 0; dy < 4; dy++) px(ctx, pal.skin, cx - 1, torsoTop - 4 + dy, 3, 1);
  px(ctx, o, cx - 1, torsoTop - 4, 3, 1);
  px(ctx, o, cx - 2, torsoTop - 3, 1, 3);
  px(ctx, o, cx + 2, torsoTop - 3, 1, 3);
  // Helmet
  px(ctx, pal.metal, cx - 1, torsoTop - 5, 3, 1);
  px(ctx, pal.team, cx, torsoTop - 6);
  // Face
  if (!back) {
    px(ctx, o, cx - 1, torsoTop - 2);
    px(ctx, o, cx + 1, torsoTop - 2);
  }
  // Lance arm + lance
  let lancePush = 0;
  if (mode === "attack") lancePush = [0, 3, 1][frame % 3];
  drawSpear(ctx, pal, cx + 1 + lancePush, torsoTop, 0);
}

function drawMonster(c: HTMLCanvasElement, pal: Palette, frame: number, mode: "idle" | "walk" | "attack", back: boolean) {
  const ctx = ctxOf(c);
  const cx = ANCHOR_X;
  const feet = ANCHOR_Y;
  const o = pal.outline;

  let bob = 0, stomp = 0, arm = 0;
  if (mode === "walk") {
    const t = frame % 4;
    bob = [0, -1, 0, -1][t];
    stomp = [-1, 0, 1, 0][t];
  } else if (mode === "attack") {
    const t = frame % 3;
    arm = [0, 3, 1][t];
    bob = [0, -2, 0][t];
  }

  // Big body (10×9 block)
  const bodyW = 14;
  const bodyTop = feet - 18 + bob;
  const bodyBot = feet - 4 + bob;
  for (let y = bodyTop; y <= bodyBot; y++) {
    const w = bodyW - Math.abs(y - (bodyTop + 5));
    px(ctx, pal.cloth, cx - w/2, y, w, 1);
  }
  // Side shading
  for (let y = bodyTop; y <= bodyBot; y++) {
    const w = bodyW - Math.abs(y - (bodyTop + 5));
    px(ctx, pal.clothDark, cx - w/2, y, 1, 1);
    px(ctx, pal.clothDark, cx + w/2 - 1, y, 1, 1);
  }
  // Team marker (chest stripe)
  px(ctx, pal.team, cx - 3, bodyTop + 4, 6, 1);

  // Legs / stomps
  for (let dy = 0; dy < 4; dy++) {
    px(ctx, pal.clothDark, cx - 4 + stomp, feet - 3 + dy, 3, 1);
    px(ctx, pal.clothDark, cx + 1 - stomp, feet - 3 + dy, 3, 1);
  }
  px(ctx, o, cx - 4 + stomp, feet, 3, 1);
  px(ctx, o, cx + 1 - stomp, feet, 3, 1);

  // Head (big)
  const headY = bodyTop - 5;
  for (let dy = 0; dy < 5; dy++) px(ctx, pal.cloth, cx - 3, headY + dy, 6, 1);
  px(ctx, o, cx - 3, headY, 6, 1);
  px(ctx, o, cx - 3, headY + 4, 6, 1);
  // Eyes (glow when attacking)
  const eyeColor = mode === "attack" ? "#FFEE55" : pal.team;
  if (!back) {
    px(ctx, eyeColor, cx - 2, headY + 2);
    px(ctx, eyeColor, cx + 1, headY + 2);
    px(ctx, o, cx - 1, headY + 3, 2, 1); // mouth
  }
  // Horns
  px(ctx, o, cx - 3, headY - 1);
  px(ctx, o, cx + 2, headY - 1);
  px(ctx, pal.outline, cx - 4, headY - 2);
  px(ctx, pal.outline, cx + 3, headY - 2);

  // Arms (big claws)
  const armY = bodyTop + 4;
  vcol(ctx, pal.cloth, cx - 7, armY, armY + 6);
  vcol(ctx, pal.clothDark, cx - 7, armY + 6, armY + 6);
  px(ctx, "#F8F8F8", cx - 8, armY + 6); // claw
  const rArmY = armY - arm;
  vcol(ctx, pal.cloth, cx + 6, rArmY, rArmY + 6);
  vcol(ctx, pal.clothDark, cx + 6, rArmY + 6, rArmY + 6);
  px(ctx, "#F8F8F8", cx + 7, rArmY + 6);
  px(ctx, "#F8F8F8", cx + 7, rArmY + 5);
}

function drawMage(c: HTMLCanvasElement, pal: Palette, frame: number, mode: "idle" | "walk" | "attack", back: boolean) {
  const ctx = ctxOf(c);
  let bob = 0, legSwing = 0, armSwing = 0, armRaise = 0;
  if (mode === "walk") {
    const t = frame % 4;
    bob = [0, -1, 0, -1][t];
    legSwing = [-1, 0, 1, 0][t];
  } else if (mode === "attack") {
    const t = frame % 3;
    armRaise = [0, 4, 2][t];
    bob = [0, -1, 0][t];
  }
  const ref = drawBaseHumanoid(ctx, pal, { bob, legSwing, armSwing, armRaise, back, helmet: false, robe: true });
  // Pointy hat
  for (let dy = 0; dy < 5; dy++) {
    const w = 6 - dy;
    px(ctx, pal.team, ref.cx - w/2, ref.headTop - 1 - dy, w, 1);
  }
  px(ctx, pal.teamDark, ref.cx - 3, ref.headTop - 1, 6, 1);
  // Staff in weapon hand
  drawStaff(ctx, pal, ref.cx + 3, ref.weapY + 2, mode === "attack" && frame === 1);
}

// ── orchestration ───────────────────────────────────────────────────────────
function drawForFacing(
  c: HTMLCanvasElement,
  archetype: Archetype,
  pal: Palette,
  frame: number,
  mode: "idle" | "walk" | "attack",
  facing: Facing,
) {
  const ctx = ctxOf(c);
  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);

  const back = isBackFacing(facing);
  const mirror = isMirrored(facing);

  // We always draw the canonical right-facing pose into the canvas, then
  // optionally flip the whole canvas horizontally for left-facing variants.
  if (mirror) {
    // Render canonical pose into a temp canvas, then blit mirrored.
    const tmp = makeCanvas();
    drawArchetype(tmp, archetype, pal, frame, mode, back);
    ctx.save();
    ctx.translate(SPRITE_W, 0);
    ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  } else {
    drawArchetype(c, archetype, pal, frame, mode, back);
  }
}

function drawArchetype(
  c: HTMLCanvasElement,
  archetype: Archetype,
  pal: Palette,
  frame: number,
  mode: "idle" | "walk" | "attack",
  back: boolean,
) {
  switch (archetype) {
    case "swordsman": return drawSwordsman(c, pal, frame, mode, back);
    case "archer":    return drawArcher(c, pal, frame, mode, back);
    case "cavalry":   return drawCavalry(c, pal, frame, mode, back);
    case "monster":   return drawMonster(c, pal, frame, mode, back);
    case "mage":      return drawMage(c, pal, frame, mode, back);
  }
}

function drawDeath(c: HTMLCanvasElement, pal: Palette, archetype: Archetype) {
  const ctx = ctxOf(c);
  // Render a generic toppled silhouette: low oval body with limbs splayed.
  const cy = ANCHOR_Y - 2;
  const cx = ANCHOR_X;
  px(ctx, pal.cloth, cx - 7, cy, 14, 3);
  px(ctx, pal.clothDark, cx - 7, cy, 14, 1);
  px(ctx, pal.team, cx - 4, cy + 1, 8, 1);
  // Head fallen to the right
  px(ctx, pal.skin, cx + 6, cy - 2, 3, 3);
  px(ctx, pal.outline, cx + 6, cy - 2, 3, 1);
  // X eyes
  px(ctx, pal.outline, cx + 7, cy - 1);
  // Weapon dropped
  if (archetype === "swordsman") {
    px(ctx, pal.weapon, cx - 8, cy + 1, 5, 1);
    px(ctx, pal.metalDark, cx - 3, cy + 1);
  } else if (archetype === "archer") {
    px(ctx, pal.weapon, cx - 9, cy, 1, 4);
    px(ctx, pal.outline, cx - 9, cy + 2);
  } else if (archetype === "mage") {
    px(ctx, pal.skinDark, cx - 9, cy, 4, 1);
    px(ctx, pal.team, cx - 9, cy - 1);
  } else if (archetype === "monster") {
    // Bigger heap
    px(ctx, pal.cloth, cx - 10, cy + 1, 5, 2);
    px(ctx, pal.clothDark, cx - 10, cy + 1, 5, 1);
  }
}

// ── public API ──────────────────────────────────────────────────────────────
const cache = new Map<string, SpriteSheet>();

export function getSpriteSheet(def: CharacterDef, team: "A" | "B"): SpriteSheet {
  const archetype = archetypeFor(def);
  const accent = def.color || "#7AA7E8";

  // 1) Prefer the animated luizmelo sheet when its pack is loaded.
  //    Every fighter is mapped to one of 5 luizmelo packs by archetype
  //    (martial-hero / skeleton / goblin / mushroom / flying-eye) and
  //    tinted with the fighter's signature color so silhouettes read
  //    distinct even when packs are shared.
  const luiz = getLuizmeloSheet(def, team, archetype);
  if (luiz.ready) {
    const luizKey = `luiz|${luiz.packName}|${team}|${accent}`;
    const luizHit = cache.get(luizKey);
    if (luizHit) return luizHit;
    const luizSheet: SpriteSheet = {
      archetype,
      team,
      anim: { idle: luiz.idle, walk: luiz.walk, attack: luiz.attack, death: luiz.death },
    };
    cache.set(luizKey, luizSheet);
    return luizSheet;
  }

  // 2) Fallback: procedural pixel-art sheet (Path A). Used during the
  //    fractional second before luizmelo PNGs finish loading, or when
  //    asset loads outright fail.
  const key = `proc|${archetype}|${team}|${accent}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const pal = makePalette(team, accent);

  const idle: HTMLCanvasElement[] = [];
  const walk: HTMLCanvasElement[][] = [];
  const attack: HTMLCanvasElement[][] = [];
  for (let fi = 0; fi < FACINGS.length; fi++) {
    const f = FACINGS[fi];
    const idleC = makeCanvas();
    drawForFacing(idleC, archetype, pal, 0, "idle", f);
    idle.push(idleC);

    const walkFrames: HTMLCanvasElement[] = [];
    for (let i = 0; i < 4; i++) {
      const wc = makeCanvas();
      drawForFacing(wc, archetype, pal, i, "walk", f);
      walkFrames.push(wc);
    }
    walk.push(walkFrames);

    const attackFrames: HTMLCanvasElement[] = [];
    for (let i = 0; i < 3; i++) {
      const ac = makeCanvas();
      drawForFacing(ac, archetype, pal, i, "attack", f);
      attackFrames.push(ac);
    }
    attack.push(attackFrames);
  }
  const deathC = makeCanvas();
  drawDeath(deathC, pal, archetype);

  const sheet: SpriteSheet = {
    archetype,
    team,
    anim: { idle, walk, attack, death: deathC },
  };
  // Cached under the "proc|" prefix; the luizmelo path uses "luiz|" so
  // both sheets can coexist and the luizmelo one wins once loaded.
  cache.set(key, sheet);
  return sheet;
}

export function facingIndex(f: Facing): number {
  return FACINGS.indexOf(f);
}

export function clearSpriteCache() {
  cache.clear();
}

// ── projectile sprite (small flying icon) ───────────────────────────────────
let projectileCanvas: HTMLCanvasElement | null = null;
export function getProjectileSprite(): HTMLCanvasElement {
  if (projectileCanvas) return projectileCanvas;
  const c = (typeof document !== "undefined") ? document.createElement("canvas") : null;
  if (!c) {
    // Stub for non-browser env
    projectileCanvas = { width: 8, height: 8 } as unknown as HTMLCanvasElement;
    return projectileCanvas;
  }
  c.width = 8; c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#FFE066";
  ctx.fillRect(2, 3, 4, 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(3, 3, 2, 2);
  ctx.fillStyle = "#A06010";
  ctx.fillRect(6, 3, 1, 2);
  projectileCanvas = c;
  return c;
}
