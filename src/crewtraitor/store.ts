// Crew Traitor — per-profile stats. Cloud-synced via cloudBlob like
// every other game's save.

import { useEffect, useState } from "react";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

export interface CrewStats {
  matches: number;
  winsAsCrew: number;
  winsAsTraitor: number;
  tasksDone: number;
  correctVotes: number;
  totalVotes: number;
  /** Per-opponent head-to-head record. Keyed by other profile id. */
  h2h?: Record<string, { wins: number; losses: number }>;
}

const BASE_KEY = "dd_crew_stats";
const BLOB_KEY = "crew_stats_v1";
function lsKey(): string { return profileKey(BASE_KEY); }

function emptyStats(): CrewStats {
  return { matches: 0, winsAsCrew: 0, winsAsTraitor: 0, tasksDone: 0, correctVotes: 0, totalVotes: 0, h2h: {} };
}

function loadStats(): CrewStats {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as CrewStats;
    const merged = { ...emptyStats(), ...parsed };
    // Field-backfill for the new h2h table.
    if (!merged.h2h || typeof merged.h2h !== "object") merged.h2h = {};
    return merged;
  } catch { return emptyStats(); }
}

function persist(s: CrewStats): void {
  const pid = getActiveProfileId();
  try { localStorage.setItem(lsKey(), JSON.stringify(s)); } catch { /* ignore */ }
  if (pid) try { cloudSet(pid, BLOB_KEY, s); } catch { /* ignore */ }
}

export function useCrewStats() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [stats, setStats] = useState<CrewStats>(() => loadStats());
  useEffect(() => setStats(loadStats()), [pid]);
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<CrewStats>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch {}
      setStats(s => ({ ...s, ...remote }));
    });
  }, [pid]);

  function recordMatch(args: {
    wonAsCrew?: boolean;
    wonAsTraitor?: boolean;
    /** Other family-profile ids in the match (excluding self). Win/loss
     *  credited against each. Online matches pass the room's player list;
     *  solo matches pass [] (bots aren't profiles). */
    opponentProfileIds?: string[];
  }) {
    setStats(prev => {
      const won = args.wonAsCrew || args.wonAsTraitor;
      const next: CrewStats = {
        ...prev,
        matches: prev.matches + 1,
        winsAsCrew: prev.winsAsCrew + (args.wonAsCrew ? 1 : 0),
        winsAsTraitor: prev.winsAsTraitor + (args.wonAsTraitor ? 1 : 0),
        h2h: { ...(prev.h2h ?? {}) },
      };
      for (const opp of args.opponentProfileIds ?? []) {
        const cur = next.h2h![opp] ?? { wins: 0, losses: 0 };
        next.h2h![opp] = {
          wins: cur.wins + (won ? 1 : 0),
          losses: cur.losses + (won ? 0 : 1),
        };
      }
      persist(next);
      return next;
    });
  }

  function recordTask() {
    setStats(prev => {
      const next = { ...prev, tasksDone: prev.tasksDone + 1 };
      persist(next);
      return next;
    });
  }

  function recordVote(correct: boolean) {
    setStats(prev => {
      const next = {
        ...prev,
        totalVotes: prev.totalVotes + 1,
        correctVotes: prev.correctVotes + (correct ? 1 : 0),
      };
      persist(next);
      return next;
    });
  }

  return { stats, recordMatch, recordTask, recordVote };
}
