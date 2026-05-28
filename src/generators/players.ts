import type { Player, PlayerAppearance, Position, Hand, Contract } from "../store/types";
import { FIRST_NAMES, LAST_NAMES, NICKNAMES, NameOrigin } from "../data/names";
import { TRAITS, Trait, PITCH_TYPES, WALK_UP_SONGS, CLOSER_ENTRANCES } from "../data/misc";
import { rand, irnd, gauss, clamp, choice, weighted, uid, rnd } from "../utils/rand";

const ORIGIN_DISTRIBUTION: Array<[NameOrigin, number]> = [
  ["US", 56], ["DR", 12], ["VEN", 10], ["CUB", 4], ["MEX", 5], ["PR", 6], ["CAN", 2]
];

const ORIGIN_BIRTHPLACES: Record<NameOrigin, string[]> = {
  US: ["California","Texas","Florida","New York","Pennsylvania","Illinois","Ohio","Georgia","Michigan","North Carolina","Virginia","Massachusetts","Indiana","Missouri","Tennessee","Maryland","Arizona","Wisconsin","Minnesota","Colorado","Alabama","South Carolina","Louisiana","Oregon","Oklahoma","Connecticut","Iowa","Mississippi","Kansas","Arkansas","Utah","Nevada","Kentucky"],
  DR: ["Santo Domingo","Santiago","San Pedro","La Romana","Bani","Boca Chica","Azua","Higuey"],
  VEN: ["Caracas","Maracaibo","Valencia","Barquisimeto","Maracay","Puerto La Cruz","Cumana","San Cristobal"],
  CUB: ["Havana","Santiago","Holguín","Camagüey","Pinar del Río"],
  MEX: ["Monterrey","Guadalajara","Mexico City","Tijuana","Hermosillo","Culiacán","Mazatlán"],
  PR: ["San Juan","Bayamón","Carolina","Caguas","Ponce"],
  CAN: ["Toronto","Vancouver","Montreal","Calgary","Edmonton","Ottawa"]
};

export function pickOrigin(): NameOrigin {
  return weighted(ORIGIN_DISTRIBUTION.map(x => x[0]), ORIGIN_DISTRIBUTION.map(x => x[1]));
}

