// Training Camp engine: log swings/pitches, award achievements, grow Henry's player.
import type { League, SwingLog, PitchLog, PracticeSession, Player } from "../store/types";
import { uid } from "../utils/rand";
import { DRILL_GAINS, type AttrKey } from "../data/drillGains";

const DAY_CAP_PER_ATTR = 2.0; // V3 Section 3.2 diminishing returns
const DECAY_RATE_PER_DAY = 0.05; // after grace period
const DECAY_GRACE_DAYS = 3;
const DECAY_FLOOR_PCT = 0.7; // can't decay below 70% of peak

const DAY_MS = 24 * 60 * 60 * 1000;

export function logSwing(lg: League, opts: { quality: SwingLog["quality"]; netX: number; netY: number; formScore?: number }): SwingLog {
  if (!lg.training) return null as any;
  const swing: SwingLog = {
    id: uid("sw"),
    t: Date.now(),
    quality: opts.quality,
    netX: opts.netX,
    netY: opts.netY,
    contactType: inferContactType(opts.netX, opts.netY, opts.quality),
    formScore: opts.formScore
  };
  // Active session = most recent within 30 min
  const cur = currentSession(lg, "hitting");
  cur.swings = cur.swings ?? [];
  cur.swings.push(swing);
  cur.durationSec = Math.floor((Date.now() - cur.t) / 1000);
  lg.training.totalSwings += 1;
  if (swing.quality === "crushed") lg.training.totalCrushedHits += 1;
  if (opts.formScore) {
    lg.training.formScoreHistory.push({ t: swing.t, kind: "hitting", score: opts.formScore });
    if (opts.formScore > lg.training.pr.bestFormScore) lg.training.pr.bestFormScore = opts.formScore;
  }
  // Grow Henry's player
  growHenry(lg, "hitting", swing.quality === "crushed" ? 1.2 : swing.quality === "okay" ? 0.6 : 0.2);
  // Check achievements
  checkAchievements(lg);
  bumpStreak(lg);
  return swing;
}

export function logPitch(lg: League, opts: { zoneCol: number; zoneRow: number; result: PitchLog["result"]; pitchType: string; formScore?: number }): PitchLog {
  if (!lg.training) return null as any;
  const pitch: PitchLog = {
    id: uid("p"),
    t: Date.now(),
    zoneCol: opts.zoneCol,
    zoneRow: opts.zoneRow,
    result: opts.result,
    pitchType: opts.pitchType,
    formScore: opts.formScore
  };
  const cur = currentSession(lg, "pitching");
  cur.pitches = cur.pitches ?? [];
  cur.pitches.push(pitch);
  cur.durationSec = Math.floor((Date.now() - cur.t) / 1000);
  lg.training.totalPitches += 1;
  if (pitch.result === "strike") lg.training.totalStrikes += 1;
  if (pitch.result === "painted") {
    lg.training.totalPaintedCorners += 1;
    lg.training.totalStrikes += 1; // painted is a strike
  }
  // Strike streak PR
  let streak = 0;
  for (let i = (cur.pitches ?? []).length - 1; i >= 0; i--) {
    const p = cur.pitches![i];
    if (p.result === "strike" || p.result === "painted") streak++;
    else break;
  }
  if (streak > lg.training.pr.longestStrikeStreak) lg.training.pr.longestStrikeStreak = streak;
  if (opts.formScore) {
    lg.training.formScoreHistory.push({ t: pitch.t, kind: "pitching", score: opts.formScore });
    if (opts.formScore > lg.training.pr.bestFormScore) lg.training.pr.bestFormScore = opts.formScore;
  }
  growHenry(lg, "pitching", pitch.result === "painted" ? 1.5 : pitch.result === "strike" ? 0.8 : 0.2);
  checkAchievements(lg);
  bumpStreak(lg);
  return pitch;
}

