// Movie Mogul — world generation.
// Builds the initial studio, talent pool, rival studios, and an opening
// script market for a fresh save.

import type {
  Studio, Talent, RivalStudio, Script, Genre,
  Era, Difficulty, PlayerStudio, ContentComfort, Caveat, CaveatId,
  ContentRating, RequiredRole,
} from "./types";
import { ERA_START_YEAR, DIFFICULTY_START_CASH, GENRES } from "./types";
import { uid, rand, irnd, choice } from "../utils/rand";
import { FIRST_NAMES, LAST_NAMES } from "../data/names";
import { ALL_SCRIPT_TEMPLATES, templatesForEra, type ScriptTemplate } from "./templates_scripts";

const RIVAL_NAMES: Array<{ name: string; abbr: string; primary: string; accent: string; genres: Genre[]; quality: number; aggression: number }> = [
  { name: "Paramount Pictures",   abbr: "PAR", primary: "#1a3d8f", accent: "#ffd700", genres: ["Action", "Thriller"],    quality: 0.6, aggression: 0.8 },
  { name: "Warner Studios",       abbr: "WAR", primary: "#8b1538", accent: "#f4e7c1", genres: ["Drama", "Thriller"],     quality: 0.75, aggression: 0.7 },
  { name: "Universal Films",      abbr: "UNI", primary: "#0e4d8f", accent: "#ffffff", genres: ["Comedy", "Family"],      quality: 0.55, aggression: 0.7 },
  { name: "20th Century",         abbr: "TCF", primary: "#c9a13c", accent: "#1a1a1a", genres: ["SciFi", "Fantasy"],      quality: 0.65, aggression: 0.75 },
  { name: "Orion Studios",        abbr: "ORI", primary: "#2d4a3e", accent: "#dcc89f", genres: ["Drama", "Romance"],      quality: 0.7,  aggression: 0.5 },
  { name: "Crown Entertainment",  abbr: "CRN", primary: "#5d2e8c", accent: "#ffd700", genres: ["Fantasy", "Romance"],    quality: 0.55, aggression: 0.6 },
  { name: "Apex Pictures",        abbr: "APX", primary: "#b91c2b", accent: "#fff0d4", genres: ["Action"],                quality: 0.5,  aggression: 0.85 },
  { name: "Atlas Cinema",         abbr: "ATL", primary: "#0a0a0a", accent: "#d4af37", genres: ["Drama", "Thriller"],     quality: 0.85, aggression: 0.45 },
  { name: "Lighthouse Films",     abbr: "LHF", primary: "#2a6f97", accent: "#ffe169", genres: ["Family", "Comedy"],      quality: 0.5,  aggression: 0.5 },
  { name: "Crimson Studios",      abbr: "CRS", primary: "#8b0000", accent: "#f7c873", genres: ["Horror", "Thriller"],    quality: 0.55, aggression: 0.65 },
  { name: "Pacific Productions",  abbr: "PAC", primary: "#0080c0", accent: "#fff5d6", genres: ["Action", "SciFi"],       quality: 0.6,  aggression: 0.7 },
  { name: "Sterling Studios",     abbr: "STR", primary: "#3d3d8f", accent: "#c0c0c0", genres: ["Drama", "Documentary"],  quality: 0.75, aggression: 0.4 },
  { name: "Velvet Pictures",      abbr: "VLV", primary: "#7a1b54", accent: "#f7d6e0", genres: ["Romance", "Comedy"],     quality: 0.6,  aggression: 0.55 },
  { name: "Monolith Films",       abbr: "MON", primary: "#1c1c1c", accent: "#ff6b35", genres: ["SciFi", "Action"],       quality: 0.65, aggression: 0.75 },
];

