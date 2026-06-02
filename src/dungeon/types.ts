// types.ts — Dungeon crawler shared types.

export type DungeonClassId = "warrior" | "ranger" | "mage";

export interface DungeonClass {
  id: DungeonClassId;
  name: string;
  emoji: string;
  description: string;
  /** Base stats at level 1 before stat-point distribution. */
  baseStats: HeroStats;
  /** Primary scaling stat — XP/levelup grants more of this. */
  primary: keyof HeroStats;
  /** Ability ids unlocked at levels 1, 3, 5. */
  abilities: [string, string, string];
  /** Starting equipment ids. */
  startGear: { weapon: string; armor: string; trinket?: string };
  /** Brief lore tagline shown on select. */
  tagline: string;
  /** Spritesheet row index in Kenney Tiny Dungeon character grid. */
  spriteRow: number;
}

export interface HeroStats {
  /** Hit points pool — derived: 30 + 10*str + 5*lvl */
  strength: number;
  /** Mana pool — derived: 10 + 5*int + 3*lvl */
  intellect: number;
  /** Dodge + crit chance + attack speed. */
  agility: number;
  /** Damage reduction + max HP bonus. */
  vitality: number;
}

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type ItemSlot = "weapon" | "armor" | "trinket";

export interface ItemAffix {
  /** Display: "+5 Strength" */
  label: string;
  stat?: keyof HeroStats;
  bonus?: number;
  /** Flat damage / armor bonus applied at calc time. */
  damageBonus?: number;
  armorBonus?: number;
  /** Special: lifesteal %, crit %, etc. */
  lifesteal?: number;
  critBonus?: number;
}

export interface Item {
  id: string;
  /** Base template id (for shop restocks). */
  baseId: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  /** Base item-level (1..10) — drives damage/armor band. */
  ilvl: number;
  /** Min/max damage for weapons, armor value for armor. */
  damage?: [number, number];
  armor?: number;
  /** Class lock — undefined = anyone. */
  classLock?: DungeonClassId;
  affixes: ItemAffix[];
  /** Buy price in gold; sell = floor(buy/3). */
  price: number;
  /** Sprite id from tileset. */
  icon: string;
  description?: string;
}

export interface Ability {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Mana cost. 0 = free. */
  cost: number;
  /** Cooldown in turns. */
  cooldown: number;
  /** Range in tiles (1 = melee). */
  range: number;
  /** Targets: enemy, ally, self, tile, all-enemies, line, cone. */
  target: "enemy" | "self" | "tile" | "all-enemies" | "all-allies";
  /** Damage multiplier vs base weapon damage. 1.0 = normal hit. */
  damageMult?: number;
  /** Flat damage bonus. */
  flatDamage?: number;
  /** Damage type (affects resists). */
  damageType?: "physical" | "fire" | "ice" | "poison" | "lightning" | "holy" | "shadow";
  /** Heal amount (positive HP restoration). */
  heal?: number;
  /** Status to inflict on hit. */
  inflicts?: StatusEffect[];
  /** Self-buff applied. */
  selfBuff?: StatusEffect[];
  /** AoE radius if > 0. */
  aoe?: number;
}

export type StatusKind =
  | "poison" | "burn" | "stun" | "slow" | "bleed"
  | "shield" | "haste" | "rage" | "regen" | "weakness";

export interface StatusEffect {
  kind: StatusKind;
  /** Turns remaining. */
  duration: number;
  /** Per-turn damage / heal / stat delta. */
  power: number;
  /** Source label for tooltips. */
  source?: string;
}

export interface Hero {
  id: string;
  createdAt: number;
  modifiedAt: number;
  /** Imported from Olympus? Stores source heroId for round-trip. */
  olympusHeroId?: string;
  name: string;
  classId: DungeonClassId;
  level: number;
  xp: number;
  xpToNext: number;
  /** Allocatable points from leveling. */
  statPoints: number;
  stats: HeroStats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  equipment: { weapon?: Item; armor?: Item; trinket?: Item };
  inventory: Item[];
  abilities: string[]; // ability ids known
  /** Cosmetic. */
  appearance: { tint: string; emoji: string };
  /** All-time stats. */
  totals: { runs: number; floorsCleared: number; kills: number; bossKills: number };
}

