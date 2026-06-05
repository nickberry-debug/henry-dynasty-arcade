// Sports Hub — shared franchise engine for Hockey / Basketball /
// College Football. Sim a season, run playoffs, declare a champion.
// Each sport overrides the per-game scoring distribution and stat
// labels, but the schedule/standings/playoff loop is identical.

import type { CrestSpec } from "../art/CrestGenerator";

export type SportId = "hockey" | "basketball" | "cfb";

export interface SportConfig {
  id: SportId;
  name: string;
  emoji: string;
  accent: string;
  /** Mean total points per game (used to scale per-team scoring). */
  meanScore: number;
  /** Per-game scoring stddev. */
  stddev: number;
  /** Regular-season game count. */
  games: number;
  /** Playoff bracket size (must be 4, 8, or 16). */
  playoffTeams: 4 | 8 | 16;
  /** Position labels used for the "team star" identity. */
  positions: readonly string[];
}

export const SPORT_CONFIGS: Record<SportId, SportConfig> = {
  hockey: {
    id: "hockey", name: "Hockey", emoji: "🏒", accent: "#67e8f9",
    meanScore: 3.0, stddev: 1.6, games: 28, playoffTeams: 8,
    positions: ["G", "D", "C", "LW", "RW"],
  },
  basketball: {
    id: "basketball", name: "Basketball", emoji: "🏀", accent: "#fb923c",
    meanScore: 108, stddev: 11, games: 30, playoffTeams: 8,
    positions: ["PG", "SG", "SF", "PF", "C"],
  },
  cfb: {
    id: "cfb", name: "College Football", emoji: "🏈", accent: "#fde047",
    meanScore: 31, stddev: 9, games: 12, playoffTeams: 4,
    positions: ["QB", "RB", "WR", "DL", "LB", "DB"],
  },
};

export interface Team {
  id: string;
  city: string;
  nickname: string;
  abbr: string;
  /** 50-99 overall rating; sim biases scoring by this. */
  rating: number;
  /** Conference id (used for divisional play). */
  conf: "east" | "west";
  /** Generated crest spec — original. */
  crest: CrestSpec;
  /** Star player name + position. */
  star: { name: string; pos: string };
  /** For CFB: average class year (1..4) — affects rating drift. */
  classYear?: number;
}

export interface Result { away: string; home: string; awayScore: number; homeScore: number; week: number; }
export interface Standing { teamId: string; wins: number; losses: number; ties: number; pf: number; pa: number; }

export interface BracketGame { round: number; teamA: string | null; teamB: string | null; result?: Result; winner?: string; }
export interface Bracket { rounds: BracketGame[][]; }

/** Per-player stat row — flat key/value so each sport can use its own
 *  stat keys (hockey: G/A/PTS/plusMinus/sv; basketball: PTS/REB/AST/STL/BLK;
 *  cfb: passYds/passTD/rushYds/rushTD/recYds/recTD/tackles/sacks/ints).
 *  The storyline detectors + leaderboards read these by sport. */
export type SportSeasonStats = Record<string, number>;

/** Persisted Sports Hub player — extends the synthesized base with
 *  accumulating season stats and historical archives. */
export interface SportPlayer {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  rating: number;
  /** "Star" flag — this is the team's signature player. */
  star: boolean;
  /** Years on the team (1..N). For CFB, this is class year (1=Fr, 4=Sr). */
  years: number;
  /** Age — useful for player detail screen. */
  age: number;
  /** Live season stats — incremented during simWeek. Empty record at season start. */
  seasonStats: SportSeasonStats;
  /** Frozen snapshots of past seasons. */
  careerStats: Array<{ season: number; teamId: string; stats: SportSeasonStats }>;
  /** Yearly awards (MVP, scoring title, champion roster). */
  awards: Array<{ season: number; type: string }>;
  /** OVR at the start of last season — for ↑/↓ arrows on the roster. */
  prevRating?: number;
}

/** Per-sport news item shape — kept here (not in the shared engine)
 *  because each sport has its own category set. */
