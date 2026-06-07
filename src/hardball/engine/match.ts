// Hardball — match state machine. Top/bottom of inning, count, runners, score.
import type { ContactKind } from "./swing";

export type Half = "top" | "bottom";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  accent: string;
}

export interface Bases {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface MatchState {
  away: Team;
  home: Team;
  inning: number;       // 1..maxInnings
  half: Half;
  balls: number;
  strikes: number;
  outs: number;
  awayScore: number;
  homeScore: number;
  bases: Bases;
  maxInnings: number;
  /** "playing" | "between-pitch" | "ball-in-play" | "final" */
  phase: "playing" | "ball-in-play" | "final";
}


export const TEAMS: Team[] = [
  { id: "bears",     name: "Berry Bears",      shortName: "BER", accent: "#a855f7" },
  { id: "lightning", name: "Latte Lightning",  shortName: "LAT", accent: "#fbbf24" },
  { id: "walkers",   name: "Wave Walkers",     shortName: "WAV", accent: "#22d3ee" },
  { id: "reds",      name: "Roman Reds",       shortName: "ROM", accent: "#ef4444" },
  { id: "unicorn",   name: "Unicorn United",   shortName: "UNI", accent: "#f472b6" },
];

export function initMatch(awayId: string, homeId: string, maxInnings = 3): MatchState {
  const away = TEAMS.find(t => t.id === awayId) ?? TEAMS[0];
  const home = TEAMS.find(t => t.id === homeId) ?? TEAMS[1];
  return {
    away, home,
    inning: 1, half: "top",
    balls: 0, strikes: 0, outs: 0,
    awayScore: 0, homeScore: 0,
    bases: { first: false, second: false, third: false },
    maxInnings,
    phase: "playing",
  };
}

export function battingTeam(s: MatchState): Team {
  return s.half === "top" ? s.away : s.home;
}
export function pitchingTeam(s: MatchState): Team {
  return s.half === "top" ? s.home : s.away;
}


function addRun(s: MatchState): MatchState {
  return s.half === "top"
    ? { ...s, awayScore: s.awayScore + 1 }
    : { ...s, homeScore: s.homeScore + 1 };
}

/** Advance every runner by `n` bases, count any that scored. */
export function advanceRunners(s: MatchState, n: number, batterReaches = true): MatchState {
  let runs = 0;
  const b = { ...s.bases };
  const queue: boolean[] = [b.third, b.second, b.first];
  // Slot 0 = third, 1 = second, 2 = first
  // After advancing by n, anyone past third scores.
  const after: boolean[] = [false, false, false];
  queue.forEach((occupied, idx) => {
    if (!occupied) return;
    const baseIdx = idx; // 0 third, 1 second, 2 first
    const finalIdx = baseIdx - n;
    if (finalIdx < 0) runs++;
    else after[finalIdx] = true;
  });
  if (batterReaches) {
    const finalIdx = 2 - (n - 1); // batter moves n-1 from "home → first"
    if (finalIdx < 0) runs++;
    else if (finalIdx <= 2) after[finalIdx] = true;
  }
  let next = { ...s, bases: { third: after[0], second: after[1], first: after[2] } };
  for (let i = 0; i < runs; i++) next = addRun(next);
  return next;
}


export function homeRun(s: MatchState): MatchState {
  // batter + everyone on base scores
  const onBase = (s.bases.first ? 1 : 0) + (s.bases.second ? 1 : 0) + (s.bases.third ? 1 : 0);
  let next = s;
  for (let i = 0; i < onBase + 1; i++) next = addRun(next);
  return resetCount({ ...next, bases: { first: false, second: false, third: false } });
}

export function ball(s: MatchState): MatchState {
  const b = s.balls + 1;
  if (b >= 4) return advanceRunners(resetCount(s), 1, true); // walk
  return { ...s, balls: b };
}

export function strike(s: MatchState): MatchState {
  const k = s.strikes + 1;
  if (k >= 3) return out(resetCount(s));
  return { ...s, strikes: k };
}

export function foulStrike(s: MatchState): MatchState {
  if (s.strikes >= 2) return s; // fouls don't add a third
  return { ...s, strikes: s.strikes + 1 };
}

export function out(s: MatchState): MatchState {
  const outs = s.outs + 1;
  if (outs >= 3) return endHalf(s);
  return { ...s, outs };
}

function resetCount(s: MatchState): MatchState {
  return { ...s, balls: 0, strikes: 0 };
}


function endHalf(s: MatchState): MatchState {
  const cleared: MatchState = {
    ...s,
    balls: 0, strikes: 0, outs: 0,
    bases: { first: false, second: false, third: false },
  };
  if (s.half === "top") {
    return { ...cleared, half: "bottom" };
  }
  // bottom of inning closed
  const nextInning = s.inning + 1;
  if (nextInning > s.maxInnings) {
    return { ...cleared, phase: "final" };
  }
  return { ...cleared, inning: nextInning, half: "top" };
}

/**
 * Apply the result of a hit (after fielder resolution).
 * `basesEarned`: 0 = out, 1 = single, 2 = double, 3 = triple, 4 = HR.
 */
export function applyHit(s: MatchState, basesEarned: 0 | 1 | 2 | 3 | 4): MatchState {
  if (basesEarned === 0) return out(resetCount(s));
  if (basesEarned === 4) return homeRun(s);
  return advanceRunners(resetCount(s), basesEarned, true);
}

/** Map contact kind → bases earned (simple arcade resolution). */
export function contactToBases(kind: ContactKind): 0 | 1 | 2 | 3 | 4 {
  switch (kind) {
    case "whiff":    return 0;
    case "foul":     return 0;     // foul is its own path; caller uses foulStrike
    case "grounder": return Math.random() < 0.45 ? 1 : 0;
    case "liner":    return Math.random() < 0.7 ? (Math.random() < 0.25 ? 2 : 1) : 0;
    case "fly":      return Math.random() < 0.35 ? (Math.random() < 0.2 ? 3 : 1) : 0;
    case "homerun":  return 4;
  }
}
