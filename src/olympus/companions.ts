// Mythological-creature companions with three-stage Pokémon-style
// evolution chains. Each line starts at stage 1, evolves to stage 2 at
// level 10, and stage 3 at level 25. Player must opt in to each
// evolution from the hero profile.
//
// No attribute system — companions just have XP and level. Skills
// unlock at level milestones and AI weaves them into scenes when
// they're relevant (storyteller reads the companion's current skill
// list out of heroBrief()).

export interface CompanionStage {
  /** Display name for this stage (e.g. "Foal", "Winged Colt", "Pegasus"). */
  name: string;
  /** Pendant glyph rendered inside the ornate ring. */
  emoji: string;
  /** Short flavor description shown on the companion card. */
  description: string;
  /** Ability the AI is told about — woven naturally into scenes. */
  ability: string;
  /** Level required to evolve INTO this stage. Stage 1 is always 1. */
  requiredLevel: number;
  /** Skills unlocked at this stage. AI uses these in adventures. */
  skills: string[];
}

export interface CompanionLine {
  id: string;
  /** Mythological lineage flavor. */
  mythLink: string;
  /** Three-stage evolution chain. */
  stages: [CompanionStage, CompanionStage, CompanionStage];
}

export const COMPANION_LINES: CompanionLine[] = [
  {
    id: "pegasus",
    mythLink: "Zeus / Poseidon",
    stages: [
      { name: "Winged Foal",       emoji: "🐴", description: "A storm-blessed colt whose wings are still tucked tight against its sides.",            ability: "Sense storms before they arrive.",                  requiredLevel: 1,  skills: ["Storm Sense"] },
      { name: "Skybound Courser",  emoji: "🦄", description: "Wings unfurled. Carries you in short hops across rivers and cliffs.",                  ability: "Short flight — clear single obstacles.",            requiredLevel: 10, skills: ["Storm Sense", "Sky Hop"] },
      { name: "Pegasus",           emoji: "🪽", description: "True Pegasus — a creature out of song. Trusted only by the brave.",                    ability: "Sustained flight; outpace nearly anything.",        requiredLevel: 25, skills: ["Storm Sense", "Sky Hop", "Cloud Sprint"] },
    ],
  },
  {
    id: "nemean_lion",
    mythLink: "Heracles",
    stages: [
      { name: "Lion Cub",          emoji: "🦁", description: "A tawny cub with a roar bigger than its frame.",                                       ability: "Boost party morale in combat.",                     requiredLevel: 1,  skills: ["Roar of Courage"] },
      { name: "Young Mane-Lion",   emoji: "🦁", description: "Mane in. Eyes that know what they want.",                                              ability: "Pounce attack from cover.",                         requiredLevel: 10, skills: ["Roar of Courage", "Hunting Pounce"] },
      { name: "Nemean Lion",       emoji: "🦁", description: "Golden hide that no mortal blade can pierce. Walks beside you like a wall.",            ability: "Hide turns aside one near-fatal blow per adventure.", requiredLevel: 25, skills: ["Roar of Courage", "Hunting Pounce", "Golden Hide"] },
    ],
  },
  {
    id: "cerberus",
    mythLink: "Hades",
    stages: [
      { name: "Hellhound Pup",     emoji: "🐶", description: "A single-headed pup of the Underworld. Eyes faintly ember.",                            ability: "Smell out the lying NPCs.",                         requiredLevel: 1,  skills: ["Underworld Nose"] },
      { name: "Twin-Headed Hound", emoji: "🐕", description: "A second head emerges. Two mouths, one mind.",                                          ability: "Two attacks per turn in combat.",                   requiredLevel: 10, skills: ["Underworld Nose", "Twin Bite"] },
      { name: "Cerberus",          emoji: "🐺", description: "Three heads, one loyalty. The dead step aside when it walks.",                          ability: "Cannot be intimidated; never sleeps on watch.",     requiredLevel: 25, skills: ["Underworld Nose", "Twin Bite", "Threefold Guard"] },
    ],
  },
  {
    id: "griffin",
    mythLink: "Apollo",
    stages: [
      { name: "Griffin Chick",     emoji: "🐤", description: "Half-eagle, half-lion. Will be magnificent — eventually.",                              ability: "Scout one hidden danger per adventure.",            requiredLevel: 1,  skills: ["Eagle Eye"] },
      { name: "Fledgling Griffin", emoji: "🦅", description: "Wing feathers in. Talons developing. Already proud.",                                   ability: "Dive attack from above.",                           requiredLevel: 10, skills: ["Eagle Eye", "Dive Strike"] },
      { name: "Griffin",           emoji: "🦁", description: "Full-grown. A mount that knows kings and refuses most of them.",                        ability: "Carries you on long flights between adventures.",   requiredLevel: 25, skills: ["Eagle Eye", "Dive Strike", "Royal Flight"] },
    ],
  },
  {
    id: "phoenix",
    mythLink: "Apollo / Helios",
    stages: [
      { name: "Phoenix Ember",     emoji: "🔥", description: "An ember-bird the size of a sparrow. Already glows.",                                   ability: "Light dark places without a torch.",                requiredLevel: 1,  skills: ["Inner Light"] },
      { name: "Sunbird",           emoji: "🐦", description: "Plumage flashes like beaten copper.  Sings dawn awake.",                                ability: "Heal small wounds between scenes.",                 requiredLevel: 10, skills: ["Inner Light", "Sunsong Mending"] },
      { name: "Phoenix",           emoji: "🦤", description: "Reborn from its own ashes.  Survives what should kill it.",                              ability: "Once per adventure, return from fatal damage.",      requiredLevel: 25, skills: ["Inner Light", "Sunsong Mending", "Ashen Rebirth"] },
    ],
  },
  {
    id: "hydra",
    mythLink: "Lerna",
    stages: [
      { name: "Hydra Hatchling",   emoji: "🐍", description: "A single-headed serpent the length of your forearm.",                                  ability: "Poison-immune; sniffs out toxins.",                 requiredLevel: 1,  skills: ["Poison Lore"] },
      { name: "Three-Headed Hydra", emoji: "🐲", description: "Three heads, three minds, one terrifying body.",                                       ability: "Each strike is three strikes; intimidates lesser foes.", requiredLevel: 10, skills: ["Poison Lore", "Triple Strike"] },
      { name: "Lernaean Hydra",    emoji: "🐉", description: "Nine heads coil and uncoil. Wounds close over.",                                        ability: "Heads regrow — survives sustained combat.",          requiredLevel: 25, skills: ["Poison Lore", "Triple Strike", "Regrowing Heads"] },
    ],
  },
  {
    id: "centaur",
    mythLink: "Chiron",
    stages: [
      { name: "Centaur Colt",      emoji: "🐎", description: "A young centaur, still learning the bow. Adopts you as kin.",                           ability: "Teaches you — bonus XP from one event per adventure.", requiredLevel: 1,  skills: ["Chiron's Lesson"] },
      { name: "Centaur Initiate",  emoji: "🏹", description: "Bow over the shoulder; spear at the side. Walks tall.",                                 ability: "Ranged-attack support in combat.",                  requiredLevel: 10, skills: ["Chiron's Lesson", "Twin-Arrow Volley"] },
      { name: "Centaur Master",    emoji: "🏛️", description: "A scholar-warrior worthy of teaching heroes.",                                          ability: "Identify any ancient artifact at a glance.",        requiredLevel: 25, skills: ["Chiron's Lesson", "Twin-Arrow Volley", "Old-Tongue Lore"] },
    ],
  },
  {
    id: "sphinx",
    mythLink: "Thebes",
    stages: [
      { name: "Sphinx Cub",        emoji: "🐱", description: "Half-lion, half-woman, all riddle. Speaks in rhymes already.",                          ability: "Whispers the answer to one riddle per adventure.",  requiredLevel: 1,  skills: ["Riddler's Hint"] },
      { name: "Young Sphinx",      emoji: "🦒", description: "Wings half-developed.  Eyes that miss nothing.",                                       ability: "Sense lying NPCs in a wide radius.",                requiredLevel: 10, skills: ["Riddler's Hint", "Truth-Glance"] },
      { name: "Great Sphinx",      emoji: "🏺", description: "An oracle in feline form. Cities still tell stories of its appearance.",               ability: "Asks a riddle that opens any sealed door.",         requiredLevel: 25, skills: ["Riddler's Hint", "Truth-Glance", "Threshold Riddle"] },
    ],
  },
  {
    id: "minotaur_calf",
    mythLink: "Crete",
    stages: [
      { name: "Minotaur Calf",     emoji: "🐮", description: "A small bull-headed child. Lonely, loyal, and surprisingly gentle.",                    ability: "Never gets lost in a maze.",                        requiredLevel: 1,  skills: ["Labyrinth Sense"] },
      { name: "Young Minotaur",    emoji: "🐃", description: "Horns coming in. Bigger than most men already.",                                       ability: "Bull rush — knock down one foe per combat.",        requiredLevel: 10, skills: ["Labyrinth Sense", "Bull Rush"] },
      { name: "Minotaur",          emoji: "🐂", description: "A guardian-friend now, the curse turned to love.",                                      ability: "Unmovable in combat; pulls allies clear of harm.",  requiredLevel: 25, skills: ["Labyrinth Sense", "Bull Rush", "Guardian's Stand"] },
    ],
  },
  {
    id: "owl_of_athena",
    mythLink: "Athena",
    stages: [
      { name: "Owlet of Athena",   emoji: "🦉", description: "A small grey owl with knowing eyes — Athena's gift.",                                  ability: "Suggests the wisest of your choices.",              requiredLevel: 1,  skills: ["Athena's Whisper"] },
      { name: "Sage Owl",          emoji: "🦅", description: "Fuller-grown. Watches you read; turns pages occasionally.",                            ability: "Translate any inscription you encounter.",          requiredLevel: 10, skills: ["Athena's Whisper", "Old Tongue"] },
      { name: "Owl of Athena",     emoji: "🦉", description: "Athena's own oracle now rests on your shoulder.",                                       ability: "Once per adventure, foresee the outcome of a key choice.", requiredLevel: 25, skills: ["Athena's Whisper", "Old Tongue", "Foresight"] },
    ],
  },
  {
    id: "harpy",
    mythLink: "Aello / Boreas",
    stages: [
      { name: "Harpy Chick",       emoji: "🪶", description: "A storm-blessed chick with feathers like wind-blown silver.",                            ability: "Always smells a coming storm.",                     requiredLevel: 1,  skills: ["Wind Sense"] },
      { name: "Storm Maiden",      emoji: "🌬️", description: "Half-girl, half-bird. Sings the wind awake.",                                            ability: "Calls a sudden gale to confuse enemies.",            requiredLevel: 10, skills: ["Wind Sense", "Gale Song"] },
      { name: "Storm Harpy",       emoji: "⚡", description: "A storm given form. Lightning crackles between her feathers.",                            ability: "Carries you on a brief storm-flight in dire need.",  requiredLevel: 25, skills: ["Wind Sense", "Gale Song", "Lightning Stoop"] },
    ],
  },
  {
    id: "satyr",
    mythLink: "Pan",
    stages: [
      { name: "Goat Kid",          emoji: "🐐", description: "A small horned kid that follows you everywhere, bleating.",                              ability: "Finds the wildberries and grapes others miss.",      requiredLevel: 1,  skills: ["Forager's Eye"] },
      { name: "Young Satyr",       emoji: "🎶", description: "Half-goat, half-boy, all mischief. Plays a pan-pipe.",                                  ability: "Charms hostile wildlife with music.",                requiredLevel: 10, skills: ["Forager's Eye", "Pan-Pipe Charm"] },
      { name: "Satyr Lord",        emoji: "🍇", description: "Bearded, hoofed, knowing. Wine and laughter follow him.",                                ability: "Convinces almost any villager to share their best.",  requiredLevel: 25, skills: ["Forager's Eye", "Pan-Pipe Charm", "Bacchic Tongue"] },
    ],
  },
  {
    id: "dryad",
    mythLink: "The Forests",
    stages: [
      { name: "Sapling Spirit",    emoji: "🌱", description: "A tiny green-eyed spirit shaped like a small girl made of leaves.",                       ability: "Heals small wounds with a touch of her fingers.",    requiredLevel: 1,  skills: ["Green Touch"] },
      { name: "Forest Dryad",      emoji: "🌳", description: "A tree-spirit who can step in and out of her oak.",                                       ability: "Vanishes into any nearby tree to escape danger.",    requiredLevel: 10, skills: ["Green Touch", "Tree-step"] },
      { name: "Old Oak Dryad",     emoji: "🍃", description: "Bark-skinned, ancient, kind. Knows the forest's every grudge.",                            ability: "Commands roots and vines to bind one enemy per scene.", requiredLevel: 25, skills: ["Green Touch", "Tree-step", "Root Bind"] },
    ],
  },
  {
    id: "chimera",
    mythLink: "Typhon / Echidna",
    stages: [
      { name: "Chimera Kit",       emoji: "🐈‍⬛", description: "A small lion-cub with a kid's horns and a snake for a tail.",                            ability: "Breath of warm sparks — lights tinder, scares wolves.", requiredLevel: 1,  skills: ["Spark Breath"] },
      { name: "Young Chimera",     emoji: "🐉", description: "Lion's head, goat's head, serpent-tail — all three glaring.",                              ability: "Three attacks per combat from three angry heads.",   requiredLevel: 10, skills: ["Spark Breath", "Triple Bite"] },
      { name: "Chimera",           emoji: "🔥", description: "Full-grown. The lion roars, the goat butts, the snake spits fire.",                       ability: "Breath of true flame — devastating against single foes.", requiredLevel: 25, skills: ["Spark Breath", "Triple Bite", "Fire Breath"] },
    ],
  },
  {
    id: "stymphalian",
    mythLink: "Ares",
    stages: [
      { name: "Bronze Hatchling",  emoji: "🐣", description: "A chick with copper-bronze down feathers. Pecks anything it doesn't trust.",              ability: "Bronze beak — pierces simple locks.",                requiredLevel: 1,  skills: ["Pecking Lockpick"] },
      { name: "Bronze Bird",       emoji: "🦤", description: "Fully-bronze plumage. Drops metal feathers like darts.",                                  ability: "Throws bronze feathers as projectile weapons.",      requiredLevel: 10, skills: ["Pecking Lockpick", "Feather Dart"] },
      { name: "Stymphalian Bird",  emoji: "🦅", description: "Giant, bronze, deadly. The kind of creature Heracles hunted.",                            ability: "Wing-buffet of metallic feathers — clears a swath of enemies.", requiredLevel: 25, skills: ["Pecking Lockpick", "Feather Dart", "Bronze Storm"] },
    ],
  },
  // ── Elemental companions ─────────────────────────────────────────
  {
    id: "fire_sprite",
    mythLink: "Hephaestus",
    stages: [
      { name: "Ember Pip",         emoji: "🔥", description: "A small living spark that hovers above your palm and chirps when happy.",                  ability: "Lights torches and tinder without flint.",            requiredLevel: 1,  skills: ["Tinder Spark"] },
      { name: "Hearth Salamander", emoji: "🦎", description: "A bright-scaled lizard that drinks heat and breathes warm air.",                            ability: "Resists fire damage; can burn one foe per scene.",    requiredLevel: 10, skills: ["Tinder Spark", "Heat-Breath"] },
      { name: "Forge Drake",       emoji: "🐉", description: "A small wyrm that smolders. Forges admit it; smiths bow when it passes.",                  ability: "Breathes controlled flame — devastating in close combat.", requiredLevel: 25, skills: ["Tinder Spark", "Heat-Breath", "Forge Fire"] },
    ],
  },
  {
    id: "water_nereid",
    mythLink: "Poseidon",
    stages: [
      { name: "Tide Drop",         emoji: "💧", description: "A floating bubble of seawater with two curious eyes inside.",                              ability: "Detects fresh water and hidden springs.",             requiredLevel: 1,  skills: ["Water-Sense"] },
      { name: "Young Nereid",      emoji: "🧜", description: "A small sea-nymph who rides on waves and speaks the salt-tongue.",                          ability: "Calms small storms; breathes underwater for hours.",  requiredLevel: 10, skills: ["Water-Sense", "Salt-Tongue"] },
      { name: "Nereid",            emoji: "🌊", description: "A full Nereid, daughter of the deep. Commands wave and current.",                            ability: "Raises a wave to wash enemies aside; safe sea passage.", requiredLevel: 25, skills: ["Water-Sense", "Salt-Tongue", "Tidal Surge"] },
    ],
  },
  {
    id: "stone_kobalos",
    mythLink: "Gaia",
    stages: [
      { name: "Pebble Sprite",     emoji: "🪨", description: "A fist-sized stone with a stubborn face. Hums when content.",                                ability: "Finds buried things — coins, doors, bones.",          requiredLevel: 1,  skills: ["Stone-Sight"] },
      { name: "Boulder Beast",     emoji: "🗿", description: "A creature of moss and granite. Slow, kind, immovable.",                                    ability: "Shields you from one blow per scene; bashes walls.",  requiredLevel: 10, skills: ["Stone-Sight", "Boulder Block"] },
      { name: "Mountain Heart",    emoji: "⛰️", description: "A walking outcropping. Ancient. Older than most of the gods.",                              ability: "Shakes the earth — knocks down all nearby enemies.",  requiredLevel: 25, skills: ["Stone-Sight", "Boulder Block", "Earth-Tremor"] },
    ],
  },
];

