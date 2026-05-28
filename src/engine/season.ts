import type { League, Game, Player, NewsItem, SeasonAwards, Position } from "../store/types";
import { getTeam, getPlayer, rosterOf } from "./league";
import { simulateGame, applyGameResult } from "./sim";
import { INJURIES } from "../data/misc";
import { rand, irnd, clamp, choice, uid } from "../utils/rand";
import { checkPhaseTransitions } from "./phases";
import { generateDailyDrama } from "./drama";

export function gamesOnDay(lg: League, day: number): Game[] {
  return lg.schedule.filter(g => g.day === day);
}

export function isRegularComplete(lg: League): boolean {
  return lg.schedule.every(g => g.played);
}

function injuryRateMultiplier(setting: "off" | "low" | "normal" | "high"): number {
  return setting === "off" ? 0 : setting === "low" ? 0.4 : setting === "high" ? 1.8 : 1.0;
}

export function dailyTick(lg: League) {
  const mod = injuryRateMultiplier(lg.settings.gameplay.injuryFreq);
  if (mod === 0) {
    lg.players.forEach(p => { if (p.injury) { p.injury.daysOut--; if (p.injury.daysOut <= 0) p.injury = null; } });
    return;
  }
  lg.players.forEach(p => {
    if (p.injury) {
      p.injury.daysOut--;
      if (p.injury.daysOut <= 0) {
        p.injury = null;
        pushNews(lg, { category: "Injury", headline: `${p.name} activated from IL`, playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [] });
      }
      return;
    }
    const dur = p.ratings.durability || 60;
    const traitMod = p.traits.includes("Fragile") ? 2.2 : 1;
    const ironMod = p.traits.includes("Workhorse") ? 0.4 : 1;
    const chance = 0.0007 * ((100 - dur) / 60) * mod * traitMod * ironMod;
    if (rand() < chance) {
      const eligible = INJURIES.filter(i => i.affects === "any" || (i.affects === "pitcher" && p.isPitcher) || (i.affects === "hitter" && !p.isPitcher));
      const inj = choice(eligible);
      const days = irnd(inj.min, inj.max);
      const dlType = days >= 365 ? "Season-Ending" : days >= 60 ? "60-day" : days >= 15 ? "15-day" : days >= 10 ? "10-day" : "DTD";
      p.injury = { name: inj.name, daysOut: days, dlType };
      pushNews(lg, { category: "Injury", headline: `${p.name} placed on ${dlType} IL (${inj.name})`, playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [] });
    }
  });
}

// J.11 — Flavor news, surfaces every ~20 days, adds personality without affecting outcomes
const FLAVOR_TEMPLATES = [
  (n: string) => `${n} brings rescue puppy to spring training, names her "Slugger."`,
  (n: string) => `${n} promises a kid in the stands a home run — delivers next inning.`,
  (n: string) => `${n} hosts impromptu karaoke night, clubhouse chemistry rises.`,
  (n: string) => `${n} grows a "lucky beard" — vows not to shave until the playoffs.`,
  (n: string) => `${n} gives game-worn cleats to a Little Leaguer after the game.`,
  (n: string) => `${n} stays late signing autographs — last fan left at midnight.`,
  (n: string) => `${n} arrives at the park in a flamingo onesie. Team rookie hazing.`,
  (n: string) => `${n} buys lunch for the entire clubhouse — pizza delivery x14.`,
  (n: string) => `${n} adopts a stray cat that wandered into the dugout. Names her "Strike."`,
  (n: string) => `${n} surprises Mom with World Series tickets via stadium scoreboard.`
];

