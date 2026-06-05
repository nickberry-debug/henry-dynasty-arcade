// Olympus — Greek mythology AI adventure RPG. Type definitions.
// Heroes are persistent across sessions, adventures are AI-generated.

export type OlympusClass =
  | "warrior" | "hunter" | "oracle" | "rogue" | "champion" | "scholar"
  | "firebrand" | "tideborn" | "shadowsworn" | "titan_blood";

export interface ClassInfo {
  name: string;
  emoji: string;
  description: string;
  primaryStat: keyof HeroStats;
  subclasses: string[];
  storyImpact: string;
  examples: string[];
  statBonuses: string[];
  /** Concrete stat deltas applied to the hero on top of the player's
   *  20-point allocation. Kept separate from the human-readable
   *  statBonuses array so the creation UI can show the math. */
  statDeltas: Partial<HeroStats>;
}

export const CLASS_INFO: Record<OlympusClass, ClassInfo> = {
  warrior:     { name: "Warrior",     emoji: "🛡️", description: "Hoplite phalanx fighter, frontline strength.",     primaryStat: "strength",  subclasses: ["Hoplite", "Berserker", "Spartan"],
                 storyImpact: "Direct confrontation. NPCs respect or fear you. Combat features heavily, but you can negotiate from a position of strength.",
                 examples: ["Lead the charge into battle", "Intimidate a bandit chief", "Hold a bridge alone against an army"],
                 statBonuses: ["+2 Strength", "+1 Endurance", "+1 Intuition"], statDeltas: { strength: 2, endurance: 1, intuition: 1 } },
  hunter:      { name: "Hunter",      emoji: "🏹", description: "Master of bow and beast, walker of wild lands.",   primaryStat: "agility",   subclasses: ["Archer", "Scout", "Beast Master"],
                 storyImpact: "Wilderness opens up. You spot ambushes others miss. Ranged combat and tracking play big roles.",
                 examples: ["Track a missing person through forests", "Pick off enemies from a hillside", "Spot the trap before stepping in it"],
                 statBonuses: ["+2 Agility", "+1 Luck", "+1 Intuition"], statDeltas: { agility: 2, luck: 1, intuition: 1 } },
  oracle:      { name: "Oracle",      emoji: "🔮", description: "Touched by the gods, reader of fate.",             primaryStat: "wisdom",    subclasses: ["Seer", "Priest", "Stormcaller"],
                 storyImpact: "Gods notice you faster. Visions and prophecies appear. Temples and shrines become key locations.",
                 examples: ["Receive a prophetic dream from Apollo", "Heal a dying child with a touch", "Read warnings in the stars"],
                 statBonuses: ["+2 Wisdom", "+1 Charisma", "+1 Magic"], statDeltas: { wisdom: 2, charisma: 1, magic: 1 } },
  rogue:       { name: "Rogue",       emoji: "🗡️", description: "Silver tongue, lighter fingers, sharper blade.",   primaryStat: "agility",   subclasses: ["Trickster", "Thief", "Diplomat"],
                 storyImpact: "Stealth, deception, theft routes open. Information brokers seek you out.",
                 examples: ["Steal a guarded artifact", "Pose as a foreign noble to gain access", "Slip through enemy lines undetected"],
                 statBonuses: ["+2 Agility", "+1 Charisma", "+1 Luck"], statDeltas: { agility: 2, charisma: 1, luck: 1 } },
  champion:    { name: "Champion",    emoji: "⚒️", description: "Olympic-class athlete and commander of men.",      primaryStat: "endurance", subclasses: ["Knight", "Captain", "Gladiator"],
                 storyImpact: "NPCs follow your lead. Recruit allies, command groups. Cities offer authority.",
                 examples: ["Rally a village against raiders", "Champion a cause in front of kings", "Save a comrade from certain death"],
                 statBonuses: ["+1 Strength", "+2 Charisma", "+1 Endurance"], statDeltas: { strength: 1, charisma: 2, endurance: 1 } },
  scholar:     { name: "Scholar",     emoji: "📜", description: "Philosopher, alchemist, keeper of ancient lore.",  primaryStat: "wisdom",    subclasses: ["Philosopher", "Alchemist", "Historian"],
                 storyImpact: "Puzzles, ancient lore, intellectual challenges. Libraries welcome you. You solve mysteries others cannot.",
                 examples: ["Decipher an ancient curse", "Identify a legendary artifact", "Outwit a sphinx with cleverness"],
                 statBonuses: ["+2 Wisdom", "+1 Intuition", "+1 Luck"], statDeltas: { wisdom: 2, intuition: 1, luck: 1 } },
  firebrand:   { name: "Firebrand",   emoji: "🔥", description: "Touched by Prometheus's gift — wielder of forbidden fire.", primaryStat: "wisdom",     subclasses: ["Emberguard", "Inferno Caller", "Phoenix Walker"],
                 storyImpact: "Fire magic shapes your path. Gods regard you with suspicion. Heat metal, ignite oil, summon flame — every use leaves marks on your soul. Hunters of forbidden arts may pursue you.",
                 examples: ["Set a dragon's lair ablaze", "Light a torch from your fingertip", "Burn a curse from a cursed amulet"],
                 statBonuses: ["+2 Magic", "+1 Wisdom", "+1 Endurance"], statDeltas: { magic: 2, wisdom: 1, endurance: 1 } },
  tideborn:    { name: "Tideborn",    emoji: "🌊", description: "Born during a storm at sea — blessed (or cursed) by the deep.", primaryStat: "wisdom", subclasses: ["Tide Stormcaller", "Deepwalker", "Tidekeeper"],
                 storyImpact: "Water bends to your will in small ways. You sense storms. Sea creatures recognize you. Long voyages and underwater quests find you. Poseidon notes you.",
                 examples: ["Calm a raging storm", "Breathe underwater for hours", "Speak with a dying dolphin"],
                 statBonuses: ["+1 Endurance", "+2 Intuition", "+1 Magic"], statDeltas: { endurance: 1, intuition: 2, magic: 1 } },
  shadowsworn: { name: "Shadowsworn", emoji: "🌒", description: "A mortal who touched death and came back changed.", primaryStat: "wisdom", subclasses: ["Deathkeeper", "Shadowblade", "Soulreader"],
                 storyImpact: "Ghosts speak to you. The dying remember things they shouldn't. The Underworld is closer for you. Hades takes interest. Mortal NPCs sense something off about you.",
                 examples: ["Speak with a murdered NPC about who killed them", "Walk unseen through firelight", "Receive a vision from beyond"],
                 statBonuses: ["+2 Intuition", "+1 Agility", "+1 Magic"], statDeltas: { intuition: 2, agility: 1, magic: 1 } },
  titan_blood: { name: "Titan-Blood", emoji: "⛰️", description: "Distant descendant of a Titan — bloodline dormant until need wakes it.", primaryStat: "strength",  subclasses: ["Earthshaker", "Firebreaker", "Starsinger"],
                 storyImpact: "In moments of pure need, the Titan blood surges — temporary supernatural strength or insight. The Olympians watch you warily. Ancient places recognize your blood. Powerful enemies may exist you don't know about.",
                 examples: ["Lift a fallen column off a trapped friend", "Survive a fall that should kill you", "Find an ancestor's tomb that recognizes you"],
                 statBonuses: ["+2 Strength", "+1 Endurance", "+1 Magic"], statDeltas: { strength: 2, endurance: 1, magic: 1 } },
};

