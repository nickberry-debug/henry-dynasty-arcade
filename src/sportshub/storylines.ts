// Sports Hub — shared-engine storyline updater + season history recorder.
// Works for Hockey, Basketball, and CFB. All three sports drive the
// SAME `/src/sports-engine` module via this updater — zero per-sport
// engine changes required.
//
// The MVP race "stat key" varies per sport (hockey: pts, basketball:
// pts, cfb: composite passYds/passTD/rushYds) but the storyline shape
// + intensity ratchet + open/resolve lifecycle is identical.

import type {
  SeasonState, SportPlayer, SportNewsItem, SportHistoryRecord, SportId,
  Result,
} from "./franchise";
import { computeStandings } from "./franchise";
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

function ensureStorylines(state: SeasonState) {
  if (!state.storylines) state.storylines = emptyStorylineState();
  if (!state.storylines.active) state.storylines.active = [];
  if (!state.storylines.resolved) state.storylines.resolved = [];
  return state.storylines;
}

function ensureNews(state: SeasonState) {
  if (!state.newsLog) state.newsLog = [];
  return state.newsLog;
}

function announce(state: SeasonState, headline: string, emoji: string, opts: { teamIds?: string[]; playerIds?: string[]; important?: boolean; category?: SportNewsItem["category"] } = {}) {
  const news = ensureNews(state);
  news.unshift({
    id: `sh-${state.sport}-news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    week: state.currentWeek,
    season: state.year,
    category: opts.category ?? "Drama",
    headline,
    emoji,
    teamIds: opts.teamIds,
    playerIds: opts.playerIds,
    important: opts.important ?? false,
  });
  if (news.length > 150) news.length = 150;
}

/** Per-sport MVP-race scoring — returns top-3 players by composite score
 *  using stat keys appropriate to the sport. */
function topMVPCandidates(state: SeasonState): SportPlayer[] {
  const players = state.players ?? [];
  const active = players.filter(p => (p.seasonStats?.gp ?? 0) > 0);
  if (active.length === 0) return [];
  const score = (p: SportPlayer): number => {
    const s = p.seasonStats;
    if (state.sport === "hockey") {
      // pts = G + A; goalies excluded (use defenseLeader instead)
      if (p.position === "G") return -1;
      return (s.pts ?? 0) + (s.plusMinus ?? 0) * 0.2;
    }
    if (state.sport === "basketball") {
      const gp = Math.max(1, s.gp ?? 1);
      return ((s.pts ?? 0) + (s.reb ?? 0) * 1.2 + (s.ast ?? 0) * 1.5 + (s.stl ?? 0) * 2 + (s.blk ?? 0) * 2) / gp;
    }
    // cfb: total offense composite
    return (s.passYds ?? 0) / 25 + (s.rushYds ?? 0) / 10 + (s.recYds ?? 0) / 10 + ((s.passTD ?? 0) + (s.rushTD ?? 0) + (s.recTD ?? 0)) * 6;
  };
  return active.slice().sort((a, b) => score(b) - score(a)).slice(0, 3);
}

function mvpLabelBits(state: SeasonState, players: SportPlayer[]): string[] {
  return players.map(p => {
    const s = p.seasonStats;
    if (state.sport === "hockey") return `${p.name.split(" ").slice(-1)[0]} (${s.pts ?? 0}p)`;
    if (state.sport === "basketball") {
      const gp = Math.max(1, s.gp ?? 1);
      return `${p.name.split(" ").slice(-1)[0]} (${((s.pts ?? 0) / gp).toFixed(1)}p)`;
    }
    const yds = (s.passYds ?? 0) + (s.rushYds ?? 0) + (s.recYds ?? 0);
    return `${p.name.split(" ").slice(-1)[0]} (${yds}y)`;
  });
}

/** Called from SeasonSim after each simWeek to refresh storylines. */
export function updateSportshubStorylines(state: SeasonState) {
  const stories = ensureStorylines(state);
  const teamById = new Map(state.teams.map(t => [t.id, t]));

  // Per-team last-5 recent-result map for streak detectors.
  const recentByTeam = new Map<string, RecentResult[]>();
  for (const t of state.teams) {
    const played = state.results.filter(r => r.away === t.id || r.home === t.id).slice(-5);
    const rows: RecentResult[] = played.map(r => {
      const isAway = r.away === t.id;
      const myScore = isAway ? r.awayScore : r.homeScore;
      const oppScore = isAway ? r.homeScore : r.awayScore;
      const oppId = isAway ? r.home : r.away;
      const result: "W" | "L" | "T" = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T";
      return { teamId: t.id, result, opponentId: oppId };
    });
    recentByTeam.set(t.id, rows);
  }

  // ── Win streaks (3+) ────────────────────────────────────────────────
  const winners = detectWinStreaks(recentByTeam, 3);
  for (const w of winners) {
    const t = teamById.get(w.teamId);
    if (!t) continue;
    const id = `sh-${state.sport}-winstreak-${state.year}-${t.id}`;
    const before = stories.active.find(s => s.id === id);
    openOrAdvance(stories, {
      id, kind: "winStreak", season: state.year,
      at: { week: state.currentWeek },
      label: `${t.abbr} ${w.len}-game win streak`,
      body: `${t.city} ${t.nickname} ride a ${w.len}-game winning streak.`,
      teamIds: [t.id],
    });
    if (!before) announce(state, `🔥 ${t.abbr} on a ${w.len}-game win streak`, "🔥", { teamIds: [t.id] });
  }
  for (const s of stories.active.slice()) {
    if (s.kind !== "winStreak") continue;
    const stillStreaking = winners.find(w => w.teamId === s.teamIds[0]);
    if (!stillStreaking) resolveStoryline(stories, s.id, "Streak ended.");
  }

  // ── Loss streaks (3+) ───────────────────────────────────────────────
  const losers = detectLossStreaks(recentByTeam, 3);
  for (const l of losers) {
    const t = teamById.get(l.teamId);
    if (!t) continue;
    const id = `sh-${state.sport}-lossstreak-${state.year}-${t.id}`;
    openOrAdvance(stories, {
      id, kind: "loseStreak", season: state.year,
      at: { week: state.currentWeek },
      label: `${t.abbr} ${l.len}-game skid`,
      body: `${t.city} ${t.nickname} have lost ${l.len} in a row.`,
      teamIds: [t.id],
    });
  }
  for (const s of stories.active.slice()) {
    if (s.kind !== "loseStreak") continue;
    const stillSkidding = losers.find(l => l.teamId === s.teamIds[0]);
    if (!stillSkidding) resolveStoryline(stories, s.id, "Skid ended.");
  }

  // ── MVP race — sport-specific scoring, shared storyline open/advance ──
  if (state.currentWeek >= 3 && state.players && state.players.length > 0) {
    const mvpTop = topMVPCandidates(state);
    if (mvpTop.length >= 2) {
      const id = `sh-${state.sport}-mvprace-${state.year}`;
      openOrAdvance(stories, {
        id, kind: "mvpRace", season: state.year,
        at: { week: state.currentWeek },
        label: `MVP race: ${mvpLabelBits(state, mvpTop).join(" · ")}`,
        body: `${mvpTop[0].name} leads the MVP conversation.`,
        playerIds: mvpTop.map(p => p.id),
      });
    }
  }

  // ── Playoff push — last ~25% of regular season ──────────────────────
  const lastWeek = Math.max(0, ...state.schedule.map(g => g.week));
  const weeksLeft = lastWeek - state.currentWeek;
  if (weeksLeft >= 0 && weeksLeft <= Math.ceil(lastWeek * 0.25)) {
    const standings = computeStandings(state);
    const playoffCutoff = state.sport === "cfb" ? 4 : 8;
    const bubble = detectPlayoffPushes(
      standings.map(s => ({ id: s.teamId, wins: s.wins, losses: s.losses, ties: s.ties })),
      playoffCutoff,
      weeksLeft,
    );
    for (const b of bubble) {
      const t = teamById.get(b.teamId);
      if (!t) continue;
      const id = `sh-${state.sport}-playoffpush-${state.year}-${t.id}`;
      openOrAdvance(stories, {
        id, kind: "playoffPush", season: state.year,
        at: { week: state.currentWeek },
        label: `${t.abbr} fighting for playoffs (${b.gamesBack} GB)`,
        body: `${t.city} ${t.nickname} on the bubble — ${b.gamesBack} GB with ${weeksLeft} weeks to play.`,
        teamIds: [t.id],
      });
    }
  }

  // ── Rivalry — divisional/conference matchup with close records ──────
  const weekGames = state.results.filter(r => r.week === state.currentWeek - 1);
  for (const r of weekGames) {
    const a = teamById.get(r.away);
    const h = teamById.get(r.home);
    if (!a || !h) continue;
    if (a.conf !== h.conf) continue;
    const aStand = computeStandings(state).find(s => s.teamId === a.id);
    const hStand = computeStandings(state).find(s => s.teamId === h.id);
    if (!aStand || !hStand) continue;
    if (Math.abs(aStand.wins - hStand.wins) > 2) continue;
    const id = `sh-${state.sport}-rivalry-${state.year}-${[a.id, h.id].sort().join("-")}`;
    openOrAdvance(stories, {
      id, kind: "rivalry", season: state.year,
      at: { week: state.currentWeek },
      label: `${a.abbr} ↔ ${h.abbr} ${a.conf.toUpperCase()} rivalry`,
      body: `${a.city} and ${h.city} battle for ${a.conf.toUpperCase()} position.`,
      teamIds: [a.id, h.id],
    });
  }

  trimResolved(stories, 40);
}

/** Push a news headline for each game played this week — same surface
 *  Football's news log uses. */
export function pushWeeklyGameNews(state: SeasonState, weekIdx: number) {
  const news = ensureNews(state);
  const teamById = new Map(state.teams.map(t => [t.id, t]));
  const weekResults = state.results.filter(r => r.week === weekIdx);
  // Surface only the most lopsided / closest games to keep the feed tight.
  const ranked = weekResults.slice().sort((a, b) => Math.abs(b.awayScore - b.homeScore) - Math.abs(a.awayScore - a.homeScore));
  for (const r of ranked.slice(0, 3)) {
    const a = teamById.get(r.away);
    const h = teamById.get(r.home);
    if (!a || !h) continue;
    news.unshift({
      id: `sh-${state.sport}-game-${weekIdx}-${a.id}-${h.id}`,
      week: weekIdx,
      season: state.year,
      category: "Game",
      headline: `${a.abbr} ${r.awayScore} — ${h.abbr} ${r.homeScore}`,
      teamIds: [a.id, h.id],
      important: Math.abs(r.awayScore - r.homeScore) >= (state.sport === "basketball" ? 18 : state.sport === "cfb" ? 21 : 4),
      emoji: state.sport === "hockey" ? "🏒" : state.sport === "basketball" ? "🏀" : "🏈",
    });
  }
  if (news.length > 150) news.length = 150;
}

/** Called when the bracket champion is crowned — archives leaders +
 *  stamps champion award on the title roster + writes a history row. */
export function recordSportshubSeasonResult(state: SeasonState) {
  if (!state.history) state.history = [];
  if (!state.players) return;
  const players = state.players;
  const champTeam = state.teams.find(t => t.id === state.champion);
  if (!champTeam) return;

  // Final-round result = championship game
  const finalRound = state.bracket?.rounds[state.bracket.rounds.length - 1];
  const finalGame = finalRound?.[0];
  let runnerUp = "";
  if (finalGame?.winner) {
    runnerUp = finalGame.winner === finalGame.teamA ? (finalGame.teamB ?? "") : (finalGame.teamA ?? "");
  }
  const champRecord = (() => {
    const standings = computeStandings(state);
    const champStand = standings.find(s => s.teamId === champTeam.id);
    return champStand ? `${champStand.wins}-${champStand.losses}${champStand.ties ? `-${champStand.ties}` : ""}` : undefined;
  })();

  // MVP — top by composite score (uses sport-specific topMVPCandidates)
  const mvp = topMVPCandidates(state)[0];
  // Scoring leader — single highest "primary scoring" stat
  const scoringKey = state.sport === "hockey" ? "pts" : state.sport === "basketball" ? "pts" : "passYds";
  const scoringLeader = players.slice().sort((a, b) => (b.seasonStats[scoringKey] ?? 0) - (a.seasonStats[scoringKey] ?? 0))[0];
  // Defense leader
  const defenseKey = state.sport === "hockey" ? "saves" : state.sport === "basketball" ? "blk" : "sacks";
  const defenseLeader = players.slice().sort((a, b) => (b.seasonStats[defenseKey] ?? 0) - (a.seasonStats[defenseKey] ?? 0))[0];

  // Stamp awards on winners
  const stamp = (p: SportPlayer | undefined, type: string) => {
    if (!p) return;
    if (!Array.isArray(p.awards)) p.awards = [];
    p.awards.push({ season: state.year, type });
  };
  stamp(mvp, "MVP");
  if (scoringLeader && scoringLeader.id !== mvp?.id) stamp(scoringLeader, "Scoring Title");
  if (defenseLeader) stamp(defenseLeader, "Defense Title");
  // Stamp Champion on every player on the title roster
  for (const p of players) {
    if (p.teamId === champTeam.id) stamp(p, "Champion");
  }

  state.history.unshift({
    season: state.year,
    champion: champTeam.id,
    runnerUp,
    champRecord,
    mvp: mvp ? { playerId: mvp.id, name: mvp.name, statKey: scoringKey, statValue: mvp.seasonStats[scoringKey] ?? 0 } : undefined,
    scoringLeader: scoringLeader ? { playerId: scoringLeader.id, name: scoringLeader.name, value: scoringLeader.seasonStats[scoringKey] ?? 0 } : undefined,
    defenseLeader: defenseLeader ? { playerId: defenseLeader.id, name: defenseLeader.name, value: defenseLeader.seasonStats[defenseKey] ?? 0 } : undefined,
  });

  // News announcing the champion + MVP
  ensureNews(state).unshift(
    {
      id: `sh-${state.sport}-champ-${state.year}`,
      week: state.currentWeek,
      season: state.year,
      category: "Award",
      headline: `🏆 ${champTeam.city} ${champTeam.nickname} crowned ${state.year} champions${champRecord ? ` (${champRecord})` : ""}.`,
      teamIds: [champTeam.id],
      important: true,
      emoji: "🏆",
    },
  );
  if (mvp) {
    ensureNews(state).unshift({
      id: `sh-${state.sport}-mvp-${state.year}`,
      week: state.currentWeek,
      season: state.year,
      category: "Award",
      headline: `⭐ ${mvp.name} wins ${state.year} MVP.`,
      playerIds: [mvp.id],
      important: true,
      emoji: "⭐",
    });
  }
}
