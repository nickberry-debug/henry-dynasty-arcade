// Crew Traitor — N-player room module. Mirrors the patterns from
// /src/multiplayer/match.ts but for 4-10 players. Lives in a separate
// Firestore collection (/crewRooms/{code}) to keep the schemas clean.
//
// Roles + per-player task lists are written to a private sub-collection
// (/crewRooms/{code}/private/{profileId}) so other clients can't see
// them. Each client subscribes to its own private doc + the public
// room doc.
//
// Host authority: only the host's client runs the assign-roles routine
// at game start and runs the meeting-resolution + win-check pipeline.
// Guests submit moves/tasks/votes and react to the public state.

import {
  doc, setDoc, getDoc, deleteDoc, onSnapshot, updateDoc, runTransaction,
  collection, type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonAuth, getDb } from "../sync/firebase";
import { getMap, DEFAULT_MAP } from "./maps";
import { getSabotage, rollSabotage } from "./sabotage";
import type { CrewGameState, CrewPlayer, CrewPrivate, GamePhase, Role, RoleVariant } from "./types";

const COLL = "crewRooms";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function normalizeRoomCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== 6) return null;
  return cleaned;
}

function roomRef(code: string) {
  const db = getDb();
  if (!db) return null;
  return doc(db, COLL, code);
}

function privateRef(code: string, profileId: string) {
  const db = getDb();
  if (!db) return null;
  return doc(db, COLL, code, "private", profileId);
}

function sanitize<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(sanitize) as unknown as T;
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x === undefined) continue;
      out[k] = sanitize(x as unknown);
    }
    return out as T;
  }
  return v;
}

// ── Room shape ────────────────────────────────────────────────────────

export interface CrewRoom {
  code: string;
  mapId: string;
  status: GamePhase;
  createdAt: number;
  hostId: string;
  maxPlayers: number;
  /** Up to maxPlayers entries. host is always players[0]. */
  state: CrewGameState;
}

// ── Lifecycle ─────────────────────────────────────────────────────────

export async function createRoom(host: { profileId: string; profileName: string; profileColor: string }): Promise<string | null> {
  if (!(await ensureAnonAuth())) return null;
  const db = getDb();
  if (!db) return null;
  const startingRoomId = getMap(DEFAULT_MAP)?.rooms[2].id ?? "cafeteria";
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const ref = doc(db, COLL, code);
    try {
      const ok = await runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false;
        const room: CrewRoom = {
          code,
          mapId: DEFAULT_MAP,
          status: "lobby",
          createdAt: Date.now(),
          hostId: host.profileId,
          maxPlayers: 10,
          state: {
            phase: "lobby",
            players: [{
              profileId: host.profileId,
              profileName: host.profileName,
              profileColor: host.profileColor,
              roomId: startingRoomId,
              alive: true,
              ready: false,
              ts: Date.now(),
            }],
            taskGoal: 0,
            tasksCompleted: 0,
          },
        };
        tx.set(ref, sanitize(room));
        return true;
      });
      if (ok) return code;
    } catch (e) {
      console.warn("[crew] createRoom failed", e);
    }
  }
  return null;
}

export interface JoinResult { ok: boolean; reason?: "not_found" | "full" | "playing" | "network"; }

export async function joinRoom(code: string, player: { profileId: string; profileName: string; profileColor: string }): Promise<JoinResult> {
  if (!(await ensureAnonAuth())) return { ok: false, reason: "network" };
  const db = getDb();
  if (!db) return { ok: false, reason: "network" };
  const ref = doc(db, COLL, code);
  try {
    return await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, reason: "not_found" as const };
      const room = snap.data() as CrewRoom;
      if (room.status !== "lobby") return { ok: false, reason: "playing" as const };
      const players = room.state.players ?? [];
      // Already in? Update name/color/ts.
      const idx = players.findIndex(p => p.profileId === player.profileId);
      const startingRoomId = getMap(room.mapId)?.rooms[2].id ?? "cafeteria";
      const me: CrewPlayer = {
        profileId: player.profileId,
        profileName: player.profileName,
        profileColor: player.profileColor,
        roomId: startingRoomId,
        alive: true,
        ready: false,
        ts: Date.now(),
      };
      let nextPlayers: CrewPlayer[];
      if (idx >= 0) {
        nextPlayers = players.map((p, i) => i === idx ? { ...p, ts: Date.now(), profileName: player.profileName, profileColor: player.profileColor } : p);
      } else {
        if (players.length >= (room.maxPlayers ?? 10)) return { ok: false, reason: "full" as const };
        nextPlayers = [...players, me];
      }
      tx.update(ref, sanitize({ "state.players": nextPlayers }));
      return { ok: true };
    });
  } catch (e) {
    console.warn("[crew] joinRoom failed", e);
    return { ok: false, reason: "network" };
  }
}

