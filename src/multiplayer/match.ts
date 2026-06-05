// Multiplayer foundation for live cross-device play.
//
// Designed for two-player matches today (Versus Mode); the room shape
// is extensible enough that future games (Crew Traitor, Odd One Out)
// can layer on more seats.
//
// Architecture:
//   /versusRooms/{code} — one Firestore document per match. Holds room
//                          metadata + the sport-specific shared state
//                          + the current round's picks.
//
// Privacy model (intentional kid-friendly simplification):
//   We do NOT use cryptographic commit-reveal. Picks ARE written to the
//   shared doc, but the client-side UI of player X never renders player
//   Y's pick until both have submitted. For a 6-year-old playing against
//   a sibling, that's plenty; nobody's opening DevTools to cheat. If we
//   ever need real privacy, swap to a hash-commit-then-reveal scheme.
//
// Host authority:
//   The room's hostId is the only client that advances phase after
//   resolution. Guests submit picks; host computes and writes the new
//   shared state. Avoids race conditions and double-resolves.

import {
  doc, setDoc, getDoc, deleteDoc, onSnapshot, updateDoc, runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonAuth, getDb } from "../sync/firebase";

// ── Types ─────────────────────────────────────────────────────────────

export type RoomStatus = "lobby" | "playing" | "done" | "abandoned";

export interface RoomPlayer {
  profileId: string;
  profileName: string;
  profileColor: string;
  teamId?: string;
  ready?: boolean;
  /** Last heartbeat ms — stale > 60s = disconnected. */
  ts: number;
}

export interface VersusRoom {
  code: string;
  sport: "baseball" | "football";
  status: RoomStatus;
  createdAt: number;
  hostId: string;
  /** length config — innings for baseball, quarters for football */
  length: number;
  host: RoomPlayer;
  guest?: RoomPlayer;
  /** Sport-specific shared state. Engine-shaped objects from versus/types. */
  sharedState?: unknown;
  /** Round counter — used as a key for picks so a late-arriving write
   *  from a previous round can't poison the next. */
  round: number;
  /** Picks for the current round. Cleared when the round resolves. */
  pickA?: unknown;
  pickB?: unknown;
  /** Most recent event string from the resolver, for the play feed. */
  lastEvent?: string;
}

// ── Room codes ────────────────────────────────────────────────────────
// Separate from the family-room sync code. Versus codes live in their
// own namespace so a multi-device family can share family-room data
// AND host a versus match between two of those devices.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip I, O, 0, 1
function generateCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

/** Normalize a user-typed code: uppercase, strip non-alphanumeric, must be 6 chars. */
export function normalizeRoomCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== 6) return null;
  return cleaned;
}

function roomRef(code: string) {
  const db = getDb();
  if (!db) return null;
  return doc(db, "versusRooms", code);
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

// ── Room lifecycle ────────────────────────────────────────────────────

export interface CreateRoomArgs {
  sport: "baseball" | "football";
  length: number;
  host: Omit<RoomPlayer, "ts">;
}

/** Host: create a fresh room and return its short code. Retries on
 *  collision (unlikely with a 6-char alphabet of ~32^6 = 1B options). */
export async function createRoom(args: CreateRoomArgs): Promise<string | null> {
  if (!(await ensureAnonAuth())) return null;
  const db = getDb();
  if (!db) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const ref = doc(db, "versusRooms", code);
    try {
      const created = await runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false;
        const room: VersusRoom = {
          code,
          sport: args.sport,
          status: "lobby",
          createdAt: Date.now(),
          hostId: args.host.profileId,
          length: args.length,
          host: { ...args.host, ts: Date.now() },
          round: 0,
        };
        tx.set(ref, sanitize(room));
        return true;
      });
      if (created) return code;
    } catch (e) {
      console.warn("[multiplayer] createRoom failed, retrying", e);
    }
  }
  return null;
}

export interface JoinResult {
  ok: boolean;
  reason?: "not_found" | "full" | "ended" | "network";
}