export function logConditioningRep(lg: League, drillId: string, reps: number) {
  if (!lg.training) return;
  const cur = currentSession(lg, "conditioning");
  cur.drillId = drillId;
  cur.notes = (cur.notes ?? "") + ` +${reps} ${drillId}`;
  cur.durationSec = Math.floor((Date.now() - cur.t) / 1000);
  lg.training.totalConditioningReps += reps;
  // Specific rating bumps
  growHenry(lg, "conditioning", 0.3, drillId);
  checkAchievements(lg);
  bumpStreak(lg);
}

export function markScheduleDone(lg: League, drillId: string) {
  if (!lg.training) return;
  const key = new Date().toISOString().slice(0, 10);
  if (!lg.training.scheduleCompleted[key]) lg.training.scheduleCompleted[key] = [];
  if (!lg.training.scheduleCompleted[key].includes(drillId)) lg.training.scheduleCompleted[key].push(drillId);
  // Apply per-drill specific gains (V3 Section 3.2)
  growHenryByDrill(lg, drillId, 1);
  checkAchievements(lg);
  bumpStreak(lg);
}

/** Apply per-drill specific gains to Henry, respecting per-day per-attr cap. */
export function growHenryByDrill(lg: League, drillId: string, repFactor: number = 1) {
  const t = lg.training;
  if (!t) return;
  const gains = DRILL_GAINS[drillId];
  if (!gains) return;
  const henry = lg.players.find(p => p.id === t.henryPlayerId) ?? lg.freeAgents.find(p => p.id === t.henryPlayerId);
  if (!henry) return;
  const today = new Date().toISOString().slice(0, 10);
  const dayKey = (attr: string) => `day:${today}:${attr}`;
  for (const g of gains) {
    const k = dayKey(g.attr);
    const sofar = (t.lastTouchedAt as any)[k] ?? 0;
    if (sofar >= DAY_CAP_PER_ATTR) continue;
    const room = DAY_CAP_PER_ATTR - sofar;
    const granted = Math.min(g.amount * repFactor, room);
    applyAttrChange(henry, g.attr, granted);
    (t.lastTouchedAt as any)[k] = sofar + granted;
    // Touch timestamp for decay tracking
    (t.lastTouchedAt as any)[g.attr] = Date.now();
  }
  recomputeHenryOverall(henry);
}

function applyAttrChange(henry: Player, attr: AttrKey, delta: number) {
  const cap = 99;
  if (attr === "pitchVelocity") {
    if (henry.ratings.pitches?.length) henry.ratings.pitches.forEach(p => { p.velo = Math.max(40, Math.min(110, p.velo + delta * 0.5)); });
    return;
  }
  if (attr === "pitchControl") {
    if (henry.ratings.pitches?.length) henry.ratings.pitches.forEach(p => { p.ctrl = Math.max(20, Math.min(cap, p.ctrl + delta)); });
    return;
  }
  const v = (henry.ratings as any)[attr];
  if (typeof v === "number") (henry.ratings as any)[attr] = Math.max(20, Math.min(cap, v + delta));
}

/** Decay attributes Henry hasn't touched in DECAY_GRACE_DAYS days.
 * Called once per app session or once per day on first interaction.
 */
export function runDecay(lg: League) {
  const t = lg.training;
  if (!t) return;
  const henry = lg.players.find(p => p.id === t.henryPlayerId) ?? lg.freeAgents.find(p => p.id === t.henryPlayerId);
  if (!henry) return;
  const now = Date.now();
  const peakKey = "_peak";
  if (!(t.lastTouchedAt as any)[peakKey]) (t.lastTouchedAt as any)[peakKey] = JSON.stringify({});
  let peaks: Record<string, number> = {};
  try { peaks = JSON.parse((t.lastTouchedAt as any)[peakKey] ?? "{}"); } catch { peaks = {}; }

  const decayKeys: AttrKey[] = ["contactL","contactR","powerL","powerR","vision","speed","fielding","arm","reaction","stamina","composure","pitchControl"];
  for (const attr of decayKeys) {
    const cur = readAttr(henry, attr);
    if (cur == null) continue;
    if ((peaks[attr] ?? 0) < cur) peaks[attr] = cur;
    const lastTouched = (t.lastTouchedAt as any)[attr] ?? 0;
    if (!lastTouched) continue;
    const daysSince = Math.floor((now - lastTouched) / DAY_MS);
    if (daysSince <= DECAY_GRACE_DAYS) continue;
    const decayDays = daysSince - DECAY_GRACE_DAYS;
    const decayAmount = decayDays * DECAY_RATE_PER_DAY;
    const peak = peaks[attr];
    const floor = peak * DECAY_FLOOR_PCT;
    const newVal = Math.max(floor, cur - decayAmount);
    if (newVal < cur) {
      // Write back via applyAttrChange
      applyAttrChange(henry, attr, -(cur - newVal));
      // Update lastTouched so we don't keep applying full decay every call
      (t.lastTouchedAt as any)[attr] = now - DECAY_GRACE_DAYS * DAY_MS;
    }
  }
  (t.lastTouchedAt as any)[peakKey] = JSON.stringify(peaks);
  recomputeHenryOverall(henry);
}

