// Olympus — authored offline quest library (v1.10.80).
//
// Before this pass, the no-API-key fallback path was a per-scene
// random pull from a kind-bucket pool — beautiful prose, but no
// actual branching: scene N+1 was just "pick a body for the choice
// kind." There was no quest, no narrative arc.
//
// This module provides real authored quests with branching scene
// graphs. Each quest is a hand-written ~10-decision arc with:
//   - 1 opener (~250 words)
//   - 3-4 branching first-act paths that converge by act 2
//   - mid-quest twists/revelations
//   - a climactic encounter scene
//   - a final scene with the required twist/whatIf/coda ending
//
// When no Anthropic key is set, ai.ts picks a random quest from
// QUEST_LIBRARY and walks the player through it. Choices have
// explicit `leadsTo` so each decision points to a specific next
// scene, not a random one. Companions, items, encounters, and
// evolutions all work in the authored path.
//
// When a key IS set, ai.ts uses Claude as before — these quests are
// the offline baseline, not a degraded mode.
//
// Each quest is structured as a flat scenes map, not a deep tree,
// so the same scene can be entered from multiple paths.

import type { Adventure, Choice, Hero, Scene } from "./types";

export interface QuestSceneNode {
  id: string;
  body: string;
  resolution?: string;
  atmosphere: Scene["atmosphere"];
  encounter?: Scene["encounter"];
  effects?: {
    xpDelta?: number;
    hpDelta?: number;
    itemsAdded?: Scene["itemsAdded"];
  };
  // Either choices OR isEnding with twist/whatIf/coda.
  choices?: Array<{
    label: string;
    detail?: string;
    kind: Choice["kind"];
    leadsTo: string;
  }>;
  isEnding?: boolean;
  twist?: string;
  whatIf?: string;
  coda?: string;
}

export interface OfflineQuest {
  id: string;
  title: string;
  hook: string;
  patron?: string;
  /** Approximate scene count visited in a single playthrough. */
  totalDecisions: number;
  actBoundaries: { act1End: number; act2End: number };
  startSceneId: string;
  scenes: Record<string, QuestSceneNode>;
}

// ── Helpers used inside scene bodies for hero/companion personalization

const HERO = "{HERO}"; // replaced with hero.name at runtime
const COMPANION = "{COMPANION}"; // replaced with hero.companion?.name ?? "your companion"

function interpolate(s: string, hero: Hero): string {
  const heroName = hero.name;
  const compName = hero.companion?.name ?? "your companion";
  return s.replace(/\{HERO\}/g, heroName).replace(/\{COMPANION\}/g, compName);
}

// ════════════════════════════════════════════════════════════════════
// QUEST 1 — "The Cyclops of Mount Othrys"
// Combat / exploration lean. Tests bravery vs cunning.
// ════════════════════════════════════════════════════════════════════

