// Olympus hero sync: push local hero updates to Firestore, subscribe to
// remote changes and push them into the Olympus store.
//
// Conflict resolution: last-writer-wins keyed on `modifiedAt`. When a
// remote update arrives with an older timestamp than the local hero,
// it's discarded — the local write will get pushed on its next save.
//
// Adventures sync the same way at /rooms/{code}/adventures/{id}.

import type { Hero, Adventure } from "../olympus/types";
import { ensureAnonAuth, getDb, getRoomCode } from "./firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, type Unsubscribe } from "firebase/firestore";

const HEROES = "heroes";
const ADVENTURES = "adventures";

function roomDoc(collectionName: string, id: string) {
  const code = getRoomCode();
  const db = getDb();
  if (!code || !db) return null;
  return doc(db, "rooms", code, collectionName, id);
}

function roomColl(collectionName: string) {
  const code = getRoomCode();
  const db = getDb();
  if (!code || !db) return null;
  return collection(db, "rooms", code, collectionName);
}

/** Push a hero to the cloud. Silent no-op if sync isn't configured. */
export async function pushHero(hero: Hero): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomDoc(HEROES, hero.id);
  if (!ref) return;
  try {
    await setDoc(ref, sanitize(hero), { merge: false });
  } catch (err) {
    console.warn("[sync] pushHero failed", err);
  }
}

export async function deleteHeroFromCloud(heroId: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomDoc(HEROES, heroId);
  if (!ref) return;
  try { await deleteDoc(ref); } catch (err) { console.warn("[sync] deleteHero failed", err); }
}

export async function pushAdventure(adv: Adventure): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = roomDoc(ADVENTURES, adv.id);
  if (!ref) return;
  try {
    await setDoc(ref, sanitize(adv), { merge: false });
  } catch (err) {
    console.warn("[sync] pushAdventure failed", err);
  }
}

/** Listen for remote hero changes. The callback fires on every snapshot
 *  with the FULL set of heroes in the room. Returns an unsubscribe. */
export function subscribeHeroes(cb: (heroes: Hero[]) => void): Unsubscribe | null {
  const coll = roomColl(HEROES);
  if (!coll) return null;
  return onSnapshot(query(coll), snap => {
    const heroes: Hero[] = [];
    snap.forEach(d => heroes.push(d.data() as Hero));
    cb(heroes);
  }, err => console.warn("[sync] heroes snapshot error", err));
}

export function subscribeAdventures(cb: (advs: Adventure[]) => void): Unsubscribe | null {
  const coll = roomColl(ADVENTURES);
  if (!coll) return null;
  return onSnapshot(query(coll), snap => {
    const advs: Adventure[] = [];
    snap.forEach(d => advs.push(d.data() as Adventure));
    cb(advs);
  }, err => console.warn("[sync] adventures snapshot error", err));
}

/** Firestore rejects `undefined` values inside objects. Strip them out
 *  recursively before writing. */
function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return (obj as any).map(sanitize) as any;
  if (typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return obj;
}
