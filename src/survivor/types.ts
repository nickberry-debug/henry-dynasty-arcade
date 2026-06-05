// ⚡ Survivor — types. Single-screen "survivors" auto-battler. The hero
// auto-attacks the nearest enemy; the player only moves. Levels up by
// vacuuming XP gems and picks 1 of 3 upgrades on each level. Original
// art and naming throughout — genre format only.

export type Vec = { x: number; y: number };

/** A single hero archetype the player can pick. Each one is a stand-in
 *  for a character class already in the arcade (Battle Forge fighter,
 *  Olympus god, Creature Keeper creature) so we reuse the same emoji
 *  and color palette for instant identity. */
export interface HeroKind {
  id: string;
  name: string;
  emoji: string;
  color: string;
  flavor: string;
  /** Starting weapon ids — one or two. */
  startingWeapons: WeaponId[];
  /** Base stat block — clamped per level. */
  base: { hp: number; speed: number; pickupRadius: number; armor: number };
}

export type WeaponId =
  | "fist" | "spear" | "boomerang" | "fireball" | "shieldorb" | "icenova"
  | "lightning" | "garlicaura" | "axe" | "arrow";

export interface Weapon {
  id: WeaponId;
  name: string;
  emoji: string;
  color: string;
  /** Tier 1 -> tier 4 = "evolved". The visual + numbers grow with tier. */
  tier: 1 | 2 | 3 | 4;
  damage: number;
  /** Shots per second. */
  fireRate: number;
  /** Pixels (in arena coords). */
  range: number;
  /** "aim" = closest enemy line, "aura" = radial AoE around hero,
   *  "orbit" = orbits hero, "wave" = nova shockwave. */
  shape: "aim" | "aura" | "orbit" | "wave";
  flavor: string;
}

/** Passive item — modifies hero stats rather than firing projectiles. */
export interface Passive {
  id: PassiveId;
  name: string;
  emoji: string;
  /** Up to 5 stacks; per-stack modifier described in apply. */
  apply: (s: HeroStats, stack: number) => void;
  flavor: string;
}

export type PassiveId =
  | "boots" | "vest" | "magnet" | "spinach" | "wisdom" | "luck";

export interface HeroStats {
  hp: number;
  hpMax: number;
  speed: number;
  pickupRadius: number;
  armor: number;
  /** Multiplies all weapon damage. */
  power: number;
  /** Multiplies weapon fireRate. */
  haste: number;
  /** % chance bonus drops appear. */
  luck: number;
}

/** Live entity state. */
export interface Entity {
  id: number;
  kind: "hero" | "enemy" | "boss" | "gem" | "pickup";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  hpMax: number;
  /** Display radius for collision + draw. */
  radius: number;
  /** Emoji rendered at the entity's position. */
  glyph: string;
  /** Tint applied to the glyph (CSS hue-rotate). Optional. */
  tint?: string;
  /** XP value for gems. */
  xpValue?: number;
  /** Pickup effect id. */
  pickup?: "heal" | "bomb" | "magnet";
  /** Damage dealt on contact (enemies). */
  contactDamage?: number;
  /** Flash timer (paint white on hit). */
  flash?: number;
  /** Enemy archetype id — drives behavior + drops. */
  archetype?: EnemyArchetype;
  /** Sprite id used by the renderer to pick a hand-drawn silhouette
   *  instead of the emoji fallback. For heroes: the HeroKind id
   *  (spartan, mage, huntress, berserker, monk, pyrekit). For enemies:
   *  matches the archetype. Renderer falls back to glyph if unset. */
  spriteId?: string;
}

export type EnemyArchetype =
  | "swarm" | "fast" | "tank" | "ranged" | "shooter" | "miniboss" | "boss";

/** One projectile fired by a weapon. */
export interface Projectile {
  id: number;
  weaponId: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;       // ticks remaining
  damage: number;
  radius: number;
  color: string;
  /** "aim"/"orbit"/"wave"/"aura" — visual hint. */
  shape: "aim" | "aura" | "orbit" | "wave";
  /** For orbit weapons: angle around hero. */
  orbitT?: number;
  /** Hit dedupe set per projectile so a single shot doesn't tick the
   *  same enemy twice. */
  hitSet?: Set<number>;
}

/** What level-up offers — 3 cards each level. */
export type ChoiceKind = "weapon-new" | "weapon-up" | "passive-new" | "passive-up";
export interface Choice {
  id: string;
  kind: ChoiceKind;
  title: string;
  description: string;
  emoji: string;
  color: string;
  apply: () => void;
}

export interface RunStats {
  kills: number;
  /** Total damage dealt this run. */
  damage: number;
  level: number;
  xp: number;
  xpToNext: number;
  /** Run length in seconds. */
  elapsed: number;
  /** Money earned this run (used for meta-progression). */
  coins: number;
}

/** Biome — visual + enemy seed. */
export type BiomeId = "meadow" | "ashlands" | "starfield" | "ruins";
export interface Biome {
  id: BiomeId;
  name: string;
  bg: string;       // CSS background string
  ground: string;   // dot color for the floor
  enemyTints: string[];
}

/** Saved progress between runs. */
export interface SurvivorSave {
  profileId: string;
  /** Permanent currency carried run-to-run. */
  coins: number;
  /** Best-time per hero across all runs (seconds survived). */
  bestTimeByHero: Record<string, number>;
  /** Highest level reached per hero. */
  bestLevelByHero: Record<string, number>;
  totalKills: number;
  totalRuns: number;
  /** Meta upgrades purchased — keyed by upgrade id, value = level. */
  meta: Record<string, number>;
  /** Heroes unlocked beyond the default starter. */
  unlocked: string[];
  modifiedAt: number;
}