/** Safe accessor for class info. Returns the Warrior block as a
 *  fallback when the hero's className is stale (a class that has
 *  since been removed and the migration somehow missed it). Prevents
 *  CLASS_INFO[h.className] from being `undefined` in render paths. */
export function classInfoFor(cls: string | OlympusClass | undefined): ClassInfo {
  return (cls && CLASS_INFO[cls as OlympusClass]) || CLASS_INFO.warrior;
}

/** Per-subclass details — keyed by lowercase-with-underscore id. */
export interface SubclassInfo {
  name: string;
  parent: OlympusClass;
  description: string;
  bonuses: string[];
  statDeltas: Partial<HeroStats>;
  passive: { name: string; description: string };
  active: { name: string; description: string; cooldown: string };
  storyImpact: string;
}

export const SUBCLASS_INFO: Record<string, SubclassInfo> = {
  // ── Warrior ────────────────────────────────────────────────────────
  hoplite:        { name: "Hoplite",         parent: "warrior",    description: "Disciplined shield-bearer, master of the phalanx.",   bonuses: ["+5 Endurance", "+2 Strength"], statDeltas: { endurance: 3, strength: 1 }, passive: { name: "Iron Stance", description: "Reduces all damage taken by 15%." }, active: { name: "Shield Wall", description: "Redirect an attack from an ally to yourself, taking reduced damage.", cooldown: "Once per combat" }, storyImpact: "You excel in defensive positions and group combat." },
  berserker:      { name: "Berserker",       parent: "warrior",    description: "Battle-rage fighter who loses themselves in combat.",  bonuses: ["+5 Strength", "+2 Courage"], statDeltas: { strength: 3, endurance: 1 }, passive: { name: "Battle Rage", description: "+25% damage when below half HP." }, active: { name: "Howl", description: "Frighten weaker enemies for one round.", cooldown: "Once per combat" }, storyImpact: "Stories push you to the brink where your rage unleashes." },
  spartan:        { name: "Spartan",         parent: "warrior",    description: "Bred for war — cold discipline, no fear of death.",     bonuses: ["+3 Strength", "+3 Endurance", "+1 Courage"], statDeltas: { endurance: 2, strength: 2 }, passive: { name: "Phobos Immunity", description: "Immune to fear effects." }, active: { name: "Wall of Bronze", description: "Hold position and protect adjacent allies.", cooldown: "Once per scene" }, storyImpact: "Reputation for fearlessness opens military and political paths." },
  // ── Hunter ─────────────────────────────────────────────────────────
  archer:         { name: "Archer",          parent: "hunter",     description: "Precision personified — hits a hawk's eye at a hundred paces.", bonuses: ["+5 Agility", "+2 Intuition"], statDeltas: { agility: 3, wisdom: 1 }, passive: { name: "Steady Hand", description: "15% bonus to ranged critical hit chance." }, active: { name: "Trick Shot", description: "Guaranteed critical hit on a single ranged attack.", cooldown: "Once per combat" }, storyImpact: "Long-range encounters and precision shots define your tale." },
  scout:          { name: "Scout",           parent: "hunter",     description: "Faster than wind, harder to see than shadow.",         bonuses: ["+5 Agility", "+2 Intuition"], statDeltas: { agility: 3, wisdom: 1 }, passive: { name: "First Strike", description: "Always acts first in combat." }, active: { name: "Vanish", description: "Disappear into terrain for one turn.", cooldown: "Once per scene" }, storyImpact: "Reconnaissance missions and stealth approaches dominate." },
  beast_master:   { name: "Beast Master",    parent: "hunter",     description: "Speaks the silent language of animals.",               bonuses: ["+3 Intuition", "+2 Charisma"], statDeltas: { wisdom: 2, charisma: 2 }, passive: { name: "Beastspeak", description: "Hostile animals are 50% less likely to attack on sight." }, active: { name: "Call the Pack", description: "Summon a small group of wild allies for one combat.", cooldown: "Once per adventure" }, storyImpact: "Wildlife encounters become opportunities, not threats." },
  // ── Oracle ─────────────────────────────────────────────────────────
  seer:           { name: "Seer",            parent: "oracle",     description: "Reads omens, dreams prophecies, glimpses the future.",  bonuses: ["+5 Wisdom", "+2 Intuition"], statDeltas: { wisdom: 4 }, passive: { name: "Open Eye", description: "+10% chance to spot hidden details in scenes." }, active: { name: "Glimpse Forward", description: "See the likely outcome of your next choice before committing.", cooldown: "Once per adventure" }, storyImpact: "Visions guide your choices and warn of dangers ahead." },
  priest:         { name: "Priest",          parent: "oracle",     description: "Devoted servant of a god — channels divine power.",    bonuses: ["+5 Wisdom", "+2 Charisma"], statDeltas: { wisdom: 3, charisma: 1 }, passive: { name: "Blessed", description: "Patron-god blessings deal +3 effect." }, active: { name: "Prayer of Mending", description: "Restore HP to yourself or an ally.", cooldown: "Once per scene" }, storyImpact: "Religious quests and divine intervention feature heavily." },
  stormcaller:    { name: "Stormcaller",     parent: "oracle",     description: "Wields elemental magic — lightning, wind, rain.",       bonuses: ["+5 Magic", "+2 Wisdom"], statDeltas: { wisdom: 4 }, passive: { name: "Weatherborn", description: "Storm magic +5 damage." }, active: { name: "Lightning Strike", description: "Call a lightning bolt on one enemy.", cooldown: "Once per combat" }, storyImpact: "Weather becomes a tool. Storm-related quests find you." },
  // ── Rogue ──────────────────────────────────────────────────────────
  trickster:      { name: "Trickster",       parent: "rogue",      description: "Master of misdirection, beloved by Hermes.",            bonuses: ["+5 Charisma", "+2 Luck"], statDeltas: { charisma: 3, luck: 1 }, passive: { name: "Slippery", description: "+20% chance to escape failed actions without penalty." }, active: { name: "Smoke and Mirrors", description: "Escape from any non-final combat encounter.", cooldown: "Once per adventure" }, storyImpact: "Comedic and clever resolution paths open up." },
  thief:          { name: "Thief",           parent: "rogue",      description: "Quick fingers, quicker feet.",                          bonuses: ["+5 Agility", "+2 Craft"], statDeltas: { agility: 4 }, passive: { name: "Light Touch", description: "Pickpocket on most successful persuasion checks." }, active: { name: "Pickpocket", description: "Lift an item from an unaware NPC.", cooldown: "Once per scene" }, storyImpact: "Heist scenarios and theft-based quests appear often." },
  diplomat:       { name: "Diplomat",        parent: "rogue",      description: "Wields words like weapons.",                            bonuses: ["+5 Charisma", "+2 Wisdom"], statDeltas: { charisma: 3, wisdom: 1 }, passive: { name: "Silver Tongue", description: "Better prices in every market by 10%." }, active: { name: "Calm Tempers", description: "Reduce hostility of an NPC group by one tier.", cooldown: "Once per scene" }, storyImpact: "Negotiation resolves what others must fight." },
  // ── Champion ───────────────────────────────────────────────────────
  knight:         { name: "Knight",          parent: "champion",   description: "Bound by a code of honor.",                            bonuses: ["+3 Strength", "+3 Charisma"], statDeltas: { strength: 2, charisma: 2 }, passive: { name: "Code of Honor", description: "Inspires allies — they get +5 to their next action." }, active: { name: "Rally", description: "Restore party morale and a small amount of HP.", cooldown: "Once per scene" }, storyImpact: "Chivalric quests, oaths, and codes of honor shape your path." },
  captain:        { name: "Captain",         parent: "champion",   description: "Born to lead — soldiers follow your commands.",         bonuses: ["+5 Charisma", "+2 Endurance"], statDeltas: { charisma: 3, endurance: 1 }, passive: { name: "Command Presence", description: "Up to 3 NPC allies follow your lead." }, active: { name: "Order Up", description: "Command an ally to take an action without using their turn.", cooldown: "Once per combat" }, storyImpact: "Military command opportunities and group missions abound." },
  gladiator:      { name: "Gladiator",       parent: "champion",   description: "Arena-trained warrior who fights for crowds.",          bonuses: ["+5 Strength", "+2 Courage"], statDeltas: { strength: 3, endurance: 1 }, passive: { name: "Crowd-Pleaser", description: "+5 Strength in any arena combat." }, active: { name: "Finisher", description: "Devastating final blow on a weakened enemy.", cooldown: "Once per combat" }, storyImpact: "Arena fights and tournaments are your stage to glory." },
  // ── Scholar ────────────────────────────────────────────────────────
  philosopher:    { name: "Philosopher",     parent: "scholar",    description: "Thinker who questions everything.",                     bonuses: ["+5 Wisdom", "+2 Intuition"], statDeltas: { wisdom: 4 }, passive: { name: "Logical Mind", description: "See through one lie per scene automatically." }, active: { name: "Debate", description: "Win a verbal contest against any single NPC.", cooldown: "Once per adventure" }, storyImpact: "Mental challenges and ethical dilemmas test you constantly." },
  alchemist:      { name: "Alchemist",       parent: "scholar",    description: "Brews potions and identifies substances.",              bonuses: ["+5 Craft", "+2 Wisdom"], statDeltas: { agility: 3, wisdom: 1 }, passive: { name: "Identify", description: "Automatically know what unknown items do." }, active: { name: "Field Concoction", description: "Craft a single-use potion from materials at hand.", cooldown: "Once per scene" }, storyImpact: "Recipe-gathering and potion-based solutions enter the story." },
  historian:      { name: "Historian",       parent: "scholar",    description: "Knows ancient lore deeply.",                            bonuses: ["+5 Wisdom", "+2 Heritage"], statDeltas: { wisdom: 3, endurance: 1 }, passive: { name: "Old Knowledge", description: "Identify ancient artifacts and find hidden sites." }, active: { name: "Lore Recall", description: "Remember a critical fact about the current location or NPC.", cooldown: "Once per scene" }, storyImpact: "Lost cities, forgotten temples, and ancient mysteries find you." },
  // ── Firebrand ──────────────────────────────────────────────────────
  emberguard:     { name: "Emberguard",      parent: "firebrand",  description: "Disciplined wielder of controlled flame.",              bonuses: ["+5 Magic", "+2 Endurance"], statDeltas: { wisdom: 3, endurance: 1 }, passive: { name: "Burning Brand", description: "Light up dark areas; weapons gain +2 fire damage." }, active: { name: "Heatward", description: "Encase yourself in flame — burn the next attacker.", cooldown: "Once per combat" }, storyImpact: "Fire is your shield. Dark places hold no terror for you." },
  inferno_caller: { name: "Inferno Caller",  parent: "firebrand",  description: "Calls greater flame for greater purpose.",              bonuses: ["+5 Magic", "+2 Courage"], statDeltas: { wisdom: 3, endurance: 1 }, passive: { name: "Pyromantic Sight", description: "See heat signatures — spot hidden enemies." }, active: { name: "Conflagration", description: "Set a wide area ablaze, harming all enemies.", cooldown: "Once per adventure" }, storyImpact: "Your fire is a force. Cities tell stories of where you walked." },
  phoenix_walker: { name: "Phoenix Walker",  parent: "firebrand",  description: "Has died once. Came back. Knows things now.",            bonuses: ["+3 Magic", "+3 Heritage", "+1 Courage"], statDeltas: { endurance: 2, wisdom: 2 }, passive: { name: "Reborn", description: "Survive one mortal blow per adventure with 1 HP." }, active: { name: "Phoenix Cry", description: "Heal yourself to full once, leaving a mark of fire behind.", cooldown: "Once per adventure" }, storyImpact: "Death has tested you. Few things frighten you now." },
  // ── Tideborn ───────────────────────────────────────────────────────
  tide_stormcaller: { name: "Tide Stormcaller", parent: "tideborn",   description: "Calls storms and rides them.",                          bonuses: ["+5 Magic", "+2 Intuition"], statDeltas: { wisdom: 4 }, passive: { name: "Storm-Touched", description: "Lightning never strikes you. Rain doesn't slow you." }, active: { name: "Squall", description: "Raise a sudden storm — blinds enemies, aids escape.", cooldown: "Once per scene" }, storyImpact: "Weather follows your moods. Sailors fear your anger." },
  deepwalker:     { name: "Deepwalker",      parent: "tideborn",   description: "At home in deep water, where mortals drown.",            bonuses: ["+5 Endurance", "+2 Intuition"], statDeltas: { endurance: 3, wisdom: 1 }, passive: { name: "Tidal Stride", description: "Move freely through water and shallow seas." }, active: { name: "Drown", description: "Pull a foe into water that wasn't there a moment ago.", cooldown: "Once per combat" }, storyImpact: "Long voyages, sunken ruins, and abyssal mysteries find you." },
  tidekeeper:     { name: "Tidekeeper",      parent: "tideborn",   description: "Speaker to sea creatures, healer of coast and crew.",    bonuses: ["+3 Intuition", "+3 Charisma"], statDeltas: { wisdom: 2, charisma: 2 }, passive: { name: "Sea Friend", description: "Sea creatures will not harm you unprovoked." }, active: { name: "Healing Tide", description: "Restore HP to the entire party between scenes.", cooldown: "Once per adventure" }, storyImpact: "Sailors and fishermen consider you a blessing." },
  // ── Shadowsworn ────────────────────────────────────────────────────
  deathkeeper:    { name: "Deathkeeper",     parent: "shadowsworn", description: "Speaks with the dead, walks the line between worlds.",  bonuses: ["+5 Intuition", "+2 Wisdom"], statDeltas: { wisdom: 4 }, passive: { name: "Ghost-Eyed", description: "See and speak with nearby spirits at any time." }, active: { name: "Last Words", description: "Speak with a recently dead person about how they died.", cooldown: "Once per scene" }, storyImpact: "Murder mysteries and underworld journeys come naturally." },
  shadowblade:    { name: "Shadowblade",     parent: "shadowsworn", description: "Strikes from shadow with deadly precision.",            bonuses: ["+5 Agility", "+2 Intuition"], statDeltas: { agility: 3, wisdom: 1 }, passive: { name: "Soulstrike", description: "Critical hits against undead and cursed enemies." }, active: { name: "Walk Unseen", description: "Move through firelit places without being noticed.", cooldown: "Once per scene" }, storyImpact: "Assassins, conspiracies, and night-side adventures unfold." },
  soulreader:     { name: "Soulreader",      parent: "shadowsworn", description: "Reads the histories written on a person's soul.",       bonuses: ["+3 Intuition", "+3 Wisdom"], statDeltas: { wisdom: 4 }, passive: { name: "Soul-Sight", description: "Instantly sense alignment of any NPC." }, active: { name: "Read Soul", description: "Learn one secret an NPC is hiding.", cooldown: "Once per scene" }, storyImpact: "Hidden truths and identities are your specialty." },
  // ── Titan-Blood ────────────────────────────────────────────────────
  earthshaker:    { name: "Earthshaker",     parent: "titan_blood", description: "The earth itself bends to your bloodline.",             bonuses: ["+5 Strength", "+2 Heritage"], statDeltas: { strength: 3, endurance: 1 }, passive: { name: "Mountain Blood", description: "Cannot be moved against your will." }, active: { name: "Ground Quake", description: "Knock down all nearby enemies.", cooldown: "Once per adventure" }, storyImpact: "Ancient places stir when you walk through them." },
  firebreaker:    { name: "Firebreaker",     parent: "titan_blood", description: "Bears the fire that the Titans stole and lost.",        bonuses: ["+3 Strength", "+3 Magic"], statDeltas: { strength: 2, wisdom: 2 }, passive: { name: "Inheritor", description: "Fire and heat cannot harm you." }, active: { name: "Titan's Pyre", description: "Unleash a wave of cleansing flame, damaging all enemies.", cooldown: "Once per adventure" }, storyImpact: "Old shrines to the Titans remember your blood." },
  starsinger:     { name: "Starsinger",      parent: "titan_blood", description: "Speaks the old tongue the Titans used to name the stars.", bonuses: ["+3 Magic", "+3 Heritage"], statDeltas: { wisdom: 2, endurance: 2 }, passive: { name: "Old Tongue", description: "Read any ancient language at sight." }, active: { name: "Name a Star", description: "Bless an ally or yourself with a powerful invocation.", cooldown: "Once per adventure" }, storyImpact: "Cosmic and prophetic encounters seek you out." },
};

