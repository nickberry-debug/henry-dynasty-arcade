// Mech Combat — parts + weapons catalog. All original designs and names.
// Tiered by rarity; the shop unlocks higher tiers as the player climbs
// leagues.

import type { BotPart, Weapon } from "./types";

const part = (id: string, slot: BotPart["slot"], name: string, tier: BotPart["tier"], rarity: BotPart["rarity"], stats: Partial<BotPart["stats"]>, flavor: string, weaponMount?: BotPart["weaponMount"], paint?: string): BotPart => ({
  id, slot, name, tier, rarity, flavor, weaponMount, paint,
  stats: {
    armor: 0, weight: 0, power: 0, energy: 0, balance: 0, speed: 0, hp: 0,
    ...stats,
  },
});

export const PARTS: BotPart[] = [
  // ── Heads ─────────────────────────────────────────────────────────────
  part("h_recon",    "head", "Recon Optic",     "light",  "common",    { armor: 4,  weight: 6,  energy: 3,  hp: 30,  speed: 2 },
       "Lightweight visor. Eagle-eyed but soft as cardboard."),
  part("h_visor",    "head", "ChromeVisor",     "medium", "common",    { armor: 8,  weight: 10, energy: 2,  hp: 50 },
       "Standard targeting unit. Reliable, unflashy."),
  part("h_brute",    "head", "BruteCage",       "heavy",  "uncommon",  { armor: 14, weight: 18, hp: 70, balance: 3 },
       "Welded steel cage. Doesn't see well, doesn't need to."),
  part("h_oracle",   "head", "Oracle Array",    "medium", "rare",      { armor: 9,  weight: 12, energy: 8,  power: 3, hp: 55 },
       "Predictive targeting — every shot lands a hair truer."),
  part("h_warlord",  "head", "Warlord Crown",   "heavy",  "legendary", { armor: 18, weight: 22, hp: 90, power: 5, balance: 4 },
       "Spiked, antique, terrifying. Other bots glitch on sight.", undefined, "#FFD700"),

  // ── Left arms ─────────────────────────────────────────────────────────
  part("la_basic",   "leftArm", "Workhorse Arm L", "light",  "common",   { armor: 5,  weight: 8,  hp: 35 },
       "A plain arm. Holds things.",                   { size: "small" }),
  part("la_clamp",   "leftArm", "TitanClamp L",    "heavy",  "uncommon", { armor: 14, weight: 16, hp: 60, balance: 2 },
       "Hydraulic claw that ALSO mounts heavy weapons.", { size: "large" }),
  part("la_servo",   "leftArm", "Servo Quick L",   "light",  "uncommon", { armor: 6,  weight: 7,  hp: 32, speed: 3, power: 2 },
       "Light, fast. Twitchy aim.",                    { size: "small" }),
  part("la_bastion", "leftArm", "Bastion Tower L", "heavy",  "rare",     { armor: 22, weight: 24, hp: 90, balance: 4 },
       "Built-in riot shield. Soaks hits all day.",     { size: "large" }),

  // ── Right arms ────────────────────────────────────────────────────────
  part("ra_basic",   "rightArm", "Workhorse Arm R", "light",  "common",   { armor: 5,  weight: 8,  hp: 35 },
       "A plain arm. Holds things.",                   { size: "small" }),
  part("ra_clamp",   "rightArm", "TitanClamp R",    "heavy",  "uncommon", { armor: 14, weight: 16, hp: 60, balance: 2 },
       "Hydraulic claw with a heavy mount.",            { size: "large" }),
  part("ra_servo",   "rightArm", "Servo Quick R",   "light",  "uncommon", { armor: 6,  weight: 7,  hp: 32, speed: 3, power: 2 },
       "Light, fast. Twitchy aim.",                    { size: "small" }),
  part("ra_bastion", "rightArm", "Bastion Tower R", "heavy",  "rare",     { armor: 22, weight: 24, hp: 90, balance: 4 },
       "Built-in riot shield. Soaks hits all day.",     { size: "large" }),

  // ── Chests ────────────────────────────────────────────────────────────
  part("c_scrap",    "chest", "Scrap Plating",   "light",  "common",    { armor: 12, weight: 14, hp: 120, energy: 8 },
       "Welded sheet metal. The starter chassis."),
  part("c_iron",     "chest", "Ironcore",        "medium", "common",    { armor: 22, weight: 24, hp: 200, energy: 12, power: 4 },
       "Reliable iron core. Most bots settle here."),
  part("c_reactor",  "chest", "Pulse Reactor",   "medium", "uncommon",  { armor: 20, weight: 22, hp: 180, energy: 22, power: 6 },
       "Faster energy regen, less mass armor."),
  part("c_juggernaut","chest","Juggernaut Hull", "heavy",  "rare",      { armor: 36, weight: 38, hp: 320, energy: 14, balance: 4 },
       "Tank chassis. Slow and unbreakable."),
  part("c_aegis",    "chest", "Aegis Core",      "heavy",  "legendary", { armor: 40, weight: 32, hp: 360, energy: 28, power: 8, balance: 6 },
       "Late-league dream chassis. Money can't buy taste.", undefined, "#c084fc"),

  // ── Legs ──────────────────────────────────────────────────────────────
  part("l_sprinter", "legs", "Sprint Treads",   "light",  "common",    { armor: 8,  weight: 10, hp: 60,  speed: 8, balance: 2 },
       "Light tracks. Fast on flat ground."),
  part("l_quad",     "legs", "Quad Strider",    "medium", "common",    { armor: 14, weight: 16, hp: 90,  speed: 4, balance: 5 },
       "Four-legged crawler. Stable, average speed."),
  part("l_hover",    "legs", "Hover Pods",      "light",  "uncommon",  { armor: 10, weight: 9,  hp: 70,  speed: 10, balance: 1, energy: 4 },
       "Levitates over rubble. Easy to knock back."),
  part("l_titan",    "legs", "Titan Anchors",   "heavy",  "rare",      { armor: 26, weight: 30, hp: 160, speed: 2, balance: 8 },
       "Bolted-down stompers. Almost impossible to topple."),
];

