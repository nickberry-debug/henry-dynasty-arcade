// Live battle broadcast — the host device writes lightweight frame
// snapshots to /rooms/{code}/liveBattle/current on a throttle (~250 ms)
// while a Battle Forge fight is in progress. Spectator devices subscribe
// to the same doc and re-render the bar HUD + log entries in real time.
//
// Intentionally NOT a full game-state mirror — that would require
// canvas-frame sync. The spectator gets the human-readable scoreboard:
// HP fractions per team, fighter labels, alive counts, the latest log
// line, and a "still active" heartbeat timestamp.

import { ensureAnonAuth, getDb, getRoomCode } from "./firebase";
import { doc, setDoc, deleteDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";

/** Tiny React hook for any page that wants to know "is anyone in the
 *  family currently battling?" — surfaces the host name + map for the
 *  WATCH LIVE pill on the Landing page. */
import { useEffect as useEffectReact, useState as useStateReact } from "react";
export function useLiveBattleSummary(): { hostName: string; mapName: string; color: string; phase: "battle" | "done" } | null {
  const [summary, setSummary] = useStateReact<{ hostName: string; mapName: string; color: string; phase: "battle" | "done" } | null>(null);
  useEffectReact(() => {
    return subscribeLiveBattle(f => {
      if (!f) { setSummary(null); return; }
      setSummary({ hostName: f.hostProfileName, mapName: f.mapName, color: f.hostProfileColor, phase: f.phase });
    });
  }, []);
  return summary;
}

export interface LiveBattleFrame {
  hostProfileId: string;
  hostProfileName: string;
  hostProfileColor: string;
  /** Team A is conventionally the host's team. */
  teamALabel: string;
  teamBLabel: string;
  aHp: number;
  aMax: number;
  bHp: number;
  bMax: number;
  aAlive: number;
  bAlive: number;
  mapName: string;
  /** Most recent log line (kill, special, draw, etc.) */
  lastLog?: string;
  /** Battle phase — "battle" while running, "done" when concluded. */
  phase: "battle" | "done";
  winner?: "A" | "B" | "draw";
  ts: number;
}

const DOC = "current";

function liveBattleRef() {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return doc(fdb, "rooms", code, "liveBattle", DOC);
}

function sanitize<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (typeof v === "object") {
    const out: any = {};
    for (const [k, x] of Object.entries(v as any)) {
      if (x === undefined) continue;
      out[k] = x;
    }
    return out;
  }
  return v;
}

/** Host: push the current battle state. Throttled by the caller. */
export async function pushLiveBattle(frame: LiveBattleFrame): Promise<void> {
  try {
    if (!(await ensureAnonAuth())) return;
    const ref = liveBattleRef();
    if (!ref) return;
    await setDoc(ref, sanitize(frame));
  } catch (err) {
    console.warn("[liveBattle] push failed", err);
  }
}

/** Host: clear the live battle doc when the player leaves the screen
 *  or the result is shown long enough that spectators don't need it. */
export async function clearLiveBattle(): Promise<void> {
  try {
    if (!(await ensureAnonAuth())) return;
    const ref = liveBattleRef();
    if (!ref) return;
    await deleteDoc(ref);
  } catch { /* ignore */ }
}

/** Spectator: subscribe to live frames. Cb fires with null when the
 *  doc disappears (battle ended + cleared). */
export function subscribeLiveBattle(cb: (frame: LiveBattleFrame | null) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const ref = liveBattleRef();
    if (!ref) return;
    unsub = onSnapshot(ref, snap => {
      try {
        if (!snap.exists()) { cb(null); return; }
        const data = snap.data();
        if (!data || typeof data !== "object") { cb(null); return; }
        cb(data as LiveBattleFrame);
      } catch (e) { console.warn("[liveBattle] callback failed", e); }
    }, err => console.warn("[liveBattle] subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}
