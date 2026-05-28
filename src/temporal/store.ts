// Temporal Order — save slot store. Up to 5 agents, localStorage-backed.

import { create } from "zustand";
import type { AgentSave, ActiveMission, MissionVariation, EraId } from "./types";

const STORAGE_KEY = "dd_temporal_saves";
const MAX_SLOTS = 5;

function loadAll(): AgentSave[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function persist(saves: AgentSave[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saves)); } catch {}
}

export function createAgent(args: {
  agentName: string;
  appearance: AgentSave["appearance"];
}): AgentSave {
  const now = Date.now();
  return {
    id: `tagent-${now}`,
    createdAt: now, modifiedAt: now,
    agentName: args.agentName,
    appearance: args.appearance,
    integrity: 100,
    rep: {},
    missionsCompleted: [],
    activeMission: null,
    trophies: [],
    ripples: [],
    gadgets: ["translator", "pocket_watch", "journal"],
    coins: 30,
    level: 1, xp: 0,
  };
}

interface TemporalStore {
  saves: AgentSave[];
  activeId: string | null;
  load: () => void;
  setActive: (id: string | null) => void;
  newSave: (s: AgentSave) => void;
  deleteSave: (id: string) => void;
  replaceSave: (s: AgentSave) => void;
  startMission: (saveId: string, templateId: string, variation: MissionVariation) => void;
  endMission: (saveId: string, args: {
    templateId: string;
    resolutionId: number;
    integrityDelta: number;
    eraId: EraId;
    ripple: { primary: string; secondary: string };
    trophy?: { name: string; from: string };
    xpGained: number;
  }) => void;
  updateActive: (saveId: string, patch: Partial<ActiveMission>) => void;
  pushNote: (saveId: string, text: string) => void;
}

export const useTemporal = create<TemporalStore>((set, get) => ({
  saves: [],
  activeId: null,
  load: () => set({ saves: loadAll() }),
  setActive: (id) => set({ activeId: id }),
  newSave: (s) => set(state => {
    const next = [s, ...state.saves].slice(0, MAX_SLOTS);
    persist(next);
    return { saves: next, activeId: s.id };
  }),
  deleteSave: (id) => set(state => {
    const next = state.saves.filter(s => s.id !== id);
    persist(next);
    return { saves: next, activeId: state.activeId === id ? null : state.activeId };
  }),
  replaceSave: (s) => set(state => {
    const next = state.saves.map(x => x.id === s.id ? { ...s, modifiedAt: Date.now() } : x);
    persist(next);
    return { saves: next };
  }),
  startMission: (saveId, templateId, variation) => set(state => {
    const next = state.saves.map(s => s.id === saveId ? {
      ...s, modifiedAt: Date.now(),
      activeMission: {
        templateId, variation,
        cluesFound: [], spokenWith: [], notes: [],
        incidentsTriggered: [], disguised: false,
        startedAt: Date.now(),
      },
    } : s);
    persist(next);
    return { saves: next };
  }),
  endMission: (saveId, args) => set(state => {
    const next = state.saves.map(s => {
      if (s.id !== saveId) return s;
      const newIntegrity = Math.max(0, Math.min(100, s.integrity + args.integrityDelta));
      const newRep = { ...s.rep, [args.eraId]: Math.max(-50, Math.min(50, (s.rep[args.eraId] ?? 0) + Math.sign(args.integrityDelta) * 4)) };
      const completed = [...s.missionsCompleted, { templateId: args.templateId, resolutionId: args.resolutionId, integrityAtTime: newIntegrity }];
      const trophies = args.trophy ? [...s.trophies, { ...args.trophy, era: args.eraId }] : s.trophies;
      const ripples = [{ era: args.eraId, missionId: args.templateId, primary: args.ripple.primary, secondary: args.ripple.secondary, week: completed.length }, ...s.ripples].slice(0, 30);
      const xp = s.xp + args.xpGained;
      const level = 1 + Math.floor(xp / 100);
      return {
        ...s, modifiedAt: Date.now(),
        integrity: newIntegrity, rep: newRep,
        missionsCompleted: completed, trophies, ripples,
        activeMission: null, xp, level,
        coins: s.coins + 15,
      };
    });
    persist(next);
    return { saves: next };
  }),
  updateActive: (saveId, patch) => set(state => {
    const next = state.saves.map(s => {
      if (s.id !== saveId || !s.activeMission) return s;
      return { ...s, modifiedAt: Date.now(), activeMission: { ...s.activeMission, ...patch } };
    });
    persist(next);
    return { saves: next };
  }),
  pushNote: (saveId, text) => set(state => {
    const next = state.saves.map(s => {
      if (s.id !== saveId || !s.activeMission) return s;
      const notes = [...s.activeMission.notes, { id: `n-${Date.now()}`, text, addedAt: Date.now() }];
      return { ...s, modifiedAt: Date.now(), activeMission: { ...s.activeMission, notes } };
    });
    persist(next);
    return { saves: next };
  }),
}));
