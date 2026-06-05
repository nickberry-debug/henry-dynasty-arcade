// Crew Traitor — local solo (vs-CPU) engine. Mirrors the shape of the
// online room but runs purely in useState/useRef. No Firestore. The
// player drives their own character; bots tick on a 2.5-second loop.
//
// Bot AI is intentionally LIGHT — enough to feel reactive without
// trying to be unbeatable. Two difficulty levels (chill / sharp) tune
// voting accuracy and reaction speed.

import { getMap, DEFAULT_MAP } from "../maps";
import { getSabotage, rollSabotage } from "../sabotage";
import type { CrewPrivate, Role, RoleVariant, SabotageState, MeetingState } from "../types";

export type Difficulty = "chill" | "sharp";

export interface SoloPlayer {
  profileId: string;
  profileName: string;
  profileColor: string;
  isHuman: boolean;
  roomId: string;
  alive: boolean;
  /** Per-bot suspicion score against each other player. Higher = more
   *  likely to vote them. Updated when the bot witnesses a tag-out or
   *  sees a sabotage triggered while alone with someone. Not used for
   *  the human. */
  suspicion?: Record<string, number>;
}

export interface SoloState {
  phase: "playing" | "meeting" | "ended";
  players: SoloPlayer[];
  privates: Record<string, CrewPrivate>;
  taskGoal: number;
  tasksCompleted: number;
  sabotage?: SabotageState;
  meeting?: MeetingState;
  winner?: "crew" | "traitor" | "draw";
  lastEvent?: string;
  /** Wall-clock ms when the most recent traitor-bot sabotage ended.
   *  Used to throttle bot-triggered sabotages to ~one per 60s. */
  lastSabotageAt?: number;
  /** Wall-clock ms when each traitor bot last tagged — keeps them from
   *  insta-clearing the lobby. */
  lastTagByBot: Record<string, number>;
}

const BOT_NAMES = ["Astra", "Kepler", "Nova", "Orion", "Vega", "Lyra", "Pyx", "Rigel"];
const BOT_COLORS = ["#7dd3fc", "#86efac", "#fbbf24", "#f87171", "#a78bfa", "#fb923c", "#67e8f9", "#fde047"];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function traitorCountFor(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 8) return 2;
  return 3;
}

function tasksPerPlayer(playerCount: number): number {
  if (playerCount <= 4) return 3;
  if (playerCount <= 7) return 4;
  return 5;
}

/** Build a fresh solo game with the configured bot count + difficulty.
 *  Roles are randomized — the human might draw traitor. */
