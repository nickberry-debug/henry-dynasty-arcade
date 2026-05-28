// Core domain types
import type { PitchType, Trait } from "../data/misc";

export type Position = "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH" | "SP" | "RP" | "CL" | "UT";
export type Hand = "L" | "R" | "S";

export interface HitterRatings {
  contactL: number; contactR: number;
  powerL: number; powerR: number;
  vision: number; discipline: number;
  speed: number; baserun: number; stealing: number;
  fielding: number; arm: number; armAccuracy: number; reaction: number;
  clutch: number; durability: number;
}

export interface PitcherRatings {
  stamina: number; composure: number;
  gbFb: number; // -50..+50, negative=FB
  holdRunners: number;
  clutch: number; durability: number;
  pitches: Array<{ type: PitchType; velo: number; brk: number; ctrl: number }>;
}

export interface SeasonStats {
  // hitting
  g?: number; pa?: number; ab?: number; r?: number; h?: number;
  doubles?: number; triples?: number; hr?: number; rbi?: number;
  bb?: number; k?: number; sb?: number; cs?: number;
  avg?: number; obp?: number; slg?: number; ops?: number;
  // pitching
  gs?: number; w?: number; l?: number; sv?: number; hld?: number; bs?: number;
  ip?: number; outs?: number; ph?: number; pr?: number; per?: number; pbb?: number; pk?: number; phr?: number;
  era?: number; whip?: number;
  // hidden
  war?: number;
}

export interface CareerSeason extends SeasonStats {
  year: number;
  age: number;
  teamId: string | null;
}

export interface Award {
  year: number;
  type: string;
  league?: string;
}

export interface Injury {
  name: string;
  daysOut: number;
  dlType: "DTD" | "10-day" | "15-day" | "60-day" | "Season-Ending";
}

export interface Contract {
  years: number;
  aav: number;
  optOut: boolean;
  noTrade: boolean;
}

export type DevSpeed = "fast" | "normal" | "late";

export interface DevHistoryItem {
  year: number;
  age: number;
  ovrDelta: number;
  event?: "breakout" | "bust" | "resurgence" | "injuryDecline" | "lateBloom" | "potentialReveal";
  note?: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  nickname?: string;
  origin: string;
  birthplace: string;
  birthYear: number;
  age: number;
  bats: Hand;
  throws: Hand;
  height: number; // inches
  weight: number; // lbs
  position: Position;
  altPosition?: Position;
  isPitcher: boolean;
  ratings: HitterRatings & PitcherRatings;
  overall: number;
  potential: number; // visible (scouted) potential — can be lower than hidden when undiscovered
  hidden: { potential: number; revealed: number /* 0..100 % of true potential revealed via scouting */ };
  devSpeed: DevSpeed;
  prevOvr: number; // overall at end of previous season — for arrows
  devHistory: DevHistoryItem[];
  contract: Contract;
  yearsExp: number;
  serviceTime: number; // years.days
  jerseyNumber: number;
  walkUpSong?: string;
  closerEntrance?: string;
  traits: Trait[];
  morale: number; // 0-100
  hot: number; // -10..+10 streak modifier
  hotStreakGames: number;
  injury: Injury | null;
  teamId: string | null;
  awards: Award[];
  hof: boolean;
  hofVotes?: number; // percentage from last ballot
  retired: boolean;
  retiredYear?: number;
  seasonStats: SeasonStats;
  careerStats: CareerSeason[];
  portraitSeed: number; // stable random seed for portrait
  appearance: PlayerAppearance;
}

export interface PlayerAppearance {
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  faceShape: number;
  brow: number;
  eyeShape: number;
  eyeColor: number;
  nose: number;
  mouth: number;
  facialHair: number;
  capTilt: number;
  brimStyle: number;
  glasses: boolean;
  chain: boolean;
  eyeBlack: boolean;
}

export interface Stadium {
  name: string;
  capacity: number;
  lf: number; lcf: number; cf: number; rcf: number; rf: number;
  lfHeight: number; rfHeight: number;
  foul: number; // 0..100
  altitude: number;
  surface: "grass" | "turf";
  roof: "open" | "retractable" | "dome";
  parkFactor: number; // 90..110
}