const weapon = (id: string, name: string, kind: Weapon["kind"], mount: Weapon["mount"], damage: number, fireRate: number, range: number, energyCost: number, weight: number, tier: Weapon["tier"], color: string, flavor: string): Weapon => ({
  id, name, kind, mount, damage, fireRate, range, energyCost, weight, tier, color, flavor,
});

// 18 weapons across 4 tiers. Higher tiers unlock as the bot climbs
// leagues — see `unlockedFor()` below. Bigger variety lets every league
// run feel like there's a new toy waiting in the shop.
export const WEAPONS: Weapon[] = [
  // ── Common (Rookie+) ──────────────────────────────────────────────────
  weapon("w_pulse",      "Pulse Cannon",      "cannon",  "small", 18, 1.4, 240, 6,  8,  "common",    "#fde047", "Standard issue, dead reliable."),
  weapon("w_inferno",    "Inferno Flamer",    "flamer",  "small", 6,  6.0, 90,  4,  10, "common",    "#fb923c", "Short range, total devastation."),
  weapon("w_autocannon", "Autocannon",        "cannon",  "small", 14, 2.4, 220, 5,  10, "common",    "#fbbf24", "Rapid pop-pop-pop. Cheap and chatty."),
  weapon("w_scrapgun",   "Scrap Shotgun",     "cluster", "small", 11, 1.6, 110, 6,  12, "common",    "#d97706", "Spreads bolts at close range."),

  // ── Uncommon (Amateur+) ───────────────────────────────────────────────
  weapon("w_lance",      "Plasma Lance",      "beam",    "small", 12, 2.8, 200, 10, 6,  "uncommon",  "#a78bfa", "Continuous beam. Burns hot, drinks energy."),
  weapon("w_homing",     "Homing Missile",    "missile", "large", 32, 0.8, 360, 16, 18, "uncommon",  "#f87171", "Locks on. Hard to dodge once it has you."),
  weapon("w_buzzsaw",    "Buzzsaw Blade",     "saw",     "small", 24, 1.8, 60,  3,  8,  "uncommon",  "#fca5a5", "Melee only. Sparks fly when you connect."),
  weapon("w_frostlance", "Frost Lance",       "beam",    "small", 10, 2.4, 220, 9,  7,  "uncommon",  "#7dd3fc", "Cold beam — slows the target slightly."),
  weapon("w_grenade",    "Grenade Lobber",    "cluster", "small", 16, 1.2, 200, 7,  11, "uncommon",  "#84cc16", "Arcs over cover. Lobs bouncing bombs."),

  // ── Rare (Pro+) ───────────────────────────────────────────────────────
  weapon("w_hailstorm",  "Hailstorm Cluster", "cluster", "large", 8,  3.6, 180, 12, 22, "rare",      "#7dd3fc", "Six rockets at once. Spray and pray."),
  weapon("w_thunder",    "Thunder Rail",      "rail",    "large", 52, 0.4, 400, 22, 26, "rare",      "#fbbf24", "Single tracer-bright shot. Devastating."),
  weapon("w_emp",        "EMP Lash",          "shock",   "small", 14, 1.2, 140, 8,  6,  "rare",      "#67e8f9", "Arcing lightning. Stuns electronics."),
  weapon("w_railgun",    "Coil Railgun",      "rail",    "large", 38, 0.8, 360, 18, 24, "rare",      "#a5f3fc", "Magnetic sniper. Pierces armor."),
  weapon("w_napalm",     "Napalm Tossbox",    "flamer",  "large", 14, 2.2, 160, 10, 18, "rare",      "#ef4444", "Sticky fire that keeps burning."),

  // ── Legendary (Champion+) ─────────────────────────────────────────────
  weapon("w_phaseblade", "Phase Blade",       "saw",     "large", 44, 1.2, 80,  10, 18, "legendary", "#c084fc", "Late-league bragging-rights weapon."),
  weapon("w_singularity","Singularity Lance", "beam",    "large", 28, 2.0, 320, 14, 22, "legendary", "#e879f9", "Pulls debris into the beam. Spectacle."),
  weapon("w_voidshot",   "Void Shot",         "cannon",  "large", 64, 0.6, 320, 24, 28, "legendary", "#7c3aed", "Slow, monstrous, perfect."),
  weapon("w_swarm",      "Swarm Drone Pod",   "missile", "large", 11, 4.5, 280, 12, 18, "legendary", "#22d3ee", "Releases 12 micro-drones per volley."),
];

