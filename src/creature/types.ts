// Creature Keeper — original Tamagotchi/Pokémon-style creature collection.
// Every creature, type, and move is original art and original naming. No
// franchise IP. Genre inspiration only.

/** Original elemental type system. Eight types with a rock-paper-scissors
 *  matchup table. Strong against / weak against listed on each entry. */
export type CreatureType =
  | "flame"   // fire-ish — strong vs bloom, weak vs tide
  | "tide"    // water-ish — strong vs flame, weak vs spark
  | "stone"   // earth-ish — strong vs spark, weak vs bloom
  | "gale"    // air-ish  — strong vs stone, weak vs shade
  | "spark"   // lightning — strong vs tide, weak vs stone
  | "shade"   // shadow   — strong vs gale, weak vs light
  | "bloom"   // nature   — strong vs stone, weak vs flame
  | "light";  // radiant  — strong vs shade, weak vs bloom

export const TYPE_INFO: Record<CreatureType, { label: string; emoji: string; color: string; strongVs: CreatureType; weakVs: CreatureType }> = {
  flame: { label: "Flame", emoji: "🔥", color: "#f97316", strongVs: "bloom", weakVs: "tide" },
  tide:  { label: "Tide",  emoji: "🌊", color: "#3b82f6", strongVs: "flame", weakVs: "spark" },
  stone: { label: "Stone", emoji: "🪨", color: "#92400e", strongVs: "spark", weakVs: "bloom" },
  gale:  { label: "Gale",  emoji: "💨", color: "#a5f3fc", strongVs: "stone", weakVs: "shade" },
  spark: { label: "Spark", emoji: "⚡", color: "#facc15", strongVs: "tide",  weakVs: "stone" },
  shade: { label: "Shade", emoji: "🌑", color: "#52525b", strongVs: "gale",  weakVs: "light" },
  bloom: { label: "Bloom", emoji: "🌿", color: "#22c55e", strongVs: "stone", weakVs: "flame" },
  light: { label: "Light", emoji: "✨", color: "#fde047", strongVs: "shade", weakVs: "bloom" },
};

/** Damage multiplier from `attacker` -> `defender`. */
export function typeMatchup(attacker: CreatureType, defender: CreatureType): number {
  if (TYPE_INFO[attacker].strongVs === defender) return 1.5;
  if (TYPE_INFO[attacker].weakVs === defender) return 0.6;
  return 1.0;
}

/** Per-creature personality affects stat growth + care preferences. */
export type Personality = "playful" | "stoic" | "shy" | "bold" | "loyal" | "curious";

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

/** A move the creature can use in battle. */
export interface Move {
  id: string;
  name: string;
  type: CreatureType;
  power: number;
  /** Energy cost (pp-equivalent). */
  cost: number;
  flavor: string;
}

/** Species template — every creature in the catalog has a 3-stage line
 *  (baby -> teen -> apex). Players hatch the baby; evolves at thresholds. */
/** Per-species class — orthogonal to elemental type. Drives flavor +
 *  future class-specific moves. Six classes for now. */
export type CreatureClass =
  | "warrior"     // physical bruiser
  | "scout"       // fast + evasive
  | "sage"        // wisdom-based caster
  | "brawler"     // close-range melee
  | "guardian"    // defensive tank
  | "trickster";  // odd mechanics + utility

export const CLASS_INFO: Record<CreatureClass, { label: string; emoji: string; description: string }> = {
  warrior:   { label: "Warrior",   emoji: "🗡️", description: "Hits hard, takes hits." },
  scout:     { label: "Scout",     emoji: "🏹", description: "Fast, evasive, first-strikes." },
  sage:      { label: "Sage",      emoji: "📜", description: "Wisdom-fueled magic, glass cannon." },
  brawler:   { label: "Brawler",   emoji: "👊", description: "Close-range melee specialist." },
  guardian:  { label: "Guardian",  emoji: "🛡️", description: "High HP + defense, slow." },
  trickster: { label: "Trickster", emoji: "🎭", description: "Status effects + oddball moves." },
};

