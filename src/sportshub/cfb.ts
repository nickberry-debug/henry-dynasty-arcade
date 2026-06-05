// College Football — the layer that makes CFB not pro football.
//
// Five systems, all sport-side; the shared /src/sports-engine module
// is untouched (rule #3). State lives on SeasonState.cfb, an optional
// field only present when sport === "cfb".
//
//   1. Recruiting — HS prospect class each offseason, schools sign them
//   2. Class-year development & graduation — Fr → Sr, seniors leave
//   3. Transfer portal — players that left their school, others sign
//   4. Conferences & rankings — weekly top-N poll off W-L + diff
//   5. Bowls & playoff — bowl games for non-playoff teams, ranking-seeded bracket

import type {
  SeasonState, SportPlayer, SportNewsItem, Team,
} from "./franchise";
import { computeStandings } from "./franchise";
import { generateRoster } from "./roster";

// ── Types ────────────────────────────────────────────────────────────

/** Star rating from 1 (walk-on) to 5 (blue chip). */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/** A high-school prospect available in the current recruiting class. */
export interface CfbProspect {
  id: string;
  name: string;
  position: string;
  starRating: StarRating;
  /** Rating they'll project to as a Freshman if signed. */
  ratingFloor: number;
  /** Rating they could grow to by their Sr year. */
  ceiling: number;
  /** Flavor — kid-friendly two-word hometown. */
  hometown: string;
  /** Set when a school signs them. Persists until next-year rollover. */
  signedTeamId?: string;
}

/** A weekly poll entry. */
export interface TeamRanking {
  teamId: string;
  rank: number;
  prevRank?: number;
  /** Poll points — internal, drives ordering. */
  points: number;
}

/** A bowl game — single elimination, end-of-season postseason for non-playoff teams. */
export interface BowlGame {
  id: string;
  name: string;
  /** Bowl tier — drives flavor + ordering on the UI. */
  tier: "marquee" | "major" | "minor";
  teamA: string;
  teamB: string;
  played: boolean;
  result?: { aScore: number; bScore: number };
  winnerId?: string;
}

/** Year-over-year movement summary — for the History tab. */
export interface CfbYearSummary {
  season: number;
  graduated: number;
  recruited: number;
  transferIn: number;
  transferOut: number;
  championId?: string;
}

