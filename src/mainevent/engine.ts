// Main Event — booking sim engine.
//
// Monthly loop: 4 TV episodes + 1 PPV. Each show is a card of
// segments (matches + promos). Booker assigns wrestlers + storyline
// links. On simulate, every segment gets a rating from wrestler
// stats + crowd excitement + story momentum + slot + match type.
// Higher show ratings → more fans → more revenue → unlock the next
// promotion tier.

import {
  ROSTER, TIERS, MATCH_TYPES, BEATS, STARTING_TITLES,
  type Wrestler, type Championship, type MatchType, type BeatKind, type PromotionTier,
} from "./data";

export type SegmentKind = "match" | "promo";

export interface SegmentDraft {
  id: string;
  kind: SegmentKind;
  /** For matches: type id (singles/tag/ladder/...). For promos: beat kind. */
  type: string;
  participants: string[];   // wrestler ids
  /** Optional storyline this segment belongs to. */
  feudId?: string;
  /** Optional title id on the line (titles only on matches). */
  titleId?: string;
}

export interface SegmentResult {
  draft: SegmentDraft;
  /** 0-5 star match rating (or 0-5 segment heat for promos). */
  rating: number;
  /** For matches — winner wrestler id. */
  winnerId?: string;
  /** Short narrative line shown in the report. */
  story: string;
  /** Popularity delta for each participant. */
  popDelta: Record<string, number>;
  /** Momentum delta for each participant. */
  momDelta: Record<string, number>;
}

export interface Show {
  id: string;
  /** Year-month-week label like "Year 1 · Apr · Week 3". */
  label: string;
  /** "tv" = weekly episode (smaller venue). "ppv" = monthly headline. */
  kind: "tv" | "ppv";
  segments: SegmentDraft[];
  results?: SegmentResult[];
  /** Overall show rating 0-5 stars. */
  overallRating?: number;
  /** Attendance / buy-rate. */
  attendance?: number;
  revenue?: number;
}

export interface Feud {
  id: string;
  /** The two anchors of the feud. */
  aId: string;
  bId: string;
  /** Heat accumulated through beats. */
  heat: number;
  /** Started on which show id. */
  startedShowId: string;
  /** Resolved? */
  resolvedShowId?: string;
  /** Winner id (face usually wins blow-off — but anything goes). */
  winnerId?: string;
  /** Brief narrative beats history. */
  history: Array<{ showId: string; kind: BeatKind; text: string }>;
}

export interface BookerState {
  year: number;
  month: number;  // 1-12
  week: number;   // 1-4 (TV) + 1 PPV per month
  fans: number;
  cash: number;
  tier: PromotionTier["id"];
  roster: Wrestler[];
  titles: Championship[];
  feuds: Feud[];
  schedule: Show[];    // upcoming + past shows
  bookingShowId: string | null;
  /** Aggregate stats for parent report / family stats. */
  showsBooked: number;
  topRating: number;
  reignsByPlayer: number;
  retired: string[];
}

export function newGame(): BookerState {
  return {
    year: 1, month: 1, week: 1,
    fans: 500, cash: 5000,
    tier: "indie",
    roster: ROSTER.map(r => ({ ...r })),
    titles: STARTING_TITLES.map(t => ({ ...t })),
    feuds: [],
    schedule: [emptyShow(1, 1, 1, "tv")],
    bookingShowId: null,
    showsBooked: 0,
    topRating: 0,
    reignsByPlayer: 0,
    retired: [],
  };
}

function emptyShow(year: number, month: number, week: number, kind: "tv" | "ppv"): Show {
  return {
    id: `s-${year}-${month}-${week}-${kind}-${Math.random().toString(36).slice(2, 7)}`,
    label: `Y${year} · ${monthName(month)} · ${kind === "ppv" ? "PPV" : `Wk ${week}`}`,
    kind,
    segments: [],
  };
}

function monthName(m: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
}

// ── Segment rating math ──────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