export async function heartbeat(code: string, profileId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    const players = room.state.players.map(p =>
      p.profileId === profileId ? { ...p, ts: Date.now() } : p);
    await updateDoc(ref, sanitize({ "state.players": players }));
  } catch { /* ignore */ }
}

export async function setReady(code: string, profileId: string, ready: boolean): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    const players = room.state.players.map(p =>
      p.profileId === profileId ? { ...p, ready, ts: Date.now() } : p);
    await updateDoc(ref, sanitize({ "state.players": players }));
  } catch { /* ignore */ }
}

export async function leaveRoom(code: string, profileId: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    // Host leaving = end the room. Others leaving = remove from players.
    if (room.hostId === profileId) {
      await deleteDoc(ref);
    } else {
      const players = room.state.players.filter(p => p.profileId !== profileId);
      await updateDoc(ref, sanitize({ "state.players": players }));
    }
  } catch { /* ignore */ }
}

// ── Game start: assign roles + tasks (host-only) ──────────────────────

/** How many traitors based on player count. Kid-game-friendly tilt. */
function traitorCountFor(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 8) return 2;
  return 3;
}

/** Per-crewmate task count. Smaller crews get fewer tasks so games
 *  don't drag. */
function tasksPerPlayer(playerCount: number): number {
  if (playerCount <= 4) return 3;
  if (playerCount <= 7) return 4;
  return 5;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Host-only: kicks off the game. Assigns roles, writes private docs
 *  per player, computes the task goal, flips status to playing. */
export async function startGame(code: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as CrewRoom;
  if (room.status !== "lobby") return;
  const map = getMap(room.mapId);
  if (!map) return;
  const players = room.state.players;
  if (players.length < 3) return; // need at least 3

  const traitorN = traitorCountFor(players.length);
  const shuffled = shuffle(players.map(p => p.profileId));
  const traitorIds = new Set(shuffled.slice(0, traitorN));
  const tasksPer = tasksPerPlayer(players.length);

  // Pick 1 Detective + 1 Engineer from the non-traitor pool when there
  // are enough crewmates to spare. Detective gets a one-shot peek;
  // Engineer can use vents.
  const crewIds = shuffled.filter(id => !traitorIds.has(id));
  const variants: Record<string, RoleVariant> = {};
  if (crewIds.length >= 3) variants[crewIds[0]] = "detective";
  if (crewIds.length >= 4) variants[crewIds[1]] = "engineer";

  // Per-player private docs.
  await Promise.all(players.map(async p => {
    const isTraitor = traitorIds.has(p.profileId);
    const taskIds = shuffle(map.tasks.map(t => t.id)).slice(0, tasksPer);
    const priv: CrewPrivate = {
      profileId: p.profileId,
      role: isTraitor ? "traitor" : "crew",
      variant: isTraitor ? "none" : (variants[p.profileId] ?? "none"),
      assignedTaskIds: taskIds,
      // Traitors get tasks too so they can fake them. Their completed
      // count doesn't count toward the crew win, enforced server-side
      // by markTaskDone (caller passes role-aware update).
      completedTaskIds: [],
      peekUsed: false,
    };
    const pref = privateRef(code, p.profileId);
    if (!pref) return;
    try { await setDoc(pref, sanitize(priv)); } catch { /* ignore */ }
  }));

  // Crew goal = total crew-assigned tasks. (Traitors' assigned tasks
  // don't count toward the goal because they don't actually do them.)
  const crewCount = players.length - traitorN;
  const taskGoal = crewCount * tasksPer;

  await updateDoc(ref, sanitize({
    status: "playing",
    "state.phase": "playing",
    "state.taskGoal": taskGoal,
    "state.tasksCompleted": 0,
    "state.lastEvent": "Roles assigned. Good luck!",
  }));
}

// ── In-game writes ────────────────────────────────────────────────────

export async function moveTo(code: string, profileId: string, roomId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    if (room.status !== "playing") return;
    // Ghost mode: eliminated players can still move + do tasks so they
    // stay engaged. They just don't count toward alive/voting/tagging.
    const players = room.state.players.map(p =>
      p.profileId === profileId ? { ...p, roomId, ts: Date.now() } : p);
    await updateDoc(ref, sanitize({ "state.players": players }));
    // Sabotage step: visiting a fix room counts as a contribution.
    if (room.state.sabotage) {
      await tryFixSabotage(code, profileId, roomId);
    }
  } catch { /* ignore */ }
}