/** Per-stat info shown in InfoTooltips. */
export const STAT_INFO: Record<keyof HeroStats, { title: string; description: string; storyImpact: string; examples: string[] }> = {
  strength:  { title: "Strength",  description: "Physical power — melee damage, carrying capacity, feats of force.",
               storyImpact: "Brute-force solutions open up. Break down doors, lift heavy objects, win arm-wrestling contests, dominate melee combat.",
               examples: ["Bend iron bars to escape a cell", "Lift a fallen warrior off the battlefield", "Win a contest of strength against a centaur"] },
  agility:   { title: "Agility",   description: "Speed and coordination — dodging, stealth, ranged accuracy, reaction time.",
               storyImpact: "Acrobatic and stealth paths unlock. Sneak past enemies, leap impossible gaps, fire arrows with precision, escape danger faster.",
               examples: ["Walk a tightrope above a chasm", "Pickpocket a temple guard", "Land a perfect arrow at extreme range"] },
  wisdom:    { title: "Wisdom",    description: "Knowledge and intuition — magic, perception, decision-making.",
               storyImpact: "Lore-based and magical paths open. Solve riddles, identify artifacts, sense danger, channel divine power.",
               examples: ["Decipher a cursed inscription", "Sense an ambush before it strikes", "Outwit a sphinx with the perfect answer"] },
  charisma:  { title: "Charisma",  description: "Personality and presence — persuasion, leadership, social interactions.",
               storyImpact: "Dialogue and social paths open. Talk past guards, inspire allies, negotiate better deals, lead crowds.",
               examples: ["Convince a king to spare a prisoner", "Rally a frightened village", "Win over a hostile merchant for a discount"] },
  luck:      { title: "Luck",      description: "Fortune's favor — critical hits, found items, random encounters, escapes.",
               storyImpact: "The gods smile on you. Find more treasure, survive impossible odds, stumble onto opportunities.",
               examples: ["Find a healing potion exactly when needed", "Survive a fall that should have killed you", "Win a high-stakes bet against impossible odds"] },
  endurance: { title: "Endurance", description: "Stamina and resilience — HP, resistance to poison/disease, recovery.",
               storyImpact: "Survive what others cannot. Withstand longer travel, resist poison, recover from wounds, outlast opponents.",
               examples: ["March three days without rest", "Survive a deadly snake bite", "Outlast a Spartan in a duel of attrition"] },
  intuition: { title: "Intuition", description: "Sensing what others cannot — danger, deceit, hidden things.",
               storyImpact: "Spot ambushes, detect lies, feel which path is right when lost. Critical for mystery and divine encounters.",
               examples: ["Notice the assassin before he draws", "Know a stranger is lying", "Feel a god's presence before revealed"] },
  magic:     { title: "Magic",     description: "Raw connection to magical forces — felt, not learned.",
               storyImpact: "Enhances magical effects, divine encounters, and artifact use. Enchanted items recognize you.",
               examples: ["Awaken a dormant artifact by touch", "Resist a sorcerer's binding spell", "Channel a god's blessing"] },
};

