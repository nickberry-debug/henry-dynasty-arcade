/* eslint-disable @typescript-eslint/no-explicit-any */
// Per-kid Player Profiles — foundation.
//
// Profiles are stored in a simple localStorage list (kid-friendly,
// passwordless, instant access). The currently-active profile id is held
// in a Zustand-style listener so the rest of the arcade can react to a
// switch without prop drilling.
//
// Per-profile save isolation is opt-in for existing games via the
// `profileKey()` helper — games that adopt it get isolated saves
// automatically. Games not yet adopted continue using their legacy global
// keys (no regression). This is the foundation; full migration of every
// game's stores is a follow-up pass.

import { useEffect, useState } from "react";
// Lazy import to avoid a circular dependency: cloudBlob doesn't need
// profiles, but profiles uses cloudBlob for write-through sync of the
// "shared" entries (profile list, family stats).
import { setBlob as cloudSet, pullBlob as cloudPull, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

export type ProfileId = string;
// "Shared" pseudo-profile id used for arcade-wide cloud documents (the
// roster of profiles, family stats overview). Per-game saves continue
// to write under each profile's own id.
const SHARED = "__family__";

export interface Profile {
  id: ProfileId;
  name: string;          // real name / display
  handle: string;        // in-game screen name
  tagline: string;
  color: string;         // hex accent
  avatar: string;        // /assets path OR "mini:character-male-a" key
  title: string;         // earned rank/badge text — defaults "Rookie"
  /** Optional age (as a string for backwards-compat with old saves).
   *  Editable in ProfileEdit. Games read via `getActiveProfileAge()`
   *  to scale difficulty — Math Blaster + Quiz Show use it. */
  age?: string;
  favoriteGame?: string;
  createdAt: number;
  modifiedAt: number;
}

const STORE_KEY = "arcade_profiles_v1";
const ACTIVE_KEY = "arcade_active_profile_v1";

// Five family default profiles — seeded on first run. Avatars use the
// Kenney CC0 Mini characters already in the asset pipeline so this works
// without any extra downloads.
export const DEFAULT_PROFILES: Profile[] = [
  { id: "henry",   name: "Henry",   handle: "HenryTheHero",     tagline: "Future Champion",         color: "#3D9BFF", avatar: "/assets/kenney/mini/character-male-a.png",   title: "Rookie",  createdAt: 0, modifiedAt: 0 },
  { id: "beckett", name: "Beckett", handle: "BeckettBlaze",     tagline: "Potion Master in Training", color: "#FB923C", avatar: "/assets/kenney/mini/character-male-c.png",   title: "Rookie",  createdAt: 0, modifiedAt: 0 },
  { id: "everly",  name: "Everly",  handle: "EverlySparkle",    tagline: "Creature Whisperer",       color: "#F472B6", avatar: "/assets/kenney/mini/character-female-b.png", title: "Rookie",  createdAt: 0, modifiedAt: 0 },
  { id: "mom",     name: "Mom",     handle: "TeamCaptain",      tagline: "Reigning Bracket Queen",   color: "#A78BFA", avatar: "/assets/kenney/mini/character-female-e.png", title: "Veteran", createdAt: 0, modifiedAt: 0 },
  { id: "dad",     name: "Dad",     handle: "CoachDad",         tagline: "Statistician Extraordinaire", color: "#FBBF24", avatar: "/assets/kenney/mini/character-male-f.png",   title: "Veteran", createdAt: 0, modifiedAt: 0 },
];

// ── Storage layer ──────────────────────────────────────────────────────────

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seeded = DEFAULT_PROFILES.map(p => ({ ...p, createdAt: Date.now(), modifiedAt: Date.now() }));
      localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PROFILES;
    return parsed.filter(isProfile);
  } catch {
    return DEFAULT_PROFILES;
  }
}

function isProfile(v: unknown): v is Profile {
  return !!v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string";
}

