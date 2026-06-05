import type { League, Draft, DraftProspect, Player } from "../store/types";
import { getTeam, payroll } from "./league";
import { generatePlayer } from "../generators/players";
import { buildSchedule } from "../generators/schedule";
import { pushNews } from "./season";
import { rolloverBaseballStorylines } from "./storylines";
import { runDevelopmentPass, runHoFVoting } from "./development";
import { irnd, rand, uid, shuffle } from "../utils/rand";

export function initDraft(lg: League) {
  // Reverse standings = pick order
  const order = lg.teams.slice().sort((a, b) => (a.wins - a.losses) - (b.wins - b.losses)).map(t => t.id);
  const prospects: DraftProspect[] = [];
  for (let i = 0; i < lg.teams.length * 6; i++) {
    const p = generatePlayer({ year: lg.year, age: irnd(18, 22) }) as any;
    p.yearsExp = 0;
    p.teamId = null;
    // Hidden-gem roll — ~7% chance, only on late-round-ish prospects
    // (below the obvious top tier) where the surprise actually matters.
    const hiddenGem = p.potential >= 78 && p.potential < 92 && rand() < 0.07;
    p.hiddenGem = hiddenGem;
    p.scoutVisits = 0;
    // Initial scout estimate: noisy. Hidden gems get a much-too-low
    // estimate; everyone else gets ±6 OVR variance.
    const noise = hiddenGem ? -irnd(15, 22) : Math.round((rand() - 0.5) * 12);
    p.scoutedPotential = Math.max(40, Math.min(99, p.potential + noise));
    p.scoutGrade = scoutGrade(p.overall, p.scoutedPotential);
    prospects.push(p);
  }
  // Sort by SCOUTED potential — that's what teams (and Henry) see at draft time.
  prospects.sort((a, b) => b.scoutedPotential - a.scoutedPotential);
  const draft: Draft = {
    year: lg.year,
    pickOrder: order,
    currentPick: 0,
    prospects,
    picks: [],
    completed: false
  };
  lg.draft = draft;
  lg.phase = "draft";
}

/** Scout a prospect — tightens the scouted-potential estimate toward
 *  the true potential. Each visit cuts the error roughly in half, so
 *  3 visits typically resolves a hidden gem completely. */
export function scoutProspect(lg: League, prospectId: string): DraftProspect | null {
  if (!lg.draft) return null;
  const p = lg.draft.prospects.find(x => x.id === prospectId);
  if (!p) return null;
  p.scoutVisits = (p.scoutVisits ?? 0) + 1;
  const err = p.potential - p.scoutedPotential;
  // Pull halfway toward truth, with a touch of remaining noise.
  const remaining = Math.round(err * 0.55 + (rand() - 0.5) * 4);
  p.scoutedPotential = Math.max(40, Math.min(99, p.scoutedPotential + remaining));
  p.scoutGrade = scoutGrade(p.overall, p.scoutedPotential);
  if (p.scoutVisits >= 3 && p.hiddenGem) {
    pushNews(lg, {
      category: "Draft",
      headline: `Scouts flag ${p.name} as a hidden gem`,
      playerIds: [p.id],
      important: true,
    });
  }
  return p;
}

function scoutGrade(ovr: number, pot: number): string {
  const score = (pot + ovr) / 2;
  if (score >= 88) return "Elite Prospect";
  if (score >= 80) return "Top-100";
  if (score >= 72) return "Strong";
  if (score >= 64) return "Solid";
  return "Project";
}

export function makeDraftPick(lg: League, prospectId: string) {
  if (!lg.draft) return null;
  const d = lg.draft;
  const teamId = d.pickOrder[d.currentPick % d.pickOrder.length];
  const idx = d.prospects.findIndex(p => p.id === prospectId);
  if (idx === -1) return null;
  const chosen = d.prospects.splice(idx, 1)[0];
  chosen.teamId = teamId;
  chosen.contract = { years: 4, aav: 720_000, optOut: false, noTrade: false };
  lg.players.push(chosen);
  d.picks.push({ pick: d.currentPick + 1, round: Math.ceil((d.currentPick + 1) / lg.teams.length), teamId, playerId: chosen.id });
  pushNews(lg, { category: "Draft", headline: `${getTeam(lg, teamId)?.abbr} selects ${chosen.name} (#${d.currentPick + 1})`, teamIds: [teamId], playerIds: [chosen.id] });
  d.currentPick++;
  if (d.currentPick >= d.pickOrder.length * 6) d.completed = true;
  return chosen;
}

export function cpuDraftPick(lg: League) {
  if (!lg.draft) return null;
  const d = lg.draft;
  const teamId = d.pickOrder[d.currentPick % d.pickOrder.length];
  // Best available with mild need
  const top = d.prospects.slice(0, 6);
  const roster = lg.players.filter(p => p.teamId === teamId);
  const pitcherCount = roster.filter(p => p.isPitcher).length;
  const needsPitcher = pitcherCount < 12;
  const chosen = (needsPitcher && top.find(p => p.isPitcher)) || top[0];
  return makeDraftPick(lg, chosen.id);
}

export function autoCompleteDraft(lg: League) {
  if (!lg.draft) return;
  while (!lg.draft.completed) {
    cpuDraftPick(lg);
  }
}

export function startFreeAgency(lg: League) {
  if (lg.draft) {
    // Leftover prospects become FAs
    lg.draft.prospects.forEach(p => { p.teamId = null; lg.freeAgents.push(p); });
    lg.draft = null;
  }
  lg.phase = "freeagency";
}

