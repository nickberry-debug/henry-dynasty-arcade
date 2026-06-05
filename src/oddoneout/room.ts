// Odd One Out — N-player Firestore room. Same architectural patterns
// as /src/crewtraitor/room.ts: public state in the room doc, per-
// player private (role + secret word) in /private/{profileId}.
//
// Host authority: only the host writes role assignments and resolves
// the voting/reveal pipeline.

import {
  doc, setDoc, getDoc, deleteDoc, onSnapshot, updateDoc, runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonAuth, getDb } from "../sync/firebase";
import { getPack, rollPair, DEFAULT_PACK } from "./packs";
import type {
  OddGameState, OddPlayer, OddPrivate, OddRoundState,
} from "./types";

const COLL = "oddRooms";
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

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Public room shape ─────────────────────────────────────────────────

export type OddRoomStatus = "lobby" | "playing" | "ended";

export interface OddRoom {
  code: string;
  status: OddRoomStatus;
  createdAt: number;
  hostId: string;
  maxPlayers: number;
  state: OddGameState;
}

// ── Lifecycle ─────────────────────────────────────────────────────────

export async function createRoom(host: { profileId: string; profileName: string; profileColor: string }): Promise<string | null> {
  if (!(await ensureAnonAuth())) return null;
  const db = getDb();
  if (!db) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const ref = doc(db, COLL, code);
    try {
      const ok = await runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false;
        const room: OddRoom = {
          code,
          status: "lobby",
          createdAt: Date.now(),
          hostId: host.profileId,
          maxPlayers: 8,
          state: {
            phase: "lobby",
            packId: DEFAULT_PACK,
            players: [{ ...host, ts: Date.now() }],
            round: null,
            scores: { [host.profileId]: 0 },
          },
        };
        tx.set(ref, sanitize(room));
        return true;
      });
      if (ok) return code;
    } catch (e) { console.warn("[odd] createRoom failed", e); }
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
      const room = snap.data() as OddRoom;
      if (room.status !== "lobby") return { ok: false, reason: "playing" as const };
      const players = room.state.players ?? [];
      const idx = players.findIndex(p => p.profileId === player.profileId);
      const me: OddPlayer = { ...player, ts: Date.now() };
      let nextPlayers: OddPlayer[];
      if (idx >= 0) {
        nextPlayers = players.map((p, i) => i === idx ? { ...p, ts: Date.now(), profileName: player.profileName, profileColor: player.profileColor } : p);
      } else {
        if (players.length >= (room.maxPlayers ?? 8)) return { ok: false, reason: "full" as const };
        nextPlayers = [...players, me];
      }
      const scores = { ...(room.state.scores ?? {}), [player.profileId]: room.state.scores?.[player.profileId] ?? 0 };
      tx.update(ref, sanitize({ "state.players": nextPlayers, "state.scores": scores }));
      return { ok: true };
    });
  } catch (e) {
    console.warn("[odd] joinRoom failed", e);
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
    const room = snap.data() as OddRoom;
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
    const room = snap.data() as OddRoom;
    const players = room.state.players.map(p =>
      p.profileId === profileId ? { ...p, ready, ts: Date.now() } : p);
    await updateDoc(ref, sanitize({ "state.players": players }));
  } catch { /* ignore */ }
}

export async function setPack(code: string, packId: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try { await updateDoc(ref, sanitize({ "state.packId": packId })); } catch { /* ignore */ }
}

export async function leaveRoom(code: string, profileId: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as OddRoom;
    if (room.hostId === profileId) {
      await deleteDoc(ref);
    } else {
      const players = room.state.players.filter(p => p.profileId !== profileId);
      await updateDoc(ref, sanitize({ "state.players": players }));
    }
  } catch { /* ignore */ }
}

// ── Round lifecycle ───────────────────────────────────────────────────

/** Host-only: roll a random pair from the active pack, assign one
 *  player as Odd, write everyone's private doc, kick off clue phase. */
