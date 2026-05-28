// Olympus narrator voice picker. The Web Speech API picks an awful default
// on most devices — usually a 2003-era robotic voice. This module hunts
// down the highest-quality voice the device has installed, with a
// kid-friendly default rate.

const LS_VOICE = "dd_olympus_tts_voice";
const LS_RATE = "dd_olympus_tts_rate";

/** Rank a voice 0-100 (higher = better). Heuristics tuned for iOS Safari,
 *  Chrome desktop, and Edge. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let score = 0;

  // Must be English to be useful for Henry.
  if (!lang.startsWith("en")) return -1;

  // Quality tier markers (Apple and Google use these in their naming).
  if (n.includes("premium")) score += 60;
  if (n.includes("enhanced")) score += 50;
  if (n.includes("neural")) score += 50;
  if (n.includes("studio")) score += 55;
  if (n.includes("natural")) score += 45;
  if (n.includes("(uk english female)") || n.includes("(us english female)")) score += 30;

  // Apple's modern voices (iOS 16+) — these sound human even without
  // explicit "Enhanced" suffix.
  const appleModern = ["ava", "zoe", "evan", "joelle", "noelle", "nora", "tom", "allison", "susan", "samantha (enhanced)"];
  if (appleModern.some(x => n.includes(x))) score += 35;

  // Google's TTS (Chrome) is consistently good.
  if (n.startsWith("google ")) score += 25;

  // Microsoft Neural voices (Edge).
  if (n.includes("microsoft") && n.includes("online")) score += 20;

  // US/GB English over other accents (Henry's primary listening locale).
  if (lang === "en-us") score += 10;
  else if (lang === "en-gb") score += 8;
  else if (lang === "en-au" || lang === "en-ca") score += 4;

  // Heavily penalize the legacy iOS Samantha (sounds robotic).
  if (n === "samantha") score -= 20;

  // Default voices marked by the OS are usually fine if nothing better
  // shows up.
  if (v.default) score += 3;

  return score;
}

/** Load voices, polling for up to 1.5s since Chrome populates the list
 *  asynchronously on first access. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    let voices = speechSynthesis.getVoices();
    if (voices.length) return resolve(voices);
    let elapsed = 0;
    const interval = setInterval(() => {
      voices = speechSynthesis.getVoices();
      elapsed += 100;
      if (voices.length || elapsed >= 1500) {
        clearInterval(interval);
        resolve(voices);
      }
    }, 100);
    // Belt-and-suspenders: 'voiceschanged' on Chrome.
    speechSynthesis.addEventListener("voiceschanged", () => {
      const vs = speechSynthesis.getVoices();
      if (vs.length) {
        clearInterval(interval);
        resolve(vs);
      }
    }, { once: true });
  });
}

/** Pick the best available narrator voice. Honors a user-selected voice
 *  from localStorage if it's still installed. */
export async function pickNarratorVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  if (!voices.length) return null;

  // Honor explicit user choice if it's still available.
  const saved = localStorage.getItem(LS_VOICE);
  if (saved) {
    const match = voices.find(v => v.voiceURI === saved);
    if (match) return match;
  }

  // Otherwise rank and pick the best English voice.
  const ranked = voices
    .map(v => ({ v, score: scoreVoice(v) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.v ?? voices[0];
}

export function setNarratorVoice(voiceURI: string | null): void {
  try {
    if (voiceURI) localStorage.setItem(LS_VOICE, voiceURI);
    else localStorage.removeItem(LS_VOICE);
  } catch { /* private mode etc. */ }
}

export function getNarratorRate(): number {
  const saved = parseFloat(localStorage.getItem(LS_RATE) ?? "");
  if (Number.isFinite(saved) && saved >= 0.5 && saved <= 2) return saved;
  // 1.35× — noticeably faster than the browser default. Brisk but
  // still intelligible across iOS, Chrome, and Edge voices.
  return 1.35;
}

export function setNarratorRate(rate: number): void {
  try { localStorage.setItem(LS_RATE, String(rate)); } catch {}
}

/** List English voices sorted best-first, for a settings picker. */
export async function listNarratorChoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await loadVoices();
  return voices
    .map(v => ({ v, score: scoreVoice(v) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.v);
}
