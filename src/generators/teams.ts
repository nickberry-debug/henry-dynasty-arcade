import type { Team, Stadium, Player } from "../store/types";
import { CITIES } from "../data/cities";
import { MASCOTS, pairScore, isBanned } from "../data/mascots";
import { PALETTES } from "../data/palettes";
import { MLB_TEAMS } from "../data/mlbTeams";
import { STADIUM_NAMES } from "../data/misc";
import { rand, irnd, choice, weighted, gauss, clamp, uid, shuffle } from "../utils/rand";
import { generatePlayer } from "./players";
import { SHAPE_IDS } from "./logoShapes";

function abbr(city: string, name: string): string {
  const stop = ["of","the","and","in","on","at","St."];
  const cleanCity = city.replace(/[^A-Za-z ]/g, "").split(" ").filter(w => !stop.includes(w))[0] || city;
  const c = cleanCity.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  const n = name.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase();
  return c + n;
}

export function generateTeam(opts: { year: number; existingNames?: Set<string>; divisionId?: number; mlbIndex?: number }): Team {
  const year = opts.year;
  const existing = opts.existingNames || new Set<string>();
  if (opts.mlbIndex != null) {
    const t = MLB_TEAMS[opts.mlbIndex];
    if (t) {
      const stadium: Stadium = {
        name: t.stadium,
        capacity: t.capacity,
        lf: t.lf, lcf: Math.round((t.lf + t.cf) / 2),
        cf: t.cf,
        rcf: Math.round((t.rf + t.cf) / 2),
        rf: t.rf,
        lfHeight: irnd(8, 37),
        rfHeight: irnd(8, 25),
        foul: irnd(40, 80),
        altitude: t.altitude,
        surface: t.surface,
        roof: t.roof,
        parkFactor: t.parkFactor
      };
      return {
        id: uid("t"),
        city: t.city, name: t.name, abbr: t.abbr,
        primary: t.primary, secondary: t.secondary, accent: t.accent,
        symbol: t.symbol, logoVariant: irnd(0, SHAPE_IDS.length - 1),
        established: 1901 + irnd(0, 60),
        divisionId: opts.divisionId ?? 0,
        stadium,
        wins: 0, losses: 0, runsScored: 0, runsAllowed: 0, playoffSeed: null,
        history: [], retiredNumbers: shuffle([3,4,7,8,11,12,14,17,21,24,32,41,42,44]).slice(0, irnd(0, 5)),
        rivalIds: [], budget: irnd(180, 280) * 1_000_000,
        managerName: generateManagerName(),
        managerStyle: { aggression: irnd(30, 90), quickHook: irnd(30, 90), bunt: irnd(20, 80), platoon: irnd(30, 90) }
      };
    }
  }
  // Fantasy mode
  let city = "", mascotName = "", symbol = "star";
  let attempts = 0;
  while (attempts++ < 400) {
    const c = choice(CITIES);
    // Score all mascots and pick weighted
    const scores = MASCOTS.map(m => pairScore(c.tags, m));
    const m = weighted(MASCOTS, scores);
    if (isBanned(c.name, m.name)) continue;
    const key = `${c.name} ${m.name}`;
    if (!existing.has(key)) {
      existing.add(key);
      city = c.name; mascotName = m.name; symbol = m.symbol;
      break;
    }
  }
  if (!city) { city = choice(CITIES).name; mascotName = choice(MASCOTS).name; }

  const palette = choice(PALETTES);
  const stadium = generateStadium();
  return {
    id: uid("t"),
    city, name: mascotName,
    abbr: abbr(city, mascotName),
    primary: palette.primary, secondary: palette.secondary, accent: palette.accent,
    symbol, logoVariant: irnd(0, SHAPE_IDS.length - 1),
    established: 1901 + irnd(0, 110),
    divisionId: opts.divisionId ?? 0,
    stadium,
    wins: 0, losses: 0, runsScored: 0, runsAllowed: 0, playoffSeed: null,
    history: [], retiredNumbers: [],
    rivalIds: [],
    budget: irnd(180, 280) * 1_000_000,
    managerName: generateManagerName(),
    managerStyle: {
      aggression: irnd(30, 90),
      quickHook: irnd(30, 90),
      bunt: irnd(20, 80),
      platoon: irnd(30, 90)
    }
  };
}

