import Dexie, { Table } from "dexie";
import type { League } from "../store/types";
import type { Scorecard } from "../scorekeeper/types";
import type { FootballLeague } from "../football/types";
import type { Hero, Adventure } from "../olympus/types";
import type { Studio as MogulStudio } from "../mogul/types";
import { getActiveProfileId, profileKey } from "../profiles/store";
// Lazy-loaded sync helpers — imported once but called fire-and-forget so
// network failures never block local operations. The helper internally
// short-circuits when Firebase isn't configured (so this stays safe in
// dev with no env, in tests, and offline).
import { pushRecord, deleteRecord, backgroundPull } from "../sync/savedRecords";

/** Default profile for backfilling pre-profile saves on first DB upgrade.
 *  Henry is the original user (original "Henry's Dynasty" branding) so
 *  legacy data goes to his profile by default. Other family members start
 *  fresh; they can see Henry's via the multiplayer Roster Browser later. */
const LEGACY_PROFILE_ID = "henry";

/** Active profile getter w/ legacy fallback. Used in every list filter so
 *  that pre-profile records (no profileId set) still resolve to a sensible
 *  default if profile-picker hasn't been visited yet. */
function pid(): string {
  return getActiveProfileId() ?? LEGACY_PROFILE_ID;
}

export interface SavedLeague {
  id: string;
  /** Owning profile id. Filtered on every list/load. */
  profileId?: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  year: number;
  data: League;
}

export interface SavedFootballLeague {
  id: string;
  profileId?: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  season: number;
  data: FootballLeague;
}

export interface SavedMogulStudio {
  id: string;
  profileId?: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  year: number;
  data: MogulStudio;
}

class DynastyDB extends Dexie {
  leagues!: Table<SavedLeague, string>;
  meta!: Table<{ key: string; value: any }, string>;
  scorecards!: Table<Scorecard, string>;
  footballLeagues!: Table<SavedFootballLeague, string>;
  olympusHeroes!: Table<Hero & { profileId?: string }, string>;
  olympusAdventures!: Table<Adventure & { profileId?: string }, string>;
  mogulStudios!: Table<SavedMogulStudio, string>;

  constructor() {
    super("HenryDiamondDynasty");
    this.version(1).stores({
      leagues: "id, name, modifiedAt",
      meta: "key"
    });
    this.version(2).stores({
      leagues: "id, name, modifiedAt",
      meta: "key",
      scorecards: "id, mode, modifiedAt, completed"
    });
    this.version(3).stores({
      leagues: "id, name, modifiedAt",
      meta: "key",
      scorecards: "id, mode, modifiedAt, completed",
      footballLeagues: "id, name, modifiedAt"
    });
    this.version(4).stores({
      leagues: "id, name, modifiedAt",
      meta: "key",
      scorecards: "id, mode, modifiedAt, completed",
      footballLeagues: "id, name, modifiedAt",
      olympusHeroes: "id, name, modifiedAt, archived",
      olympusAdventures: "id, heroId, startedAt, status"
    });
    this.version(5).stores({
      leagues: "id, name, modifiedAt",
      meta: "key",
      scorecards: "id, mode, modifiedAt, completed",
      footballLeagues: "id, name, modifiedAt",
      olympusHeroes: "id, name, modifiedAt, archived",
      olympusAdventures: "id, heroId, startedAt, status",
      mogulStudios: "id, name, modifiedAt"
    });
    // v6 — profileId on every save record. Backfills existing rows to
    // "henry" (legacy default) so all pre-profile saves go to his profile.
    this.version(6).stores({
      leagues: "id, profileId, name, modifiedAt",
      meta: "key",
      scorecards: "id, mode, modifiedAt, completed",
      footballLeagues: "id, profileId, name, modifiedAt",
      olympusHeroes: "id, profileId, name, modifiedAt, archived",
      olympusAdventures: "id, profileId, heroId, startedAt, status",
      mogulStudios: "id, profileId, name, modifiedAt"
    }).upgrade(async tx => {
      const stamp = (t: Table<{ profileId?: string }, string>) => t.toCollection().modify(r => {
        if (!r.profileId) r.profileId = LEGACY_PROFILE_ID;
      });
      await Promise.all([
        stamp(tx.table("leagues")),
        stamp(tx.table("footballLeagues")),
        stamp(tx.table("olympusHeroes")),
        stamp(tx.table("olympusAdventures")),
        stamp(tx.table("mogulStudios")),
      ]);
    });
  }
}

