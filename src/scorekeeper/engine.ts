// L — Score Keeper Module: state transitions.
import type { Scorecard, ScoreEvent, EventKind } from "./types";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function newScorecard(opts: {
  mode: "backyard" | "real";
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  innings?: number;
  gameType?: string;
  scoredBy?: string;
  gameName?: string;
}): Scorecard {
  const innings = opts.innings ?? (opts.mode === "backyard" ? 3 : 9);
  return {
    id: "sc" + uid(),
    mode: opts.mode,
    gameName: opts.gameName ?? (opts.mode === "backyard" ? "Backyard Game" : `${opts.awayName} @ ${opts.homeName}`),
    gameType: opts.gameType,
    date: new Date().toISOString(),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    completed: false,
    innings,
    currentInning: 1,
    half: "top",
    count: { balls: 0, strikes: 0, outs: 0 },
    bases: { first: null, second: null, third: null },
    home: { name: opts.homeName, color: opts.homeColor ?? "#1e3a8a", runs: 0, hits: 0, errors: 0, linescore: [] },
    away: { name: opts.awayName, color: opts.awayColor ?? "#b91c1c", runs: 0, hits: 0, errors: 0, linescore: [] },
    log: [],
    scoredBy: opts.scoredBy
  };
}

function logEvent(card: Scorecard, kind: EventKind, side: "home" | "away", text: string, detail?: string) {
  const ev: ScoreEvent = {
    id: uid(),
    t: Date.now(),
    kind,
    side,
    inning: card.currentInning,
    half: card.half,
    text,
    detail
  };
  card.log.push(ev);
  card.modifiedAt = Date.now();
}

export function battingSide(card: Scorecard): "home" | "away" {
  return card.half === "top" ? "away" : "home";
}

export function addRuns(card: Scorecard, side: "home" | "away", n: number) {
  const s = side === "home" ? card.home : card.away;
  s.runs += n;
  while (s.linescore.length < card.currentInning) s.linescore.push(0);
  s.linescore[card.currentInning - 1] += n;
  logEvent(card, "run", side, `+${n} run${n > 1 ? "s" : ""} for ${s.name}`);
}

export function addOut(card: Scorecard) {
  card.count.outs += 1;
  card.count.balls = 0;
  card.count.strikes = 0;
  logEvent(card, "out", battingSide(card), `Out #${card.count.outs}`);
  if (card.count.outs >= 3) {
    nextHalf(card);
  }
}

export function nextHalf(card: Scorecard) {
  card.count = { balls: 0, strikes: 0, outs: 0 };
  card.bases = { first: null, second: null, third: null };
  if (card.half === "top") {
    card.half = "bottom";
    logEvent(card, "halfInning", "home", `Top ${card.currentInning} ended — Bottom ${card.currentInning} begins`);
  } else {
    card.half = "top";
    card.currentInning += 1;
    logEvent(card, "inning", "away", `Inning ${card.currentInning} begins`);
    if (card.currentInning > card.innings) {
      // Game over (unless tied)
      if (card.home.runs !== card.away.runs) {
        card.completed = true;
      } else {
        // Extra innings
        card.completed = false;
      }
    }
  }
}

export function pitchOutcome(card: Scorecard, k: "ball" | "strikeSwing" | "strikeLook" | "foul" | "foulTip"): void {
  if (k === "ball") {
    card.count.balls += 1;
    logEvent(card, "ball", battingSide(card), "Ball");
    if (card.count.balls >= 4) {
      logEvent(card, "walk", battingSide(card), "Walk — batter to 1B");
      advanceRunners(card, 1, true);
      card.count = { balls: 0, strikes: 0, outs: card.count.outs };
    }
  } else if (k === "foul" || k === "foulTip") {
    if (card.count.strikes < 2) card.count.strikes += 1;
    logEvent(card, k, battingSide(card), k === "foul" ? "Foul ball" : "Foul tip");
  } else {
    card.count.strikes += 1;
    logEvent(card, k, battingSide(card), k === "strikeSwing" ? "Strike swinging" : "Strike looking");
    if (card.count.strikes >= 3) {
      logEvent(card, "strikeout", battingSide(card), "Strikeout!");
      addOut(card);
    }
  }
}

