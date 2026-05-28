// V3 Player Development & Aging Engine.
// Called during offseason advance. Adjusts ratings by age-band rules,
// rolls breakout/bust events, updates potential reveal via "scouting",
// shifts skill-specific decline curves, and triggers retirements.
import type { Player, League, DevHistoryItem } from "../store/types";
import { ageCurveProgress } from "../generators/players";
import { clamp, rand, gauss, irnd } from "../utils/rand";
import { uid } from "../utils/rand";

interface DevOpts {
  intensity: "gentle" | "realistic" | "harsh";
  breakoutFreq: "low" | "normal" | "high";
  retirementAgeCap: number;
}

const INTENSITY_MUL = { gentle: 0.6, realistic: 1.0, harsh: 1.4 } as const;
const BREAKOUT_MUL = { low: 0.5, normal: 1.0, high: 1.8 } as const;

// Per-skill decline rates (relative to overall age decline).
// Positive = declines fast; negative = improves slightly with age.
const SKILL_DECLINE: Record<string, number> = {
  contactL: 0.3, contactR: 0.3,
  powerL: 0.4, powerR: 0.4,
  vision: -0.15,   // improves with age
  discipline: -0.2, // improves with age
  speed: 1.6,
  baserun: 1.3,
  stealing: 1.5,
  fielding: 1.0,
  arm: 0.6,
  armAccuracy: 0.4,
  reaction: 0.8,
  clutch: 0.1,
  durability: 0.7,
  stamina: 0.8,
  composure: -0.2,
  holdRunners: 0.0
};

// How much each skill GROWS during development phase (rising side of curve).
// Higher = grows faster.
const SKILL_GROWTH: Record<string, number> = {
  contactL: 1.0, contactR: 1.0,
  powerL: 1.1, powerR: 1.1,
  vision: 1.0,
  discipline: 1.0,
  speed: 1.2,
  baserun: 1.0,
  stealing: 1.1,
  fielding: 1.0,
  arm: 0.9,
  armAccuracy: 0.9,
  reaction: 1.1,
  clutch: 0.6,
  durability: 0.7,
  stamina: 1.2,
  composure: 1.0,
  holdRunners: 0.9
};

/** Advance one player by one offseason. Returns the rating delta and any event triggered. */
export function developPlayer(p: Player, year: number, opts: DevOpts): DevHistoryItem | null {
  if (p.retired || !p.teamId && p.age > opts.retirementAgeCap) return null;

  const intMul = INTENSITY_MUL[opts.intensity];
  const breakoutMul = BREAKOUT_MUL[opts.breakoutFreq];
  const prev = p.overall;

  // Position on the curve before vs after aging by 1 year
  const curveBefore = ageCurveProgress(p.age, p.devSpeed);
  const curveAfter = ageCurveProgress(p.age + 1, p.devSpeed);
  const curveDelta = curveAfter - curveBefore; // positive = growth, negative = decline

  // Target overall based on potential × curve
  const targetOvr = Math.round(p.hidden.potential * curveAfter);
  const baseDelta = clamp(targetOvr - p.overall, -8, 8);

  // Apply scaled per-skill changes
  applySkillChanges(p, curveDelta * intMul);

  // Roll variance events (offseason only)
  let event: DevHistoryItem | null = null;

  // Breakout: 3% base for young high-potential players who haven't reached ceiling yet
  const youngHighPotential = p.age >= 21 && p.age <= 26 && p.hidden.potential >= 78 && p.overall < p.hidden.potential - 5;
  const breakoutBase = youngHighPotential ? 0.06 : 0.012;
  if (rand() < breakoutBase * breakoutMul) {
    const bump = irnd(5, 15);
    bumpAllRatings(p, bump);
    event = { year, age: p.age + 1, ovrDelta: bump, event: "breakout", note: "Breakout season" };
  }
  // Bust: 3% base for young players who failed to develop
  else if (p.age >= 22 && p.age <= 26 && p.hidden.potential >= 70 && p.overall < p.hidden.potential - 12 && rand() < 0.04 * breakoutMul) {
    const drop = irnd(5, 10);
    bumpAllRatings(p, -drop);
    p.hidden.potential = clamp(p.hidden.potential - irnd(3, 8), 40, 99);
    p.potential = Math.max(p.overall, p.hidden.potential);
    event = { year, age: p.age + 1, ovrDelta: -drop, event: "bust", note: "Failed to develop" };
  }
  // Mid-career resurgence: 2% chance, age 29-34, after a down year
  else if (p.age >= 29 && p.age <= 34 && p.overall < prev && rand() < 0.025 * breakoutMul) {
    const bump = irnd(3, 8);
    bumpAllRatings(p, bump);
    event = { year, age: p.age + 1, ovrDelta: bump, event: "resurgence", note: "Veteran finds new life" };
  }
  // Late-career resurgence: 1% chance, 35+
  else if (p.age >= 35 && rand() < 0.012) {
    const bump = irnd(3, 6);
    bumpAllRatings(p, bump);
    event = { year, age: p.age + 1, ovrDelta: bump, event: "lateBloom", note: "Defying age" };
  }

  // Recompute overall
  p.overall = recomputeOverall(p);

  // Potential reveal (scouting): younger players gain reveal each year
  if (p.hidden.revealed < 100) {
    const revealGain = p.age <= 22 ? irnd(15, 28) : irnd(8, 18);
    p.hidden.revealed = clamp(p.hidden.revealed + revealGain, 0, 100);
    // Update visible potential with less error as we learn more
    const errMag = Math.round((100 - p.hidden.revealed) * 0.15);
    const err = errMag === 0 ? 0 : irnd(-errMag, errMag);
    p.potential = clamp(Math.max(p.overall, p.hidden.potential + err), p.overall, 99);
    if (p.hidden.revealed === 100 && p.age <= 24 && p.hidden.potential >= 85) {
      // Scouting reveal storyline
      if (!event) event = { year, age: p.age + 1, ovrDelta: p.overall - prev, event: "potentialReveal", note: `Scouts reveal true potential` };
    }
  }

  const realizedDelta = p.overall - prev;
  if (!event && Math.abs(realizedDelta) >= 2) {
    event = { year, age: p.age + 1, ovrDelta: realizedDelta };
  }
  if (event) p.devHistory.push(event);
  return event;
}