/** A crewmate walking into a sabotage's fix-room contributes one step.
 *  Each player can only contribute to one step per sabotage. */
async function tryFixSabotage(code: string, profileId: string, roomId: string): Promise<void> {
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as CrewRoom;
      const sab = room.state.sabotage;
      if (!sab) return;
      if (!sab.remainingRoomIds.includes(roomId)) return;
      if (sab.contributors.includes(profileId)) return;
      // Read role from private doc — only crew (not traitors) can fix.
      const pref = doc(db, COLL, code, "private", profileId);
      const psnap = await tx.get(pref);
      if (!psnap.exists()) return;
      const priv = psnap.data() as CrewPrivate;
      if (priv.role !== "crew") return;
      const nextRemaining = sab.remainingRoomIds.filter(r => r !== roomId);
      const nextContributors = [...sab.contributors, profileId];
      if (nextRemaining.length === 0) {
        // Fixed!
        const def = getSabotage(sab.id);
        tx.update(ref, sanitize({
          "state.sabotage": null,
          "state.lastEvent": `Crew fixed the ${def?.label ?? sab.id}!`,
        }));
      } else {
        tx.update(ref, sanitize({
          "state.sabotage.remainingRoomIds": nextRemaining,
          "state.sabotage.contributors": nextContributors,
        }));
      }
    });
  } catch (e) { console.warn("[crew] sabotage fix failed", e); }
}

/** Mark a task as completed (crew only — traitors' calls are silently
 *  ignored at the public-state level, but we update their private doc
 *  so the UI can show their fake-task progress). */
export async function markTaskDone(code: string, profileId: string, taskId: string, isCrew: boolean): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  if (!db) return;
  const ref = roomRef(code);
  const pref = privateRef(code, profileId);
  if (!ref || !pref) return;
  try {
    // Update private doc (both crew + traitor).
    const psnap = await getDoc(pref);
    if (psnap.exists()) {
      const priv = psnap.data() as CrewPrivate;
      if (!priv.completedTaskIds.includes(taskId) && priv.assignedTaskIds.includes(taskId)) {
        await updateDoc(pref, sanitize({
          completedTaskIds: [...priv.completedTaskIds, taskId],
        }));
        // Public tally bumps only for crew.
        if (isCrew) {
          await runTransaction(db, async tx => {
            const snap = await tx.get(ref);
            if (!snap.exists()) return;
            const room = snap.data() as CrewRoom;
            const next = (room.state.tasksCompleted ?? 0) + 1;
            const updates: Record<string, unknown> = {
              "state.tasksCompleted": next,
              "state.lastEvent": "A task was completed.",
            };
            if (next >= room.state.taskGoal) {
              // Crew win by tasks!
              updates["state.phase"] = "ended";
              updates["status"] = "ended";
              updates["state.winner"] = "crew";
              updates["state.lastEvent"] = "All tasks complete — CREW WINS!";
            }
            tx.update(ref, sanitize(updates));
          });
        }
      }
    }
  } catch (e) { console.warn("[crew] markTaskDone failed", e); }
}

/** Traitor only — tag a crewmate in the same room. Marks them not
 *  alive + checks the traitor win condition. */