const SCRIPT_TITLE_FRAGS: Record<Genre, string[][]> = {
  Action:      [["The", "Dark", "Last", "Crimson", "Midnight", "Iron", "Steel", "Silent", "Lone"], ["Run", "Strike", "Storm", "Hour", "Killer", "Warrior", "Gambit", "Code", "Pact"]],
  Drama:       [["A", "The", "When", "Where", "After", "Before"], ["River Runs Wild", "Stars Fall", "Last Watchmaker", "Long Goodbye", "Daughter's Letter", "Forgotten Coast", "Light at Dawn"]],
  Comedy:      [["My", "The", "How I", "When We", "Just"], ["Big Mistake", "Comedy Royale", "Married Life", "Crashed the Wedding", "Lost the Dog", "Big Vacation"]],
  Thriller:    [["The", "Hidden", "Silent", "Quiet", "Last"], ["Vanishing Hour", "Witness", "Investigation", "Stranger Calls", "Confession", "Game Theory"]],
  Horror:      [["The", "Below", "Beneath", "Inside", "Dark"], ["House on Cypress", "Visitor", "Hollow Pines", "Long Night", "Watcher", "Howling Hills"]],
  Romance:     [["A", "Always", "Whenever", "Two", "One"], ["Day in June", "We Met in Paris", "Hearts Apart", "Letter to Anna", "Summer", "Last Dance"]],
  SciFi:       [["Echoes", "Singularity", "Beyond", "Quantum", "Stellar"], ["of Andromeda", "Drift", "the Veil", "Protocol", "Pioneers", "Horizons"]],
  Fantasy:     [["Dragons", "Crown", "Kingdom", "The Cursed", "The Last"], ["of Yenoth", "Princess", "of Embers", "Knight", "Spell", "Saga"]],
  Family:      [["A", "The", "Little", "Big"], ["Friend Like You", "Adventure", "Magical Day", "Family Tree", "Treasure Map", "Snowfall"]],
  Documentary: [["The Truth About", "Behind", "Voices of", "Lessons from"], ["Hollywood", "the Strike", "the City", "the Forest", "the Stage"]],
  Western:     [["Dust at", "The Sundown", "High Desert", "Cold Trail to"], ["Sundown", "Mercy", "Yuma", "Hangtree", "the Border"]],
  Musical:     [["Stars on", "Rain on", "Lights at", "Curtain at"], ["Broadway", "the Avenue", "Carnegie", "Midnight", "the Bowery"]],
  War:         [["Bridge at", "The Last", "Hill of", "Letters from"], ["the Quai", "Beach", "Fire", "the Front", "the Trench"]],
  Sports:      [["Final", "The Comeback", "Money", "Two Quarts"], ["Inning", "Pitch", "Bench", "Score", "Low"]],
};

function makeTitle(genre: Genre): string {
  const [a, b] = SCRIPT_TITLE_FRAGS[genre];
  return `${choice(a)} ${choice(b)}`;
}

function generateTalent(role: "actor" | "director" | "writer", opts?: { ageRange?: [number, number] }): Talent {
  const ageRange = opts?.ageRange ?? (role === "director" ? [32, 65] : role === "writer" ? [28, 60] : [22, 55]);
  const age = irnd(ageRange[0], ageRange[1]);
  // Bias star tier: most are 2-3, some 1, fewer 4, very few 5.
  const r = rand();
  const star: 1 | 2 | 3 | 4 | 5 = r < 0.10 ? 1 : r < 0.45 ? 2 : r < 0.80 ? 3 : r < 0.96 ? 4 : 5;
  // True rating tracks star with ±10 noise, then hidden gems get a boost.
  const baseRating = 40 + (star - 1) * 12 + irnd(-6, 6);
  const hiddenGem = (star === 1 || star === 2) && rand() < 0.06;
  const trueRating = Math.max(40, Math.min(99, hiddenGem ? baseRating + irnd(18, 30) : baseRating));
  const feeBase = role === "writer" ? 0.5 : role === "director" ? 1.5 : 1.0;
  const fee = Math.round((feeBase + (star - 1) * (role === "writer" ? 0.4 : role === "director" ? 1.8 : 2.5)) * 10) / 10;
  const first = choice(FIRST_NAMES.US);
  const last = choice(LAST_NAMES.US);
  return {
    id: uid(role === "actor" ? "act" : role === "director" ? "dir" : "wri"),
    name: `${first} ${last}`,
    role,
    age,
    star,
    trueRating,
    revealed: false,
    specialties: pickSpecialties(),
    fee,
    studioId: null,
    contractMoviesLeft: 0,
    hits: 0,
    flops: 0,
    retired: false,
    hot: 0,
    gender: role === "actor" ? (rand() < 0.5 ? "M" : "F") : "any",
    comfort: role === "writer" ? undefined : generateContentComfort(),
    caveats: role === "writer" ? undefined : generateCaveats(star),
    loyalty: {},
  };
}

