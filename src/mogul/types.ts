// Movie Mogul — type system.
// One studio = one save. Studio holds cash, talent under contract,
// owned scripts, active productions, released films, awards, and a
// shared world model (rival studios, talent pool, script market,
// industry calendar).

export type Era = "golden" | "newHollywood" | "blockbuster" | "modern";
export type Difficulty = "indie" | "studio" | "bigSix";

export type Genre =
  | "Action" | "Drama" | "Comedy" | "Thriller" | "Horror"
  | "Romance" | "SciFi" | "Fantasy" | "Family" | "Documentary"
  | "Western" | "Musical" | "War" | "Sports";

export type ContentRating = "G" | "PG" | "PG-13" | "R" | "NC-17";

/** Per-talent willingness to engage with content. Each axis 0..3 where
 *  0 = will not do it at all, 1 = mild only, 2 = moderate, 3 = no
 *  limits. When a script's required level exceeds the talent's
 *  willingness on any axis, they decline or demand changes. */
export interface ContentComfort {
  violence: 0 | 1 | 2 | 3;
  nudity: 0 | 1 | 2 | 3;
  sexuality: 0 | 1 | 2 | 3;
  language: 0 | 1 | 2 | 3;
  drugs: 0 | 1 | 2 | 3;
}

/** Caveats a talent may demand when negotiating a role. Each is a
 *  named ask; granting it costs the studio in flexibility, money, or
 *  prestige. Refusing risks losing the talent. */
export type CaveatId =
  | "producerCredit"
  | "directorCredit"
  | "finalCut"
  | "backendPercent"
  | "topBilling"
  | "scriptApproval"
  | "petCoStar"
  | "noPress"
  | "writingCredit"
  | "locationPrefs"
  | "packageDeal";

export interface Caveat {
  id: CaveatId;
  /** 0..1 — how badly the talent wants this. 1.0 = mandatory; 0.5 =
   *  nice-to-have; below 0.3 doesn't appear in their ask list. */
  weight: number;
  label: string;
  /** What it costs the studio if granted. */
  cost: "small" | "medium" | "large";
}

export type TalentRole = "actor" | "director" | "writer";

export type ProductionStage =
  | "development" | "preProduction" | "filming" | "postProduction" | "released" | "cancelled";

export interface Talent {
  id: string;
  name: string;
  role: TalentRole;
  age: number;
  /** 1..5 stars; the "fame" tier the audience sees. */
  star: 1 | 2 | 3 | 4 | 5;
  /** Hidden true talent (40..99). The system uses this for outcomes;
   *  the user only knows .star until they've worked with them. */
  trueRating: number;
  /** Whether the true rating has been revealed (worked with them once). */
  revealed: boolean;
  /** Genre specialties — boosts when matched to script genre. */
  specialties: Genre[];
  /** Current asking fee per movie ($M). */
  fee: number;
  /** Studio that holds this talent under contract; null = free agent.
   *  Project-based hires temporarily set studioId for the duration of
   *  the production; on release the contract ends. */
  studioId: string | null;
  /** Movies remaining on current contract. Per-project hires set this
   *  to 1; multi-picture deals can be 2-4. */
  contractMoviesLeft: number;
  /** Career stats. */
  hits: number;
  flops: number;
  retired: boolean;
  /** Hot streak / scandal flag — affects current movies. */
  hot: number; // -5..+5
  bio?: string;
  /** Chemistry — talentId → rating −3..+3. Built up by co-starring.
   *  Strong chemistry pairs boost movie quality; bad chemistry tanks it. */
  chemistry?: Record<string, number>;
  /** Did this talent earn a Walk of Fame star yet? Tied to hit count. */
  walkOfFame?: boolean;
  /** What this talent will/won't do on screen. Defaults skew permissive
   *  for actors; writers are unaffected by these. */
  comfort?: ContentComfort;
  /** Personal asks during negotiation — varies by talent. */
  caveats?: Caveat[];
  /** Director-actor loyalty — directorId → bond 0..5. 3+ = "muse"
   *  status: works for less, performs better. */
  loyalty?: Record<string, number>;
  /** Gender for casting required-role matching: M/F/any. */
  gender?: "M" | "F" | "any";
}

/** A role the script requires to be cast. Project setup lists these
 *  as cast slots; users fill them by hiring matching talent. */
export interface RequiredRole {
  /** Display label for the slot, e.g. "Female Lead". */
  label: string;
  /** Slot id within the script — used to key the cast map. */
  slot: string;
  /** Preferred gender; "any" = either matches. */
  gender: "M" | "F" | "any";
  /** Preferred age band — soft preference; off-band drops quality. */
  ageBand?: "young" | "middleAged" | "older";
  /** Whether this role IS the lead (star slot). Only one per script. */
  isLead?: boolean;
}