export function simDay(lg: League): number {
  // Block sim during pending unacked transition or all-star break
  if (lg.pendingTransition && !lg.pendingTransition.ack) return 0;
  if (lg.phase === "allStarBreak" && lg.allStar && !lg.allStar.game.played) return 0;

  // K.27 — "Streaky Saturdays" — every 7th day pretty much, slightly higher dramatic-moment chance.
  // Tag the league with a transient flag the sim can read.
  (lg as any)._dramaBoost = (lg.day % 7) === 5; // arbitrary "Saturday" mapping

  let played = 0;
  const games = gamesOnDay(lg, lg.day);
  games.forEach(g => {
    if (!g.played) {
      const result = simulateGame(lg, g, { recordPlays: false, universalDH: lg.settings.gameplay.universalDH });
      applyGameResult(lg, g, result);
      result.highlights.forEach(h => pushNews(lg, { category: "Game", headline: h, important: false }));
      played++;
    }
  });
  dailyTick(lg);
  lg.day++;
  lg.weekIdx = Math.floor(lg.day / 7);
  lg.modifiedAt = Date.now();
  checkPhaseTransitions(lg);

  // K.3 — Birthday Mode: morale boost on the user's birthday
  if (lg.gmProfile?.birthMMDD && lg.day >= 0) {
    const fakeMonth = Math.floor(lg.day / 30) + 4; // ~Apr-Sep season
    const fakeDay = (lg.day % 30) + 1;
    const mmdd = `${String(fakeMonth).padStart(2, "0")}-${String(fakeDay).padStart(2, "0")}`;
    if (mmdd === lg.gmProfile.birthMMDD && !lg.tutorial.dismissedTips.includes(`birthday-${lg.year}`)) {
      lg.tutorial.dismissedTips.push(`birthday-${lg.year}`);
      pushNews(lg, { category: "Off-Field", headline: `🎂 Happy Birthday, ${lg.gmProfile.name}! Your team has extra pep today.`, important: true });
      if (lg.userTeamId) {
        lg.players.filter(p => p.teamId === lg.userTeamId).forEach(p => { p.morale = Math.min(100, p.morale + 5); });
      }
    }
  }

  // J.11 — Random flavor news, ~5% chance per day
  if (lg.settings.features.dynasty && rand() < 0.05) {
    const pool = lg.players.filter(p => p.teamId);
    if (pool.length > 0) {
      const p = pool[irnd(0, pool.length - 1)];
      const headline = FLAVOR_TEMPLATES[irnd(0, FLAVOR_TEMPLATES.length - 1)](p.name);
      pushNews(lg, { category: "Off-Field", headline, playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [] });
    }
  }

  // K.4 — "Hi Henry" announcer flash: tiny chance to write a flavor line that mentions Henry's name
  if (lg.gmProfile?.name && rand() < 0.008 && lg.userTeamId) {
    const team = lg.teams.find(t => t.id === lg.userTeamId);
    if (team) {
      pushNews(lg, { category: "Game", headline: `"And ${lg.gmProfile.name}'s ${team.abbr} take the lead!" — booth call of the day.` });
    }
  }

  // V4 — Drama Engine: generate 3-4 (or more depending on intensity) events daily.
  try {
    generateDailyDrama(lg);
  } catch { /* drama is non-critical; never crash the sim */ }

  // K.46 — Time Capsule surface: 10 in-game seasons after writing
  if (lg.gmProfile?.timeCapsule) {
    for (const tc of lg.gmProfile.timeCapsule) {
      if (!tc.surfaced && lg.year - tc.year >= 10) {
        tc.surfaced = true;
        pushNews(lg, { category: "Off-Field", important: true, headline: `📜 Time Capsule from ${tc.year}: "${tc.note}"` });
      }
    }
  }

  return played;
}

export function simNDays(lg: League, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (isRegularComplete(lg)) break;
    total += simDay(lg);
  }
  return total;
}

export function pushNews(lg: League, item: Partial<NewsItem>) {
  const news: NewsItem = {
    id: uid("n"),
    day: lg.day,
    year: lg.year,
    category: item.category || "Off-Field",
    headline: item.headline || "",
    body: item.body,
    teamIds: item.teamIds,
    playerIds: item.playerIds,
    important: item.important
  };
  lg.newsLog.unshift(news);
  if (lg.newsLog.length > 300) lg.newsLog.length = 300;
}

// Standings within division and overall
export interface StandingRow {
  team: any;
  pct: number;
  gb: number;
  diff: number;
}

export function divisionStandings(lg: League): Record<number, StandingRow[]> {
  const out: Record<number, StandingRow[]> = {};
  lg.divisions.forEach(d => {
    const teams = d.teamIds.map(id => getTeam(lg, id)!).filter(Boolean);
    teams.sort((a, b) => {
      const pa = a.wins / Math.max(1, a.wins + a.losses);
      const pb = b.wins / Math.max(1, b.wins + b.losses);
      if (pb !== pa) return pb - pa;
      return (b.runsScored - b.runsAllowed) - (a.runsScored - a.runsAllowed);
    });
    const leader = teams[0];
    out[d.id] = teams.map(t => ({
      team: t,
      pct: t.wins / Math.max(1, t.wins + t.losses),
      gb: leader ? ((leader.wins - t.wins) + (t.losses - leader.losses)) / 2 : 0,
      diff: t.runsScored - t.runsAllowed
    }));
  });
  return out;
}