/** Returns true if player retires. */
export function rollRetirement(p: Player, opts: DevOpts): boolean {
  if (p.retired) return false;
  if (p.age >= opts.retirementAgeCap) return true;
  if (p.age < 33) return false;
  const baseChances: Record<number, number> = {
    33: 0.01, 34: 0.025, 35: 0.05, 36: 0.10, 37: 0.15, 38: 0.22, 39: 0.30, 40: 0.45, 41: 0.60, 42: 0.75
  };
  let chance = baseChances[p.age] ?? 0.9;
  // Modifiers
  const ss = p.seasonStats;
  const good = (!p.isPitcher && (ss.ops ?? 0) >= 0.800) || (p.isPitcher && (ss.era ?? 9) <= 3.30);
  const bad = (!p.isPitcher && (ss.ops ?? 99) <= 0.610 && (ss.pa ?? 0) > 200) || (p.isPitcher && (ss.era ?? 0) >= 5.5 && (ss.ip ?? 0) > 30);
  if (good) chance *= 0.5;
  else if (bad) chance *= 1.3;
  if (!p.teamId) chance *= 1.4; // unsigned veteran
  return rand() < chance;
}

function applySkillChanges(p: Player, growthFactor: number) {
  // growthFactor >0: development, <0: decline
  const keys = Object.keys(p.ratings).filter(k => k !== "pitches" && k !== "gbFb");
  for (const k of keys) {
    const v = (p.ratings as any)[k];
    if (typeof v !== "number") continue;
    let delta = 0;
    if (growthFactor > 0) {
      // Growth phase — multiply by SKILL_GROWTH and small noise
      const factor = SKILL_GROWTH[k] ?? 1.0;
      delta = (growthFactor * 100) * factor * 0.7 + gauss(0, 0.8);
    } else {
      // Decline phase — multiply by SKILL_DECLINE
      const factor = SKILL_DECLINE[k] ?? 0.5;
      delta = (growthFactor * 100) * factor * 0.6 + gauss(0, 0.8);
    }
    (p.ratings as any)[k] = clamp(Math.round(v + delta), 25, 99);
  }
  // Adjust pitcher pitches: velocity declines past 30, control improves with age
  if (p.isPitcher && p.ratings.pitches) {
    for (const pitch of p.ratings.pitches) {
      const veloDelta = growthFactor > 0 ? gauss(0.6, 0.8) : gauss(-0.5, 0.7) * (p.age >= 30 ? 1.3 : 0.7);
      const ctrlDelta = growthFactor > 0 ? gauss(0.4, 0.7) : (p.age >= 30 ? gauss(0.3, 0.5) : gauss(0, 0.6));
      const brkDelta = growthFactor > 0 ? gauss(0.5, 0.8) : gauss(-0.2, 0.6);
      pitch.velo = clamp(Math.round(pitch.velo + veloDelta), 60, 102);
      pitch.ctrl = clamp(Math.round(pitch.ctrl + ctrlDelta), 25, 99);
      pitch.brk = clamp(Math.round(pitch.brk + brkDelta), 25, 99);
    }
  }
}