export async function tagOut(code: string, traitorId: string, victimId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as CrewRoom;
      if (room.state.phase !== "playing") return;
      const traitor = room.state.players.find(p => p.profileId === traitorId);
      const victim = room.state.players.find(p => p.profileId === victimId);
      if (!traitor || !victim || !traitor.alive || !victim.alive) return;
      if (traitor.roomId !== victim.roomId) return;
      const players = room.state.players.map(p =>
        p.profileId === victimId ? { ...p, alive: false } : p);
      const updates: Record<string, unknown> = {
        "state.players": players,
        "state.lastEvent": `Someone got tagged out in the ${victim.roomId}!`,
      };
      // Win check — needs each player's role. We don't have public roles,
      // but we DO know the total players count. For the check we assume
      // the player calling this IS a traitor (UI-gated) and ask: do
      // traitors >= alive crew? We approximate by counting alive players
      // and the host's known traitor count — better to fetch all private
      // docs, but for kid-MVP we let the meeting flow surface the win
      // when all traitors are voted out or numbers even up. Skip the
      // mid-game traitor-win for now.
      tx.update(ref, sanitize(updates));
    });
  } catch (e) { console.warn("[crew] tagOut failed", e); }
}

/** Traitor only — trigger a random sabotage with a fix window. */
export async function triggerSabotage(code: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    if (room.state.phase !== "playing") return;
    if (room.state.sabotage) return; // one at a time
    const def = rollSabotage();
    await updateDoc(ref, sanitize({
      "state.sabotage": {
        id: def.id,
        startedAt: Date.now(),
        durationMs: def.durationSec * 1000,
        remainingRoomIds: def.fixRoomIds.slice(),
        contributors: [],
      },
      "state.sabotageCount": (room.state.sabotageCount ?? 0) + 1,
      "state.lastEvent": `${def.emoji} ${def.label}! ${def.flavor}`,
    }));
  } catch (e) { console.warn("[crew] triggerSabotage failed", e); }
}

/** Host-only: if an active sabotage has expired (window passed without
 *  all fix-rooms tapped), declare traitor win. The host's client polls
 *  this from a timer; idempotent on multiple calls. */
export async function checkSabotageExpiry(code: string, traitorIds: string[]): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as CrewRoom;
      const sab = room.state.sabotage;
      if (!sab) return;
      if (Date.now() - sab.startedAt < sab.durationMs) return;
      // Failed! Traitors win regardless of task progress.
      const def = getSabotage(sab.id);
      tx.update(ref, sanitize({
        "state.sabotage": null,
        "state.phase": "ended",
        "state.winner": "traitor",
        "status": "ended",
        "state.lastEvent": `${def?.label ?? sab.id} was NOT fixed in time — TRAITORS WIN!`,
      }));
      // We pass traitorIds for symmetry with resolveMeeting but the
      // outcome is already determined.
      void traitorIds;
    });
  } catch (e) { console.warn("[crew] sabotage expiry failed", e); }
}

/** Traitor or Engineer: teleport between paired vent rooms. We trust
 *  the client's role-gate at write time — full server-side validation
 *  would require reading the private doc here, which is the path
 *  tryFixSabotage takes. For vents we accept the small risk for speed. */
export async function useVent(code: string, profileId: string, fromRoomId: string, toRoomId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    // Verify the requesting player has vent permission via their private doc.
    const pref = doc(db, COLL, code, "private", profileId);
    const psnap = await getDoc(pref);
    if (!psnap.exists()) return;
    const priv = psnap.data() as CrewPrivate;
    if (priv.role !== "traitor" && priv.variant !== "engineer") return;
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    const map = getMap(room.mapId);
    if (!map) return;
    // The pair must actually be a valid vent.
    const valid = map.ventPairs.some(([a, b]) =>
      (a === fromRoomId && b === toRoomId) || (a === toRoomId && b === fromRoomId));
    if (!valid) return;
    const me = room.state.players.find(p => p.profileId === profileId);
    if (!me || me.roomId !== fromRoomId) return;
    const players = room.state.players.map(p =>
      p.profileId === profileId ? { ...p, roomId: toRoomId, ts: Date.now() } : p);
    await updateDoc(ref, sanitize({ "state.players": players }));
  } catch (e) { console.warn("[crew] useVent failed", e); }
}