export function generatePlayer(opts: { age?: number; position?: Position; isPitcher?: boolean; year: number; familyNames?: string[]; ghostLegacyName?: string } ): Player {
  const origin = pickOrigin();
  // K.6 — Family name pool: ~6% of generated players use a Henry-supplied family name
  const useFamily = opts.familyNames && opts.familyNames.length > 0 && rand() < 0.06;
  // K.9 — Throwback Ghost: rare descendant of a retired HoFer sharing the last name
  let firstName: string;
  let lastName: string;
  if (opts.ghostLegacyName) {
    firstName = choice(FIRST_NAMES[origin]);
    lastName = opts.ghostLegacyName;
  } else if (useFamily) {
    const fullName = choice(opts.familyNames!);
    const parts = fullName.split(" ");
    firstName = parts[0];
    lastName = parts.slice(1).join(" ") || choice(LAST_NAMES[origin]);
  } else {
    firstName = choice(FIRST_NAMES[origin]);
    lastName = choice(LAST_NAMES[origin]);
  }
  const age = opts.age ?? irnd(18, 40);
  const isPitcher = opts.isPitcher ?? rand() < 0.45;
  const position: Position = opts.position
    ? opts.position
    : (isPitcher
        ? (weighted<Position>(["SP","RP","CL"], [52, 38, 10]) as Position)
        : (weighted<Position>(["C","1B","2B","3B","SS","LF","CF","RF","DH"], [9, 10, 10, 10, 10, 10, 10, 10, 4]) as Position));

  // Hidden potential — 1% generational (95–99), 5% star (85–94), 20% solid (75–84), 40% role (65–74), 34% depth (<65)
  const ptierRoll = rand();
  let hiddenPotential: number;
  if (ptierRoll < 0.01) hiddenPotential = irnd(95, 99);
  else if (ptierRoll < 0.06) hiddenPotential = irnd(85, 94);
  else if (ptierRoll < 0.26) hiddenPotential = irnd(75, 84);
  else if (ptierRoll < 0.66) hiddenPotential = irnd(65, 74);
  else hiddenPotential = irnd(45, 64);
  const basePotential = hiddenPotential;

  // Development speed assignment
  const dsRoll = rand();
  const devSpeed: "fast" | "normal" | "late" = dsRoll < 0.2 ? "fast" : dsRoll < 0.8 ? "normal" : "late";

  // Where on the career curve is this player at the given age?
  const curveProgress = ageCurveProgress(age, devSpeed); // 0..1 of potential reached
  const skillCore = clamp(Math.round(basePotential * curveProgress), 30, 99);

  const r = () => clamp(Math.round(skillCore + gauss(0, 7)), 30, 99);
  const pitches = isPitcher ? generatePitches(skillCore) : [];

  const hitterRatings = {
    contactL: isPitcher ? irnd(20, 45) : r(),
    contactR: isPitcher ? irnd(20, 45) : r(),
    powerL: isPitcher ? irnd(20, 40) : r(),
    powerR: isPitcher ? irnd(20, 40) : r(),
    vision: isPitcher ? irnd(20, 45) : r(),
    discipline: isPitcher ? irnd(20, 45) : r(),
    speed: r(),
    baserun: r(),
    stealing: r(),
    fielding: r(),
    arm: r(),
    armAccuracy: r(),
    reaction: r(),
    clutch: irnd(30, 90),
    durability: r()
  };
  const pitcherRatings = {
    stamina: isPitcher ? r() : irnd(20, 50),
    composure: r(),
    gbFb: irnd(-30, 30),
    holdRunners: r(),
    clutch: hitterRatings.clutch,
    durability: hitterRatings.durability,
    pitches
  };

  const ratings = { ...hitterRatings, ...pitcherRatings };

  const overall = isPitcher
    ? calcPitcherOverall(ratings)
    : calcHitterOverall(ratings);
  // Visible/scouted potential — for veterans, fully revealed. For prospects, hidden behind a fog.
  const isProspectAge = age <= 22;
  const revealed = isProspectAge ? clamp(Math.round(30 + (age - 18) * 12 + gauss(0, 8)), 10, 90) : 100;
  const potentialError = revealed === 100 ? 0 : Math.round((100 - revealed) * 0.15 * (rand() < 0.5 ? -1 : 1));
  const visiblePotential = clamp(Math.max(overall, basePotential + potentialError), overall, 99);

  const bats: Hand = weighted<Hand>(["R","L","S"], [55, 35, 10]);
  const throws: Hand = isPitcher
    ? weighted<Hand>(["R","L"], [72, 28])
    : weighted<Hand>(["R","L"], [85, 15]);

  const height = irnd(67, 80);
  const weight = irnd(165, 250);
  const yearsExp = clamp(age - 19 - irnd(0, 3), 0, 22);
  const serviceTime = clamp(yearsExp + rnd(0, 0.9), 0, 22);

  // Contract
  const contract = generateContract(overall, age, yearsExp);

  // Personality
  const traitCount = irnd(1, 3);
  const traits: Trait[] = [];
  // Reserve special unlock-only traits — they're awarded by gameplay, not assigned randomly
  const reserved = new Set<string>(["Owner's Favorite","Iron Man","Walk-Off King","Hometown Hero","Underdog","Phoenix"]);
  const eligible = (TRAITS as readonly string[]).filter(t => !reserved.has(t)) as Trait[];
  while (traits.length < traitCount) {
    const t = choice(eligible);
    if (!traits.includes(t)) traits.push(t);
  }
  // K.1 / J.15 — "Henry" Easter egg: any player named Henry gets the hidden "Owner's Favorite" trait
  if (firstName.toLowerCase() === "henry") {
    traits.push("Owner's Favorite");
    // Small clutch bump
    hitterRatings.clutch = Math.min(99, hitterRatings.clutch + 5);
  }

  // K.8 — The Phenom: ~0.01% chance per generated player to have all 99s
  if (rand() < 0.0001) {
    Object.keys(hitterRatings).forEach(k => { (hitterRatings as any)[k] = 99; });
    Object.keys(pitcherRatings).forEach(k => { if (k !== "pitches") (pitcherRatings as any)[k] = 99; });
    if (pitcherRatings.pitches) {
      pitcherRatings.pitches.forEach((p: any) => { p.velo = 102; p.brk = 99; p.ctrl = 99; });
    }
  }

  const id = uid("p");
  const portraitSeed = Math.floor(rand() * 2 ** 30);

  const appearance: PlayerAppearance = {
    skinTone: irnd(0, 9),
    hairStyle: irnd(0, 19),
    hairColor: irnd(0, 9),
    faceShape: irnd(0, 4),
    brow: irnd(0, 3),
    eyeShape: irnd(0, 3),
    eyeColor: irnd(0, 5),
    nose: irnd(0, 3),
    mouth: irnd(0, 2),
    facialHair: age < 22 ? irnd(0, 4) : irnd(0, 11),
    capTilt: irnd(0, 6),
    brimStyle: irnd(0, 1),
    glasses: rand() < 0.04,
    chain: rand() < 0.12,
    eyeBlack: !isPitcher && rand() < 0.35
  };

  const player: Player = {
    id,
    firstName, lastName,
    name: `${firstName} ${lastName}`,
    nickname: rand() < 0.18 ? choice(NICKNAMES) : undefined,
    origin,
    birthplace: choice(ORIGIN_BIRTHPLACES[origin]),
    birthYear: opts.year - age,
    age,
    bats, throws,
    height, weight,
    position,
    isPitcher,
    ratings,
    overall, potential: visiblePotential,
    hidden: { potential: hiddenPotential, revealed },
    devSpeed,
    prevOvr: overall,
    devHistory: [],
    contract,
    yearsExp,
    serviceTime,
    jerseyNumber: irnd(1, 99),
    walkUpSong: choice(WALK_UP_SONGS),
    closerEntrance: position === "CL" ? choice(CLOSER_ENTRANCES) : undefined,
    traits,
    morale: irnd(55, 90),
    hot: 0,
    hotStreakGames: 0,
    injury: null,
    teamId: null,
    awards: [],
    hof: false,
    retired: false,
    seasonStats: {},
    careerStats: buildCareerStats(opts.year, age, overall, isPitcher, position),
    portraitSeed,
    appearance
  };
  return player;
}