/** All CFB-specific state. Attached to SeasonState.cfb when sport === "cfb". */
export interface CfbState {
  recruitingClass?: CfbProspect[];
  /** Players currently in the transfer portal — left their school but
   *  haven't been signed yet. teamId is null on the player. */
  transferPortal?: SportPlayer[];
  /** Top-25-style rankings, updated weekly. */
  rankings?: TeamRanking[];
  /** Non-playoff postseason. */
  bowls?: BowlGame[];
  /** Per-year movement counts. */
  yearSummaries?: CfbYearSummary[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function ensureCfb(state: SeasonState): CfbState {
  if (!state.cfb) state.cfb = {};
  return state.cfb;
}

function ensureNews(state: SeasonState) {
  if (!state.newsLog) state.newsLog = [];
  return state.newsLog;
}

function pushCfbNews(state: SeasonState, n: Omit<SportNewsItem, "id" | "week" | "season">) {
  const news = ensureNews(state);
  news.unshift({
    id: `cfb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    week: state.currentWeek,
    season: state.year,
    ...n,
  });
  if (news.length > 150) news.length = 150;
}

const FIRST_NAMES = [
  "Hudson", "Maverick", "Beau", "Cash", "Reed", "Knox", "Asher", "Bryce", "Cole",
  "Devon", "Jaxon", "Ethan", "Riley", "Theo", "Mateo", "Quinn", "Sawyer", "Brock",
  "Roman", "Tate", "Kai", "Brody", "Wyatt", "Owen", "Mason", "Jett", "Levi",
  "Carter", "Drew", "Marcus", "Tyler",
];
const LAST_NAMES = [
  "Walker", "Reeves", "Holt", "Mercer", "Cross", "Vega", "Lock", "Beck", "Pavel",
  "Stein", "Yu", "Kim", "Ng", "Diaz", "Russo", "Calder", "Marsh", "Pike", "Sage",
  "Stone", "Royce", "Quill", "Falk", "Park", "Hart", "Hayes", "Foster", "Wallace",
  "Brooks", "Hollis", "Kerr",
];
const HOMETOWNS = [
  "Tampa, FL", "Austin, TX", "Atlanta, GA", "Phoenix, AZ", "Boise, ID", "Denver, CO",
  "Seattle, WA", "Charlotte, NC", "Tulsa, OK", "Madison, WI", "Boulder, CO", "Reno, NV",
  "Sacramento, CA", "Portland, OR", "Tucson, AZ", "Memphis, TN", "Mobile, AL", "Eugene, OR",
];

// ── 1. RECRUITING ───────────────────────────────────────────────────

/** Number of prospects to generate per cycle. Sized so every team can
 *  sign ~10 recruits comfortably (16 teams × 10 = 160; we overshoot
 *  slightly so CPU competition has texture). */
const CLASS_SIZE = 200;

/** Star-rating distribution — pyramid-shaped. */
const STAR_DISTRIBUTION: Array<{ stars: StarRating; pct: number }> = [
  { stars: 1, pct: 0.30 },
  { stars: 2, pct: 0.35 },
  { stars: 3, pct: 0.22 },
  { stars: 4, pct: 0.10 },
  { stars: 5, pct: 0.03 },
];

const PROSPECT_POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K"];

/** Generate a fresh recruiting class. Called at the start of each offseason. */
export function initRecruitingClass(state: SeasonState) {
  const cfb = ensureCfb(state);
  const recruits: CfbProspect[] = [];
  for (let i = 0; i < CLASS_SIZE; i++) {
    const stars = rollStarRating();
    const pos = PROSPECT_POSITIONS[Math.floor(Math.random() * PROSPECT_POSITIONS.length)];
    const floorBase = 55 + (stars - 1) * 5;
    const floor = Math.min(99, Math.max(50, floorBase + Math.floor(Math.random() * 10)));
    const ceiling = Math.min(99, Math.max(floor + 3, floor + 5 + Math.floor(Math.random() * 12) + stars * 2));
    const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
    const hometown = HOMETOWNS[Math.floor(Math.random() * HOMETOWNS.length)];
    recruits.push({
      id: `recruit-${state.year}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name, position: pos, starRating: stars,
      ratingFloor: floor, ceiling, hometown,
    });
  }
  // Sort by stars desc, then ceiling — top of the board are the best names.
  recruits.sort((a, b) => b.starRating - a.starRating || b.ceiling - a.ceiling);
  cfb.recruitingClass = recruits;
  pushCfbNews(state, {
    category: "Drama",
    headline: `🎓 Class of ${state.year + 1} recruits open the board — ${recruits.length} prospects, ${recruits.filter(r => r.starRating === 5).length} five-stars.`,
    important: true,
    emoji: "🎓",
  });
}

function rollStarRating(): StarRating {
  const r = Math.random();
  let acc = 0;
  for (const tier of STAR_DISTRIBUTION) {
    acc += tier.pct;
    if (r < acc) return tier.stars;
  }
  return 1;
}

/** Sign a prospect to a team. The prospect joins the roster as a
 *  freshman on the NEXT year's roster — they appear after the offseason
 *  rollover. */
export function signRecruit(state: SeasonState, prospectId: string, teamId: string): boolean {
  const cfb = ensureCfb(state);
  const recruits = cfb.recruitingClass;
  if (!recruits) return false;
  const p = recruits.find(r => r.id === prospectId);
  if (!p || p.signedTeamId) return false;
  p.signedTeamId = teamId;
  const team = state.teams.find(t => t.id === teamId);
  if (team) {
    pushCfbNews(state, {
      category: "Drama",
      headline: `✍️ ${team.abbr} sign ${"⭐".repeat(p.starRating)} ${p.name} (${p.position}, ${p.hometown})`,
      important: p.starRating >= 4,
      teamIds: [team.id],
      emoji: "✍️",
    });
  }
  return true;
}

/** CPU schools sign recruits — bigger programs get the better classes.
 *  Called by autoCompleteRecruiting and during offseason rollover. */
export function cpuRecruit(state: SeasonState, opts: { perTeam?: number } = {}) {
  const cfb = ensureCfb(state);
  const recruits = cfb.recruitingClass;
  if (!recruits) return;
  const perTeam = opts.perTeam ?? 10;
  // Team order by previous-year rating desc (top programs sign first).
  const teamOrder = state.teams.slice().sort((a, b) => b.rating - a.rating);
  // Snake-draft style: 4 rounds × perTeam picks
  const rounds = Math.ceil(perTeam);
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 === 0 ? teamOrder : teamOrder.slice().reverse();
    for (const team of order) {
      if (team.id === state.playerTeamId) continue; // skip user team
      // Pick best-available the CPU values: weighted by stars + position need.
      const teamCount = recruits.filter(r => r.signedTeamId === team.id).length;
      if (teamCount >= perTeam) continue;
      const available = recruits.filter(r => !r.signedTeamId);
      if (available.length === 0) return;
      // Stars matter most; small jitter so order varies
      available.sort((a, b) => (b.starRating * 100 + b.ceiling + Math.random() * 5) - (a.starRating * 100 + a.ceiling + Math.random() * 5));
      const pick = available[0];
      pick.signedTeamId = team.id;
    }
  }
}

