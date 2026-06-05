// Movie Mogul — Zustand store. One active studio at a time, plus
// switchable save slots via Dexie. Mirrors the football store shape so
// the mental model is consistent across games.

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Studio, ReleasedMovie } from "./types";
import { createStudio, type NewStudioOpts } from "./generate";
import {
  saveMogulStudio, loadMogulStudio, listMogulStudios, deleteMogulStudio,
} from "../db/dexie";
import { pushRealRelease } from "./globalChart";
import { getActiveProfileId, loadProfiles, recordGameSession } from "../profiles/store";

/** Snapshot release ids we last pushed so we know what's new on the
 *  next mutate. Keyed by studio id. */
const pushedReleaseSnapshot: Map<string, Map<string, number>> = new Map();

/** Diff the studio's current releases against the snapshot, pushing
 *  anything new (or anything whose totalBO climbed). */
function pushNewReleasesToChart(studio: Studio): void {
  if (!studio.releases?.length) return;
  let snap = pushedReleaseSnapshot.get(studio.id);
  if (!snap) { snap = new Map(); pushedReleaseSnapshot.set(studio.id, snap); }
  const profileId = getActiveProfileId() ?? "henry";
  const profiles = loadProfiles();
  const me = profiles.find(p => p.id === profileId);
  // Display label: prefer the player handle (e.g. "HenryTheHero"), fall
  // back to the studio name if no profile is active.
  const releasedBy = me?.handle || studio.player.name;
  for (const m of studio.releases as ReleasedMovie[]) {
    const prev = snap.get(m.id) ?? -1;
    if (prev < m.totalBO) {
      pushRealRelease(m, profileId, releasedBy);
      // Family stats — count each FIRST appearance of a release as a
      // "session", and credit a "win" if it was profitable. Don't bump
      // on subsequent week-by-week box-office updates (prev !== -1).
      if (prev === -1) {
        recordGameSession(profileId, "mogul", {
          sessions: 1,
          wins: m.profit > 0 ? 1 : 0,
          losses: m.profit < 0 ? 1 : 0,
          level: studio.year,
        });
      }
      snap.set(m.id, m.totalBO);
    }
  }
}

interface MogulState {
  studio: Studio | null;
  loading: boolean;
  hydrated: boolean;
  newStudio: (opts: NewStudioOpts) => Promise<void>;
  loadFromDb: () => Promise<void>;
  save: () => Promise<void>;
  mutate: (fn: (s: Studio) => void) => Promise<void>;
  switchStudio: (id: string) => Promise<void>;
  renameCurrent: (name: string) => Promise<void>;
  duplicateCurrent: (newName: string) => Promise<void>;
  removeStudio: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}

let saveTimer: any = null;
function debouncedSave(s: Studio | null) {
  clearTimeout(saveTimer);
  if (!s) return;
  saveTimer = setTimeout(() => { saveMogulStudio(s); }, 250);
}

const yieldToBrowser = () => new Promise<void>(r => {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => setTimeout(r, 0));
  } else {
    setTimeout(r, 16);
  }
});

export const useMogul = create<MogulState>()(
  immer((set, get) => ({
    studio: null,
    loading: false,
    hydrated: false,
    async newStudio(opts) {
      set(s => { s.loading = true; });
      await yieldToBrowser();
      const studio = createStudio(opts);
      await yieldToBrowser();
      await saveMogulStudio(studio);
      set(s => { s.studio = studio; s.loading = false; s.hydrated = true; });
    },
    async loadFromDb() {
      set(s => { s.loading = true; });
      const studio = await loadMogulStudio();
      set(s => { s.studio = studio; s.loading = false; s.hydrated = true; });
    },
    async save() {
      const studio = get().studio;
      if (studio) await saveMogulStudio(studio);
    },
    async mutate(fn) {
      set(s => { if (s.studio) fn(s.studio); });
      const cur = get().studio;
      debouncedSave(cur);
      // After every mutation, sync any new/updated releases up to the
      // family Top 50 chart. Fire-and-forget; offline failures are silent.
      if (cur) pushNewReleasesToChart(cur);
    },
    async switchStudio(id) {
      set(s => { s.loading = true; });
      const studio = await loadMogulStudio(id);
      set(s => { s.studio = studio; s.loading = false; });
    },
    async renameCurrent(name) {
      set(s => { if (s.studio) s.studio.player.name = name; });
      const studio = get().studio;
      if (studio) await saveMogulStudio(studio);
    },
    async duplicateCurrent(newName) {
      const studio = get().studio;
      if (!studio) return;
      const copy: Studio = JSON.parse(JSON.stringify(studio));
      copy.id = `mog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      copy.player.name = newName;
      copy.createdAt = Date.now();
      copy.modifiedAt = Date.now();
      await saveMogulStudio(copy);
    },
    async removeStudio(id) {
      await deleteMogulStudio(id);
      const studio = get().studio;
      if (studio?.id === id) set(s => { s.studio = null; });
    },
    async reset() {
      const studio = get().studio;
      if (studio) await deleteMogulStudio(studio.id);
      set(s => { s.studio = null; s.hydrated = true; });
    },
  })),
);

export { listMogulStudios };

// Expose the store on `window` so async fire-and-forget paths (e.g.
// AI-driven monthly news in engine.ts) can mutate it after the tick
// has returned. Mirrors how Olympus exposes its key resolver.
if (typeof window !== "undefined") {
  (window as any).__dd_mogul_store = useMogul;
}
