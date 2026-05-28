// Potion Lab — ingredient catalog. Each ingredient has a rarity, an
// elemental category, a color (for the visual bottle), and a flavor
// description used by the AI Brewmaster when narrating a brew.

export type Element = "fire" | "water" | "earth" | "air" | "spirit" | "shadow" | "gold" | "wild";
export type Rarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  element: Element;
  rarity: Rarity;
  /** Hex color used in the cauldron + bottle preview. */
  color: string;
  /** One-liner flavor for the grimoire. */
  flavor: string;
}

export const INGREDIENTS: Ingredient[] = [
  // ─── Common (12) ─────────────────────────────────────────────
  { id: "moonwater",  name: "Moonwater",     emoji: "💧", element: "water",  rarity: "common", color: "#cbd5e1", flavor: "Tastes faintly of silver. Collected on full-moon nights." },
  { id: "dustflame",  name: "Dustflame",     emoji: "🔥", element: "fire",   rarity: "common", color: "#f97316", flavor: "A small flame trapped in a glass marble. Warm to the touch." },
  { id: "clovergreen",name: "Cloverleaf",    emoji: "🍀", element: "earth",  rarity: "common", color: "#22c55e", flavor: "Lucky if picked at noon. Smells like a fresh-cut lawn." },
  { id: "windseed",   name: "Windseed",      emoji: "🌬️", element: "air",    rarity: "common", color: "#a5f3fc", flavor: "A dandelion puff that hums in your palm." },
  { id: "spirit_sugar", name: "Spirit Sugar", emoji: "✨", element: "spirit", rarity: "common", color: "#f0abfc", flavor: "Sparkles even in shadow. Stings the tongue, briefly." },
  { id: "salt_of_dawn", name: "Dawn Salt",   emoji: "🧂", element: "earth",  rarity: "common", color: "#fef3c7", flavor: "Mined at sunrise. Said to wake what sleeps." },
  { id: "willow_bark",  name: "Willow Bark", emoji: "🪵", element: "earth",  rarity: "common", color: "#a16207", flavor: "Bends but does not break. A reminder, the elders say." },
  { id: "frogspot",     name: "Frogspot Mushroom", emoji: "🍄", element: "earth", rarity: "common", color: "#7e22ce", flavor: "Polka-dot cap. Croaks gently if you press it." },
  { id: "mint_leaf",    name: "Bright Mint", emoji: "🌿", element: "air",    rarity: "common", color: "#86efac", flavor: "Wakes you up just by being near it." },
  { id: "honey_drop",   name: "Honeydrop",   emoji: "🍯", element: "gold",   rarity: "common", color: "#fbbf24", flavor: "Bees give it up only to those who ask politely." },
  { id: "river_pebble", name: "River Pebble", emoji: "🪨", element: "earth", rarity: "common", color: "#94a3b8", flavor: "Smoothed by ten thousand currents. Holds memory of the river." },
  { id: "feather_white", name: "White Feather", emoji: "🪶", element: "air", rarity: "common", color: "#f8fafc", flavor: "Soft, warm, and weighs less than a wish." },

  // ─── Uncommon (10) ───────────────────────────────────────────
  { id: "phoenix_ash",  name: "Phoenix Ash", emoji: "🪶", element: "fire",   rarity: "uncommon", color: "#dc2626", flavor: "Still warm. Glows faintly when stirred." },
  { id: "fairy_dust",   name: "Fairy Dust",  emoji: "🧚", element: "spirit", rarity: "uncommon", color: "#a78bfa", flavor: "Tickles. Don't sneeze near it — once airborne it does what it wants." },
  { id: "dragon_scale", name: "Dragon Scale",emoji: "🐉", element: "fire",   rarity: "uncommon", color: "#16a34a", flavor: "Cold despite its origin. Reflects firelight strangely." },
  { id: "sea_glass",    name: "Sea Glass",   emoji: "🧊", element: "water",  rarity: "uncommon", color: "#67e8f9", flavor: "Once a bottle. Now smoothed by ten thousand tides." },
  { id: "ember_pepper", name: "Ember Pepper",emoji: "🌶️", element: "fire",   rarity: "uncommon", color: "#ef4444", flavor: "Numbingly hot. Brewmasters wear gloves." },
  { id: "shadow_silk",  name: "Shadow Silk", emoji: "🕸️", element: "shadow", rarity: "uncommon", color: "#1e293b", flavor: "Woven by spiders that only spin at midnight." },
  { id: "moss_of_quiet",name: "Quiet Moss",  emoji: "🟢", element: "earth",  rarity: "uncommon", color: "#15803d", flavor: "Grows in places nobody talks. Tastes like rain on stone." },
  { id: "cloudbloom",   name: "Cloudbloom",  emoji: "☁️", element: "air",    rarity: "uncommon", color: "#e2e8f0", flavor: "Picked from low-flying clouds. Crumbles into mist." },
  { id: "gold_thread",  name: "Gold Thread", emoji: "🧵", element: "gold",   rarity: "uncommon", color: "#facc15", flavor: "Spun from sunbeams by patient spiders." },
  { id: "river_song",   name: "Bottled River Song", emoji: "🎵", element: "water", rarity: "uncommon", color: "#3b82f6", flavor: "Hums softly. Calms grumpy cats." },

  // ─── Rare (8) ────────────────────────────────────────────────
  { id: "unicorn_hair", name: "Unicorn Hair",emoji: "🦄", element: "spirit", rarity: "rare", color: "#fce7f3", flavor: "Given, never taken. Shimmers like opal in moonlight." },
  { id: "starlight",    name: "Bottled Starlight", emoji: "⭐", element: "air", rarity: "rare", color: "#fde047", flavor: "Glow doesn't fade in the dark. Slightly warm." },
  { id: "krakenink",    name: "Kraken Ink",  emoji: "🦑", element: "shadow", rarity: "rare", color: "#0f172a", flavor: "The blackest black. Drinks light." },
  { id: "thunderstone", name: "Thunderstone",emoji: "⚡", element: "air",    rarity: "rare", color: "#7c3aed", flavor: "Crackles softly. Charges itself in storms." },
  { id: "moonpearl",    name: "Moonpearl",   emoji: "🌙", element: "water",  rarity: "rare", color: "#e0e7ff", flavor: "Found in oysters touched by moonbeams." },
  { id: "lava_chip",    name: "Cooled Lava Chip", emoji: "🌋", element: "fire", rarity: "rare", color: "#92400e", flavor: "Black on the outside, glowing within. Hot to the brave." },
  { id: "yeti_breath",  name: "Bottled Yeti Breath", emoji: "❄️", element: "water", rarity: "rare", color: "#bfdbfe", flavor: "The cold of a forgotten mountain. Don't unstopper indoors." },
  { id: "wishbone",     name: "Granted Wishbone", emoji: "🦴", element: "spirit", rarity: "rare", color: "#fef9c3", flavor: "From a wish that came true. Still warm with luck." },

  // ─── Legendary (6) ───────────────────────────────────────────
  { id: "phoenix_egg",  name: "Phoenix Eggshell", emoji: "🥚", element: "fire", rarity: "legendary", color: "#fb923c", flavor: "Hatched once. Once is enough." },
  { id: "siren_song",   name: "Siren's Lullaby (bottled)", emoji: "🧜", element: "water", rarity: "legendary", color: "#0ea5e9", flavor: "Plays a song you almost remember." },
  { id: "godsbreath",   name: "Wind From The First Day", emoji: "🌪️", element: "air", rarity: "legendary", color: "#fefce8", flavor: "Older than every other breeze. Smells like newness." },
  { id: "heart_oak",    name: "Heart of the Old Oak", emoji: "🌳", element: "earth", rarity: "legendary", color: "#854d0e", flavor: "The oak gave it when it fell. It remembers every storm." },
  { id: "sunfire",      name: "Sunfire Filament", emoji: "☀️", element: "fire", rarity: "legendary", color: "#fbbf24", flavor: "A single thread of solar plasma. Yes, really." },
  { id: "void_droplet", name: "Void Droplet", emoji: "⬛", element: "shadow", rarity: "legendary", color: "#000000", flavor: "Pure absence in liquid form. Looks at you back." },

  // ─── Mythic (4) ──────────────────────────────────────────────
  { id: "true_name",    name: "Your True Name (whispered)", emoji: "🗝️", element: "spirit", rarity: "mythic", color: "#fde68a", flavor: "Spoken once in a cave that no longer exists." },
  { id: "alchemists_tear", name: "Alchemist's First Tear", emoji: "💎", element: "spirit", rarity: "mythic", color: "#a5b4fc", flavor: "Cried the first time a potion truly worked." },
  { id: "time_grain",   name: "Grain of Time", emoji: "⏳", element: "wild", rarity: "mythic", color: "#fef3c7", flavor: "One second, made solid. Don't drop it." },
  { id: "rainbow_root", name: "Rainbow Root", emoji: "🌈", element: "wild", rarity: "mythic", color: "#f472b6", flavor: "Grows where lightning struck a wishing well." },

  // ─── Harry Potter inspired (10) ──────────────────────────────
  { id: "mandrake_root", name: "Mandrake Root",  emoji: "🥔", element: "earth",  rarity: "uncommon", color: "#84cc16", flavor: "Cries when uprooted. Plug your ears or expect a nap." },
  { id: "bezoar",        name: "Bezoar Stone",   emoji: "🪨", element: "spirit", rarity: "rare", color: "#78716c", flavor: "A small stone from a goat's stomach. Cures most poisons." },
  { id: "gillyweed",     name: "Gillyweed",      emoji: "🌱", element: "water",  rarity: "uncommon", color: "#10b981", flavor: "Slimy, gray-green. Grants gills for an hour. Don't ask how." },
  { id: "boomslang_skin",name: "Boomslang Skin", emoji: "🐍", element: "shadow", rarity: "rare", color: "#365314", flavor: "Shed by a tree-snake from the southern reaches. Restricted reading." },
  { id: "lacewing_flies",name: "Lacewing Flies (stewed)", emoji: "🪰", element: "spirit", rarity: "uncommon", color: "#a3e635", flavor: "Stewed for 21 days. Time matters. Listen to the brewmaster." },
  { id: "wormwood",      name: "Wormwood Sprig", emoji: "🌿", element: "shadow", rarity: "common", color: "#4d7c0f", flavor: "Bitter and a little dangerous. Use sparingly." },
  { id: "asphodel_root", name: "Asphodel Root",  emoji: "🌾", element: "earth",  rarity: "uncommon", color: "#d6d3d1", flavor: "Powdered from the asphodel lily. Brings deep, dreamless sleep." },
  { id: "valerian_sprig",name: "Valerian Sprig", emoji: "🌸", element: "earth",  rarity: "common", color: "#c084fc", flavor: "Smells like old socks. Cats love it. So do brewmasters." },
  { id: "ashwinder_egg", name: "Ashwinder Egg",  emoji: "🥚", element: "fire",   rarity: "rare", color: "#fb923c", flavor: "Lay in dying fires. Glow faintly. Always frozen before brewing." },
  { id: "phoenix_tear",  name: "Phoenix Tear",   emoji: "💧", element: "fire",   rarity: "legendary", color: "#dc2626", flavor: "Heals almost any wound. The phoenix has to want to cry." },

  // ─── Greek mythology inspired (10) ───────────────────────────
  { id: "ambrosia",      name: "Crumb of Ambrosia",  emoji: "🍯", element: "spirit", rarity: "legendary", color: "#fef3c7", flavor: "Food of the gods. Smells like honey, lightning, and home." },
  { id: "nectar",        name: "Drop of Nectar",     emoji: "🥃", element: "spirit", rarity: "legendary", color: "#fbbf24", flavor: "Olympus' wine. Burns gold, tastes like the sun." },
  { id: "lethe_water",   name: "Lethe Water",        emoji: "💧", element: "shadow", rarity: "rare", color: "#1e293b", flavor: "From the river of forgetting. One sip and you lose this morning." },
  { id: "olympus_dew",   name: "Olympus Dew",        emoji: "💎", element: "air",    rarity: "rare", color: "#bae6fd", flavor: "Collected from Olympus peaks at dawn. Lighter than air." },
  { id: "minotaur_horn", name: "Powdered Minotaur Horn", emoji: "🐂", element: "earth", rarity: "rare", color: "#78350f", flavor: "Strong as the maze. Brewmasters use a pinch, never a spoonful." },
  { id: "medusa_scale",  name: "Medusa's Tear-Scale", emoji: "🐍", element: "shadow", rarity: "legendary", color: "#52525b", flavor: "She wept once. The drop turned to scale before it hit the ground." },
  { id: "golden_fleece_thread", name: "Golden Fleece Thread", emoji: "🧵", element: "gold", rarity: "rare", color: "#facc15", flavor: "From the ram of myth. Holds an entire quest's luck in one strand." },
  { id: "cyclops_eyelash", name: "Cyclops Eyelash", emoji: "👁️", element: "spirit", rarity: "uncommon", color: "#a3a3a3", flavor: "He didn't notice when it fell. Now you've got one." },
  { id: "siren_voicebox",name: "Bottled Siren's Voice", emoji: "🎵", element: "water", rarity: "legendary", color: "#0ea5e9", flavor: "Sings the song that wrecked Odysseus. Plug your ears before unstoppering." },
  { id: "hydra_scale",   name: "Hydra Scale",      emoji: "🐲", element: "water",  rarity: "rare", color: "#16a34a", flavor: "Re-grows if broken. Brewmaster cautions against testing." },

  // ─── Skyrim / Nordic inspired (10) ───────────────────────────
  { id: "imp_stool",     name: "Imp Stool Cap",    emoji: "🍄", element: "earth",  rarity: "common", color: "#b91c1c", flavor: "Red-capped mushroom. Apprentices learn the soak technique." },
  { id: "deathbell",     name: "Deathbell Flower", emoji: "🔔", element: "shadow", rarity: "uncommon", color: "#7e22ce", flavor: "Black-purple bell. Lethal raw, gentle in three-ingredient mixes." },
  { id: "nightshade",    name: "Nightshade Berry", emoji: "🫐", element: "shadow", rarity: "uncommon", color: "#1e1b4b", flavor: "Sweetest-smelling berry on the moor. Don't snack." },
  { id: "moon_sugar",    name: "Moon Sugar Crystal", emoji: "✨", element: "spirit", rarity: "rare", color: "#fef9c3", flavor: "Crystallized from moonbeams. Khajiit treats." },
  { id: "snowberry",     name: "Snowberry",        emoji: "🍒", element: "water",  rarity: "common", color: "#fee2e2", flavor: "Bright red on a frosted bush. Tastes like winter sunlight." },
  { id: "sleeping_tree_sap", name: "Sleeping Tree Sap", emoji: "🍯", element: "spirit", rarity: "rare", color: "#fb923c", flavor: "From the giant tree near the lake. Tingles on the tongue." },
  { id: "frost_salt",    name: "Frost Salt",       emoji: "❄️", element: "water",  rarity: "uncommon", color: "#dbeafe", flavor: "Mined from ice-clad caverns. Sharp on the senses." },
  { id: "void_salt",     name: "Void Salt",        emoji: "⬛", element: "shadow", rarity: "rare", color: "#0c0a09", flavor: "Crystals from the deeper places. Cold like a forgotten name." },
  { id: "fire_salt",     name: "Fire Salt",        emoji: "🌶️", element: "fire",   rarity: "uncommon", color: "#f97316", flavor: "Always warm. Stays warm in your pocket through winter." },
  { id: "troll_fat",     name: "Troll Fat",        emoji: "🧈", element: "earth",  rarity: "uncommon", color: "#d4d4d8", flavor: "Don't sniff it. Don't ask how it's harvested. Just measure twice." },

  // ─── Schoolyard / kid-friendly bridge (10) ──────────────────
  { id: "lunch_box_apple", name: "Lunch-Box Apple", emoji: "🍎", element: "earth",  rarity: "common", color: "#dc2626", flavor: "An apple from a real lunchbox. Slightly bruised. Full of stories." },
  { id: "homework_paper",name: "Crumpled Homework", emoji: "📜", element: "earth", rarity: "common", color: "#fef3c7", flavor: "Half-done math, smudged ink, real worry. Powerful." },
  { id: "playground_dust",name: "Playground Dust", emoji: "🌫️", element: "air",   rarity: "common", color: "#a8a29e", flavor: "Kicked up at recess. Smells like running fast and laughing." },
  { id: "lost_tooth",    name: "First Lost Tooth", emoji: "🦷", element: "spirit", rarity: "rare", color: "#ffffff", flavor: "Pulled the easy way. Worth one fairy visit, redeemable forever." },
  { id: "birthday_candle",name: "Birthday Candle (used)", emoji: "🕯️", element: "fire", rarity: "uncommon", color: "#fbbf24", flavor: "Already wished on. The wish stays in the wax." },
  { id: "library_silence",name: "Bottled Library Silence", emoji: "📚", element: "air", rarity: "uncommon", color: "#0f172a", flavor: "Captured between two shelves. Heavier than it looks." },
  { id: "first_snowflake",name: "First Snowflake of Winter", emoji: "❄️", element: "water", rarity: "rare", color: "#e0f2fe", flavor: "Caught on a tongue, transferred to a jar before it melted." },
  { id: "campfire_smoke",name: "Bottled Campfire Smoke", emoji: "🔥", element: "fire", rarity: "common", color: "#78716c", flavor: "Smells like a good story being told." },
  { id: "pinky_promise", name: "Sealed Pinky Promise", emoji: "🤙", element: "spirit", rarity: "rare", color: "#f9a8d4", flavor: "Made between best friends. Hums when held." },
  { id: "ocean_listen",  name: "Ocean Heard in a Shell", emoji: "🐚", element: "water", rarity: "uncommon", color: "#67e8f9", flavor: "Hold the shell, hear the sea, bottle the listen." },
];

