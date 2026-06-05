// Potion Lab — save state. Tracks which recipes the player has
// discovered, which easter eggs they've triggered, total brews, and
// their bottled inventory. Persisted to localStorage.

import { useEffect, useState } from "react";
import { profileKey, getActiveProfileId } from "../profiles/store";
import { setBlob as cloudSet } from "../sync/cloudBlob";

const BASE_KEY = "dd_potionlab_save_v1";
const STORAGE_KEY = () => profileKey(BASE_KEY);

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
  discovered: string[];        // recipe ids the player has brewed (any kind)
  /** Known/required recipes specifically — for guide-progress UI. */
  knownDiscovered?: string[];
  /** Secret/Greek/HP recipes discovered via trial-and-error. Tracked
   *  separately from `discovered` so the Discoveries counter ("X / ??")
   *  can show a teasing total without revealing how many hidden recipes
   *  remain. */
  hiddenDiscoveries?: string[];
  easterEggsSeen: string[];    // recipe ids of easter-egg recipes triggered
  totalBrews: number;
  badBrews: number;            // brews that didn't match any recipe
  shelf: BottledPotion[];      // up to 24 saved bottles
  brewmasterRank: number;      // 0..5 — climbs with discoveries
  /** Per-recipe miss count — increments on a non-matching brew while
   *  that recipe is the active guide. Reset to 0 once the recipe is
   *  matched. Drives the progressive hint level (1/2/3+ reveal). */
  recipeMisses?: Record<string, number>;
  /** Recipe ids where the player has explicitly tapped REVEAL — even
   *  the answer was offered, they chose to see it. Tracked so the
   *  reveal UI persists across mounts. */
  recipesRevealed?: string[];
  modifiedAt: number;
}

function defaultSave(): PotionSave {
  return {
    discovered: [], knownDiscovered: [], hiddenDiscoveries: [],
    easterEggsSeen: [], totalBrews: 0, badBrews: 0,
    shelf: [], brewmasterRank: 0,
    recipeMisses: {}, recipesRevealed: [],
    modifiedAt: Date.now(),
  };
}

function load(): PotionSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY());
    if (!raw) return defaultSave();
    const merged: PotionSave = { ...defaultSave(), ...JSON.parse(raw) };
    // Field-backfill migration for the new tracking fields. Existing
    // saves keep all their progress; new fields default sensibly.
    if (!Array.isArray(merged.knownDiscovered)) merged.knownDiscovered = [];
    if (!Array.isArray(merged.hiddenDiscoveries)) merged.hiddenDiscoveries = [];
    if (!merged.recipeMisses || typeof merged.recipeMisses !== "object") merged.recipeMisses = {};
    if (!Array.isArray(merged.recipesRevealed)) merged.recipesRevealed = [];
    return merged;
  } catch { return defaultSave(); }
}

function save(s: PotionSave) {
  try { localStorage.setItem(STORAGE_KEY(), JSON.stringify(s)); } catch {}
  const pid = getActiveProfileId();
  if (pid) { try { cloudSet(pid, "potionlab_save_v1", s); } catch {} }
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
