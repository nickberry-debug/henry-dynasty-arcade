// Sports Hub — original team rosters for Hockey / Basketball /
// College Football. All ORIGINAL. No real city/franchise/logo/IP
// references — these are invented for the arcade.

import type { SportId, Team } from "./franchise";
import type { MascotKind, ShieldShape } from "../art/CrestGenerator";

interface TeamSpec {
  id: string;
  city: string;
  nickname: string;
  abbr: string;
  primary: string;
  secondary: string;
  tertiary?: string;
  rating: number;
  conf: "east" | "west";
  starPos: string;
  starName: string;
  mascot?: MascotKind;
  shape?: ShieldShape;
}

function expand(specs: TeamSpec[]): Team[] {
  return specs.map(s => ({
    id: s.id,
    city: s.city,
    nickname: s.nickname,
    abbr: s.abbr,
    rating: s.rating,
    conf: s.conf,
    crest: {
      id: s.id, abbr: s.abbr, primary: s.primary, secondary: s.secondary,
      tertiary: s.tertiary, mascot: s.mascot, shape: s.shape,
    },
    star: { name: s.starName, pos: s.starPos },
  }));
}

// ── Hockey — 12 teams ─────────────────────────────────────────────────

const HOCKEY: TeamSpec[] = [
  { id: "h_glacier",   city: "Glacier Bay",   nickname: "Wolves",     abbr: "GBW", primary: "#1e3a8a", secondary: "#dbeafe", rating: 84, conf: "east", starPos: "C",  starName: "Maks Rourke",       mascot: "wolf",   shape: "shield" },
  { id: "h_steel",     city: "Steel Harbor",  nickname: "Sharks",     abbr: "SHK", primary: "#0f172a", secondary: "#94a3b8", rating: 81, conf: "east", starPos: "RW", starName: "Eli Thorne",         mascot: "shark",  shape: "diamond" },
  { id: "h_aurora",    city: "Aurora Falls",  nickname: "Comets",     abbr: "AUR", primary: "#7c3aed", secondary: "#fde047", rating: 78, conf: "east", starPos: "G",  starName: "Henrik Vaska",       mascot: "comet",  shape: "round" },
  { id: "h_ironwood",  city: "Ironwood",      nickname: "Bears",      abbr: "IRN", primary: "#7f1d1d", secondary: "#fde047", rating: 76, conf: "east", starPos: "D",  starName: "Anders Kallio",      mascot: "bear",   shape: "shield" },
  { id: "h_evergreen", city: "Evergreen",     nickname: "Stags",      abbr: "EVR", primary: "#14532d", secondary: "#fef3c7", rating: 73, conf: "east", starPos: "LW", starName: "Petter Lund",        mascot: "stag",   shape: "hexagon" },
  { id: "h_seaspray",  city: "Seaspray",      nickname: "Whalers",    abbr: "SEA", primary: "#0891b2", secondary: "#fff",    rating: 70, conf: "east", starPos: "C",  starName: "Niko Vass",          mascot: "anchor", shape: "round" },
  { id: "h_redstone",  city: "Redstone",      nickname: "Drillers",   abbr: "RDS", primary: "#9a3412", secondary: "#fde047", rating: 82, conf: "west", starPos: "RW", starName: "Cole Pavel",         mascot: "thunder",shape: "shield" },
  { id: "h_silvermill",city: "Silvermill",    nickname: "Falcons",    abbr: "SVM", primary: "#1e293b", secondary: "#cbd5e1", rating: 79, conf: "west", starPos: "C",  starName: "Marek Stein",        mascot: "hawk",   shape: "diamond" },
  { id: "h_thunder",   city: "Thunder Ridge", nickname: "Bolts",      abbr: "THR", primary: "#a16207", secondary: "#fde047", rating: 77, conf: "west", starPos: "G",  starName: "Roan Beck",          mascot: "lightning",shape: "star" },
  { id: "h_jadepoint", city: "Jade Point",    nickname: "Dragons",    abbr: "JPD", primary: "#15803d", secondary: "#fde047", rating: 74, conf: "west", starPos: "D",  starName: "Soren Yu",           mascot: "flame",  shape: "banner" },
  { id: "h_quartz",    city: "Quartz City",   nickname: "Suns",       abbr: "QRZ", primary: "#fbbf24", secondary: "#7c2d12", rating: 72, conf: "west", starPos: "LW", starName: "Linus Holm",         mascot: "sun",    shape: "round" },
  { id: "h_frostvale", city: "Frostvale",     nickname: "Crows",      abbr: "FRV", primary: "#0a0a14", secondary: "#a78bfa", rating: 68, conf: "west", starPos: "C",  starName: "Otto Bren",          mascot: "wing",   shape: "hexagon" },
];