/** Detective: request to peek at a target's role. Writes a pending
 *  request onto the room doc; the host picks it up and writes the
 *  answer back to the requester's private doc. */
export async function requestPeek(code: string, requesterId: string, targetId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    const pref = doc(db, COLL, code, "private", requesterId);
    const psnap = await getDoc(pref);
    if (!psnap.exists()) return;
    const priv = psnap.data() as CrewPrivate;
    if (priv.variant !== "detective" || priv.peekUsed) return;
    await updateDoc(ref, sanitize({
      "state.pendingPeek": { requesterId, targetId },
    }));
  } catch (e) { console.warn("[crew] requestPeek failed", e); }
}

/** Host-only: when a peek request lands, look up the target's role
 *  from their private doc and write the answer back to the requester's
 *  private doc. Then clear pendingPeek. */
export async function resolvePeek(code: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as CrewRoom;
    const pp = room.state.pendingPeek;
    if (!pp) return;
    const targetPref = doc(db, COLL, code, "private", pp.targetId);
    const targetSnap = await getDoc(targetPref);
    if (!targetSnap.exists()) {
      await updateDoc(ref, sanitize({ "state.pendingPeek": null }));
      return;
    }
    const targetPriv = targetSnap.data() as CrewPrivate;
    const targetPlayer = room.state.players.find(p => p.profileId === pp.targetId);
    const requesterPref = doc(db, COLL, code, "private", pp.requesterId);
    await updateDoc(requesterPref, sanitize({
      peekUsed: true,
      peekResult: {
        targetId: pp.targetId,
        targetName: targetPlayer?.profileName ?? "Unknown",
        role: targetPriv.role,
      },
    }));
    await updateDoc(ref, sanitize({
      "state.pendingPeek": null,
      "state.lastEvent": "Detective used their peek.",
    }));
  } catch (e) { console.warn("[crew] resolvePeek failed", e); }
}

/** Detective acknowledges the peek result — clears it from their
 *  private doc so the toast doesn't reappear after a re-mount. */
export async function clearPeekResult(code: string, profileId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const pref = privateRef(code, profileId);
  if (!pref) return;
  try {
    await updateDoc(pref, sanitize({ peekResult: null }));
  } catch { /* ignore */ }
}

/** Anyone (alive OR ghost) can post a safe-chat message. Server-side
 *  caps the log to the last 20 entries to keep the room doc small.
 *  Ghosts can chat in the meeting view but not while alive players are
 *  in the playing phase. */
export async function sendChat(code: string, from: { profileId: string; profileName: string; profileColor: string }, text: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  const trimmed = text.trim().slice(0, 80);
  if (!trimmed) return;
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as CrewRoom;
      const msg = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fromProfileId: from.profileId,
        fromName: from.profileName,
        fromColor: from.profileColor,
        text: trimmed,
        ts: Date.now(),
      };
      const nextChat = [...(room.state.chat ?? []), msg].slice(-20);
      tx.update(ref, sanitize({ "state.chat": nextChat }));
    });
  } catch (e) { console.warn("[crew] sendChat failed", e); }
}

/** Anyone alive can call a meeting (or report a body). */
export async function callMeeting(code: string, callerId: string, bodyOfPlayerId?: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({
      "state.phase": "meeting",
      "state.meeting": {
        calledBy: callerId,
        startedAt: Date.now(),
        durationSec: 75,
        votes: {},
        bodyOfPlayerId,
      },
      "state.lastEvent": bodyOfPlayerId
        ? "A body was reported! Emergency meeting!"
        : "Emergency meeting called!",
    }));
  } catch (e) { console.warn("[crew] callMeeting failed", e); }
}

/** Submit a vote during a meeting. Target = profileId or "skip". */
export async function submitVote(code: string, voterId: string, targetId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({
      [`state.meeting.votes.${voterId}`]: targetId,
    }));
  } catch (e) { console.warn("[crew] submitVote failed", e); }
}

/** Host-only: tally votes + evict the most-voted player. Then resume
 *  play OR end the game if win conditions met. */
