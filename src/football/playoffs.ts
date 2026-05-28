// Football playoffs — NFL-style single-elimination bracket. Top 4 per
// conference (when team count supports it), seeded by record. Wildcard
// → divisional → conference championship → Super Bowl. Adapts down
// for smaller leagues.
import type { FootballLeague, FootballTeam, FootballPlayer } from "./types";
import { simulateGame, applyResult } from "./sim";
import { rand, irnd } from "../utils/rand";
import { checkAchievements, FOOTBALL_ACHIEVEMENTS } from "./achievements";

export type PlayoffRound = "wildcard" | "divisional" | "conference" | "superbowl";

export interface PlayoffSeries {
  id: string;
  round: PlayoffRound;
  conferenceId: 0 | 1 | -1; // -1 = Super Bowl
  homeId: string;
  awayId: string;
  /** Single-game elimination — kept as a tiny array of past games so we can
   *  preserve plays + scores. */
  game: {
    homeScore: number;
    awayScore: number;
    played: boolean;
    plays?: any[];
  };
  winnerId?: string;
  seedHome: number;
  seedAway: number;
}

export interface FootballPlayoffs {
  season: number;
  /** Top N seeds per conference that made the bracket. */
  bracket: PlayoffSeries[];
  /** Which round we're currently playing. */
  currentRound: PlayoffRound;
  /** Conference champions — populated after conference round. */
  afcChamp: string | null;
  nfcChamp: string | null;
  /** League champion — populated after Super Bowl. */
  championId: string | null;
}

/** Compute the playoff field given the regular-season standings. Returns
 *  an array of {teamId, seed, conferenceId} entries sorted by conference + seed. */
export function computeSeeds(lg: FootballLeague): Array<{ teamId: string; seed: number; conferenceId: 0 | 1 }> {
  const out: Array<{ teamId: string; seed: number; conferenceId: 0 | 1 }> = [];
  for (const conf of [0, 1] as const) {
    const teams = lg.teams.filter(t => t.conferenceId === conf)
      .sort((a, b) => (b.wins - a.wins) || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)));
    // Top 4 per conference — or fewer if the conference is small.
    const playoffCount = Math.min(4, Math.max(2, Math.floor(teams.length / 2)));
    for (let i = 0; i < playoffCount; i++) {
      out.push({ teamId: teams[i].id, seed: i + 1, conferenceId: conf });
    }
  }
  return out;
}

/** Initialize the bracket after the regular season ends. */
export function startPlayoffs(lg: FootballLeague): FootballPlayoffs {
  const seeds = computeSeeds(lg);
  const bracket: PlayoffSeries[] = [];

  // For each conference, build the first-round matchups.
  for (const conf of [0, 1] as const) {
    const confSeeds = seeds.filter(s => s.conferenceId === conf);
    // 4 teams → 1 vs 4, 2 vs 3 (wildcard) → 2 winners → conference championship
    // 2 teams → 1 vs 2 directly (conference championship)
    if (confSeeds.length === 4) {
      bracket.push(buildSeries("wildcard", conf, confSeeds[0].teamId, confSeeds[3].teamId, 1, 4));
      bracket.push(buildSeries("wildcard", conf, confSeeds[1].teamId, confSeeds[2].teamId, 2, 3));
    } else if (confSeeds.length === 3) {
      // #1 byes, #2 vs #3 wildcard
      bracket.push(buildSeries("wildcard", conf, confSeeds[1].teamId, confSeeds[2].teamId, 2, 3));
      // Mark the bye as a pre-completed pseudo-series.
      bracket.push({
        id: `bye-${conf}`,
        round: "wildcard",
        conferenceId: conf,
        homeId: confSeeds[0].teamId,
        awayId: confSeeds[0].teamId,
        game: { homeScore: 0, awayScore: 0, played: true },
        winnerId: confSeeds[0].teamId,
        seedHome: 1,
        seedAway: 1,
      });
    } else if (confSeeds.length === 2) {
      bracket.push(buildSeries("conference", conf, confSeeds[0].teamId, confSeeds[1].teamId, 1, 2));
    }
  }

  // Determine current round based on bracket size — if everyone went
  // straight to conference championship (tiny league), start there.
  const firstRound = bracket[0]?.round ?? "conference";

  return {
    season: lg.season,
    bracket,
    currentRound: firstRound,
    afcChamp: null,
    nfcChamp: null,
    championId: null,
  };
}

