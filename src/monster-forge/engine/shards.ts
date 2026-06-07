// Monster Forge - Phase 5 Crystal Shards currency + body unlocks.
//
// Earned: 5 per battle win, 1 per battle loss.
// Spent: unlock rare/epic/legendary bodies (uncommon bodies are free).
//
// Persistence: henry-monster-forge-unlocks-v1 (per-profile)

import { profileKey } from "../../profiles/store";
import type { Rarity } from "../partsManifest";

const KEY = "henry-monster-forge-unlocks-v1";

export interface UnlocksState {
  shards: number;
  unlocked: string[]; // body ids the user has unlocked
}

export const UNLOCK_COST: Record<Rarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 20,
  legendary: 150,
};
// Epic isn't in the existing Rarity union; if added later, we treat it as 50.
export const EPIC_COST = 50;

export function loadUnlocks(): UnlocksState {
  if (typeof window === "undefined") return { shards: 0, unlocked: [] };
  try {
    const raw = window.localStorage.getItem(profileKey(KEY));
    if (!raw) return { shards: 0, unlocked: [] };
    const obj = JSON.parse(raw);
    return {
      shards: typeof obj?.shards === "number" ? obj.shards : 0,
      unlocked: Array.isArray(obj?.unlocked) ? obj.unlocked.filter((s: unknown): s is string => typeof s === "string") : [],
    };
  } catch { return { shards: 0, unlocked: [] }; }
}

export function saveUnlocks(s: UnlocksState): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(profileKey(KEY), JSON.stringify(s)); }
  catch { /* */ }
}

export function addShards(n: number): UnlocksState {
  const s = loadUnlocks();
  s.shards = Math.max(0, s.shards + n);
  saveUnlocks(s);
  return s;
}

export function isUnlocked(bodyId: string, rarity: Rarity | undefined): boolean {
  if (!rarity) return true;
  if (UNLOCK_COST[rarity] === 0) return true;
  const s = loadUnlocks();
  return s.unlocked.includes(bodyId);
}

export function unlockBody(bodyId: string, cost: number): { ok: boolean; state: UnlocksState; reason?: string } {
  const s = loadUnlocks();
  if (s.unlocked.includes(bodyId)) return { ok: true, state: s };
  if (s.shards < cost) return { ok: false, state: s, reason: "Not enough shards." };
  s.shards -= cost;
  s.unlocked.push(bodyId);
  saveUnlocks(s);
  return { ok: true, state: s };
}

export function costFor(rarity: Rarity | undefined): number {
  if (!rarity) return 0;
  return UNLOCK_COST[rarity] ?? 0;
}
