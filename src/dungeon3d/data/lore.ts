// Dungeon3D — lore drops.
//
// Surfaced on the floor-clear transition every 3rd floor or directly
// after a boss kill. Seen IDs persist in localStorage so each run
// prefers cards the player hasn't read yet.

export interface LoreCard {
  id: string;
  title: string;
  body: string;
  tint: string;  // CSS color for the card's accent
}

export const LORE_DECK: readonly LoreCard[] = [
  {
    id: "caverns_of_refrain",
    title: "The Caverns of Refrain",
    body: "Where the first Voice was silenced. Listen carefully — the walls remember.",
    tint: "#fde047",
  },
  {
    id: "iron_tyrants_domain",
    title: "Iron Tyrant's Domain",
    body: "Born from a king's wrath at being unheard. He guards the throne even in his dying breath.",
    tint: "#fb7185",
  },
  {
    id: "hexblades_maze",
    title: "Hexblade's Maze",
    body: "A labyrinth that shifts each time you blink. Most adventurers don't realize they've walked it twice.",
    tint: "#a78bfa",
  },
  {
    id: "hollowmages_sanctum",
    title: "Hollowmage's Sanctum",
    body: "Knowledge is the deadliest weapon — and he hoards it all. The shelves drink quietly while he reads.",
    tint: "#22d3ee",
  },
  {
    id: "the_dynasty_below",
    title: "The Dynasty Below",
    body: "Long before the dungeon was a dungeon, it was a castle. Long before that, a city. Long before that, a name nobody spoke.",
    tint: "#fde047",
  },
  {
    id: "candle_keepers",
    title: "The Candle Keepers",
    body: "They lit one taper per fallen adventurer. The deeper rooms have so many flames that the dark is afraid of them.",
    tint: "#fb923c",
  },
  {
    id: "moss_that_listens",
    title: "Moss That Listens",
    body: "On the verdant floors the moss is older than your bloodline. It has heard every prayer made within these walls — and it is still keeping score.",
    tint: "#6ee07a",
  },
  {
    id: "the_seventh_signature",
    title: "The Seventh Signature",
    body: "Six adventurers signed the wall at the entrance. The seventh signature appears only after you leave. Yours, in your own handwriting, dated tomorrow.",
    tint: "#a78bfa",
  },
  {
    id: "embered_throats",
    title: "Embered Throats",
    body: "Down in the fire floors the dragons used to sing. The Tyrant cut their throats so the prophecy would never be heard aloud. The fire still hums under your feet.",
    tint: "#ef4444",
  },
  {
    id: "the_void_lemma",
    title: "The Void Lemma",
    body: "Hollowmage's first proof was that nothing is real. His second proof was that he, being nothing, was therefore real. After that, the floors stopped behaving.",
    tint: "#22d3ee",
  },
  {
    id: "the_blind_cartographer",
    title: "The Blind Cartographer",
    body: "She mapped every floor down to the throne by listening to the echo. Her map is in your pack. You have never opened a pack.",
    tint: "#fde047",
  },
  {
    id: "what_the_king_asked",
    title: "What The King Asked",
    body: "His final question wasn't about war or succession. It was: 'Did anyone love me?' He's still waiting on an answer. Bring him one, if you find it.",
    tint: "#fda4af",
  },
] as const;

const LORE_KEY = "henry-dungeon-lore-v1";

interface LoreSave { seen: string[]; }

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LORE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as LoreSave;
    return new Set(Array.isArray(parsed?.seen) ? parsed.seen : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const payload: LoreSave = { seen: Array.from(seen) };
    window.localStorage.setItem(LORE_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

/** Pick the next lore card, preferring unseen ones. Marks it seen. */
export function pickLoreCard(): LoreCard {
  const seen = loadSeen();
  const unseen = LORE_DECK.filter(c => !seen.has(c.id));
  const pool = unseen.length > 0 ? unseen : LORE_DECK;
  const card = pool[Math.floor(Math.random() * pool.length)];
  seen.add(card.id);
  // When everything has been seen, reset the deck so re-runs feel fresh.
  if (seen.size >= LORE_DECK.length) seen.clear();
  saveSeen(seen);
  return card;
}

/** True if the depth qualifies for a lore drop (every 3rd floor). */
export function shouldDropLore(depth: number): boolean {
  return depth > 1 && depth % 3 === 0;
}