export interface HeroStats {
  strength: number;
  agility: number;
  wisdom: number;
  charisma: number;
  luck: number;
  endurance: number;
  intuition: number;
  magic: number;
}

/** Hard cap on any single attribute. Tier system tops out at Mythic
 *  (100); the underlying value cannot exceed that. */
export const STAT_HARD_CAP = 100;

/** D&D-style tier labels for an attribute value. Used in profile and
 *  by the AI to scale outcome descriptions to ability level. */
export interface AttributeTier {
  name: string;
  min: number;
  max: number;
  desc: string;
}
export const TIER_RANGES: AttributeTier[] = [
  { name: "Frail",       min:   1, max:   2, desc: "Below average mortal. Notable weakness." },
  { name: "Average",     min:   3, max:   5, desc: "Typical mortal. No special prowess." },
  { name: "Capable",     min:   6, max:   9, desc: "Above average. Trained or talented." },
  { name: "Strong",      min:  10, max:  14, desc: "Notably skilled. Recognized." },
  { name: "Exceptional", min:  15, max:  19, desc: "Famed in homeland. Heroes' company." },
  { name: "Legendary",   min:  20, max:  29, desc: "Renowned across Greece. Songs sung." },
  { name: "Heroic",      min:  30, max:  49, desc: "Demigod-tier. Worthy of myth." },
  { name: "Demigod",     min:  50, max:  74, desc: "Comparable to lesser deities." },
  { name: "Olympian",    min:  75, max:  99, desc: "Rival to the gods themselves." },
  { name: "Mythic",      min: 100, max: 999, desc: "Singular. Beyond mortal comprehension." },
];
export function getTier(value: number): AttributeTier {
  return TIER_RANGES.find(t => value >= t.min && value <= t.max) ?? TIER_RANGES[1];
}

