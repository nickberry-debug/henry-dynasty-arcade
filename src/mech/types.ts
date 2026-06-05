// Mech Combat — original robot-brawling game in the "build a bot, watch
// it fight" genre. Genre inspiration only — every part / weapon / bot
// in this game is original art and original naming. No franchise IP.

export type SlotId = "head" | "leftArm" | "rightArm" | "chest" | "legs";

/** Armor tier — drives weight, hp, and visual flair. */
export type ArmorTier = "light" | "medium" | "heavy";

/** Rarity — common parts drop everywhere, legendaries only in late leagues. */
export type Rarity = "common" | "uncommon" | "rare" | "legendary";

/** League progression — each tier scales the enemy difficulty + prize $. */
export type League = "rookie" | "amateur" | "pro" | "champion" | "legend";

/** What a part contributes to the bot's overall stats. Every value is a
 *  delta applied to the bot's running totals at assembly time. */
export interface PartStats {
  armor: number;     // raw damage soaked before HP loss
  weight: number;    // total weight gates speed; over the cap = sluggish
  power: number;     // multiplies weapon damage (chest/legs feed this)
  energy: number;    // weapons consume; chest refills it per tick
  balance: number;   // legs/feet stat — affects knockback resistance
  speed: number;     // base movement speed
  hp: number;        // chest contributes the most; head + legs add some
}

export interface BotPart {
  id: string;
  slot: SlotId;
  name: string;
  flavor: string;             // 1-line description for the parts shop
  tier: ArmorTier;
  rarity: Rarity;
  stats: PartStats;
  /** Weapon mount slot — arms have it, head doesn't. The arm part either
   *  IS a weapon (built-in) or can ACCEPT one (mount). */
  weaponMount?: WeaponMount;
  /** Hex color for the bot's painted body. Player can repaint later. */
  paint?: string;
}

export interface WeaponMount {
  /** "small" mounts only one-handed weapons; "large" accepts heavy. */
  size: "small" | "large";
}

/** Weapon catalog entry. Damage, fire rate, range. Every weapon has a
 *  distinct visible discharge (projectile / beam / particle cone). */
export interface Weapon {
  id: string;
  name: string;
  kind: "missile" | "cannon" | "beam" | "flamer" | "saw" | "rail" | "cluster" | "shock";
  /** Required mount size. */
  mount: "small" | "large";
  damage: number;
  /** Shots per second at full energy. */
  fireRate: number;
  /** Effective range in arena units. */
  range: number;
  /** Energy cost per shot. */
  energyCost: number;
  weight: number;
  tier: Rarity;
  flavor: string;
  /** Display color for the projectile/beam. */
  color: string;
}

/** Fully-assembled bot. */
export interface Bot {
  id: string;
  name: string;
  paint: string;             // primary chassis color
  decals?: string;            // optional sticker text on the chassis
  parts: Record<SlotId, BotPart>;
  weapons: { left?: Weapon; right?: Weapon };
  /** Derived totals at assembly time. */
  derived: PartStats;
  /** AI behavior preset — affects target selection + retreat threshold. */
  personality: "aggressive" | "defensive" | "balanced" | "snipe";
  createdAt: number;
  modifiedAt: number;
}

/** A single battle record — used for replay + family stats. */
export interface MechBattle {
  id: string;
  whenMs: number;
  /** Players' bots (left is the saved profile's bot). */
  left: { botName: string; profileId?: string };
  right: { botName: string; profileId?: string };
  league: League;
  winner: "left" | "right";
  durationMs: number;
  /** Brief KO summary for replay listing ("Right arm severed in 22s"). */
  summary: string;
}

/** Save slot — one per profile. */
export interface MechSave {
  /** Profile id — provided by familyKey() helper. */
  profileId: string;
  /** Player's stable of bots. */
  bots: Bot[];
  /** Currently active bot id. */
  activeBotId: string | null;
  /** Currency. */
  money: number;
  /** Salvage materials from defeated enemies. */
  scrap: number;
  /** League the player is currently climbing. */
  league: League;
  /** Tracked stats. */
  wins: number;
  losses: number;
  /** Trophy room — names + leagues won. */
  trophies: Array<{ league: League; wonAt: number; bracket: string }>;
  /** Recent battles for the replay screen (capped). */
  battles: MechBattle[];
  /** Achievement ids the player has earned. */
  achievements: string[];
  /** Part ids the player has purchased (or starts with). Builder gates
   *  swaps behind ownership — locked parts show a buy badge. */
  ownedPartIds: string[];
  /** Weapon ids the player has purchased. Optional: if missing on load
   *  (pre-v1.10.79 saves), treated as "all unlocked-league weapons owned"
   *  for backward compatibility. */
  ownedWeaponIds?: string[];
  /** Per-bot residual HP fraction carried between fights. Missing = full.
   *  Repair bay clears entries back to 1.0; battles deduct here. */
  botHp?: Record<string, number>;
  /** Wins recorded in each league. Promotion match unlocks when the
   *  current league's count hits its WINS_FOR_PROMOTION threshold; the
   *  count resets to 0 on successful promotion. Pre-v1.10.81 saves
   *  start empty and ramp from the next win they earn. */
  leagueWins?: Partial<Record<League, number>>;
  modifiedAt: number;
}

/** How many wins in a league unlock the promotion match. Climbs steeper
 *  in higher leagues so the long tail still feels earned. Legend has no
 *  promotion — it's the top of the ladder. */
export const WINS_FOR_PROMOTION: Record<League, number> = {
  rookie:   5,
  amateur:  6,
  pro:      7,
  champion: 8,
  legend:   Infinity,
};

export const LEAGUE_ORDER: League[] = ["rookie", "amateur", "pro", "champion", "legend"];

// Prize purse scales steeper now (#18 progression rebalance) so each
// league climb is a real "I can finally afford the legendary parts" moment.
// Old curve was 75 → 220 → 500 → 1200 → 3000; ~5× by Champion.
// New curve: 120 → 360 → 850 → 2200 → 5500; ~7× by Champion + faster
// rookie ramp so the player isn't grinding 30+ wins to upgrade.
export const LEAGUE_INFO: Record<League, { label: string; prize: number; difficulty: number }> = {
  rookie:    { label: "Rookie Yard",        prize:  120, difficulty: 0.6 },
  amateur:   { label: "Amateur Arena",      prize:  360, difficulty: 0.85 },
  pro:       { label: "Pro Circuit",        prize:  850, difficulty: 1.0 },
  champion:  { label: "Champion's Forge",   prize: 2200, difficulty: 1.25 },
  legend:    { label: "Legend's Coliseum",  prize: 5500, difficulty: 1.6 },
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common:    "#94a3b8",
  uncommon:  "#86efac",
  rare:      "#60a5fa",
  legendary: "#fbbf24",
};
