// Shared sports-engine types — sport-agnostic. Both Baseball and Football
// (and eventually Hockey/Basketball/CFB) consume these so storylines, news
// reactions, and phase transitions all behave identically across sports.
//
// Crucially, this does NOT try to unify Player or Team — those diverge
// too far across sports. Each sport keeps its own concrete types and
// passes opaque string IDs into the shared engine.

/** A named ongoing arc — rivalries, MVP races, win/loss streaks, playoff
 *  pushes. Tracked across the season and surfaced via the news/ticker. */
export interface Storyline {
  /** Stable id — sport prefixes recommended (e.g. "fb-mvp-2026"). */
  id: string;
  /** Kind drives icon + ticker styling. */
  kind: StorylineKind;
  /** What season this storyline belongs to. */
  season: number;
  /** When the storyline first opened. */
  openedAt: { week?: number; day?: number };
  /** Last time the storyline was advanced (for sorting / staleness). */
  lastTouchedAt: { week?: number; day?: number };
  /** Human label shown in ticker + news ("Knights 7-game win streak"). */
  label: string;
  /** Longer-form description for the News page card. */
  body?: string;
  /** Player ids subject to the storyline. */
  playerIds: string[];
  /** Team ids subject to the storyline. */
  teamIds: string[];
  /** How "hot" the storyline is — drives ★ in ticker. Increments each advance. */
  intensity: number;
  /** Resolved arcs stop appearing in active feeds. */
  resolved?: boolean;
  /** Optional emoji override. */
  emoji?: string;
}

export type StorylineKind =
  | "rivalry"
  | "mvpRace"
  | "winStreak"
  | "loseStreak"
  | "playoffPush"
  | "milestoneWatch"
  | "rookieRise"
  | "comeback"
  | "slump";

/** Engine-provided emoji defaults per storyline kind. */
export const STORYLINE_EMOJI: Record<StorylineKind, string> = {
  rivalry: "⚔️",
  mvpRace: "🏆",
  winStreak: "🔥",
  loseStreak: "❄️",
  playoffPush: "🎯",
  milestoneWatch: "📈",
  rookieRise: "🌟",
  comeback: "💪",
  slump: "📉",
};

/** Subset of a news item that's shared across sports. Each sport's full
 *  NewsItem extends this with its own category enum and metadata. */
export interface SharedNewsBase {
  id: string;
  headline: string;
  body?: string;
  teamIds?: string[];
  playerIds?: string[];
  emoji?: string;
  important?: boolean;
  reactions?: { likes: number; laughs: number; fire: number; sad: number };
  memorable?: boolean;
}

/** Container that owns the storylines for a given league. Both sports
 *  attach a StorylineState to their own league object via the shared
 *  helpers below — Baseball stores it on `league.drama.storylines2`
 *  (additive — coexists with the old loose Storyline[] used by Baseball's
 *  drama subsystem), Football stores it on `league.storylines`. */
export interface StorylineState {
  active: Storyline[];
  resolved: Storyline[];
}

export function emptyStorylineState(): StorylineState {
  return { active: [], resolved: [] };
}
