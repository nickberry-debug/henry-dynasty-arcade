// Mogul AI client — calls Claude for dynamic news, critic reviews,
// premiere drama, commissioned scripts, and award speeches. Mirrors
// the Olympus pattern: stores its own key in localStorage so games
// don't share credentials, falls back to deterministic templates if
// no key is set or the network fails.

import type { Studio, NewsItem, Genre, ReleasedMovie, Script, Talent } from "./types";
import { uid } from "../utils/rand";

const MODEL_FAST = "claude-haiku-4-5-20251001";
const MODEL_RICH = "claude-sonnet-4-5";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function getApiKey(): string | null {
  // 1) Canonical arcade-wide key.
  try {
    const k = localStorage.getItem("dd_anthropic_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  // 2) Dedicated Mogul key (legacy per-game override).
  try {
    const k = localStorage.getItem("dd_mogul_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  // 2) Build-time env var (Vercel project env).
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.startsWith("sk-")) return envKey;
  // 3) Borrow Olympus key as a convenience — same person owns both.
  try {
    const k = localStorage.getItem("dd_olympus_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  return null;
}

export function mogulHasApiKey(): boolean {
  return getApiKey() !== null;
}

export function setMogulApiKey(key: string): void {
  try {
    if (key.startsWith("sk-")) localStorage.setItem("dd_mogul_api_key", key);
    else localStorage.removeItem("dd_mogul_api_key");
  } catch {}
}

export function clearMogulApiKey(): void {
  try { localStorage.removeItem("dd_mogul_api_key"); } catch {}
}

async function callClaude(systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number; model?: "fast" | "rich" }): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: opts?.model === "rich" ? MODEL_RICH : MODEL_FAST,
        max_tokens: opts?.maxTokens ?? 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed) as T; } catch { return null; }
}

// ─── Monthly industry news ────────────────────────────────────

/** Generate 1-3 dynamic news items based on current studio state. Used
 *  by the engine each month to colour the ticker. Falls back to null
 *  if no API key or the call fails — engine will lean on templates. */
export async function generateMonthlyNews(s: Studio): Promise<NewsItem[] | null> {
  if (!getApiKey()) return null;
  const userStudio = s.player.name;
  const rivalNames = s.rivals.slice(0, 5).map(r => r.name).join(", ");
  const recentReleases = s.releases.slice(0, 3).map(r => {
    const owner = r.studioId === s.player.id ? userStudio : s.rivals.find(rv => rv.id === r.studioId)?.name ?? "Indie";
    return `"${r.title}" (${owner}, $${r.totalBO.toFixed(0)}M)`;
  }).join("; ");
  const topActors = s.talent.filter(t => t.role === "actor" && t.star >= 4).slice(0, 4).map(t => t.name).join(", ");
  const phaseHint = s.year < 1970 ? "Studio system era" : s.year < 1990 ? "blockbuster age" : s.year < 2010 ? "franchise era" : "streaming age";

  const system = `You write punchy 8-15 word movie industry trade headlines in the style of Variety/Hollywood Reporter. Output ONLY valid JSON. No commentary, no markdown fences.`;
  const user = `Generate 2 fresh industry headlines for ${s.year} (${phaseHint}). Studios in play include: ${userStudio}, ${rivalNames}. Recent releases: ${recentReleases || "none yet"}. Notable stars: ${topActors || "none yet"}.

Return JSON: { "items": [{ "headline": "...", "category": "Box Office|Talent|Production|Award|Scandal|Info", "emoji": "🎬" }, ...] }

Keep it grounded in plausible 1970s-2020s Hollywood. No specific real living people, but the studios in the list are fair game. Each headline under 18 words.`;

  const raw = await callClaude(system, user, { maxTokens: 500 });
  const parsed = parseJSON<{ items: Array<{ headline: string; category: string; emoji?: string }> }>(raw);
  if (!parsed || !Array.isArray(parsed.items)) return null;
  const validCats = new Set(["Box Office", "Talent", "Production", "Award", "Scandal", "Info"]);
  return parsed.items
    .filter(it => it && typeof it.headline === "string" && it.headline.length > 5 && it.headline.length < 200)
    .slice(0, 3)
    .map(it => ({
      id: uid("nw"),
      year: s.year,
      month: s.month,
      category: (validCats.has(it.category) ? it.category : "Info") as NewsItem["category"],
      emoji: typeof it.emoji === "string" ? it.emoji.slice(0, 4) : "📰",
      headline: it.headline,
    }));
}

// ─── Critic reviews on release ────────────────────────────────

/** Generate one critic review for a fresh release. Returns the prose
 *  + a 0..100 score. Falls back to null on no-key/error so the engine
 *  uses its deterministic score path. */
export async function generateCriticReview(s: Studio, m: ReleasedMovie): Promise<{ critic: string; quote: string; score: number } | null> {
  if (!getApiKey()) return null;
  const owner = m.studioId === s.player.id ? s.player.name : s.rivals.find(r => r.id === m.studioId)?.name ?? "the studio";
  const star = m.starId ? s.talent.find(t => t.id === m.starId) ?? s.retiredTalent.find(t => t.id === m.starId) : null;
  const dir = m.directorId ? s.talent.find(t => t.id === m.directorId) ?? s.retiredTalent.find(t => t.id === m.directorId) : null;

  const system = `You write short film critic reviews — 1-2 sentences of punchy prose. Output ONLY JSON, no commentary or markdown.`;
  const user = `Review the new release "${m.title}" — a ${m.genre} film from ${owner}, released in ${m.releaseYear}.
- Director: ${dir?.name ?? "an unknown filmmaker"}
- Star: ${star?.name ?? "an ensemble cast"}
- True quality score: ${m.quality.toFixed(0)}/100 (you should reflect this in your verdict — higher = warmer take)
- Budget: $${m.budget.toFixed(0)}M

Return JSON: { "critic": "Critic Name (Outlet)", "quote": "1-2 sentence review under 35 words", "score": ${Math.round(m.quality * 0.9 + Math.random() * 15)} }

Make the critic name fictional. Vary outlets across calls — Variety, Hollywood Reporter, Sight & Sound, Empire, Cinephile Quarterly. Don't reference any real living person by name. Score: integer 10-99, weighted to true quality.`;
  const raw = await callClaude(system, user, { maxTokens: 350 });
  const parsed = parseJSON<{ critic: string; quote: string; score: number }>(raw);
  if (!parsed || !parsed.quote) return null;
  return {
    critic: typeof parsed.critic === "string" ? parsed.critic.slice(0, 80) : "Anonymous",
    quote: parsed.quote.slice(0, 280),
    score: Math.max(10, Math.min(99, Number(parsed.score) || Math.round(m.quality))),
  };
}

// ─── Commissioned scripts ────────────────────────────────────

/** Commission a fresh script. The user pays $X up-front and a few
 *  months later the script lands. AI generates title, premise, themes,
 *  and an initial scouted quality. Falls back to a procedural script
 *  if no API key. */
export async function generateCommissionedScript(s: Studio, opts: { brief?: string; genre?: Genre }): Promise<{ title: string; premise: string; trueQuality: 1 | 2 | 3 | 4 | 5 } | null> {
  if (!getApiKey()) return null;
  const era = s.year < 1970 ? "Golden Age (B&W, studio system)" : s.year < 1990 ? "blockbuster era (effects + tentpoles)" : s.year < 2010 ? "franchise era" : "streaming age";
  const system = `You're a Hollywood story editor. Output ONLY JSON.`;
  const user = `Pitch a feature-length screenplay concept for ${s.year} (${era}).
${opts.genre ? `Genre: ${opts.genre}` : "Genre: any commercially viable for the era"}
${opts.brief ? `Mogul's brief: ${opts.brief}` : ""}

Return JSON: { "title": "Movie Title", "premise": "1-2 sentence logline", "trueQuality": 3 }

Title: evocative, marquee-ready, 2-5 words. Premise: under 30 words, hook-first. trueQuality: integer 1-5 reflecting how strong this idea is on the page.`;
  const raw = await callClaude(system, user, { maxTokens: 250 });
  const parsed = parseJSON<{ title: string; premise: string; trueQuality: number }>(raw);
  if (!parsed || !parsed.title || !parsed.premise) return null;
  return {
    title: parsed.title.slice(0, 60),
    premise: parsed.premise.slice(0, 200),
    trueQuality: Math.max(1, Math.min(5, Math.round(Number(parsed.trueQuality) || 3))) as 1 | 2 | 3 | 4 | 5,
  };
}

// ─── Awards speech ───────────────────────────────────────────

/** Generate a 1-2 sentence acceptance speech for a Golden Reel win.
 *  Used to spice up the awards ceremony screen. */
export async function generateAcceptanceSpeech(category: string, winner: Talent | null, movieTitle: string): Promise<string | null> {
  if (!getApiKey()) return null;
  const who = winner ? `${winner.name}, a ${winner.age}-year-old ${winner.role}` : "the team behind " + movieTitle;
  const system = `You write short, heartfelt Golden Reel award acceptance speeches. 2 sentences max. Plain text only — no markdown.`;
  const user = `${who} just won ${category} for "${movieTitle}". Write a brief acceptance speech (2 sentences max, under 35 words). Vary tone — sometimes grateful, sometimes funny, sometimes humble.`;
  const raw = await callClaude(system, user, { maxTokens: 150 });
  if (!raw) return null;
  return raw.slice(0, 280);
}

// ─── Talent bio (lazy) ───────────────────────────────────────

/** Build a 1-2 sentence career bio for a talent. Called when the user
 *  taps to inspect a talent for the first time. */
export async function generateTalentBio(t: Talent): Promise<string | null> {
  if (!getApiKey()) return null;
  const tier = t.star >= 5 ? "an A-list legend" : t.star >= 4 ? "a marquee name" : t.star >= 3 ? "a working professional" : t.star >= 2 ? "an up-and-comer" : "a journeyman";
  const specialties = t.specialties.length > 0 ? `Strongest in ${t.specialties.join(" and ")}.` : "";
  const system = `Plain-text career bio for a fictional Hollywood talent. 1-2 sentences, under 40 words, no markdown.`;
  const user = `${t.name}, age ${t.age}, a ${t.role}. ${tier}. ${specialties} Career record: ${t.hits} hits, ${t.flops} flops. Bio:`;
  const raw = await callClaude(system, user, { maxTokens: 150 });
  if (!raw) return null;
  return raw.slice(0, 200);
}
