// Phase transition orchestration. Triggers cinematic transition screens at major moments.
import type { League, LeaguePhase, PendingTransition } from "../store/types";
import { initAllStar } from "./allstar";

export function checkPhaseTransitions(lg: League): void {
  if (lg.mode === "tournament") return checkTournamentTransitions(lg);

  // Career mode transitions
  // Opening day: day 0, phase regular
  if (lg.phase === "preseason" && lg.day === 0) {
    setTransition(lg, "openingDay");
    lg.phase = "regular";
    return;
  }

  if (lg.phase === "regular") {
    // All-Star break
    if (lg.day >= lg.allStarBreakDay && !lg.allStar) {
      lg.allStar = initAllStar(lg);
      lg.phase = "allStarBreak";
      setTransition(lg, "allStarBreak");
      return;
    }
    // Trade deadline
    if (lg.day === lg.tradeDeadlineDay) {
      setTransition(lg, "tradeDeadline");
      return;
    }
    // Playoff race
    if (lg.day === Math.round(lg.settings.gameplay.scheduleLength * 0.88)) {
      setTransition(lg, "playoffRace");
      return;
    }
  }
}

function checkTournamentTransitions(lg: League): void {
  if (lg.phase === "preseason" && lg.day === 0) {
    lg.phase = "regular";
    setTransition(lg, "openingDay");
  }
}

function setTransition(lg: League, type: PendingTransition["type"]) {
  lg.pendingTransition = { type, ack: false };
}

export function setPhase(lg: League, phase: LeaguePhase, transitionType?: PendingTransition["type"]) {
  lg.phase = phase;
  if (transitionType) setTransition(lg, transitionType);
}

export function weekFromDay(day: number, schedLen: number): { week: number; totalWeeks: number; dayInWeek: number } {
  const totalWeeks = Math.ceil(schedLen / 7);
  const week = Math.floor(day / 7) + 1;
  return { week, totalWeeks, dayInWeek: day % 7 };
}
