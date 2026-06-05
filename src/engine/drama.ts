// Drama Engine — generates 3-4 events per league day, fills templates with
// real player/team names, applies game effects (morale, hot/cold, injury),
// biases events toward the user's team and opponents, and surfaces them in
// the news feed + ticker.
//
// Works fully offline using the template library. When an Anthropic API key
// is configured, dramaAI augments with custom AI-written events for the
// current league context (best-effort, never blocks the engine).

import type { League, NewsItem, Player } from "../store/types";
import { DRAMA_TEMPLATES, type DramaTemplate, type DramaCategory } from "../data/dramaTemplates";
// Shared sports-engine — storylines2 lives here so Baseball + Football
// (and future sports) all use the same Storyline shape and lifecycle.
import type { StorylineState as SharedStorylineState } from "../sports-engine";
import { emptyStorylineState } from "../sports-engine";

/** Persistent drama-engine state stored on the league object. */
export interface DramaState {
  /** Day number when we last ran the engine. */
  lastRunDay: number;
  /** "mellow" | "balanced" | "chaos" | "soap-opera" — defaults balanced */
  intensity: "mellow" | "balanced" | "chaos" | "soap-opera";
  /** Toggle the engine off entirely. */
  enabled: boolean;
  /** Use Claude API for richer events when key is present. */
  useAI: boolean;
  /** Cooldown bucket: template ids that fired in last 14 days, to avoid repeats. */
  recentTemplates: string[];
  /** Per-player temporary effect tracking — auto-expires. */
  activeEffects: ActiveEffect[];
  /** Legacy loose storylines — Baseball's drama subsystem uses these. KEPT
   *  for backwards-compatibility with existing saves; not migrated. */
  storylines: Storyline[];
  /** Shared-engine storylines — Baseball + Football both populate these
   *  via /src/sports-engine/storylines. Drives the News page + ticker
   *  consistently across both sports. */
  storylines2?: SharedStorylineState;
  /** Eventid → reaction counts (local only). */
  reactions: Record<string, { likes: number; laughs: number; fire: number; sad: number; bullseye: number }>;
  /** Highlight-worthy events archived to scrapbook. */
  memorableMoments: NewsItem[];
}

export interface ActiveEffect {
  id: string;
  playerId: string;
  type: "morale" | "rating" | "injury";
  delta: number;
  expiresDay: number;
  reason: string;
}

export interface Storyline {
  id: string;
  title: string;
  startDay: number;
  lastDay: number;
  beats: number;
  category: DramaCategory;
}

export function defaultDramaState(): DramaState {
  return {
    lastRunDay: -1,
    intensity: "balanced",
    enabled: true,
    useAI: false,
    recentTemplates: [],
    activeEffects: [],
    storylines: [],
    storylines2: emptyStorylineState(),
    reactions: {},
    memorableMoments: [],
  };
}

/** Ensure the league has a DramaState attached — call before any read. */
export function ensureDramaState(lg: League): DramaState {
  const anyLg = lg as any;
  if (!anyLg.drama) anyLg.drama = defaultDramaState();
  // Backfill any new fields safely.
  const d = anyLg.drama as DramaState;
  if (!d.recentTemplates) d.recentTemplates = [];
  if (!d.activeEffects) d.activeEffects = [];
  if (!d.storylines) d.storylines = [];
  if (!d.storylines2) d.storylines2 = emptyStorylineState();
  if (!d.reactions) d.reactions = {};
  if (!d.memorableMoments) d.memorableMoments = [];
  if (!d.intensity) d.intensity = "balanced";
  if (typeof d.enabled !== "boolean") d.enabled = true;
  if (typeof d.useAI !== "boolean") d.useAI = false;
  if (typeof d.lastRunDay !== "number") d.lastRunDay = -1;
  return d;
}

/** Read the drama state without forcing a write. */
export function readDramaState(lg: League): DramaState | null {
  return (lg as any).drama ?? null;
}

const COUNT_PER_INTENSITY: Record<DramaState["intensity"], [number, number]> = {
  mellow: [1, 2],
  balanced: [3, 4],
  chaos: [5, 6],
  "soap-opera": [6, 8],
};

const MAJOR_BIAS: Record<DramaState["intensity"], number> = {
  mellow: 0.05,
  balanced: 0.10,
  chaos: 0.18,
  "soap-opera": 0.25,
};