export interface SportNewsItem {
  id: string;
  week: number;
  season: number;
  category: "Game" | "Drama" | "Milestone" | "Award" | "Injury" | "Trade";
  headline: string;
  body?: string;
  teamIds?: string[];
  playerIds?: string[];
  emoji?: string;
  important?: boolean;
  /** Reactions on a per-news basis — kid taps an icon. */
  reactions?: { likes: number; laughs: number; fire: number; sad: number };
  memorable?: boolean;
}

/** Per-season history record — populated when the bracket champion is crowned. */
export interface SportHistoryRecord {
  season: number;
  champion: string;
  runnerUp: string;
  champRecord?: string;
  mvp?: { playerId: string; name: string; statKey: string; statValue: number };
  scoringLeader?: { playerId: string; name: string; value: number };
  defenseLeader?: { playerId: string; name: string; value: number };
}

export interface SeasonState {
  sport: SportId;
  teams: Team[];
  schedule: Array<Omit<Result, "awayScore" | "homeScore">>;
  results: Result[];
  currentWeek: number;
  playerTeamId: string;
  /** Bracket fills in after regular season. */
  bracket: Bracket | null;
  /** Year # for multi-year saves. */
  year: number;
  /** Championship winner team id, set when bracket finished. */
  champion: string | null;
  /** Career totals across years for player team. */
  careerWins: number;
  careerChampionships: number;
  // ─── NEW (Phase A foundation for parity work) ────────────────────
  /** Persisted roster — populated on first save, carried across
   *  simWeek so stats accumulate. Optional for backwards compat with
   *  pre-Phase-A saves; loaders backfill. */
  players?: SportPlayer[];
  /** News log — sim results + storyline announcements + drama. */
  newsLog?: SportNewsItem[];
  /** Active + resolved storylines via the shared /src/sports-engine. */
  storylines?: import("../sports-engine").StorylineState;
  /** Past-season history rows — written at champion crowning. */
  history?: SportHistoryRecord[];
  /** CFB-specific state — recruiting class, transfer portal, rankings,
   *  bowls. Only present when sport === "cfb". */
  cfb?: import("./cfb").CfbState;
}

// ── RNG ───────────────────────────────────────────────────────────────

function gauss(): number {
  // Standard normal via Box–Muller.
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ── Scheduling ────────────────────────────────────────────────────────

export function buildSchedule(teams: Team[], gameCount: number): SeasonState["schedule"] {
  // Round-robin-ish with each team playing gameCount games. Pair teams
  // with the home/away balance roughly even by rotating.
  const sched: SeasonState["schedule"] = [];
  const n = teams.length;
  const perTeam = gameCount;
  // Simple approach: each team plays every other team enough times to
  // reach `perTeam`. With 12 teams playing 28 games = ~2.5 vs each.
  const ids = teams.map(t => t.id);
  // Generate matchups by repeating round-robin
  const rounds: Array<Array<[string, string]>> = [];
  while (rounds.reduce((s, r) => s + r.length, 0) < (n * perTeam) / 2) {
    // Single round-robin: each pair plays once
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.random() < 0.5) rounds.push([[ids[i], ids[j]]]);
        else rounds.push([[ids[j], ids[i]]]);
      }
    }
  }
  // Flatten to weeks evenly
  let week = 1;
  const perWeek = Math.floor(n / 2);
  const all = rounds.flat();
  let i = 0;
  while (i < (n * perTeam) / 2) {
    for (let k = 0; k < perWeek && i < (n * perTeam) / 2; k++, i++) {
      const [away, home] = all[i];
      sched.push({ away, home, week });
    }
    week++;
  }
  return sched;
}

// ── Simulation ────────────────────────────────────────────────────────

