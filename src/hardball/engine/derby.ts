// Hardball -- Home Run Derby mode state.
// One batter, pitching machine throws N pitches. Count HR.

import type { Team } from "./match";

export interface DerbyState {
  team: Team;
  totalPitches: number;
  remainingPitches: number;
  homers: number;
  longestPx: number;
  round: number;
  finished: boolean;
}

export function initDerby(team: Team, pitchesPerRound = 10): DerbyState {
  return {
    team,
    totalPitches: pitchesPerRound,
    remainingPitches: pitchesPerRound,
    homers: 0,
    longestPx: 0,
    round: 1,
    finished: false,
  };
}

export function recordPitch(s: DerbyState, isHR: boolean, distancePx = 0): DerbyState {
  const nextPitches = Math.max(0, s.remainingPitches - 1);
  return {
    ...s,
    remainingPitches: nextPitches,
    homers: s.homers + (isHR ? 1 : 0),
    longestPx: Math.max(s.longestPx, distancePx),
    finished: nextPitches === 0,
  };
}