export function leagueStandings(lg: League): StandingRow[] {
  const arr = lg.teams.map(t => ({
    team: t,
    pct: t.wins / Math.max(1, t.wins + t.losses),
    gb: 0,
    diff: t.runsScored - t.runsAllowed
  }));
  arr.sort((a, b) => b.pct - a.pct || b.diff - a.diff);
  return arr;
}

// --- Awards ---
export function computeSeasonAwards(lg: League): SeasonAwards {
  const eligibleH = lg.players.filter(p => !p.isPitcher && (p.seasonStats.ab ?? 0) >= 200);
  const eligibleP = lg.players.filter(p => p.isPitcher && (p.seasonStats.ip ?? 0) >= 60);
  const mvp = eligibleH.sort((a, b) => {
    const sa = a.seasonStats, sb = b.seasonStats;
    return ((sb.hr ?? 0) * 4 + (sb.rbi ?? 0) * 1.5 + (sb.avg ?? 0) * 200 + (sb.r ?? 0)) - ((sa.hr ?? 0) * 4 + (sa.rbi ?? 0) * 1.5 + (sa.avg ?? 0) * 200 + (sa.r ?? 0));
  })[0];
  const cy = eligibleP.sort((a, b) => {
    const va = (a.seasonStats.w ?? 0) * 10 + (a.seasonStats.pk ?? 0) * 0.4 - (a.seasonStats.era ?? 5) * 12 + (a.seasonStats.sv ?? 0) * 2.5;
    const vb = (b.seasonStats.w ?? 0) * 10 + (b.seasonStats.pk ?? 0) * 0.4 - (b.seasonStats.era ?? 5) * 12 + (b.seasonStats.sv ?? 0) * 2.5;
    return vb - va;
  })[0];
  const roy = lg.players.filter(p => p.yearsExp <= 1).sort((a, b) => {
    const score = (p: Player) => p.isPitcher
      ? ((p.seasonStats.w ?? 0) * 8 + (p.seasonStats.pk ?? 0) * 0.4 - (p.seasonStats.era ?? 5) * 10)
      : ((p.seasonStats.hr ?? 0) * 3 + (p.seasonStats.rbi ?? 0) + (p.seasonStats.avg ?? 0) * 200);
    return score(b) - score(a);
  })[0];
  const reliever = lg.players.filter(p => p.isPitcher && p.position !== "SP" && (p.seasonStats.sv ?? 0) > 5).sort((a, b) => ((b.seasonStats.sv ?? 0) - (a.seasonStats.sv ?? 0)) || ((a.seasonStats.era ?? 5) - (b.seasonStats.era ?? 5)))[0];
  const positions: Position[] = ["C","1B","2B","3B","SS","LF","CF","RF","DH"];
  const goldGloves = {} as Record<Position, string | null>;
  const silverSluggers = {} as Record<Position, string | null>;
  positions.forEach(pos => {
    const f = lg.players.filter(p => !p.isPitcher && p.position === pos).sort((a, b) => (b.ratings.fielding + b.ratings.arm) - (a.ratings.fielding + a.ratings.arm))[0];
    goldGloves[pos] = f?.id ?? null;
    const s = lg.players.filter(p => !p.isPitcher && p.position === pos && (p.seasonStats.ab ?? 0) >= 150).sort((a, b) => ((b.seasonStats.ops ?? 0) - (a.seasonStats.ops ?? 0)))[0];
    silverSluggers[pos] = s?.id ?? null;
  });
  const hrChamp = [...lg.players].sort((a, b) => (b.seasonStats.hr ?? 0) - (a.seasonStats.hr ?? 0))[0];
  const battingTitle = eligibleH.sort((a, b) => (b.seasonStats.avg ?? 0) - (a.seasonStats.avg ?? 0))[0];
  const eraTitle = eligibleP.sort((a, b) => (a.seasonStats.era ?? 5) - (b.seasonStats.era ?? 5))[0];

  // Manager of Year = best record's manager
  const bestTeam = lg.teams.slice().sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses))[0];

  const sa: SeasonAwards = {
    year: lg.year,
    mvp: mvp?.id ?? null,
    cyYoung: cy?.id ?? null,
    roy: roy?.id ?? null,
    reliever: reliever?.id ?? null,
    comeback: null,
    managerOfYear: bestTeam?.managerName ?? null,
    goldGloves, silverSluggers,
    hrChamp: hrChamp?.id ?? null,
    battingTitle: battingTitle?.id ?? null,
    eraTitle: eraTitle?.id ?? null,
    worldSeriesMvp: null
  };
  // Award entries on players
  const tag = (id: string | null, type: string) => {
    if (!id) return;
    const p = getPlayer(lg, id);
    if (p) p.awards.push({ year: lg.year, type });
  };
  tag(sa.mvp, "MVP");
  tag(sa.cyYoung, "Cy Young");
  tag(sa.roy, "Rookie of the Year");
  tag(sa.reliever, "Reliever of the Year");
  tag(sa.hrChamp, "Home Run Title");
  tag(sa.battingTitle, "Batting Title");
  tag(sa.eraTitle, "ERA Title");
  positions.forEach(pos => {
    tag(goldGloves[pos], `Gold Glove (${pos})`);
    tag(silverSluggers[pos], `Silver Slugger (${pos})`);
  });
  return sa;
}