export function simGame(s: SportConfig, away: Team, home: Team): Result {
  // Expected per-team score = config.meanScore/2 + rating delta scaled.
  const ratingDelta = (home.rating - away.rating) / 18; // ~0-3 points swing
  const homeAdv = s.id === "cfb" ? 3 : s.id === "basketball" ? 3 : 0.3;
  const meanHome = s.meanScore / 2 + ratingDelta + homeAdv;
  const meanAway = s.meanScore / 2 - ratingDelta;
  let homeScore = Math.max(0, Math.round(meanHome + gauss() * (s.stddev / 2)));
  let awayScore = Math.max(0, Math.round(meanAway + gauss() * (s.stddev / 2)));
  // Hockey/basketball: no real ties (basketball has OT). Hockey allows OT decide.
  if (s.id === "basketball" && homeScore === awayScore) {
    if (Math.random() < 0.5) homeScore += Math.floor(2 + Math.random() * 3);
    else awayScore += Math.floor(2 + Math.random() * 3);
  } else if (s.id === "hockey" && homeScore === awayScore) {
    // Coin-flip OT
    if (Math.random() < 0.5) homeScore += 1; else awayScore += 1;
  } else if (s.id === "cfb" && homeScore === awayScore) {
    // Random OT — add 3-21 to one team
    if (Math.random() < 0.5) homeScore += 3 + Math.floor(Math.random() * 18);
    else awayScore += 3 + Math.floor(Math.random() * 18);
  }
  return { away: away.id, home: home.id, awayScore, homeScore, week: 0 };
}

export function simWeek(state: SeasonState): SeasonState {
  const cfg = SPORT_CONFIGS[state.sport];
  const weekGames = state.schedule.filter(g => g.week === state.currentWeek);
  const newResults: Result[] = [...state.results];
  const teamMap = new Map(state.teams.map(t => [t.id, t]));
  // Per-player stat tracking — mutate the persisted roster directly so
  // stats accumulate across simWeek calls. Safe because state.players
  // is replaced via spread below; the mutated entries become the new
  // .players array. Skip if roster isn't persisted (pre-Phase-A save).
  const players = state.players ? state.players.slice() : null;
  const rosterByTeam = players ? new Map<string, SportPlayer[]>() : null;
  if (players && rosterByTeam) {
    for (const p of players) {
      let arr = rosterByTeam.get(p.teamId);
      if (!arr) { arr = []; rosterByTeam.set(p.teamId, arr); }
      arr.push(p);
    }
  }
  for (const g of weekGames) {
    const away = teamMap.get(g.away)!;
    const home = teamMap.get(g.home)!;
    const r = simGame(cfg, away, home);
    r.week = state.currentWeek;
    newResults.push(r);
    if (rosterByTeam) {
      const awayRoster = rosterByTeam.get(away.id) ?? [];
      const homeRoster = rosterByTeam.get(home.id) ?? [];
      distributeStats(cfg.id, r, awayRoster, homeRoster);
    }
  }
  return { ...state, results: newResults, currentWeek: state.currentWeek + 1, players: players ?? state.players };
}

// ── Per-sport stat distribution — synthesizes per-player box-score
//    contributions from a game's final score. Real sims (Baseball,
//    Football) generate stats per play; the sportshub sim is score-only,
//    so we deterministically slice the team total across the roster
//    weighted by player rating + position so the leaderboards feel right.
function distributeStats(sport: SportId, r: Result, awayRoster: SportPlayer[], homeRoster: SportPlayer[]) {
  if (sport === "hockey") {
    distributeHockey(r.away, r.awayScore, awayRoster, homeRoster);
    distributeHockey(r.home, r.homeScore, homeRoster, awayRoster);
  } else if (sport === "basketball") {
    distributeBasketball(r.awayScore, awayRoster);
    distributeBasketball(r.homeScore, homeRoster);
  } else if (sport === "cfb") {
    distributeCFB(r.awayScore, awayRoster);
    distributeCFB(r.homeScore, homeRoster);
  }
}

function bump(p: SportPlayer, key: string, val: number) {
  if (!p.seasonStats) p.seasonStats = {};
  p.seasonStats[key] = (p.seasonStats[key] ?? 0) + val;
}

