// Cosmic Squad — save slot management.
// Up to 3 named save slots stored in localStorage. Each save tracks
// pilot identity, rank progression, unlocked ships, current wingmen,
// memorial wall, and the last 10 battle replays.

import { create } from "zustand";
import type { Save, Wingman, ShipClassId, MissileId, Era, Battle } from "./types";
import { RANK_TIERS } from "./types";
import { SHIP_CLASSES } from "./ships";
import { profileKey, getActiveProfileId, recordGameSession } from "../profiles/store";
import { setBlob as cloudSet } from "../sync/cloudBlob";

const BASE_KEY = "dd_cosmic_saves";
const STORAGE_KEY = () => profileKey(BASE_KEY);
const MAX_SLOTS = 3;

function syncToCloud(saves: Save[]): void {
  const pid = getActiveProfileId();
  if (!pid) return;
  try { cloudSet(pid, "cosmic_saves_v1", saves); } catch {}
}

const STARTER_LOADOUT: MissileId[] = ["pulse", "vulcan"];

function loadAllSaves(): Save[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Save[];
  } catch {
    return [];
  }
}

function persist(saves: Save[]): void {
  try { localStorage.setItem(STORAGE_KEY(), JSON.stringify(saves)); } catch {}
  syncToCloud(saves);
}

const STARTER_CALLSIGNS = ["Maverick", "Goose", "Iceman", "Viper", "Slider", "Wolfman", "Hollywood", "Sundown"];
const STARTER_NAMES = ["Alex Rivers", "Mara Chen", "Diego Ortiz", "Yuki Tanaka", "Sam Bishop", "Priya Vance", "Kai Donnelly", "Eli Kovac"];

function rollWingmen(count: number, era: Era): Wingman[] {
  const starters = SHIP_CLASSES.filter(s => s.unlockRank === 0);
  const result: Wingman[] = [];
  for (let i = 0; i < count; i++) {
    const ship = starters[i % starters.length];
    result.push({
      id: `w-${Date.now()}-${i}`,
      callsign: STARTER_CALLSIGNS[i % STARTER_CALLSIGNS.length],
      realName: STARTER_NAMES[i % STARTER_NAMES.length],
      rank: "Ensign",
      gunnery: 4 + Math.floor(Math.random() * 4),
      piloting: 4 + Math.floor(Math.random() * 4),
      loyalty: 5 + Math.floor(Math.random() * 3),
      kills: 0,
      missions: 0,
      backstory: "Joined the squadron looking for a fight and a paycheck.",
      shipClassId: ship.id,
    });
  }
  return result;
}

export function createSave(args: {
  pilotName: string;
  callsign: string;
  squadronName: string;
  era: Era;
  difficulty: Save["difficulty"];
}): Save {
  const now = Date.now();
  return {
    id: `cs-${now}`,
    createdAt: now,
    modifiedAt: now,
    pilotName: args.pilotName,
    callsign: args.callsign,
    squadronName: args.squadronName,
    rank: 0,
    rankPoints: 0,
    credits: 500,
    unlockedShipClasses: SHIP_CLASSES.filter(s => s.unlockRank === 0).map(s => s.id),
    currentShipClass: "rebel_x_class",
    loadout: STARTER_LOADOUT,
    wingmen: rollWingmen(2, args.era),
    memorial: [],
    completedMissions: [],
    battles: [],
    era: args.era,
    difficulty: args.difficulty,
  };
}

interface CosmicStore {
  saves: Save[];
  activeId: string | null;
  load: () => void;
  newSave: (s: Save) => void;
  updateSave: (id: string, patch: Partial<Save>) => void;
  deleteSave: (id: string) => void;
  setActive: (id: string | null) => void;
  getActive: () => Save | null;
  awardMission: (saveId: string, args: { missionId: string; rankPoints: number; credits: number; unlockClass?: ShipClassId; battle?: Battle; wingmenDied: string[] }) => void;
  setCurrentShip: (saveId: string, classId: ShipClassId) => void;
  setLoadout: (saveId: string, loadout: MissileId[]) => void;
}

export const useCosmic = create<CosmicStore>((set, get) => ({
  saves: [],
  activeId: null,
  load: () => set({ saves: loadAllSaves() }),
  newSave: (s) => set(state => {
    const next = [s, ...state.saves].slice(0, MAX_SLOTS);
    persist(next);
    return { saves: next, activeId: s.id };
  }),
  updateSave: (id, patch) => set(state => {
    const next = state.saves.map(s => s.id === id ? { ...s, ...patch, modifiedAt: Date.now() } : s);
    persist(next);
    return { saves: next };
  }),
  deleteSave: (id) => set(state => {
    const next = state.saves.filter(s => s.id !== id);
    persist(next);
    return { saves: next, activeId: state.activeId === id ? null : state.activeId };
  }),
  setActive: (id) => set({ activeId: id }),
  getActive: () => {
    const { saves, activeId } = get();
    return saves.find(s => s.id === activeId) ?? null;
  },
  awardMission: (saveId, args) => set(state => {
    const next = state.saves.map(s => {
      if (s.id !== saveId) return s;
      const newPoints = s.rankPoints + args.rankPoints;
      const newRank = Math.min(RANK_TIERS.length - 1, Math.floor(newPoints / 250));
      const unlocked = args.unlockClass && !s.unlockedShipClasses.includes(args.unlockClass)
        ? [...s.unlockedShipClasses, args.unlockClass]
        : s.unlockedShipClasses;
      const survivingWingmen = s.wingmen.filter(w => !args.wingmenDied.includes(w.id));
      const killed = s.wingmen.filter(w => args.wingmenDied.includes(w.id)).map(w => ({ ...w, dead: true, diedThisMission: true }));
      return {
        ...s,
        rankPoints: newPoints,
        rank: newRank,
        credits: s.credits + args.credits,
        unlockedShipClasses: unlocked,
        completedMissions: s.completedMissions.includes(args.missionId) ? s.completedMissions : [...s.completedMissions, args.missionId],
        battles: args.battle ? [args.battle, ...s.battles].slice(0, 10) : s.battles,
        wingmen: survivingWingmen,
        memorial: [...killed, ...s.memorial],
        modifiedAt: Date.now(),
      };
    });
    persist(next);
    // Family stats — credit a Cosmic win the moment a mission is awarded.
    {
      const pid = getActiveProfileId();
      if (pid) {
        const me = next.find(s => s.id === saveId);
        recordGameSession(pid, "cosmic", {
          sessions: 1,
          wins: 1,
          level: me?.rank ?? 0,
        });
      }
    }
    return { saves: next };
  }),
  setCurrentShip: (saveId, classId) => set(state => {
    const next = state.saves.map(s => s.id === saveId ? { ...s, currentShipClass: classId, modifiedAt: Date.now() } : s);
    persist(next);
    return { saves: next };
  }),
  setLoadout: (saveId, loadout) => set(state => {
    const next = state.saves.map(s => s.id === saveId ? { ...s, loadout, modifiedAt: Date.now() } : s);
    persist(next);
    return { saves: next };
  }),
}));