/** Auto-complete the user team's recruiting too — convenience for the
 *  "I don't care, just CPU it" path. */
export function autoCompleteUserRecruiting(state: SeasonState, perTeam = 10) {
  const cfb = ensureCfb(state);
  const recruits = cfb.recruitingClass;
  if (!recruits || !state.playerTeamId) return;
  const userTeam = state.teams.find(t => t.id === state.playerTeamId);
  if (!userTeam) return;
  const have = recruits.filter(r => r.signedTeamId === userTeam.id).length;
  const need = Math.max(0, perTeam - have);
  if (need <= 0) return;
  const available = recruits.filter(r => !r.signedTeamId)
    .sort((a, b) => (b.starRating * 100 + b.ceiling) - (a.starRating * 100 + a.ceiling));
  for (let i = 0; i < need && i < available.length; i++) {
    signRecruit(state, available[i].id, userTeam.id);
  }
}

// ── 2. CLASS-YEAR DEVELOPMENT & GRADUATION ──────────────────────────

/** Develop a player one year: rating drifts toward their ceiling, with
 *  variance. Some break out (+10), some bust (-6). */
function developCfbPlayer(p: SportPlayer, ceilingHint?: number) {
  const ceiling = ceilingHint ?? Math.min(99, p.rating + 10);
  const gap = ceiling - p.rating;
  // Base growth: 30-60% of remaining gap, plus age-related slowdown
  const baseGrowth = Math.round(gap * (0.30 + Math.random() * 0.30));
  // Breakout chance — bigger jump
  const breakout = Math.random() < 0.06 ? Math.round(Math.random() * 6) + 4 : 0;
  // Bust chance — small dip
  const bust = Math.random() < 0.04 ? -(Math.round(Math.random() * 4) + 2) : 0;
  p.prevRating = p.rating;
  p.rating = Math.max(40, Math.min(99, p.rating + baseGrowth + breakout + bust));
}

/** Convert a signed prospect into a freshman SportPlayer on the team's
 *  roster. */
function prospectToFreshman(prospect: CfbProspect, jersey: number): SportPlayer {
  return {
    id: `cfb-frosh-${prospect.id}`,
    teamId: prospect.signedTeamId!,
    name: prospect.name,
    number: jersey,
    position: prospect.position,
    rating: prospect.ratingFloor,
    star: false,
    years: 1,
    age: 18,
    seasonStats: {},
    careerStats: [],
    awards: [],
    prevRating: prospect.ratingFloor,
  };
}

function nextJersey(used: Set<number>): number {
  for (let i = 0; i < 100; i++) {
    const candidate = Math.floor(Math.random() * 99) + 1;
    if (!used.has(candidate)) { used.add(candidate); return candidate; }
  }
  // Fallback
  for (let n = 1; n < 100; n++) if (!used.has(n)) { used.add(n); return n; }
  return 99;
}

/** End-of-year CFB rollover. Graduates seniors, advances classes,
 *  develops everyone, applies recruiting + transfer portal moves.
 *  Returns a summary of what happened. */
