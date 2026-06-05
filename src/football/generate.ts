// Football league generator — creates teams, fills 53-man rosters with
// position-appropriate players, builds an 8-division (4 per conference)
// schedule. Reuses the shared name pool + cities + palettes so vibes
// match baseball.
import type { FootballLeague, FootballTeam, FootballPlayer, FootballPosition, FootballGame } from "./types";
import { emptyStats } from "./types";
import { rand, irnd, choice, uid } from "../utils/rand";
import { FIRST_NAMES, LAST_NAMES } from "../data/names";
import { CITIES } from "../data/cities";
import { MASCOTS } from "../data/mascots";
import { PALETTES } from "../data/palettes";

// Roster shape — 53-man, position counts mirror NFL practice
const ROSTER_COUNTS: Record<FootballPosition, number> = {
  QB: 3, RB: 4, FB: 1, WR: 6, TE: 3,
  OL: 9, DL: 8, LB: 7, CB: 5, S: 4,
  K: 1, P: 1,
};
// Total = 3+4+1+6+3+9+8+7+5+4+1+1 = 52 → add 1 more LB → 53

const POSITION_ORDER: FootballPosition[] = ["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"];

const TEAM_NAME_POOL = [
  "Wolves", "Hawks", "Eagles", "Bears", "Bulldogs", "Lions", "Knights", "Pirates",
  "Mustangs", "Cobras", "Titans", "Patriots", "Vipers", "Storm", "Lightning",
  "Thunder", "Bulls", "Sharks", "Falcons", "Outlaws", "Rangers", "Foxes",
  "Sentinels", "Crusaders", "Reapers", "Jets", "Saints", "Spartans", "Gladiators",
  "Buccaneers", "Drakes", "Phoenix",
];

export function createFootballLeague(opts: { numTeams: 8 | 16 | 24 | 32; season: number }): FootballLeague {
  const id = uid("fbl");
  const teams = generateTeams(opts.numTeams);
  const divisions = arrangeDivisions(teams);
  const players: FootballPlayer[] = [];
  for (const team of teams) {
    const roster = generateRoster(team.id);
    players.push(...roster);
    team.rosterOrder = roster.map(p => p.id);
  }
  const schedule = generateSchedule(teams, 17);
  return {
    id,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    name: `${opts.season} Gridiron League`,
    season: opts.season,
    week: 1,
    phase: "regular",
    teams,
    players,
    freeAgents: [],
    divisions,
    schedule,
    newsLog: [{
      id: uid("fn"),
      week: 0,
      season: opts.season,
      category: "Game",
      headline: `Kickoff! ${opts.numTeams}-team league set for the ${opts.season} season.`,
      important: true,
      emoji: "🏈",
    }],
    userTeamId: null,
    playoffsBracket: null,
    champion: null,
  };
}

function generateTeams(n: number): FootballTeam[] {
  const usedCities = new Set<string>();
  const usedNames = new Set<string>();
  const usedAbbrs = new Set<string>();
  const teams: FootballTeam[] = [];
  for (let i = 0; i < n; i++) {
    let city = choice(CITIES.filter(c => !usedCities.has(c.name)));
    if (!city) city = CITIES[i % CITIES.length];
    usedCities.add(city.name);

    let name = choice(TEAM_NAME_POOL.filter(t => !usedNames.has(t)));
    if (!name) name = TEAM_NAME_POOL[i % TEAM_NAME_POOL.length] + " " + (i + 1);
    usedNames.add(name);

    let abbr = name.slice(0, 3).toUpperCase();
    let bump = 0;
    while (usedAbbrs.has(abbr)) {
      abbr = name.slice(0, 2).toUpperCase() + (bump++);
      if (bump > 9) { abbr = `T${i}`; break; }
    }
    usedAbbrs.add(abbr);

    const palette = PALETTES[i % PALETTES.length];

    teams.push({
      id: uid("ft"),
      city: city.name,
      name,
      abbr,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent ?? palette.secondary,
      divisionId: i % 8,
      conferenceId: (i % 8) < 4 ? 0 : 1,
      wins: 0, losses: 0, ties: 0,
      pointsFor: 0, pointsAgainst: 0,
    });
  }
  return teams;
}

function arrangeDivisions(teams: FootballTeam[]) {
  const out = [] as FootballLeague["divisions"];
  for (let d = 0; d < 8; d++) {
    const members = teams.filter(t => t.divisionId === d).map(t => t.id);
    if (members.length === 0) continue;
    out.push({
      id: d,
      name: ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"][d],
      conferenceId: (d < 4 ? 0 : 1) as 0 | 1,
      teamIds: members,
    });
  }
  return out;
}