// ── Weapon shop unlock gating (#18 progression) ───────────────────────
// Every league unlocks the next rarity bucket so each climb is the moment
// a new wall of toys lights up in the shop.
const WEAPON_UNLOCK_BY_LEAGUE: Record<string, Weapon["tier"][]> = {
  rookie:   ["common"],
  amateur:  ["common", "uncommon"],
  pro:      ["common", "uncommon", "rare"],
  champion: ["common", "uncommon", "rare", "legendary"],
  legend:   ["common", "uncommon", "rare", "legendary"],
};

/** Weapons the player can currently see / buy in the shop. */
export function weaponsUnlockedFor(league: string): Weapon[] {
  const allowed = new Set(WEAPON_UNLOCK_BY_LEAGUE[league] ?? ["common"]);
  return WEAPONS.filter(w => allowed.has(w.tier));
}

/** Whether a specific weapon is locked under the player's current league. */
export function isWeaponLocked(weaponId: string, league: string): boolean {
  const w = getWeapon(weaponId);
  if (!w) return true;
  const allowed = new Set(WEAPON_UNLOCK_BY_LEAGUE[league] ?? ["common"]);
  return !allowed.has(w.tier);
}

// ── Bot archetype presets ─────────────────────────────────────────────
// Quick-start configurations the player can apply from the Builder.
// Every preset uses parts the player has access to from the start AND
// weapons that are valid for the arm mount sizes chosen.
export interface BotPreset {
  id: string;
  name: string;
  flavor: string;
  emoji: string;
  parts: { head: string; chest: string; leftArm: string; rightArm: string; legs: string };
  weapons: { left: string | null; right: string | null };
  paint: string;
}

export const BOT_PRESETS: BotPreset[] = [
  {
    id: "scout", name: "Scout", emoji: "🏃",
    flavor: "Light + fast. Two small pulse guns. Hit and run.",
    parts: { head: "h_recon", chest: "c_scrap", leftArm: "la_servo", rightArm: "ra_servo", legs: "l_sprinter" },
    weapons: { left: "w_pulse", right: "w_autocannon" },
    paint: "#86efac",
  },
  {
    id: "tank", name: "Iron Tank", emoji: "🛡️",
    flavor: "Heavy armor + homing missiles. Walks slow, hits hard.",
    parts: { head: "h_brute", chest: "c_juggernaut", leftArm: "la_bastion", rightArm: "ra_bastion", legs: "l_titan" },
    weapons: { left: "w_homing", right: "w_homing" },
    paint: "#9ca3af",
  },
  {
    id: "brawler", name: "Brawler", emoji: "🪓",
    flavor: "Medium build, two clamps, dual buzzsaws. Get close, stay close.",
    parts: { head: "h_visor", chest: "c_iron", leftArm: "la_clamp", rightArm: "ra_clamp", legs: "l_quad" },
    weapons: { left: "w_phaseblade", right: "w_phaseblade" }, // legendary — locked early; falls back via locked-skip
    paint: "#fbbf24",
  },
  {
    id: "sniper", name: "Sniper", emoji: "🎯",
    flavor: "Light body + heavy right arm. Pulse on the off-hand, thunder rail on the main.",
    parts: { head: "h_oracle", chest: "c_reactor", leftArm: "la_basic", rightArm: "ra_clamp", legs: "l_hover" },
    weapons: { left: "w_pulse", right: "w_thunder" },
    paint: "#a78bfa",
  },
  {
    id: "pyro", name: "Pyromancer", emoji: "🔥",
    flavor: "Standard chassis, twin flamers. Total devastation up close.",
    parts: { head: "h_visor", chest: "c_reactor", leftArm: "la_basic", rightArm: "ra_basic", legs: "l_quad" },
    weapons: { left: "w_inferno", right: "w_inferno" },
    paint: "#fb923c",
  },
];