export function saveProfiles(list: Profile[]): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch {}
  // Mirror to cloud so other family devices see the same roster.
  try { cloudSet(SHARED, "profiles_v1", list); } catch {}
}

/** Pull latest profile list from cloud (other devices may have added a
 *  profile). Called once on boot from App.tsx. Returns the merged list. */
export async function pullProfilesFromCloud(): Promise<Profile[]> {
  const local = loadProfiles();
  try {
    const remote = await cloudPull<Profile[]>(SHARED, "profiles_v1", local);
    if (Array.isArray(remote) && remote.length) {
      // Merge: prefer the entry with the larger modifiedAt for each id.
      const byId = new Map<string, Profile>();
      for (const p of local) byId.set(p.id, p);
      for (const p of remote) {
        const existing = byId.get(p.id);
        if (!existing || (p.modifiedAt ?? 0) > (existing.modifiedAt ?? 0)) byId.set(p.id, p);
      }
      const merged = [...byId.values()];
      try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    }
    return local;
  } catch { return local; }
}

export function getActiveProfileId(): ProfileId | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

/** Real name of the active profile, or the given fallback. Used by every
 *  game that addresses the player directly ("Welcome back, Beckett") so
 *  the copy adapts to whoever is currently playing instead of being
 *  hardcoded to one kid. Safe to call from non-React code. */
export function getActivePlayerName(fallback = "friend"): string {
  const id = getActiveProfileId();
  if (!id) return fallback;
  try {
    const list = loadProfiles();
    const me = list.find(p => p.id === id);
    return me?.name || fallback;
  } catch { return fallback; }
}

/** Read the active profile's age as a number (null if unset or not a
 *  valid number). Games use this to scale difficulty — Math Blaster
 *  tiers off it, Quiz Show could too, anything kid-aware can branch
 *  on it. Safe to call from non-React code. */
export function getActiveProfileAge(): number | null {
  const id = getActiveProfileId();
  if (!id) return null;
  try {
    const list = loadProfiles();
    const me = list.find(p => p.id === id);
    if (!me?.age) return null;
    const n = parseInt(String(me.age), 10);
    return Number.isFinite(n) && n > 0 && n < 130 ? n : null;
  } catch { return null; }
}

/** Same as above but returns the in-game handle (HenryTheHero) rather
 *  than the real name. Use for chat/leaderboard contexts. */
export function getActivePlayerHandle(fallback = "Player"): string {
  const id = getActiveProfileId();
  if (!id) return fallback;
  try {
    const list = loadProfiles();
    const me = list.find(p => p.id === id);
    return me?.handle || me?.name || fallback;
  } catch { return fallback; }
}

export function setActiveProfileId(id: ProfileId | null): void {
  try {
    if (id === null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, id);
    window.dispatchEvent(new CustomEvent("arcade-active-profile-changed", { detail: id }));
  } catch {}
}

// ── React hooks ────────────────────────────────────────────────────────────