function bumpAllRatings(p: Player, n: number) {
  const keys = Object.keys(p.ratings).filter(k => k !== "pitches" && k !== "gbFb");
  for (const k of keys) {
    const v = (p.ratings as any)[k];
    if (typeof v === "number") (p.ratings as any)[k] = clamp(Math.round(v + n), 25, 99);
  }
  if (p.isPitcher && p.ratings.pitches) {
    for (const pi of p.ratings.pitches) {
      pi.brk = clamp(Math.round(pi.brk + n), 25, 99);
      pi.ctrl = clamp(Math.round(pi.ctrl + n), 25, 99);
    }
  }
}

function recomputeOverall(p: Player): number {
  if (p.isPitcher) {
    if (!p.ratings.pitches.length) return p.overall;
    const pitchAvg = p.ratings.pitches.reduce((s, pi) => s + (pi.brk + pi.ctrl) / 2, 0) / p.ratings.pitches.length;
    const veloAvg = p.ratings.pitches.reduce((s, pi) => s + pi.velo, 0) / p.ratings.pitches.length;
    const veloRating = clamp((veloAvg - 86) * 5 + 65, 35, 99);
    return Math.round(pitchAvg * 0.55 + veloRating * 0.20 + p.ratings.stamina * 0.10 + p.ratings.composure * 0.10 + p.ratings.holdRunners * 0.05);
  }
  const contact = (p.ratings.contactL + p.ratings.contactR) / 2;
  const power = (p.ratings.powerL + p.ratings.powerR) / 2;
  return Math.round(
    contact * 0.22 + power * 0.18 + p.ratings.vision * 0.10 + p.ratings.discipline * 0.08 +
    p.ratings.speed * 0.08 + p.ratings.fielding * 0.16 + p.ratings.arm * 0.08 + p.ratings.reaction * 0.10
  );
}

/** K.10/K.14 — Award badges based on the season just completed. */
function awardSeasonalBadges(lg: League) {
  const scheduleLen = lg.settings.gameplay.scheduleLength;
  for (const p of lg.players) {
    // K.10 — Iron Man: played every game (approximate by games >= scheduleLen * 0.97)
    const g = p.seasonStats.g ?? 0;
    if (!p.isPitcher && g >= scheduleLen * 0.97 && !p.traits.includes("Iron Man")) {
      p.traits.push("Iron Man");
      p.ratings.durability = Math.min(99, p.ratings.durability + 3);
      lg.newsLog.unshift({
        id: "ironman-" + p.id + "-" + lg.year, day: lg.day, year: lg.year,
        category: "Milestone",
        headline: `🛡️ ${p.name} earns the IRON MAN badge — played every game.`,
        playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [],
        important: true
      });
    }
    // K.14 — Hometown Hero: playing for a team whose city matches birthplace (loose match)
    const team = lg.teams.find(t => t.id === p.teamId);
    if (team && p.birthplace && team.city.toLowerCase().includes(p.birthplace.toLowerCase().split(",")[0].slice(0, 6)) && !p.traits.includes("Hometown Hero")) {
      p.traits.push("Hometown Hero");
      p.morale = Math.min(100, p.morale + 3);
      lg.newsLog.unshift({
        id: "hometown-" + p.id, day: lg.day, year: lg.year,
        category: "Off-Field",
        headline: `🏡 ${p.name} — HOMETOWN HERO. Playing where he grew up.`,
        playerIds: [p.id], teamIds: [team.id]
      });
    }
  }
}

