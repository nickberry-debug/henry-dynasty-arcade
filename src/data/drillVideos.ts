// Curated YouTube video IDs per drill, hand-picked from public youth-baseball
// coaching channels (USA Baseball, Pitch Smart, Driveline, Coach Justin Stone,
// 5 Tool Baseball, etc.). All embeds are linked, not downloaded — YouTube's
// terms of service allow embedding.
//
// If a video gets taken down, the drill card falls back to the SVG hero art.

export interface DrillVideo {
  /** YouTube video ID (the v= parameter). */
  id: string;
  /** Short attribution shown under the embed. */
  channel: string;
  /** Optional start time in seconds. */
  start?: number;
}

export const DRILL_VIDEOS: Record<string, DrillVideo> = {
  // ── HITTING ───────────────────────────────────────────────────────────
  "fence-drill":    { id: "MwxFy7T4WI8", channel: "Antonelli Baseball" },
  "top-hand":       { id: "ej1RinUYzVo", channel: "Antonelli Baseball" },
  "no-hands-hip":   { id: "9I3SfNvX9YY", channel: "Coach Justin Stone" },
  "towel-heel":     { id: "1XbW6PEW9TE", channel: "Coach Justin Stone" },
  "colored-ball":   { id: "WghJgnQy3-0", channel: "Antonelli Baseball" },
  "sharpie-line":   { id: "fpJSEhcfFRA", channel: "Coach Justin Stone" },
  "one-knee":       { id: "Ho3RJWdW-S0", channel: "Antonelli Baseball" },
  "walk-through":   { id: "k7AcZE0X9zE", channel: "Antonelli Baseball" },
  "slow-motion":    { id: "Y5IH4G0lAks", channel: "Coach Justin Stone" },
  "two-tee":        { id: "JxxN73D6L_M", channel: "Antonelli Baseball" },

  // ── PITCHING ──────────────────────────────────────────────────────────
  "target-practice":   { id: "G0bM4OQ_e7w", channel: "USA Baseball" },
  "inside-outside":    { id: "Cf6_-VFD0sQ", channel: "Pitch Smart" },
  "high-low":          { id: "1uK-pYTBC1Y", channel: "Pitch Smart" },
  "strike-ball-strike":{ id: "G0bM4OQ_e7w", channel: "USA Baseball" },
  "towel-drill":       { id: "WUKSb-bGmHs", channel: "USA Baseball" },
  "balance":           { id: "8nKMLpDFb14", channel: "USA Baseball" },
  "knee-throws":       { id: "k4iVl7vqgTU", channel: "USA Baseball" },
  "long-toss":         { id: "yJBgLPgK1WQ", channel: "Driveline Baseball" },
  "pickoff":           { id: "JK1qPZbXMfQ", channel: "USA Baseball" },
  "bullpen-sequence":  { id: "GIwn82HEDtA", channel: "USA Baseball" },

  // ── CONDITIONING ──────────────────────────────────────────────────────
  "sprints":           { id: "6kALjVjOMlc", channel: "Athlean-X" },
  "pushups":           { id: "WDIpL0pjun0", channel: "Calisthenicmovement" },
  "squats":            { id: "aclHkVaku9U", channel: "Bowflex" },
  "plank":             { id: "ASdvN_XEl_c", channel: "Athlean-X" },
  "lateral-shuffles":  { id: "OoO9hRu5fbI", channel: "Performance U" },
  "jump-rope":         { id: "1BZM2Vre5oc", channel: "Crossrope" },
  "bear-crawls":       { id: "ZE9pYU2yzNk", channel: "Athlean-X" },
  "arm-circles":       { id: "vbB4LiJM_lQ", channel: "ProMotion Healthcare" },
  "mountain-climbers": { id: "wQq3ybaLZeA", channel: "Athlean-X" },
  "toe-touches":       { id: "_huQexF7CQs", channel: "Pamela Reif" },
};

export function videoForDrill(drillId: string): DrillVideo | undefined {
  return DRILL_VIDEOS[drillId];
}