/** Generate a talent's content comfort profile. Higher-star talent
 *  tends to be either family-only OR no-limits — they have brand
 *  identities. Mid-tier is more permissive. */
function generateContentComfort(): ContentComfort {
  const r = rand();
  if (r < 0.15) {
    // Family-only: refuses anything spicy. Big rom-com / kids stars.
    return { violence: 0, nudity: 0, sexuality: 0, language: 0, drugs: 0 };
  }
  if (r < 0.55) {
    // Mainstream: PG-13 ceiling. The largest bucket.
    return { violence: 2, nudity: 0, sexuality: 1, language: 2, drugs: 1 };
  }
  if (r < 0.85) {
    // Versatile: will go up to R but not extreme.
    return { violence: 3, nudity: 1, sexuality: 2, language: 3, drugs: 2 };
  }
  // No limits: edgy auteur talent. Will do anything for the right script.
  return { violence: 3, nudity: 3, sexuality: 3, language: 3, drugs: 3 };
}

const CAVEAT_CATALOG: Array<{ id: CaveatId; label: string; cost: "small" | "medium" | "large"; minStar: number }> = [
  { id: "producerCredit", label: "Producer credit", cost: "small",  minStar: 3 },
  { id: "topBilling",     label: "Top billing",     cost: "small",  minStar: 3 },
  { id: "backendPercent", label: "5% of profits",   cost: "medium", minStar: 4 },
  { id: "finalCut",       label: "Final cut approval", cost: "large", minStar: 4 },
  { id: "scriptApproval", label: "Script approval",    cost: "medium", minStar: 4 },
  { id: "directorCredit", label: "Director credit too", cost: "large", minStar: 5 },
  { id: "writingCredit",  label: "Co-writing credit",   cost: "small",  minStar: 3 },
  { id: "petCoStar",      label: "Wants their preferred co-star", cost: "medium", minStar: 4 },
  { id: "noPress",        label: "No press obligations", cost: "small",  minStar: 4 },
  { id: "locationPrefs",  label: "Specific location demands", cost: "small", minStar: 3 },
  { id: "packageDeal",    label: "Package deal with crew", cost: "medium", minStar: 4 },
];

function generateCaveats(star: 1 | 2 | 3 | 4 | 5): Caveat[] {
  // ★1-2 talent rarely demand anything. Higher stars accumulate asks.
  const out: Caveat[] = [];
  if (star < 2) return out;
  const eligible = CAVEAT_CATALOG.filter(c => star >= c.minStar);
  // Typical: ★2 has 0-1 caveats, ★3 has 1, ★4 has 1-2, ★5 has 2-3.
  const targetCount = star === 2 ? (rand() < 0.4 ? 1 : 0) : star === 3 ? 1 : star === 4 ? (rand() < 0.5 ? 2 : 1) : (rand() < 0.5 ? 3 : 2);
  const pool = eligible.slice().sort(() => rand() - 0.5);
  for (let i = 0; i < Math.min(targetCount, pool.length); i++) {
    out.push({
      id: pool[i].id,
      label: pool[i].label,
      cost: pool[i].cost,
      weight: 0.5 + rand() * 0.4,
    });
  }
  return out;
}

function pickSpecialties(): Genre[] {
  // 1-2 specialties.
  const n = rand() < 0.5 ? 1 : 2;
  const out: Genre[] = [];
  while (out.length < n) {
    const g = choice(GENRES);
    if (!out.includes(g)) out.push(g);
  }
  return out;
}

function generateScript(era: Era): Script {
  // 70% of scripts seed from the real-movie template library matched
  // to the current era. The other 30% are procedural fallbacks so the
  // market doesn't go stale within a single playthrough.
  const useTemplate = rand() < 0.7;
  const pool = templatesForEra(era);
  if (useTemplate && pool.length > 0) {
    return scriptFromTemplate(choice(pool));
  }
  return proceduralScript(era);
}