export interface Team {
  id: string;
  city: string;
  name: string;
  abbr: string;
  primary: string;
  secondary: string;
  accent: string;
  symbol: string;
  logoVariant: number; // shape variant
  established: number;
  divisionId: number;
  stadium: Stadium;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  playoffSeed: number | null;
  history: Array<{ year: number; w: number; l: number; finish: string | null; champion?: boolean }>;
  retiredNumbers: number[];
  rivalIds: string[];
  budget: number;
  managerName: string;
  managerStyle: { aggression: number; quickHook: number; bunt: number; platoon: number };
  captainId?: string | null;
  rosterOrder?: string[];
}

export interface Game {
  id: string;
  day: number;
  homeId: string;
  awayId: string;
  played: boolean;
  isPlayoff: boolean;
  playoffRound?: string;
  score: { home: number; away: number } | null;
  linescore?: { home: number[]; away: number[]; homeH: number; awayH: number };
  highlights?: string[];
}

export interface DraftProspect extends Player {
  scoutGrade: string;
  // The potential shown in scouting reports — a noisy estimate of the
  // true `.potential` field. Roughly 5–10% of prospects are "hidden
  // gems" whose scoutedPotential is significantly lower than reality;
  // sometimes you find a star in a late round.
  scoutedPotential: number;
  hiddenGem?: boolean;
  // How many times the user has scouted this prospect; more scouting
  // tightens the scoutedPotential estimate toward the truth.
  scoutVisits: number;
}

export interface FreeAgentDemand {
  playerId: string;
  yearsWanted: number;
  aavWanted: number;
  tier: "Superstar" | "Star" | "Solid" | "Role" | "Depth";
  interestedTeamIds: string[];
}

export interface PlayoffMatch {
  high: string; low: string;
  wins: { high: number; low: number };
  bestOf: number;
  games: Game[];
  winner: string | null;
}

export interface PlayoffRound {
  name: string;
  matches: PlayoffMatch[];
}

export interface Playoffs {
  roundIdx: number;
  rounds: PlayoffRound[];
}

export interface DraftPick {
  pick: number;
  round: number;
  teamId: string;
  playerId: string | null;
}

export interface Draft {
  year: number;
  pickOrder: string[]; // team ids
  currentPick: number;
  prospects: DraftProspect[];
  picks: DraftPick[];
  userTeamId?: string | null;
  completed: boolean;
}

export interface SeasonAwards {
  year: number;
  mvp: string | null;
  cyYoung: string | null;
  roy: string | null;
  reliever: string | null;
  comeback: string | null;
  managerOfYear: string | null;
  goldGloves: Record<Position, string | null>;
  silverSluggers: Record<Position, string | null>;
  hrChamp: string | null;
  battingTitle: string | null;
  eraTitle: string | null;
  worldSeriesMvp: string | null;
}

export interface NewsItem {
  id: string;
  day: number;
  year: number;
  category: "Trade" | "Injury" | "Milestone" | "Streak" | "Record" | "Game" | "Off-Field" | "Award" | "Draft" | "FA" | "Drama";
  headline: string;
  body?: string;
  teamIds?: string[];
  playerIds?: string[];
  important?: boolean;
  // Drama-engine fields (V4) — all optional so older saves still type-check
  dramaCategory?: "injury" | "funny" | "rumor" | "milestone" | "drama" | "personal" | "weather" | "lucky" | "cold-streak" | "hot-streak" | "comeback" | "pop-culture" | "holiday" | "rivalry" | "hot-take";
  emoji?: string;
  tone?: "playful" | "dramatic" | "serious" | "absurd";
  severity?: "minor" | "moderate" | "major";
  tickerText?: string;
  gameEffect?: {
    type: "injury" | "rating-boost" | "rating-penalty" | "morale-boost" | "morale-penalty" | "none";
    duration: number;
    magnitude: number;
    attribute?: string;
  };
  reactions?: { likes: number; laughs: number; fire: number; sad: number; bullseye: number };
  source?: "sim" | "drama-template" | "drama-ai" | "hot-take" | "holiday";
  memorable?: boolean;
}

export interface HistoryRecord {
  year: number;
  champion: string;
  runnerUp: string;
  champRecord?: string;
  mvp: string;
  cy: string;
  roy: string;
  hrLeader?: { name: string; hr: number };
  avgLeader?: { name: string; avg: number };
  eraLeader?: { name: string; era: number };
  notes?: string[];
}

