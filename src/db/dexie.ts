import Dexie, { Table } from "dexie";
import type { League } from "../store/types";
import type { Scorecard } from "../scorekeeper/types";
import type { FootballLeague } from "../football/types";
import type { Hero, Adventure } from "../olympus/types";
import type { Studio as MogulStudio } from "../mogul/types";
import type { Hero as DungeonHero, DungeonRun } from "../dungeon/types";

export interface SavedLeague {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  year: number;
  data: League;
}

export interface SavedFootballLeague {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  season: number;
  data: FootballLeague;
}

export interface SavedMogulStudio {
  id: string;
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
  olympusHeroes!: Table<Hero, string>;
  olympusAdventures!: Table<Adventure, string>;
  mogulStudios!: Table<SavedMogulStudio, string>;
  dungeonHeroes!: Table<DungeonHero, string>;
  dungeonRuns!: Table<DungeonRun, string>;

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
    this.version(6).stores({
      leagues: "id, name, modifiedAt",
      meta: "key",
      scorecards: "id, mode, modifiedAt, completed",
      footballLeagues: "id, name, modifiedAt",
      olympusHeroes: "id, name, modifiedAt, archived",
      olympusAdventures: "id, heroId, startedAt, status",
      mogulStudios: "id, name, modifiedAt",
      dungeonHeroes: "id, name, modifiedAt, classId",
      dungeonRuns: "id, heroId, modifiedAt, status"
    });
  }
}

export const db = new DynastyDB();

export async function saveLeague(league: League) {
  league.modifiedAt = Date.now();
  await db.leagues.put({
    id: league.id,
    name: league.name,
    createdAt: league.createdAt,
    modifiedAt: league.modifiedAt,
    year: league.year,
    data: league
  });
  localStorage.setItem("dd_active_league", league.id);
}

export async function loadLeague(id?: string): Promise<League | null> {
  const targetId = id || localStorage.getItem("dd_active_league") || undefined;
  if (!targetId) {
    const all = await db.leagues.toArray();
    if (!all.length) return null;
    const newest = all.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    localStorage.setItem("dd_active_league", newest.id);
    return newest.data;
  }
  const rec = await db.leagues.get(targetId);
  return rec ? rec.data : null;
}

export async function listLeagues(): Promise<SavedLeague[]> {
  return db.leagues.orderBy("modifiedAt").reverse().toArray();
}

export async function deleteLeague(id: string) {
  await db.leagues.delete(id);
  if (localStorage.getItem("dd_active_league") === id) {
    localStorage.removeItem("dd_active_league");
  }
}

export async function clearAll() {
  await db.leagues.clear();
  localStorage.removeItem("dd_active_league");
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
  await db.leagues.put({
    id: cloneId,
    name: newName,
    createdAt: cloned.createdAt,
    modifiedAt: cloned.modifiedAt,
    year: cloned.year,
    data: cloned
  });
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
  await db.leagues.put(rec);
  return true;
}

/** Sets which league is "active" — next loadFromDb() will return it. */
export function setActiveLeague(id: string) {
  localStorage.setItem("dd_active_league", id);
}

// ─── Football leagues ─────────────────────────────────────────────────────
export async function saveFootballLeague(lg: FootballLeague) {
  lg.modifiedAt = Date.now();
  await db.footballLeagues.put({
    id: lg.id, name: lg.name, createdAt: lg.createdAt, modifiedAt: lg.modifiedAt, season: lg.season, data: lg,
  });
  localStorage.setItem("dd_active_football", lg.id);
}
export async function loadFootballLeague(id?: string): Promise<FootballLeague | null> {
  const targetId = id || localStorage.getItem("dd_active_football") || undefined;
  if (!targetId) {
    const all = await db.footballLeagues.toArray();
    if (!all.length) return null;
    const newest = all.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    localStorage.setItem("dd_active_football", newest.id);
    return newest.data;
  }
  const rec = await db.footballLeagues.get(targetId);
  return rec ? rec.data : null;
}
export async function listFootballLeagues(): Promise<SavedFootballLeague[]> {
  return db.footballLeagues.orderBy("modifiedAt").reverse().toArray();
}
export async function deleteFootballLeague(id: string) {
  await db.footballLeagues.delete(id);
  if (localStorage.getItem("dd_active_football") === id) localStorage.removeItem("dd_active_football");
}

