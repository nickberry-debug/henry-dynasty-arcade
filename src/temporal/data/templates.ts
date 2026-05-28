// Temporal Order — offline fallback variations + dialogue templates.
// Used when no Anthropic key is set. AI generation is way richer, but
// the game is fully playable from these alone.

import type { MissionVariation } from "../types";

// ─── Mission variation fallbacks ─────────────────────────────

const VAR_EGYPT_LOST_VIZIER: MissionVariation[] = [
  {
    templateId: "egypt_lost_vizier",
    anomaly: "Vizier Ramose has vanished the night before signing the Hittite alliance. Without his seal the treaty fails and Egypt drifts into a forgotten dark age.",
    trueCause: "A jealous foreign envoy bribed two guards to spirit Ramose out of the palace to a hidden room in the marketplace, hoping to delay the treaty long enough to broker his own.",
    perpetrator: { name: "Foreign Envoy", motive: "Wants to broker his nation's competing treaty instead." },
    clues: [
      { id: 1, description: "A torn scrap of foreign linen by the palace gate.", location: "Palace Gate", foundVia: "Examining the gate area." },
      { id: 2, description: "Two guards behaving strangely at the changing of the watch.", location: "Barracks", foundVia: "Talking to the captain of the watch." },
      { id: 3, description: "A scribe's note: \"Ramose said he'd be at the merchant stalls at dusk.\"", location: "Scribes' Room", foundVia: "Reading Ramose's desk." },
      { id: 4, description: "A locked storeroom in the marketplace someone has been bringing food to.", location: "Marketplace", foundVia: "Following the bribed guard." },
      { id: 5, description: "The envoy's seal on a bag of silver dropped near the storeroom.", location: "Marketplace", foundVia: "Searching the storeroom area." },
    ],
    suspects: [
      { name: "Foreign Envoy", motive: "Wants to delay the rival alliance.", isCulprit: true },
      { name: "Queen Nefertiti", motive: "Rumored to oppose the alliance terms.", isCulprit: false },
      { name: "Captain of the Guard", motive: "Embarrassed by the security lapse.", isCulprit: false },
    ],
    resolutions: [
      { id: 1, description: "Quietly free Ramose and let him return; he never knows he was held.", consequence: "Treaty is signed. Envoy slinks off in shame.", integrityDelta: 5 },
      { id: 2, description: "Expose the envoy publicly at court.", consequence: "Diplomatic incident; one alliance gained, another lost.", integrityDelta: -2 },
      { id: 3, description: "Convince the envoy to broker peace between both nations.", consequence: "Both treaties signed. Egypt prospers.", integrityDelta: 8 },
    ],
    incidents: [
      { trigger: "First marketplace visit", event: "A pickpocket grabs your coin purse — chase or let it go.", consequence: "Lose 5 coins if not caught." },
      { trigger: "Night in the palace", event: "A torch goes out — examine in the dark for a hidden note.", consequence: "+1 clue if examined." },
    ],
  },
];

const VAR_GREECE_SILENT_PHILOSOPHER: MissionVariation[] = [
  {
    templateId: "greece_silent_philosopher",
    anomaly: "Socrates has stopped speaking in the Agora. His student Plato cannot find inspiration to write his future Republic.",
    trueCause: "A rival Sophist threatened Socrates' family with a fabricated impiety charge. He has gone silent to protect them.",
    perpetrator: { name: "Sophist Polos", motive: "Wants Socrates discredited so his own teaching fees climb." },
    clues: [
      { id: 1, description: "Socrates speaks only in riddles when approached — but his eyes flick toward the stoa.", location: "Agora Center", foundVia: "Trying to converse with him." },
      { id: 2, description: "Aspasia mentions Polos has been making veiled threats at symposia.", location: "Aspasia's Salon", foundVia: "Speaking with Aspasia." },
      { id: 3, description: "A young Plato is anxious about a 'charge' someone whispered about.", location: "Stoa", foundVia: "Talking to Plato." },
      { id: 4, description: "A scroll in the Sophists' quarters drafts a false accusation.", location: "Sophists' Quarters", foundVia: "Sneaking in disguised as a sophist." },
    ],
    suspects: [
      { name: "Sophist Polos", motive: "Commercial rivalry.", isCulprit: true },
      { name: "Aristophanes", motive: "Has mocked Socrates publicly.", isCulprit: false },
      { name: "Pericles' Camp", motive: "Worries about political philosophers.", isCulprit: false },
    ],
    resolutions: [
      { id: 1, description: "Confront Polos privately and have him retract.", consequence: "Socrates speaks again, gratefully.", integrityDelta: 5 },
      { id: 2, description: "Expose Polos publicly in the Agora.", consequence: "Polos is shamed; his students leave, philosophy schools shift.", integrityDelta: 2 },
      { id: 3, description: "Get Aspasia to broker a truce between the schools.", consequence: "Both philosophies flourish; Plato's later writings reflect the détente.", integrityDelta: 8 },
    ],
    incidents: [
      { trigger: "First Agora visit", event: "A vendor recognizes you as a foreigner — risk anachronism.", consequence: "Lose 1 reputation if you slip up." },
      { trigger: "Sophist quarters at night", event: "A guard catches a glimpse of your shadow.", consequence: "Must hide for one cycle." },
    ],
  },
];