/** Run the development pass over the whole league. Call between seasons. */
export function runDevelopmentPass(lg: League): { risers: Player[]; fallers: Player[]; retirees: Player[] } {
  // Award seasonal badges first (uses just-completed season stats)
  awardSeasonalBadges(lg);

  const gp = lg.settings.gameplay;
  if (!gp.devEngineOn) return { risers: [], fallers: [], retirees: [] };

  const opts: DevOpts = {
    intensity: gp.agingIntensity,
    breakoutFreq: gp.breakoutBustFreq,
    retirementAgeCap: gp.retirementAgeCap
  };

  const risers: Player[] = [];
  const fallers: Player[] = [];
  const retirees: Player[] = [];
  const year = lg.year;

  // Stash prev overall before mutation
  lg.players.forEach(p => { p.prevOvr = p.overall; });
  lg.freeAgents.forEach(p => { p.prevOvr = p.overall; });

  // Develop all active players + free agents
  const all = [...lg.players, ...lg.freeAgents];
  for (const p of all) {
    const ev = developPlayer(p, year, opts);
    if (ev?.event === "breakout" || ev?.event === "lateBloom" || ev?.event === "resurgence") {
      lg.newsLog.unshift({
        id: uid("n"), day: lg.day, year,
        category: "Off-Field",
        headline: `${ev.event === "breakout" ? "Breakout!" : ev.event === "lateBloom" ? "Defying Time:" : "Resurgence:"} ${p.name} jumps ${ev.ovrDelta} points (OVR ${p.overall})`,
        playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [],
        important: ev.event === "breakout"
      });
    }
    if (ev?.event === "bust") {
      lg.newsLog.unshift({
        id: uid("n"), day: lg.day, year,
        category: "Off-Field",
        headline: `${p.name} struggles — drops ${Math.abs(ev.ovrDelta)} points`,
        playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : []
      });
    }
    if (ev?.event === "potentialReveal") {
      lg.newsLog.unshift({
        id: uid("n"), day: lg.day, year,
        category: "Off-Field",
        headline: `Scouts confirm: ${p.name} is the real deal — potential ${p.hidden.potential}`,
        playerIds: [p.id], teamIds: p.teamId ? [p.teamId] : [],
        important: true
      });
    }
    const delta = p.overall - p.prevOvr;
    if (delta >= 4) risers.push(p);
    else if (delta <= -4) fallers.push(p);
  }

  // Retirement pass
  for (const p of all) {
    if (rollRetirement(p, opts)) {
      p.retired = true;
      p.retiredYear = year;
      retirees.push(p);
      if (p.teamId) {
        // remove from active roster — caller (offseason) handles list management
        p.teamId = null;
      }
      const careerHr = p.careerStats.reduce((s, c) => s + (c.hr ?? 0), 0);
      const careerHits = p.careerStats.reduce((s, c) => s + (c.h ?? 0), 0);
      const careerWins = p.careerStats.reduce((s, c) => s + (c.w ?? 0), 0);
      const big = p.awards.length >= 3 || careerHr >= 400 || careerHits >= 2800 || careerWins >= 250;
      lg.newsLog.unshift({
        id: uid("n"), day: lg.day, year,
        category: "Off-Field",
        headline: `${big ? "Legend retires:" : "Retirement:"} ${p.name} hangs it up after ${p.yearsExp + 1} seasons`,
        playerIds: [p.id], important: big
      });
    }
  }

  return { risers, fallers, retirees };
}

/** HOF voting — runs after retirement is finalized. */
export function runHoFVoting(lg: League): Player[] {
  const eligible = lg.retiredPlayers.filter(p => {
    if (p.hof) return false;
    if (!p.retiredYear) return false;
    const yearsRetired = lg.year - p.retiredYear;
    return yearsRetired >= 5; // 5 year wait
  });
  const inducted: Player[] = [];
  for (const p of eligible) {
    const careerHr = p.careerStats.reduce((s, c) => s + (c.hr ?? 0), 0);
    const careerHits = p.careerStats.reduce((s, c) => s + (c.h ?? 0), 0);
    const careerWins = p.careerStats.reduce((s, c) => s + (c.w ?? 0), 0);
    const awardCount = p.awards.length;
    let voteScore = 0;
    voteScore += Math.min(50, awardCount * 8);
    voteScore += Math.min(30, careerHr / 10);
    voteScore += Math.min(30, careerHits / 90);
    voteScore += Math.min(20, careerWins / 12);
    voteScore += Math.min(10, p.yearsExp);
    voteScore *= 0.9 + rand() * 0.2;
    p.hofVotes = Math.round(voteScore);
    if (voteScore >= 75) {
      p.hof = true;
      inducted.push(p);
      lg.newsLog.unshift({
        id: uid("n"), day: lg.day, year: lg.year,
        category: "Award",
        headline: `🏛️ ${p.name} elected to the Hall of Fame (${Math.round(voteScore)}%)`,
        playerIds: [p.id], important: true
      });
    }
  }
  return inducted;
}
