// Simple Season schedule: group stage (round-robin within division) then knockout bracket.
import type { Game, Team } from "../store/types";
import { uid } from "../utils/rand";

export function buildSimpleSeasonSchedule(teams: Team[], gamesPerTeam: number = 10): Game[] {
  const games: Game[] = [];
  // Round-robin within each division
  // Pair every team with every other team in their division ~equally
  // gamesPerTeam ~10 → each team plays ~10 games total
  let day = 0;
  const divs = Array.from(new Set(teams.map(t => t.divisionId)));
  for (const dId of divs) {
    const divTeams = teams.filter(t => t.divisionId === dId);
    if (divTeams.length < 2) continue;
    // Generate round-robin pairings
    const targetGames = gamesPerTeam;
    const pairs: Array<[Team, Team]> = [];
    for (let g = 0; g < targetGames; g++) {
      for (let i = 0; i < divTeams.length; i++) {
        const opp = divTeams[(i + 1 + (g % (divTeams.length - 1))) % divTeams.length];
        if (opp.id === divTeams[i].id) continue;
        // ensure unique direction per round
        if (g % 2 === 0) pairs.push([divTeams[i], opp]);
        else pairs.push([opp, divTeams[i]]);
      }
    }
    // Distribute across days
    for (let i = 0; i < pairs.length; i++) {
      const [h, a] = pairs[i];
      games.push({
        id: uid("g"),
        day: day + Math.floor(i / (divTeams.length / 2)),
        homeId: h.id,
        awayId: a.id,
        played: false,
        isPlayoff: false,
        score: null
      });
    }
    day += Math.ceil(pairs.length / (divTeams.length / 2)) + 1;
  }
  return games;
}
