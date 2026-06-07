// Monster Forge - Phase 5 achievements.
//
// Pop banners for milestones. Persisted in
//   henry-monster-forge-achievements-v1 (per profile)

import { profileKey } from "../../profiles/store";

const KEY = "henry-monster-forge-achievements-v1";

export interface AchievementDef {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_build",       label: "First Build",        emoji: "🛠️", desc: "Save your first monster." },
  { id: "mad_scientist",     label: "Mad Scientist",      emoji: "🧪", desc: "Save 5 different monsters." },
  { id: "potion_master",     label: "Potion Master",      emoji: "🧙", desc: "Discover 10 unique recipes." },
  { id: "first_battle",      label: "First Battle",       emoji: "⚔️", desc: "Win your first battle." },
  { id: "champion",          label: "Champion",           emoji: "🏆", desc: "Win 10 battles." },
  { id: "legendary_unlock",  label: "Legendary Collector",emoji: "🐉", desc: "Unlock 1 legendary body." },
  { id: "evolutionary",      label: "Evolutionary",       emoji: "✨", desc: "Evolve 1 monster." },
  { id: "photographer",      label: "Photographer",       emoji: "📸", desc: "Save 10 photos." },
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export function loadUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(profileKey(KEY));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s: unknown): s is string => typeof s === "string") : [];
  } catch { return []; }
}

export function saveUnlocked(arr: string[]): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(profileKey(KEY), JSON.stringify(arr)); }
  catch { /* */ }
}

const pendingBanners: { id: string; t: number }[] = [];
const listeners = new Set<(b: AchievementDef) => void>();

/** Subscribe to achievement unlock events for banner display. */
export function onAchievement(cb: (a: AchievementDef) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Unlock an achievement by id. Idempotent — second call is a no-op. */
export function unlockAchievement(id: string): boolean {
  const cur = loadUnlocked();
  if (cur.includes(id)) return false;
  const def = ACHIEVEMENTS_BY_ID[id];
  if (!def) return false;
  cur.push(id);
  saveUnlocked(cur);
  pendingBanners.push({ id, t: Date.now() });
  listeners.forEach(l => { try { l(def); } catch { /* */ } });
  return true;
}

export function isUnlocked(id: string): boolean {
  return loadUnlocked().includes(id);
}

/** Pull any banners queued before listeners attached. */
export function drainPending(): AchievementDef[] {
  const out: AchievementDef[] = [];
  while (pendingBanners.length) {
    const b = pendingBanners.shift()!;
    const def = ACHIEVEMENTS_BY_ID[b.id];
    if (def) out.push(def);
  }
  return out;
}