export function inPlay(card: Scorecard, kind: EventKind, label: string, detail?: string) {
  const side = battingSide(card);
  const s = side === "home" ? card.home : card.away;
  // Hits — increment hits
  const isHit = ["single", "double", "triple", "homerun"].includes(kind);
  if (isHit) s.hits += 1;
  if (kind === "error") {
    const fielding = side === "home" ? card.away : card.home;
    fielding.errors += 1;
  }
  logEvent(card, kind, side, label, detail);
  // Resolve effects
  switch (kind) {
    case "single": advanceRunners(card, 1, true); break;
    case "double": advanceRunners(card, 2, true); break;
    case "triple": advanceRunners(card, 3, true); break;
    case "homerun": {
      // Count runners on plus batter
      const runnersOn = [card.bases.first, card.bases.second, card.bases.third].filter(Boolean).length;
      addRuns(card, side, runnersOn + 1);
      card.bases = { first: null, second: null, third: null };
      card.count = { balls: 0, strikes: 0, outs: card.count.outs };
      break;
    }
    case "hbp": advanceRunners(card, 1, true); break;
    case "sb": advanceStolenBase(card); break;
    case "cs": addOut(card); break;
    case "wp":
    case "pb":
    case "balk": advanceRunners(card, 1, false); break;
    case "sacFly":
    case "sacBunt": addOut(card); advanceRunners(card, 1, false); break;
    case "groundOut":
    case "flyOut":
    case "lineOut":
    case "popOut": addOut(card); break;
    case "fieldersChoice": addOut(card); advanceRunners(card, 1, true); break;
    case "dp": addOut(card); addOut(card); break;
    case "tp": addOut(card); addOut(card); addOut(card); break;
    case "error": advanceRunners(card, 1, true); break;
    default: break;
  }
}

/** Advance runners by `n` bases. If `pushBatter` is true, the batter goes to 1B. */
function advanceRunners(card: Scorecard, n: number, pushBatter: boolean) {
  const side = battingSide(card);
  const s = side === "home" ? card.home : card.away;
  // Forced advance: only runners directly in front of batter are pushed,
  // but we keep it simple: move every runner by n bases.
  // Anyone past 3B scores.
  const runs: string[] = [];
  let third = card.bases.third;
  let second = card.bases.second;
  let first = card.bases.first;

  for (let i = 0; i < n; i++) {
    if (third) { runs.push(third); third = null; }
    if (second) { third = second; second = null; }
    if (first) { second = first; first = null; }
    if (pushBatter && i === 0) { first = "batter"; }
  }
  card.bases = { first, second, third };
  if (runs.length > 0) addRuns(card, side, runs.length);
  card.count = { balls: 0, strikes: 0, outs: card.count.outs };
}

function advanceStolenBase(card: Scorecard) {
  // Take the lead runner forward by 1 base
  if (card.bases.third) {
    addRuns(card, battingSide(card), 1);
    card.bases.third = null;
  } else if (card.bases.second) {
    card.bases.third = card.bases.second;
    card.bases.second = null;
  } else if (card.bases.first) {
    card.bases.second = card.bases.first;
    card.bases.first = null;
  }
}

export function undoLast(card: Scorecard): boolean {
  const last = card.log.pop();
  if (!last) return false;
  // For most undos we replay from a snapshot. Simpler: reverse known mutations.
  // Run undo
  if (last.kind === "run") {
    const m = last.text.match(/\+(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    const s = last.side === "home" ? card.home : card.away;
    s.runs -= n;
    if (s.linescore[card.currentInning - 1]) s.linescore[card.currentInning - 1] -= n;
  }
  if (last.kind === "out") {
    card.count.outs = Math.max(0, card.count.outs - 1);
  }
  if (last.kind === "ball") {
    card.count.balls = Math.max(0, card.count.balls - 1);
  }
  if (last.kind === "strikeSwing" || last.kind === "strikeLook" || last.kind === "foul" || last.kind === "foulTip") {
    card.count.strikes = Math.max(0, card.count.strikes - 1);
  }
  // For hits/in-play we just clear bases and reset count — best-effort
  if (["single","double","triple","homerun","error","hbp","groundOut","flyOut","lineOut","popOut","sacFly","sacBunt","fieldersChoice","sb","cs","wp","pb","balk","dp","tp"].includes(last.kind)) {
    card.count = { balls: 0, strikes: 0, outs: 0 };
  }
  if (last.kind === "halfInning" || last.kind === "inning") {
    // Reverse the half/inning transition
    if (card.half === "bottom") {
      card.half = "top";
    } else {
      card.half = "bottom";
      card.currentInning = Math.max(1, card.currentInning - 1);
    }
  }
  card.modifiedAt = Date.now();
  return true;
}

export function logFreeText(card: Scorecard, kind: EventKind, text: string) {
  logEvent(card, kind, battingSide(card), text);
}

export function endGame(card: Scorecard) {
  card.completed = true;
  const winSide = card.home.runs > card.away.runs ? "home" : "away";
  const winner = winSide === "home" ? card.home : card.away;
  logEvent(card, "note", winSide, `${winner.name} wins ${card.home.runs}-${card.away.runs}!`);
  card.modifiedAt = Date.now();
}
