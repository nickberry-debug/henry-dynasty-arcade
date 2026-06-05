// Generic cloud-sync wrapper around per-profile localStorage blobs.
//
// Pattern: each "blob" is a JSON value addressed by (profileId, blobKey).
// It's stored locally in localStorage AND mirrored to Firestore at
// /rooms/{code}/profiles/{profileId}/blobs/{blobKey}.
//
// Sync semantics:
//   - get(): returns the local copy synchronously. Falls back to default
//     if missing. Always available offline.
//   - set(): writes locally synchronously, then write-throughs to the
//     cloud in the background. Failures are logged, never thrown — local
//     writes never block on the network.
//   - pull(): one-shot best-effort fetch from the cloud + overwrite local
//     if the remote is newer (last-writer-wins on _ts). Call on app launch
//     so other family devices' updates land.
//
// Auto-room: on first launch, a 6-char room code is created so every
// device on the same arcade account shares a single dataset. The code is
// printable + shareable (Settings -> Sync) for joining a second device.

import { ensureAnonAuth, getDb, getRoomCode, setRoomCode, startNewRoom } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";

interface Wrapped<T> { v: T; _ts: number }

/** Local-only key for the wrapped blob. Keeps the cloud timestamp paired
 *  with the data so pull() can decide who wins. */
function lsKey(profileId: string, blobKey: string): string {
  return `cloud_blob::${profileId}::${blobKey}`;
}

function readLocal<T>(profileId: string, blobKey: string, fallback: T): Wrapped<T> {
  try {
    const raw = localStorage.getItem(lsKey(profileId, blobKey));
    if (raw) return JSON.parse(raw) as Wrapped<T>;
    // Legacy migration: if this is the first cloud-blob read for the key,
    // try the un-wrapped value at the OLD profile-scoped key path (the
    // caller passes the same blobKey we used pre-cloud). This is a one-time
    // adoption so existing local saves get carried into the wrapped/synced
    // world without the user losing anything.
    const legacy = localStorage.getItem(`prof_${profileId}::${blobKey}`);
    if (legacy) {
      try {
        const v = JSON.parse(legacy) as T;
        return { v, _ts: Date.now() - 1 }; // slightly stale so cloud can win if newer
      } catch { /* fall through */ }
    }
    return { v: fallback, _ts: 0 };
  } catch {
    return { v: fallback, _ts: 0 };
  }
}

function writeLocal<T>(profileId: string, blobKey: string, value: T, ts: number): void {
  try {
    localStorage.setItem(lsKey(profileId, blobKey), JSON.stringify({ v: value, _ts: ts }));
  } catch { /* quota / private mode — silent */ }
}

