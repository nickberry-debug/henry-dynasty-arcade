// Football achievements — tracked across seasons and surfaced as
// unlocks in the Football Home dashboard. Each one fires automatically
// when its condition triggers during a simulated game / week / season.

import type { FootballLeague, FootballTeam, FootballPlayer } from "./types";

export interface FootballAchievement {
  id: string;
  title: string;
  emoji: string;
  desc: string;
}

export const FOOTBALL_ACHIEVEMENTS: FootballAchievement[] = [
  { id: "first-win",        emoji: "🏈", title: "First Win",                desc: "Your team wins its first regular-season game." },
  { id: "first-loss",       emoji: "💔", title: "First Loss",               desc: "It happens. Now bounce back." },
  { id: "perfect-week",     emoji: "✅", title: "Perfect Week",             desc: "Win every game your team plays in a single week." },
  { id: "five-win-streak",  emoji: "🔥", title: "Five In A Row",            desc: "Win five regular-season games consecutively." },
  { id: "perfect-season",   emoji: "💎", title: "Perfect Season",           desc: "Finish the regular season 17-0." },
  { id: "div-champ",        emoji: "🥉", title: "Division Champion",       desc: "Finish first in your division." },
  { id: "playoff-bid",      emoji: "🎫", title: "Playoff Bid",              desc: "Qualify for the playoffs." },
  { id: "conf-champ",       emoji: "🥈", title: "Conference Champion",     desc: "Win your conference championship." },
  { id: "super-bowl",       emoji: "🏆", title: "Super Bowl Champion",     desc: "Lift the trophy. The big one." },
  { id: "back-to-back",     emoji: "👑", title: "Back-to-Back",            desc: "Win the Super Bowl two seasons in a row." },
  { id: "dynasty",          emoji: "🏛️", title: "Dynasty",                  desc: "Win three Super Bowls in five seasons." },
  { id: "blowout-win",      emoji: "🚀", title: "Blowout",                  desc: "Win a single game by 30+ points." },
  { id: "shutout",          emoji: "🛡️", title: "Shutout Defense",         desc: "Hold an opponent to 0 points." },
  { id: "comeback",         emoji: "🦾", title: "Comeback Kid",             desc: "Win a game after trailing by 17+." },
  { id: "high-scoring",     emoji: "💯", title: "Sixty Burger",             desc: "Score 60+ points in a single game." },
  { id: "first-draft",      emoji: "🎓", title: "First Draft",              desc: "Survive your first rookie draft (run an offseason)." },
  { id: "big-fa-sign",      emoji: "✍️", title: "Big Signing",              desc: "Sign a free agent with OVR 85+." },
  { id: "lifer",            emoji: "🎂", title: "Lifer",                    desc: "Manage the same franchise for 5+ seasons." },
  { id: "ten-seasons",      emoji: "📅", title: "A Full Decade",            desc: "Play 10 seasons of football." },
];

/** Check + unlock achievements after a sim event. Idempotent — already-
 *  unlocked entries don't fire again. Returns the IDs newly unlocked. */
export function checkAchievements(lg: FootballLeague): string[] {
  if (!lg.userTeamId) return [];
  const unlocked: Set<string> = ((lg as any)._achievements ??= new Set<string>());
  // localStorage backup so achievements survive even if state is reset
  const teamId = lg.userTeamId;
  const team = lg.teams.find(t => t.id === teamId);
  if (!team) return [];
  const newly: string[] = [];
  const unlock = (id: string) => { if (!unlocked.has(id)) { unlocked.add(id); newly.push(id); } };

  // first-win / first-loss
  if (team.wins >= 1) unlock("first-win");
  if (team.losses >= 1) unlock("first-loss");

  // streaks — last 5 games for user team
  const myGames = lg.schedule.filter(g => g.played && (g.homeId === teamId || g.awayId === teamId));
  const recent = myGames.slice(-5);
  const allWins = recent.length === 5 && recent.every(g => {
    const myScore = g.homeId === teamId ? g.score?.home : g.score?.away;
    const oppScore = g.homeId === teamId ? g.score?.away : g.score?.home;
    return (myScore ?? 0) > (oppScore ?? 0);
  });
  if (allWins) unlock("five-win-streak");

  // perfect season
  if (lg.week > 17 && team.wins >= 17) unlock("perfect-season");

  // playoff bid + conf champ + Super Bowl via playoffsBracket
  if (lg.playoffsBracket) {
    const bracket = lg.playoffsBracket as any;
    if (bracket?.bracket?.some((s: any) => s.homeId === teamId || s.awayId === teamId)) unlock("playoff-bid");
    if (bracket?.afcChamp === teamId || bracket?.nfcChamp === teamId) unlock("conf-champ");
    if (bracket?.championId === teamId) unlock("super-bowl");
  }

  // div champ — first in division at season's end
  if (lg.week > 17) {
    const division = lg.divisions.find(d => d.teamIds.includes(teamId));
    if (division) {
      const divTeams = lg.teams.filter(t => division.teamIds.includes(t.id))
        .sort((a, b) => b.wins - a.wins);
      if (divTeams[0]?.id === teamId) unlock("div-champ");
    }
  }

  // Per-game records — scan recent games
  for (const g of recent) {
    const myScore = g.homeId === teamId ? g.score?.home ?? 0 : g.score?.away ?? 0;
    const oppScore = g.homeId === teamId ? g.score?.away ?? 0 : g.score?.home ?? 0;
    if (myScore - oppScore >= 30 && myScore > oppScore) unlock("blowout-win");
    if (oppScore === 0 && myScore > 0) unlock("shutout");
    if (myScore >= 60) unlock("high-scoring");
  }

  // Big FA signing
  const userRoster = lg.players.filter(p => p.teamId === teamId);
  if (userRoster.some(p => p.overall >= 85 && p.yearsExp >= 1 && (p as any)._signedAsFA)) unlock("big-fa-sign");

  // Seasons-as-manager — track via lg.season - season-when-first-took-team
  const userSeasonStart = (lg as any)._userSeasonStart ?? lg.season;
  (lg as any)._userSeasonStart = userSeasonStart;
  if (lg.season - userSeasonStart >= 5) unlock("lifer");
  if (lg.season - userSeasonStart >= 10) unlock("ten-seasons");

  // First-draft completion
  if ((lg as any)._draftsCompleted >= 1) unlock("first-draft");

  // Stash back
  (lg as any)._achievements = unlocked;
  return newly;
}

/** Get the achievement objects unlocked for this league. */
export function unlockedAchievements(lg: FootballLeague): FootballAchievement[] {
  const set = ((lg as any)._achievements ?? new Set()) as Set<string>;
  return FOOTBALL_ACHIEVEMENTS.filter(a => set.has(a.id));
}

export function lockedAchievements(lg: FootballLeague): FootballAchievement[] {
  const set = ((lg as any)._achievements ?? new Set()) as Set<string>;
  return FOOTBALL_ACHIEVEMENTS.filter(a => !set.has(a.id));
}
