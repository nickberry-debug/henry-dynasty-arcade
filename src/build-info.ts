// Build metadata — version + build timestamp, injected at build time
// by Vite (see `define` block in vite.config.ts). Single source of truth
// for the version displayed in the UI footer + the "what's new" key.

declare const __APP_VERSION__: string;
declare const __BUILT_AT__: string;

export const BUILD_VERSION: string = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-dev";
export const BUILT_AT_ISO: string = typeof __BUILT_AT__ !== "undefined" ? __BUILT_AT__ : new Date().toISOString();

/** Human-readable build date, "May 31, 2026 · 4:32 PM" in local time. */
export function formatBuildDate(iso = BUILT_AT_ISO): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time}`;
  } catch {
    return iso;
  }
}
