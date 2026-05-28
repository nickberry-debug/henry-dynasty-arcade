// Football mode store — separate Zustand slice so it can't entangle with
// the baseball league. Persists to its own Dexie table.
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { FootballLeague } from "./types";
import { createFootballLeague } from "./generate";
import { saveFootballLeague, loadFootballLeague, listFootballLeagues, deleteFootballLeague } from "../db/dexie";

interface FootballState {
  league: FootballLeague | null;
  loading: boolean;
  hydrated: boolean;
  newLeague: (opts: { numTeams: 8 | 16 | 24 | 32; season: number }) => Promise<void>;
  loadFromDb: () => Promise<void>;
  save: () => Promise<void>;
  mutate: (fn: (lg: FootballLeague) => void) => Promise<void>;
  setUserTeam: (teamId: string) => Promise<void>;
  switchLeague: (id: string) => Promise<void>;
  renameCurrent: (name: string) => Promise<void>;
  duplicateCurrent: (newName: string) => Promise<void>;
  removeLeague: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}

let saveTimer: any = null;
function debouncedSave(lg: FootballLeague | null) {
  clearTimeout(saveTimer);
  if (!lg) return;
  saveTimer = setTimeout(() => { saveFootballLeague(lg); }, 250);
}

/** Yield control to the browser so React can paint the in-flight loading
 *  state BEFORE we kick off heavy synchronous work. Without this, the UI
 *  appears frozen between the button tap and the result. */
const yieldToBrowser = () => new Promise<void>(r => {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => setTimeout(r, 0));
  } else {
    setTimeout(r, 16);
  }
});

export const useFootball = create<FootballState>()(
  immer((set, get) => ({
    league: null,
    loading: false,
    hydrated: false,
    async newLeague(opts) {
      // Mark loading FIRST so the spinner/progress UI appears immediately.
      set(s => { s.loading = true; });
      // Critical: yield so React renders the loading state before we block
      // the main thread with team + roster + schedule generation. On a
      // 32-team league this is ~1700 players being created synchronously.
      await yieldToBrowser();
      const lg = createFootballLeague(opts);
      // Yield again before the (potentially slow) Dexie put — gives the UI
      // a chance to update the progress UI between "generating" and "saving".
      await yieldToBrowser();
      await saveFootballLeague(lg);
      set(s => { s.league = lg; s.loading = false; s.hydrated = true; });
    },
    async loadFromDb() {
      set(s => { s.loading = true; });
      const lg = await loadFootballLeague();
      set(s => { s.league = lg; s.loading = false; s.hydrated = true; });
    },
    async save() {
      const lg = get().league;
      if (lg) await saveFootballLeague(lg);
    },
    async mutate(fn) {
      set(s => { if (s.league) fn(s.league); });
      debouncedSave(get().league);
    },
    async setUserTeam(teamId) {
      set(s => { if (s.league) s.league.userTeamId = teamId; });
      const lg = get().league;
      if (lg) await saveFootballLeague(lg);
    },
    async switchLeague(id) {
      set(s => { s.loading = true; });
      const lg = await loadFootballLeague(id);
      set(s => { s.league = lg; s.loading = false; });
    },
    async renameCurrent(name) {
      set(s => { if (s.league) s.league.name = name; });
      const lg = get().league;
      if (lg) await saveFootballLeague(lg);
    },
    async duplicateCurrent(newName) {
      const lg = get().league;
      if (!lg) return;
      // Deep clone via JSON; then mint a fresh id + name.
      const copy: FootballLeague = JSON.parse(JSON.stringify(lg));
      copy.id = `flg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      copy.name = newName;
      copy.createdAt = Date.now();
      copy.modifiedAt = Date.now();
      await saveFootballLeague(copy);
    },
    async removeLeague(id) {
      await deleteFootballLeague(id);
      // If we just deleted the active one, drop it from state too.
      const lg = get().league;
      if (lg?.id === id) set(s => { s.league = null; });
    },
    async reset() {
      const lg = get().league;
      if (lg) await deleteFootballLeague(lg.id);
      set(s => { s.league = null; s.hydrated = true; });
    },
  })),
);

export { listFootballLeagues };