/** Convenience predicates for the new themed schools. */
export const HARRY_POTTER_IDS = new Set<string>([
  "mandrake_root","bezoar","gillyweed","boomslang_skin","lacewing_flies",
  "wormwood","asphodel_root","valerian_sprig","ashwinder_egg","phoenix_tear",
]);

export const GREEK_MYTH_IDS = new Set<string>([
  "ambrosia","nectar","lethe_water","olympus_dew","minotaur_horn",
  "medusa_scale","golden_fleece_thread","cyclops_eyelash","siren_voicebox","hydra_scale",
]);

export const SKYRIM_IDS = new Set<string>([
  "imp_stool","deathbell","nightshade","moon_sugar","snowberry",
  "sleeping_tree_sap","frost_salt","void_salt","fire_salt","troll_fat",
]);

export const SCHOOLYARD_IDS = new Set<string>([
  "lunch_box_apple","homework_paper","playground_dust","lost_tooth",
  "birthday_candle","library_silence","first_snowflake","campfire_smoke",
  "pinky_promise","ocean_listen",
]);

/** Returns a label like "Harry Potter" / "Greek Mythology" / null. */
export function schoolFor(id: string): "Harry Potter" | "Greek Mythology" | "Skyrim" | "Schoolyard" | null {
  if (HARRY_POTTER_IDS.has(id)) return "Harry Potter";
  if (GREEK_MYTH_IDS.has(id))   return "Greek Mythology";
  if (SKYRIM_IDS.has(id))       return "Skyrim";
  if (SCHOOLYARD_IDS.has(id))   return "Schoolyard";
  return null;
}

export function getIngredient(id: string): Ingredient | undefined {
  return INGREDIENTS.find(i => i.id === id);
}

export function ingredientsByRarity(rarity: Rarity): Ingredient[] {
  return INGREDIENTS.filter(i => i.rarity === rarity);
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "legendary", "mythic"];

export const RARITY_COLOR: Record<Rarity, string> = {
  common:    "#94a3b8",
  uncommon:  "#86efac",
  rare:      "#60a5fa",
  legendary: "#fbbf24",
  mythic:    "#f0abfc",
};

export const ELEMENT_LABEL: Record<Element, string> = {
  fire: "🔥 Fire", water: "💧 Water", earth: "🌿 Earth", air: "💨 Air",
  spirit: "✨ Spirit", shadow: "🌑 Shadow", gold: "🪙 Gold", wild: "🌀 Wild",
};
