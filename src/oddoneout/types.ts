// Odd One Out — Spyfall-style social deduction. Most players share a
// secret word; one is the Odd One Out who doesn't know it. Players take
// turns dropping clues, then vote on who they think is the impostor.
//
// Crew wins by voting out the Odd One.
// Odd One wins by surviving the vote OR by correctly guessing the
// shared secret at the end.

export type GamePhase =
  | "lobby"       // waiting for players + host start
  | "assigning"   // (transient) roles + word picked, about to flip cards
  | "clues"       // turn-synced clue-giving
  | "discussion"  // free discussion timer
  | "voting"      // each player votes
  | "reveal"      // result shown; counts toward score
  | "ended";      // match wrap-up

/** Public per-player state visible to everyone. */
export interface OddPlayer {
  profileId: string;
  profileName: string;
  profileColor: string;
  ready?: boolean;
  /** Heartbeat ms — stale > 2 min = dropped seat. */
  ts: number;
}

/** Private per-player state. Stored at /oddRooms/{code}/private/{pid}
 *  so only the matching client reads it. */
export interface OddPrivate {
  profileId: string;
  /** True if this player is the Odd One Out for the current round. */
  isOdd: boolean;
  /** The shared secret word — null for the Odd One Out. */
  secretWord: string | null;
  /** Optional category hint (used by easier-mode toggle; off by default). */
  categoryHint?: string;
}

/** Per-round mutable state. */
export interface OddRoundState {
  /** Round number, 1-indexed. */
  num: number;
  phase: GamePhase;
  /** Pack id used for this round's secret. */
  packId: string;
  /** Order in which players give clues (shuffled per round). */
  clueOrder: string[];
  /** Index into clueOrder of the player currently submitting. */
  currentClueIdx: number;
  /** Clue history for the round. */
  clues: Array<{ profileId: string; text: string; ts: number }>;
  /** Wall-clock when the discussion phase opened. */
  discussionStartedAt?: number;
  /** Discussion length in seconds (default 60, host can extend +30). */
  discussionDurationSec: number;
  /** Vote tally; voterId -> targetId. */
  votes: Record<string, string>;
  /** Resolved at reveal phase. */
  reveal?: {
    evictedId: string | null;
    oddOneId: string;
    secretWord: string;
    oddOneWon: boolean;
    wasTie: boolean;
  };
}

export interface OddGameState {
  phase: GamePhase;
  players: OddPlayer[];
  packId: string;
  /** Current round; null while in lobby/end-screens. */
  round: OddRoundState | null;
  /** Per-player cumulative scores. */
  scores: Record<string, number>;
  /** Most recent event line for the feed. */
  lastEvent?: string;
  /** Match-level winner once host ends the series. */
  winnerId?: string;
}

/** Per-profile cross-game stats blob shape. */
export interface OddStats {
  matches: number;
  winsAsCrew: number;
  winsAsOdd: number;
  rounds: number;
  /** Head-to-head per opponent profile id. */
  h2h: Record<string, { wins: number; losses: number }>;
}

export function emptyOddStats(): OddStats {
  return { matches: 0, winsAsCrew: 0, winsAsOdd: 0, rounds: 0, h2h: {} };
}
