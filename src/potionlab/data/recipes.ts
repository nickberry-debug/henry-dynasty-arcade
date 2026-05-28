// Potion Lab — recipe catalog. Three buckets:
//   1. KNOWN_RECIPES — visible in the Grimoire from the start. Tutorial
//      potions Beckett can follow step-by-step.
//   2. SECRET_RECIPES — start hidden. Only revealed once Beckett brews
//      the exact combo (any order). Adds replay value.
//   3. EASTER_EGGS — Easter-egg recipes with very specific combos that
//      do something unique (animated sparkle, voice line, etc.).
//
// Ingredient combos are stored as sorted id arrays so order doesn't
// matter when matching.

export type RecipeKind = "known" | "secret" | "easter";

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  /** Hex color of the resulting potion in the bottle. */
  color: string;
  /** Sorted ingredient ids — matched against the player's sorted brew. */
  ingredients: string[];
  kind: RecipeKind;
  /** Short flavor text shown when the potion is brewed. */
  effect: string;
  /** Lore — written into the Grimoire entry. 2-3 sentences. */
  lore: string;
  /** Optional in-app effect tag for easter eggs. */
  eggKind?: "confetti" | "sparkle" | "voice" | "tower" | "pet";
}

/** Helper to keep ingredient lists sorted. */
const r = (...ids: string[]): string[] => [...ids].sort();

export const KNOWN_RECIPES: Recipe[] = [
  {
    id: "vitality_tonic", name: "Vitality Tonic", emoji: "❤️‍🔥", color: "#ef4444",
    ingredients: r("dustflame", "mint_leaf", "moonwater"),
    kind: "known",
    effect: "+10 energy. Tastes like running fast on a cool morning.",
    lore: "First brew every apprentice learns. The mint is non-negotiable.",
  },
  {
    id: "calm_brew", name: "Calm Brew", emoji: "🌊", color: "#3b82f6",
    ingredients: r("moonwater", "moss_of_quiet", "river_pebble"),
    kind: "known",
    effect: "Slows your heartbeat. Good for thunderstorms and tests.",
    lore: "Hold the river pebble. Whisper your worry. The brew listens, the worry quiets.",
  },
  {
    id: "lucky_draught", name: "Lucky Draught", emoji: "🍀", color: "#22c55e",
    ingredients: r("clovergreen", "honey_drop", "gold_thread"),
    kind: "known",
    effect: "Next coin flip lands heads. Probably.",
    lore: "Not magic, exactly. More like a polite request to fortune.",
  },
  {
    id: "courage_cordial", name: "Courage Cordial", emoji: "🦁", color: "#f97316",
    ingredients: r("dustflame", "ember_pepper", "wishbone"),
    kind: "known",
    effect: "Steadies shaky hands. Recommended before stage moments.",
    lore: "Not the absence of fear — the presence of one more breath than the fear.",
  },
  {
    id: "sleep_syrup", name: "Sleep Syrup", emoji: "💤", color: "#7c3aed",
    ingredients: r("cloudbloom", "moonwater", "willow_bark"),
    kind: "known",
    effect: "Gentle drift to sleep. No nightmares for a week.",
    lore: "Stir clockwise. Sing softly. Even the cauldron yawns.",
  },
  {
    id: "focus_elixir", name: "Focus Elixir", emoji: "🎯", color: "#0ea5e9",
    ingredients: r("mint_leaf", "spirit_sugar", "windseed"),
    kind: "known",
    effect: "Twenty minutes of laser focus. Good for one chapter or one math sheet.",
    lore: "The first sip is bright; the rest fades naturally. Don't overbrew.",
  },
  {
    id: "kindness_balm", name: "Kindness Balm", emoji: "🤝", color: "#fbbf24",
    ingredients: r("feather_white", "honey_drop", "willow_bark"),
    kind: "known",
    effect: "Whoever you give this to remembers a nice thing about you.",
    lore: "Brew it for somebody specific. The brewmaster's heart shapes the result.",
  },
  {
    id: "summer_lemonade", name: "Summer Lemonade", emoji: "🍋", color: "#facc15",
    ingredients: r("dustflame", "honey_drop", "river_pebble"),
    kind: "known",
    effect: "Not magic. Just very good lemonade. Brewmaster's favorite shortcut.",
    lore: "Officially not a potion. Unofficially, the most-brewed recipe in the lab.",
  },
  {
    id: "spirit_glow", name: "Spirit Glow", emoji: "🌟", color: "#facc15",
    ingredients: r("feather_white", "spirit_sugar", "starlight"),
    kind: "known",
    effect: "Hands glow softly for an hour. Useful at sleepovers.",
    lore: "Won't burn. Won't fade dramatically — it just wears off, like a good day.",
  },
  {
    id: "frog_chorus", name: "Frog Chorus Brew", emoji: "🐸", color: "#16a34a",
    ingredients: r("frogspot", "moonwater", "river_pebble"),
    kind: "known",
    effect: "Makes you understand what frogs are saying for one hour. They mostly gossip.",
    lore: "Brewed at a pond. Best at dusk. Bring a notebook — they have opinions.",
  },
  {
    id: "feather_step", name: "Featherstep Tonic", emoji: "💨", color: "#a5f3fc",
    ingredients: r("feather_white", "windseed", "cloudbloom"),
    kind: "known",
    effect: "Walk so quietly even a cat doesn't notice.",
    lore: "Don't waste it on chores. Save it for surprises.",
  },
  {
    id: "warm_hearth", name: "Warm Hearth", emoji: "🏠", color: "#a16207",
    ingredients: r("dustflame", "honey_drop", "willow_bark"),
    kind: "known",
    effect: "Wherever you drink this becomes 'home' for the night.",
    lore: "Apprentices brew it when they're away from family. Works in tents too.",
  },
];

