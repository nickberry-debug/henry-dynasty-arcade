// Main Event — original wrestler roster + championships + venue tiers.
// PG sports-entertainment storytelling: heroes vs. villains, drama,
// championships. ALL ORIGINAL. No real federations, no copyrighted
// wrestler names/likenesses.

import type { MascotKind } from "../art/CrestGenerator";

export type Alignment = "face" | "heel" | "tweener";
export type Archetype = "high-flyer" | "powerhouse" | "technician" | "brawler" | "showman" | "monster" | "veteran" | "rookie";
export type Trait =
  | "charismatic" | "athletic" | "stoic" | "showboat" | "tough" | "fast" | "strong"
  | "experienced" | "unpredictable" | "fan-favorite" | "ruthless" | "selfless"
  | "intense" | "comedic";

export interface Wrestler {
  id: string;
  name: string;
  gimmick: string;
  alignment: Alignment;
  archetype: Archetype;
  traits: Trait[];
  /** 50-99 — three core stats. */
  charisma: number;
  inRing: number;
  toughness: number;
  /** 0-100 popularity / "overness". Drifts based on booking. */
  popularity: number;
  /** 0-100 momentum — short-term hot streak. */
  momentum: number;
  /** Signature + finisher move names. */
  signature: string;
  finisher: string;
  /** Visual: avatar color + mascot icon. */
  color: string;
  mascot: MascotKind;
  /** Cosmetic age (drifts each year). */
  age: number;
  /** Hall of Fame status (once retired). */
  hof?: boolean;
}

