// dungeon3d/state/db.ts — Dexie database for hero/run persistence
import Dexie, { Table } from 'dexie';
import { Hero } from './gameState';

export interface Run {
  id: string;
  heroId: string;
  floor: number;
  goldEarned: number;
  won: boolean;
  duration: number; // ms
  timestamp: number;
}

export class DungeonDB extends Dexie {
  heroes!: Table<Hero>;
  runs!: Table<Run>;

  constructor() {
    super('DungeonDB');
    this.version(1).stores({
      heroes: '&id',
      runs: '&id, heroId, timestamp',
    });
  }
}

export const db = new DungeonDB();
