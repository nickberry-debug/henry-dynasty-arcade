// ⚡ Survivor — content catalog. Heroes, weapons, passives, biomes.
// All original — names/flavor invented for this game.

import type { HeroKind, Weapon, WeaponId, Passive, Biome } from "./types";

// ── Heroes — roster-reuse: each maps to an existing arcade archetype
// so the visual identity carries (no new art needed). ─────────────────────
export const HEROES: HeroKind[] = [
  { id: "spartan",   name: "Spartan",      emoji: "🛡️", color: "#fbbf24",
    flavor: "Throws a spear. Holds a line nothing can break.",
    startingWeapons: ["spear"],
    base: { hp: 110, speed: 100, pickupRadius: 38, armor: 2 } },
  { id: "mage",      name: "Sky Mage",     emoji: "🌩️", color: "#a78bfa",
    flavor: "Calls lightning from above. Glass cannon.",
    startingWeapons: ["lightning"],
    base: { hp: 80,  speed: 110, pickupRadius: 44, armor: 0 } },
  { id: "huntress",  name: "Huntress",     emoji: "🏹", color: "#86efac",
    flavor: "Shoots arrows the moment anything moves.",
    startingWeapons: ["arrow"],
    base: { hp: 90,  speed: 120, pickupRadius: 40, armor: 1 } },
  { id: "berserker", name: "Berserker",    emoji: "🪓", color: "#f87171",
    flavor: "Twin axes. Loves a crowd.",
    startingWeapons: ["axe"],
    base: { hp: 130, speed: 95,  pickupRadius: 36, armor: 3 } },
  { id: "monk",      name: "Wind Monk",    emoji: "🥋", color: "#67e8f9",
    flavor: "Glowing aura. Punches anything that gets close.",
    startingWeapons: ["garlicaura", "fist"],
    base: { hp: 100, speed: 115, pickupRadius: 42, armor: 1 } },
  { id: "pyrekit",   name: "Pyrekit",      emoji: "🔥", color: "#fb923c",
    flavor: "A creature-keeper friend. Hurls fireballs.",
    startingWeapons: ["fireball"],
    base: { hp: 85,  speed: 105, pickupRadius: 40, armor: 0 } },
];

// ── Weapons ───────────────────────────────────────────────────────────────
function w(id: WeaponId, name: string, emoji: string, color: string,
           tier: 1|2|3|4, damage: number, fireRate: number, range: number,
           shape: Weapon["shape"], flavor: string): Weapon {
  return { id, name, emoji, color, tier, damage, fireRate, range, shape, flavor };
}

/** Weapon stat tables — each entry is a tier 1-4 progression. The level-up
 *  card pulls the next tier from this table when the player picks "upgrade". */
