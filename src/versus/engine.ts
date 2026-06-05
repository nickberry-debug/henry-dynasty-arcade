// Sports Versus — resolve engines. Pure functions: given two private
// picks + the team ratings, return an outcome. Used by both pass-and-
// play AND (future) online mode — the state machine is mode-agnostic.
//
// Tuning: kid-friendly. A good guess should reward visibly; a bad one
// should sting but not punish. Stats matter (better team tilts odds)
// but luck always has a say so a kid playing a weaker team can win.

import type {
  PitcherPick, BatterPick, PitchOutcome, PitchZone,
  FootballPickOffense, FootballPickDefense, FootballOutcome,
} from "./types";
import type { BaseballTeam, FootballTeam } from "./teams";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function rand(): number { return Math.random(); }

// ── BASEBALL ──────────────────────────────────────────────────────────

/** True when the pitch is in the strike zone (not an intentional ball). */
function isStrike(p: PitcherPick): boolean { return !p.intentionalBall; }

/** Does the batter's guessed zone match the pitch's zone? Adjacent zones
 *  count as "partial" — softer outcomes. */
function zoneMatch(guess: PitchZone, actual: PitchZone): "exact" | "partial" | "miss" {
  if (guess === actual) return "exact";
  // Middle is everyone's neighbor.
  if (guess === "middle" || actual === "middle") return "partial";
  // High/low share a neighbor (in/out).
  if (
    (guess === "high" && (actual === "in" || actual === "out")) ||
    (guess === "low"  && (actual === "in" || actual === "out")) ||
    (guess === "in"   && (actual === "high" || actual === "low")) ||
    (guess === "out"  && (actual === "high" || actual === "low"))
  ) return "partial";
  return "miss";
}

/** Bat type effect on contact + power. */
function batMod(bat: BatterPick["bat"]): { contact: number; power: number; whiff: number } {
  if (bat === "contact")  return { contact: +6, power: -6, whiff: -2 };
  if (bat === "power")    return { contact: -4, power: +10, whiff: +4 };
  return { contact: 0, power: 0, whiff: 0 };
}

/** Main batter-vs-pitcher resolve. Reads the pitcher's stuff/control
 *  and the batter's team contact/power so the ratings actually tilt
 *  outcomes. Both swings AND takes resolve sensibly. */
export function resolvePitch(
  pitcher: PitcherPick,
  batter: BatterPick,
  pitcherTeam: BaseballTeam,
  batterTeam: BaseballTeam,
): PitchOutcome {
  // Take: no swing.
  if (batter.swing === "take") {
    if (isStrike(pitcher)) return { kind: "strike-looking" };
    return { kind: "ball" };
  }

  // Swing on an intentional ball: very unlikely to make contact.
  if (pitcher.intentionalBall) {
    return rand() < 0.85 ? { kind: "strike-swinging" } : { kind: "foul" };
  }

  // Zone match controls contact quality.
  const m = zoneMatch(batter.guess, pitcher.zone);
  const bm = batMod(batter.bat);

  // Base hit-on-contact chance, biased by zone-match accuracy.
  let contactChance =
    m === "exact"   ? 0.78 :
    m === "partial" ? 0.55 :
                      0.22;

  // Team contact + bat contact lift; pitcher stuff drops it.
  contactChance += (batterTeam.ratings.contact - 78) * 0.005;
  contactChance += bm.contact * 0.006;
  contactChance -= (pitcherTeam.ratings.stuff - 78) * 0.006;
  // Power swings whiff more often even on contact-quality pitches.
  if (batter.swing === "power") contactChance -= 0.10 + bm.whiff * 0.006;
  contactChance = clamp(contactChance, 0.05, 0.95);

  const madeContact = rand() < contactChance;
  if (!madeContact) {
    // Whiff or foul. Power swings tend to whiff outright; contact swings
    // often spoil with a foul.
    if (batter.swing === "contact" && rand() < 0.45) return { kind: "foul" };
    return { kind: "strike-swinging" };
  }

  // Contact — now resolve to in-play. Quality = match * power * variance.
  const qualityBase =
    m === "exact"   ? 0.75 :
    m === "partial" ? 0.55 :
                      0.35;
  const swingBonus = batter.swing === "power" ? 0.20 : (batter.swing === "contact" ? 0.05 : 0);
  const powerLift = (batterTeam.ratings.power - 78) * 0.005 + bm.power * 0.006;
  const stuffPenalty = (pitcherTeam.ratings.stuff - 78) * 0.004;
  const variance = (rand() - 0.5) * 0.30;
  const q = clamp(qualityBase + swingBonus + powerLift - stuffPenalty + variance, 0, 1);

  // Map quality bucket to outcome.
  if (q >= 0.86) return { kind: "homer" };
  if (q >= 0.74) return { kind: "triple" };
  if (q >= 0.62) return { kind: "double" };
  if (q >= 0.50) return { kind: "single" };
  // Lower-quality contact = an out (mostly).
  if (q >= 0.42) return { kind: "foul" };
  const outFlavor: "fly" | "ground" | "lineout" =
    batter.swing === "power" ? "fly" :
    batter.swing === "contact" ? "ground" : "lineout";
  return { kind: "out", flavor: outFlavor };
}

