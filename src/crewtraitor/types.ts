// Crew Traitor — game types. Original social-deduction game inspired by
// Among Us. All names + map + tasks are original.
//
// Architecture: state lives in a Firestore room doc (N-player room, see
// /src/crewtraitor/room.ts). Per-player private role data lives in a
// sub-doc so other clients can't peek. Map is fixed; players "teleport"
// between rooms by tapping (no collision physics — simpler for kids).

export type Role = "crew" | "traitor";

/** Special role variants assigned alongside the base role. Detective +
 *  Engineer are crew-side specials; traitors stay vanilla in v2. */
export type RoleVariant = "none" | "detective" | "engineer";

export type GamePhase =
  | "lobby"      // waiting for players + host start
  | "playing"   // free movement, tasks, traitor tags
  | "meeting"   // discussion + voting
  | "ended";    // game over, winner announced

/** A room on the map. Players "move" by tapping a room → teleport there. */
export interface MapRoom {
  id: string;
  name: string;
  emoji: string;
  /** Position on the SVG canvas (-50..50 each axis). */
  x: number;
  y: number;
  /** Half-width / half-height for the rounded rect render. */
  w: number;
  h: number;
  color: string;
}

/** A task placed in a room. Crew "do" the task by holding their finger
 *  for 3 seconds. Traitors can fake-do tasks (visual identical but
 *  doesn't count toward win). */
export interface MapTask {
  id: string;
  label: string;
  emoji: string;
  roomId: string;
}

export interface MapDef {
  id: string;
  name: string;
  rooms: MapRoom[];
  tasks: MapTask[];
  /** Vent shortcut pairs — traitors + engineers can fast-travel between
   *  the two rooms in each pair. Bidirectional. */
  ventPairs: Array<[string, string]>;
}

/** Public per-player state visible to everyone in the room. */
export interface CrewPlayer {
  profileId: string;
  profileName: string;
  profileColor: string;
  /** Currently in this room id. */
  roomId: string;
  /** Eliminated by traitor tag or majority vote. */
  alive: boolean;
  ready?: boolean;
  ts: number;
}

/** Private per-player state. Only the matching client should read its
 *  own entry from /crewRooms/{code}/private/{profileId}. */
export interface CrewPrivate {
  profileId: string;
  role: Role;
  /** Special-role variant atop the base role. */
  variant?: RoleVariant;
  /** Task ids assigned to this player (crew). For traitors this is
   *  populated too so they can fake-do tasks for cover. */
  assignedTaskIds: string[];
  /** Task ids the player has actually completed. */
  completedTaskIds: string[];
  /** Detective: true once their one-shot peek has been used. */
  peekUsed?: boolean;
  /** Detective: most recent peek result written back by the host
   *  ({ targetId, targetName, role }). Surfaced once then cleared by
   *  the detective's client after they acknowledge. */
  peekResult?: { targetId: string; targetName: string; role: Role };
}

/** Vote round state. */
export interface MeetingState {
  /** Who called the meeting (or "body" + the dead player's id). */
  calledBy: string;
  /** Wall-clock when the meeting started. UI counts down from this. */
  startedAt: number;
  /** Discussion length, then voting locks. */
  durationSec: number;
  /** Vote tally: voterProfileId -> targetProfileId or "skip". */
  votes: Record<string, string>;
  /** Body that triggered the meeting (if any). */
  bodyOfPlayerId?: string;
}

/** Active sabotage triggered by a traitor. Crew must visit all
 *  fixRoomIds within deadlineMs or the traitors win. */
export interface SabotageState {
  /** Sabotage definition id (see /src/crewtraitor/sabotage.ts). */
  id: string;
  /** Wall-clock start. UI counts down deadline - (now - startedAt). */
  startedAt: number;
  /** Total ms allowed before failure. */
  durationMs: number;
  /** Room ids each crewmate must visit to contribute a fix step.
   *  Empty array = all steps complete. */
  remainingRoomIds: string[];
  /** Profile ids of crewmates who have contributed (visit-the-room) to
   *  the fix. Used to keep one player from "fixing" twice. */
  contributors: string[];
}

export interface CrewGameState {
  phase: GamePhase;
  players: CrewPlayer[];
  /** Total tasks the crew needs to complete to win. Computed from the
   *  per-player assigned tasks at game start. */
  taskGoal: number;
  /** Tally of tasks completed across all crewmates (private writes
   *  bubble up here so everyone can see the progress bar). */
  tasksCompleted: number;
  meeting?: MeetingState;
  sabotage?: SabotageState;
  /** Public counter — incremented when a traitor triggers a sabotage.
   *  Combined with a per-traitor cooldown of 45s on the client. */
  sabotageCount?: number;
  /** Detective peek request bubbled through the public doc so the host
   *  can answer privately. Set by detective; cleared by host once
   *  resolved. */
  pendingPeek?: { requesterId: string; targetId: string };
  winner?: "crew" | "traitor" | "draw";
  /** Most recent event line for the play feed. */
  lastEvent?: string;
  /** Append-only safe-chat log. Capped to ~20 messages server-side to
   *  keep doc size sane. Each message has a ts the client uses to
   *  fade old chatter. */
  chat?: Array<{
    id: string;
    fromProfileId: string;
    fromName: string;
    fromColor: string;
    text: string;
    ts: number;
  }>;
}
