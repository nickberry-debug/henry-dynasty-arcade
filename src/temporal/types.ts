// Temporal Order — type system.
// A time-travel adventure. The Chrono Library is HQ; missions
// drop the player into historical eras with anomalies to resolve.
// AI generates fresh mission variations + NPC dialogue + ripples on
// every playthrough so the same era plays differently each time.

export type EraId = "egypt" | "greece" | "viking" | "renaissance" | "revolution" | "hollywood";

export type GadgetId =
  | "translator"     // makes NPC dialogue legible to player
  | "pocket_watch"   // shows time-of-day, advances time
  | "disguise_kit"   // blends in with locals
  | "journal"        // always available
  | "compass"        // reveals waypoints
  | "coin_purse";    // era currency

export interface Era {
  id: EraId;
  name: string;
  year: string;
  flag: string;        // emoji shorthand
  /** Tile palette colors. */
  palette: {
    floor: string;
    floorAlt: string;
    wall: string;
    accent: string;
    sky: string;
  };
  /** Disguise role the player wears in this era. */
  disguiseAs: string;
  /** Brief flavor for the briefing screen. */
  flavor: string;
  /** Hero historical figures present in the era. */
  figures: string[];
  /** AI prompt seed describing the era to ground the variation generator. */
  aiContext: string;
}

export interface MissionTemplate {
  id: string;
  eraId: EraId;
  title: string;
  premise: string;
  /** Static set of historical figures who could be involved. */
  figures: string[];
  /** Suggested resolution archetypes to anchor variations. */
  archetypes: Array<"diplomacy" | "disguise" | "investigation" | "trick">;
  /** Difficulty (1-5). */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

/** An AI-generated variation of a mission template — produced when the
 *  player launches the mission. Re-rolled on replay so it never feels
 *  identical. */
export interface MissionVariation {
  templateId: string;
  /** The specific anomaly the player must resolve. */
  anomaly: string;
  /** Behind-the-scenes truth (player learns this through clues). */
  trueCause: string;
  perpetrator: { name: string; motive: string };
  clues: Array<{ id: number; description: string; location: string; foundVia: string }>;
  suspects: Array<{ name: string; motive: string; isCulprit: boolean }>;
  resolutions: Array<{ id: number; description: string; consequence: string; integrityDelta: number }>;
  incidents: Array<{ trigger: string; event: string; consequence: string }>;
}

export interface AgentSave {
  id: string;
  createdAt: number;
  modifiedAt: number;
  agentName: string;
  appearance: "agent1" | "agent2" | "agent3" | "agent4";
  /** Timeline integrity, 0-100. Bad choices drop it. */
  integrity: number;
  /** Reputation per era, -50 to +50. */
  rep: Partial<Record<EraId, number>>;
  /** Completed mission template IDs with the resolution chosen. */
  missionsCompleted: Array<{ templateId: string; resolutionId: number; integrityAtTime: number }>;
  /** Currently active mission (one at a time). */
  activeMission: ActiveMission | null;
  /** Trophy room — artifacts collected. */
  trophies: Array<{ name: string; era: EraId; from: string }>;
  /** Timeline ripple log — AI-generated consequences. */
  ripples: Array<{ era: EraId; missionId: string; primary: string; secondary: string; week: number }>;
  /** Inventory. */
  gadgets: GadgetId[];
  /** Era currency on hand. */
  coins: number;
  /** XP-like progress. */
  level: number;
  xp: number;
}

export interface ActiveMission {
  templateId: string;
  variation: MissionVariation;
  /** Clue IDs the player has found. */
  cluesFound: number[];
  /** NPCs the player has spoken with. */
  spokenWith: string[];
  /** Journal entries. */
  notes: Array<{ id: string; text: string; addedAt: number }>;
  /** Incidents triggered this run. */
  incidentsTriggered: string[];
  /** Disguise wearing? */
  disguised: boolean;
  startedAt: number;
}

export interface NpcDialogueLine {
  /** Who said it. "player" or NPC name. */
  speaker: string;
  text: string;
}
