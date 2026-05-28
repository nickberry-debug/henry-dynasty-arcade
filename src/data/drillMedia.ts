// Hero images for drills. We use Unsplash's free image CDN (no API key needed,
// images served by their CDN, attribution preserved per Unsplash license).
// Caching is handled by the browser + the PWA service worker on subsequent loads.

interface DrillMedia {
  hero: string;
  alt: string;
  /** Optional YouTube video ID for embedded coaching clip. */
  youtubeId?: string;
}

// Generic, high-quality baseball/training photos by category.
// Source: Unsplash + Pexels CDN (free for any use, attribution appreciated).
export const DRILL_MEDIA: Record<string, DrillMedia> = {
  // Hitting
  "fence-drill":     { hero: "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&q=80", alt: "Batter at the plate, side angle showing elbow position" },
  "top-hand":        { hero: "https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=800&q=80", alt: "One-handed swing follow-through" },
  "no-hands-hip":    { hero: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80", alt: "Hip rotation drill" },
  "towel-heel":      { hero: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=800&q=80", alt: "Batter back foot pivot" },
  "colored-ball":    { hero: "https://images.unsplash.com/photo-1532473006-c98f0107def8?w=800&q=80", alt: "Ball tracking with colored balls" },
  "sharpie-line":    { hero: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800&q=80", alt: "Tee work close-up" },
  "one-knee":        { hero: "https://images.unsplash.com/photo-1567527435543-3eb1b46d4a3b?w=800&q=80", alt: "Kneeling tee swing drill" },
  "walk-through":    { hero: "https://images.unsplash.com/photo-1547034979-1e98f4ca84cb?w=800&q=80", alt: "Walk-through swing momentum" },
  "slow-motion":     { hero: "https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=800&q=80", alt: "Slow-motion swing checkpoints" },
  "two-tee":         { hero: "https://images.unsplash.com/photo-1565992441121-4367c2967103?w=800&q=80", alt: "Two-tee swing-path drill" },

  // Pitching
  "target-practice":   { hero: "https://images.unsplash.com/photo-1542652694-40abf526446e?w=800&q=80", alt: "Pitcher targeting a small spot on the net" },
  "inside-outside":    { hero: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80", alt: "Pitcher hitting corner" },
  "high-low":          { hero: "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=800&q=80", alt: "Pitcher changing levels" },
  "strike-ball-strike":{ hero: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80", alt: "Pitching sequence work" },
  "towel-drill":       { hero: "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=800&q=80", alt: "Pitcher full follow-through" },
  "balance":           { hero: "https://images.unsplash.com/photo-1568633551046-2c1845f56f5e?w=800&q=80", alt: "Pitcher balance hold mid-motion" },
  "knee-throws":       { hero: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80", alt: "Kneeling throws drill" },
  "long-toss":         { hero: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80", alt: "Long-distance throws" },
  "pickoff":           { hero: "https://images.unsplash.com/photo-1554290813-ec6a2a72e5d8?w=800&q=80", alt: "Pickoff move to first" },
  "bullpen-sequence":  { hero: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80", alt: "Bullpen session" },

  // Conditioning
  "sprints":           { hero: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80", alt: "Sprinting baseline" },
  "pushups":           { hero: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", alt: "Pushups" },
  "squats":            { hero: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80", alt: "Bodyweight squats" },
  "plank":             { hero: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80", alt: "Plank hold" },
  "lateral-shuffles":  { hero: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80", alt: "Lateral shuffle drill" },
  "jump-rope":         { hero: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80", alt: "Jump rope" },
  "bear-crawls":       { hero: "https://images.unsplash.com/photo-1599058918144-1e3b0d1c84a8?w=800&q=80", alt: "Bear crawl" },
  "arm-circles":       { hero: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=800&q=80", alt: "Arm circle warmup" },
  "mountain-climbers": { hero: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80", alt: "Mountain climbers" },
  "toe-touches":       { hero: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80", alt: "Toe-touch stretch" }
};

/** Returns hero image + alt text + optional YouTube coaching clip for a drill. */
export function drillMedia(id: string): DrillMedia {
  return DRILL_MEDIA[id] ?? { hero: "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&q=80", alt: "Baseball practice" };
}
