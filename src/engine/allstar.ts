// All-Star event: roster construction, Home Run Derby simulation, ASG simulation.
import type { League, Player, Position, AllStarEvent, AllStarRoster, DerbyParticipant } from "../store/types";
import { uid } from "../utils/rand";

const POS: Position[] = ["C","1B","2B","3B","SS","LF","CF","RF","DH"];

function bestAtPos(players: Player[], pos: Position): Player | null {
  const candidates = players.filter(p => !p.isPitcher && (p.position === pos || p.altPosition === pos));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.seasonStats.ops ?? 0) + b.overall / 200 - (a.seasonStats.ops ?? 0) - a.overall / 200);
  return candidates[0];
}

function bestPitchers(players: Player[], n: number): Player[] {
  const ps = players.filter(p => p.isPitcher).slice();
  ps.sort((a, b) => {
    const aEra = a.seasonStats.era ?? 99;
    const bEra = b.seasonStats.era ?? 99;
    return aEra - bEra + (b.overall - a.overall) / 50;
  });
  return ps.slice(0, n);
}

export function initAllStar(lg: League, userPicksMax: number = 1): AllStarEvent {
  // Split teams into two leagues (AL/NL) by division index parity
  const alTeamIds = new Set(lg.teams.filter((_, i) => i % 2 === 0).map(t => t.id));
  const alPlayers = lg.players.filter(p => p.teamId && alTeamIds.has(p.teamId));
  const nlPlayers = lg.players.filter(p => p.teamId && !alTeamIds.has(p.teamId));

  const buildRoster = (players: Player[], league: "AL" | "NL"): AllStarRoster => {
    const starters: Record<Position, string | null> = {
      C: null,"1B": null,"2B": null,"3B": null,SS: null,LF: null,CF: null,RF: null,DH: null,
      SP: null,RP: null,CL: null,UT: null
    };
    POS.forEach(pos => {
      const b = bestAtPos(players, pos);
      starters[pos] = b?.id ?? null;
    });
    const pitchers = bestPitchers(players, 6).map(p => p.id);
    // Reserves: next best position players
    const usedIds = new Set(Object.values(starters).filter(Boolean) as string[]);
    pitchers.forEach(id => usedIds.add(id));
    const remaining = players.filter(p => !p.isPitcher && !usedIds.has(p.id));
    remaining.sort((a, b) => (b.seasonStats.ops ?? 0) - (a.seasonStats.ops ?? 0));
    const reserves = remaining.slice(0, 6).map(p => p.id);
    return { league, starters, reserves, pitchers };
  };

  const userTeamLeague: "AL" | "NL" = lg.userTeamId && alTeamIds.has(lg.userTeamId) ? "AL" : "NL";
  const userTeamPlayers = lg.userTeamId ? lg.players.filter(p => p.teamId === lg.userTeamId) : [];

  return {
    year: lg.year,
    rosters: { AL: buildRoster(alPlayers, "AL"), NL: buildRoster(nlPlayers, "NL") },
    userPicksRemaining: userTeamPlayers.length > 0 ? userPicksMax : 0,
    derby: { participants: pickDerbyParticipants(lg), champion: null, round: 0 },
    game: { played: false, score: null, mvp: null }
  };
}

function pickDerbyParticipants(lg: League): DerbyParticipant[] {
  const hitters = lg.players.filter(p => !p.isPitcher && (p.seasonStats.hr ?? 0) > 5);
  hitters.sort((a, b) => (b.seasonStats.hr ?? 0) - (a.seasonStats.hr ?? 0));
  return hitters.slice(0, 8).map(p => ({ playerId: p.id, round1: 0, round2: 0, round3: 0 }));
}

export function nominateUserAllStar(lg: League, playerId: string): boolean {
  if (!lg.allStar || lg.allStar.userPicksRemaining <= 0) return false;
  const player = lg.players.find(p => p.id === playerId);
  if (!player) return false;
  const userTeamPlayer = player.teamId === lg.userTeamId;
  if (!userTeamPlayer) return false;
  const al = lg.teams.findIndex(t => t.id === lg.userTeamId) % 2 === 0;
  const roster = al ? lg.allStar.rosters.AL : lg.allStar.rosters.NL;
  if (player.isPitcher) {
    if (!roster.pitchers.includes(player.id)) roster.pitchers.push(player.id);
  } else {
    if (!roster.reserves.includes(player.id) && !Object.values(roster.starters).includes(player.id)) {
      roster.reserves.push(player.id);
    }
  }
  lg.allStar.userPicksRemaining -= 1;
  if (!lg.achievements.includes("all-star-pick")) lg.achievements.push("all-star-pick");
  return true;
}

