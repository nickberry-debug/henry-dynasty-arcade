// src/versus/campaign.ts
//
// Phase 4: Championship + Story campaigns for Boxing and Wrestling.
//
// A "campaign" is a multi-match arc the player runs through. It lives in
// sessionStorage (key `dd_versus_campaign`) so it survives the `location.reload()`
// we use between matches to reset the BoxingVersus / WrestlingVersus state
// machine. Once the campaign ends (win or loss), `clearCampaign()` wipes
// the blob so the player drops back to the normal versus hub flow.
//
// Per-profile completion flags + championship trophies are persisted under
// `henry-versus-campaign-progress-v1` so the player keeps their badges
// across sessions.

import type { Sport } from "./types";
import { BOXERS } from "../combat-sports/boxing/fighters";
import { WRESTLERS } from "../combat-sports/wrestling/wrestlers";

export type CampaignType = "championship" | "story";
export type BracketSize = 4 | 8;

export interface CampaignBlob {
  type: CampaignType;
  sport: Sport; // boxing | wrestling
  /** Profile of the player driving the campaign. */
  profileId: string;
  /** Fighter ID the player picked at the start (latched after first match). */
  playerFighterId?: string;
  /** Ordered list of opponent fighter IDs the player has to beat. */
  opponents: string[];
  /** Index of the *next match to play*. Starts at 0. */
  currentIdx: number;
  /** Match wins inside this arc — tracked for the trophy. */
  wins: number;
  /** For championship: the bracket size that was picked. */
  bracketSize?: BracketSize;
  /** Per-arc flavor (story mode only). Same length as opponents. */
  flavorByMatch?: MatchFlavor[];
}

export interface MatchFlavor {
  /** Headline shown in the cinematic intro — e.g. "THE COMER". */
  title: string;
  /** Optional sub-line. */
  subtitle?: string;
  /** Quoted flavor blurb. */
  flavor?: string;
}

const SESSION_KEY  = "dd_versus_campaign";
const PROGRESS_KEY = "henry-versus-campaign-progress-v1";

// ── sessionStorage (active campaign) ────────────────────────────────

/** Read the active campaign (if any). Returns null when no campaign,
 *  when the sport doesn't match, or when the blob is malformed. */
export function loadActiveCampaign(forSport?: Sport): CampaignBlob | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw) as CampaignBlob;
    if (!blob || typeof blob !== "object") return null;
    if (!Array.isArray(blob.opponents) || blob.opponents.length === 0) return null;
    if (forSport && blob.sport !== forSport) return null;
    return blob;
  } catch {
    return null;
  }
}

export function writeActiveCampaign(blob: CampaignBlob): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(blob)); } catch { /* ignore */ }
}

