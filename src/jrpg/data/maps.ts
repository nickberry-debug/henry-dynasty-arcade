// Town & dungeon definitions (Threnfall + Silent Chapel).
// All proper nouns / NPC lines are original.

export interface NPC {
  id: string;
  x: number;
  y: number;
  line: string;
  tint?: string;
  role?: "innkeeper" | "shop" | "save" | "kid" | "elder" | "guard";
}

export interface TownMap {
  id: "town";
  w: number;
  h: number;
  tiles: string[];
  spawn: { x: number; y: number };
  npcs: NPC[];
  saveTile: { x: number; y: number };
}

export interface DungeonRoom {
  id: "dungeon-room-1" | "dungeon-room-2" | "dungeon-room-3" | "dungeon-boss";
  w: number;
  h: number;
  tiles: string[];
  spawn: { x: number; y: number };
  exits: Array<{ x: number; y: number; to: DungeonRoom["id"] | "town"; spawnAt?: { x: number; y: number } }>;
  encounterRate: number;
  chest?: { x: number; y: number; itemId: string; qty: number };
  bossTrigger?: { x: number; y: number };
  saveTile?: { x: number; y: number };
}

const TOWN_TILES = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WWSSSSSSSSSSSSSSSSSSSSSSSSSSSSWW",
  "WSSSS....................SSSSSSW",
  "WSSS....T..T....T..F..T...SSSSSW",
  "WSS.........rrrr.........TSSSSSW",
  "WSS..rrr....BBBBB.........SSSSSW",
  "WSS..BBB....BDBBB.....T...SSSSSW",
  "WSS..BDB....,,,,,..rrrr...SSSSSW",
  "WSS..,,,...,,,,,,.BBBB....SSSSSW",
  "WSS.,,,,..,,,,,,,,BDB.....SSSSSW",
  "WSS,,,,,,,,,,,,,,,,,,,,,..SSSSSW",
  "WSS,,,,,,,,,,,,,,,,,,,,,..SSSSSW",
  "WSS....,,,,,,,,,,,,,,,,...SSSSSW",
  "WSS.T..,,......,,...rrrr..SSSSSW",
  "WSS....,,...F..,,...BBBB.TSSSSSW",
  "WSS.rrr,,......,,...BDB...SSSSSW",
  "WSS.BBB,,..rrrr,,...,,,...SSSSSW",
  "WSS.BDB,,..BBBB,,...,,,...SSSSSW",
  "WSS.,,,,...BDB,,,,,,,,,,..SSSSSW",
  "WSS..,,,,,,,,,,,,,,,,,,...SSSSSW",
  "WSS...T.....F....T....X...SSSSSW",
  "WSSS...........................SW",
  "WSSSS...T...T.....T...T..SSSSSSW",
  "WSSSSSSSSSSSSSSSSSSSSSSSSSSSSSWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

export const TOWN_MAP: TownMap = {
  id: "town",
  w: TOWN_TILES[0].length,
  h: TOWN_TILES.length,
  tiles: TOWN_TILES,
  spawn: { x: 16, y: 13 },
  saveTile: { x: 12, y: 13 },
  npcs: [
    { id: "halden",    x: 9,  y: 13, role: "elder",     tint: "#9aa0a8",
      line: "Halden, Hushwalker: \"Your mother walked into the chapel three Tuesdays ago, Liora. She hasn't walked out. The lantern's still up there.\"" },
    { id: "bram",      x: 7,  y: 8,  role: "innkeeper", tint: "#d97706",
      line: "Innkeeper Bram: \"Bed's twelve coin. Free if you're a Vey — your mother slept here every winter solstice. Press A to rest.\"" },
    { id: "mira",      x: 19, y: 8,  role: "shop",      tint: "#9333ea",
      line: "Mira: \"Mendherb's eight coin, Tonewater fifteen. Don't go to the chapel without both.\"" },
    { id: "garrick",   x: 25, y: 11, role: "elder",     tint: "#0ea5e9",
      line: "Old Garrick: \"The bell up there hasn't rung in a year. Now last night, three of us heard it. Three of us.\"" },
    { id: "tomi",      x: 14, y: 12, role: "kid",       tint: "#84cc16",
      line: "Tomi (kid): \"My mum says don't talk about the silver patch in the chapel yard. She also says don't pick my nose. Adults are weird.\"" },
    { id: "tess",      x: 8,  y: 17, role: "elder",     tint: "#64748b",
      line: "Tess, widow: \"I forgot my husband's face on Tuesday. Then on Wednesday. I keep a sketch of him in my pocket so I'll never lose it again.\"" },
    { id: "lin",       x: 16, y: 17, role: "kid",       tint: "#facc15",
      line: "Lin (refugee child): \"My whole village went quiet. Mama says we're guests here until it... comes back. Will it come back?\"" },
    { id: "vester",    x: 20, y: 18, role: "guard",     tint: "#94a3b8",
      line: "Lookout Vester: \"The Hush patch is wider this morning. By a hand's width. Doesn't sound like much. It is.\"" },
    { id: "caleb",     x: 13, y: 19, role: "elder",     tint: "#a3a3a3",
      line: "Priest Caleb: \"My choir is six voices short. Six. They walked into the chapel one by one. Maybe the seventh shouldn't be you.\"" },
    { id: "the_hushed",x: 22, y: 14, role: "elder",     tint: "#cbd5e1",
      line: "A pale man stares at you. He whispers: \"...I have a name. It's... I had a name on Tuesday...\"" },
    { id: "shrinekeeper", x: 11, y: 13, role: "save",   tint: "#fbbf24",
      line: "A small silver chime hangs from a post. \"Touch the chime to save. The world will remember you, even if it forgets the rest.\"" },
  ],
};