export function rateMatch(
  state: BookerState,
  draft: SegmentDraft,
  slotIndex: number,
  totalSlots: number,
): SegmentResult {
  const wrestlers = draft.participants.map(id => state.roster.find(r => r.id === id)).filter(Boolean) as Wrestler[];
  if (wrestlers.length < 2) {
    return baseResult(draft, 0, undefined, "Empty segment — fans tune out.");
  }
  const matchType = MATCH_TYPES.find(m => m.id === draft.type) ?? MATCH_TYPES[0];
  // Avg in-ring + charisma
  const avgRing = wrestlers.reduce((s, w) => s + w.inRing, 0) / wrestlers.length;
  const avgCharisma = wrestlers.reduce((s, w) => s + w.charisma, 0) / wrestlers.length;
  const avgPop = wrestlers.reduce((s, w) => s + w.popularity, 0) / wrestlers.length;
  const avgMom = wrestlers.reduce((s, w) => s + w.momentum, 0) / wrestlers.length;

  // Story bonus: if both in same active feud, big boost
  let storyBonus = 0;
  if (draft.feudId) {
    const f = state.feuds.find(f => f.id === draft.feudId && !f.resolvedShowId);
    if (f) storyBonus = Math.min(20, f.heat * 1.4);
  }

  // Slot weight: main event slot rewards big matchups
  const isMain = slotIndex === totalSlots - 1;
  const slotBonus = isMain && matchType.slot === "main" ? 8 : isMain ? 3 : 0;
  if (matchType.slot === "main" && !isMain) storyBonus -= 4; // wrong placement penalty

  // Title bonus
  let titleBonus = 0;
  if (draft.titleId) {
    const title = state.titles.find(t => t.id === draft.titleId);
    if (title) titleBonus = title.tier === "world" ? 12 : title.tier === "mid" ? 6 : 4;
  }

  // Compute raw 0-100 quality
  const raw =
    avgRing * 0.36 + avgCharisma * 0.20 + avgPop * 0.16 + avgMom * 0.12 +
    matchType.ratingBias + storyBonus + slotBonus + titleBonus +
    (Math.random() - 0.5) * 6;
  const stars = clamp(raw / 20, 0.5, 5);

  // Winner — favor higher rated, but feud loser sometimes wins (drama)
  const w0 = wrestlers[0], w1 = wrestlers[wrestlers.length - 1];
  const score0 = w0.popularity + w0.inRing + w0.momentum / 2 + (Math.random() * 30);
  const score1 = w1.popularity + w1.inRing + w1.momentum / 2 + (Math.random() * 30);
  const winner = score0 >= score1 ? w0 : w1;

  // Pop + momentum deltas
  const popDelta: Record<string, number> = {};
  const momDelta: Record<string, number> = {};
  for (const w of wrestlers) {
    const won = w.id === winner.id;
    popDelta[w.id] = Math.round((stars - 2) * (won ? 1.5 : 1) + (won ? 1 : -0.5));
    momDelta[w.id] = Math.round((stars - 2) * 4 + (won ? 6 : -3));
  }

  const story = generateMatchStory(wrestlers, winner, stars, matchType, draft.titleId);
  return baseResult(draft, stars, winner.id, story, popDelta, momDelta);
}

export function ratePromo(
  state: BookerState,
  draft: SegmentDraft,
  slotIndex: number,
): SegmentResult {
  const wrestlers = draft.participants.map(id => state.roster.find(r => r.id === id)).filter(Boolean) as Wrestler[];
  if (wrestlers.length === 0) return baseResult(draft, 0, undefined, "Empty promo — silence in the arena.");
  const beat = BEATS[draft.type as BeatKind];
  const avgCharisma = wrestlers.reduce((s, w) => s + w.charisma, 0) / wrestlers.length;
  const avgPop = wrestlers.reduce((s, w) => s + w.popularity, 0) / wrestlers.length;
  const storyBonus = draft.feudId ? Math.min(15, (state.feuds.find(f => f.id === draft.feudId)?.heat ?? 0) * 1.2) : 0;
  const raw = avgCharisma * 0.45 + avgPop * 0.25 + (beat?.heat ?? 4) + storyBonus + slotIndex * 0.5 + (Math.random() - 0.5) * 4;
  const stars = clamp(raw / 20, 0.5, 5);
  const popDelta: Record<string, number> = {};
  const momDelta: Record<string, number> = {};
  for (const w of wrestlers) {
    popDelta[w.id] = Math.round((stars - 2) * 1.2);
    momDelta[w.id] = Math.round((stars - 2) * 3 + (beat?.heat ?? 4) / 2);
  }
  const story = generatePromoStory(wrestlers, beat?.kind ?? "callout", stars);
  return baseResult(draft, stars, undefined, story, popDelta, momDelta);
}