export type TileKind = "wall" | "floor" | "door" | "stairsDown" | "stairsUp" | "chest" | "shrine";

export interface Tile {
  kind: TileKind;
  /** Has the player seen this tile? */
  seen: boolean;
  /** Is it currently visible (fog of war)? */
  visible: boolean;
  /** Decoration index — 0 = plain, >0 = sprite variant. */
  deco?: number;
}

export interface Room {
  x: number; y: number; w: number; h: number;
  /** Used for spawn placement. */
  cx: number; cy: number;
  kind: "normal" | "treasure" | "boss" | "start" | "shop";
}

export interface DungeonMap {
  floor: number;
  width: number;
  height: number;
  tiles: Tile[]; // row-major, length = width*height
  rooms: Room[];
  start: { x: number; y: number };
  stairsDown: { x: number; y: number };
  seed: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  emoji: string;
  sprite: string;
  baseHp: number;
  damage: [number, number];
  armor: number;
  /** Speed: turns it takes per action. 1 = standard. */
  speed: number;
  /** AI behavior. */
  ai: "melee" | "ranger" | "caster" | "boss";
  /** Range for ranger/caster. */
  range?: number;
  /** XP awarded. */
  xp: number;
  /** Gold range on kill. */
  gold: [number, number];
  /** Floor band where this spawns. */
  floors: [number, number];
  /** Loot table modifier (multiplier on drop chance). */
  lootMod?: number;
  abilities?: string[]; // ability ids the AI may use
  status?: StatusEffect[]; // resistances / immunities? (future)
}

export interface Enemy {
  id: string; // unique instance id
  templateId: string;
  name: string;
  emoji: string;
  sprite: string;
  x: number; y: number;
  hp: number;
  maxHp: number;
  damage: [number, number];
  armor: number;
  speed: number;
  ai: EnemyTemplate["ai"];
  range: number;
  xp: number;
  goldDrop: number;
  statuses: StatusEffect[];
  /** Cooldowns by ability id. */
  cooldowns: Record<string, number>;
  abilities: string[];
  /** Has this enemy noticed the player? Affects AI start. */
  alerted: boolean;
}

export interface Projectile {
  id: string;
  x: number; y: number;
  tx: number; ty: number;
  emoji: string;
  ownerSide: "hero" | "enemy";
  damage: number;
  damageType?: Ability["damageType"];
}

export interface FloatingText {
  id: string;
  x: number; y: number;
  text: string;
  color: string;
  age: number;
}

export interface Quest {
  id: string;
  title: string;
  beat: string;
  /** Triggers when player reaches this floor. */
  triggerFloor: number;
  /** Has the player seen this beat already? */
  seen: boolean;
}

export type RunPhase = "exploring" | "combat" | "shopping" | "victory" | "defeat" | "loading";

export interface CombatLogEntry {
  id: string;
  text: string;
  color: string;
  t: number;
}

export interface DungeonRun {
  id: string;
  heroId: string;
  seed: number;
  floor: number;
  map: DungeonMap | null;
  /** Player position on the current map. */
  px: number; py: number;
  enemies: Enemy[];
  /** Item drops sitting on the floor (gold + items). */
  drops: Array<{ id: string; x: number; y: number; kind: "gold" | "item"; amount?: number; item?: Item }>;
  projectiles: Projectile[];
  floatingText: FloatingText[];
  phase: RunPhase;
  /** Turn counter (combat turns; one full hero+enemy round = 1 turn). */
  turn: number;
  /** Player is currently aiming an ability — index in hero.abilities, else null. */
  aiming: number | null;
  quests: Quest[];
  /** Last shop floor visited so we don't spawn twice. */
  lastShopFloor: number;
  startedAt: number;
  modifiedAt: number;
  status: "active" | "won" | "lost";
  log: CombatLogEntry[];
}