export const SECRET_RECIPES: Recipe[] = [
  {
    id: "phoenix_revival", name: "Phoenix Revival", emoji: "🔥", color: "#dc2626",
    ingredients: r("phoenix_ash", "dustflame", "starlight"),
    kind: "secret",
    effect: "Get up one more time than the thing that knocked you down.",
    lore: "Brewed only in years that need it most. The cauldron will know.",
  },
  {
    id: "dragon_friendship", name: "Dragon Friendship", emoji: "🐉", color: "#16a34a",
    ingredients: r("dragon_scale", "honey_drop", "kindness_balm".replace("kindness_balm","feather_white")),
    kind: "secret",
    effect: "The next dragon you meet will be friendly. (Outcomes may vary.)",
    lore: "Most kids never need this. The ones who do, really do.",
  },
  {
    id: "midnight_invisibility", name: "Midnight Invisibility", emoji: "🕶️", color: "#1e293b",
    ingredients: r("shadow_silk", "krakenink", "moonwater"),
    kind: "secret",
    effect: "Slip past one person for one minute. Not for skipping chores.",
    lore: "Brewmaster's first commandment: invisibility is never a shortcut.",
  },
  {
    id: "deep_listening", name: "Deep Listening Tea", emoji: "👂", color: "#0ea5e9",
    ingredients: r("moss_of_quiet", "river_song", "moonpearl"),
    kind: "secret",
    effect: "Hear what someone is trying to say but can't say out loud. Use carefully.",
    lore: "The hardest potion to brew. Not because of ingredients — because of intent.",
  },
  {
    id: "thunderfeet", name: "Thunderfeet", emoji: "⚡", color: "#7c3aed",
    ingredients: r("thunderstone", "ember_pepper", "windseed"),
    kind: "secret",
    effect: "Run faster than anyone in your class for one P.E. period.",
    lore: "Wears off when the bell rings. Boots not included.",
  },
  {
    id: "starlit_dream", name: "Starlit Dream", emoji: "🌌", color: "#7c3aed",
    ingredients: r("starlight", "cloudbloom", "moonpearl"),
    kind: "secret",
    effect: "Tonight's dream is the one you've been wanting. You'll remember it.",
    lore: "Drink right before bed. The constellations are listening.",
  },
  {
    id: "yeti_calm", name: "Yeti's Patience", emoji: "🧊", color: "#bfdbfe",
    ingredients: r("yeti_breath", "moss_of_quiet", "river_pebble"),
    kind: "secret",
    effect: "Annoying sibling becomes 50% less annoying. Self stays 100% chill.",
    lore: "Beckett-tested.",
  },
  {
    id: "lavafire_courage", name: "Lavafire Courage", emoji: "🌋", color: "#dc2626",
    ingredients: r("lava_chip", "phoenix_ash", "wishbone"),
    kind: "secret",
    effect: "Do the brave thing you've been putting off. The brew nudges, but you decide.",
    lore: "Only works if you actually use it. The cauldron knows when you're stalling.",
  },
  {
    id: "luck_of_seven", name: "Luck of Seven", emoji: "🎰", color: "#fbbf24",
    ingredients: r("clovergreen", "honey_drop", "gold_thread", "wishbone"),
    kind: "secret",
    effect: "Seven small lucky things happen today. None of them spectacular. All of them you'll notice.",
    lore: "Brewmaster's grandma swore by it. Brewmaster's grandma also won a hot dog once.",
  },
  {
    id: "wisdom_of_oak", name: "Wisdom of the Old Oak", emoji: "🌳", color: "#854d0e",
    ingredients: r("heart_oak", "willow_bark", "moss_of_quiet"),
    kind: "secret",
    effect: "For the next hour you'll see one thing the grown-ups around you missed.",
    lore: "Don't tell them what you saw. Just file it away.",
  },
];