export interface Script {
  id: string;
  title: string;
  genre: Genre;
  /** True quality 1..5 — hidden until coverage runs. */
  trueQuality: 1 | 2 | 3 | 4 | 5;
  /** What the buyer sees — noisy until coverage is run. */
  scoutedQuality: 1 | 2 | 3 | 4 | 5;
  /** Times user paid for coverage. 0..3. */
  coverageRuns: number;
  /** Asking price $M. */
  price: number;
  /** Whoever owns it (studioId), or null if on the open market. */
  studioId: string | null;
  /** Source: spec, commission, adaptation, sequel, blackList, template. */
  source: "spec" | "commission" | "adaptation" | "sequel" | "template";
  /** If a sequel, the franchise this belongs to. */
  franchiseId?: string;
  /** Has this script been turned into a movie yet? */
  used: boolean;
  /** Optional logline / premise. */
  premise?: string;
  /** The script's natural rating — i.e. what level it's written at.
   *  The studio can SOFTEN it (cut violence/nudity to lower the rating)
   *  during production, which affects the script's potential quality. */
  rating: ContentRating;
  /** Content demands of the script as written. */
  requirements: ContentComfort;
  /** Roles the script needs cast (1-4 slots). */
  requiredRoles: RequiredRole[];
  /** Slug for the real-movie template this script was seeded from, if
   *  any. Internal use only — never shown to player. */
  templateId?: string;
  /** Era this script fits. Helps generation pick era-appropriate seeds. */
  era?: Era;
}

export interface Production {
  id: string;
  title: string;
  genre: Genre;
  studioId: string;
  scriptId: string;
  /** Stage of the pipeline. */
  stage: ProductionStage;
  /** Cast slots — keyed by RequiredRole.slot. Each maps to a talentId
   *  the studio has hired for that part. Empty slot = unfilled. */
  cast: Record<string, string>;
  /** Talent attached for crew + director (legacy single-slot fields
   *  kept for back-compat with V1 productions; new productions use
   *  `cast.lead` etc.). */
  directorId: string | null;
  starId: string | null;
  supportingIds: string[];
  /** Caveats the studio granted to each talentId during hiring. Keyed
   *  by talentId → CaveatId[]. */
  grantedCaveats: Record<string, CaveatId[]>;
  /** Target rating for the release. Defaults to the script's natural
   *  rating; the studio can soften (cuts) but rarely harshen. */
  targetRating: ContentRating;
  /** Budget allocation ($M). */
  budget: {
    production: number;
    fx: number;
    marketing: number;
    pressTour?: number;
  };
  /** Spent so far ($M). */
  spent: number;
  /** Quality 0..100 — built up as stages complete, sealed at release. */
  qualityScore: number;
  /** Months remaining in current stage. */
  monthsLeftInStage: number;
  /** Scheduled release year/month — used to schedule against rivals. */
  releaseYear: number;
  releaseMonth: number;
  /** Has the user run coverage on the script via this production? */
  testScreened?: boolean;
  testScreenScore?: number;
}

/** Modern-era foreign-market box-office breakdown. */
export interface ForeignMarkets {
  china: number;
  europe: number;
  japan: number;
  southAmerica: number;
}

export interface ReleasedMovie {
  id: string;
  title: string;
  genre: Genre;
  studioId: string;
  releaseYear: number;
  releaseMonth: number;
  /** Sealed quality 0..100. */
  quality: number;
  /** Total budget spent. */
  budget: number;
  /** Box office totals ($M) — opening + total run. */
  opening: number;
  totalBO: number;
  /** Weeks of theatrical run played out so far. */
  weeksOut: number;
  /** Critic + audience scores 0..100. */
  criticScore: number;
  audienceScore: number;
  /** Critic review prose, when AI is configured. */
  criticReview?: { critic: string; quote: string };
  /** Awards categories won. */
  awards: string[];
  /** Talent ids that were attached at release — for awards. */
  directorId: string | null;
  starId: string | null;
  supportingIds: string[];
  /** Sequel hooks. */
  franchiseId?: string;
  /** Profit (auto-computed: totalBO - budget). */
  profit: number;
  /** Foreign markets, modern era only. */
  foreign?: ForeignMarkets;
  /** Soundtrack: released after the film. Boosts revenue. */
  soundtrack?: {
    released: boolean;
    revenue: number;
  };
}

export interface RivalStudio {
  id: string;
  name: string;
  abbr: string;
  primary: string;
  accent: string;
  /** Cash on hand $M. Rivals don't actually borrow — abstracted. */
  cash: number;
  /** 1..5 prestige rating shown to user. */
  prestige: 1 | 2 | 3 | 4 | 5;
  /** Personality bias — favored genres + style. */
  personality: {
    favoredGenres: Genre[];
    aggression: number; // 0..1 — high = poach talent, big budgets
    quality: number;    // 0..1 — high = prestige films, low = popcorn
  };
  wins: number;
  losses: number;
  /** Their currently-in-production movies (simplified — title only). */
  activeProductions: { id: string; title: string; genre: Genre; releaseYear: number; releaseMonth: number; budget: number }[];
}

