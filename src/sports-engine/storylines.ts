// Shared storyline tracker — used by BOTH Baseball and Football.
//
// A storyline is a named ongoing arc tracked across a season. Sports
// open/advance/resolve storylines via these helpers; the data shape
// (StorylineState) is identical across sports so the news page + ticker
// can render either sport's storylines with the same components.
//
// Per the architecture doc: this is the FIRST shared infrastructure
// module both sports actually consume from. Future passes will move
// news log push, schedule frame, and phase guards into the same folder.

import type { Storyline, StorylineKind, StorylineState } from "./types";
import { STORYLINE_EMOJI } from "./types";

/** Open a new storyline. If an active storyline with the same id already
 *  exists, advance it instead of duplicating. */
export function openOrAdvance(
  state: StorylineState,
  spec: {
    id: string;
    kind: StorylineKind;
    season: number;
    at: { week?: number; day?: number };
    label: string;
    body?: string;
    playerIds?: string[];
    teamIds?: string[];
    emoji?: string;
  },
): Storyline {
  const existing = state.active.find(s => s.id === spec.id && !s.resolved);
  if (existing) {
    existing.lastTouchedAt = spec.at;
    existing.intensity += 1;
    existing.label = spec.label;
    if (spec.body) existing.body = spec.body;
    if (spec.playerIds) existing.playerIds = uniq([...existing.playerIds, ...spec.playerIds]);
    if (spec.teamIds) existing.teamIds = uniq([...existing.teamIds, ...spec.teamIds]);
    return existing;
  }
  const s: Storyline = {
    id: spec.id,
    kind: spec.kind,
    season: spec.season,
    openedAt: spec.at,
    lastTouchedAt: spec.at,
    label: spec.label,
    body: spec.body,
    playerIds: spec.playerIds ?? [],
    teamIds: spec.teamIds ?? [],
    intensity: 1,
    emoji: spec.emoji ?? STORYLINE_EMOJI[spec.kind],
  };
  state.active.push(s);
  return s;
}

/** Mark a storyline resolved — it moves from active → resolved. */
export function resolveStoryline(state: StorylineState, id: string, note?: string): Storyline | null {
  const idx = state.active.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const [s] = state.active.splice(idx, 1);
  s.resolved = true;
  if (note) s.body = (s.body ? s.body + " " : "") + note;
  state.resolved.unshift(s);
  return s;
}

/** Cap resolved storylines to keep memory bounded. */
export function trimResolved(state: StorylineState, max = 30) {
  if (state.resolved.length > max) state.resolved.length = max;
}

/** Build a one-line ticker text for a storyline. */
export function tickerLine(s: Storyline): string {
  const emoji = s.emoji ?? STORYLINE_EMOJI[s.kind];
  const stars = s.intensity > 1 ? " " + "★".repeat(Math.min(3, s.intensity - 1)) : "";
  return `${emoji} ${s.label}${stars}`;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ── Storyline-detection helpers (sport-agnostic) ─────────────────────
//
// These take generic team-record-like shapes and return suggested
// storyline specs. Each sport's per-week hook can call these and feed
// the results through openOrAdvance().

export interface TeamRecord {
  id: string;
  wins: number;
  losses: number;
  ties?: number;
}

export interface RecentResult {
  teamId: string;
  result: "W" | "L" | "T";
  opponentId: string;
}

/** Detect the current win-streak holders across a list of recent results.
 *  Returns an array of teams currently on a 3+ game streak. */
export function detectWinStreaks(recent: Map<string, RecentResult[]>, threshold = 3): Array<{ teamId: string; len: number; lastOppId: string }> {
  const out: Array<{ teamId: string; len: number; lastOppId: string }> = [];
  for (const [teamId, results] of recent) {
    let len = 0;
    let lastOppId = "";
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].result === "W") {
        len++;
        if (!lastOppId) lastOppId = results[i].opponentId;
      } else break;
    }
    if (len >= threshold) out.push({ teamId, len, lastOppId });
  }
  return out;
}

/** Detect the current loss-streak teams. */
export function detectLossStreaks(recent: Map<string, RecentResult[]>, threshold = 3): Array<{ teamId: string; len: number }> {
  const out: Array<{ teamId: string; len: number }> = [];
  for (const [teamId, results] of recent) {
    let len = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].result === "L") len++;
      else break;
    }
    if (len >= threshold) out.push({ teamId, len });
  }
  return out;
}

/** Detect a tight playoff race — teams within 2 games of the cutoff with
 *  fewer than `weeksLeft * 2` games remaining. */
export function detectPlayoffPushes(
  standings: TeamRecord[],
  playoffCutoff: number,
  weeksLeft: number,
): Array<{ teamId: string; gamesBack: number }> {
  if (weeksLeft > 6) return []; // too early
  const sorted = [...standings].sort((a, b) => b.wins - a.wins);
  const cutoffWins = sorted[playoffCutoff - 1]?.wins ?? 0;
  const bubble = sorted.slice(playoffCutoff - 1, playoffCutoff + 3)
    .map(t => ({ teamId: t.id, gamesBack: cutoffWins - t.wins }))
    .filter(t => t.gamesBack <= 2 && t.gamesBack >= -1);
  return bubble;
}
