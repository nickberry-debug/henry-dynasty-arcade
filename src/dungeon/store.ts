// Dungeon Crawler — per-profile save (Session 1: minimal).
// Tracks total coins ever earned + deepest level reached + total kills.
// Run-state is in-memory only this session; meta-progression is later.

import { useEffect, useState } from "react";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

const BLOB_KEY = "dungeon_save_v1";
const lsKey = () => profileKey(`dd_${BLOB_KEY}`);

export interface DungeonSave {
  profileId: string;
  totalCoins: number;
  deepestLevel: number;
  totalKills: number;
  runsCompleted: number;
  modifiedAt: number;
}

function defaultSave(profileId: string): DungeonSave {
  return { profileId, totalCoins: 0, deepestLevel: 0, totalKills: 0, runsCompleted: 0, modifiedAt: Date.now() };
}

function loadSave(profileId: string): DungeonSave {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return defaultSave(profileId);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return { ...defaultSave(profileId), ...parsed };
  } catch { /* fall through */ }
  return defaultSave(profileId);
}

function persist(save: DungeonSave): void {
  try { localStorage.setItem(lsKey(), JSON.stringify(save)); } catch { /* ignore */ }
  try { cloudSet(save.profileId, BLOB_KEY, save); } catch { /* ignore */ }
}

export function useDungeon() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [save, setSave] = useState<DungeonSave>(() => loadSave(pid ?? "guest"));
  useEffect(() => { setSave(loadSave(pid ?? "guest")); }, [pid]);
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<DungeonSave>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch {}
      setSave({ ...defaultSave(pid), ...remote });
    });
  }, [pid]);

  function update(mut: (s: DungeonSave) => DungeonSave) {
    setSave(prev => {
      const next = { ...mut(prev), modifiedAt: Date.now() };
      persist(next);
      return next;
    });
  }

  return {
    save,
    /** Apply a run's totals to the persistent save. */
    finishRun(coinsThisRun: number, killsThisRun: number, deepestThisRun: number, cleared: boolean) {
      update(s => ({
        ...s,
        totalCoins: s.totalCoins + coinsThisRun,
        totalKills: s.totalKills + killsThisRun,
        deepestLevel: Math.max(s.deepestLevel, deepestThisRun),
        runsCompleted: s.runsCompleted + (cleared ? 1 : 0),
      }));
    },
  };
}
