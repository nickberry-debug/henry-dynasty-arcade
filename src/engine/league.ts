import type { League, Settings, Team, Player } from "../store/types";
import { generateTeam, generateRoster, assignDivisions } from "../generators/teams";
import { buildSchedule } from "../generators/schedule";
import { buildSimpleSeasonSchedule } from "../generators/simpleSeason";
import { generatePreHistory } from "../generators/history";
import { generatePlayer } from "../generators/players";
import { uid } from "../utils/rand";

export const DEFAULT_SETTINGS: Settings = {
  gameplay: {
    simSpeed: "standard",
    salaryCapOn: true,
    salaryCap: 230_000_000,
    injuryFreq: "normal",
    tradeFreq: "normal",
    universalDH: true,
    scheduleLength: 162,
    playoffFormat: { wildCard: 3, lds: 5, lcs: 7, ws: 7 },
    numTeams: 30,
    mlbMode: false,
    devEngineOn: true,
    agingIntensity: "realistic",
    breakoutBustFreq: "normal",
    retirementAgeCap: 43,
    showDevArrows: true,
    prospectWatch: true
  },
  features: {
    hotCold: true, personality: true, chemistry: true, weather: true, managerAi: true,
    rivalries: true, nicknames: true, walkUpMusic: true, captains: true, retiredNumbers: true,
    throwbacks: true, closerEntrance: true, signatureFoods: true, pitchMix: true, sprayCharts: true,
    heatMaps: true, splits: true, streaks: true, milestones: true, recordsConfetti: true, walkoffs: true,
    featuredGames: true, immaculate: true, ejections: true, brawls: true, tradeRumors: true, faRumors: true,
    springTraining: true, internationalTourney: true, top100: true, powerRankings: true, dynasty: true,
    developmentCurves: true, warGraph: true, similarPlayers: true, hofVoting: true, numberCeremony: true,
    stadiumUpgrades: true, managerFirings: true, gmGrades: true, achievements: true, photoMode: true,
    throwbackThursday: true, columnist: true, headlineNews: true
  },
  audio: { master: 0.7, music: 0.4, musicOn: true, sfx: 0.7, sfxOn: true, crowd: true, announcerText: true },
  visual: { theme: "dark", reducedMotion: false, fontScale: "M", animations: "full", confetti: true }
};

export function createLeague(opts: { numTeams: number; scheduleLength: 30 | 60 | 82 | 120 | 162; year: number; mlbMode: boolean; mode?: "career" | "tournament" | "sandbox"; settings?: Settings }): League {
  const settings: Settings = opts.settings ? structuredClone(opts.settings) : structuredClone(DEFAULT_SETTINGS);
  settings.gameplay.numTeams = opts.numTeams;
  settings.gameplay.scheduleLength = opts.scheduleLength;
  settings.gameplay.mlbMode = opts.mlbMode;

  const usedNames = new Set<string>();
  const teams: Team[] = [];
  for (let i = 0; i < opts.numTeams; i++) {
    teams.push(generateTeam({ year: opts.year, existingNames: usedNames, mlbIndex: opts.mlbMode ? i : undefined }));
  }
  const divisions = assignDivisions(teams);

  // Roster generation
  const players: Player[] = [];
  for (const t of teams) {
    const roster = generateRoster(t.id, opts.year);
    players.push(...roster);
  }

  // Free agents pool
  const freeAgents: Player[] = [];
  for (let i = 0; i < opts.numTeams * 4; i++) {
    freeAgents.push(generatePlayer({ year: opts.year }));
  }

  const mode = opts.mode ?? "career";
  const schedule = mode === "tournament"
    ? buildSimpleSeasonSchedule(teams, Math.max(6, Math.round(opts.scheduleLength / 4)))
    : buildSchedule(teams, opts.scheduleLength);
  const history = mode === "tournament" ? [] : generatePreHistory(teams, opts.year, 50);
  const tradeDeadlineDay = Math.round(opts.scheduleLength * 0.66);
  const allStarBreakDay = Math.round(opts.scheduleLength * 0.5);

  // Assign rivalries (same division top 2)
  divisions.forEach(d => {
    const divTeams = d.teamIds;
    for (let i = 0; i < divTeams.length; i++) {
      for (let j = i + 1; j < divTeams.length; j++) {
        const a = teams.find(t => t.id === divTeams[i])!;
        const b = teams.find(t => t.id === divTeams[j])!;
        a.rivalIds.push(b.id);
        b.rivalIds.push(a.id);
      }
    }
  });

  const league: League = {
    id: uid("lg"),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    name: "Henry's Diamond Dynasty",
    year: opts.year,
    day: 0,
    weekIdx: 0,
    // Start in "regular" — preseason is a transitional state used between
    // offseason and the next season, but at fresh league creation we want
    // the Sim buttons available immediately. The openingDay modal still
    // shows via pendingTransition below.
    phase: "regular",
    mode,
    teams,
    players,
    freeAgents,
    retiredPlayers: [],
    schedule,
    divisions,
    playoffs: null,
    draft: null,
    history,
    seasonAwards: null,
    newsLog: [{
      id: uid("n"),
      day: 0, year: opts.year,
      category: "Off-Field",
      headline: "Welcome to Henry's Diamond Dynasty!",
      body: `A new ${opts.numTeams}-team league has been established with ${opts.scheduleLength} games per season.`,
      important: true
    }],
    achievements: [],
    userTeamId: null,
    gmProfile: null,
    tutorial: { hasSeenWelcome: false, guidedSeason: true, completedChapters: [], dismissedTips: [] },
    allStar: null,
    training: defaultTrainingState(),
    pendingTransition: { type: "openingDay", ack: false },
    tradeDeadlineDay,
    allStarBreakDay,
    settings
  };
  return league;
}