// ── FOOTBALL ──────────────────────────────────────────────────────────

/** Tecmo-style rock-paper-scissors matchups. Each value is a yard
 *  expectation tilt. Positive = good for offense, negative = good for
 *  defense. Ratings layer on top. */
const FB_MATCHUP: Record<string, Record<string, number>> = {
  // Offense (outer) vs Defense (inner)
  run_inside:  { run_stuff: -3, blitz: +2,  zone_short: +3, zone_deep: +5, balanced:  0 },
  run_outside: { run_stuff: -1, blitz: -2, zone_short: +4, zone_deep: +6, balanced: +1 },
  pass_short:  { run_stuff: +6, blitz: -3, zone_short: -4, zone_deep: +4, balanced:  0 },
  pass_long:   { run_stuff: +9, blitz: -8, zone_short: +6, zone_deep: -6, balanced: -1 },
  play_action: { run_stuff: +8, blitz: -5, zone_short: +5, zone_deep: -3, balanced: +3 },
  screen:      { run_stuff: -2, blitz: +9, zone_short: -3, zone_deep: +5, balanced: +1 },
};

const PLAY_BIG_KIND: Record<string, "run" | "pass" | "screen"> = {
  run_inside: "run", run_outside: "run",
  pass_short: "pass", pass_long: "pass", play_action: "pass",
  screen: "screen",
};

/** Main offense-vs-defense resolve. */
export function resolvePlay(
  offensePick: FootballPickOffense,
  defensePick: FootballPickDefense,
  offTeam: FootballTeam,
  defTeam: FootballTeam,
  ballOn: number,
  togo: number,
): FootballOutcome {
  const playKind = PLAY_BIG_KIND[offensePick.play];
  const matchupTilt = FB_MATCHUP[offensePick.play][defensePick.play] ?? 0;

  // Rating differential per play kind.
  const offRating  = playKind === "run" ? offTeam.ratings.run : offTeam.ratings.pass;
  const defRating  = playKind === "run" ? defTeam.ratings.runD : defTeam.ratings.passD;
  const ratingTilt = (offRating - defRating) * 0.08;

  // Risk of an interception or sack on long passes vs blitz.
  if (offensePick.play === "pass_long" && defensePick.play === "blitz" && rand() < 0.30) {
    return rand() < 0.5 ? { kind: "sack", yards: -7 - Math.floor(rand() * 5) }
                        : { kind: "interception" };
  }
  if (offensePick.play === "screen" && defensePick.play === "blitz" && rand() < 0.30) {
    return { kind: "interception" };
  }
  if (offensePick.play === "run_inside" && defensePick.play === "run_stuff" && rand() < 0.12) {
    return { kind: "fumble" };
  }

  // Pass plays risk incomplete on bad matchup.
  if (playKind === "pass" && matchupTilt + ratingTilt < -2 && rand() < 0.45) {
    return { kind: "incomplete" };
  }

  // Yardage rolling.
  const baseYards = (matchupTilt + ratingTilt) * 1.0;
  const variance = (rand() - 0.35) * 6; // skewed slightly toward gain
  let yards = Math.round(baseYards + variance);
  // Long pass / play-action can break for big gains.
  if (playKind === "pass" && offensePick.play !== "screen" && rand() < 0.10 + matchupTilt * 0.03) {
    yards += 8 + Math.floor(rand() * 12);
  }
  // Inside runs lose yards more than they gain a lot.
  if (offensePick.play === "run_inside") yards = Math.min(yards, 6 + Math.floor(rand() * 6));
  // Clamp single-play yards to a sensible kid-game range.
  yards = clamp(yards, -8, 35);

  // Touchdown check — caller (state machine) actually awards the TD by
  // checking ballOn + yards >= 100, but we hint at it here.
  if (ballOn + yards >= 100) return { kind: "touchdown" };

  if (yards <= -3) return { kind: "loss", yards };
  if (yards <= -1 && playKind === "pass") return { kind: "sack", yards };
  if (yards <= 0)   return { kind: "loss", yards: 0 };
  return { kind: "gain", yards, firstDown: yards >= togo };
}
