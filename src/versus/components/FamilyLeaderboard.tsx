// src/versus/components/FamilyLeaderboard.tsx
//
// Family leaderboard view for /versus hub — shows every profile's combat
// sports W/L per sport (boxing + wrestling), plus their signature counts
// (KOs / finishers) pulled from `henry-versus-records-v1`.
//
// Renders inline in the Hub — no separate route — so a kid can glance at
// "who's ahead" before picking a sport.

import { useMemo } from "react";
import { loadProfiles } from "../../profiles/store";
import { getAllRecords, type CombatRecord } from "../records";
import type { Sport } from "../types";

interface Row {
  profileId: string;
  profileName: string;
  profileColor: string;
  boxing: CombatRecord;
  wrestling: CombatRecord;
  totalWins: number;
}

const empty = (): CombatRecord => ({ wins: 0, losses: 0, ko_count: 0, finishers: 0 });

export function FamilyLeaderboard() {
  const rows: Row[] = useMemo(() => {
    const profiles = loadProfiles();
    const blob = getAllRecords();
    const r = profiles.map(p => {
      const boxing    = { ...empty(), ...(blob[`${p.id}-boxing`] ?? {}) };
      const wrestling = { ...empty(), ...(blob[`${p.id}-wrestling`] ?? {}) };
      return {
        profileId: p.id,
        profileName: p.name,
        profileColor: p.color,
        boxing,
        wrestling,
        totalWins: boxing.wins + wrestling.wins,
      };
    });
    return r.sort((a, b) => b.totalWins - a.totalWins);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 mt-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-bold tracking-wide text-white/90">FAMILY LEADERBOARD</h3>
        <span className="text-[10px] text-white/40">Boxing + Wrestling</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/50 border-b border-white/10">
              <th className="text-left py-1 pr-2">Profile</th>
              <th className="text-right py-1 px-1" title="Boxing W-L">🥊 W-L</th>
              <th className="text-right py-1 px-1" title="KOs">KO</th>
              <th className="text-right py-1 px-1" title="Wrestling W-L">🤼 W-L</th>
              <th className="text-right py-1 px-1" title="Finishers">FIN</th>
              <th className="text-right py-1 pl-1" title="Total wins">Σ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.profileId} className="border-b border-white/5">
                <td className="py-1 pr-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                    style={{ background: r.profileColor }}
                  />
                  <span className="text-white/90">{r.profileName}</span>
                </td>
                <td className="text-right py-1 px-1 tabular-nums text-white/80">{r.boxing.wins}-{r.boxing.losses}</td>
                <td className="text-right py-1 px-1 tabular-nums text-amber-300/90">{r.boxing.ko_count}</td>
                <td className="text-right py-1 px-1 tabular-nums text-white/80">{r.wrestling.wins}-{r.wrestling.losses}</td>
                <td className="text-right py-1 px-1 tabular-nums text-fuchsia-300/90">{r.wrestling.finishers}</td>
                <td className="text-right py-1 pl-1 font-semibold tabular-nums text-white">{r.totalWins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-white/40 mt-2 leading-snug">
        Records persist per-profile in this browser. Win 5 / 10 / 20 matches in a sport to unlock new arena backdrops.
      </div>
    </div>
  );
}

// Re-export sport list helper in case the hub wants per-sport breakdown later.
export const LEADERBOARD_SPORTS: Sport[] = ["boxing", "wrestling"];