export function getTeam(lg: League, id: string): Team | undefined {
  return lg.teams.find(t => t.id === id);
}

export function getPlayer(lg: League, id: string): Player | undefined {
  return lg.players.find(p => p.id === id) || lg.freeAgents.find(p => p.id === id) || lg.retiredPlayers.find(p => p.id === id);
}

export function rosterOf(lg: League, teamId: string): Player[] {
  return lg.players.filter(p => p.teamId === teamId);
}

export function payroll(lg: League, teamId: string): number {
  return rosterOf(lg, teamId).reduce((s, p) => s + p.contract.aav, 0);
}

export function defaultTrainingState() {
  return {
    henryPlayerId: null,
    practiceStreakDays: 0,
    lastPracticeAt: 0,
    sessions: [],
    achievementsUnlocked: [],
    scheduleCompleted: {},
    weeklyTemplate: [
      { day: "Monday", drills: ["fence-drill", "no-hands-hip"], tip: "Warm up first: 10 jumping jacks, 10 arm circles, 10 toe touches." },
      { day: "Tuesday", drills: ["target-practice", "long-toss"], tip: "Drink water during practice." },
      { day: "Wednesday", drills: ["plank", "toe-touches"], tip: "Rest day. Light conditioning only — your body needs recovery." },
      { day: "Thursday", drills: ["top-hand", "two-tee"], tip: "Quality > Quantity. 15 focused swings beats 50 lazy ones." },
      { day: "Friday", drills: ["towel-drill", "high-low"], tip: "Pitching arms need rest — never throw hard 2 days in a row." },
      { day: "Saturday", drills: [], tip: "Live Game day! Play a full game using this week's practice." },
      { day: "Sunday", drills: [], tip: "Coach's Choice. Pick anything that excites you today." }
    ],
    totalSwings: 0,
    totalPitches: 0,
    totalCrushedHits: 0,
    totalStrikes: 0,
    totalPaintedCorners: 0,
    totalConditioningReps: 0,
    formScoreHistory: [],
    pr: {
      longestStrikeStreak: 0,
      mostCrushedInRow: 0,
      bestFormScore: 0,
      longestPracticeStreak: 0
    },
    settings: {
      cameraOn: false,
      voiceFeedback: false,
      showStickFigure: true,
      practiceReminders: true,
      outdoorMode: false,
      sounds: true,
      haptics: true,
      // Pre-filled from build-time env var (VITE_ANTHROPIC_API_KEY) if set in
      // .env.local or Vercel project env. User can override in Profile screen.
      anthropicApiKey: (import.meta as any).env?.VITE_ANTHROPIC_API_KEY ?? "",
      aiCoachingEnabled: !!(import.meta as any).env?.VITE_ANTHROPIC_API_KEY,
      speedGunEnabled: false,
      speedGunDistanceFt: 30
    },
    henryProfile: {
      name: "Henry",
      age: 10,
      heightInches: 49, // 4'1"
      weightLbs: 60,
      hometown: "Oldsmar, FL",
      bats: "R" as const,
      throws: "R" as const,
      position: "P/CF",
      jerseyNumber: 7,
      teamId: null,
      photoDataUrl: null,
      cardFrame: "rookie",
      createdAt: Date.now(),
      modifiedAt: Date.now()
    },
    lastTouchedAt: {},
    weeklySnapshots: [],
    personalRecords: []
  };
}
