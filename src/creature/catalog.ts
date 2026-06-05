// Creature Keeper — original species + move catalog.
// 14 original creature lines × 3 stages each = 42 unique forms.
// All names and types are invented for this game; no franchise IP.

import type { Move, Species, Item, Habitat } from "./types";

export const MOVES: Move[] = [
  // Flame
  { id: "m_spark",    name: "Spark Tap",     type: "flame", power: 18, cost: 2,  flavor: "A tiny pop of flame." },
  { id: "m_flarekick",name: "Flarekick",     type: "flame", power: 34, cost: 5,  flavor: "A fast burning kick." },
  { id: "m_inferno",  name: "Inferno Howl",  type: "flame", power: 55, cost: 9,  flavor: "Roar that scorches the air." },
  // Tide
  { id: "m_droplet",  name: "Droplet",       type: "tide",  power: 16, cost: 2,  flavor: "Cold drip to the face." },
  { id: "m_wavebash", name: "Wave Bash",     type: "tide",  power: 33, cost: 5,  flavor: "Slap of moving water." },
  { id: "m_tsunami",  name: "Tide Crash",    type: "tide",  power: 56, cost: 9,  flavor: "Wall of water. Soaks everyone." },
  // Stone
  { id: "m_pebble",   name: "Pebble Toss",   type: "stone", power: 17, cost: 2,  flavor: "Sharp rock to the shins." },
  { id: "m_quake",    name: "Tremor",        type: "stone", power: 32, cost: 5,  flavor: "A small earth-shake." },
  { id: "m_landslide",name: "Landslide",     type: "stone", power: 58, cost: 10, flavor: "Hillside in motion." },
  // Gale
  { id: "m_gust",     name: "Gust",          type: "gale",  power: 16, cost: 2,  flavor: "A cold whip of wind." },
  { id: "m_cyclone",  name: "Cyclone Spin",  type: "gale",  power: 30, cost: 4,  flavor: "Spins fast, hits often." },
  { id: "m_tempest",  name: "Tempest",       type: "gale",  power: 54, cost: 9,  flavor: "Howling vortex." },
  // Spark
  { id: "m_zap",      name: "Zap",           type: "spark", power: 19, cost: 2,  flavor: "Quick crackle of voltage." },
  { id: "m_arclash",  name: "Arc Lash",      type: "spark", power: 35, cost: 5,  flavor: "Whip of plasma." },
  { id: "m_thunder",  name: "Sky Thunder",   type: "spark", power: 60, cost: 10, flavor: "A pulled-down bolt." },
  // Shade
  { id: "m_creep",    name: "Creeping Mist", type: "shade", power: 15, cost: 2,  flavor: "Cold, slow, unsettling." },
  { id: "m_hexbite",  name: "Hex Bite",      type: "shade", power: 32, cost: 5,  flavor: "A shadow with teeth." },
  { id: "m_voidwail", name: "Void Wail",     type: "shade", power: 56, cost: 9,  flavor: "A cry that drinks light." },
  // Bloom
  { id: "m_seedshot", name: "Seed Shot",     type: "bloom", power: 17, cost: 2,  flavor: "Hard seed at speed." },
  { id: "m_briar",    name: "Briar Snare",   type: "bloom", power: 30, cost: 4,  flavor: "Thorns from below." },
  { id: "m_grovespirit",name:"Grove Spirit", type: "bloom", power: 55, cost: 9,  flavor: "The forest answers." },
  // Light
  { id: "m_shimmer",  name: "Shimmer",       type: "light", power: 18, cost: 2,  flavor: "A glittering little burst." },
  { id: "m_radiant",  name: "Radiant Pulse", type: "light", power: 33, cost: 5,  flavor: "Warmth that burns the dark." },
  { id: "m_supernova",name: "Mini Supernova",type: "light", power: 58, cost: 10, flavor: "Brief brilliant detonation." },
  // Neutral moves (any creature can use)
  { id: "m_tackle",   name: "Tackle",        type: "stone", power: 14, cost: 1,  flavor: "Run into them. Simple, works." },
  { id: "m_focus",    name: "Focus",         type: "light", power:  0, cost: 0,  flavor: "Restore some energy. Skip a turn." },
];