/** Harry Potter inspired recipes. Themed but kid-safe. Unlocked by brewing. */
export const HARRY_POTTER_RECIPES: Recipe[] = [
  {
    id: "felix_felicis", name: "Felix Felicis (kid version)", emoji: "🍀", color: "#facc15",
    ingredients: r("ashwinder_egg", "honey_drop", "golden_fleece_thread"),
    kind: "secret",
    effect: "Liquid luck for one afternoon. Small fortunes happen. Don't overdo it.",
    lore: "Brewed slowly over six months in the books. Beckett gets a sped-up apprentice version.",
  },
  {
    id: "polyjuice_lite", name: "Polyjuice Brew (style)", emoji: "🧪", color: "#7c3aed",
    ingredients: r("boomslang_skin", "lacewing_flies", "fairy_dust"),
    kind: "secret",
    effect: "Mannerisms swap with one friend for an hour. You'll both notice. (Faces stay yours.)",
    lore: "The full recipe takes a month and a hair. This is the apprentice edition — much friendlier.",
  },
  {
    id: "dreamless_sleep", name: "Dreamless Sleep Draught", emoji: "💤", color: "#1e1b4b",
    ingredients: r("asphodel_root", "valerian_sprig", "moonwater"),
    kind: "secret",
    effect: "Sleep so deep no dream finds you. Good for the night before a big game.",
    lore: "Apothecary Slughorn's first lesson. Asphodel and valerian — a calm pair.",
  },
  {
    id: "wiggenweld", name: "Wiggenweld Potion", emoji: "❤️‍🩹", color: "#22c55e",
    ingredients: r("phoenix_tear", "mint_leaf", "moss_of_quiet"),
    kind: "secret",
    effect: "Skinned knees, bruises, sore throats — gone by morning.",
    lore: "Counter to Sleeping Draughts. Taught second-year because Madame Pomfrey insisted.",
  },
  {
    id: "wolfsbane_kid", name: "Wolfsbane (Apprentice Cut)", emoji: "🌙", color: "#854d0e",
    ingredients: r("wormwood", "valerian_sprig", "moonpearl"),
    kind: "secret",
    effect: "Calms the wildest mood swings for an evening. Particularly potent on full-moon Fridays.",
    lore: "Snape's original was unkind. The brewmaster's apprentice edit is gentler.",
  },
  {
    id: "veritaserum_safe", name: "Honesty Hour", emoji: "🗣️", color: "#fef9c3",
    ingredients: r("bezoar", "honey_drop", "pinky_promise"),
    kind: "secret",
    effect: "Everyone at the table tells one true thing in the next hour. Friendly, not forced.",
    lore: "The real Veritaserum is restricted reading. This one is opt-in and warm.",
  },
];

/** Greek mythology inspired recipes. */
export const GREEK_RECIPES: Recipe[] = [
  {
    id: "ambrosia_breakfast", name: "Ambrosia Breakfast", emoji: "🍯", color: "#fef3c7",
    ingredients: r("ambrosia", "honey_drop", "starlight"),
    kind: "secret",
    effect: "+30 energy. Enough to climb Olympus, or at least the school stairs.",
    lore: "What the gods eat for breakfast. Beckett gets the kid-portion.",
  },
  {
    id: "achilles_courage", name: "Achilles' Steady Heart", emoji: "🛡️", color: "#dc2626",
    ingredients: r("golden_fleece_thread", "dustflame", "wishbone"),
    kind: "secret",
    effect: "Walk into the big moment without your hands shaking.",
    lore: "Achilles' mom dipped him in this for a reason. Just don't forget your heels.",
  },
  {
    id: "lethe_lullaby", name: "Lethe Lullaby", emoji: "🌊", color: "#1e293b",
    ingredients: r("lethe_water", "cloudbloom", "willow_bark"),
    kind: "secret",
    effect: "Forgets one bad moment from the day. Just one. Pick well.",
    lore: "Drink at the edge of the river of forgetting. Most heroes politely decline.",
  },
  {
    id: "olympus_runner", name: "Olympus Runner", emoji: "🏃", color: "#bae6fd",
    ingredients: r("olympus_dew", "windseed", "ember_pepper"),
    kind: "secret",
    effect: "Light feet for one race. Used responsibly by all-time messenger Hermes.",
    lore: "Bottled at dawn from peaks the messengers know. Don't waste it on errands.",
  },
  {
    id: "hydra_resilience", name: "Hydra Resilience", emoji: "🐲", color: "#16a34a",
    ingredients: r("hydra_scale", "phoenix_ash", "moss_of_quiet"),
    kind: "secret",
    effect: "Get up one more time than the thing that knocked you down. Maybe two.",
    lore: "The hydra grows two heads for every one cut. Lessons everywhere.",
  },
  {
    id: "siren_pause", name: "Siren's Pause", emoji: "🧜", color: "#0ea5e9",
    ingredients: r("siren_voicebox", "moonpearl", "river_song"),
    kind: "easter", eggKind: "voice",
    effect: "The brewmaster sings a verse the sirens taught them. Voice plays via TTS.",
    lore: "Most sailors don't survive hearing this. Brewmaster's version is the safe cover.",
  },
];

