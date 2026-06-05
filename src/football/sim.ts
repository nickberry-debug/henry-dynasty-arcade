// Football game simulation. Drive-by-drive, with each drive producing a
// stream of FootballPlay objects that StatCastFootball can animate.
//
// This is a tactical simulator, not a physical one — outcomes are sampled
// from probabilities tuned by the offense's QB/RB/WR ratings and the
// defense's DB/LB/DL ratings. Per-play yardage is sampled from a long-
// tailed distribution so occasional big plays happen.
import type { FootballLeague, FootballGame, FootballPlay, FootballPlayer, FootballTeam, FootballPlayKind } from "./types";
import { rand, irnd, choice } from "../utils/rand";
import { generateFootballDrama } from "./drama";
import { updateFootballStorylines } from "./storylines";
import { checkAchievements, FOOTBALL_ACHIEVEMENTS } from "./achievements";

interface DriveCtx {
  league: FootballLeague;
  off: FootballTeam;
  def: FootballTeam;
  offRoster: FootballPlayer[];
  defRoster: FootballPlayer[];
  /** Field position 0..100 (own end zone = 0, opp end zone = 100). */
  yard: number;
  down: 1 | 2 | 3 | 4;
  toGo: number;
  plays: FootballPlay[];
  seq: number;
  quarter: 1 | 2 | 3 | 4 | 5;
  clock: number; // seconds remaining in current quarter
  scoreHome: number;
  scoreAway: number;
  homeId: string;
  awayId: string;
}

const QUARTER_SECONDS = 15 * 60;

export interface FootballGameResult {
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  plays: FootballPlay[];
  /** Per-player stats to apply. */
  statDeltas: Record<string, Partial<FootballPlayer["seasonStats"]>>;
}

