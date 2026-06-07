// Monster Forge - Phase 4 W/L records, XP, level.
//
// Persists per-monster across sessions in localStorage:
//   henry-monster-forge-records-v1 = { [monsterId]: { wins, losses, totalXp, level } }
//
// XP: winning a battle grants +10 XP. Every 100 XP = level up (+1 to each stat).
// Levels are applied to a SavedMonster's `stats` block when battles end.

import { profileKey } from "../../profiles/store";
import type { SavedMonster } from "../partsManifest";
import { loadSaved, saveAll } from "../engine";

const RECORDS_KEY = "henry-monster-forge-records-v1";
const XP_PER_WIN = 10;
const XP_PER_LEVEL = 100;

export interface MonsterRecord {
  wins: number;
  losses: number;
  totalXp: number;
  level: number;
}

export type RecordsMap = Record<string, MonsterRecord>;

export function loadRecords(): RecordsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(profileKey(RECORDS_KEY));
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj as RecordsMap;
  } catch { return {}; }
}

export function saveRecords(rs: RecordsMap): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(profileKey(RECORDS_KEY), JSON.stringify(rs)); }
  catch { /* quota or private mode */ }
}

export function getRecord(id: string): MonsterRecord {
  const all = loadRecords();
  return all[id] ?? { wins: 0, losses: 0, totalXp: 0, level: 1 };
}

/** Record the outcome of a battle and apply level-up stat bumps if any. */
export function recordOutcome(monsterId: string, kind: "win" | "loss"): MonsterRecord {
  const all = loadRecords();
  const cur = all[monsterId] ?? { wins: 0, losses: 0, totalXp: 0, level: 1 };
  if (kind === "win") {
    cur.wins += 1;
    const prevLevel = Math.floor(cur.totalXp / XP_PER_LEVEL);
    cur.totalXp += XP_PER_WIN;
    const newLevel = Math.floor(cur.totalXp / XP_PER_LEVEL);
    cur.level = 1 + newLevel;
    if (newLevel > prevLevel) {
      // Bump the monster's saved stats: +1 each per level gained
      const gained = newLevel - prevLevel;
      const list = loadSaved();
      const m = list.find((x: SavedMonster) => x.id === monsterId);
      if (m) {
        m.stats.hp  = Math.min(30, m.stats.hp  + gained);
        m.stats.atk = Math.min(30, m.stats.atk + gained);
        m.stats.def = Math.min(30, m.stats.def + gained);
        m.stats.spd = Math.min(30, m.stats.spd + gained);
        m.stats.mag = Math.min(30, m.stats.mag + gained);
        m.updatedAt = Date.now();
        saveAll(list);
      }
    }
  } else {
    cur.losses += 1;
  }
  all[monsterId] = cur;
  saveRecords(all);
  return cur;
}

/** XP needed to reach next level (out of XP_PER_LEVEL). */
export function xpProgress(rec: MonsterRecord): { current: number; needed: number; pct: number } {
  const current = rec.totalXp % XP_PER_LEVEL;
  return { current, needed: XP_PER_LEVEL, pct: current / XP_PER_LEVEL };
}
