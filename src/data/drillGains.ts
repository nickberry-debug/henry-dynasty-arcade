// V3 Section 3.2 — specific per-drill attribute gains. Used both for display
// (each drill card shows "+0.3 Contact, +0.1 Vision") and for engine math.

export type AttrKey =
  | "contactL" | "contactR"
  | "powerL" | "powerR"
  | "vision" | "discipline"
  | "speed" | "baserun" | "stealing"
  | "fielding" | "arm" | "armAccuracy" | "reaction"
  | "clutch" | "durability"
  | "stamina" | "composure" | "holdRunners"
  | "pitchVelocity" | "pitchControl";

export interface DrillGain {
  attr: AttrKey;
  amount: number; // per-rep grant
  label: string; // user-facing
}

// Per-drill: per-rep gain. We multiply by rep count up to a per-day cap.
export const DRILL_GAINS: Record<string, DrillGain[]> = {
  // Hitting
  "fence-drill":   [{ attr: "contactR", amount: 0.2, label: "Contact" }, { attr: "vision", amount: 0.1, label: "Vision" }],
  "top-hand":      [{ attr: "powerR",   amount: 0.3, label: "Power"   }, { attr: "contactR", amount: 0.1, label: "Contact" }],
  "no-hands-hip":  [{ attr: "powerR",   amount: 0.4, label: "Power"   }, { attr: "contactR", amount: 0.1, label: "Contact" }],
  "towel-heel":    [{ attr: "powerR",   amount: 0.2, label: "Power"   }, { attr: "speed", amount: 0.1, label: "Speed" }],
  "colored-ball":  [{ attr: "vision",   amount: 0.4, label: "Vision"  }, { attr: "contactR", amount: 0.2, label: "Contact" }],
  "sharpie-line":  [{ attr: "contactR", amount: 0.3, label: "Contact" }, { attr: "vision", amount: 0.2, label: "Vision" }],
  "one-knee":      [{ attr: "contactR", amount: 0.2, label: "Contact" }, { attr: "powerR", amount: 0.1, label: "Power" }],
  "walk-through":  [{ attr: "powerR",   amount: 0.2, label: "Power"   }, { attr: "contactR", amount: 0.2, label: "Contact" }],
  "slow-motion":   [{ attr: "vision",   amount: 0.3, label: "Form"    }, { attr: "contactR", amount: 0.1, label: "Contact" }, { attr: "powerR", amount: 0.1, label: "Power" }],
  "two-tee":       [{ attr: "contactR", amount: 0.3, label: "Contact" }, { attr: "powerR", amount: 0.2, label: "Power" }],

  // Pitching
  "target-practice":   [{ attr: "pitchControl", amount: 0.3, label: "Control" }],
  "inside-outside":    [{ attr: "pitchControl", amount: 0.4, label: "Control" }],
  "high-low":          [{ attr: "pitchControl", amount: 0.4, label: "Control" }],
  "strike-ball-strike":[{ attr: "pitchControl", amount: 0.3, label: "Control" }, { attr: "composure", amount: 0.2, label: "Composure" }],
  "towel-drill":       [{ attr: "pitchVelocity", amount: 0.2, label: "Velocity" }, { attr: "pitchControl", amount: 0.1, label: "Control" }],
  "balance":           [{ attr: "pitchControl", amount: 0.3, label: "Control" }, { attr: "composure", amount: 0.2, label: "Composure" }],
  "knee-throws":       [{ attr: "arm", amount: 0.2, label: "Arm Strength" }, { attr: "pitchControl", amount: 0.1, label: "Control" }],
  "long-toss":         [{ attr: "arm", amount: 0.5, label: "Arm Strength" }, { attr: "pitchVelocity", amount: 0.2, label: "Velocity" }],
  "pickoff":           [{ attr: "pitchControl", amount: 0.2, label: "Control" }, { attr: "fielding", amount: 0.1, label: "Fielding" }],
  "bullpen-sequence":  [{ attr: "pitchControl", amount: 0.4, label: "Control" }, { attr: "composure", amount: 0.2, label: "Composure" }],

  // Conditioning
  "sprints":           [{ attr: "speed", amount: 0.4, label: "Speed" }],
  "pushups":           [{ attr: "arm", amount: 0.3, label: "Arm Strength" }, { attr: "powerR", amount: 0.1, label: "Power" }],
  "squats":            [{ attr: "powerR", amount: 0.3, label: "Power" }, { attr: "speed", amount: 0.2, label: "Speed" }],
  "plank":             [{ attr: "powerR", amount: 0.3, label: "Power" }, { attr: "stamina", amount: 0.2, label: "Stamina" }],
  "lateral-shuffles":  [{ attr: "speed", amount: 0.3, label: "Speed" }, { attr: "fielding", amount: 0.2, label: "Fielding" }],
  "jump-rope":         [{ attr: "speed", amount: 0.3, label: "Speed" }, { attr: "stamina", amount: 0.2, label: "Stamina" }],
  "bear-crawls":       [{ attr: "arm", amount: 0.2, label: "Arm Strength" }, { attr: "stamina", amount: 0.2, label: "Stamina" }],
  "arm-circles":       [{ attr: "arm", amount: 0.2, label: "Arm Strength" }],
  "mountain-climbers": [{ attr: "stamina", amount: 0.3, label: "Stamina" }, { attr: "speed", amount: 0.1, label: "Speed" }],
  "toe-touches":       [{ attr: "powerR", amount: 0.2, label: "Power" }]
};

export function gainsLabel(drillId: string): string {
  const g = DRILL_GAINS[drillId];
  if (!g) return "";
  return g.map(x => `+${x.amount.toFixed(1)} ${x.label}`).join(" · ");
}