export function simulateGame(lg: FootballLeague, game: FootballGame): FootballGameResult {
  const home = lg.teams.find(t => t.id === game.homeId)!;
  const away = lg.teams.find(t => t.id === game.awayId)!;
  const homeRoster = lg.players.filter(p => p.teamId === home.id && !p.retired && !p.injury);
  const awayRoster = lg.players.filter(p => p.teamId === away.id && !p.retired && !p.injury);

  const plays: FootballPlay[] = [];
  let seq = 0;
  let scoreHome = 0;
  let scoreAway = 0;

  // Kickoff to start.
  plays.push(kickoffPlay(seq++, home, away, 1, QUARTER_SECONDS, scoreHome, scoreAway));

  // Coin flip — who receives.
  let offensiveTeam: FootballTeam = rand() < 0.5 ? home : away;
  let defensiveTeam: FootballTeam = offensiveTeam.id === home.id ? away : home;
  let yard = 25; // start at own 25 after touchback

  let quarter: 1 | 2 | 3 | 4 | 5 = 1;
  let clock = QUARTER_SECONDS;

  const statDeltas: Record<string, Partial<FootballPlayer["seasonStats"]>> = {};
  const addStat = (pid: string, key: keyof FootballPlayer["seasonStats"], val: number) => {
    if (!statDeltas[pid]) statDeltas[pid] = {};
    (statDeltas[pid] as any)[key] = ((statDeltas[pid] as any)[key] ?? 0) + val;
  };

  // Simulate quarters
  while (quarter <= 4) {
    while (clock > 0) {
      const offRoster = offensiveTeam.id === home.id ? homeRoster : awayRoster;
      const defRoster = offensiveTeam.id === home.id ? awayRoster : homeRoster;

      const ctx: DriveCtx = {
        league: lg, off: offensiveTeam, def: defensiveTeam,
        offRoster, defRoster,
        yard, down: 1, toGo: 10,
        plays, seq, quarter, clock,
        scoreHome, scoreAway,
        homeId: home.id, awayId: away.id,
      };
      const driveResult = simulateDrive(ctx, addStat);
      seq = ctx.seq;
      scoreHome = ctx.scoreHome;
      scoreAway = ctx.scoreAway;
      clock = ctx.clock;
      quarter = ctx.quarter;

      // Possession flips after each drive.
      const swap = offensiveTeam;
      offensiveTeam = defensiveTeam;
      defensiveTeam = swap;

      // Field position after the drive's outcome.
      if (driveResult === "touchdown" || driveResult === "fieldGoal" || driveResult === "safety") {
        // After score, kickoff to receive at own ~25.
        if (clock > 5) {
          plays.push(kickoffPlay(seq++, offensiveTeam, defensiveTeam, quarter, clock, scoreHome, scoreAway));
        }
        yard = 25;
      } else if (driveResult === "punt") {
        // Punt nets ~40 yards. Receiving team starts ~25 yards from own EZ.
        yard = 25;
      } else if (driveResult === "interception" || driveResult === "fumble") {
        // Turnover — defense takes over near where they got it. Cap field position.
        yard = Math.max(15, Math.min(85, 100 - ctx.yard));
      } else if (driveResult === "turnoverOnDowns") {
        yard = Math.max(15, Math.min(85, 100 - ctx.yard));
      } else if (driveResult === "end-half") {
        break;
      }

      if (clock <= 0) break;
    }
    // End of quarter
    plays.push({
      seq: seq++, quarter, clock: 0, kind: quarter === 2 ? "end-half" : quarter === 4 ? "end-game" : "end-quarter",
      yards: 0, startYard: yard, endYard: yard, down: 0, toGo: 0,
      possessionId: offensiveTeam.id,
      scoreHome, scoreAway,
      text: quarter === 2 ? "End of the 2nd quarter — halftime!" : quarter === 4 ? "Final whistle — game over." : `End of Q${quarter}.`,
    });
    if (quarter < 4) {
      quarter = (quarter + 1) as any;
      clock = QUARTER_SECONDS;
      // At halftime, possession swaps to whoever DIDN'T receive opening kickoff.
      if (quarter === 3) {
        // Simple: keep the same team on offense to avoid having to track opening receiver.
        yard = 25;
      }
    } else {
      break;
    }
  }

  // Tie → quick OT drive (one possession each, sudden death rules simplified).
  if (scoreHome === scoreAway) {
    quarter = 5;
    clock = 600;
    const sides: FootballTeam[] = [home, away];
    for (const t of sides) {
      if (scoreHome !== scoreAway) break;
      const off = t;
      const def = t.id === home.id ? away : home;
      const offRoster = t.id === home.id ? homeRoster : awayRoster;
      const defRoster = t.id === home.id ? awayRoster : homeRoster;
      const ctx: DriveCtx = {
        league: lg, off, def, offRoster, defRoster,
        yard: 25, down: 1, toGo: 10,
        plays, seq, quarter, clock,
        scoreHome, scoreAway,
        homeId: home.id, awayId: away.id,
      };
      simulateDrive(ctx, addStat);
      seq = ctx.seq; scoreHome = ctx.scoreHome; scoreAway = ctx.scoreAway; clock = ctx.clock;
    }
  }

  return {
    homeId: home.id,
    awayId: away.id,
    homeScore: scoreHome,
    awayScore: scoreAway,
    plays,
    statDeltas,
  };
}

function kickoffPlay(seq: number, off: FootballTeam, def: FootballTeam, quarter: any, clock: number, sh: number, sa: number): FootballPlay {
  return {
    seq, quarter, clock,
    kind: "kickoff",
    yards: 65,
    startYard: 35, endYard: 25,
    down: 0, toGo: 0,
    possessionId: off.id,
    scoreHome: sh, scoreAway: sa,
    text: `${off.name} kick off. Touchback. ${def.name} ball at the 25.`,
  };
}