export interface HeroAppearance {
  /** Index into LORELEI_SKIN — 12 tones, light to deep. */
  skinTone: number;
  /** Index into LORELEI_HAIR (variant01-29). */
  hairStyle: number;
  /** Index into LORELEI_HAIR_COLOR — 12 colors. */
  hairColor: number;
  /** Index into LORELEI_EYES (variant01-24). */
  eyeColor: number;
  /** Cycles eyebrows on lorelei + body-stance modifier on the SVG body. */
  build: number;
  /** 0 = clean-shaven, otherwise picks a facial-hair overlay style.
   *  Rendered as a hand-drawn SVG overlay (lorelei has no built-in
   *  beard field, so the picker would do nothing otherwise). */
  facialHair: number;
  /** Optional new face-detail axes — fall back to derived defaults if missing. */
  mouth?: number;
  nose?: number;
  /** "male" | "female" — drives body silhouette proportions in
   *  CharacterSprite's hand-drawn body half. */
  gender?: "male" | "female";
  tunicColor: string;
  cloakColor: string;
  scarLayer?: "none" | "cheek" | "brow" | "lip";
}

export type WeaponKind = "sword" | "spear" | "bow" | "staff" | "dagger" | "axe" | "mace" | "wand";
export type ArmorSlot  = "helmet" | "torso" | "arms1" | "arms2" | "legs" | "feet";