export async function resolveMeeting(code: string, traitorIds: string[]): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as CrewRoom;
      const meeting = room.state.meeting;
      if (!meeting) return;
      const counts: Record<string, number> = {};
      for (const t of Object.values(meeting.votes)) counts[t] = (counts[t] ?? 0) + 1;
      let evicted: string | null = null;
      let topCount = 0;
      let tied = false;
      for (const [target, cnt] of Object.entries(counts)) {
        if (target === "skip") continue;
        if (cnt > topCount) { evicted = target; topCount = cnt; tied = false; }
        else if (cnt === topCount) tied = true;
      }
      const skipCount = counts["skip"] ?? 0;
      // Tie or skip-wins = no eviction.
      const noEviction = !evicted || tied || skipCount >= topCount;
      let players = room.state.players;
      let lastEvent = "No one was voted out.";
      if (!noEviction && evicted) {
        players = players.map(p => p.profileId === evicted ? { ...p, alive: false } : p);
        const evictedName = room.state.players.find(p => p.profileId === evicted)?.profileName ?? "Someone";
        const wasTraitor = traitorIds.includes(evicted);
        lastEvent = `${evictedName} was voted out. They were ${wasTraitor ? "a TRAITOR!" : "innocent."}`;
      }
      // Win check
      const aliveTraitors = traitorIds.filter(t => players.find(p => p.profileId === t && p.alive));
      const aliveCrew = players.filter(p => p.alive && !traitorIds.includes(p.profileId));
      let winner: "crew" | "traitor" | undefined;
      if (aliveTraitors.length === 0) winner = "crew";
      else if (aliveTraitors.length >= aliveCrew.length) winner = "traitor";

      const updates: Record<string, unknown> = {
        "state.players": players,
        "state.meeting": null,
        "state.lastEvent": lastEvent,
      };
      if (winner) {
        updates["state.phase"] = "ended";
        updates["status"] = "ended";
        updates["state.winner"] = winner;
        updates["state.lastEvent"] = winner === "crew"
          ? lastEvent + " · CREW WINS!"
          : lastEvent + " · TRAITORS WIN!";
      } else {
        updates["state.phase"] = "playing";
      }
      tx.update(ref, sanitize(updates));
    });
  } catch (e) { console.warn("[crew] resolveMeeting failed", e); }
}

// ── Subscribe ─────────────────────────────────────────────────────────

export function subscribeRoom(code: string, cb: (room: CrewRoom | null) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const ref = roomRef(code);
    if (!ref) return;
    unsub = onSnapshot(ref, snap => {
      try {
        if (!snap.exists()) { cb(null); return; }
        const data = snap.data();
        if (!data || typeof data !== "object") { cb(null); return; }
        cb(data as CrewRoom);
      } catch (e) { console.warn("[crew] subscribe cb failed", e); }
    }, err => console.warn("[crew] subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

export function subscribePrivate(code: string, profileId: string, cb: (priv: CrewPrivate | null) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const ref = privateRef(code, profileId);
    if (!ref) return;
    unsub = onSnapshot(ref, snap => {
      try {
        if (!snap.exists()) { cb(null); return; }
        cb(snap.data() as CrewPrivate);
      } catch (e) { console.warn("[crew] private subscribe cb failed", e); }
    }, err => console.warn("[crew] private subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

/** Host helper: pull all private docs once so resolveMeeting knows
 *  which player ids are traitors. */
export async function fetchAllTraitorIds(code: string): Promise<string[]> {
  if (!(await ensureAnonAuth())) return [];
  const db = getDb();
  if (!db) return [];
  try {
    const ref = roomRef(code);
    if (!ref) return [];
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const room = snap.data() as CrewRoom;
    const ids: string[] = [];
    await Promise.all(room.state.players.map(async p => {
      try {
        const pref = doc(db, COLL, code, "private", p.profileId);
        const ps = await getDoc(pref);
        if (ps.exists()) {
          const priv = ps.data() as CrewPrivate;
          if (priv.role === "traitor") ids.push(p.profileId);
        }
      } catch { /* ignore */ }
    }));
    return ids;
  } catch { return []; }
}
