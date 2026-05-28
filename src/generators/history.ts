import type { HistoryRecord, Team } from "../store/types";
import { rnd, irnd, choice } from "../utils/rand";
import { FIRST_NAMES, LAST_NAMES, NICKNAMES } from "../data/names";

function fakeName(): string {
  const origin = "US" as const;
  return `${choice(FIRST_NAMES[origin])} ${choice(LAST_NAMES[origin])}`;
}

export function generatePreHistory(teams: Team[], currentYear: number, years = 50): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  for (let y = currentYear - years; y < currentYear; y++) {
    const champion = choice(teams);
    let ru = choice(teams);
    while (ru.id === champion.id) ru = choice(teams);
    records.push({
      year: y,
      champion: champion.id,
      runnerUp: ru.id,
      champRecord: `${irnd(92, 108)}-${irnd(54, 70)}`,
      mvp: fakeName(),
      cy: fakeName(),
      roy: fakeName(),
      hrLeader: { name: fakeName(), hr: irnd(38, 64) },
      avgLeader: { name: fakeName(), avg: rnd(0.318, 0.392) },
      eraLeader: { name: fakeName(), era: rnd(1.92, 2.85) },
      notes: []
    });
  }
  return records;
}

export function legendaryRetiredPlayers(count: number, beforeYear: number) {
  // Generate flavor retired players for Hall of Fame seed
  const out: any[] = [];
  for (let i = 0; i < count; i++) {
    const nickname = choice(NICKNAMES);
    out.push({
      id: `legend_${i}`,
      name: fakeName(),
      nickname,
      hof: true,
      age: irnd(50, 90),
      retired: true,
      isPitcher: Math.random() < 0.4,
      awards: [],
      birthYear: beforeYear - irnd(45, 95)
    });
  }
  return out;
}
