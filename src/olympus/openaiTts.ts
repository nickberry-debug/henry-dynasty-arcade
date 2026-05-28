// Olympus narrator — OpenAI TTS path.
//
// (polish-pass) Defaults to the newer `gpt-4o-mini-tts` model when an
// OpenAI key is configured — it's noticeably more human than `tts-1`
// and supports a free-form `instructions` field for tone shaping.
// Falls back to `tts-1` if a key is set but the newer model rejects
// it (older billing tier, regional restriction, etc.). The OS Web
// Speech API still backstops everything when there's no key.
//
// Each scene's audio is synthesized once and cached in-memory as a
// Blob URL keyed by text hash, so re-playing the same scene (or
// re-mounting the page) doesn't burn a second API call.

const LS_KEY     = "dd_olympus_openai_tts_key";
const LS_VOICE   = "dd_olympus_openai_tts_voice";
const LS_SPEED   = "dd_olympus_openai_tts_speed";
const LS_MODEL   = "dd_arcade_tts_model";       // polish-pass
// Per-context tone instruction (only sent to gpt-4o-mini-tts).
const LS_TONE_OLYMPUS  = "dd_arcade_tts_tone_olympus";   // narrator
const LS_TONE_WORDPLAY = "dd_arcade_tts_tone_wordplay";  // quiz host
const LS_TONE_TWENTYQ  = "dd_arcade_tts_tone_twentyq";   // 20 Questions detective
const LS_TONE_DEFAULT  = "dd_arcade_tts_tone_default";   // generic

export const OPENAI_VOICES = [
  // gpt-4o-mini-tts voices (preferred):
  { id: "coral",   label: "Coral",   desc: "Warm female — friendly, well-liked default (gpt-4o-mini-tts)" },
  { id: "ballad",  label: "Ballad",  desc: "Soft male storyteller — unhurried, present (gpt-4o-mini-tts)" },
  { id: "sage",    label: "Sage",    desc: "Mid-pitch female — thoughtful, articulate (gpt-4o-mini-tts)" },
  { id: "verse",   label: "Verse",   desc: "Lyrical female — great for poetry & stories (gpt-4o-mini-tts)" },
  // tts-1 / tts-1-hd voices (also work with gpt-4o-mini-tts):
  { id: "onyx",    label: "Onyx",    desc: "Deep, grounded male — prior arcade default" },
  { id: "fable",   label: "Fable",   desc: "Warm British male narrator — storyteller vibe" },
  { id: "echo",    label: "Echo",    desc: "Mid-pitch male — neutral, clean" },
  { id: "alloy",   label: "Alloy",   desc: "Neutral, slightly androgynous" },
  { id: "nova",    label: "Nova",    desc: "Bright female — younger, energetic" },
  { id: "shimmer", label: "Shimmer", desc: "Soft female — gentle scenes" },
] as const;

export type OpenAIVoice = typeof OPENAI_VOICES[number]["id"];

export const OPENAI_TTS_MODELS = [
  { id: "gpt-4o-mini-tts", label: "GPT-4o mini TTS", desc: "Newest, most human, supports tone instructions. Default." },
  { id: "tts-1-hd",        label: "TTS-1 HD",        desc: "Higher fidelity than tts-1, slower (~3-5s). No tone instructions." },
  { id: "tts-1",           label: "TTS-1",           desc: "Original, fastest (~1-2s). Fallback when newer models are blocked." },
] as const;

export type OpenAIModel = typeof OPENAI_TTS_MODELS[number]["id"];

export type ToneContext = "olympus" | "wordplay" | "twentyq" | "default";

export const TONE_DEFAULTS: Record<ToneContext, string> = {
  olympus:  "Warm storyteller. Slightly dramatic. Gentle pacing. Let the silences breathe.",
  wordplay: "Friendly game show host. Energetic, clear enunciation. Smile in the voice.",
  twentyq:  "Curious detective. Thoughtful, slightly mischievous. Pause before each guess.",
  default:  "Warm, natural, conversational. Read like a person, not a robot.",
};

export function hasOpenAITtsKey(): boolean {
  return Boolean(getOpenAITtsKey());
}