function distributeHockey(_teamId: string, teamScore: number, ownRoster: SportPlayer[], oppRoster: SportPlayer[]) {
  // Every skater gets a game played. Goals + assists go to forwards/D
  // weighted by rating. Goalies absorb opponent shots/saves.
  const skaters = ownRoster.filter(p => p.position !== "G");
  const goalies = ownRoster.filter(p => p.position === "G");
  for (const p of ownRoster) bump(p, "gp", 1);
  // Distribute goals
  for (let i = 0; i < teamScore; i++) {
    const scorer = pickWeighted(skaters, p => p.rating);
    if (scorer) {
      bump(scorer, "g", 1);
      bump(scorer, "pts", 1);
      bump(scorer, "plusMinus", 1);
      // Up to 2 assists
      const assistPool = skaters.filter(p => p.id !== scorer.id);
      const a1 = pickWeighted(assistPool, p => p.rating);
      if (a1 && Math.random() < 0.85) {
        bump(a1, "a", 1);
        bump(a1, "pts", 1);
        bump(a1, "plusMinus", 1);
        const a2 = pickWeighted(assistPool.filter(p => p.id !== a1.id), p => p.rating);
        if (a2 && Math.random() < 0.55) {
          bump(a2, "a", 1);
          bump(a2, "pts", 1);
          bump(a2, "plusMinus", 1);
        }
      }
    }
  }
  // Goalie — pick starter (highest-rated G), credit shots-against ≈ score×8-12, saves = shots - GA.
  const starter = goalies.slice().sort((a, b) => b.rating - a.rating)[0];
  if (starter) {
    const shots = Math.round(20 + Math.random() * 15);
    const ga = Math.max(0, Math.min(shots, Math.round(teamScore * 0.0))); // GA is what THEY allowed; we don't have opp score here per call — handled by the per-game pair instead
    // We're called per-team-per-game; the opponent's score is the GA here.
    // For simplicity attribute ga as = oppRoster's expected goals via a heuristic.
    const oppRating = oppRoster.length ? oppRoster.reduce((s, p) => s + p.rating, 0) / oppRoster.length : 75;
    const heuristicGA = Math.max(0, Math.round((oppRating - 60) * 0.05 + Math.random() * 2));
    bump(starter, "gpG", 1);
    bump(starter, "shots", shots);
    bump(starter, "saves", Math.max(0, shots - heuristicGA));
    bump(starter, "ga", heuristicGA);
  }
}

function distributeBasketball(teamScore: number, roster: SportPlayer[]) {
  const players = roster.slice();
  if (players.length === 0) return;
  for (const p of players) bump(p, "gp", 1);
  // Top-rated rotation gets most points. Skew by position.
  let remaining = teamScore;
  const scoreWeights = players.map(p => {
    const posBoost = p.position === "PG" || p.position === "SG" || p.position === "SF" ? 1.0 : 0.85;
    return Math.max(0.1, (p.rating - 50) * posBoost);
  });
  for (let i = 0; i < remaining; i++) {
    const scorer = pickWeighted(players, (_, idx) => scoreWeights[idx]);
    if (scorer) {
      // 1 PT 65%, 2 PT 25%, 3 PT 10% — simplification (just adding PTS, the FG split is cosmetic)
      bump(scorer, "pts", 1);
      bump(scorer, "fgm", Math.random() < 0.5 ? 1 : 0);
      bump(scorer, "fga", 1);
    }
  }
  // Rebounds — bias toward C/PF
  const rebounds = Math.round(35 + Math.random() * 15);
  for (let i = 0; i < rebounds; i++) {
    const rebounder = pickWeighted(players, p =>
      (p.position === "C" || p.position === "PF" ? 2 : 0.6) * (p.rating - 55));
    if (rebounder) bump(rebounder, "reb", 1);
  }
  // Assists — bias toward PG
  const assists = Math.round(15 + Math.random() * 10);
  for (let i = 0; i < assists; i++) {
    const assister = pickWeighted(players, p =>
      (p.position === "PG" ? 3 : p.position === "SG" ? 1.5 : 0.6) * (p.rating - 55));
    if (assister) bump(assister, "ast", 1);
  }
  // Steals + blocks
  for (let i = 0; i < Math.round(4 + Math.random() * 5); i++) {
    const stealer = pickWeighted(players, p => (p.position === "PG" || p.position === "SG" ? 1.5 : 0.7) * (p.rating - 55));
    if (stealer) bump(stealer, "stl", 1);
  }
  for (let i = 0; i < Math.round(2 + Math.random() * 4); i++) {
    const blocker = pickWeighted(players, p => (p.position === "C" || p.position === "PF" ? 2.5 : 0.4) * (p.rating - 55));
    if (blocker) bump(blocker, "blk", 1);
  }
}

