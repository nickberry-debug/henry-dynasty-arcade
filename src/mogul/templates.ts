// Movie Mogul — template bank for news headlines and random events.
// The AI integration (Phase 9) will pull from these as fallbacks when
// no API key is configured.

import type { NewsItem } from "./types";

export interface EventTemplate {
  category: NewsItem["category"];
  emoji?: string;
  important?: boolean;
  /** Template with {actor}/{director}/{studio}/{rival}/{yourMovie} tokens. */
  headline: string;
  /** Side-effect hook applied by engine: scandal cuts star's "hot",
   *  hotStreak boosts it. Pure-news templates use undefined. */
  effect?: "scandal" | "hotStreak" | "injury" | "delay";
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  // SCANDAL
  { category: "Scandal", emoji: "🚨", headline: "{actor} caught in tabloid scandal — agents scramble.", important: true, effect: "scandal" },
  { category: "Scandal", emoji: "🚨", headline: "Director {director} walks off competing studio's set after creative clash.", effect: "scandal" },
  { category: "Scandal", emoji: "📰", headline: "{actor}'s on-set behaviour leaks; fans split.", effect: "scandal" },
  { category: "Scandal", emoji: "💼", headline: "{rival} fires producer mid-shoot; production reshuffled.", important: true },
  // HOT STREAK / WIN
  { category: "Talent", emoji: "🔥", headline: "{actor} is red-hot — three projects in three studios bidding.", effect: "hotStreak" },
  { category: "Talent", emoji: "✨", headline: "{director}'s indie short wins Sundance buzz." },
  { category: "Talent", emoji: "🌟", headline: "{actor} lands cover of every magazine after surprise hit." , effect: "hotStreak" },
  // RIVAL ACTIVITY
  { category: "Production", emoji: "🎬", headline: "{rival} announces blockbuster franchise expansion — multi-year slate revealed.", important: true },
  { category: "Production", emoji: "📺", headline: "{rival} signs TV deal for streaming rights of last year's hits." },
  { category: "Production", emoji: "🎥", headline: "{rival} breaks ground on a new soundstage complex." },
  // INDUSTRY DRAMA
  { category: "Production", emoji: "⏱️", headline: "Writers' guild rumblings — contract talks heat up across the industry.", effect: "delay" },
  { category: "Production", emoji: "🌧️", headline: "Severe weather shuts down West Coast productions for a week.", effect: "delay" },
  { category: "Talent", emoji: "🤕", headline: "{actor} suffers minor on-set injury; takes two weeks off.", effect: "injury" },
  // YOUR STUDIO
  { category: "Production", emoji: "🎯", headline: "{studio} scouts return from festival circuit with three promising spec scripts." },
  { category: "Info",       emoji: "📈", headline: "{studio}'s name buzzing in trade press — analysts watching the slate." },
  { category: "Info",       emoji: "💎", headline: "Boutique press runs a glowing profile on {studio}'s mogul." },
  // BOX OFFICE
  { category: "Box Office", emoji: "💰", headline: "Weekend totals up across the board — audience hungry for new releases." },
  { category: "Box Office", emoji: "📊", headline: "Analyst projects strong holiday corridor — release date competition heating up.", important: true },
];

/** Plain industry-news headlines (no effect). The engine sprinkles
 *  these during quiet weeks. */
export const NEWS_TEMPLATES: string[] = [
  "{studio} eyeing expansion into international markets.",
  "{rival} dives into horror — first slate announced.",
  "Industry pundits debate whether the blockbuster era is fading.",
  "Talent agencies report record packaging fees this quarter.",
  "{actor} reportedly turned down $10M to remain on a passion project.",
  "Aspiring directors flood the festival circuit looking for studio deals.",
];

/** Fill a template by replacing {token} with values from the context. */
export function fillTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}