const CYCLOPS_QUEST: OfflineQuest = {
  id: "cyclops_othrys",
  title: "The Cyclops of Mount Othrys",
  hook: "A village on Mount Othrys has lost three goats and a shepherd to a one-eyed giant. They've sent for help.",
  patron: "Athena",
  totalDecisions: 10,
  actBoundaries: { act1End: 4, act2End: 8 },
  startSceneId: "cy_open",
  scenes: {
    cy_open: {
      id: "cy_open",
      atmosphere: "tense",
      body: `The village of Skala sits on the lower slope of Mount Othrys like a child sheltering behind a parent's knee — squat stone houses, terraced olives going silver in the morning wind, a single bronze bell hung in a fig tree that nobody has rung in three days. {HERO}, you have walked the last league of the goat-track in the cool blue hour before sunrise. You smell wood-smoke that has been kept low and small, the kind people burn when they want to be warm but not seen.

The headman meets you at the well with a face that has not slept properly in a week. His name is Olynthos and his hands shake very slightly as he pours you water from the bucket. "Three goats," he says, before you have asked. "And old Demos — the shepherd up the high meadow. We found his crook. We did not find him." He looks up at the mountain. The mountain looks back, indifferent, the long stone teeth of its ridge catching the first sun.

{COMPANION} has gone unnaturally still at your side, sniffing the air. A child watches you from a doorway. A woman crosses herself. Someone, somewhere in the cluster of houses, is praying out loud to Athena — you catch the word *parthenos* and the broken end of a request.

"He sleeps up there," Olynthos says quietly. "A Cyclops, my grandmother would have called him. Just one eye, and a fist that took our shepherd. We have no one to send. The road from Athens is long. You came faster than the message."

You set down the cup. The bronze bell does not ring. The mountain waits.`,
      choices: [
        { label: "Climb to the high meadow at once — daylight favors you", detail: "Go up while the sun is your ally and the giant might be asleep.", kind: "combat", leadsTo: "cy_climb_day" },
        { label: "Ask the headman everything he knows before you set foot on the path", detail: "A shepherd's son or a goat-girl may have seen what nobody has shared.", kind: "wits", leadsTo: "cy_ask_village" },
        { label: "Visit the small shrine on the edge of town and offer a coin to Athena", detail: "If you climb a giant's mountain, climb it with a god's attention.", kind: "magic", leadsTo: "cy_shrine" },
        { label: "Wait until dusk and approach with stealth under the falling light", detail: "Cyclopes hunt by sight. The half-dark blunts a one-eyed creature most.", kind: "stealth", leadsTo: "cy_wait_dusk" },
      ],
    },

    // ── Act 1 branch: charge up by day ──
    cy_climb_day: {
      id: "cy_climb_day",
      resolution: `You shoulder your pack and start up the goat-track without ceremony. The villagers watch you go in the silence that people keep when they cannot decide whether they are sending a saviour or another offering.`,
      atmosphere: "tense",
      effects: { xpDelta: 4 },
      body: `The track climbs harder than it looks. Within an hour your thighs are burning and the village is a small white smear in the valley behind you. The morning sun lifts; the wind carries the smell of crushed thyme and warmed stone. {COMPANION} keeps pace at your heel, ears pricked at every change in the wind.

Then — a sound. A heavy, slow chuff of breath from the next bend, like a bellows worked by someone who does not need to hurry. You go very still. The hairs at the back of your neck lift. Whatever is around that bend has not yet smelled you. The wind is in your favour, but only barely.

A boar steps into view at the next switchback — old, scarred, the tusks of a creature that has fought wolves and won. It freezes at the sight of you. {HERO}, it has the look of something that may not be hungry, but is willing.`,
      encounter: {
        enemies: [{ id: "cy_boar", name: "Mountain Boar", hp: 30, hpMax: 30, emoji: "🐗" }],
        tagline: "A mountain boar blocks the path.",
      },
      choices: [
        { label: "Brace your weapon and meet the boar's charge head-on", detail: "Tusks against steel. The mountain rewards the bold.", kind: "combat", leadsTo: "cy_boar_fight" },
        { label: "Hurl a stone wide of its head and use the moment to dart past", detail: "A boar that turns to the noise gives you three heartbeats of road.", kind: "stealth", leadsTo: "cy_boar_evade" },
        { label: "Hold absolutely still and let it decide whether you are food", detail: "Some predators only chase what runs. Stillness is a kind of weapon.", kind: "wits", leadsTo: "cy_boar_still" },
      ],
    },

    cy_boar_fight: {
      id: "cy_boar_fight",
      resolution: `The boar charges, head low, tusks white in the morning light. You set your stance the way old soldiers taught you — feet wide, weight back, weapon angled.`,
      atmosphere: "dramatic",
      effects: { xpDelta: 8, hpDelta: -6, itemsAdded: [{ name: "Mountain boar tusk", kind: "trophy", qty: 1 }] },
      body: `The fight is brief, the way most real fights are. The boar drives in; you step left at the last instant, and your blow lands where the spine meets the skull. A grunt, a stagger, a hot rush of breath against your wrist — and then the weight of the thing folds heavily down onto the track. Blood darkens the limestone.

{COMPANION} circles the carcass, hackles slowly subsiding. You crouch and break off a tusk with the flat of your blade — it comes away with a small clean snap and slides into your pack. A trophy, yes. Also a tool. The shepherds will know what fell here.

Above you, the track climbs into a stand of pale pine. The wind shifts and brings down, faintly, a smell that is neither pine nor stone — something sour, something animal, something that has lived in one place too long. The Cyclops's den is close.`,
      choices: [
        { label: "Push on while the wind is in your favour and your blood is up", kind: "combat", leadsTo: "cy_cave_approach" },
      ],
    },

    cy_boar_evade: {
      id: "cy_boar_evade",
      resolution: `You snatch up a fist-sized stone and whip it down the slope behind the boar. It cracks against shale with a satisfying ring. The boar's head jerks toward the noise — and you are already moving.`,
      atmosphere: "tense",
      effects: { xpDelta: 6 },
      body: `Three heartbeats. That is what the trick buys you. Three heartbeats to ghost past the boar's shoulder, {COMPANION} at your hip, and around the next switchback before the animal turns back to find empty road and a fading scent. By the time it works out it has been outwitted, you are above it, around the bend, and out of its territory.

You do not stop until the burn in your lungs forces it. Then you crouch behind a knee-high wall of dry-stone, listening. No hoofbeats follow. The wind shifts and brings down something new from above — a sour animal smell, thick and rancid, that has nothing to do with boar or pine. {HERO}, you have arrived at the upper meadow. The Cyclops's den is somewhere above you.`,
      choices: [
        { label: "Move on, quickly and quietly, before the wind shifts back", kind: "stealth", leadsTo: "cy_cave_approach" },
      ],
    },

    cy_boar_still: {
      id: "cy_boar_still",
      resolution: `You go absolutely still. Your hand finds {COMPANION}'s scruff and steadies them too. You stop breathing for a long count.`,
      atmosphere: "tense",
      effects: { xpDelta: 5 },
      body: `The boar lifts its head, snuffs the air, takes one heavy step, snuffs again. Its small black eye is on you and seeing nothing — a still thing in a still landscape, indistinguishable from rocks. After what feels like a quarter of an hour but is probably twenty heartbeats, it decides you are not worth its time, lowers its tusks, and shoulders past you down the track toward the village.

You exhale slowly. {COMPANION} releases the breath you didn't know they had been holding either. The road above is clear. Above and behind the next stand of pine, the wind brings a sour animal smell that doesn't belong to the boar. The Cyclops's den. You move on.`,
      choices: [
        { label: "Pick your way upward — eyes open, weapon ready", kind: "exploration", leadsTo: "cy_cave_approach" },
      ],
    },

    // ── Act 1 branch: ask the village ──
    cy_ask_village: {
      id: "cy_ask_village",
      resolution: `You set down your pack and ask Olynthos for everyone who has been on the mountain in the last fortnight. He calls them to the well, one by one.`,
      atmosphere: "calm",
      effects: { xpDelta: 5, itemsAdded: [{ name: "Goat-girl's hand-drawn map", kind: "quest", qty: 1 }] },
      body: `The goat-girl is named Mira and she cannot be more than eleven, and she scratches a map of the high meadow into the dirt with a stick. The shepherd's nephew, a wiry boy of fifteen, tells you about a cave behind the lightning-struck pine — the *splinter pine*, he calls it. An old woman, blind in one eye herself, tells you that her great-grandmother saw a Cyclops once, when she was a girl, and that "they sleep in the heat of the day and they hate the smell of vinegar."

You commit the map to memory and accept the small flask of vinegar that Mira's grandmother presses into your hand without a word. {COMPANION} pushes its head against your hip in a way that says *we should go now*. The villagers do not see you off; they are not the kind of people who watch goodbyes. They simply turn back to whatever needed doing in their houses.

The mountain is still there. But the mountain has become much smaller — a place with a splinter pine, and a cave behind it, and an enemy with a known weakness. You begin to climb.`,
      choices: [
        { label: "Head for the splinter pine by the most direct route", kind: "exploration", leadsTo: "cy_cave_approach" },
        { label: "Loop around the back to come at the cave from above", kind: "stealth", leadsTo: "cy_cave_above" },
      ],
    },

    cy_cave_above: {
      id: "cy_cave_above",
      resolution: `You take the long way — up the spur of bare rock that ridges around the meadow, then a careful descent along the goat-traces. The detour costs you an hour but buys you the high ground.`,
      atmosphere: "mysterious",
      effects: { xpDelta: 4 },
      body: `You crouch behind a granite shoulder and look down into the meadow from above. The splinter pine is exactly where Mira drew it — a great old tree, half-sheared by lightning a generation ago, its remaining branches gone the pale grey of old bone. Behind it, the cave-mouth gapes in the hillside like a missing tooth.

Outside the cave: a sleeping shape. Larger than three men. One arm thrown across the eyes against the noon glare. The chest rising and falling slowly. A pile of bones the size of a sheep-pen sits near one hand. Of the missing shepherd, you see no sign — except, perhaps, a single sandal, half-buried in the bone heap, the leather strap still tied.

The vinegar flask is in your hand. {COMPANION} has gone absolutely still. The wind is in your favour. From this angle, you can see something the villagers could not: a small chimney-vent in the cave roof, narrow but real, breathing out a thin curl of smoke. A campfire? Or — older, more interesting — a natural draft to a deep cleft inside.`,
      choices: [
        { label: "Pour the vinegar into the cave-vent and wait for what comes up", detail: "An old woman swore by it. Trust her grandmother's grandmother.", kind: "wits", leadsTo: "cy_vinegar_trap" },
        { label: "Drop quietly into the meadow and confront the Cyclops while it sleeps", detail: "A sleeping giant is still a giant. But it is asleep.", kind: "combat", leadsTo: "cy_sleeping_strike" },
        { label: "Climb down to the bone pile first and find what the shepherd left behind", detail: "The dead leave clues. So do the half-dead.", kind: "exploration", leadsTo: "cy_bonepile" },
      ],
    },

    // ── Act 1 branch: shrine ──
    cy_shrine: {
      id: "cy_shrine",
      resolution: `You walk past the well, past the last cluster of houses, to the small whitewashed shrine at the edge of the olives. You leave a single bronze coin on the lintel and bow your head.`,
      atmosphere: "divine",
      effects: { xpDelta: 6 },
      body: `The shrine is barely larger than a beehive — a square of plastered stone, an iron grille across the front, a single niche with a smoothed-river stone where a statue might once have stood. The painted face above the lintel has long since weathered down to a smear, but you know whose face it is. You bow. You set your bronze coin on the cool stone of the lintel. The coin does not fall.

You straighten — and find, to your quiet alarm, that someone is standing at your shoulder. A woman in a grey traveller's cloak, hood half-up, eyes the colour of beaten pewter. She must have come up the road behind you, but you did not hear her, and {COMPANION} — who would have heard anything mortal — did not turn its head.

"Take this," she says, without preamble. She presses a small thing into your palm: a chip of polished olive-wood, no bigger than a thumbnail, warm to the touch. "When the giant comes for you, hold this up. Speak my name." She does not say her name. She does not need to. She turns and walks back the way she came and is somehow already at the far end of the road by the time you have closed your fingers over the wood. The bronze coin on the lintel has gone.`,
      choices: [
        { label: "Climb the mountain at once, the warm wood gripped tight", detail: "A god has touched your day. Use it before they forget you.", kind: "magic", leadsTo: "cy_cave_approach" },
        { label: "Sit a while at the shrine and consider what you have just been given", detail: "Sometimes a gift is also a question. Better to know which.", kind: "wits", leadsTo: "cy_ask_village" },
      ],
      // Persistent: hero now has Athena's olive-wood chip — referenced in encounter
    },

    // ── Act 1 branch: wait for dusk ──
    cy_wait_dusk: {
      id: "cy_wait_dusk",
      resolution: `You spend the afternoon in the village square sharpening your blade slowly, then more slowly, until the sun has dropped behind the next ridge and the air goes blue with the gathering hour.`,
      atmosphere: "mysterious",
      effects: { xpDelta: 4 },
      body: `The villagers feed you a stew of barley and lamb and pretend not to watch you eat. {COMPANION} accepts a bone from a boy who immediately runs away again. The sun drops, the wind drops, and the temperature drops with them. The light goes from honey to bronze to slate. When you finally rise, even the goats have stopped bleating.

You climb in the long blue hour between sunset and full dark. The track is harder to see but the heat is gone from your steps. You take three switchbacks before you sense the change in the air — a sourness, a heaviness, the breath of something that lives in one place too long. Above the next stand of pine, where Mira's whispered description would have placed the splinter pine, a single low fire burns. You can hear it. Wood crackling slowly. Something dragging slowly across stone.

The Cyclops is awake.`,
      choices: [
        { label: "Press on quietly — your eyes have adjusted, the giant's one eye has not", kind: "stealth", leadsTo: "cy_cave_approach" },
        { label: "Circle around to come at the cave from above the splinter pine", kind: "exploration", leadsTo: "cy_cave_above" },
      ],
    },

    // ── Act 2: convergence at the cave ──
    cy_cave_approach: {
      id: "cy_cave_approach",
      resolution: `You move into the meadow with the practiced slow steps of someone who has hunted before and knows the cost of being wrong.`,
      atmosphere: "dramatic",
      effects: { xpDelta: 5 },
      body: `The splinter pine looms out of the gloom — half a tree, half a memorial, every needle gone, the wood pale as old bone. Behind it, the cave-mouth yawns. The Cyclops is there. You see him before he sees you, and that is the entire mercy of the moment.

He sits on a slab of granite worn smooth by his own backside, turning a roasting spit over a small careful fire. On the spit, a goat. Around the fire, bones, neatly stacked. He is enormous — perhaps three of you stood on each other's shoulders — and his one eye in the centre of his forehead is the colour of wet flint. He hums under his breath. The hum is not a tune you recognise. It is, if you listen carefully, a lullaby.

A man's voice, hoarse and small, says from the back of the cave: "Don't." Old Demos the shepherd, alive, tied to a stalagmite, watching you with eyes huge in the firelight.

The Cyclops looks up. The roasting goat drips, slowly, into the fire. He sees you. His humming stops. His huge head tilts to one side, exactly the way a curious dog's would.`,
      encounter: {
        enemies: [{ id: "cy_cyclops", name: "The Cyclops of Othrys", hp: 110, hpMax: 110, boss: true, emoji: "👁️" }],
        tagline: "A one-eyed giant of Othrys, holding a shepherd captive.",
      },
      choices: [
        { label: "Charge — strike for the great eye before he stands", detail: "Speed first, force second. Cyclopes are slow to rise.", kind: "combat", leadsTo: "cy_climax_combat" },
        { label: "Speak. Ask him — by what right does he keep an Athenian man tied?", detail: "Some giants were children of Titans. Some can still speak.", kind: "persuasion", leadsTo: "cy_climax_speak" },
        { label: "Throw the vinegar flask into the fire and ready your blade for the smoke", detail: "Mira's grandmother swore by it. The flame will roar and his eye will water.", kind: "wits", leadsTo: "cy_climax_vinegar" },
        { label: "Use the moment — slip along the cave wall toward the shepherd and cut him free", detail: "A freed captive is a second pair of hands. The cyclops can wait.", kind: "stealth", leadsTo: "cy_climax_rescue" },
      ],
    },

    cy_vinegar_trap: {
      id: "cy_vinegar_trap",
      resolution: `You uncork the flask. Vinegar smells sharp and clean in the mountain air. You pour the whole flask into the chimney-vent — every drop — and step back.`,
      atmosphere: "dramatic",
      effects: { xpDelta: 7 },
      body: `For a long count, nothing. Then, from inside the cave, a roar that is not anger but pure outraged surprise — the way a child sounds when the bath water is suddenly cold. The sleeping shape in the meadow below convulses upright, both massive hands clapped over its one streaming eye. It staggers blind out of its cave-mouth, bellowing, scrubbing at its face with its forearm.

{HERO}, this is the moment. The giant is awake, in pain, and cannot see. {COMPANION} has flattened to the rock at your side, taut as a bowstring. The shepherd's voice — if he is alive — is somewhere in that cave. The next ten heartbeats decide everything.`,
      choices: [
        { label: "Drop into the meadow and strike at the bellowing giant", detail: "Now or never. Blind and roaring beats sleeping and waking.", kind: "combat", leadsTo: "cy_climax_combat" },
        { label: "Scramble down the back of the rock and into the cave for the shepherd", detail: "The giant is occupied. The captive is not.", kind: "stealth", leadsTo: "cy_climax_rescue" },
      ],
    },

    cy_sleeping_strike: {
      id: "cy_sleeping_strike",
      resolution: `You drop into the meadow on the balls of your feet, blade out, and cross the open ground in seven careful strides. The Cyclops's chest rises and falls in long slow breaths.`,
      atmosphere: "dramatic",
      effects: { xpDelta: 4, hpDelta: -8 },
      body: `You stand over the sleeping giant. You have the kind of clear, terrible advantage that a child has when they are about to break a sibling's toy — total and unfair. You raise your weapon. You bring it down.

And the Cyclops, with the speed of a creature that has lived a long time on the wrong end of luck, *moves*. His arm sweeps up; you twist; the blade scores a long line across his collarbone instead of his eye, and his forearm catches you across the chest with the force of a falling pine. You go sideways into the dirt. {COMPANION} is barking, frantic. The giant rises, blood streaming, one eye huge and bright with the personal insult of having been attacked in sleep.`,
      encounter: {
        enemies: [{ id: "cy_cyclops_woke", name: "The Cyclops of Othrys", hp: 90, hpMax: 90, boss: true, emoji: "👁️" }],
        tagline: "Wounded but very, very awake.",
      },
      choices: [
        { label: "Press the attack — you have already cut him, finish what you started", kind: "combat", leadsTo: "cy_climax_combat" },
        { label: "Call out — *Wait! Hear me!* — and see if the giant can be reasoned with at all", kind: "persuasion", leadsTo: "cy_climax_speak" },
      ],
    },

    cy_bonepile: {
      id: "cy_bonepile",
      resolution: `You creep down the spur of rock, into the meadow, and around to the back of the bone heap with your blade out and your breath held.`,
      atmosphere: "grim",
      effects: { xpDelta: 5, itemsAdded: [{ name: "Shepherd's bronze knife", kind: "weapon", qty: 1 }] },
      body: `The bone pile is enormous — a generation of meals, perhaps. Goat, mostly. Sheep. A dog's skull near the bottom, much older. And — there, just where you saw the sandal from above — a man's femur, recently cleaned, lying beside a shepherd's bronze knife with the handle wrapped in red wool. You pocket the knife. It is small but well-balanced, and it is — you understand — exactly the weight of a thing the Cyclops would never miss.

A voice from the cave mouth, low and hoarse: "Down here." Old Demos the shepherd, alive, just visible in the cave's darker shadow, tied to a stalagmite. He has been watching you for the last two minutes. His eyes are bright and terrified and very calm. "Quickly," he whispers. "He sleeps light. He always sleeps light."`,
      choices: [
        { label: "Slip into the cave and cut the shepherd free before the giant wakes", kind: "stealth", leadsTo: "cy_climax_rescue" },
        { label: "Step out and confront the sleeping Cyclops directly", kind: "combat", leadsTo: "cy_sleeping_strike" },
      ],
    },

    // ── Act 3: climax variants converging on ending ──
    cy_climax_combat: {
      id: "cy_climax_combat",
      resolution: `You commit. Steel out, voice raised, the whole of your training and your fear converted in a heartbeat into pure motion.`,
      atmosphere: "dramatic",
      effects: { xpDelta: 16, hpDelta: -14 },
      body: `The fight is brutal and short. The Cyclops swings wide, the way large creatures do when they cannot be sure of distance — and you duck inside his guard, the way a small creature must. Your blade finds purchase. He bellows. {COMPANION} darts in at his ankle, drawing his eye for the half-second you need.

You strike for the eye. The blow lands true.

The giant goes down with a sound that is not a roar but a long surprised sigh — the sound of a great pine falling in a quiet forest. He is on his back, blind in his only eye, breath coming hard. He is not dead. {HERO}, he is not even particularly angry now. He is just very, very tired, and very, very afraid.

You stand over him with your blade lowered. Old Demos the shepherd, freed from his bindings by {COMPANION}'s gentle gnawing, sits in the cave mouth and watches with eyes huge in the firelight. The Cyclops, blind, turns his great head slowly toward where he last heard you stand, and says, in a voice like a child waking from a nightmare: "Mother?"`,
      choices: [
        { label: "Walk away. Spare him. He is finished here, and the village is safe.", detail: "Some endings are not deaths.", kind: "wits", leadsTo: "cy_ending_spared" },
        { label: "End it cleanly — for the shepherd, for the goats, for those who could not fight back.", detail: "Mercy is also a kind of cruelty, in the wrong hands.", kind: "combat", leadsTo: "cy_ending_killed" },
      ],
    },

    cy_climax_speak: {
      id: "cy_climax_speak",
      resolution: `You stop where you are, your voice steady, your weapon lowered just an inch. "By what right," you ask, into the cave mouth, "do you tie an Athenian shepherd to a stone in your home?"`,
      atmosphere: "tense",
      effects: { xpDelta: 12 },
      body: `The Cyclops's huge hand pauses on the spit. The roasting goat drips. The fire cracks. His one great eye narrows in the firelight, and then — to your considerable surprise — he speaks. His voice is deeper than any voice you have heard before. It is also surprisingly young.

"He took my brother's bones," the Cyclops says, indicating the splinter pine with a tilt of his head. "Buried under that tree, when I was a child. His sons came in the night and dug them up for charms. My mother told me to keep him. I am keeping him." He looks at old Demos the shepherd, who is staring at the floor very intently. The shepherd nods very, very slowly.

{HERO}, you have not been told the whole story. You have been told a story. The villagers spoke of a giant that took a shepherd. They did not speak of bones. The Cyclops watches you, waiting to see what kind of person came up his mountain.`,
      choices: [
        { label: "Promise that the bones will be returned and rebuilt, if he releases the shepherd unharmed", detail: "An honest broker is rare. Be one now.", kind: "persuasion", leadsTo: "cy_ending_negotiated" },
        { label: "Strike anyway. He has killed your countrymen and stolen their goats. That much is true.", detail: "Two truths can both want blood.", kind: "combat", leadsTo: "cy_climax_combat" },
      ],
    },

    cy_climax_vinegar: {
      id: "cy_climax_vinegar",
      resolution: `You whip the small clay flask underhand into the centre of the campfire. It cracks against a hot stone and bursts.`,
      atmosphere: "dramatic",
      effects: { xpDelta: 10, hpDelta: -6 },
      body: `The fire roars. A column of acrid white smoke goes up the cave-mouth like a thrown cloak. The Cyclops's one great eye streams instantly; he roars, slaps both hands over his face, lurches blind to his feet, and crashes against the cave wall hard enough to bring down a small fall of stone. The goat drops off the spit. Old Demos shouts something you cannot make out.

{HERO}, the moment is yours. Your eyes are watering too, but you can see, and the giant cannot. You move.`,
      choices: [
        { label: "Strike for the eye while he is still blinded", kind: "combat", leadsTo: "cy_climax_combat" },
        { label: "Dart past him to the shepherd and cut him free first", kind: "stealth", leadsTo: "cy_climax_rescue" },
      ],
    },

    cy_climax_rescue: {
      id: "cy_climax_rescue",
      resolution: `You take the long curve along the cave wall. {COMPANION} follows in the same crouched silence. The Cyclops's back is turned. The shepherd's eyes find yours and go wide.`,
      atmosphere: "tense",
      effects: { xpDelta: 9 },
      body: `Three strides. Two. One. Your blade parts the leather bindings around old Demos's wrists in a single careful pull. He gasps. The Cyclops — who has been turning the spit, half-humming, half-listening — turns his enormous head.

You are between the giant and the shepherd. {COMPANION} is between you and the cave mouth. The shepherd is on his feet but unsteady. The Cyclops takes one step toward you, then another, then stops. His one great eye fixes on the shepherd, on you, on the cut leather, on the small bronze blade still in your hand. He looks, suddenly, less like a monster and more like a creature who has just realised something is being taken from him.

"You don't understand," he says quietly. His voice is — surprisingly — young. "He took my brother's bones."`,
      choices: [
        { label: "Hear him out before you decide", kind: "persuasion", leadsTo: "cy_climax_speak" },
        { label: "Run for the cave mouth with the shepherd — talk later, breathe now", kind: "stealth", leadsTo: "cy_ending_escape" },
      ],
    },

    // ── ENDINGS ──
    cy_ending_spared: {
      id: "cy_ending_spared",
      resolution: `You lower your weapon and step back. The Cyclops curls onto his side, both massive hands cupped over his ruined eye, and weeps — softly, the way a much smaller creature would.`,
      atmosphere: "calm",
      effects: { xpDelta: 22, hpDelta: 4, itemsAdded: [{ name: "Cyclops's small bronze whistle", kind: "trophy", qty: 1 }] },
      body: `You lead old Demos out of the cave by the elbow. He is shivering despite the warm night. {COMPANION} keeps pace at your other side, alert in the way of an animal who has just understood the shape of what almost happened. You do not look back. Behind you, the Cyclops's weeping continues for a long time, getting quieter and quieter as you descend, until at last the wind takes it and you cannot hear it at all.

Halfway down the mountain, in your pocket, you find something you do not remember picking up — a small bronze whistle on a strip of red wool. It must have been beside the bone-heap. You will give it to Mira, you decide, when you reach the village. She will know what to do with it. A child always does.`,
      isEnding: true,
      twist: `Halfway down the mountain, the grey-cloaked woman from the shrine passes you on the road, going UP. You do not see her face. She nods to you exactly once, the small grave nod of one craftsman acknowledging another's good work, and is gone into the higher trees before you have fully registered her presence. The next morning, the villagers say there are no women in the village who match her description, and the small bronze coin you left on the shrine lintel has been replaced — with a small chip of polished olive-wood.`,
      whatIf: `Briefly, walking back along the goat-track, you imagine the version of this day in which you had killed the Cyclops cleanly when he asked for his mother. You imagine the silence of the village afterwards; not relief, exactly, but a small held breath. You imagine old Demos thanking you in a voice you would not have wanted to hear. That version of you is still on the mountain somewhere. This one — the one who walked away — is going home with a small bronze whistle in their pocket and a different shape to their heart.`,
      coda: `By the time you reach the village, Olynthos has rung the bronze bell in the fig tree — three slow notes for a returning hero, the old custom. The villagers come out to meet you in the cool blue evening hour. Old Demos walks under his own power, mostly. Mira accepts the bronze whistle gravely with both hands. {COMPANION} eats more lamb than is strictly polite. You sleep that night in a bed of dried lavender. Toward dawn you wake once, certain you have heard, very far up the mountain, the long careful note of a small bronze whistle being blown by hands that finally know how. You listen until you fall asleep again. The mountain holds its quiet. The day will be a clear one.`,
    },

    cy_ending_killed: {
      id: "cy_ending_killed",
      resolution: `You bring your blade down a second time. The Cyclops does not feel it. The mountain accepts the offering of his weight without comment.`,
      atmosphere: "grim",
      effects: { xpDelta: 22, hpDelta: -4, itemsAdded: [{ name: "Cyclops's enormous eyetooth", kind: "trophy", qty: 1 }] },
      body: `Old Demos the shepherd, freed and shaken, will not look at the body. {COMPANION} circles the meadow once and refuses to settle. You stand over what you have done in the long blue silence afterward, and the wind moves through the splinter pine and is gone, and the night birds do not call for some time.

You strip a single great eyetooth from the giant's lower jaw — proof for the village, a trophy for the road. It is the length of your forearm. It will fetch a price in any market that asks no questions.`,
      isEnding: true,
      twist: `Three weeks later, in a tavern in Larissa, a small grey-cloaked woman with pewter eyes will set her cup down beside yours and ask, very quietly, whether you remember that the cyclops, before he died, had spoken. Whether he had mentioned a brother. You will not remember mentioning this to anyone. You will not have. She will not stay for an answer. The tavern-keeper, when you ask, will not remember serving her.`,
      whatIf: `Sometimes, on cold nights, you think about the version of this day in which you lowered your blade when he asked for his mother. You imagine that you and he and the shepherd walked down the mountain in the morning together, and the village was uneasy, and there were difficult years afterward, and a cave on Othrys was sometimes carefully fed in the winters by an old man with a limp. That version of you is not available to be summoned back. The eyetooth in your pack weighs a little more than it should.`,
      coda: `The villagers receive you with the kind of gratitude that has fear underneath it. Olynthos rings the bell in the fig tree three times — the old custom. Children gather to see the tooth. Old Demos drinks too much wine and says little. {COMPANION} sleeps poorly. In the morning the village is generous with bread and silver and you are well on your way before the heat of the day. The mountain behind you is silent. It will, you understand, be silent for a long time. Somewhere far ahead, the road bends, and you bend with it.`,
    },

    cy_ending_negotiated: {
      id: "cy_ending_negotiated",
      resolution: `You sheath your blade slowly and put both hands where the giant can see them. "I will rebuild your brother's grave," you say. "Myself. With these hands. If you release the shepherd unharmed, and harm no one else who climbs this mountain."`,
      atmosphere: "divine",
      effects: { xpDelta: 25, hpDelta: 2, itemsAdded: [{ name: "Strand of olive-wood charm", kind: "artifact", qty: 1 }] },
      body: `The Cyclops considers you a long time. His huge eye is wet. He nods, once, the way a tired old man would. He turns and frees old Demos himself, the bindings parting in his huge hands as if they were string. The shepherd does not look at him; the shepherd walks past him and into the moonlight without a word, and stands beside you on shaking legs.

You and the Cyclops kneel together at the splinter pine and dig. The bones are deeper than you expected — older than you would have guessed. You replace them carefully, in the order you find them, and you cover the grave with the small stones the Cyclops chooses one by one. He weeps without sound through the whole thing. {COMPANION} sits at the perimeter and keeps a respectful distance, head on paws.

When it is done, he gives you something — pressed into your palm, his huge hand closing over yours: a strand of woven olive-wood, no larger than a child's bracelet, smelling faintly of olive smoke and something older. "For your road," he says. "I am sorry about the goats."

The grey-cloaked woman is standing at the edge of the meadow when you turn around. She nods to you, gravely, exactly once.`,
      isEnding: true,
      twist: `Months later, in a quiet temple in Athens, you will hear a priest mention in passing that the village of Skala on Mount Othrys has begun a small annual ritual — at midwinter, a single basket of bread is left at the splinter pine, and every spring it has been taken. The villagers do not know who takes it. They have learned not to ask. The grey-cloaked woman in the meadow that night was Athena. You knew it as soon as she nodded. You did not say so, then or since.`,
      whatIf: `Briefly, walking the road home, you imagine the version of this day in which you struck first and asked nothing. The Cyclops dies. The bones of his brother stay buried under the splinter pine, unmarked, ungrieved. The village is grateful. The mountain is silent in the way that mountains are when something living has been taken from them and not replaced. You imagine the small annual ritual that would not now exist. You imagine the basket of bread that would not be taken. The version of you who chose blood is somewhere on a different road. You will not meet them.`,
      coda: `Olynthos rings the bell in the fig tree three times — the old custom for a returning hero. Old Demos drinks one cup of wine, embraces you wordlessly, and goes home to his wife. Mira refuses the boar's tusk and asks instead about the olive-wood charm — you let her hold it for a careful minute. {COMPANION} eats well and sleeps soundly. In the morning, you walk south as the light comes up, and the small bronze bell rings once behind you as if blown by no one. Somewhere on the mountain, a giant kneels beside a small stone cairn and grieves quietly. You will, you suspect, return to this village. Perhaps not soon. But you will return.`,
    },

    cy_ending_escape: {
      id: "cy_ending_escape",
      resolution: `You half-carry the shepherd out into the meadow at a dead run. The Cyclops's bellow chases you down the slope and then, oddly, falls away — as if he had thought to follow and then thought again.`,
      atmosphere: "mysterious",
      effects: { xpDelta: 14, hpDelta: -3 },
      body: `You do not stop until you are past the splinter pine, past the next stand of trees, past the granite shoulder you climbed up an hour ago. Old Demos collapses behind a low stone wall and you let him. {COMPANION} stands point, ears up, listening for pursuit that does not come.

After a long minute, when neither of you can hear footsteps above, the shepherd whispers, "He said he was keeping me because I — because my brothers — we took his brother's bones." He looks at you with the calm, terrible eyes of a man who has had a great deal of time to think about a small thing. "Years ago. I had forgotten. He had not."

The wind moves through the pines and is gone. Far above, in the meadow you just escaped, you can hear nothing. The Cyclops has not pursued. Perhaps he has gone back into his cave. Perhaps he has gone to the splinter pine and is sitting with what is left of his brother. You will never know.`,
      isEnding: true,
      twist: `On the road back to the village, just before the last switchback, you stop at the small whitewashed shrine on the edge of town. The bronze coin you left on the lintel is gone — but in its place, set into the cool stone, is a small strand of woven olive-wood, exactly the size of a child's bracelet. You did not see anyone come down the mountain past you. The grey-cloaked woman from the morning is nowhere to be seen. {COMPANION} sniffs the lintel once, very carefully, and then lies down beside it.`,
      whatIf: `Briefly, on the way back into the village, you imagine the version of this day in which you had struck instead of run, or spoken instead of struck, or stayed instead of fled. You imagine the small annual ritual that might have begun, the basket of bread that might have been left for him. The version of you who finished the fight is on a different mountain somewhere. The version of you who negotiated is at a small grave under a splinter pine. The version who fled is here, in the cool valley evening, with a shepherd who will live and a giant who will too. You will think about the others, sometimes, on long roads.`,
      coda: `Olynthos rings the bell in the fig tree only twice — the half-old custom for a returning hero whose work is not entirely complete. Old Demos goes home to a wife who weeps over him. Mira asks no questions; she simply takes your hand as you walk through the square and does not let go until you have eaten. {COMPANION} sleeps with her at the foot of her pallet, by mutual unspoken agreement. The mountain above is quiet. You leave at dawn, knowing — without being told — that someone else's road will bring them back here, perhaps, and that the work begun will be finished by another. The small olive-wood charm sits warm in your palm. You walk south.`,
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// QUEST 2 — "The Riddle of the Sphinx-Stone"
// Wits / persuasion lean.
// ════════════════════════════════════════════════════════════════════

const SPHINX_QUEST: OfflineQuest = {
  id: "sphinx_riddle",
  title: "The Riddle of the Sphinx-Stone",
  hook: "A standing stone on the road between Thebes and Delphi has begun asking riddles of travellers. Those who fail are not heard from again.",
  patron: "Apollo",
  totalDecisions: 9,
  actBoundaries: { act1End: 3, act2End: 7 },
  startSceneId: "sp_open",
  scenes: {
    sp_open: {
      id: "sp_open",
      atmosphere: "mysterious",
      body: `The Thebes-Delphi road bends west around the shoulder of a low brown hill, and there at the bend, exactly where the road begins to drop toward the next valley, stands a single tall stone. It is the colour of cold tea, taller than two men, narrower at the top, and it has been there — local tradition holds — since before anyone's grandmother could remember.

It did not used to talk.

For the last six weeks, every traveller on this road has been required to stop at the stone, listen to a riddle spoken in a voice that comes from no obvious mouth, and answer correctly. Those who answer correctly are allowed to pass. Those who do not — and this is what the innkeeper at the last village told you over thin wine the night before — do not come back. Three messengers, a merchant with eight mules, a priestess of Hera, and a goatherd's son have all failed in the last fortnight. The road is becoming impassable. The temple at Delphi has not had its monthly delivery of olive oil. People are starting to mutter about gods.

{HERO}, you crest the rise and the stone is there ahead of you, exactly as described. The road is empty in both directions. {COMPANION} has stopped where the road begins to bend, ears flat, refusing to come further. The stone does not move. The stone, you suspect, is waiting.`,
      choices: [
        { label: "Walk up to the stone and ask politely for its riddle", detail: "Manners cost nothing. Manners may, today, cost everything.", kind: "persuasion", leadsTo: "sp_polite" },
        { label: "Climb the hill to look down on the stone from above before approaching", detail: "An overhead view often shows what a face-on one hides.", kind: "wits", leadsTo: "sp_hilltop" },
        { label: "Search the verge of the road for what the failed travellers left behind", detail: "Bodies decay. The objects bodies carry do not, so quickly.", kind: "exploration", leadsTo: "sp_search" },
      ],
    },
    sp_polite: {
      id: "sp_polite",
      resolution: `You leave {COMPANION} at the bend in the road and walk up to the stone alone. You bow, slightly, the way one bows to a thing older than one's family.`,
      atmosphere: "divine",
      effects: { xpDelta: 6 },
      body: `"I am here to pass, with your blessing," you say. "Would you ask me what you ask?"

There is a pause long enough to count your heartbeat. Then a voice — neither male nor female, neither old nor young, coming from the stone itself or from the air around it — speaks.

"I have a mouth and do not speak. I have a bed and do not sleep. I run, and yet I never tire. The longer I run, the broader I grow. What am I?"

The voice is patient. The voice has, you understand, all the time in the world. You feel {COMPANION} at the bend behind you, not whining, just watching. The wind moves through the dry grass on the hillside and is gone.

You think. The answer, you sense, is in front of you the way a constellation is in front of you on a clear night — already complete, only requiring the eye to make sense of it.`,
      choices: [
        { label: "Answer: A river", detail: "Mouth, bed, runs without tiring, broadens as it goes.", kind: "wits", leadsTo: "sp_correct" },
        { label: "Answer: The wind", detail: "It runs and never tires.", kind: "wits", leadsTo: "sp_wrong" },
        { label: "Answer: A road", detail: "Bed, runs, broadens.", kind: "wits", leadsTo: "sp_wrong" },
        { label: "Ask the stone for a second riddle, for its asking-fee", detail: "If it is fair, it will accept a fair counter-offer.", kind: "persuasion", leadsTo: "sp_negotiate" },
      ],
    },
    sp_hilltop: {
      id: "sp_hilltop",
      resolution: `You scramble up the slope of the hill — a steeper climb than it looked — and crouch at the lip of the ridge to look down on the stone from above.`,
      atmosphere: "mysterious",
      effects: { xpDelta: 5, itemsAdded: [{ name: "Old bronze ring", kind: "trophy", qty: 1 }] },
      body: `From above the stone is different. It is not just a stone. There is a faint smoothness along the south face — letters, you realise after a moment, weathered nearly to nothing but unmistakable in the angled morning light. You can pick out fragments: *...who answers truly...* and *...by Apollo's hand was set...* and lower, almost invisible, a single complete line: *The river knows its mouth*.

Below you, at the foot of the stone on the road side, a scatter of small things — a sandal, a broken clay seal, the bronze ring you slip into your pocket without thinking, a tooth — half-hidden in the grass. The failed travellers left more than themselves. {COMPANION}, far below at the bend, looks tiny.

You have the answer. Or close enough to it. The stone is asking about a river.`,
      choices: [
        { label: "Descend and answer the riddle, armed with what the inscription told you", kind: "wits", leadsTo: "sp_polite" },
        { label: "Continue searching the grass for more clues before committing", kind: "exploration", leadsTo: "sp_search" },
      ],
    },
    sp_search: {
      id: "sp_search",
      resolution: `You leave the road and walk slowly along its grassy verge, eyes down, the way a tracker reads ground.`,
      atmosphere: "grim",
      effects: { xpDelta: 5, itemsAdded: [{ name: "Folded message scrap", kind: "quest", qty: 1 }] },
      body: `At first there is nothing — flattened grass, the dust of passing carts, the dropping of a long-gone donkey. Then, ten paces past the stone, half-hidden under a flat slab, you find a small leather satchel. Inside: a folded scrap of parchment, the corner of a wax seal, and the bronze stylus of a temple scribe.

The parchment, when you unfold it, is a list — a tally, in a neat trained hand. *Riddle the first*: a river. *Riddle the second*: a shadow. *Riddle the third*: the year. *Riddle the fourth*: memory. The scribe had been keeping notes. He had gotten three answers right before the fourth caught him out — and below the fourth, in a shakier hand, the single word *no*.

You pocket the parchment with care. The stone, you understand now, asks the same riddles in the same order. The list is short because the scribe got short.`,
      choices: [
        { label: "Approach the stone with the cribsheet, ready to give the first answer", kind: "wits", leadsTo: "sp_polite" },
        { label: "Walk on past the stone without engaging — perhaps it doesn't stop those who do not stop themselves", kind: "stealth", leadsTo: "sp_walk_past" },
      ],
    },
    sp_walk_past: {
      id: "sp_walk_past",
      resolution: `You whistle for {COMPANION}, who comes reluctantly. You walk straight past the stone without looking at it, the way you would walk past a creditor at a festival.`,
      atmosphere: "tense",
      effects: { xpDelta: 4, hpDelta: -10 },
      body: `For three paces, nothing. For four. For five.

On the sixth pace, the road beneath your feet shudders. You feel — not hear — a sound, a pressure in your chest, the way thunder feels before it can be heard. Your knees buckle. {COMPANION} yelps. You are on the ground.

"You did not stop," the voice says, conversational, almost wounded. "Travellers are required to stop."

You get up, slowly. The stone is now behind you. You can see, in the corner of your eye, that it has moved — it is closer to the bend than it was. Or perhaps you are closer to it. The road feels, suddenly, less like a road and more like a corridor. The choice to ignore is no longer available.`,
      choices: [
        { label: "Turn back and apologize, ask for the riddle properly", kind: "persuasion", leadsTo: "sp_polite" },
      ],
    },
    sp_negotiate: {
      id: "sp_negotiate",
      resolution: `"I will answer your riddle," you tell the stone, "if you in turn will tell me yours — who carved these letters into you, and why."`,
      atmosphere: "divine",
      effects: { xpDelta: 9 },
      body: `The pause this time is longer. You feel, almost, the stone considering — a slow patient mineral consideration. Then the voice, more amused than before, answers.

"Apollo set me here. To guard the road. To turn back any who travel it without thought. The riddles are not punishment. The riddles are *attention*. Those who fail did not fail because they did not know — they failed because they did not look. Now: my question stands. Answer it."

The riddle is the same as before — *mouth and bed, runs without tiring, broadens as it goes*. But the stone, you realise, has just told you something else: this is not malice. This is divine work, badly remembered by mortals. Apollo's stone has been on this road for centuries. The travellers who failed were the ones who came at it in a hurry.`,
      choices: [
        { label: "Answer: A river", kind: "wits", leadsTo: "sp_correct" },
      ],
    },
    sp_correct: {
      id: "sp_correct",
      resolution: `"A river," you say. The word leaves your mouth and the air around the stone seems briefly to settle, as if it had been held in a careful breath.`,
      atmosphere: "divine",
      effects: { xpDelta: 14 },
      body: `"Correct," the voice says, with the small private pleasure of a teacher whose lesson has landed. "Pass freely. But — one moment more. Look at your feet."

You look down. At the base of the stone, where the grass meets the worn road, the bronze stylus of a long-dead scribe lies in the dust. Beside it, the small clay seal of a priestess. Beside her, a child's sandal. The voice continues, more quietly now: "Take these. Carry them to Delphi. Tell the temple their names — Aristion, the priestess Eulalia, the boy Phidias. Their families have not had word. The road has been busy with quiet sorrow for some weeks."

{HERO}, you kneel and gather the small things in the fold of your cloak. {COMPANION} comes back up the road and presses against your leg, the alert posture finally easing. The stone is, you realise, only a stone now — or appears to be one. Whatever inhabited it has, for the moment, gone quiet.

You walk on toward Delphi with three small objects and three names. The afternoon shadow of the stone stretches long across the road behind you.`,
      choices: [
        { label: "Press on to Delphi and deliver the names yourself", kind: "exploration", leadsTo: "sp_delphi" },
        { label: "Turn back to the last village to send word with a faster runner", kind: "persuasion", leadsTo: "sp_village_back" },
      ],
    },
    sp_wrong: {
      id: "sp_wrong",
      resolution: `The word leaves your mouth. The air around the stone goes suddenly, terribly cold. You feel — not hear — the soft sound a thing makes when it has been disappointed.`,
      atmosphere: "grim",
      effects: { xpDelta: 2, hpDelta: -22 },
      body: `"Incorrect," the voice says. There is no anger in it. There is, somehow, much worse: there is grief. The ground beneath your feet softens — not literally, but the way a dream-floor softens — and you sink to your knees. {COMPANION}, at the bend behind you, is barking frantically. You cannot answer.

You feel something dark and very heavy settle slowly onto your shoulders, and onto your back, and onto the back of your neck. Your vision narrows to the patch of road directly under your hands.

And then — a small warm hand on your arm. You look up. A boy of perhaps eight is crouched beside you, a clay sandal in his other hand. "Wrong answer," he whispers, almost cheerfully. "Like me. Try again." The weight lifts. You can breathe. The boy is gone before you can see his face clearly. {COMPANION} is still barking. The stone is waiting.`,
      choices: [
        { label: "Answer again, this time more carefully: A river", kind: "wits", leadsTo: "sp_correct" },
      ],
    },
    sp_delphi: {
      id: "sp_delphi",
      resolution: `You walk into Delphi at the long blue hour before dusk. The temple sits on its shoulder of the mountain like a small white animal, asleep.`,
      atmosphere: "calm",
      effects: { xpDelta: 18, hpDelta: 5 },
      body: `The priest at the gate, an old man with the patient face of someone who has greeted three thousand travellers without remembering one of their faces, looks down at the small bundle in your cloak and his expression changes. He calls a younger priest. The younger priest fetches a third. By the time you have explained, in your tired traveller's voice, the small story of the road, you are standing in a small cool side chapel of the temple proper. They are weeping.

The boy's mother is sent for from a village three valleys away. The priestess's husband is brought up from the village below. The scribe Aristion's parents are too old to walk; the temple sends a litter. By the time the moon is up, three families have their grief and their certainty. Some have it kindly, some bitterly, some in the long terrible silence that grief sometimes takes. {HERO}, you stand at the back of the chapel and let the small work of mourning happen in its own time.

The eldest priest finds you afterwards. He places a small bronze coin in your palm — Apollo's own, the lyre stamped on its face — and closes your fingers over it. He does not speak. He nods once, gravely, and turns away.`,
      isEnding: true,
      twist: `Walking south from Delphi the next morning, you pass the stone again — and find that it is gone. The road bends where it always bent, but where the stone stood, the grass has grown over so thickly you cannot find where the base sat. {COMPANION} sniffs the spot and trots on without comment. At the next village, no innkeeper remembers a stone there. The travellers who failed are still missing. The road, simply, is open again. You realise, somewhere on the long road south, that the riddle was for you and the stone was waiting, however long it had to wait, for someone who would not just answer but carry.`,
      whatIf: `Briefly, walking home, you imagine the version of this day in which you guessed *wind* and then *road* and then ran out of guesses. You imagine the small dark heaviness settling onto your shoulders and not lifting. You imagine the boy who came to help you not coming, because the boy who came to help you was perhaps yourself, or perhaps another traveller who answered correctly years before and stayed back, of their own choosing, to help the next one. You do not know whether that is what happened. You may, the bronze coin in your pocket suggests, find out.`,
      coda: `The road home is uneventful. You spend a quiet evening in the last village's inn, eating bread and lentils, while a small clay-skinned boy plays in the dust outside with a wooden top. {COMPANION} accepts a bone and lays down by the door. The innkeeper does not ask why you are happy. The Apollo coin sits warm in your pocket. You sleep deeply that night, for the first time since the road began, and you dream — clearly, in colour — of a river running very wide between two hills, and a voice neither old nor young saying, *correct.*`,
    },
    sp_village_back: {
      id: "sp_village_back",
      resolution: `You turn around at the bend and walk back, the small bundle in your cloak suddenly heavy. {COMPANION} follows without comment. The stone, behind you, says nothing.`,
      atmosphere: "calm",
      effects: { xpDelta: 14, itemsAdded: [{ name: "Apollo's bronze coin", kind: "artifact", qty: 1 }] },
      body: `You reach the village by midafternoon. The innkeeper listens to your story without interrupting, sends a runner up to the priest's house, and pours you wine you do not ask for. Within the hour, three families have been called to the small square. Within two, three names have been spoken aloud. The mother of the boy Phidias weeps standing up; the husband of the priestess Eulalia weeps sitting down; the parents of the scribe Aristion are not surprised, only quietly bowed.

You stand at the edge of the square and let the work of mourning happen in its own time. {COMPANION} sits at your hip, unusually still. When the families have gone home, the village priest — a kind-faced man with a limp — finds you and presses a small bronze coin into your hand. It bears Apollo's lyre. "It was in the offering bowl this morning," he says, "though no one in this village left it. I think it was waiting for you." He smiles, gravely. "Walk well, traveller."`,
      isEnding: true,
      twist: `You spend the night in the village. In the morning, you walk back up the road to look at the stone again — and find that it is gone. The bend in the road is just a bend. The grass has grown over its base so thickly you cannot find where it stood. The villagers, when you ask, look at you the way villagers look at travellers who have been on the road too long. They do not remember a stone. You begin to wonder whether the small bronze coin in your pocket is the only proof you carry of the whole afternoon. It is warm. It is very warm.`,
      whatIf: `Briefly, in the long quiet of the walk back the next morning, you imagine the version of this day in which you had carried the names yourself up to Delphi. Three families would have had their news a week sooner. You would have stood in the cool stone chapel and watched the small terrible work of grief happen there instead of in the village square. Perhaps the eldest priest would have given you a different coin. You will, you suspect, walk that road another day. Today the road has chosen this version of you.`,
      coda: `You leave the village in the cool blue hour before dawn, the small bronze coin warm in your pocket, {COMPANION} trotting at your hip with the easy gait of an animal who has slept properly. The road south runs clear and empty between dry hills. You hum, after a while, a small tune you do not remember learning. Somewhere a long way off, a bell rings once for someone else's reason. You walk on. The day will be a long one. The day will be a clear one.`,
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// QUEST 3 — "The Stolen Lyre of Orpheus"
// Persuasion / stealth lean; sympathetic antagonist.
// ════════════════════════════════════════════════════════════════════

const LYRE_QUEST: OfflineQuest = {
  id: "stolen_lyre",
  title: "The Stolen Lyre of Orpheus",
  hook: "A nine-stringed lyre once belonging to Orpheus has been taken from the temple of the Muses. The temple has offered a reward.",
  patron: "Apollo",
  totalDecisions: 9,
  actBoundaries: { act1End: 3, act2End: 6 },
  startSceneId: "ly_open",
  scenes: {
    ly_open: {
      id: "ly_open",
      atmosphere: "mysterious",
      body: `The temple of the Muses sits at the foot of Mount Helicon — a small white building, hardly larger than a village house, surrounded by olive trees so old their trunks have braided themselves into single twisted columns. The priestess who meets you at the door has not slept. She is perhaps fifty, with the calm hands of someone who has played a stringed instrument all her life. Her name is Kallista.

"The lyre is gone," she says, without ceremony, before you have stepped inside. "Nine-stringed, ivory-bound, the wood seasoned by sea-salt for two centuries. Orpheus himself touched it last — they say. We have kept it for a long time. It vanished the night before last. The lock was not forced. The window was not opened. Nothing else was taken. We have offered a reward of fifty drachmas and the gratitude of nine goddesses. The road is yours, traveller, if you'll take it."

{COMPANION} sniffs the doorway with interest. Inside, the chapel smells of cypress and old wax. A small empty stand on a stone pedestal at the back marks where the lyre stood. The dust on the stand is undisturbed in a near-perfect rectangle — as if the lyre had been lifted straight up by something that did not press its weight on the stand at all.`,
      choices: [
        { label: "Inspect the empty stand and the chapel for what was missed", detail: "A thief who leaves no trace usually leaves the wrong kind of no trace.", kind: "wits", leadsTo: "ly_inspect" },
        { label: "Walk the perimeter of the temple grounds looking for tracks", detail: "Whoever took it did not vanish into the wall. Or did they?", kind: "exploration", leadsTo: "ly_perimeter" },
        { label: "Ask Kallista who else has come to the temple in the last fortnight", detail: "Strangers' visits cluster around theft like wasps to a fig.", kind: "persuasion", leadsTo: "ly_ask" },
      ],
    },
    ly_inspect: {
      id: "ly_inspect",
      resolution: `You crouch at the pedestal. The dust outline of the lyre is perfect — no smudge, no scrape, no fingerprint at its edges.`,
      atmosphere: "mysterious",
      effects: { xpDelta: 5, itemsAdded: [{ name: "Single grey feather", kind: "quest", qty: 1 }] },
      body: `You crawl on hands and knees around the pedestal. The flagstones at the back of the chapel are clean — perhaps too clean. Behind the pedestal, half-tucked into the shadow of the wall, you find: a single long grey feather. The kind a heron's flight-feather is. The kind a swan's is too, in certain lights. You hold it up. It catches the light from the small window above and seems, for a moment, to shimmer with the faint suggestion of a melody.

You pocket the feather. {COMPANION} sniffs at the spot you took it from and gives a small soft growl that is not quite distress, not quite curiosity. The priestess, watching from the chapel door, says nothing. Whatever took the lyre had wings.`,
      choices: [
        { label: "Show the feather to Kallista and ask if she knows it", kind: "persuasion", leadsTo: "ly_ask_feather" },
        { label: "Walk outside and check the dust of the threshold and the grass beyond", kind: "exploration", leadsTo: "ly_perimeter" },
      ],
    },
    ly_perimeter: {
      id: "ly_perimeter",
      resolution: `You walk a slow circuit of the temple grounds. {COMPANION} runs ahead, nose down, working the ground in tight zigzags.`,
      atmosphere: "tense",
      effects: { xpDelta: 5 },
      body: `The olive grove around the temple is ancient and overgrown. The grass between the trunks is dew-flattened in patches and undisturbed in others. Halfway around the back, {COMPANION} stops and refuses to go further; the hair along their spine is up. You step past them and find what they smelled: a small clearing between three of the oldest olives, the grass in its centre crushed flat in a perfect circle, as if something heavy had set down here briefly and then risen again.

Around the edge of the circle, the grass is singed faintly — not burned, just touched by heat. A single grey feather lies near one edge. You pocket the feather. The clearing smells of something musical — if smells can have music — a clean far-off resonance, like a struck bell heard underwater.`,
      choices: [
        { label: "Bring Kallista out to see what you have found", kind: "persuasion", leadsTo: "ly_ask_feather" },
        { label: "Stay and wait — whatever set down here may come back", kind: "stealth", leadsTo: "ly_wait" },
      ],
    },
    ly_ask: {
      id: "ly_ask",
      resolution: `Kallista leads you to the small priestess-cell beside the chapel and pours you both watered wine. She sits very straight. She has clearly been asked many questions in her life.`,
      atmosphere: "calm",
      effects: { xpDelta: 4 },
      body: `"Three strangers came in the last fortnight," she says. "A merchant from Corinth who wanted a blessing on a shipment of marble. A widow from the lower village who comes every season to leave bread for the Muses' altar — she is harmless. And a boy. Perhaps thirteen, ragged, very thin, very polite. He said he had been sent by his uncle in Athens to learn what he could. He stayed two days. He spoke very little. He held the lyre once, with the priestess's permission, for the length of a single song."

She pauses. "He did not stay for the third night. He left the morning before the lyre disappeared. He was on foot. He took the road south."

She looks at you steadily. "I do not say he took it. I say only what I know."`,
      choices: [
        { label: "Take the road south to find the boy", kind: "exploration", leadsTo: "ly_south_road" },
        { label: "First inspect the chapel and grounds for what the thief left behind", kind: "wits", leadsTo: "ly_inspect" },
      ],
    },
    ly_ask_feather: {
      id: "ly_ask_feather",
      resolution: `You bring Kallista the feather. She turns it over carefully in her long fingers and her face changes.`,
      atmosphere: "divine",
      effects: { xpDelta: 6 },
      body: `"This," she says quietly, "is a Muse's feather. Polyhymnia's, I think — the muse of sacred song. They do not give them up easily." She lifts the feather to the light. It shimmers. "Either the lyre was *taken* by a Muse — which would be… extraordinary — or it was taken to one. By someone who had her favour. There is a boy who came through here a few weeks ago. He was learning. He was very good. He was, perhaps, too good."

She closes her hand over the feather. Her face is calm but her eyes are very alert. "I will tell you this. I do not think the lyre was stolen, exactly. I think it was *taken*. Find the boy. The road south. He will be at a crossroads, or a tavern, or a hill where the wind carries music. Listen for him. He is not hard to find when you know how to listen."`,
      choices: [
        { label: "Take the road south and listen as Kallista said", kind: "exploration", leadsTo: "ly_south_road" },
      ],
    },
    ly_wait: {
      id: "ly_wait",
      resolution: `You crouch behind the largest of the three old olives and settle in to wait. {COMPANION} curls at your feet, miraculously quiet. The afternoon goes by in slow gold light.`,
      atmosphere: "mysterious",
      effects: { xpDelta: 8 },
      body: `Just before dusk — almost exactly as the first star comes out over the ridge — you hear it. Not footsteps. A faint plucked note, then another, then the soft beginning of a melody. It is coming from the direction of the road south.

A boy walks into the clearing. Thirteen, perhaps. Thin. Ragged cloak too large for him, the hood thrown back. In his arms, a nine-stringed lyre carved of dark sea-salted wood, ivory at the joints. He sees you, freezes — and then, when you do not move, slowly sits down on the grass at the edge of the clearing. He sets the lyre across his knees. He does not run. He plays.

The melody is the saddest and most beautiful thing you have ever heard. {COMPANION} lays its chin on its paws and weeps the small soft tears that dogs sometimes weep. You do not move.

When he finishes, he looks up at you. His eyes are very young and very tired. "I'll give it back," he says quietly. "I just needed to hear it once. To know whether what they said was true."`,
      choices: [
        { label: "Sit with him and ask, gently, why he took it", kind: "persuasion", leadsTo: "ly_boy_talk" },
        { label: "Take the lyre back to the temple while he is calm — quickly, kindly", kind: "stealth", leadsTo: "ly_take_back" },
      ],
    },
    ly_south_road: {
      id: "ly_south_road",
      resolution: `You shoulder your pack and take the road south. {COMPANION} keeps pace easily. The road winds between olive groves and goes quiet around midday.`,
      atmosphere: "calm",
      effects: { xpDelta: 5 },
      body: `For half a day there is nothing — only the hot road and the dust of carts. Then, in the long blue hour before sunset, you hear it: a thin, achingly beautiful melody, faint as a memory, coming from the direction of a small stone bridge half a league ahead.

You crest the rise. Sitting on the parapet of the bridge, his bare feet dangling over the slow brown water, is a boy of perhaps thirteen. Ragged cloak. Thin shoulders. Across his knees: a nine-stringed lyre of dark sea-salted wood, ivory at the joints.

He sees you coming long before you reach him. He does not run. He keeps playing. When you sit on the parapet two paces from him, he finishes the melody, lets the last note fade slowly into the evening, and looks up at you with eyes very young and very tired.

"I'll give it back," he says. "I just needed to know whether what they said was true. Whether it would play for me."`,
      choices: [
        { label: "Sit with him and ask, gently, why he took it", kind: "persuasion", leadsTo: "ly_boy_talk" },
        { label: "Reach for the lyre at once and take it back, kindly but firmly", kind: "stealth", leadsTo: "ly_take_back" },
      ],
    },
    ly_boy_talk: {
      id: "ly_boy_talk",
      resolution: `You sit beside him on the parapet. The brown water moves slowly under the bridge. {COMPANION} settles at your feet.`,
      atmosphere: "calm",
      effects: { xpDelta: 11 },
      body: `He tells you. His name is Lykon. His mother died last winter. He has been told all his life by his aunt — a difficult woman — that he had a gift for music, and also that he should stop pretending. He had been studying at the temple of the Muses on the small charity that priestesses sometimes show to thin polite boys. The day before yesterday, alone in the chapel, he had touched the lyre once, with permission. It had hummed for him — actually hummed, the way a bee hums when settled — and the priestess had not noticed. He had to know if that was true.

So he took it. He has been on the road south for two days. He has not eaten since yesterday. He has played the lyre for himself, alone, three times now. Each time it has hummed back. Each time he has wept.

"I will return it," he says, looking down at the dark wood. "I knew I would. I was just — I was just trying to find out who I am before I gave it back."`,
      choices: [
        { label: "Walk back to the temple with him — and speak for him to Kallista", detail: "A boy who returns of his own will deserves an advocate, not an arrest.", kind: "persuasion", leadsTo: "ly_ending_kind" },
        { label: "Take the lyre and go alone — let the boy walk his own road", detail: "Mercy is also a kind of cruelty. He needs to face what he did.", kind: "wits", leadsTo: "ly_ending_solo" },
        { label: "Tell him to keep the lyre and disappear south — you'll tell Kallista you found a thief who escaped", detail: "Lies, sometimes, are also a kind of mercy.", kind: "luck", leadsTo: "ly_ending_lie" },
      ],
    },
    ly_take_back: {
      id: "ly_take_back",
      resolution: `You stand up before he can react. Your hand closes on the lyre. He flinches. He does not fight you. He releases it like a man handing over a held breath.`,
      atmosphere: "grim",
      effects: { xpDelta: 5, hpDelta: -3 },
      body: `He sits very still on the parapet, looking down at the slow brown water under the bridge. He does not look at you. He does not look at the lyre. You can hear him breathing carefully, the way a child breathes when they are trying not to cry in front of an adult. {COMPANION} pushes its head against the boy's knee. The boy puts one thin hand on {COMPANION}'s scruff and leaves it there.

You realise, holding the lyre, that you do not know his name. He has not told you. You have not asked.`,
      choices: [
        { label: "Sit down and ask his name before you go", kind: "persuasion", leadsTo: "ly_boy_talk" },
        { label: "Carry the lyre back to the temple — finish the work, however heavy it sits", kind: "exploration", leadsTo: "ly_ending_solo" },
      ],
    },
    ly_ending_kind: {
      id: "ly_ending_kind",
      resolution: `You walk back to the temple with Lykon at your side. The lyre rides in his hands, not yours. You do not take it from him. You do not feel the need.`,
      atmosphere: "divine",
      effects: { xpDelta: 22, hpDelta: 4, itemsAdded: [{ name: "Polyhymnia's feather", kind: "artifact", qty: 1 }] },
      body: `You walk all of the next day. Lykon plays as you walk — quietly, the lyre in the crook of his arm, learning. {COMPANION} trots ahead, periodically circling back as if to make sure you are both still there. The road is generous. A farmer gives you bread. A woman driving a cart of melons gives Lykon an apple. The lyre hums softly whenever anyone is kind.

You arrive at the temple in the cool blue hour. Kallista is waiting at the door — alerted, perhaps, by the music carried on the wind. She sees Lykon, sees the lyre, sees you. She does not speak for a long moment. Then she nods, gravely, to the boy, takes the lyre from his hands with the small ceremony that priestesses use, and lays it back on its stand.

"Lykon," she says, "you will stay. You will sweep the chapel and tend the lamps and you will be paid in lessons. Two years. Then we will see." She turns to you. She presses something small and warm into your palm: a single grey feather, shimmering faintly. "From Polyhymnia," she says quietly. "She watched you carry him back."`,
      isEnding: true,
      twist: `Three years later, you will hear a singer in a tavern in Patras — a young man, perhaps sixteen, with a nine-stringed lyre and a voice that stops the room. The singer will not remember you. You will not remind him. The priestess Kallista will, in another five years, send a small package to the address you gave her: a folded note in a young clean hand, and a small clay token shaped like the head of a fox. The note will say, simply: *Thank you. — L.*`,
      whatIf: `Briefly, on the walk south after, you imagine the version of this day in which you had taken the lyre and gone, and left Lykon on the bridge. He would not have come back. He would have gone south. You would not have heard of him again. The temple would have the lyre. The world would not have the singer. You imagine the music that would not now exist. The feather in your pocket weighs nothing and weighs everything.`,
      coda: `You leave the temple at dawn. The road south is open and empty and smells of dew. {COMPANION} chases a yellow butterfly for a hundred paces. Somewhere behind you, a small chapel begins to ring with a single careful melody. The melody is not perfect. The melody is alive. You walk on. The day will be a long one. The day will be a kind one.`,
    },
    ly_ending_solo: {
      id: "ly_ending_solo",
      resolution: `You walk back to the temple alone, the lyre in your pack. The boy stays on the bridge. You do not look back. {COMPANION} looks back twice for both of you.`,
      atmosphere: "grim",
      effects: { xpDelta: 14, itemsAdded: [{ name: "Temple of the Muses reward — 50 drachmas", kind: "quest", qty: 50 }] },
      body: `Kallista takes the lyre from your hands gravely. She does not ask where you found it. Perhaps she knows. Perhaps she does not want to know. She lays the lyre back on its stand and the dust outline closes around it perfectly, as if the lyre had never left. She counts out fifty drachmas into your palm. She does not smile.

"There was a boy?" she asks, eventually.

You nod. She nods too. Neither of you says anything else.

Two days south on the road home, in a small village inn, the innkeeper mentions in passing that a thin boy of about thirteen had passed through that morning, headed further south, alone, with no possessions. He did not have a lyre. He sang for his bread. He sang very well.`,
      isEnding: true,
      twist: `You will not hear of him again. Years later, in another country, you will hear a strange tale — of a wandering thin singer who plays no instrument, who travels alone, who sings as if grieving something specific and very particular, and who refuses to enter any temple of the Muses he passes. You will know who it is. You will not seek him out. You did not earn that right.`,
      whatIf: `Sometimes, on long roads, you think about the version of this day in which you had walked back with him. You had spoken for him. You had advocated. He had become an apprentice. He had learned. There would have been, perhaps, a singer in a tavern in Patras with a nine-stringed lyre. Instead there is a thin man somewhere, walking south, singing for his bread without an instrument. You had a choice. You made it. You made it cleanly. That is all you can say for it.`,
      coda: `You walk on with fifty drachmas in your purse and a slight, persistent heaviness in your chest you do not quite name. {COMPANION} is more affectionate than usual on the road home. The weather holds. The road is generous. You take work at a temple in the next valley, and pay for a small lamp to be kept burning at the chapel of the Muses, in a name that is not yours. The candle burns through the winter. You do not return to that temple. You hope, sometimes, in private, that the lyre hums for someone else now.`,
    },
    ly_ending_lie: {
      id: "ly_ending_lie",
      resolution: `You look at Lykon a long moment. Then you take a slow breath. "Keep going," you say quietly. "Walk south. Take the back roads. I'll tell Kallista I found a thief who got away clean."`,
      atmosphere: "mysterious",
      effects: { xpDelta: 12, hpDelta: 2 },
      body: `His eyes widen. He cannot speak. He nods, once, twice, then a third time, faster. He stands. He bows — actually bows — and turns south at a careful walk that, as soon as he is past the next bend, becomes a run.

You watch him go. {COMPANION} watches him too, briefly, then looks at you with the cool considering gaze that dogs sometimes give their humans when a decision has been made that the dog does not fully approve of but will respect.

You walk back to the temple. You tell Kallista the lyre is gone — taken by a thief who escaped. She accepts the answer with the calm flat eyes of someone who has known many lies in her long priestess's life and decided, quietly, which to accept. She does not press. She thanks you for your effort and gives you a small purse of fifteen drachmas — less than the full reward, but enough to be honest about the work. She walks you to the door.

At the threshold she stops you. She looks at you a long moment. She says only: "Walk well, traveller."`,
      isEnding: true,
      twist: `A year later you will hear a song in a marketplace in Crete — a melody that lifts the hair on your arms, performed by a young man with a nine-stringed lyre carved of dark sea-salted wood. He will see you in the crowd. He will not stop singing. He will simply smile, very faintly, and dedicate the next verse to "the traveller who walked the road south on the day I learned my name." You will buy bread that night with a strange, full feeling in your chest. The lie was true after all, in its way. The lyre is being heard. That, perhaps, is all the Muses ever wanted.`,
      whatIf: `Briefly, on the road, you imagine the version of this day in which you returned the lyre and turned him in. He would have learned music at the temple in chains. The lyre would have hummed in the dust under glass. The marketplace in Crete would have a different singer. The world would have one fewer person who knows what it feels like to be saved by a stranger. You made the call. You will live with it.`,
      coda: `Kallista, the priestess, dies six years later in her sleep. The temple of the Muses goes quiet for a season; then a young man with a nine-stringed lyre walks back up the goat-track to Helicon and asks if he may help tend the chapel. He gives his name as Lykon. They take him in. The lyre is, after a small ceremony, returned to its stand — a little more battered, a little better-loved. It hums when he passes it. You read the news in a letter, much later, sent to you by a friend of a friend. You smile. You burn the letter quietly. You walk on.`,
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// QUEST 4 — "Hades' Honest Wager"
// Magic / divine. Lower-key Underworld visit.
// ════════════════════════════════════════════════════════════════════

const HADES_QUEST: OfflineQuest = {
  id: "hades_wager",
  title: "Hades's Honest Wager",
  hook: "An old woman in your village will die tomorrow. Hades sends an offer: trade something for an extra day with her.",
  patron: "Hades",
  totalDecisions: 8,
  actBoundaries: { act1End: 3, act2End: 6 },
  startSceneId: "hd_open",
  scenes: {
    hd_open: {
      id: "hd_open",
      atmosphere: "divine",
      body: `Your aunt has been ill since the autumn. She is the woman who raised you after your mother died — small, quick-handed, sharp-eyed, the one who pressed the wooden charm into your palm the day you left home and told you to hold it when you did not know what to do. You have come back to her village on the news that the doctor has given up.

It is the dark hour just before dawn. You are sitting beside her bed in the small house with the blue door, and her breathing has gone slow and uneven. {COMPANION} lies under the bed, refusing to move. You hold her hand. Her hand is very cold.

A draft moves through the room. The lamp does not flicker. The shutters do not open. But the temperature drops — and beside the bed, in the small chair where her sewing usually sat, a man is suddenly there. Not old. Not young. Beard the colour of cooled iron. Eyes you cannot look at directly. He has not made a sound. He is just there.

"I am here for her," he says. His voice is mild. "Soon. By midday. There is no negotiating that. But — there is one thing I can offer." He gestures at your aunt, at the room, at the small cracked clay cup on the windowsill. "One more day. A full day. Aware, comfortable, able to speak. In exchange for something of yours. Your choice. Your wager."

He waits. He has, you understand, all the time in the world. Your aunt's breath rasps softly. {COMPANION}, under the bed, is whining in a way you have never heard before.`,
      choices: [
        { label: "Offer a year of your life — clean trade, no other ones harmed", detail: "A year is yours to give. You will not miss one you have not yet lived.", kind: "magic", leadsTo: "hd_year" },
        { label: "Offer a memory — pick one to lose, and let it pay for the day", detail: "Memories cost nothing to keep and everything to lose.", kind: "wits", leadsTo: "hd_memory" },
        { label: "Refuse the wager and ask only for the truth — what will tomorrow feel like for her?", detail: "Some bargains are themselves the trap. Ask the next question, not this one.", kind: "persuasion", leadsTo: "hd_refuse" },
        { label: "Offer your aunt's wooden charm — the one she gave you the day you left", detail: "She gave it to you. Give it back. Some debts only close when paid in their own coin.", kind: "luck", leadsTo: "hd_charm" },
      ],
    },
    hd_year: {
      id: "hd_year",
      resolution: `"A year of mine," you say, before you can think about it too long. "From the end of my life — not the front. Take it from when I am old, when I will not feel it taken."`,
      atmosphere: "divine",
      effects: { xpDelta: 14 },
      body: `The man considers you. There is a quiet, surprising approval in the corner of his mouth that does not become a smile. "An honest bargain," he says. "From the end. You will not feel the lack. She will have her day."

He stands. He bows to your aunt, who does not know he was there. The room warms. The lamp, which had not flickered, sputters once and steadies. {COMPANION} comes out from under the bed and pushes its nose against your aunt's cold hand. Her fingers, slowly, close around its muzzle.

She opens her eyes.

"You came," she says, hoarse, soft. "I dreamed you would."`,
      choices: [
        { label: "Spend the day with her — the whole day, nothing else", detail: "There will not be another.", kind: "exploration", leadsTo: "hd_the_day" },
      ],
    },
    hd_memory: {
      id: "hd_memory",
      resolution: `"A memory," you say slowly. "But I — I don't know which to give. They are all hers, in a way."`,
      atmosphere: "mysterious",
      effects: { xpDelta: 10 },
      body: `The man waits. He is, you understand, willing for this to take whatever time it needs to take. You sit with the question. Your aunt's breath rasps softly. {COMPANION} watches you from under the bed.

You realise, slowly, that you do know which memory. The day she pressed the wooden charm into your palm and told you to hold it when you did not know what to do — the small precise moment, the warm wood, the look on her face. The most valuable thing you have. You will keep the *fact* of it — that she did it — but the *feeling* of it, the precise texture of the moment, will be gone. You will know it happened. You will not remember what it was like.

"That one," you say quietly. "The day of the charm."

The man closes his eyes briefly. He nods. "An honest bargain. She will have her day." He raises one hand, palm up, and you feel — not pain, exactly, but a slight lightening, as if a small warm weight has been lifted from somewhere behind your eyes.

You look down at the wooden charm in your palm. It is still warm. But you do not, you realise — cannot — quite remember what it felt like the first time you held it. You know that she gave it to you. You cannot picture her face when she did.

Your aunt's eyes open. "You came," she says.`,
      choices: [
        { label: "Spend the day with her — the whole day, nothing else", detail: "Make the memory you have left, the best it can be.", kind: "exploration", leadsTo: "hd_the_day" },
      ],
    },
    hd_refuse: {
      id: "hd_refuse",
      resolution: `"I will not wager," you say. "Tell me — what will tomorrow be like for her?"`,
      atmosphere: "calm",
      effects: { xpDelta: 12 },
      body: `The man is quiet a long time. He looks at your aunt. He looks at the wooden charm in your hand. He looks back at you.

"She will sleep," he says at last. "She will not suffer. Around midday she will dream of her own mother. The dream will be very kind. At the end of it she will simply — not wake. The crossing will be the smallest step. She will have time afterwards, on the long road through the asphodel, to remember everything she ever loved. I will walk that road with her myself. I do, when the asking is honest."

He looks at you. "Some travellers refuse the wager because they do not understand it. You refused it because you did. That is a rarer thing than you know."

He stands. He bows, very slightly, to your aunt. He bows, deeper, to you. "Keep your year. Keep your memory. Keep the charm." He is gone. The lamp does not flicker. {COMPANION} comes out from under the bed.

Your aunt opens her eyes.

"You came," she says, hoarse, soft. "I dreamed you would."`,
      choices: [
        { label: "Spend the morning with her — the time you have, whatever it is", detail: "She is awake. That is the gift.", kind: "exploration", leadsTo: "hd_the_morning" },
      ],
    },
    hd_charm: {
      id: "hd_charm",
      resolution: `You take the wooden charm from around your neck — you have worn it since the day she pressed it into your palm — and hold it out. "This was hers first. Take it. Give her the day."`,
      atmosphere: "divine",
      effects: { xpDelta: 16, itemsAdded: [{ name: "Aunt's small bronze ring", kind: "artifact", qty: 1 }] },
      body: `The man looks at the charm for a long moment. Then he shakes his head, slowly. "I cannot take it. It is not yours to give to me — it was hers, and she gave it to you, and the giving was the gift. I would only be a thief. But — for offering it freely, I will give you the day anyway. You have already paid in a coin I cannot count."

He bows to your aunt, deeply. He bows to you. He places his hand very gently on the small bronze ring she wears on her little finger — a thing you had not really noticed before — and lifts it free. Her finger does not move. He turns the ring over in his palm and considers it. "I will take this," he says. "She has had it from her own mother. It has carried more women through more griefs than any one piece of bronze should. I will keep it in the Asphodel Meadows for her. When her turn comes for the long walk, I will give it back. She will know me by it."

He hands the ring to you. "Keep it for her until then. She will not be alone."

Your aunt's eyes open. "You came," she says. She sees the ring in your hand. She smiles, the slow tired smile of someone who has been carrying a small fear for a long time. "Oh," she says quietly. "Then it is settled. Good."`,
      choices: [
        { label: "Spend the day with her — the whole day, nothing else", detail: "She knows. Let her show you the things she has been keeping for you.", kind: "exploration", leadsTo: "hd_the_day" },
      ],
    },
    hd_the_day: {
      id: "hd_the_day",
      resolution: `You spend the day with her. She is herself, lucid, gentle, hungry. She eats the bread you bring. She tells you stories you had not heard.`,
      atmosphere: "calm",
      effects: { xpDelta: 18, hpDelta: 6 },
      body: `She tells you, in the slow careful voice of a woman who knows she has time but not infinite time, the things she has been saving. The story of your mother as a child. The story of the day your aunt herself first left this village — at sixteen, headed to Athens, headed back six months later wiser and quieter. The reason for the small bronze ring on her finger. The reason there is a smooth grey stone on the windowsill that you had never asked about. The name of the boy she had loved, briefly, a long time ago, who had drowned in a storm at sea and never come home.

You sit with her through all of it. {COMPANION} lies across her feet. The light through the shutters moves slowly across the room — bronze, then gold, then the long blue evening hour. At dusk, neighbours come quietly to the door and sit with her too. Someone brings wine; someone brings olives; the village priest comes and stays a careful distance and does not pray out loud.

Near midnight, she takes your hand. Her grip is surprisingly firm. "Walk well, traveller," she says, smiling at her own old joke. "Hold the charm." She closes her eyes.

By the small hour before dawn, she is gone. The room is very warm. {COMPANION} has fallen asleep at her feet.`,
      isEnding: true,
      twist: `Three months later, in the agora of Athens, you will pass a beggar you do not at first recognise — a thin man in a grey cloak, beard the colour of cooled iron, eyes you cannot quite meet. He will nod to you the way one old friend nods to another, gravely, exactly once. He will be gone by the time you have crossed the square. You will understand, then, that the bargain you struck was witnessed not just by him but by some older kindness — the same kindness, perhaps, that pressed the small bronze ring into the palm of a much younger woman in a much smaller village a very long time ago.`,
      whatIf: `Briefly, walking home along the dark road in the last hour before dawn, you imagine the version of this day in which you had refused the wager and never heard the stories. She would have died at midday in a quiet dream of her own mother. The stories would have died with her. You would not have known any of them. You would not know about the boy who drowned, or the small grey stone, or the bronze ring's longer journey. You would have been spared the grief of knowing what is being lost. You would not, you understand now, have wanted to be spared.`,
      coda: `The village buries her in the cool blue evening of the next day, in the small terraced cemetery above the olive grove. You stay a week. You sweep the small house with the blue door. You leave the cracked clay cup on the windowsill where it has always been. {COMPANION}, on the morning you finally leave, refuses for a long time to come away from the doorway, then comes. The road takes you south. The wooden charm hangs warm against your chest. Somewhere, behind you, the small stone you do not know the story of is still on the windowsill. You will, perhaps, come back here. The road, for now, has other places to put you.`,
    },
    hd_the_morning: {
      id: "hd_the_morning",
      resolution: `You spend the morning with her. She is herself, briefly — lucid, gentle, tired. She does not have a day. She has a few hours. You make them count.`,
      atmosphere: "calm",
      effects: { xpDelta: 16, hpDelta: 4 },
      body: `She does not have the long story-day she would have had with the wager. She has a brief golden window before midday. She tells you the one thing she has been saving — the name of the boy she loved, briefly, who drowned at sea. She presses the small bronze ring from her finger into your palm and closes your fingers over it. "Keep it for me," she says. "You'll know what to do with it."

By midday she is asleep. By the long blue hour she is gone. {COMPANION} has not moved from her feet for the whole of it.

The lamp does not flicker. The room is very warm. You sit with her for a long time after.`,
      isEnding: true,
      twist: `A year later, walking the road south, you will pass through a small port town on the coast where the boy she named drowned a generation ago. You will, on impulse, leave the small bronze ring at the small shrine to the sea-gods at the end of the harbour pier — quietly, anonymously, in the long blue hour before dawn. As you walk away, the wind will carry, faint and far off, the sound of two voices laughing — a young woman and a young man — for a single breath, and then it will be gone. You will not turn around. You will keep walking. The road, in some places, settles its own old debts when you are not looking.`,
      whatIf: `Sometimes, in the years afterward, you think about the version of this morning in which you had wagered for the day instead of asking for the truth. You imagine the stories you would have heard. The small grey stone on the windowsill, whose story you will now never know. The texture of an additional day. You do not regret what you chose. You only sometimes wish you had been able to choose both.`,
      coda: `The village buries her in the cool blue evening. You stay a week. You leave the small bronze ring around your own neck — for a year, at least, until the road takes it from you. You walk south. {COMPANION} is unusually quiet for the first ten days, then is themselves again. The wooden charm hangs warm at your chest. The road, today, is uncomplicated. The day will be a long one. The day will be a kind one.`,
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// Quest library + selection
// ════════════════════════════════════════════════════════════════════

export const QUEST_LIBRARY: OfflineQuest[] = [
  CYCLOPS_QUEST,
  SPHINX_QUEST,
  LYRE_QUEST,
  HADES_QUEST,
];

/** Pick a random quest from the library, avoiding immediate repeats by
 *  weighting against the hero's adventuresCompleted count modulo size. */
export function pickQuest(hero: Hero): OfflineQuest {
  // Light variety mechanism: deterministic offset based on hero id + a
  // randomized component, then mod library size.
  const seed = hero.adventuresCompleted ?? 0;
  const offset = seed % QUEST_LIBRARY.length;
  const choices = QUEST_LIBRARY.map((q, i) => ({ q, i }))
    .filter(({ i }) => i !== offset || Math.random() < 0.25); // ~75% chance to skip last
  const pick = choices[Math.floor(Math.random() * choices.length)];
  return (pick?.q ?? QUEST_LIBRARY[Math.floor(Math.random() * QUEST_LIBRARY.length)]);
}

/** Lookup quest by id. */
export function getQuest(id: string): OfflineQuest | undefined {
  return QUEST_LIBRARY.find(q => q.id === id);
}

/** Build the initial Scene from a quest's startSceneId, interpolating
 *  hero personalization. */
export function buildScene(
  hero: Hero, quest: OfflineQuest, node: QuestSceneNode, index: number, prevResolution?: string,
): Scene {
  const act: 1 | 2 | 3 =
    index <= quest.actBoundaries.act1End ? 1 :
    index <= quest.actBoundaries.act2End ? 2 : 3;
  return {
    id: `${quest.id}-s${index}`,
    index,
    act,
    atmosphere: node.atmosphere,
    body: interpolate(node.body, hero),
    resolution: prevResolution
      ? interpolate(prevResolution, hero)
      : (node.resolution ? interpolate(node.resolution, hero) : undefined),
    xpDelta: node.effects?.xpDelta,
    hpDelta: node.effects?.hpDelta,
    itemsAdded: node.effects?.itemsAdded,
    encounter: node.encounter,
    isEnding: node.isEnding,
    twist: node.isEnding ? (node.twist ? interpolate(node.twist, hero) : undefined) : undefined,
    whatIfEpilogue: node.isEnding ? (node.whatIf ? interpolate(node.whatIf, hero) : undefined) : undefined,
    coda: node.isEnding ? (node.coda ? interpolate(node.coda, hero) : undefined) : undefined,
    choices: node.isEnding ? [] : (node.choices ?? []).map(c => ({
      label: c.label, detail: c.detail, kind: c.kind, leadsTo: c.leadsTo,
    })),
  };
}

/** Resolve a choice in an offline-quest adventure: look up the leadsTo
 *  scene id and build the next Scene. */
export function resolveOfflineChoice(
  hero: Hero, adventure: Adventure, choice: Choice,
): Scene | null {
  const questId = (adventure as Adventure & { offlineQuestId?: string }).offlineQuestId;
  if (!questId) return null;
  const quest = getQuest(questId);
  if (!quest) return null;
  // Choice must carry leadsTo (we set it when building the scene).
  const leadsTo = (choice as Choice & { leadsTo?: string }).leadsTo;
  if (!leadsTo) {
    // Free-text or unknown — fall back to a generic "you press on" continuation
    // pulled from the current scene's first choice.
    const cur = adventure.scenes[adventure.currentIndex];
    const firstChoice = cur.choices[0] as (Choice & { leadsTo?: string }) | undefined;
    if (!firstChoice?.leadsTo) return null;
    const node = quest.scenes[firstChoice.leadsTo];
    if (!node) return null;
    return buildScene(hero, quest, node, cur.index + 1,
      `You strike out on a path of your own — "${choice.label}" — and the world bends, gently, to meet you where the quest needs you next.`);
  }
  const node = quest.scenes[leadsTo];
  if (!node) return null;
  const cur = adventure.scenes[adventure.currentIndex];
  return buildScene(hero, quest, node, cur.index + 1);
}

/** Construct a brand-new Adventure + opening Scene from a quest. */
export function startOfflineQuest(
  hero: Hero, quest: OfflineQuest,
): { adventure: Adventure; scene1: Scene } {
  const adventureId = `adv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startNode = quest.scenes[quest.startSceneId];
  const scene1 = buildScene(hero, quest, startNode, 1);
  const adventure: Adventure & { offlineQuestId: string } = {
    id: adventureId,
    heroId: hero.id,
    title: quest.title,
    hook: quest.hook,
    patron: quest.patron,
    totalDecisions: quest.totalDecisions,
    actBoundaries: quest.actBoundaries,
    scenes: [scene1],
    currentIndex: 0,
    status: "active",
    startedAt: Date.now(),
    history: [],
    offlineQuestId: quest.id,
  };
  return { adventure, scene1 };
}
