// Temporal Order — AI generators for mission variations, NPC dialogue,
// and timeline ripples. Sonnet for the heavyweight one-shot generators,
// Haiku for the frequent NPC chatter. Falls back to hand-written
// templates when no key is configured.

import { getAnthropicKey } from "../arcade/keys";
import type { MissionVariation, MissionTemplate, Era } from "./types";
import { fallbackVariation, fallbackNpcLine, fallbackRipple } from "./data/templates";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL_FAST = "claude-haiku-4-5-20251001";
const MODEL_RICH = "claude-sonnet-4-5";

async function call(opts: { system: string; user: string; rich?: boolean; maxTokens?: number }): Promise<string | null> {
  const key = getAnthropicKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
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
        model: opts.rich ? MODEL_RICH : MODEL_FAST,
        max_tokens: opts.maxTokens ?? 1500,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn("[temporal-ai]", res.status, await res.text().catch(() => ""));
      return null;
    }
    const j = await res.json();
    return typeof j?.content?.[0]?.text === "string" ? j.content[0].text.trim() : null;
  } catch (err) {
    console.warn("[temporal-ai] fetch failed", err);
    return null;
  } finally { clearTimeout(timer); }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed) as T; } catch (e) {
    // Try to find JSON within the response
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]) as T; } catch {} }
    return null;
  }
}

// ─── Mission variation generator ────────────────────────────

export async function generateMissionVariation(args: {
  template: MissionTemplate;
  era: Era;
  history: string;     // brief description of player's previous choices
}): Promise<MissionVariation> {
  const system = `You generate scenarios for a kid-friendly (G/PG-rated, age 8-13) historical time-travel adventure game. Each scenario must be:
- Historically grounded but with creative liberty.
- Educational — players should learn something real.
- Non-violent. No deaths depicted. Kidnappings, schemes, hiding, deception are all fine. No gore, no profanity, no romance.
- Specific. Use real historical names and places. Cite small concrete details.
- Output ONLY valid JSON. No prose around it, no markdown fences.`;

  const user = `Mission template: "${args.template.title}"
Premise: ${args.template.premise}
Era: ${args.era.name} (${args.era.year})
Era context: ${args.era.aiContext}
Historical figures available: ${args.template.figures.join(", ")}
Player's previous choices in this era: ${args.history || "(first visit)"}

Generate a UNIQUE variation. The anomaly must feel fresh on re-play — change the culprit, motive, and clue locations from any obvious default.

Return JSON exactly matching this schema:
{
  "anomaly": "<one sentence description of what's wrong with history>",
  "trueCause": "<the truth behind the anomaly, 1-2 sentences>",
  "perpetrator": { "name": "<who caused it, can be one of the figures or a new NPC>", "motive": "<why>" },
  "clues": [
    { "id": 1, "description": "<what the clue reveals>", "location": "<where it lives>", "foundVia": "<how the player finds it>" },
    { "id": 2, ... },
    ... 4-6 clues total
  ],
  "suspects": [
    { "name": "<figure>", "motive": "<why they look suspicious>", "isCulprit": true/false },
    ... 3-4 suspects, exactly one with isCulprit: true matching the perpetrator
  ],
  "resolutions": [
    { "id": 1, "description": "<what the player does>", "consequence": "<the immediate outcome>", "integrityDelta": <-10..+10> },
    ... 3 resolutions, escalating in cleverness from quick fix to ideal outcome
  ],
  "incidents": [
    { "trigger": "<when this fires>", "event": "<what happens>", "consequence": "<the effect>" },
    ... 2-3 minor side incidents
  ]
}`;

  const raw = await call({ system, user, rich: true, maxTokens: 2400 });
  const parsed = parseJson<Omit<MissionVariation, "templateId">>(raw);
  if (parsed && parsed.anomaly && Array.isArray(parsed.clues) && parsed.clues.length >= 3) {
    return { templateId: args.template.id, ...parsed };
  }
  // Fallback
  const fb = fallbackVariation(args.template.id);
  if (fb) return fb;
  // Absolute last-resort minimal scaffolding
  return {
    templateId: args.template.id,
    anomaly: args.template.premise,
    trueCause: "An unknown actor disturbed history.",
    perpetrator: { name: args.template.figures[0] ?? "Unknown", motive: "Unknown" },
    clues: [{ id: 1, description: "A strange detail.", location: "the era", foundVia: "investigation" }],
    suspects: args.template.figures.slice(0, 3).map((n, i) => ({ name: n, motive: "Unclear", isCulprit: i === 0 })),
    resolutions: [
      { id: 1, description: "Restore the timeline.", consequence: "History continues.", integrityDelta: 5 },
    ],
    incidents: [],
  };
}

// ─── NPC dialogue ───────────────────────────────────────────

export async function generateNpcLine(args: {
  npcName: string;
  era: Era;
  playerInput: string;
  missionContext: string;
  recentLines: Array<{ speaker: string; text: string }>;
  isCulprit?: boolean;
}): Promise<string> {
  const system = `You voice historical figures and bystanders in a kid-friendly (G/PG) time-travel adventure. Stay completely in character. Era-appropriate but accessible English. 1-3 sentences. Plain output only, no quotation marks, no "I say:" prefix, no stage directions. No profanity, no real-world political commentary. Hint at secrets only if the player has asked the right way.`;

  const history = args.recentLines.slice(-6).map(l => `${l.speaker}: ${l.text}`).join("\n");
  const user = `You are ${args.npcName}, in ${args.era.year} ${args.era.name}.
Era context: ${args.era.aiContext}
Mission context: ${args.missionContext}
${args.isCulprit ? "PRIVATELY YOU ARE THE CULPRIT — you can deflect, lie about details, but stay civil. Do not confess unless directly cornered with evidence." : ""}

Recent conversation:
${history || "(no prior exchange)"}

The player just said: "${args.playerInput}"

Respond in character.`;

  const raw = await call({ system, user, rich: false, maxTokens: 300 });
  if (raw && raw.length > 5 && raw.length < 600) return raw;
  return fallbackNpcLine(args.npcName, args.playerInput);
}

// ─── Timeline ripple ────────────────────────────────────────

export async function generateRipple(args: {
  era: Era;
  resolutionDescription: string;
  integrityAfter: number;
}): Promise<{ primary: string; secondary: string }> {
  const system = `You write timeline-ripple consequences for a kid-friendly time-travel adventure. Each ripple must:
- Be specific (cite real historical figures or events).
- Be educational (the player learns a real connection).
- Be creative (not predictable).
- Be appropriate (no dark, violent, or grim outcomes).
- 40-90 words per paragraph.
Output ONLY JSON, no prose around it.`;

  const user = `Era: ${args.era.name} (${args.era.year})
Era context: ${args.era.aiContext}
Player's resolution: ${args.resolutionDescription}
Timeline integrity now: ${args.integrityAfter}/100

Write the ripple effect — one primary (immediate decade), one secondary (long-term, centuries later).

Return JSON:
{ "primary": "<paragraph>", "secondary": "<paragraph>" }`;

  const raw = await call({ system, user, rich: true, maxTokens: 600 });
  const parsed = parseJson<{ primary: string; secondary: string }>(raw);
  if (parsed && parsed.primary && parsed.secondary) return parsed;
  return fallbackRipple();
}