export const WEAPON_TIERS: Record<WeaponId, Weapon[]> = {
  fist:        [
    w("fist", "Hero's Fist", "👊", "#fef3c7", 1, 14, 1.8, 56, "aura", "Punches the air around you."),
    w("fist", "Hero's Fist", "👊", "#fef3c7", 2, 22, 2.2, 64, "aura", "Wider, faster."),
    w("fist", "Hero's Fist", "👊", "#fef3c7", 3, 32, 2.6, 70, "aura", "A nimbus of jabs."),
    w("fist", "Wrath Aura",  "✊", "#fbbf24", 4, 46, 3.0, 84, "aura", "Evolved: blazing aura that hurts to look at."),
  ],
  spear:       [
    w("spear","Bronze Spear","🪡", "#fde047", 1, 18, 1.4, 220, "aim", "Throws a single spear at the nearest foe."),
    w("spear","Bronze Spear","🪡", "#fde047", 2, 28, 1.7, 240, "aim", "Faster, sharper."),
    w("spear","Bronze Spear","🪡", "#fde047", 3, 40, 2.0, 260, "aim", "Pierces multiple."),
    w("spear","Sky-Spear",   "⚡", "#facc15", 4, 60, 2.4, 320, "aim", "Evolved: pins three foes in a line."),
  ],
  boomerang:   [
    w("boomerang","Whirl",  "🪃", "#a5f3fc", 1, 12, 1.6, 170, "aim", "Loops out and back."),
    w("boomerang","Whirl",  "🪃", "#a5f3fc", 2, 19, 1.9, 190, "aim", "Snappier loop."),
    w("boomerang","Whirl",  "🪃", "#a5f3fc", 3, 28, 2.2, 220, "aim", "Two boomerangs."),
    w("boomerang","Stormring","🌀","#67e8f9", 4, 42, 2.6, 260, "aim", "Evolved: a ring of three."),
  ],
  fireball:    [
    w("fireball","Fireball", "🔥", "#fb923c", 1, 20, 1.3, 200, "aim", "Lobs a sticky flame."),
    w("fireball","Fireball", "🔥", "#fb923c", 2, 30, 1.6, 220, "aim", "Bigger flame."),
    w("fireball","Fireball", "🔥", "#fb923c", 3, 44, 1.9, 240, "aim", "Splash damage."),
    w("fireball","Solar Flare","☀️","#fbbf24", 4, 64, 2.2, 280, "aim", "Evolved: sun-spawned arc."),
  ],
  shieldorb:   [
    w("shieldorb","Shield Orb","🟢","#86efac", 1, 10, 2.0, 60, "orbit", "Orbiting shield."),
    w("shieldorb","Shield Orb","🟢","#86efac", 2, 16, 2.4, 70, "orbit", "Two orbs."),
    w("shieldorb","Shield Orb","🟢","#86efac", 3, 22, 2.8, 80, "orbit", "Three orbs."),
    w("shieldorb","Aegis Ring","🌟","#fde047", 4, 32, 3.2, 100, "orbit", "Evolved: a four-orb crown."),
  ],
  icenova:     [
    w("icenova","Frost Pulse","❄️","#a5f3fc", 1, 14, 0.7, 110, "wave", "Periodic icy shockwave."),
    w("icenova","Frost Pulse","❄️","#a5f3fc", 2, 22, 0.9, 130, "wave", "Bigger ring."),
    w("icenova","Frost Pulse","❄️","#a5f3fc", 3, 32, 1.1, 150, "wave", "Slows foes."),
    w("icenova","Winterbreak","🧊","#67e8f9", 4, 48, 1.4, 180, "wave", "Evolved: blizzard pulse."),
  ],
  lightning:   [
    w("lightning","Bolt",   "⚡", "#fde047", 1, 22, 1.0, 240, "aim", "Strikes a random close foe."),
    w("lightning","Bolt",   "⚡", "#fde047", 2, 34, 1.3, 260, "aim", "Branching arc."),
    w("lightning","Bolt",   "⚡", "#fde047", 3, 50, 1.6, 280, "aim", "Three forks."),
    w("lightning","Sky Wrath","🌩️","#fbbf24",4, 72, 2.0, 320, "aim", "Evolved: hits five in a chain."),
  ],
  garlicaura:  [
    w("garlicaura","Holy Aura","💚","#86efac", 1, 6, 4.0, 70, "aura", "Hurts anything that hugs you."),
    w("garlicaura","Holy Aura","💚","#86efac", 2, 10, 4.5, 80, "aura", "Brighter."),
    w("garlicaura","Holy Aura","💚","#86efac", 3, 15, 5.0, 90, "aura", "Sears."),
    w("garlicaura","Saint's Light","✨","#fde047", 4, 24, 5.5, 110, "aura", "Evolved: blinding aura."),
  ],
  axe:         [
    w("axe","Thrown Axe", "🪓", "#fca5a5", 1, 24, 1.0, 200, "aim", "Heavy arcing axe."),
    w("axe","Thrown Axe", "🪓", "#fca5a5", 2, 36, 1.3, 220, "aim", "Two axes."),
    w("axe","Thrown Axe", "🪓", "#fca5a5", 3, 52, 1.6, 240, "aim", "Three axes."),
    w("axe","Reaper Axe", "💀", "#f87171", 4, 76, 2.0, 280, "aim", "Evolved: returns to your hand."),
  ],
  arrow:       [
    w("arrow","Quick Arrow","🏹","#86efac", 1, 16, 1.8, 230, "aim", "Snap-fires at the nearest foe."),
    w("arrow","Quick Arrow","🏹","#86efac", 2, 24, 2.2, 250, "aim", "Faster draw."),
    w("arrow","Quick Arrow","🏹","#86efac", 3, 36, 2.6, 270, "aim", "Twin arrows."),
    w("arrow","Storm Volley","🌪️","#67e8f9",4, 54, 3.0, 300, "aim", "Evolved: rapid fan of arrows."),
  ],
};