/** Run one drive. Returns the outcome. Mutates ctx (yard/down/plays/seq/clock/score/quarter). */
function simulateDrive(ctx: DriveCtx, addStat: (pid: string, key: keyof FootballPlayer["seasonStats"], val: number) => void): "touchdown" | "fieldGoal" | "punt" | "interception" | "fumble" | "turnoverOnDowns" | "safety" | "end-half" {
  let { off, def } = ctx;
  const qb = pickStarter(ctx.offRoster, "QB");
  const rb = pickStarter(ctx.offRoster, "RB");
  const wrPool = ctx.offRoster.filter(p => p.position === "WR" || p.position === "TE");
  const k = pickStarter(ctx.offRoster, "K");
  const dlPool = ctx.defRoster.filter(p => p.position === "DL" || p.position === "LB");
  const dbPool = ctx.defRoster.filter(p => p.position === "CB" || p.position === "S");
  const offRating = teamOffense(ctx.offRoster);
  const defRating = teamDefense(ctx.defRoster);

  // Drive cap to prevent infinite loops.
  for (let p = 0; p < 18; p++) {
    if (ctx.clock <= 0) return "end-half";
    // 4th-down decision: punt (own 50 or worse) or FG (within 38 yards = our yard >= 62)
    if (ctx.down === 4) {
      if (ctx.yard >= 62) {
        const fgYards = 100 - ctx.yard + 17;
        const makeChance = Math.max(0.25, 0.95 - (fgYards - 25) * 0.018);
        if (rand() < makeChance) {
          const points = 3;
          if (off.id === ctx.homeId) ctx.scoreHome += points; else ctx.scoreAway += points;
          ctx.plays.push({
            seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 6),
            kind: "fieldGoal",
            yards: 0, startYard: ctx.yard, endYard: 100,
            down: 4, toGo: ctx.toGo,
            possessionId: off.id,
            scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
            text: `${k?.name ?? "K"} hits a ${fgYards}-yard field goal! ${off.abbr} ${points} points.`,
          });
          if (k) { addStat(k.id, "fgMade", 1); addStat(k.id, "fgAtt", 1); }
          return "fieldGoal";
        } else {
          ctx.plays.push({
            seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 6),
            kind: "fieldGoal",
            yards: 0, startYard: ctx.yard, endYard: ctx.yard,
            down: 4, toGo: ctx.toGo,
            possessionId: off.id,
            scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
            text: `${k?.name ?? "K"} misses a ${fgYards}-yard field goal. Wide right.`,
          });
          if (k) addStat(k.id, "fgAtt", 1);
          return "turnoverOnDowns";
        }
      } else if (ctx.yard < 50 || ctx.toGo > 4) {
        // Punt
        const puntDist = irnd(38, 52);
        const endYard = Math.max(15, Math.min(95, ctx.yard + puntDist));
        ctx.plays.push({
          seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 6),
          kind: "punt",
          yards: puntDist, startYard: ctx.yard, endYard,
          down: 4, toGo: ctx.toGo,
          possessionId: off.id,
          scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
          text: `Punt — ${puntDist} yards. ${def.abbr} ball at their ${100 - endYard}.`,
        });
        ctx.yard = endYard;
        return "punt";
      }
      // Go for it on 4th down if short to go and past midfield — keep playing.
    }

    // Choose run vs pass. Bias by down/distance and team strength.
    const passProb = ctx.toGo >= 7 ? 0.72 : ctx.toGo <= 3 ? 0.42 : 0.58;
    const callPass = rand() < passProb;

    if (callPass) {
      runPassPlay(ctx, qb, wrPool, dbPool, dlPool, offRating, defRating, addStat);
    } else {
      runRushPlay(ctx, rb, dlPool, offRating, defRating, addStat);
    }

    // Check for end-zone breach → TD
    if (ctx.yard >= 100) {
      const points = 6;
      // Extra point
      const xpMake = rand() < 0.94;
      const extraPts = xpMake ? 1 : 0;
      if (off.id === ctx.homeId) ctx.scoreHome += points + extraPts;
      else ctx.scoreAway += points + extraPts;
      if (k) { addStat(k.id, "xpAtt", 1); if (xpMake) addStat(k.id, "xpMade", 1); }
      ctx.plays.push({
        seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 5),
        kind: "extraPoint",
        yards: 0, startYard: 98, endYard: 100,
        down: 0, toGo: 0,
        possessionId: off.id,
        scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
        text: xpMake ? `Extra point: GOOD.` : `Extra point: NO GOOD.`,
      });
      return "touchdown";
    }

    if (ctx.clock <= 0) return "end-half";
  }

  return "turnoverOnDowns";
}

