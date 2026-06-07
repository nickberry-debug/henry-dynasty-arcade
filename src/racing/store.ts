// Turbo Racers -- persistent save store. localStorage-backed coin balance,
// per-car upgrade levels, best-lap times per track. Conservative read/write
// with try/catch so a private-browsing or storage-full failure doesn't
// crash the game.

import { emptyLevels, type UpgradeLevels } from "./engine/stats";

const KEY = "turboRacers.v1";

interface SaveBlob {
  coins: number;
  selectedCar: string;
  upgrades: Record<string, UpgradeLevels>;
  /** Best lap times per track id (ms). */
  bestLapMs: Record<string, number>;
  /** Best total race times per track id (ms). */
  bestRaceMs: Record<string, number>;
  /** Has the player ever played? */
  raceCount: number;
}

const DEFAULT: SaveBlob = {
  coins: 240, // free starter coins so first upgrade is reachable
  selectedCar: "comet",
  upgrades: {},
  bestLapMs: {},
  bestRaceMs: {},
  raceCount: 0,
};

function read(): SaveBlob {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<SaveBlob>;
    return {
      coins: typeof parsed.coins === "number" ? parsed.coins : DEFAULT.coins,
      selectedCar: typeof parsed.selectedCar === "string" ? parsed.selectedCar : DEFAULT.selectedCar,
      upgrades: parsed.upgrades && typeof parsed.upgrades === "object" ? parsed.upgrades as Record<string, UpgradeLevels> : {},
      bestLapMs: parsed.bestLapMs && typeof parsed.bestLapMs === "object" ? parsed.bestLapMs as Record<string, number> : {},
      bestRaceMs: parsed.bestRaceMs && typeof parsed.bestRaceMs === "object" ? parsed.bestRaceMs as Record<string, number> : {},
      raceCount: typeof parsed.raceCount === "number" ? parsed.raceCount : 0,
    };
  } catch {
    return { ...DEFAULT };
  }
}

function write(blob: SaveBlob): void {
  try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch { /* ignore */ }
}

export function getSave(): SaveBlob { return read(); }

export function getCoins(): number { return read().coins; }
export function addCoins(delta: number): number {
  const s = read();
  s.coins = Math.max(0, s.coins + delta);
  write(s);
  return s.coins;
}

export function getSelectedCar(): string { return read().selectedCar; }
export function setSelectedCar(carId: string): void {
  const s = read();
  s.selectedCar = carId;
  write(s);
}

export function getUpgrades(carId: string): UpgradeLevels {
  const s = read();
  return s.upgrades[carId] ?? emptyLevels();
}

export function setUpgrades(carId: string, levels: UpgradeLevels): void {
  const s = read();
  s.upgrades[carId] = levels;
  write(s);
}

export function getBestLap(trackId: string): number | null {
  const s = read();
  return s.bestLapMs[trackId] ?? null;
}
export function getBestRace(trackId: string): number | null {
  const s = read();
  return s.bestRaceMs[trackId] ?? null;
}

export function recordRace(opts: {
  trackId: string;
  raceTimeMs: number;
  bestLapMs: number;
  coinsEarned: number;
}): { newBestRace: boolean; newBestLap: boolean; newCoins: number } {
  const s = read();
  let newBestRace = false;
  let newBestLap = false;
  const prevRace = s.bestRaceMs[opts.trackId];
  if (prevRace == null || opts.raceTimeMs < prevRace) {
    s.bestRaceMs[opts.trackId] = opts.raceTimeMs;
    newBestRace = true;
  }
  const prevLap = s.bestLapMs[opts.trackId];
  if (prevLap == null || opts.bestLapMs < prevLap) {
    s.bestLapMs[opts.trackId] = opts.bestLapMs;
    newBestLap = true;
  }
  s.coins = Math.max(0, s.coins + opts.coinsEarned);
  s.raceCount += 1;
  write(s);
  return { newBestRace, newBestLap, newCoins: s.coins };
}
