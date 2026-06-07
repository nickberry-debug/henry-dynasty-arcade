// Versus Mode — per-profile stats blob. Cloud-synced via cloudBlob.
// Matches the existing pattern used by survivor/creature/mech.

import { useEffect, useState } from "react";
import type { Sport, VersusStats } from "./types";
import { emptyStats } from "./types";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

const BASE_KEY = "dd_versus_stats";
const BLOB_KEY = "versus_stats_v1";
function lsKey(): string { return profileKey(BASE_KEY); }

function loadStats(): VersusStats {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as VersusStats;
    // Field-backfill migration: schema-safe merge with defaults.
    const def = emptyStats();
    return {
      ...def,
      ...parsed,
      matches: { ...def.matches, ...(parsed.matches ?? {}) },
      wins:    { ...def.wins,    ...(parsed.wins    ?? {}) },
      h2h:     parsed.h2h ?? {},
    };
  } catch { return emptyStats(); }
}

function persist(stats: VersusStats): void {
  const pid = getActiveProfileId();
  try { localStorage.setItem(lsKey(), JSON.stringify(stats)); } catch { /* ignore */ }
  if (pid) {
    try { cloudSet(pid, BLOB_KEY, stats); } catch { /* ignore */ }
  }
}

export function useVersusStats() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [stats, setStats] = useState<VersusStats>(() => loadStats());
  useEffect(() => setStats(loadStats()), [pid]);
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<VersusStats>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch {}
      setStats(s => ({ ...s, ...remote }));
    });
  }, [pid]);

  /** Record a Versus match result. opponentProfileId may be empty for
   *  guest opponents (no profile). Mutates stats then persists. */
  function recordMatch(args: {
    sport: Sport;
    youWon: boolean;
    opponentProfileId?: string;
    homersScored?: number;
    touchdownsScored?: number;
    kosScored?: number;
    finishersScored?: number;
    pickAccuracy?: { hits: number; total: number };
  }) {
    setStats(prev => {
      const next: VersusStats = JSON.parse(JSON.stringify(prev));
      next.matches[args.sport] = (next.matches[args.sport] ?? 0) + 1;
      if (args.youWon) next.wins[args.sport] = (next.wins[args.sport] ?? 0) + 1;
      if (args.homersScored) next.homers += args.homersScored;
      if (args.touchdownsScored) next.touchdowns += args.touchdownsScored;
      if (args.kosScored) next.kos = (next.kos ?? 0) + args.kosScored;
      if (args.finishersScored) next.finishers = (next.finishers ?? 0) + args.finishersScored;
      if (args.pickAccuracy) {
        next.pickAccuracyHits += args.pickAccuracy.hits;
        next.pickAccuracyTotal += args.pickAccuracy.total;
      }
      if (args.opponentProfileId) {
        if (!next.h2h[args.opponentProfileId]) {
          next.h2h[args.opponentProfileId] = {
            baseball: { w: 0, l: 0 }, football: { w: 0, l: 0 },
            boxing: { w: 0, l: 0 }, wrestling: { w: 0, l: 0 },
          };
        }
        // Back-fill boxing/wrestling buckets if loaded from an older blob.
        if (!next.h2h[args.opponentProfileId].boxing) {
          next.h2h[args.opponentProfileId].boxing = { w: 0, l: 0 };
        }
        if (!next.h2h[args.opponentProfileId].wrestling) {
          next.h2h[args.opponentProfileId].wrestling = { w: 0, l: 0 };
        }
        if (args.youWon) next.h2h[args.opponentProfileId][args.sport].w += 1;
        else             next.h2h[args.opponentProfileId][args.sport].l += 1;
      }
      persist(next);
      return next;
    });
  }

  return { stats, recordMatch };
}