function generatePitches(skill: number) {
  const count = irnd(3, 5);
  const types = [...PITCH_TYPES];
  const pitches: Array<{ type: any; velo: number; brk: number; ctrl: number }> = [];
  // Always include 4-seam
  pitches.push({ type: "4-Seam", velo: clamp(Math.round(88 + gauss(0, 3) + (skill - 60) * 0.08), 84, 102), brk: clamp(Math.round(skill + gauss(0, 6)), 30, 99), ctrl: clamp(Math.round(skill + gauss(0, 6)), 30, 99) });
  const remaining = types.filter(t => t !== "4-Seam");
  for (let i = 0; i < count - 1; i++) {
    const t = choice(remaining);
    remaining.splice(remaining.indexOf(t), 1);
    const veloMod = t === "Curve" ? -10 : t === "Changeup" ? -8 : t === "Splitter" ? -7 : t === "Knuckler" ? -22 : t === "Slider" ? -4 : 0;
    pitches.push({
      type: t,
      velo: clamp(Math.round(88 + veloMod + gauss(0, 2.5) + (skill - 60) * 0.06), 64, 100),
      brk: clamp(Math.round(skill + gauss(0, 6)), 30, 99),
      ctrl: clamp(Math.round(skill + gauss(0, 6)), 30, 99)
    });
  }
  return pitches;
}

function calcHitterOverall(r: any): number {
  const contact = (r.contactL + r.contactR) / 2;
  const power = (r.powerL + r.powerR) / 2;
  return Math.round(
    contact * 0.22 + power * 0.18 + r.vision * 0.10 + r.discipline * 0.08 +
    r.speed * 0.08 + r.fielding * 0.16 + r.arm * 0.08 + r.reaction * 0.10
  );
}

function calcPitcherOverall(r: any): number {
  if (!r.pitches.length) return 50;
  const pitchAvg = r.pitches.reduce((s: number, p: any) => s + (p.brk + p.ctrl) / 2, 0) / r.pitches.length;
  const veloAvg = r.pitches.reduce((s: number, p: any) => s + p.velo, 0) / r.pitches.length;
  const veloRating = clamp((veloAvg - 86) * 5 + 65, 35, 99);
  return Math.round(pitchAvg * 0.55 + veloRating * 0.20 + r.stamina * 0.10 + r.composure * 0.10 + r.holdRunners * 0.05);
}

function generateContract(overall: number, age: number, yearsExp: number): Contract {
  let aav: number;
  if (yearsExp < 3) aav = 720_000 + irnd(0, 400_000);
  else if (yearsExp < 6) aav = (overall - 50) * irnd(120_000, 280_000);
  else aav = Math.max(0, overall - 55) * irnd(220_000, 520_000);
  aav = clamp(aav, 720_000, 45_000_000);
  const years = age > 32 ? irnd(1, 3) : age > 28 ? irnd(2, 5) : irnd(2, 6);
  return {
    years,
    aav,
    optOut: overall >= 85 && rand() < 0.3,
    noTrade: overall >= 88 && yearsExp >= 8 && rand() < 0.55
  };
}