function baseResult(
  draft: SegmentDraft, rating: number, winnerId?: string, story = "",
  popDelta: Record<string, number> = {}, momDelta: Record<string, number> = {},
): SegmentResult {
  return { draft, rating, winnerId, story, popDelta, momDelta };
}

function generateMatchStory(wrestlers: Wrestler[], winner: Wrestler, stars: number, mt: MatchType, titleId?: string): string {
  const loser = wrestlers.find(w => w.id !== winner.id)!;
  const bigMoves = [winner.signature, winner.finisher];
  const move = bigMoves[Math.floor(Math.random() * bigMoves.length)];
  const titleTxt = titleId ? " — and the title!" : "";
  if (stars >= 4.5) return `🌟 ${winner.name} hits the ${move} and pins ${loser.name} after a 5-star classic${titleTxt}`;
  if (stars >= 3.5) return `${winner.name} wins a hot ${mt.name.toLowerCase()} with the ${move}${titleTxt}`;
  if (stars >= 2.5) return `${winner.name} grinds out a win over ${loser.name}.`;
  return `${winner.name} barely escapes — fans expected more.`;
}

function generatePromoStory(wrestlers: Wrestler[], beat: BeatKind, stars: number): string {
  const w = wrestlers[0], target = wrestlers[1];
  if (beat === "callout") {
    return target ? `${w.name} calls out ${target.name} face-to-face. Crowd ${stars >= 3.5 ? "explodes" : "stirs"}.` :
      `${w.name} grabs the mic to a ${stars >= 3.5 ? "raucous" : "polite"} ovation.`;
  }
  if (beat === "runin") return `${w.name} runs in and ambushes ${target?.name ?? "the ring"} — chaos erupts!`;
  if (beat === "betrayal") return `${w.name} TURNS on ${target?.name}! The arena gasps.`;
  if (beat === "contract") return `Contract signed: ${wrestlers.map(x => x.name).join(" vs ")}. It's official.`;
  if (beat === "challenge") return `${w.name} issues an open challenge — who answers?`;
  if (beat === "alliance") return `${wrestlers.map(x => x.name).join(" + ")} shake hands. A new faction is born.`;
  return `${w.name} delivers a fiery reckoning speech.`;
}

// ── Show resolution ──────────────────────────────────────────────────