const VAR_VIKING_COMPASS: MissionVariation[] = [
  {
    templateId: "viking_compass_anomaly",
    anomaly: "A small bronze compass — accurate, magnetic, and four centuries premature — sits in a longship's hold.",
    trueCause: "The compass slipped through a small temporal leak via a careless future merchant who docked here on a previous run.",
    perpetrator: { name: "Future Merchant (unwitting)", motive: "Dropped it during a routine timeline visit." },
    clues: [
      { id: 1, description: "The compass needle holds steady — too steady for sun-stone navigation.", location: "Longship Hold", foundVia: "Examining the compass." },
      { id: 2, description: "Jarl Bjorn says it was a 'gift' from a southern trader who never gave a name.", location: "Longhouse", foundVia: "Asking the Jarl." },
      { id: 3, description: "The skald sings of a stranger who appeared at low tide and vanished by dawn.", location: "Harbor", foundVia: "Listening to the skald." },
      { id: 4, description: "Wet footprints leading from the harbor to nowhere.", location: "Harbor", foundVia: "Examining the docks at night." },
    ],
    suspects: [
      { name: "Future Merchant", motive: "Careless time-traveler.", isCulprit: true },
      { name: "Local Rune-Smith", motive: "Wants the village to look impressive.", isCulprit: false },
      { name: "Southern Trader", motive: "Could be smuggling.", isCulprit: false },
    ],
    resolutions: [
      { id: 1, description: "Quietly retrieve the compass and bury it in the sea.", consequence: "Anomaly closed. The skald never gets to sing of it.", integrityDelta: 6 },
      { id: 2, description: "Let the Jarl keep it; tell him it is a god's gift.", consequence: "Norse navigation accelerates a century early.", integrityDelta: -8 },
      { id: 3, description: "Use the leak signal to identify and warn the future merchant.", consequence: "Both this and future leaks prevented.", integrityDelta: 10 },
    ],
    incidents: [
      { trigger: "Approaching the harbor", event: "A child mistakes your gadgets for a god's tools.", consequence: "Reputation +1 or anachronism warning." },
    ],
  },
];

const VAR_RENAISSANCE_BLUEPRINTS: MissionVariation[] = [
  {
    templateId: "renaissance_blueprints",
    anomaly: "Leonardo's flying-machine notebooks have been stolen from his workshop the night before a patron review.",
    trueCause: "A jealous rival painter hired a thief to take them, planning to claim them as his own ideas in a Florentine guild meeting.",
    perpetrator: { name: "Rival Painter Ghirlandaio", motive: "Wants Medici patronage." },
    clues: [
      { id: 1, description: "A boot print in the workshop is too small to be Leonardo's apprentice Salaì.", location: "Workshop", foundVia: "Examining the floor." },
      { id: 2, description: "Salaì swears he heard whispers in the alley last night.", location: "Workshop", foundVia: "Talking to Salaì." },
      { id: 3, description: "A patron's note: \"My rival has invited me to a private viewing tomorrow.\"", location: "Medici Palace", foundVia: "Speaking with the patron." },
      { id: 4, description: "Fresh paint on a stair railing matches Ghirlandaio's studio.", location: "Florentine Streets", foundVia: "Following the trail." },
    ],
    suspects: [
      { name: "Rival Painter Ghirlandaio", motive: "Patron envy.", isCulprit: true },
      { name: "Apprentice Salaì", motive: "Often clashes with Leonardo.", isCulprit: false },
      { name: "Inquisitor", motive: "Suspicious of Leonardo's work.", isCulprit: false },
    ],
    resolutions: [
      { id: 1, description: "Recover the notebooks before the viewing; let Ghirlandaio retreat quietly.", consequence: "Aeronautics on track. Quiet victory.", integrityDelta: 6 },
      { id: 2, description: "Expose Ghirlandaio at the viewing publicly.", consequence: "Leonardo's reputation soars. Ghirlandaio is ruined.", integrityDelta: 4 },
      { id: 3, description: "Convince Leonardo to share credit, founding a joint workshop.", consequence: "Florence's school of invention forms two decades early.", integrityDelta: 10 },
    ],
    incidents: [
      { trigger: "Workshop visit at dusk", event: "Salaì pranks you with a paint splash — anachronism check.", consequence: "Lose 1 reputation if disguise fails." },
    ],
  },
];