export interface FeatureFlags {
  hotCold: boolean;
  personality: boolean;
  chemistry: boolean;
  weather: boolean;
  managerAi: boolean;
  rivalries: boolean;
  nicknames: boolean;
  walkUpMusic: boolean;
  captains: boolean;
  retiredNumbers: boolean;
  throwbacks: boolean;
  closerEntrance: boolean;
  signatureFoods: boolean;
  pitchMix: boolean;
  sprayCharts: boolean;
  heatMaps: boolean;
  splits: boolean;
  streaks: boolean;
  milestones: boolean;
  recordsConfetti: boolean;
  walkoffs: boolean;
  featuredGames: boolean;
  immaculate: boolean;
  ejections: boolean;
  brawls: boolean;
  tradeRumors: boolean;
  faRumors: boolean;
  springTraining: boolean;
  internationalTourney: boolean;
  top100: boolean;
  powerRankings: boolean;
  dynasty: boolean;
  developmentCurves: boolean;
  warGraph: boolean;
  similarPlayers: boolean;
  hofVoting: boolean;
  numberCeremony: boolean;
  stadiumUpgrades: boolean;
  managerFirings: boolean;
  gmGrades: boolean;
  achievements: boolean;
  photoMode: boolean;
  throwbackThursday: boolean;
  columnist: boolean;
  headlineNews: boolean;
}

export interface AudioSettings {
  master: number;
  music: number;
  musicOn: boolean;
  sfx: number;
  sfxOn: boolean;
  crowd: boolean;
  announcerText: boolean;
}

export interface VisualSettings {
  theme: "dark" | "light" | "auto";
  reducedMotion: boolean;
  fontScale: "S" | "M" | "L" | "XL";
  animations: "off" | "subtle" | "full";
  confetti: boolean;
}

export interface GameplaySettings {
  simSpeed: "auto" | "fast" | "standard" | "immersive";
  salaryCapOn: boolean;
  salaryCap: number;
  injuryFreq: "off" | "low" | "normal" | "high";
  tradeFreq: "low" | "normal" | "high";
  universalDH: boolean;
  scheduleLength: 30 | 60 | 82 | 120 | 162;
  playoffFormat: { wildCard: number; lds: number; lcs: number; ws: number };
  numTeams: number;
  mlbMode: boolean;
  // Development engine
  devEngineOn: boolean;
  agingIntensity: "gentle" | "realistic" | "harsh";
  breakoutBustFreq: "low" | "normal" | "high";
  retirementAgeCap: number; // default 43
  showDevArrows: boolean;
  prospectWatch: boolean;
}

export interface Settings {
  gameplay: GameplaySettings;
  features: FeatureFlags;
  audio: AudioSettings;
  visual: VisualSettings;
}

export type LeagueMode = "career" | "tournament" | "sandbox";

export type LeaguePhase =
  | "preseason"
  | "freeagency"
  | "draft"
  | "springTraining"
  | "openingDay"
  | "regular"
  | "allStarBreak"
  | "tradeDeadline"
  | "playoffRace"
  | "allstar"
  | "playoffs"
  | "awardsNight"
  | "hofVoting"
  | "offseason";

export interface GMProfile {
  name: string;
  color: string;
  favTeamId: string | null;
  avatarSeed: number;
  createdAt: number;
  luckyNumber?: number;
  birthMMDD?: string; // "MM-DD" for birthday mode
  familyNames?: string[]; // up to 10 names injected into the name pool
  /** Time-capsule entries written by Henry, surfaced 10 in-game seasons later */
  timeCapsule?: Array<{ year: number; note: string; surfaced: boolean }>;
}

export interface TutorialState {
  hasSeenWelcome: boolean;
  guidedSeason: boolean;
  completedChapters: string[];
  dismissedTips: string[];
}

export interface AllStarRoster {
  league: "AL" | "NL";
  starters: Record<Position, string | null>;
  reserves: string[];
  pitchers: string[];
}

export interface DerbyParticipant { playerId: string; round1: number; round2: number; round3: number; }

export type PracticeKind = "hitting" | "pitching" | "conditioning";

export interface SwingLog {
  id: string;
  t: number;
  quality: "crushed" | "okay" | "weak" | "whiff";
  /** Net-zone tap: x,y normalized 0..1 */
  netX: number; netY: number;
  /** Inferred result for stats. */
  contactType?: "pull" | "middle" | "oppo" | "ground" | "fly" | "whiff";
  formScore?: number;
}

