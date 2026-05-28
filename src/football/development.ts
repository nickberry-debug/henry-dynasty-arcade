// Football player development engine. Runs once per season rollover.
// Ages every player, adjusts ratings based on age curve, randomly
// triggers breakouts/busts, retires veterans, generates rookie classes.
import type { FootballLeague, FootballPlayer, FootballPosition } from "./types";
import { emptyStats } from "./types";
import { rand, irnd, choice, uid } from "../utils/rand";
import { FIRST_NAMES, LAST_NAMES } from "../data/names";

/** Run a full season-rollover development cycle. */
export function ageAndDevelop(lg: FootballLeague): { retired: FootballPlayer[]; breakouts: FootballPlayer[]; busts: FootballPlayer[]; rookies: FootballPlayer[] } {
  const retired: FootballPlayer[] = [];
  const breakouts: FootballPlayer[] = [];
  const busts: FootballPlayer[] = [];

  // Process every active player.
  for (const p of lg.players) {
    if (p.retired) continue;

    const beforeOvr = p.overall;
    p.age += 1;

    // Retirement check — position-aware. RBs hang up cleats earlier
    // than QBs/OL.
    const retireChance = retirementOdds(p.age, p.overall, p.position);
    if (rand() < retireChance) {
      p.retired = true;
      p.teamId = null;
      retired.push(p);
      continue;
    }

    // Age curve — position-specific. QBs peak longer; RBs fall off fast.
    const ageDelta = ageEffect(p.age, p.potential, p.overall, p.position);
    // Random breakout (rare): under 26, boost +5 to +12.
    let breakout = false;
    if (p.age <= 25 && p.overall < p.potential && rand() < 0.03) {
      const boost = irnd(5, 12);
      p.overall = Math.min(99, p.overall + boost);
      breakouts.push(p);
      breakout = true;
    }
    // Random bust (rare): under 27 with potential gap, drop.
    let bust = false;
    if (!breakout && p.age <= 27 && p.potential > p.overall && rand() < 0.015) {
      const drop = irnd(4, 10);
      p.overall = Math.max(40, p.overall - drop);
      p.potential = Math.max(p.overall, p.potential - drop);
      busts.push(p);
      bust = true;
    }
    if (!breakout && !bust) {
      p.overall = Math.max(40, Math.min(99, p.overall + ageDelta));
    }
    // Scale individual ratings proportionally to the overall change.
    if (p.overall !== beforeOvr) {
      const ratio = p.overall / beforeOvr;
      for (const k of Object.keys(p.ratings) as Array<keyof typeof p.ratings>) {
        p.ratings[k] = Math.max(20, Math.min(99, Math.round(p.ratings[k] * ratio)));
      }
    }

    p.yearsExp += 1;
    // Reset stats
    p.seasonStats = emptyStats();
    // Heal injuries through the offseason
    p.injury = null;
    // Slight morale recovery
    p.morale = Math.min(100, p.morale + irnd(0, 10));
    p.hot = 0;
  }

  // Generate rookie class — fill empty roster spots so each team stays at 53.
  const rookies = generateRookieClass(lg);
  (lg as any)._draftsCompleted = ((lg as any)._draftsCompleted ?? 0) + 1;

  // News
  if (retired.length > 0) {
    lg.newsLog.unshift({
      id: `fn-retire-${lg.season}`,
      week: 0,
      season: lg.season + 1,
      category: "Milestone",
      headline: `📜 ${retired.length} veteran${retired.length === 1 ? "" : "s"} announce retirement this offseason.`,
      important: retired.length >= 5,
      emoji: "📜",
    });
  }
  if (breakouts.length > 0) {
    const top = breakouts.sort((a, b) => b.overall - a.overall)[0];
    lg.newsLog.unshift({
      id: `fn-breakout-${lg.season}`,
      week: 0,
      season: lg.season + 1,
      category: "Drama",
      headline: `🚀 BREAKOUT: ${top.name} (${top.position}) leaps to OVR ${top.overall} after a transformative offseason.`,
      important: true,
      playerIds: [top.id],
      emoji: "🚀",
    });
  }
  if (rookies.length > 0) {
    const topRookie = rookies.sort((a, b) => b.overall - a.overall)[0];
    lg.newsLog.unshift({
      id: `fn-rookie-${lg.season}`,
      week: 0,
      season: lg.season + 1,
      category: "Drama",
      headline: `🎓 Rookie class drafted — top prospect ${topRookie.name} (${topRookie.position}, OVR ${topRookie.overall}) headed to ${lg.teams.find(t => t.id === topRookie.teamId)?.abbr ?? "TBD"}.`,
      important: true,
      emoji: "🎓",
    });
  }

  return { retired, breakouts, busts, rookies };
}