const VAR_REVOLUTION_FOUNDER: MissionVariation[] = [
  {
    templateId: "revolution_lost_founder",
    anomaly: "Benjamin Franklin has not arrived for the night-before vote on the Declaration. Without his signature the document is incomplete.",
    trueCause: "A British loyalist tavern keeper has detained Franklin in a back room under a fake gout-treatment, hoping to delay the vote.",
    perpetrator: { name: "Tavern Keeper Mrs. Reeve", motive: "Loyalist sympathies, hoping to derail the Declaration." },
    clues: [
      { id: 1, description: "Franklin's spectacles, left on a tavern table.", location: "City Tavern", foundVia: "Examining the tavern." },
      { id: 2, description: "A serving boy whispers about \"the old man in the back room.\"", location: "City Tavern", foundVia: "Talking to staff." },
      { id: 3, description: "An apothecary's bill for 'restorative bitters' has been forged.", location: "Apothecary", foundVia: "Speaking with the apothecary." },
      { id: 4, description: "A coded letter in the tavern keeper's desk mentions \"the courier from Halifax.\"", location: "City Tavern", foundVia: "Disguised search." },
    ],
    suspects: [
      { name: "Tavern Keeper Mrs. Reeve", motive: "Loyalist with crown contacts.", isCulprit: true },
      { name: "British Spy", motive: "Tries to disrupt Independence.", isCulprit: false },
      { name: "Rival Delegate", motive: "Disputes the wording.", isCulprit: false },
    ],
    resolutions: [
      { id: 1, description: "Free Franklin quietly; the tavern keeper never knows she was caught.", consequence: "Declaration signed on time.", integrityDelta: 6 },
      { id: 2, description: "Have Mrs. Reeve publicly arrested.", consequence: "Loyalists driven underground. The taverns become surveillance grounds.", integrityDelta: 2 },
      { id: 3, description: "Persuade Mrs. Reeve to defect and inform on her contacts.", consequence: "British intelligence network unraveled early.", integrityDelta: 9 },
    ],
    incidents: [
      { trigger: "Walking past Independence Hall", event: "John Adams stops to ask your name — anachronism check.", consequence: "If a slip, reputation -1." },
    ],
  },
];

const VAR_HOLLYWOOD_PHANTOM: MissionVariation[] = [
  {
    templateId: "hollywood_phantom_reel",
    anomaly: "A silent reel circulating the studios depicts the coming year's events. The projectionist must be traced.",
    trueCause: "A future film historian visited Hollywood with a portable projector, accidentally left a single demo reel behind.",
    perpetrator: { name: "Future Historian (visiting)", motive: "Accidental anachronism." },
    clues: [
      { id: 1, description: "The film stock is too clear — modern cellulose-acetate, not nitrate.", location: "Projection Booth", foundVia: "Examining the reel." },
      { id: 2, description: "Studio mogul recalls a 'foreign' visitor with a peculiar projector.", location: "Mogul's Office", foundVia: "Speaking with the mogul." },
      { id: 3, description: "A bellhop describes the visitor's hotel as \"two doors down.\"", location: "Hotel Lobby", foundVia: "Talking to the bellhop." },
      { id: 4, description: "The hotel room is registered to a name that won't exist for 50 years.", location: "Hotel Room", foundVia: "Examining the register." },
    ],
    suspects: [
      { name: "Future Historian", motive: "Sloppy researcher.", isCulprit: true },
      { name: "Rival Reporter", motive: "Wants a scoop.", isCulprit: false },
      { name: "Studio Mogul", motive: "Could use the publicity.", isCulprit: false },
    ],
    resolutions: [
      { id: 1, description: "Burn the reel; let no one see it again.", consequence: "Anomaly closed. Hollywood proceeds without strange rumors.", integrityDelta: 5 },
      { id: 2, description: "Catch the historian and bring them home before they leak more.", consequence: "Bureau adds a new protocol. Saves three future anomalies.", integrityDelta: 10 },
      { id: 3, description: "Let the reel screen at a private gala — what's seen there, stays.", consequence: "Some 'Roaring Twenties prophecies' enter pop culture lore.", integrityDelta: -3 },
    ],
    incidents: [
      { trigger: "Hotel lobby visit", event: "A reporter snaps your photo without asking.", consequence: "Anachronism risk +2." },
    ],
  },
];

