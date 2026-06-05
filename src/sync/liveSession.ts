// Live game-session presence — every game that wants to broadcast "I'm
// playing right now" writes here, one doc per profile at
// /rooms/{code}/liveSessions/{profileId}. Spectators subscribe to the
// collection and see what everyone in the family is up to in real time.
//
// This is the generalized foundation that replaces the
// Battle-Forge-only /liveBattle/current doc. Battle Forge keeps using
// its dedicated path for the rich spectator stream; this layer is for
// lightweight presence ("Beckett is in a Mech fight" / "Henry is on a
// Survivor run") so the Landing pill + Family Activity surface can
// pull from a single source.

import { ensureAnonAuth, getDb, getRoomCode } from "./firebase";
import {
  doc, setDoc, deleteDoc, onSnapshot, collection, query, type Unsubscribe,
} from "firebase/firestore";
import { useEffect, useState } from "react";

export type LiveSessionGameId =
  | "battleforge" | "mech" | "creature" | "survivor"
  | "olympus"    | "cosmic" | "temporal" | "mogul"
  | "baseball"   | "football" | "potionlab" | "wordplay";

export interface LiveSession {
  /** Profile that owns the session. */
  profileId: string;
  profileName: string;
  profileColor: string;
  /** Game id matching the Landing card. */
  gameId: LiveSessionGameId;
  /** Short human label of what they're doing — "Wild Hunt", "Rookie Yard fight", etc. */
  label: string;
  /** Optional secondary line — opponent name, level, etc. */
  detail?: string;
  /** Emoji for the activity pill. */
  emoji?: string;
  /** "active" while in progress; "done" briefly so spectators see the result before it clears. */
  phase: "active" | "done";
  /** Wall-clock when the session started (ms). */
  startedAt: number;
  /** Last heartbeat (ms). Stale sessions (>5min without update) are filtered out client-side. */
  ts: number;
  /** Optional path other devices can navigate to in order to spectate the
   *  rich live view. Currently only Battle Forge has one (/battleforge/spectate). */
  spectateHref?: string;
}

function sessionRef(profileId: string) {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return doc(fdb, "rooms", code, "liveSessions", profileId);
}

function sessionsColl() {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return collection(fdb, "rooms", code, "liveSessions");
}

function sanitize<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x === undefined) continue;
      out[k] = x;
    }
    return out as T;
  }
  return v;
}

/** Publish or update the calling profile's active session doc. Call when
 *  a game starts and again when it ends (with phase="done"). Stale docs
 *  auto-time-out after ~5 minutes on the read side. */
export async function publishSession(session: Omit<LiveSession, "ts">): Promise<void> {
  try {
    if (!(await ensureAnonAuth())) return;
    const ref = sessionRef(session.profileId);
    if (!ref) return;
    await setDoc(ref, sanitize({ ...session, ts: Date.now() }));
  } catch (err) {
    console.warn("[liveSession] publish failed", err);
  }
}

/** Clear the calling profile's session doc when they leave the game. */
export async function clearSession(profileId: string): Promise<void> {
  try {
    if (!(await ensureAnonAuth())) return;
    const ref = sessionRef(profileId);
    if (!ref) return;
    await deleteDoc(ref);
  } catch { /* ignore */ }
}

/** Subscribe to every live session in the family room. Stale entries
 *  (>5 min since last heartbeat) are filtered out by the consumer. */
export function subscribeSessions(cb: (sessions: LiveSession[]) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const coll = sessionsColl();
    if (!coll) return;
    unsub = onSnapshot(query(coll), snap => {
      try {
        const list: LiveSession[] = [];
        const now = Date.now();
        snap.forEach(d => {
          try {
            const data = d.data();
            if (!data || typeof data !== "object") return;
            const s = data as LiveSession;
            // Stale guard — drop sessions older than 5 minutes.
            if (typeof s.ts !== "number" || now - s.ts > 5 * 60_000) return;
            list.push(s);
          } catch (e) { console.warn("[liveSession] bad doc skipped", d.id, e); }
        });
        // Newest first.
        list.sort((a, b) => b.ts - a.ts);
        cb(list);
      } catch (e) { console.warn("[liveSession] callback failed", e); }
    }, err => console.warn("[liveSession] subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

/** React hook — returns the list of currently-active sessions for a
 *  family room. Filters out the caller's own session (so a player
 *  doesn't see "you are playing X" in their own banner). */
export function useFamilyLiveSessions(excludeProfileId?: string): LiveSession[] {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  useEffect(() => subscribeSessions(setSessions), []);
  if (!excludeProfileId) return sessions;
  return sessions.filter(s => s.profileId !== excludeProfileId);
}
