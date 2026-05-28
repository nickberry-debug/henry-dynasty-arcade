import type { Game, Player, League, Team } from "../store/types";
import { getTeam, rosterOf } from "./league";
import { rand, irnd, choice, clamp, gauss } from "../utils/rand";

export interface Play {
  inning: number;
  top: boolean;
  outs: number;
  bases: [string | null, string | null, string | null];
  text: string;
  kind: "k" | "bb" | "out" | "hit" | "hr" | "event" | "end" | "info";
  pitcher: string;
  batter: string;
  scoreAway: number;
  scoreHome: number;
  pitch?: { type: string; velo: number };
  count?: { b: number; s: number };
  runs?: number;
}

export interface GameResult {
  homeId: string;
  awayId: string;
  homeRuns: number;
  awayRuns: number;
  innings: Array<{ inning: number; top: boolean; runs: number }>;
  linescore: { home: number[]; away: number[]; homeH: number; awayH: number };
  playerStats: Record<string, any>;
  plays: Play[];
  highlights: string[];
}

export interface SimOpts {
  recordPlays?: boolean;
  parkFactor?: number;
  weather?: { temp: number; wind: number; precip: boolean };
  universalDH?: boolean;
}

export function simulateGame(lg: League, game: Game, opts: SimOpts = {}): GameResult {
  const home = getTeam(lg, game.homeId);
  const away = getTeam(lg, game.awayId);
  if (!home || !away) throw new Error("Team missing");
  const homeRoster = rosterOf(lg, home.id);
  const awayRoster = rosterOf(lg, away.id);

  const homeLineup = pickLineup(homeRoster, opts.universalDH ?? true, home.rosterOrder);
  const awayLineup = pickLineup(awayRoster, opts.universalDH ?? true, away.rosterOrder);
  const homePitchers = homeRoster.filter(p => p.isPitcher && !p.injury);
  const awayPitchers = awayRoster.filter(p => p.isPitcher && !p.injury);
  let homeSP = pickStartingPitcher(homePitchers);
  let awaySP = pickStartingPitcher(awayPitchers);
  let homeP = homeSP;
  let awayP = awaySP;

  const result: GameResult = {
    homeId: home.id, awayId: away.id,
    homeRuns: 0, awayRuns: 0,
    innings: [],
    linescore: { home: [], away: [], homeH: 0, awayH: 0 },
    playerStats: {},
    plays: [],
    highlights: []
  };

  const stats = (p: Player) => {
    if (!result.playerStats[p.id]) {
      result.playerStats[p.id] = {
        hitting: { ab: 0, h: 0, "2b": 0, "3b": 0, hr: 0, r: 0, rbi: 0, bb: 0, k: 0, sb: 0 },
        pitching: { outs: 0, h: 0, er: 0, bb: 0, k: 0, hr: 0, gs: 0, w: 0, l: 0, sv: 0 }
      };
    }
    return result.playerStats[p.id];
  };
  if (homeP) stats(homeP).pitching.gs = 1;
  if (awayP) stats(awayP).pitching.gs = 1;

  const parkFactor = opts.parkFactor ?? home.stadium.parkFactor;
  const altMod = home.stadium.altitude > 4000 ? 1.10 : home.stadium.altitude > 2000 ? 1.04 : 1.0;
  const weatherMod = opts.weather ? weatherMultiplier(opts.weather) : 1.0;

  let inning = 1, top = true;
  let homeIdx = 0, awayIdx = 0;

  while (true) {
    const lineup = top ? awayLineup : homeLineup;
    const getIdx = () => top ? awayIdx : homeIdx;
    const advIdx = () => { if (top) awayIdx = (awayIdx + 1) % lineup.length; else homeIdx = (homeIdx + 1) % lineup.length; };
    const pitcher = top ? homeP : awayP;
    if (!pitcher) break;

    let outs = 0;
    let bases: [Player | null, Player | null, Player | null] = [null, null, null];
    let halfRuns = 0;
    const halfPlays: Play[] = [];

    while (outs < 3) {
      const batter = lineup[getIdx()];
      const bStats = stats(batter);
      const pStats = stats(pitcher);
      bStats.hitting.ab++;
      const ab = simulateAtBat(batter, pitcher, { parkFactor: parkFactor * altMod * weatherMod });

      let kind: Play["kind"] = "out";
      let text = "";
      let scoredRuns = 0;
      const runnersBefore = bases.filter(Boolean) as Player[];

      if (ab.result === "K") {
        outs++; bStats.hitting.k++; pStats.pitching.k++; pStats.pitching.outs++;
        kind = "k";
        text = `${batter.lastName} strikes out ${rand() < 0.5 ? "swinging" : "looking"}.`;
      } else if (ab.result === "BB") {
        pStats.pitching.bb++; bStats.hitting.bb++;
        scoredRuns = advanceBases(bases, batter, 1, true);
        if (scoredRuns) { pStats.pitching.er += scoredRuns; bStats.hitting.rbi += scoredRuns; }
        kind = "bb";
        text = `${batter.lastName} walks.${scoredRuns ? ` ${scoredRuns} run scores.` : ""}`;
      } else if (ab.result === "HBP") {
        scoredRuns = advanceBases(bases, batter, 1, true);
        kind = "event";
        text = `${batter.lastName} is hit by the pitch!`;
      } else if (ab.result === "OUT") {
        outs++; pStats.pitching.outs++;
        let extra = "";
        if (ab.outType?.includes("fl") && bases[2] && outs < 3 && rand() < 0.55) {
          scoredRuns++; pStats.pitching.er++; bStats.hitting.rbi++;
          if (bases[2]) stats(bases[2]).hitting.r++;
          extra = ` ${bases[2]!.lastName} tags up and scores.`;
          bases[2] = null;
        }
        text = `${batter.lastName} ${ab.outType}.${extra}`;
      } else {
        bStats.hitting.h++; pStats.pitching.h++;
        if (ab.result === "HR") {
          bStats.hitting.hr++; pStats.pitching.hr++; bStats.hitting.r++;
          kind = "hr";
        } else {
          kind = "hit";
        }
        if (ab.result === "2B") bStats.hitting["2b"]++;
        if (ab.result === "3B") bStats.hitting["3b"]++;
        const gain = ab.result === "1B" ? 1 : ab.result === "2B" ? 2 : ab.result === "3B" ? 3 : 4;
        scoredRuns = advanceBases(bases, batter, gain, false);
        if (ab.result === "HR") {
          runnersBefore.forEach(r => stats(r).hitting.r++);
        } else {
          for (let i = 0; i < scoredRuns; i++) {
            if (runnersBefore[i]) stats(runnersBefore[i]).hitting.r++;
          }
        }
        bStats.hitting.rbi += scoredRuns;
        pStats.pitching.er += scoredRuns;
        const verb = ab.result === "HR"
          ? `crushes a ${ab.distance}-foot HOME RUN`
          : ab.result === "3B"
          ? "rips a triple"
          : ab.result === "2B"
          ? "doubles into the gap"
          : "lines a single";
        text = `${batter.lastName} ${verb}!${scoredRuns ? ` ${scoredRuns} run${scoredRuns > 1 ? "s" : ""} score${scoredRuns === 1 ? "s" : ""}.` : ""}`;
        if (ab.result === "HR" && scoredRuns >= 3) {
          result.highlights.push(`${batter.name} crushed a grand slam in inning ${inning}!`);
        }
      }
      halfRuns += scoredRuns;
      advIdx();
      if (opts.recordPlays) {
        halfPlays.push({
          inning, top, outs,
          bases: [bases[0]?.lastName ?? null, bases[1]?.lastName ?? null, bases[2]?.lastName ?? null],
          text, kind,
          pitcher: pitcher.lastName,
          batter: batter.lastName,
          scoreHome: result.homeRuns + (top ? 0 : halfRuns),
          scoreAway: result.awayRuns + (top ? halfRuns : 0),
          pitch: ab.pitch,
          count: ab.count,
          runs: scoredRuns
        });
      }
    }
    if (top) { result.awayRuns += halfRuns; result.linescore.away.push(halfRuns); }
    else { result.homeRuns += halfRuns; result.linescore.home.push(halfRuns); }
    result.innings.push({ inning, top, runs: halfRuns });
    if (opts.recordPlays) {
      halfPlays.push({
        inning, top, outs: 3,
        bases: [null, null, null],
        text: `End of ${top ? "top" : "bottom"} ${inning}. ${top ? away.abbr : home.abbr} ${halfRuns} run${halfRuns !== 1 ? "s" : ""}.`,
        kind: "end",
        pitcher: pitcher.lastName, batter: "",
        scoreHome: result.homeRuns, scoreAway: result.awayRuns,
        runs: halfRuns
      });
      result.plays.push(...halfPlays);
    }

    if (!top && inning >= 9 && result.homeRuns !== result.awayRuns) break;
    if (top && inning >= 9 && result.homeRuns > result.awayRuns) break;
    if (inning >= 15) break;
    if (!top) inning++;
    top = !top;

    // Substitution logic
    const cur = top ? homeP : awayP;
    const pIp = stats(cur).pitching.outs / 3;
    const stam = cur.ratings.stamina || 60;
    const isStarter = cur.position === "SP";
    const fatigueLimit = isStarter ? (5.4 + (stam - 60) / 28) : 1.4;
    if (pIp >= fatigueLimit) {
      const pool = (top ? homePitchers : awayPitchers).filter(x => x.id !== cur.id && !x.injury && (stats(x).pitching.outs === 0));
      const margin = Math.abs(result.homeRuns - result.awayRuns);
      let next: Player | undefined;
      if (inning >= 9 && margin <= 3) {
        next = pool.find(p => p.position === "CL") || pool.find(p => p.position === "RP") || pool[0];
      } else {
        next = pool.find(p => p.position === "RP") || pool.find(p => p.position === "CL") || pool[0];
      }
      if (next) {
        if (top) homeP = next; else awayP = next;
      }
    }
  }

  // Compute IP in standard form (innings.partial outs/3)
  Object.values(result.playerStats).forEach((s: any) => {
    if (s.pitching) {
      const outs = s.pitching.outs;
      s.pitching.ip = Math.round((outs / 3) * 10) / 10;
    }
  });

  // W/L/SV
  const winningHome = result.homeRuns > result.awayRuns;
  const winSP = winningHome ? homeSP : awaySP;
  const loseSP = winningHome ? awaySP : homeSP;
  if (winSP && result.playerStats[winSP.id]) result.playerStats[winSP.id].pitching.w = 1;
  if (loseSP && result.playerStats[loseSP.id]) result.playerStats[loseSP.id].pitching.l = 1;
  const margin = Math.abs(result.homeRuns - result.awayRuns);
  if (margin <= 3) {
    const cp = (winningHome ? homePitchers : awayPitchers).find(p => p.position === "CL");
    if (cp && result.playerStats[cp.id]?.pitching.outs > 0) result.playerStats[cp.id].pitching.sv = 1;
  }

  // Hits totals
  Object.entries(result.playerStats).forEach(([pid, s]: any) => {
    if (!s.hitting) return;
    const player = lg.players.find(p => p.id === pid);
    if (!player) return;
    if (player.teamId === home.id) result.linescore.homeH += s.hitting.h;
    else if (player.teamId === away.id) result.linescore.awayH += s.hitting.h;
  });

  return result;
}

