// Per-profile save/load via localStorage.

import { profileKey } from "../../profiles/store";
import type { SavePayload } from "../types";
import { makeStartingHero, makeStartingInventory } from "../data/heroes";

const STORE_KEY = "aethersong_save_v1";

function key(): string { return profileKey(STORE_KEY); }

export function loadSave(): SavePayload | null {
  try {
    const raw = localStorage.getItem(key());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavePayload;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch { return null; }
}

export function writeSave(s: SavePayload): void {
  try { localStorage.setItem(key(), JSON.stringify(s)); }
  catch { /* quota: ignore */ }
}

export function clearSave(): void {
  try { localStorage.removeItem(key()); } catch { /* ignore */ }
}

export function hasSave(): boolean {
  try { return !!localStorage.getItem(key()); } catch { return false; }
}

export function newGame(): SavePayload {
  return {
    version: 1,
    hero: makeStartingHero(),
    inventory: makeStartingInventory(),
    location: "town",
    pos: { x: 16, y: 13 },
    flags: { firstSave: false },
    gold: 25,
    savedAt: Date.now(),
    seed: Math.floor(Math.random() * 1e9),
  };
}