export const ROSTER: Wrestler[] = [
  // ── Stars / Veterans ───────────────────────────────────────────────
  { id: "w_titan",      name: "Titanius Maximus",  gimmick: "The unbreakable champion",     alignment: "face",     archetype: "powerhouse",  traits: ["strong", "experienced", "fan-favorite"], charisma: 88, inRing: 84, toughness: 92, popularity: 80, momentum: 60, signature: "Iron Press",        finisher: "Titan Slam",        color: "#fbbf24", mascot: "lion",     age: 32 },
  { id: "w_specter",    name: "The Specter",       gimmick: "Ghostly cult-leader villain",  alignment: "heel",     archetype: "monster",     traits: ["ruthless", "unpredictable", "intense"], charisma: 86, inRing: 78, toughness: 88, popularity: 72, momentum: 50, signature: "Phantom Veil",      finisher: "Soulclaim",         color: "#7c3aed", mascot: "wing",     age: 34 },
  { id: "w_rocket",     name: "Rocket Riley",      gimmick: "High-flying daredevil",        alignment: "face",     archetype: "high-flyer",  traits: ["athletic", "showboat", "fan-favorite"], charisma: 82, inRing: 90, toughness: 70, popularity: 78, momentum: 70, signature: "Skyhook",           finisher: "Hyperdrive",        color: "#67e8f9", mascot: "comet",    age: 26 },
  // ── Mid-card ───────────────────────────────────────────────────────
  { id: "w_thunderfist",name: "Thunderfist",       gimmick: "Pure brawler from the docks",  alignment: "tweener",  archetype: "brawler",     traits: ["tough", "intense"], charisma: 70, inRing: 78, toughness: 86, popularity: 60, momentum: 50, signature: "Concussion Cross",  finisher: "Thunder Drop",      color: "#dc2626", mascot: "bull",     age: 29 },
  { id: "w_dr_drama",   name: "Dr. Drama",         gimmick: "Theatrical mad scientist",     alignment: "heel",     archetype: "showman",     traits: ["charismatic", "showboat", "comedic"], charisma: 88, inRing: 68, toughness: 65, popularity: 64, momentum: 55, signature: "Mind Trick",        finisher: "Lab Notes",         color: "#a78bfa", mascot: "crown",    age: 38 },
  { id: "w_emberfang",  name: "Emberfang",         gimmick: "Fierce flame-themed fighter",  alignment: "face",     archetype: "technician",  traits: ["fast", "athletic"], charisma: 72, inRing: 84, toughness: 72, popularity: 56, momentum: 60, signature: "Cinder Lock",       finisher: "Phoenix Suplex",    color: "#fb923c", mascot: "flame",    age: 27 },
  { id: "w_iron_owl",   name: "The Iron Owl",      gimmick: "Stoic technical master",       alignment: "tweener",  archetype: "technician",  traits: ["stoic", "experienced"], charisma: 64, inRing: 92, toughness: 80, popularity: 62, momentum: 50, signature: "Owl Lock",          finisher: "Talon Strike",      color: "#1e293b", mascot: "hawk",     age: 35 },
  { id: "w_glamour",    name: "Glamour Knight",    gimmick: "Wealthy showboater villain",   alignment: "heel",     archetype: "showman",     traits: ["showboat", "ruthless"], charisma: 80, inRing: 70, toughness: 68, popularity: 54, momentum: 45, signature: "Velvet Hammer",     finisher: "Crown Jewel",       color: "#fde047", mascot: "crown",    age: 30 },
  { id: "w_grizzly",    name: "Grizzly Pike",      gimmick: "Mountain-man powerhouse",      alignment: "face",     archetype: "powerhouse",  traits: ["strong", "tough", "fan-favorite"], charisma: 66, inRing: 70, toughness: 88, popularity: 58, momentum: 55, signature: "Bear Hug",          finisher: "Avalanche",         color: "#7c2d12", mascot: "bear",     age: 33 },
  { id: "w_aurora",     name: "Aurora Vance",      gimmick: "Cosmic-themed enigma",         alignment: "tweener",  archetype: "high-flyer",  traits: ["unpredictable", "athletic"], charisma: 78, inRing: 86, toughness: 65, popularity: 60, momentum: 60, signature: "Starfall",          finisher: "Aurora Borealis",   color: "#a5f3fc", mascot: "comet",    age: 25 },
  // ── Risers / Rookies ───────────────────────────────────────────────
  { id: "w_jr_meteor",  name: "JR Meteor",         gimmick: "Hot rookie phenom",            alignment: "face",     archetype: "rookie",      traits: ["athletic", "fast"], charisma: 72, inRing: 70, toughness: 64, popularity: 40, momentum: 70, signature: "Meteor Drop",       finisher: "Burnout",           color: "#fde047", mascot: "comet",    age: 22 },
  { id: "w_creek_kid",  name: "The Creek Kid",     gimmick: "Hometown rookie face",         alignment: "face",     archetype: "rookie",      traits: ["selfless", "tough"], charisma: 68, inRing: 66, toughness: 70, popularity: 36, momentum: 55, signature: "Creek Crash",       finisher: "Pebble Lock",       color: "#86efac", mascot: "stag",     age: 21 },
  { id: "w_static",     name: "Static Sam",        gimmick: "Erratic electric weirdo",      alignment: "heel",     archetype: "brawler",     traits: ["unpredictable", "intense"], charisma: 70, inRing: 72, toughness: 70, popularity: 38, momentum: 50, signature: "Shock Jab",         finisher: "Powergrid",         color: "#fef08a", mascot: "lightning",age: 24 },
  { id: "w_velvet",     name: "Velvet Cobra",      gimmick: "Slithering technical heel",    alignment: "heel",     archetype: "technician",  traits: ["ruthless", "experienced"], charisma: 74, inRing: 82, toughness: 68, popularity: 50, momentum: 45, signature: "Coil Hold",         finisher: "Venom Lock",        color: "#22c55e", mascot: "wave",     age: 31 },
  // ── Veterans / Legends ─────────────────────────────────────────────
  { id: "w_ironhand",   name: "Ironhand Joe",      gimmick: "The legendary veteran face",   alignment: "face",     archetype: "veteran",     traits: ["experienced", "fan-favorite", "tough"], charisma: 84, inRing: 78, toughness: 82, popularity: 84, momentum: 40, signature: "Steel Lariat",      finisher: "Anvil Drop",        color: "#94a3b8", mascot: "ram",      age: 40 },
  // ── Tag-team duo (treated as singles too) ──────────────────────────
  { id: "w_pine",       name: "Cedar Pine",        gimmick: "Half of the Forest Boys",      alignment: "face",     archetype: "high-flyer",  traits: ["fast", "athletic"], charisma: 70, inRing: 78, toughness: 64, popularity: 45, momentum: 50, signature: "Branch Bend",       finisher: "Treefall",          color: "#15803d", mascot: "stag",     age: 24 },
  { id: "w_oak",        name: "Oakley Pine",        gimmick: "Half of the Forest Boys",     alignment: "face",     archetype: "powerhouse",  traits: ["strong", "tough"], charisma: 64, inRing: 70, toughness: 80, popularity: 45, momentum: 50, signature: "Trunkpress",        finisher: "Oak Slam",          color: "#365314", mascot: "bear",     age: 26 },
  // ── Outlaws ────────────────────────────────────────────────────────
  { id: "w_skull",      name: "Skullcap Sam",      gimmick: "Biker outlaw heel",            alignment: "heel",     archetype: "brawler",     traits: ["ruthless", "tough", "intense"], charisma: 72, inRing: 76, toughness: 84, popularity: 56, momentum: 55, signature: "Chrome Slam",       finisher: "Roadkill",          color: "#0f172a", mascot: "wolf",     age: 33 },
  { id: "w_lock",       name: "Mr. Lock",          gimmick: "Submission specialist heel",   alignment: "heel",     archetype: "technician",  traits: ["stoic", "ruthless"], charisma: 60, inRing: 88, toughness: 70, popularity: 52, momentum: 45, signature: "Keystone Hold",     finisher: "Vault Lock",        color: "#1e1b4b", mascot: "shark",    age: 31 },
  // ── Comedy / Color ─────────────────────────────────────────────────
  { id: "w_pancake",    name: "Pancake Pete",      gimmick: "Comedy breakfast brawler",     alignment: "face",     archetype: "showman",     traits: ["comedic", "fan-favorite"], charisma: 80, inRing: 60, toughness: 68, popularity: 50, momentum: 55, signature: "Syrup Slip",        finisher: "Stack Splash",      color: "#fbbf24", mascot: "sun",      age: 30 },
];