export function clearActiveCampaign(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/** True if the current match index is the LAST one in the arc. */
export function isFinalMatchOfCampaign(c: CampaignBlob): boolean {
  return c.currentIdx >= c.opponents.length - 1;
}

/** Advance the campaign one match forward after a win. Returns null if
 *  the arc just completed (and grants the badge); else the updated blob. */
export function advanceCampaign(c: CampaignBlob): CampaignBlob | null {
  c.wins += 1;
  // Latch player's fighter so they keep it through the arc.
  // (caller can also set this explicitly.)
  if (isFinalMatchOfCampaign(c)) {
    // Arc complete — grant badge + clear.
    if (c.profileId) {
      if (c.type === "championship") grantTrophy(c.profileId, c.sport);
      else grantStorybook(c.profileId, c.sport);
    }
    clearActiveCampaign();
    return null;
  }
  c.currentIdx += 1;
  writeActiveCampaign(c);
  return c;
}

/** On a story-mode loss: restart the current match (kid-friendly). */
export function restartCurrent(c: CampaignBlob): void {
  // wins are not decremented because the player hasn't won yet at this idx;
  // we just keep currentIdx and re-fight the same opponent.
  writeActiveCampaign(c);
}

// ── Flavor (story + championship intros) ────────────────────────────

/** Returns the flavor blob to render in the campaign_intro screen for
 *  the *current* match. */
export function flavorForCurrent(c: CampaignBlob): MatchFlavor {
  if (c.flavorByMatch && c.flavorByMatch[c.currentIdx]) {
    return c.flavorByMatch[c.currentIdx];
  }
  // Championship default flavor.
  const total = c.opponents.length;
  const matchNumber = c.currentIdx + 1;
  if (c.type === "championship") {
    if (matchNumber === total) {
      return { title: "FINALS", subtitle: "Last bout. Title's on the line.", flavor: "The crowd's a wall of noise. One more win." };
    }
    if (matchNumber === total - 1) {
      return { title: "SEMIFINALS", subtitle: "Two more wins for the belt." };
    }
    return { title: `BOUT ${matchNumber}`, subtitle: "Eyes forward. One round at a time." };
  }
  // Story fallback (shouldn't be hit because flavorByMatch is built in builder).
  return { title: `MATCH ${matchNumber}` };
}

// ── Champion / storybook badges (per-profile, persistent) ───────────

export interface CampaignProgress {
  /** True if the player has ever won a championship in this sport. */
  championshipWon: boolean;
  /** True if the player has ever completed story mode in this sport. */
  storybook: boolean;
  /** Last bracket size won (so the badge can read "4-FIGHTER CHAMPION" etc). */
  bracketWon?: BracketSize;
  /** Count of championships won, since the kids will run it more than once. */
  championshipCount: number;
  /** Count of story completions. */
  storybookCount: number;
}

function emptyProgress(): CampaignProgress {
  return { championshipWon: false, storybook: false, championshipCount: 0, storybookCount: 0 };
}

type ProgressBlob = Record<string, CampaignProgress>;

function progressKey(profileId: string, sport: Sport): string {
  return `${profileId}-${sport}`;
}

function readProgressBlob(): ProgressBlob {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? (parsed as ProgressBlob) : {};
  } catch { return {}; }
}
function writeProgressBlob(b: ProgressBlob): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(b)); } catch { /* ignore */ }
}

export function getCampaignProgress(profileId: string, sport: Sport): CampaignProgress {
  const blob = readProgressBlob();
  return { ...emptyProgress(), ...(blob[progressKey(profileId, sport)] ?? {}) };
}

export function grantTrophy(profileId: string, sport: Sport, bracketSize?: BracketSize): CampaignProgress {
  const blob = readProgressBlob();
  const cur: CampaignProgress = { ...emptyProgress(), ...(blob[progressKey(profileId, sport)] ?? {}) };
  cur.championshipWon = true;
  cur.championshipCount += 1;
  if (bracketSize) cur.bracketWon = bracketSize;
  blob[progressKey(profileId, sport)] = cur;
  writeProgressBlob(blob);
  return cur;
}
export function grantStorybook(profileId: string, sport: Sport): CampaignProgress {
  const blob = readProgressBlob();
  const cur: CampaignProgress = { ...emptyProgress(), ...(blob[progressKey(profileId, sport)] ?? {}) };
  cur.storybook = true;
  cur.storybookCount += 1;
  blob[progressKey(profileId, sport)] = cur;
  writeProgressBlob(blob);
  return cur;
}

// ── Builders ────────────────────────────────────────────────────────

