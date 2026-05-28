// Firebase init + anonymous auth + room-code identity.
//
// The "room code" is the shared key that links multiple devices to the
// same dataset. Each device authenticates anonymously (so writes pass
// Firestore rules), but everyone in a room reads/writes the same docs.
// This is how Henry on the iPad and Dad on the phone can both see all
// of Henry's Olympus heroes.

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase web client config for the "berry-arcade" project. These
// values are public-by-design — they identify the project, not
// authenticate it. The Firestore security rules in the Firebase Console
// are what actually gate read/write access. Anonymous auth is enabled
// so every device gets a uid that satisfies `request.auth != null` in
// the rules.
const firebaseConfig = {
  apiKey: "AIzaSyDSMC7R6S6BF1eCyr4eZwGRThsvw5ln6tM",
  authDomain: "berry-arcade.firebaseapp.com",
  projectId: "berry-arcade",
  storageBucket: "berry-arcade.firebasestorage.app",
  messagingSenderId: "250972445142",
  appId: "1:250972445142:web:a7076a0e3ac968d83b2c77",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authReady: Promise<void> | null = null;

/** True if the build has Firebase env vars set. When false, every sync
 *  call short-circuits and the app behaves as offline-local. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/** Lazy init — first caller wins, subsequent callers reuse. */
function ensureInit(): boolean {
  if (!isFirebaseConfigured()) return false;
  if (app) return true;
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    authReady = new Promise<void>(resolve => {
      onAuthStateChanged(auth!, user => { if (user) resolve(); });
      signInAnonymously(auth!).catch(err => {
        console.warn("[firebase] anonymous sign-in failed", err);
        // Resolve anyway so callers don't hang forever; subsequent writes
        // will fail with a permission error and surface in the UI.
        resolve();
      });
    });
    return true;
  } catch (err) {
    console.warn("[firebase] init failed", err);
    app = null;
    auth = null;
    db = null;
    return false;
  }
}

export async function ensureAnonAuth(): Promise<boolean> {
  if (!ensureInit()) return false;
  if (authReady) await authReady;
  return Boolean(auth?.currentUser);
}

export function getDb(): Firestore | null {
  if (!ensureInit()) return null;
  return db;
}

export function getCurrentUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

// ─── Room-code management ─────────────────────────────────────────────
// The room code is a 6-character upper-case string. Stored in
// localStorage so it survives reloads. To join an existing room, paste
// the code from the other device; both devices then read/write the same
// /rooms/{code}/* subtree.

const LS_ROOM_CODE = "dd_room_code";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip I, O, 0, 1 (look-alikes)

function generateRoomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export function getRoomCode(): string | null {
  try { return localStorage.getItem(LS_ROOM_CODE); } catch { return null; }
}

export function setRoomCode(code: string | null): void {
  try {
    if (code) localStorage.setItem(LS_ROOM_CODE, code.toUpperCase());
    else localStorage.removeItem(LS_ROOM_CODE);
  } catch {}
}

/** Generate a new room code, persist it, and return it. Use this for the
 *  "Start syncing" flow on the first device. */
export function startNewRoom(): string {
  const code = generateRoomCode();
  setRoomCode(code);
  return code;
}

/** Normalize a user-entered code: uppercase, strip non-alphanumeric.
 *  Returns null if it doesn't look like a valid 6-char code. */
export function normalizeRoomCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== 6) return null;
  return cleaned;
}