export interface PlayerStudio {
  id: string;
  name: string;
  abbr: string;
  primary: string;
  accent: string;
  moguleName: string;
  /** Cash on hand $M. */
  cash: number;
  /** Outstanding bank loan $M. */
  loan: number;
  /** Annual interest rate 0..1. */
  loanRate: number;
  /** Months until current loan is due. */
  loanMonthsLeft: number;
  /** Times the user has defaulted on a loan. */
  defaults: number;
  /** Studio prestige 1..5. Rises with award wins + box office. */
  prestige: 1 | 2 | 3 | 4 | 5;
  /** Career totals. */
  totalRevenue: number;
  totalProfit: number;
  awardsWon: number;
  /** Studio facilities — affects production quality + capacity. */
  facilities: {
    soundStages: number;       // 1..5
    backlots: number;          // 0..3
    postProduction: 1 | 2 | 3; // 1=basic, 2=mid, 3=elite
    scriptDept: 0 | 1 | 2;
    marketingDept: 0 | 1 | 2;
    /** Studio tours — late-game passive income. 0 = none, 1 = open,
     *  2 = expanded. Generates $0.5M / $1.2M per month. */
    studioTours: 0 | 1 | 2;
    /** Theme parks — end-game flex. Costs $300M to build, returns
     *  $4M/month. Requires prestige 4+. */
    themePark: 0 | 1;
  };
  /** Walk of Fame — talent IDs you've immortalized via 3+ hits. */
  walkOfFame: string[];
}

export interface NewsItem {
  id: string;
  year: number;
  month: number;
  category: "Box Office" | "Talent" | "Production" | "Award" | "Scandal" | "Info";
  emoji?: string;
  headline: string;
  important?: boolean;
  studioIds?: string[];   // for bubbling user's studio first
  talentIds?: string[];
}

export interface AwardNomination {
  category: string;
  year: number;
  /** Nominees — each is {movieId, talentId?, studioId}. */
  nominees: Array<{ movieId: string; talentId?: string; studioId: string }>;
  /** Winner — set when ceremony resolves. */
  winnerIdx: number | null;
}

export interface BlackListEvent {
  year: number;
  /** The 5 elite scripts on the list — ids point into Studio.scripts. */
  scriptIds: string[];
  /** Has the user already chosen / passed on this year's list? */
  resolved: boolean;
}

export interface Studio {
  id: string;                 // save slot id
  createdAt: number;
  modifiedAt: number;
  era: Era;
  difficulty: Difficulty;
  /** Calendar — month 1..12, year. */
  year: number;
  month: number;
  /** The player's studio. */
  player: PlayerStudio;
  /** Other studios. */
  rivals: RivalStudio[];
  /** Talent pool — everyone in the world. */
  talent: Talent[];
  /** Retired talent — kept for HoF / awards history. */
  retiredTalent: Talent[];
  /** Scripts you own OR are on the open market (studioId === null). */
  scripts: Script[];
  /** Active productions. */
  productions: Production[];
  /** Released movies — yours AND rivals'. */
  releases: ReleasedMovie[];
  /** Awards history — most recent first. */
  awards: Array<{
    year: number;
    nominations: AwardNomination[];
    ceremonyDone: boolean;
    /** AI-generated acceptance speeches keyed by category. */
    speeches?: Record<string, string>;
  }>;
  /** Industry news feed. */
  newsLog: NewsItem[];
  /** Box office records (career bests across the world). */
  records: {
    biggestOpening: { movieId: string; amount: number } | null;
    biggestTotalBO: { movieId: string; amount: number } | null;
  };
  /** Most recent unresolved Black List (annual top-screenplays event).
   *  Null when no event is active for the user to respond to. */
  blackList?: BlackListEvent | null;
}

export const ERA_START_YEAR: Record<Era, number> = {
  golden: 1955,
  newHollywood: 1975,
  blockbuster: 1987,
  modern: 2015,
};

export const ERA_LABEL: Record<Era, string> = {
  golden: "Golden Age",
  newHollywood: "New Hollywood",
  blockbuster: "Blockbuster Era",
  modern: "Modern",
};

export const DIFFICULTY_START_CASH: Record<Difficulty, number> = {
  indie: 10,    // $10M — tight
  studio: 25,   // $25M — comfortable
  bigSix: 50,   // $50M — established
};

export const GENRES: Genre[] = [
  "Action", "Drama", "Comedy", "Thriller", "Horror",
  "Romance", "SciFi", "Fantasy", "Family", "Documentary",
];
