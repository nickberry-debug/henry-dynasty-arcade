// Drama AI — optional Claude-powered drama events. Run async, never blocks.
// Returns generated NewsItems that the caller pushes to lg.newsLog.
//
// Safe to call without a key — returns []. Failed network calls return [].
// Heavily cached so we don't burn tokens on rapid mutations.
import type { League, NewsItem } from "../store/types";
import type { DramaCategory } from "../data/dramaTemplates";

const MODEL = "claude-haiku-4-5-20251001";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

interface AIDramaEvent {
  headline: string;
  tickerText: string;
  body: string;
  category: DramaCategory;
  severity: "minor" | "moderate" | "major";
  involvedTeamId?: string;
  involvedPlayerIds?: string[];
  gameEffect?: { type: string; duration: number; magnitude: number; attribute?: string };
  emoji: string;
  tone: "playful" | "dramatic" | "serious" | "absurd";
}

const cache = new Map<string, NewsItem[]>();

function apiKey(lg: League): string | null {
  const trainingKey = lg.training?.settings?.anthropicApiKey;
  if (trainingKey && trainingKey.startsWith("sk-")) return trainingKey;
  // env at build-time
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (envKey && envKey.startsWith("sk-")) return envKey;
  return null;
}

/** Compose a context block summarising the league for the prompt. */
function leagueContext(lg: League): string {
  const userTeam = lg.userTeamId ? lg.teams.find(t => t.id === lg.userTeamId) : null;
  const teams = [...lg.teams].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  const top3 = teams.slice(0, 3).map(t => `${t.name} ${t.wins}-${t.losses}`).join(", ");
  const bot3 = teams.slice(-3).map(t => `${t.name} ${t.wins}-${t.losses}`).join(", ");
  const hot = lg.players.filter(p => (p.hot ?? 0) >= 7).slice(0, 5).map(p => p.name).join(", ");
  const cold = lg.players.filter(p => (p.hot ?? 0) <= -7).slice(0, 5).map(p => p.name).join(", ");
  const recentHeads = lg.newsLog.slice(0, 4).map(n => `- ${n.headline}`).join("\n");
  return [
    `Day ${lg.day} of season ${lg.year}.`,
    `User's team: ${userTeam?.name ?? "none"}.`,
    `Top teams: ${top3 || "n/a"}.`,
    `Bottom teams: ${bot3 || "n/a"}.`,
    `Players on fire: ${hot || "—"}.`,
    `Players in slumps: ${cold || "—"}.`,
    `Recent headlines:\n${recentHeads || "(none)"}`,
  ].join("\n");
}

/** Call Claude. Returns array of structured drama events, or [] on any failure. */
export async function generateAIDrama(lg: League, count = 2): Promise<NewsItem[]> {
  const key = apiKey(lg);
  if (!key) return [];

  const cacheKey = `${lg.id}-${lg.year}-${lg.day}-${count}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const userTeam = lg.userTeamId ? lg.teams.find(t => t.id === lg.userTeamId) : null;
  const allTeamSummaries = lg.teams.slice(0, 20).map(t => `${t.id}|${t.name}|${t.city}`).join(";");
  const samplePlayers = lg.players
    .filter(p => p.teamId && !p.retired)
    .slice(0, 30)
    .map(p => `${p.id}|${p.name}|${p.teamId}`).join(";");

  const prompt = `You are the sports drama writer for a fictional youth-friendly baseball league.

LEAGUE CONTEXT:
${leagueContext(lg)}
User's team id: ${userTeam?.id ?? "none"}.

TEAMS (id|name|city; up to 20): ${allTeamSummaries}
PLAYERS (id|name|teamId; sample): ${samplePlayers}

Generate ${count} short baseball-news events for today. Mix funny, absurd, dramatic, injuries, hot/cold streaks, personal moments. Bias toward the user's team and their division opponents.

Each event MUST be a JSON object with these exact fields:
{
  "headline": "ESPN-style headline under 80 chars",
  "tickerText": "short ticker line under 50 chars",
  "body": "1-2 sentence story",
  "category": "injury" | "funny" | "rumor" | "milestone" | "drama" | "personal" | "weather" | "lucky" | "cold-streak" | "hot-streak" | "comeback" | "pop-culture" | "rivalry",
  "severity": "minor" | "moderate" | "major",
  "involvedTeamId": "<team id from list above, or empty string>",
  "involvedPlayerIds": ["<player id from list, or empty>"],
  "gameEffect": { "type": "injury" | "rating-boost" | "rating-penalty" | "morale-boost" | "morale-penalty" | "none", "duration": <0-30 days>, "magnitude": <1-10>, "attribute": "" },
  "emoji": "<single emoji>",
  "tone": "playful" | "dramatic" | "serious" | "absurd"
}

RULES:
- Be kid-friendly. No alcohol, drugs, sexual content, profanity.
- No real-world athlete names.
- Be creative and weird. Real baseball is hilarious.
- Return ONLY a JSON array of ${count} events. No commentary, no markdown fences.`;

  // Cap drama API calls at 30s so a stuck fetch doesn't leave the sim
  // hanging forever. Drama is non-critical and falls back to templates.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timer);
    cache.set(cacheKey, []);
    return [];
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    cache.set(cacheKey, []);
    return [];
  }
  let raw: string;
  try {
    const j = await res.json();
    raw = j?.content?.[0]?.text ?? "";
  } catch {
    cache.set(cacheKey, []);
    return [];
  }
  // Try parse — strip markdown fences if present.
  const jsonText = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  let parsed: AIDramaEvent[] = [];
  try {
    parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) parsed = [parsed as any];
  } catch {
    cache.set(cacheKey, []);
    return [];
  }

  const out: NewsItem[] = parsed.slice(0, count).map((ev, i) => ({
    id: `dr-ai-${lg.day}-${lg.year}-${i}-${Math.floor(Math.random() * 1e4)}`,
    day: lg.day,
    year: lg.year,
    category: "Drama" as const,
    headline: (ev.headline ?? "").slice(0, 140),
    body: ev.body,
    tickerText: (ev.tickerText ?? ev.headline ?? "").slice(0, 80),
    emoji: ev.emoji ?? "📰",
    tone: ev.tone ?? "playful",
    severity: ev.severity ?? "minor",
    dramaCategory: (ev.category as any) ?? "funny",
    teamIds: ev.involvedTeamId ? [ev.involvedTeamId] : undefined,
    playerIds: ev.involvedPlayerIds && ev.involvedPlayerIds.length > 0 ? ev.involvedPlayerIds : undefined,
    important: ev.severity === "major",
    gameEffect: ev.gameEffect && ev.gameEffect.type !== "none" ? {
      type: ev.gameEffect.type as any,
      duration: ev.gameEffect.duration ?? 1,
      magnitude: ev.gameEffect.magnitude ?? 3,
      attribute: ev.gameEffect.attribute,
    } : undefined,
    reactions: { likes: 0, laughs: 0, fire: 0, sad: 0, bullseye: 0 },
    source: "drama-ai" as const,
    memorable: ev.severity === "major",
  }));

  cache.set(cacheKey, out);
  return out;
}