function buildSeries(round: PlayoffRound, conferenceId: 0 | 1 | -1, homeId: string, awayId: string, seedHome: number, seedAway: number): PlayoffSeries {
  return {
    id: `ps-${round}-${conferenceId}-${homeId}-${awayId}-${Math.random().toString(36).slice(2, 6)}`,
    round,
    conferenceId,
    homeId,
    awayId,
    game: { homeScore: 0, awayScore: 0, played: false },
    winnerId: undefined,
    seedHome,
    seedAway,
  };
}

/** Sim the current round — all unplayed series in this round get
 *  played, then advance to the next round. */
export function simPlayoffRound(lg: FootballLeague): { round: PlayoffRound; newSeries?: PlayoffSeries[]; complete: boolean } {
  if (!lg.playoffsBracket) {
    throw new Error("No playoffs initialized");
  }
  const pf = lg.playoffsBracket as FootballPlayoffs;
  const current = pf.currentRound;
  const series = pf.bracket.filter(s => s.round === current && !s.game.played);

  // Sim each series — adapt a regular-season game with single-elim rules
  // (no ties; if tied, sudden-death is already in simulateGame).
  for (const s of series) {
    const game = {
      id: `pg-${s.id}`,
      week: 100, // sentinel — these aren't regular-season games
      homeId: s.homeId,
      awayId: s.awayId,
      played: false,
    };
    const result = simulateGame(lg, game);
    // If somehow tied, advance the higher seed.
    let hs = result.homeScore;
    let as_ = result.awayScore;
    if (hs === as_) {
      if (s.seedHome <= s.seedAway) hs += 3; else as_ += 3;
    }
    s.game.homeScore = hs;
    s.game.awayScore = as_;
    s.game.played = true;
    s.game.plays = result.plays;
    s.winnerId = hs > as_ ? s.homeId : s.awayId;

    // Apply stats to players (so playoff stats count).
    for (const [pid, delta] of Object.entries(result.statDeltas)) {
      const player = lg.players.find(p => p.id === pid);
      if (!player) continue;
      player.seasonStats.games += 1;
      for (const [k, v] of Object.entries(delta)) {
        (player.seasonStats as any)[k] = ((player.seasonStats as any)[k] ?? 0) + (v as number);
      }
    }

    // News
    const home = lg.teams.find(t => t.id === s.homeId)!;
    const away = lg.teams.find(t => t.id === s.awayId)!;
    const winner = s.winnerId === home.id ? home : away;
    const roundLabels: Record<PlayoffRound, string> = {
      wildcard: "Wild Card",
      divisional: "Divisional Round",
      conference: "Conference Championship",
      superbowl: "Super Bowl",
    };
    lg.newsLog.unshift({
      id: `pn-${s.id}`,
      week: 100,
      season: lg.season,
      category: "Game",
      headline: `${roundLabels[s.round]}: ${away.abbr} ${as_} — ${home.abbr} ${hs}. ${winner.name} advance.`,
      important: s.round === "conference" || s.round === "superbowl",
      teamIds: [home.id, away.id],
      emoji: s.round === "superbowl" ? "🏆" : "🏈",
    });
  }

  // Advance round logic.
  const winners = pf.bracket.filter(s => s.round === current && s.winnerId);
  let newSeries: PlayoffSeries[] = [];
  if (current === "wildcard") {
    // Build divisional or conference championship from winners.
    for (const conf of [0, 1] as const) {
      const confWinners = winners.filter(s => s.conferenceId === conf).sort((a, b) =>
        Math.min(a.seedHome, a.seedAway) - Math.min(b.seedHome, b.seedAway)
      );
      if (confWinners.length === 2) {
        const a = confWinners[0]; const b = confWinners[1];
        const aSeed = Math.min(a.seedHome, a.seedAway);
        const bSeed = Math.min(b.seedHome, b.seedAway);
        // Higher seed hosts.
        const home = aSeed <= bSeed ? a : b;
        const away = aSeed <= bSeed ? b : a;
        newSeries.push(buildSeries("conference", conf, home.winnerId!, away.winnerId!, aSeed <= bSeed ? aSeed : bSeed, aSeed <= bSeed ? bSeed : aSeed));
      }
    }
    pf.bracket.push(...newSeries);
    pf.currentRound = "conference";
  } else if (current === "conference") {
    // Identify the two conference champions.
    const confChamps = winners.filter(s => s.round === "conference");
    const afc = confChamps.find(s => s.conferenceId === 0);
    const nfc = confChamps.find(s => s.conferenceId === 1);
    if (afc?.winnerId) pf.afcChamp = afc.winnerId;
    if (nfc?.winnerId) pf.nfcChamp = nfc.winnerId;
    if (pf.afcChamp && pf.nfcChamp) {
      // Super Bowl — neutral site, but we'll arbitrarily make AFC the
      // "home" team (sort of). Coin-flip-ish.
      const home = Math.random() < 0.5 ? pf.afcChamp : pf.nfcChamp;
      const away = home === pf.afcChamp ? pf.nfcChamp : pf.afcChamp;
      const seedHome = lg.teams.find(t => t.id === home)?.conferenceId === 0 ? 1 : 2;
      const seedAway = seedHome === 1 ? 2 : 1;
      newSeries.push(buildSeries("superbowl", -1, home, away, seedHome, seedAway));
      pf.bracket.push(...newSeries);
      pf.currentRound = "superbowl";
    }
  } else if (current === "superbowl") {
    const sb = winners.find(s => s.round === "superbowl");
    if (sb?.winnerId) {
      pf.championId = sb.winnerId;
      const champ = lg.teams.find(t => t.id === sb.winnerId);
      if (champ) {
        lg.newsLog.unshift({
          id: `pn-champ-${pf.season}`,
          week: 100,
          season: lg.season,
          category: "Milestone",
          headline: `🏆 ${champ.city} ${champ.name} are SEASON ${lg.season} CHAMPIONS!`,
          important: true,
          teamIds: [champ.id],
          emoji: "🏆",
        });
        lg.champion = champ.id;
      }
    }
    return { round: current, complete: true };
  }

  // Achievement checks after every round (so playoff-bid / conf-champ /
  // super-bowl fire as soon as they're earned).
  try {
    const newly = checkAchievements(lg);
    for (const id of newly) {
      const ach = FOOTBALL_ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        lg.newsLog.unshift({
          id: `fa-${id}-${Date.now()}`,
          week: 100,
          season: lg.season,
          category: "Milestone",
          headline: `${ach.emoji} Achievement Unlocked: ${ach.title} — ${ach.desc}`,
          important: true,
          emoji: ach.emoji,
        });
      }
    }
  } catch {}

  lg.modifiedAt = Date.now();
  return { round: current, newSeries, complete: false };
}

/** Sim entire playoffs to completion (used by the dashboard "Sim
 *  Playoffs" shortcut). */
export function simAllPlayoffs(lg: FootballLeague): void {
  let safety = 0;
  while (!(lg.playoffsBracket as FootballPlayoffs)?.championId && safety < 6) {
    simPlayoffRound(lg);
    safety++;
  }
}

/** Is the regular season over? */
export function isRegularSeasonOver(lg: FootballLeague): boolean {
  return lg.week > 17;
}