export function getLine(lineId: string): CompanionLine | undefined {
  return COMPANION_LINES.find(l => l.id === lineId);
}

export function getStage(lineId: string, stage: number): CompanionStage | undefined {
  return getLine(lineId)?.stages[Math.max(0, Math.min(2, stage - 1))];
}

export function randomLine(): CompanionLine {
  return COMPANION_LINES[Math.floor(Math.random() * COMPANION_LINES.length)];
}

/** XP required to reach level N. Linear-ish curve so progression
 *  matches roughly one level per 1-2 adventures. */
export function xpForLevel(level: number): number {
  return Math.round(50 * level + Math.pow(level, 1.5) * 5);
}

/** Levels at which evolution becomes available. Player must opt in
 *  from the hero profile to actually evolve. */
export const EVOLUTION_LEVELS: Record<number, number> = { 2: 10, 3: 25 };

export interface CompanionState {
  lineId: string;
  stage: 1 | 2 | 3;
  level: number;
  xp: number;
}

/** True when the companion has hit the level needed for its NEXT stage. */
export function canEvolve(c: CompanionState): boolean {
  if (c.stage >= 3) return false;
  const need = EVOLUTION_LEVELS[c.stage + 1];
  return c.level >= need;
}

/** XP awarded after an adventure. Tuned so a typical 10-decision run
 *  grants enough to gain about one level. */
