// Per-profile "memory" — a rolling log of meaningful moments any game can
// write to so the arcade remembers what each player has said or done.
// Surfaced on the Family Stats / scorecard page and referenced by AI
// systems (Brewmaster narration, etc.) so the game can call back to past
// achievements ("Henry, you discovered Sleep Syrup last week — try it
// with willow bark this time").
//
// Storage: localStorage at `arcade_memory_v1::<profileId>`. Cloud-mirrored
// via cloudBlob.setBlob so memories follow the family across devices.
// Capped at MAX_PER_PROFILE entries per profile — newest first.

import { useEffect, useState } from "react";
import { setBlob, subscribeBlob } from "../sync/cloudBlob";

export type MemoryKind = "achievement" | "milestone" | "moment" | "quote" | "loss";

export interface Memory {
  id: string;
  profileId: string;
  gameId: string;
  kind: MemoryKind;
  /** Display text; written by the game in the player's voice or the
   *  narrator's voice. Kept short and concrete ("Brewed Calm Brew with
   *  river_pebble + moonwater + moss_of_quiet on the first try"). */
  text: string;
  /** Optional emoji prefix the UI can render. */
  emoji?: string;
  createdAt: number;
}

const MAX_PER_PROFILE = 200;

function lsKey(profileId: string): string {
  return `arcade_memory_v1::${profileId}`;
}

function readLocal(profileId: string): Memory[] {
  try {
    const raw = localStorage.getItem(lsKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocal(profileId: string, list: Memory[]): void {
  try { localStorage.setItem(lsKey(profileId), JSON.stringify(list)); } catch { /* ignore */ }
}

/** Append a memory for one profile. Caps the list at MAX_PER_PROFILE
 *  (newest kept). Cloud-syncs in the background. Safe to call from
 *  anywhere — pure side effect, never throws. */
export function addMemory(args: {
  profileId: string;
  gameId: string;
  kind: MemoryKind;
  text: string;
  emoji?: string;
}): void {
  if (!args.profileId || !args.text) return;
  const list = readLocal(args.profileId);
  const entry: Memory = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    profileId: args.profileId,
    gameId: args.gameId,
    kind: args.kind,
    text: args.text.trim().slice(0, 280),
    emoji: args.emoji,
    createdAt: Date.now(),
  };
  const next = [entry, ...list].slice(0, MAX_PER_PROFILE);
  writeLocal(args.profileId, next);
  try { setBlob(args.profileId, "memory_v1", next); } catch { /* ignore */ }
}

/** Read recent memories for a profile, newest first. */
export function getRecentMemories(profileId: string, limit = 25): Memory[] {
  return readLocal(profileId).slice(0, limit);
}

/** Same, filtered to a single game. Useful for AI prompts that want to
 *  recall what the player did in THIS app specifically. */
export function getMemoriesForGame(profileId: string, gameId: string, limit = 10): Memory[] {
  return readLocal(profileId).filter(m => m.gameId === gameId).slice(0, limit);
}

/** Reactive hook — returns the current memory list and re-renders when
 *  the cloud subscribe fires (another device added a memory). */
export function useMemories(profileId: string, limit = 25): Memory[] {
  const [list, setList] = useState<Memory[]>(() => readLocal(profileId).slice(0, limit));
  useEffect(() => {
    if (!profileId) return;
    setList(readLocal(profileId).slice(0, limit));
    return subscribeBlob<Memory[]>(profileId, "memory_v1", remote => {
      if (!Array.isArray(remote)) return;
      writeLocal(profileId, remote);
      setList(remote.slice(0, limit));
    });
  }, [profileId, limit]);
  return list;
}