export function simulateShow(state: BookerState, showId: string): BookerState {
  const showIdx = state.schedule.findIndex(s => s.id === showId);
  if (showIdx < 0) return state;
  const show = { ...state.schedule[showIdx] };
  const total = show.segments.length;
  const results: SegmentResult[] = show.segments.map((seg, i) =>
    seg.kind === "match" ? rateMatch(state, seg, i, total) : ratePromo(state, seg, i)
  );
  const overall = clamp(results.reduce((s, r) => s + r.rating, 0) / Math.max(1, results.length), 0, 5);

  // Apply pop/momentum deltas to roster
  let roster = state.roster.map(r => ({ ...r }));
  let titles = state.titles.map(t => ({ ...t }));
  let feuds = state.feuds.map(f => ({ ...f, history: [...f.history] }));

  for (const r of results) {
    for (const [pid, delta] of Object.entries(r.popDelta)) {
      const w = roster.find(x => x.id === pid);
      if (w) w.popularity = clamp(w.popularity + delta, 0, 100);
    }
    for (const [pid, delta] of Object.entries(r.momDelta)) {
      const w = roster.find(x => x.id === pid);
      if (w) w.momentum = clamp(w.momentum + delta, 0, 100);
    }
    // Title change handling
    if (r.draft.titleId && r.winnerId) {
      const t = titles.find(x => x.id === r.draft.titleId);
      if (t && t.currentHolderId !== r.winnerId) {
        t.currentHolderId = r.winnerId;
        t.reignDays = 0;
        t.reignNumber += 1;
      }
    }
    // Feud heat bump
    if (r.draft.feudId) {
      const f = feuds.find(x => x.id === r.draft.feudId);
      if (f) {
        f.heat = clamp(f.heat + r.rating * 1.5, 0, 100);
        f.history.push({ showId: show.id, kind: r.draft.kind === "promo" ? (r.draft.type as BeatKind) : "reckoning", text: r.story });
      }
    }
  }

  // Attendance + revenue scale with overall rating + popularity of stars
  const cfgTier = TIERS.find(t => t.id === state.tier)!;
  const popMix = show.segments.reduce((s, seg) => {
    return s + (seg.participants.reduce((ss, pid) => ss + (roster.find(r => r.id === pid)?.popularity ?? 0), 0) / Math.max(1, seg.participants.length));
  }, 0) / Math.max(1, show.segments.length);
  const ratingFactor = 0.7 + overall / 5 * 0.6; // 0.7..1.3
  const fanFactor = state.fans * (show.kind === "ppv" ? 0.6 : 0.25);
  const attendance = Math.round(fanFactor * ratingFactor * (0.8 + popMix / 200));
  const revenue = Math.round(attendance * cfgTier.revenuePer * (show.kind === "ppv" ? 4 : 1));

  show.results = results;
  show.overallRating = Number(overall.toFixed(1));
  show.attendance = attendance;
  show.revenue = revenue;

  // Tier promotion check
  const fanGain = Math.round((overall - 2.5) * (show.kind === "ppv" ? 600 : 150));
  const newFans = clamp(state.fans + fanGain, 0, 10_000_000);
  const tierOrder: PromotionTier["id"][] = ["indie", "regional", "national", "global"];
  const curIdx = tierOrder.indexOf(state.tier);
  const curTier = cfgTier;
  let newTier = state.tier;
  if (curIdx < tierOrder.length - 1 && newFans >= curTier.fansNeeded) {
    newTier = tierOrder[curIdx + 1];
  }

  // Move calendar forward
  let { year, month, week } = state;
  if (show.kind === "tv") {
    week += 1;
    if (week > 4) {
      // PPV next
    }
  } else {
    week = 1; month += 1;
    if (month > 12) { month = 1; year += 1; }
  }

  // Auto-create next show slot if not already queued
  const upcoming = state.schedule.filter(s => !s.results);
  const nextKind: "tv" | "ppv" = show.kind === "tv" && week === 5 ? "ppv" : "tv";
  const newSched = [...state.schedule];
  newSched[showIdx] = show;
  if (upcoming.length === 1 /* this one we just played */) {
    newSched.push(emptyShow(year, month, week === 5 ? 5 : week, nextKind));
  }

  return {
    ...state,
    schedule: newSched,
    roster,
    titles,
    feuds,
    fans: newFans,
    cash: state.cash + revenue - 200, // ops cost
    tier: newTier,
    year, month, week,
    showsBooked: state.showsBooked + 1,
    topRating: Math.max(state.topRating, overall),
    reignsByPlayer: state.reignsByPlayer,
  };
}

// ── Feud helpers ─────────────────────────────────────────────────────

export function startFeud(state: BookerState, aId: string, bId: string, showId: string): BookerState {
  const id = `f-${aId}-${bId}-${state.feuds.length}`;
  const feud: Feud = { id, aId, bId, heat: 8, startedShowId: showId, history: [{ showId, kind: "callout", text: "Feud kicks off." }] };
  return { ...state, feuds: [...state.feuds, feud] };
}

export function resolveFeud(state: BookerState, feudId: string, winnerId: string, showId: string): BookerState {
  const feuds = state.feuds.map(f =>
    f.id === feudId ? { ...f, resolvedShowId: showId, winnerId } : f);
  return { ...state, feuds };
}
