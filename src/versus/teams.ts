// Versus Mode team catalog. All ORIGINAL — no franchise IP. Each team
// carries a small set of ratings the engines bias outcomes against.
//
// Baseball teams ship: contact (batting eye), power (slug), stuff
// (pitcher arsenal), control (pitcher accuracy).
//
// Football teams ship: run (offense), pass (offense), runD (defense
// vs run), passD (defense vs pass).

export interface BaseballTeam {
  id: string;
  name: string;
  abbr: string;
  emoji: string;
  primary: string;
  accent: string;
  ratings: { contact: number; power: number; stuff: number; control: number };
}

export interface FootballTeam {
  id: string;
  name: string;
  abbr: string;
  emoji: string;
  primary: string;
  accent: string;
  ratings: { run: number; pass: number; runD: number; passD: number };
}

// Ratings on a 60–95 band for variety without runaway gaps.
export const BASEBALL_TEAMS: BaseballTeam[] = [
  { id: "bb_kestrels", name: "Atlas Kestrels", abbr: "ATK", emoji: "🦅",
    primary: "#1d4ed8", accent: "#fde047",
    ratings: { contact: 82, power: 78, stuff: 80, control: 84 } },
  { id: "bb_thunder",  name: "Storm Valley Thunder", abbr: "SVT", emoji: "⚡",
    primary: "#7c3aed", accent: "#fbbf24",
    ratings: { contact: 74, power: 88, stuff: 78, control: 76 } },
  { id: "bb_riptide",  name: "Cobalt Riptide", abbr: "COB", emoji: "🌊",
    primary: "#0891b2", accent: "#f0f9ff",
    ratings: { contact: 86, power: 70, stuff: 82, control: 80 } },
  { id: "bb_emberjays",name: "Ember Jays", abbr: "EMB", emoji: "🔥",
    primary: "#dc2626", accent: "#fef3c7",
    ratings: { contact: 78, power: 84, stuff: 76, control: 78 } },
  { id: "bb_forest",   name: "Pinewood Foxes", abbr: "PWF", emoji: "🦊",
    primary: "#15803d", accent: "#fde047",
    ratings: { contact: 88, power: 72, stuff: 84, control: 86 } },
  { id: "bb_ravens",   name: "Midnight Ravens", abbr: "MNR", emoji: "🌑",
    primary: "#1e293b", accent: "#a78bfa",
    ratings: { contact: 76, power: 82, stuff: 90, control: 78 } },
  { id: "bb_sunhawks", name: "Desert Sunhawks", abbr: "DSH", emoji: "☀️",
    primary: "#ea580c", accent: "#fde047",
    ratings: { contact: 80, power: 80, stuff: 80, control: 80 } },
  { id: "bb_otters",   name: "Tidewater Otters", abbr: "TWO", emoji: "🦦",
    primary: "#0e7490", accent: "#fef9c3",
    ratings: { contact: 84, power: 74, stuff: 78, control: 82 } },
];

export const FOOTBALL_TEAMS: FootballTeam[] = [
  { id: "ft_titans",   name: "Iron Titans", abbr: "IRN", emoji: "🛡️",
    primary: "#1e3a8a", accent: "#fde047",
    ratings: { run: 88, pass: 70, runD: 86, passD: 74 } },
  { id: "ft_bolts",    name: "Sky Bolts", abbr: "SKY", emoji: "⚡",
    primary: "#0ea5e9", accent: "#fef3c7",
    ratings: { run: 72, pass: 90, runD: 70, passD: 82 } },
  { id: "ft_grizzlies",name: "Frostpeak Grizzlies", abbr: "FPG", emoji: "🐻",
    primary: "#0f766e", accent: "#fef9c3",
    ratings: { run: 80, pass: 80, runD: 84, passD: 80 } },
  { id: "ft_emberkats",name: "Ember Wildcats", abbr: "EWC", emoji: "🐯",
    primary: "#b91c1c", accent: "#fbbf24",
    ratings: { run: 84, pass: 76, runD: 78, passD: 78 } },
  { id: "ft_buccs",    name: "Coastal Buccaneers", abbr: "CBC", emoji: "🏴‍☠️",
    primary: "#171717", accent: "#f87171",
    ratings: { run: 78, pass: 82, runD: 76, passD: 84 } },
  { id: "ft_pioneers", name: "Trailpoint Pioneers", abbr: "TPP", emoji: "🌲",
    primary: "#365314", accent: "#fde68a",
    ratings: { run: 82, pass: 78, runD: 80, passD: 76 } },
  { id: "ft_lancers",  name: "Royal Lancers", abbr: "RLN", emoji: "🏇",
    primary: "#6d28d9", accent: "#fde047",
    ratings: { run: 76, pass: 86, runD: 74, passD: 80 } },
  { id: "ft_otters",   name: "Bay Otters", abbr: "BAY", emoji: "🦦",
    primary: "#0d9488", accent: "#fef3c7",
    ratings: { run: 80, pass: 80, runD: 78, passD: 80 } },
];

export function getBaseballTeam(id: string): BaseballTeam | undefined {
  return BASEBALL_TEAMS.find(t => t.id === id);
}
export function getFootballTeam(id: string): FootballTeam | undefined {
  return FOOTBALL_TEAMS.find(t => t.id === id);
}
