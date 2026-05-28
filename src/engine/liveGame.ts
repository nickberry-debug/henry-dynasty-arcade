// Live Game engine — Henry inputs every pitch and swing. Outcomes resolved
// using his input + the fictional pitcher's / batter's ratings.
// Also records Henry's personal stat line in parallel.
import type { League, Team, Player } from "../store/types";
import { uid } from "../utils/rand";

export type Difficulty = "rookie" | "pro" | "allstar";

export interface LiveGamePlay {
  id: string;
  half: "top" | "bottom";
  inning: number;
  pitcherId: string;
  batterId: string;
  pitch?: { type: string; zoneCol: number; zoneRow: number; result: "strike" | "painted" | "close" | "ball" };
  swing?: { quality: "crushed" | "okay" | "weak" | "whiff"; netX: number; netY: number };
  outcome: string;
  runsScored: number;
  outs: number;
  ts: number;
}

export interface LiveGameState {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  innings: number;
  difficulty: Difficulty;
  half: "top" | "bottom";
  inning: number;
  outs: number;
  count: { balls: number; strikes: number };
  bases: { first: string | null; second: string | null; third: string | null };
  score: { home: number; away: number };
  linescore: { home: number[]; away: number[] };
  currentPitcherId: string;
  currentBatterId: string;
  pitchCount: { home: number; away: number };
  /** Pointer into lineup for next batter, per side. */
  battingIdx: { home: number; away: number };
  plays: LiveGamePlay[];
  /** Henry's personal stat tracking — always recorded regardless of what fictional player is at the plate. */
  henryStats: {
    pitchesThrown: number;
    strikes: number;
    paintedCorners: number;
    swings: number;
    crushed: number;
    whiffs: number;
    hits: number;
  };
  completed: boolean;
  startTime: number;
}

export function startLiveGame(lg: League, opts: { homeTeamId: string; awayTeamId: string; innings: number; difficulty: Difficulty }): LiveGameState {
  const home = lg.teams.find(t => t.id === opts.homeTeamId)!;
  const away = lg.teams.find(t => t.id === opts.awayTeamId)!;
  const homeRoster = lg.players.filter(p => p.teamId === home.id);
  const awayRoster = lg.players.filter(p => p.teamId === away.id);
  const homePitcher = homeRoster.find(p => p.isPitcher && p.position === "SP") ?? homeRoster.find(p => p.isPitcher)!;
  const awayPitcher = awayRoster.find(p => p.isPitcher && p.position === "SP") ?? awayRoster.find(p => p.isPitcher)!;
  const awayBatter = lineup(awayRoster)[0];
  // Top half: away bats
  return {
    id: uid("lg"),
    homeTeamId: home.id,
    awayTeamId: away.id,
    innings: opts.innings,
    difficulty: opts.difficulty,
    half: "top",
    inning: 1,
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: { first: null, second: null, third: null },
    score: { home: 0, away: 0 },
    linescore: { home: [], away: [] },
    currentPitcherId: homePitcher.id,
    currentBatterId: awayBatter.id,
    pitchCount: { home: 0, away: 0 },
    battingIdx: { home: 0, away: 0 },
    plays: [],
    henryStats: { pitchesThrown: 0, strikes: 0, paintedCorners: 0, swings: 0, crushed: 0, whiffs: 0, hits: 0 },
    completed: false,
    startTime: Date.now()
  };
}

function lineup(players: Player[]): Player[] {
  return players.filter(p => !p.isPitcher).sort((a, b) => b.overall - a.overall).slice(0, 9);
}