/** Skyrim / Nordic inspired recipes. */
export const SKYRIM_RECIPES: Recipe[] = [
  {
    id: "draught_of_health", name: "Draught of Health", emoji: "❤️", color: "#dc2626",
    ingredients: r("imp_stool", "wheat".replace("wheat","river_pebble"), "snowberry"),
    kind: "secret",
    effect: "Old standby. Wounds and bruises mend a little faster.",
    lore: "Every Skyrim apothecary stocks this. The recipe is older than most of them.",
  },
  {
    id: "potion_of_invisibility", name: "Potion of Invisibility", emoji: "🕶️", color: "#0c0a09",
    ingredients: r("void_salt", "nightshade", "shadow_silk"),
    kind: "secret",
    effect: "Slip past one watcher for one minute. Not for skipping chores.",
    lore: "The sneak-thief's friend. Brewmaster's first commandment still applies.",
  },
  {
    id: "resist_fire", name: "Resist Fire", emoji: "🔥", color: "#dc2626",
    ingredients: r("fire_salt", "snowberry", "frost_salt"),
    kind: "secret",
    effect: "Hot lava? Bonfire? Birthday candle? Not your problem for ten minutes.",
    lore: "Fire and frost balance. Beckett learns the elemental equation.",
  },
  {
    id: "fortify_smithing", name: "Fortify Steady Hands", emoji: "🔨", color: "#a16207",
    ingredients: r("sleeping_tree_sap", "snowberry", "honey_drop"),
    kind: "secret",
    effect: "Cleanest cut, neatest stitch, straightest line. For one project.",
    lore: "Smiths swore by the tree sap. Brewmaster swears by the patience.",
  },
  {
    id: "skooma_cousin", name: "Stripe-Cat's Comfort", emoji: "🐈", color: "#fbbf24",
    ingredients: r("moon_sugar", "cloudbloom", "honey_drop"),
    kind: "secret",
    effect: "Cozy. Sleepy. Purr-energy. Sweet, gentle, not the bad stuff.",
    lore: "Stripe-cats know what they're doing with moon sugar. Trust the cat.",
  },
  {
    id: "frost_breath", name: "Frost Breath", emoji: "❄️", color: "#bfdbfe",
    ingredients: r("frost_salt", "yeti_breath", "first_snowflake"),
    kind: "secret",
    effect: "Breathe out a tiny cold cloud. Cools your hot chocolate to perfect temp.",
    lore: "Mild dragon-breath. Tested only by the brewmaster, and only on cocoa.",
  },
];

