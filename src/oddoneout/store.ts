// Odd One Out — per-profile stats. Cloud-synced via cloudBlob.

import { useEffect, useState } from "react";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";
import { emptyOddStats, type OddStats } from "./types";

const BASE_KEY = "dd_odd_stats";
const BLOB_KEY = "odd_stats_v1";
function lsKey(): string { return profileKey(BASE_KEY); }

function loadStats(): OddStats {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return emptyOddStats();
    const parsed = JSON.parse(raw) as OddStats;
    const merged = { ...emptyOddStats(), ...parsed };
    if (!merged.h2h || typeof merged.h2h !== "object") merged.h2h = {};
    return merged;
  } catch { return emptyOddStats(); }
}

function persist(s: OddStats): void {
  const pid = getActiveProfileId();
  try { localStorage.setItem(lsKey(), JSON.stringify(s)); } catch { /* ignore */ }
  if (pid) try { cloudSet(pid, BLOB_KEY, s); } catch { /* ignore */ }
}

export function useOddStats() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [stats, setStats] = useState<OddStats>(() => loadStats());
  useEffect(() => setStats(loadStats()), [pid]);
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<OddStats>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch {}
      setStats(s => ({ ...s, ...remote }));
    });
  }, [pid]);

  function recordMatch(args: {
    wonAsCrew?: boolean;
    wonAsOdd?: boolean;
    roundsPlayed?: number;
    opponentProfileIds?: string[];
  }) {
    setStats(prev => {
      const won = args.wonAsCrew || args.wonAsOdd;
      const next: OddStats = {
        ...prev,
        matches: prev.matches + 1,
        winsAsCrew: prev.winsAsCrew + (args.wonAsCrew ? 1 : 0),
        winsAsOdd: prev.winsAsOdd + (args.wonAsOdd ? 1 : 0),
        rounds: prev.rounds + (args.roundsPlayed ?? 0),
        h2h: { ...(prev.h2h ?? {}) },
      };
      for (const opp of args.opponentProfileIds ?? []) {
        const cur = next.h2h[opp] ?? { wins: 0, losses: 0 };
        next.h2h[opp] = {
          wins: cur.wins + (won ? 1 : 0),
          losses: cur.losses + (won ? 0 : 1),
        };
      }
      persist(next);
      return next;
    });
  }

  return { stats, recordMatch };
}
