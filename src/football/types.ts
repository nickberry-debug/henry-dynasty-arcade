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
  seasonStats: FootballSeasonStats;
  appearance: { skinTone: number; hairStyle: number; faceShape: number; portraitSeed: number };
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
  category: "Game" | "Injury" | "Trade" | "Drama" | "Milestone" | "Drama-AI";
  headline: string;
  body?: string;
  teamIds?: string[];
  playerIds?: string[];
  emoji?: string;
  important?: boolean;
}

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
}
