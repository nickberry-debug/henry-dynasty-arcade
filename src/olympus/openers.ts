// Adventure openers — 30 varied story-starts so no two adventures
// open the same way. Selected at startAdventure() time and woven into
// the AI prompt as the opening setup. Replaces the older coin-flip
// "Heads or tails — fate decides" pattern.

export interface AdventureOpener {
  id: string;
  setup: string;
  location: string;
  atmosphere: string;
  startsWith: "combat" | "mystery" | "divine" | "exploration" | "urgent" | "journey";
}

export const ADVENTURE_OPENERS: AdventureOpener[] = [
  { id: "tavern_brawl",        setup: "You wake to the sound of shattering pottery. A brawl has erupted in the tavern where you slept the night.", location: "tavern",            atmosphere: "tense",      startsWith: "combat" },
  { id: "mysterious_scroll",   setup: "A hooded figure presses a sealed scroll into your palm. \"Open it after I leave,\" they whisper. They vanish into the crowd before you can speak.", location: "agora", atmosphere: "mysterious", startsWith: "mystery" },
  { id: "midnight_summons",    setup: "A torchlit procession of priests stops at your door at midnight. \"The Oracle has spoken your name,\" the eldest says, eyes glassy with prophecy.", location: "home", atmosphere: "sacred", startsWith: "divine" },
  { id: "shipwreck_dawn",      setup: "You wake on an unknown shore, salt-stiff and shivering. Wreckage litters the sand — and something else, something that wasn't there moments ago.", location: "unknown_beach", atmosphere: "mysterious", startsWith: "exploration" },
  { id: "market_thief",        setup: "A child barrels into you in the agora, slips something into your pocket, then vanishes into the crowd. The thing in your pocket is warm.", location: "agora", atmosphere: "urgent", startsWith: "mystery" },
  { id: "storm_door",          setup: "Thunder cracks. A stranger pounds at your door, soaked to the bone, eyes wild. \"They're coming,\" he gasps. \"You're the only one who can help.\"", location: "home", atmosphere: "dangerous", startsWith: "urgent" },
  { id: "uncle_inheritance",   setup: "A letter arrives bearing the seal of an uncle you barely remember. He has died. He has left you something — but you must travel to a cursed place to claim it.", location: "home", atmosphere: "mysterious", startsWith: "journey" },
  { id: "monster_woods",       setup: "Villagers gather around you in the marketplace, frightened. Something has been killing livestock in the woods. Three farmers have vanished. They've heard you're brave.", location: "village", atmosphere: "tense", startsWith: "combat" },
  { id: "dream_of_god",        setup: "You wake from a vivid dream — a deity stood before you, face hidden, and pointed toward a distant mountain. Your hand still tingles where they touched you.", location: "home", atmosphere: "sacred", startsWith: "divine" },
  { id: "arena_summons",       setup: "A magistrate stops you in the street. \"You are summoned to the arena. The crowd has chosen you to face today's challenger.\" Refusing is not an option.", location: "city_street", atmosphere: "dangerous", startsWith: "combat" },
  { id: "old_friend_betrayed", setup: "An old friend bursts into your home, bleeding from a fresh wound. \"They betrayed me. Hide me — please. They're coming.\"", location: "home", atmosphere: "urgent", startsWith: "mystery" },
  { id: "temple_disturbance",  setup: "The temple bells ring at the wrong hour. Smoke rises from the priestess's quarters. Someone has profaned the sanctuary, and no one knows who.", location: "temple", atmosphere: "dangerous", startsWith: "mystery" },
  { id: "forest_path",         setup: "You walk a forest path you've walked a hundred times. Today, the trees look different. The shadows are too deep. A bird falls dead at your feet.", location: "forest", atmosphere: "mysterious", startsWith: "exploration" },
  { id: "caravan_distress",    setup: "A merchant caravan rolls into town — only one wagon arriving where five had set out. The driver collapses from his seat, an arrow in his shoulder.", location: "city_gates", atmosphere: "urgent", startsWith: "combat" },
  { id: "noble_request",       setup: "A noblewoman in fine silks approaches you in the marketplace. \"I've heard your name. I have gold. I have a problem. Walk with me.\"", location: "agora", atmosphere: "mysterious", startsWith: "mystery" },
  { id: "island_request",      setup: "A weathered captain finds you on the docks. \"I need a passenger with steel in their spine. The crossing pays triple — but there's a reason no one else has taken the job.\"", location: "harbor", atmosphere: "tense", startsWith: "journey" },
  { id: "sword_in_stone",      setup: "You find a sword embedded in stone at the edge of a forgotten shrine. Vines have grown around it. The hilt seems to glow when you draw near.", location: "shrine", atmosphere: "sacred", startsWith: "divine" },
  { id: "lost_child",          setup: "A mother grips your arm, eyes red. \"My daughter went into the cave a day ago. The priests say there's a curse, they won't enter. Please — I have nothing to give you.\"", location: "village", atmosphere: "urgent", startsWith: "combat" },
  { id: "sirens_calling",      setup: "You hear music on the wind. Soft, lovely, and wrong. Sailors in the harbor are already walking toward it, glassy-eyed. You alone seem to hear how dangerous it sounds.", location: "harbor", atmosphere: "mysterious", startsWith: "urgent" },
  { id: "archery_contest",     setup: "A herald announces a contest — the king's daughter will marry whoever can string the great bow. You happen to be in the courtyard when the contest begins.", location: "palace_yard", atmosphere: "tense", startsWith: "mystery" },
  { id: "wounded_centaur",     setup: "A centaur lies wounded in the road, three arrows in his flank. He looks up at you with intelligent, agonized eyes. \"Spare a moment for a dying brother.\"", location: "road", atmosphere: "urgent", startsWith: "mystery" },
  { id: "oracle_priest_dead",  setup: "You arrive at Delphi to find the temple guards in chaos. The Oracle's chief priest is dead, killed in the night. No witnesses. No clear motive. And you're a stranger in town.", location: "delphi", atmosphere: "tense", startsWith: "mystery" },
  { id: "underground_river",   setup: "The river that runs through the city has stopped flowing. The aqueducts are dry. Old people whisper about angering Poseidon. You happen to know someone who knows where the water went.", location: "city", atmosphere: "tense", startsWith: "journey" },
  { id: "masquerade_ball",     setup: "You are invited — anonymously — to a masquerade ball at a noble's estate. The note simply says: \"Wear the gold mask. Trust no one. Come alone.\"", location: "noble_estate", atmosphere: "mysterious", startsWith: "mystery" },
  { id: "plague_village",      setup: "You arrive at a village in time to see the priests burning the dead. A plague has come — quick and merciless. Strangers are not welcome. But one survivor recognizes you.", location: "plague_village", atmosphere: "tense", startsWith: "mystery" },
  { id: "wolves_attack",       setup: "Wolves descend on the road as you travel. Bigger than wolves should be. Smarter. They circle you in formation, like soldiers. Something is very wrong with them.", location: "road", atmosphere: "dangerous", startsWith: "combat" },
  { id: "fortune_teller",      setup: "A fortune teller stops you in the street and grabs your wrist. Her eyes go wide. \"You. You are the one. Three days from now, on the southern road, choose the left fork or you will die.\"", location: "city_street", atmosphere: "mysterious", startsWith: "divine" },
  { id: "rival_challenge",     setup: "A rival you haven't seen in years finds you in the agora. \"I challenge you. Single combat at the temple steps. Tomorrow at dawn. Refuse and everyone will know your shame.\"", location: "agora", atmosphere: "tense", startsWith: "combat" },
  { id: "forgotten_temple",    setup: "You stumble across a temple you've never seen before — and yet, you know it. As if you've dreamed of it. The doors stand open. Something inside hums softly.", location: "forgotten_temple", atmosphere: "sacred", startsWith: "divine" },
  { id: "banker_summons",      setup: "A wealthy banker summons you to his villa. \"I have a contract for someone of your... particular skills. Discretion is essential. The reward is more gold than you've ever held.\"", location: "villa", atmosphere: "mysterious", startsWith: "mystery" },
];

export function pickOpener(): AdventureOpener {
  return ADVENTURE_OPENERS[Math.floor(Math.random() * ADVENTURE_OPENERS.length)];
}