const D1 = [
  "################",
  "#..............#",
  "#..############",
  "#..D.,,,,,,,...#",
  "#..#.,,,,,,,...#",
  "#..#.,,,,,,,...#",
  "#..#.,,,,,,,..C#",
  "#..#.,,,,,,,...#",
  "#..#.....S.....#",
  "#..#######.....#",
  "#............D.#",
  "################",
];

const D2 = [
  "################",
  "#..............#",
  "#.D..,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,..S#",
  "#....,,,,,,,...#",
  "#..............#",
  "#............D.#",
  "################",
];

const D3 = [
  "################",
  "#..............#",
  "#.D............#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#....,,,,,,,...#",
  "#..............#",
  "#..S.........D.#",
  "################",
];

const DB = [
  "################",
  "#..............#",
  "#.D............#",
  "#..............#",
  "#....,,,,,,....#",
  "#...,,,,,,,,...#",
  "#...,,,BB,,,...#",
  "#...,,,BB,,,...#",
  "#...,,,,,,,,...#",
  "#....,,,,,,....#",
  "#..............#",
  "################",
];

export const DUNGEON_ROOMS: Record<DungeonRoom["id"], DungeonRoom> = {
  "dungeon-room-1": {
    id: "dungeon-room-1",
    w: D1[0].length, h: D1.length, tiles: D1,
    spawn: { x: 2, y: 3 },
    saveTile: { x: 9, y: 8 },
    chest: { x: 14, y: 6, itemId: "lantern_oil", qty: 1 },
    exits: [
      { x: 13, y: 10, to: "dungeon-room-2", spawnAt: { x: 2, y: 2 } },
      { x: 3,  y: 3,  to: "town",           spawnAt: { x: 16, y: 22 } },
    ],
    encounterRate: 0.04,
  },
  "dungeon-room-2": {
    id: "dungeon-room-2",
    w: D2[0].length, h: D2.length, tiles: D2,
    spawn: { x: 2, y: 2 },
    saveTile: { x: 14, y: 6 },
    exits: [
      { x: 2,  y: 2, to: "dungeon-room-1", spawnAt: { x: 13, y: 10 } },
      { x: 13, y: 9, to: "dungeon-room-3", spawnAt: { x: 2,  y: 2 } },
    ],
    encounterRate: 0.06,
  },
  "dungeon-room-3": {
    id: "dungeon-room-3",
    w: D3[0].length, h: D3.length, tiles: D3,
    spawn: { x: 2, y: 2 },
    saveTile: { x: 3, y: 10 },
    exits: [
      { x: 2,  y: 2,  to: "dungeon-room-2", spawnAt: { x: 13, y: 9 } },
      { x: 13, y: 10, to: "dungeon-boss",   spawnAt: { x: 2,  y: 2 } },
    ],
    encounterRate: 0.06,
  },
  "dungeon-boss": {
    id: "dungeon-boss",
    w: DB[0].length, h: DB.length, tiles: DB,
    spawn: { x: 2, y: 2 },
    bossTrigger: { x: 7, y: 6 },
    exits: [
      { x: 2, y: 2, to: "dungeon-room-3", spawnAt: { x: 13, y: 10 } },
    ],
    encounterRate: 0,
  },
};

export function isPassableTownTile(c: string): boolean {
  return c === "." || c === "," || c === "S" || c === "D" || c === "X" || c === "F";
}
export function isPassableDungeonTile(c: string): boolean {
  return c === "." || c === "," || c === "S" || c === "D" || c === "C" || c === "B";
}