// --- Offseason transition ---
export function endSeasonAdvance(lg: League) {
  // Archive team season, age up, decline/grow, contracts, retirements
  lg.teams.forEach(t => {
    t.history.unshift({
      year: lg.year, w: t.wins, l: t.losses,
      finish: t.playoffSeed ? `Seed ${t.playoffSeed}` : null
    });
  });
  const retiring: Player[] = [];
  lg.players.forEach(p => {
    p.age++; p.yearsExp++;
    if (p.age > 30) {
      const decay = (p.age - 30) * 0.7 + Math.random() * 1.0;
      Object.keys(p.ratings).forEach(k => {
        const v = (p.ratings as any)[k];
        if (typeof v === "number") (p.ratings as any)[k] = clamp(v - decay - Math.random() * 0.6, 20, 99);
      });
    } else if (p.age < 28) {
      const grow = Math.random() * 1.6;
      Object.keys(p.ratings).forEach(k => {
        const v = (p.ratings as any)[k];
        if (typeof v === "number" && Math.random() < 0.45)
          (p.ratings as any)[k] = clamp(v + grow, 20, p.potential);
      });
    }
    // Recompute overall
    p.overall = p.isPitcher
      ? Math.round((p.ratings.stamina + p.ratings.composure + (p.ratings.pitches?.reduce((s: number, q: any) => s + (q.brk + q.ctrl) / 2, 0) ?? 0) / Math.max(1, p.ratings.pitches?.length ?? 1)) / 3)
      : Math.round((((p.ratings.contactL + p.ratings.contactR) / 2) * 0.22 + ((p.ratings.powerL + p.ratings.powerR) / 2) * 0.18 + p.ratings.vision * 0.10 + p.ratings.discipline * 0.08 + p.ratings.speed * 0.08 + p.ratings.fielding * 0.16 + p.ratings.arm * 0.08 + p.ratings.reaction * 0.10));

    // Archive season
    p.careerStats.push({ year: lg.year, age: p.age, teamId: p.teamId, ...p.seasonStats });
    p.seasonStats = {};

    p.contract.years--;
    // Retirement
    const retireChance = p.age >= 36 ? (p.age - 35) * 0.18 + (60 - p.overall) * 0.014 : 0;
    if (p.age >= 42 || Math.random() < retireChance) {
      p.retired = true;
      const careerHR = p.careerStats.reduce((s, y) => s + (y.hr ?? 0), 0);
      const careerH = p.careerStats.reduce((s, y) => s + (y.h ?? 0), 0);
      const careerW = p.careerStats.reduce((s, y) => s + (y.w ?? 0), 0);
      const careerK = p.careerStats.reduce((s, y) => s + (y.pk ?? 0), 0);
      p.hof = p.isPitcher ? (careerW >= 200 || careerK >= 2500 || p.awards.length >= 4) : (careerH >= 2500 || careerHR >= 400 || p.awards.length >= 4);
      retiring.push(p);
      pushNews(lg, { category: "Off-Field", headline: `${p.name} announces retirement${p.hof ? " — bound for the Hall of Fame!" : "."}`, playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [] });
    }
    if (!p.retired && p.contract.years <= 0) p.teamId = null;
  });
  retiring.forEach(p => { lg.players = lg.players.filter(x => x.id !== p.id); lg.retiredPlayers.push(p); });
  const newlyFA = lg.players.filter(p => p.teamId === null);
  newlyFA.forEach(p => { lg.players = lg.players.filter(x => x.id !== p.id); lg.freeAgents.push(p); });

  // Reset teams
  lg.teams.forEach(t => { t.wins = 0; t.losses = 0; t.runsScored = 0; t.runsAllowed = 0; t.playoffSeed = null; });

  lg.year++;
  lg.day = 0;
  lg.phase = "offseason";
}
