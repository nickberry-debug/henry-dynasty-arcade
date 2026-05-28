// L — Score Keeper Module: data model.

export type ScoreMode = "backyard" | "real";

export interface ScoreSide {
  name: string;
  color: string;
  runs: number;
  hits: number;
  errors: number;
  /** Per-inning run line. */
  linescore: number[];
}

export type EventKind =
  | "run"
  | "out"
  | "ball"
  | "strikeSwing"
  | "strikeLook"
  | "foul"
  | "foulTip"
  | "single"
  | "double"
  | "triple"
  | "homerun"
  | "groundOut"
  | "flyOut"
  | "lineOut"
  | "popOut"
  | "sacFly"
  | "sacBunt"
  | "fieldersChoice"
  | "error"
  | "hbp"
  | "sb"
  | "cs"
  | "wp"
  | "pb"
  | "balk"
  | "dp"
  | "tp"
  | "amazingCatch"
  | "strikeout"
  | "walk"
  | "halfInning"
  | "inning"
  | "funny"
  | "photo"
  | "sub"
  | "note";

export interface ScoreEvent {
  id: string;
  t: number; // timestamp
  kind: EventKind;
  side: "home" | "away";
  inning: number;
  half: "top" | "bottom";
  text: string;
  detail?: string;
  photoDataURL?: string;
}

export interface ScoreCount {
  balls: number;
  strikes: number;
  outs: number;
}

export interface Scorecard {
  id: string;
  mode: ScoreMode;
  gameName: string;
  gameType?: string; // MLB / Little League / etc.
  location?: string;
  weather?: string;
  date: string; // ISO date
  createdAt: number;
  modifiedAt: number;
  completed: boolean;
  innings: number;
  currentInning: number;
  half: "top" | "bottom";
  count: ScoreCount;
  bases: { first: string | null; second: string | null; third: string | null };
  home: ScoreSide;
  away: ScoreSide;
  log: ScoreEvent[];
  mvp?: string;
  scoredBy?: string;
}