export async function startRound(code: string, roundNum: number): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as OddRoom;
  if (room.status !== "lobby" && room.state.phase !== "reveal" && room.state.phase !== "ended") {
    // Only start a round from lobby or post-reveal.
    if (room.state.phase !== "lobby") return;
  }
  const pack = getPack(room.state.packId) ?? getPack(DEFAULT_PACK)!;
  const rolled = rollPair(pack.id);
  if (!rolled) return;
  const players = room.state.players;
  if (players.length < 3) return;
  const order = shuffle(players.map(p => p.profileId));
  const oddOneId = order[Math.floor(Math.random() * order.length)];

  // Per-player private docs.
  await Promise.all(players.map(async p => {
    const priv: OddPrivate = {
      profileId: p.profileId,
      isOdd: p.profileId === oddOneId,
      secretWord: p.profileId === oddOneId ? null : rolled.pair.group,
      categoryHint: p.profileId === oddOneId ? pack.name : undefined,
    };
    const pref = privateRef(code, p.profileId);
    if (!pref) return;
    try { await setDoc(pref, sanitize(priv)); } catch { /* ignore */ }
  }));

  const round: OddRoundState = {
    num: roundNum,
    phase: "clues",
    packId: pack.id,
    clueOrder: order,
    currentClueIdx: 0,
    clues: [],
    discussionDurationSec: 60,
    votes: {},
  };

  await updateDoc(ref, sanitize({
    status: "playing",
    "state.phase": "clues",
    "state.round": round,
    "state.lastEvent": `Round ${roundNum} · clues phase`,
  }));
}

/** Submit a clue for the current clue-turn. Server-side checks the
 *  caller is the active turn-taker. */
export async function submitClue(code: string, profileId: string, text: string): Promise<void> {
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
      const room = snap.data() as OddRoom;
      const round = room.state.round;
      if (!round || round.phase !== "clues") return;
      const expected = round.clueOrder[round.currentClueIdx];
      if (expected !== profileId) return; // not your turn
      const clue = { profileId, text: trimmed, ts: Date.now() };
      const clues = [...round.clues, clue];
      const nextIdx = round.currentClueIdx + 1;
      const done = nextIdx >= round.clueOrder.length;
      const updates: Record<string, unknown> = {
        "state.round.clues": clues,
        "state.round.currentClueIdx": nextIdx,
      };
      if (done) {
        // Move to discussion phase.
        updates["state.phase"] = "discussion";
        updates["state.round.phase"] = "discussion";
        updates["state.round.discussionStartedAt"] = Date.now();
        updates["state.lastEvent"] = "All clues in — discussion time!";
      } else {
        const nextPid = round.clueOrder[nextIdx];
        const nextPlayer = room.state.players.find(p => p.profileId === nextPid);
        updates["state.lastEvent"] = `${nextPlayer?.profileName ?? "Next"} — your clue.`;
      }
      tx.update(ref, sanitize(updates));
    });
  } catch (e) { console.warn("[odd] submitClue failed", e); }
}

/** Host-only: bump the discussion timer by 30 seconds. */
export async function extendDiscussion(code: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as OddRoom;
    if (room.state.round?.phase !== "discussion") return;
    await updateDoc(ref, sanitize({
      "state.round.discussionDurationSec": (room.state.round.discussionDurationSec ?? 60) + 30,
    }));
  } catch { /* ignore */ }
}

/** Host-only: end discussion early, jump to voting. */
export async function openVoting(code: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({
      "state.phase": "voting",
      "state.round.phase": "voting",
      "state.lastEvent": "Vote on who you think is the Odd One Out.",
    }));
  } catch { /* ignore */ }
}

export async function submitVote(code: string, voterId: string, targetId: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    await updateDoc(ref, sanitize({
      [`state.round.votes.${voterId}`]: targetId,
    }));
  } catch { /* ignore */ }
}

