import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { League } from "./types";
import { saveLeague, loadLeague, listLeagues, deleteLeague, duplicateLeague, renameLeague, setActiveLeague, snapshotLeague } from "../db/dexie";
import { createLeague, DEFAULT_SETTINGS, defaultTrainingState } from "../engine/league";

/** Backfills fields added in V3 onto leagues saved before V3. */
function migrate(lg: any): League {
  if (!lg) return lg;
  if (!lg.tutorial) lg.tutorial = { hasSeenWelcome: false, guidedSeason: true, completedChapters: [], dismissedTips: [] };
  if (!lg.gmProfile && lg.gmProfile !== null) lg.gmProfile = null;
  if (!lg.mode) lg.mode = "career";
  if (typeof lg.weekIdx !== "number") lg.weekIdx = Math.floor((lg.day ?? 0) / 7);
  if (!lg.pendingTransition && lg.pendingTransition !== null) lg.pendingTransition = null;
  // Repair: older builds left brand-new leagues stranded in phase=preseason
  // with no UI to advance them out, because the CommandBar only shows sim
  // buttons in phase=regular. If we see a day-0 preseason save, flip it
  // forward. (Re-running checkPhaseTransitions would be cleaner but it's a
  // cross-module dep; the assignment is identical.)
  if (lg.phase === "preseason" && (lg.day ?? 0) === 0) {
    lg.phase = "regular";
  }
  if (!lg.allStar && lg.allStar !== null) lg.allStar = null;
  if (typeof lg.tradeDeadlineDay !== "number") {
    const schedLen = lg.settings?.gameplay?.scheduleLength ?? 162;
    lg.tradeDeadlineDay = Math.round(schedLen * 0.66);
  }
  if (typeof lg.allStarBreakDay !== "number") {
    const schedLen = lg.settings?.gameplay?.scheduleLength ?? 162;
    lg.allStarBreakDay = Math.round(schedLen * 0.5);
  }
  // Dev engine settings defaults
  const gp = lg.settings?.gameplay;
  if (gp) {
    if (typeof gp.devEngineOn !== "boolean") gp.devEngineOn = true;
    if (!gp.agingIntensity) gp.agingIntensity = "realistic";
    if (!gp.breakoutBustFreq) gp.breakoutBustFreq = "normal";
    if (typeof gp.retirementAgeCap !== "number") gp.retirementAgeCap = 43;
    if (typeof gp.showDevArrows !== "boolean") gp.showDevArrows = true;
    if (typeof gp.prospectWatch !== "boolean") gp.prospectWatch = true;
  }
  // Training Camp backfill
  if (!lg.training) lg.training = defaultTrainingState();
  else {
    // Migration-safe: only add NEW fields, never wipe existing
    const def = defaultTrainingState();
    const s = lg.training.settings ?? {};
    lg.training.settings = { ...def.settings, ...s };
    if (!lg.training.henryProfile) lg.training.henryProfile = def.henryProfile;
    if (!lg.training.lastTouchedAt) lg.training.lastTouchedAt = {};
    if (!lg.training.weeklySnapshots) lg.training.weeklySnapshots = [];
    if (!lg.training.personalRecords) lg.training.personalRecords = [];
  }
  // Player field backfills
  for (const p of [...(lg.players ?? []), ...(lg.freeAgents ?? []), ...(lg.retiredPlayers ?? [])]) {
    if (!p.hidden) p.hidden = { potential: p.potential ?? 70, revealed: 100 };
    if (typeof p.hidden.revealed !== "number") p.hidden.revealed = 100;
    if (!p.devSpeed) p.devSpeed = "normal";
    if (typeof p.prevOvr !== "number") p.prevOvr = p.overall;
    if (!p.devHistory) p.devHistory = [];
  }
  return lg as League;
}

interface AppState {
  league: League | null;
  loading: boolean;
  hydrated: boolean;
  undoStack: string[]; // serialized league snapshots, max 5
  setLeague: (l: League | null) => void;
  newLeague: (opts: { numTeams: number; scheduleLength: 30 | 60 | 82 | 120 | 162; year: number; mlbMode: boolean; mode?: "career" | "tournament" | "sandbox" }) => Promise<void>;
  loadFromDb: () => Promise<void>;
  switchLeague: (id: string) => Promise<boolean>;
  save: () => Promise<void>;
  /** Light-weight mutate (no undo entry). Use for tiny tweaks. */
  mutate: (fn: (league: League) => void) => Promise<void>;
  /** Same as mutate but AWAITS the IndexedDB write. Use for critical paths
   * like finishing onboarding, where losing the save would be catastrophic. */
  mutateAndFlush: (fn: (league: League) => void) => Promise<void>;
  /** Mutate with an undo snapshot. Use for impactful actions (signing, trading, sim, etc.). */
  mutateUndoable: (fn: (league: League) => void, label?: string) => Promise<void>;
  undo: () => Promise<boolean>;
  canUndo: () => boolean;
  snapshotCurrent: (label?: string) => Promise<string | null>;
  renameCurrent: (name: string) => Promise<boolean>;
  duplicateCurrent: (newName: string) => Promise<string | null>;
}

const MAX_UNDO = 5;
const LS_BACKUP_KEY = "dd_lite_backup";
const LS_ONBOARDING_DONE = "dd_onboarding_done";

let saveTimer: any = null;
function debouncedSave(state: AppState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (state.league) await saveLeague(state.league);
  }, 250); // Aggressive auto-save: any state change persists within 250ms
}

/** Writes a lightweight always-up-to-date snapshot to localStorage.
 * If iOS Safari evicts IndexedDB after 7+ days of inactivity, we can
 * restore the most critical state (profile, training stats, achievements)
 * from this localStorage copy.
 */
