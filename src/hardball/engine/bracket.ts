// Hardball -- 4-team single-elim bracket.

import type { Team } from "./match";
import { TEAMS } from "./match";

export interface BracketMatch {
  id: string;
  round: "semi" | "final";
  awayId: string;
  homeId: string;
  awayScore?: number;
  homeScore?: number;
  winnerId?: string;
}

export interface BracketState {
  matches: BracketMatch[];
  currentMatchId: string | null;
  champion?: Team;
}

export function newBracket(teamIds: string[]): BracketState {
  const seeds = teamIds.slice(0, 4);
  const matches: BracketMatch[] = [
    { id: "s1", round: "semi", awayId: seeds[3], homeId: seeds[0] },
    { id: "s2", round: "semi", awayId: seeds[2], homeId: seeds[1] },
    { id: "f1", round: "final", awayId: "?", homeId: "?" },
  ];
  return { matches, currentMatchId: "s1" };
}

export function recordResult(b: BracketState, matchId: string, awayScore: number, homeScore: number): BracketState {
  const next = { ...b, matches: b.matches.map(m => ({ ...m })) };
  const m = next.matches.find(x => x.id === matchId);
  if (!m) return b;
  m.awayScore = awayScore;
  m.homeScore = homeScore;
  m.winnerId = awayScore > homeScore ? m.awayId : m.homeId;

  if (matchId === "s1") {
    const f = next.matches.find(x => x.id === "f1")!;
    f.awayId = m.winnerId;
    next.currentMatchId = "s2";
  } else if (matchId === "s2") {
    const f = next.matches.find(x => x.id === "f1")!;
    f.homeId = m.winnerId;
    next.currentMatchId = "f1";
  } else if (matchId === "f1") {
    next.currentMatchId = null;
    next.champion = TEAMS.find(t => t.id === m.winnerId);
  }
  return next;
}