export const db = new DynastyDB();

// One-time migration of localStorage active-pointer keys on first run with
// profiles. Pre-profile saves all belonged to "Henry" by default, so move
// any global `dd_active_*` to Henry's profile-scoped key.
(function migrateActivePointers() {
  if (typeof localStorage === "undefined") return;
  const FLAG = "dd_profile_pointer_migration_v1";
  if (localStorage.getItem(FLAG)) return;
  for (const key of ["dd_active_league", "dd_active_football", "dd_active_mogul", "dd_olympus_last_hero"]) {
    const v = localStorage.getItem(key);
    if (v) {
      const newKey = `prof_${LEGACY_PROFILE_ID}::${key}`;
      if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, v);
    }
  }
  localStorage.setItem(FLAG, "1");
})();

export async function saveLeague(league: League) {
  league.modifiedAt = Date.now();
  const rec: SavedLeague = {
    id: league.id,
    profileId: pid(),
    name: league.name,
    createdAt: league.createdAt,
    modifiedAt: league.modifiedAt,
    year: league.year,
    data: league,
  };
  await db.leagues.put(rec);
  localStorage.setItem(profileKey("dd_active_league"), league.id);
  pushRecord("leagues", pid(), rec);
}

export async function loadLeague(id?: string): Promise<League | null> {
  const targetId = id || localStorage.getItem(profileKey("dd_active_league")) || undefined;
  const ownerId = pid();
  backgroundPull("leagues", ownerId, db.leagues);
  if (!targetId) {
    const all = await db.leagues.where("profileId").equals(ownerId).toArray();
    if (!all.length) return null;
    const newest = all.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    localStorage.setItem(profileKey("dd_active_league"), newest.id);
    return newest.data;
  }
  const rec = await db.leagues.get(targetId);
  if (!rec) return null;
  // Guard: refuse to return another profile's save through a stale pointer.
  if (rec.profileId && rec.profileId !== ownerId) return null;
  return rec.data;
}

