// Wordplay Hub — shared infrastructure.
// 13 sub-apps share an Anthropic API key (auto-falls back to Olympus
// or Mogul keys), localStorage-backed per-sub-app history, and a
// preferences object for voice + difficulty.

import { useEffect, useState } from "react";

const MODEL_FAST = "claude-haiku-4-5-20251001";
const MODEL_RICH = "claude-sonnet-4-5";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// ─── API key resolution (falls back through siblings) ────────

export function getApiKey(): string | null {
  // 1) Canonical arcade-wide key (preferred).
  try {
    const a = localStorage.getItem("dd_anthropic_api_key");
    if (a && a.startsWith("sk-")) return a;
  } catch {}
  // 2) Per-game override / legacy keys.
  for (const k of ["dd_wordplay_api_key", "dd_mogul_api_key", "dd_olympus_api_key"]) {
    try {
      const v = localStorage.getItem(k);
      if (v && v.startsWith("sk-")) return v;
    } catch {}
  }
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.startsWith("sk-")) return envKey;
  return null;
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

export function setApiKey(key: string): void {
  try {
    if (key.startsWith("sk-")) localStorage.setItem("dd_wordplay_api_key", key);
    else localStorage.removeItem("dd_wordplay_api_key");
  } catch {}
}

export function clearApiKey(): void {
  try { localStorage.removeItem("dd_wordplay_api_key"); } catch {}
}

// ─── Generic AI call ─────────────────────────────────────────

export async function callAI(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: "fast" | "rich";
}): Promise<string | null> {
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
        model: opts.model === "rich" ? MODEL_RICH : MODEL_FAST,
        max_tokens: opts.maxTokens ?? 600,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
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

export function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed) as T; } catch { return null; }
}

// ─── Preferences ─────────────────────────────────────────────

export interface WordplayPrefs {
  voiceInput: boolean;
  voiceOutput: boolean;
  voiceSpeed: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  showHints: boolean;
}

const DEFAULT_PREFS: WordplayPrefs = {
  voiceInput: true,
  voiceOutput: true,
  // Default speed across the arcade — natural narrator pace with a
  // touch of forward motion. Matches the OpenAI TTS default in
  // olympus/openaiTts.ts.
  voiceSpeed: 1.1,
  difficulty: "mixed",
  showHints: true,
};

export function loadPrefs(): WordplayPrefs {
  try {
    const raw = localStorage.getItem("dd_wordplay_prefs");
    if (raw) {
      const parsed = JSON.parse(raw);
      // One-time migration: previous build shipped 1.35 as the default
      // voice speed. New default is 1.1. Bump anyone still on the old
      // default forward; preserve custom speeds.
      if (parsed && parsed.voiceSpeed === 1.35) parsed.voiceSpeed = 1.1;
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {}
  return DEFAULT_PREFS;
}

export function savePrefs(p: Partial<WordplayPrefs>): WordplayPrefs {
  const cur = loadPrefs();
  const next = { ...cur, ...p };
  try { localStorage.setItem("dd_wordplay_prefs", JSON.stringify(next)); } catch {}
  return next;
}

export function usePrefs(): [WordplayPrefs, (next: Partial<WordplayPrefs>) => void] {
  const [prefs, setPrefs] = useState<WordplayPrefs>(loadPrefs());
  const update = (p: Partial<WordplayPrefs>) => setPrefs(savePrefs(p));
  return [prefs, update];
}

// ─── Per-sub-app history / favorites ─────────────────────────

/** Generic localStorage-backed history bucket. Each sub-app gets its
 *  own key. Items are appended; newest first; capped to keep storage
 *  tight. JSON-serializable shapes only. */
export function loadHistory<T>(bucket: string): T[] {
  try {
    const raw = localStorage.getItem(`dd_wp_${bucket}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveHistory<T>(bucket: string, items: T[], cap = 50): void {
  try {
    localStorage.setItem(`dd_wp_${bucket}`, JSON.stringify(items.slice(0, cap)));
  } catch {}
}

export function pushToHistory<T>(bucket: string, item: T, cap = 50): T[] {
  const cur = loadHistory<T>(bucket);
  const next = [item, ...cur].slice(0, cap);
  saveHistory(bucket, next, cap);
  return next;
}

export function useHistory<T>(bucket: string, cap = 50): [T[], (item: T) => void, (filter?: (t: T) => boolean) => void] {
  const [items, setItems] = useState<T[]>(loadHistory<T>(bucket));
  useEffect(() => { setItems(loadHistory<T>(bucket)); }, [bucket]);
  const add = (item: T) => setItems(pushToHistory<T>(bucket, item, cap));
  const clear = (filter?: (t: T) => boolean) => {
    const next = filter ? items.filter(t => !filter(t)) : [];
    saveHistory(bucket, next, cap);
    setItems(next);
  };
  return [items, add, clear];
}

// ─── High scores ─────────────────────────────────────────────

export function loadHighScore(bucket: string, key: string): number {
  try {
    const raw = localStorage.getItem(`dd_wp_hs_${bucket}`);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return Number(map[key] ?? 0) || 0;
  } catch { return 0; }
}

export function recordHighScore(bucket: string, key: string, score: number): boolean {
  try {
    const raw = localStorage.getItem(`dd_wp_hs_${bucket}`);
    const map = raw ? JSON.parse(raw) : {};
    const prev = Number(map[key] ?? 0) || 0;
    if (score > prev) {
      map[key] = score;
      localStorage.setItem(`dd_wp_hs_${bucket}`, JSON.stringify(map));
      return true;
    }
  } catch {}
  return false;
}
