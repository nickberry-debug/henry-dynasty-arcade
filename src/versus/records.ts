// src/versus/records.ts
//
// Per-profile combat-sports records — localStorage scoped by profile + sport.
// Phase 3 spec (Combat Sports): we track wins/losses, plus per-sport
// signature counts (boxing → KOs, wrestling → finishers). Keyed
// `${profileId}-${sport}`. Stored as one blob under `henry-versus-records-v1`
// so a single read pulls the whole family's combat-sports record book.
//
// This sits alongside the broader `useVersusStats()` cloud blob (which
// tracks h2h + per-sport win counts across baseball/football/boxing/wrestling)
// — the records here are the *combat-sports-specific* extras the polish
// pass needed: KO and finisher tallies, plus the backdrop-unlock counter.

import type { Sport } from "./types";

export interface CombatRecord {
  wins: number;
  losses: number;
  /** Boxing-specific: KOs scored. Tracked even for non-boxing keys but stays 0. */
  ko_count: number;
  /** Wrestling-specific: finishers landed. */
  finishers: number;
}

const STORAGE_KEY = "henry-versus-records-v1";

type RecordsBlob = Record<string, CombatRecord>;

function emptyRecord(): CombatRecord {
  return { wins: 0, losses: 0, ko_count: 0, finishers: 0 };
}

function keyFor(profileId: string, sport: Sport): string {
  return `${profileId}-${sport}`;
}

function readBlob(): RecordsBlob {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed as RecordsBlob : {};
  } catch {
    return {};
  }
}

function writeBlob(blob: RecordsBlob): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    /* quota / privacy mode — silently ignore so a match end never crashes */
  }
}

/** Read a single profile-sport record. Always returns a populated object. */
export function getRecord(profileId: string, sport: Sport): CombatRecord {
  const blob = readBlob();
  return { ...emptyRecord(), ...(blob[keyFor(profileId, sport)] ?? {}) };
}

/** Record one match outcome for a profile in a given sport. */
export interface MatchOutcome {
  won: boolean;
  /** Did this match end on a KO? (boxing) */
  byKO?: boolean;
  /** Did this match end on a finisher? (wrestling) */
  byFinisher?: boolean;
}
export function recordMatch(profileId: string, sport: Sport, outcome: MatchOutcome): CombatRecord {
  const blob = readBlob();
  const cur: CombatRecord = { ...emptyRecord(), ...(blob[keyFor(profileId, sport)] ?? {}) };
  if (outcome.won) cur.wins += 1; else cur.losses += 1;
  if (outcome.won && outcome.byKO)       cur.ko_count   += 1;
  if (outcome.won && outcome.byFinisher) cur.finishers += 1;
  blob[keyFor(profileId, sport)] = cur;
  writeBlob(blob);
  return cur;
}

/** Whole-family records snapshot — pass-through of the blob for the leaderboard. */
export function getAllRecords(): RecordsBlob {
  return readBlob();
}

/** For tests / dev tools. */
export function clearRecords(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