export function processCfbRollover(state: SeasonState): CfbYearSummary {
  const cfb = ensureCfb(state);
  const summary: CfbYearSummary = {
    season: state.year,
    graduated: 0,
    recruited: 0,
    transferIn: 0,
    transferOut: 0,
    championId: state.champion ?? undefined,
  };
  if (!state.players) return summary;

  // Build a recruit lookup grouped by team.
  const recruitsByTeam = new Map<string, CfbProspect[]>();
  for (const r of cfb.recruitingClass ?? []) {
    if (!r.signedTeamId) continue;
    if (!recruitsByTeam.has(r.signedTeamId)) recruitsByTeam.set(r.signedTeamId, []);
    recruitsByTeam.get(r.signedTeamId)!.push(r);
  }

  // Build a transfer lookup grouped by destination — set by signFromPortal
  // before this function runs.
  const xferIns = new Map<string, SportPlayer[]>();
  for (const xf of (cfb.transferPortal ?? []).filter(p => (p as any)._signedTeam)) {
    const dest = (xf as any)._signedTeam as string;
    if (!xferIns.has(dest)) xferIns.set(dest, []);
    xferIns.get(dest)!.push(xf);
    summary.transferIn += 1;
  }

  // Walk every player; senior → graduate, others → advance + develop.
  const kept: SportPlayer[] = [];
  const transferredOutIds = new Set((cfb.transferPortal ?? []).map(p => p.id));
  for (const p of state.players) {
    if (transferredOutIds.has(p.id)) {
      // Stays in the portal pool — does not return to the team.
      summary.transferOut += 1;
      continue;
    }
    if (p.years >= 4) {
      summary.graduated += 1;
      // Senior career stats already archived; just don't carry forward.
      continue;
    }
    p.years += 1;
    p.age += 1;
    // Ceiling hint based on roster context — if they had strong prevSeason stats, ceiling rises
    const ceiling = Math.min(99, p.rating + 4 + Math.floor(Math.random() * 8));
    developCfbPlayer(p, ceiling);
    // Reset season stats for the new year (already archived in newSeason)
    p.seasonStats = {};
    kept.push(p);
  }

  // Add freshmen recruits + transfer-portal signings.
  for (const team of state.teams) {
    const used = new Set<number>();
    for (const p of kept) if (p.teamId === team.id) used.add(p.number);
    const frosh = recruitsByTeam.get(team.id) ?? [];
    for (const r of frosh) {
      const jersey = nextJersey(used);
      kept.push(prospectToFreshman(r, jersey));
      summary.recruited += 1;
    }
    const xfers = xferIns.get(team.id) ?? [];
    for (const xf of xfers) {
      const player: SportPlayer = {
        ...xf,
        teamId: team.id,
        number: nextJersey(used),
        seasonStats: {},
      };
      delete (player as any)._signedTeam;
      kept.push(player);
    }
  }

  state.players = kept;
  // Recruiting class consumed.
  cfb.recruitingClass = undefined;
  // Portal: keep unsigned players around for one more cycle, drop signed.
  cfb.transferPortal = (cfb.transferPortal ?? []).filter(p => !(p as any)._signedTeam);

  if (!cfb.yearSummaries) cfb.yearSummaries = [];
  cfb.yearSummaries.unshift(summary);
  if (cfb.yearSummaries.length > 50) cfb.yearSummaries.length = 50;

  pushCfbNews(state, {
    category: "Drama",
    headline: `📜 Class of ${state.year} graduates — ${summary.graduated} seniors leave, ${summary.recruited} freshmen arrive.`,
    important: true,
    emoji: "📜",
  });

  return summary;
}

// ── 3. TRANSFER PORTAL ──────────────────────────────────────────────

/** Push a player into the portal — sets teamId to null, archives in cfb.transferPortal. */
export function entersPortal(state: SeasonState, playerId: string): boolean {
  const cfb = ensureCfb(state);
  if (!cfb.transferPortal) cfb.transferPortal = [];
  const p = state.players?.find(x => x.id === playerId);
  if (!p) return false;
  p.teamId = "";
  cfb.transferPortal.push(p);
  pushCfbNews(state, {
    category: "Drama",
    headline: `🚪 ${p.name} (${p.position}) enters the transfer portal.`,
    teamIds: [], playerIds: [p.id], emoji: "🚪",
  });
  return true;
}

/** Sign a player out of the portal onto a team. Tags the destination
 *  so processCfbRollover knows where to place them next year. */
export function signFromPortal(state: SeasonState, playerId: string, teamId: string): boolean {
  const cfb = ensureCfb(state);
  const p = (cfb.transferPortal ?? []).find(x => x.id === playerId);
  if (!p) return false;
  (p as any)._signedTeam = teamId;
  const team = state.teams.find(t => t.id === teamId);
  if (team) {
    pushCfbNews(state, {
      category: "Drama",
      headline: `🔄 ${p.name} (${p.position}) commits to ${team.abbr} via portal.`,
      teamIds: [team.id], playerIds: [p.id], emoji: "🔄",
    });
  }
  return true;
}

