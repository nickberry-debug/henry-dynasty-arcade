// Football mode — type definitions. Kept intentionally separate from the
// baseball League type so the two simulations can't accidentally entangle.
// Stored in IndexedDB under a different key. Drama engine can read from
// either via a unified News type shape.

export type FootballPosition =
  | "QB" | "RB" | "FB" | "WR" | "TE"
  | "OL" | "DL" | "LB" | "CB" | "S"
  | "K" | "P";

export interface FootballPlayer {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  jersey: number;
  position: FootballPosition;
  age: number;
  yearsExp: number;
  overall: number; // 0-99
  potential: number;
  /** Overall at end of previous season — drives the dev arrow on roster screens. */
  prevOvr?: number;
  /** Position-relevant ratings — only the ones meaningful for this position get tuned. */
  ratings: {
    // QB
    armStrength: number;
    accuracy: number;
    decision: number;
    // RB / WR / TE
    speed: number;
    agility: number;
    hands: number;
    routeRunning: number;
    breakTackle: number;
    // OL/DL
    blocking: number;
    passRush: number;
    runDefense: number;
    // DB/LB
    coverage: number;
    tackling: number;
    awareness: number;
    // K/P
    kickPower: number;
    kickAccuracy: number;
    // General
    stamina: number;
    composure: number;
  };
  morale: number; // 0-100
  hot: number; // -10..+10
  injury: { name: string; weeksOut: number } | null;
  teamId: string | null;
  retired: boolean;
  /** Set when the player retires so the HoF + history pages can show "retired YEAR". */
  retiredSeason?: number;
  /** Hall of Fame flag — set during runHoFVoting at the end of an offseason. */
  hof?: boolean;
  seasonStats: FootballSeasonStats;
  /** Frozen snapshots of past seasons — populated by startNewSeason. */
  careerStats: FootballCareerSeason[];
  /** Yearly awards (MVP, OPOY, DPOY, ROY, All-Pro, Comeback). */
  awards: FootballAward[];
  appearance: { skinTone: number; hairStyle: number; faceShape: number; portraitSeed: number };
}

export interface FootballCareerSeason extends FootballSeasonStats {
  season: number;
  age: number;
  teamId: string | null;
}

export interface FootballAward {
  season: number;
  type: "MVP" | "OPOY" | "DPOY" | "ROY" | "All-Pro" | "Comeback" | "Champion";
}

export interface FootballSeasonStats {
  games: number;
  // Passing
  passAtt: number; passComp: number; passYds: number; passTD: number; passInt: number; sacked: number;
  // Rushing
  rushAtt: number; rushYds: number; rushTD: number; fumbles: number;
  // Receiving
  receptions: number; recYds: number; recTD: number; targets: number;
  // Defense
  tackles: number; sacks: number; interceptions: number; forcedFumbles: number; defTD: number;
  // Kicking
  fgMade: number; fgAtt: number; xpMade: number; xpAtt: number;
}

export function emptyStats(): FootballSeasonStats {
  return {
    games: 0,
    passAtt: 0, passComp: 0, passYds: 0, passTD: 0, passInt: 0, sacked: 0,
    rushAtt: 0, rushYds: 0, rushTD: 0, fumbles: 0,
    receptions: 0, recYds: 0, recTD: 0, targets: 0,
    tackles: 0, sacks: 0, interceptions: 0, forcedFumbles: 0, defTD: 0,
    fgMade: 0, fgAtt: 0, xpMade: 0, xpAtt: 0,
  };
}

export interface FootballTeam {
  id: string;
  city: string;
  name: string;
  abbr: string;
  primary: string;
  secondary: string;
  accent: string;
  divisionId: number;
  conferenceId: 0 | 1;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rosterOrder?: string[]; // player ids
}

export interface FootballGame {
  id: string;
  week: number;
  homeId: string;
  awayId: string;
  played: boolean;
  score?: { home: number; away: number };
  /** Drive log when watched live. */
  plays?: FootballPlay[];
}

export type FootballPlayKind =
  | "run" | "shortPass" | "mediumPass" | "longPass" | "sack" | "incomplete"
  | "interception" | "fumble" | "touchdown" | "fieldGoal" | "punt" | "kickoff"
  | "turnoverOnDowns" | "extraPoint" | "twoPointConversion" | "safety"
  | "end-quarter" | "end-half" | "end-game" | "info";

export interface FootballPlay {
  /** Sequence # within game. */
  seq: number;
  quarter: 1 | 2 | 3 | 4 | 5; // 5 = OT
  /** Clock seconds remaining in quarter. */
  clock: number;
  kind: FootballPlayKind;
  /** Yards gained on the play (negative for losses). */
  yards: number;
  /** Field position at start of play (0-100, 0 = own goal line, 100 = opp goal line). */
  startYard: number;
  /** Field position at end. */
  endYard: number;
  down: 1 | 2 | 3 | 4 | 0; // 0 for non-down plays
  toGo: number;
  /** Whose ball — team id. */
  possessionId: string;
  /** Player ids involved: passer, rusher, receiver, defender. */
  passer?: string;
  rusher?: string;
  receiver?: string;
  defender?: string;
  /** Score AFTER this play. */
  scoreHome: number;
  scoreAway: number;
  text: string;
}

