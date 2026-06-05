// Baseball storyline updater. Mirrors Football's pattern in
// /src/football/storylines.ts — refreshes ongoing storylines each day
// the engine ticks. Drives `league.drama.storylines2` (StorylineState)
// through the EXACT shared /src/sports-engine helpers that Football
// uses, with zero Football-specific assumptions.
//
// Baseball signals → shared storyline kinds:
//   • win/loseStreak  — team last-N games
//   • rivalry         — head-to-head between team.rivalIds when records close
//   • mvpRace         — top 3 hitters by composite HR/RBI/AVG/R score
//   • playoffPush     — last ~30 days of the regular season, ≤3 GB
//   • milestoneWatch  — career HR/H/W/K approaching round numbers
//   • rookieRise      — yearsExp ≤ 1 with strong stats
//   • comeback        — player back from a recent IL stint

import type { League, NewsItem, Player } from "../store/types";
import {
  openOrAdvance,
  resolveStoryline,
  trimResolved,
  detectWinStreaks,
  detectLossStreaks,
  detectPlayoffPushes,
  emptyStorylineState,
  type RecentResult,
} from "../sports-engine";
import { ensureDramaState } from "./drama";
import { uid } from "../utils/rand";

/** Push a news headline announcing a freshly-opened storyline. */
function announceBaseball(lg: League, headline: string, emoji: string, teamIds: string[], playerIds: string[]) {
  const item: NewsItem = {
    id: uid("n-story"),
    day: lg.day,
    year: lg.year,
    category: "Drama",
    headline,
    emoji,
    teamIds,
    playerIds,
    important: false,
    source: "sim",
  };
  lg.newsLog.unshift(item);
  if (lg.newsLog.length > 300) lg.newsLog.length = 300;
}

/** Refresh Baseball storylines — called from the daily tick. Idempotent
 *  (running it multiple times for the same day is safe; openOrAdvance
 *  increments intensity but only if we re-detect the condition). */