/** Auto-fill the portal with CPU activity each offseason — some players
 *  leave, some get signed by other CPU teams. */
export function cpuPortalActivity(state: SeasonState, opts: { portalRate?: number; signRate?: number } = {}) {
  const cfb = ensureCfb(state);
  if (!cfb.transferPortal) cfb.transferPortal = [];
  if (!state.players) return;
  const portalRate = opts.portalRate ?? 0.04;
  const signRate = opts.signRate ?? 0.55;
  // Move some non-user-team players into the portal (lower-rated more likely).
  for (const p of state.players.slice()) {
    if (p.teamId === state.playerTeamId) continue;
    if (p.years >= 4) continue; // seniors won't transfer
    // Less likely the higher the rating
    const chance = portalRate * (1 - (p.rating - 50) / 100);
    if (Math.random() < chance) {
      entersPortal(state, p.id);
    }
  }
  // CPU teams pull from portal to fill positional needs
  const portal = cfb.transferPortal.filter(p => !(p as any)._signedTeam);
  // Best portal players go to top teams first.
  portal.sort((a, b) => b.rating - a.rating);
  const teamOrder = state.teams.slice().sort((a, b) => b.rating - a.rating);
  let i = 0;
  for (const p of portal) {
    if (Math.random() > signRate) continue;
    const team = teamOrder[i % teamOrder.length];
    i++;
    if (team.id === state.playerTeamId) continue;
    signFromPortal(state, p.id, team.id);
  }
}

// ── 4. RANKINGS ─────────────────────────────────────────────────────

/** Compute team ranking points: 10 per win, 1 per point of differential,
 *  minus 6 per loss. Recent wins weighted slightly higher. */
function computeRankingPoints(team: Team, state: SeasonState): number {
  const standings = computeStandings(state).find(s => s.teamId === team.id);
  if (!standings) return 0;
  const diff = standings.pf - standings.pa;
  const winPts = standings.wins * 10;
  const lossPenalty = standings.losses * -6;
  const diffPts = diff;
  // Recent form — last 3 games
  const recent = state.results
    .filter(r => r.away === team.id || r.home === team.id)
    .slice(-3);
  let recentBonus = 0;
  for (const r of recent) {
    const isAway = r.away === team.id;
    const myScore = isAway ? r.awayScore : r.homeScore;
    const oppScore = isAway ? r.homeScore : r.awayScore;
    if (myScore > oppScore) recentBonus += 3;
    else if (myScore < oppScore) recentBonus -= 2;
  }
  // Built-in program prestige floor
  const prestige = (team.rating - 50) * 0.15;
  return winPts + lossPenalty + diffPts + recentBonus + prestige;
}

/** Recompute the rankings — call after each simWeek for CFB. */
export function updateCfbRankings(state: SeasonState) {
  const cfb = ensureCfb(state);
  const prev = new Map((cfb.rankings ?? []).map(r => [r.teamId, r.rank]));
  const next: TeamRanking[] = state.teams
    .map(t => ({ teamId: t.id, rank: 0, points: computeRankingPoints(t, state) }))
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1, prevRank: prev.get(row.teamId) }));
  cfb.rankings = next;

  // Surface ranking climbs/falls of 5+ in the news.
  for (const r of next) {
    if (r.prevRank && Math.abs(r.prevRank - r.rank) >= 5 && r.rank <= 10) {
      const t = state.teams.find(x => x.id === r.teamId);
      if (t) {
        const direction = r.prevRank > r.rank ? "climbs" : "falls";
        pushCfbNews(state, {
          category: "Drama",
          headline: `📊 ${t.abbr} ${direction} to #${r.rank} in the poll (was #${r.prevRank}).`,
          teamIds: [t.id], emoji: r.prevRank > r.rank ? "📈" : "📉",
        });
      }
    }
  }
}

// ── 5. BOWLS & PLAYOFF SEEDING ──────────────────────────────────────

const BOWL_NAMES: Array<{ name: string; tier: BowlGame["tier"] }> = [
  { name: "Citrus Bowl",    tier: "major" },
  { name: "Liberty Bowl",   tier: "minor" },
  { name: "Cactus Bowl",    tier: "minor" },
  { name: "Sun Belt Bowl",  tier: "minor" },
  { name: "Fiesta Bowl",    tier: "major" },
  { name: "Outback Bowl",   tier: "minor" },
];