const PRNG = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x9E3779B9) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
    t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
    t ^= t >>> 16;
    return ((t >>> 0) % 100000) / 100000;
  };
};

const irnd = (rnd: () => number, lo: number, hi: number) => Math.floor(lo + rnd() * (hi - lo + 1));
const pickRnd = <T>(rnd: () => number, arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

/** Main entry — called from simDay AFTER day++. Generates events for the new day. */
export function generateDailyDrama(lg: League): NewsItem[] {
  const d = ensureDramaState(lg);
  if (!d.enabled) return [];
  // Only run once per league-day.
  if (d.lastRunDay === lg.day) return [];
  d.lastRunDay = lg.day;

  // 1. Expire effects whose duration has elapsed; restore moods/ratings.
  reapExpiredEffects(lg, d);

  // 2. Decide how many events fire today.
  const seed = lg.day * 1009 + lg.year * 31337;
  const rnd = PRNG(seed);
  const [lo, hi] = COUNT_PER_INTENSITY[d.intensity];
  const target = irnd(rnd, lo, hi);

  const events: NewsItem[] = [];
  const usedTemplateIds = new Set<string>();

  for (let i = 0; i < target; i++) {
    const ev = generateOneEvent(lg, d, rnd, usedTemplateIds);
    if (ev) {
      events.push(ev);
      lg.newsLog.unshift(ev);
    }
  }

  // 3. Holiday + special-day overlays (independent of count cap).
  const holiday = pickHoliday();
  if (holiday) {
    const holidayEvent = generateFromTemplate(lg, holiday, d, rnd, usedTemplateIds, true);
    if (holidayEvent) {
      events.push(holidayEvent);
      lg.newsLog.unshift(holidayEvent);
    }
  }

  // 4. Weekly hot-take (every 7th league day).
  if (lg.day % 7 === 0) {
    const ht = pickHotTake(rnd);
    if (ht) {
      const htEvent = generateFromTemplate(lg, ht, d, rnd, usedTemplateIds);
      if (htEvent) {
        events.push(htEvent);
        lg.newsLog.unshift(htEvent);
      }
    }
  }

  // 5. Trim recent-templates cooldown (keep last 30 ids).
  if (d.recentTemplates.length > 30) d.recentTemplates = d.recentTemplates.slice(-30);

  // 6. Cap newsLog (already done by pushNews — but be safe).
  if (lg.newsLog.length > 400) lg.newsLog.length = 400;

  return events;
}

function generateOneEvent(
  lg: League,
  d: DramaState,
  rnd: () => number,
  usedTemplateIds: Set<string>,
): NewsItem | null {
  const candidates = pickEligibleTemplates(lg, d, rnd);
  if (candidates.length === 0) return null;

  // Bias toward major events based on intensity.
  const wantMajor = rnd() < MAJOR_BIAS[d.intensity];
  const filtered = candidates.filter(t => !usedTemplateIds.has(t.id) && !d.recentTemplates.includes(t.id));
  const pool = filtered.length > 0 ? filtered : candidates;
  const majorPool = pool.filter(t => t.severity === "major");
  const tpl = wantMajor && majorPool.length > 0 ? pickRnd(rnd, majorPool) : pickRnd(rnd, pool);

  return generateFromTemplate(lg, tpl, d, rnd, usedTemplateIds);
}

function pickEligibleTemplates(lg: League, d: DramaState, _rnd: () => number): DramaTemplate[] {
  // Mellow mode avoids major drama; soap-opera lets it all in.
  if (d.intensity === "mellow") {
    return DRAMA_TEMPLATES.filter(t => t.severity !== "major" && t.category !== "drama");
  }
  // Holiday templates only fire via the dedicated path.
  return DRAMA_TEMPLATES.filter(t => t.category !== "holiday" && t.category !== "hot-take");
}

function generateFromTemplate(
  lg: League,
  tpl: DramaTemplate,
  d: DramaState,
  rnd: () => number,
  usedTemplateIds: Set<string>,
  skipCooldown = false,
): NewsItem | null {
  usedTemplateIds.add(tpl.id);
  if (!skipCooldown) d.recentTemplates.push(tpl.id);

  // Slot a player + team.
  const player = tpl.needsPlayer ? pickBiasedPlayer(lg, rnd) : pickAnyPlayer(lg, rnd);
  const team = player ? lg.teams.find(t => t.id === player.teamId) : pickBiasedTeam(lg, rnd);
  if (tpl.needsPlayer && !player) return null;

  const N = irnd(rnd, 3, 24);
  const Days = irnd(rnd, 1, 7);

  const fill = (s: string) => s
    .replace(/\{P\}/g, player?.name ?? "A player")
    .replace(/\{F\}/g, player?.firstName ?? "Player")
    .replace(/\{T\}/g, team?.name ?? "Team")
    .replace(/\{Tc\}/g, team?.city ?? "the city")
    .replace(/\{Mgr\}/g, team?.managerName ?? "Coach")
    .replace(/\{Days\}/g, String(Days))
    .replace(/\{N\}/g, String(N));

  // Apply gameplay effect (lazy — no-op for "none").
  if (tpl.effect && tpl.effect.type !== "none" && player) {
    applyEffect(lg, d, player, tpl);
  }

  const id = `dr-${lg.day}-${lg.year}-${tpl.id}-${Math.floor(rnd() * 1e4)}`;
  const item: NewsItem = {
    id,
    day: lg.day,
    year: lg.year,
    category: "Drama",
    headline: fill(tpl.headline).slice(0, 140),
    body: tpl.body ? fill(tpl.body) : undefined,
    tickerText: fill(tpl.ticker).slice(0, 80),
    emoji: tpl.emoji,
    tone: tpl.tone,
    severity: tpl.severity,
    dramaCategory: tpl.category,
    teamIds: team ? [team.id] : undefined,
    playerIds: player ? [player.id] : undefined,
    important: tpl.severity === "major",
    gameEffect: tpl.effect,
    reactions: { likes: 0, laughs: 0, fire: 0, sad: 0, bullseye: 0 },
    source: "drama-template",
    memorable: tpl.memorableEligible && tpl.severity !== "minor",
  };

  if (item.memorable) d.memorableMoments.unshift(item);
  if (d.memorableMoments.length > 100) d.memorableMoments.length = 100;
  return item;
}

function pickBiasedPlayer(lg: League, rnd: () => number): Player | null {
  const active = lg.players.filter(p => p.teamId && !p.retired);
  if (active.length === 0) return null;

  // User team + their next opponent + rivals: 2x weight. Stars (overall >= 80): 1.5x weight.
  const userTeamId = lg.userTeamId;
  const userTeam = userTeamId ? lg.teams.find(t => t.id === userTeamId) : null;
  const nextOpp = userTeamId ? findNextOpponent(lg, userTeamId) : null;
  const rivalIds = new Set<string>(userTeam?.rivalIds ?? []);

  const weighted: Player[] = [];
  for (const p of active) {
    let weight = 1;
    if (p.teamId === userTeamId) weight *= 2;
    if (p.teamId === nextOpp) weight *= 2;
    if (p.teamId && rivalIds.has(p.teamId)) weight *= 1.5;
    if (p.overall >= 80) weight *= 1.5;
    // tiny boost for recent hot/cold to make narrative continuity feel real
    if (Math.abs(p.hot ?? 0) >= 6) weight *= 1.3;
    const w = Math.max(1, Math.round(weight));
    for (let i = 0; i < w; i++) weighted.push(p);
  }
  return weighted[Math.floor(rnd() * weighted.length)] ?? null;
}

function pickAnyPlayer(lg: League, rnd: () => number): Player | null {
  const active = lg.players.filter(p => p.teamId && !p.retired);
  if (active.length === 0) return null;
  return active[Math.floor(rnd() * active.length)] ?? null;
}

function pickBiasedTeam(lg: League, rnd: () => number) {
  const teams = lg.teams;
  if (teams.length === 0) return null;
  const userTeam = lg.userTeamId ? teams.find(t => t.id === lg.userTeamId) : null;
  const nextOpp = lg.userTeamId ? findNextOpponent(lg, lg.userTeamId) : null;
  const weighted = [] as typeof teams;
  for (const t of teams) {
    let w = 1;
    if (userTeam && t.id === userTeam.id) w *= 2;
    if (nextOpp && t.id === nextOpp) w *= 2;
    if (userTeam?.rivalIds?.includes(t.id)) w *= 1.5;
    const ww = Math.max(1, Math.round(w));
    for (let i = 0; i < ww; i++) weighted.push(t);
  }
  return weighted[Math.floor(rnd() * weighted.length)] ?? null;
}

function findNextOpponent(lg: League, userTeamId: string): string | null {
  for (const g of lg.schedule) {
    if (g.played) continue;
    if (g.day < lg.day) continue;
    if (g.homeId === userTeamId) return g.awayId;
    if (g.awayId === userTeamId) return g.homeId;
  }
  return null;
}

/** Mutate the player to apply the template's effect. Records the effect for later expiry. */
function applyEffect(lg: League, d: DramaState, player: Player, tpl: DramaTemplate) {
  if (!tpl.effect) return;
  const expiresDay = lg.day + Math.max(1, tpl.effect.duration);
  const eff: ActiveEffect = {
    id: `eff-${lg.day}-${tpl.id}-${player.id}`.slice(0, 80),
    playerId: player.id,
    type: tpl.effect.type === "injury" ? "injury" :
          tpl.effect.type.startsWith("morale") ? "morale" : "rating",
    delta: tpl.effect.type.endsWith("penalty") || tpl.effect.type === "injury"
           ? -Math.abs(tpl.effect.magnitude)
           : Math.abs(tpl.effect.magnitude),
    expiresDay,
    reason: tpl.headline.slice(0, 40),
  };
  d.activeEffects.push(eff);

  // Apply the immediate change.
  if (eff.type === "morale") {
    player.morale = clamp(0, 100, (player.morale ?? 50) + eff.delta);
  } else if (eff.type === "rating") {
    // Boost/penalty piggybacks on the existing "hot" streak modifier so the
    // sim already rewards/penalises it without needing new code paths.
    player.hot = clamp(-10, 10, (player.hot ?? 0) + Math.round(eff.delta / 2));
    player.hotStreakGames = Math.max(player.hotStreakGames ?? 0, tpl.effect.duration);
  } else if (eff.type === "injury") {
    if (!player.injury) {
      const days = tpl.effect.duration;
      const dl = days <= 3 ? "DTD" : days <= 12 ? "10-day" : days <= 30 ? "15-day" : days >= 90 ? "Season-Ending" : "60-day";
      player.injury = { name: tpl.headline.slice(0, 30), daysOut: days, dlType: dl as any };
    }
  }
}

/** Decrement durations and undo expired effects (only morale/rating — injuries auto-heal via sim). */
function reapExpiredEffects(lg: League, d: DramaState) {
  if (d.activeEffects.length === 0) return;
  const remaining: ActiveEffect[] = [];
  for (const eff of d.activeEffects) {
    if (lg.day < eff.expiresDay) {
      remaining.push(eff);
      continue;
    }
    const p = lg.players.find(pp => pp.id === eff.playerId);
    if (!p) continue;
    if (eff.type === "morale") {
      p.morale = clamp(0, 100, (p.morale ?? 50) - eff.delta);
    } else if (eff.type === "rating") {
      p.hot = clamp(-10, 10, (p.hot ?? 0) - Math.round(eff.delta / 2));
    }
    // injuries handled by the sim's normal daysOut decrement.
  }
  d.activeEffects = remaining;
}

function clamp(lo: number, hi: number, v: number) { return Math.max(lo, Math.min(hi, v)); }

/** If today is a real-world holiday, return a matching template id. */
function pickHoliday(): DramaTemplate | null {
  const now = new Date();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  const holidayMap: Record<string, string> = {
    "7-4": "hd01",
    "10-31": "hd02",
    "12-25": "hd03",
    "11-25": "hd04", "11-26": "hd04", "11-27": "hd04",
    "2-14": "hd05",
    "5-25": "hd06", "5-26": "hd06", "5-27": "hd06", "5-28": "hd06", "5-29": "hd06", "5-30": "hd06",
  };
  const id = holidayMap[`${mm}-${dd}`];
  if (!id) return null;
  return DRAMA_TEMPLATES.find(t => t.id === id) ?? null;
}

function pickHotTake(rnd: () => number): DramaTemplate | null {
  const hots = DRAMA_TEMPLATES.filter(t => t.category === "hot-take");
  return hots[Math.floor(rnd() * hots.length)] ?? null;
}

/** Ticker source — most recent dramatic items, plus a few standings/milestone flavored lines. */
export function buildTickerItems(lg: League): { id: string; emoji: string; text: string; category: string }[] {
  const items: { id: string; emoji: string; text: string; category: string }[] = [];

  // Active storylines first — these are "alive" content from the shared
  // /src/sports-engine module. Same source Football's ticker reads from.
  const drama = (lg as any).drama;
  if (drama?.storylines2?.active) {
    const top = drama.storylines2.active
      .slice()
      .sort((a: any, b: any) => b.intensity - a.intensity)
      .slice(0, 5);
    for (const s of top) {
      items.push({
        id: `ticker-${s.id}`,
        emoji: s.emoji ?? "📰",
        text: s.label + (s.intensity > 1 ? " " + "★".repeat(Math.min(3, s.intensity - 1)) : ""),
        category: "Storyline",
      });
    }
  }

  // Recent drama events (last 3 days) — preferred.
  const cutoff = lg.day - 3;
  const recent = lg.newsLog
    .filter(n => n.year === lg.year && n.day >= cutoff && (n.tickerText || n.headline))
    .slice(0, 12);
  for (const n of recent) {
    items.push({
      id: n.id,
      emoji: n.emoji ?? emojiForCategory(n.category, n.dramaCategory),
      text: n.tickerText ?? n.headline,
      category: n.dramaCategory ?? n.category,
    });
  }

  // Easter egg: after 10 PM local, occasionally remind the user to rest.
  const hour = new Date().getHours();
  if ((hour >= 22 || hour < 5) && Math.random() < 0.4) {
    items.push({
      id: "ticker-bedtime",
      emoji: "🌙",
      text: "Perhaps it's time to rest, traveller…",
      category: "Bedtime",
    });
  }

  // Standings line.
  const userTeam = lg.userTeamId ? lg.teams.find(t => t.id === lg.userTeamId) : null;
  if (userTeam) {
    items.push({
      id: "ticker-user-record",
      emoji: "📊",
      text: `${userTeam.name} ${userTeam.wins}-${userTeam.losses}`,
      category: "Standings",
    });
  }

  // Day flavor.
  items.push({
    id: "ticker-day",
    emoji: "📅",
    text: `Day ${lg.day} • ${lg.year} Season`,
    category: "Info",
  });

  // Welcome line if user has a profile.
  if (lg.gmProfile?.name) {
    items.push({
      id: "ticker-welcome",
      emoji: "👋",
      text: `Welcome back, ${lg.gmProfile.name}`,
      category: "Info",
    });
  }

  // Top performers — fastest 2 lookups.
  const stars = [...lg.players].filter(p => p.teamId && (p.hot ?? 0) >= 6).slice(0, 3);
  for (const s of stars) {
    items.push({
      id: `ticker-hot-${s.id}`,
      emoji: "🔥",
      text: `${s.name} red hot — riding a streak`,
      category: "Hot",
    });
  }

  return items.slice(0, 14);
}

function emojiForCategory(cat: string, drama?: string): string {
  if (drama) {
    const map: Record<string, string> = {
      injury: "🤕", funny: "😂", rumor: "💬", milestone: "🏆",
      drama: "🎭", personal: "👶", weather: "⛈️", lucky: "🍀",
      "cold-streak": "❄️", "hot-streak": "🔥", comeback: "🦅",
      "pop-culture": "🎬", holiday: "🎉", rivalry: "⚔️", "hot-take": "🎤",
    };
    return map[drama] ?? "📰";
  }
  if (cat === "Trade") return "🤝";
  if (cat === "Injury") return "🤕";
  if (cat === "Milestone") return "🏆";
  if (cat === "Game") return "⚾";
  return "📰";
}

/** React to a news item — adjusts the local reaction count. */
export function reactToEvent(lg: League, eventId: string, kind: keyof NonNullable<NewsItem["reactions"]>): void {
  const d = ensureDramaState(lg);
  const r = d.reactions[eventId] ?? { likes: 0, laughs: 0, fire: 0, sad: 0, bullseye: 0 };
  r[kind] = (r[kind] ?? 0) + 1;
  d.reactions[eventId] = r;

  // Mirror onto the news item itself for easy rendering.
  const n = lg.newsLog.find(x => x.id === eventId);
  if (n) {
    if (!n.reactions) n.reactions = { likes: 0, laughs: 0, fire: 0, sad: 0, bullseye: 0 };
    n.reactions[kind] = (n.reactions[kind] ?? 0) + 1;
  }
}

/** Mark a news item as memorable manually (user pin). */
export function pinAsMemorable(lg: League, eventId: string): void {
  const d = ensureDramaState(lg);
  const n = lg.newsLog.find(x => x.id === eventId);
  if (!n) return;
  n.memorable = true;
  if (!d.memorableMoments.find(m => m.id === n.id)) d.memorableMoments.unshift(n);
}