/** Guest: join an existing room by code. Sets guest fields atomically. */
export async function joinRoom(code: string, guest: Omit<RoomPlayer, "ts">): Promise<JoinResult> {
  if (!(await ensureAnonAuth())) return { ok: false, reason: "network" };
  const ref = roomRef(code);
  if (!ref) return { ok: false, reason: "network" };
  const db = getDb();
  if (!db) return { ok: false, reason: "network" };
  try {
    return await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, reason: "not_found" as const };
      const room = snap.data() as VersusRoom;
      if (room.status === "done" || room.status === "abandoned") {
        return { ok: false, reason: "ended" as const };
      }
      if (room.guest && room.guest.profileId !== guest.profileId) {
        // Different guest already in the seat; only the same guest can re-join.
        // Stale heartbeat (>2 min) is treated as abandoned.
        if (Date.now() - (room.guest.ts ?? 0) < 120_000) {
          return { ok: false, reason: "full" as const };
        }
      }
      tx.update(ref, sanitize({
        guest: { ...guest, ts: Date.now() },
      }));
      return { ok: true };
    });
  } catch (e) {
    console.warn("[multiplayer] joinRoom failed", e);
    return { ok: false, reason: "network" };
  }
}

/** Heartbeat — call ~every 20s while in the room so stale-seat detection works. */
export async function heartbeat(code: string, seat: "host" | "guest"): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({ [`${seat}.ts`]: Date.now() }));
  } catch { /* ignore */ }
}

/** Mark this seat ready or not (lobby phase). */
export async function setReady(code: string, seat: "host" | "guest", ready: boolean): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({ [`${seat}.ready`]: ready, [`${seat}.ts`]: Date.now() }));
  } catch { /* ignore */ }
}

/** Pick or change team in the lobby. */
export async function setTeam(code: string, seat: "host" | "guest", teamId: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({ [`${seat}.teamId`]: teamId, [`${seat}.ts`]: Date.now() }));
  } catch { /* ignore */ }
}

/** Host starts the match. Writes the initial sharedState (the page
 *  computes the sport-specific defaults). */
export async function startMatch(code: string, initialState: unknown): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({
      status: "playing",
      sharedState: initialState,
      round: 0,
      pickA: null, pickB: null,
    }));
  } catch (e) { console.warn("[multiplayer] startMatch failed", e); }
}

/** Submit your pick for the current round. */
export async function submitPick(
  code: string, seat: "host" | "guest", round: number, pick: unknown,
): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    // Only write if the round number matches — guard against late
    // writes from a previous round.
    const db = getDb();
    if (!db) return;
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as VersusRoom;
      if (room.round !== round) return; // stale write
      const field = seat === "host" ? "pickA" : "pickB";
      tx.update(ref, sanitize({ [field]: pick }));
    });
  } catch (e) { console.warn("[multiplayer] submitPick failed", e); }
}

/** Host-only: after both picks land and the engine resolves, write the
 *  new sharedState, bump the round, clear picks, and stamp the event. */
export async function advanceRound(
  code: string, nextRound: number, sharedState: unknown, lastEvent: string,
): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({
      sharedState, round: nextRound, pickA: null, pickB: null, lastEvent,
    }));
  } catch (e) { console.warn("[multiplayer] advanceRound failed", e); }
}

/** Host-only: end the match cleanly. */
export async function endMatch(code: string, sharedState: unknown, lastEvent: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({ status: "done", sharedState, lastEvent }));
  } catch (e) { console.warn("[multiplayer] endMatch failed", e); }
}

/** Either seat: leave. Doesn't delete the room (host can rejoin); the
 *  status flip stops the other side from picking. */
export async function leaveRoom(code: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try { await deleteDoc(ref); } catch { /* ignore */ }
}

// ── Subscribe ─────────────────────────────────────────────────────────

/** Subscribe to room updates. Returns an unsubscribe. Callback fires
 *  with null when the room is deleted or unreachable. */
export function subscribeRoom(code: string, cb: (room: VersusRoom | null) => void): () => void {
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
        cb(data as VersusRoom);
      } catch (e) { console.warn("[multiplayer] subscribe callback failed", e); }
    }, err => console.warn("[multiplayer] subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

/** One-shot fetch, used by the join page to validate a code before
 *  navigating to the lobby. */
export async function fetchRoom(code: string): Promise<VersusRoom | null> {
  if (!(await ensureAnonAuth())) return null;
  const ref = roomRef(code);
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as VersusRoom;
  } catch { return null; }
}