function rosterIdsFor(sport: Sport): string[] {
  if (sport === "boxing") return BOXERS.map(b => b.id);
  if (sport === "wrestling") return WRESTLERS.map(w => w.id);
  return [];
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Build a championship campaign. `bracketSize` = 4 → 2 opponents
 *  (semifinal + final). `bracketSize` = 8 → 3 opponents (QF + SF + F). */
export function buildChampionshipCampaign(
  sport: Sport, profileId: string, playerFighterId: string, bracketSize: BracketSize = 4
): CampaignBlob {
  const pool = rosterIdsFor(sport).filter(id => id !== playerFighterId);
  const opponentsCount = bracketSize === 8 ? 3 : 2;
  const opponents = shuffle(pool).slice(0, opponentsCount);
  // If the roster is small (e.g. 6 boxers) and player picked one already,
  // we have 5 left. 8-bracket needs 3 unique → 5 >= 3 → fine.
  // For very small rosters, fall back to allowing repeats.
  while (opponents.length < opponentsCount) {
    opponents.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return {
    type: "championship",
    sport,
    profileId,
    playerFighterId,
    opponents,
    currentIdx: 0,
    wins: 0,
    bracketSize,
  };
}

/** Build a story campaign — 5 ramping opponents with flavor. */
export function buildStoryCampaign(
  sport: Sport, profileId: string, playerFighterId: string
): CampaignBlob {
  const pool = rosterIdsFor(sport).filter(id => id !== playerFighterId);
  // Order opponents weakest → strongest by a simple stat heuristic so the
  // arc actually ramps. We pull up to 5; if pool < 5, repeat the last one.
  const sorted = sortPoolByDifficulty(sport, pool);
  const opponents: string[] = [];
  for (let i = 0; i < 5; i++) {
    opponents.push(sorted[i % sorted.length]);
  }
  const flavor: MatchFlavor[] = sport === "boxing"
    ? STORY_FLAVOR_BOXING
    : STORY_FLAVOR_WRESTLING;
  return {
    type: "story",
    sport,
    profileId,
    playerFighterId,
    opponents,
    currentIdx: 0,
    wins: 0,
    flavorByMatch: flavor,
  };
}

function sortPoolByDifficulty(sport: Sport, ids: string[]): string[] {
  if (sport === "boxing") {
    const idToScore = new Map(BOXERS.map(b => [b.id, b.stats.power + b.stats.chin + b.stats.speed * 0.5]));
    return ids.slice().sort((a, b) => (idToScore.get(a) ?? 0) - (idToScore.get(b) ?? 0));
  }
  if (sport === "wrestling") {
    const idToScore = new Map(WRESTLERS.map(w => [w.id, w.stats.power + w.stats.technique + w.stats.charisma * 0.5]));
    return ids.slice().sort((a, b) => (idToScore.get(a) ?? 0) - (idToScore.get(b) ?? 0));
  }
  return ids.slice();
}

const STORY_FLAVOR_BOXING: MatchFlavor[] = [
  { title: "THE ROOKIE",   subtitle: "Match 1 — first pro bout.",       flavor: "Just trying to make a name. Don't take any shots." },
  { title: "THE COMER",    subtitle: "Match 2 — undefeated prospect.",   flavor: "Hungry, fast, and chasing the rankings. So are you." },
  { title: "THE BRAWLER",  subtitle: "Match 3 — known for one-punch power.", flavor: "Don't get caught. One mistake and the lights go out." },
  { title: "THE LEGEND",   subtitle: "Match 4 — former champion comeback.",  flavor: "Old, smart, and never out of position. Outwork them." },
  { title: "THE CHAMP",    subtitle: "Match 5 — title on the line.",      flavor: "This is the one. Twelve fights got you here. Don't blink." },
];

const STORY_FLAVOR_WRESTLING: MatchFlavor[] = [
  { title: "DEBUT NIGHT",   subtitle: "Match 1 — first card.",            flavor: "House loves a newcomer. Don't blow it." },
  { title: "MIDCARD WALL",  subtitle: "Match 2 — beat them to climb.",    flavor: "Solid hand, solid moveset. Stop them or stay stuck." },
  { title: "THE CONTENDER", subtitle: "Match 3 — three wins = #1 contender.", flavor: "Win this and the road points to the belt." },
  { title: "MAIN EVENT",    subtitle: "Match 4 — main-event push.",       flavor: "Lights are brighter up here. Bring the crowd." },
  { title: "TITLE BOUT",    subtitle: "Match 5 — championship match.",    flavor: "Every kid in the arena knows your name. Now go take the belt." },
];