export interface Species {
  id: string;
  /** Stable name across all three stages. */
  lineName: string;
  /** Stage names — index 0 = baby, 1 = teen, 2 = apex. */
  stageNames: [string, string, string];
  type: CreatureType;
  rarity: Rarity;
  /** Combat class, orthogonal to elemental type. Defaults to warrior
   *  for legacy entries that pre-dated the class field. */
  class: CreatureClass;
  flavor: string;
  /** Move ids learned at each stage (cumulative — learned moves stick). */
  movesByStage: [string[], string[], string[]];
  /** Visual descriptor — drives the SVG silhouette generator. */
  silhouette: {
    /** Body kind: blob | quadruped | bird | crystal | sprite | bug | snake | golem. */
    body: "blob" | "quadruped" | "bird" | "crystal" | "sprite" | "bug" | "snake" | "golem";
    /** Number of distinct color blobs in the procedural sprite. */
    spots: number;
  };
  /** Hidden species are not shown in the wild encounter picker until
   *  the reveal condition is met (defeat the apex of all 3 starters). */
  hidden?: boolean;
}

export interface CreatureNeeds {
  hunger: number;     // 0..100; 100 = full
  happiness: number;  // 0..100
  energy: number;     // 0..100
  cleanliness: number;// 0..100
  health: number;     // 0..100
}

export interface CreatureStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  energy: number;     // max battle energy
}

export interface Creature {
  id: string;
  speciesId: string;
  /** Player-chosen nickname. Defaults to the species stage name. */
  nickname: string;
  /** 0 = baby, 1 = teen, 2 = apex. Evolves at level thresholds. */
  stage: 0 | 1 | 2;
  level: number;
  xp: number;
  /** Friendship score 0..100 — boosts battle stats when high. */
  bond: number;
  personality: Personality;
  /** True for ~3% rolls — shiny/variant palette. */
  variant: boolean;
  stats: CreatureStats;
  /** Cumulative learned moves; player picks up to 4 to use in battle. */
  learnedMoveIds: string[];
  /** The 4 currently equipped (active) moves. */
  activeMoveIds: string[];
  needs: CreatureNeeds;
  /** Care streak (days in a row without neglect). */
  careStreak: number;
  bornAt: number;
  modifiedAt: number;
  /** Olympus hero id this creature is bonded to (cross-game link).
   *  When set: linked creature gets +1 bond per care action and +10% XP
   *  on battle wins, and the hero's profile shows it as a companion. */
  linkedHeroId?: string;
  /** Parents (set when born from breeding) — used for the family tree
   *  and to flag hybrid creatures. */
  parentIds?: [string, string];
}

/** XP needed to reach the given level. */
export function xpForLevel(level: number): number {
  return Math.round(35 * Math.pow(level, 1.6));
}

/** Evolution gates — stage 0 -> 1 at L10, 1 -> 2 at L24. */
export const EVO_LEVELS: Record<0 | 1, number> = { 0: 10, 1: 24 };

/** Per-profile save. */
export interface CreatureSave {
  profileId: string;
  /** Up to 3 active creatures the player carries day-to-day. */
  activeIds: string[];
  /** Full collection — every creature ever raised. */
  archive: Creature[];
  /** Care items inventory. */
  items: Record<string, number>;
  /** Wins / losses for family stats. */
  wins: number;
  losses: number;
  /** Achievements unlocked. */
  achievements: string[];
  /** In-game currency earned from battles. */
  berries: number;
  /** Selected habitat id for the active roster background. */
  habitatId: string;
  /** Track which species the player has at least seen in battle. */
  seenSpeciesIds: string[];
  /** Pokemon-style starter selection: false on first launch (player
   *  picks 1 of 3 to hatch), true after they've chosen. Existing saves
   *  with at least one creature in the archive migrate to true. */
  pickedStarter: boolean;
  modifiedAt: number;
}

/** Item types — care items (used on the hub) + battle items (used in battle). */
export type ItemEffect =
  | { kind: "care"; needs: Partial<CreatureNeeds>; bond?: number }
  | { kind: "battle-heal"; hp: number }
  | { kind: "battle-energy"; energy: number }
  | { kind: "xp"; amount: number };

export interface Item {
  id: string;
  name: string;
  emoji: string;
  description: string;
  price: number; // berries
  effect: ItemEffect;
}

/** Habitat — visual background + tiny passive bond bonus by matching type. */
export interface Habitat {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Creatures of this type get a small bond bonus when this habitat is active. */
  favoredType: CreatureType;
  bgGradient: string;
  accent: string;
  /** Berries cost to unlock. The Meadow is free; others must be bought. */
  unlockCost: number;
}

/** Default starter needs — at full but slightly worn so the player has
 *  immediate things to do. */
export function freshNeeds(): CreatureNeeds {
  return { hunger: 80, happiness: 75, energy: 90, cleanliness: 85, health: 100 };
}