/** Reactive snapshot of all profiles + the active id. */
export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
  const [activeId, setActiveId] = useState<ProfileId | null>(getActiveProfileId);

  useEffect(() => {
    const onChange = () => setActiveId(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("arcade-active-profile-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Live cloud subscribe — another family device editing a profile (adding
  // Beckett on the iPad, renaming Henry on Mom's phone) shows up here
  // without a refresh. Reuses the same "__family__" shared blob path that
  // saveProfiles writes to.
  useEffect(() => {
    return cloudSubscribe<Profile[]>(SHARED, "profiles_v1", remote => {
      if (!Array.isArray(remote) || !remote.length) return;
      const local = loadProfiles();
      // Last-writer-wins per id, on modifiedAt.
      const byId = new Map<string, Profile>();
      for (const p of local) byId.set(p.id, p);
      for (const p of remote) {
        const existing = byId.get(p.id);
        if (!existing || (p.modifiedAt ?? 0) > (existing.modifiedAt ?? 0)) byId.set(p.id, p);
      }
      const merged = [...byId.values()];
      try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch {}
      setProfiles(merged);
    });
  }, []);

  function persist(next: Profile[]) {
    setProfiles(next);
    saveProfiles(next);
  }

  function selectProfile(id: ProfileId | null) {
    setActiveProfileId(id);
    setActiveId(id);
  }

  function upsertProfile(p: Profile) {
    const next = profiles.some(x => x.id === p.id)
      ? profiles.map(x => x.id === p.id ? { ...p, modifiedAt: Date.now() } : x)
      : [...profiles, { ...p, createdAt: Date.now(), modifiedAt: Date.now() }];
    persist(next);
  }

  function deleteProfile(id: ProfileId) {
    const next = profiles.filter(p => p.id !== id);
    persist(next);
    if (activeId === id) selectProfile(null);
  }

  const active = profiles.find(p => p.id === activeId) ?? null;
  return { profiles, active, activeId, selectProfile, upsertProfile, deleteProfile };
}

/** Lightweight hook — just the active profile (or null), reactive. */
export function useActiveProfile(): Profile | null {
  const { active } = useProfiles();
  return active;
}

// ── Profile-scoped storage helper ───────────────────────────────────────────

/** Returns a localStorage key prefixed by the active profile id so each
 *  family member gets isolated saves. Games adopt this incrementally:
 *
 *    localStorage.setItem(profileKey("dd_mygame_save"), JSON.stringify(state));
 *
 *  When no profile is active (legacy), falls back to the original key so
 *  nothing breaks for users who never see the picker. */
export function profileKey(key: string): string {
  const id = getActiveProfileId();
  return id ? `prof_${id}::${key}` : key;
}

// ── Cross-game stats (per profile) ──────────────────────────────────────────

export interface GameStat {
  /** total seconds of play recorded against this game */
  seconds: number;
  /** session count */
  sessions: number;
  /** wins where the game tracks W/L */
  wins: number;
  /** losses where the game tracks W/L */
  losses: number;
  /** an arbitrary "rank/level" int the game can advance */
  level: number;
  /** discoveries count — games that have a discovery layer (Potion
   *  Lab hidden recipes, future Creature Pokedex) report here so the
   *  Family Stats page can champion "Most Discoveries". Optional so
   *  games that don't use the concept can skip it. */
  discoveries?: number;
  /** last played timestamp */
  lastPlayed: number;
}

const STATS_KEY_PREFIX = "arcade_stats_v1::";

function statsKeyFor(profileId: ProfileId): string {
  return `${STATS_KEY_PREFIX}${profileId}`;
}

export type CrossGameStats = Record<string, GameStat>;

export function loadStats(profileId: ProfileId): CrossGameStats {
  try {
    const raw = localStorage.getItem(statsKeyFor(profileId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function recordGameSession(profileId: ProfileId, gameId: string, patch: Partial<GameStat>): void {
  const all = loadStats(profileId);
  const prev = all[gameId] ?? { seconds: 0, sessions: 0, wins: 0, losses: 0, level: 0, lastPlayed: 0 };
  const next: GameStat = {
    seconds: prev.seconds + (patch.seconds ?? 0),
    sessions: prev.sessions + (patch.sessions ?? 0),
    wins: prev.wins + (patch.wins ?? 0),
    losses: prev.losses + (patch.losses ?? 0),
    level: patch.level !== undefined ? patch.level : prev.level,
    discoveries: patch.discoveries !== undefined ? patch.discoveries : prev.discoveries,
    lastPlayed: Date.now(),
  };
  all[gameId] = next;
  try { localStorage.setItem(statsKeyFor(profileId), JSON.stringify(all)); } catch {}
  // Cloud write-through — stats roll into the Family page across devices.
  try { cloudSet(profileId, "stats_v1", all); } catch {}
}
