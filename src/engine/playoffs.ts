import type { League, PlayoffMatch, Playoffs, Game } from "../store/types";
import { getTeam, getPlayer } from "./league";
import { simulateGame, applyGameResult } from "./sim";
import { computeSeasonAwards, endSeasonAdvance, pushNews } from "./season";
import { uid, rand } from "../utils/rand";

export function startPlayoffs(lg: League) {
  // Top N teams from each division + wildcards
  const numDivs = lg.divisions.length;
  const playoffTeams: any[] = [];
  // Division winners
  lg.divisions.forEach(d => {
    const teams = d.teamIds.map(id => getTeam(lg, id)!).filter(Boolean);
    teams.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
    if (teams[0]) playoffTeams.push(teams[0]);
  });
  // Wild cards: remaining teams by record
  const claimed = new Set(playoffTeams.map(t => t.id));
  const remaining = lg.teams.filter(t => !claimed.has(t.id)).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  const wcCount = Math.max(0, Math.min(remaining.length, numDivs * 2));
  for (let i = 0; i < wcCount; i++) playoffTeams.push(remaining[i]);

  // Seed
  playoffTeams.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  playoffTeams.forEach((t, i) => { t.playoffSeed = i + 1; });

  // Build first round matches (high vs low)
  const round1: PlayoffMatch[] = [];
  for (let i = 0; i < playoffTeams.length / 2; i++) {
    round1.push({
      high: playoffTeams[i].id,
      low: playoffTeams[playoffTeams.length - 1 - i].id,
      wins: { high: 0, low: 0 },
      bestOf: lg.settings.gameplay.playoffFormat.wildCard,
      games: [],
      winner: null
    });
  }
  const po: Playoffs = {
    roundIdx: 0,
    rounds: [
      { name: "Wild Card", matches: round1 },
      { name: "Division Series", matches: [] },
      { name: "Championship Series", matches: [] },
      { name: "World Series", matches: [] }
    ]
  };
  lg.playoffs = po;
  lg.phase = "playoffs";
  pushNews(lg, { category: "Game", headline: `${lg.year} playoffs begin!`, important: true });
}

function simMatch(lg: League, m: PlayoffMatch) {
  const needed = Math.ceil(m.bestOf / 2);
  while (m.wins.high < needed && m.wins.low < needed) {
    // Higher seed gets home advantage in early games
    const game: Game = {
      id: uid("po"),
      day: lg.day,
      homeId: m.wins.high + m.wins.low < 2 ? m.high : (rand() < 0.5 ? m.high : m.low),
      awayId: "",
      played: false,
      isPlayoff: true,
      score: null
    };
    game.awayId = game.homeId === m.high ? m.low : m.high;
    const result = simulateGame(lg, game, { recordPlays: false, universalDH: lg.settings.gameplay.universalDH });
    applyGameResult(lg, game, result);
    m.games.push(game);
    const homeWon = result.homeRuns > result.awayRuns;
    if ((game.homeId === m.high) === homeWon) m.wins.high++; else m.wins.low++;
  }
  m.winner = m.wins.high > m.wins.low ? m.high : m.low;
}

export function simCurrentRound(lg: League): boolean {
  if (!lg.playoffs) return false;
  const round = lg.playoffs.rounds[lg.playoffs.roundIdx];
  round.matches.forEach(m => { if (!m.winner) simMatch(lg, m); });
  return advancePlayoffs(lg);
}

export function advancePlayoffs(lg: League): boolean {
  const po = lg.playoffs!;
  const cur = po.rounds[po.roundIdx];
  const allDone = cur.matches.every(m => m.winner);
  if (!allDone) return false;
  const winners = cur.matches.map(m => getTeam(lg, m.winner!)!).filter(Boolean);
  if (po.roundIdx === po.rounds.length - 1) {
    // World Series done
    const champ = winners[0];
    pushNews(lg, { category: "Game", headline: `${champ.name} are ${lg.year} World Series CHAMPIONS!`, teamIds: [champ.id], important: true });
    finalizeSeason(lg);
    return true;
  }
  // Build next round
  winners.sort((a, b) => (a.playoffSeed ?? 99) - (b.playoffSeed ?? 99));
  const nextRound = po.rounds[po.roundIdx + 1];
  const fmt = lg.settings.gameplay.playoffFormat;
  const nextBestOf = po.roundIdx === 0 ? fmt.lds : po.roundIdx === 1 ? fmt.lcs : fmt.ws;
  for (let i = 0; i < winners.length / 2; i++) {
    nextRound.matches.push({
      high: winners[i].id,
      low: winners[winners.length - 1 - i].id,
      wins: { high: 0, low: 0 },
      bestOf: nextBestOf,
      games: [],
      winner: null
    });
  }
  po.roundIdx++;
  return false;
}

export function simAllPlayoffs(lg: League) {
  while (lg.playoffs && lg.phase === "playoffs") {
    simCurrentRound(lg);
  }
}

function finalizeSeason(lg: League) {
  // Compute and store awards
  const awards = computeSeasonAwards(lg);
  lg.seasonAwards = awards;
  // Update history
  const ws = lg.playoffs!.rounds[lg.playoffs!.rounds.length - 1].matches[0];
  if (ws) {
    const champ = getTeam(lg, ws.winner!)!;
    const ru = getTeam(lg, ws.high === ws.winner ? ws.low : ws.high)!;
    lg.history.unshift({
      year: lg.year,
      champion: champ.id,
      runnerUp: ru.id,
      champRecord: `${champ.wins}-${champ.losses}`,
      mvp: getPlayer(lg, awards.mvp || "")?.name || "—",
      cy: getPlayer(lg, awards.cyYoung || "")?.name || "—",
      roy: getPlayer(lg, awards.roy || "")?.name || "—",
      hrLeader: awards.hrChamp ? { name: getPlayer(lg, awards.hrChamp)?.name || "", hr: getPlayer(lg, awards.hrChamp)?.seasonStats.hr ?? 0 } : undefined
    });
  }
  endSeasonAdvance(lg);
}