const POOL: Record<string, MissionVariation[]> = {
  egypt_lost_vizier: VAR_EGYPT_LOST_VIZIER,
  greece_silent_philosopher: VAR_GREECE_SILENT_PHILOSOPHER,
  viking_compass_anomaly: VAR_VIKING_COMPASS,
  renaissance_blueprints: VAR_RENAISSANCE_BLUEPRINTS,
  revolution_lost_founder: VAR_REVOLUTION_FOUNDER,
  hollywood_phantom_reel: VAR_HOLLYWOOD_PHANTOM,
};

export function fallbackVariation(templateId: string): MissionVariation | null {
  const pool = POOL[templateId];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Dialogue fallback templates ────────────────────────────

const DIALOGUE_OPENERS: Record<string, string[]> = {
  Socrates: [
    "Tell me, stranger — what do you suppose I have stopped speaking about?",
    "A wise man knows his own silence is also a kind of teaching.",
    "If you came here for answers, ask better questions first.",
  ],
  "Pharaoh Akhenaten": [
    "The Aten sees all. State your business swiftly.",
    "You wear the robes of a scribe, but your eyes betray a wider sky.",
    "If you bring word of Ramose, speak plainly.",
  ],
  "Vizier Ramose": [
    "Whoever you are — keep your voice low. I cannot be seen.",
    "Tell the Pharaoh I am safe, and that the Hittite envoy is not.",
  ],
  "Benjamin Franklin": [
    "A bit of advice — a stitch in time saves nine, and a quiet word saves a republic.",
    "If you've come seeking me at this tavern, my friend, you've made the right choice and the wrong one at once.",
  ],
  "Leonardo da Vinci": [
    "Apprentice, fetch me the silverpoint — no, the other one. And tell me, who let you in?",
    "The notebooks. They are gone. Tell me you saw something.",
  ],
};

const GENERIC_DIALOGUE = [
  "I cannot say more — not here, not now.",
  "If you ask the right person, they will tell you more than I can.",
  "Be careful what you carry. Suspicion travels faster than truth.",
  "You're not from around here, are you? Speak softly.",
  "Have you tried the marketplace? Things change hands there that should not.",
];

export function fallbackNpcLine(npcName: string, _playerInput: string): string {
  const opener = DIALOGUE_OPENERS[npcName];
  if (opener) return opener[Math.floor(Math.random() * opener.length)];
  return GENERIC_DIALOGUE[Math.floor(Math.random() * GENERIC_DIALOGUE.length)];
}

// ─── Ripple templates ───────────────────────────────────────

const RIPPLES = [
  {
    primary: "Because you preserved the alliance, trade routes through the eastern Mediterranean stay open a generation longer, accelerating cultural exchange between Egypt and the Aegean.",
    secondary: "A young diplomat trained under Ramose later mentors a future Greek statesman, threading two civilizations across centuries.",
  },
  {
    primary: "By coaxing Socrates back into the Agora, his student Plato finds the courage to write a treatise that the Renaissance later rediscovers — accelerating European philosophy by roughly twenty-five years.",
    secondary: "A small Florentine bookseller, ancestor of a future printer, makes a livelihood translating it.",
  },
  {
    primary: "The compass quietly returned to the sea, Norse navigation develops at its true pace — and a 14th-century Italian mariner is the one to refine it, rerouting later European exploration.",
    secondary: "An Icelandic skald immortalizes the strange visitor in a saga that ethnographers will find puzzling but charming for a thousand years.",
  },
  {
    primary: "Leonardo's notebooks recovered, his flying-machine sketches inspire a Mechelen tinker two centuries later to attempt a glider — birthing a small but real tradition of early aeronautics.",
    secondary: "Salaì grows into a more careful apprentice, eventually opening his own school where a future Galileo's tutor studies briefly.",
  },
  {
    primary: "Franklin signs on time. The Declaration is delivered with all hands aboard, and one tavern keeper turns informant, unraveling a small loyalist ring in Philadelphia within the year.",
    secondary: "The forged apothecary's bill becomes a footnote in a forensic-history book three centuries later.",
  },
  {
    primary: "The phantom reel buried, Hollywood proceeds without strange rumors. A young projectionist who briefly caught a frame quietly trains as an archivist instead, founding a small film library in Pasadena.",
    secondary: "Bureau protocols are updated. The next three temporal-leak incidents are contained before they leave their decade.",
  },
];

export function fallbackRipple(): { primary: string; secondary: string } {
  return RIPPLES[Math.floor(Math.random() * RIPPLES.length)];
}
