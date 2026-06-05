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

  // Record the season we just finished into lg.history BEFORE we wipe stats.
  // Awards (MVP / OPOY / DPOY / ROY / Comeback) are also computed here from
  // the still-fresh seasonStats and then stamped onto each award winner's
  // .awards array.
  recordSeasonResult(lg);

  // Process every active player.
  for (const p of lg.players) {
    if (p.retired) continue;

    // Archive the season we just played into careerStats BEFORE we age and
    // reset seasonStats, so PlayerProfile has a per-season history table.
    if (!Array.isArray(p.careerStats)) p.careerStats = [];
    if (!Array.isArray(p.awards)) p.awards = [];
    if (p.seasonStats && p.seasonStats.games > 0) {
      p.careerStats.push({ season: lg.season, age: p.age, teamId: p.teamId, ...p.seasonStats });
    }
    // Snapshot prevOvr BEFORE the age curve fires so roster screens can
    // show ↑/↓ arrows for the offseason just completed.
    p.prevOvr = p.overall;

    const beforeOvr = p.overall;
    p.age += 1;

    // Retirement check — position-aware. RBs hang up cleats earlier
    // than QBs/OL.
    const retireChance = retirementOdds(p.age, p.overall, p.position);
    if (rand() < retireChance) {
      p.retired = true;
      p.retiredSeason = lg.season;
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

  // Generate rookie POOL — does NOT assign teams. Stored on lg.currentDraft
  // for the interactive draft UI. The user (or "auto-complete") makes the
  // picks; only then do rookies actually join lg.players.
  const pool = generateRookiePool(lg);
  setupInteractiveDraft(lg, pool);
  (lg as any)._draftsCompleted = ((lg as any)._draftsCompleted ?? 0) + 1;
  // Expose pool as "rookies" in the return tuple for callers that want to
  // peek at the class size. They are NOT yet on lg.players.
  const rookies = pool;

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
    // Stamp the draft class onto the league so the user can review it
    // on /football/draft-class. We just keep ids — players themselves
    // live in lg.players already.
    lg.lastDraftClass = {
      season: lg.season + 1,
      rookieIds: rookies.map(r => r.id),
    };
  }

  // ── Archive retirees + HoF voting ────────────────────────────────────
  if (retired.length > 0) {
    if (!Array.isArray(lg.retiredPlayers)) lg.retiredPlayers = [];
    for (const p of retired) {
      // Hall-of-Fame eligibility: career totals.
      const careerTD = p.careerStats.reduce((s, c) =>
        s + (c.passTD ?? 0) + (c.rushTD ?? 0) + (c.recTD ?? 0) + (c.defTD ?? 0), 0);
      const careerSacks = p.careerStats.reduce((s, c) => s + (c.sacks ?? 0), 0);
      const careerYds = p.careerStats.reduce((s, c) =>
        s + (c.passYds ?? 0) + (c.rushYds ?? 0) + (c.recYds ?? 0), 0);
      const awards = p.awards?.length ?? 0;
      const hof = awards >= 4 || careerTD >= 200 || careerSacks >= 120 || careerYds >= 40000;
      p.hof = hof;
      lg.retiredPlayers.push(p);
      if (hof) {
        lg.newsLog.unshift({
          id: `fn-hof-${p.id}`,
          week: 0,
          season: lg.season + 1,
          category: "Milestone",
          headline: `🏛️ HALL OF FAME: ${p.name} (${p.position}) inducted after a legendary career.`,
          playerIds: [p.id],
          important: true,
          emoji: "🏛️",
        });
      }
    }
    // Remove retirees from active roster.
    lg.players = lg.players.filter(p => !retired.some(r => r.id === p.id));
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

function generateRookiePool(lg: FootballLeague): FootballPlayer[] {
  // Build a shared rookie pool — ~8 per team. Sorted by overall desc so the
  // pool comes out as a "best available" list, which is what every draft
  // page shows. Each rookie has teamId = null until the draft assigns one.
  const teams = lg.teams.slice();
  const poolSize = teams.length * 8;
  const pool: FootballPlayer[] = [];
  for (let i = 0; i < poolSize; i++) {
    const pos = choice(["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"] as FootballPosition[]);
    const r = generateRookie(pos);
    r.teamId = null;
    pool.push(r);
  }
  pool.sort((a, b) => b.overall - a.overall);
  return pool;
}

/** Initialize the interactive draft state on the league. */
function setupInteractiveDraft(lg: FootballLeague, pool: FootballPlayer[]) {
  // Pick order = reverse standings (worst picks first).
  const order = lg.teams.slice()
    .sort((a, b) => (a.wins - b.wins) || ((a.pointsFor - a.pointsAgainst) - (b.pointsFor - b.pointsAgainst)))
    .map(t => t.id);
  const ROUNDS = 7;
  lg.currentDraft = {
    season: lg.season + 1,
    pickOrder: order,
    currentPick: 0,
    rounds: ROUNDS,
    pool,
    picks: [],
    completed: false,
  };
}

// ── Interactive Football Draft API (mirrors Baseball's offseason draft) ──

/** Make a single pick — assigns the rookie to the team currently on the
 *  clock. Returns the picked player or null if the draft is over / the
 *  player isn't in the pool. */
export function makeFootballDraftPick(lg: FootballLeague, playerId: string): FootballPlayer | null {
  const d = lg.currentDraft;
  if (!d || d.completed) return null;
  const pickIdx = d.currentPick;
  const teamId = d.pickOrder[pickIdx % d.pickOrder.length];
  const idx = d.pool.findIndex(p => p.id === playerId);
  if (idx === -1) return null;
  const chosen = d.pool.splice(idx, 1)[0];
  chosen.teamId = teamId;
  chosen.jersey = nextAvailableJersey(lg.players.concat(d.pool), teamId, chosen.position);
  // Move the rookie onto the active roster so they show up on team pages
  // immediately. Stat counters are already zeroed.
  lg.players.push(chosen);
  d.picks.push({
    pick: pickIdx + 1,
    round: Math.ceil((pickIdx + 1) / d.pickOrder.length),
    teamId,
    playerId: chosen.id,
  });
  d.currentPick += 1;
  if (d.currentPick >= d.pickOrder.length * d.rounds) {
    d.completed = true;
    finalizeDraftMeta(lg);
  }
  return chosen;
}

/** CPU picks for whichever team is on the clock — heuristic = position need
 *  (least-staffed positions first), then best available. */
export function cpuFootballDraftPick(lg: FootballLeague): FootballPlayer | null {
  const d = lg.currentDraft;
  if (!d || d.completed) return null;
  const teamId = d.pickOrder[d.currentPick % d.pickOrder.length];
  const roster = lg.players.filter(p => p.teamId === teamId);
  // Position counts on the current roster.
  const counts: Partial<Record<string, number>> = {};
  for (const p of roster) counts[p.position] = (counts[p.position] ?? 0) + 1;
  // Target distribution per position — Football needs more OL/DL than skill.
  const TARGET: Record<string, number> = {
    QB: 3, RB: 4, FB: 1, WR: 6, TE: 3,
    OL: 9, DL: 8, LB: 6, CB: 5, S: 4,
    K: 1, P: 1,
  };
  const top = d.pool.slice(0, 8);
  // Prefer top-rated player at a position we're short on.
  const scored = top.map(p => {
    const have = counts[p.position] ?? 0;
    const want = TARGET[p.position] ?? 3;
    const need = Math.max(0, want - have);
    // High overall + high need = highest score.
    return { p, score: p.overall + need * 6 };
  }).sort((a, b) => b.score - a.score);
  const chosen = scored[0]?.p ?? d.pool[0];
  if (!chosen) return null;
  return makeFootballDraftPick(lg, chosen.id);
}

/** Auto-pick the entire remaining draft via CPU. */
export function autoCompleteFootballDraft(lg: FootballLeague): number {
  let picked = 0;
  while (lg.currentDraft && !lg.currentDraft.completed) {
    if (!cpuFootballDraftPick(lg)) break;
    picked++;
  }
  return picked;
}

/** Close the draft — any undrafted rookies become free agents, news posts
 *  the top pick, and lg.lastDraftClass is stamped for the review page. */
function finalizeDraftMeta(lg: FootballLeague) {
  const d = lg.currentDraft;
  if (!d) return;
  // Undrafted rookies → FA pool.
  for (const r of d.pool) {
    r.teamId = null;
    lg.freeAgents.push(r);
  }
  d.pool = [];
  // Build the picked-rookie id list for the /football/draft-class page.
  const rookieIds = d.picks.map(p => p.playerId);
  lg.lastDraftClass = { season: d.season, rookieIds };
  // News: top pick + class summary
  if (d.picks.length > 0) {
    const topPickPlayerId = d.picks[0].playerId;
    const topPick = lg.players.find(p => p.id === topPickPlayerId);
    const topTeam = lg.teams.find(t => t.id === d.picks[0].teamId);
    if (topPick && topTeam) {
      lg.newsLog.unshift({
        id: `fn-draft-top-${d.season}`,
        week: 0, season: d.season, category: "Draft",
        headline: `🎓 ${topTeam.abbr} take ${topPick.name} #1 overall — class of ${d.season}.`,
        playerIds: [topPick.id], teamIds: [topTeam.id], important: true, emoji: "🎓",
      });
    }
  }
}

/** Clear the draft state (after the user starts the new season). */
export function clearFootballDraft(lg: FootballLeague) {
  lg.currentDraft = undefined;
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
    careerStats: [],
    awards: [],
    prevOvr: overall,
    appearance: { skinTone: irnd(0, 7), hairStyle: irnd(0, 9), faceShape: irnd(0, 5), portraitSeed: Math.floor(rand() * 1e9) },
    // Stamped-on scouting data — used by the draft UI to show a noisy
    // potential range. Hidden gems are a fun late-round surprise.
    ...({ hiddenGem, scoutedPotential, scoutVisits: 0 } as any),
  };
}

// ── End-of-season award + history bookkeeping ──────────────────────────

/** Pick the per-season awards from the league's seasonStats, write a
 *  history record, and stamp .awards onto every winning player. Runs once
 *  per offseason, just before age/dev so the just-finished stats are
 *  still on .seasonStats. */
function recordSeasonResult(lg: FootballLeague) {
  if (!Array.isArray(lg.history)) lg.history = [];
  if (!lg.seasonAwards) lg.seasonAwards = {};

  // Champion + runner-up come from the playoffs bracket.
  const champion = lg.champion ?? "";
  const finalSeries = lg.playoffsBracket?.bracket.find(s => s.round === "superbowl");
  const runnerUp = finalSeries
    ? (finalSeries.winnerId === finalSeries.homeId ? finalSeries.awayId : finalSeries.homeId)
    : "";
  const champTeam = lg.teams.find(t => t.id === champion);
  const champRecord = champTeam ? `${champTeam.wins}-${champTeam.losses}${champTeam.ties ? `-${champTeam.ties}` : ""}` : undefined;

  // MVP — highest-impact offensive player. Score = TDs*6 + yards/30 - INTs*4.
  const skill = lg.players.filter(p => !p.retired && p.seasonStats.games > 0);
  const score = (p: FootballPlayer) => {
    const s = p.seasonStats;
    const offTD = (s.passTD ?? 0) + (s.rushTD ?? 0) + (s.recTD ?? 0);
    const offYds = (s.passYds ?? 0) + (s.rushYds ?? 0) + (s.recYds ?? 0);
    return offTD * 6 + offYds / 30 - (s.passInt ?? 0) * 4 - (s.fumbles ?? 0) * 3;
  };
  const mvp = skill.slice().sort((a, b) => score(b) - score(a))[0] ?? null;

  // OPOY — offensive non-QB
  const opoyPool = skill.filter(p => p.position !== "QB");
  const opoy = opoyPool.slice().sort((a, b) => score(b) - score(a))[0] ?? null;

  // DPOY — defensive players, tackles + sacks*3 + INTs*4
  const defenseScore = (p: FootballPlayer) => (p.seasonStats.tackles ?? 0) + (p.seasonStats.sacks ?? 0) * 3 + (p.seasonStats.interceptions ?? 0) * 4 + (p.seasonStats.defTD ?? 0) * 6;
  const defPool = lg.players.filter(p => !p.retired && ["DL", "LB", "CB", "S"].includes(p.position));
  const dpoy = defPool.slice().sort((a, b) => defenseScore(b) - defenseScore(a))[0] ?? null;

  // ROY — rookies only (yearsExp === 0 means they were drafted this season)
  const rookies = lg.players.filter(p => !p.retired && p.yearsExp === 0 && p.seasonStats.games > 0);
  const roy = rookies.slice().sort((a, b) => score(b) - score(a))[0] ?? null;

  // Leaders by category — used in the history table.
  const passLeader = skill.slice().sort((a, b) => (b.seasonStats.passYds ?? 0) - (a.seasonStats.passYds ?? 0))[0];
  const rushLeader = skill.slice().sort((a, b) => (b.seasonStats.rushYds ?? 0) - (a.seasonStats.rushYds ?? 0))[0];
  const recLeader = skill.slice().sort((a, b) => (b.seasonStats.recYds ?? 0) - (a.seasonStats.recYds ?? 0))[0];
  const sackLeader = defPool.slice().sort((a, b) => (b.seasonStats.sacks ?? 0) - (a.seasonStats.sacks ?? 0))[0];

  // Stamp awards onto players.
  const stamp = (p: FootballPlayer | null, type: "MVP" | "OPOY" | "DPOY" | "ROY") => {
    if (!p) return;
    if (!Array.isArray(p.awards)) p.awards = [];
    p.awards.push({ season: lg.season, type });
  };
  stamp(mvp, "MVP");
  if (opoy && opoy.id !== mvp?.id) stamp(opoy, "OPOY");
  stamp(dpoy, "DPOY");
  stamp(roy, "ROY");
  // Stamp Champion on every player on the championship roster.
  if (champTeam) {
    for (const p of lg.players) {
      if (p.teamId === champTeam.id && !p.retired) {
        if (!Array.isArray(p.awards)) p.awards = [];
        p.awards.push({ season: lg.season, type: "Champion" });
      }
    }
  }

  // History row.
  lg.history!.unshift({
    season: lg.season,
    champion,
    runnerUp,
    champRecord,
    mvp: mvp ? { playerId: mvp.id, name: mvp.name } : undefined,
    opoy: opoy && opoy.id !== mvp?.id ? { playerId: opoy.id, name: opoy.name } : undefined,
    dpoy: dpoy ? { playerId: dpoy.id, name: dpoy.name } : undefined,
    roy: roy ? { playerId: roy.id, name: roy.name } : undefined,
    passLeader: passLeader && (passLeader.seasonStats.passYds ?? 0) > 0
      ? { playerId: passLeader.id, name: passLeader.name, yards: passLeader.seasonStats.passYds! } : undefined,
    rushLeader: rushLeader && (rushLeader.seasonStats.rushYds ?? 0) > 0
      ? { playerId: rushLeader.id, name: rushLeader.name, yards: rushLeader.seasonStats.rushYds! } : undefined,
    recLeader: recLeader && (recLeader.seasonStats.recYds ?? 0) > 0
      ? { playerId: recLeader.id, name: recLeader.name, yards: recLeader.seasonStats.recYds! } : undefined,
    sackLeader: sackLeader && (sackLeader.seasonStats.sacks ?? 0) > 0
      ? { playerId: sackLeader.id, name: sackLeader.name, sacks: sackLeader.seasonStats.sacks! } : undefined,
  });

  lg.seasonAwards![lg.season] = {
    season: lg.season,
    mvp: mvp ? { playerId: mvp.id, name: mvp.name } : undefined,
    opoy: opoy && opoy.id !== mvp?.id ? { playerId: opoy.id, name: opoy.name } : undefined,
    dpoy: dpoy ? { playerId: dpoy.id, name: dpoy.name } : undefined,
    roy: roy ? { playerId: roy.id, name: roy.name } : undefined,
  };

  // News items for the awards.
  const newsAward = (type: string, p: FootballPlayer | null, emoji: string) => {
    if (!p) return;
    lg.newsLog.unshift({
      id: `fn-award-${type}-${lg.season}`,
      week: 0, season: lg.season + 1, category: "Award",
      headline: `${emoji} ${p.name} (${p.position}) wins ${type} for the ${lg.season} season.`,
      playerIds: [p.id], important: true, emoji,
    });
  };
  newsAward("MVP", mvp, "🏆");
  if (opoy && opoy.id !== mvp?.id) newsAward("OPOY", opoy, "⭐");
  newsAward("DPOY", dpoy, "🛡️");
  newsAward("ROY", roy, "🌟");
}