export interface FootballNewsItem {
  id: string;
  week: number;
  season: number;
  category: "Game" | "Injury" | "Trade" | "Drama" | "Milestone" | "Drama-AI" | "Award" | "Draft" | "FA";
  headline: string;
  body?: string;
  teamIds?: string[];
  playerIds?: string[];
  emoji?: string;
  important?: boolean;
  /** Reactions on a per-news basis — kid taps a heart / fire / etc. */
  reactions?: { likes: number; laughs: number; fire: number; sad: number };
  /** Pinned to "Memorable Moments." */
  memorable?: boolean;
}

/** A single past season's recorded outcome — written when the new season starts. */
export interface FootballHistoryRecord {
  season: number;
  champion: string;        // team id
  runnerUp: string;        // team id
  champRecord?: string;    // "13-4 (1st AFC East)"
  mvp?: { playerId: string; name: string };
  opoy?: { playerId: string; name: string };
  dpoy?: { playerId: string; name: string };
  roy?: { playerId: string; name: string };
  passLeader?: { playerId: string; name: string; yards: number };
  rushLeader?: { playerId: string; name: string; yards: number };
  recLeader?: { playerId: string; name: string; yards: number };
  sackLeader?: { playerId: string; name: string; sacks: number };
}

// Football storylines now use the shared `/src/sports-engine` Storyline
// type — see `StorylineState` on FootballLeague below. The legacy
// FootballStoryline interface was unused (declared but never populated)
// and has been removed.

export interface FootballLeague {
  id: string;
  createdAt: number;
  modifiedAt: number;
  name: string;
  season: number;
  /** 1..17 regular-season weeks, 18-20 playoffs. */
  week: number;
  phase: "preseason" | "regular" | "playoffs" | "offseason" | "draft" | "freeagency";
  teams: FootballTeam[];
  players: FootballPlayer[];
  freeAgents: FootballPlayer[];
  divisions: Array<{ id: number; name: string; conferenceId: 0 | 1; teamIds: string[] }>;
  schedule: FootballGame[];
  newsLog: FootballNewsItem[];
  userTeamId: string | null;
  /** Active playoff bracket, populated when the regular season ends. */
  playoffsBracket: import("./playoffs").FootballPlayoffs | null;
  champion: string | null;
  /** The most recent rookie class generated by ageAndDevelop. Surfaced
   *  on a /football/draft-class review page so the user can see who
   *  joined their league after each offseason. Optional for backwards
   *  compatibility with older save slots. */
  lastDraftClass?: { season: number; rookieIds: string[] };
  /** Retired players archive — populated by ageAndDevelop. HoF tracked on each. */
  retiredPlayers?: FootballPlayer[];
  /** Per-season historical records — populated at end of each season. */
  history?: FootballHistoryRecord[];
  /** Active + resolved storylines. Uses the shared sports-engine
   *  StorylineState shape so Baseball and Football render storylines
   *  identically in the News page + ticker. */
  storylines?: import("../sports-engine").StorylineState;
  /** End-of-season awards keyed by season — populated when champion is crowned. */
  seasonAwards?: Record<number, {
    season: number;
    mvp?: { playerId: string; name: string };
    opoy?: { playerId: string; name: string };
    dpoy?: { playerId: string; name: string };
    roy?: { playerId: string; name: string };
    comeback?: { playerId: string; name: string };
  }>;
  /** Interactive draft state — populated after `ageAndDevelop` runs.
   *  Mirrors Baseball's Draft: pool of rookies (not yet assigned),
   *  pickOrder, currentPick index. User picks via /football/draft,
   *  CPU auto-picks the rest. When `completed` flips true the rookies
   *  get moved onto lg.players + each team's roster. */
  currentDraft?: FootballDraft;
}

/** A single draft pick recorded for history. */
export interface FootballDraftPick {
  pick: number;       // overall pick number, 1-indexed
  round: number;      // 1..ROUNDS
  teamId: string;
  playerId: string;
}

/** Active draft state. While present, the league is in the draft phase. */
export interface FootballDraft {
  season: number;     // the season the rookies are joining (lg.season + 1)
  pickOrder: string[];// team ids in pick order (worst-first across rounds)
  currentPick: number;// 0-indexed pick counter
  rounds: number;     // total rounds
  pool: FootballPlayer[]; // remaining undrafted rookies
  picks: FootballDraftPick[]; // recorded picks
  completed: boolean;
}
