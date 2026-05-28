// AI-driven Coach Billy commentary using Claude (Anthropic API).
// When a user has provided an Anthropic API key in their training settings,
// each pitch / swing fires a request to Claude haiku for a personalized,
// specific coaching sentence. Falls back to a deterministic local line if
// no key is set or the API call fails.

interface PitchContext {
  pitchType: string;
  zoneCol: number; // 0..2 strike zone column (or -1 if outside)
  zoneRow: number; // 0..2 strike zone row
  inZone: boolean;
  heat: number; // 0..1 batter's heat in that zone
  result: "strike" | "painted" | "close" | "ball";
  batterContact: number; // 30..99
  batterPower: number;
  pitcherFocus: string[]; // e.g. ["elbow-up", "back-foot pivot"]
  recentResults: Array<"strike" | "painted" | "close" | "ball" | "whiff" | "hit" | "hr">;
  outcomeText: string; // what just happened, e.g. "Painted! Called strike"
  henryName: string;
}

interface SwingContext {
  netX: number;
  netY: number;
  zoneCol: number;
  zoneRow: number;
  heat: number;
  quality: "crushed" | "okay" | "weak" | "whiff";
  pitcherVelo: number;
  pitcherControl: number;
  pitchType?: string;
  recentSwings: Array<"crushed" | "okay" | "weak" | "whiff">;
  outcomeText: string;
  henryName: string;
}

/** Local deterministic fallback when no API key — still specific to the pitch context. */
function localPitchingLine(c: PitchContext): string {
  if (c.result === "ball") {
    if (c.recentResults.slice(-3).every(r => r === "ball")) return "That's three off the plate in a row — slow down and find your release.";
    return "Off the plate — reset your feet, breathe, hit your target.";
  }
  if (c.result === "close") return "Just off the edge. Bring that one in a hair.";
  if (c.result === "painted") {
    const where = ["low and away", "high and inside", "down and in", "up and away"][((c.zoneCol + c.zoneRow * 2) | 0) % 4];
    return `Painted ${where} on a ${c.pitchType.toLowerCase()} — filthy! Coach Billy loved that location.`;
  }
  // Plain strike inside
  const zoneLabel = c.zoneRow === 0 ? "up" : c.zoneRow === 2 ? "down" : "belt-high";
  const sideLabel = c.zoneCol === 0 ? "in" : c.zoneCol === 2 ? "away" : "middle";
  if (c.heat > 0.7) return `Strike — but that's a HOT zone for this batter. Move it ${sideLabel === "middle" ? "off the plate" : "to a colder spot"}.`;
  if (c.heat < 0.3) return `Strike in his cold zone — he hates ${sideLabel === "middle" ? "middle pitches" : `the ${sideLabel} side`}. Keep working there.`;
  return `Strike ${zoneLabel} and ${sideLabel}. Solid execution on a ${c.pitchType.toLowerCase()}.`;
}

function localHittingLine(c: SwingContext): string {
  if (c.quality === "whiff") {
    if (c.recentSwings.slice(-3).every(r => r === "whiff")) return "Three whiffs in a row — back off the plate a step and shorten your swing.";
    return "Stay back. Let it travel. Eyes through contact.";
  }
  if (c.quality === "crushed") {
    if (c.netY < 0.4) return "💥 Barrel up — that's a fly ball with carry. Keep that swing path level next time.";
    return "Crushed line drive — perfect contact zone. That's the swing right there.";
  }
  if (c.quality === "weak") {
    if (c.netY > 0.7) return "Rolled over. You're casting your hands — Top Hand Drill tonight.";
    return "Got under it. Stay through the ball — Fence Drill will lock that swing path in.";
  }
  return "Solid contact. Find the barrel and you'll be in business.";
}

const PITCH_CACHE = new Map<string, Promise<string | null>>();
const SWING_CACHE = new Map<string, Promise<string | null>>();

