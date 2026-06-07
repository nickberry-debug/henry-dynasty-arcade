// Strike Rescue persistence — localStorage only, kid-safe (no login).

const KEY = "strike-rescue-save-v1";

export interface SRSave {
  highScore: number;
  bestLevel: number;
  totalRescued: number;
  settings: {
    volume: number;
    difficulty: "easy" | "normal" | "hard";
    twoPlayer: boolean;
  };
}

function defaultSave(): SRSave {
  return {
    highScore: 0,
    bestLevel: 0,
    totalRescued: 0,
    settings: { volume: 0.8, difficulty: "normal", twoPlayer: false },
  };
}

export function loadSave(): SRSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SRSave>;
    const def = defaultSave();
    return {
      ...def,
      ...parsed,
      settings: { ...def.settings, ...(parsed.settings ?? {}) },
    };
  } catch { return defaultSave(); }
}

export function saveSave(s: SRSave) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function recordRun(score: number, levelCleared: number, rescued: number): SRSave {
  const s = loadSave();
  s.highScore = Math.max(s.highScore, score);
  s.bestLevel = Math.max(s.bestLevel, levelCleared);
  s.totalRescued += rescued;
  saveSave(s);
  return s;
}

export function updateSettings(partial: Partial<SRSave["settings"]>): SRSave {
  const s = loadSave();
  s.settings = { ...s.settings, ...partial };
  saveSave(s);
  return s;
}
