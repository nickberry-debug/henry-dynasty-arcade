// Arcade-wide API key management. ONE place to paste keys; every game
// reads from here. Keys live in localStorage on this device only —
// they never leave the browser except to call Anthropic/OpenAI.
//
// Back-compat: each game's old per-game key (dd_olympus_api_key,
// dd_mogul_api_key, dd_wordplay_api_key, dd_olympus_openai_tts_key)
// is still honored as a fallback so existing users don't lose their
// configuration on upgrade. New writes always go to the canonical
// keys below.

const ANTHROPIC_KEY = "dd_anthropic_api_key";
const OPENAI_KEY = "dd_openai_api_key";

// Legacy per-game key names — read-only fallbacks.
const LEGACY_ANTHROPIC = ["dd_olympus_api_key", "dd_mogul_api_key", "dd_wordplay_api_key"] as const;
const LEGACY_OPENAI = ["dd_olympus_openai_tts_key"] as const;

// ─── Anthropic (Claude) ──────────────────────────────────────

export function getAnthropicKey(): string | null {
  // 1) Canonical key.
  try {
    const k = localStorage.getItem(ANTHROPIC_KEY);
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  // 2) Build-time env (for Vercel project env).
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.startsWith("sk-")) return envKey;
  // 3) Legacy per-game keys.
  for (const k of LEGACY_ANTHROPIC) {
    try {
      const v = localStorage.getItem(k);
      if (v && v.startsWith("sk-")) return v;
    } catch {}
  }
  return null;
}

export function hasAnthropicKey(): boolean {
  return getAnthropicKey() !== null;
}

export function setAnthropicKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed.startsWith("sk-")) {
      localStorage.setItem(ANTHROPIC_KEY, trimmed);
      // Mirror to every legacy bucket so apps that still read direct
      // (before lazy-loading their modules) see it too.
      for (const k of LEGACY_ANTHROPIC) {
        try { localStorage.setItem(k, trimmed); } catch {}
      }
    } else {
      clearAnthropicKey();
    }
  } catch {}
}

export function clearAnthropicKey(): void {
  try {
    localStorage.removeItem(ANTHROPIC_KEY);
    for (const k of LEGACY_ANTHROPIC) {
      try { localStorage.removeItem(k); } catch {}
    }
  } catch {}
}

// ─── OpenAI (premium narrator TTS) ───────────────────────────

export function getOpenAIKey(): string | null {
  try {
    const k = localStorage.getItem(OPENAI_KEY);
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.startsWith("sk-")) return envKey;
  for (const k of LEGACY_OPENAI) {
    try {
      const v = localStorage.getItem(k);
      if (v && v.startsWith("sk-")) return v;
    } catch {}
  }
  return null;
}

export function hasOpenAIKey(): boolean {
  return getOpenAIKey() !== null;
}

export function setOpenAIKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed.startsWith("sk-")) {
      localStorage.setItem(OPENAI_KEY, trimmed);
      for (const k of LEGACY_OPENAI) {
        try { localStorage.setItem(k, trimmed); } catch {}
      }
    } else {
      clearOpenAIKey();
    }
  } catch {}
}

export function clearOpenAIKey(): void {
  try {
    localStorage.removeItem(OPENAI_KEY);
    for (const k of LEGACY_OPENAI) {
      try { localStorage.removeItem(k); } catch {}
    }
  } catch {}
}
