export type SizeClass = "tiny" | "small" | "medium" | "large" | "huge" | "colossal";
export type AttackType = "melee" | "ranged" | "indirect";
export type BattlePhase = "hub" | "setup" | "forging" | "intro" | "battle" | "results" | "replay";
export type AbilityVfxType = "lightning" | "shockwave" | "laser" | "fire" | "frost" | "nature" | "burst";

export interface UnitFrameData {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  state: "alive" | "dying" | "dead";
  flashTimer: number; attackCooldown: number; attackCooldownMax: number;
  deathTimer: number; deathVx: number; rageMode: boolean;
}

// ── visual build recipe ────────────────────────────────────────────────────────
export type BodyPlan =
  | "humanoid" | "quadruped" | "large_biped"
  | "blob" | "food_object" | "mechanical";

export type SurfaceType =
  | "metal" | "cloth" | "fur" | "scale"
  | "stone" | "organic" | "plastic" | "glow";

export type AttackAnimType =
  | "slash" | "thrust" | "slam" | "spin"
  | "ranged" | "beam" | "aoe_burst"
  | "bite" | "charge_ram" | "ground_pound" | "peck";

export interface BuildRecipe {
  bodyPlan: BodyPlan;
  headScale: number;     // 0.7–1.5
  torsoScale: number;    // 0.7–1.4
  limbScale: number;     // 0.7–1.3
  posture: "upright" | "hunched" | "towering";
  palette: [string, string, string]; // [primary, secondary, accent]
  surface: SurfaceType;
  features: string[];    // visual add-ons
  attackAnim: AttackAnimType;
}

export interface CharacterDef {
  id: string;
  name: string;
  emoji: string;
  category: string;
  size: SizeClass;
  stats: {
    hp: number;       // 10–1000
    power: number;
    speed: number;
    defense: number;
    special: number;
  };
  attackType: AttackType;
  color: string;
  cry: string;
  specialName: string;
  specialVfx?: AbilityVfxType;
  recipe?: BuildRecipe; // optional; AI-generated chars include this
}

export interface BattleUnit {
  uid: string;
  defId: string;
  name: string;
  emoji: string;
  size: SizeClass;
  attackType: AttackType;
  color: string;
  specialName: string;
  specialVfx?: AbilityVfxType;
  team: "A" | "B";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  power: number;
  speed: number;
  defense: number;
  special: number;
  radius: number;
  attackRange: number;
  attackCooldown: number;
  attackCooldownMax: number;
  specialCooldown: number;
  state: "alive" | "dying" | "dead";
  targetUid: string | null;
  flashTimer: number;
  deathTimer: number;
  kills: number;
  damageDealt: number;
  rageMode: boolean;
  lastStand: boolean;
  knockbackTimer: number;
  deathVx: number;
  deathVy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
  type: "spark" | "star" | "poof";
}

export interface MapConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  bgTop: string;
  bgBottom: string;
  groundColor: string;
  groundLineColor: string;
  accentColor: string;
  speedMultiplier: number;
  terrainQuirk: string;
  /** v2 environmental dressing (polish-pass) — visual only, no collision. */
  features?: MapFeature[];
}

export interface BattleResult {
  winner: "A" | "B" | "draw";
  teamAName: string;
  teamBName: string;
  teamASurvivors: number;
  teamBSurvivors: number;
  mvp: BattleUnit | null;
  durationMs: number;
  totalKills: number;
}

export interface BattleLogEntry {
  tick: number;
  text: string;
  type: "kill" | "special" | "milestone" | "start" | "end";
}

export interface VFXEvent {
  charId: string;
  x: number;
  y: number;
  effect?: AbilityVfxType;
  color?: string;
  scale?: number;
  targetX?: number;
  targetY?: number;
}

// --- v2 map features (polish-pass) ---
export type MapFeatureKind = 'castle' | 'rock' | 'bridge' | 'wall' | 'tree' | 'watchtower' | 'fence' | 'gate' | 'ruins';
export interface MapFeature {
  kind: MapFeatureKind;
  x: number;       // world tile x
  y: number;       // world tile y
  w?: number;      // optional width in tiles (default 1)
  h?: number;      // optional height (default 1)
  rotation?: number; // 0|90|180|270
}
