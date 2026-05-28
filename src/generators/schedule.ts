import type { Team, Game } from "../store/types";
import { uid, rand, shuffle } from "../utils/rand";

export function buildSchedule(teams: Team[], gamesPerTeam: number): Game[] {
  const games: Game[] = [];
  const remaining: Record<string, number> = {};
  teams.forEach(t => (remaining[t.id] = gamesPerTeam));
  const totalDays = Math.ceil((gamesPerTeam * teams.length / 2) / Math.max(1, Math.floor(teams.length / 2)));
  let day = 0;
  let safety = 0;
  while (teams.some(t => remaining[t.id] > 0) && safety++ < totalDays * 3) {
    const avail = teams.filter(t => remaining[t.id] > 0).map(t => t.id);
    const shuffled = shuffle(avail);
    const used = new Set<string>();
    for (let i = 0; i < shuffled.length; i++) {
      const a = shuffled[i];
      if (used.has(a)) continue;
      for (let j = i + 1; j < shuffled.length; j++) {
        const b = shuffled[j];
        if (used.has(b)) continue;
        const homeFirst = rand() < 0.5;
        games.push({
          id: uid("g"),
          day,
          homeId: homeFirst ? a : b,
          awayId: homeFirst ? b : a,
          played: false,
          isPlayoff: false,
          score: null
        });
        remaining[a]--; remaining[b]--;
        used.add(a); used.add(b);
        break;
      }
    }
    day++;
  }
  return games;
}
