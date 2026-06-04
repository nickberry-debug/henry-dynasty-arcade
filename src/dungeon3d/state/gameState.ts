// dungeon3d/state/gameState.ts — Game state & persistence (Zustand + Dexie)
import { create } from 'zustand';
import { db } from './db';

export interface Hero {
  id: string;
  name: string;
  class: 'warrior' | 'ranger' | 'mage';
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
}

export interface RunState {
  hero: Hero;
  currentFloor: number;
  gold: number;
  inventory: unknown[]; // will be expanded in Phase 4
  runStartTime: number;
  isActive: boolean;
}

export interface GameStore {
  heroes: Hero[];
  currentRun: RunState | null;
  startNewRun: (hero: Hero) => void;
  updateRunState: (updates: Partial<RunState>) => void;
  endRun: (won: boolean) => void;
  saveHero: (hero: Hero) => Promise<void>;
  loadHeroes: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  heroes: [],
  currentRun: null,

  startNewRun: (hero: Hero) => {
    set({
      currentRun: {
        hero,
        currentFloor: 1,
        gold: 0,
        inventory: [],
        runStartTime: Date.now(),
        isActive: true,
      },
    });
  },

  updateRunState: (updates: Partial<RunState>) => {
    set((state) => ({
      currentRun: state.currentRun ? { ...state.currentRun, ...updates } : null,
    }));
  },

  endRun: (won: boolean) => {
    const run = get().currentRun;
    if (!run) return;

    // Save run to DB (for stats/history)
    // Implemented in Phase 5
    
    set({ currentRun: null });
  },

  saveHero: async (hero: Hero) => {
    await db.heroes.put(hero);
    set((state) => ({
      heroes: state.heroes.map((h) => (h.id === hero.id ? hero : h)),
    }));
  },

  loadHeroes: async () => {
    const heroes = await db.heroes.toArray();
    set({ heroes });
  },
}));

/**
 * Create a default hero for testing
 */
export function createDefaultHero(): Hero {
  return {
    id: `hero-${Date.now()}`,
    name: 'Adventurer',
    class: 'warrior',
    level: 1,
    experience: 0,
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
  };
}