// ─── Mogul studios ───────────────────────────────────────────────────────
export async function saveMogulStudio(studio: MogulStudio) {
  studio.modifiedAt = Date.now();
  await db.mogulStudios.put({
    id: studio.id,
    name: studio.player.name,
    createdAt: studio.createdAt,
    modifiedAt: studio.modifiedAt,
    year: studio.year,
    data: studio,
  });
  localStorage.setItem("dd_active_mogul", studio.id);
}
export async function loadMogulStudio(id?: string): Promise<MogulStudio | null> {
  const targetId = id || localStorage.getItem("dd_active_mogul") || undefined;
  if (!targetId) {
    const all = await db.mogulStudios.toArray();
    if (!all.length) return null;
    const newest = all.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    localStorage.setItem("dd_active_mogul", newest.id);
    return newest.data;
  }
  const rec = await db.mogulStudios.get(targetId);
  return rec ? rec.data : null;
}
export async function listMogulStudios(): Promise<SavedMogulStudio[]> {
  return db.mogulStudios.orderBy("modifiedAt").reverse().toArray();
}
export async function deleteMogulStudio(id: string) {
  await db.mogulStudios.delete(id);
  if (localStorage.getItem("dd_active_mogul") === id) localStorage.removeItem("dd_active_mogul");
}

// ─── Olympus heroes + adventures ─────────────────────────────────────────
export async function saveOlympusHero(hero: Hero) {
  hero.modifiedAt = Date.now();
  await db.olympusHeroes.put(hero);
  try { localStorage.setItem("dd_olympus_last_hero", hero.id); } catch {}
}
export async function loadOlympusHero(id: string): Promise<Hero | null> {
  return (await db.olympusHeroes.get(id)) ?? null;
}
export async function listOlympusHeroes(includeArchived = false): Promise<Hero[]> {
  const all = await db.olympusHeroes.orderBy("modifiedAt").reverse().toArray();
  return includeArchived ? all : all.filter(h => !h.archived);
}
export async function deleteOlympusHero(id: string) {
  await db.olympusHeroes.delete(id);
}
export async function saveOlympusAdventure(adv: Adventure) {
  await db.olympusAdventures.put(adv);
}
export async function loadOlympusAdventure(id: string): Promise<Adventure | null> {
  return (await db.olympusAdventures.get(id)) ?? null;
}
export async function listAdventuresForHero(heroId: string): Promise<Adventure[]> {
  return db.olympusAdventures.where("heroId").equals(heroId).reverse().sortBy("startedAt");
}

// ─── Dungeon crawler heroes + runs ───────────────────────────────────────
export async function saveDungeonHero(hero: DungeonHero) {
  hero.modifiedAt = Date.now();
  await db.dungeonHeroes.put(hero);
  try { localStorage.setItem("dd_dungeon_last_hero", hero.id); } catch {}
}
export async function loadDungeonHero(id: string): Promise<DungeonHero | null> {
  return (await db.dungeonHeroes.get(id)) ?? null;
}
export async function listDungeonHeroes(): Promise<DungeonHero[]> {
  return db.dungeonHeroes.orderBy("modifiedAt").reverse().toArray();
}
export async function deleteDungeonHero(id: string) {
  await db.dungeonHeroes.delete(id);
}
export async function saveDungeonRun(run: DungeonRun) {
  run.modifiedAt = Date.now();
  await db.dungeonRuns.put(run);
}
export async function loadDungeonRunForHero(heroId: string): Promise<DungeonRun | null> {
  const runs = await db.dungeonRuns.where("heroId").equals(heroId).toArray();
  const active = runs.filter(r => r.status === "active").sort((a, b) => b.modifiedAt - a.modifiedAt);
  return active[0] ?? null;
}
export async function deleteDungeonRun(id: string) {
  await db.dungeonRuns.delete(id);
}

/** Auto-snapshot current league with a year-marker name. Returns new save id. */
export async function snapshotLeague(lg: League, label?: string): Promise<string> {
  const snapId = "lg" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const cloned: League = structuredClone(lg);
  cloned.id = snapId;
  cloned.name = label ?? `${lg.name} — ${lg.year} snapshot`;
  cloned.createdAt = Date.now();
  cloned.modifiedAt = Date.now();
  await db.leagues.put({
    id: snapId,
    name: cloned.name,
    createdAt: cloned.createdAt,
    modifiedAt: cloned.modifiedAt,
    year: cloned.year,
    data: cloned
  });
  return snapId;
}