export function getOpenAITtsKey(): string | null {
  // 1) Canonical arcade-wide OpenAI key (preferred, set from Landing).
  try {
    const a = localStorage.getItem("dd_openai_api_key");
    if (a && a.startsWith("sk-")) return a;
  } catch {}
  // 2) Legacy Olympus-only key.
  try {
    const k = localStorage.getItem(LS_KEY);
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  return null;
}

export function setOpenAITtsKey(key: string): void {
  try {
    if (key.startsWith("sk-")) localStorage.setItem(LS_KEY, key);
  } catch {}
}

export function clearOpenAITtsKey(): void {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

export function getOpenAIVoice(): OpenAIVoice {
  try {
    const v = localStorage.getItem(LS_VOICE) as OpenAIVoice | null;
    if (v && OPENAI_VOICES.some(x => x.id === v)) return v;
  } catch {}
  // (polish-pass) Default voice across the arcade — warm female, more
  // human-sounding than the prior `onyx`. Works on every model.
  return "coral";
}

export function setOpenAIVoice(voice: OpenAIVoice): void {
  try { localStorage.setItem(LS_VOICE, voice); } catch {}
}

export function getOpenAITtsSpeed(): number {
  try {
    const s = parseFloat(localStorage.getItem(LS_SPEED) ?? "");
    if (Number.isFinite(s) && s >= 0.25 && s <= 4) return s;
  } catch {}
  // (polish-pass) 1.0× — natural pace, not rushed. Was 1.1× which felt
  // slightly rushed against the warmer voices.
  return 1.0;
}

export function setOpenAITtsSpeed(speed: number): void {
  try { localStorage.setItem(LS_SPEED, String(speed)); } catch {}
}

// ─── Model preference (polish-pass) ──────────────────────
export function getOpenAITtsModel(): OpenAIModel {
  try {
    const m = localStorage.getItem(LS_MODEL) as OpenAIModel | null;
    if (m && OPENAI_TTS_MODELS.some(x => x.id === m)) return m;
  } catch {}
  return "gpt-4o-mini-tts";
}

export function setOpenAITtsModel(model: OpenAIModel): void {
  try { localStorage.setItem(LS_MODEL, model); } catch {}
}

// ─── Tone instructions (polish-pass) ─────────────────────
function toneStorageKey(ctx: ToneContext): string {
  return ctx === "olympus"  ? LS_TONE_OLYMPUS
       : ctx === "wordplay" ? LS_TONE_WORDPLAY
       : ctx === "twentyq"  ? LS_TONE_TWENTYQ
       : LS_TONE_DEFAULT;
}

export function getToneInstruction(ctx: ToneContext): string {
  try {
    const v = localStorage.getItem(toneStorageKey(ctx));
    if (typeof v === "string" && v.trim().length > 0) return v;
  } catch {}
  return TONE_DEFAULTS[ctx];
}

export function setToneInstruction(ctx: ToneContext, value: string): void {
  try { localStorage.setItem(toneStorageKey(ctx), value); } catch {}
}

// ─── Synthesis ───────────────────────────────────────────────────────

/** Tiny string hash. We just need a stable cache key per text+voice
 *  pair. Collisions across heroes/scenes are astronomically unlikely
 *  and would only cause a single wrong audio play. */
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Cache: textHash|voice|speed|model|toneHash → blob URL. */
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

// Track which models have been confirmed broken for this key so we don't
// keep retrying them (e.g. gpt-4o-mini-tts not enabled → fall back to
// tts-1 for the rest of the session).
const brokenModels = new Set<OpenAIModel>();

function cacheKey(text: string, voice: OpenAIVoice, speed: number, model: OpenAIModel, tone: string): string {
  return `${hash(text)}|${voice}|${speed.toFixed(2)}|${model}|${hash(tone)}`;
}

export interface SynthOptions {
  /** Override the user's saved model preference. */
  model?: OpenAIModel;
  /** Override the saved voice. */
  voice?: OpenAIVoice;
  /** Override the saved speed. */
  speed?: number;
  /** Tone-instruction context (defaults to "default"). Only sent on
   *  gpt-4o-mini-tts; ignored by tts-1 / tts-1-hd. */
  toneContext?: ToneContext;
  /** Override the tone instruction text directly. */
  toneInstruction?: string;
}

/** Synthesize a chunk of text and return a Blob URL ready for
 *  `new Audio(url)`. Defaults to `gpt-4o-mini-tts` (most human, supports
 *  tone instructions). Falls back to `tts-1` when the newer model is
 *  rejected for this key (recorded per-session in `brokenModels`). */
export async function synthesizeOpenAI(text: string, opts?: SynthOptions): Promise<string | null> {
  const key = getOpenAITtsKey();
  if (!key) return null;
  const voice = opts?.voice ?? getOpenAIVoice();
  const speed = opts?.speed ?? getOpenAITtsSpeed();
  let model = opts?.model ?? getOpenAITtsModel();
  if (brokenModels.has(model)) {
    // Slide down the preference ladder: 4o-mini-tts → tts-1-hd → tts-1.
    if (model === "gpt-4o-mini-tts") model = brokenModels.has("tts-1-hd") ? "tts-1" : "tts-1-hd";
    else if (model === "tts-1-hd")   model = "tts-1";
  }
  const ctx = opts?.toneContext ?? "default";
  const tone = opts?.toneInstruction ?? getToneInstruction(ctx);
  const ck = cacheKey(text, voice, speed, model, tone);
  const cached = cache.get(ck);
  if (cached) return cached;
  const pending = inFlight.get(ck);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const body: Record<string, unknown> = {
        model,
        voice,
        input: text,
        speed,
        response_format: "mp3",
      };
      // Tone instructions are only honoured by gpt-4o-mini-tts.
      if (model === "gpt-4o-mini-tts" && tone) body.instructions = tone;

      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[openai-tts] HTTP", res.status, "on model", model, errText);
        // 4xx on a newer model? Mark it broken and retry on tts-1 once.
        if (model !== "tts-1" && res.status >= 400 && res.status < 500) {
          brokenModels.add(model);
          // One retry on tts-1, same voice/speed.
          const retryRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({ model: "tts-1", voice, input: text, speed, response_format: "mp3" }),
          });
          if (retryRes.ok) {
            const blob = await retryRes.blob();
            const url = URL.createObjectURL(blob);
            cache.set(ck, url);
            return url;
          }
        }
        return null;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cache.set(ck, url);
      return url;
    } catch (err) {
      console.warn("[openai-tts] fetch failed", err);
      return null;
    } finally {
      inFlight.delete(ck);
    }
  })();
  inFlight.set(ck, promise as Promise<string>);
  return promise;
}