function generateRoster(teamId: string): FootballPlayer[] {
  const out: FootballPlayer[] = [];
  const usedJerseys = new Set<number>();
  // Pick an unused jersey from the preferred range; fall back to any
  // free [1,99] number if the preferred range is exhausted. Without the
  // fallback this is an infinite loop — the QB+WR+TE+K+P ranges all
  // overlap inside [1,19], and once those 19 slots are taken, the
  // do-while spins forever. (That bug is what was preventing the season
  // from launching at all.)
  function pickJersey(pos: FootballPosition): number {
    const [lo, hi] = jerseyRangeFor(pos);
    for (let attempt = 0; attempt < 40; attempt++) {
      const j = irnd(lo, hi);
      if (!usedJerseys.has(j)) return j;
    }
    // Preferred range full — find any free jersey at all.
    for (let j = 1; j <= 99; j++) if (!usedJerseys.has(j)) return j;
    // 99 jerseys all taken (shouldn't happen with a 53-slot roster).
    return 99;
  }
  for (const pos of POSITION_ORDER) {
    const count = ROSTER_COUNTS[pos];
    for (let i = 0; i < count; i++) {
      const j = pickJersey(pos);
      usedJerseys.add(j);
      out.push(generatePlayer(teamId, pos, j, i === 0 ? "starter" : "depth"));
    }
  }
  // Pad to 53 with an extra LB
  if (out.length < 53) {
    const j = pickJersey("LB");
    usedJerseys.add(j);
    out.push(generatePlayer(teamId, "LB", j, "depth"));
  }
  return out;
}

function jerseyRangeFor(pos: FootballPosition): [number, number] {
  if (pos === "QB") return [1, 19];
  if (pos === "RB" || pos === "FB") return [20, 39];
  if (pos === "WR" || pos === "TE") return [10, 19];
  if (pos === "OL") return [50, 79];
  if (pos === "DL") return [70, 99];
  if (pos === "LB") return [40, 59];
  if (pos === "CB" || pos === "S") return [20, 49];
  if (pos === "K" || pos === "P") return [1, 19];
  return [1, 99];
}

function generatePlayer(teamId: string, pos: FootballPosition, jersey: number, tier: "starter" | "depth"): FootballPlayer {
  const firstNames = FIRST_NAMES.US;
  const lastNames = LAST_NAMES.US;
  const firstName = choice(firstNames);
  const lastName = choice(lastNames);
  const age = irnd(22, 34);
  // Starters get higher overall
  const base = tier === "starter" ? irnd(70, 92) : irnd(55, 78);
  const potential = Math.min(99, base + irnd(0, 12));

  const r = {
    armStrength: 50, accuracy: 50, decision: 50,
    speed: 50, agility: 50, hands: 50, routeRunning: 50, breakTackle: 50,
    blocking: 50, passRush: 50, runDefense: 50,
    coverage: 50, tackling: 50, awareness: 50,
    kickPower: 50, kickAccuracy: 50,
    stamina: irnd(60, 95), composure: irnd(55, 90),
  };
  const tune = (k: keyof typeof r, baseRating: number) => { r[k] = Math.min(99, Math.max(20, Math.round(baseRating + (rand() - 0.5) * 16))); };
  if (pos === "QB") { tune("armStrength", base); tune("accuracy", base - 3); tune("decision", base - 5); }
  else if (pos === "RB" || pos === "FB") { tune("speed", base); tune("agility", base - 2); tune("breakTackle", base - 4); tune("hands", base - 10); }
  else if (pos === "WR" || pos === "TE") { tune("speed", base); tune("hands", base - 3); tune("routeRunning", base - 4); tune("agility", base - 2); }
  else if (pos === "OL") { tune("blocking", base); tune("awareness", base - 5); }
  else if (pos === "DL") { tune("passRush", base); tune("runDefense", base - 2); tune("tackling", base - 4); }
  else if (pos === "LB") { tune("tackling", base); tune("coverage", base - 6); tune("runDefense", base - 4); tune("awareness", base - 2); }
  else if (pos === "CB" || pos === "S") { tune("coverage", base); tune("speed", base - 2); tune("tackling", base - 6); tune("awareness", base - 3); }
  else if (pos === "K") { tune("kickPower", base); tune("kickAccuracy", base - 3); }
  else if (pos === "P") { tune("kickPower", base); tune("kickAccuracy", base - 5); }

  return {
    id: uid("fp"),
    firstName, lastName,
    name: `${firstName} ${lastName}`,
    jersey,
    position: pos,
    age,
    yearsExp: Math.max(0, age - 22),
    overall: base,
    potential,
    ratings: r,
    morale: irnd(60, 90),
    hot: 0,
    injury: null,
    teamId,
    retired: false,
    seasonStats: emptyStats(),
    careerStats: [],
    awards: [],
    prevOvr: base,
    appearance: { skinTone: irnd(0, 7), hairStyle: irnd(0, 9), faceShape: irnd(0, 5), portraitSeed: Math.floor(rand() * 1e9) },
  };
}

function generateSchedule(teams: FootballTeam[], weeks: number): FootballGame[] {
  // Simple round-robin-ish schedule — each team plays once per week, byes
  // distributed if odd, double up if needed to fill 17 weeks.
  const games: FootballGame[] = [];
  const ids = teams.map(t => t.id);

  for (let week = 1; week <= weeks; week++) {
    // Shuffle teams per week so matchups vary
    const shuffled = [...ids].sort(() => rand() - 0.5);
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const homeId = week % 2 === 0 ? shuffled[i] : shuffled[i + 1];
      const awayId = homeId === shuffled[i] ? shuffled[i + 1] : shuffled[i];
      games.push({
        id: uid("fg"),
        week,
        homeId,
        awayId,
        played: false,
      });
    }
  }
  return games;
}
