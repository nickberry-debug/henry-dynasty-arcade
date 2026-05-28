import type { CharacterDef, SizeClass, AttackType, MapConfig } from "./types";

type S = [number, number, number, number, number]; // hp, power, speed, defense, special

function c(
  id: string, name: string, emoji: string, category: string,
  size: SizeClass, type: AttackType,
  [hp, power, speed, defense, special]: S,
  color: string, cry: string, specialName: string
): CharacterDef {
  return { id, name, emoji, category, size, stats: { hp, power, speed, defense, special }, attackType: type, color, cry, specialName };
}

export const PRESET_CHARACTERS: CharacterDef[] = [
  // ─── ⚔️ LEGENDS ───────────────────────────────────────────────────────────
  // TIER [A-LIST] Achilles: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("achilles", "Achilles", "⚔️", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#FFD700", "For glory and honor!", "Wrath of Peleus"),
  // TIER [TOP-TIER] Thor: Asgardian top-tier. HP 1100, atk 180, range 1-2 tiles (melee), speed 8.
  c("thor", "Thor", "⚡", "⚔️ Legends", "large", "melee", [1100, 180, 720, 600, 850], "#4488FF", "By Mjolnir's might!", "Thunder Strike"),
  // TIER [A-LIST] Hercules: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("hercules", "Hercules", "💪", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#FF8C00", "Nothing can stop me!", "Twelve Labors"),
  // TIER [A-LIST] Joan of Arc: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("joan", "Joan of Arc", "⚜️", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#E8E8FF", "For France and for God!", "Holy Crusade"),
  // TIER [A-LIST] Odysseus: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("odysseus", "Odysseus", "🏹", "⚔️ Legends", "medium", "ranged", [ 300,  55, 800, 280, 600], "#6B8E4E", "The gods favor the clever!", "Trojan Trick"),
  // TIER [A-LIST] Beowulf: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("beowulf", "Beowulf", "🐉", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#2D6A2D", "I've faced monsters before!", "Grendel's Bane"),
  // TIER [A-LIST] Leonidas: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("leonidas", "Leonidas", "🛡️", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#8B1A1A", "This is SPARTA!", "Spartan Phalanx"),
  // TIER [A-LIST] Samson: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("samson", "Samson", "🦁", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "My strength is LEGENDARY!", "Pillar Smash"),
  // TIER [A-LIST] Perseus: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("perseus", "Perseus", "🌟", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#20B2AA", "I slew the Gorgon itself!", "Shield Reflect"),
  // TIER [A-LIST] Atalanta: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("atalanta", "Atalanta", "🏹", "⚔️ Legends", "medium", "ranged", [ 300,  55, 800, 280, 600], "#228B22", "Faster than any mortal!", "Golden Arrows"),
  // TIER [A-LIST] Sir Lancelot: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("lancelot", "Sir Lancelot", "⚔️", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#C0C0C0", "For the love of Camelot!", "Lance Charge"),
  // TIER [A-LIST] Robin Hood: small ranged. HP 165, atk 39, range 6-10 tiles (ranged), speed 14.
  c("robin_hood", "Robin Hood", "🎯", "⚔️ Legends", "small", "ranged", [ 165,  39, 840, 240, 600], "#556B2F", "Rob from the rich!", "Bullseye Volley"),
  // TIER [A-LIST] Sun Wukong: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("wukong", "Sun Wukong", "🐒", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#FFD700", "This king has no limits!", "Staff Spin"),
  // TIER [A-LIST] Mulan: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("mulan", "Mulan", "🌸", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#DC143C", "Honor to all my family!", "Dragon Sword"),
  // TIER [A-LIST] William Tell: small ranged. HP 165, atk 39, range 6-10 tiles (ranged), speed 14.
  c("william_tell", "William Tell", "🎯", "⚔️ Legends", "small", "ranged", [ 165,  39, 840, 240, 600], "#4682B4", "My aim NEVER misses!", "Apple Shot"),
  // TIER [A-LIST] El Cid: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("el_cid", "El Cid", "🗡️", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#8B0000", "Spain rides with me!", "Castilian Charge"),
  // TIER [A-LIST] Boudicca: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("boudicca", "Boudicca", "🔥", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#FF4500", "We fight for our FREEDOM!", "Warrior Queen's Rage"),
  // TIER [A-LIST] Gilgamesh: huge melee. HP 720, atk 88, range 1-2 tiles (melee), speed 6.
  c("gilgamesh", "Gilgamesh", "👑", "⚔️ Legends", "huge", "melee", [ 720,  88, 740, 340, 600], "#DAA520", "Two-thirds god, one-third epic!", "Bull of Heaven"),
  // TIER [A-LIST] Vlad the Impaler: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("vlad", "Vlad the Impaler", "🦇", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#6B0000", "None shall leave this place!", "Impaler's Wrath"),
  // TIER [A-LIST] Patroclus: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("patroclus", "Patroclus", "🛡️", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#B8860B", "I fight for my brother!", "Loyal Shield"),

  // ─── 🦁 WILD KINGDOM ──────────────────────────────────────────────────────
  // TIER [A-LIST] Grizzly Bear: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("grizzly", "Grizzly Bear", "🐻", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#8B5E3C", "ROOOOAAARRR!!!", "Bear Hug"),
  // TIER [TOP-TIER] T-Rex: huge melee. HP 2400, atk 240, range 1-2 tiles (melee), speed 6.
  c("trex", "T-Rex", "🦕", "🦁 Wild Kingdom", "huge", "melee", [2400, 240, 640, 660, 850], "#556B2F", "SCREEEEE!!! (terrifying roar)", "Stomp Wave"),
  // TIER [A-LIST] Lion: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("lion", "Lion", "🦁", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#D4880A", "ROOAAR! King of the savanna!", "Pride Pounce"),
  // TIER [B-LIST] Honey Badger: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("honey_badger", "Honey Badger", "🦡", "🦁 Wild Kingdom", "small", "melee", [  83,  20, 820, 160, 450], "#9E9E9E", "Honey badger don't care!", "Rage Spiral"),
  // TIER [A-LIST] Silverback: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("gorilla", "Silverback", "🦍", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#4A4A4A", "UUUUUNGH! Chest pound!", "Knuckle Slam"),
  // TIER [B-LIST] Bald Eagle: medium ranged. HP 150, atk 28, range 6-10 tiles (ranged), speed 10.
  c("eagle", "Bald Eagle", "🦅", "🦁 Wild Kingdom", "medium", "ranged", [ 150,  28, 760, 200, 450], "#A0522D", "SCREEEEE! Freedom dive!", "Talons of Justice"),
  // TIER [A-LIST] Charging Bull: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("bull", "Charging Bull", "🐂", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "SNORT SNORT CHARGE!!!", "Full Stampede"),
  // TIER [A-LIST] Great White: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("shark", "Great White", "🦈", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#4682B4", "Dun dun... dun dun... DUN DUN!", "Feeding Frenzy"),
  // TIER [A-LIST] Crocodile: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("croc", "Crocodile", "🐊", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#2E5E2E", "Death roll incoming!", "Death Roll"),
  // TIER [B-LIST] Wolf Pack: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("wolf", "Wolf Pack", "🐺", "🦁 Wild Kingdom", "medium", "melee", [ 150,  28, 780, 200, 450], "#708090", "AWOOOOO! The pack hunts!", "Pack Tactics"),
  // TIER [A-LIST] Rhino: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("rhino", "Rhino", "🦏", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#808080", "Nothing stops a rhino charge!", "Horn Rush"),
  // TIER [TOP-TIER] Elephant: huge melee. HP 2400, atk 240, range 1-2 tiles (melee), speed 6.
  c("elephant", "Elephant", "🐘", "🦁 Wild Kingdom", "huge", "melee", [2400, 240, 640, 660, 850], "#787878", "TRUMPEEEEET!!! (stomps angrily)", "Herd Stampede"),
  // TIER [MOOK/HUMAN] Hummingbird: tiny ranged. HP 25, atk 6, range 6-10 tiles (ranged), speed 14.
  c("hummingbird", "Hummingbird", "🐦", "🦁 Wild Kingdom", "tiny", "ranged", [  25,   6, 720,  40, 250], "#FF69B4", "Zoom zoom, can't catch me!", "Nectar Blitz"),
  // TIER [B-LIST] Killer Bee Swarm: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("killer_bee", "Killer Bee Swarm", "🐝", "🦁 Wild Kingdom", "small", "indirect", [  83,  20, 820, 160, 450], "#FFC200", "BZZZZZZZZZ!!!", "Swarm Storm"),
  // TIER [B-LIST] Komodo Dragon: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("komodo", "Komodo Dragon", "🦎", "🦁 Wild Kingdom", "medium", "melee", [ 150,  28, 780, 200, 450], "#6B6B00", "Venom in every bite!", "Toxic Venom"),
  // TIER [TOP-TIER] Blue Whale: colossal melee. HP 3600, atk 300, range 1-2 tiles (melee), speed 6.
  c("blue_whale", "Blue Whale", "🐋", "🦁 Wild Kingdom", "colossal", "melee", [3600, 300, 600, 720, 850], "#1E90FF", "I am the LARGEST THING ALIVE.", "Tsunami Breach"),
  // TIER [MOOK/HUMAN] Mantis Shrimp: tiny melee. HP 25, atk 6, range 1-2 tiles (melee), speed 14.
  c("mantis", "Mantis Shrimp", "🦐", "🦁 Wild Kingdom", "tiny", "melee", [  25,   6, 740,  40, 250], "#FF6347", "My punch breaks aquarium glass!", "Sonic Punch"),
  // TIER [A-LIST] Wolverine: berserker A-list. HP 380, atk 65, range 1-2 tiles (melee), speed 14.
  c("wolverine", "Wolverine", "🦨", "🦁 Wild Kingdom", "small", "melee", [ 380,  65, 860, 240, 600], "#8B4513", "Unbreakable! Unstoppable!", "Berserk Slash"),
  // TIER [A-LIST] Hippo: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("hippo", "Hippo", "🦛", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#A0A0A0", "I am VERY territorially upset!", "Jaw Snap"),
  // TIER [B-LIST] Mountain Goat: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("mountain_goat", "Mountain Goat", "🐐", "🦁 Wild Kingdom", "small", "melee", [  83,  20, 820, 160, 450], "#D3D3D3", "MEHHHH! (charges anyway)", "Head Butt Barrage"),

  // ─── 🤪 SILLY SQUAD ────────────────────────────────────────────────────────
  // TIER [MOOK/HUMAN] Grandma: small melee. HP 55, atk 8, range 1-2 tiles (melee), speed 14.
  c("grandma", "Grandma", "👵", "🤪 Silly Squad", "small", "melee", [  55,   8, 700,  60, 250], "#FFB6C1", "You kids get off my lawn!", "Rolling Pin of Doom"),
  // TIER [B-LIST] Angry Chef: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("angry_chef", "Angry Chef", "👨‍🍳", "🤪 Silly Squad", "medium", "melee", [ 150,  28, 780, 200, 450], "#FF4500", "My soufflé is RUINED!", "Frying Pan Fury"),
  // TIER [B-LIST] Mall Cop: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("mall_cop", "Mall Cop", "🛵", "🤪 Silly Squad", "medium", "melee", [ 150,  28, 780, 200, 450], "#0000CD", "FREEZE! Mall security!", "Segway Charge"),
  // TIER [B-LIST] Mime Warrior: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("mime", "Mime Warrior", "🤐", "🤪 Silly Squad", "small", "melee", [  83,  20, 820, 160, 450], "#FFFFFF", "...(attacks silently)...", "Invisible Wall"),
  // TIER [MOOK/HUMAN] Caffeinated Squirrel: tiny melee. HP 25, atk 6, range 1-2 tiles (melee), speed 14.
  c("squirrel", "Caffeinated Squirrel", "🐿️", "🤪 Silly Squad", "tiny", "melee", [  25,   6, 740,  40, 250], "#8B4513", "AAAAAHHHH COFFEE!!!!", "Nut Barrage"),
  // TIER [MOOK/HUMAN] Dancing Toaster: tiny ranged. HP 25, atk 6, range 6-10 tiles (ranged), speed 14.
  c("toaster", "Dancing Toaster", "🍞", "🤪 Silly Squad", "tiny", "ranged", [  25,   6, 720,  40, 250], "#FFD700", "Pop goes the DESTRUCTION!", "Toast Blitz"),
  // TIER [MOOK/HUMAN] Confused Roomba: tiny melee. HP 25, atk 6, range 1-2 tiles (melee), speed 14.
  c("roomba", "Confused Roomba", "🤖", "🤪 Silly Squad", "tiny", "melee", [  25,   6, 740,  40, 250], "#808080", "ERROR: MUST VACUUM ENEMIES.", "Random Bump"),
  // TIER [B-LIST] Rubber Duck Admiral: small ranged. HP 83, atk 20, range 6-10 tiles (ranged), speed 14.
  c("duck_admiral", "Rubber Duck Admiral", "🦆", "🤪 Silly Squad", "small", "ranged", [  83,  20, 800, 160, 450], "#FFD700", "Squeak squeak, ATTACK!", "Squeaky Torpedo"),
  // TIER [B-LIST] Ninja Accountant: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("accountant", "Ninja Accountant", "📊", "🤪 Silly Squad", "small", "melee", [  83,  20, 820, 160, 450], "#000080", "Your taxes are WRONG AND SO ARE YOU!", "Spreadsheet Slash"),
  // TIER [B-LIST] Disco Werewolf: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("disco_wolf", "Disco Werewolf", "🕺", "🤪 Silly Squad", "medium", "melee", [ 150,  28, 780, 200, 450], "#FF1493", "AAAWOOOO and the beat goes on!", "Boogie Bite"),
  // TIER [MOOK/HUMAN] Sleep-Deprived Dad: medium melee. HP 100, atk 12, range 1-2 tiles (melee), speed 10.
  c("tired_dad", "Sleep-Deprived Dad", "😩", "🤪 Silly Squad", "medium", "melee", [ 100,  12, 660, 100, 250], "#8B8B8B", "I will turn this battle around!", "Dad Strength"),
  // TIER [B-LIST] Motivational Speaker: medium ranged. HP 150, atk 28, range 6-10 tiles (ranged), speed 10.
  c("speaker", "Motivational Speaker", "📣", "🤪 Silly Squad", "medium", "ranged", [ 150,  28, 760, 200, 450], "#FFA500", "YOU CAN DO IT! ...but I'm still attacking you.", "Positive Affirmations"),
  // TIER [B-LIST] Sneezing Wizard: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("wizard_sneeze", "Sneezing Wizard", "🧙", "🤪 Silly Squad", "medium", "indirect", [ 150,  28, 780, 200, 450], "#9370DB", "AHHHH... AHHHH... ACHOOOOO!", "Magic Sneeze"),
  // TIER [B-LIST] Giant Gummy Bear: large melee. HP 240, atk 36, range 1-2 tiles (melee), speed 8.
  c("gummy_bear", "Giant Gummy Bear", "🐻", "🤪 Silly Squad", "large", "melee", [ 240,  36, 780, 200, 450], "#FF6EB4", "RAAAHR! (squishily)", "Sticky Stomp"),
  // TIER [MOOK/HUMAN] Overconfident Chicken: tiny melee. HP 25, atk 6, range 1-2 tiles (melee), speed 14.
  c("chicken", "Overconfident Chicken", "🐔", "🤪 Silly Squad", "tiny", "melee", [  25,   6, 740,  40, 250], "#FFA500", "BWAK BWAK I'M THE BEST BWAK!", "Reckless Peck"),

  // ─── 💥 HEROES & VILLAINS ─────────────────────────────────────────────────
  // TIER [A-LIST] Super Punch: bruiser A-list. HP 400, atk 80, range 1-2 tiles (melee), speed 8.
  c("super_punch", "Super Punch", "👊", "💥 Heroes & Villains", "large", "melee", [ 400,  80, 820, 280, 600], "#FF6347", "One punch to rule them all!", "Mega Uppercut"),
  // TIER [A-LIST] Shadow Ninja: shadow A-list. HP 280, atk 65, range 1-2 tiles (melee), speed 10.
  c("shadow_ninja", "Shadow Ninja", "🥷", "💥 Heroes & Villains", "medium", "melee", [ 280,  65, 800, 280, 600], "#1A1A2E", "You can't hit what you can't see!", "Shadow Blitz"),
  // TIER [A-LIST] Storm Caller: storm A-list. HP 360, atk 70, range 6-10 tiles (AoE), speed 8.
  c("storm_caller", "Storm Caller", "⛈️", "💥 Heroes & Villains", "large", "indirect", [ 360,  70, 820, 280, 600], "#4169E1", "Feel the fury of the storm!", "Thunderstorm"),
  // TIER [A-LIST] Rocket Runner: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("rocket_runner", "Rocket Runner", "🚀", "💥 Heroes & Villains", "medium", "melee", [ 300,  55, 820, 280, 600], "#FF4500", "SPEEDRUNNING TO VICTORY!", "Sonic Boom"),
  // TIER [A-LIST] Iron Titan: iron-titan A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("iron_titan", "Iron Titan", "🤖", "💥 Heroes & Villains", "huge", "melee", [ 400,  75, 740, 340, 600], "#708090", "Resistance is futile.", "Titanium Fist"),
  // TIER [A-LIST] Flame Dancer: fire A-list. HP 340, atk 65, range 1-2 tiles (melee), speed 10.
  c("flame_dancer", "Flame Dancer", "🔥", "💥 Heroes & Villains", "medium", "melee", [ 340,  65, 820, 280, 600], "#FF4500", "Everything burns eventually!", "Inferno Spin"),
  // TIER [A-LIST] Ice Queen: ice A-list. HP 360, atk 70, range 6-10 tiles (AoE), speed 8.
  c("ice_queen", "Ice Queen", "❄️", "💥 Heroes & Villains", "large", "indirect", [ 360,  70, 820, 280, 600], "#87CEEB", "Your movement is... suspended.", "Blizzard Blast"),
  // TIER [A-LIST] Mind Bender: psychic A-list. HP 320, atk 75, range 6-10 tiles (AoE), speed 10.
  c("mind_bender", "Mind Bender", "🧠", "💥 Heroes & Villains", "medium", "indirect", [ 320,  75, 820, 280, 600], "#9400D3", "Your mind is a battlefield.", "Psychic Slam"),
  // TIER [A-LIST] Laser Eyes: laser A-list. HP 360, atk 70, range 6-10 tiles (ranged), speed 8.
  c("laser_eyes", "Laser Eyes", "👁️", "💥 Heroes & Villains", "large", "ranged", [ 360,  70, 800, 280, 600], "#FF0000", "ZAP ZAP ZAP ZAP ZAP!", "Laser Sweep"),
  // TIER [A-LIST] Toxic Terror: poison A-list. HP 360, atk 65, range 6-10 tiles (AoE), speed 8.
  c("toxic_terror", "Toxic Terror", "☣️", "💥 Heroes & Villains", "large", "indirect", [ 360,  65, 820, 280, 600], "#7FFF00", "The poison is already inside you.", "Toxic Cloud"),
  // TIER [B-LIST] Electric Kid: small ranged. HP 83, atk 20, range 6-10 tiles (ranged), speed 14.
  c("electric_kid", "Electric Kid", "⚡", "💥 Heroes & Villains", "small", "ranged", [  83,  20, 800, 160, 450], "#FFD700", "I am the storm!", "Lightning Hands"),
  // TIER [B-LIST] Shrink Ray: tiny ranged. HP 38, atk 14, range 6-10 tiles (ranged), speed 14.
  c("shrink_ray", "Shrink Ray", "🔬", "💥 Heroes & Villains", "tiny", "ranged", [  38,  14, 840, 120, 450], "#00FF7F", "Small but MIGHTY!", "Miniaturize"),
  // TIER [A-LIST] Time Stopper: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("time_stopper", "Time Stopper", "⏱️", "💥 Heroes & Villains", "medium", "melee", [ 300,  55, 820, 280, 600], "#FF69B4", "Time means nothing to me.", "Timestop"),
  // TIER [TOP-TIER] Void Walker: large melee. HP 1600, atk 195, range 1-2 tiles (melee), speed 8.
  c("void_walker", "Void Walker", "🌑", "💥 Heroes & Villains", "large", "melee", [1600, 195, 720, 600, 850], "#191970", "I walk between worlds.", "Void Step"),
  // TIER [TOP-TIER] Sound Cannon: large ranged. HP 1600, atk 195, range 10-15 tiles (long-range), speed 8.
  c("sound_cannon", "Sound Cannon", "📢", "💥 Heroes & Villains", "large", "ranged", [1600, 195, 700, 600, 850], "#00CED1", "RATATATATAT BOOMBOOMBOOM!", "Sonic Barrage"),
  // TIER [A-LIST] Earth Shaker: geokinetic A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("earth_shaker", "Earth Shaker", "🌍", "💥 Heroes & Villains", "huge", "melee", [ 400,  75, 740, 340, 600], "#8B4513", "The ground itself obeys me!", "Earthquake"),
  // TIER [A-LIST] Phantom Claw: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("phantom_claw", "Phantom Claw", "👻", "💥 Heroes & Villains", "medium", "melee", [ 300,  55, 820, 280, 600], "#E0E0E0", "You can't block what isn't there!", "Ghost Strike"),
  // TIER [A-LIST] Dark Overlord: evil-overlord A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("dark_overlord", "Dark Overlord", "😈", "💥 Heroes & Villains", "huge", "melee", [ 400,  75, 740, 340, 600], "#8B0000", "MWAHAHAHA! All shall fall!", "Overlord's Decree"),
  // TIER [A-LIST] Gravity Flip: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("gravity_flip", "Gravity Flip", "🔄", "💥 Heroes & Villains", "medium", "indirect", [ 300,  55, 820, 280, 600], "#7B68EE", "Which way is down now?", "Gravity Well"),
  // TIER [A-LIST] Ultra Blaster: blaster A-list. HP 380, atk 70, range 6-10 tiles (ranged), speed 8.
  c("ultra_blaster", "Ultra Blaster", "💥", "💥 Heroes & Villains", "large", "ranged", [ 380,  70, 800, 280, 600], "#FF6347", "FIRE AT MAXIMUM POWER!", "Mega Blast"),

  // ─── 🏛️ HISTORY ICONS ─────────────────────────────────────────────────────
  // TIER [A-LIST] Napoleon: small melee. HP 165, atk 39, range 1-2 tiles (melee), speed 14.
  c("napoleon", "Napoleon", "🎩", "🏛️ History Icons", "small", "melee", [ 165,  39, 860, 240, 600], "#00008B", "An army travels on its stomach!", "Artillery Barrage"),
  // TIER [A-LIST] Cleopatra: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("cleopatra", "Cleopatra", "👸", "🏛️ History Icons", "medium", "indirect", [ 300,  55, 820, 280, 600], "#FFD700", "I am the Queen of the Nile!", "Asp's Kiss"),
  // TIER [A-LIST] Genghis Khan: large ranged. HP 480, atk 72, range 6-10 tiles (ranged), speed 8.
  c("genghis", "Genghis Khan", "🏇", "🏛️ History Icons", "large", "ranged", [ 480,  72, 800, 280, 600], "#8B4513", "The world is my empire!", "Mongol Horde"),
  // TIER [A-LIST] Julius Caesar: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("caesar", "Julius Caesar", "🏛️", "🏛️ History Icons", "medium", "melee", [ 300,  55, 820, 280, 600], "#C0C0C0", "Veni vidi vici! I came, I SAW, I conquered!", "Legion March"),
  // TIER [A-LIST] Alexander the Great: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("alexander", "Alexander the Great", "⚔️", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#9370DB", "There are no more worlds to conquer!", "Macedonian Phalanx"),
  // TIER [A-LIST] Teddy Roosevelt: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("teddy", "Teddy Roosevelt", "🐻", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#8B6914", "BULLY! Charge up San Juan Hill!", "Rough Rider Rush"),
  // TIER [A-LIST] Harriet Tubman: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("harriet", "Harriet Tubman", "⭐", "🏛️ History Icons", "medium", "melee", [ 300,  55, 820, 280, 600], "#4A4A4A", "I never ran my train off the track!", "Freedom March"),
  // TIER [B-LIST] Albert Einstein: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("einstein", "Albert Einstein", "🧪", "🏛️ History Icons", "small", "indirect", [  83,  20, 820, 160, 450], "#FFFFFF", "E=MC squared PUNCH!", "Relativity Blast"),
  // TIER [B-LIST] Marie Curie: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("curie", "Marie Curie", "⚗️", "🏛️ History Icons", "medium", "indirect", [ 150,  28, 780, 200, 450], "#7FFF00", "Science defeats all!", "Radioactive Wave"),
  // TIER [B-LIST] Nikola Tesla: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("tesla", "Nikola Tesla", "⚡", "🏛️ History Icons", "medium", "indirect", [ 150,  28, 780, 200, 450], "#00BFFF", "ELECTRICITY CONQUERS ALL!", "Tesla Coil Storm"),
  // TIER [B-LIST] Leonardo da Vinci: medium ranged. HP 150, atk 28, range 6-10 tiles (ranged), speed 10.
  c("davinci", "Leonardo da Vinci", "🎨", "🏛️ History Icons", "medium", "ranged", [ 150,  28, 760, 200, 450], "#D2691E", "Art is the ultimate weapon!", "Vitruvian Barrage"),
  // TIER [B-LIST] Ben Franklin: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("ben_franklin", "Ben Franklin", "⚡", "🏛️ History Icons", "medium", "indirect", [ 150,  28, 780, 200, 450], "#1E90FF", "A penny for your pain!", "Lightning Rod"),

  // ─── 🚀 FANTASY & SCI-FI ──────────────────────────────────────────────────
  // TIER [A-LIST] Dragon Knight: dragon-rider A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("dragon_knight", "Dragon Knight", "🐲", "🚀 Fantasy & Sci-Fi", "huge", "melee", [ 400,  75, 740, 340, 600], "#FF4500", "Dragon's fire flows through me!", "Dragon Breath"),
  // TIER [A-LIST] Space Marine: power-armour A-list. HP 400, atk 70, range 6-10 tiles (ranged), speed 8.
  c("space_marine", "Space Marine", "🚀", "🚀 Fantasy & Sci-Fi", "large", "ranged", [ 400,  70, 800, 280, 600], "#808080", "For the Emperor! Purge!", "Plasma Barrage"),
  // TIER [TOP-TIER] Wizard Supreme: large indirect. HP 1600, atk 195, range 10-15 tiles (AoE long), speed 8.
  c("wizard", "Wizard Supreme", "🧙", "🚀 Fantasy & Sci-Fi", "large", "indirect", [1600, 195, 720, 600, 850], "#9400D3", "By the crimson bands of Cyttorak!", "Arcane Tempest"),
  // TIER [A-LIST] Cyber Ninja: cyber-ninja A-list. HP 320, atk 65, range 1-2 tiles (melee), speed 10.
  c("cyber_ninja", "Cyber Ninja", "🥷", "🚀 Fantasy & Sci-Fi", "medium", "melee", [ 320,  65, 900, 280, 600], "#00FF41", "01001000 01001001!", "Data Slice"),
  // TIER [A-LIST] Orc Warlord: Waaagh A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("orc_warlord", "Orc Warlord", "👹", "🚀 Fantasy & Sci-Fi", "huge", "melee", [ 400,  75, 740, 340, 600], "#228B22", "WAAAGH! SMASH EVERYTHING!", "Warboss Slam"),
  // TIER [A-LIST] Elf Ranger: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("elf_ranger", "Elf Ranger", "🏹", "🚀 Fantasy & Sci-Fi", "medium", "ranged", [ 300,  55, 800, 280, 600], "#90EE90", "These woods are mine.", "Arrow Storm"),
  // TIER [A-LIST] Dwarf Berserker: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("dwarf_berserk", "Dwarf Berserker", "⚔️", "🚀 Fantasy & Sci-Fi", "medium", "melee", [ 300,  55, 820, 280, 600], "#D2691E", "AXES AND ALE! AXES AND ALE!", "Berserker Spin"),
  // TIER [A-LIST] Mech Pilot: mech A-list. HP 400, atk 75, range 6-10 tiles (ranged), speed 6.
  c("mech_pilot", "Mech Pilot", "🤖", "🚀 Fantasy & Sci-Fi", "huge", "ranged", [ 400,  75, 720, 340, 600], "#C0C0C0", "Mech systems at 100%!", "Missile Salvo"),
  // TIER [A-LIST] Vampire Lord: undead-noble A-list. HP 400, atk 65, range 1-2 tiles (melee), speed 8.
  c("vampire_lord", "Vampire Lord", "🧛", "🚀 Fantasy & Sci-Fi", "large", "melee", [ 400,  65, 820, 280, 600], "#6B0000", "I hunger... for VICTORY.", "Vampiric Drain"),
  // TIER [A-LIST] Werewolf Alpha: lycan A-list. HP 400, atk 70, range 1-2 tiles (melee), speed 8.
  c("werewolf", "Werewolf Alpha", "🐺", "🚀 Fantasy & Sci-Fi", "large", "melee", [ 400,  70, 820, 280, 600], "#4A3728", "AWOOOO! Full moon power!", "Savage Frenzy"),
  // TIER [A-LIST] Phoenix Rider: phoenix A-list. HP 380, atk 70, range 6-10 tiles (ranged), speed 8.
  c("phoenix_rider", "Phoenix Rider", "🦅", "🚀 Fantasy & Sci-Fi", "large", "ranged", [ 380,  70, 800, 280, 600], "#FF4500", "We rise from the ashes!", "Blaze Dive"),
  // TIER [COSMIC] Crystal Golem: elemental cosmic-tier. HP 2200, atk 220, range 20 tiles (cosmic AoE), speed 5.
  c("crystal_golem", "Crystal Golem", "💎", "🚀 Fantasy & Sci-Fi", "colossal", "melee", [2200, 220, 330, 990, 990], "#87CEEB", "CRAAASH (earth shakes)...", "Crystal Shatter"),
  // TIER [A-LIST] Forest Witch: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("forest_witch", "Forest Witch", "🌿", "🚀 Fantasy & Sci-Fi", "medium", "indirect", [ 300,  55, 820, 280, 600], "#228B22", "The forest fights with me!", "Thorn Barrage"),

  // ─── 🦸 COMICS & MOVIES ────────────────────────────────────────────────────
  // TIER [COSMIC] Superman: Kryptonian cosmic-tier. HP 2400, atk 300, range 20+ tiles (cosmic beam), speed 5.
  c("superman", "Superman", "🦸", "🦸 Comics & Movies", "colossal", "ranged", [2400, 300, 700, 990, 990], "#003EFF", "This looks like a job for Superman!", "Heat Vision Sweep"),
  // TIER [A-LIST] Batman: World's-Greatest-Detective A-list. HP 380, atk 55, range 1-2 tiles (melee), speed 10.
  c("batman", "Batman", "🦇", "🦸 Comics & Movies", "medium", "melee", [ 380,  55, 820, 280, 600], "#1C1C1C", "I'm Batman.", "Batarang Storm"),
  // TIER [A-LIST] Spider-Man: spider-sense A-list. HP 350, atk 60, range 1-2 tiles (melee), speed 18.
  c("spider_man", "Spider-Man", "🕷️", "🦸 Comics & Movies", "medium", "melee", [ 350,  60, 900, 280, 600], "#CC0000", "Your friendly neighborhood hero!", "Web Blitz"),
  // TIER [COSMIC] Hulk: Hulk-smash cosmic-tier. HP 2800, atk 320, range 20 tiles (cosmic AoE), speed 5.
  c("hulk", "Hulk", "💚", "🦸 Comics & Movies", "colossal", "melee", [2800, 320, 330, 990, 990], "#228B22", "HULK SMASH!!!", "Gamma Shockwave"),
  // TIER [TOP-TIER] Iron Man: repulsor-armour top-tier. HP 1000, atk 160, range 10-15 tiles (long-range), speed 8.
  c("iron_man", "Iron Man", "🤖", "🦸 Comics & Movies", "large", "ranged", [1000, 160, 700, 600, 850], "#B22222", "I am Iron Man.", "Repulsor Barrage"),
  // TIER [COSMIC] Thanos: Infinity-Gauntlet cosmic-tier. HP 3200, atk 380, range 20 tiles (cosmic AoE), speed 5.
  c("thanos", "Thanos", "💜", "🦸 Comics & Movies", "colossal", "melee", [3200, 380, 330, 990, 990], "#6B2FA0", "I am inevitable.", "Infinity Gauntlet"),
  // TIER [TOP-TIER] Wonder Woman: Amazon top-tier. HP 1100, atk 160, range 1-2 tiles (melee), speed 8.
  c("wonder_woman", "Wonder Woman", "⭐", "🦸 Comics & Movies", "large", "melee", [1100, 160, 720, 600, 850], "#C41E3A", "For Themyscira!", "Lasso of Lightning"),
  // TIER [TOP-TIER] Captain America: super-soldier top-tier. HP 1000, atk 130, range 1-2 tiles (melee), speed 8.
  c("captain_america", "Captain America", "🛡️", "🦸 Comics & Movies", "large", "melee", [1000, 130, 720, 600, 850], "#003EA8", "I can do this all day.", "Shield Ricochet"),
  // TIER [A-LIST] Black Panther: Wakandan A-list. HP 380, atk 65, range 1-2 tiles (melee), speed 10.
  c("black_panther", "Black Panther", "🐆", "🦸 Comics & Movies", "medium", "melee", [ 380,  65, 820, 280, 600], "#2C2C54", "Wakanda Forever!", "Vibranium Claws"),
  // TIER [A-LIST] Deadpool: regenerator A-list. HP 400, atk 65, range 1-2 tiles (melee), speed 10.
  c("deadpool", "Deadpool", "❤️", "🦸 Comics & Movies", "medium", "melee", [ 400,  65, 820, 280, 600], "#DC143C", "Maximum effort!", "Chimichanga Fury"),
  // TIER [COSMIC] Godzilla: kaiju cosmic-tier. HP 3000, atk 360, range 20+ tiles (cosmic), speed 5.
  c("godzilla", "Godzilla", "🦕", "🦸 Comics & Movies", "colossal", "indirect", [3000, 360, 330, 990, 990], "#2D6A4F", "SKREEEEONK!!!", "Atomic Breath"),
  // TIER [COSMIC] King Kong: kaiju cosmic-tier. HP 2600, atk 320, range 20 tiles (cosmic AoE), speed 5.
  c("king_kong", "King Kong", "🦍", "🦸 Comics & Movies", "colossal", "melee", [2600, 320, 330, 990, 990], "#4A2C0A", "ROOOAAAR! (beats chest)", "Titan Slam"),
  // TIER [TOP-TIER] Darth Vader: Sith top-tier. HP 1000, atk 170, range 1-2 tiles (melee), speed 8.
  c("darth_vader", "Darth Vader", "🌑", "🦸 Comics & Movies", "large", "melee", [1000, 170, 720, 600, 850], "#1A1A1A", "I find your lack of faith disturbing.", "Force Choke"),
  // TIER [A-LIST] The Mandalorian: bounty-hunter A-list. HP 320, atk 55, range 6-10 tiles (ranged), speed 10.
  c("mandalorian", "The Mandalorian", "🚀", "🦸 Comics & Movies", "medium", "ranged", [ 320,  55, 800, 280, 600], "#808080", "This is the way.", "Whistling Birds"),
  // TIER [A-LIST] Stormtrooper: small ranged. HP 165, atk 39, range 6-10 tiles (ranged), speed 14.
  c("stormtrooper", "Stormtrooper", "⬜", "🦸 Comics & Movies", "small", "ranged", [ 165,  39, 840, 240, 600], "#EFEFEF", "For the Empire!", "Blaster Volley"),

  // ─── 🎮 VIDEO GAMES ──────────────────────────────────────────────────────────
  // TIER [A-LIST] Mario: plumber A-list. HP 300, atk 50, range 1-2 tiles (melee), speed 14.
  c("mario", "Mario", "🍄", "🎮 Video Games", "small", "melee", [ 300,  50, 860, 240, 600], "#E52521", "Wahoo! Let's-a go!", "Super Stomp"),
  // TIER [A-LIST] Link: Hylian-Hero A-list. HP 340, atk 60, range 1-2 tiles (melee), speed 10.
  c("link", "Link", "🗡️", "🎮 Video Games", "medium", "melee", [ 340,  60, 820, 280, 600], "#3A8C3F", "HYAAAH!", "Spin Attack"),
  // TIER [B-LIST] Sonic: tiny melee. HP 38, atk 14, range 1-2 tiles (melee), speed 14.
  c("sonic", "Sonic", "💨", "🎮 Video Games", "tiny", "melee", [  38,  14, 860, 120, 450], "#1A6BCC", "Gotta go fast! SEEEGAAAA!", "Sonic Spin Dash"),
  // TIER [B-LIST] Pikachu: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("pikachu", "Pikachu", "⚡", "🎮 Video Games", "small", "indirect", [  83,  20, 820, 160, 450], "#FFD700", "Pika PIKAAAACHU!!!", "Thunderbolt"),
  // TIER [A-LIST] Bowser: Koopa-King A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("bowser", "Bowser", "🐢", "🎮 Video Games", "huge", "melee", [ 400,  75, 740, 340, 600], "#B5651D", "BWAAAAHAHA! Bow before Bowser!", "Shell Slam"),
  // TIER [A-LIST] Master Chief: Spartan-117 A-list. HP 400, atk 70, range 6-10 tiles (ranged), speed 8.
  c("master_chief", "Master Chief", "🪖", "🎮 Video Games", "large", "ranged", [ 400,  70, 800, 280, 600], "#4A7C59", "Finish the fight.", "Plasma Grenade"),
  // TIER [TOP-TIER] Kratos: god-of-war top-tier. HP 1100, atk 180, range 1-2 tiles (melee), speed 8.
  c("kratos", "Kratos", "🪓", "🎮 Video Games", "large", "melee", [1100, 180, 720, 600, 850], "#CC0000", "BOY! I AM THE GOD OF WAR!", "Blades of Chaos"),
  // TIER [A-LIST] Donkey Kong: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("donkey_kong", "Donkey Kong", "🦍", "🎮 Video Games", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "OHHHH Donkey Kong!", "Ground Pound"),
  // TIER [A-LIST] Minecraft Steve: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("minecraft_steve", "Minecraft Steve", "⛏️", "🎮 Video Games", "medium", "melee", [ 300,  55, 820, 280, 600], "#7B8FA1", "It's a good day to mine.", "TNT Explosion"),
  // TIER [B-LIST] Pac-Man: tiny melee. HP 38, atk 14, range 1-2 tiles (melee), speed 14.
  c("pac_man", "Pac-Man", "🟡", "🎮 Video Games", "tiny", "melee", [  38,  14, 860, 120, 450], "#FFE000", "WAKA WAKA WAKA!", "Power Pellet"),

  // ─── 🌩️ GODS & MYTHS ─────────────────────────────────────────────────────────
  // TIER [COSMIC] Zeus: king-of-Olympus cosmic-tier. HP 2800, atk 360, range 20+ tiles (cosmic), speed 5.
  c("zeus", "Zeus", "⚡", "🌩️ Gods & Myths", "colossal", "indirect", [2800, 360, 330, 990, 990], "#F0E68C", "I am the KING of Olympus!", "Divine Lightning"),
  // TIER [COSMIC] Poseidon: sea-god cosmic-tier. HP 2600, atk 320, range 20+ tiles (cosmic), speed 5.
  c("poseidon", "Poseidon", "🌊", "🌩️ Gods & Myths", "huge", "indirect", [2600, 320, 370, 960, 990], "#1E90FF", "The seas answer to ME!", "Tidal Surge"),
  // TIER [A-LIST] Medusa: Gorgon A-list. HP 320, atk 70, range 6-10 tiles (ranged), speed 8.
  c("medusa", "Medusa", "🐍", "🌩️ Gods & Myths", "large", "ranged", [ 320,  70, 800, 280, 600], "#8FBC8F", "One glance and you're STONE.", "Petrify Gaze"),
  // TIER [A-LIST] Minotaur: Labyrinth A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 8.
  c("minotaur", "Minotaur", "🐂", "🌩️ Gods & Myths", "large", "melee", [ 400,  75, 820, 280, 600], "#8B4513", "ROOOOAR! No escape from the maze!", "Labyrinth Charge"),
  // TIER [A-LIST] Fenrir: world-ender wolf A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 6.
  c("fenrir", "Fenrir", "🐺", "🌩️ Gods & Myths", "huge", "melee", [ 400,  75, 740, 340, 600], "#4A3728", "I will swallow the sun!", "World-Ender Bite"),
  // TIER [TOP-TIER] Odin: All-Father top-tier. HP 1100, atk 170, range 10-15 tiles (AoE long), speed 8.
  c("odin", "Odin", "🪬", "🌩️ Gods & Myths", "large", "indirect", [1100, 170, 720, 600, 850], "#4682B4", "All-Father commands it!", "Gungnir Strike"),
  // TIER [TOP-TIER] Ares: war-god top-tier. HP 1100, atk 180, range 1-2 tiles (melee), speed 8.
  c("ares", "Ares", "⚔️", "🌩️ Gods & Myths", "large", "melee", [1100, 180, 720, 600, 850], "#8B0000", "WAR IS MY DOMAIN!", "Warbringer Fury"),
  // TIER [A-LIST] Loki: trickster-god A-list. HP 300, atk 65, range 6-10 tiles (AoE), speed 10.
  c("loki", "Loki", "🃏", "🌩️ Gods & Myths", "medium", "indirect", [ 300,  65, 820, 280, 600], "#2F4F4F", "You will NEVER see me coming.", "Chaos Trickery"),
  // TIER [A-LIST] Anubis: death-god A-list. HP 360, atk 60, range 1-2 tiles (melee), speed 8.
  c("anubis", "Anubis", "🐾", "🌩️ Gods & Myths", "large", "melee", [ 360,  60, 820, 280, 600], "#B8860B", "I weigh your soul... and it's LIGHT.", "Death Jackal"),
  // TIER [A-LIST] Ra: sun-god A-list. HP 360, atk 65, range 6-10 tiles (AoE), speed 8.
  c("ra", "Ra", "☀️", "🌩️ Gods & Myths", "large", "indirect", [ 360,  65, 820, 280, 600], "#FF8C00", "By the power of the SUN!", "Solar Beam"),

  // ─── ⚔️ LEGENDS (5 new) ───────────────────────────────────────────────────
  // TIER [A-LIST] Cú Chulainn: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("cu_chulainn", "Cú Chulainn", "🌀", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#1B6B3A", "The hound of Ulster rages!", "Warp Spasm"),
  // TIER [A-LIST] Arjuna: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("arjuna", "Arjuna", "🏹", "⚔️ Legends", "medium", "ranged", [ 300,  55, 800, 280, 600], "#DAA520", "Even the gods fear my bow!", "Brahmastra"),
  // TIER [A-LIST] Miyamoto Musashi: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("miyamoto", "Miyamoto Musashi", "⚔️", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#2F2F2F", "Two swords — twice the doom!", "Niten Ichi-ryu"),
  // TIER [A-LIST] Ragnar Lothbrok: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("ragnar", "Ragnar Lothbrok", "🪓", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#4A7BA7", "Odin is with me! CHARGE!", "Viking Fury"),
  // TIER [A-LIST] Shaka Zulu: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("shaka_zulu", "Shaka Zulu", "🛡️", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#8B1A1A", "The Zulu nation bows to no one!", "Iklwa Blitz"),

  // ─── 🦁 WILD KINGDOM (5 new) ──────────────────────────────────────────────
  // TIER [B-LIST] Cassowary: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("cassowary", "Cassowary", "🦤", "🦁 Wild Kingdom", "medium", "melee", [ 150,  28, 780, 200, 450], "#00CED1", "Velociraptors wish they were me!", "Dagger Kick"),
  // TIER [MOOK/HUMAN] Platypus Agent: tiny melee. HP 25, atk 6, range 1-2 tiles (melee), speed 14.
  c("platypus", "Platypus Agent", "🦆", "🦁 Wild Kingdom", "tiny", "melee", [  25,   6, 740,  40, 250], "#8B6914", "Venomous AND waterproof. Deal with it.", "Venom Spur"),
  // TIER [TOP-TIER] Giant Manta Ray: huge indirect. HP 2400, atk 240, range 10-15 tiles (AoE long), speed 6.
  c("manta_ray", "Giant Manta Ray", "🐟", "🦁 Wild Kingdom", "huge", "indirect", [2400, 240, 640, 660, 850], "#1C4F8C", "Gliding silently from below...", "Wing Slam"),
  // TIER [B-LIST] Tasmanian Devil: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("tasmanian_devil", "Tasmanian Devil", "😈", "🦁 Wild Kingdom", "small", "melee", [  83,  20, 820, 160, 450], "#2C2C2C", "SHRIEEEEK! (spins maniacally)", "Spinning Chomper"),
  // TIER [B-LIST] Golden Eagle: medium ranged. HP 150, atk 28, range 6-10 tiles (ranged), speed 10.
  c("golden_eagle", "Golden Eagle", "🦅", "🦁 Wild Kingdom", "medium", "ranged", [ 150,  28, 760, 200, 450], "#B8860B", "Stoop! From 200mph I DIVE!", "Power Stoop"),

  // ─── 🤪 SILLY SQUAD (5 new) ────────────────────────────────────────────────
  // TIER [B-LIST] Furious Tax Collector: small ranged. HP 83, atk 20, range 6-10 tiles (ranged), speed 14.
  c("tax_collector", "Furious Tax Collector", "💸", "🤪 Silly Squad", "small", "ranged", [  83,  20, 800, 160, 450], "#228B22", "YOU OWE BACK TAXES!", "Audit of Doom"),
  // TIER [B-LIST] Raging Yoga Instructor: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("yoga_instructor", "Raging Yoga Instructor", "🧘", "🤪 Silly Squad", "medium", "indirect", [ 150,  28, 780, 200, 450], "#FF69B4", "BREATHE and DESTROY!", "Inner Peace Blast"),
  // TIER [MOOK/HUMAN] Aggressive City Pigeon: tiny ranged. HP 25, atk 6, range 6-10 tiles (ranged), speed 14.
  c("pigeon", "Aggressive City Pigeon", "🐦", "🤪 Silly Squad", "tiny", "ranged", [  25,   6, 720,  40, 250], "#9E9E9E", "COO COO MINE! MINE! MINE!", "Breadcrumb Bomb"),
  // TIER [B-LIST] Runaway Office Chair: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("office_chair", "Runaway Office Chair", "🪑", "🤪 Silly Squad", "small", "melee", [  83,  20, 820, 160, 450], "#4169E1", "WHEEEEE! (rolling intensifies)", "Spinout Slam"),
  // TIER [B-LIST] Conspiracy Guy: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("conspiracy_guy", "Conspiracy Guy", "📌", "🤪 Silly Squad", "small", "indirect", [  83,  20, 820, 160, 450], "#FF4500", "The truth is out there AND IT HURTS!", "Red String Web"),

  // ─── 💥 HEROES & VILLAINS (5 new) ─────────────────────────────────────────
  // TIER [A-LIST] Magnet Queen: magnetism A-list. HP 360, atk 70, range 6-10 tiles (AoE), speed 8.
  c("magnet_queen", "Magnet Queen", "🧲", "💥 Heroes & Villains", "large", "indirect", [ 360,  70, 820, 280, 600], "#A020F0", "Metal bends to my WILL!", "Magnetic Crush"),
  // TIER [A-LIST] Blur Demon: speedster A-list. HP 280, atk 60, range 1-2 tiles (melee), speed 20.
  c("blur_demon", "Blur Demon", "💨", "💥 Heroes & Villains", "medium", "melee", [ 280,  60, 990, 280, 600], "#00FFFF", "I'm everywhere at once!", "Afterimage Storm"),
  // TIER [A-LIST] Bone Queen: necromancer A-list. HP 360, atk 65, range 6-10 tiles (AoE), speed 8.
  c("bone_queen", "Bone Queen", "💀", "💥 Heroes & Villains", "large", "indirect", [ 360,  65, 820, 280, 600], "#F5F5DC", "The dead obey me!", "Army of Bones"),
  // TIER [A-LIST] Tide Lord: ocean A-list. HP 380, atk 70, range 6-10 tiles (AoE), speed 6.
  c("tide_lord", "Tide Lord", "🌊", "💥 Heroes & Villains", "huge", "indirect", [ 380,  70, 740, 340, 600], "#006994", "The tide ALWAYS comes in!", "Riptide Surge"),
  // TIER [A-LIST] Neon Ghost: phasing A-list. HP 320, atk 65, range 1-2 tiles (melee), speed 10.
  c("neon_ghost", "Neon Ghost", "👻", "💥 Heroes & Villains", "medium", "melee", [ 320,  65, 820, 280, 600], "#FF00FF", "You can't fight what's already dead!", "Phase Strike"),

  // ─── 🏛️ HISTORY ICONS (5 new) ─────────────────────────────────────────────
  // TIER [B-LIST] Sun Tzu: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("sun_tzu", "Sun Tzu", "📜", "🏛️ History Icons", "small", "indirect", [  83,  20, 820, 160, 450], "#C5A028", "The supreme art of war is to subdue without fighting!", "Art of War"),
  // TIER [A-LIST] Ramesses II: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("ramesses", "Ramesses II", "𓂀", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#D4AF37", "I am my own greatest monument!", "Pharaoh's Wrath"),
  // TIER [A-LIST] Wu Zetian: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("wu_zetian", "Wu Zetian", "👑", "🏛️ History Icons", "medium", "indirect", [ 300,  55, 820, 280, 600], "#8B0000", "China's only Empress STRIKES!", "Iron Decree"),
  // TIER [A-LIST] Spartacus: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("spartacus", "Spartacus", "⛓️", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "I am Spartacus! And so is everyone else!", "Gladiator Revolt"),
  // TIER [A-LIST] Hannibal Barca: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("hannibal", "Hannibal Barca", "🐘", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#6B3A2A", "Crossing the Alps was the EASY part!", "War Elephant Charge"),

  // ─── 🚀 FANTASY & SCI-FI (5 new) ─────────────────────────────────────────
  // TIER [A-LIST] Lich King: necromancer A-list. HP 380, atk 75, range 6-10 tiles (AoE), speed 8.
  c("lich_king", "Lich King", "💀", "🚀 Fantasy & Sci-Fi", "large", "indirect", [ 380,  75, 820, 280, 600], "#00FFFF", "Death is only the beginning.", "Soul Harvest"),
  // TIER [COSMIC] Sand Wyrm: Shai-Hulud cosmic-tier. HP 2400, atk 260, range 20 tiles (cosmic AoE), speed 5.
  c("sand_wyrm", "Sand Wyrm", "🪱", "🚀 Fantasy & Sci-Fi", "colossal", "melee", [2400, 260, 330, 990, 990], "#C4936A", "THE GROUND ERUPTS BENEATH YOU!", "Burrow Strike"),
  // TIER [A-LIST] Time Knight: temporal A-list. HP 360, atk 65, range 1-2 tiles (melee), speed 10.
  c("time_knight", "Time Knight", "⏳", "🚀 Fantasy & Sci-Fi", "medium", "melee", [ 360,  65, 820, 280, 600], "#7B68EE", "I've already won this fight.", "Temporal Slash"),
  // TIER [COSMIC] Storm Giant: mountain-toppling cosmic-tier. HP 2400, atk 280, range 20 tiles (cosmic AoE), speed 5.
  c("storm_giant", "Storm Giant", "⛈️", "🚀 Fantasy & Sci-Fi", "colossal", "melee", [2400, 280, 330, 990, 990], "#4682B4", "I TOPPLE MOUNTAINS!", "Thunder Clap"),
  // TIER [A-LIST] Void Witch: entropy A-list. HP 340, atk 70, range 6-10 tiles (AoE), speed 10.
  c("void_witch", "Void Witch", "🌑", "🚀 Fantasy & Sci-Fi", "medium", "indirect", [ 340,  70, 820, 280, 600], "#4B0082", "I unravel the fabric of reality.", "Entropy Cascade"),

  // ─── 🦸 COMICS & MOVIES (5 new) ───────────────────────────────────────────
  // TIER [A-LIST] The Mask: Loki-tier toon A-list. HP 320, atk 60, range 1-2 tiles (melee), speed 10.
  c("the_mask", "The Mask", "💚", "🦸 Comics & Movies", "medium", "melee", [ 320,  60, 900, 280, 600], "#32CD32", "Smokin'! SOMEBODY STOP ME!", "Cartoon Barrage"),
  // TIER [A-LIST] Terminator: T-800 A-list. HP 400, atk 75, range 6-10 tiles (ranged), speed 8.
  c("terminator", "Terminator", "🤖", "🦸 Comics & Movies", "large", "ranged", [ 400,  75, 800, 280, 600], "#C0C0C0", "I'll be back.", "Minigun Sweep"),
  // TIER [A-LIST] Xenomorph: alien A-list. HP 360, atk 70, range 1-2 tiles (melee), speed 8.
  c("xenomorph", "Xenomorph", "👾", "🦸 Comics & Movies", "large", "melee", [ 360,  70, 820, 280, 600], "#1A1A2E", "HISSSSSS!!! (acid drool)", "Acid Bite"),
  // TIER [A-LIST] Predator: yautja A-list. HP 380, atk 70, range 6-10 tiles (ranged), speed 8.
  c("predator", "Predator", "🎯", "🦸 Comics & Movies", "large", "ranged", [ 380,  70, 800, 280, 600], "#8B6914", "Your skull will look GREAT on my wall.", "Plasma Caster"),
  // TIER [A-LIST] Neo: Matrix-One A-list. HP 360, atk 70, range 1-2 tiles (melee), speed 18.
  c("neo", "Neo", "🕶️", "🦸 Comics & Movies", "medium", "melee", [ 360,  70, 900, 280, 600], "#00FF41", "I know Kung Fu. All of it.", "Bullet Dodge"),

  // ─── 🎮 VIDEO GAMES (5 new) ───────────────────────────────────────────────
  // TIER [A-LIST] Samus Aran: bounty-hunter A-list. HP 380, atk 70, range 6-10 tiles (ranged), speed 8.
  c("samus", "Samus Aran", "🚀", "🎮 Video Games", "large", "ranged", [ 380,  70, 800, 280, 600], "#F0A500", "The galaxy's deadliest bounty hunter!", "Super Missile"),
  // TIER [A-LIST] Cloud Strife: SOLDIER A-list. HP 400, atk 70, range 1-2 tiles (melee), speed 8.
  c("cloud", "Cloud Strife", "⚔️", "🎮 Video Games", "large", "melee", [ 400,  70, 820, 280, 600], "#7B96D2", "This isn't even my final limit!", "Omnislash"),
  // TIER [A-LIST] Lara Croft: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("lara", "Lara Croft", "🏹", "🎮 Video Games", "medium", "ranged", [ 300,  55, 800, 280, 600], "#8B6914", "I NEVER give up a relic!", "Dual Pistols"),
  // TIER [TOP-TIER] Doom Slayer: Hell-walker top-tier. HP 1100, atk 200, range 10-15 tiles (long-range), speed 8.
  c("doom_slayer", "Doom Slayer", "💥", "🎮 Video Games", "large", "ranged", [1100, 200, 700, 600, 850], "#008000", "RIP AND TEAR! UNTIL IT IS DONE!", "BFG Blast"),
  // TIER [B-LIST] Sans: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("sans", "Sans", "💀", "🎮 Video Games", "small", "indirect", [  83,  20, 820, 160, 450], "#FFFFFF", "heh. you're gonna have a bad time.", "Gaster Blaster"),

  // ─── 🌩️ GODS & MYTHS (5 new) ─────────────────────────────────────────────
  // TIER [A-LIST] Kali: destruction-goddess A-list. HP 380, atk 80, range 1-2 tiles (melee), speed 8.
  c("kali", "Kali", "🔱", "🌩️ Gods & Myths", "large", "melee", [ 380,  80, 820, 280, 600], "#1A0A0A", "DESTRUCTION IS MY GIFT TO YOU!", "Tongue of Doom"),
  // TIER [A-LIST] Quetzalcoatl: feathered-serpent A-list. HP 400, atk 70, range 6-10 tiles (AoE), speed 6.
  c("quetzalcoatl", "Quetzalcoatl", "🐍", "🌩️ Gods & Myths", "colossal", "indirect", [ 400,  70, 700, 400, 600], "#00C850", "The feathered serpent DESCENDS!", "Serpent Wind"),
  // TIER [TOP-TIER] Thoth: Thoth wisdom-god top-tier. HP 1000, atk 170, range 10-15 tiles (AoE long), speed 8.
  c("thor_egyptian", "Thoth", "🌙", "🌩️ Gods & Myths", "large", "indirect", [1000, 170, 720, 600, 850], "#C0C0C0", "Knowledge IS the sharpest weapon!", "Cosmic Equation"),
  // TIER [A-LIST] Cernunnos: horned-god A-list. HP 360, atk 65, range 1-2 tiles (melee), speed 8.
  c("cernunnos", "Cernunnos", "🦌", "🌩️ Gods & Myths", "large", "melee", [ 360,  65, 820, 280, 600], "#2D5A1B", "The wild hunt BEGINS!", "Stag Rush"),
  // TIER [A-LIST] Tezcatlipoca: smoking-mirror A-list. HP 360, atk 65, range 6-10 tiles (AoE), speed 8.
  c("tezcatlipoca", "Tezcatlipoca", "🪞", "🌩️ Gods & Myths", "large", "indirect", [ 360,  65, 820, 280, 600], "#0A0A2E", "Your reflection shows your doom!", "Smoking Mirror"),

  // ─── 🌍 WORLD WARRIORS ────────────────────────────────────────────────────
  // TIER [A-LIST] Samurai Shogun: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("samurai", "Samurai Shogun", "⛩️", "🌍 World Warriors", "large", "melee", [ 480,  72, 820, 280, 600], "#8B0000", "Bushido! Blade draws ONCE!", "Iaido Flash"),
  // TIER [A-LIST] Viking Shieldmaiden: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("viking_shield", "Viking Shieldmaiden", "🛡️", "🌍 World Warriors", "medium", "melee", [ 300,  55, 820, 280, 600], "#6B8E4E", "Valhalla calls — but not TODAY!", "Shield Bash Wave"),
  // TIER [A-LIST] Aztec Jaguar Warrior: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("aztec_jaguar", "Aztec Jaguar Warrior", "🐆", "🌍 World Warriors", "medium", "melee", [ 300,  55, 820, 280, 600], "#D4A017", "I am the shadow of Huitzilopochtli!", "Obsidian Flurry"),
  // TIER [A-LIST] Gladiator: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("gladiator", "Gladiator", "🏟️", "🌍 World Warriors", "large", "melee", [ 480,  72, 820, 280, 600], "#C8A882", "ARE YOU NOT ENTERTAINED?!", "Net and Trident"),
  // TIER [A-LIST] Mongol Horse Archer: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("mongol_archer", "Mongol Horse Archer", "🏇", "🌍 World Warriors", "medium", "ranged", [ 300,  55, 800, 280, 600], "#8B4513", "From the steppes, death arrives!", "Mounted Volley"),
  // TIER [A-LIST] Spartan Warrior: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("spartan_II", "Spartan Warrior", "🛡️", "🌍 World Warriors", "large", "melee", [ 480,  72, 820, 280, 600], "#CC0000", "MOLON LABE! Come and take them!", "Phalanx Crush"),
  // TIER [A-LIST] Maori Warrior: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("maori_warrior", "Maori Warrior", "🌿", "🌍 World Warriors", "large", "melee", [ 480,  72, 820, 280, 600], "#2E5E2E", "KA MATE! KA MATE! HAKA!", "Haka Terror"),
  // TIER [A-LIST] Persian Immortal: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("persian_immortal", "Persian Immortal", "⚜️", "🌍 World Warriors", "medium", "ranged", [ 300,  55, 800, 280, 600], "#FFD700", "Ten thousand replace every one!", "Immortal Volley"),
  // TIER [A-LIST] Zulu Warrior: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("zulu_warrior", "Zulu Warrior", "🌍", "🌍 World Warriors", "medium", "melee", [ 300,  55, 820, 280, 600], "#3B2507", "NGADLA! I have eaten! (victory!)", "Assegai Rush"),
  // TIER [A-LIST] Shadow Ninja: small melee. HP 165, atk 39, range 1-2 tiles (melee), speed 18.
  c("ninja", "Shadow Ninja", "🥷", "🌍 World Warriors", "small", "melee", [ 165,  39, 860, 240, 600], "#1A1A1A", "You heard nothing. You saw less.", "Shuriken Tempest"),

  // ─── 📺 CARTOONS & ANIMATION ─────────────────────────────────────────────────
  // TIER [B-LIST] SpongeBob: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("spongebob", "SpongeBob", "🧽", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#FFD700", "I'm ready! I'm ready!", "Spatula Slam"),
  // TIER [A-LIST] Patrick Star: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("patrick", "Patrick Star", "⭐", "📺 Cartoons & Animation", "medium", "melee", [ 300,  55, 820, 280, 600], "#FF69B4", "Is mayonnaise an instrument?", "Rock Drop"),
  // TIER [A-LIST] Squidward: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("squidward", "Squidward", "🎷", "📺 Cartoons & Animation", "medium", "indirect", [ 300,  55, 820, 280, 600], "#74C8C8", "I am the world's greatest artiste!", "Clarinet Blast"),
  // TIER [B-LIST] Sandy Cheeks: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("sandy", "Sandy Cheeks", "🤠", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#D2B48C", "Don't mess with Texas!", "Karate Chop Frenzy"),
  // TIER [B-LIST] Mr. Krabs: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("mrcrabs", "Mr. Krabs", "🦀", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#FF4500", "MONEY!!!", "Claw Cash Grab"),
  // TIER [A-LIST] Avatar Aang: Avatar A-list. HP 320, atk 65, range 6-10 tiles (AoE), speed 10.
  c("aang", "Avatar Aang", "🌪️", "📺 Cartoons & Animation", "medium", "indirect", [ 320,  65, 820, 280, 600], "#FF7700", "I am the Avatar!", "Avatar State"),
  // TIER [A-LIST] Katara: waterbender A-list. HP 280, atk 55, range 6-10 tiles (AoE), speed 10.
  c("katara", "Katara", "💧", "📺 Cartoons & Animation", "medium", "indirect", [ 280,  55, 820, 280, 600], "#1E90FF", "I will never turn my back on people!", "Tidal Wave"),
  // TIER [A-LIST] Prince Zuko: fire-prince A-list. HP 320, atk 60, range 1-2 tiles (melee), speed 10.
  c("zuko", "Prince Zuko", "🔥", "📺 Cartoons & Animation", "medium", "melee", [ 320,  60, 820, 280, 600], "#FF4500", "Honour! HONOUR!", "Blue Fire"),
  // TIER [A-LIST] Toph Beifong: earthbender A-list. HP 360, atk 65, range 6-10 tiles (AoE), speed 10.
  c("toph", "Toph Beifong", "🪨", "📺 Cartoons & Animation", "medium", "indirect", [ 360,  65, 820, 280, 600], "#8B7355", "I'm the world's greatest earthbender!", "Metal Cage"),
  // TIER [A-LIST] Azula: fire-prodigy A-list. HP 320, atk 70, range 6-10 tiles (AoE), speed 8.
  c("azula", "Azula", "⚡", "📺 Cartoons & Animation", "large", "indirect", [ 320,  70, 820, 280, 600], "#4169E1", "Pleased to meet you! Not.", "Lightning Bolt"),
  // TIER [B-LIST] Finn the Human: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("finn", "Finn the Human", "⚔️", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#4169E1", "Mathematical! Let's fight!", "Sword Twirl"),
  // TIER [A-LIST] Jake the Dog: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("jake", "Jake the Dog", "🐕", "📺 Cartoons & Animation", "medium", "melee", [ 300,  55, 820, 280, 600], "#D4A017", "Algebraic! Stretch!", "Elastic Punch"),
  // TIER [B-LIST] Bugs Bunny: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("bugs_bunny", "Bugs Bunny", "🐰", "📺 Cartoons & Animation", "small", "indirect", [  83,  20, 820, 160, 450], "#C0C0C0", "What's up, doc?", "Anvil Drop"),
  // TIER [A-LIST] Homer Simpson: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("homer", "Homer Simpson", "🍩", "📺 Cartoons & Animation", "medium", "melee", [ 300,  55, 820, 280, 600], "#FFE0A0", "D'oh! I mean... CHARGE!", "Donut Fists"),
  // TIER [B-LIST] Bart Simpson: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("bart", "Bart Simpson", "🛹", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#FFFF00", "Eat my shorts!", "Skateboard Slam"),
  // TIER [B-LIST] Rick Sanchez: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("rick", "Rick Sanchez", "🧪", "📺 Cartoons & Animation", "small", "indirect", [  83,  20, 820, 160, 450], "#FFFFFF", "Nobody exists on purpose.", "Portal Beam"),
  // TIER [B-LIST] Morty Smith: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("morty", "Morty Smith", "😰", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#B0C4DE", "Oh jeez, I dunno about this!", "Panic Attack"),
  // TIER [A-LIST] The Genie: phenomenal A-list. HP 380, atk 70, range 6-10 tiles (AoE), speed 8.
  c("genie", "The Genie", "🧞", "📺 Cartoons & Animation", "large", "indirect", [ 380,  70, 820, 280, 600], "#0000FF", "PHENOMENAL COSMIC POWERS!", "Wish Granted"),
  // TIER [A-LIST] Moana: wayfinder A-list. HP 280, atk 40, range 1-2 tiles (melee), speed 10.
  c("moana", "Moana", "🌊", "📺 Cartoons & Animation", "medium", "melee", [ 280,  40, 820, 280, 600], "#1E90FF", "I am Moana of Motunui!", "Heart of Te Fiti"),
  // TIER [A-LIST] Maui: demigod A-list. HP 400, atk 65, range 1-2 tiles (melee), speed 8.
  c("maui", "Maui", "🪝", "📺 Cartoons & Animation", "large", "melee", [ 400,  65, 820, 280, 600], "#D2691E", "You're welcome!", "Hook Smash"),
  // TIER [A-LIST] Shrek: ogre A-list. HP 400, atk 60, range 1-2 tiles (melee), speed 8.
  c("shrek", "Shrek", "🧅", "📺 Cartoons & Animation", "large", "melee", [ 400,  60, 820, 280, 600], "#6B8E23", "Get out of my SWAMP!", "Swamp Slam"),
  // TIER [B-LIST] Puss in Boots: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("puss_boots", "Puss in Boots", "🐱", "📺 Cartoons & Animation", "small", "melee", [  83,  20, 820, 160, 450], "#D2691E", "Fear me if you dare!", "Swordpaw Flurry"),
  // TIER [A-LIST] Captain Jack Sparrow: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("jack_sparrow", "Captain Jack Sparrow", "🏴‍☠️", "📺 Cartoons & Animation", "medium", "melee", [ 300,  55, 820, 280, 600], "#3B2507", "Why is the rum always gone?", "Drunken Sword"),
  // TIER [A-LIST] Elsa: ice-queen A-list. HP 320, atk 65, range 6-10 tiles (AoE), speed 8.
  c("elsa", "Elsa", "❄️", "📺 Cartoons & Animation", "large", "indirect", [ 320,  65, 820, 280, 600], "#87CEEB", "Let it go!", "Ice Palace"),
  // TIER [A-LIST] Jack Skellington: Halloween-King A-list. HP 320, atk 60, range 6-10 tiles (AoE), speed 8.
  c("jack_skeleton", "Jack Skellington", "🎃", "📺 Cartoons & Animation", "large", "indirect", [ 320,  60, 820, 280, 600], "#F5F5F5", "This is Halloween!", "Nightmare Spiral"),

  // ─── 🌀 ANIME LEGENDS ────────────────────────────────────────────────────────
  // TIER [COSMIC] Son Goku: Spirit Bomb cosmic-tier. HP 2800, atk 380, range 20+ tiles (cosmic), speed 5.
  c("goku", "Son Goku", "🐉", "🌀 Anime Legends", "huge", "indirect", [2800, 380, 370, 960, 990], "#FF8C00", "Kamehameha!!!", "Spirit Bomb"),
  // TIER [COSMIC] Vegeta: Final-Flash cosmic-tier. HP 2600, atk 360, range 20+ tiles (cosmic), speed 5.
  c("vegeta", "Vegeta", "💥", "🌀 Anime Legends", "large", "indirect", [2600, 360, 450, 900, 990], "#1C1C1C", "IT'S OVER NINE THOUSAND!", "Final Flash"),
  // TIER [COSMIC] Frieza: tyrant cosmic-tier. HP 2400, atk 340, range 20+ tiles (cosmic), speed 5.
  c("frieza", "Frieza", "💜", "🌀 Anime Legends", "large", "indirect", [2400, 340, 450, 900, 990], "#C8A0D0", "I am the strongest in the universe!", "Death Ball"),
  // TIER [TOP-TIER] Piccolo: Namekian top-tier. HP 1000, atk 160, range 10-15 tiles (long-range), speed 8.
  c("piccolo", "Piccolo", "💚", "🌀 Anime Legends", "large", "ranged", [1000, 160, 700, 600, 850], "#228B22", "SPECIAL BEAM CANNON!", "Makkankōsappō"),
  // TIER [TOP-TIER] Naruto: Hokage top-tier. HP 1000, atk 170, range 10-15 tiles (AoE long), speed 10.
  c("naruto", "Naruto", "🦊", "🌀 Anime Legends", "medium", "indirect", [1000, 170, 720, 600, 850], "#FF4500", "I'll never give up! Believe it!", "Rasengan"),
  // TIER [TOP-TIER] Sasuke Uchiha: Sharingan top-tier. HP 950, atk 180, range 1-2 tiles (melee), speed 10.
  c("sasuke", "Sasuke Uchiha", "🌑", "🌀 Anime Legends", "medium", "melee", [ 950, 180, 720, 600, 850], "#1C1C2E", "I walk a path of solitude.", "Chidori"),
  // TIER [TOP-TIER] Itachi Uchiha: Mangekyō top-tier. HP 800, atk 180, range 10-15 tiles (AoE long), speed 10.
  c("itachi", "Itachi Uchiha", "👁️", "🌀 Anime Legends", "medium", "indirect", [ 800, 180, 720, 600, 850], "#2C1A3A", "You're not ready to fight me.", "Amaterasu"),
  // TIER [COSMIC] Madara Uchiha: Six Paths cosmic-tier. HP 2600, atk 360, range 20+ tiles (cosmic), speed 5.
  c("madara", "Madara Uchiha", "😈", "🌀 Anime Legends", "large", "indirect", [2600, 360, 450, 900, 990], "#2C1A3A", "The mere fact I'm here means you've lost!", "Infinite Tsukuyomi"),
  // TIER [TOP-TIER] Monkey D. Luffy: Pirate-King top-tier. HP 1000, atk 160, range 1-2 tiles (melee), speed 10.
  c("luffy", "Monkey D. Luffy", "🏴‍☠️", "🌀 Anime Legends", "medium", "melee", [1000, 160, 720, 600, 850], "#CC0000", "I'm gonna be King of the Pirates!", "Gear Fourth"),
  // TIER [TOP-TIER] Roronoa Zoro: three-sword top-tier. HP 1100, atk 170, range 1-2 tiles (melee), speed 8.
  c("zoro_op", "Roronoa Zoro", "⚔️", "🌀 Anime Legends", "large", "melee", [1100, 170, 720, 600, 850], "#2E8B57", "World's greatest swordsman!", "Three Sword Style"),
  // TIER [COSMIC] Saitama: one-punch cosmic-tier. HP 4000, atk 500, range 20 tiles (cosmic AoE), speed 5.
  c("saitama", "Saitama", "👊", "🌀 Anime Legends", "medium", "melee", [4000, 500, 450, 900, 990], "#FFE4C4", "One punch.", "Serious Punch"),
  // TIER [A-LIST] Genos: cyborg A-list. HP 360, atk 70, range 6-10 tiles (ranged), speed 8.
  c("genos", "Genos", "🤖", "🌀 Anime Legends", "large", "ranged", [ 360,  70, 800, 280, 600], "#FF8C00", "I must become stronger!", "Incinerate"),
  // TIER [A-LIST] Tanjiro Kamado: water-breather A-list. HP 340, atk 60, range 1-2 tiles (melee), speed 10.
  c("tanjiro", "Tanjiro Kamado", "💧", "🌀 Anime Legends", "medium", "melee", [ 340,  60, 820, 280, 600], "#1E90FF", "I will slay every demon!", "Water Breathing"),
  // TIER [A-LIST] Zenitsu Agatsuma: thunder-breather A-list. HP 280, atk 80, range 1-2 tiles (melee), speed 18.
  c("zenitsu", "Zenitsu Agatsuma", "⚡", "🌀 Anime Legends", "small", "melee", [ 280,  80, 990, 240, 600], "#FFD700", "AAAAAHHHH! (attacks in sleep)", "Thunderclap Flash"),
  // TIER [TOP-TIER] Flame Hashira: Flame Hashira top-tier. HP 1000, atk 170, range 1-2 tiles (melee), speed 8.
  c("rengoku", "Flame Hashira", "🔥", "🌀 Anime Legends", "large", "melee", [1000, 170, 720, 600, 850], "#FF4500", "Set your heart ablaze!", "Flame Breathing"),
  // TIER [COSMIC] Ichigo Kurosaki: Getsuga cosmic-tier. HP 2400, atk 320, range 20 tiles (cosmic AoE), speed 5.
  c("ichigo", "Ichigo Kurosaki", "⚔️", "🌀 Anime Legends", "large", "melee", [2400, 320, 450, 900, 990], "#FF4500", "I'm not gonna run away!", "Getsuga Tenshō"),
  // TIER [COSMIC] Sōsuke Aizen: Kyōka-Suigetsu cosmic-tier. HP 2400, atk 340, range 20+ tiles (cosmic), speed 5.
  c("aizen", "Sōsuke Aizen", "😎", "🌀 Anime Legends", "large", "indirect", [2400, 340, 450, 900, 990], "#4B0082", "None of you were a match for me.", "Kyōka Suigetsu"),
  // TIER [COSMIC] Kenpachi Zaraki: Zaraki cosmic-tier brute. HP 2800, atk 380, range 20 tiles (cosmic AoE), speed 5.
  c("kenpachi", "Kenpachi Zaraki", "🪓", "🌀 Anime Legends", "huge", "melee", [2800, 380, 370, 960, 990], "#C8A800", "I want to fight the strongest!", "Kendo Final Slash"),
  // TIER [A-LIST] Edward Elric: alchemist A-list. HP 340, atk 60, range 1-2 tiles (melee), speed 10.
  c("edward_elric", "Edward Elric", "⚗️", "🌀 Anime Legends", "medium", "melee", [ 340,  60, 820, 280, 600], "#FFD700", "I'm not short, I'm fun-size!", "Alchemy Fist"),
  // TIER [A-LIST] Natsu Dragneel: Dragon-Slayer A-list. HP 360, atk 65, range 1-2 tiles (melee), speed 10.
  c("natsu", "Natsu Dragneel", "🔥", "🌀 Anime Legends", "medium", "melee", [ 360,  65, 820, 280, 600], "#FF2222", "I'm all fired up!", "Fire Dragon's Roar"),
  // TIER [TOP-TIER] Erza Scarlet: Titania top-tier. HP 1000, atk 170, range 1-2 tiles (melee), speed 8.
  c("erza", "Erza Scarlet", "⚔️", "🌀 Anime Legends", "large", "melee", [1000, 170, 720, 600, 850], "#CC0000", "I will not back down!", "Heaven's Wheel"),
  // TIER [TOP-TIER] Killua Zoldyck: Godspeed top-tier. HP 800, atk 180, range 1-2 tiles (melee), speed 20.
  c("killua", "Killua Zoldyck", "⚡", "🌀 Anime Legends", "small", "melee", [ 800, 180, 990, 560, 850], "#4169E1", "I can kill anything.", "Godspeed"),
  // TIER [COSMIC] Ryomen Sukuna: King of Curses cosmic-tier. HP 2800, atk 380, range 20 tiles (cosmic AoE), speed 5.
  c("sukuna", "Ryomen Sukuna", "👹", "🌀 Anime Legends", "huge", "melee", [2800, 380, 370, 960, 990], "#CC0000", "Bow before the King of Curses!", "Malevolent Shrine"),
  // TIER [COSMIC] Satoru Gojo: Limitless cosmic-tier. HP 2600, atk 360, range 20+ tiles (cosmic), speed 5.
  c("gojo", "Satoru Gojo", "👁️", "🌀 Anime Legends", "large", "indirect", [2600, 360, 450, 900, 990], "#FFFFFF", "Throughout Heaven and Earth, I alone am honored.", "Hollow Purple"),
  // TIER [COSMIC] Escanor: high-noon cosmic-tier. HP 2800, atk 420, range 20+ tiles (cosmic), speed 5.
  c("escanor", "Escanor", "☀️", "🌀 Anime Legends", "huge", "indirect", [2800, 420, 370, 960, 990], "#FF8C00", "Who decided that?! The sun always rises!", "The One"),

  // ─── More 🦸 COMICS & MOVIES ─────────────────────────────────────────────────
  // TIER [A-LIST] Wolverine: healing-factor A-list. HP 400, atk 70, range 1-2 tiles (melee), speed 8.
  c("wolverine_x", "Wolverine", "🦖", "🦸 Comics & Movies", "large", "melee", [ 400,  70, 820, 280, 600], "#FFD700", "I'm the best at what I do!", "Berserker Barrage"),
  // TIER [TOP-TIER] Magneto: magnetism top-tier. HP 950, atk 180, range 10-15 tiles (AoE long), speed 8.
  c("magneto", "Magneto", "🧲", "🦸 Comics & Movies", "large", "indirect", [ 950, 180, 720, 600, 850], "#CC0000", "I am the Master of Magnetism!", "Magnetic Field"),
  // TIER [A-LIST] The Joker: Clown-Prince A-list. HP 280, atk 60, range 6-10 tiles (AoE), speed 10.
  c("joker", "The Joker", "🃏", "🦸 Comics & Movies", "medium", "indirect", [ 280,  60, 820, 280, 600], "#800080", "Why so serious?", "Ha Ha Havoc"),
  // TIER [A-LIST] Harley Quinn: trickster A-list. HP 280, atk 55, range 1-2 tiles (melee), speed 10.
  c("harley_quinn", "Harley Quinn", "💕", "🦸 Comics & Movies", "medium", "melee", [ 280,  55, 820, 280, 600], "#CC0000", "Puddin'! Time to play!", "Mallet Mayhem"),
  // TIER [TOP-TIER] Scarlet Witch: Chaos-Magic top-tier. HP 1000, atk 200, range 10-15 tiles (AoE long), speed 8.
  c("scarlet_witch", "Scarlet Witch", "🔴", "🦸 Comics & Movies", "large", "indirect", [1000, 200, 720, 600, 850], "#CC0000", "I rewrote the universe!", "Chaos Magic"),
  // TIER [TOP-TIER] Doctor Strange: Sorcerer Supreme top-tier. HP 950, atk 180, range 10-15 tiles (AoE long), speed 8.
  c("dr_strange", "Doctor Strange", "🔮", "🦸 Comics & Movies", "large", "indirect", [ 950, 180, 720, 600, 850], "#4B0082", "Dormammu, I've come to bargain.", "Time Stone"),
  // TIER [A-LIST] Ant-Man: size-shifter A-list. HP 260, atk 55, range 1-2 tiles (melee), speed 14.
  c("ant_man", "Ant-Man", "🐜", "🦸 Comics & Movies", "tiny", "melee", [ 260,  55, 900, 200, 600], "#CC0000", "I hope this works!", "Giant Mode"),
  // TIER [COSMIC] Groot: I-am-Groot cosmic-tier. HP 2200, atk 200, range 20 tiles (cosmic AoE), speed 5.
  c("groot", "Groot", "🌿", "🦸 Comics & Movies", "colossal", "melee", [2200, 200, 330, 990, 990], "#8B4513", "I am Groot.", "Root Rampage"),
  // TIER [A-LIST] Rocket Raccoon: raccoon-A-list-gunner. HP 240, atk 50, range 6-10 tiles (ranged), speed 14.
  c("rocket", "Rocket Raccoon", "🦝", "🦸 Comics & Movies", "small", "ranged", [ 240,  50, 840, 240, 600], "#C0A070", "I'm going to need that arm.", "Quad Blaster"),
  // TIER [TOP-TIER] Hela: Asgardian death-god top-tier. HP 1100, atk 170, range 1-2 tiles (melee), speed 8.
  c("hela", "Hela", "💀", "🦸 Comics & Movies", "large", "melee", [1100, 170, 720, 600, 850], "#1C1C1C", "Kneel before me!", "Necrosword Storm"),
  // TIER [A-LIST] Hawkeye: archer A-list. HP 280, atk 50, range 6-10 tiles (ranged), speed 10.
  c("hawkeye", "Hawkeye", "🎯", "🦸 Comics & Movies", "medium", "ranged", [ 280,  50, 800, 280, 600], "#4B0082", "Barton never misses.", "Trick Arrow Volley"),
  // TIER [A-LIST] War Machine: armoured A-list. HP 400, atk 65, range 6-10 tiles (ranged), speed 8.
  c("war_machine", "War Machine", "🤖", "🦸 Comics & Movies", "large", "ranged", [ 400,  65, 800, 280, 600], "#4A4A4A", "Rhodey, staying in the fight!", "Minigun Barrage"),
  // TIER [A-LIST] Moon Knight: Khonshu A-list. HP 380, atk 60, range 1-2 tiles (melee), speed 8.
  c("moonknight", "Moon Knight", "🌕", "🦸 Comics & Movies", "large", "melee", [ 380,  60, 820, 280, 600], "#FFFFFF", "Mr. Knight at your service.", "Crescent Blades"),
  // TIER [TOP-TIER] Shazam: lightning top-tier. HP 1100, atk 180, range 10-15 tiles (AoE long), speed 8.
  c("shazam", "Shazam", "⚡", "🦸 Comics & Movies", "large", "indirect", [1100, 180, 720, 600, 850], "#CC0000", "SHAZAM!", "Lightning of Zeus"),
  // TIER [TOP-TIER] Aquaman: Atlantean top-tier. HP 1100, atk 150, range 1-2 tiles (melee), speed 6.
  c("aquaman", "Aquaman", "🌊", "🦸 Comics & Movies", "huge", "melee", [1100, 150, 640, 660, 850], "#FFD700", "The sea is not a graveyard!", "Trident of Poseidon"),
  // TIER [A-LIST] The Flash: speedster A-list. HP 320, atk 50, range 1-2 tiles (melee), speed 20.
  c("flash", "The Flash", "💨", "🦸 Comics & Movies", "medium", "melee", [ 320,  50, 990, 280, 600], "#CC0000", "I'm the fastest man alive!", "Speed Force"),
  // TIER [A-LIST] Cyclops: optic-blast A-list. HP 360, atk 75, range 6-10 tiles (ranged), speed 8.
  c("cyclops", "Cyclops", "💥", "🦸 Comics & Movies", "large", "ranged", [ 360,  75, 800, 280, 600], "#CC0000", "X-Men, ATTACK!", "Optic Blast"),
  // TIER [TOP-TIER] Jean Grey: Phoenix top-tier. HP 1000, atk 200, range 10-15 tiles (AoE long), speed 8.
  c("jean_grey", "Jean Grey", "💗", "🦸 Comics & Movies", "large", "indirect", [1000, 200, 720, 600, 850], "#FF0000", "The Phoenix rises!", "Phoenix Force"),
  // TIER [TOP-TIER] Spawn: hellspawn top-tier. HP 1000, atk 170, range 1-2 tiles (melee), speed 8.
  c("spawn", "Spawn", "💀", "🦸 Comics & Movies", "large", "melee", [1000, 170, 720, 600, 850], "#228B22", "I am Hellspawn!", "Necroplasm"),
  // TIER [TOP-TIER] Ghost Rider: spirit-of-vengeance top-tier. HP 1000, atk 180, range 1-2 tiles (melee), speed 8.
  c("ghost_rider", "Ghost Rider", "🔥", "🦸 Comics & Movies", "large", "melee", [1000, 180, 720, 600, 850], "#FF4500", "YOUR SOUL IS MINE!", "Penance Stare"),

  // ─── More 🎮 VIDEO GAMES ─────────────────────────────────────────────────────
  // TIER [A-LIST] Solid Snake: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("solid_snake", "Solid Snake", "🐍", "🎮 Video Games", "medium", "ranged", [ 300,  55, 800, 280, 600], "#4A4A4A", "Kept you waiting, huh?", "CQC Takedown"),
  // TIER [TOP-TIER] Dante: Nephilim top-tier. HP 1100, atk 180, range 1-2 tiles (melee), speed 8.
  c("dante_dmc", "Dante", "🔴", "🎮 Video Games", "large", "melee", [1100, 180, 720, 600, 850], "#FFFFFF", "Let's rock, baby!", "Jackpot"),
  // TIER [TOP-TIER] Bayonetta: Umbra Witch top-tier. HP 1000, atk 180, range 1-2 tiles (melee), speed 8.
  c("bayonetta", "Bayonetta", "💃", "🎮 Video Games", "large", "melee", [1000, 180, 720, 600, 850], "#1C1C1C", "Oh, so you noticed.", "Witch Time"),
  // TIER [TOP-TIER] Vergil: Yamato top-tier. HP 1100, atk 200, range 1-2 tiles (melee), speed 8.
  c("vergil", "Vergil", "💙", "🎮 Video Games", "large", "melee", [1100, 200, 720, 600, 850], "#1C3A8C", "Power! Give me more power!", "Judgement Cut"),
  // TIER [B-LIST] Kirby: tiny melee. HP 38, atk 14, range 1-2 tiles (melee), speed 14.
  c("kirby", "Kirby", "💗", "🎮 Video Games", "tiny", "melee", [  38,  14, 860, 120, 450], "#FF69B4", "Hiii!", "Inhale Combo"),
  // TIER [B-LIST] Meta Knight: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("meta_knight", "Meta Knight", "🌑", "🎮 Video Games", "small", "melee", [  83,  20, 820, 160, 450], "#1C1C4A", "Surrender or prepare to fight.", "Galaxia Darkness"),
  // TIER [A-LIST] King Dedede: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("king_dedede", "King Dedede", "🐧", "🎮 Video Games", "large", "melee", [ 480,  72, 820, 280, 600], "#1C3A8C", "I'M THE KING! BOW!", "Hammer Twirl"),
  // TIER [A-LIST] Ryu: world-warrior A-list. HP 360, atk 65, range 1-2 tiles (melee), speed 10.
  c("ryu_sf", "Ryu", "🥋", "🎮 Video Games", "medium", "melee", [ 360,  65, 820, 280, 600], "#FFFFFF", "The answer lies in battle.", "Hadouken"),
  // TIER [A-LIST] Akuma: demon A-list. HP 380, atk 75, range 1-2 tiles (melee), speed 8.
  c("akuma", "Akuma", "💀", "🎮 Video Games", "large", "melee", [ 380,  75, 820, 280, 600], "#CC0000", "I am the master of the fist!", "Shun Goku Satsu"),
  // TIER [A-LIST] Chun-Li: world-warrior A-list. HP 340, atk 60, range 1-2 tiles (melee), speed 10.
  c("chun_li", "Chun-Li", "👑", "🎮 Video Games", "medium", "melee", [ 340,  60, 820, 280, 600], "#1E90FF", "Strongest woman in the world!", "Spinning Bird Kick"),
  // TIER [A-LIST] Genji: cyber-ninja A-list. HP 320, atk 65, range 1-2 tiles (melee), speed 10.
  c("genji", "Genji", "🤖", "🎮 Video Games", "medium", "melee", [ 320,  65, 900, 280, 600], "#7CFC00", "The dragon becomes me!", "Dragonblade"),
  // TIER [A-LIST] Tracer: blink A-list. HP 240, atk 50, range 6-10 tiles (ranged), speed 18.
  c("tracer", "Tracer", "💛", "🎮 Video Games", "small", "ranged", [ 240,  50, 990, 240, 600], "#E8C000", "Cheers, luv, the cavalry's here!", "Blink Burst"),
  // TIER [A-LIST] D.Va: mech-pilot A-list. HP 400, atk 70, range 6-10 tiles (ranged), speed 8.
  c("dva", "D.Va", "💗", "🎮 Video Games", "large", "ranged", [ 400,  70, 800, 280, 600], "#FF69B4", "D.Va is back online!", "Self-Destruct"),
  // TIER [COSMIC] The Lich King: Lich-King cosmic-tier. HP 2200, atk 280, range 20 tiles (cosmic AoE), speed 5.
  c("arthas", "The Lich King", "💀", "🎮 Video Games", "huge", "melee", [2200, 280, 370, 960, 990], "#1C1C4A", "Frostmourne hungers!", "Frostmourne Slash"),
  // TIER [A-LIST] Geralt of Rivia: Witcher A-list. HP 400, atk 70, range 1-2 tiles (melee), speed 8.
  c("geralt", "Geralt of Rivia", "⚔️", "🎮 Video Games", "large", "melee", [ 400,  70, 820, 280, 600], "#FFFFFF", "Wind's howling.", "Igni Sign"),
  // TIER [A-LIST] Ciri: elder-blood A-list. HP 350, atk 65, range 1-2 tiles (melee), speed 10.
  c("ciri", "Ciri", "🌀", "🎮 Video Games", "medium", "melee", [ 350,  65, 820, 280, 600], "#FFFFFF", "I am death!", "Blink Strike"),
  // TIER [A-LIST] Ezio Auditore: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("ezio", "Ezio Auditore", "🦅", "🎮 Video Games", "medium", "melee", [ 300,  55, 820, 280, 600], "#FFFFFF", "Requiescat in pace.", "Hidden Blade"),
  // TIER [TOP-TIER] Ganondorf: King of Evil top-tier. HP 1100, atk 170, range 10-15 tiles (AoE long), speed 6.
  c("ganondorf", "Ganondorf", "😈", "🎮 Video Games", "huge", "indirect", [1100, 170, 640, 660, 850], "#8B4513", "I am the King of Evil!", "Phantom Ganon"),
  // TIER [B-LIST] Mega Man: small ranged. HP 83, atk 20, range 6-10 tiles (ranged), speed 14.
  c("mega_man", "Mega Man", "🤖", "🎮 Video Games", "small", "ranged", [  83,  20, 800, 160, 450], "#1E90FF", "Dr. Light, I'll stop Wily!", "Mega Buster"),
  // TIER [A-LIST] Arthur Morgan: large ranged. HP 480, atk 72, range 6-10 tiles (ranged), speed 8.
  c("arthur_morgan", "Arthur Morgan", "🤠", "🎮 Video Games", "large", "ranged", [ 480,  72, 800, 280, 600], "#8B6914", "We do what we can.", "Dead Eye"),
  // TIER [A-LIST] Joel Miller: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("joel", "Joel Miller", "🪓", "🎮 Video Games", "large", "melee", [ 480,  72, 820, 280, 600], "#6B4226", "You'd do the same.", "Survivor's Wrath"),
  // TIER [A-LIST] Ellie Williams: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("ellie_lg", "Ellie Williams", "🔪", "🎮 Video Games", "medium", "melee", [ 300,  55, 820, 280, 600], "#8B4513", "I'm okay with this.", "Last of Us Strike"),
  // TIER [COSMIC] Master Hand: abstract cosmic-tier. HP 2800, atk 340, range 20+ tiles (cosmic), speed 5.
  c("master_hand", "Master Hand", "👋", "🎮 Video Games", "colossal", "indirect", [2800, 340, 330, 990, 990], "#FFFFFF", "You cannot defeat me!", "Finger Laser"),
  // TIER [A-LIST] Zero: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("zero_mm", "Zero", "⚔️", "🎮 Video Games", "medium", "melee", [ 300,  55, 820, 280, 600], "#CC0000", "I will follow the true warrior's path!", "Ryuenjin"),
  // TIER [A-LIST] 2B: android A-list. HP 360, atk 70, range 1-2 tiles (melee), speed 10.
  c("2b", "2B", "🗡️", "🎮 Video Games", "medium", "melee", [ 360,  70, 820, 280, 600], "#F5F5DC", "Glory to mankind.", "Pod Barrage"),

  // ─── More 🌩️ GODS & MYTHS ────────────────────────────────────────────────────
  // TIER [TOP-TIER] Apollo: sun-god top-tier. HP 1000, atk 170, range 10-15 tiles (long-range), speed 8.
  c("apollo", "Apollo", "☀️", "🌩️ Gods & Myths", "large", "ranged", [1000, 170, 700, 600, 850], "#FFD700", "Feel the wrath of the god of light!", "Solar Arrow"),
  // TIER [TOP-TIER] Artemis: moon huntress top-tier. HP 1000, atk 170, range 10-15 tiles (long-range), speed 8.
  c("artemis", "Artemis", "🌙", "🌩️ Gods & Myths", "large", "ranged", [1000, 170, 700, 600, 850], "#C0C0C0", "The hunt begins!", "Silver Moonbow"),
  // TIER [TOP-TIER] Athena: war-wisdom top-tier. HP 1000, atk 160, range 10-15 tiles (AoE long), speed 8.
  c("athena", "Athena", "⚖️", "🌩️ Gods & Myths", "large", "indirect", [1000, 160, 720, 600, 850], "#C0C0C0", "Wisdom and warfare are one!", "Aegis Shield"),
  // TIER [TOP-TIER] Hades: underworld top-tier. HP 1100, atk 180, range 10-15 tiles (AoE long), speed 8.
  c("hades_god", "Hades", "💀", "🌩️ Gods & Myths", "large", "indirect", [1100, 180, 720, 600, 850], "#1C1C1C", "The Underworld is MY domain!", "Soul Rip"),
  // TIER [A-LIST] Hermes: messenger A-list. HP 260, atk 50, range 1-2 tiles (melee), speed 18.
  c("hermes", "Hermes", "💨", "🌩️ Gods & Myths", "medium", "melee", [ 260,  50, 990, 280, 600], "#FFD700", "I deliver more than messages!", "Winged Sprint"),
  // TIER [A-LIST] Hephaestus: forge-god A-list. HP 400, atk 65, range 1-2 tiles (melee), speed 8.
  c("hephaestus", "Hephaestus", "🔨", "🌩️ Gods & Myths", "large", "melee", [ 400,  65, 820, 280, 600], "#FF4500", "The forge never sleeps!", "Forge Hammer"),
  // TIER [TOP-TIER] Susanoo-no-Mikoto: storm-god top-tier. HP 1100, atk 180, range 1-2 tiles (melee), speed 6.
  c("susanoo", "Susanoo-no-Mikoto", "⚔️", "🌩️ Gods & Myths", "huge", "melee", [1100, 180, 640, 660, 850], "#4169E1", "Storm god descends!", "Storm Smite"),
  // TIER [TOP-TIER] Amaterasu: sun-goddess top-tier. HP 1000, atk 170, range 10-15 tiles (AoE long), speed 8.
  c("amaterasu", "Amaterasu", "☀️", "🌩️ Gods & Myths", "large", "indirect", [1000, 170, 720, 600, 850], "#FFD700", "The sun goddess commands you to kneel!", "Divine Mirror"),
  // TIER [COSMIC] Vishnu: preserver-god cosmic-tier. HP 3000, atk 360, range 20+ tiles (cosmic), speed 5.
  c("vishnu", "Vishnu", "💙", "🌩️ Gods & Myths", "colossal", "indirect", [3000, 360, 330, 990, 990], "#1E90FF", "The preserver has arrived!", "Sudarshana Chakra"),
  // TIER [COSMIC] Shiva: destroyer-god cosmic-tier. HP 3500, atk 400, range 20 tiles (cosmic AoE), speed 5.
  c("shiva", "Shiva", "🔱", "🌩️ Gods & Myths", "colossal", "melee", [3500, 400, 330, 990, 990], "#1E90FF", "I am the destroyer of worlds!", "Third Eye Blast"),
  // TIER [A-LIST] Ganesh: remover-of-obstacles A-list. HP 380, atk 60, range 6-10 tiles (AoE), speed 8.
  c("ganesh", "Ganesh", "🐘", "🌩️ Gods & Myths", "large", "indirect", [ 380,  60, 820, 280, 600], "#FF8C00", "Obstacles fall before the remover of obstacles!", "Tusk Throw"),
  // TIER [A-LIST] Morrigan: Phantom-Queen A-list. HP 360, atk 60, range 6-10 tiles (AoE), speed 8.
  c("morrigan", "Morrigan", "🐦", "🌩️ Gods & Myths", "large", "indirect", [ 360,  60, 820, 280, 600], "#1C1C1C", "The Phantom Queen chooses who falls!", "Crow Storm"),
  // TIER [A-LIST] Bast: cat-goddess A-list. HP 320, atk 55, range 1-2 tiles (melee), speed 8.
  c("bast", "Bast", "🐱", "🌩️ Gods & Myths", "large", "melee", [ 320,  55, 820, 280, 600], "#FFD700", "I am the divine protector!", "Cat Scratch Fury"),
  // TIER [A-LIST] Hecate: magic-goddess A-list. HP 320, atk 65, range 6-10 tiles (AoE), speed 8.
  c("hecate", "Hecate", "🌙", "🌩️ Gods & Myths", "large", "indirect", [ 320,  65, 820, 280, 600], "#9400D3", "I hold the keys to the crossroads!", "Triple Moon Curse"),
  // TIER [COSMIC] Thor (True Form): true-form thunder god. HP 3000, atk 380, range 20+ tiles (cosmic), speed 5.
  c("thor_thunder", "Thor (True Form)", "⚡", "🌩️ Gods & Myths", "colossal", "indirect", [3000, 380, 330, 990, 990], "#4488FF", "THUNDER BEYOND ALL THUNDER!", "Mjolnir Tempest"),

  // ─── More 🏛️ HISTORY ICONS ───────────────────────────────────────────────────
  // TIER [A-LIST] Attila the Hun: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("attila", "Attila the Hun", "🏇", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "The world trembles at my hoofbeats!", "Hun Stampede"),
  // TIER [A-LIST] Charlemagne: emperor A-list. HP 380, atk 60, range 1-2 tiles (melee), speed 8.
  c("charlemagne", "Charlemagne", "⚔️", "🏛️ History Icons", "large", "melee", [ 380,  60, 820, 280, 600], "#FFD700", "By the sword and the cross!", "Holy Empire"),
  // TIER [A-LIST] Richard the Lionheart: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("richard", "Richard the Lionheart", "🦁", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#CC0000", "God and my right!", "Crusader's Charge"),
  // TIER [A-LIST] Saladin: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("saladin", "Saladin", "🌙", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#228B22", "Honor, justice, and victory!", "Scimitar Storm"),
  // TIER [A-LIST] Crazy Horse: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("crazy_horse", "Crazy Horse", "🦅", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "Hokahey! Today is a good day!", "Battle Spirit"),
  // TIER [A-LIST] Duke of Wellington: large ranged. HP 480, atk 72, range 6-10 tiles (ranged), speed 8.
  c("wellington", "Duke of Wellington", "🎩", "🏛️ History Icons", "large", "ranged", [ 480,  72, 800, 280, 600], "#CC0000", "Hard pounding, gentlemen!", "Rifle Volley"),
  // TIER [A-LIST] Tokugawa Ieyasu: large indirect. HP 480, atk 72, range 6-10 tiles (AoE), speed 8.
  c("tokugawa", "Tokugawa Ieyasu", "⛩️", "🏛️ History Icons", "large", "indirect", [ 480,  72, 820, 280, 600], "#8B1A1A", "The strong endure all!", "Shogunate"),
  // TIER [A-LIST] Mehmed II: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("mehmed", "Mehmed II", "🏹", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#228B22", "Constantinople falls!", "Ottoman Cannon"),
  // TIER [A-LIST] Cyrus the Great: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("cyrus", "Cyrus the Great", "👑", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#FFD700", "The Persian Empire bows to no weakness!", "Imperial March"),
  // TIER [A-LIST] George Washington: large ranged. HP 480, atk 72, range 6-10 tiles (ranged), speed 8.
  c("washington", "George Washington", "🇺🇸", "🏛️ History Icons", "large", "ranged", [ 480,  72, 800, 280, 600], "#4169E1", "We fight for freedom!", "Valley Forge"),
  // TIER [A-LIST] Roland: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("rolande", "Roland", "⚔️", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#4169E1", "The horn of Roland sounds!", "Durendal Strike"),
  // TIER [A-LIST] Hernán Cortés: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("cortes", "Hernán Cortés", "⚔️", "🏛️ History Icons", "medium", "melee", [ 300,  55, 820, 280, 600], "#C0C0C0", "The conquest has only begun!", "Conquistador Rush"),
  // TIER [A-LIST] Cleopatra VII: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("cleopatra7", "Cleopatra VII", "👸", "🏛️ History Icons", "medium", "indirect", [ 300,  55, 820, 280, 600], "#FFD700", "I am Egypt itself!", "Nile's Curse"),
  // TIER [A-LIST] William the Conqueror: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("william_tell2", "William the Conqueror", "⚔️", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#FFD700", "England is mine now!", "Norman Conquest"),
  // TIER [A-LIST] Kublai Khan: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("kublai", "Kublai Khan", "🏇", "🏛️ History Icons", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "The horde never retreats!", "Golden Horde"),

  // ─── More ⚔️ LEGENDS ─────────────────────────────────────────────────────────
  // TIER [A-LIST] Sir Gawain: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("gawain", "Sir Gawain", "☀️", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#FFD700", "At high noon my strength triples!", "Solar Blade"),
  // TIER [A-LIST] Sir Galahad: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("galahad", "Sir Galahad", "✨", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#FFFFFF", "Only the pure may claim the Grail!", "Holy Smite"),
  // TIER [A-LIST] Sinbad the Sailor: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("sinbad", "Sinbad the Sailor", "⚓", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#00CED1", "Seven voyages — this is the eighth!", "Sea Storm"),
  // TIER [A-LIST] Pecos Bill: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("pecos_bill", "Pecos Bill", "🤠", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#8B4513", "I rode a tornado! You're nothing!", "Wild West Fury"),
  // TIER [A-LIST] John Henry: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("john_henry", "John Henry", "🔨", "⚔️ Legends", "large", "melee", [ 480,  72, 820, 280, 600], "#4A2C0A", "Steel drivin' man, DRIVE!", "Steel Hammer"),
  // TIER [A-LIST] Ali Baba: small melee. HP 165, atk 39, range 1-2 tiles (melee), speed 14.
  c("ali_baba", "Ali Baba", "💎", "⚔️ Legends", "small", "melee", [ 165,  39, 860, 240, 600], "#DAA520", "Open sesame! ...to pain!", "Treasure Blitz"),
  // TIER [A-LIST] Scheherazade: medium indirect. HP 300, atk 55, range 6-10 tiles (AoE), speed 10.
  c("scheherazade", "Scheherazade", "📖", "⚔️ Legends", "medium", "indirect", [ 300,  55, 820, 280, 600], "#9370DB", "A thousand and one nights of devastation!", "Arabian Storm"),
  // TIER [A-LIST] Hiawatha: medium ranged. HP 300, atk 55, range 6-10 tiles (ranged), speed 10.
  c("hiawatha", "Hiawatha", "🏹", "⚔️ Legends", "medium", "ranged", [ 300,  55, 800, 280, 600], "#8B4513", "For the people of the Iroquois!", "Arrow Rain"),
  // TIER [A-LIST] Macha: large indirect. HP 480, atk 72, range 6-10 tiles (AoE), speed 8.
  c("macha", "Macha", "🐎", "⚔️ Legends", "large", "indirect", [ 480,  72, 820, 280, 600], "#CC0000", "The war goddess rides!", "Battle Frenzy"),
  // TIER [A-LIST] Hua Mulan: medium melee. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("mulan_fa", "Hua Mulan", "🌸", "⚔️ Legends", "medium", "melee", [ 300,  55, 820, 280, 600], "#DC143C", "I'll fight in my father's place!", "Dragon Sword"),

  // ─── 🥊 SPORTS LEGENDS ────────────────────────────────────────────────────────
  // TIER [A-LIST] Muhammad Ali: Greatest A-list. HP 360, atk 60, range 1-2 tiles (melee), speed 8.
  c("ali", "Muhammad Ali", "🥊", "🥊 Sports Legends", "large", "melee", [ 360,  60, 800, 280, 600], "#FFD700", "Float like a butterfly, sting like a bee!", "Rumble in the Jungle"),
  // TIER [A-LIST] Michael Jordan: GOAT A-list. HP 320, atk 50, range 1-2 tiles (melee), speed 8.
  c("jordan", "Michael Jordan", "🏀", "🥊 Sports Legends", "large", "melee", [ 320,  50, 820, 280, 600], "#CC0000", "I can't accept not trying.", "Slam Dunk"),
  // TIER [A-LIST] Pelé: footballer A-list. HP 300, atk 50, range 1-2 tiles (melee), speed 10.
  c("pele", "Pelé", "⚽", "🥊 Sports Legends", "medium", "melee", [ 300,  50, 820, 280, 600], "#228B22", "The beautiful game is NOT a spectator sport!", "Bicycle Kick"),
  // TIER [A-LIST] Babe Ruth: Bambino A-list. HP 340, atk 60, range 1-2 tiles (melee), speed 8.
  c("babe_ruth", "Babe Ruth", "⚾", "🥊 Sports Legends", "large", "melee", [ 340,  60, 820, 280, 600], "#1E90FF", "Never let the fear of striking out stop you!", "Grand Slam"),
  // TIER [A-LIST] Usain Bolt: sprinter A-list. HP 280, atk 40, range 1-2 tiles (melee), speed 20.
  c("usain", "Usain Bolt", "💨", "🥊 Sports Legends", "medium", "melee", [ 280,  40, 990, 280, 600], "#FFD700", "I am a legend!", "Lightning Sprint"),
  // TIER [A-LIST] Bruce Lee: Be-water A-list. HP 350, atk 80, range 1-2 tiles (melee), speed 10.
  c("bruce_lee", "Bruce Lee", "🥋", "🥊 Sports Legends", "medium", "melee", [ 350,  80, 900, 280, 600], "#FFD700", "Be water, my friend.", "One Inch Punch"),
  // TIER [A-LIST] Mike Tyson: Iron-Mike A-list. HP 400, atk 75, range 1-2 tiles (melee), speed 8.
  c("tyson", "Mike Tyson", "🥊", "🥊 Sports Legends", "large", "melee", [ 400,  75, 820, 280, 600], "#1C1C1C", "Everyone has a plan until they get punched in the face!", "Iron Mike"),
  // TIER [A-LIST] Wayne Gretzky: Great One A-list. HP 300, atk 50, range 6-10 tiles (ranged), speed 10.
  c("gretzky", "Wayne Gretzky", "🏒", "🥊 Sports Legends", "medium", "ranged", [ 300,  50, 800, 280, 600], "#1C1C1C", "You miss 100% of the shots you don't take.", "Slapshot"),
  // TIER [A-LIST] Serena Williams: tennis A-list. HP 320, atk 55, range 6-10 tiles (ranged), speed 10.
  c("serena", "Serena Williams", "🎾", "🥊 Sports Legends", "medium", "ranged", [ 320,  55, 800, 280, 600], "#FFD700", "I am not the richest or grandest. But I'm the strongest!", "Grand Slam Serve"),
  // TIER [A-LIST] Cristiano Ronaldo: footballer A-list. HP 320, atk 50, range 1-2 tiles (melee), speed 8.
  c("ronaldo", "Cristiano Ronaldo", "⚽", "🥊 Sports Legends", "large", "melee", [ 320,  50, 820, 280, 600], "#CC0000", "SIIIUU!", "Header Smash"),

  // ─── More 🚀 FANTASY & SCI-FI ─────────────────────────────────────────────────
  // TIER [TOP-TIER] Gandalf the White: Istari top-tier. HP 1000, atk 180, range 10-15 tiles (AoE long), speed 8.
  c("gandalf", "Gandalf the White", "🧙", "🚀 Fantasy & Sci-Fi", "large", "indirect", [1000, 180, 720, 600, 850], "#FFFFFF", "YOU SHALL NOT PASS!", "Glamdring Strike"),
  // TIER [A-LIST] Aragorn: Numenorean A-list. HP 400, atk 65, range 1-2 tiles (melee), speed 8.
  c("aragorn", "Aragorn", "⚔️", "🚀 Fantasy & Sci-Fi", "large", "melee", [ 400,  65, 820, 280, 600], "#C0C0C0", "For Frodo!", "Andúril Slash"),
  // TIER [A-LIST] Legolas: elven-archer A-list. HP 240, atk 55, range 6-10 tiles (ranged), speed 10.
  c("legolas", "Legolas", "🏹", "🚀 Fantasy & Sci-Fi", "medium", "ranged", [ 240,  55, 900, 280, 600], "#C0C0C0", "They're taking the hobbits!", "Elven Arrow Storm"),
  // TIER [COSMIC] Sauron: dark-lord cosmic-tier. HP 3000, atk 360, range 20+ tiles (cosmic), speed 5.
  c("sauron", "Sauron", "😈", "🚀 Fantasy & Sci-Fi", "colossal", "indirect", [3000, 360, 330, 990, 990], "#FF4500", "I see you.", "One Ring Corruption"),
  // TIER [COSMIC] The Balrog: Maia-flame cosmic-tier. HP 2600, atk 320, range 20 tiles (cosmic AoE), speed 5.
  c("balrog", "The Balrog", "🔥", "🚀 Fantasy & Sci-Fi", "colossal", "melee", [2600, 320, 330, 990, 990], "#FF2200", "FIRE AND SHADOW!", "Flame Whip"),
  // TIER [TOP-TIER] Master Yoda: grandmaster top-tier. HP 900, atk 200, range 10-15 tiles (AoE long), speed 14.
  c("yoda", "Master Yoda", "💚", "🚀 Fantasy & Sci-Fi", "small", "indirect", [ 900, 200, 760, 560, 850], "#228B22", "Do or do not, there is no try.", "Force Mastery"),
  // TIER [TOP-TIER] Palpatine: Sith Lord top-tier. HP 950, atk 200, range 10-15 tiles (AoE long), speed 8.
  c("palpatine", "Palpatine", "⚡", "🚀 Fantasy & Sci-Fi", "large", "indirect", [ 950, 200, 720, 600, 850], "#1C1C1C", "UNLIMITED POWER!", "Force Lightning"),
  // TIER [COSMIC] Alien Queen: hive-queen cosmic-tier. HP 2400, atk 280, range 20 tiles (cosmic AoE), speed 5.
  c("alien_queen", "Alien Queen", "👾", "🚀 Fantasy & Sci-Fi", "colossal", "melee", [2400, 280, 330, 990, 990], "#1A1A2E", "HISSSSSS!!!", "Xenomorph Swarm"),
  // TIER [A-LIST] T-1000: liquid-metal A-list. HP 380, atk 80, range 1-2 tiles (melee), speed 8.
  c("t1000", "T-1000", "🌊", "🚀 Fantasy & Sci-Fi", "large", "melee", [ 380,  80, 820, 280, 600], "#C0C0C0", "Have you seen this boy?", "Liquid Metal Shift"),
  // TIER [A-LIST] RoboCop: cyborg A-list. HP 400, atk 70, range 6-10 tiles (ranged), speed 8.
  c("robocop", "RoboCop", "🤖", "🚀 Fantasy & Sci-Fi", "large", "ranged", [ 400,  70, 800, 280, 600], "#808080", "Dead or alive, you're coming with me.", "Auto-9 Barrage"),
  // TIER [TOP-TIER] Agent Smith: rogue-AI top-tier. HP 1000, atk 160, range 1-2 tiles (melee), speed 8.
  c("agent_smith", "Agent Smith", "🕶️", "🚀 Fantasy & Sci-Fi", "large", "melee", [1000, 160, 720, 600, 850], "#1C1C1C", "Mr. Anderson. We meet again.", "Smith Army"),
  // TIER [A-LIST] Ellen Ripley: tough-survivor A-list. HP 300, atk 50, range 6-10 tiles (ranged), speed 10.
  c("ripley", "Ellen Ripley", "🚀", "🚀 Fantasy & Sci-Fi", "medium", "ranged", [ 300,  50, 800, 280, 600], "#808080", "Get away from her, you BITCH!", "Pulse Rifle"),
  // TIER [COSMIC] Mind Flayer: interdimensional cosmic-tier. HP 2200, atk 280, range 20+ tiles (cosmic), speed 5.
  c("mind_flayer", "Mind Flayer", "👾", "🚀 Fantasy & Sci-Fi", "colossal", "indirect", [2200, 280, 330, 990, 990], "#9400D3", "The Mind Flayer CONSUMES!", "Psychic Crush"),
  // TIER [A-LIST] Frodo Baggins: small melee. HP 165, atk 39, range 1-2 tiles (melee), speed 14.
  c("frodo", "Frodo Baggins", "💍", "🚀 Fantasy & Sci-Fi", "small", "melee", [ 165,  39, 860, 240, 600], "#B8860B", "I will take the Ring to Mordor!", "Sting Jab"),
  // TIER [COSMIC] Galadriel: Ring-touched cosmic-tier. HP 2000, atk 220, range 20+ tiles (cosmic), speed 5.
  c("galadriel", "Galadriel", "✨", "🚀 Fantasy & Sci-Fi", "large", "indirect", [2000, 220, 450, 900, 990], "#F5F5F5", "I pass the test. I will diminish.", "Mirror of Fate"),

  // ─── More 💥 HEROES & VILLAINS ───────────────────────────────────────────────
  // TIER [TOP-TIER] Silver Surfer: Power-Cosmic top-tier. HP 1100, atk 190, range 10-15 tiles (long-range), speed 8.
  c("silver_surfer", "Silver Surfer", "💫", "💥 Heroes & Villains", "large", "ranged", [1100, 190, 900, 600, 850], "#C0C0C0", "For the Power Cosmic!", "Power Cosmic Wave"),
  // TIER [COSMIC] Galactus: cosmic-tier, planet-eater. HP 3500, atk 400, range 20+ tiles (cosmic), speed 5.
  c("galactus", "Galactus", "😈", "💥 Heroes & Villains", "colossal", "indirect", [3500, 400, 330, 990, 990], "#9400D3", "I hunger!", "World Devourer"),
  // TIER [TOP-TIER] Doctor Doom: Latverian top-tier. HP 1100, atk 180, range 10-15 tiles (AoE long), speed 8.
  c("dr_doom", "Doctor Doom", "😈", "💥 Heroes & Villains", "large", "indirect", [1100, 180, 720, 600, 850], "#808080", "Doom conquers all!", "Doom's Decree"),
  // TIER [COSMIC] The Thing: rock-titan cosmic-tier. HP 2200, atk 240, range 20 tiles (cosmic AoE), speed 5.
  c("the_thing", "The Thing", "🪨", "💥 Heroes & Villains", "huge", "melee", [2200, 240, 370, 960, 990], "#FF8C00", "It's clobberin' time!", "Boulder Smash"),
  // TIER [A-LIST] Human Torch: FF A-list. HP 320, atk 70, range 6-10 tiles (ranged), speed 10.
  c("human_torch", "Human Torch", "🔥", "💥 Heroes & Villains", "medium", "ranged", [ 320,  70, 800, 280, 600], "#FF4500", "FLAME ON!", "Supernova"),
  // TIER [A-LIST] Invisible Woman: force-field A-list. HP 360, atk 60, range 6-10 tiles (AoE), speed 8.
  c("invisible_woman", "Invisible Woman", "💫", "💥 Heroes & Villains", "large", "indirect", [ 360,  60, 820, 280, 600], "#87CEEB", "I will END you.", "Force Field Crush"),
  // TIER [TOP-TIER] Professor X: telepathic top-tier. HP 800, atk 200, range 10-15 tiles (AoE long), speed 10.
  c("prof_x", "Professor X", "🧠", "💥 Heroes & Villains", "medium", "indirect", [ 800, 200, 720, 600, 850], "#4B0082", "To me, my X-Men!", "Telepathic Assault"),
  // TIER [A-LIST] Nightcrawler: teleporter A-list. HP 300, atk 55, range 1-2 tiles (melee), speed 10.
  c("nightcrawler", "Nightcrawler", "💨", "💥 Heroes & Villains", "medium", "melee", [ 300,  55, 900, 280, 600], "#1C1C4A", "BAMF!", "Teleport Strike"),
  // TIER [A-LIST] Mystique: shapeshifter A-list. HP 320, atk 60, range 1-2 tiles (melee), speed 10.
  c("mystique", "Mystique", "💙", "💥 Heroes & Villains", "medium", "melee", [ 320,  60, 820, 280, 600], "#1C6B9A", "Shape-shifting is an art.", "Shapeshifter Blitz"),
  // TIER [COSMIC] Colossus: organic-steel cosmic-tier. HP 2200, atk 220, range 20 tiles (cosmic AoE), speed 5.
  c("colossus", "Colossus", "🪨", "💥 Heroes & Villains", "huge", "melee", [2200, 220, 370, 960, 990], "#C0C0C0", "For the X-Men!", "Steel Bear Hug"),
  // TIER [COSMIC] Juggernaut: unstoppable cosmic-tier. HP 2400, atk 260, range 20 tiles (cosmic AoE), speed 5.
  c("juggernaut", "Juggernaut", "💪", "💥 Heroes & Villains", "colossal", "melee", [2400, 260, 330, 990, 990], "#CC0000", "I'm the Juggernaut, bitch!", "Unstoppable Charge"),
  // TIER [COSMIC] Sentry: million-sun cosmic-tier. HP 2400, atk 320, range 20+ tiles (cosmic), speed 5.
  c("sentry", "Sentry", "☀️", "💥 Heroes & Villains", "large", "indirect", [2400, 320, 450, 900, 990], "#FFD700", "The power of a million exploding suns!", "Solar Strike"),
  // TIER [COSMIC] Onslaught: psychic cosmic-tier. HP 3000, atk 380, range 20+ tiles (cosmic), speed 5.
  c("onslaught", "Onslaught", "😈", "💥 Heroes & Villains", "colossal", "indirect", [3000, 380, 330, 990, 990], "#4B0082", "ONSLAUGHT REIGNS SUPREME!", "Psi Tempest"),
  // TIER [TOP-TIER] Red Skull: Hydra top-tier. HP 900, atk 140, range 10-15 tiles (AoE long), speed 8.
  c("red_skull", "Red Skull", "💀", "💥 Heroes & Villains", "large", "indirect", [ 900, 140, 720, 600, 850], "#CC0000", "Hail HYDRA!", "Tesseract Blast"),
  // TIER [COSMIC] Ultron: hive-mind cosmic-tier. HP 2000, atk 240, range 20+ tiles (cosmic), speed 5.
  c("ultron", "Ultron", "🤖", "💥 Heroes & Villains", "large", "indirect", [2000, 240, 450, 900, 990], "#C0C0C0", "There are no strings on me.", "Ultron Swarm"),

  // ─── More 🤪 SILLY SQUAD ─────────────────────────────────────────────────────
  // TIER [B-LIST] Mr. T: large melee. HP 240, atk 36, range 1-2 tiles (melee), speed 8.
  c("mr_t", "Mr. T", "💪", "🤪 Silly Squad", "large", "melee", [ 240,  36, 780, 200, 450], "#FFD700", "I pity the fool!", "Gold Chain Slam"),
  // TIER [B-LIST] Chuck Norris: large melee. HP 240, atk 36, range 1-2 tiles (melee), speed 8.
  c("chuck_norris", "Chuck Norris", "🥋", "🤪 Silly Squad", "large", "melee", [ 240,  36, 780, 200, 450], "#8B4513", "I don't do push-ups, I push the Earth down.", "Roundhouse of Doom"),
  // TIER [B-LIST] Nicolas Cage: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("nicolas_cage", "Nicolas Cage", "🐝", "🤪 Silly Squad", "medium", "indirect", [ 150,  28, 780, 200, 450], "#CC0000", "NOT THE BEES! NOT THE BEES!", "Rage Cage"),
  // TIER [B-LIST] Gym Bro: large melee. HP 240, atk 36, range 1-2 tiles (melee), speed 8.
  c("gym_bro", "Gym Bro", "💪", "🤪 Silly Squad", "large", "melee", [ 240,  36, 780, 200, 450], "#FF8C00", "BRO, DO YOU EVEN LIFT?!", "Protein Slam"),
  // TIER [B-LIST] Florida Man: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("florida_man", "Florida Man", "🐊", "🤪 Silly Squad", "medium", "melee", [ 150,  28, 780, 200, 450], "#228B22", "Hold my beer.", "Florida Chaos"),
  // TIER [B-LIST] Karen Manager: small indirect. HP 83, atk 20, range 6-10 tiles (AoE), speed 14.
  c("karen", "Karen Manager", "👩", "🤪 Silly Squad", "small", "indirect", [  83,  20, 820, 160, 450], "#FF69B4", "I need to speak to your MANAGER!", "Complaint Wave"),
  // TIER [B-LIST] OK Boomer: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("boomer", "OK Boomer", "📺", "🤪 Silly Squad", "medium", "indirect", [ 150,  28, 780, 200, 450], "#D3D3D3", "OK BOOMER.", "Back in My Day"),
  // TIER [B-LIST] Landlord: medium ranged. HP 150, atk 28, range 6-10 tiles (ranged), speed 10.
  c("landlord", "Landlord", "🏠", "🤪 Silly Squad", "medium", "ranged", [ 150,  28, 760, 200, 450], "#8B6914", "Rent is due!", "Eviction Notice"),
  // TIER [MOOK/HUMAN] Social Media Influencer: small indirect. HP 55, atk 8, range 6-10 tiles (AoE), speed 14.
  c("influencer", "Social Media Influencer", "📱", "🤪 Silly Squad", "small", "indirect", [  55,   8, 700,  60, 250], "#FF69B4", "This has SO much engagement!", "Like Storm"),
  // TIER [MOOK/HUMAN] Crypto Bro: small indirect. HP 55, atk 8, range 6-10 tiles (AoE), speed 14.
  c("crypto_bro", "Crypto Bro", "📈", "🤪 Silly Squad", "small", "indirect", [  55,   8, 700,  60, 250], "#FFD700", "To the MOON!", "Rug Pull"),

  // ─── More 🦁 WILD KINGDOM ────────────────────────────────────────────────────
  // TIER [B-LIST] Narwhal: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("narwhal", "Narwhal", "🦄", "🦁 Wild Kingdom", "medium", "melee", [ 150,  28, 780, 200, 450], "#ADD8E6", "I HORN YOU!", "Tusk Charge"),
  // TIER [B-LIST] Peacock: medium indirect. HP 150, atk 28, range 6-10 tiles (AoE), speed 10.
  c("peacock", "Peacock", "🦚", "🦁 Wild Kingdom", "medium", "indirect", [ 150,  28, 780, 200, 450], "#1E90FF", "Behold my magnificence!", "Feather Barrage"),
  // TIER [B-LIST] Chameleon: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("chameleon", "Chameleon", "🦎", "🦁 Wild Kingdom", "small", "melee", [  83,  20, 820, 160, 450], "#228B22", "You didn't see me coming.", "Tongue Whip"),
  // TIER [A-LIST] Anaconda: large melee. HP 480, atk 72, range 1-2 tiles (melee), speed 8.
  c("anaconda", "Anaconda", "🐍", "🦁 Wild Kingdom", "large", "melee", [ 480,  72, 820, 280, 600], "#228B22", "You don't want none.", "Constrictor Crush"),
  // TIER [MOOK/HUMAN] Bombardier Beetle: tiny ranged. HP 25, atk 6, range 6-10 tiles (ranged), speed 14.
  c("bombardier", "Bombardier Beetle", "🐛", "🦁 Wild Kingdom", "tiny", "ranged", [  25,   6, 720,  40, 250], "#FF4500", "BOILING ACID SPRAY!", "Acid Bomb"),
  // TIER [TOP-TIER] Oarfish: huge melee. HP 2400, atk 240, range 1-2 tiles (melee), speed 6.
  c("oarfish", "Oarfish", "🐟", "🦁 Wild Kingdom", "huge", "melee", [2400, 240, 640, 660, 850], "#C0C0C0", "I am the sea serpent of legend!", "Deep Sea Slam"),
  // TIER [MOOK/HUMAN] Axolotl: tiny indirect. HP 25, atk 6, range 6-10 tiles (AoE), speed 14.
  c("axolotl", "Axolotl", "🦎", "🦁 Wild Kingdom", "tiny", "indirect", [  25,   6, 740,  40, 250], "#FF69B4", "I can regenerate anything... including pain!", "Regen Blast"),
  // TIER [B-LIST] Capybara: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("capybara", "Capybara", "🐾", "🦁 Wild Kingdom", "medium", "melee", [ 150,  28, 780, 200, 450], "#D2B48C", "The most peaceful... until now.", "Chill Stomp"),
  // TIER [B-LIST] Giant Tarantula: medium melee. HP 150, atk 28, range 1-2 tiles (melee), speed 10.
  c("tarantula", "Giant Tarantula", "🕷️", "🦁 Wild Kingdom", "medium", "melee", [ 150,  28, 780, 200, 450], "#4A3728", "Eight eyes! Eight times the pain!", "Venom Flurry"),
  // TIER [B-LIST] Pangolin: small melee. HP 83, atk 20, range 1-2 tiles (melee), speed 14.
  c("pangolin", "Pangolin", "🦔", "🦁 Wild Kingdom", "small", "melee", [  83,  20, 820, 160, 450], "#8B6914", "ROLL UP!", "Armored Roll"),
];

