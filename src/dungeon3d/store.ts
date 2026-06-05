// Dungeon 3D — per-profile save (parallel to the 2D version's store).
// Totals roll across runs; classes & gear come in later sessions.

import { useEffect, useState } from "react";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

const BLOB_KEY = "dungeon3d_save_v1";
const lsKey = () => profileKey(`dd_${BLOB_KEY}`);

export interface Dungeon3DSave {
  profileId: string;
  totalCoins: number;
  deepestLevel: number;
  totalKills: number;
  runsCompleted: number;
  modifiedAt: number;
}

function defaultSave(profileId: string): Dungeon3DSave {
  return { profileId, totalCoins: 0, deepestLevel: 0, totalKills: 0, runsCompleted: 0, modifiedAt: Date.now() };
}

function loadSave(profileId: string): Dungeon3DSave {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return defaultSave(profileId);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return { ...defaultSave(profileId), ...parsed };
  } catch { /* fall through */ }
  return defaultSave(profileId);
}

function persist(save: Dungeon3DSave) {
  try { localStorage.setItem(lsKey(), JSON.stringify(save)); } catch {}
  try { cloudSet(save.profileId, BLOB_KEY, save); } catch {}
}

export function useDungeon3D() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [save, setSave] = useState<Dungeon3DSave>(() => loadSave(pid ?? "guest"));
  useEffect(() => { setSave(loadSave(pid ?? "guest")); }, [pid]);
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<Dungeon3DSave>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch {}
      setSave({ ...defaultSave(pid), ...remote });
    });
  }, [pid]);

  function update(mut: (s: Dungeon3DSave) => Dungeon3DSave) {
    setSave(prev => {
      const next = { ...mut(prev), modifiedAt: Date.now() };
      persist(next);
      return next;
    });
  }

  return {
    save,
    finishRun(coins: number, kills: number, depth: number, cleared: boolean) {
      update(s => ({
        ...s,
        totalCoins: s.totalCoins + coins,
        totalKills: s.totalKills + kills,
        deepestLevel: Math.max(s.deepestLevel, depth),
        runsCompleted: s.runsCompleted + (cleared ? 1 : 0),
      }));
    },
  };
}