function readAttr(henry: Player, attr: AttrKey): number | null {
  if (attr === "pitchVelocity") return henry.ratings.pitches?.[0]?.velo ?? null;
  if (attr === "pitchControl") return henry.ratings.pitches?.[0]?.ctrl ?? null;
  const v = (henry.ratings as any)[attr];
  return typeof v === "number" ? v : null;
}

function recomputeHenryOverall(henry: Player) {
  if (henry.isPitcher && henry.ratings.pitches?.length) {
    const pAvg = henry.ratings.pitches.reduce((s, p) => s + (p.brk + p.ctrl) / 2, 0) / henry.ratings.pitches.length;
    const vAvg = henry.ratings.pitches.reduce((s, p) => s + p.velo, 0) / henry.ratings.pitches.length;
    const vRating = Math.max(35, Math.min(99, (vAvg - 86) * 5 + 65));
    henry.overall = Math.round(pAvg * 0.55 + vRating * 0.2 + henry.ratings.stamina * 0.1 + henry.ratings.composure * 0.1 + henry.ratings.holdRunners * 0.05);
  } else {
    const contact = (henry.ratings.contactL + henry.ratings.contactR) / 2;
    const power = (henry.ratings.powerL + henry.ratings.powerR) / 2;
    henry.overall = Math.round(
      contact * 0.22 + power * 0.18 + henry.ratings.vision * 0.10 + henry.ratings.discipline * 0.08 +
      henry.ratings.speed * 0.08 + henry.ratings.fielding * 0.16 + henry.ratings.arm * 0.08 + henry.ratings.reaction * 0.10
    );
  }
}

function inferContactType(x: number, y: number, q: SwingLog["quality"]): SwingLog["contactType"] {
  if (q === "whiff") return "whiff";
  if (y < 0.35) return "fly";
  if (y > 0.7) return "ground";
  if (x < 0.33) return "pull";
  if (x > 0.66) return "oppo";
  return "middle";
}

function currentSession(lg: League, kind: PracticeSession["kind"]): PracticeSession {
  const t = lg.training!;
  const last = t.sessions[t.sessions.length - 1];
  if (last && last.kind === kind && Date.now() - last.t < 30 * 60 * 1000) {
    return last;
  }
  const fresh: PracticeSession = {
    id: uid("ps"),
    kind,
    t: Date.now(),
    durationSec: 0
  };
  t.sessions.push(fresh);
  if (t.sessions.length > 500) t.sessions.shift();
  return fresh;
}

function bumpStreak(lg: League) {
  const t = lg.training!;
  const now = Date.now();
  const lastDay = Math.floor(t.lastPracticeAt / DAY_MS);
  const today = Math.floor(now / DAY_MS);
  if (today === lastDay) {
    // already counted today
  } else if (today === lastDay + 1 || t.lastPracticeAt === 0) {
    t.practiceStreakDays += 1;
    if (t.practiceStreakDays > t.pr.longestPracticeStreak) t.pr.longestPracticeStreak = t.practiceStreakDays;
  } else {
    t.practiceStreakDays = 1;
  }
  t.lastPracticeAt = now;
}