export function newSoloGame(args: {
  human: { profileId: string; profileName: string; profileColor: string };
  botCount: number;
  difficulty: Difficulty;
  forceHumanRole?: Role; // optional for "always crew" first-time UX
}): SoloState {
  const map = getMap(DEFAULT_MAP)!;
  const startingRoomId = map.rooms[2].id; // cafeteria
  // Build the players list.
  const players: SoloPlayer[] = [{
    profileId: args.human.profileId,
    profileName: args.human.profileName,
    profileColor: args.human.profileColor,
    isHuman: true,
    roomId: startingRoomId,
    alive: true,
  }];
  const usedColors = new Set([args.human.profileColor]);
  const shuffledBotNames = shuffle(BOT_NAMES);
  const shuffledBotColors = shuffle(BOT_COLORS).filter(c => !usedColors.has(c));
  for (let i = 0; i < args.botCount; i++) {
    const c = shuffledBotColors[i % shuffledBotColors.length];
    players.push({
      profileId: `cpu_${i}`,
      profileName: shuffledBotNames[i % shuffledBotNames.length],
      profileColor: c,
      isHuman: false,
      roomId: startingRoomId,
      alive: true,
      suspicion: {},
    });
  }
  // Role assignment.
  const traitorN = traitorCountFor(players.length);
  let shuffledIds = shuffle(players.map(p => p.profileId));
  // Honor forceHumanRole if set: move the human into / out of the traitor pool.
  if (args.forceHumanRole) {
    shuffledIds = shuffledIds.filter(id => id !== args.human.profileId);
    if (args.forceHumanRole === "traitor") {
      shuffledIds.unshift(args.human.profileId);
    } else {
      shuffledIds.push(args.human.profileId);
    }
  }
  const traitorIds = new Set(shuffledIds.slice(0, traitorN));
  const crewIds = shuffledIds.filter(id => !traitorIds.has(id));
  const variants: Record<string, RoleVariant> = {};
  if (crewIds.length >= 3) variants[crewIds[0]] = "detective";
  if (crewIds.length >= 4) variants[crewIds[1]] = "engineer";
  const tasksPer = tasksPerPlayer(players.length);
  // Per-player private docs.
  const privates: Record<string, CrewPrivate> = {};
  for (const p of players) {
    const isTraitor = traitorIds.has(p.profileId);
    const taskIds = shuffle(map.tasks.map(t => t.id)).slice(0, tasksPer);
    privates[p.profileId] = {
      profileId: p.profileId,
      role: isTraitor ? "traitor" : "crew",
      variant: isTraitor ? "none" : (variants[p.profileId] ?? "none"),
      assignedTaskIds: taskIds,
      completedTaskIds: [],
      peekUsed: false,
    };
  }
  const crewCount = players.length - traitorN;
  const taskGoal = crewCount * tasksPer;
  // Lower difficulty = bots start with more random suspicion noise.
  const initialNoise = args.difficulty === "chill" ? 8 : 3;
  for (const p of players) {
    if (p.isHuman || !p.suspicion) continue;
    for (const other of players) {
      if (other.profileId === p.profileId) continue;
      p.suspicion[other.profileId] = Math.random() * initialNoise;
    }
  }
  return {
    phase: "playing",
    players, privates,
    taskGoal, tasksCompleted: 0,
    lastTagByBot: {},
    lastEvent: "Roles assigned. Good luck!",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

export function aliveOf(state: SoloState): SoloPlayer[] {
  return state.players.filter(p => p.alive);
}

export function traitorIdsOf(state: SoloState): string[] {
  return Object.values(state.privates).filter(p => p.role === "traitor").map(p => p.profileId);
}

// ── Actions (human-driven) ────────────────────────────────────────────

export function applyMove(state: SoloState, profileId: string, roomId: string): SoloState {
  if (state.phase !== "playing") return state;
  const players = state.players.map(p =>
    p.profileId === profileId ? { ...p, roomId } : p);
  const next: SoloState = { ...state, players };
  // Sabotage step contribution.
  if (next.sabotage) {
    const priv = next.privates[profileId];
    if (priv && priv.role === "crew" && next.sabotage.remainingRoomIds.includes(roomId)
        && !next.sabotage.contributors.includes(profileId)) {
      const newRemaining = next.sabotage.remainingRoomIds.filter(r => r !== roomId);
      const newContrib = [...next.sabotage.contributors, profileId];
      if (newRemaining.length === 0) {
        const def = getSabotage(next.sabotage.id);
        next.sabotage = undefined;
        next.lastEvent = `Crew fixed the ${def?.label ?? "sabotage"}!`;
      } else {
        next.sabotage = { ...next.sabotage, remainingRoomIds: newRemaining, contributors: newContrib };
      }
    }
  }
  return next;
}

export function applyCompleteTask(state: SoloState, profileId: string, taskId: string): SoloState {
  if (state.phase !== "playing") return state;
  const priv = state.privates[profileId];
  if (!priv) return state;
  if (!priv.assignedTaskIds.includes(taskId)) return state;
  if (priv.completedTaskIds.includes(taskId)) return state;
  const newPriv = { ...priv, completedTaskIds: [...priv.completedTaskIds, taskId] };
  const next: SoloState = {
    ...state,
    privates: { ...state.privates, [profileId]: newPriv },
  };
  // Only crew advance the goal.
  if (priv.role === "crew") {
    next.tasksCompleted = state.tasksCompleted + 1;
    next.lastEvent = "A task was completed.";
    if (next.tasksCompleted >= next.taskGoal) {
      next.phase = "ended";
      next.winner = "crew";
      next.lastEvent = "All tasks complete — CREW WINS!";
    }
  }
  return next;
}

export function applyTagOut(state: SoloState, traitorId: string, victimId: string): SoloState {
  if (state.phase !== "playing") return state;
  const traitor = state.players.find(p => p.profileId === traitorId);
  const victim = state.players.find(p => p.profileId === victimId);
  if (!traitor || !victim || !traitor.alive || !victim.alive) return state;
  if (traitor.roomId !== victim.roomId) return state;
  // Each witness in the room (other than the traitor + victim) gets a
  // suspicion bump against the traitor. Bots vote on suspicion.
  const witnesses = state.players.filter(p =>
    p.alive && p.profileId !== traitorId && p.profileId !== victimId && p.roomId === traitor.roomId);
  const players = state.players.map(p => {
    if (p.profileId === victimId) return { ...p, alive: false };
    if (witnesses.some(w => w.profileId === p.profileId) && p.suspicion) {
      return { ...p, suspicion: { ...p.suspicion, [traitorId]: (p.suspicion[traitorId] ?? 0) + 8 } };
    }
    return p;
  });
  return {
    ...state, players,
    lastEvent: `${victim.profileName} got tagged out in the ${victim.roomId}!`,
    lastTagByBot: { ...state.lastTagByBot, [traitorId]: Date.now() },
  };
}

export function applyTriggerSabotage(state: SoloState): SoloState {
  if (state.phase !== "playing") return state;
  if (state.sabotage) return state;
  const def = rollSabotage();
  return {
    ...state,
    sabotage: {
      id: def.id,
      startedAt: Date.now(),
      durationMs: def.durationSec * 1000,
      remainingRoomIds: def.fixRoomIds.slice(),
      contributors: [],
    },
    lastEvent: `${def.emoji} ${def.label}! ${def.flavor}`,
  };
}

export function applyCallMeeting(state: SoloState, callerId: string): SoloState {
  if (state.phase !== "playing") return state;
  const caller = state.players.find(p => p.profileId === callerId);
  if (!caller || !caller.alive) return state;
  return {
    ...state,
    phase: "meeting",
    meeting: {
      calledBy: callerId,
      startedAt: Date.now(),
      durationSec: 60,
      votes: {},
    },
    lastEvent: "Emergency meeting called!",
  };
}

export function applyVote(state: SoloState, voterId: string, targetId: string): SoloState {
  if (state.phase !== "meeting" || !state.meeting) return state;
  return {
    ...state,
    meeting: { ...state.meeting, votes: { ...state.meeting.votes, [voterId]: targetId } },
  };
}

/** Resolve the meeting. Most-voted player is evicted; ties = no
 *  eviction. Then check win conditions. */
export function resolveMeeting(state: SoloState): SoloState {
  if (state.phase !== "meeting" || !state.meeting) return state;
  const counts: Record<string, number> = {};
  for (const t of Object.values(state.meeting.votes)) counts[t] = (counts[t] ?? 0) + 1;
  let evicted: string | null = null;
  let topCount = 0;
  let tied = false;
  for (const [target, cnt] of Object.entries(counts)) {
    if (target === "skip") continue;
    if (cnt > topCount) { evicted = target; topCount = cnt; tied = false; }
    else if (cnt === topCount) tied = true;
  }
  const skipCount = counts["skip"] ?? 0;
  const noEviction = !evicted || tied || skipCount >= topCount;
  const traitorIds = traitorIdsOf(state);
  let players = state.players;
  let lastEvent = "No one was voted out.";
  if (!noEviction && evicted) {
    const target = evicted;
    players = players.map(p => p.profileId === target ? { ...p, alive: false } : p);
    const evictedPlayer = state.players.find(p => p.profileId === target);
    const wasTraitor = traitorIds.includes(target);
    lastEvent = `${evictedPlayer?.profileName} was voted out. They were ${wasTraitor ? "A TRAITOR!" : "innocent."}`;
  }
  // Win check.
  const aliveTraitors = traitorIds.filter(t => players.find(p => p.profileId === t && p.alive));
  const aliveCrew = players.filter(p => p.alive && !traitorIds.includes(p.profileId));
  let phase: SoloState["phase"] = "playing";
  let winner: SoloState["winner"];
  if (aliveTraitors.length === 0) {
    phase = "ended"; winner = "crew";
    lastEvent += " · CREW WINS!";
  } else if (aliveTraitors.length >= aliveCrew.length) {
    phase = "ended"; winner = "traitor";
    lastEvent += " · TRAITORS WIN!";
  }
  return { ...state, players, meeting: undefined, phase, winner, lastEvent };
}

/** Check if an active sabotage has expired. Traitors win if so. */
export function tickSabotageExpiry(state: SoloState): SoloState {
  if (!state.sabotage || state.phase !== "playing") return state;
  if (Date.now() - state.sabotage.startedAt < state.sabotage.durationMs) return state;
  const def = getSabotage(state.sabotage.id);
  return {
    ...state,
    sabotage: undefined,
    phase: "ended",
    winner: "traitor",
    lastEvent: `${def?.label ?? "Sabotage"} was NOT fixed in time — TRAITORS WIN!`,
  };
}

// ── Bot AI tick ───────────────────────────────────────────────────────

/** Run one bot decision tick. Each bot picks an action: move, do a task,
 *  tag (traitor only), trigger sabotage (traitor only). Idempotent
 *  if called when the phase isn't "playing". */
export function botTick(state: SoloState, difficulty: Difficulty): SoloState {
  if (state.phase !== "playing") return state;
  // First check sabotage expiry.
  let next = tickSabotageExpiry(state);
  if (next.phase !== "playing") return next;
  const map = getMap(DEFAULT_MAP)!;
  const bots = next.players.filter(p => !p.isHuman && p.alive);
  // Tagging gate — only one tag per tick to avoid wipe-outs.
  let tagFiredThisTick = false;
  for (const bot of bots) {
    const priv = next.privates[bot.profileId];
    if (!priv) continue;
    // Sabotage participation — crew bots beeline to fix rooms.
    if (priv.role === "crew" && next.sabotage) {
      const goal = next.sabotage.remainingRoomIds[0];
      if (goal && goal !== bot.roomId) {
        next = applyMove(next, bot.profileId, goal);
        continue;
      }
    }
    // Crew bot: do an assigned task if in the right room, otherwise wander.
    if (priv.role === "crew") {
      const room = bot.roomId;
      const myUnfinishedTasks = priv.assignedTaskIds.filter(t => !priv.completedTaskIds.includes(t));
      const taskHere = myUnfinishedTasks.find(t => {
        const task = map.tasks.find(tt => tt.id === t);
        return task && task.roomId === room;
      });
      // Don't complete all tasks instantly — chill stalls more.
      const completeChance = difficulty === "sharp" ? 0.55 : 0.35;
      if (taskHere && Math.random() < completeChance) {
        next = applyCompleteTask(next, bot.profileId, taskHere);
        if (next.phase === "ended") return next;
        continue;
      }
      // Otherwise wander to a room with an unfinished task or random.
      const nextRoom = pickCrewMoveTarget(map.rooms, bot.roomId, priv, map.tasks);
      if (nextRoom !== bot.roomId) {
        next = applyMove(next, bot.profileId, nextRoom);
      }
      continue;
    }
    // Traitor bot.
    if (!tagFiredThisTick) {
      // Tag if alone with exactly one crew + cooldown elapsed.
      const cooldownMs = difficulty === "sharp" ? 18_000 : 32_000;
      const lastTag = next.lastTagByBot[bot.profileId] ?? 0;
      if (Date.now() - lastTag > cooldownMs) {
        const others = next.players.filter(p =>
          p.alive && p.profileId !== bot.profileId && p.roomId === bot.roomId);
        // Don't tag with the human watching unless the human IS the only one (risky for bot).
        const humanWatching = others.some(o => o.isHuman);
        const crewVictims = others.filter(o => next.privates[o.profileId]?.role === "crew");
        if (crewVictims.length === 1 && (!humanWatching || others.length === 1)) {
          next = applyTagOut(next, bot.profileId, crewVictims[0].profileId);
          tagFiredThisTick = true;
          continue;
        }
      }
      // Maybe trigger a sabotage.
      const sabotageCooldownMs = difficulty === "sharp" ? 45_000 : 75_000;
      if (!next.sabotage && Date.now() - (next.lastSabotageAt ?? 0) > sabotageCooldownMs && Math.random() < 0.35) {
        next = applyTriggerSabotage(next);
        next.lastSabotageAt = Date.now();
        continue;
      }
    }
    // Otherwise wander — bias toward rooms with crew.
    const target = pickTraitorMoveTarget(map.rooms, bot.roomId, next.players);
    if (target !== bot.roomId) {
      next = applyMove(next, bot.profileId, target);
    }
  }
  return next;
}

function pickCrewMoveTarget(
  rooms: { id: string }[],
  current: string,
  priv: CrewPrivate,
  tasks: { id: string; roomId: string }[],
): string {
  // 60% chance head toward a room with an unfinished task; otherwise random.
  if (Math.random() < 0.60) {
    const unfinished = priv.assignedTaskIds.filter(t => !priv.completedTaskIds.includes(t));
    const targetRooms = unfinished
      .map(t => tasks.find(tt => tt.id === t)?.roomId)
      .filter((r): r is string => !!r && r !== current);
    if (targetRooms.length > 0) {
      return targetRooms[Math.floor(Math.random() * targetRooms.length)];
    }
  }
  const others = rooms.filter(r => r.id !== current);
  return others[Math.floor(Math.random() * others.length)].id;
}

function pickTraitorMoveTarget(
  rooms: { id: string }[],
  current: string,
  players: SoloPlayer[],
): string {
  // Traitor leans toward rooms with 1 crewmate (taggable) or empty rooms
  // to set up. Avoid groups.
  const others = rooms.filter(r => r.id !== current);
  const ranked = others.map(r => {
    const occupants = players.filter(p => p.alive && p.roomId === r.id);
    const score =
      occupants.length === 0 ? 5 :
      occupants.length === 1 ? 8 :
      occupants.length === 2 ? 2 :
      0;
    return { id: r.id, score };
  });
  // Random tiebreak.
  ranked.sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 1.5);
  return ranked[0].id;
}

// ── Bot voting ────────────────────────────────────────────────────────

/** Submit bot votes during the meeting phase. Each bot picks the
 *  player with the highest suspicion against them; ties go to skip. */
export function botVote(state: SoloState, difficulty: Difficulty): SoloState {
  if (state.phase !== "meeting" || !state.meeting) return state;
  let next = state;
  const meetingVotes = { ...next.meeting!.votes };
  for (const bot of next.players) {
    if (bot.isHuman || !bot.alive) continue;
    if (meetingVotes[bot.profileId]) continue; // already voted
    const priv = next.privates[bot.profileId];
    let target: string = "skip";
    if (priv?.role === "traitor") {
      // Traitor bots vote for the most-suspicious CREW (not another
      // traitor) — protect their team. Falls back to skip.
      const traitors = traitorIdsOf(next);
      const candidates = next.players.filter(p =>
        p.alive && p.profileId !== bot.profileId && !traitors.includes(p.profileId));
      // Pick by random crew member to evict.
      if (candidates.length > 0) {
        target = candidates[Math.floor(Math.random() * candidates.length)].profileId;
      }
    } else {
      // Crew bots vote by suspicion. Sharp = follow suspicion more
      // strictly. Chill = often skip.
      const sus = bot.suspicion ?? {};
      const entries = Object.entries(sus).filter(([id, _]) => {
        const p = next.players.find(pp => pp.profileId === id);
        return p?.alive;
      });
      entries.sort((a, b) => b[1] - a[1]);
      const skipBias = difficulty === "chill" ? 0.45 : 0.20;
      if (entries.length === 0 || entries[0][1] < 4 || Math.random() < skipBias) {
        target = "skip";
      } else {
        target = entries[0][0];
      }
    }
    meetingVotes[bot.profileId] = target;
  }
  next = { ...next, meeting: { ...next.meeting!, votes: meetingVotes } };
  return next;
}
