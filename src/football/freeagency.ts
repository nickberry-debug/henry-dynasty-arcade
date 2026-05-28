// Football free agency. Builds a pool of declared free agents at season
// rollover (cut veterans, expiring rookies, etc), gives the user a chance
// to sign before CPU teams snap up the best.
import type { FootballLeague, FootballPlayer } from "./types";
import { rand, irnd } from "../utils/rand";

/** Run at the end of every season, after playoffs + before development.
 *  A subset of veterans become free agents; teams with cap-equivalents
 *  release lower-rated players. */
export function declareFreeAgents(lg: FootballLeague): { fas: FootballPlayer[] } {
  const fas: FootballPlayer[] = [];
  // ~8% of players per team become free agents each year. Bias toward
  // older veterans, players with weaker stats.
  for (const team of lg.teams) {
    const roster = lg.players.filter(p => p.teamId === team.id && !p.retired);
    // Sort by "expendability" — older + lower rated first.
    const expendability = (p: FootballPlayer) => {
      const ageFactor = Math.max(0, p.age - 26) * 4;
      const ratingFactor = Math.max(0, 80 - p.overall);
      return ageFactor + ratingFactor + (rand() * 10);
    };
    const ranked = roster.slice().sort((a, b) => expendability(b) - expendability(a));
    const cutCount = Math.max(2, Math.floor(roster.length * 0.08));
    for (let i = 0; i < cutCount && i < ranked.length; i++) {
      const p = ranked[i];
      p.teamId = null;
      fas.push(p);
    }
  }
  lg.freeAgents.push(...fas);

  if (fas.length > 0) {
    const top = fas.sort((a, b) => b.overall - a.overall)[0];
    lg.newsLog.unshift({
      id: `fn-fa-pool-${lg.season}`,
      week: 0,
      season: lg.season,
      category: "Drama",
      headline: `📋 Free agency opens — ${fas.length} players hit the market. Top name: ${top.name} (OVR ${top.overall}).`,
      important: true,
      emoji: "📋",
    });
  }

  return { fas };
}

/** User signs a free agent to their team. */
export function signFreeAgent(lg: FootballLeague, playerId: string, teamId: string): boolean {
  const fa = lg.freeAgents.find(p => p.id === playerId);
  if (!fa) return false;
  const team = lg.teams.find(t => t.id === teamId);
  if (!team) return false;
  fa.teamId = teamId;
  // Tag the player so the FootballPlayer-modal / achievement engine can
  // identify them as a "signed FA" rather than original draftee.
  (fa as any)._signedAsFA = true;
  lg.freeAgents = lg.freeAgents.filter(p => p.id !== playerId);
  lg.players.push(fa);
  lg.newsLog.unshift({
    id: `fn-sign-${fa.id}-${Date.now()}`,
    week: 0,
    season: lg.season,
    category: "Trade",
    headline: `✍️ ${team.abbr} sign ${fa.name} (${fa.position}, OVR ${fa.overall}).`,
    important: fa.overall >= 80,
    teamIds: [team.id],
    playerIds: [fa.id],
    emoji: "✍️",
  });
  return true;
}

/** CPU teams autosign the best available FAs. Called at end of FA window. */
export function cpuAutoSignFAs(lg: FootballLeague): number {
  let signed = 0;
  // Sort remaining FAs by overall desc.
  const remaining = lg.freeAgents.slice().sort((a, b) => b.overall - a.overall);
  // Each team picks 2-4 FAs to sign — best CPU teams pick first.
  const teamOrder = lg.teams.slice().sort((a, b) => (b.wins - a.wins) || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)));
  let idx = 0;
  for (let round = 0; round < 3; round++) {
    for (const team of teamOrder) {
      if (idx >= remaining.length) break;
      const target = remaining[idx];
      // Don't autosign for the user team.
      if (team.id === lg.userTeamId) { idx++; continue; }
      // Random skip — CPU teams might not sign every FA.
      if (rand() < 0.25) { idx++; continue; }
      signFreeAgent(lg, target.id, team.id);
      signed++;
      idx++;
    }
  }
  return signed;
}