/** Grow Henry's player rating based on a practice action.
 * Real Coach Billy's #1 fix is elbow-up. Strong correlation between
 * good form score and contact rating bump.
 */
function growHenry(lg: League, kind: "hitting" | "pitching" | "conditioning", magnitude: number, drillId?: string) {
  const henryId = lg.training?.henryPlayerId;
  if (!henryId) return;
  const henry = lg.players.find(p => p.id === henryId) ?? lg.freeAgents.find(p => p.id === henryId);
  if (!henry) return;
  const cap = 99;
  const bump = (key: keyof Player["ratings"], n: number) => {
    const v = (henry.ratings as any)[key];
    if (typeof v === "number") {
      (henry.ratings as any)[key] = Math.min(cap, v + n);
    }
  };
  if (kind === "hitting") {
    bump("contactR", 0.05 * magnitude);
    bump("contactL", 0.04 * magnitude);
    bump("powerR", 0.03 * magnitude);
    bump("powerL", 0.03 * magnitude);
    bump("vision", 0.04 * magnitude);
  } else if (kind === "pitching") {
    bump("composure", 0.05 * magnitude);
    bump("holdRunners", 0.03 * magnitude);
    if (henry.ratings.pitches) {
      henry.ratings.pitches.forEach(p => {
        p.ctrl = Math.min(cap, p.ctrl + 0.06 * magnitude);
        p.brk = Math.min(cap, p.brk + 0.02 * magnitude);
      });
    }
  } else {
    if (drillId === "sprints") { bump("speed", 0.08 * magnitude); bump("baserun", 0.06 * magnitude); }
    if (drillId === "pushups" || drillId === "long-toss") { bump("arm", 0.06 * magnitude); }
    if (drillId === "squats") { bump("powerR", 0.04 * magnitude); bump("powerL", 0.04 * magnitude); }
    if (drillId === "plank" || drillId === "mountain-climbers") { bump("durability", 0.04 * magnitude); }
    if (drillId === "lateral-shuffles") { bump("fielding", 0.05 * magnitude); bump("reaction", 0.05 * magnitude); }
  }
  // Recompute overall
  if (henry.isPitcher && henry.ratings.pitches?.length) {
    const pAvg = henry.ratings.pitches.reduce((s, p) => s + (p.brk + p.ctrl) / 2, 0) / henry.ratings.pitches.length;
    const vAvg = henry.ratings.pitches.reduce((s, p) => s + p.velo, 0) / henry.ratings.pitches.length;
    const vRating = Math.max(35, Math.min(99, (vAvg - 86) * 5 + 65));
    henry.overall = Math.round(pAvg * 0.55 + vRating * 0.2 + henry.ratings.stamina * 0.1 + henry.ratings.composure * 0.1 + henry.ratings.holdRunners * 0.05);
  } else {
    const contact = (henry.ratings.contactL + henry.ratings.contactR) / 2;
    const power = (henry.ratings.powerL + henry.ratings.powerR) / 2;
    henry.overall = Math.round(
      contact * 0.22 + power * 0.18 + henry.ratings.vision * 0.10 + henry.ratings.discipline * 0.08 +
      henry.ratings.speed * 0.08 + henry.ratings.fielding * 0.16 + henry.ratings.arm * 0.08 + henry.ratings.reaction * 0.10
    );
  }
}