export function signFreeAgent(lg: League, playerId: string, teamId: string, years = 3): "ok" | "cap" | "missing" {
  const idx = lg.freeAgents.findIndex(p => p.id === playerId);
  if (idx === -1) return "missing";
  const p = lg.freeAgents[idx];
  if (lg.settings.gameplay.salaryCapOn) {
    const cur = payroll(lg, teamId);
    if (cur + p.contract.aav > lg.settings.gameplay.salaryCap) return "cap";
  }
  lg.freeAgents.splice(idx, 1);
  p.teamId = teamId;
  p.contract.years = years;
  lg.players.push(p);
  pushNews(lg, { category: "FA", headline: `${p.name} signs with ${getTeam(lg, teamId)?.name} (${years}yr / ${(p.contract.aav * years / 1e6).toFixed(1)}M)`, teamIds: [teamId], playerIds: [p.id] });
  return "ok";
}

export function cpuFillRosters(lg: League) {
  // Each team brings roster up to 45
  for (const t of lg.teams) {
    const slots = 45 - lg.players.filter(p => p.teamId === t.id).length;
    if (slots <= 0) continue;
    const sorted = lg.freeAgents.slice().sort((a, b) => b.overall - a.overall);
    let added = 0;
    for (const p of sorted) {
      if (added >= slots) break;
      if (lg.settings.gameplay.salaryCapOn) {
        if (payroll(lg, t.id) + p.contract.aav > lg.settings.gameplay.salaryCap) continue;
      }
      lg.freeAgents = lg.freeAgents.filter(x => x.id !== p.id);
      p.teamId = t.id;
      p.contract.years = Math.max(1, p.contract.years);
      lg.players.push(p);
      added++;
    }
  }
}

export function startNewSeason(lg: League) {
  // 1) Archive last season's stats and decrement contracts (no aging yet)
  for (const p of [...lg.players, ...lg.freeAgents]) {
    if (Object.keys(p.seasonStats).length > 0) {
      p.careerStats.push({ ...p.seasonStats, year: lg.year, age: p.age, teamId: p.teamId });
    }
    p.seasonStats = {};
    p.contract.years = Math.max(0, p.contract.years - 1);
    p.yearsExp += 1;
  }

  // 2) Age everyone by 1
  lg.players.forEach(p => { p.age += 1; });
  lg.freeAgents.forEach(p => { p.age += 1; });

  // 3) Run development engine + HoF voting on the now-aged roster
  const devResult = runDevelopmentPass(lg);
  runHoFVoting(lg);

  // 4) Move retirees out of active rosters into retiredPlayers
  const stillActive: Player[] = [];
  for (const p of lg.players) {
    if (p.retired) lg.retiredPlayers.push(p);
    else stillActive.push(p);
  }
  lg.players = stillActive;
  const activeFA: Player[] = [];
  for (const p of lg.freeAgents) {
    if (p.retired) lg.retiredPlayers.push(p);
    else activeFA.push(p);
  }
  lg.freeAgents = activeFA;

  // 5) Players whose contracts expired become free agents (now that retirees are removed)
  const stayActive: Player[] = [];
  for (const p of lg.players) {
    if (p.contract.years <= 0) {
      p.teamId = null;
      // Refresh contract demand based on current age/overall
      p.contract = { years: ageBasedContractYears(p.age, p.overall), aav: aavFromOvr(p.overall, p.age), optOut: false, noTrade: false };
      lg.freeAgents.push(p);
    } else stayActive.push(p);
  }
  lg.players = stayActive;

  // 6) CPU refills depleted rosters from FA pool so opening day has full squads
  cpuFillRosters(lg);

  // 7) Reset team season records + schedule the new year
  // Roll over shared-engine storylines (active → resolved) before the year flips.
  try { rolloverBaseballStorylines(lg); } catch { /* non-critical */ }
  lg.year += 1;
  lg.schedule = buildSchedule(lg.teams, lg.settings.gameplay.scheduleLength);
  lg.day = 0;
  lg.weekIdx = 0;
  lg.phase = "preseason";
  lg.playoffs = null;
  lg.seasonAwards = null;
  lg.allStar = null;
  lg.pendingTransition = { type: "newSeason", ack: false };
  lg.teams.forEach(t => { t.wins = 0; t.losses = 0; t.runsScored = 0; t.runsAllowed = 0; t.playoffSeed = null; });

  // 8) News summaries
  if (devResult.risers.length > 0) {
    const top = devResult.risers.sort((a, b) => (b.overall - b.prevOvr) - (a.overall - a.prevOvr)).slice(0, 3);
    pushNews(lg, { category: "Off-Field", headline: `Biggest risers this offseason: ${top.map(p => `${p.name} (+${p.overall - p.prevOvr})`).join(", ")}`, important: true });
  }
  if (devResult.fallers.length > 0) {
    const top = devResult.fallers.sort((a, b) => (a.overall - a.prevOvr) - (b.overall - b.prevOvr)).slice(0, 3);
    pushNews(lg, { category: "Off-Field", headline: `Biggest fallers: ${top.map(p => `${p.name} (${p.overall - p.prevOvr})`).join(", ")}` });
  }
  pushNews(lg, { category: "Off-Field", headline: `${lg.year} season begins!`, important: true });
}

function ageBasedContractYears(age: number, ovr: number): number {
  if (age >= 36) return 1;
  if (age >= 33) return 2;
  if (age >= 30) return 3;
  if (ovr >= 88) return 5;
  return 3;
}
function aavFromOvr(ovr: number, age: number): number {
  let aav = (ovr - 50) * 320_000;
  if (age >= 33) aav *= 0.85;
  if (age >= 36) aav *= 0.7;
  return Math.max(720_000, Math.round(aav));
}