// ── Basketball — 12 teams ─────────────────────────────────────────────

const BASKETBALL: TeamSpec[] = [
  { id: "b_metro",     city: "Metro",         nickname: "Voltage",    abbr: "MET", primary: "#a16207", secondary: "#fde047", rating: 86, conf: "east", starPos: "PG", starName: "Cyrus Vale",         mascot: "lightning",shape: "shield" },
  { id: "b_harbor",    city: "Harbor City",   nickname: "Anchors",    abbr: "HBR", primary: "#0c4a6e", secondary: "#fde047", rating: 83, conf: "east", starPos: "SF", starName: "Jaxon Pike",         mascot: "anchor", shape: "round" },
  { id: "b_belmont",   city: "Belmont",       nickname: "Royals",     abbr: "BMT", primary: "#581c87", secondary: "#fde047", rating: 80, conf: "east", starPos: "PF", starName: "Marcus Reigns",      mascot: "crown",  shape: "banner" },
  { id: "b_ironclad",  city: "Ironclad",      nickname: "Smiths",     abbr: "IRC", primary: "#1f2937", secondary: "#fb923c", rating: 77, conf: "east", starPos: "C",  starName: "Donovan Hall",       mascot: "flame",  shape: "hexagon" },
  { id: "b_summit",    city: "Summit Springs",nickname: "Peaks",      abbr: "SMT", primary: "#0f766e", secondary: "#fef3c7", rating: 74, conf: "east", starPos: "SG", starName: "Reece Quinn",        mascot: "mountain",shape: "diamond" },
  { id: "b_lakewood",  city: "Lakewood",      nickname: "Swans",      abbr: "LKW", primary: "#7c3aed", secondary: "#fff",    rating: 70, conf: "east", starPos: "PG", starName: "Tate Brooks",        mascot: "wing",   shape: "round" },
  { id: "b_sunridge",  city: "Sunridge",      nickname: "Suns",       abbr: "SNR", primary: "#fb923c", secondary: "#7c2d12", rating: 85, conf: "west", starPos: "SG", starName: "Drew Carver",        mascot: "sun",    shape: "star" },
  { id: "b_riverway",  city: "Riverway",      nickname: "Rapids",     abbr: "RVW", primary: "#0891b2", secondary: "#fff",    rating: 81, conf: "west", starPos: "C",  starName: "Khalil Stone",       mascot: "wave",   shape: "shield" },
  { id: "b_canyon",    city: "Canyon View",   nickname: "Coyotes",    abbr: "CYV", primary: "#9a3412", secondary: "#fde047", rating: 78, conf: "west", starPos: "PF", starName: "Beau Russo",         mascot: "wolf",   shape: "diamond" },
  { id: "b_blackpine", city: "Blackpine",     nickname: "Owls",       abbr: "BKP", primary: "#1e293b", secondary: "#a3e635", rating: 75, conf: "west", starPos: "SF", starName: "Mateo Quinn",        mascot: "wing",   shape: "round" },
  { id: "b_cedarcrest",city: "Cedarcrest",    nickname: "Lumberjacks",abbr: "CDR", primary: "#365314", secondary: "#fef3c7", rating: 72, conf: "west", starPos: "PG", starName: "Theo Hart",          mascot: "stag",   shape: "hexagon" },
  { id: "b_oasis",     city: "Oasis",         nickname: "Mirage",     abbr: "OAS", primary: "#854d0e", secondary: "#fde047", rating: 68, conf: "west", starPos: "C",  starName: "Roan Park",          mascot: "sun",    shape: "banner" },
];

// ── College Football — 16 teams ───────────────────────────────────────

