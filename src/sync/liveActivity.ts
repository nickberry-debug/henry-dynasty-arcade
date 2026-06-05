// Live activity feed — the lightweight multiplayer-live layer for the
// arcade. Any game writes "events" to /rooms/{code}/activity/{id} and
// the LiveActivityFeed component subscribes via onSnapshot, so when
// Henry on the iPad wins a Mech duel, Mom on the phone sees the
// celebration in real time.
//
// Events are append-only, capped to MAX_VISIBLE most recent — old ones
// fall off the feed naturally (Firestore retains them; the UI just
// stops showing them). Cheap, durable, no game-specific schema.

import { ensureAnonAuth, getDb, getRoomCode } from "./firebase";
import { addDoc, collection, onSnapshot, query, orderBy, limit, type DocumentData, type Unsubscribe } from "firebase/firestore";

export type ActivityKind =
  | "battleforge_win" | "battleforge_loss"
  | "mech_duel" | "mech_win"
  | "olympus_complete" | "olympus_levelup"
  | "cosmic_mission"
  | "temporal_resolved"
  | "mogul_release"
  | "potion_discovery"
  | "creature_evolve"
  | "spell_streak"
  | "baseball_win" | "football_win"
  | "generic";

export interface ActivityEvent {
  id?: string;             // Firestore assigns
  profileId: string;
  profileName: string;
  profileColor: string;
  gameId: string;          // logical game id matching the cards on Landing
  kind: ActivityKind;
  text: string;            // human-readable
  emoji?: string;
  /** Firestore-server timestamp (ms since epoch). */
  ts: number;
}

const COLL = "activity";
const MAX_VISIBLE = 18;

/** Append one event. Fire-and-forget; offline failures silently degrade. */
export async function postActivity(event: Omit<ActivityEvent, "ts" | "id">): Promise<void> {
  try {
    if (!(await ensureAnonAuth())) return;
    const code = getRoomCode();
    const fdb = getDb();
    if (!code || !fdb) return;
    const ref = collection(fdb, "rooms", code, COLL);
    await addDoc(ref, sanitize({ ...event, ts: Date.now() }));
  } catch (err) {
    console.warn("[liveActivity] post failed", err);
  }
}

/** Live subscribe to recent activity, newest first. */
export function subscribeActivity(cb: (events: ActivityEvent[]) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const code = getRoomCode();
    const fdb = getDb();
    if (!code || !fdb) return;
    const q = query(collection(fdb, "rooms", code, COLL), orderBy("ts", "desc"), limit(MAX_VISIBLE));
    unsub = onSnapshot(q, snap => {
      try {
        const list: ActivityEvent[] = [];
        snap.forEach(d => {
          try {
            const v = d.data() as DocumentData as ActivityEvent;
            if (v && typeof v.ts === "number" && typeof v.text === "string") {
              list.push({ ...v, id: d.id });
            }
          } catch (e) { console.warn("[liveActivity] bad doc skipped", d.id, e); }
        });
        cb(list);
      } catch (e) { console.warn("[liveActivity] callback failed", e); }
    }, err => console.warn("[liveActivity] subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

function sanitize<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(sanitize) as any;
  if (typeof v === "object") {
    const out: any = {};
    for (const [k, x] of Object.entries(v as any)) {
      if (x === undefined) continue;
      out[k] = sanitize(x);
    }
    return out;
  }
  return v;
}