/** When the user's team is pitching, Henry threw a pitch. Resolve outcome. */
export function resolvePitchInput(lg: League, state: LiveGameState, input: { zoneCol: number; zoneRow: number; result: "strike" | "painted" | "close" | "ball"; pitchType: string }): LiveGamePlay {
  state.henryStats.pitchesThrown += 1;
  if (input.result === "strike" || input.result === "painted") state.henryStats.strikes += 1;
  if (input.result === "painted") state.henryStats.paintedCorners += 1;

  const pitcher = lg.players.find(p => p.id === state.currentPitcherId);
  const batter = lg.players.find(p => p.id === state.currentBatterId);
  if (!pitcher || !batter) return abortPlay(state, "Invalid pitcher/batter");

  // Pitcher control modifies Henry's input quality
  const ctrl = pitcher.ratings.pitches?.[0]?.ctrl ?? 50;
  // Henry's input quality is filtered: painted corners only stay painted if pitcher has elite control
  let effectiveResult = input.result;
  if (input.result === "painted" && ctrl < 60) {
    if (Math.random() < (60 - ctrl) / 60) effectiveResult = "close";
  }
  if (input.result === "strike" && ctrl < 40) {
    if (Math.random() < (40 - ctrl) / 80) effectiveResult = "close";
  }

  const diffMul = state.difficulty === "rookie" ? 0.7 : state.difficulty === "allstar" ? 1.3 : 1.0;

  // Apply pitch result to count
  let outcome = "";
  let runs = 0;
  let outs = 0;
  let crowd = "";
  if (effectiveResult === "ball" || effectiveResult === "close") {
    state.count.balls += 1;
    outcome = effectiveResult === "ball" ? "Ball" : "Just off";
    if (state.count.balls >= 4) {
      outcome = `Walk — ${batter.name} to 1B`;
      crowd = "👀";
      walkBatter(state);
    }
  } else {
    // Strike or painted — batter may swing or take based on rating
    const batContact = (batter.ratings.contactL + batter.ratings.contactR) / 2;
    const batPower = (batter.ratings.powerL + batter.ratings.powerR) / 2;
    // Difficulty affects who's "harder": when Henry pitches, higher difficulty
    // means hitters are tougher (swing more, make better contact).
    const swingChance = (effectiveResult === "painted" ? 0.32 : 0.58) * diffMul;
    if (Math.random() < swingChance) {
      // Quality score: how good Henry's pitch was. Higher = harder to hit.
      const qualityScore = effectiveResult === "painted" ? 88 : 65;
      // Whiff chance scales with pitch quality and INVERSELY with batter contact.
      // Pro difficulty target: ~28% of swings whiff on a strike, ~45% on painted.
      const whiffOdds = (qualityScore - batContact * 0.55) / 100;
      if (Math.random() < whiffOdds) {
        outcome = "Swing — and a MISS! Strike";
        state.count.strikes += 1;
        crowd = "💨";
      } else {
        // Contact made. Outcome bands tuned to real MLB per-contact rates:
        // HR 3%, Triple 0.5%, Double 5%, Single 22%, In-play out 69.5%
        // Skill tilt is small so the math doesn't run away for top hitters.
        const r = Math.random();
        const skillTilt = ((batPower - 60) / 400) + ((batContact - 60) / 600);
        const pitchPenalty = (qualityScore - 60) / 350;
        const eff = r + skillTilt - pitchPenalty;
        if (eff > 0.97) {
          outcome = `💥 HOME RUN — ${batter.name}!`;
          crowd = "🎆";
          const runners = countOnBase(state);
          runs = runners + 1;
          scoreRuns(state, runs);
          state.bases = { first: null, second: null, third: null };
          nextBatter(state, lg);
        } else if (eff > 0.965) {
          outcome = `Triple — ${batter.name}`;
          advanceRunners(state, 3, true, batter.id);
        } else if (eff > 0.915) {
          outcome = `Double — ${batter.name}`;
          advanceRunners(state, 2, true, batter.id);
        } else if (eff > 0.695) {
          outcome = `Single — ${batter.name}`;
          advanceRunners(state, 1, true, batter.id);
        } else {
          // In-play out — choose subtype for flavor
          const outType = Math.random();
          outcome = outType < 0.45 ? "Ground out" : outType < 0.85 ? "Fly out" : "Pop out";
          state.outs += 1;
          outs = 1;
          checkHalfEnd(state, lg);
        }
        state.count = { balls: 0, strikes: 0 };
      }
    } else {
      // Batter took the pitch
      state.count.strikes += 1;
      outcome = effectiveResult === "painted" ? "Painted! Called Strike" : "Called Strike";
      crowd = effectiveResult === "painted" ? "🔥" : "";
    }
    if (state.count.strikes >= 3) {
      outcome = `⚾ Strikeout — ${batter.name} ${outcome.includes("Swing") ? "swinging" : "looking"}!`;
      state.outs += 1;
      outs = 1;
      state.count = { balls: 0, strikes: 0 };
      nextBatter(state, lg);
      checkHalfEnd(state, lg);
    }
  }
  state.pitchCount[state.half === "top" ? "home" : "away"] += 1;

  const play: LiveGamePlay = {
    id: uid("lp"),
    half: state.half,
    inning: state.inning,
    pitcherId: state.currentPitcherId,
    batterId: state.currentBatterId,
    pitch: { type: input.pitchType, zoneCol: input.zoneCol, zoneRow: input.zoneRow, result: effectiveResult },
    outcome: outcome + (crowd ? ` ${crowd}` : ""),
    runsScored: runs,
    outs,
    ts: Date.now()
  };
  state.plays.push(play);
  return play;
}

