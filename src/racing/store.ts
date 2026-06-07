// Turbo Racers -- persistent save store. localStorage-backed coin balance,
// per-car upgrade levels, best-lap times per track, race wins, ownedCars,
// championship cup state. Conservative read/write with try/catch so a
// private-browsing or storage-full failure doesn't crash the game.

import { emptyLevels, type UpgradeLevels } from "./engine/stats";

const KEY = "turboRacers.v2";
const KEY_LEGACY = "turboRacers.v1";

interface SaveBlob {
  coins: number;
  selectedCar: string;
  selectedTrack: string;
  upgrades: Record<string, UpgradeLevels>;
  /** Best lap times per track id (ms). */
  bestLapMs: Record<string, number>;
  /** Best total race times per track id (ms). */
  bestRaceMs: Record<string, number>;
  /** Has the player ever played? */
  raceCount: number;
  /** Cars unlocked + owned by the player ("comet" always starts owned). */
  ownedCars: string[];
  /** Race wins (1st place) -- total across all races. */
  wins: number;
  /** Per-track win counts (used to gate mirror unlocks). */
  winsByTrack: Record<string, number>;
  /** Per-track mirror unlocks (true = mirror direction available). */
  mirrorUnlocked: Record<string, boolean>;
  /** Best-lap per track (also used by time-trial ghost) -- same as bestLapMs but kept for clarity. */
  /** Audio mute. */
  muted: boolean;
}

const DEFAULT: SaveBlob = {
  coins: 240,
  selectedCar: "comet",
  selectedTrack: "oval",
  upgrades: {},
  bestLapMs: {},
  bestRaceMs: {},
  raceCount: 0,
  ownedCars: ["comet"],
  wins: 0,
  winsByTrack: {},
  mirrorUnlocked: {},
  muted: false,
};

function read(): SaveBlob {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveBlob>;
      return normalise(parsed);
    }
    // Try legacy v1 key.
    const legacy = localStorage.getItem(KEY_LEGACY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<SaveBlob>;
      const upgraded = normalise(parsed);
      // Preserve any pre-existing investment.
      if (!upgraded.ownedCars.includes(upgraded.selectedCar)) upgraded.ownedCars.push(upgraded.selectedCar);
      write(upgraded);
      return upgraded;
    }
  } catch {
    // fall-through
  }
  return { ...DEFAULT, ownedCars: [...DEFAULT.ownedCars] };
}

function normalise(parsed: Partial<SaveBlob>): SaveBlob {
  return {
    coins: typeof parsed.coins === "number" ? parsed.coins : DEFAULT.coins,
    selectedCar: typeof parsed.selectedCar === "string" ? parsed.selectedCar : DEFAULT.selectedCar,
    selectedTrack: typeof parsed.selectedTrack === "string" ? parsed.selectedTrack : DEFAULT.selectedTrack,
    upgrades: parsed.upgrades && typeof parsed.upgrades === "object" ? parsed.upgrades as Record<string, UpgradeLevels> : {},
    bestLapMs: parsed.bestLapMs && typeof parsed.bestLapMs === "object" ? parsed.bestLapMs as Record<string, number> : {},
    bestRaceMs: parsed.bestRaceMs && typeof parsed.bestRaceMs === "object" ? parsed.bestRaceMs as Record<string, number> : {},
    raceCount: typeof parsed.raceCount === "number" ? parsed.raceCount : 0,
    ownedCars: Array.isArray(parsed.ownedCars) && parsed.ownedCars.every(c => typeof c === "string")
      ? Array.from(new Set(["comet", ...parsed.ownedCars as string[]]))
      : ["comet"],
    wins: typeof parsed.wins === "number" ? parsed.wins : 0,
    winsByTrack: parsed.winsByTrack && typeof parsed.winsByTrack === "object" ? parsed.winsByTrack as Record<string, number> : {},
    mirrorUnlocked: parsed.mirrorUnlocked && typeof parsed.mirrorUnlocked === "object" ? parsed.mirrorUnlocked as Record<string, boolean> : {},
    muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
  };
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

export function getSelectedTrack(): string { return read().selectedTrack; }
export function setSelectedTrack(trackId: string): void {
  const s = read();
  s.selectedTrack = trackId;
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
  finishPlace?: number; // 1-based finishing position; if 1 -> increment wins
}): { newBestRace: boolean; newBestLap: boolean; newCoins: number; mirrorUnlocked: boolean } {
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
  let mirrorUnlocked = false;
  if (opts.finishPlace === 1) {
    s.wins += 1;
    const tw = (s.winsByTrack[opts.trackId] ?? 0) + 1;
    s.winsByTrack[opts.trackId] = tw;
    if (tw >= 3 && !s.mirrorUnlocked[opts.trackId]) {
      s.mirrorUnlocked[opts.trackId] = true;
      mirrorUnlocked = true;
    }
  }
  write(s);
  return { newBestRace, newBestLap, newCoins: s.coins, mirrorUnlocked };
}

// ---- Car ownership / unlock ------------------------------------------------

export function isOwned(carId: string): boolean {
  return read().ownedCars.includes(carId);
}

export function getOwnedCars(): string[] {
  return read().ownedCars.slice();
}

/** Returns true if purchase succeeded (had enough coins, not already owned). */
export function purchaseCar(carId: string, cost: number): boolean {
  const s = read();
  if (s.ownedCars.includes(carId)) return false;
  if (s.coins < cost) return false;
  s.coins -= cost;
  s.ownedCars.push(carId);
  write(s);
  return true;
}

// ---- Wins / mirror -----------------------------------------------------

export function getWins(): number { return read().wins; }
export function getWinsForTrack(trackId: string): number {
  return read().winsByTrack[trackId] ?? 0;
}
export function isMirrorUnlocked(trackId: string): boolean {
  return !!read().mirrorUnlocked[trackId];
}

// ---- Audio mute --------------------------------------------------------

export function isMuted(): boolean { return read().muted; }
export function setMuted(v: boolean): void {
  const s = read();
  s.muted = v;
  write(s);
}