function pickLineup(roster: Player[], universalDH: boolean, rosterOrder?: string[]): Player[] {
  const healthy = roster.filter(p => !p.injury);
  const fielders = healthy.filter(p => !p.isPitcher);
  if (!universalDH) {
    // Pitchers bat at 9 — current sim ignores DH details; left intact.
  }
  // If the team has a saved rosterOrder from the user's Lineup tab,
  // honor it: take the first 9 healthy non-pitchers in that order, then
  // fall back to best-available to fill any holes (e.g. an injured
  // starter the user hasn't replaced).
  if (rosterOrder && rosterOrder.length > 0) {
    const byId = new Map(fielders.map(p => [p.id, p]));
    const ordered: Player[] = [];
    const used = new Set<string>();
    for (const id of rosterOrder) {
      const p = byId.get(id);
      if (p && !used.has(id)) { ordered.push(p); used.add(id); if (ordered.length >= 9) break; }
    }
    if (ordered.length >= 9) return ordered.slice(0, 9);
    // Fill any remaining slots with best-available, by overall.
    const rest = fielders.filter(p => !used.has(p.id)).sort((a, b) => b.overall - a.overall);
    for (const p of rest) {
      ordered.push(p); used.add(p.id);
      if (ordered.length >= 9) break;
    }
    return ordered.slice(0, 9);
  }
  // No user-set order — original best-by-position auto-lineup.
  const sorted = fielders.slice().sort((a, b) => b.overall - a.overall);
  const positions = ["C","1B","2B","3B","SS","LF","CF","RF","DH"];
  const lineup: Player[] = [];
  const used = new Set<string>();
  positions.forEach(pos => {
    const best = sorted.find(p => p.position === pos && !used.has(p.id));
    if (best) { lineup.push(best); used.add(best.id); }
  });
  let i = 0;
  while (lineup.length < 9 && i < sorted.length) {
    const p = sorted[i++];
    if (!used.has(p.id)) { lineup.push(p); used.add(p.id); }
  }
  return lineup.slice(0, 9);
}