/** Host-only: tally votes, decide outcome, advance to reveal. */
export async function resolveVote(code: string): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const db = getDb();
  const ref = roomRef(code);
  if (!db || !ref) return;
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as OddRoom;
      const round = room.state.round;
      if (!round || round.phase !== "voting") return;
      const counts: Record<string, number> = {};
      for (const t of Object.values(round.votes ?? {})) counts[t] = (counts[t] ?? 0) + 1;
      let evicted: string | null = null;
      let topCount = 0;
      let tied = false;
      for (const [target, cnt] of Object.entries(counts)) {
        if (cnt > topCount) { evicted = target; topCount = cnt; tied = false; }
        else if (cnt === topCount) tied = true;
      }
      // Look up who the Odd One is from their private doc.
      let oddOneId = "";
      let secretWord = "";
      for (const p of room.state.players) {
        const pref = doc(db, COLL, code, "private", p.profileId);
        const ps = await tx.get(pref);
        if (ps.exists()) {
          const priv = ps.data() as OddPrivate;
          if (priv.isOdd) { oddOneId = priv.profileId; }
          else if (!secretWord && priv.secretWord) { secretWord = priv.secretWord; }
        }
      }
      // Resolve: crew win if they voted out the Odd One. Tied/skip
      // votes mean the Odd One survives (Odd wins).
      const correctEvict = evicted === oddOneId && !tied;
      const oddOneWon = !correctEvict;
      const scores = { ...(room.state.scores ?? {}) };
      // Score: crew win → each non-odd alive player +1; odd win → odd +2.
      if (oddOneWon) {
        scores[oddOneId] = (scores[oddOneId] ?? 0) + 2;
      } else {
        for (const p of room.state.players) {
          if (p.profileId !== oddOneId) scores[p.profileId] = (scores[p.profileId] ?? 0) + 1;
        }
      }
      const reveal = {
        evictedId: evicted,
        oddOneId,
        secretWord,
        oddOneWon,
        wasTie: tied,
      };
      const evictedName = evicted ? room.state.players.find(p => p.profileId === evicted)?.profileName : null;
      const oddName = room.state.players.find(p => p.profileId === oddOneId)?.profileName ?? "Someone";
      const lastEvent =
        tied ? `Tied vote — Odd One (${oddName}) wins!`
        : correctEvict ? `Caught! ${oddName} was the Odd One. Crew wins!`
        : `${evictedName ?? "Someone"} was voted out — but the Odd One (${oddName}) escapes!`;
      tx.update(ref, sanitize({
        "state.phase": "reveal",
        "state.round.phase": "reveal",
        "state.round.reveal": reveal,
        "state.scores": scores,
        "state.lastEvent": lastEvent,
      }));
    });
  } catch (e) { console.warn("[odd] resolveVote failed", e); }
}

/** Host-only: end the match (back to lobby summary). */
export async function endMatch(code: string): Promise<void> {
  const ref = roomRef(code);
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data() as OddRoom;
    // Find highest score → winner.
    const scores = room.state.scores ?? {};
    let topId = "";
    let topScore = -1;
    for (const [pid, score] of Object.entries(scores)) {
      if (score > topScore) { topId = pid; topScore = score; }
    }
    await updateDoc(ref, sanitize({
      status: "ended",
      "state.phase": "ended",
      "state.winnerId": topId,
      "state.lastEvent": "Match over.",
    }));
  } catch { /* ignore */ }
}

// ── Subscriptions ────────────────────────────────────────────────────

export function subscribeRoom(code: string, cb: (room: OddRoom | null) => void): () => void {
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
        cb(data as OddRoom);
      } catch (e) { console.warn("[odd] subscribe cb failed", e); }
    }, err => console.warn("[odd] subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

export function subscribePrivate(code: string, profileId: string, cb: (priv: OddPrivate | null) => void): () => void {
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
        cb(snap.data() as OddPrivate);
      } catch (e) { console.warn("[odd] private cb failed", e); }
    }, err => console.warn("[odd] private subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}