export interface WeaponItem  { name: string; kind: WeaponKind; tier: number; description?: string }
export interface ArmorItem   { name: string; tier: number; description?: string }
export interface AccessoryItem { name: string; description?: string }

/** Equipment slots. STRICT one-per-slot for armor + melee + ranged
 *  (no stacking). Magic weapons are NOT slot-limited — a hero can
 *  carry as many enchanted/magical pieces as they own (subject to
 *  the inventory cap of 10). */
export interface HeroEquipment {
  meleeWeapon?: WeaponItem;
  rangedWeapon?: WeaponItem;
  magicWeapon?: WeaponItem;
  helmet?: ArmorItem;
  torso?: ArmorItem;
  arms1?: ArmorItem;
  arms2?: ArmorItem;
  legs?: ArmorItem;
  feet?: ArmorItem;
  accessory?: AccessoryItem;
  blessings: Array<{ god: string; name: string; tier: number }>;
  /** Legacy slot kept so old saves migrate cleanly. Don't write to
   *  this in new code — it's projected onto meleeWeapon/rangedWeapon
   *  by migrateHero(). */
  weapon?: { name: string; kind: WeaponKind; tier: number };
  /** Legacy slot kept for migration. Projected onto torso. */
  armor?: ArmorItem;
}

/** Max items in the adventure pack. Base chest is unlimited. */
export const INVENTORY_CAP = 10;

