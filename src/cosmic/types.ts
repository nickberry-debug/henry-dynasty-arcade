// Cosmic Squad — type system.
// Turn-based 2D top-down space combat. The board is a square grid;
// ships occupy single cells and move/fire by issuing orders that
// resolve at end-of-turn. Missile types 4-6 are homing — they retarget
// to the nearest enemy each tick of resolution.

export type Faction = "player" | "enemy";
export type ShipSize = "small" | "medium" | "capital";
export type Era = "starwars" | "halo" | "startrek" | "real" | "galactica" | "masseffect" | "wingcommander" | "eve" | "babylon5" | "future";

export type MissileId = "pulse" | "vulcan" | "lance" | "hawk" | "phoenix" | "nova";

export interface MissileSpec {
  id: MissileId;
  label: string;
  damage: number;
  range: number;             // cells the projectile can travel
  cooldown: number;          // turns between shots
  homing: boolean;           // type 4-6: retarget to nearest each tick
  aoe?: number;              // splash radius (cells), Nova only
  speed: number;             // cells per sub-tick during resolution
  emoji: string;
  description: string;
}

export const MISSILE_TYPES: MissileSpec[] = [
  { id: "pulse",   label: "Pulse",   damage: 8,  range: 5,  cooldown: 0, homing: false, speed: 4, emoji: "⚡", description: "Basic, fast, short range. Free fire." },
  { id: "vulcan",  label: "Vulcan",  damage: 12, range: 6,  cooldown: 1, homing: false, speed: 3, emoji: "🔥", description: "Rapid-fire cannon. Decent damage." },
  { id: "lance",   label: "Lance",   damage: 25, range: 8,  cooldown: 2, homing: false, speed: 5, emoji: "🎯", description: "Single shot, high damage." },
  { id: "hawk",    label: "Hawk",    damage: 18, range: 10, cooldown: 2, homing: true,  speed: 3, emoji: "🦅", description: "Homing — locks nearest target. Friendly fire risk!" },
  { id: "phoenix", label: "Phoenix", damage: 35, range: 12, cooldown: 3, homing: true,  speed: 2, emoji: "🔱", description: "Heavy homing missile. Tracks but slow." },
  { id: "nova",    label: "Nova",    damage: 50, range: 9,  cooldown: 4, homing: true,  speed: 2, aoe: 2, emoji: "💥", description: "Devastating AOE on impact. Stay clear." },
];

export type ShipClassId =
  | "rebel_x_class" | "imperial_ty_fighter" | "rebel_a_class" | "imperial_destroyer"
  | "spartan_lancer" | "covenant_seraph" | "covenant_phantom"
  | "federation_explorer" | "klingon_raider" | "romulan_warbird"
  | "shuttle_orbiter" | "dragon_capsule" | "apollo_capsule"
  | "viper_mark_seven" | "normandy" | "rapier_two" | "interceptor_drone"
  | "minbari_flyer" | "aegis_destroyer" | "recon_scout";

export interface ShipClass {
  id: ShipClassId;
  name: string;
  inspiredBy: string;
  era: Era;
  faction: string;               // narrative faction label
  size: ShipSize;
  hp: number;
  speed: number;                 // max move cells per turn
  maneuverability: number;       // 1-10, affects evasion chance
  weaponSlots: number;
  shieldFront: number;
  shieldRear: number;
  shieldLR: number;
  description: string;
  special: string;
  unlockRank: number;            // RANK_TIERS index
  primaryColor: string;
  accent: string;
}

export const RANK_TIERS = ["Cadet", "Ensign", "Lieutenant", "Captain", "Commander", "Admiral", "Fleet Admiral"] as const;
export type RankTier = typeof RANK_TIERS[number];

export interface Wingman {
  id: string;
  callsign: string;
  realName: string;
  rank: RankTier;
  gunnery: number;       // 1-10
  piloting: number;      // 1-10
  loyalty: number;       // 1-10
  kills: number;
  missions: number;
  backstory: string;
  shipClassId: ShipClassId;
  /** True when dead — kept on the memorial wall. */
  dead?: boolean;
  /** True when they died on this mission (UI flagging). */
  diedThisMission?: boolean;
}