function pickStartingPitcher(pitchers: Player[]): Player {
  const sps = pitchers.filter(p => p.position === "SP");
  if (sps.length === 0) return pitchers[0];
  return sps.sort((a, b) => b.overall - a.overall)[0];
}

function weatherMultiplier(w: { temp: number; wind: number; precip: boolean }): number {
  let m = 1.0;
  if (w.temp < 50) m *= 0.95;
  else if (w.temp > 85) m *= 1.04;
  if (w.wind > 12) m *= 1.05; // tailwind boost
  if (w.precip) m *= 0.92;
  return m;
}

interface AtBatResult {
  result: "K" | "BB" | "HBP" | "OUT" | "1B" | "2B" | "3B" | "HR";
  outType?: string;
  pitch?: { type: string; velo: number };
  count?: { b: number; s: number };
  distance?: number;
}

function simulateAtBat(batter: Player, pitcher: Player, ctx: { parkFactor: number }): AtBatResult {
  const r = batter.ratings;
  const pr = pitcher.ratings;
  const isBatterRight = batter.bats === "R" || (batter.bats === "S" && pitcher.throws === "L");
  const contact = isBatterRight ? r.contactR : r.contactL;
  const power = isBatterRight ? r.powerR : r.powerL;
  const discipline = r.discipline;
  const speed = r.speed;
  const vision = r.vision;

  const pitchPool = pr.pitches.length ? pr.pitches : [{ type: "4-Seam", velo: 88, brk: 50, ctrl: 50 }];
  const pitch = choice(pitchPool);

  const stuff = (pitch.velo - 80) * 1.6 + pitch.brk * 0.8;
  const eye = (discipline + vision + contact) / 3;

  const kPct = clamp(0.16 + (stuff - eye) * 0.0026 + (gauss(0, 0.04)), 0.10, 0.42);
  const bbPct = clamp(0.085 + (eye - pitch.ctrl) * 0.0028 + gauss(0, 0.02), 0.03, 0.18);
  const hbpPct = 0.008;

  const count = { b: irnd(0, 3), s: irnd(0, 2) };

  const r1 = Math.random();
  if (r1 < kPct) return { result: "K", pitch: { type: pitch.type, velo: pitch.velo }, count };
  if (r1 < kPct + bbPct) return { result: "BB", pitch: { type: pitch.type, velo: pitch.velo }, count };
  if (r1 < kPct + bbPct + hbpPct) return { result: "HBP", pitch: { type: pitch.type, velo: pitch.velo }, count };

  const babip = clamp(0.293 + (contact - stuff) * 0.0014 + gauss(0, 0.03), 0.22, 0.38);
  if (Math.random() > babip) {
    const oR = Math.random();
    if (oR < 0.42) return { result: "OUT", outType: "grounds out", pitch: { type: pitch.type, velo: pitch.velo }, count };
    if (oR < 0.82) return { result: "OUT", outType: "flies out", pitch: { type: pitch.type, velo: pitch.velo }, count };
    return { result: "OUT", outType: "lines out", pitch: { type: pitch.type, velo: pitch.velo }, count };
  }
  // hit
  const parkBoost = (ctx.parkFactor - 100) * 0.0015;
  const hrPct = clamp((power - 55) * 0.0022 + 0.055 + parkBoost, 0.015, 0.28);
  const trpPct = clamp((speed - 55) * 0.0012 + 0.018, 0.005, 0.06);
  const dblPct = 0.20;
  const hr = Math.random();
  if (hr < hrPct) {
    const dist = irnd(370, 470);
    return { result: "HR", distance: dist, pitch: { type: pitch.type, velo: pitch.velo }, count };
  }
  if (hr < hrPct + trpPct) return { result: "3B", pitch: { type: pitch.type, velo: pitch.velo }, count };
  if (hr < hrPct + trpPct + dblPct) return { result: "2B", pitch: { type: pitch.type, velo: pitch.velo }, count };
  return { result: "1B", pitch: { type: pitch.type, velo: pitch.velo }, count };
}