export type BaseInventoryCategory = "weapon" | "armor" | "consumable" | "stuff" | "quest" | "trophy";

export interface BaseChestItem {
  id: string;
  name: string;
  category: BaseInventoryCategory;
  qty: number;
  description?: string;
  /** True if the player explicitly asked to keep this (e.g. "pick up
   *  the rock", "keep the bandit's tunic"). These get filed under the
   *  "stuff" category by default. */
  playerKept?: boolean;
}

export interface HeroInjury {
  description: string;
  permanent: boolean;
  healed?: number; // adventure number at which it was healed
}

export interface HeroPersonality {
  alignment:
    | "lawful-good" | "neutral-good" | "chaotic-good"
    | "lawful-neutral" | "true-neutral" | "chaotic-neutral"
    | "lawful-evil" | "neutral-evil" | "chaotic-evil";
  descriptors: string[]; // 3-6 tags
  /** Last updated after this adventure number. */
  lastUpdated: number;
}

export interface HeroReputation {
  /** City name → reputation score (-100..+100). */
  cities: Record<string, number>;
  /** Aggregated label. */
  level: "unknown" | "heard-of" | "famous" | "heroic" | "notorious" | "legendary";
}

export interface Hero {
  id: string;
  createdAt: number;
  modifiedAt: number;
  name: string;
  /** Optional NPC-given nickname after some renown. */
  nickname?: string;
  className: OlympusClass;
  subclass?: string;
  level: number;
  xp: number;
  /** XP needed for next level (computed; we store for convenience). */
  xpToNext: number;
  stats: HeroStats;
  /** Damage absorbed before going down. */
  hp: number;
  hpMax: number;
  drachma: number;
  appearance: HeroAppearance;
  equipment: HeroEquipment;
  /** Two random unique traits chosen at creation, immutable. */
  traits: string[];
  /** AI-generated 2-paragraph backstory baked at creation. */
  backstory: string;
  personality: HeroPersonality;
  reputation: HeroReputation;
  injuries: HeroInjury[];
  inventory: Array<{ id: string; name: string; kind: "consumable" | "weapon" | "armor" | "artifact" | "quest" | "trophy"; qty: number; description?: string }>;
  /** Adventures completed (full records archived). */
  adventuresCompleted: number;
  /** Personal autobiographical journal — appended after each adventure. */
  journal: string[];
  /** Cumulative description sentence updated each adventure. */
  visualDescription: string;
  archived?: boolean;
  /** Currently in-progress adventure id, if any. */
  activeAdventureId?: string;
  /** Animal companion (rolled at creation, customizable). */
  companion?: HeroCompanion;
  /** Mythic artifacts collected across adventures. Stored as ids — see
   *  MYTHIC_ARTIFACTS in `artifacts.ts`. Cannot be lost, sold, or
   *  destroyed once awarded — they live in the hero's "base" stash
   *  even when not equipped. */
  mythicArtifacts?: string[];
  /** Only ONE artifact can come along on an adventure. Other owned
   *  artifacts stay at base. Player chooses on the profile. */
  activeArtifactId?: string;
  /** Base chest — categorized stash at the hero's home. Unlimited
   *  capacity. Contains everything they're not carrying right now —
   *  spare weapons, armor, things they picked up but stashed, etc. */
  baseInventory?: BaseChestItem[];
  /** "Hero's Echo" — short verses commemorating each completed
   *  adventure. Generated by the AI after the journey home and
   *  appended here so the hero's profile shows a growing
   *  collected mythology. */
  echo?: EchoVerse[];
  /** Companion-bond stories. AI-generated mini-vignettes about the
   *  hero's bond with their animal companion. Spawned every 3
   *  completed adventures. */
  bondStories?: BondStory[];
  /** Oracle's Dream — daily-issued prophecy. The most recent dream
   *  sits at the end. Prophecies may resolve in later adventures. */
  dreams?: OracleDream[];
  /** AI-generated rumors that circulate about this hero in specific
   *  cities. Keyed by city. Regenerated when reputation shifts. */
  rumors?: Record<string, string>;
}