function scriptFromTemplate(t: ScriptTemplate): Script {
  const trueQuality = t.quality;
  const hiddenGem = trueQuality >= 3 && rand() < 0.07;
  let scoutedQuality: 1 | 2 | 3 | 4 | 5;
  if (hiddenGem) {
    scoutedQuality = Math.max(1, trueQuality - 2) as 1 | 2 | 3 | 4 | 5;
  } else {
    const noise = rand() < 0.5 ? 0 : (rand() < 0.5 ? -1 : 1);
    scoutedQuality = Math.max(1, Math.min(5, trueQuality + noise)) as 1 | 2 | 3 | 4 | 5;
  }
  const price = Math.max(0.2, Math.round((scoutedQuality * 0.6 + rand() * 0.4) * 10) / 10);
  return {
    id: uid("scr"),
    title: t.title,
    genre: t.genre,
    trueQuality,
    scoutedQuality,
    coverageRuns: 0,
    price,
    studioId: null,
    source: "template",
    used: false,
    premise: t.premise,
    rating: t.rating,
    requirements: t.requirements,
    requiredRoles: t.requiredRoles,
    templateId: t.id,
    era: t.era,
  };
}

function proceduralScript(era: Era): Script {
  const genre = choice(GENRES);
  const r = rand();
  const trueQuality: 1 | 2 | 3 | 4 | 5 = r < 0.10 ? 1 : r < 0.45 ? 2 : r < 0.80 ? 3 : r < 0.95 ? 4 : 5;
  const hiddenGem = trueQuality >= 3 && rand() < 0.07;
  let scoutedQuality: 1 | 2 | 3 | 4 | 5;
  if (hiddenGem) scoutedQuality = Math.max(1, trueQuality - 2) as 1 | 2 | 3 | 4 | 5;
  else {
    const noise = rand() < 0.5 ? 0 : (rand() < 0.5 ? -1 : 1);
    scoutedQuality = Math.max(1, Math.min(5, trueQuality + noise)) as 1 | 2 | 3 | 4 | 5;
  }
  const price = Math.max(0.2, Math.round((scoutedQuality * 0.6 + rand() * 0.4) * 10) / 10);
  // Procedural requirements: pick a rating tier, derive required roles.
  const ratingRoll = rand();
  const rating: ContentRating = ratingRoll < 0.1 ? "G" : ratingRoll < 0.35 ? "PG" : ratingRoll < 0.75 ? "PG-13" : "R";
  const requirements: ContentComfort = ratingToRequirements(rating);
  const requiredRoles = proceduralRoles(genre);
  return {
    id: uid("scr"),
    title: makeTitle(genre),
    genre,
    trueQuality,
    scoutedQuality,
    coverageRuns: 0,
    price,
    studioId: null,
    source: "spec",
    used: false,
    rating,
    requirements,
    requiredRoles,
    era,
  };
}

function ratingToRequirements(rating: ContentRating): ContentComfort {
  switch (rating) {
    case "G":     return { violence: 0, nudity: 0, sexuality: 0, language: 0, drugs: 0 };
    case "PG":    return { violence: 1, nudity: 0, sexuality: 0, language: 1, drugs: 0 };
    case "PG-13": return { violence: 2, nudity: 0, sexuality: 1, language: 2, drugs: 1 };
    case "R":     return { violence: 3, nudity: 1, sexuality: 2, language: 3, drugs: 2 };
    case "NC-17": return { violence: 3, nudity: 3, sexuality: 3, language: 3, drugs: 3 };
  }
}

function proceduralRoles(genre: Genre): RequiredRole[] {
  const out: RequiredRole[] = [{ label: "Lead", slot: "lead", gender: "any", isLead: true }];
  if (genre === "Romance") {
    out[0].label = "Female Lead"; out[0].gender = "F";
    out.push({ label: "Male Lead", slot: "co", gender: "M" });
  } else if (genre === "Action" || genre === "Thriller" || genre === "War") {
    out.push({ label: "Antagonist", slot: "antag", gender: "any" });
    if (rand() < 0.6) out.push({ label: "Supporting", slot: "supp", gender: "any" });
  } else if (genre === "Drama" || genre === "Family") {
    out.push({ label: "Supporting", slot: "supp", gender: "any" });
    if (rand() < 0.5) out.push({ label: "Foil", slot: "foil", gender: "any" });
  } else {
    if (rand() < 0.7) out.push({ label: "Supporting", slot: "supp", gender: "any" });
  }
  return out;
}