export function simDerbyRound(lg: League): boolean {
  if (!lg.allStar) return false;
  const derby = lg.allStar.derby;
  if (derby.champion) return false;
  const seedRng = (seed: number) => {
    let s = seed | 0;
    return () => {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 0) % 1000) / 1000;
    };
  };
  const rng = seedRng(lg.day + lg.year + derby.round * 31);
  if (derby.round === 0) {
    // First round: all 8 swing
    derby.participants.forEach(p => {
      const player = lg.players.find(pl => pl.id === p.playerId);
      const power = player ? Math.max((player.ratings.powerL + player.ratings.powerR) / 2, 50) : 60;
      p.round1 = Math.round((power - 50) * 0.6 + rng() * 14 + 4);
    });
    derby.round = 1;
    return true;
  }
  if (derby.round === 1) {
    // Top 4 by round1 advance
    const top4 = [...derby.participants].sort((a, b) => b.round1 - a.round1).slice(0, 4);
    top4.forEach(p => {
      const player = lg.players.find(pl => pl.id === p.playerId);
      const power = player ? Math.max((player.ratings.powerL + player.ratings.powerR) / 2, 50) : 60;
      p.round2 = Math.round((power - 50) * 0.5 + rng() * 16 + 5);
    });
    derby.round = 2;
    return true;
  }
  if (derby.round === 2) {
    // Top 2 swing off
    const top4 = [...derby.participants].sort((a, b) => b.round1 - a.round1).slice(0, 4);
    const top2 = [...top4].sort((a, b) => b.round2 - a.round2).slice(0, 2);
    top2.forEach(p => {
      const player = lg.players.find(pl => pl.id === p.playerId);
      const power = player ? Math.max((player.ratings.powerL + player.ratings.powerR) / 2, 50) : 60;
      p.round3 = Math.round((power - 50) * 0.5 + rng() * 12 + 4);
    });
    const winner = top2[0].round3 >= top2[1].round3 ? top2[0] : top2[1];
    derby.champion = winner.playerId;
    derby.round = 3;
    const winnerPlayer = lg.players.find(p => p.id === winner.playerId);
    if (winnerPlayer && winnerPlayer.teamId === lg.userTeamId && !lg.achievements.includes("derby-champ")) {
      lg.achievements.push("derby-champ");
    }
    lg.newsLog.unshift({
      id: uid("n"), day: lg.day, year: lg.year, category: "Award",
      headline: `${winnerPlayer?.name ?? "Champion"} wins the Home Run Derby!`,
      important: true
    });
    return true;
  }
  return false;
}

export function simAllStarGame(lg: League): void {
  if (!lg.allStar || lg.allStar.game.played) return;
  const seedRng = (seed: number) => {
    let s = seed | 0;
    return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 1000) / 1000; };
  };
  const rng = seedRng(lg.day + lg.year + 999);
  const linescoreAL: number[] = [];
  const linescoreNL: number[] = [];
  let alScore = 0;
  let nlScore = 0;
  for (let inn = 0; inn < 9; inn++) {
    const a = rng() < 0.4 ? Math.floor(rng() * 3) : 0;
    const n = rng() < 0.4 ? Math.floor(rng() * 3) : 0;
    alScore += a; nlScore += n;
    linescoreAL.push(a);
    linescoreNL.push(n);
  }
  // Pick MVP from winning league
  const winningRoster = alScore > nlScore ? lg.allStar.rosters.AL : lg.allStar.rosters.NL;
  const candidates = [...Object.values(winningRoster.starters).filter(Boolean), ...winningRoster.reserves] as string[];
  const mvpId = candidates[Math.floor(rng() * candidates.length)] ?? null;
  lg.allStar.game.played = true;
  lg.allStar.game.score = { AL: alScore, NL: nlScore };
  lg.allStar.game.mvp = mvpId;
  lg.allStar.game.linescore = { AL: linescoreAL, NL: linescoreNL };
  const mvp = mvpId ? lg.players.find(p => p.id === mvpId) : null;
  lg.newsLog.unshift({
    id: uid("n"), day: lg.day, year: lg.year, category: "Award",
    headline: `${alScore > nlScore ? "American League" : "National League"} wins All-Star Game ${Math.max(alScore, nlScore)}-${Math.min(alScore, nlScore)}${mvp ? ` — ${mvp.name} named MVP.` : ""}`,
    important: true
  });
}