/** Live state of a single ship on the combat grid. */
export interface ShipState {
  id: string;
  ownerSlot: "player" | "wingman" | "enemy" | "ally";
  /** For wingmen/enemies, which Wingman record this maps to (if any). */
  wingmanId?: string;
  classId: ShipClassId;
  faction: Faction;
  /** Grid coordinates (0-indexed). */
  x: number;
  y: number;
  /** Movement-velocity carry-over from last turn (momentum). */
  vx: number;
  vy: number;
  /** Current facing in radians. Used when velocity is ~0 so the ship
   *  still has an orientation. */
  heading?: number;
  /** Steering target (set by orders). The engine steers velocity toward
   *  this each sub-tick, limited by the ship's turn rate + accel. */
  targetX?: number;
  targetY?: number;
  hp: number;
  hpMax: number;
  shieldFront: number;
  shieldRear: number;
  shieldLR: number;
  /** Loadout = ordered list of missile ids the ship has equipped. */
  loadout: MissileId[];
  /** Cooldowns by missile id — turn number when each unlocks. */
  cooldowns: Partial<Record<MissileId, number>>;
  /** Friendly-callsign for radio chatter. */
  callsign: string;
  /** Set true the turn it's destroyed. */
  destroyed?: boolean;
  /** Set true while pilot is ejected in escape pod. */
  inPod?: boolean;
}

export interface Missile {
  id: string;
  type: MissileId;
  /** Ship id that fired it (used for kill credit + friendly-fire detection). */
  ownerId: string;
  ownerFaction: Faction;
  x: number;
  y: number;
  /** Velocity vector (cells per sub-tick). */
  vx: number;
  vy: number;
  /** Cells remaining to live before fizzle. */
  range: number;
  /** For homing missiles, the current target ship id (may retarget). */
  targetId?: string;
}

/** Battlefield hazard. Asteroids damage ships that ram them and
 *  catch missiles. Nebulae are decorative — they tint the cell. */
export interface Obstacle {
  id: string;
  kind: "asteroid" | "nebula";
  x: number;
  y: number;
  /** Cell-units. Asteroids 0.4-1.2; nebulae 1.5-3. */
  radius: number;
  /** Rotation seed (so each rock looks different). */
  seed: number;
}

export type MissionObjective =
  | "destroy_all"             // Kill every enemy
  | "defend_target"           // Protect a friendly target ship for N turns
  | "escort"                  // Get an ally to a specific cell
  | "survive_turns"           // Survive N turns
  | "destroy_target"          // Destroy a specific high-value ship
  | "rescue"                  // Reach a friendly escape pod and protect it
  | "infiltrate"              // Get to a target cell undetected
  | "bomb_run"                // Reach the bomb point and unload Nova
  | "ace_duel"                // 1v1 with an enemy ace
  | "patrol";                 // Survey waypoints, kill anything hostile

export interface MissionTemplate {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  objective: MissionObjective;
  turnLimit: number;
  /** Number of enemy ships in the spawn pool. */
  enemyCount: [number, number];          // [min, max]
  /** Enemy ship classes eligible to spawn for this mission. */
  enemyClasses: ShipClassId[];
  /** Allowed wingmen count. */
  maxWingmen: number;
  /** Reward in rank points + credits. */
  rewardRank: number;
  rewardCredits: number;
  /** Optional ship-class to unlock on first completion. */
  unlockClass?: ShipClassId;
  /** Free-text briefing for the AI to spruce up (or used directly without API). */
  briefing: string;
  intel: string;
  hazards?: string;
}

/** A finished or in-progress combat run. Lives in the studio's saved
 *  state. The replay system reads `turnHistory` to scrub. */
export interface Battle {
  id: string;
  missionId: string;
  startedAt: number;
  completedAt?: number;
  /** Turn-by-turn snapshots so the user can replay any moment. */
  turnHistory: Array<{
    turn: number;
    ships: ShipState[];
    missiles: Missile[];
    events: BattleEvent[];        // damage, deaths, fire orders, etc.
  }>;
  result?: "victory" | "defeat" | "draft";
  stats?: {
    kills: number;
    losses: number;
    damageTaken: number;
    turnsUsed: number;
  };
}

export interface BattleEvent {
  kind: "fire" | "hit" | "destroyed" | "eject" | "move" | "order";
  shipId?: string;
  missileType?: MissileId;
  targetId?: string;
  damage?: number;
  text: string;
}

export interface Save {
  id: string;
  createdAt: number;
  modifiedAt: number;
  pilotName: string;
  callsign: string;
  squadronName: string;
  /** Index into RANK_TIERS. */
  rank: number;
  rankPoints: number;
  credits: number;
  /** Ship class ids the pilot has unlocked. */
  unlockedShipClasses: ShipClassId[];
  /** Class currently flown. */
  currentShipClass: ShipClassId;
  /** Currently equipped missiles, in slot order. */
  loadout: MissileId[];
  /** Active wingmen (alive + flying). */
  wingmen: Wingman[];
  /** Memorial — wingmen who died. */
  memorial: Wingman[];
  /** Missions completed (count + ids). */
  completedMissions: string[];
  /** Saved battle replays (last 10). */
  battles: Battle[];
  /** Era theme picked at campaign start. */
  era: Era;
  difficulty: "cadet" | "veteran" | "ace";
}
