// src/versus/backdrops.ts
//
// Three backdrops per combat sport with progressive unlocks.
// Phase 3 spec: unlock thresholds at 5 / 10 / 20 wins per profile per sport.
// First backdrop is always unlocked (you have to be able to play match 1).

import type { Sport } from "./types";
import { getRecord } from "./records";

export interface Backdrop {
  id: string;
  label: string;
  /** Wins needed (per profile, per sport) to unlock. */
  unlockAt: number;
  /** Tailwind-compatible CSS gradient describing the ring/arena floor + back. */
  bgClass: string;
  /** Accent hex for ropes / arena trim. */
  trim: string;
  /** Crowd silhouette colour. */
  crowd: string;
}

const BOXING_BACKDROPS: Backdrop[] = [
  { id: "club",      label: "Local Boxing Club",   unlockAt:  0, bgClass: "bg-gradient-to-b from-amber-900 via-stone-800 to-stone-950", trim: "#fbbf24", crowd: "#1c1917" },
  { id: "casino",    label: "Casino Showcase",     unlockAt:  5, bgClass: "bg-gradient-to-b from-purple-900 via-fuchsia-900 to-slate-950", trim: "#f0abfc", crowd: "#312e81" },
  { id: "megadome",  label: "Mega Dome — PPV Main", unlockAt: 10, bgClass: "bg-gradient-to-b from-sky-900 via-indigo-900 to-zinc-950", trim: "#fde68a", crowd: "#0b1220" },
];

const WRESTLING_BACKDROPS: Backdrop[] = [
  { id: "armory",    label: "Armory Indie Show",    unlockAt:  0, bgClass: "bg-gradient-to-b from-orange-900 via-amber-900 to-stone-950", trim: "#fb923c", crowd: "#27272a" },
  { id: "townhall",  label: "Town Hall TV Taping",  unlockAt:  5, bgClass: "bg-gradient-to-b from-emerald-900 via-teal-900 to-slate-950", trim: "#5eead4", crowd: "#0f172a" },
  { id: "arena",     label: "Arena PPV — Main Event", unlockAt: 10, bgClass: "bg-gradient-to-b from-violet-900 via-indigo-900 to-zinc-950", trim: "#a78bfa", crowd: "#1e1b4b" },
];

/** spec said 5/10/20 — boxing/wrestling third tier capped at 20 wins. */
function applyTier20(list: Backdrop[]): Backdrop[] {
  const out = [...list];
  if (out[2]) out[2] = { ...out[2], unlockAt: 20 };
  return out;
}

const SPORT_BACKDROPS: Record<Sport, Backdrop[]> = {
  baseball:  [],
  football:  [],
  boxing:    applyTier20(BOXING_BACKDROPS),
  wrestling: applyTier20(WRESTLING_BACKDROPS),
};

export function backdropsFor(sport: Sport): Backdrop[] {
  return SPORT_BACKDROPS[sport] ?? [];
}

export function isUnlocked(b: Backdrop, profileId: string, sport: Sport): boolean {
  if (b.unlockAt <= 0) return true;
  const rec = getRecord(profileId, sport);
  return rec.wins >= b.unlockAt;
}

/** Pick the highest-tier unlocked backdrop for a profile/sport — used as default
 *  when the match starts and the player hasn't manually selected one. */
export function defaultBackdrop(profileId: string, sport: Sport): Backdrop | null {
  const list = backdropsFor(sport);
  if (!list.length) return null;
  for (let i = list.length - 1; i >= 0; i--) {
    if (isUnlocked(list[i], profileId, sport)) return list[i];
  }
  return list[0];
}