export async function listLeagues(): Promise<SavedLeague[]> {
  // Background pull from cloud — caller will re-render once new records
  // land. First call after launch typically catches up; future calls are
  // effectively cached.
  backgroundPull("leagues", pid(), db.leagues);
  const all = await db.leagues.where("profileId").equals(pid()).toArray();
  return all.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

export async function deleteLeague(id: string) {
  await db.leagues.delete(id);
  if (localStorage.getItem(profileKey("dd_active_league")) === id) {
    localStorage.removeItem(profileKey("dd_active_league"));
  }
  deleteRecord("leagues", pid(), id);
}

export async function clearAll() {
  // Only clears the active profile's leagues, not everyone's.
  const mine = await db.leagues.where("profileId").equals(pid()).primaryKeys();
  await db.leagues.bulkDelete(mine);
  localStorage.removeItem(profileKey("dd_active_league"));
}

/** Score Keeper card persistence. */
export async function saveScorecard(card: Scorecard) {
  card.modifiedAt = Date.now();
  await db.scorecards.put(card);
}
export async function loadScorecard(id: string): Promise<Scorecard | null> {
  const c = await db.scorecards.get(id);
  return c ?? null;
}
export async function listScorecards(): Promise<Scorecard[]> {
  return db.scorecards.orderBy("modifiedAt").reverse().toArray();
}
export async function deleteScorecard(id: string) {
  await db.scorecards.delete(id);
}

/** Duplicates an existing saved league to a new id (snapshot). */
export async function duplicateLeague(srcId: string, newName: string): Promise<string | null> {
  const rec = await db.leagues.get(srcId);
  if (!rec) return null;
  const cloneId = "lg" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const cloned: League = structuredClone(rec.data);
  cloned.id = cloneId;
  cloned.name = newName;
  cloned.createdAt = Date.now();
  cloned.modifiedAt = Date.now();
  const newRec: SavedLeague = {
    id: cloneId,
    profileId: pid(),
    name: newName,
    createdAt: cloned.createdAt,
    modifiedAt: cloned.modifiedAt,
    year: cloned.year,
    data: cloned,
  };
  await db.leagues.put(newRec);
  pushRecord("leagues", pid(), newRec);
  return cloneId;
}

/** Renames a saved league slot. */
export async function renameLeague(id: string, name: string): Promise<boolean> {
  const rec = await db.leagues.get(id);
  if (!rec) return false;
  rec.name = name;
  rec.data.name = name;
  rec.modifiedAt = Date.now();
  rec.data.modifiedAt = rec.modifiedAt;
  if (!rec.profileId) rec.profileId = pid();
  await db.leagues.put(rec);
  pushRecord("leagues", rec.profileId ?? pid(), rec);
  return true;
}

/** Sets which league is "active" — next loadFromDb() will return it. */
export function setActiveLeague(id: string) {
  localStorage.setItem(profileKey("dd_active_league"), id);
}

// ─── Football leagues ─────────────────────────────────────────────────────
export async function saveFootballLeague(lg: FootballLeague) {
  lg.modifiedAt = Date.now();
  const rec: SavedFootballLeague = {
    id: lg.id, profileId: pid(), name: lg.name,
    createdAt: lg.createdAt, modifiedAt: lg.modifiedAt, season: lg.season, data: lg,
  };
  await db.footballLeagues.put(rec);
  localStorage.setItem(profileKey("dd_active_football"), lg.id);
  pushRecord("footballLeagues", pid(), rec);
}
export async function loadFootballLeague(id?: string): Promise<FootballLeague | null> {
  const targetId = id || localStorage.getItem(profileKey("dd_active_football")) || undefined;
  const owner = pid();
  backgroundPull("footballLeagues", owner, db.footballLeagues);
  if (!targetId) {
    const all = await db.footballLeagues.where("profileId").equals(owner).toArray();
    if (!all.length) return null;
    const newest = all.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    localStorage.setItem(profileKey("dd_active_football"), newest.id);
    return newest.data;
  }
  const rec = await db.footballLeagues.get(targetId);
  if (!rec) return null;
  if (rec.profileId && rec.profileId !== owner) return null;
  return rec.data;
}
export async function listFootballLeagues(): Promise<SavedFootballLeague[]> {
  backgroundPull("footballLeagues", pid(), db.footballLeagues);
  const all = await db.footballLeagues.where("profileId").equals(pid()).toArray();
  return all.sort((a, b) => b.modifiedAt - a.modifiedAt);
}
export async function deleteFootballLeague(id: string) {
  await db.footballLeagues.delete(id);
  if (localStorage.getItem(profileKey("dd_active_football")) === id) {
    localStorage.removeItem(profileKey("dd_active_football"));
  }
  deleteRecord("footballLeagues", pid(), id);
}

// ─── Mogul studios ───────────────────────────────────────────────────────
export async function saveMogulStudio(studio: MogulStudio) {
  studio.modifiedAt = Date.now();
  const rec: SavedMogulStudio = {
    id: studio.id,
    profileId: pid(),
    name: studio.player.name,
    createdAt: studio.createdAt,
    modifiedAt: studio.modifiedAt,
    year: studio.year,
    data: studio,
  };
  await db.mogulStudios.put(rec);
  localStorage.setItem(profileKey("dd_active_mogul"), studio.id);
  pushRecord("mogulStudios", pid(), rec);
}
export async function loadMogulStudio(id?: string): Promise<MogulStudio | null> {
  const targetId = id || localStorage.getItem(profileKey("dd_active_mogul")) || undefined;
  const owner = pid();
  backgroundPull("mogulStudios", owner, db.mogulStudios);
  if (!targetId) {
    const all = await db.mogulStudios.where("profileId").equals(owner).toArray();
    if (!all.length) return null;
    const newest = all.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    localStorage.setItem(profileKey("dd_active_mogul"), newest.id);
    return newest.data;
  }
  const rec = await db.mogulStudios.get(targetId);
  if (!rec) return null;
  if (rec.profileId && rec.profileId !== owner) return null;
  return rec.data;
}
export async function listMogulStudios(): Promise<SavedMogulStudio[]> {
  backgroundPull("mogulStudios", pid(), db.mogulStudios);
  const all = await db.mogulStudios.where("profileId").equals(pid()).toArray();
  return all.sort((a, b) => b.modifiedAt - a.modifiedAt);
}
export async function deleteMogulStudio(id: string) {
  await db.mogulStudios.delete(id);
  if (localStorage.getItem(profileKey("dd_active_mogul")) === id) {
    localStorage.removeItem(profileKey("dd_active_mogul"));
  }
  deleteRecord("mogulStudios", pid(), id);
}

// ─── Olympus heroes + adventures ─────────────────────────────────────────
export async function saveOlympusHero(hero: Hero) {
  hero.modifiedAt = Date.now();
  await db.olympusHeroes.put({ ...hero, profileId: pid() });
  try { localStorage.setItem(profileKey("dd_olympus_last_hero"), hero.id); } catch {}
}
export async function loadOlympusHero(id: string): Promise<Hero | null> {
  const rec = await db.olympusHeroes.get(id);
  if (!rec) return null;
  if (rec.profileId && rec.profileId !== pid()) return null;
  return rec;
}
export async function listOlympusHeroes(includeArchived = false): Promise<Hero[]> {
  const all = await db.olympusHeroes.where("profileId").equals(pid()).toArray();
  const sorted = all.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return includeArchived ? sorted : sorted.filter(h => !h.archived);
}
export async function deleteOlympusHero(id: string) {
  await db.olympusHeroes.delete(id);
}
export async function saveOlympusAdventure(adv: Adventure) {
  await db.olympusAdventures.put({ ...adv, profileId: pid() });
}
export async function loadOlympusAdventure(id: string): Promise<Adventure | null> {
  const rec = await db.olympusAdventures.get(id);
  if (!rec) return null;
  if (rec.profileId && rec.profileId !== pid()) return null;
  return rec;
}
export async function listAdventuresForHero(heroId: string): Promise<Adventure[]> {
  // Heroes are already profile-scoped, so adventures for a given heroId
  // belong to whichever profile owns that hero. No extra filter needed.
  return db.olympusAdventures.where("heroId").equals(heroId).reverse().sortBy("startedAt");
}

/** Auto-snapshot current league with a year-marker name. Returns new save id. */
export async function snapshotLeague(lg: League, label?: string): Promise<string> {
  const snapId = "lg" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const cloned: League = structuredClone(lg);
  cloned.id = snapId;
  cloned.name = label ?? `${lg.name} — ${lg.year} snapshot`;
  cloned.createdAt = Date.now();
  cloned.modifiedAt = Date.now();
  const rec: SavedLeague = {
    id: snapId,
    profileId: pid(),
    name: cloned.name,
    createdAt: cloned.createdAt,
    modifiedAt: cloned.modifiedAt,
    year: cloned.year,
    data: cloned,
  };
  await db.leagues.put(rec);
  pushRecord("leagues", pid(), rec);
  return snapId;
}