function runPassPlay(ctx: DriveCtx, qb: FootballPlayer | undefined, wrPool: FootballPlayer[], dbPool: FootballPlayer[], dlPool: FootballPlayer[], offRating: number, defRating: number, addStat: (pid: string, key: keyof FootballPlayer["seasonStats"], val: number) => void) {
  if (!qb) qb = ctx.offRoster[0];
  const wr = wrPool.length > 0 ? choice(wrPool) : undefined;
  const cover = dbPool.length > 0 ? choice(dbPool) : undefined;
  const rusher = dlPool.length > 0 ? choice(dlPool) : undefined;
  const passAcc = qb?.ratings.accuracy ?? 60;
  const passArm = qb?.ratings.armStrength ?? 60;
  const coverage = cover?.ratings.coverage ?? 60;
  const passRush = rusher?.ratings.passRush ?? 60;

  // Sack check first
  const sackChance = Math.min(0.18, 0.04 + (passRush - 60) * 0.003);
  if (rand() < sackChance) {
    const loss = irnd(3, 9);
    ctx.yard = Math.max(0, ctx.yard - loss);
    if (qb) { addStat(qb.id, "sacked", 1); }
    if (rusher) { addStat(rusher.id, "sacks", 1); addStat(rusher.id, "tackles", 1); }
    ctx.plays.push({
      seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 6),
      kind: "sack",
      yards: -loss, startYard: ctx.yard + loss, endYard: ctx.yard,
      down: ctx.down, toGo: ctx.toGo,
      possessionId: ctx.off.id,
      passer: qb?.id, defender: rusher?.id,
      scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
      text: `${rusher?.lastName ?? "Defense"} sacks ${qb?.lastName ?? "QB"} for a loss of ${loss}.`,
    });
    advanceDown(ctx, -loss);
    return;
  }

  // INT check
  const intChance = Math.max(0.005, 0.025 + (coverage - passAcc) * 0.0025);
  if (rand() < intChance) {
    const returnYards = irnd(0, 25);
    if (qb) { addStat(qb.id, "passAtt", 1); addStat(qb.id, "passInt", 1); }
    if (cover) { addStat(cover.id, "interceptions", 1); addStat(cover.id, "tackles", 1); }
    ctx.plays.push({
      seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 9),
      kind: "interception",
      yards: -returnYards, startYard: ctx.yard, endYard: Math.max(0, ctx.yard - returnYards),
      down: ctx.down, toGo: ctx.toGo,
      possessionId: ctx.off.id,
      passer: qb?.id, defender: cover?.id,
      scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
      text: `INTERCEPTION! ${cover?.lastName ?? "Defender"} picks off ${qb?.lastName ?? "QB"} and returns it ${returnYards}.`,
    });
    ctx.yard = Math.max(0, ctx.yard - returnYards);
    advanceDown(ctx, -returnYards);
    ctx.down = 1; ctx.toGo = 10; // not really used but reset
    return;
  }

  // Incomplete?
  const completionChance = Math.min(0.85, (passAcc / 100) - (coverage - 60) * 0.003 + 0.1);
  if (rand() > completionChance) {
    if (qb) addStat(qb.id, "passAtt", 1);
    if (wr) addStat(wr.id, "targets", 1);
    ctx.plays.push({
      seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 4),
      kind: "incomplete",
      yards: 0, startYard: ctx.yard, endYard: ctx.yard,
      down: ctx.down, toGo: ctx.toGo,
      possessionId: ctx.off.id,
      passer: qb?.id, receiver: wr?.id,
      scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
      text: `${qb?.lastName ?? "QB"}'s pass to ${wr?.lastName ?? "the receiver"} falls incomplete.`,
    });
    advanceDown(ctx, 0);
    return;
  }

  // Completion — sample distance
  const isDeep = rand() < 0.18;
  const isMedium = !isDeep && rand() < 0.4;
  let gain: number;
  let kind: FootballPlayKind;
  if (isDeep) {
    gain = irnd(20, 55);
    kind = "longPass";
  } else if (isMedium) {
    gain = irnd(10, 22);
    kind = "mediumPass";
  } else {
    gain = irnd(3, 11);
    kind = "shortPass";
  }
  // Big play boost: top WR + big-arm QB occasionally breaks loose
  if (rand() < 0.04) gain += irnd(15, 30);
  ctx.yard = Math.min(100, ctx.yard + gain);
  if (qb) { addStat(qb.id, "passAtt", 1); addStat(qb.id, "passComp", 1); addStat(qb.id, "passYds", gain); }
  if (wr) { addStat(wr.id, "targets", 1); addStat(wr.id, "receptions", 1); addStat(wr.id, "recYds", gain); }
  const isTD = ctx.yard >= 100;
  if (isTD) {
    if (qb) addStat(qb.id, "passTD", 1);
    if (wr) addStat(wr.id, "recTD", 1);
  }
  ctx.plays.push({
    seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, isDeep ? 12 : isMedium ? 8 : 6),
    kind: isTD ? "touchdown" : kind,
    yards: gain, startYard: ctx.yard - gain, endYard: ctx.yard,
    down: ctx.down, toGo: ctx.toGo,
    possessionId: ctx.off.id,
    passer: qb?.id, receiver: wr?.id,
    scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
    text: isTD
      ? `TOUCHDOWN! ${qb?.lastName ?? "QB"} finds ${wr?.lastName ?? "the receiver"} for a ${gain}-yard score!`
      : `${qb?.lastName ?? "QB"} hits ${wr?.lastName ?? "the receiver"} for ${gain} yards.`,
  });
  if (!isTD) advanceDown(ctx, gain);
}

