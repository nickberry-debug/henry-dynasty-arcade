// Game registry — single source of truth for the home-page folder grid,
// category screens, search, and Continue Playing. Adding a new game?
// Drop one entry here with a `category` tag and it auto-files itself.

export type Category =
  | "sports" | "action" | "adventure" | "space"
  | "strategy" | "create" | "brain" | "party" | "resources";

export interface CategoryDef {
  id: Category;
  label: string;
  emoji: string;
  /** Accent color (hex). */
  accent: string;
  /** Card background gradient (CSS). */
  bg: string;
  /** Short subtitle shown on the home folder tile. */
  subtitle: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "sports",    label: "Sports",            emoji: "🏆", accent: "#fbbf24",
    bg: "linear-gradient(135deg, rgba(40,30,8,0.95), rgba(15,10,3,0.85))",
    subtitle: "Franchise sims · play and manage" },
  { id: "action",    label: "Action & Combat",   emoji: "⚔️", accent: "#fb923c",
    bg: "linear-gradient(135deg, rgba(40,15,8,0.95), rgba(15,5,3,0.85))",
    subtitle: "Fight, dodge, climb the leaderboard" },
  { id: "adventure", label: "Adventure & RPG",   emoji: "🗺️", accent: "#DAA520",
    bg: "linear-gradient(135deg, rgba(30,20,8,0.95), rgba(10,8,3,0.85))",
    subtitle: "Heroes, eras, mysteries" },
  { id: "space",     label: "Space",             emoji: "🚀", accent: "#67e8f9",
    bg: "linear-gradient(135deg, rgba(8,15,40,0.95), rgba(2,5,20,0.85))",
    subtitle: "Far frontiers and starfields" },
  { id: "strategy",  label: "Strategy & Sim",    emoji: "🎲", accent: "#a78bfa",
    bg: "linear-gradient(135deg, rgba(25,15,40,0.95), rgba(8,4,18,0.85))",
    subtitle: "Build it, book it, run it" },
  { id: "create",    label: "Create & Care",     emoji: "🐾", accent: "#86efac",
    bg: "linear-gradient(135deg, rgba(8,30,15,0.95), rgba(3,12,5,0.85))",
    subtitle: "Make, mix, raise" },
  { id: "brain",     label: "Brain & Puzzle",    emoji: "🧠", accent: "#C084FC",
    bg: "linear-gradient(135deg, rgba(25,10,40,0.95), rgba(10,4,18,0.85))",
    subtitle: "Solve, guess, think" },
  { id: "party",     label: "Party & Online",    emoji: "🎉", accent: "#f9a8d4",
    bg: "linear-gradient(135deg, rgba(40,8,25,0.95), rgba(15,3,10,0.85))",
    subtitle: "Play together, online or local" },
  { id: "resources", label: "Resources",         emoji: "📚", accent: "#fef3c7",
    bg: "linear-gradient(135deg, rgba(40,30,15,0.95), rgba(15,10,5,0.85))",
    subtitle: "Beckett's Corner + reference" },
];

export const CATEGORY_BY_ID: Record<Category, CategoryDef> =
  Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<Category, CategoryDef>;

export interface GameEntry {
  /** Stable id (used for favoriteGame match, save lookup). */
  id: string;
  /** Display name. */
  name: string;
  /** One-line subtitle shown under the name on a card. */
  subtitle: string;
  /** Longer description (shown on the card body). */
  description: string;
  /** Emoji icon — quick + zero asset weight. */
  emoji: string;
  /** Accent color (hex). */
  accent: string;
  /** Card background gradient. */
  bg: string;
  /** Status pill text. */
  status: string;
  /** Route to navigate to on tap. */
  route: string;
  /** Category folder this game lives in. */
  category: Category;
  /** "game" routes directly into gameplay. "hub" opens a sub-grid of related apps. */
  type: "game" | "hub";
  /** Set false to hide from the grid without deleting the entry. */
  enabled?: boolean;
  /** Sort weight within its category (lower = first). Defaults to 100. */
  order?: number;
}