/** Generate bowl games for non-playoff teams. Seeded by ranking — top
 *  remaining team plays the next-best regional-equivalent matchup. */
export function generateBowlGames(state: SeasonState) {
  const cfb = ensureCfb(state);
  const rankings = cfb.rankings ?? [];
  if (rankings.length === 0) return;
  // Top 4 go to the playoff bracket; the next 12 (ranks 5-16) get bowls.
  const bowlEligible = rankings.slice(4, 16);
  const bowls: BowlGame[] = [];
  // Pair sequentially: best vs next-best of remainder.
  for (let i = 0; i < bowlEligible.length && bowls.length < BOWL_NAMES.length; i += 2) {
    const a = bowlEligible[i];
    const b = bowlEligible[i + 1];
    if (!a || !b) break;
    const meta = BOWL_NAMES[bowls.length];
    bowls.push({
      id: `bowl-${state.year}-${bowls.length}`,
      name: meta.name,
      tier: meta.tier,
      teamA: a.teamId,
      teamB: b.teamId,
      played: false,
    });
  }
  cfb.bowls = bowls;
  if (bowls.length > 0) {
    pushCfbNews(state, {
      category: "Drama",
      headline: `🎟️ ${bowls.length} bowl matchups set for the ${state.year} postseason.`,
      important: true, emoji: "🎟️",
    });
  }
}

/** Sim all generated bowls. */
export function simAllBowls(state: SeasonState) {
  const cfb = ensureCfb(state);
  const bowls = cfb.bowls ?? [];
  for (const bowl of bowls) {
    if (bowl.played) continue;
    const a = state.teams.find(t => t.id === bowl.teamA);
    const b = state.teams.find(t => t.id === bowl.teamB);
    if (!a || !b) continue;
    // Sim — same shape as simGame but standalone (we don't have access
    // to simGame's full signature here without circular import).
    const aScore = Math.max(0, Math.round((31 + (a.rating - b.rating) / 4) + (Math.random() - 0.5) * 18));
    const bScore = Math.max(0, Math.round((31 + (b.rating - a.rating) / 4) + (Math.random() - 0.5) * 18));
    const winnerId = aScore > bScore ? a.id : b.id;
    bowl.result = { aScore, bScore };
    bowl.played = true;
    bowl.winnerId = winnerId;
    pushCfbNews(state, {
      category: "Game",
      headline: `🏆 ${bowl.name}: ${a.abbr} ${aScore} — ${b.abbr} ${bScore}`,
      teamIds: [a.id, b.id], emoji: "🏆",
    });
  }
}

/** Override the generic bracket-build for CFB: seed by ranking, not by
 *  regular-season standings. Top 4 ranked teams play 1v4, 2v3. */
export function buildCfbPlayoffBracket(state: SeasonState): import("./franchise").Bracket {
  const cfb = ensureCfb(state);
  const rankings = cfb.rankings ?? [];
  // Fall back to standings if rankings missing.
  let seeded: string[];
  if (rankings.length >= 4) {
    seeded = rankings.slice(0, 4).map(r => r.teamId);
  } else {
    const standings = computeStandings(state);
    seeded = standings.slice(0, 4).map(s => s.teamId);
  }
  const round1: import("./franchise").BracketGame[] = [
    { round: 0, teamA: seeded[0], teamB: seeded[3] },
    { round: 0, teamA: seeded[1], teamB: seeded[2] },
  ];
  return { rounds: [round1] };
}

// ── Public surface ──────────────────────────────────────────────────

/** True if the state is a CFB save and the offseason flow is active
 *  (used by the UI to decide whether to show recruiting/portal cards). */
export function isCfbOffseasonActive(state: SeasonState): boolean {
  if (state.sport !== "cfb") return false;
  // Offseason = champion is crowned and rollover hasn't been done yet.
  return state.champion !== null && state.cfb?.recruitingClass !== undefined;
}

/** Full offseason wrap-up for CFB. Calls rollover + clears bowls/rankings. */
export function finishCfbOffseason(state: SeasonState): CfbYearSummary {
  const summary = processCfbRollover(state);
  const cfb = ensureCfb(state);
  cfb.bowls = undefined;
  cfb.rankings = undefined;
  return summary;
}