function advanceBases(bases: any[], batter: Player, gain: number, isWalk: boolean): number {
  let scored = 0;
  if (isWalk) {
    if (bases[0]) {
      if (bases[1]) {
        if (bases[2]) scored++;
        bases[2] = bases[1];
      }
      bases[1] = bases[0];
    }
    bases[0] = batter;
    return scored;
  }
  if (gain === 4) {
    for (let i = 0; i < 3; i++) { if (bases[i]) { scored++; bases[i] = null; } }
    scored++;
    return scored;
  }
  const nb: any[] = [null, null, null];
  if (bases[2]) scored++;
  if (bases[1]) {
    if (gain >= 2) scored++;
    else if (Math.random() < 0.5) scored++;
    else nb[2] = bases[1];
  }
  if (bases[0]) {
    if (gain === 3) scored++;
    else if (gain === 2) {
      if (Math.random() < 0.5) scored++; else nb[2] = bases[0];
    } else {
      nb[1] = bases[0];
    }
  }
  if (gain === 1) nb[0] = batter;
  if (gain === 2) nb[1] = batter;
  if (gain === 3) nb[2] = batter;
  bases[0] = nb[0]; bases[1] = nb[1]; bases[2] = nb[2];
  return scored;
}

export function applyGameResult(lg: League, game: Game, result: GameResult) {
  game.played = true;
  game.score = { home: result.homeRuns, away: result.awayRuns };
  game.linescore = { home: result.linescore.home, away: result.linescore.away, homeH: result.linescore.homeH, awayH: result.linescore.awayH };
  game.highlights = result.highlights;
  const home = getTeam(lg, game.homeId)!;
  const away = getTeam(lg, game.awayId)!;
  home.runsScored += result.homeRuns; home.runsAllowed += result.awayRuns;
  away.runsScored += result.awayRuns; away.runsAllowed += result.homeRuns;
  if (result.homeRuns > result.awayRuns) { home.wins++; away.losses++; }
  else { away.wins++; home.losses++; }

  Object.keys(result.playerStats).forEach(pid => {
    const p = lg.players.find(x => x.id === pid);
    if (!p) return;
    const acc = result.playerStats[pid];
    const s = p.seasonStats;
    if (p.isPitcher) {
      s.g = (s.g ?? 0) + 1;
      s.gs = (s.gs ?? 0) + (acc.pitching.gs || 0);
      const newOuts = (s.outs ?? 0) + acc.pitching.outs;
      s.outs = newOuts;
      s.ip = Math.round((newOuts / 3) * 10) / 10;
      s.ph = (s.ph ?? 0) + acc.pitching.h;
      s.per = (s.per ?? 0) + acc.pitching.er;
      s.pbb = (s.pbb ?? 0) + acc.pitching.bb;
      s.pk = (s.pk ?? 0) + acc.pitching.k;
      s.phr = (s.phr ?? 0) + acc.pitching.hr;
      s.w = (s.w ?? 0) + (acc.pitching.w || 0);
      s.l = (s.l ?? 0) + (acc.pitching.l || 0);
      s.sv = (s.sv ?? 0) + (acc.pitching.sv || 0);
      s.era = s.ip ? ((s.per ?? 0) * 9) / s.ip : 0;
      s.whip = s.ip ? ((s.ph ?? 0) + (s.pbb ?? 0)) / s.ip : 0;
    } else {
      s.g = (s.g ?? 0) + 1;
      s.ab = (s.ab ?? 0) + acc.hitting.ab;
      s.h = (s.h ?? 0) + acc.hitting.h;
      s.hr = (s.hr ?? 0) + acc.hitting.hr;
      s.rbi = (s.rbi ?? 0) + acc.hitting.rbi;
      s.r = (s.r ?? 0) + acc.hitting.r;
      s.bb = (s.bb ?? 0) + acc.hitting.bb;
      s.k = (s.k ?? 0) + acc.hitting.k;
      s.sb = (s.sb ?? 0) + acc.hitting.sb;
      s.doubles = (s.doubles ?? 0) + acc.hitting["2b"];
      s.triples = (s.triples ?? 0) + acc.hitting["3b"];
      s.avg = (s.ab ?? 0) > 0 ? (s.h ?? 0) / (s.ab ?? 1) : 0;
      const pa = (s.ab ?? 0) + (s.bb ?? 0);
      s.obp = pa > 0 ? ((s.h ?? 0) + (s.bb ?? 0)) / pa : 0;
      s.slg = (s.ab ?? 0) > 0 ? ((s.h ?? 0) + (s.doubles ?? 0) + 2 * (s.triples ?? 0) + 3 * (s.hr ?? 0)) / (s.ab ?? 1) : 0;
      s.ops = (s.obp ?? 0) + (s.slg ?? 0);
    }
  });
}