// Position-aware retirement caps and "voluntary retirement" thresholds.
// RBs age fastest; OL/DL age slowest; QBs have the longest careers but
// drop off hard once they hit it.
function retirementOdds(age: number, overall: number, position: FootballPosition): number {
  const forcedAge = forcedRetirementAge(position);
  if (age >= forcedAge) return 1;            // forced retirement
  const voluntaryAge = voluntaryRetirementAge(position);
  if (age < voluntaryAge) return 0;          // not eligible to retire yet
  const ageFactor = Math.max(0, age - (voluntaryAge - 1));
  const overallFactor = Math.max(0, 88 - overall);
  // Position multiplier — RBs and LB/DBs (cardio-heavy positions)
  // retire a bit more aggressively once eligible.
  const posMult = position === "RB" || position === "FB" ? 1.4
    : position === "LB" || position === "CB" || position === "S" ? 1.15
    : position === "OL" || position === "DL" ? 0.8
    : 1.0;
  return Math.min(0.85, posMult * (0.04 * ageFactor + 0.006 * overallFactor));
}

function forcedRetirementAge(position: FootballPosition): number {
  switch (position) {
    case "RB": case "FB": return 33;
    case "WR": case "TE": return 36;
    case "LB": case "CB": case "S": return 35;
    case "OL": case "DL": return 38;
    case "QB": return 42;
    case "K": case "P": return 40;
    default: return 36;
  }
}

function voluntaryRetirementAge(position: FootballPosition): number {
  switch (position) {
    case "RB": case "FB": return 30;
    case "WR": case "TE": return 33;
    case "LB": case "CB": case "S": return 32;
    case "OL": case "DL": return 35;
    case "QB": return 38;
    case "K": case "P": return 36;
    default: return 32;
  }
}

function ageEffect(age: number, potential: number, overall: number, position: FootballPosition): number {
  // Position-aware age curves. Lookup returns [growthCap, peakStart,
  // peakEnd, declineEnd] — the boundaries of player development.
  const curve = positionCurve(position);
  // Young + below-potential: gain
  if (age <= curve.growthCap && overall < potential) return irnd(1, 4);
  if (age <= curve.growthCap) return irnd(0, 2);
  // Peak
  if (age <= curve.peakEnd) return irnd(-1, 2);
  // Decline — physical positions (RB, DB) drop faster
  if (age <= curve.declineEnd) return irnd(curve.declineMin, 0);
  // Old veterans — steep drop
  return irnd(curve.steepMin, -1);
}

function positionCurve(position: FootballPosition): { growthCap: number; peakEnd: number; declineEnd: number; declineMin: number; steepMin: number } {
  switch (position) {
    case "QB":            return { growthCap: 27, peakEnd: 33, declineEnd: 37, declineMin: -2, steepMin: -5 };
    case "RB": case "FB": return { growthCap: 23, peakEnd: 27, declineEnd: 30, declineMin: -4, steepMin: -8 };
    case "WR": case "TE": return { growthCap: 25, peakEnd: 30, declineEnd: 33, declineMin: -3, steepMin: -6 };
    case "OL": case "DL": return { growthCap: 25, peakEnd: 31, declineEnd: 35, declineMin: -2, steepMin: -5 };
    case "LB": case "CB": case "S": return { growthCap: 24, peakEnd: 29, declineEnd: 32, declineMin: -3, steepMin: -6 };
    case "K": case "P":   return { growthCap: 26, peakEnd: 33, declineEnd: 37, declineMin: -1, steepMin: -3 };
    default:              return { growthCap: 25, peakEnd: 29, declineEnd: 32, declineMin: -3, steepMin: -6 };
  }
}

const ROOKIE_POSITION_NEEDS: Record<FootballPosition, number> = {
  QB: 1, RB: 2, FB: 0, WR: 3, TE: 1,
  OL: 3, DL: 3, LB: 2, CB: 2, S: 1,
  K: 0, P: 0,
};

function generateRookieClass(lg: FootballLeague): FootballPlayer[] {
  const rookies: FootballPlayer[] = [];
  // For each team, count missing players per position vs target counts.
  // Top priority: fill gaps. Generate a single shared rookie pool first
  // (so we can model a "draft" later), then assign to teams.
  const teams = lg.teams.slice();
  // Build a pool of ~10 rookies per team capacity.
  const poolSize = teams.length * 8;
  const pool: FootballPlayer[] = [];
  for (let i = 0; i < poolSize; i++) {
    const pos = choice(["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"] as FootballPosition[]);
    pool.push(generateRookie(pos));
  }
  // Sort pool by overall descending.
  pool.sort((a, b) => b.overall - a.overall);

  // Each team picks players to fill its biggest gaps. Iterate by team in
  // reverse standings order (worst team picks first — NFL draft order).
  const draftOrder = teams.slice().sort((a, b) => (a.wins - b.wins) || ((a.pointsFor - a.pointsAgainst) - (b.pointsFor - b.pointsAgainst)));
  let poolIdx = 0;
  const ROUNDS = 7;
  for (let round = 1; round <= ROUNDS && poolIdx < pool.length; round++) {
    for (const team of draftOrder) {
      if (poolIdx >= pool.length) break;
      const r = pool[poolIdx++];
      r.teamId = team.id;
      r.jersey = nextAvailableJersey(lg.players.concat(rookies), team.id, r.position);
      rookies.push(r);
    }
  }
  lg.players.push(...rookies);
  return rookies;
}

