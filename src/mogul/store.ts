// Movie Mogul — Zustand store. One active studio at a time, plus
// switchable save slots via Dexie. Mirrors the football store shape so
// the mental model is consistent across games.

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Studio } from "./types";
import { createStudio, type NewStudioOpts } from "./generate";
import {
  saveMogulStudio, loadMogulStudio, listMogulStudios, deleteMogulStudio,
} from "../db/dexie";

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
      debouncedSave(get().studio);
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