export function getBotPreset(id: string): BotPreset | undefined {
  return BOT_PRESETS.find(p => p.id === id);
}

// ── Parts shop pricing ────────────────────────────────────────────────
// Per-rarity sticker prices. Tier on top of rarity nudges it a bit.
const RARITY_BASE_PRICE: Record<BotPart["rarity"], number> = {
  common:    80,
  uncommon:  220,
  rare:      560,
  legendary: 1400,
};
const TIER_MULTIPLIER: Record<BotPart["tier"], number> = {
  light: 1.0, medium: 1.15, heavy: 1.35,
};

/** Sale price for a part — used by the Builder's locked-part buy badge. */
export function priceFor(part: BotPart): number {
  return Math.round(RARITY_BASE_PRICE[part.rarity] * TIER_MULTIPLIER[part.tier]);
}

// ── Weapon shop pricing ──────────────────────────────────────────────
const WEAPON_RARITY_PRICE: Record<Weapon["tier"], number> = {
  common:    140,
  uncommon:  340,
  rare:      820,
  legendary: 2000,
};
/** Sale price for a weapon — used by the new shop page. */
export function priceForWeapon(w: Weapon): number {
  // Rarity drives most of price; large-mount weapons add a 25% premium.
  const base = WEAPON_RARITY_PRICE[w.tier];
  return Math.round(base * (w.mount === "large" ? 1.25 : 1.0));
}

/** Scrap value when salvaging a part — about 35% of cash price, paid
 *  in scrap (1 cash ≈ 1 scrap for valuation purposes). */
export function scrapValue(part: BotPart): number {
  return Math.max(5, Math.round(priceFor(part) * 0.35));
}

/** Starter weapon set a new save begins with — the cheap common
 *  cannons + a melee + a pulse. Anything else needs to be purchased
 *  in the shop. Existing saves (pre-v1.10.79) keep all weapons via
 *  the back-compat fallback in store.ts. */
export const STARTER_WEAPON_IDS = ["w_pulse", "w_autocannon", "w_scrapgun"];

/** Cost to fully repair a bot from current HP fraction → 1.0. Charge
 *  scales with the missing fraction × a flat base + league multiplier. */
export function repairCost(hpFrac: number, league: string): number {
  const missing = Math.max(0, Math.min(1, 1 - hpFrac));
  if (missing <= 0.01) return 0;
  const leagueMult = ({ rookie: 1.0, amateur: 1.4, pro: 1.9, champion: 2.6, legend: 3.4 } as Record<string, number>)[league] ?? 1.0;
  return Math.max(8, Math.round(missing * 110 * leagueMult));
}

/** Which leagues can see a given part's rarity in the shop. Same gating
 *  philosophy as weapons. */
const PART_UNLOCK_BY_LEAGUE: Record<string, BotPart["rarity"][]> = {
  rookie:   ["common"],
  amateur:  ["common", "uncommon"],
  pro:      ["common", "uncommon", "rare"],
  champion: ["common", "uncommon", "rare", "legendary"],
  legend:   ["common", "uncommon", "rare", "legendary"],
};

export function isPartLeagueLocked(part: BotPart, league: string): boolean {
  const allowed = new Set(PART_UNLOCK_BY_LEAGUE[league] ?? ["common"]);
  return !allowed.has(part.rarity);
}

export function partsBySlot(slot: BotPart["slot"]): BotPart[] {
  return PARTS.filter(p => p.slot === slot);
}

export function getPart(id: string): BotPart | undefined { return PARTS.find(p => p.id === id); }
export function getWeapon(id: string): Weapon | undefined { return WEAPONS.find(w => w.id === id); }