export interface EchoVerse {
  id: string;
  adventureId: string;
  title: string;
  verse: string;
  createdAt: number;
}

export interface BondStory {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface OracleDream {
  id: string;
  /** YYYY-MM-DD — one dream per real-world day per hero. */
  dayKey: string;
  text: string;
  /** Set true when an adventure's events match the prophecy. */
  fulfilled?: boolean;
  createdAt: number;
}

export interface HeroCompanion {
  /** Evolution-line id (e.g. "pegasus"). Identifies which 3-stage
   *  chain this companion belongs to. */
  lineId: string;
  /** Current stage in the chain — 1, 2, or 3. */
  stage: 1 | 2 | 3;
  /** Persisted name (defaults to the line's stage name on creation). */
  name: string;
  /** Companion's own progression — no attribute system, just XP
   *  and level. Level thresholds unlock potential evolution and
   *  skills. */
  level: number;
  xp: number;
  xpToNext: number;
  /** Skills unlocked so far. AI weaves the latest one into scenes. */
  skills: string[];
  /** Pendant color treatment. */
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// ── Adventure types ──────────────────────────────────────────────────────

export interface Choice {
  /** Display label, shown on a button. */
  label: string;
  /** One-line description shown under the label. */
  detail?: string;
  /** Which kind of action this represents — affects which stat applies. */
  kind: "combat" | "wits" | "persuasion" | "stealth" | "magic" | "luck" | "exploration" | "custom";
  /** Free-text actions don't have a label — they go through resolveFreeText. */
  freeText?: boolean;
  /** Offline-quest mode: points to the next scene id in the authored
   *  scene graph. AI-generated choices leave this undefined. */
  leadsTo?: string;
}

/** When a scene involves combat, the AI (or our keyword fallback) can
 *  surface a structured encounter so the UI can render proper HP bars
 *  instead of the player having to infer it from prose. */
export interface Encounter {
  /** Foes facing the hero. Single name for solo foes; multiple for groups. */
  enemies: Array<{
    id: string;
    name: string;
    hp: number;
    hpMax: number;
    /** True if this is a boss/major foe — gets a bigger bar + boss aura. */
    boss?: boolean;
    /** Optional emoji or sprite hint. */
    emoji?: string;
  }>;
  /** Optional short tagline shown above the bars ("Three bandits on the road"). */
  tagline?: string;
}

export interface Scene {
  id: string;
  /** Sequence # within the adventure. */
  index: number;
  /** Which act the scene belongs to (1, 2, or 3). Drives AI prompt tone. */
  act: 1 | 2 | 3;
  /** Combat-encounter data when applicable. */
  encounter?: Encounter;
  /** Optional atmosphere tag — used to shift TTS voice + ambient music. */
  atmosphere: "calm" | "tense" | "dramatic" | "mysterious" | "grim" | "playful" | "divine";
  /** The rich descriptive prose the player reads / hears. */
  body: string;
  /** Choices presented to the player. */
  choices: Choice[];
  /** Resolution text from the previous turn — what just happened. */
  resolution?: string;
  /** XP earned from the previous turn. */
  xpDelta?: number;
  /** HP delta from the previous turn. */
  hpDelta?: number;
  /** Items added/removed from the previous turn. */
  itemsAdded?: Array<{ name: string; kind: "consumable" | "weapon" | "armor" | "artifact" | "quest" | "trophy"; qty?: number }>;
  itemsLost?: string[];
  /** True if this is the final scene of the adventure. */
  isEnding?: boolean;
  /** The twist reveal, only set on the final scene. */
  twist?: string;
  /** The "what if" epilogue, only set on the final scene. */
  whatIfEpilogue?: string;
  /** The journey-home coda, only set on the final scene. */
  coda?: string;
}

export interface Adventure {
  id: string;
  heroId: string;
  /** Title generated up front. */
  title: string;
  /** Hook describing the quest, generated up front. */
  hook: string;
  /** Patron deity, if any (e.g. "Zeus" for the Zeus adventure). */
  patron?: string;
  /** Total decision count (between actMin and actMax). */
  totalDecisions: number;
  /** Decision counts per act. */
  actBoundaries: { act1End: number; act2End: number };
  /** All scenes generated so far, in order. */
  scenes: Scene[];
  /** Current scene index (player is reading scenes[currentIndex]). */
  currentIndex: number;
  /** Adventure status. */
  status: "active" | "completed" | "abandoned";
  /** Started timestamp. */
  startedAt: number;
  /** Completed timestamp. */
  completedAt?: number;
  /** Win/loss tag — narrative outcome, not strictly success/fail. */
  outcome?: "triumph" | "bittersweet" | "tragic" | "mysterious";
  /** Decision history compressed for AI context window. */
  history: Array<{ scene: number; choiceLabel: string; outcome: string }>;
  /** When set, this adventure is driven by an authored offline quest
   *  from offlineQuests.ts rather than the AI generator. The scene
   *  graph walks via Choice.leadsTo lookups. */
  offlineQuestId?: string;
}

// ── Cloud save indicator ─────────────────────────────────────────────────

export type SaveStatus = "saved" | "saving" | "offline" | "failed";
