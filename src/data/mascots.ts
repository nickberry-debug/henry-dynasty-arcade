// Each mascot has a symbol id and "fits" tags — used to pair with city tags
import type { CityTag } from "./cities";

export type MascotCategory = "animal" | "myth" | "profession" | "nature" | "object";

export interface Mascot {
  name: string;
  symbol: string; // matches a symbol renderer key
  cat: MascotCategory;
  fits: CityTag[]; // city tag affinities
}

export const MASCOTS: Mascot[] = [
  // Animals — predators
  { name: "Eagles", symbol: "eagle", cat: "animal", fits: ["mountain","plains","north"] },
  { name: "Hawks", symbol: "hawk", cat: "animal", fits: ["plains","mountain","western"] },
  { name: "Falcons", symbol: "falcon", cat: "animal", fits: ["western","plains"] },
  { name: "Ravens", symbol: "raven", cat: "animal", fits: ["industrial","north"] },
  { name: "Bears", symbol: "bear", cat: "animal", fits: ["mountain","north"] },
  { name: "Grizzlies", symbol: "grizzly", cat: "animal", fits: ["mountain","western"] },
  { name: "Polar Bears", symbol: "polar", cat: "animal", fits: ["snowy","north"] },
  { name: "Wolves", symbol: "wolf", cat: "animal", fits: ["mountain","western","north"] },
  { name: "Foxes", symbol: "fox", cat: "animal", fits: ["plains","north"] },
  { name: "Lions", symbol: "lion", cat: "animal", fits: ["urban","south"] },
  { name: "Tigers", symbol: "tiger", cat: "animal", fits: ["urban","industrial"] },
  { name: "Jaguars", symbol: "jaguar", cat: "animal", fits: ["south","coastal","warm"] },
  { name: "Panthers", symbol: "panther", cat: "animal", fits: ["south","coastal","warm"] },
  { name: "Pumas", symbol: "puma", cat: "animal", fits: ["mountain","western"] },
  { name: "Bulls", symbol: "bull", cat: "animal", fits: ["urban","plains","south"] },
  { name: "Rams", symbol: "ram", cat: "animal", fits: ["mountain","western"] },
  { name: "Stallions", symbol: "horse", cat: "animal", fits: ["plains","western"] },
  { name: "Mustangs", symbol: "horse", cat: "animal", fits: ["plains","western"] },
  { name: "Longhorns", symbol: "longhorn", cat: "animal", fits: ["south","plains","warm"] },
  { name: "Bison", symbol: "bison", cat: "animal", fits: ["plains","north"] },
  { name: "Elk", symbol: "elk", cat: "animal", fits: ["mountain","western"] },
  { name: "Moose", symbol: "moose", cat: "animal", fits: ["north","snowy"] },
  // Aquatic
  { name: "Sharks", symbol: "shark", cat: "animal", fits: ["coastal","warm"] },
  { name: "Marlins", symbol: "marlin", cat: "animal", fits: ["coastal","warm","south"] },
  { name: "Dolphins", symbol: "dolphin", cat: "animal", fits: ["coastal","warm"] },
  { name: "Whales", symbol: "whale", cat: "animal", fits: ["coastal","north"] },
  { name: "Stingrays", symbol: "stingray", cat: "animal", fits: ["coastal","warm","south"] },
  { name: "Pelicans", symbol: "pelican", cat: "animal", fits: ["coastal","south","warm"] },
  // Reptiles
  { name: "Sidewinders", symbol: "snake", cat: "animal", fits: ["desert","western","warm"] },
  { name: "Rattlers", symbol: "snake", cat: "animal", fits: ["desert","south","warm"] },
  { name: "Cobras", symbol: "cobra", cat: "animal", fits: ["urban","warm"] },
  { name: "Alligators", symbol: "gator", cat: "animal", fits: ["south","coastal","warm","river"] },
  { name: "Raptors", symbol: "raptor", cat: "animal", fits: ["urban","north"] },
  { name: "Dragons", symbol: "dragon", cat: "myth", fits: ["urban","eastern"] },
  { name: "Phoenix", symbol: "phoenix", cat: "myth", fits: ["desert","warm","western"] },
  // Mythological
  { name: "Knights", symbol: "knight", cat: "myth", fits: ["eastern","north","urban"] },
  { name: "Vikings", symbol: "viking", cat: "myth", fits: ["north","coastal","snowy"] },
  { name: "Samurai", symbol: "samurai", cat: "myth", fits: ["western","urban"] },
  { name: "Gladiators", symbol: "gladiator", cat: "myth", fits: ["urban"] },
  { name: "Centurions", symbol: "centurion", cat: "myth", fits: ["urban"] },
  { name: "Spartans", symbol: "spartan", cat: "myth", fits: ["urban"] },
  { name: "Titans", symbol: "titan", cat: "myth", fits: ["urban","north"] },
  { name: "Griffins", symbol: "griffin", cat: "myth", fits: ["mountain","eastern"] },
  // Professions
  { name: "Pirates", symbol: "pirate", cat: "profession", fits: ["coastal","river"] },
  { name: "Privateers", symbol: "pirate", cat: "profession", fits: ["coastal","eastern"] },
  { name: "Buccaneers", symbol: "pirate", cat: "profession", fits: ["coastal","south","warm"] },
  { name: "Mariners", symbol: "anchor", cat: "profession", fits: ["coastal"] },
  { name: "Captains", symbol: "captain", cat: "profession", fits: ["coastal","river"] },
  { name: "Admirals", symbol: "anchor", cat: "profession", fits: ["coastal","eastern"] },
  { name: "Sailors", symbol: "sailor", cat: "profession", fits: ["coastal"] },
  { name: "Miners", symbol: "pickaxe", cat: "profession", fits: ["mountain","western","industrial"] },
  { name: "Lumberjacks", symbol: "axe", cat: "profession", fits: ["north","western"] },
  { name: "Loggers", symbol: "axe", cat: "profession", fits: ["north","western"] },
  { name: "Cowboys", symbol: "cowboy", cat: "profession", fits: ["plains","western","south"] },
  { name: "Wranglers", symbol: "cowboy", cat: "profession", fits: ["plains","western"] },
  { name: "Outlaws", symbol: "cowboy", cat: "profession", fits: ["western","desert"] },
  { name: "Astronauts", symbol: "rocket", cat: "profession", fits: ["south","urban"] },
  { name: "Soldiers", symbol: "shield", cat: "profession", fits: ["eastern","urban"] },
  { name: "Rangers", symbol: "star", cat: "profession", fits: ["plains","south","western"] },
  { name: "Senators", symbol: "letter", cat: "profession", fits: ["eastern","urban"] },
  { name: "Generals", symbol: "shield", cat: "profession", fits: ["south","eastern"] },
  // Objects/Nature
  { name: "Locomotives", symbol: "train", cat: "object", fits: ["industrial","plains"] },
  { name: "Galleons", symbol: "ship", cat: "object", fits: ["coastal"] },
  { name: "Lighthouses", symbol: "lighthouse", cat: "object", fits: ["coastal","north"] },
  { name: "Rockets", symbol: "rocket", cat: "object", fits: ["south","urban"] },
  { name: "Cannons", symbol: "cannon", cat: "object", fits: ["coastal","eastern"] },
  { name: "Bolts", symbol: "bolt", cat: "nature", fits: ["urban","south"] },
  { name: "Lightning", symbol: "bolt", cat: "nature", fits: ["urban","south"] },
  { name: "Storm", symbol: "storm", cat: "nature", fits: ["plains","coastal"] },
  { name: "Thunder", symbol: "storm", cat: "nature", fits: ["plains","mountain"] },
  { name: "Hurricanes", symbol: "wave", cat: "nature", fits: ["coastal","south","warm"] },
  { name: "Tornados", symbol: "tornado", cat: "nature", fits: ["plains","south"] },
  { name: "Cyclones", symbol: "tornado", cat: "nature", fits: ["plains","coastal"] },
  { name: "Blizzards", symbol: "snow", cat: "nature", fits: ["snowy","north"] },
  { name: "Avalanche", symbol: "snow", cat: "nature", fits: ["mountain","snowy"] },
  { name: "Tide", symbol: "wave", cat: "nature", fits: ["coastal"] },
  { name: "Surge", symbol: "wave", cat: "nature", fits: ["coastal"] },
  { name: "Wave", symbol: "wave", cat: "nature", fits: ["coastal","warm"] },
  { name: "Flame", symbol: "flame", cat: "nature", fits: ["desert","warm","south"] },
  { name: "Heat", symbol: "flame", cat: "nature", fits: ["desert","warm","south"] },
  { name: "Volcanoes", symbol: "mountain", cat: "nature", fits: ["coastal","warm"] },
  { name: "Mountaineers", symbol: "mountain", cat: "nature", fits: ["mountain","western"] },
  { name: "Peaks", symbol: "mountain", cat: "nature", fits: ["mountain","western"] },
  { name: "Timber", symbol: "tree", cat: "nature", fits: ["north","western"] },
  { name: "Cacti", symbol: "cactus", cat: "nature", fits: ["desert","western"] },
  { name: "Suns", symbol: "sun", cat: "nature", fits: ["desert","south","warm"] },
  { name: "Comets", symbol: "comet", cat: "nature", fits: ["urban","plains"] },
  { name: "Meteors", symbol: "comet", cat: "nature", fits: ["urban","plains"] },
  { name: "Stars", symbol: "star", cat: "nature", fits: ["urban"] },
  { name: "Galaxies", symbol: "star", cat: "nature", fits: ["urban"] },
  // Heritage / cultural
  { name: "Kings", symbol: "crown", cat: "myth", fits: ["urban","eastern"] },
  { name: "Royals", symbol: "crown", cat: "myth", fits: ["plains","urban"] },
  { name: "Diamonds", symbol: "diamond", cat: "object", fits: ["urban"] },
  { name: "Aces", symbol: "ace", cat: "object", fits: ["urban","desert"] },
  { name: "Jokers", symbol: "ace", cat: "object", fits: ["urban","desert"] },
  { name: "Saints", symbol: "halo", cat: "myth", fits: ["south","coastal"] },
  { name: "Angels", symbol: "halo", cat: "myth", fits: ["western","warm","south"] },
  { name: "Demons", symbol: "skull", cat: "myth", fits: ["urban"] },
  { name: "Reapers", symbol: "skull", cat: "myth", fits: ["urban"] }
];

// Banned pairings — explicit no-go's
const BANNED: Array<[string, string]> = [
  ["Phoenix","Glaciers"],
  ["Miami","Polar Bears"],
  ["Honolulu","Blizzards"],
  ["Las Vegas","Whales"],
  ["Denver","Marlins"],
  ["Anchorage","Suns"]
];

export function pairScore(cityTags: CityTag[], mascot: Mascot): number {
  let score = 0;
  for (const t of mascot.fits) if (cityTags.includes(t)) score += 3;
  // small base so any pairing has nonzero
  return score + 1;
}

export function isBanned(cityName: string, mascotName: string): boolean {
  return BANNED.some(([c, m]) => c === cityName && m === mascotName);
}
