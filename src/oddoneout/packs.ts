// Odd One Out — themed word packs. Each pack has 8+ pairs: a "group"
// word (what everyone else gets) and an "odd" word (what the Odd One
// Out gets so they can bluff). The odd word is SIMILAR enough that the
// odd player can fake a clue without an obvious tell.
//
// Tuning notes:
//   • Pairs are intentionally close. "Dog vs Cat" both have ears, fur,
//     tails — a Cat-player can comfortably bluff "I have whiskers" and
//     still sound plausible.
//   • Avoid pairs that are too easy (Dog vs Elephant: anyone can
//     ID the odd one in one clue).
//   • Avoid pairs that are TOO close (Dog vs Puppy: the bluff is
//     trivial and the round resolves on vibes).

export interface WordPair {
  group: string;
  odd: string;
}

export interface WordPack {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Age-band hint — used by the lobby's pack picker so adults can pick
   *  harder packs for older kids. 0 = anyone, 8 = ages 8+. */
  ageBand: 0 | 6 | 8;
  pairs: WordPair[];
}

export const PACKS: WordPack[] = [
  {
    id: "animals",
    name: "Animals",
    emoji: "🐾",
    description: "Furry, feathery, scaly. Common creatures vs their close cousins.",
    ageBand: 0,
    pairs: [
      { group: "Dog", odd: "Cat" },
      { group: "Lion", odd: "Tiger" },
      { group: "Eagle", odd: "Hawk" },
      { group: "Whale", odd: "Dolphin" },
      { group: "Bear", odd: "Wolf" },
      { group: "Cow", odd: "Horse" },
      { group: "Shark", odd: "Whale" },
      { group: "Rabbit", odd: "Squirrel" },
      { group: "Frog", odd: "Toad" },
      { group: "Owl", odd: "Bat" },
    ],
  },
  {
    id: "foods",
    name: "Foods",
    emoji: "🍕",
    description: "Snacks, meals, sweets. Close cousins on the plate.",
    ageBand: 0,
    pairs: [
      { group: "Pizza", odd: "Burger" },
      { group: "Apple", odd: "Pear" },
      { group: "Carrot", odd: "Celery" },
      { group: "Bread", odd: "Bagel" },
      { group: "Cookie", odd: "Brownie" },
      { group: "Hot Dog", odd: "Sausage" },
      { group: "Pasta", odd: "Noodles" },
      { group: "Cake", odd: "Pie" },
      { group: "Ice Cream", odd: "Frozen Yogurt" },
      { group: "Cereal", odd: "Oatmeal" },
    ],
  },
  {
    id: "places",
    name: "Places",
    emoji: "🏖️",
    description: "Where would you go? Same vibe, different spot.",
    ageBand: 0,
    pairs: [
      { group: "Beach", odd: "Pool" },
      { group: "Mountain", odd: "Hill" },
      { group: "Forest", odd: "Jungle" },
      { group: "City", odd: "Town" },
      { group: "Library", odd: "Bookstore" },
      { group: "Park", odd: "Playground" },
      { group: "Museum", odd: "Gallery" },
      { group: "Restaurant", odd: "Cafe" },
      { group: "Movie Theater", odd: "Arcade" },
      { group: "Hospital", odd: "Clinic" },
    ],
  },
  {
    id: "jobs",
    name: "Jobs",
    emoji: "👷",
    description: "What do you do all day? Twin-sounding professions.",
    ageBand: 6,
    pairs: [
      { group: "Doctor", odd: "Nurse" },
      { group: "Teacher", odd: "Professor" },
      { group: "Firefighter", odd: "Police Officer" },
      { group: "Pilot", odd: "Astronaut" },
      { group: "Chef", odd: "Baker" },
      { group: "Artist", odd: "Designer" },
      { group: "Athlete", odd: "Coach" },
      { group: "Farmer", odd: "Gardener" },
      { group: "Engineer", odd: "Architect" },
      { group: "Musician", odd: "Singer" },
    ],
  },
  {
    id: "sports",
    name: "Sports",
    emoji: "🏀",
    description: "Two close cousins on the field. Bluff with care.",
    ageBand: 6,
    pairs: [
      { group: "Basketball", odd: "Volleyball" },
      { group: "Soccer", odd: "Football" },
      { group: "Tennis", odd: "Badminton" },
      { group: "Baseball", odd: "Softball" },
      { group: "Hockey", odd: "Lacrosse" },
      { group: "Swimming", odd: "Diving" },
      { group: "Gymnastics", odd: "Cheerleading" },
      { group: "Boxing", odd: "Wrestling" },
      { group: "Skiing", odd: "Snowboarding" },
      { group: "Golf", odd: "Mini Golf" },
    ],
  },
  {
    id: "family",
    name: "Family",
    emoji: "👨‍👩‍👧",
    description: "People in your life. Family-shaped trickery.",
    ageBand: 0,
    pairs: [
      { group: "Mom", odd: "Aunt" },
      { group: "Dad", odd: "Uncle" },
      { group: "Brother", odd: "Cousin" },
      { group: "Sister", odd: "Cousin" },
      { group: "Grandma", odd: "Great-Aunt" },
      { group: "Grandpa", odd: "Great-Uncle" },
      { group: "Best Friend", odd: "Pen Pal" },
      { group: "Neighbor", odd: "Classmate" },
      { group: "Coach", odd: "Teacher" },
      { group: "Dog", odd: "Hamster" },
    ],
  },
];

export function getPack(id: string): WordPack | undefined {
  return PACKS.find(p => p.id === id);
}

/** Pull a random pair from a pack. */
export function rollPair(packId: string): { pack: WordPack; pair: WordPair } | null {
  const pack = getPack(packId);
  if (!pack || pack.pairs.length === 0) return null;
  const pair = pack.pairs[Math.floor(Math.random() * pack.pairs.length)];
  return { pack, pair };
}

export const DEFAULT_PACK = "animals";
