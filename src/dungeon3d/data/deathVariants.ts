// Dungeon3D — run-end flavored death blurbs.
//
// Instead of a static "RUN OVER" toast, surface a one-liner keyed to
// the cause of death (boss kind, enemy kind, or "unknown"). Each
// blurb is 1-2 short sentences and reads as part of the lore.

export type DeathCause =
  | "iron_tyrant"
  | "hexblade"
  | "hollowmage"
  | "grunt"
  | "scout"
  | "brute"
  | "telegraph"
  | "unknown";

export interface DeathBlurb {
  cause: DeathCause;
  title: string;
  body: string;
  /** Banner accent. */
  tint: string;
}

// 12 distinct variants. The Run-End UI looks up by cause; "unknown" is the
// fallback pool when the cause can't be classified.
export const DEATH_BLURBS: readonly DeathBlurb[] = [
  {
    cause: "iron_tyrant",
    title: "Felled by the Iron Tyrant",
    body: "A king died before you. Their throne sang briefly, then forgot.",
    tint: "#ef4444",
  },
  {
    cause: "hexblade",
    title: "Cut Down by the Hexblade",
    body: "You saw the strike. You saw it the day before. You saw it as a child. None of it helped.",
    tint: "#a78bfa",
  },
  {
    cause: "hollowmage",
    title: "Unmade by the Hollowmage",
    body: "Your body was the conclusion of a proof you weren't allowed to read.",
    tint: "#22d3ee",
  },
  {
    cause: "grunt",
    title: "Lost to the Grunts",
    body: "Not every story ends with a name. Sometimes the small ones get there first.",
    tint: "#fb923c",
  },
  {
    cause: "scout",
    title: "Tracked Down",
    body: "A scout's lantern dimmed last. The dark stepped over your body politely.",
    tint: "#6ee07a",
  },
  {
    cause: "brute",
    title: "Crushed by a Brute",
    body: "There is no graceful epitaph for being stepped on. The brute moved on without a verse.",
    tint: "#ef4444",
  },
  {
    cause: "telegraph",
    title: "Burned by the Floor",
    body: "The dungeon warned you. It always warns you. It's a polite predator.",
    tint: "#fde047",
  },
  {
    cause: "unknown",
    title: "Run Over",
    body: "The dungeon takes a breath and resets the names. Try again, traveler.",
    tint: "#fde047",
  },
  {
    cause: "unknown",
    title: "Down in the Dark",
    body: "You were close enough to hear the throne tuning. Not close enough.",
    tint: "#fde047",
  },
  {
    cause: "unknown",
    title: "Lantern Out",
    body: "Somewhere above ground a candle was lit for you. It will be the only one.",
    tint: "#fda4af",
  },
  {
    cause: "unknown",
    title: "Lost to the Maze",
    body: "The walls remembered you faster than you remembered yourself.",
    tint: "#a78bfa",
  },
  {
    cause: "unknown",
    title: "The Dungeon Wins This Round",
    body: "There's still a song with your name in it. Go back up. Practice it.",
    tint: "#22d3ee",
  },
] as const;

export function pickDeathBlurb(cause: DeathCause): DeathBlurb {
  const matches = DEATH_BLURBS.filter(b => b.cause === cause);
  const pool = matches.length > 0 ? matches : DEATH_BLURBS.filter(b => b.cause === "unknown");
  return pool[Math.floor(Math.random() * pool.length)];
}
