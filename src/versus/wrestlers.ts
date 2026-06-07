// src/versus/wrestlers.ts
//
// Versus-side wrapper around the combat-sports wrestler roster. Mirrors
// src/versus/boxers.ts — exposes the wrestler list in the same
// {id, name, abbr, emoji, primary} shape used by PlayerPickerCard so we
// can reuse the team-row UI without a separate wrestler picker.

import { WRESTLERS, wrestlerById, type WrestlerDef } from "../combat-sports/wrestling/wrestlers";

export interface WrestlerCard {
  id: string;
  name: string;
  abbr: string;
  emoji: string;
  primary: string;
}

function makeAbbr(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? name;
  return last.slice(0, 3).toUpperCase();
}

export const WRESTLING_FIGHTERS: WrestlerCard[] = WRESTLERS.map(w => ({
  id: w.id,
  name: w.name,
  abbr: makeAbbr(w.name),
  emoji: "🤼",
  primary: w.color,
}));

export function getWrestlingFighter(id: string): WrestlerCard {
  const hit = WRESTLING_FIGHTERS.find(f => f.id === id);
  if (hit) return hit;
  const fallback = wrestlerById(id);
  return {
    id: fallback.id,
    name: fallback.name,
    abbr: makeAbbr(fallback.name),
    emoji: "🤼",
    primary: fallback.color,
  };
}

export type { WrestlerDef };