const sp = (id: string, line: string, stages: [string, string, string], type: Species["type"], rarity: Species["rarity"], cls: Species["class"], flavor: string, moves: [string[], string[], string[]], silhouette: Species["silhouette"], hidden?: boolean): Species => ({
  id, lineName: line, stageNames: stages, type, rarity, class: cls, flavor, movesByStage: moves, silhouette, hidden,
});

export const SPECIES: Species[] = [
  // ── Flame line ────────────────────────────────────────────────────────
  sp("pyrekit",    "Pyrekit",   ["Pyrekit", "Cinderfox", "Solarmane"], "flame", "common", "warrior",
    "A foxlike spark. Always too close to the fire.",
    [["m_spark", "m_tackle"], ["m_flarekick"], ["m_inferno"]],
    { body: "quadruped", spots: 3 }),
  sp("emberbug",   "Emberbug",  ["Emberbug", "Coalwing",  "Forgeleaf"], "flame", "uncommon", "scout",
    "A beetle whose shell glows when surprised.",
    [["m_spark"], ["m_flarekick"], ["m_inferno"]],
    { body: "bug", spots: 4 }),
  // ── Tide line ─────────────────────────────────────────────────────────
  sp("tideling",   "Tideling",  ["Tideling", "Surfprong", "Greatmaw"],  "tide", "common", "guardian",
    "A friendly mollusk that hums the sea.",
    [["m_droplet", "m_tackle"], ["m_wavebash"], ["m_tsunami"]],
    { body: "blob", spots: 2 }),
  sp("riverhound", "Riverhound",["Riverhound","Mistmane","Stormfin"],   "tide", "uncommon", "brawler",
    "A water-pup. Loves swims, hates baths.",
    [["m_droplet"], ["m_wavebash"], ["m_tsunami"]],
    { body: "quadruped", spots: 3 }),
  // ── Stone line ────────────────────────────────────────────────────────
  sp("crackbeetle","Crackbeetle",["Crackbeetle","Boulderback","Mountainfather"], "stone", "common", "guardian",
    "A tiny rolling rock with legs. Heavy.",
    [["m_pebble", "m_tackle"], ["m_quake"], ["m_landslide"]],
    { body: "golem", spots: 2 }),
  sp("pebblepup",  "Pebblepup", ["Pebblepup","Granitehound","Cliffwarden"], "stone", "uncommon", "warrior",
    "Looks like a dog made of round river stones.",
    [["m_pebble"], ["m_quake"], ["m_landslide"]],
    { body: "quadruped", spots: 4 }),
  // ── Gale line ─────────────────────────────────────────────────────────
  sp("breezefluff","Breezefluff",["Breezefluff","Skytuft","Tempestwing"],"gale", "common", "trickster",
    "A cloud with eyes. Friendly. Drifts.",
    [["m_gust", "m_tackle"], ["m_cyclone"], ["m_tempest"]],
    { body: "blob", spots: 1 }),
  sp("kitebird",   "Kitebird",  ["Kitebird","Stormhawk","Skyleviathan"],  "gale", "uncommon", "scout",
    "A bird that won't land. Catches updrafts.",
    [["m_gust"], ["m_cyclone"], ["m_tempest"]],
    { body: "bird", spots: 3 }),
  // ── Spark line ────────────────────────────────────────────────────────
  sp("buzzbug",    "Buzzbug",   ["Buzzbug","Stormhorn","Voltsovereign"], "spark", "common", "brawler",
    "A beetle full of static. Pet at your own risk.",
    [["m_zap", "m_tackle"], ["m_arclash"], ["m_thunder"]],
    { body: "bug", spots: 2 }),
  sp("voltkit",    "Voltkit",   ["Voltkit","Charmane","Plasmamane"],     "spark", "uncommon", "scout",
    "A bristling kitten. Fur stands up around it.",
    [["m_zap"], ["m_arclash"], ["m_thunder"]],
    { body: "quadruped", spots: 4 }),
  // ── Shade line ────────────────────────────────────────────────────────
  sp("dimwisp",    "Dimwisp",   ["Dimwisp","Nightveil","Voidherald"],    "shade", "rare", "trickster",
    "A wisp from the corner of the room you don't look at.",
    [["m_creep", "m_tackle"], ["m_hexbite"], ["m_voidwail"]],
    { body: "sprite", spots: 1 }),
  // ── Bloom line ────────────────────────────────────────────────────────
  sp("mossling",   "Mossling",  ["Mossling","Vineback","Woodelder"],     "bloom", "common", "sage",
    "Half plant, half cat. Photosynthesizes happily.",
    [["m_seedshot","m_tackle"], ["m_briar"], ["m_grovespirit"]],
    { body: "quadruped", spots: 3 }),
  // ── Light line ────────────────────────────────────────────────────────
  sp("glimmerling","Glimmerling",["Glimmerling","Starsprite","Dayherald"],"light","rare", "sage",
    "Glows softly. Naps on sunny tile.",
    [["m_shimmer","m_tackle"], ["m_radiant"], ["m_supernova"]],
    { body: "sprite", spots: 2 }),
  sp("crystalit",  "Crystalit", ["Crystalit","Prismfox","Aurorabeast"],  "light", "uncommon", "guardian",
    "A crystal that hatched into a creature. Refracts sunbeams.",
    [["m_shimmer"], ["m_radiant"], ["m_supernova"]],
    { body: "crystal", spots: 3 }),

  // ── Expansion wave 1 (toward the 77-species goal) ─────────────────────
  // Flame
  sp("scaldsprout", "Scaldsprout", ["Scaldsprout", "Magmaroot", "Coreking"], "flame", "uncommon", "sage",
    "A sapling rooted in volcanic ash. Bristles when it senses cold.",
    [["m_spark"], ["m_flarekick"], ["m_inferno"]],
    { body: "sprite", spots: 3 }),
  sp("kindlesnake", "Kindlesnake", ["Kindlesnake", "Sparkserpent", "Magmacoil"], "flame", "rare", "trickster",
    "Slips through cracks in the kiln. Coils at warm rocks.",
    [["m_spark"], ["m_flarekick"], ["m_inferno"]],
    { body: "snake", spots: 2 }),
  // Tide
  sp("dewdrip",     "Dewdrip",     ["Dewdrip", "Brookling", "Riverkeeper"], "tide", "common", "sage",
    "A morning droplet with a face. Always polite.",
    [["m_droplet"], ["m_wavebash"], ["m_tsunami"]],
    { body: "blob", spots: 1 }),
  sp("seapearl",    "Seapearl",    ["Seapearl", "Shellward", "Tideking"],   "tide", "rare", "guardian",
    "A polished pearl that grew legs.",
    [["m_droplet"], ["m_wavebash"], ["m_tsunami"]],
    { body: "crystal", spots: 2 }),
  // Gale
  sp("dustkit",     "Dustkit",     ["Dustkit", "Galekit", "Hurricane Lord"], "gale", "uncommon", "scout",
    "A fox who outruns sandstorms.",
    [["m_gust", "m_tackle"], ["m_cyclone"], ["m_tempest"]],
    { body: "quadruped", spots: 2 }),
  // Stone
  sp("clayling",    "Clayling",    ["Clayling", "Earthcaster", "Mountainsmith"], "stone", "uncommon", "warrior",
    "A pottery-shaped little earth golem. Improves with kiln time.",
    [["m_pebble"], ["m_quake"], ["m_landslide"]],
    { body: "golem", spots: 1 }),
  // Spark
  sp("staticfox",   "Staticfox",   ["Staticfox", "Arcrunner", "Lightning Vassal"], "spark", "rare", "scout",
    "Sparks crackle through their fur. Pet only with rubber gloves.",
    [["m_zap"], ["m_arclash"], ["m_thunder"]],
    { body: "quadruped", spots: 3 }),
  // Shade
  sp("hexpup",      "Hexpup",      ["Hexpup", "Gloomhound", "Curseling"], "shade", "uncommon", "warrior",
    "A pup made of midnight. Howls only the moon can hear.",
    [["m_creep", "m_tackle"], ["m_hexbite"], ["m_voidwail"]],
    { body: "quadruped", spots: 2 }),
  // Bloom
  sp("petalbug",    "Petalbug",    ["Petalbug", "Bloomshell", "Grovequeen"], "bloom", "uncommon", "trickster",
    "A beetle with flower-petal wings.",
    [["m_seedshot"], ["m_briar"], ["m_grovespirit"]],
    { body: "bug", spots: 4 }),
  sp("vinekit",     "Vinekit",     ["Vinekit", "Brambleback", "Woodfather"], "bloom", "rare", "guardian",
    "Tendrils for whiskers. Roots dig in when threatened.",
    [["m_seedshot"], ["m_briar"], ["m_grovespirit"]],
    { body: "quadruped", spots: 3 }),
  // Light
  sp("sunbug",      "Sunbug",      ["Sunbug", "Solarmoth", "Dawnshepherd"], "light", "uncommon", "sage",
    "A glowing moth that follows sunrise.",
    [["m_shimmer"], ["m_radiant"], ["m_supernova"]],
    { body: "bug", spots: 3 }),

  // ── Hidden species — only appears in the wild after you've defeated
  //    an apex (stage 2) of all 3 starter lines (Pyrekit / Tideling /
  //    Mossling). The hub Catalog shows it as "???" until then. */
  sp("eclipsekit",  "Eclipsekit",  ["Eclipsekit", "Twilight Stalker", "Eclipse Sovereign"],
    "shade", "mythic", "trickster",
    "A fox between worlds — half dawn, half dusk. Whispered about by the other creatures.",
    [["m_creep", "m_tackle"], ["m_hexbite", "m_shimmer"], ["m_voidwail", "m_supernova"]],
    { body: "quadruped", spots: 5 },
    /* hidden */ true),
];