function generateRival(template: typeof RIVAL_NAMES[number]): RivalStudio {
  return {
    id: uid("riv"),
    name: template.name,
    abbr: template.abbr,
    primary: template.primary,
    accent: template.accent,
    cash: irnd(80, 250),
    prestige: (1 + Math.round(template.quality * 4)) as 1 | 2 | 3 | 4 | 5,
    personality: {
      favoredGenres: template.genres,
      aggression: template.aggression,
      quality: template.quality,
    },
    wins: 0,
    losses: 0,
    activeProductions: [],
  };
}

export interface NewStudioOpts {
  moguleName: string;
  studioName: string;
  era: Era;
  difficulty: Difficulty;
  primary?: string;
  accent?: string;
}

export function createStudio(opts: NewStudioOpts): Studio {
  const id = uid("mog");
  const now = Date.now();
  const startYear = ERA_START_YEAR[opts.era];

  // Build player studio.
  const player: PlayerStudio = {
    id: uid("ps"),
    name: opts.studioName,
    abbr: opts.studioName.split(/\s+/).map(w => w[0]).join("").slice(0, 3).toUpperCase(),
    primary: opts.primary ?? "#D4AF37",
    accent: opts.accent ?? "#0a0a0a",
    moguleName: opts.moguleName,
    cash: DIFFICULTY_START_CASH[opts.difficulty],
    loan: 0,
    loanRate: 0,
    loanMonthsLeft: 0,
    defaults: 0,
    prestige: 1,
    totalRevenue: 0,
    totalProfit: 0,
    awardsWon: 0,
    facilities: {
      soundStages: 1,
      backlots: 0,
      postProduction: 1,
      scriptDept: 0,
      marketingDept: 0,
      studioTours: 0,
      themePark: 0,
    },
    walkOfFame: [],
  };

  // Rivals.
  const rivals = RIVAL_NAMES.map(generateRival);

  // Talent pool — ~80 actors, 30 directors, 20 writers.
  const talent: Talent[] = [];
  for (let i = 0; i < 80; i++) talent.push(generateTalent("actor"));
  for (let i = 0; i < 30; i++) talent.push(generateTalent("director"));
  for (let i = 0; i < 20; i++) talent.push(generateTalent("writer"));

  // Pre-distribute some talent to rival studios (~3 each).
  for (const r of rivals) {
    const claimed = talent.filter(t => !t.studioId).sort((a, b) => b.trueRating - a.trueRating);
    const pickActors = claimed.filter(t => t.role === "actor" && t.star >= 3).slice(0, 2);
    const pickDir = claimed.filter(t => t.role === "director" && t.star >= 3).slice(0, 1);
    for (const p of [...pickActors, ...pickDir]) {
      p.studioId = r.id;
      p.contractMoviesLeft = irnd(1, 3);
    }
  }

  // Script market — ~12 scripts available, era-matched seeds.
  const scripts: Script[] = [];
  for (let i = 0; i < 12; i++) scripts.push(generateScript(opts.era));

  return {
    id,
    createdAt: now,
    modifiedAt: now,
    era: opts.era,
    difficulty: opts.difficulty,
    year: startYear,
    month: 1,
    player,
    rivals,
    talent,
    retiredTalent: [],
    scripts,
    productions: [],
    releases: [],
    awards: [],
    newsLog: [{
      id: uid("nw"),
      year: startYear,
      month: 1,
      category: "Info",
      emoji: "🎬",
      headline: `${opts.studioName} opens its doors. ${opts.moguleName} takes the helm as studio chief.`,
      important: true,
      studioIds: [player.id],
    }],
    records: { biggestOpening: null, biggestTotalBO: null },
  };
}

/** Top up the script market — called monthly to keep new scripts flowing. */
export function refreshScriptMarket(s: Studio, n: number = 2): void {
  const open = s.scripts.filter(sc => !sc.studioId && !sc.used).length;
  if (open >= 12) return;
  for (let i = 0; i < n; i++) s.scripts.push(generateScript(s.era));
}

/** Generate a single new talent (for "rising star" injection). */
export function generateRisingTalent(role: "actor" | "director" | "writer"): Talent {
  return generateTalent(role, { ageRange: role === "actor" ? [19, 26] : [28, 40] });
}
