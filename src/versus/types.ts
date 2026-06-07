// Sports Versus Mode â€” shared types.
//
// Two sports (baseball / football), two play modes (passplay / online),
// one shared simultaneous-selection loop: each side locks in privately
// â†’ both reveals â†’ engine resolves â†’ repeat.

export type Sport = "baseball" | "football";
export type PlayMode = "passplay" | "online" | "cpu";
export type CpuDifficulty = "easy" | "normal" | "hard";

/** Which side is the active "picker" right now. In Pass & Play we tick
 *  this between picks; the engine reads it to know whose turn it is to
 *  see the picker UI vs. the handoff screen. */
export type Seat = "A" | "B";

export interface VersusPlayer {
  profileId: string;
  profileName: string;
  profileColor: string;
  /** Which sport team the player picked for this match. */
  teamId: string;
}

/** Engine-agnostic phase the UI cycles through. */
export type VersusPhase =
  | "setup"     // selecting teams / mode / players
  | "pickA"     // Player A's hidden pick UI (B sees handoff in passplay)
  | "pickB"     // Player B's hidden pick UI (A sees handoff in passplay)
  | "reveal"    // both locked â€” flip the cards
  | "resolve"   // animation + scoring
  | "between"   // brief pause / scoreboard update before next play
  | "done";     // match over â†’ winner screen

// â”€â”€ BASEBALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** 5-zone strike zone â€” simpler than 3x3 for kid play but still tactical. */
export type PitchZone = "high" | "low" | "in" | "out" | "middle";
export type PitchType = "fastball" | "curve" | "changeup" | "slider";
export type BatType = "contact" | "balanced" | "power";
export type SwingChoice = "take" | "contact" | "power";

export interface PitcherPick {
  pitch: PitchType;
  zone: PitchZone;
  /** Intentional ball (outside the strike zone). When true, pitch always
   *  registers as a ball if the batter takes. */
  intentionalBall: boolean;
}

export interface BatterPick {
  swing: SwingChoice;
  /** Which zone the batter is sitting on. Ignored when swing === "take". */
  guess: PitchZone;
  /** Bat type chosen pre-match â€” stays constant for the half-inning. */
  bat: BatType;
}

/** Outcome categories the resolve function emits. */
export type PitchOutcome =
  | { kind: "ball" }
  | { kind: "strike-looking" }
  | { kind: "strike-swinging" }
  | { kind: "foul" }
  | { kind: "out"; flavor: "fly" | "ground" | "lineout" }
  | { kind: "single" }
  | { kind: "double" }
  | { kind: "triple" }
  | { kind: "homer" }
  | { kind: "hbp" }; // hit by pitch (rare)

export interface BaseballState {
  /** Inning index, 0-based; topHalf = away batting. */
  inning: number;
  topHalf: boolean;
  outs: number;
  balls: number;
  strikes: number;
  /** [first, second, third] base occupied flags. */
  bases: [boolean, boolean, boolean];
  /** [away, home] scores. A = away (top half bats first). */
  score: [number, number];
  /** Most recent narrated event line for the play feed. */
  lastEvent?: string;
  /** Player-A is at-bat in top half (away); player-B in bottom. */
  innings: number;          // total innings to play
}

// â”€â”€ FOOTBALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type OffensePlay =
  | "run_inside" | "run_outside"
  | "pass_short" | "pass_long"
  | "play_action" | "screen";

export type DefensePlay =
  | "run_stuff" | "blitz"
  | "zone_short" | "zone_deep"
  | "balanced";

export interface FootballPickOffense { play: OffensePlay; }
export interface FootballPickDefense { play: DefensePlay; }

export type FootballOutcome =
  | { kind: "gain"; yards: number; firstDown: boolean }
  | { kind: "loss"; yards: number }
  | { kind: "incomplete" }
  | { kind: "sack"; yards: number }
  | { kind: "touchdown" }
  | { kind: "interception" }
  | { kind: "fumble" }
  | { kind: "fieldgoal_made"; yards: number }
  | { kind: "fieldgoal_miss" }
  | { kind: "punt"; netYards: number };

export interface FootballState {
  /** Quarter index, 1-based. Match length = quarters. */
  quarter: number;
  quarters: number;
  /** Seconds remaining in the current quarter (kid-tuned, not 15 minutes). */
  clock: number;
  /** A or B currently has the ball. */
  possession: Seat;
  /** Yard line, 0..100 from offense's own end zone. */
  ballOn: number;
  down: 1 | 2 | 3 | 4;
  /** Yards to first down. */
  togo: number;
  /** [A, B] scores. */
  score: [number, number];
  lastEvent?: string;
}

// â”€â”€ MATCH WRAPPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface VersusMatch {
  id: string;
  sport: Sport;
  mode: PlayMode;
  createdAt: number;
  playerA: VersusPlayer;
  playerB: VersusPlayer;
  phase: VersusPhase;
  /** Sport-specific live state. */
  baseball?: BaseballState;
  football?: FootballState;
  /** Picks-in-flight stored privately. UI reads them only at "reveal". */
  pickA?: PitcherPick | BatterPick | FootballPickOffense | FootballPickDefense;
  pickB?: PitcherPick | BatterPick | FootballPickOffense | FootballPickDefense;
  /** Optional pick timer (off by default). */
  pickTimerSec?: number;
  /** Append-only event log for the play feed. */
  log: string[];
}

// â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Per-profile Versus stats blob. Stored at `versus_stats_v1` via
 *  cloudBlob so it syncs across the family devices. */
export interface VersusStats {
  /** Matches played per sport. */
  matches: { baseball: number; football: number };
  /** Wins per sport. */
  wins:    { baseball: number; football: number };
  /** Cumulative pick-accuracy hits (when batter guess matched pitch zone, etc). */
  pickAccuracyHits: number;
  pickAccuracyTotal: number;
  /** Big play counts. */
  homers: number;
  touchdowns: number;
  /** Head-to-head record vs each opponent profileId. */
  h2h: Record<string, { baseball: { w: number; l: number }; football: { w: number; l: number } }>;
}

export function emptyStats(): VersusStats {
  return {
    matches: { baseball: 0, football: 0 },
    wins:    { baseball: 0, football: 0 },
    pickAccuracyHits: 0,
    pickAccuracyTotal: 0,
    homers: 0,
    touchdowns: 0,
    h2h: {},
  };
}
