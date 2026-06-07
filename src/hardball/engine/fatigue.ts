// Hardball -- pitcher fatigue + walk-up music tags.

export interface PitcherFatigue {
  pitchesThrown: number;
  /** 0..1: 1 = fresh, 0 = gassed. */
  energy: number;
}

export function newFatigue(): PitcherFatigue {
  return { pitchesThrown: 0, energy: 1 };
}

export function tickFatigue(f: PitcherFatigue): PitcherFatigue {
  const next = Math.max(0, f.energy - 0.018);
  return { pitchesThrown: f.pitchesThrown + 1, energy: next };
}

/** Multiplier on travel time. Tired pitcher = slower fastball + bigger drift. */
export function fatigueTravelMul(f: PitcherFatigue): number {
  return 1 + (1 - f.energy) * 0.35;
}

export function fatigueAimDrift(f: PitcherFatigue): { x: number; y: number } {
  const wob = (1 - f.energy) * 0.6;
  return {
    x: (Math.random() - 0.5) * wob,
    y: (Math.random() - 0.5) * wob,
  };
}

/** Walk-up music keys by team id; resolved by audio.walkUp(). */
export const WALK_UP: Record<string, string[]> = {
  bears:     ["organ_jingle", "bear_growl"],
  lightning: ["organ_jingle", "thunder_clap"],
  walkers:   ["organ_jingle", "wave_swell"],
  reds:      ["organ_jingle", "rome_brass"],
  unicorn:   ["organ_jingle", "unicorn_chime"],
};