/** Factory with sensible defaults — type defaults to "game", enabled true, order 100. */
const ge = (e: Omit<GameEntry, "type" | "enabled" | "order"> & Partial<Pick<GameEntry, "type" | "enabled" | "order">>): GameEntry => ({
  type: "game", enabled: true, order: 100, ...e,
});

export const GAMES: GameEntry[] = [
  // ── SPORTS ──────────────────────────────────────────────────────────
  ge({ id: "sportshub", category: "sports", type: "hub", order: 0,
    name: "Sports Hub", subtitle: "Five sports, one home",
    description: "Hub for Baseball, Football, Hockey, Basketball, College Football, and Versus. Original teams + generated crests.",
    emoji: "🏆", accent: "#fbbf24", status: "All sports",
    bg: "linear-gradient(135deg, rgba(40,30,8,0.95), rgba(15,10,3,0.85))",
    route: "/sports" }),
  ge({ id: "hockey", category: "sports", order: 10,
    name: "Hockey", subtitle: "Season + 8-team bracket",
    description: "12 original teams, 28-game season, playoffs with OT, multi-year career.",
    emoji: "🏒", accent: "#67e8f9", status: "New",
    bg: "linear-gradient(135deg, rgba(8,30,40,0.95), rgba(2,10,20,0.85))",
    route: "/sports/hockey" }),
  ge({ id: "basketball", category: "sports", order: 11,
    name: "Basketball", subtitle: "Season + 8-team bracket",
    description: "12 original teams, 30-game season, playoffs, OT decides ties.",
    emoji: "🏀", accent: "#fb923c", status: "New",
    bg: "linear-gradient(135deg, rgba(40,18,5,0.95), rgba(15,8,2,0.85))",
    route: "/sports/basketball" }),
  ge({ id: "cfb", category: "sports", order: 12,
    name: "College Football", subtitle: "Recruiting · 4-team CFP",
    description: "16 original schools, 12-game regular season, 4-team bowl playoff. Class years roll over.",
    emoji: "🎓", accent: "#fde047", status: "New",
    bg: "linear-gradient(135deg, rgba(30,25,8,0.95), rgba(12,10,3,0.85))",
    route: "/sports/cfb" }),
  ge({ id: "baseball", category: "sports", order: 20,
    name: "Baseball", subtitle: "Diamond Dynasty",
    description: "Full management sim. Draft, trade, sim seasons, plus hit and pitch in Training Camp.",
    emoji: "⚾", accent: "#fbbf24", status: "Full sim",
    bg: "linear-gradient(135deg, rgba(11,25,41,0.95), rgba(20,40,70,0.85))",
    route: "/baseball" }),
  ge({ id: "football", category: "sports", order: 21,
    name: "Football", subtitle: "Gridiron League",
    description: "17-week season, drive-by-drive sim, ESPN-style StatCast field view.",
    emoji: "🏈", accent: "#FFB81C", status: "Full sim",
    bg: "linear-gradient(135deg, rgba(26,37,38,0.95), rgba(11,61,46,0.85))",
    route: "/football/hub" }),
  ge({ id: "versus", category: "sports", order: 30,
    name: "Sports Versus", subtitle: "Head-to-head · 2 player",
    description: "Baseball + Football pitch-by-pitch / play-call duels. Same-device or online.",
    emoji: "🥊", accent: "#67e8f9", status: "Versus",
    bg: "linear-gradient(135deg, rgba(8,18,40,0.95), rgba(2,8,20,0.85))",
    route: "/versus" }),

  // ── ACTION & COMBAT ─────────────────────────────────────────────────
  ge({ id: "battleforge", category: "action", order: 0,
    name: "Battle Forge", subtitle: "Tactical Character Combat",
    description: "Six fighters across five themed arenas. Auto-zoom camera. Cinematic AI duels.",
    emoji: "⚔️", accent: "#fca5a5", status: "Pick a matchup",
    bg: "linear-gradient(135deg, rgba(60,8,8,0.95), rgba(20,5,5,0.85))",
    route: "/battleforge" }),
  ge({ id: "mech", category: "action", order: 10,
    name: "Scrapyard Kings", subtitle: "Mech Combat — bot builder",
    description: "Build a bot from 24 swappable parts + 18 weapons across 4 tiers. Bigger purses as you climb.",
    emoji: "🤖", accent: "#fb923c", status: "Builder + combat",
    bg: "linear-gradient(135deg, rgba(50,15,10,0.95), rgba(20,8,5,0.85))",
    route: "/mech" }),
  ge({ id: "survivor", category: "action", order: 20,
    name: "Survivor", subtitle: "One thumb. Swarms. Level up.",
    description: "Pick a hero, move, your weapons auto-fire, choose 1 of 3 upgrades every level. Last 10 minutes to win.",
    emoji: "⚡", accent: "#fde047", status: "Playable end-to-end",
    bg: "linear-gradient(135deg, rgba(30,12,5,0.95), rgba(10,5,2,0.85))",
    route: "/survivor" }),
  ge({ id: "tankduel", category: "action", order: 30,
    name: "Tank Duel", subtitle: "Turn-based artillery",
    description: "Aim, set power, fire. Wind matters, terrain breaks. 2-player or vs bot. Six weapons.",
    emoji: "💣", accent: "#fb923c", status: "Best-of formats",
    bg: "linear-gradient(135deg, rgba(40,15,4,0.95), rgba(15,5,2,0.85))",
    route: "/tankduel" }),
  ge({ id: "strikeforce", category: "action", order: 40,
    name: "Strike Force", subtitle: "Vertical-scroll shooter",
    description: "Pilot a fighter, dodge enemy waves, blast bosses every 30 seconds. Auto-fire — just steer.",
    emoji: "🚀", accent: "#67e8f9", status: "Original homage",
    bg: "linear-gradient(135deg, rgba(8,18,40,0.95), rgba(2,8,20,0.85))",
    route: "/classics/strikeforce" }),
  ge({ id: "girder", category: "action", order: 50,
    name: "Girder Climb", subtitle: "Classic — barrels & ladders",
    description: "Dodge rolling girders, climb ladders, reach the rescue beacon at the top.",
    emoji: "🏗️", accent: "#dc2626", status: "Original homage",
    bg: "linear-gradient(135deg, rgba(40,8,8,0.95), rgba(10,5,5,0.85))",
    route: "/classics/girder" }),
  ge({ id: "dungeon3d", category: "adventure", order: 4,
    name: "Dungeon Crawler 3D", subtitle: "Isometric Three.js action-RPG",
    description: "Real-time 3D dungeon crawler built from Kenney modular-dungeon-kit GLB models. Isometric Three.js view, animated character, basic combat + loot. Session 1 of a multi-session build.",
    emoji: "🏰", accent: "#7e22ce", status: "Session 1 · 3D",
    bg: "linear-gradient(135deg, rgba(40,8,40,0.95), rgba(10,5,15,0.85))",
    route: "/dungeon3d" }),

  // ── ADVENTURE & RPG ─────────────────────────────────────────────────
  ge({ id: "olympus", category: "adventure", order: 0,
    name: "Olympus", subtitle: "AI Greek RPG",
    description: "Roll a hero, get a quest, AI narrates a Greek adventure. Roster persists across runs.",
    emoji: "🏛️", accent: "#DAA520", status: "Playable",
    bg: "linear-gradient(135deg, rgba(8,15,30,0.95), rgba(3,5,12,0.85))",
    route: "/olympus" }),
  ge({ id: "temporal", category: "adventure", order: 10,
    name: "Temporal Order", subtitle: "Time-traveling cases",
    description: "Investigate ripples across history. Name the culprit, fix the era, earn trophies.",
    emoji: "⏳", accent: "#f59e0b", status: "Playable",
    bg: "linear-gradient(135deg, rgba(30,20,8,0.95), rgba(10,8,3,0.85))",
    route: "/temporal" }),

  // ── SPACE ───────────────────────────────────────────────────────────
  ge({ id: "cosmic", category: "space", order: 0,
    name: "Cosmic Squad", subtitle: "Space squadron tactics",
    description: "Pick your fleet, plot moves, watch turns resolve. Wingmen, ranks, mission rewards.",
    emoji: "🛸", accent: "#9be3ff", status: "Playable",
    bg: "linear-gradient(135deg, rgba(8,15,30,0.95), rgba(3,5,12,0.85))",
    route: "/cosmic" }),

  // ── STRATEGY & SIM ──────────────────────────────────────────────────
  ge({ id: "mainevent", category: "strategy", order: 0,
    name: "Main Event", subtitle: "Wrestling booking sim",
    description: "Book 4 TV episodes + 1 PPV every month. Rate segments on charisma + in-ring + story momentum.",
    emoji: "🤼", accent: "#f87171", status: "New",
    bg: "linear-gradient(135deg, rgba(40,8,12,0.95), rgba(15,3,5,0.85))",
    route: "/mainevent" }),
  ge({ id: "cardclash", category: "strategy", order: 10,
    name: "Card Clash", subtitle: "Snap-style card battler",
    description: "3 locations, 6 turns, simultaneous reveal — win 2 of 3. 40 original cards.",
    emoji: "🃏", accent: "#a78bfa", status: "New",
    bg: "linear-gradient(135deg, rgba(25,15,40,0.95), rgba(8,4,18,0.85))",
    route: "/cardclash" }),
  ge({ id: "mogul", category: "strategy", order: 20,
    name: "Movie Studios", subtitle: "Hollywood Tycoon",
    description: "Run a movie studio. Buy scripts, sign stars, set budgets, beat box office records.",
    emoji: "🎬", accent: "#D4AF37", status: "Playable",
    bg: "linear-gradient(135deg, rgba(30,12,20,0.95), rgba(60,30,10,0.85))",
    route: "/mogul" }),
  ge({ id: "silentdepths", category: "strategy", order: 30,
    name: "Silent Depths", subtitle: "Submarine sim · Nav + Periscope",
    description: "Two stations: Nav map to pilot the boat + spot convoy contacts, Periscope to lock a firing solution (bearing/range/lead) and launch torpedoes. Manage depth (surface/scope/deep), battery, hull. Destroyer escorts hunt you with depth charges.",
    emoji: "🌊", accent: "#67e8f9", status: "Silent Service-style",
    bg: "linear-gradient(135deg, rgba(2,8,30,0.95), rgba(1,3,10,0.85))",
    route: "/classics/depths" }),

  // ── CREATE & CARE ───────────────────────────────────────────────────
  ge({ id: "creature", category: "create", order: 0,
    name: "Creature Keeper", subtitle: "Raise & battle",
    description: "Hatch a creature, care for it, train it, battle other keepers. Evolve through stages.",
    emoji: "🥚", accent: "#86efac", status: "Playable",
    bg: "linear-gradient(135deg, rgba(8,25,12,0.95), rgba(3,10,5,0.85))",
    route: "/creature" }),
  ge({ id: "potionlab", category: "create", order: 10,
    name: "Potion Lab", subtitle: "Brew & discover",
    description: "Mix ingredients, discover recipes, unlock rare potions. Hidden recipes hint after 3 misses.",
    emoji: "🧪", accent: "#a78bfa", status: "Playable",
    bg: "linear-gradient(135deg, rgba(20,10,40,0.95), rgba(8,4,18,0.85))",
    route: "/potion-lab" }),
  ge({ id: "stylestudio", category: "create", order: 20,
    name: "Style Studio", subtitle: "Dress-up & lookbook",
    description: "Mix hair, face, outfits, shoes. Layered character compositor with a saved lookbook synced across the family. Switch to Sketch mode at /classics/sketch.",
    emoji: "👗", accent: "#f9a8d4", status: "Dress-up",
    bg: "linear-gradient(135deg, rgba(40,10,30,0.95), rgba(15,5,20,0.85))",
    route: "/classics/style" }),

  // ── BRAIN & PUZZLE ──────────────────────────────────────────────────
  ge({ id: "wordplay", category: "brain", type: "hub", order: 0,
    name: "Wordplay Hub", subtitle: "Word games, riddles, AI duels",
    description: "20 Questions, Story Chain, Detective, Game Show, and more.",
    emoji: "💬", accent: "#C084FC", status: "Many games",
    bg: "linear-gradient(135deg, rgba(25,10,40,0.95), rgba(10,4,18,0.85))",
    route: "/wordplay" }),
  ge({ id: "mathblaster", category: "brain", order: 10,
    name: "Math Blaster", subtitle: "Educational arcade",
    description: "Tap the asteroid carrying the right answer. Scales from counting to fractions.",
    emoji: "🧮", accent: "#a78bfa", status: "Age-scaled",
    bg: "linear-gradient(135deg, rgba(20,10,40,0.95), rgba(8,4,20,0.85))",
    route: "/mathblaster" }),
  ge({ id: "mazemuncher", category: "brain", order: 20,
    name: "Maze Muncher", subtitle: "Pellet chase classic",
    description: "Eat every pellet in the maze. Four ghosts. Power pellets flip them.",
    emoji: "👻", accent: "#fde047", status: "Original homage",
    bg: "linear-gradient(135deg, rgba(10,8,40,0.95), rgba(2,1,10,0.85))",
    route: "/classics/maze" }),

  // ── PARTY & ONLINE ──────────────────────────────────────────────────
  ge({ id: "crew", category: "party", order: 0,
    name: "Crew Traitor", subtitle: "Online social deduction · 3-10 players",
    description: "Original Among Us–style game. Crew complete tasks; traitors sabotage and tag out crewmates.",
    emoji: "🛰️", accent: "#9be3ff", status: "Online cross-device",
    bg: "linear-gradient(135deg, rgba(8,18,40,0.95), rgba(2,8,20,0.85))",
    route: "/crew" }),
  ge({ id: "odd", category: "party", order: 10,
    name: "Odd One Out", subtitle: "Social deduction · 3-8 players",
    description: "Everyone gets the same secret word — except one. Vote out the impostor.",
    emoji: "🕵️", accent: "#fbbf24", status: "Online",
    bg: "linear-gradient(135deg, rgba(40,20,4,0.95), rgba(20,10,2,0.85))",
    route: "/odd" }),

  // ── RESOURCES ───────────────────────────────────────────────────────
  ge({ id: "resources", category: "resources", order: 0,
    name: "Beckett's Corner", subtitle: "Family reference",
    description: "Reading lists, schoolwork helpers, and family-only resources.",
    emoji: "📚", accent: "#fef3c7", status: "Reference",
    bg: "linear-gradient(135deg, rgba(40,30,15,0.95), rgba(15,10,5,0.85))",
    route: "/resources" }),
];

/** Visible games sorted by order within a category. */
export function gamesIn(category: Category): GameEntry[] {
  return GAMES
    .filter(g => g.enabled !== false && g.category === category)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

/** Game count per category — for the folder badge. */
export function countIn(category: Category): number {
  return gamesIn(category).length;
}

/** Look up a game by id (for Continue Playing). */
export function getGameById(id: string): GameEntry | undefined {
  return GAMES.find(g => g.id === id);
}

/** Look up a game by route (for Continue Playing resolution). */
export function getGameByRoute(route: string): GameEntry | undefined {
  // Exact match first
  let g = GAMES.find(g => g.route === route);
  if (g) return g;
  // Then prefix match (e.g. /sports/hockey under /sports)
  g = GAMES.find(g => route.startsWith(g.route + "/"));
  return g;
}

/** Search across all enabled games by name + subtitle + description. */
export function searchGames(query: string): GameEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return GAMES.filter(g => g.enabled !== false).filter(g =>
    g.name.toLowerCase().includes(q) ||
    g.subtitle.toLowerCase().includes(q) ||
    g.description.toLowerCase().includes(q)
  );
}