export function updateBaseballStorylines(lg: League) {
  const drama = ensureDramaState(lg);
  if (!drama.storylines2) drama.storylines2 = emptyStorylineState();
  const state = drama.storylines2;

  // ── Recent-results map per team (last 5 played games) ───────────────
  const recentByTeam = new Map<string, RecentResult[]>();
  for (const t of lg.teams) {
    const played = lg.schedule
      .filter(g => g.played && g.score && (g.homeId === t.id || g.awayId === t.id))
      .slice(-5);
    const results: RecentResult[] = played.map(g => {
      const isHome = g.homeId === t.id;
      const myScore = isHome ? g.score!.home : g.score!.away;
      const oppScore = isHome ? g.score!.away : g.score!.home;
      const oppId = isHome ? g.awayId : g.homeId;
      const result: "W" | "L" | "T" = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T";
      return { teamId: t.id, result, opponentId: oppId };
    });
    recentByTeam.set(t.id, results);
  }

  const teamById = new Map(lg.teams.map(t => [t.id, t]));
  const playerById = new Map(lg.players.map(p => [p.id, p]));

  // ── Win streaks (4+ for baseball — long seasons need a higher bar) ──
  const wins = detectWinStreaks(recentByTeam, 4);
  for (const w of wins) {
    const t = teamById.get(w.teamId);
    if (!t) continue;
    const id = `bb-winstreak-${lg.year}-${t.id}`;
    const before = state.active.find(s => s.id === id);
    openOrAdvance(state, {
      id, kind: "winStreak", season: lg.year,
      at: { day: lg.day },
      label: `${t.abbr} ${w.len}-game win streak`,
      body: `${t.city} ${t.name} ride a ${w.len}-game winning streak.`,
      teamIds: [t.id],
    });
    if (!before) {
      announceBaseball(lg, `🔥 ${t.abbr} on a ${w.len}-game winning streak`, "🔥", [t.id], []);
    }
  }
  // Resolve win streaks for teams not currently streaking
  for (const s of state.active.slice()) {
    if (s.kind !== "winStreak") continue;
    const teamId = s.teamIds[0];
    const stillStreaking = wins.find(w => w.teamId === teamId);
    if (!stillStreaking) {
      resolveStoryline(state, s.id, "Streak ended.");
    }
  }

  // ── Loss streaks (4+) ────────────────────────────────────────────────
  const losses = detectLossStreaks(recentByTeam, 4);
  for (const l of losses) {
    const t = teamById.get(l.teamId);
    if (!t) continue;
    const id = `bb-lossstreak-${lg.year}-${t.id}`;
    const before = state.active.find(s => s.id === id);
    openOrAdvance(state, {
      id, kind: "loseStreak", season: lg.year,
      at: { day: lg.day },
      label: `${t.abbr} ${l.len}-game skid`,
      body: `${t.city} ${t.name} have lost ${l.len} in a row.`,
      teamIds: [t.id],
    });
    if (!before) {
      announceBaseball(lg, `📉 ${t.abbr} ${l.len}-game skid`, "📉", [t.id], []);
    }
  }
  for (const s of state.active.slice()) {
    if (s.kind !== "loseStreak") continue;
    const teamId = s.teamIds[0];
    const stillSkidding = losses.find(x => x.teamId === teamId);
    if (!stillSkidding) resolveStoryline(state, s.id, "Skid ended.");
  }

  // ── MVP race — top 3 hitters by composite score, once ~25% of season is in ──
  if (lg.day >= Math.floor(lg.settings.gameplay.scheduleLength * 0.25)) {
    const score = (p: Player) => {
      const s = p.seasonStats;
      return (s.hr ?? 0) * 4 + (s.rbi ?? 0) * 1.5 + (s.avg ?? 0) * 200 + (s.r ?? 0);
    };
    const hitters = lg.players
      .filter(p => !p.isPitcher && !p.retired && (p.seasonStats.ab ?? 0) >= 50)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 3);
    if (hitters.length >= 2) {
      const id = `bb-mvprace-${lg.year}`;
      const top = hitters[0];
      const labelBits = hitters.map(h => `${h.name.split(" ")[1] ?? h.name} (${h.seasonStats.hr ?? 0}/${h.seasonStats.rbi ?? 0}/${(h.seasonStats.avg ?? 0).toFixed(3).slice(1)})`);
      openOrAdvance(state, {
        id, kind: "mvpRace", season: lg.year,
        at: { day: lg.day },
        label: `MVP race: ${labelBits.join(" · ")}`,
        body: `${top.name} leads the MVP conversation with ${top.seasonStats.hr ?? 0} HR / ${top.seasonStats.rbi ?? 0} RBI / .${((top.seasonStats.avg ?? 0) * 1000).toFixed(0).padStart(3, "0")} avg.`,
        playerIds: hitters.map(h => h.id),
      });
    }

    // Cy Young race — top 3 pitchers
    const pscore = (p: Player) => {
      const s = p.seasonStats;
      return (s.w ?? 0) * 10 + (s.pk ?? 0) * 0.4 - (s.era ?? 5) * 12 + (s.sv ?? 0) * 2.5;
    };
    const pitchers = lg.players
      .filter(p => p.isPitcher && !p.retired && ((p.seasonStats.ip ?? 0) >= 20))
      .sort((a, b) => pscore(b) - pscore(a))
      .slice(0, 3);
    if (pitchers.length >= 2) {
      const id = `bb-cyyoung-${lg.year}`;
      const top = pitchers[0];
      const labelBits = pitchers.map(p => `${p.name.split(" ")[1] ?? p.name} (${p.seasonStats.w ?? 0}W, ${(p.seasonStats.era ?? 0).toFixed(2)} ERA)`);
      openOrAdvance(state, {
        id, kind: "mvpRace", season: lg.year,
        at: { day: lg.day },
        label: `Cy Young race: ${labelBits.join(" · ")}`,
        body: `${top.name} is the early Cy Young favorite — ${top.seasonStats.w ?? 0} wins, ${(top.seasonStats.era ?? 0).toFixed(2)} ERA.`,
        playerIds: pitchers.map(p => p.id),
        emoji: "⚾",
      });
    }
  }

  // ── Playoff push — last 25% of the season, ≤2 GB of cutoff ──────────
  const daysLeft = Math.max(0, lg.settings.gameplay.scheduleLength - lg.day);
  if (daysLeft <= Math.ceil(lg.settings.gameplay.scheduleLength * 0.25) && lg.day > 5) {
    const standings = lg.teams.map(t => ({ id: t.id, wins: t.wins, losses: t.losses, ties: 0 }));
    const playoffSlots = (lg.settings.gameplay.playoffFormat?.wildCard ?? 4) * lg.divisions.length;
    const playoffCutoff = Math.max(4, Math.min(playoffSlots, lg.teams.length / 2));
    const bubble = detectPlayoffPushes(standings, playoffCutoff, Math.ceil(daysLeft / 5));
    for (const b of bubble) {
      const t = teamById.get(b.teamId);
      if (!t) continue;
      const id = `bb-playoffpush-${lg.year}-${t.id}`;
      openOrAdvance(state, {
        id, kind: "playoffPush", season: lg.year,
        at: { day: lg.day },
        label: `${t.abbr} fighting for a playoff spot (${b.gamesBack} GB)`,
        body: `${t.city} ${t.name} are on the bubble — ${b.gamesBack} game${b.gamesBack === 1 ? "" : "s"} back with ${daysLeft} days to play.`,
        teamIds: [t.id],
      });
    }
  }

  // ── Rivalry — divisional matchup played today between teams with close records ──
  const todayGames = lg.schedule.filter(g => g.day === lg.day && g.played);
  for (const g of todayGames) {
    const home = teamById.get(g.homeId);
    const away = teamById.get(g.awayId);
    if (!home || !away) continue;
    // Baseball uses team.rivalIds (top 2 in division). Honor those first.
    const declaredRivals = (home.rivalIds ?? []).includes(away.id);
    const sameDivision = home.divisionId === away.divisionId;
    if (!declaredRivals && !sameDivision) continue;
    const recordGap = Math.abs(home.wins - away.wins);
    if (recordGap > 3) continue;
    const id = `bb-rivalry-${lg.year}-${[home.id, away.id].sort().join("-")}`;
    openOrAdvance(state, {
      id, kind: "rivalry", season: lg.year,
      at: { day: lg.day },
      label: `${home.abbr} ↔ ${away.abbr} rivalry`,
      body: `${home.city} and ${away.city} ${declaredRivals ? "renew their rivalry" : "fight for division position"}.`,
      teamIds: [home.id, away.id],
    });
  }

  // ── Milestone watch — career counting stats nearing round numbers ───
  // Only run occasionally (every 5 days) to avoid spam.
  if (lg.day % 5 === 0) {
    for (const p of lg.players) {
      if (p.retired) continue;
      const career = p.careerStats ?? [];
      const careerHR = career.reduce((s, c) => s + (c.hr ?? 0), 0) + (p.seasonStats.hr ?? 0);
      const careerH = career.reduce((s, c) => s + (c.h ?? 0), 0) + (p.seasonStats.h ?? 0);
      const careerW = career.reduce((s, c) => s + (c.w ?? 0), 0) + (p.seasonStats.w ?? 0);
      const careerK = career.reduce((s, c) => s + (c.pk ?? 0), 0) + (p.seasonStats.pk ?? 0);

      // Trigger watch when within 15 of a major round (100/200/300 HR, 1000/2000/3000 H, 100/200/300 W, 1000/2000/3000 K).
      const milestoneNear = (val: number, marks: number[]) => marks.find(m => val < m && m - val <= 15);

      let triggered: { kind: string; target: number; label: string; emoji: string } | null = null;
      if (!p.isPitcher) {
        const hrMark = milestoneNear(careerHR, [100, 200, 300, 400, 500]);
        if (hrMark) triggered = { kind: "hr", target: hrMark, label: `${p.name} ${hrMark - careerHR} HR from career #${hrMark}`, emoji: "💥" };
        else {
          const hMark = milestoneNear(careerH, [1000, 2000, 3000]);
          if (hMark) triggered = { kind: "h", target: hMark, label: `${p.name} ${hMark - careerH} hits from career #${hMark}`, emoji: "📈" };
        }
      } else {
        const wMark = milestoneNear(careerW, [100, 200, 300]);
        if (wMark) triggered = { kind: "w", target: wMark, label: `${p.name} ${wMark - careerW} wins from career #${wMark}`, emoji: "🏆" };
        else {
          const kMark = milestoneNear(careerK, [1000, 2000, 3000]);
          if (kMark) triggered = { kind: "k", target: kMark, label: `${p.name} ${kMark - careerK} K from career #${kMark}`, emoji: "⚡" };
        }
      }
      if (triggered) {
        const id = `bb-milestone-${p.id}-${triggered.kind}-${triggered.target}`;
        openOrAdvance(state, {
          id, kind: "milestoneWatch", season: lg.year,
          at: { day: lg.day },
          label: triggered.label,
          playerIds: [p.id],
          teamIds: p.teamId ? [p.teamId] : [],
          emoji: triggered.emoji,
        });
      }
    }
  }

  // ── Rookie rise — yearsExp ≤ 1 with strong production ──────────────
  if (lg.day >= 10) {
    const rookies = lg.players.filter(p => !p.retired && p.yearsExp <= 1);
    // Hitters with high OPS (require AB ≥ 50)
    const rookieHitters = rookies
      .filter(p => !p.isPitcher && (p.seasonStats.ab ?? 0) >= 50 && (p.seasonStats.ops ?? 0) >= 0.85)
      .sort((a, b) => (b.seasonStats.ops ?? 0) - (a.seasonStats.ops ?? 0))
      .slice(0, 3);
    for (const r of rookieHitters) {
      const id = `bb-rookierise-h-${r.id}`;
      openOrAdvance(state, {
        id, kind: "rookieRise", season: lg.year,
        at: { day: lg.day },
        label: `Rookie ${r.name} hitting .${((r.seasonStats.avg ?? 0) * 1000).toFixed(0).padStart(3, "0")} (${r.seasonStats.hr ?? 0} HR)`,
        body: `${r.name} is one of the breakout rookies of the season.`,
        playerIds: [r.id],
        teamIds: r.teamId ? [r.teamId] : [],
      });
    }
    // Pitchers with sub-3.50 ERA
    const rookiePitchers = rookies
      .filter(p => p.isPitcher && (p.seasonStats.ip ?? 0) >= 20 && (p.seasonStats.era ?? 99) <= 3.5)
      .sort((a, b) => (a.seasonStats.era ?? 99) - (b.seasonStats.era ?? 99))
      .slice(0, 2);
    for (const r of rookiePitchers) {
      const id = `bb-rookierise-p-${r.id}`;
      openOrAdvance(state, {
        id, kind: "rookieRise", season: lg.year,
        at: { day: lg.day },
        label: `Rookie ${r.name} dealing — ${(r.seasonStats.era ?? 0).toFixed(2)} ERA over ${r.seasonStats.ip ?? 0} IP`,
        body: `${r.name} is a rotation discovery this season.`,
        playerIds: [r.id],
        teamIds: r.teamId ? [r.teamId] : [],
      });
    }
  }

  // ── Comeback — player whose injury cleared in the last 7 days and is
  //    producing again. Use lg.newsLog "activated from IL" entries as the
  //    proxy signal (those are pushed by season.ts dailyTick).
  if (lg.day >= 7) {
    const recentReturns = lg.newsLog.filter(n =>
      n.year === lg.year &&
      n.day >= lg.day - 7 &&
      n.headline.includes("activated from IL") &&
      Array.isArray(n.playerIds) && n.playerIds.length > 0
    );
    for (const n of recentReturns) {
      const playerId = n.playerIds![0];
      const p = playerById.get(playerId);
      if (!p || p.retired) continue;
      // Only flag as comeback if the player is producing post-return.
      const producing = p.isPitcher
        ? (p.seasonStats.ip ?? 0) >= 5 && (p.seasonStats.era ?? 99) <= 4
        : (p.seasonStats.ab ?? 0) >= 10 && (p.seasonStats.avg ?? 0) >= 0.25;
      if (!producing) continue;
      const id = `bb-comeback-${p.id}-${n.day}`;
      openOrAdvance(state, {
        id, kind: "comeback", season: lg.year,
        at: { day: lg.day },
        label: `${p.name} comeback from injury`,
        body: `${p.name} returned from the IL and is back to producing.`,
        playerIds: [p.id],
        teamIds: p.teamId ? [p.teamId] : [],
      });
    }
  }

  // Cap memory
  trimResolved(state, 40);
}

/** Roll over storylines at end of season — move all active → resolved. */
export function rolloverBaseballStorylines(lg: League) {
  const drama = ensureDramaState(lg);
  if (!drama.storylines2) drama.storylines2 = emptyStorylineState();
  const state = drama.storylines2;
  for (const s of state.active.slice()) {
    resolveStoryline(state, s.id, "Season ended.");
  }
  trimResolved(state, 60);
}