function runRushPlay(ctx: DriveCtx, rb: FootballPlayer | undefined, dlPool: FootballPlayer[], offRating: number, defRating: number, addStat: (pid: string, key: keyof FootballPlayer["seasonStats"], val: number) => void) {
  if (!rb) rb = ctx.offRoster.find(p => p.position === "RB") ?? ctx.offRoster[0];
  const tackler = dlPool.length > 0 ? choice(dlPool) : undefined;
  const speed = rb?.ratings.speed ?? 60;
  const breakT = rb?.ratings.breakTackle ?? 60;
  const runDef = tackler?.ratings.runDefense ?? 60;

  // Fumble check (rare)
  if (rand() < 0.015) {
    const recovered = rand() < 0.5;
    if (rb) addStat(rb.id, "fumbles", 1);
    if (!recovered) {
      ctx.plays.push({
        seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, 5),
        kind: "fumble",
        yards: 0, startYard: ctx.yard, endYard: ctx.yard,
        down: ctx.down, toGo: ctx.toGo,
        possessionId: ctx.off.id,
        rusher: rb?.id, defender: tackler?.id,
        scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
        text: `FUMBLE! ${rb?.lastName ?? "RB"} coughs it up — defense recovers!`,
      });
      if (tackler) { addStat(tackler.id, "forcedFumbles", 1); }
      advanceDown(ctx, -100); // treat as turnover — but use sentinel
      ctx.down = 1; ctx.toGo = 10;
      return;
    }
  }

  // Sample yardage — long tail for breakaway runs
  const baseRoll = rand();
  let gain: number;
  if (baseRoll < 0.6) gain = irnd(0, 4);
  else if (baseRoll < 0.9) gain = irnd(4, 9);
  else if (baseRoll < 0.98) gain = irnd(8, 18);
  else gain = irnd(15, 50);
  // Tackle skill subtracts
  gain = Math.max(-2, Math.round(gain + (breakT - runDef) * 0.06));
  ctx.yard = Math.min(100, Math.max(0, ctx.yard + gain));
  if (rb) { addStat(rb.id, "rushAtt", 1); addStat(rb.id, "rushYds", gain); }
  if (tackler) addStat(tackler.id, "tackles", 1);
  const isTD = ctx.yard >= 100;
  if (isTD && rb) addStat(rb.id, "rushTD", 1);
  ctx.plays.push({
    seq: ctx.seq++, quarter: ctx.quarter, clock: tickClock(ctx, gain > 10 ? 8 : 5),
    kind: isTD ? "touchdown" : "run",
    yards: gain, startYard: ctx.yard - gain, endYard: ctx.yard,
    down: ctx.down, toGo: ctx.toGo,
    possessionId: ctx.off.id,
    rusher: rb?.id, defender: tackler?.id,
    scoreHome: ctx.scoreHome, scoreAway: ctx.scoreAway,
    text: isTD
      ? `TOUCHDOWN! ${rb?.lastName ?? "RB"} breaks free for a ${gain}-yard score!`
      : gain <= 0
        ? `${rb?.lastName ?? "RB"} stuffed for ${gain === 0 ? "no gain" : `a loss of ${-gain}`}.`
        : `${rb?.lastName ?? "RB"} runs for ${gain} yards${tackler ? `, tackled by ${tackler.lastName}` : ""}.`,
  });
  if (!isTD) advanceDown(ctx, gain);
}