/** Pre-warm the audio for a scene without waiting on it. Fires off the
 *  network request so the audio is cached by the time the user taps
 *  play. Safe to call repeatedly — dedup'd via the in-flight map. */
export function prewarmOpenAI(text: string): void {
  synthesizeOpenAI(text).catch(() => {});
}

/** Split a long body into TTS-friendly chunks. Splits on paragraph
 *  breaks first (\n\n), then breaks any chunks that are still very long
 *  on sentence boundaries. Each chunk targets ~500 chars — small enough
 *  that OpenAI tts-1 returns in 1-2 seconds per chunk, so parallel
 *  synthesis of 3-4 chunks finishes well before a kid is done reading
 *  the first paragraph. */
export function splitForTTS(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= 600) { out.push(p); continue; }
    // Long paragraph — break on sentence boundaries.
    const sentences = p.match(/[^.!?]+[.!?]+(?:\s+|$)/g) ?? [p];
    let buf = "";
    for (const s of sentences) {
      if (buf.length + s.length > 500 && buf) { out.push(buf.trim()); buf = ""; }
      buf += s;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out.length ? out : [text];
}

/** Pre-warm every chunk of a scene in parallel. After this returns,
 *  each chunk is either cached or being fetched, and a subsequent
 *  synthesizeOpenAI() call for any chunk resolves from the cache. */
export function prewarmOpenAISequence(text: string): void {
  const chunks = splitForTTS(text);
  for (const c of chunks) synthesizeOpenAI(c).catch(() => {});
}

/** Read the cache directly. Used by the player to find out if a chunk
 *  is already available so it can start playback synchronously inside
 *  a user-gesture handler. */
export function getCachedOpenAIUrl(text: string, opts?: SynthOptions): string | null {
  const voice = opts?.voice ?? getOpenAIVoice();
  const speed = opts?.speed ?? getOpenAITtsSpeed();
  let model = opts?.model ?? getOpenAITtsModel();
  if (brokenModels.has(model)) {
    if (model === "gpt-4o-mini-tts") model = brokenModels.has("tts-1-hd") ? "tts-1" : "tts-1-hd";
    else if (model === "tts-1-hd")   model = "tts-1";
  }
  const ctx = opts?.toneContext ?? "default";
  const tone = opts?.toneInstruction ?? getToneInstruction(ctx);
  return cache.get(cacheKey(text, voice, speed, model, tone)) ?? null;
}

/** Drop all cached audio URLs. Called rarely — e.g. when the voice or
 *  speed changes so old cache entries become irrelevant. */
export function clearOpenAITtsCache(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}