function writeLocalStorageBackup(lg: League | null) {
  if (!lg) return;
  try {
    const snap = {
      v: 1,
      ts: Date.now(),
      id: lg.id,
      name: lg.name,
      year: lg.year,
      day: lg.day,
      phase: lg.phase,
      userTeamId: lg.userTeamId,
      gmProfile: lg.gmProfile,
      tutorial: lg.tutorial,
      // Training Camp is the most precious thing — back it up in full
      training: lg.training,
      // Don't include teams/players/schedule — too big for localStorage.
      // If IndexedDB dies, those get regenerated; profile + practice logs are what matters.
    };
    const json = JSON.stringify(snap);
    if (json.length < 4 * 1024 * 1024) { // localStorage cap is ~5MB
      localStorage.setItem(LS_BACKUP_KEY, json);
    }
  } catch { /* localStorage may be full / disabled — ignore */ }
}

/** Belt-and-suspenders: also flag onboarding-done in localStorage so even if
 * IndexedDB is wiped, Henry doesn't see the welcome screen twice. */
export function markOnboardingDone() {
  try { localStorage.setItem(LS_ONBOARDING_DONE, "1"); } catch {}
}
export function isOnboardingDone(): boolean {
  try { return localStorage.getItem(LS_ONBOARDING_DONE) === "1"; } catch { return false; }
}
export function clearOnboardingDone() {
  try { localStorage.removeItem(LS_ONBOARDING_DONE); } catch {}
}

/** Returns the lite localStorage backup (if any). Caller decides what to do with it. */
export function readLocalStorageBackup(): any {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useStore = create<AppState>()(
  immer((set, get) => ({
    league: null,
    loading: false,
    hydrated: false,
    undoStack: [],
    setLeague(l) {
      set(s => { s.league = l; s.undoStack = []; });
    },
    async newLeague(opts) {
      set(s => { s.loading = true; });
      // Yield so React paints the loading state BEFORE we block the main
      // thread with team + roster + schedule + history generation. The
      // baseball createLeague() builds up to 30 teams × ~40 players ×
      // 50-year history — heavier than football and can freeze for 1-2s
      // on tablets. Yielding lets the spinner appear immediately.
      await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 0)));
      const lg = createLeague({ ...opts, settings: DEFAULT_SETTINGS });
      await new Promise<void>(r => setTimeout(r, 0));
      await saveLeague(lg);
      set(s => { s.league = lg; s.loading = false; s.hydrated = true; });
    },
    async loadFromDb() {
      set(s => { s.loading = true; });
      const raw = await loadLeague();
      const lg = raw ? migrate(raw) : null;
      set(s => { s.league = lg; s.loading = false; s.hydrated = true; });
    },
    async save() {
      const lg = get().league;
      if (lg) await saveLeague(lg);
    },
    async mutate(fn) {
      set(s => {
        if (s.league) fn(s.league);
      });
      // Lite localStorage snapshot is always synchronous — never gets lost in race conditions.
      writeLocalStorageBackup(get().league);
      debouncedSave(get() as any);
    },
    async mutateAndFlush(fn) {
      set(s => {
        if (s.league) fn(s.league);
      });
      const lg = get().league;
      writeLocalStorageBackup(lg);
      // Cancel any pending debounced save (we're about to do it ourselves) and AWAIT.
      clearTimeout(saveTimer);
      if (lg) await saveLeague(lg);
    },
    async mutateUndoable(fn) {
      const cur = get().league;
      if (cur) {
        // Snapshot current state BEFORE mutation
        try {
          const snap = JSON.stringify(cur);
          set(s => {
            s.undoStack.push(snap);
            if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();
          });
        } catch { /* snapshot oversize — skip undo entry */ }
      }
      set(s => {
        if (s.league) fn(s.league);
      });
      writeLocalStorageBackup(get().league);
      debouncedSave(get() as any);
    },
    async undo() {
      const stack = get().undoStack;
      if (stack.length === 0) return false;
      const snap = stack[stack.length - 1];
      try {
        const prev = JSON.parse(snap);
        set(s => {
          s.league = migrate(prev);
          s.undoStack = s.undoStack.slice(0, -1);
        });
        const lg = get().league;
        if (lg) await saveLeague(lg);
        return true;
      } catch {
        return false;
      }
    },
    canUndo() {
      return get().undoStack.length > 0;
    },
    async switchLeague(id) {
      setActiveLeague(id);
      set(s => { s.loading = true; });
      const raw = await loadLeague(id);
      const lg = raw ? migrate(raw) : null;
      set(s => { s.league = lg; s.loading = false; s.hydrated = true; });
      return !!lg;
    },
    async snapshotCurrent(label) {
      const lg = get().league;
      if (!lg) return null;
      return snapshotLeague(lg, label);
    },
    async renameCurrent(name) {
      const lg = get().league;
      if (!lg) return false;
      const ok = await renameLeague(lg.id, name);
      if (ok) {
        set(s => { if (s.league) s.league.name = name; });
      }
      return ok;
    },
    async duplicateCurrent(newName) {
      const lg = get().league;
      if (!lg) return null;
      return duplicateLeague(lg.id, newName);
    }
  }))
);

// Expose the store getter on the window so other modules (Olympus AI,
// football drama, etc.) can read the baseball league state — specifically
// the shared Anthropic API key — without creating a circular import.
if (typeof window !== "undefined") {
  (window as any).__dd_baseball_store_get = useStore.getState;
}

export async function exportLeagueJSON(lg: League): Promise<string> {
  return JSON.stringify({ version: 1, league: lg }, null, 2);
}

export async function listSavedLeagues() { return listLeagues(); }
export async function removeLeague(id: string) { return deleteLeague(id); }