function advanceDown(ctx: DriveCtx, gain: number) {
  if (gain <= -50) {
    // turnover sentinel; caller resets.
    return;
  }
  ctx.toGo -= gain;
  if (ctx.toGo <= 0) {
    ctx.down = 1;
    ctx.toGo = 10;
  } else {
    ctx.down = Math.min(4, (ctx.down + 1)) as any;
  }
}

function tickClock(ctx: DriveCtx, baseSec: number): number {
  // Each play burns clock; if elapsed exceeds quarter, snap to 0.
  const elapsed = baseSec + irnd(20, 38);
  ctx.clock = Math.max(0, ctx.clock - elapsed);
  return ctx.clock;
}

function pickStarter(roster: FootballPlayer[], pos: string): FootballPlayer | undefined {
  const candidates = roster.filter(p => p.position === pos).sort((a, b) => b.overall - a.overall);
  return candidates[0];
}

function teamOffense(roster: FootballPlayer[]): number {
  const qb = roster.find(p => p.position === "QB");
  const rb = roster.find(p => p.position === "RB");
  const wrs = roster.filter(p => p.position === "WR").slice(0, 3);
  const ol = roster.filter(p => p.position === "OL").slice(0, 5);
  const r = (a: number) => Math.max(50, a);
  return r((qb?.overall ?? 60) * 0.35 + (rb?.overall ?? 60) * 0.15 + (avgOf(wrs.map(w => w.overall)) ?? 60) * 0.25 + (avgOf(ol.map(o => o.overall)) ?? 60) * 0.25);
}

function teamDefense(roster: FootballPlayer[]): number {
  const dl = roster.filter(p => p.position === "DL").slice(0, 4);
  const lb = roster.filter(p => p.position === "LB").slice(0, 3);
  const db = roster.filter(p => p.position === "CB" || p.position === "S").slice(0, 4);
  const r = (a: number) => Math.max(50, a);
  return r((avgOf(dl.map(p => p.overall)) ?? 60) * 0.4 + (avgOf(lb.map(p => p.overall)) ?? 60) * 0.25 + (avgOf(db.map(p => p.overall)) ?? 60) * 0.35);
}