export async function getPitchingFeedback(c: PitchContext, apiKey?: string): Promise<string> {
  const fallback = localPitchingLine(c);
  if (!apiKey) return fallback;
  const key = `${c.pitchType}-${c.zoneCol}-${c.zoneRow}-${c.result}-${c.inZone}-${Math.round(c.heat * 10)}-${c.recentResults.slice(-3).join("")}`;
  if (PITCH_CACHE.has(key)) {
    const cached = await PITCH_CACHE.get(key)!;
    return cached ?? fallback;
  }
  const promise = fetchPitchingFromClaude(c, apiKey);
  PITCH_CACHE.set(key, promise);
  const aiLine = await promise;
  return aiLine ?? fallback;
}

export async function getHittingFeedback(c: SwingContext, apiKey?: string): Promise<string> {
  const fallback = localHittingLine(c);
  if (!apiKey) return fallback;
  const key = `${c.quality}-${Math.round(c.netX * 10)}-${Math.round(c.netY * 10)}-${Math.round(c.heat * 10)}-${c.recentSwings.slice(-3).join("")}`;
  if (SWING_CACHE.has(key)) {
    const cached = await SWING_CACHE.get(key)!;
    return cached ?? fallback;
  }
  const promise = fetchHittingFromClaude(c, apiKey);
  SWING_CACHE.set(key, promise);
  const aiLine = await promise;
  return aiLine ?? fallback;
}

async function fetchPitchingFromClaude(c: PitchContext, apiKey: string): Promise<string | null> {
  const prompt = `You are Coach Billy, ${c.henryName}'s baseball coach. ${c.henryName} is 8-10 years old.

He just threw a pitch in practice. Give ONE coaching sentence (under 25 words). Be specific, kid-friendly, encouraging but honest. Reference real mechanics when relevant.

Pitch facts:
- Pitch type: ${c.pitchType}
- Location: ${c.inZone ? `Inside strike zone, column ${c.zoneCol} (${c.zoneCol === 0 ? "inside" : c.zoneCol === 1 ? "middle" : "away"}), row ${c.zoneRow} (${c.zoneRow === 0 ? "high" : c.zoneRow === 1 ? "belt-high" : "low"})` : "Outside the strike zone"}
- Result: ${c.result}
- Batter's hot/cold rating in that exact zone: ${(c.heat * 100).toFixed(0)} out of 100 (60+ = hot for the batter, 40- = cold)
- Batter contact rating: ${c.batterContact}, power: ${c.batterPower}
- Recent pitches: ${c.recentResults.slice(-5).join(", ") || "none yet"}
- ${c.henryName}'s focus areas: ${c.pitcherFocus.join(", ")}
- Outcome on the field: ${c.outcomeText}

Reply ONLY with the coaching sentence. No quotes, no commentary, just one specific actionable sentence.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === "string" ? text.trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

async function fetchHittingFromClaude(c: SwingContext, apiKey: string): Promise<string | null> {
  const prompt = `You are Coach Billy, ${c.henryName}'s baseball coach. ${c.henryName} is 8-10 years old.

He just took a swing in practice. Give ONE coaching sentence (under 25 words). Be specific, kid-friendly. Reference real mechanics.

Swing facts:
- Net contact location (0,0 = top-left of net, 1,1 = bottom-right): (${c.netX.toFixed(2)}, ${c.netY.toFixed(2)})
- Swing quality: ${c.quality}
- Pitcher velocity: ${c.pitcherVelo} mph, control rating: ${c.pitcherControl}
- ${c.pitchType ? `Pitch type was ${c.pitchType}` : ""}
- Recent swings: ${c.recentSwings.slice(-5).join(", ") || "none yet"}
- ${c.henryName}'s focus areas: elbow up through contact, hip rotation, back foot pivot
- Outcome on the field: ${c.outcomeText}

Reply ONLY with the coaching sentence. No quotes, no commentary, just one specific actionable sentence.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === "string" ? text.trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}
