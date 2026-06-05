// ⚡ Survivor — per-profile meta-progression save. Run state lives in
// the page's own React state; this store tracks ONLY persistent things:
// coins carried between runs, best-time/level per hero, total kills/runs,
// purchased meta upgrades, unlocked heroes.

import { useEffect, useState } from "react";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";
import { getActiveProfileId, profileKey } from "../profiles/store";
import type { SurvivorSave } from "./types";

const BLOB_KEY = "survivor_save_v1";
function lsKey(): string { return profileKey(`dd_${BLOB_KEY}`); }

function defaultSave(profileId: string): SurvivorSave {
  return {
    profileId,
    coins: 0,
    bestTimeByHero: {},
    bestLevelByHero: {},
    totalKills: 0,
    totalRuns: 0,
    meta: {},
    unlocked: ["spartan", "huntress", "berserker", "monk", "mage", "pyrekit"],
    modifiedAt: Date.now(),
  };
}

function loadSave(profileId: string): SurvivorSave {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return defaultSave(profileId);
    return { ...defaultSave(profileId), ...JSON.parse(raw) };
  } catch { return defaultSave(profileId); }
}

function persist(save: SurvivorSave): void {
  try { localStorage.setItem(lsKey(), JSON.stringify(save)); } catch { /* ignore */ }
  try { cloudSet(save.profileId, BLOB_KEY, save); } catch { /* ignore */ }
}

export function useSurvivor() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);
  const [save, setSave] = useState<SurvivorSave>(() => loadSave(pid ?? "guest"));
  useEffect(() => setSave(loadSave(pid ?? "guest")), [pid]);
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<SurvivorSave>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch { /* ignore */ }
      setSave(remote);
    });
  }, [pid]);

  function update(mutator: (s: SurvivorSave) => SurvivorSave) {
    setSave(prev => {
      const next = { ...mutator(prev), modifiedAt: Date.now() };
      persist(next);
      return next;
    });
  }

  return {
    save,
    /** Apply a finished run's results. */
    finishRun(heroId: string, args: { elapsed: number; level: number; kills: number; coinsEarned: number }) {
      update(s => {
        const bestT = Math.max(s.bestTimeByHero[heroId] ?? 0, args.elapsed);
        const bestL = Math.max(s.bestLevelByHero[heroId] ?? 0, args.level);
        return {
          ...s,
          coins: s.coins + args.coinsEarned,
          bestTimeByHero: { ...s.bestTimeByHero, [heroId]: bestT },
          bestLevelByHero: { ...s.bestLevelByHero, [heroId]: bestL },
          totalKills: s.totalKills + args.kills,
          totalRuns: s.totalRuns + 1,
        };
      });
    },
    /** Buy or upgrade a meta-progression node. */
    buyMeta(upgradeId: string, cost: number) {
      update(s => {
        if (s.coins < cost) return s;
        return { ...s, coins: s.coins - cost, meta: { ...s.meta, [upgradeId]: (s.meta[upgradeId] ?? 0) + 1 } };
      });
    },
  };
}

/** Meta-upgrade catalog. Each level is +1 stat. Costs scale up. */
export const META_UPGRADES = [
  { id: "starting_hp",    name: "Tougher Hide",  emoji: "❤️", desc: "+10 max HP per level", maxLevel: 5, cost: (l: number) => 60 + l * 40 },
  { id: "starting_speed", name: "Fleet Foot",    emoji: "🥾", desc: "+5 speed per level",    maxLevel: 5, cost: (l: number) => 60 + l * 40 },
  { id: "starting_power", name: "Spinach Stash", emoji: "💪", desc: "+5% damage per level",  maxLevel: 5, cost: (l: number) => 80 + l * 50 },
  { id: "starting_luck",  name: "Lucky Charm",   emoji: "🍀", desc: "+5% drop chance",        maxLevel: 5, cost: (l: number) => 80 + l * 50 },
  { id: "starting_magnet",name: "Big Magnet",    emoji: "🧲", desc: "+10 pickup radius",      maxLevel: 5, cost: (l: number) => 60 + l * 40 },
];