function firestoreRef(profileId: string, blobKey: string) {
  const code = getRoomCode();
  const db = getDb();
  if (!code || !db) return null;
  return doc(db, "rooms", code, "profiles", profileId, "blobs", blobKey);
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

/** Synchronous local read. Returns fallback if no value exists. */
export function getBlob<T>(profileId: string, blobKey: string, fallback: T): T {
  return readLocal(profileId, blobKey, fallback).v;
}

/** Synchronous local write + background write-through to Firestore. */
export function setBlob<T>(profileId: string, blobKey: string, value: T): void {
  const ts = Date.now();
  writeLocal(profileId, blobKey, value, ts);
  // Fire-and-forget cloud write.
  (async () => {
    try {
      if (!(await ensureAnonAuth())) return;
      const ref = firestoreRef(profileId, blobKey);
      if (!ref) return;
      await setDoc(ref, { v: sanitize(value), _ts: ts });
      markSyncedNow();
    } catch (err) {
      console.warn("[cloudBlob] write-through failed", profileId, blobKey, err);
    }
  })();
}

/** One-shot pull from cloud. If the cloud copy is newer than the local,
 *  overwrites local and returns the new value; otherwise returns local.
 *  Caller decides whether to refresh game state from the returned value. */
export async function pullBlob<T>(profileId: string, blobKey: string, fallback: T): Promise<T> {
  const local = readLocal(profileId, blobKey, fallback);
  try {
    if (!(await ensureAnonAuth())) return local.v;
    const ref = firestoreRef(profileId, blobKey);
    if (!ref) return local.v;
    const snap = await getDoc(ref);
    if (!snap.exists()) return local.v;
    const remote = snap.data() as Wrapped<T>;
    if (typeof remote?._ts !== "number") return local.v;
    if (remote._ts > local._ts) {
      writeLocal(profileId, blobKey, remote.v, remote._ts);
      return remote.v;
    }
    return local.v;
  } catch (err) {
    console.warn("[cloudBlob] pull failed", profileId, blobKey, err);
    return local.v;
  }
}

/** Live subscribe to a blob. The callback fires once with the current
 *  cloud value (if any newer than local) and then again on every remote
 *  change. Returns an unsubscribe; null if Firestore isn't configured.
 *
 *  This is the realtime upgrade over pullBlob(): another family device's
 *  changes now propagate to this device without a reload. */
export function subscribeBlob<T>(
  profileId: string,
  blobKey: string,
  onUpdate: (value: T, ts: number) => void,
): (() => void) {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const ref = firestoreRef(profileId, blobKey);
    if (!ref) return;
    try {
      unsub = onSnapshot(ref, snap => {
        try {
        if (!snap.exists()) return;
        const remote = snap.data() as Wrapped<T>;
        if (typeof remote?._ts !== "number") return;
        const local = readLocal<T>(profileId, blobKey, null as unknown as T);
        if (remote._ts > local._ts) {
          // Conflict-detection hook — if BOTH sides have data and the
          // local _ts is recent (within 60s) AND non-zero, treat the
          // remote-wins arrival as an LWW conflict. Keep a copy of the
          // about-to-be-overwritten local value so the UI can offer to
          // restore it. Routine first-write or empty-local cases don't
          // notify.
          const now = Date.now();
          const recentLocal = local._ts > 0 && (now - local._ts) < 60_000;
          const localCopy = local.v as unknown;
          writeLocal(profileId, blobKey, remote.v, remote._ts);
          markSyncedNow();
          if (recentLocal && JSON.stringify(localCopy) !== JSON.stringify(remote.v)) {
            recordConflict({
              profileId, blobKey,
              localTs: local._ts, remoteTs: remote._ts,
              localValue: localCopy, remoteValue: remote.v,
            });
          }
          onUpdate(remote.v, remote._ts);
        }
        } catch (e) { console.warn("[cloudBlob] callback failed", profileId, blobKey, e); }
      }, err => console.warn("[cloudBlob] subscribe error", profileId, blobKey, err));
    } catch (err) {
      console.warn("[cloudBlob] subscribe init failed", err);
    }
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

// ── Conflict log (last-writer-wins drops) ──────────────────────────────────
// When two devices edit the same blob within a short window and one's
// write loses to the other's by `_ts`, the loser was silently overwritten.
// We surface that in a small toast so the user can choose to restore the
// version they wrote. Conflicts are kept in-memory only — they're meant
// for momentary "did you mean to do that?" UI, not durable audit.

export interface Conflict {
  id: string;
  profileId: string;
  blobKey: string;
  localTs: number;
  remoteTs: number;
  localValue: unknown;
  remoteValue: unknown;
  noticedAt: number;
  /** Optional restore hook for non-cloudBlob conflicts (e.g. Dexie
   *  records). If set, restoreConflict() invokes this instead of the
   *  default setBlob path. */
  onRestore?: () => void;
}

const conflictBuf: Conflict[] = [];
const conflictListeners: Set<() => void> = new Set();

function recordConflict(c: Omit<Conflict, "id" | "noticedAt">): void {
  conflictBuf.push({ ...c, id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, noticedAt: Date.now() });
  // Cap so a stuck endless loop never balloons memory.
  if (conflictBuf.length > 20) conflictBuf.shift();
  for (const l of conflictListeners) { try { l(); } catch { /* ignore */ } }
}

/** Public API for other sync paths (Dexie records) to surface a
 *  last-writer-wins drop. Same shape as the cloudBlob-detected ones so
 *  the ConflictToast handles them identically. */
export function pushExternalConflict(c: Omit<Conflict, "id" | "noticedAt">): void {
  recordConflict(c);
}

export function getConflicts(): Conflict[] { return conflictBuf.slice(); }

export function subscribeConflicts(cb: () => void): () => void {
  conflictListeners.add(cb);
  return () => conflictListeners.delete(cb);
}

export function dismissConflict(id: string): void {
  const idx = conflictBuf.findIndex(c => c.id === id);
  if (idx >= 0) {
    conflictBuf.splice(idx, 1);
    for (const l of conflictListeners) { try { l(); } catch { /* ignore */ } }
  }
}

/** Restore the local value that was overwritten — re-writes it to both
 *  localStorage and Firestore with a new (newer) _ts so this device's
 *  prior write wins on the next sync round. Non-blob conflicts use the
 *  attached onRestore hook (Dexie record path). */
export function restoreConflict(id: string): void {
  const c = conflictBuf.find(x => x.id === id);
  if (!c) return;
  if (c.onRestore) { try { c.onRestore(); } catch (e) { console.warn("[cloudBlob] restore hook failed", e); } }
  else setBlob(c.profileId, c.blobKey, c.localValue);
  dismissConflict(id);
}

// ── Sync status (last successful sync + online listener) ───────────────────
// Lightweight observable that the SyncIndicator component reads. Updated
// every time we get a fresh write/subscribe payload from Firestore.
let lastSyncedAt: number = 0;
const syncListeners: Set<() => void> = new Set();

export function markSyncedNow(): void {
  lastSyncedAt = Date.now();
  for (const l of syncListeners) { try { l(); } catch { /* ignore */ } }
}

export function getLastSyncedAt(): number { return lastSyncedAt; }

export function subscribeSyncStatus(cb: () => void): () => void {
  syncListeners.add(cb);
  return () => syncListeners.delete(cb);
}

/** Ensure a family room code exists. Called once on app boot so the rest
 *  of the cloud layer "just works" — no manual room creation UI needed.
 *  Returns the active code. */
export function ensureFamilyRoom(): string {
  const existing = getRoomCode();
  if (existing) return existing;
  // No code yet — generate one. Persist immediately so subsequent calls
  // get the same code.
  const code = startNewRoom();
  return code;
}

/** Re-export so consumers don't need a separate firebase import. */
export { getRoomCode, setRoomCode };
