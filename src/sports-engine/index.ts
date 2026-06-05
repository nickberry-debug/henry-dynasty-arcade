// Shared sports-engine — single import surface for both Baseball and
// Football (and future sports). See SPORTS_ARCHITECTURE.md at repo root
// for the scope of what gets shared vs what stays sport-specific.

export type {
  Storyline,
  StorylineKind,
  StorylineState,
  SharedNewsBase,
} from "./types";

export {
  STORYLINE_EMOJI,
  emptyStorylineState,
} from "./types";

export {
  openOrAdvance,
  resolveStoryline,
  trimResolved,
  tickerLine,
  detectWinStreaks,
  detectLossStreaks,
  detectPlayoffPushes,
  type TeamRecord,
  type RecentResult,
} from "./storylines";
