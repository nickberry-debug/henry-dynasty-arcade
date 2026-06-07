// src/combat-sports/wrestling/wrestlers.ts
//
// Original wrestler roster — six originals, kid-friendly, no licensed
// names (no WWE / AEW / NJPW). Each has a four-stat block + a unique
// signature finisher with a flavour line for the cinematic intro.
//
// Stats are 1..10 and drive engine multipliers:
//   POWER     → damage scaling on landed moves
//   TECHNIQUE → reversal accuracy + grapple bonus
//   SPEED     → strike stamina discount + escape window
//   CHARISMA  → hype gain bonus (taunts + landed moves)

export type Archetype = "heavyweight" | "lightweight" | "tank" | "technician" | "high-flyer" | "balanced";

export interface WrestlerDef {
  id: string;
  name: string;
  archetype: Archetype;
  color: string;
  bio: string;
  finisher: {
    name: string;
    flavour: string;
    /** Emoji shown in the cinematic banner. */
    emoji: string;
  };
  stats: {
    power: number;
    technique: number;
    speed: number;
    charisma: number;
  };
}

export const WRESTLERS: WrestlerDef[] = [
  {
    id: "maverick", name: "Iron Maverick", archetype: "heavyweight", color: "#dc2626",
    bio: "Steel-plant strongman with a wrecking-ball haymaker. Lives on raw power.",
    finisher: { name: "Steel Press", flavour: "Hoists them up and drives down with a press from the top rope.", emoji: "⚒️" },
    stats: { power: 10, technique: 5, speed: 4, charisma: 6 },
  },
  {
    id: "lyra", name: "Lyra Sparks", archetype: "lightweight", color: "#fbbf24",
    bio: "Lightning-fast technician who runs the ropes like a blur of yellow light.",
    finisher: { name: "Electric Tornado", flavour: "Spinning headscissors into a corkscrew slam — pure speed.", emoji: "⚡" },
    stats: { power: 5, technique: 7, speed: 10, charisma: 8 },
  },
  {
    id: "marshal", name: "The Mountain Marshal", archetype: "tank", color: "#86efac",
    bio: "Immovable defender. You don't take The Marshal down — you bounce off.",
    finisher: { name: "Crushing Earthquake", flavour: "Drops the full mountain — the ring shakes.", emoji: "🌋" },
    stats: { power: 9, technique: 6, speed: 3, charisma: 5 },
  },
  {
    id: "spectre", name: "Spectre Lockdown", archetype: "technician", color: "#a78bfa",
    bio: "Cold-eyed submission specialist. If you give him a wrist, you give him the match.",
    finisher: { name: "Phantom Hold", flavour: "Locks an impossible armbar — escape is a rumour.", emoji: "🕸️" },
    stats: { power: 5, technique: 10, speed: 6, charisma: 4 },
  },
  {
    id: "blaze", name: "Ace Blaze", archetype: "high-flyer", color: "#67e8f9",
    bio: "Top-rope daredevil. If the camera's pointed at the lights, Blaze is in them.",
    finisher: { name: "Sky Spiral", flavour: "450-spin off the turnbuckle — the building gasps.", emoji: "🚀" },
    stats: { power: 6, technique: 7, speed: 9, charisma: 9 },
  },
  {
    id: "standard", name: "Captain Standard", archetype: "balanced", color: "#f9a8d4",
    bio: "All-American hero with a salute and a smile. Wins on the crowd's energy.",
    finisher: { name: "All-Star Slam", flavour: "Sets up, signals to the crowd, and finishes clean.", emoji: "🌟" },
    stats: { power: 7, technique: 7, speed: 7, charisma: 10 },
  },
];

export function wrestlerById(id: string): WrestlerDef {
  return WRESTLERS.find(w => w.id === id) ?? WRESTLERS[0];
}