export function xpRewardFor(outcome: "triumph" | "bittersweet" | "tragic" | "mysterious" | undefined, sceneCount: number): number {
  const mult = outcome === "triumph" ? 1.0 : outcome === "tragic" ? 0.4 : 0.7;
  return Math.round((30 + sceneCount * 6) * mult);
}

/** Default-color palettes — kept compatible with the prior export. */
export const COMPANION_PALETTES: Array<{ primary: string; secondary: string; accent: string; label: string }> = [
  { primary: "#8B4513", secondary: "#D4A373", accent: "#FFD700", label: "Sand & Gold" },
  { primary: "#2D4A2A", secondary: "#7B9E6A", accent: "#DAA520", label: "Forest & Gold" },
  { primary: "#1a3a8b", secondary: "#6a8acc", accent: "#FFD700", label: "Royal Blue" },
  { primary: "#3a3a3a", secondary: "#6a6a6a", accent: "#FFD700", label: "Slate & Gold" },
  { primary: "#8b1a1a", secondary: "#cc6a6a", accent: "#FFD700", label: "Crimson" },
  { primary: "#1a8b3a", secondary: "#5acc7a", accent: "#FFD700", label: "Emerald" },
  { primary: "#5a1a8b", secondary: "#9a5acc", accent: "#FFD700", label: "Royal Violet" },
  { primary: "#e9e3d2", secondary: "#c9c3b2", accent: "#DAA520", label: "Ivory" },
];