function distributeCFB(teamScore: number, roster: SportPlayer[]) {
  const qbs = roster.filter(p => p.position === "QB");
  const rbs = roster.filter(p => p.position === "RB");
  const wrs = roster.filter(p => p.position === "WR");
  const dl = roster.filter(p => p.position === "DL");
  const lb = roster.filter(p => p.position === "LB");
  const db = roster.filter(p => p.position === "DB");
  for (const p of roster) bump(p, "gp", 1);
  // Touchdowns — split between rush + pass based on team
  const tds = Math.floor(teamScore / 7);
  const passTDs = Math.round(tds * (0.55 + Math.random() * 0.2));
  const rushTDs = Math.max(0, tds - passTDs);
  const qb = qbs.slice().sort((a, b) => b.rating - a.rating)[0];
  if (qb) {
    const yds = 180 + Math.round(passTDs * 60 + Math.random() * 150);
    bump(qb, "passYds", yds);
    bump(qb, "passTD", passTDs);
    bump(qb, "passComp", 15 + Math.round(Math.random() * 12));
    bump(qb, "passAtt", 25 + Math.round(Math.random() * 15));
    if (Math.random() < 0.25) bump(qb, "passInt", 1);
  }
  // Rushing — top RB takes most
  const topRB = rbs.slice().sort((a, b) => b.rating - a.rating)[0];
  if (topRB) {
    bump(topRB, "rushYds", 50 + Math.round(rushTDs * 30 + Math.random() * 100));
    bump(topRB, "rushTD", rushTDs);
    bump(topRB, "rushAtt", 12 + Math.round(Math.random() * 10));
  }
  // Receiving — spread among WRs
  for (let i = 0; i < passTDs; i++) {
    const wr = pickWeighted(wrs, p => p.rating);
    if (wr) {
      bump(wr, "recTD", 1);
    }
  }
  for (const w of wrs.slice(0, 3)) {
    bump(w, "recYds", 25 + Math.round(Math.random() * 80));
    bump(w, "rec", 2 + Math.round(Math.random() * 4));
  }
  // Defense
  const tackles = 35 + Math.round(Math.random() * 25);
  for (let i = 0; i < tackles; i++) {
    const tackler = pickWeighted([...dl, ...lb, ...db], p =>
      (p.position === "LB" ? 1.5 : p.position === "DL" ? 1.2 : 1) * (p.rating - 55));
    if (tackler) bump(tackler, "tackles", 1);
  }
  for (let i = 0; i < Math.round(1 + Math.random() * 3); i++) {
    const sacker = pickWeighted(dl, p => p.rating - 55);
    if (sacker) bump(sacker, "sacks", 1);
  }
  for (let i = 0; i < (Math.random() < 0.35 ? 1 : 0); i++) {
    const picker = pickWeighted(db, p => p.rating - 55);
    if (picker) bump(picker, "ints", 1);
  }
}

