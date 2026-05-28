// Real MLB team data for MLB Mode
export interface MlbTeamData {
  city: string;
  name: string;
  abbr: string;
  primary: string;
  secondary: string;
  accent: string;
  symbol: string;
  stadium: string;
  capacity: number;
  lf: number; cf: number; rf: number;
  altitude: number;
  surface: "grass" | "turf";
  roof: "open" | "retractable" | "dome";
  parkFactor: number;
}

export const MLB_TEAMS: MlbTeamData[] = [
  { city: "Boston", name: "Red Sox", abbr: "BOS", primary: "#bd3039", secondary: "#0c2340", accent: "#ffffff", symbol: "letter", stadium: "Fenway Park", capacity: 37755, lf: 310, cf: 420, rf: 302, altitude: 21, surface: "grass", roof: "open", parkFactor: 104 },
  { city: "New York", name: "Yankees", abbr: "NYY", primary: "#0c2340", secondary: "#c4ced3", accent: "#ffffff", symbol: "letter", stadium: "Yankee Stadium", capacity: 47309, lf: 318, cf: 408, rf: 314, altitude: 8, surface: "grass", roof: "open", parkFactor: 103 },
  { city: "Tampa Bay", name: "Rays", abbr: "TB", primary: "#092c5c", secondary: "#8fbce6", accent: "#f5d130", symbol: "stingray", stadium: "Tropicana Field", capacity: 25025, lf: 315, cf: 404, rf: 322, altitude: 15, surface: "turf", roof: "dome", parkFactor: 95 },
  { city: "Baltimore", name: "Orioles", abbr: "BAL", primary: "#df4601", secondary: "#000000", accent: "#ffffff", symbol: "bird", stadium: "Oriole Park at Camden Yards", capacity: 44970, lf: 333, cf: 410, rf: 318, altitude: 33, surface: "grass", roof: "open", parkFactor: 102 },
  { city: "Toronto", name: "Blue Jays", abbr: "TOR", primary: "#134a8e", secondary: "#1d2d5c", accent: "#e8291c", symbol: "bird", stadium: "Rogers Centre", capacity: 41500, lf: 328, cf: 400, rf: 328, altitude: 250, surface: "turf", roof: "retractable", parkFactor: 102 },
  { city: "Chicago", name: "White Sox", abbr: "CHW", primary: "#27251f", secondary: "#c4ced4", accent: "#ffffff", symbol: "letter", stadium: "Guaranteed Rate Field", capacity: 40615, lf: 330, cf: 400, rf: 335, altitude: 595, surface: "grass", roof: "open", parkFactor: 101 },
  { city: "Cleveland", name: "Guardians", abbr: "CLE", primary: "#e31937", secondary: "#0c2340", accent: "#ffffff", symbol: "shield", stadium: "Progressive Field", capacity: 34788, lf: 325, cf: 410, rf: 325, altitude: 660, surface: "grass", roof: "open", parkFactor: 99 },
  { city: "Detroit", name: "Tigers", abbr: "DET", primary: "#0c2340", secondary: "#fa4616", accent: "#ffffff", symbol: "tiger", stadium: "Comerica Park", capacity: 41083, lf: 345, cf: 420, rf: 330, altitude: 600, surface: "grass", roof: "open", parkFactor: 95 },
  { city: "Kansas City", name: "Royals", abbr: "KC", primary: "#004687", secondary: "#bd9b60", accent: "#ffffff", symbol: "crown", stadium: "Kauffman Stadium", capacity: 37903, lf: 330, cf: 410, rf: 330, altitude: 750, surface: "grass", roof: "open", parkFactor: 100 },
  { city: "Minnesota", name: "Twins", abbr: "MIN", primary: "#002b5c", secondary: "#d31145", accent: "#b9975b", symbol: "letter", stadium: "Target Field", capacity: 38544, lf: 339, cf: 411, rf: 328, altitude: 815, surface: "grass", roof: "open", parkFactor: 100 },
  { city: "Houston", name: "Astros", abbr: "HOU", primary: "#002d62", secondary: "#eb6e1f", accent: "#f4911e", symbol: "star", stadium: "Minute Maid Park", capacity: 41168, lf: 315, cf: 409, rf: 326, altitude: 22, surface: "grass", roof: "retractable", parkFactor: 102 },
  { city: "Seattle", name: "Mariners", abbr: "SEA", primary: "#0c2c56", secondary: "#005c5c", accent: "#c4ced4", symbol: "anchor", stadium: "T-Mobile Park", capacity: 47929, lf: 331, cf: 401, rf: 326, altitude: 134, surface: "grass", roof: "retractable", parkFactor: 96 },
  { city: "Texas", name: "Rangers", abbr: "TEX", primary: "#003278", secondary: "#c0111f", accent: "#ffffff", symbol: "star", stadium: "Globe Life Field", capacity: 40300, lf: 329, cf: 407, rf: 326, altitude: 551, surface: "turf", roof: "retractable", parkFactor: 100 },
  { city: "Oakland", name: "Athletics", abbr: "OAK", primary: "#003831", secondary: "#efb21e", accent: "#a2aaad", symbol: "letter", stadium: "Oakland Coliseum", capacity: 46847, lf: 330, cf: 400, rf: 330, altitude: 13, surface: "grass", roof: "open", parkFactor: 96 },
  { city: "Los Angeles", name: "Angels", abbr: "LAA", primary: "#ba0021", secondary: "#003263", accent: "#862633", symbol: "halo", stadium: "Angel Stadium", capacity: 45517, lf: 330, cf: 400, rf: 330, altitude: 156, surface: "grass", roof: "open", parkFactor: 99 },
  { city: "Atlanta", name: "Braves", abbr: "ATL", primary: "#ce1141", secondary: "#13274f", accent: "#eaaa00", symbol: "letter", stadium: "Truist Park", capacity: 41084, lf: 335, cf: 400, rf: 325, altitude: 1050, surface: "grass", roof: "open", parkFactor: 101 },
  { city: "Miami", name: "Marlins", abbr: "MIA", primary: "#00a3e0", secondary: "#ef3340", accent: "#000000", symbol: "marlin", stadium: "loanDepot park", capacity: 36742, lf: 344, cf: 407, rf: 335, altitude: 8, surface: "grass", roof: "retractable", parkFactor: 97 },
  { city: "New York", name: "Mets", abbr: "NYM", primary: "#002d72", secondary: "#fd5a1e", accent: "#ffffff", symbol: "letter", stadium: "Citi Field", capacity: 41922, lf: 335, cf: 408, rf: 330, altitude: 39, surface: "grass", roof: "open", parkFactor: 96 },
  { city: "Philadelphia", name: "Phillies", abbr: "PHI", primary: "#e81828", secondary: "#002d72", accent: "#ffffff", symbol: "letter", stadium: "Citizens Bank Park", capacity: 42792, lf: 329, cf: 401, rf: 330, altitude: 39, surface: "grass", roof: "open", parkFactor: 104 },
  { city: "Washington", name: "Nationals", abbr: "WSH", primary: "#ab0003", secondary: "#11225b", accent: "#ffffff", symbol: "letter", stadium: "Nationals Park", capacity: 41339, lf: 336, cf: 402, rf: 335, altitude: 13, surface: "grass", roof: "open", parkFactor: 100 },
  { city: "Chicago", name: "Cubs", abbr: "CHC", primary: "#0e3386", secondary: "#cc3433", accent: "#ffffff", symbol: "letter", stadium: "Wrigley Field", capacity: 41649, lf: 355, cf: 400, rf: 353, altitude: 595, surface: "grass", roof: "open", parkFactor: 102 },
  { city: "Cincinnati", name: "Reds", abbr: "CIN", primary: "#c6011f", secondary: "#000000", accent: "#ffffff", symbol: "letter", stadium: "Great American Ball Park", capacity: 42319, lf: 328, cf: 404, rf: 325, altitude: 482, surface: "grass", roof: "open", parkFactor: 105 },
  { city: "Milwaukee", name: "Brewers", abbr: "MIL", primary: "#12284b", secondary: "#ffc52f", accent: "#ffffff", symbol: "letter", stadium: "American Family Field", capacity: 41900, lf: 344, cf: 400, rf: 345, altitude: 635, surface: "grass", roof: "retractable", parkFactor: 100 },
  { city: "Pittsburgh", name: "Pirates", abbr: "PIT", primary: "#27251f", secondary: "#fdb827", accent: "#ffffff", symbol: "pirate", stadium: "PNC Park", capacity: 38362, lf: 325, cf: 399, rf: 320, altitude: 730, surface: "grass", roof: "open", parkFactor: 97 },
  { city: "St. Louis", name: "Cardinals", abbr: "STL", primary: "#c41e3a", secondary: "#0c2340", accent: "#fedb00", symbol: "bird", stadium: "Busch Stadium", capacity: 44494, lf: 336, cf: 400, rf: 335, altitude: 466, surface: "grass", roof: "open", parkFactor: 99 },
  { city: "Arizona", name: "Diamondbacks", abbr: "ARI", primary: "#a71930", secondary: "#e3d4ad", accent: "#000000", symbol: "snake", stadium: "Chase Field", capacity: 48405, lf: 330, cf: 407, rf: 335, altitude: 1100, surface: "grass", roof: "retractable", parkFactor: 103 },
  { city: "Colorado", name: "Rockies", abbr: "COL", primary: "#33006f", secondary: "#c4ced4", accent: "#000000", symbol: "mountain", stadium: "Coors Field", capacity: 50144, lf: 347, cf: 415, rf: 350, altitude: 5280, surface: "grass", roof: "open", parkFactor: 115 },
  { city: "Los Angeles", name: "Dodgers", abbr: "LAD", primary: "#005a9c", secondary: "#ffffff", accent: "#ef3e42", symbol: "letter", stadium: "Dodger Stadium", capacity: 56000, lf: 330, cf: 395, rf: 330, altitude: 510, surface: "grass", roof: "open", parkFactor: 99 },
  { city: "San Diego", name: "Padres", abbr: "SD", primary: "#2f241d", secondary: "#ffc425", accent: "#ffffff", symbol: "friar", stadium: "Petco Park", capacity: 40209, lf: 334, cf: 396, rf: 322, altitude: 13, surface: "grass", roof: "open", parkFactor: 95 },
  { city: "San Francisco", name: "Giants", abbr: "SF", primary: "#fd5a1e", secondary: "#27251f", accent: "#ad8746", symbol: "letter", stadium: "Oracle Park", capacity: 41915, lf: 339, cf: 399, rf: 309, altitude: 13, surface: "grass", roof: "open", parkFactor: 94 }
];