/** Create Henry's player and assign him to the user's team. */
export function createHenryPlayer(lg: League, opts: { name: string; bats: "R" | "L" | "S"; throws: "R" | "L"; age?: number; jersey: number; teamId: string | null }): Player {
  const id = uid("p");
  const seed = Math.floor(Math.random() * 1e9);
  const player: Player = {
    id,
    firstName: opts.name.split(" ")[0] || "Henry",
    lastName: opts.name.split(" ").slice(1).join(" ") || "B",
    name: opts.name || "Henry B",
    origin: "US",
    birthplace: "Your hometown",
    birthYear: lg.year - (opts.age ?? 10),
    age: opts.age ?? 10,
    bats: opts.bats,
    throws: opts.throws,
    height: 56, // 4'8"
    weight: 80,
    position: "CF",
    isPitcher: false,
    ratings: {
      contactL: 30, contactR: 35,
      powerL: 22, powerR: 25,
      vision: 40, discipline: 38,
      speed: 50, baserun: 45, stealing: 40,
      fielding: 40, arm: 40, armAccuracy: 38, reaction: 42,
      clutch: 60, durability: 60,
      stamina: 30, composure: 45,
      gbFb: 0, holdRunners: 30,
      pitches: [
        { type: "4-Seam", velo: 60, brk: 30, ctrl: 35 },
        { type: "Changeup", velo: 50, brk: 32, ctrl: 30 }
      ]
    },
    overall: 36,
    potential: 75, // big potential — he's a kid
    hidden: { potential: 80, revealed: 60 },
    devSpeed: "normal",
    prevOvr: 36,
    devHistory: [],
    contract: { years: 1, aav: 720_000, optOut: false, noTrade: false },
    yearsExp: 0,
    serviceTime: 0,
    jerseyNumber: opts.jersey,
    walkUpSong: "Centerfield",
    traits: ["Owner's Favorite"],
    morale: 95,
    hot: 0,
    hotStreakGames: 0,
    injury: null,
    teamId: opts.teamId,
    awards: [],
    hof: false,
    retired: false,
    seasonStats: {},
    careerStats: [],
    portraitSeed: seed,
    appearance: {
      skinTone: 1, hairStyle: 1, hairColor: 1, faceShape: 1,
      brow: 1, eyeShape: 1, eyeColor: 1, nose: 1, mouth: 1,
      facialHair: 0, capTilt: 0, brimStyle: 0,
      glasses: false, chain: false, eyeBlack: true
    }
  };
  if (opts.teamId) lg.players.push(player);
  else lg.freeAgents.push(player);
  if (lg.training) lg.training.henryPlayerId = id;
  return player;
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────

export const TRAINING_ACHIEVEMENTS = [
  // Hitting 1-10
  { id: "tc-1", name: "First Swing", icon: "🏏", desc: "Log your first swing" },
  { id: "tc-2", name: "Hammering Henry", icon: "🔨", desc: "100 logged 'Crushed' hits off tee" },
  { id: "tc-3", name: "Tee Master", icon: "🎯", desc: "500 total tee swings" },
  { id: "tc-4", name: "Line Drive Legend", icon: "📏", desc: "50 line drives in one week" },
  { id: "tc-5", name: "Switch Hitter", icon: "↔️", desc: "Practice both sides of plate (10 reps each)" },
  { id: "tc-6", name: "The Crusher", icon: "💥", desc: "10 crushed hits in single session" },
  { id: "tc-7", name: "Iron Bat", icon: "🦾", desc: "Practice hitting 30 days in a row" },
  { id: "tc-8", name: "The Natural", icon: "🌟", desc: "First Live Game with 3+ hits" },
  { id: "tc-9", name: "Cycle Hunter", icon: "💍", desc: "Hit for cycle in Live Game" },
  { id: "tc-10", name: "The Slugger", icon: "💪", desc: "Hit 5 HRs in one Live Game season" },
  // Pitching 11-20
  { id: "tc-11", name: "First Pitch", icon: "⚾", desc: "Log first pitch" },
  { id: "tc-12", name: "Strike Three!", icon: "❌", desc: "10 strikeouts in one Live Game" },
  { id: "tc-13", name: "Painter", icon: "🎨", desc: "25 painted-corner strikes logged" },
  { id: "tc-14", name: "Lights Out", icon: "💡", desc: "20 consecutive strikes in one session" },
  { id: "tc-15", name: "The Closer", icon: "🔒", desc: "Save 5 Live Games" },
  { id: "tc-16", name: "No-Hitter", icon: "🚫", desc: "Pitch Live Game no-hitter" },
  { id: "tc-17", name: "Perfect Game", icon: "💎", desc: "Pitch Live Game perfect game" },
  { id: "tc-18", name: "Cy Young", icon: "🏆", desc: "Win Live Game season ERA title" },
  { id: "tc-19", name: "Workhorse", icon: "🐴", desc: "500 logged pitches total" },
  { id: "tc-20", name: "Filthy", icon: "🤢", desc: "90%+ strike % in single session" },
  // Conditioning 21-30
  { id: "tc-21", name: "Speed Demon", icon: "💨", desc: "10 sprint sessions complete" },
  { id: "tc-22", name: "Iron Arms", icon: "💪", desc: "500 pushups logged" },
  { id: "tc-23", name: "Wheels", icon: "🏃", desc: "50 squat sets logged" },
  { id: "tc-24", name: "Plank Champion", icon: "🪵", desc: "Hold plank 2 minutes" },
  { id: "tc-25", name: "Marathon Henry", icon: "🏅", desc: "30 conditioning sessions total" },
  { id: "tc-26", name: "Jumping Jack", icon: "🤸", desc: "1,000 jump rope reps" },
  { id: "tc-27", name: "Bear Mode", icon: "🐻", desc: "Bear crawl 20 times" },
  { id: "tc-28", name: "Mountain Mover", icon: "⛰️", desc: "500 mountain climbers" },
  { id: "tc-29", name: "Stretch Master", icon: "🤸", desc: "Flexibility drill 30 days" },
  { id: "tc-30", name: "Athlete", icon: "🏃‍♂️", desc: "Hit all 9 physical drill achievements" },
  // Form 31-40
  { id: "tc-31", name: "Elbow Up", icon: "⬆️", desc: "Camera AI confirms elbow-up on 50 swings" },
  { id: "tc-32", name: "Hip Rotator", icon: "🌀", desc: "100 logged good hip rotations" },
  { id: "tc-33", name: "Perfect Form", icon: "💯", desc: "Camera Form Score of 95+" },
  { id: "tc-34", name: "Coach's Student", icon: "📓", desc: "20 Coach Billy feedback notes" },
  { id: "tc-35", name: "Drill Sergeant", icon: "🎖️", desc: "Complete every drill at least once" },
  { id: "tc-36", name: "Streak King", icon: "🔥", desc: "30-day practice streak" },
  { id: "tc-37", name: "Streak Legend", icon: "👑", desc: "100-day practice streak" },
  { id: "tc-38", name: "Perfect Week", icon: "✅", desc: "Complete every weekly schedule drill" },
  { id: "tc-39", name: "Early Bird", icon: "🐦", desc: "Practice before 9am five times" },
  { id: "tc-40", name: "Night Owl", icon: "🦉", desc: "Practice after 6pm five times" },
  // Live Game & Sim 41-50
  { id: "tc-41", name: "Rookie Card", icon: "🎴", desc: "First Live Game played" },
  { id: "tc-42", name: "All-Star Henry", icon: "⭐", desc: "Make sim All-Star team" },
  { id: "tc-43", name: "MVP", icon: "🏆", desc: "Win Live Game season MVP" },
  { id: "tc-44", name: "Champion", icon: "🏆", desc: "Win a Live Game season championship" },
  { id: "tc-45", name: "Dynasty Builder", icon: "👑", desc: "Win 3 Live Game championships" },
  { id: "tc-46", name: "Triple Threat", icon: "🎯", desc: "Achievements in hitting + pitching + conditioning" },
  { id: "tc-47", name: "The Show", icon: "🎬", desc: "Reach 80 overall rating" },
  { id: "tc-48", name: "Hall of Fame Henry", icon: "🏛️", desc: "Reach 90 overall rating" },
  { id: "tc-49", name: "GOAT", icon: "🐐", desc: "Reach 99 overall rating" },
  { id: "tc-50", name: "The Big Leagues", icon: "⚾", desc: "Get Henry's player on main league roster" },
  // Pitching arsenal 51-55
  { id: "tc-51", name: "Fastball Master", icon: "🎯", desc: "100 strike-rated four-seam fastballs in practice" },
  { id: "tc-52", name: "The Sinker", icon: "↘️", desc: "50 two-seam fastballs in Live Games" },
  { id: "tc-53", name: "Slow It Down", icon: "🐢", desc: "50 changeups in Live Games" },
  { id: "tc-54", name: "Two-Pitch Wonder", icon: "🥇", desc: "70+ Pitching Control with fastball + changeup only" },
  { id: "tc-55", name: "The Veteran", icon: "🎓", desc: "Reach age 14+ and unlock curveball training" }
];

function unlock(lg: League, id: string) {
  const t = lg.training!;
  if (!t.achievementsUnlocked.includes(id)) {
    t.achievementsUnlocked.push(id);
    const def = TRAINING_ACHIEVEMENTS.find(a => a.id === id);
    if (def) {
      lg.newsLog.unshift({
        id: uid("n"), day: lg.day, year: lg.year, category: "Award",
        headline: `🏅 Achievement unlocked: ${def.name} — ${def.desc}`,
        important: true
      });
    }
  }
}

export function checkAchievements(lg: League) {
  const t = lg.training;
  if (!t) return;
  if (t.totalSwings >= 1) unlock(lg, "tc-1");
  if (t.totalCrushedHits >= 100) unlock(lg, "tc-2");
  if (t.totalSwings >= 500) unlock(lg, "tc-3");
  if (t.totalPitches >= 1) unlock(lg, "tc-11");
  if (t.totalPitches >= 500) unlock(lg, "tc-19");
  if (t.totalPaintedCorners >= 25) unlock(lg, "tc-13");
  if (t.pr.longestStrikeStreak >= 20) unlock(lg, "tc-14");
  if (t.totalConditioningReps >= 1000) unlock(lg, "tc-26");
  if (t.practiceStreakDays >= 30) unlock(lg, "tc-36");
  if (t.practiceStreakDays >= 100) unlock(lg, "tc-37");
  if (t.pr.bestFormScore >= 95) unlock(lg, "tc-33");
  // Crushed in row
  const last = t.sessions[t.sessions.length - 1];
  if (last?.swings) {
    let run = 0; let max = 0;
    for (const s of last.swings) {
      if (s.quality === "crushed") { run++; max = Math.max(max, run); }
      else run = 0;
    }
    if (max >= 10) unlock(lg, "tc-6");
    if (max > t.pr.mostCrushedInRow) t.pr.mostCrushedInRow = max;
  }
  // Big Leagues — Henry's player on a roster
  const henry = lg.players.find(p => p.id === t.henryPlayerId);
  if (henry?.teamId) unlock(lg, "tc-50");
  // The Show — 80 OVR
  if (henry && henry.overall >= 80) unlock(lg, "tc-47");
  if (henry && henry.overall >= 90) unlock(lg, "tc-48");
  if (henry && henry.overall >= 99) unlock(lg, "tc-49");
  // Triple Threat
  const hasHit = t.totalSwings >= 1;
  const hasPitch = t.totalPitches >= 1;
  const hasCond = t.totalConditioningReps >= 1;
  if (hasHit && hasPitch && hasCond) unlock(lg, "tc-46");
  // Drill Sergeant — completed every drill
  const allDrillIds = ["fence-drill","top-hand","no-hands-hip","towel-heel","colored-ball","sharpie-line","one-knee","walk-through","slow-motion","two-tee","target-practice","inside-outside","high-low","strike-ball-strike","towel-drill","balance","knee-throws","long-toss","pickoff","bullpen-sequence","sprints","pushups","squats","plank","lateral-shuffles","jump-rope","bear-crawls","arm-circles","mountain-climbers","toe-touches"];
  const completedDrills = new Set<string>();
  Object.values(t.scheduleCompleted).forEach(arr => arr.forEach(d => completedDrills.add(d)));
  if (allDrillIds.every(d => completedDrills.has(d))) unlock(lg, "tc-35");
  // Early/Night bird
  const hour = new Date().getHours();
  if (hour < 9) {
    const eb = t.sessions.filter(s => new Date(s.t).getHours() < 9).length;
    if (eb >= 5) unlock(lg, "tc-39");
  }
  if (hour >= 18) {
    const no = t.sessions.filter(s => new Date(s.t).getHours() >= 18).length;
    if (no >= 5) unlock(lg, "tc-40");
  }
}
