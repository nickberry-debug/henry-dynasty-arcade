// Roster generation for the Sports Hub sports (Hockey, Basketball, CFB).
// Generates deterministic per-team rosters with names, positions, and
// ratings keyed off the team id + a global seed so the same team always
// has the same roster.
//
// Designed to be cheap (synthesized on demand, no storage) but
// comprehensive enough to drive the roster pages.

import type { SportId, Team } from "./franchise";
import { SPORT_CONFIGS, type SportPlayer } from "./franchise";

// Re-export the persisted player shape so callers don't have to know
// which file owns it. `Player` is the canonical SportPlayer alias.
export type Player = SportPlayer;

const FIRST = [
  "Tyler", "Marcus", "Devon", "Carter", "Ethan", "Jaxon", "Mateo", "Aiden", "Cole",
  "Quinn", "Riley", "Brody", "Reed", "Knox", "Maverick", "Bryce", "Hudson", "Cash",
  "Sloane", "Wyatt", "Asher", "Beau", "Theo", "Roman", "Tate", "Otto", "Cyrus",
  "Drew", "Soren", "Lev", "Kai", "Kade", "Linus", "Milo", "Mason", "Owen",
];
const LAST = [
  "Wallace", "Brooks", "Hayes", "Foster", "Park", "Reyes", "Beckett", "Hollis",
  "Mercer", "Vance", "Sage", "Stone", "Royce", "Tate", "Quill", "Marsh", "Pike",
  "Kerr", "Avery", "Hart", "Calder", "Holt", "Reeves", "Cross", "Vega", "Lock",
  "Beck", "Pavel", "Falk", "Stein", "Yu", "Kim", "Ng", "Diaz", "Cole", "Russo",
];

const HOCKEY_POSITIONS: Array<{ pos: string; count: number }> = [
  { pos: "G",  count: 2 },
  { pos: "D",  count: 6 },
  { pos: "C",  count: 4 },
  { pos: "LW", count: 4 },
  { pos: "RW", count: 4 },
];
const BBALL_POSITIONS: Array<{ pos: string; count: number }> = [
  { pos: "PG", count: 3 },
  { pos: "SG", count: 3 },
  { pos: "SF", count: 3 },
  { pos: "PF", count: 3 },
  { pos: "C",  count: 3 },
];
const CFB_POSITIONS: Array<{ pos: string; count: number }> = [
  { pos: "QB", count: 3 },
  { pos: "RB", count: 4 },
  { pos: "WR", count: 6 },
  { pos: "TE", count: 3 },
  { pos: "OL", count: 8 },
  { pos: "DL", count: 6 },
  { pos: "LB", count: 5 },
  { pos: "DB", count: 6 },
  { pos: "K",  count: 1 },
];

function rosterShape(sport: SportId) {
  return sport === "hockey" ? HOCKEY_POSITIONS
       : sport === "basketball" ? BBALL_POSITIONS
       : CFB_POSITIONS;
}

// Seedable RNG so the same team yields the same roster every render.
function rngFromSeed(seed: string): () => number {
  let s = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { s ^= seed.charCodeAt(i); s = Math.imul(s, 16777619); }
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Generate a deterministic roster for a team in a sport. */
export function generateRoster(team: Team, sport: SportId): Player[] {
  const shape = rosterShape(sport);
  const rand = rngFromSeed(`${sport}-${team.id}-v1`);
  const out: Player[] = [];
  const usedNumbers = new Set<number>();
  let starAssigned = false;

  // The team's star position (set on the team) gets the star player.
  const starPos = team.star.pos;

  for (const { pos, count } of shape) {
    for (let i = 0; i < count; i++) {
      const isStar = !starAssigned && pos === starPos;
      const name = isStar ? team.star.name
        : `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;

      // Jersey number — unique per team, sport-specific ranges.
      let num: number;
      let tries = 0;
      do {
        num = sport === "hockey" ? 1 + Math.floor(rand() * 98)
            : sport === "basketball" ? Math.floor(rand() * 55)
            : Math.floor(rand() * 99);
        tries++;
      } while (usedNumbers.has(num) && tries < 30);
      usedNumbers.add(num);

      // Rating — center on team rating, ±15 jitter, +5 for stars, +3 if matching team.star.pos.
      let rating = team.rating + Math.floor((rand() - 0.5) * 30);
      if (isStar) rating += 5;
      else if (pos === starPos) rating += 3;
      rating = Math.max(55, Math.min(99, rating));

      // Years on team (or class year for CFB). CFB rosters distribute
      // across all four classes — every team should have ~equal FR/SO/
      // JR/SR mix so graduation/recruiting churn looks natural year one.
      // (The legacy team.classYear field — uniform per team — is ignored
      // for the initial distribution; processCfbRollover takes over after.)
      const years = sport === "cfb"
        ? 1 + Math.floor(rand() * 4)
        : 1 + Math.floor(rand() * 8);

      // Age — CFB players are 18-22, pros are 20-37
      const age = sport === "cfb"
        ? 17 + years
        : 20 + Math.floor(rand() * 17);

      out.push({
        id: `${team.id}-${pos}-${i}`,
        teamId: team.id,
        name, number: num, position: pos, rating, star: isStar, years, age,
        seasonStats: {},
        careerStats: [],
        awards: [],
        prevRating: rating,
      });
      if (isStar) starAssigned = true;
    }
  }

  // If no star was assigned (team.star.pos didn't match any position in this shape),
  // bestow star status on the highest-rated player.
  if (!starAssigned && out.length > 0) {
    let best = out[0];
    for (const p of out) if (p.rating > best.rating) best = p;
    best.star = true;
    best.name = team.star.name;
  }

  return out.sort((a, b) => b.rating - a.rating);
}