/** When the user's team is batting, Henry took a swing. Resolve outcome. */
export function resolveSwingInput(lg: League, state: LiveGameState, input: { quality: "crushed" | "okay" | "weak" | "whiff"; netX: number; netY: number }): LiveGamePlay {
  state.henryStats.swings += 1;
  if (input.quality === "crushed") state.henryStats.crushed += 1;
  if (input.quality === "whiff") state.henryStats.whiffs += 1;

  const pitcher = lg.players.find(p => p.id === state.currentPitcherId);
  const batter = lg.players.find(p => p.id === state.currentBatterId);
  if (!pitcher || !batter) return abortPlay(state, "Invalid");

  const batContact = (batter.ratings.contactL + batter.ratings.contactR) / 2;
  const batPower = (batter.ratings.powerL + batter.ratings.powerR) / 2;
  const diffMul = state.difficulty === "rookie" ? 1.2 : state.difficulty === "allstar" ? 0.75 : 1.0;

  let outcome = "";
  let runs = 0;
  let outs = 0;
  let crowd = "";

  if (input.quality === "whiff") {
    state.count.strikes += 1;
    outcome = "Swing and miss";
    if (state.count.strikes >= 3) {
      outcome = `Strikeout — ${batter.name}`;
      state.outs += 1;
      outs = 1;
      state.count = { balls: 0, strikes: 0 };
      nextBatter(state, lg);
      checkHalfEnd(state, lg);
    }
  } else {
    const isGround = input.netY > 0.7;
    const isFly = input.netY < 0.35;
    // Pitcher quality reduces hitter advantage
    const pitcherCtrl = pitcher.ratings.pitches?.[0]?.ctrl ?? 50;
    const pitcherVelo = pitcher.ratings.pitches?.[0]?.velo ?? 88;
    const pitcherQuality = (pitcherCtrl + (pitcherVelo - 80) * 4) / 2; // 0..100
    // Swing quality maps to a base outcome tier. Tight bands so crushed lands
    // mostly in the hit zone (50-70%) but HR stays special (10-15%).
    const qBoost = input.quality === "crushed" ? 0.10 : input.quality === "okay" ? 0.00 : -0.18;
    const skillTilt = (batPower - 60) / 400 + (batContact - 60) / 600;
    const pitchPenalty = (pitcherQuality - 50) / 400;
    const r = Math.random();
    const eff = r + qBoost + skillTilt - pitchPenalty;
    state.henryStats.hits += (eff > 0.70) ? 1 : 0;

    if (input.quality === "crushed" && !isGround && eff > 0.97) {
      outcome = `💥 HOME RUN — ${batter.name}!`;
      crowd = "🎆";
      const runners = countOnBase(state);
      runs = runners + 1;
      scoreRuns(state, runs);
      state.bases = { first: null, second: null, third: null };
      nextBatter(state, lg);
    } else if (eff > 0.93 && !isGround) {
      outcome = `Triple — ${batter.name}`;
      advanceRunners(state, 3, true, batter.id);
    } else if (eff > 0.85) {
      outcome = `Double — ${batter.name}`;
      advanceRunners(state, 2, true, batter.id);
    } else if (eff > 0.70) {
      outcome = `Single — ${batter.name}`;
      advanceRunners(state, 1, true, batter.id);
    } else if (isGround) {
      outcome = "Ground out";
      state.outs += 1;
      outs = 1;
      checkHalfEnd(state, lg);
    } else if (isFly) {
      outcome = "Fly out";
      state.outs += 1;
      outs = 1;
      checkHalfEnd(state, lg);
    } else {
      outcome = "Lineout";
      state.outs += 1;
      outs = 1;
      checkHalfEnd(state, lg);
    }
    state.count = { balls: 0, strikes: 0 };
  }

  const play: LiveGamePlay = {
    id: uid("lp"),
    half: state.half,
    inning: state.inning,
    pitcherId: state.currentPitcherId,
    batterId: state.currentBatterId,
    swing: { quality: input.quality, netX: input.netX, netY: input.netY },
    outcome: outcome + (crowd ? ` ${crowd}` : ""),
    runsScored: runs,
    outs,
    ts: Date.now()
  };
  state.plays.push(play);
  return play;
}