const CFB: TeamSpec[] = [
  // East — Atlantic Conference
  { id: "c_evergreen", city: "Evergreen State",  nickname: "Pines",      abbr: "EVS", primary: "#14532d", secondary: "#fde047", rating: 88, conf: "east", starPos: "QB", starName: "Brock Carver",   mascot: "stag",   shape: "shield" },
  { id: "c_seabrook",  city: "Seabrook",         nickname: "Mariners",   abbr: "SEB", primary: "#0c4a6e", secondary: "#fde047", rating: 84, conf: "east", starPos: "WR", starName: "Asher Locke",    mascot: "anchor", shape: "diamond" },
  { id: "c_redmount",  city: "Redmount Tech",    nickname: "Hawks",      abbr: "RMT", primary: "#7f1d1d", secondary: "#fde047", rating: 82, conf: "east", starPos: "RB", starName: "Maverick Cole",  mascot: "hawk",   shape: "shield" },
  { id: "c_oakhill",   city: "Oakhill",          nickname: "Acorns",     abbr: "OAK", primary: "#a16207", secondary: "#fef3c7", rating: 79, conf: "east", starPos: "LB", starName: "Beau Stone",     mascot: "tiger",  shape: "round" },
  { id: "c_pinecrest", city: "Pinecrest",        nickname: "Bears",      abbr: "PNC", primary: "#5b21b6", secondary: "#fbbf24", rating: 76, conf: "east", starPos: "DB", starName: "Riley Marsh",    mascot: "bear",   shape: "hexagon" },
  { id: "c_birchwood", city: "Birchwood",        nickname: "Wolves",     abbr: "BWD", primary: "#0f172a", secondary: "#22c55e", rating: 72, conf: "east", starPos: "DL", starName: "Cole Park",      mascot: "wolf",   shape: "diamond" },
  { id: "c_shorewood", city: "Shorewood A&M",    nickname: "Tides",      abbr: "SHW", primary: "#0891b2", secondary: "#fef3c7", rating: 69, conf: "east", starPos: "WR", starName: "Quinn Pavel",    mascot: "wave",   shape: "banner" },
  { id: "c_meadowbrook",city:"Meadowbrook",      nickname: "Stags",      abbr: "MBR", primary: "#365314", secondary: "#fde047", rating: 66, conf: "east", starPos: "QB", starName: "Cash Yu",        mascot: "stag",   shape: "shield" },
  // West — Pacific Conference
  { id: "c_sunridge",  city: "Sunridge",         nickname: "Comets",     abbr: "SNR", primary: "#fb923c", secondary: "#7c2d12", rating: 90, conf: "west", starPos: "QB", starName: "Hudson Reeves",  mascot: "comet",  shape: "star" },
  { id: "c_canyonst",  city: "Canyon State",     nickname: "Coyotes",    abbr: "CST", primary: "#9a3412", secondary: "#fef3c7", rating: 85, conf: "west", starPos: "RB", starName: "Knox Calder",    mascot: "wolf",   shape: "round" },
  { id: "c_thunderbay",city: "Thunderbay Tech",  nickname: "Bolts",      abbr: "TBT", primary: "#1e1b4b", secondary: "#fde047", rating: 83, conf: "west", starPos: "WR", starName: "Bryce Quill",    mascot: "lightning",shape: "diamond" },
  { id: "c_bouldercrk",city: "Boulder Creek",    nickname: "Rams",       abbr: "BCC", primary: "#1f2937", secondary: "#fb923c", rating: 80, conf: "west", starPos: "DL", starName: "Reed Stein",     mascot: "ram",    shape: "shield" },
  { id: "c_silvercrk", city: "Silver Creek",     nickname: "Falcons",    abbr: "SVC", primary: "#1e293b", secondary: "#cbd5e1", rating: 77, conf: "west", starPos: "LB", starName: "Wyatt Brooks",   mascot: "hawk",   shape: "hexagon" },
  { id: "c_palmcoast", city: "Palmcoast",        nickname: "Suns",       abbr: "PCS", primary: "#fde047", secondary: "#a16207", rating: 73, conf: "west", starPos: "QB", starName: "Mateo Vega",     mascot: "sun",    shape: "round" },
  { id: "c_dustbowl",  city: "Dustbowl A&M",     nickname: "Bulls",      abbr: "DBL", primary: "#854d0e", secondary: "#fef3c7", rating: 70, conf: "west", starPos: "RB", starName: "Sloane Heath",   mascot: "bull",   shape: "banner" },
  { id: "c_highpine",  city: "High Pine",        nickname: "Lions",      abbr: "HPL", primary: "#7c2d12", secondary: "#fde047", rating: 67, conf: "west", starPos: "WR", starName: "Theo Pavel",     mascot: "lion",   shape: "shield" },
];

export const TEAMS_BY_SPORT: Record<SportId, Team[]> = {
  hockey: expand(HOCKEY),
  basketball: expand(BASKETBALL),
  cfb: expand(CFB),
};
