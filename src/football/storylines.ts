// Football storyline updater. Runs once per simWeek — detects active
// streaks, MVP races, playoff pushes, division rivalries — and feeds
// them through the SHARED sports-engine StorylineTracker. The result is
// that Football's storylines (FootballLeague.storylines) and Baseball's
// (DramaState.storylines2) carry the exact same data shape, so the
// News page + ticker render either sport identically.

import type { FootballLeague, FootballNewsItem } from "./types";
import {
  emptyStorylineState,
  openOrAdvance,
  resolveStoryline,
  trimResolved,
  detectWinStreaks,
  detectLossStreaks,
  detectPlayoffPushes,
  type RecentResult,
} from "../sports-engine";

/** Ensure the league has a StorylineState attached. Idempotent. */
export function ensureStorylines(lg: FootballLeague) {
  if (!lg.storylines) lg.storylines = emptyStorylineState();
  if (!lg.storylines.active) lg.storylines.active = [];
  if (!lg.storylines.resolved) lg.storylines.resolved = [];
  return lg.storylines;
}

/** Push a news item for a freshly-opened storyline so the user actually
 *  sees the arc kick off in the feed. */
function announce(lg: FootballLeague, headline: string, emoji: string, teamIds: string[], playerIds: string[]) {
  const news: FootballNewsItem = {
    id: `fb-storyline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    week: lg.week,
    season: lg.season,
    category: "Drama",
    headline,
    emoji,
    teamIds,
    playerIds,
    important: false,
  };
  lg.newsLog.unshift(news);
}

/** Called from simWeek after the week's games are played. Refreshes all
 *  Football storylines for the current state. */
export function updateFootballStorylines(lg: FootballLeague) {
  const state = ensureStorylines(lg);

  // Build per-team recent-results map (last 5 games each).
  const recentByTeam = new Map<string, RecentResult[]>();
  for (const t of lg.teams) {
    const games = lg.schedule
      .filter(g => g.played && (g.homeId === t.id || g.awayId === t.id))
      .slice(-5);
    const results: RecentResult[] = games.map(g => {
      const isHome = g.homeId === t.id;
      const myScore = isHome ? g.score?.home ?? 0 : g.score?.away ?? 0;
      const oppScore = isHome ? g.score?.away ?? 0 : g.score?.home ?? 0;
      const opp = isHome ? g.awayId : g.homeId;
      const result: "W" | "L" | "T" = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T";
      return { teamId: t.id, result, opponentId: opp };
    });
    recentByTeam.set(t.id, results);
  }

  const teamById = new Map(lg.teams.map(t => [t.id, t]));

  // ── Win streaks (3+) ──────────────────────────────────────────────
  const wins = detectWinStreaks(recentByTeam, 3);
  for (const w of wins) {
    const t = teamById.get(w.teamId);
    if (!t) continue;
    const id = `fb-winstreak-${lg.season}-${t.id}`;
    const before = state.active.find(s => s.id === id);
    const s = openOrAdvance(state, {
      id, kind: "winStreak", season: lg.season,
      at: { week: lg.week },
      label: `${t.abbr} ${w.len}-game win streak`,
      body: `${t.city} ${t.name} ride a ${w.len}-game winning streak.`,
      teamIds: [t.id],
    });
    if (!before) announce(lg, `🔥 ${t.abbr} on a ${w.len}-game win streak`, "🔥", [t.id], []);
  }
  // Resolve win streaks for teams not currently streaking
  for (const s of state.active.slice()) {
    if (s.kind !== "winStreak") continue;
    const teamId = s.teamIds[0];
    const stillStreaking = wins.find(w => w.teamId === teamId);
    if (!stillStreaking) {
      resolveStoryline(state, s.id, "Streak ended.");
      const t = teamById.get(teamId);
      if (t) announce(lg, `❄️ ${t.abbr} win streak ends`, "❄️", [t.id], []);
    }
  }

  // ── Loss streaks (3+) ─────────────────────────────────────────────
  const losses = detectLossStreaks(recentByTeam, 3);
  for (const l of losses) {
    const t = teamById.get(l.teamId);
    if (!t) continue;
    const id = `fb-lossstreak-${lg.season}-${t.id}`;
    const before = state.active.find(s => s.id === id);
    openOrAdvance(state, {
      id, kind: "loseStreak", season: lg.season,
      at: { week: lg.week },
      label: `${t.abbr} ${l.len}-game skid`,
      body: `${t.city} ${t.name} have lost ${l.len} in a row.`,
      teamIds: [t.id],
    });
    if (!before) announce(lg, `📉 ${t.abbr} ${l.len}-game skid`, "📉", [t.id], []);
  }
  for (const s of state.active.slice()) {
    if (s.kind !== "loseStreak") continue;
    const teamId = s.teamIds[0];
    const stillSkidding = losses.find(l => l.teamId === teamId);
    if (!stillSkidding) resolveStoryline(state, s.id, "Skid ended.");
  }

  // ── MVP race (top 3 QBs by passYds, only if season is ≥6 weeks in) ─
  if (lg.week >= 6) {
    const qbs = lg.players
      .filter(p => p.position === "QB" && !p.retired && (p.seasonStats.passAtt ?? 0) > 0)
      .sort((a, b) => (b.seasonStats.passYds ?? 0) - (a.seasonStats.passYds ?? 0))
      .slice(0, 3);
    if (qbs.length >= 2) {
      const id = `fb-mvprace-${lg.season}`;
      const top = qbs[0];
      const gap = (qbs[0].seasonStats.passYds ?? 0) - (qbs[1].seasonStats.passYds ?? 0);
      openOrAdvance(state, {
        id, kind: "mvpRace", season: lg.season,
        at: { week: lg.week },
        label: `MVP race: ${qbs.map(q => `${q.name.split(" ")[1] ?? q.name} (${q.seasonStats.passYds}y)`).join(" · ")}`,
        body: `${top.name} leads the MVP race${gap < 200 ? ` by just ${gap} passing yards` : ""}.`,
        playerIds: qbs.map(q => q.id),
      });
    }
  }

  // ── Playoff push (last 4 weeks of season) ────────────────────────
  const totalWeeks = Math.max(...lg.schedule.map(g => g.week), lg.week);
  const weeksLeft = totalWeeks - lg.week;
  if (weeksLeft >= 0 && weeksLeft <= 4) {
    const conf0 = lg.teams.filter(t => t.conferenceId === 0);
    const conf1 = lg.teams.filter(t => t.conferenceId === 1);
    for (const conf of [conf0, conf1]) {
      const bubble = detectPlayoffPushes(
        conf.map(t => ({ id: t.id, wins: t.wins, losses: t.losses, ties: t.ties })),
        4, // top 4 per conference
        weeksLeft,
      );
      for (const b of bubble) {
        const t = teamById.get(b.teamId);
        if (!t) continue;
        const id = `fb-playoffpush-${lg.season}-${t.id}`;
        openOrAdvance(state, {
          id, kind: "playoffPush", season: lg.season,
          at: { week: lg.week },
          label: `${t.abbr} fighting for playoffs (${b.gamesBack} GB)`,
          body: `${t.city} ${t.name} are on the bubble — ${b.gamesBack} game${b.gamesBack === 1 ? "" : "s"} back with ${weeksLeft} to play.`,
          teamIds: [t.id],
        });
      }
    }
  }

  // ── Division rivalry — flag any divisional matchup played this week
  //    where the teams are within 1 game of each other in record.
  const weekGames = lg.schedule.filter(g => g.week === lg.week && g.played);
  for (const g of weekGames) {
    const home = teamById.get(g.homeId);
    const away = teamById.get(g.awayId);
    if (!home || !away || home.divisionId !== away.divisionId) continue;
    const recordGap = Math.abs(home.wins - away.wins);
    if (recordGap > 1) continue;
    const id = `fb-rivalry-${lg.season}-${[home.id, away.id].sort().join("-")}`;
    openOrAdvance(state, {
      id, kind: "rivalry", season: lg.season,
      at: { week: lg.week },
      label: `${home.abbr} ↔ ${away.abbr} division rivalry`,
      body: `${home.city} and ${away.city} fight for the ${home.divisionId} division.`,
      teamIds: [home.id, away.id],
    });
  }

  // Cap memory
  trimResolved(state, 30);
}

/** Reset storylines at the start of a new season — keep last year's
 *  resolved arcs in the resolved pile for the History tab, drop active. */
export function rolloverStorylinesForNewSeason(lg: FootballLeague) {
  const state = ensureStorylines(lg);
  for (const s of state.active.slice()) {
    resolveStoryline(state, s.id, "Season ended.");
  }
  trimResolved(state, 60);
}