/** Evolution recipes — pick the same weapon at tier 3 while a paired
 *  passive is at max-stack to unlock the evolved tier 4. */
export const EVOLUTIONS: Array<{ weapon: WeaponId; passive: PassiveId; }> = [
  { weapon: "spear",     passive: "vest" },
  { weapon: "fireball",  passive: "wisdom" },
  { weapon: "lightning", passive: "luck" },
  { weapon: "axe",       passive: "spinach" },
  { weapon: "arrow",     passive: "boots" },
  { weapon: "shieldorb", passive: "magnet" },
];

type PassiveId = Passive["id"];

// ── Passives ──────────────────────────────────────────────────────────────
export const PASSIVES: Passive[] = [
  { id: "boots",   name: "Boots",      emoji: "🥾",
    flavor: "Move faster.",
    apply: (s, n) => { s.speed += n * 8; } },
  { id: "vest",    name: "Iron Vest",  emoji: "🦺",
    flavor: "More HP, more armor.",
    apply: (s, n) => { s.hpMax += n * 10; s.hp = Math.min(s.hp + 10, s.hpMax); s.armor += n; } },
  { id: "magnet",  name: "Magnet",     emoji: "🧲",
    flavor: "Grab gems from farther.",
    apply: (s, n) => { s.pickupRadius += n * 16; } },
  { id: "spinach", name: "Spinach",    emoji: "🥬",
    flavor: "All weapons hit harder.",
    apply: (s, n) => { s.power += n * 0.1; } },
  { id: "wisdom",  name: "Wisdom",     emoji: "📖",
    flavor: "Weapons fire faster.",
    apply: (s, n) => { s.haste += n * 0.1; } },
  { id: "luck",    name: "Luck",       emoji: "🍀",
    flavor: "Bigger drops, better gems.",
    apply: (s, n) => { s.luck += n * 0.15; } },
];

// ── Biomes ────────────────────────────────────────────────────────────────
export const BIOMES: Biome[] = [
  { id: "meadow", name: "Sun Meadow",
    bg: "linear-gradient(180deg, #14532d 0%, #064e3b 100%)",
    ground: "#22c55e",
    enemyTints: ["#a3e635", "#84cc16", "#65a30d"] },
  { id: "ashlands", name: "Ashlands",
    bg: "linear-gradient(180deg, #450a0a 0%, #1c1917 100%)",
    ground: "#7c2d12",
    enemyTints: ["#f87171", "#dc2626", "#7f1d1d"] },
  { id: "starfield", name: "Starfield",
    bg: "linear-gradient(180deg, #1e1b4b 0%, #020617 100%)",
    ground: "#312e81",
    enemyTints: ["#a78bfa", "#7c3aed", "#5b21b6"] },
  { id: "ruins", name: "Old Ruins",
    bg: "linear-gradient(180deg, #292524 0%, #0a0a0a 100%)",
    ground: "#57534e",
    enemyTints: ["#fde047", "#a8a29e", "#78716c"] },
];

// ── Enemy archetypes ──────────────────────────────────────────────────────
export const ENEMY_GLYPHS = {
  swarm:    ["🦗", "🦇", "🐛", "🪲", "🐍"],
  fast:     ["🐺", "🐆", "🦝"],
  tank:     ["🐗", "🦏", "🐃"],
  ranged:   ["🧙", "🦂"],
  shooter:  ["🤖", "🧌"],
  miniboss: ["🐲", "👹"],
  boss:     ["👑", "🐉"],
};