/** Returns 0..1 representing how much of potential a player has reached at given age, by development speed. */
export function ageCurveProgress(age: number, devSpeed: "fast" | "normal" | "late"): number {
  // Peak age by archetype
  const peakAge = devSpeed === "fast" ? 24 : devSpeed === "late" ? 29 : 27;
  // Decline starts (post-peak)
  const declineStart = devSpeed === "fast" ? 28 : devSpeed === "late" ? 32 : 30;

  if (age < 18) return 0.45;
  if (age <= peakAge) {
    // Rising curve from 18 to peak
    const t = (age - 18) / (peakAge - 18);
    // Smoothstep
    const eased = t * t * (3 - 2 * t);
    return 0.55 + eased * 0.45; // 0.55 → 1.0
  }
  if (age <= declineStart) return 1.0;
  // Decline after declineStart
  const declineYears = age - declineStart;
  const dropPerYear = devSpeed === "fast" ? 0.04 : devSpeed === "late" ? 0.025 : 0.03;
  return Math.max(0.4, 1.0 - declineYears * dropPerYear);
}

function buildCareerStats(year: number, age: number, overall: number, isPitcher: boolean, position: Position) {
  const seasons: any[] = [];
  const start = 19 + irnd(0, 2);
  const totalSeasons = clamp(age - start, 0, 22);
  for (let i = 0; i < totalSeasons; i++) {
    const seasonAge = start + i;
    const ratingForYear = clamp(overall - Math.abs(seasonAge - 28) * 1.1 + gauss(0, 4), 30, 99);
    if (isPitcher) {
      const ip = clamp(gauss(position === "SP" ? 170 : position === "CL" ? 64 : 70, 28), 18, 235);
      const era = clamp(8.6 - (ratingForYear - 30) / 14, 1.7, 7.6) + gauss(0, 0.6);
      const w = position === "SP" ? clamp(Math.round(ip / 30 * (ratingForYear / 80) + gauss(0, 2)), 0, 24) : irnd(2, 12);
      const l = clamp(Math.round(ip / 35 + gauss(0, 2) - w / 3), 0, 22);
      seasons.push({
        year: year - (age - seasonAge),
        age: seasonAge,
        teamId: null,
        gs: position === "SP" ? irnd(22, 33) : 0,
        w, l,
        sv: position === "CL" ? irnd(15, 45) : position === "RP" ? irnd(0, 10) : 0,
        ip: Math.round(ip * 10) / 10,
        ph: Math.round(ip * 1.0),
        per: Math.round(ip * era / 9),
        pbb: irnd(20, 70),
        pk: Math.round(ip * (ratingForYear / 100) * rnd(0.8, 1.4)),
        phr: irnd(8, 30),
        era: Math.round(era * 100) / 100,
        whip: Math.round((ip * 0.012 + rnd(1.0, 1.5)) * 100) / 100
      });
    } else {
      const ab = clamp(Math.round(gauss(480, 60)), 240, 660);
      const avg = clamp(0.180 + (ratingForYear - 30) / 320, 0.190, 0.380) + gauss(0, 0.018);
      const h = Math.round(ab * avg);
      const hr = clamp(Math.round((overall - 50) / 5 + gauss(0, 8)), 0, 55);
      const rbi = clamp(Math.round(h * 0.5 + hr * 1.5 + gauss(0, 12)), 10, 150);
      seasons.push({
        year: year - (age - seasonAge),
        age: seasonAge,
        teamId: null,
        ab, h, hr, rbi,
        r: Math.round(h * 0.6 + gauss(0, 10)),
        sb: clamp(Math.round((ratingForYear - 50) / 4 + gauss(0, 6)), 0, 70),
        bb: irnd(20, 100),
        k: irnd(60, 200),
        doubles: irnd(15, 40),
        triples: irnd(0, 9),
        avg: Math.round(avg * 1000) / 1000,
        obp: Math.round((avg + rnd(0.04, 0.09)) * 1000) / 1000,
        slg: Math.round((avg + hr / ab * 3 + rnd(0.04, 0.16)) * 1000) / 1000,
        ops: 0
      });
      const s = seasons[seasons.length - 1];
      s.ops = Math.round((s.obp + s.slg) * 1000) / 1000;
    }
  }
  return seasons;
}
