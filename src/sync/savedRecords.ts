// Generic Firestore sync for per-profile saved records (Dexie-backed
// games — Baseball leagues, Football leagues, Mogul studios). Each kind
// has its own subcollection under
//   /rooms/{code}/profiles/{profileId}/{kind}/{id}
//
// Pattern: write-through on every local save; one-shot best-effort pull
// after Dexie load. Last-writer-wins keyed on `modifiedAt`.

import { ensureAnonAuth, getDb, getRoomCode } from "./firebase";
import { doc, setDoc, deleteDoc, getDocs, collection, type DocumentData } from "firebase/firestore";
import { db as dexie } from "../db/dexie";
import type { Table } from "dexie";
// Reuses the same conflict bus the cloudBlob layer publishes to so the
// existing ConflictToast component picks up these without changes.
import { markSyncedNow, pushExternalConflict } from "./cloudBlob";

/** Saved records all share the same shape we care about for sync. */
interface SyncableRecord {
  id: string;
  profileId?: string;
  modifiedAt: number;
}

function recordRef(profileId: string, kind: string, id: string) {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return doc(fdb, "rooms", code, "profiles", profileId, kind, id);
}

function recordColl(profileId: string, kind: string) {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return collection(fdb, "rooms", code, "profiles", profileId, kind);
}

/** Firestore rejects `undefined`. Strip recursively before writing. */
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

/** Push one record to the cloud. Silent no-op if sync isn't configured.
 *  Profile id is required so cross-device this lands in the right slot. */
export async function pushRecord<T extends SyncableRecord>(
  kind: string,
  profileId: string,
  rec: T,
): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = recordRef(profileId, kind, rec.id);
  if (!ref) return;
  try {
    await setDoc(ref, sanitize(rec));
  } catch (err) {
    console.warn(`[sync] push ${kind}/${rec.id} failed`, err);
  }
}

/** Delete one record from the cloud. */
export async function deleteRecord(kind: string, profileId: string, id: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = recordRef(profileId, kind, id);
  if (!ref) return;
  try { await deleteDoc(ref); } catch (err) { console.warn(`[sync] delete ${kind}/${id} failed`, err); }
}

/** Pull every cloud record for this profile + kind, then write any that
 *  are newer than the local Dexie row into the given table. Returns the
 *  number of records that were updated locally. Best-effort, never throws.
 *
 *  Conflict detection: if a remote record overwrites a LOCAL record that
 *  was modifiedAt within the last 60 seconds AND the bodies differ, we
 *  publish a Conflict via pushExternalConflict() so the existing
 *  ConflictToast surfaces it. The onRestore hook re-writes the LOCAL
 *  copy back to Dexie with a fresh modifiedAt and pushes it to Firestore
 *  so it wins the next sync round. */
export async function pullIntoDexie<T extends SyncableRecord>(
  kind: string,
  profileId: string,
  table: Table<T, string>,
): Promise<number> {
  if (!(await ensureAnonAuth())) return 0;
  const coll = recordColl(profileId, kind);
  if (!coll) return 0;
  try {
    const snap = await getDocs(coll);
    let updated = 0;
    const ops: Promise<unknown>[] = [];
    snap.forEach(d => {
      const remote = d.data() as DocumentData as T;
      if (!remote || typeof remote.modifiedAt !== "number") return;
      // Guard: only adopt records whose profileId actually matches.
      if (remote.profileId && remote.profileId !== profileId) return;
      ops.push((async () => {
        const local = await table.get(remote.id);
        if (!local) {
          await table.put(remote);
          updated++;
          return;
        }
        if (remote.modifiedAt > local.modifiedAt) {
          // Conflict check before overwriting.
          const now = Date.now();
          const recentLocal = (now - local.modifiedAt) < 60_000;
          const bodiesDiffer = JSON.stringify(local) !== JSON.stringify(remote);
          if (recentLocal && bodiesDiffer) {
            // Snapshot the local copy so the restore hook can put it back.
            const localCopy: T = { ...local };
            pushExternalConflict({
              profileId,
              blobKey: kind,
              localTs: local.modifiedAt,
              remoteTs: remote.modifiedAt,
              localValue: localCopy,
              remoteValue: remote,
              onRestore: () => {
                // Re-stamp the local copy newer and write it back to
                // Dexie + Firestore so it wins the LWW next round.
                const restored: T = { ...localCopy, modifiedAt: Date.now() };
                table.put(restored).then(() => pushRecord(kind, profileId, restored)).catch(() => { /* ignore */ });
              },
            });
          }
          await table.put(remote);
          updated++;
        }
      })());
    });
    if (updated > 0) markSyncedNow();
    await Promise.all(ops);
    return updated;
  } catch (err) {
    console.warn(`[sync] pullIntoDexie ${kind} failed`, err);
    return 0;
  }
}

/** Convenience: kick off a pull in the background and return immediately. */
export function backgroundPull<T extends SyncableRecord>(
  kind: string,
  profileId: string,
  table: Table<T, string>,
  onUpdated?: (count: number) => void,
): void {
  pullIntoDexie(kind, profileId, table).then(n => {
    if (n > 0) onUpdated?.(n);
  }).catch(err => console.warn(`[sync] background pull ${kind}`, err));
}

// Re-export the Dexie singleton so callers don't need a second import.
export { dexie };
