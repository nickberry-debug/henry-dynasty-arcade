// Potion Lab — save state. Tracks which recipes the player has
// discovered, which easter eggs they've triggered, total brews, and
// their bottled inventory. Persisted to localStorage.

import { useEffect, useState } from "react";

const STORAGE_KEY = "dd_potionlab_save_v1";

export interface BottledPotion {
  id: string;
  recipeId: string;
  name: string;
  emoji: string;
  color: string;
  brewedAt: number;
  /** Snapshot of the AI brewmaster narration for this exact brew. */
  narration?: string;
}

export interface PotionSave {
  discovered: string[];        // recipe ids the player has brewed
  easterEggsSeen: string[];    // recipe ids of easter-egg recipes triggered
  totalBrews: number;
  badBrews: number;            // brews that didn't match any recipe
  shelf: BottledPotion[];      // up to 24 saved bottles
  brewmasterRank: number;      // 0..5 — climbs with discoveries
  modifiedAt: number;
}

function defaultSave(): PotionSave {
  return {
    discovered: [], easterEggsSeen: [], totalBrews: 0, badBrews: 0,
    shelf: [], brewmasterRank: 0, modifiedAt: Date.now(),
  };
}

function load(): PotionSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch { return defaultSave(); }
}

function save(s: PotionSave) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function usePotionSave() {
  const [state, setState] = useState<PotionSave>(load);
  // Persist whenever it changes.
  useEffect(() => { save(state); }, [state]);
  return { state, setState };
}

/** Rank thresholds — discoveries needed to climb to next rank. */
export const RANK_THRESHOLDS = [0, 3, 7, 12, 18, 24];
export const RANK_TITLES = [
  "Apprentice",
  "Junior Brewmaster",
  "Adept",
  "Master Alchemist",
  "Grand Brewmaster",
  "Legendary",
];

export function rankFor(discovered: number): number {
  let r = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (discovered >= RANK_THRESHOLDS[i]) r = i;
  }
  return r;
}