export interface PitchLog {
  id: string;
  t: number;
  /** Strike zone tap: column 0..3 (out-L, in-L, in-R, out-R), row 0..3 */
  zoneCol: number; zoneRow: number;
  result: "strike" | "painted" | "close" | "ball";
  pitchType: string;
  formScore?: number;
}

export interface PracticeSession {
  id: string;
  kind: PracticeKind;
  t: number;
  durationSec: number;
  drillId?: string;
  swings?: SwingLog[];
  pitches?: PitchLog[];
  notes?: string;
  formScoreAvg?: number;
}

export interface HenryProfile {
  /** Pre-loaded. Never wiped on app update. */
  name: string;
  age: number;
  heightInches: number;
  weightLbs: number;
  hometown: string;
  bats: "L" | "R" | "S";
  throws: "L" | "R";
  position: string;
  jerseyNumber: number;
  teamId: string | null;
  /** Base64-encoded photo or null. Stored locally. */
  photoDataUrl: string | null;
  cardFrame: string; // unlock-driven cosmetic
  createdAt: number;
  modifiedAt: number;
}

export interface TrainingState {
  /** Optional player ID for "Henry the Player" in the league. */
  henryPlayerId: string | null;
  practiceStreakDays: number;
  lastPracticeAt: number;
  sessions: PracticeSession[];
  achievementsUnlocked: string[];
  /** Per-day completed schedule items. Key: "YYYY-MM-DD" */
  scheduleCompleted: Record<string, string[]>;
  weeklyTemplate: Array<{ day: string; drills: string[]; tip: string }>;
  totalSwings: number;
  totalPitches: number;
  totalCrushedHits: number;
  totalStrikes: number;
  totalPaintedCorners: number;
  totalConditioningReps: number;
  /** Rolling Form Score history for charts. */
  formScoreHistory: Array<{ t: number; kind: PracticeKind; score: number }>;
  /** PRs */
  pr: {
    longestStrikeStreak: number;
    mostCrushedInRow: number;
    bestFormScore: number;
    longestPracticeStreak: number;
  };
  settings: {
    cameraOn: boolean;
    voiceFeedback: boolean;
    showStickFigure: boolean;
    practiceReminders: boolean;
    outdoorMode: boolean;
    sounds: boolean;
    haptics: boolean;
    anthropicApiKey: string;
    aiCoachingEnabled: boolean;
    speedGunEnabled: boolean;
    speedGunDistanceFt: number;
  };
  /** Pre-loaded, never wiped. */
  henryProfile: HenryProfile;
  /** Per-attribute timestamps of last-touched practice, used for decay calc. */
  lastTouchedAt: Record<string, number>;
  /** Aggregate per-week deltas for the report card. */
  weeklySnapshots: Array<{ weekStart: number; ovrDelta: number; sessions: number }>;
  /** Personal records list. */
  personalRecords: Array<{ id: string; label: string; value: number; unit: string; achievedAt: number }>;
}

export interface AllStarEvent {
  year: number;
  rosters: { AL: AllStarRoster; NL: AllStarRoster };
  userPicksRemaining: number;
  derby: { participants: DerbyParticipant[]; champion: string | null; round: number };
  game: { played: boolean; score: { AL: number; NL: number } | null; mvp: string | null; linescore?: { AL: number[]; NL: number[] } };
}

export interface PendingTransition {
  type: "openingDay" | "allStarBreak" | "tradeDeadline" | "playoffRace" | "playoffsStart" | "worldSeries" | "awardsNight" | "offseason" | "newSeason";
  ack: boolean;
}

export interface League {
  id: string;
  createdAt: number;
  modifiedAt: number;
  name: string;
  year: number;
  day: number;
  weekIdx: number;
  phase: LeaguePhase;
  mode: LeagueMode;
  teams: Team[];
  players: Player[];
  freeAgents: Player[];
  retiredPlayers: Player[];
  schedule: Game[];
  divisions: Array<{ id: number; name: string; teamIds: string[] }>;
  playoffs: Playoffs | null;
  draft: Draft | null;
  history: HistoryRecord[];
  seasonAwards: SeasonAwards | null;
  newsLog: NewsItem[];
  achievements: string[]; // unlocked ids
  userTeamId: string | null;
  gmProfile: GMProfile | null;
  tutorial: TutorialState;
  allStar: AllStarEvent | null;
  training: TrainingState | null;
  pendingTransition: PendingTransition | null;
  tradeDeadlineDay: number;
  allStarBreakDay: number;
  settings: Settings;
}