function avgOf(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Apply a game result onto the league — updates scoreboard + per-player stats. */
export function applyResult(lg: FootballLeague, game: FootballGame, result: FootballGameResult) {
  game.played = true;
  game.score = { home: result.homeScore, away: result.awayScore };
  game.plays = result.plays;
  const home = lg.teams.find(t => t.id === result.homeId)!;
  const away = lg.teams.find(t => t.id === result.awayId)!;
  if (result.homeScore > result.awayScore) { home.wins++; away.losses++; }
  else if (result.awayScore > result.homeScore) { away.wins++; home.losses++; }
  else { home.ties++; away.ties++; }
  home.pointsFor += result.homeScore; home.pointsAgainst += result.awayScore;
  away.pointsFor += result.awayScore; away.pointsAgainst += result.homeScore;
  // Stats
  for (const [pid, delta] of Object.entries(result.statDeltas)) {
    const player = lg.players.find(p => p.id === pid);
    if (!player) continue;
    player.seasonStats.games += 1;
    for (const [k, v] of Object.entries(delta)) {
      (player.seasonStats as any)[k] = ((player.seasonStats as any)[k] ?? 0) + (v as number);
    }
  }
  lg.modifiedAt = Date.now();
}

export function simWeek(lg: FootballLeague): number {
  const weekGames = lg.schedule.filter(g => g.week === lg.week && !g.played);
  for (const game of weekGames) {
    const result = simulateGame(lg, game);
    applyResult(lg, game, result);
  }
  // Post the biggest scores to news.
  const newsItems = [...weekGames].sort((a, b) => Math.abs((b.score?.home ?? 0) - (b.score?.away ?? 0)) - Math.abs((a.score?.home ?? 0) - (a.score?.away ?? 0)));
  for (const g of newsItems.slice(0, 3)) {
    const home = lg.teams.find(t => t.id === g.homeId)!;
    const away = lg.teams.find(t => t.id === g.awayId)!;
    lg.newsLog.unshift({
      id: `fn-${g.id}`,
      week: lg.week,
      season: lg.season,
      category: "Game",
      headline: `${away.abbr} ${g.score?.away} — ${home.abbr} ${g.score?.home}`,
      important: Math.abs((g.score?.home ?? 0) - (g.score?.away ?? 0)) >= 21,
      teamIds: [home.id, away.id],
      emoji: "🏈",
    });
  }
  // Drama events for the week
  try { generateFootballDrama(lg, irnd(2, 4)); } catch { /* never block sim */ }
  // Shared-engine storyline tracking — rivalries, MVP races, streaks,
  // playoff pushes. Populates lg.storylines (StorylineState from
  // /src/sports-engine), surfaced on the News page + ticker.
  try { updateFootballStorylines(lg); } catch { /* never block sim */ }

  // Check + push achievement unlocks
  try {
    const newly = checkAchievements(lg);
    for (const id of newly) {
      const ach = FOOTBALL_ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        lg.newsLog.unshift({
          id: `fa-${id}-${Date.now()}`,
          week: lg.week,
          season: lg.season,
          category: "Milestone",
          headline: `${ach.emoji} Achievement Unlocked: ${ach.title} — ${ach.desc}`,
          important: true,
          emoji: ach.emoji,
        });
      }
    }
  } catch { /* never block sim */ }

  if (lg.newsLog.length > 200) lg.newsLog.length = 200;
  lg.week++;
  lg.modifiedAt = Date.now();

  // Tick down injuries by a week.
  for (const p of lg.players) {
    if (p.injury) {
      p.injury.weeksOut -= 1;
      if (p.injury.weeksOut <= 0) p.injury = null;
    }
  }

  return weekGames.length;
}
