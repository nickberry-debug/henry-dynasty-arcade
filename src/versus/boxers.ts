// Versus-side wrapper around the combat-sports boxer roster. Exposes the
// boxer list in the same shape as BaseballTeam / FootballTeam so the
// VersusHub PlayerPickerCard can render fighters as "teams" without
// needing a separate picker widget. VersusPlayer.teamId stores the
// boxer's id when sport === "boxing".

import { BOXERS, boxerById, type BoxerDef } from "../combat-sports/boxing/fighters";

export interface BoxerCard {
  id: string;
  name: string;
  /** Short label used in the team-row chip. */
  abbr: string;
  /** Emoji shown above the abbr — gloves for everyone (one set, easy to read). */
  emoji: string;
  /** Corner-ish color used to tint the picker chip. */
  primary: string;
}

function makeAbbr(name: string): string {
  // "Tank Tannerly" → "TAN", "Iris Ironside" → "IRO", etc.
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? name;
  return last.slice(0, 3).toUpperCase();
}

export const BOXING_FIGHTERS: BoxerCard[] = BOXERS.map(b => ({
  id: b.id,
  name: b.name,
  abbr: makeAbbr(b.name),
  emoji: "🥊",
  primary: b.color,
}));

export function getBoxingFighter(id: string): BoxerCard {
  const hit = BOXING_FIGHTERS.find(f => f.id === id);
  if (hit) return hit;
  const fallback = boxerById(id);
  return {
    id: fallback.id,
    name: fallback.name,
    abbr: makeAbbr(fallback.name),
    emoji: "🥊",
    primary: fallback.color,
  };
}

export type { BoxerDef };