// ── Championships ────────────────────────────────────────────────────

export interface Championship {
  id: string;
  name: string;
  /** Prestige tier — affects buy-rate when defended in main event. */
  tier: "world" | "mid" | "tag";
  color: string;
  currentHolderId: string | null;
  reignDays: number;
  reignNumber: number;
}

export const STARTING_TITLES: Championship[] = [
  { id: "t_world", name: "World Championship",    tier: "world", color: "#fde047", currentHolderId: "w_titan",    reignDays: 0, reignNumber: 1 },
  { id: "t_mid",   name: "Spotlight Title",       tier: "mid",   color: "#f9a8d4", currentHolderId: "w_emberfang", reignDays: 0, reignNumber: 1 },
  { id: "t_tag",   name: "Tag Team Crown",        tier: "tag",   color: "#67e8f9", currentHolderId: null,         reignDays: 0, reignNumber: 0 },
];

// ── Promotion tiers ──────────────────────────────────────────────────

export interface PromotionTier {
  id: "indie" | "regional" | "national" | "global";
  name: string;
  /** Required fan count to unlock the next tier. */
  fansNeeded: number;
  /** Multiplier on revenue per fan per show. */
  revenuePer: number;
  /** Color theme. */
  color: string;
}

export const TIERS: PromotionTier[] = [
  { id: "indie",    name: "Local Indie",       fansNeeded: 1000,    revenuePer: 0.08, color: "#86efac" },
  { id: "regional", name: "Regional Circuit",  fansNeeded: 10000,   revenuePer: 0.12, color: "#67e8f9" },
  { id: "national", name: "National TV",       fansNeeded: 100000,  revenuePer: 0.18, color: "#a78bfa" },
  { id: "global",   name: "Global Empire",     fansNeeded: Infinity, revenuePer: 0.30, color: "#fde047" },
];

// ── Match types ──────────────────────────────────────────────────────

export interface MatchType {
  id: string;
  name: string;
  /** Optimal slot — opener / mid / main. */
  slot: "any" | "main";
  /** Bonus / penalty to the match rating. */
  ratingBias: number;
  description: string;
}

export const MATCH_TYPES: MatchType[] = [
  { id: "singles",      name: "Singles Match",     slot: "any",  ratingBias: 0,  description: "1v1. Classic." },
  { id: "tag",          name: "Tag Team Match",    slot: "any",  ratingBias: 1,  description: "2v2 tag." },
  { id: "ladder",       name: "Ladder Match",      slot: "main", ratingBias: 8,  description: "High-stakes spectacle. Better as main." },
  { id: "steel",        name: "Steel Cage",        slot: "main", ratingBias: 6,  description: "Brutal. Best with rivals." },
  { id: "battleroyal",  name: "Battle Royal",      slot: "any",  ratingBias: 3,  description: "All-out chaos. Crowd loves the surprise winner." },
  { id: "title",        name: "Title Match",       slot: "main", ratingBias: 10, description: "Belt on the line. Big buy-rate boost." },
];

// ── Storyline beat types ────────────────────────────────────────────

export type BeatKind = "callout" | "runin" | "betrayal" | "contract" | "challenge" | "alliance" | "reckoning";

export interface BeatDef {
  kind: BeatKind;
  label: string;
  emoji: string;
  /** Momentum heat generated for both wrestlers. */
  heat: number;
  description: string;
}

export const BEATS: Record<BeatKind, BeatDef> = {
  callout:   { kind: "callout",   label: "Callout Promo",     emoji: "📣", heat: 6,  description: "One wrestler calls another out by name." },
  runin:     { kind: "runin",     label: "Run-In",            emoji: "🏃", heat: 8,  description: "Surprise attack during the other's match." },
  betrayal:  { kind: "betrayal",  label: "Betrayal",          emoji: "🗡️", heat: 12, description: "A partner turns on their ally — face/heel swap may follow." },
  contract:  { kind: "contract",  label: "Contract Signing",  emoji: "📝", heat: 7,  description: "Formal sit-down to sign for a match." },
  challenge: { kind: "challenge", label: "Open Challenge",    emoji: "🎤", heat: 5,  description: "Open invite — anyone can answer." },
  alliance:  { kind: "alliance",  label: "Alliance Formed",   emoji: "🤝", heat: 4,  description: "Two wrestlers team up — a new faction begins." },
  reckoning: { kind: "reckoning", label: "Reckoning Promo",   emoji: "⚡", heat: 9,  description: "The build-up to the blow-off match." },
};