function generateStadium(): Stadium {
  const lf = irnd(310, 350);
  const cf = irnd(395, 430);
  const rf = irnd(310, 360);
  return {
    name: choice(STADIUM_NAMES),
    capacity: irnd(35000, 55000),
    lf, lcf: Math.round((lf + cf) / 2),
    cf, rcf: Math.round((rf + cf) / 2),
    rf,
    lfHeight: irnd(8, 37),
    rfHeight: irnd(8, 25),
    foul: irnd(40, 80),
    altitude: irnd(0, 5300),
    surface: rand() < 0.85 ? "grass" : "turf",
    roof: weighted(["open","retractable","dome"], [75, 15, 10]) as "open" | "retractable" | "dome",
    parkFactor: Math.round(clamp(gauss(100, 4), 90, 115))
  };
}

function generateManagerName(): string {
  const firsts = ["Bruce","Bob","Dave","Joe","Jim","Tony","Buck","Aaron","Brandon","Craig","Dusty","Bud","Bill","Mike","Tom","Ron","Charlie","Earl","Frank","Davey","Sparky","Whitey","Casey","Connie","Gene"];
  const lasts = ["Bochy","Maddon","Showalter","Roberts","Counsell","Hyde","Cora","Boone","Black","Servais","Melvin","Murphy","Cash","Mattingly","Snitker","Francona","Baker","Hinch","Quatraro","Mansolino","Kennedy"];
  return `${choice(firsts)} ${choice(lasts)}`;
}

// Generate balanced 45-man roster
export function generateRoster(teamId: string, year: number): Player[] {
  const players: Player[] = [];
  // 5 SP, 7 RP, 1 CL, 8 starters + 5 bench + 19 reserves = 45
  const plan: Array<{ pos: any; isPitcher: boolean; count: number }> = [
    { pos: "SP", isPitcher: true, count: 5 },
    { pos: "RP", isPitcher: true, count: 7 },
    { pos: "CL", isPitcher: true, count: 1 },
    { pos: "C",  isPitcher: false, count: 2 },
    { pos: "1B", isPitcher: false, count: 2 },
    { pos: "2B", isPitcher: false, count: 2 },
    { pos: "3B", isPitcher: false, count: 2 },
    { pos: "SS", isPitcher: false, count: 2 },
    { pos: "LF", isPitcher: false, count: 2 },
    { pos: "CF", isPitcher: false, count: 2 },
    { pos: "RF", isPitcher: false, count: 2 },
    { pos: "DH", isPitcher: false, count: 1 }
  ];
  for (const slot of plan) {
    for (let i = 0; i < slot.count; i++) {
      const p = generatePlayer({ year, isPitcher: slot.isPitcher, position: slot.pos, age: irnd(20, 36) });
      p.teamId = teamId;
      players.push(p);
    }
  }
  // Reserves (depth) — mix of young players
  const remaining = 45 - players.length;
  for (let i = 0; i < remaining; i++) {
    const isPitcher = rand() < 0.5;
    const pos = isPitcher
      ? choice(["SP","RP"]) as any
      : choice(["C","1B","2B","3B","SS","LF","CF","RF","UT"]) as any;
    const age = i < 8 ? irnd(19, 23) : irnd(22, 30);
    const p = generatePlayer({ year, isPitcher, position: pos, age });
    p.teamId = teamId;
    players.push(p);
  }
  return players;
}

export function computeDivisions(numTeams: number) {
  if (numTeams >= 16) return 4;
  if (numTeams >= 8) return 2;
  return 1;
}

export function assignDivisions(teams: Team[]) {
  const numDivs = computeDivisions(teams.length);
  const divisions = Array.from({ length: numDivs }, (_, i) => ({
    id: i,
    name: ["East","Central","West","North"][i] || `Div ${i + 1}`,
    teamIds: [] as string[]
  }));
  teams.forEach((t, idx) => {
    const did = idx % numDivs;
    t.divisionId = did;
    divisions[did].teamIds.push(t.id);
  });
  return divisions;
}