function nextAvailableJersey(players: FootballPlayer[], teamId: string, pos: FootballPosition): number {
  const taken = new Set(players.filter(p => p.teamId === teamId).map(p => p.jersey));
  const range = jerseyRangeFor(pos);
  for (let j = range[0]; j <= range[1]; j++) if (!taken.has(j)) return j;
  // Fall back to any unused number
  for (let j = 1; j <= 99; j++) if (!taken.has(j)) return j;
  return 99;
}

function jerseyRangeFor(pos: FootballPosition): [number, number] {
  if (pos === "QB") return [1, 19];
  if (pos === "RB" || pos === "FB") return [20, 39];
  if (pos === "WR" || pos === "TE") return [10, 19];
  if (pos === "OL") return [50, 79];
  if (pos === "DL") return [70, 99];
  if (pos === "LB") return [40, 59];
  if (pos === "CB" || pos === "S") return [20, 49];
  if (pos === "K" || pos === "P") return [1, 19];
  return [1, 99];
}

/** Refine a rookie's scouted potential — tightens toward truth. Returns
 *  the updated rookie. Each visit cuts the gap roughly in half, so 3
 *  visits resolves a hidden gem cleanly. Exposed so a future draft UI
 *  can let the user spend scouts. */
export function scoutRookie(rookie: FootballPlayer): FootballPlayer {
  const r = rookie as any;
  r.scoutVisits = (r.scoutVisits ?? 0) + 1;
  const truth = rookie.potential;
  const cur = r.scoutedPotential ?? rookie.potential;
  const err = truth - cur;
  r.scoutedPotential = Math.max(40, Math.min(99, Math.round(cur + err * 0.55 + (rand() - 0.5) * 4)));
  return rookie;
}

function generateRookie(pos: FootballPosition): FootballPlayer {
  const firstName = choice(FIRST_NAMES.US);
  const lastName = choice(LAST_NAMES.US);
  // Rookies start lower than veterans but with higher potential ceiling.
  const overall = irnd(48, 78);
  const potential = Math.min(99, overall + irnd(5, 22));
  // Hidden gem roll — ~7% of rookies whose true potential exceeds the
  // initial scouted estimate by 15-22 OVR. Scout reports flag these as
  // average prospects; deep scouting reveals the truth.
  const hiddenGem = potential >= 78 && potential < 95 && rand() < 0.07;
  const noise = hiddenGem ? -irnd(15, 22) : Math.round((rand() - 0.5) * 12);
  const scoutedPotential = Math.max(40, Math.min(99, potential + noise));
  const r = {
    armStrength: 50, accuracy: 50, decision: 50,
    speed: 50, agility: 50, hands: 50, routeRunning: 50, breakTackle: 50,
    blocking: 50, passRush: 50, runDefense: 50,
    coverage: 50, tackling: 50, awareness: 50,
    kickPower: 50, kickAccuracy: 50,
    stamina: irnd(70, 95), composure: irnd(50, 80),
  };
  const tune = (k: keyof typeof r, base: number) => {
    r[k] = Math.max(30, Math.min(99, Math.round(base + (rand() - 0.5) * 16)));
  };
  if (pos === "QB") { tune("armStrength", overall); tune("accuracy", overall - 3); tune("decision", overall - 8); }
  else if (pos === "RB" || pos === "FB") { tune("speed", overall); tune("agility", overall - 2); tune("breakTackle", overall - 5); }
  else if (pos === "WR" || pos === "TE") { tune("speed", overall); tune("hands", overall - 3); tune("routeRunning", overall - 6); }
  else if (pos === "OL") { tune("blocking", overall); tune("awareness", overall - 8); }
  else if (pos === "DL") { tune("passRush", overall); tune("runDefense", overall - 2); }
  else if (pos === "LB") { tune("tackling", overall); tune("runDefense", overall - 3); tune("coverage", overall - 8); }
  else if (pos === "CB" || pos === "S") { tune("coverage", overall); tune("speed", overall - 2); }
  else if (pos === "K") { tune("kickPower", overall); tune("kickAccuracy", overall - 3); }
  else if (pos === "P") { tune("kickPower", overall); tune("kickAccuracy", overall - 5); }

  return {
    id: uid("fp"),
    firstName, lastName,
    name: `${firstName} ${lastName}`,
    jersey: 99,
    position: pos,
    age: irnd(21, 23),
    yearsExp: 0,
    overall,
    potential,
    ratings: r,
    morale: irnd(75, 95),
    hot: 0,
    injury: null,
    teamId: null,
    retired: false,
    seasonStats: emptyStats(),
    appearance: { skinTone: irnd(0, 7), hairStyle: irnd(0, 9), faceShape: irnd(0, 5), portraitSeed: Math.floor(rand() * 1e9) },
    // Stamped-on scouting data — used by the draft UI to show a noisy
    // potential range. Hidden gems are a fun late-round surprise.
    ...({ hiddenGem, scoutedPotential, scoutVisits: 0 } as any),
  };
}