// ── Hidden-species reveal: gate on having defeated the apex of each
//    starter line at least once (Pyrekit / Tideling / Mossling). The
//    UI checks save.seenSpeciesIds for the apex-stage names and the
//    creature's stage on the seen list — but since we only track ids,
//    the simpler heuristic is: the player has battled all three starter
//    species, period. Adjust threshold here.
const STARTER_SPECIES_FOR_HIDDEN_REVEAL = ["pyrekit", "tideling", "mossling"];

export function hiddenSpeciesUnlocked(seenIds: string[] | undefined): boolean {
  if (!seenIds || seenIds.length === 0) return false;
  return STARTER_SPECIES_FOR_HIDDEN_REVEAL.every(id => seenIds.includes(id));
}

export function getSpecies(id: string): Species | undefined { return SPECIES.find(s => s.id === id); }
export function getMove(id: string): Move | undefined { return MOVES.find(m => m.id === id); }

/** Pick a starter species at random — bias toward common rarity. */
export function rollStarter(): Species {
  const commons = SPECIES.filter(s => s.rarity === "common");
  return commons[Math.floor(Math.random() * commons.length)];
}

// ── ITEMS ─────────────────────────────────────────────────────────────
// Care items live in the hub (feed/heal swaps) — battle items can be
// used mid-fight. All prices are in "berries", earned from battles.
export const ITEMS: Item[] = [
  { id: "food_basic",  name: "Munch Bites",   emoji: "🍪", price: 10,  description: "Quick snack — bumps hunger.",
    effect: { kind: "care", needs: { hunger: +28, happiness: +4 } } },
  { id: "food_premium",name: "Sunberry Tart", emoji: "🥧", price: 35,  description: "Their favorite — big hunger + happiness boost.",
    effect: { kind: "care", needs: { hunger: +60, happiness: +18 }, bond: 2 } },
  { id: "treat",       name: "Sweet Treat",   emoji: "🍡", price: 18,  description: "A small bond + happiness lift.",
    effect: { kind: "care", needs: { happiness: +22 }, bond: 4 } },
  { id: "soap",        name: "Sudsy Soap",    emoji: "🧼", price: 12,  description: "Bath time — restores cleanliness.",
    effect: { kind: "care", needs: { cleanliness: +50 } } },
  { id: "potion",      name: "Health Tonic",  emoji: "🧪", price: 40,  description: "Heal your creature when health is low.",
    effect: { kind: "care", needs: { health: +60 } } },
  { id: "elixir",      name: "Bright Elixir", emoji: "✨", price: 95,  description: "Full restore — health, hunger, cleanliness.",
    effect: { kind: "care", needs: { health: +100, hunger: +60, cleanliness: +60, happiness: +20 } } },
  { id: "battle_potion",name:"Battle Tonic",  emoji: "🍵", price: 28,  description: "Mid-battle HP boost (+45 hp).",
    effect: { kind: "battle-heal", hp: 45 } },
  { id: "battle_energy",name:"Sparkfruit",    emoji: "🍓", price: 22,  description: "Mid-battle energy boost (+20 energy).",
    effect: { kind: "battle-energy", energy: 20 } },
  { id: "xp_candy",    name: "Wisdom Candy",  emoji: "🍬", price: 55,  description: "Award 50 XP instantly.",
    effect: { kind: "xp", amount: 50 } },
];