export const PRESET_CATEGORIES = [
  "⚔️ Legends",
  "🦁 Wild Kingdom",
  "🤪 Silly Squad",
  "💥 Heroes & Villains",
  "🏛️ History Icons",
  "🚀 Fantasy & Sci-Fi",
  "🦸 Comics & Movies",
  "🎮 Video Games",
  "🌩️ Gods & Myths",
  "🌍 World Warriors",
  "📺 Cartoons & Animation",
  "🌀 Anime Legends",
  "🥊 Sports Legends",
];

export const MAPS: MapConfig[] = [
  // ─── 1. Castle Walls ────────────────────────────────────────────────────
  {
    id: "castle_walls",
    name: "Castle Walls",
    emoji: "🏰",
    description: "Twin gates of a stone keep crown a fenced bailey. The crows watch.",
    bgTop: "#2A1E14",
    bgBottom: "#0E0904",
    groundColor: "#8B7A5A",
    groundLineColor: "#6B5A40",
    accentColor: "#D4AF37",
    speedMultiplier: 1.0,
    terrainQuirk: "Stone walls + gates funnel attackers — choke points form naturally",
    features: [
      // central 3x3 castle keep at the top
      { kind: "castle",     x: 8, y: 1, w: 3, h: 3 },
      // two gates flanking the keep
      { kind: "gate",       x:  6, y: 2 },
      { kind: "gate",       x: 12, y: 2 },
      // perimeter fence along the bottom + sides
      { kind: "fence",      x:  1, y:  9 },
      { kind: "fence",      x:  4, y:  9 },
      { kind: "fence",      x:  7, y:  9 },
      { kind: "fence",      x: 10, y:  9 },
      { kind: "fence",      x: 13, y:  9 },
      { kind: "fence",      x: 16, y:  9 },
      // banner trees framing the keep
      { kind: "tree",       x:  3, y:  2 },
      { kind: "tree",       x: 15, y:  2 },
      // sentry watchtowers at the corners
      { kind: "watchtower", x:  2, y:  6, w: 1, h: 2 },
      { kind: "watchtower", x: 17, y:  6, w: 1, h: 2 },
    ],
  },

  // ─── 2. River Crossing ──────────────────────────────────────────────────
  {
    id: "river_crossing",
    name: "River Crossing",
    emoji: "🌉",
    description: "A wooden bridge spans the dividing river. Trees crowd both banks.",
    bgTop: "#0F1F2A",
    bgBottom: "#050D14",
    groundColor: "#2D5A2D",
    groundLineColor: "#1E3F1E",
    accentColor: "#9be3ff",
    speedMultiplier: 0.95,
    terrainQuirk: "The bridge is the only fast route — wade through to your peril",
    features: [
      // bridge crossing the central water band (horizontal across middle row)
      { kind: "bridge",     x:  8, y: 5, w: 4, h: 1 },
      // trees on north bank
      { kind: "tree",       x:  2, y: 2 },
      { kind: "tree",       x:  5, y: 1 },
      { kind: "tree",       x:  7, y: 3 },
      { kind: "tree",       x: 14, y: 2 },
      { kind: "tree",       x: 17, y: 1 },
      // trees on south bank
      { kind: "tree",       x:  3, y: 8 },
      { kind: "tree",       x:  6, y: 9 },
      { kind: "tree",       x: 13, y: 8 },
      { kind: "tree",       x: 16, y: 9 },
      { kind: "tree",       x: 18, y: 8 },
      // a few rocks scattered near the bridge approach
      { kind: "rock",       x:  7, y: 5 },
      { kind: "rock",       x: 12, y: 5 },
    ],
  },

  // ─── 3. Stone Forest ────────────────────────────────────────────────────
  {
    id: "stone_forest",
    name: "Stone Forest",
    emoji: "🌲",
    description: "Crooked pines crowd weathered standing stones. Cover everywhere — sight lines nowhere.",
    bgTop: "#0A1A0A",
    bgBottom: "#050D05",
    groundColor: "#3F8A3F",
    groundLineColor: "#2D5A2D",
    accentColor: "#7FFF00",
    speedMultiplier: 0.95,
    terrainQuirk: "Dense cover breaks lines of sight — ranged units must close distance",
    features: [
      // scattered rocks
      { kind: "rock", x:  3, y:  2 },
      { kind: "rock", x:  6, y:  3 },
      { kind: "rock", x:  4, y:  7 },
      { kind: "rock", x: 11, y:  2 },
      { kind: "rock", x: 14, y:  6 },
      { kind: "rock", x: 17, y:  3 },
      { kind: "rock", x: 15, y:  9 },
      // scattered trees
      { kind: "tree", x:  2, y:  4 },
      { kind: "tree", x:  5, y:  5 },
      { kind: "tree", x:  8, y:  2 },
      { kind: "tree", x:  9, y:  7 },
      { kind: "tree", x: 12, y:  4 },
      { kind: "tree", x: 13, y:  8 },
      { kind: "tree", x: 16, y:  6 },
      { kind: "tree", x: 18, y:  9 },
      { kind: "tree", x:  7, y:  9 },
      { kind: "tree", x: 10, y:  9 },
    ],
  },

  // ─── 4. Watchtower Hill ─────────────────────────────────────────────────
  {
    id: "watchtower_hill",
    name: "Watchtower Hill",
    emoji: "🗼",
    description: "A lone watchtower commands the rise. Old walls hint at battles long past.",
    bgTop: "#1A2030",
    bgBottom: "#05080F",
    groundColor: "#7A8A6A",
    groundLineColor: "#5A6A4A",
    accentColor: "#FFD700",
    speedMultiplier: 1.0,
    terrainQuirk: "High ground favours the bold — control the centre, control the field",
    features: [
      // central 2x2 watchtower
      { kind: "watchtower", x:  9, y: 5, w: 2, h: 2 },
      // ring of low walls around the tower
      { kind: "wall",       x:  7, y:  4 },
      { kind: "wall",       x: 12, y:  4 },
      { kind: "wall",       x:  7, y:  7 },
      { kind: "wall",       x: 12, y:  7 },
      // a few rocks dotting the slopes
      { kind: "rock",       x:  3, y:  3 },
      { kind: "rock",       x: 16, y:  2 },
      { kind: "rock",       x:  4, y:  9 },
      { kind: "rock",       x: 17, y:  9 },
      // sentry trees marking the approach paths
      { kind: "tree",       x:  2, y:  6 },
      { kind: "tree",       x: 18, y:  6 },
      // a wooden fence section across the south approach
      { kind: "fence",      x:  8, y: 10 },
      { kind: "fence",      x: 11, y: 10 },
    ],
  },

  // ─── 5. Open Plains ─────────────────────────────────────────────────────
  {
    id: "open_plains",
    name: "Open Plains",
    emoji: "🌾",
    description: "Wind, grass, sky. Wooden corrals break the horizon. Nothing to hide behind.",
    bgTop: "#1A3A1A",
    bgBottom: "#0D1F0D",
    groundColor: "#5A8A3A",
    groundLineColor: "#3A6A2A",
    accentColor: "#4ADE80",
    speedMultiplier: 1.1,
    terrainQuirk: "Flat open ground — ranged units rule, cavalry rules harder",
    features: [
      // a corral (rectangle of fence) on the west
      { kind: "fence", x:  2, y:  3 },
      { kind: "fence", x:  3, y:  3 },
      { kind: "fence", x:  4, y:  3 },
      { kind: "fence", x:  2, y:  5 },
      { kind: "fence", x:  3, y:  5 },
      { kind: "fence", x:  4, y:  5 },
      // a second corral on the east
      { kind: "fence", x: 15, y:  7 },
      { kind: "fence", x: 16, y:  7 },
      { kind: "fence", x: 17, y:  7 },
      { kind: "fence", x: 15, y:  9 },
      { kind: "fence", x: 16, y:  9 },
      { kind: "fence", x: 17, y:  9 },
      // sparse rocks across the plain
      { kind: "rock",  x:  8, y:  2 },
      { kind: "rock",  x: 11, y:  4 },
      { kind: "rock",  x:  9, y:  8 },
      { kind: "rock",  x: 13, y:  6 },
    ],
  },

  // ─── 6. Ruins ───────────────────────────────────────────────────────────
  {
    id: "ruins",
    name: "Ruins",
    emoji: "🏚️",
    description: "Toppled stone, broken walls, withered trees. Something killed this place. Long ago.",
    bgTop: "#1A0E1A",
    bgBottom: "#0A050A",
    groundColor: "#5A4A3A",
    groundLineColor: "#3A2A1A",
    accentColor: "#9370DB",
    speedMultiplier: 0.9,
    terrainQuirk: "Rubble and ghost-walls slow movement, but the broken sight-lines reward cunning",
    features: [
      // broken wall stubs
      { kind: "ruins",  x:  3, y:  2 },
      { kind: "ruins",  x:  4, y:  2 },
      { kind: "ruins",  x:  3, y:  3 },
      { kind: "ruins",  x: 14, y:  3 },
      { kind: "ruins",  x: 15, y:  3 },
      { kind: "ruins",  x: 16, y:  4 },
      { kind: "ruins",  x:  6, y:  8 },
      { kind: "ruins",  x:  7, y:  8 },
      { kind: "ruins",  x: 12, y:  9 },
      // fallen stones
      { kind: "rock",   x:  9, y:  4 },
      { kind: "rock",   x: 11, y:  6 },
      { kind: "rock",   x:  5, y:  6 },
      { kind: "rock",   x: 16, y:  8 },
      // withered (still drawn as a tree, the renderer tints them based on map id)
      { kind: "tree",   x:  2, y:  9 },
      { kind: "tree",   x: 10, y:  2 },
      { kind: "tree",   x: 18, y:  6 },
    ],
  },
];