function abortPlay(state: LiveGameState, reason: string): LiveGamePlay {
  return {
    id: uid("lp"), half: state.half, inning: state.inning,
    pitcherId: state.currentPitcherId, batterId: state.currentBatterId,
    outcome: reason, runsScored: 0, outs: 0, ts: Date.now()
  };
}

function countOnBase(state: LiveGameState): number {
  return [state.bases.first, state.bases.second, state.bases.third].filter(Boolean).length;
}

function scoreRuns(state: LiveGameState, n: number) {
  const side = state.half === "top" ? "away" : "home";
  state.score[side] += n;
  while (state.linescore[side].length < state.inning) state.linescore[side].push(0);
  state.linescore[side][state.inning - 1] += n;
}

function advanceRunners(state: LiveGameState, n: number, pushBatter: boolean, batterId: string) {
  let third = state.bases.third;
  let second = state.bases.second;
  let first = state.bases.first;
  const scored: string[] = [];
  for (let i = 0; i < n; i++) {
    if (third) { scored.push(third); third = null; }
    if (second) { third = second; second = null; }
    if (first) { second = first; first = null; }
    if (pushBatter && i === 0) { first = batterId; }
  }
  state.bases = { first, second, third };
  if (scored.length) scoreRuns(state, scored.length);
  nextBatter(state, null as any);
}

function walkBatter(state: LiveGameState) {
  // Force-push if needed
  let third = state.bases.third;
  let second = state.bases.second;
  let first = state.bases.first;
  if (first && second && third) {
    scoreRuns(state, 1);
  } else if (first && second) {
    third = second; second = first;
  } else if (first) {
    second = first;
  }
  first = state.currentBatterId;
  state.bases = { first, second, third };
  state.count = { balls: 0, strikes: 0 };
  nextBatter(state, null as any);
}

function nextBatter(state: LiveGameState, lg: League | null) {
  state.count = { balls: 0, strikes: 0 };
  if (!lg) return; // bases-only update path
  const battingSide = state.half === "top" ? "away" : "home";
  state.battingIdx[battingSide] = (state.battingIdx[battingSide] + 1) % 9;
  const teamId = battingSide === "away" ? state.awayTeamId : state.homeTeamId;
  const roster = lg.players.filter(p => p.teamId === teamId);
  const ln = lineup(roster);
  state.currentBatterId = ln[state.battingIdx[battingSide]]?.id ?? ln[0]?.id;
}

function checkHalfEnd(state: LiveGameState, lg: League) {
  if (state.outs >= 3) {
    if (state.half === "top") {
      state.half = "bottom";
    } else {
      state.half = "top";
      state.inning += 1;
    }
    state.outs = 0;
    state.count = { balls: 0, strikes: 0 };
    state.bases = { first: null, second: null, third: null };
    // Swap pitcher
    const newPitcherTeam = state.half === "top" ? state.homeTeamId : state.awayTeamId;
    const newBatterTeam = state.half === "top" ? state.awayTeamId : state.homeTeamId;
    const newPitcherRoster = lg.players.filter(p => p.teamId === newPitcherTeam);
    const newBatterRoster = lg.players.filter(p => p.teamId === newBatterTeam);
    state.currentPitcherId = (newPitcherRoster.find(p => p.isPitcher && p.position === "SP") ?? newPitcherRoster.find(p => p.isPitcher))?.id ?? state.currentPitcherId;
    const ln = lineup(newBatterRoster);
    state.currentBatterId = ln[state.battingIdx[state.half === "top" ? "away" : "home"]]?.id ?? ln[0]?.id;
    if (state.inning > state.innings) {
      if (state.score.home !== state.score.away) {
        state.completed = true;
      }
    }
  }
}

export function endLiveGame(state: LiveGameState) {
  state.completed = true;
}