export function getItem(id: string): Item | undefined { return ITEMS.find(i => i.id === id); }

// ── HABITATS ──────────────────────────────────────────────────────────
// Pick a habitat from the Hub. Matching-type creatures get a tiny bond
// bonus tick every care action. Cosmetic + tactical — light by design.
export const HABITATS: Habitat[] = [
  { id: "meadow",   name: "Sun Meadow",      emoji: "🌿", favoredType: "bloom",
    description: "Open field of soft grass. Bloom creatures thrive here.",
    bgGradient: "linear-gradient(180deg, #134e1f 0%, #0a2010 100%)",
    accent: "#86efac", unlockCost: 0 },
  { id: "embers",   name: "Ember Hollow",    emoji: "🔥", favoredType: "flame",
    description: "A warm cavern of glowing coals. Flame creatures crackle with energy.",
    bgGradient: "linear-gradient(180deg, #4a1308 0%, #1a0a08 100%)",
    accent: "#f97316", unlockCost: 120 },
  { id: "tidepool", name: "Tidepool Cove",   emoji: "🌊", favoredType: "tide",
    description: "A salt-washed cove. Tide creatures hum with the surf.",
    bgGradient: "linear-gradient(180deg, #0b3960 0%, #061830 100%)",
    accent: "#3b82f6", unlockCost: 120 },
  { id: "stormpeak",name: "Storm Peak",      emoji: "⚡", favoredType: "spark",
    description: "Mountaintop where lightning dances. Spark creatures feel charged.",
    bgGradient: "linear-gradient(180deg, #4a3b08 0%, #1a1408 100%)",
    accent: "#facc15", unlockCost: 200 },
  { id: "shadowgrove",name:"Shadow Grove",   emoji: "🌑", favoredType: "shade",
    description: "Twilight forest of whispering trees. Shade creatures slip between shadows.",
    bgGradient: "linear-gradient(180deg, #2a1845 0%, #0e0820 100%)",
    accent: "#a78bfa", unlockCost: 200 },
  { id: "stargarden",name: "Star Garden",    emoji: "✨", favoredType: "light",
    description: "Crystal field under a star-bright sky. Light creatures shimmer.",
    bgGradient: "linear-gradient(180deg, #1a3a4a 0%, #050a18 100%)",
    accent: "#fde047", unlockCost: 320 },
];

export function getHabitat(id: string): Habitat | undefined { return HABITATS.find(h => h.id === id); }
export const DEFAULT_HABITAT = "meadow";

/** Used by the egg-incubator (future) to seed a hatch with rarity weights. */
export function rollSpecies(): Species {
  const r = Math.random();
  let pool: Species[];
  if (r < 0.55) pool = SPECIES.filter(s => s.rarity === "common");
  else if (r < 0.85) pool = SPECIES.filter(s => s.rarity === "uncommon");
  else if (r < 0.98) pool = SPECIES.filter(s => s.rarity === "rare");
  else pool = SPECIES.filter(s => s.rarity === "mythic");
  if (pool.length === 0) pool = SPECIES;
  return pool[Math.floor(Math.random() * pool.length)];
}
