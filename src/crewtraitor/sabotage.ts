// Crew Traitor — sabotage catalog. Each entry has a label, icon, time
// window for the crew to fix, and the list of rooms a crewmate must
// visit to contribute one step. Multiple crewmates can each visit a
// room to satisfy a multi-step fix in parallel.
//
// Kid-friendly tuning: short windows (45-60s) so kids feel the urgency
// without dragging the round.

export interface SabotageDef {
  id: string;
  label: string;
  emoji: string;
  /** Flavor sentence shown to crew when triggered. */
  flavor: string;
  /** Total seconds the crew has to fix it. */
  durationSec: number;
  /** Room ids that need visiting. The crew "fixes" by tapping the
   *  matching room (each crewmate can contribute to at most one step). */
  fixRoomIds: string[];
}

export const SABOTAGES: SabotageDef[] = [
  {
    id: "reactor",
    label: "Reactor Meltdown",
    emoji: "⚛️",
    flavor: "Reactor's overheating! Crew → Reactor + Engine Bay, fast.",
    durationSec: 60,
    fixRoomIds: ["reactor", "engine"],
  },
  {
    id: "comms",
    label: "Comms Blackout",
    emoji: "📡",
    flavor: "Comms are down! Crew → Bridge + Lab to reroute the signal.",
    durationSec: 50,
    fixRoomIds: ["bridge", "lab"],
  },
  {
    id: "oxygen",
    label: "Oxygen Vent Leak",
    emoji: "💨",
    flavor: "O₂ leaking from Engine Bay. Crew → Engine + Cafeteria.",
    durationSec: 55,
    fixRoomIds: ["engine", "cafeteria"],
  },
  {
    id: "lights",
    label: "Lights Out",
    emoji: "💡",
    flavor: "All lights out! Crew → Bridge to reboot the breakers.",
    durationSec: 35,
    fixRoomIds: ["bridge"],
  },
];

export function getSabotage(id: string): SabotageDef | undefined {
  return SABOTAGES.find(s => s.id === id);
}

/** Pick a random sabotage for the trigger. */
export function rollSabotage(): SabotageDef {
  return SABOTAGES[Math.floor(Math.random() * SABOTAGES.length)];
}