/** Schoolyard / kid-life recipes — pure Beckett territory. */
export const SCHOOLYARD_RECIPES: Recipe[] = [
  {
    id: "test_day_clarity", name: "Test Day Clarity", emoji: "✏️", color: "#60a5fa",
    ingredients: r("mint_leaf", "homework_paper", "library_silence"),
    kind: "secret",
    effect: "Twenty minutes of focused calm. One math test's worth.",
    lore: "Some apprentices brew this every Sunday night. The library-silence is the trick.",
  },
  {
    id: "playground_speed", name: "Playground Speed", emoji: "🏃", color: "#22c55e",
    ingredients: r("playground_dust", "windseed", "ember_pepper"),
    kind: "secret",
    effect: "Be the fastest one in tag for one recess.",
    lore: "Brewmaster used this at age 10. Won three rounds in a row.",
  },
  {
    id: "birthday_wish", name: "Birthday Wish Catcher", emoji: "🎂", color: "#fbbf24",
    ingredients: r("birthday_candle", "wishbone", "starlight"),
    kind: "secret",
    effect: "One wish, properly wished, comes a little closer to true.",
    lore: "Doesn't override the universe. Just nudges it kindly.",
  },
  {
    id: "lost_tooth_fairy", name: "Fairy-Friendly Tonic", emoji: "🦷", color: "#f9a8d4",
    ingredients: r("lost_tooth", "fairy_dust", "moonpearl"),
    kind: "easter", eggKind: "sparkle",
    effect: "Tonight's tooth-fairy visit leaves a little extra. (Brewmaster guarantees nothing.)",
    lore: "Brewmaster's grandma swore by this. Found a quarter in her own pillow that week.",
  },
  {
    id: "shell_listen", name: "Shell-Listen Tonic", emoji: "🐚", color: "#67e8f9",
    ingredients: r("ocean_listen", "moss_of_quiet", "feather_white"),
    kind: "secret",
    effect: "Hear what your best friend is trying to say, even when they say nothing.",
    lore: "Brewmaster's hardest recipe. Hardest because of what it asks of you.",
  },
  {
    id: "campfire_courage", name: "Campfire Courage", emoji: "🏕️", color: "#fb923c",
    ingredients: r("campfire_smoke", "dustflame", "wishbone"),
    kind: "secret",
    effect: "Tell the scary story at the campfire and make everyone laugh at the right line.",
    lore: "Brewed only outdoors. The smoke insists.",
  },
];

export const EASTER_EGGS: Recipe[] = [
  {
    id: "rainbow_potion", name: "Rainbow Potion (✨)", emoji: "🌈", color: "#f472b6",
    ingredients: r("rainbow_root", "starlight", "thunderstone", "moonpearl", "phoenix_ash"),
    kind: "easter",
    eggKind: "confetti",
    effect: "Confetti! The lab celebrates. This recipe is mostly for the joy of brewing it.",
    lore: "Five different rare ingredients in one cauldron is a brewmaster brag. Earn it.",
  },
  {
    id: "siren_serenade", name: "Siren's Lullaby (revealed)", emoji: "🧜", color: "#0ea5e9",
    ingredients: r("siren_song", "moonpearl", "feather_white"),
    kind: "easter", eggKind: "voice",
    effect: "The brewmaster sings a lullaby for you. (Voice plays through TTS.)",
    lore: "Sometimes a recipe is also a song.",
  },
  {
    id: "void_window", name: "Window Into The Void", emoji: "⬛", color: "#000000",
    ingredients: r("void_droplet", "krakenink", "shadow_silk"),
    kind: "easter", eggKind: "tower",
    effect: "The lab dims. The bottle reflects nothing. Faintly, you hear something hum.",
    lore: "Brewmaster does NOT recommend brewing this twice in one day.",
  },
  {
    id: "time_taffy", name: "Time Taffy", emoji: "⏳", color: "#fef3c7",
    ingredients: r("time_grain", "honey_drop", "sunfire"),
    kind: "easter", eggKind: "sparkle",
    effect: "Stretches one second of joy into ten. Use during a good hug or a great snack.",
    lore: "Brewmaster's most-stolen recipe.",
  },
  {
    id: "true_self", name: "Mirror of True Self", emoji: "🪞", color: "#a5b4fc",
    ingredients: r("true_name", "alchemists_tear", "moonpearl"),
    kind: "easter", eggKind: "sparkle",
    effect: "Look into the bottle. You see the version of you that's already on the way.",
    lore: "The hardest brew. The most worth it. Brewmaster's office hours: by request.",
  },
  {
    id: "pocket_pet", name: "Pocket Pet Charm", emoji: "🐾", color: "#fb923c",
    ingredients: r("fairy_dust", "honey_drop", "feather_white"),
    kind: "easter", eggKind: "pet",
    effect: "A tiny glowing companion appears, follows you for one hour, then waves goodbye.",
    lore: "Beckett begged for this recipe. The cauldron eventually relented.",
  },
];

export const ALL_RECIPES: Recipe[] = [
  ...KNOWN_RECIPES,
  ...SECRET_RECIPES,
  ...HARRY_POTTER_RECIPES,
  ...GREEK_RECIPES,
  ...SKYRIM_RECIPES,
  ...SCHOOLYARD_RECIPES,
  ...EASTER_EGGS,
];

/** Match a brew (array of ingredient ids) against the catalog.
 *  Order doesn't matter. Exact match required. Returns null if none. */
export function matchRecipe(brewIds: string[]): Recipe | null {
  const sorted = [...brewIds].sort();
  const key = sorted.join("|");
  for (const recipe of ALL_RECIPES) {
    if (recipe.ingredients.join("|") === key) return recipe;
  }
  return null;
}