function pickWeighted<T>(arr: T[], weight: (item: T, index: number) => number): T | null {
  if (arr.length === 0) return null;
  const weights = arr.map((it, i) => Math.max(0.01, weight(it, i)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

export function simRest(state: SeasonState): SeasonState {
  let s = state;
  const lastWeek = Math.max(0, ...s.schedule.map(g => g.week));
  while (s.currentWeek <= lastWeek) s = simWeek(s);
  return s;
}

export function computeStandings(state: SeasonState): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of state.teams) map.set(t.id, { teamId: t.id, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 });
  for (const r of state.results) {
    const a = map.get(r.away)!, h = map.get(r.home)!;
    if (r.awayScore > r.homeScore) { a.wins++; h.losses++; }
    else if (r.homeScore > r.awayScore) { h.wins++; a.losses++; }
    else { a.ties++; h.ties++; }
    a.pf += r.awayScore; a.pa += r.homeScore;
    h.pf += r.homeScore; h.pa += r.awayScore;
  }
  // Sort by wins desc, then pf-pa diff
  return Array.from(map.values()).sort((x, y) => (y.wins - x.wins) || ((y.pf - y.pa) - (x.pf - x.pa)));
}

// ── Bracket ───────────────────────────────────────────────────────────

export function buildBracket(state: SeasonState): Bracket {
  const cfg = SPORT_CONFIGS[state.sport];
  const standings = computeStandings(state);
  const seeds = standings.slice(0, cfg.playoffTeams).map(s => s.teamId);
  // 1 vs N, 2 vs N-1, etc.
  const round1: BracketGame[] = [];
  for (let i = 0; i < seeds.length / 2; i++) {
    round1.push({ round: 0, teamA: seeds[i], teamB: seeds[seeds.length - 1 - i] });
  }
  return { rounds: [round1] };
}

export function simBracketRound(state: SeasonState): SeasonState {
  if (!state.bracket) return state;
  const cfg = SPORT_CONFIGS[state.sport];
  const teamMap = new Map(state.teams.map(t => [t.id, t]));
  const rounds = state.bracket.rounds.map(r => r.map(g => ({ ...g })));
  const lastRound = rounds[rounds.length - 1];
  if (lastRound.every(g => g.winner)) return state; // already finished?
  for (const g of lastRound) {
    if (g.winner) continue;
    if (!g.teamA || !g.teamB) continue;
    const a = teamMap.get(g.teamA)!, b = teamMap.get(g.teamB)!;
    // Best-of in playoffs: cfb single, others sim 1 game (kid-friendly).
    const r = simGame(cfg, a, b);
    g.result = r;
    g.winner = r.awayScore > r.homeScore ? a.id : b.id;
  }
  // Build next round if winners
  if (lastRound.length > 1) {
    const next: BracketGame[] = [];
    for (let i = 0; i < lastRound.length; i += 2) {
      next.push({ round: rounds.length, teamA: lastRound[i].winner ?? null, teamB: lastRound[i + 1].winner ?? null });
    }
    rounds.push(next);
  } else {
    // We just played the championship
    return { ...state, bracket: { rounds }, champion: lastRound[0].winner ?? null };
  }
  return { ...state, bracket: { rounds } };
}

// ── Team generation ───────────────────────────────────────────────────

import { TEAMS_BY_SPORT } from "./teams";
import { generateRoster } from "./roster";
import { processCfbRollover } from "./cfb";

export function newSeason(sport: SportId, playerTeamId: string | null, prev?: SeasonState | null): SeasonState {
  const teams = TEAMS_BY_SPORT[sport].map(t => ({ ...t }));
  // For multi-year saves: drift ratings slightly, age out CFB stars
  if (prev) {
    for (const t of teams) {
      const prevT = prev.teams.find(p => p.id === t.id);
      if (!prevT) continue;
      t.rating = Math.max(50, Math.min(99, prevT.rating + Math.floor(gauss() * 3)));
      if (sport === "cfb") {
        t.classYear = ((prevT.classYear ?? 2) % 4) + 1;
        if ((prevT.classYear ?? 2) === 4) {
          // Star graduated — name a new one
          t.star = { name: randName(), pos: t.star.pos };
        }
      }
    }
  } else if (sport === "cfb") {
    for (const t of teams) t.classYear = 2 + Math.floor(Math.random() * 2);
  }
  const cfg = SPORT_CONFIGS[sport];
  // Generate persistent rosters once per season. If carrying over from a
  // prev season, archive each player's seasonStats into careerStats and
  // reset for the new year.
  //
  // CFB special case: instead of regenerating the roster (which would
  // wipe class-year + transfer + recruit state), processCfbRollover does
  // the year transition in-place — graduates seniors, advances classes,
  // applies recruits + portal moves. We branch to that path when
  // sport === "cfb" AND a prev save with .players exists.
  const players: SportPlayer[] = [];
  const isCfbRollover = sport === "cfb" && prev?.players && (prev.cfb?.recruitingClass || prev.cfb?.transferPortal);
  if (!isCfbRollover) {
    for (const t of teams) {
      const teamRoster = generateRoster(t, sport);
      if (prev?.players) {
        // Carry the same player ids forward where possible (deterministic by
        // team+pos+index seed in generateRoster), with last-year stats
        // archived. Increment age + bump prevRating for the arrow indicator.
        const prevByKey = new Map(prev.players.map(p => [p.id, p]));
        for (const np of teamRoster) {
          const pp = prevByKey.get(np.id);
          if (pp) {
            if (pp.seasonStats && Object.keys(pp.seasonStats).length > 0) {
              np.careerStats = [...(pp.careerStats ?? []), { season: prev.year, teamId: pp.teamId, stats: pp.seasonStats }];
            } else {
              np.careerStats = pp.careerStats ?? [];
            }
            np.awards = pp.awards ?? [];
            np.prevRating = pp.rating;
            np.age = pp.age + 1;
          }
        }
      }
      players.push(...teamRoster);
    }
  }
  // For CFB rollover, we carry forward prev.players as the starting set;
  // processCfbRollover (called below) does graduation + class advancement
  // + applies recruits/portal moves to produce the new-year roster.
  if (isCfbRollover && prev?.players) {
    // Archive last-year seasonStats into careerStats BEFORE rollover wipes them
    for (const p of prev.players) {
      if (p.seasonStats && Object.keys(p.seasonStats).length > 0) {
        p.careerStats = [...(p.careerStats ?? []), { season: prev.year, teamId: p.teamId, stats: p.seasonStats }];
      }
    }
    players.push(...prev.players);
  }
  // Roll any prev-season active storylines → resolved on year transition.
  const storylines = (() => {
    if (!prev?.storylines) return { active: [], resolved: [] };
    const state = { active: [] as any[], resolved: [...prev.storylines.resolved, ...prev.storylines.active.map(s => ({ ...s, resolved: true }))].slice(0, 60) };
    return state;
  })();
  const result: SeasonState = {
    sport,
    teams,
    schedule: buildSchedule(teams, cfg.games).map((g) => ({ ...g })),
    results: [],
    currentWeek: 1,
    playerTeamId: playerTeamId ?? teams[0].id,
    bracket: null,
    year: (prev?.year ?? 0) + 1,
    champion: null,
    careerWins: prev?.careerWins ?? 0,
    careerChampionships: prev?.careerChampionships ?? 0,
    players,
    newsLog: prev?.newsLog ? prev.newsLog.slice(0, 20) : [],
    storylines,
    history: prev?.history ?? [],
    cfb: sport === "cfb" ? { yearSummaries: prev?.cfb?.yearSummaries ?? [] } : undefined,
  };
  // CFB rollover: graduate seniors, advance class years, develop players,
  // apply signed recruits + transfer-portal moves. Carries forward
  // yearSummaries archive.
  if (isCfbRollover && prev?.cfb) {
    result.cfb = {
      recruitingClass: prev.cfb.recruitingClass,
      transferPortal: prev.cfb.transferPortal,
      yearSummaries: prev.cfb.yearSummaries ?? [],
    };
    processCfbRollover(result);
  }
  return result;
}

const FIRST = ["Tyler", "Marcus", "Devon", "Carter", "Ethan", "Jaxon", "Mateo", "Aiden", "Cole", "Quinn", "Riley", "Brody", "Reed", "Knox", "Maverick", "Bryce", "Hudson", "Cash", "Sloane", "Wyatt"];
const LAST = ["Wallace", "Brooks", "Hayes", "Foster", "Park", "Reyes", "Beckett", "Hollis", "Mercer", "Vance", "Sage", "Stone", "Royce", "Tate", "Quill", "Marsh", "Pike", "Kerr", "Avery", "Hart"];
function randName(): string {
  return `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
}

export { randName };
