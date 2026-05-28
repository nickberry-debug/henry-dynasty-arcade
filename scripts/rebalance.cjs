/**
 * One-shot stat rebalance for src/battleforge/presets.ts.
 *
 * Goal (per polish-pass spec):
 *  - Cosmic/godlike  → HP 2000-4000, atk 200-500, size HUGE (colossal here)
 *  - Top-tier supers → HP  800-1200, atk 100-200, size large
 *  - A-list supers   → HP  200-400,  atk  30-80
 *  - B-list / sidekick → HP 100-200, atk 15-40
 *  - Mooks / kids / objects → HP 50-150, atk 5-20, size small/tiny
 *
 *  Range:
 *    melee 1-2, short-range 3-5, ranged 6-10, long-range 10-15, cosmic 20+
 *  Speed:
 *    cosmic 5, very-fast 15-20, average 8-10, heavy 6-8
 *
 * Stats live in:
 *   c("id", "Name", emoji, category, size, type, [hp,power,speed,defense,special], ...)
 *
 * After computing the new stats we:
 *   1) replace the 5-tuple inside the c(...) call
 *   2) insert a one-line // comment above the c(...) call describing the tier
 *
 * Idempotent: previous "// <name>: tier" comments are stripped before re-adding.
 */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "src", "battleforge", "presets.ts");
let src = fs.readFileSync(FILE, "utf8");

// ── Tier definitions ───────────────────────────────────────────────────────
const TIERS = {
  cosmic:  { hp: 3000, power: 350, speed: 5,  defense: 900, special: 990, sizeHint: "colossal", reach: "cosmic"   },
  toptier: { hp: 1000, power: 150, speed: 9,  defense: 600, special: 850, sizeHint: "large",    reach: "long"     },
  alist:   { hp: 300,  power: 55,  speed: 12, defense: 280, special: 600, sizeHint: "medium",   reach: "ranged"   },
  blist:   { hp: 150,  power: 28,  speed: 10, defense: 200, special: 450, sizeHint: "medium",   reach: "short"    },
  mook:    { hp: 100,  power: 12,  speed: 8,  defense: 100, special: 250, sizeHint: "small",    reach: "melee"    },
  // Animals/objects spread across mook…alist by their actual menace level.
};

// Explicit overrides for the marquee characters by id. Anyone not listed
// falls back to category-based + heuristic classification below.
const OVERRIDES = {
  // ── COSMIC / GODLIKE ─────────────────────────────────────────────────────
  galactus:       { tier: "cosmic", power: 400, hp: 3500, blurb: "cosmic-tier, planet-eater" },
  thanos:         { tier: "cosmic", power: 380, hp: 3200, blurb: "Infinity-Gauntlet cosmic-tier" },
  sentry:         { tier: "cosmic", power: 320, hp: 2400, blurb: "million-sun cosmic-tier" },
  onslaught:      { tier: "cosmic", power: 380, hp: 3000, blurb: "psychic cosmic-tier" },
  sauron:         { tier: "cosmic", power: 360, hp: 3000, blurb: "dark-lord cosmic-tier" },
  master_hand:    { tier: "cosmic", power: 340, hp: 2800, blurb: "abstract cosmic-tier" },
  vishnu:         { tier: "cosmic", power: 360, hp: 3000, blurb: "preserver-god cosmic-tier" },
  shiva:          { tier: "cosmic", power: 400, hp: 3500, blurb: "destroyer-god cosmic-tier" },
  zeus:           { tier: "cosmic", power: 360, hp: 2800, blurb: "king-of-Olympus cosmic-tier" },
  poseidon:       { tier: "cosmic", power: 320, hp: 2600, blurb: "sea-god cosmic-tier" },
  thor_thunder:   { tier: "cosmic", power: 380, hp: 3000, blurb: "true-form thunder god" },
  escanor:        { tier: "cosmic", power: 420, hp: 2800, blurb: "high-noon cosmic-tier" },
  gojo:           { tier: "cosmic", power: 360, hp: 2600, blurb: "Limitless cosmic-tier" },
  sukuna:         { tier: "cosmic", power: 380, hp: 2800, blurb: "King of Curses cosmic-tier" },
  madara:         { tier: "cosmic", power: 360, hp: 2600, blurb: "Six Paths cosmic-tier" },
  aizen:          { tier: "cosmic", power: 340, hp: 2400, blurb: "Kyōka-Suigetsu cosmic-tier" },
  kenpachi:       { tier: "cosmic", power: 380, hp: 2800, blurb: "Zaraki cosmic-tier brute" },
  ichigo:         { tier: "cosmic", power: 320, hp: 2400, blurb: "Getsuga cosmic-tier" },
  saitama:        { tier: "cosmic", power: 500, hp: 4000, blurb: "one-punch cosmic-tier" },
  goku:           { tier: "cosmic", power: 380, hp: 2800, blurb: "Spirit Bomb cosmic-tier" },
  vegeta:         { tier: "cosmic", power: 360, hp: 2600, blurb: "Final-Flash cosmic-tier" },
  frieza:         { tier: "cosmic", power: 340, hp: 2400, blurb: "tyrant cosmic-tier" },
  arthas:         { tier: "cosmic", power: 280, hp: 2200, blurb: "Lich-King cosmic-tier" },
  alien_queen:    { tier: "cosmic", power: 280, hp: 2400, blurb: "hive-queen cosmic-tier" },
  balrog:         { tier: "cosmic", power: 320, hp: 2600, blurb: "Maia-flame cosmic-tier" },
  godzilla:       { tier: "cosmic", power: 360, hp: 3000, blurb: "kaiju cosmic-tier" },
  king_kong:      { tier: "cosmic", power: 320, hp: 2600, blurb: "kaiju cosmic-tier" },
  hulk:           { tier: "cosmic", power: 320, hp: 2800, blurb: "Hulk-smash cosmic-tier" },
  superman:       { tier: "cosmic", power: 300, hp: 2400, blurb: "Kryptonian cosmic-tier", speed: 14 },
  juggernaut:     { tier: "cosmic", power: 260, hp: 2400, blurb: "unstoppable cosmic-tier" },
  mind_flayer:    { tier: "cosmic", power: 280, hp: 2200, blurb: "interdimensional cosmic-tier" },
  ultron:         { tier: "cosmic", power: 240, hp: 2000, blurb: "hive-mind cosmic-tier" },
  groot:          { tier: "cosmic", power: 200, hp: 2200, blurb: "I-am-Groot cosmic-tier" },
  the_thing:      { tier: "cosmic", power: 240, hp: 2200, blurb: "rock-titan cosmic-tier" },
  colossus:       { tier: "cosmic", power: 220, hp: 2200, blurb: "organic-steel cosmic-tier" },
  storm_giant:    { tier: "cosmic", power: 280, hp: 2400, blurb: "mountain-toppling cosmic-tier" },
  sand_wyrm:      { tier: "cosmic", power: 260, hp: 2400, blurb: "Shai-Hulud cosmic-tier" },
  crystal_golem:  { tier: "cosmic", power: 220, hp: 2200, blurb: "elemental cosmic-tier" },
  galadriel:      { tier: "cosmic", power: 220, hp: 2000, blurb: "Ring-touched cosmic-tier" },

  // ── TOP-TIER ─────────────────────────────────────────────────────────────
  thor:           { tier: "toptier", power: 180, hp: 1100, blurb: "Asgardian top-tier" },
  wonder_woman:   { tier: "toptier", power: 160, hp: 1100, blurb: "Amazon top-tier" },
  captain_america:{ tier: "toptier", power: 130, hp: 1000, blurb: "super-soldier top-tier" },
  iron_man:       { tier: "toptier", power: 160, hp: 1000, blurb: "repulsor-armour top-tier" },
  shazam:         { tier: "toptier", power: 180, hp: 1100, blurb: "lightning top-tier" },
  scarlet_witch:  { tier: "toptier", power: 200, hp: 1000, blurb: "Chaos-Magic top-tier" },
  jean_grey:      { tier: "toptier", power: 200, hp: 1000, blurb: "Phoenix top-tier" },
  dr_strange:     { tier: "toptier", power: 180, hp: 950,  blurb: "Sorcerer Supreme top-tier" },
  silver_surfer:  { tier: "toptier", power: 190, hp: 1100, blurb: "Power-Cosmic top-tier", speed: 18 },
  hela:           { tier: "toptier", power: 170, hp: 1100, blurb: "Asgardian death-god top-tier" },
  ghost_rider:    { tier: "toptier", power: 180, hp: 1000, blurb: "spirit-of-vengeance top-tier" },
  aquaman:        { tier: "toptier", power: 150, hp: 1100, blurb: "Atlantean top-tier" },
  prof_x:         { tier: "toptier", power: 200, hp: 800,  blurb: "telepathic top-tier" },
  magneto:        { tier: "toptier", power: 180, hp: 950,  blurb: "magnetism top-tier" },
  dr_doom:        { tier: "toptier", power: 180, hp: 1100, blurb: "Latverian top-tier" },
  red_skull:      { tier: "toptier", power: 140, hp: 900,  blurb: "Hydra top-tier" },
  spawn:          { tier: "toptier", power: 170, hp: 1000, blurb: "hellspawn top-tier" },
  ares:           { tier: "toptier", power: 180, hp: 1100, blurb: "war-god top-tier" },
  odin:           { tier: "toptier", power: 170, hp: 1100, blurb: "All-Father top-tier" },
  kratos:         { tier: "toptier", power: 180, hp: 1100, blurb: "god-of-war top-tier" },
  ganondorf:      { tier: "toptier", power: 170, hp: 1100, blurb: "King of Evil top-tier" },
  agent_smith:    { tier: "toptier", power: 160, hp: 1000, blurb: "rogue-AI top-tier" },
  yoda:           { tier: "toptier", power: 200, hp: 900,  blurb: "grandmaster top-tier" },
  palpatine:      { tier: "toptier", power: 200, hp: 950,  blurb: "Sith Lord top-tier" },
  darth_vader:    { tier: "toptier", power: 170, hp: 1000, blurb: "Sith top-tier" },
  gandalf:        { tier: "toptier", power: 180, hp: 1000, blurb: "Istari top-tier" },
  thor_egyptian:  { tier: "toptier", power: 170, hp: 1000, blurb: "Thoth wisdom-god top-tier" },
  amaterasu:      { tier: "toptier", power: 170, hp: 1000, blurb: "sun-goddess top-tier" },
  susanoo:        { tier: "toptier", power: 180, hp: 1100, blurb: "storm-god top-tier" },
  hades_god:      { tier: "toptier", power: 180, hp: 1100, blurb: "underworld top-tier" },
  athena:         { tier: "toptier", power: 160, hp: 1000, blurb: "war-wisdom top-tier" },
  apollo:         { tier: "toptier", power: 170, hp: 1000, blurb: "sun-god top-tier" },
  artemis:        { tier: "toptier", power: 170, hp: 1000, blurb: "moon huntress top-tier" },
  bayonetta:      { tier: "toptier", power: 180, hp: 1000, blurb: "Umbra Witch top-tier" },
  dante_dmc:      { tier: "toptier", power: 180, hp: 1100, blurb: "Nephilim top-tier" },
  vergil:         { tier: "toptier", power: 200, hp: 1100, blurb: "Yamato top-tier" },
  doom_slayer:    { tier: "toptier", power: 200, hp: 1100, blurb: "Hell-walker top-tier" },
  itachi:         { tier: "toptier", power: 180, hp: 800,  blurb: "Mangekyō top-tier" },
  naruto:         { tier: "toptier", power: 170, hp: 1000, blurb: "Hokage top-tier" },
  sasuke:         { tier: "toptier", power: 180, hp: 950,  blurb: "Sharingan top-tier" },
  luffy:          { tier: "toptier", power: 160, hp: 1000, blurb: "Pirate-King top-tier" },
  zoro_op:        { tier: "toptier", power: 170, hp: 1100, blurb: "three-sword top-tier" },
  rengoku:        { tier: "toptier", power: 170, hp: 1000, blurb: "Flame Hashira top-tier" },
  erza:           { tier: "toptier", power: 170, hp: 1000, blurb: "Titania top-tier" },
  killua:         { tier: "toptier", power: 180, hp: 800,  blurb: "Godspeed top-tier", speed: 20 },
  piccolo:        { tier: "toptier", power: 160, hp: 1000, blurb: "Namekian top-tier" },

  // ── A-LIST ────────────────────────────────────────────────────────────────
  spider_man:     { tier: "alist", power: 60,  hp: 350,  blurb: "spider-sense A-list", speed: 18 },
  flash:          { tier: "alist", power: 50,  hp: 320,  blurb: "speedster A-list", speed: 20 },
  batman:         { tier: "alist", power: 55,  hp: 380,  blurb: "World's-Greatest-Detective A-list" },
  black_panther:  { tier: "alist", power: 65,  hp: 380,  blurb: "Wakandan A-list" },
  daredevil:      { tier: "alist", power: 60,  hp: 340,  blurb: "radar-sense A-list" }, // not in list but kept for safety
  storm:          { tier: "alist", power: 70,  hp: 360,  blurb: "weather A-list" },
  cyclops:        { tier: "alist", power: 75,  hp: 360,  blurb: "optic-blast A-list" },
  wolverine_x:    { tier: "alist", power: 70,  hp: 400,  blurb: "healing-factor A-list" },
  wolverine:      { tier: "alist", power: 65,  hp: 380,  blurb: "berserker A-list" },
  joker:          { tier: "alist", power: 60,  hp: 280,  blurb: "Clown-Prince A-list" },
  harley_quinn:   { tier: "alist", power: 55,  hp: 280,  blurb: "trickster A-list" },
  hawkeye:        { tier: "alist", power: 50,  hp: 280,  blurb: "archer A-list" },
  war_machine:    { tier: "alist", power: 65,  hp: 400,  blurb: "armoured A-list" },
  moonknight:     { tier: "alist", power: 60,  hp: 380,  blurb: "Khonshu A-list" },
  nightcrawler:   { tier: "alist", power: 55,  hp: 300,  blurb: "teleporter A-list", speed: 18 },
  mystique:       { tier: "alist", power: 60,  hp: 320,  blurb: "shapeshifter A-list" },
  rocket:         { tier: "alist", power: 50,  hp: 240,  blurb: "raccoon-A-list-gunner" },
  ant_man:        { tier: "alist", power: 55,  hp: 260,  blurb: "size-shifter A-list" },
  human_torch:    { tier: "alist", power: 70,  hp: 320,  blurb: "FF A-list" },
  invisible_woman:{ tier: "alist", power: 60,  hp: 360,  blurb: "force-field A-list" },
  deadpool:       { tier: "alist", power: 65,  hp: 400,  blurb: "regenerator A-list" },
  predator:       { tier: "alist", power: 70,  hp: 380,  blurb: "yautja A-list" },
  xenomorph:      { tier: "alist", power: 70,  hp: 360,  blurb: "alien A-list" },
  terminator:     { tier: "alist", power: 75,  hp: 400,  blurb: "T-800 A-list" },
  t1000:          { tier: "alist", power: 80,  hp: 380,  blurb: "liquid-metal A-list" },
  robocop:        { tier: "alist", power: 70,  hp: 400,  blurb: "cyborg A-list" },
  neo:            { tier: "alist", power: 70,  hp: 360,  blurb: "Matrix-One A-list", speed: 18 },
  mandalorian:    { tier: "alist", power: 55,  hp: 320,  blurb: "bounty-hunter A-list" },
  the_mask:       { tier: "alist", power: 60,  hp: 320,  blurb: "Loki-tier toon A-list", speed: 18 },
  link:           { tier: "alist", power: 60,  hp: 340,  blurb: "Hylian-Hero A-list" },
  mario:          { tier: "alist", power: 50,  hp: 300,  blurb: "plumber A-list" },
  bowser:         { tier: "alist", power: 75,  hp: 400,  blurb: "Koopa-King A-list" },
  master_chief:   { tier: "alist", power: 70,  hp: 400,  blurb: "Spartan-117 A-list" },
  samus:          { tier: "alist", power: 70,  hp: 380,  blurb: "bounty-hunter A-list" },
  cloud:          { tier: "alist", power: 70,  hp: 400,  blurb: "SOLDIER A-list" },
  geralt:         { tier: "alist", power: 70,  hp: 400,  blurb: "Witcher A-list" },
  2: undefined, // placeholder
  "2b":           { tier: "alist", power: 70,  hp: 360,  blurb: "android A-list" },
  ciri:           { tier: "alist", power: 65,  hp: 350,  blurb: "elder-blood A-list" },
  ryu_sf:         { tier: "alist", power: 65,  hp: 360,  blurb: "world-warrior A-list" },
  akuma:          { tier: "alist", power: 75,  hp: 380,  blurb: "demon A-list" },
  chun_li:        { tier: "alist", power: 60,  hp: 340,  blurb: "world-warrior A-list" },
  genji:          { tier: "alist", power: 65,  hp: 320,  blurb: "cyber-ninja A-list", speed: 18 },
  tracer:         { tier: "alist", power: 50,  hp: 240,  blurb: "blink A-list", speed: 20 },
  dva:            { tier: "alist", power: 70,  hp: 400,  blurb: "mech-pilot A-list" },
  genos:          { tier: "alist", power: 70,  hp: 360,  blurb: "cyborg A-list" },
  tanjiro:        { tier: "alist", power: 60,  hp: 340,  blurb: "water-breather A-list" },
  zenitsu:        { tier: "alist", power: 80,  hp: 280,  blurb: "thunder-breather A-list", speed: 20 },
  edward_elric:   { tier: "alist", power: 60,  hp: 340,  blurb: "alchemist A-list" },
  natsu:          { tier: "alist", power: 65,  hp: 360,  blurb: "Dragon-Slayer A-list" },
  morrigan:       { tier: "alist", power: 60,  hp: 360,  blurb: "Phantom-Queen A-list" },
  bast:           { tier: "alist", power: 55,  hp: 320,  blurb: "cat-goddess A-list" },
  hecate:         { tier: "alist", power: 65,  hp: 320,  blurb: "magic-goddess A-list" },
  hermes:         { tier: "alist", power: 50,  hp: 260,  blurb: "messenger A-list", speed: 20 },
  hephaestus:     { tier: "alist", power: 65,  hp: 400,  blurb: "forge-god A-list" },
  ra:             { tier: "alist", power: 65,  hp: 360,  blurb: "sun-god A-list" },
  anubis:         { tier: "alist", power: 60,  hp: 360,  blurb: "death-god A-list" },
  loki:           { tier: "alist", power: 65,  hp: 300,  blurb: "trickster-god A-list" },
  fenrir:         { tier: "alist", power: 75,  hp: 400,  blurb: "world-ender wolf A-list" },
  medusa:         { tier: "alist", power: 70,  hp: 320,  blurb: "Gorgon A-list" },
  minotaur:       { tier: "alist", power: 75,  hp: 400,  blurb: "Labyrinth A-list" },
  quetzalcoatl:   { tier: "alist", power: 70,  hp: 400,  blurb: "feathered-serpent A-list" },
  kali:           { tier: "alist", power: 80,  hp: 380,  blurb: "destruction-goddess A-list" },
  tezcatlipoca:   { tier: "alist", power: 65,  hp: 360,  blurb: "smoking-mirror A-list" },
  cernunnos:      { tier: "alist", power: 65,  hp: 360,  blurb: "horned-god A-list" },
  ganesh:         { tier: "alist", power: 60,  hp: 380,  blurb: "remover-of-obstacles A-list" },
  aragorn:        { tier: "alist", power: 65,  hp: 400,  blurb: "Numenorean A-list" },
  legolas:        { tier: "alist", power: 55,  hp: 240,  blurb: "elven-archer A-list", speed: 18 },
  ripley:         { tier: "alist", power: 50,  hp: 300,  blurb: "tough-survivor A-list" },
  lich_king:      { tier: "alist", power: 75,  hp: 380,  blurb: "necromancer A-list" },
  void_witch:     { tier: "alist", power: 70,  hp: 340,  blurb: "entropy A-list" },
  time_knight:    { tier: "alist", power: 65,  hp: 360,  blurb: "temporal A-list" },
  vampire_lord:   { tier: "alist", power: 65,  hp: 400,  blurb: "undead-noble A-list" },
  werewolf:       { tier: "alist", power: 70,  hp: 400,  blurb: "lycan A-list" },
  dragon_knight:  { tier: "alist", power: 75,  hp: 400,  blurb: "dragon-rider A-list" },
  orc_warlord:    { tier: "alist", power: 75,  hp: 400,  blurb: "Waaagh A-list" },
  space_marine:   { tier: "alist", power: 70,  hp: 400,  blurb: "power-armour A-list" },
  mech_pilot:     { tier: "alist", power: 75,  hp: 400,  blurb: "mech A-list" },
  phoenix_rider:  { tier: "alist", power: 70,  hp: 380,  blurb: "phoenix A-list" },
  cyber_ninja:    { tier: "alist", power: 65,  hp: 320,  blurb: "cyber-ninja A-list", speed: 18 },
  shadow_ninja:   { tier: "alist", power: 65,  hp: 280,  blurb: "shadow A-list", speed: 16 },
  iron_titan:     { tier: "alist", power: 75,  hp: 400,  blurb: "iron-titan A-list" },
  storm_caller:   { tier: "alist", power: 70,  hp: 360,  blurb: "storm A-list" },
  flame_dancer:   { tier: "alist", power: 65,  hp: 340,  blurb: "fire A-list" },
  ice_queen:      { tier: "alist", power: 70,  hp: 360,  blurb: "ice A-list" },
  mind_bender:    { tier: "alist", power: 75,  hp: 320,  blurb: "psychic A-list" },
  laser_eyes:     { tier: "alist", power: 70,  hp: 360,  blurb: "laser A-list" },
  toxic_terror:   { tier: "alist", power: 65,  hp: 360,  blurb: "poison A-list" },
  super_punch:    { tier: "alist", power: 80,  hp: 400,  blurb: "bruiser A-list" },
  earth_shaker:   { tier: "alist", power: 75,  hp: 400,  blurb: "geokinetic A-list" },
  dark_overlord:  { tier: "alist", power: 75,  hp: 400,  blurb: "evil-overlord A-list" },
  ultra_blaster:  { tier: "alist", power: 70,  hp: 380,  blurb: "blaster A-list" },
  magnet_queen:   { tier: "alist", power: 70,  hp: 360,  blurb: "magnetism A-list" },
  blur_demon:     { tier: "alist", power: 60,  hp: 280,  blurb: "speedster A-list", speed: 20 },
  bone_queen:     { tier: "alist", power: 65,  hp: 360,  blurb: "necromancer A-list" },
  tide_lord:      { tier: "alist", power: 70,  hp: 380,  blurb: "ocean A-list" },
  neon_ghost:     { tier: "alist", power: 65,  hp: 320,  blurb: "phasing A-list" },
  ali:            { tier: "alist", power: 60,  hp: 360,  blurb: "Greatest A-list", speed: 16 },
  tyson:          { tier: "alist", power: 75,  hp: 400,  blurb: "Iron-Mike A-list" },
  bruce_lee:      { tier: "alist", power: 80,  hp: 350,  blurb: "Be-water A-list", speed: 18 },
  ronaldo:        { tier: "alist", power: 50,  hp: 320,  blurb: "footballer A-list" },
  jordan:         { tier: "alist", power: 50,  hp: 320,  blurb: "GOAT A-list" },
  pele:           { tier: "alist", power: 50,  hp: 300,  blurb: "footballer A-list" },
  babe_ruth:      { tier: "alist", power: 60,  hp: 340,  blurb: "Bambino A-list" },
  usain:          { tier: "alist", power: 40,  hp: 280,  blurb: "sprinter A-list", speed: 20 },
  gretzky:        { tier: "alist", power: 50,  hp: 300,  blurb: "Great One A-list" },
  serena:         { tier: "alist", power: 55,  hp: 320,  blurb: "tennis A-list" },
  azula:          { tier: "alist", power: 70,  hp: 320,  blurb: "fire-prodigy A-list" },
  aang:           { tier: "alist", power: 65,  hp: 320,  blurb: "Avatar A-list" },
  katara:         { tier: "alist", power: 55,  hp: 280,  blurb: "waterbender A-list" },
  zuko:           { tier: "alist", power: 60,  hp: 320,  blurb: "fire-prince A-list" },
  toph:           { tier: "alist", power: 65,  hp: 360,  blurb: "earthbender A-list" },
  elsa:           { tier: "alist", power: 65,  hp: 320,  blurb: "ice-queen A-list" },
  genie:          { tier: "alist", power: 70,  hp: 380,  blurb: "phenomenal A-list" },
  shrek:          { tier: "alist", power: 60,  hp: 400,  blurb: "ogre A-list" },
  maui:           { tier: "alist", power: 65,  hp: 400,  blurb: "demigod A-list" },
  moana:          { tier: "alist", power: 40,  hp: 280,  blurb: "wayfinder A-list" },
  jack_skeleton:  { tier: "alist", power: 60,  hp: 320,  blurb: "Halloween-King A-list" },
  charlemagne:    { tier: "alist", power: 60,  hp: 380,  blurb: "emperor A-list" },
  joker_villain:  { tier: "alist", power: 60,  hp: 280,  blurb: "anarchist A-list" }, // alias safety
  spider_man_alt: { tier: "alist", power: 60,  hp: 350,  blurb: "spider A-list" }, // alias safety
};

// ── helpers ────────────────────────────────────────────────────────────────
function bySize(size) {
  switch (size) {
    case "tiny":     return { hpMul: 0.25, atkMul: 0.5, range: "melee",   speedMul: 1.5 };
    case "small":    return { hpMul: 0.55, atkMul: 0.7, range: "melee",   speedMul: 1.2 };
    case "medium":   return { hpMul: 1.0,  atkMul: 1.0, range: "ranged",  speedMul: 1.0 };
    case "large":    return { hpMul: 1.6,  atkMul: 1.3, range: "ranged",  speedMul: 0.85 };
    case "huge":     return { hpMul: 2.4,  atkMul: 1.6, range: "long",    speedMul: 0.7 };
    case "colossal": return { hpMul: 3.6,  atkMul: 2.0, range: "cosmic",  speedMul: 0.55 };
    default:         return { hpMul: 1.0,  atkMul: 1.0, range: "ranged",  speedMul: 1.0 };
  }
}

// Speed by tier (in "tiles/turn"-ish units — kept in the original 1-1000
// scale used by the engine; the comment uses real-world numbers).
function speedFor(tier, size, type) {
  const base = {
    cosmic:  450,    // slow but inevitable
    toptier: 720,
    alist:   820,
    blist:   780,
    mook:    660,
  }[tier];
  let s = base;
  if (size === "tiny")  s += 80;
  if (size === "small") s += 40;
  if (size === "huge")  s -= 80;
  if (size === "colossal") s -= 120;
  if (type === "ranged") s -= 20;
  return Math.max(180, Math.min(990, s));
}

function defenseFor(tier, size) {
  const base = TIERS[tier].defense;
  let d = base;
  if (size === "tiny") d -= 80;
  if (size === "small") d -= 40;
  if (size === "huge")  d += 60;
  if (size === "colossal") d += 120;
  return Math.max(40, Math.min(990, d));
}

function specialFor(tier) { return TIERS[tier].special; }

function rangeDesc(reach, type) {
  if (type === "melee")  return reach === "cosmic" ? "20 tiles (cosmic AoE)" : "1-2 tiles (melee)";
  if (type === "indirect") {
    if (reach === "cosmic") return "20+ tiles (cosmic)";
    if (reach === "long")   return "10-15 tiles (AoE long)";
    return "6-10 tiles (AoE)";
  }
  // ranged
  if (reach === "cosmic") return "20+ tiles (cosmic beam)";
  if (reach === "long")   return "10-15 tiles (long-range)";
  return "6-10 tiles (ranged)";
}

function classifyByHeuristic(id, name, category, size, attackType, oldHp, oldPower) {
  // Direct override first.
  if (OVERRIDES[id]) return { tier: OVERRIDES[id].tier, override: OVERRIDES[id] };

  // Cosmic clues
  const lname = (name + " " + id).toLowerCase();
  const cat = category || "";

  // Anime-Legends / God-tier
  if (cat.includes("Gods & Myths") && (size === "colossal" || size === "huge")) {
    return { tier: "cosmic" };
  }
  if (cat.includes("Anime Legends") && (size === "huge" || size === "colossal")) {
    return { tier: "cosmic" };
  }

  // Big monsters → top-tier or cosmic by size
  if (size === "colossal") {
    if (oldHp >= 950 && oldPower >= 880) return { tier: "cosmic" };
    return { tier: "toptier" };
  }
  if (size === "huge" && oldPower >= 900) return { tier: "toptier" };

  // Mook signals: silly squad, tiny, kids, objects
  if (cat.includes("Silly Squad")) {
    if (oldHp <= 300 && oldPower <= 400) return { tier: "mook" };
    return { tier: "blist" };
  }

  // Pure animals → A-list unless tiny
  if (cat.includes("Wild Kingdom")) {
    if (size === "tiny") return { tier: "mook" };
    if (size === "huge" || size === "colossal") return { tier: "toptier" };
    if (size === "large") return { tier: "alist" };
    return { tier: "blist" };
  }

  // History icons → mostly A-list with B-list scholars
  if (cat.includes("History Icons")) {
    if (lname.match(/einstein|curie|tesla|davinci|ben_franklin|sun_tzu/)) {
      return { tier: "blist" };
    }
    return { tier: "alist" };
  }

  // Sports legends → A-list
  if (cat.includes("Sports Legends")) return { tier: "alist" };

  // Cartoons → A-list / blist by size
  if (cat.includes("Cartoons")) {
    if (size === "tiny" || size === "small") return { tier: "blist" };
    return { tier: "alist" };
  }

  // Legends → A-list
  if (cat.includes("Legends")) return { tier: "alist" };

  // World Warriors → A-list
  if (cat.includes("World Warriors")) return { tier: "alist" };

  // Heroes & Villains generic → A-list, large → toptier
  if (cat.includes("Heroes & Villains")) {
    if (size === "large" || size === "huge" || size === "colossal") return { tier: "toptier" };
    if (size === "tiny" || size === "small") return { tier: "blist" };
    return { tier: "alist" };
  }

  // Fantasy/Sci-Fi → A-list/top-tier
  if (cat.includes("Fantasy & Sci-Fi")) {
    if (size === "colossal") return { tier: "cosmic" };
    if (size === "huge" || size === "large") return { tier: "toptier" };
    return { tier: "alist" };
  }

  // Comics & Movies generic
  if (cat.includes("Comics & Movies")) {
    if (size === "colossal") return { tier: "cosmic" };
    if (size === "huge") return { tier: "toptier" };
    return { tier: "alist" };
  }

  // Video Games generic
  if (cat.includes("Video Games")) {
    if (size === "colossal") return { tier: "cosmic" };
    if (size === "huge") return { tier: "toptier" };
    if (size === "tiny" || size === "small") return { tier: "blist" };
    return { tier: "alist" };
  }

  // Anime Legends generic
  if (cat.includes("Anime")) {
    if (size === "large" || size === "huge") return { tier: "toptier" };
    return { tier: "alist" };
  }

  // Gods & Myths generic
  if (cat.includes("Gods & Myths")) {
    if (size === "large" || size === "huge" || size === "colossal") return { tier: "toptier" };
    return { tier: "alist" };
  }

  // default
  return { tier: "alist" };
}

// ── parse + rewrite ────────────────────────────────────────────────────────
// Match: c("id", "Name", "emoji", "category", "size", "type", [hp,pow,spd,def,spec], ...);
// We rewrite the 5-tuple and prepend a // comment line.
const CHAR_RE = /^(\s*)c\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\]\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\)\s*,\s*$/;

// Strip any existing tier comments so this is idempotent.
src = src.replace(/^\s*\/\/ TIER \[.+?\]: .*\r?\n/gm, "");

const lines = src.split(/\r?\n/);
const out = [];
const tierCounts = { cosmic: 0, toptier: 0, alist: 0, blist: 0, mook: 0 };
const examplesPerTier = { cosmic: [], toptier: [], alist: [], blist: [], mook: [] };

function pad(n, w) { return String(n).padStart(w, " "); }

for (const line of lines) {
  const m = line.match(CHAR_RE);
  if (!m) { out.push(line); continue; }
  const [, indent, id, name, emoji, category, size, attackType,
         hpStr, pwStr, spStr, dfStr, scStr,
         color, cry, specialName] = m;
  const oldHp = parseInt(hpStr), oldPower = parseInt(pwStr);

  const cls = classifyByHeuristic(id, name, category, size, attackType, oldHp, oldPower);
  const tier = cls.tier;
  const sizeMods = bySize(size);

  // HP / Power
  let hp, power;
  if (cls.override && cls.override.hp != null)    hp    = cls.override.hp;
  else hp    = Math.round(TIERS[tier].hp * sizeMods.hpMul);
  if (cls.override && cls.override.power != null) power = cls.override.power;
  else power = Math.round(TIERS[tier].power * sizeMods.atkMul);

  // Speed / Defense / Special
  let speed;
  if (cls.override && cls.override.speed != null) speed = cls.override.speed * 50; // map "tiles/turn" hint to engine scale
  else speed = speedFor(tier, size, attackType);
  // Clamp speed to engine range
  speed = Math.max(180, Math.min(990, speed));

  const defense = defenseFor(tier, size);
  const specialStat = specialFor(tier);

  // Reach
  const reach = (cls.override && cls.override.reach) || TIERS[tier].reach;
  const rangeText = rangeDesc(reach, attackType);

  // Real-world numbers in comment
  const tierLabel = {
    cosmic: "COSMIC", toptier: "TOP-TIER", alist: "A-LIST", blist: "B-LIST", mook: "MOOK/HUMAN",
  }[tier];
  const blurb = (cls.override && cls.override.blurb) || `${size} ${attackType}`;

  // Speed label for comment (human-readable tiles/turn)
  const realSpeed = tier === "cosmic" ? 5
    : (id === "flash" || id === "usain" || id === "killua" || id === "blur_demon") ? 20
    : (id === "spider_man" || id === "tracer" || id === "hermes" || id === "neo" || id === "zenitsu" || id === "ninja") ? 18
    : (sizeMods.speedMul >= 1.2 ? 14 : sizeMods.speedMul >= 1.0 ? 10 : sizeMods.speedMul >= 0.85 ? 8 : 6);

  const comment = `${indent}// TIER [${tierLabel}] ${name}: ${blurb}. HP ${hp}, atk ${power}, range ${rangeText}, speed ${realSpeed}.`;

  // Rewrite line with new 5-tuple, preserving other fields.
  const newLine =
    `${indent}c("${id}", "${name}", "${emoji}", "${category}", "${size}", "${attackType}", ` +
    `[${pad(hp,4)},${pad(power,4)},${pad(speed,4)},${pad(defense,4)},${pad(specialStat,4)}], ` +
    `"${color}", "${cry}", "${specialName}"),`;

  out.push(comment);
  out.push(newLine);

  tierCounts[tier]++;
  if (examplesPerTier[tier].length < 6) examplesPerTier[tier].push(name);
}

const newSrc = out.join("\n");
if (newSrc === src) {
  console.log("No changes made.");
} else {
  fs.writeFileSync(FILE, newSrc);
  console.log("Rebalanced characters:");
  for (const t of Object.keys(tierCounts)) {
    console.log(`  ${t.padEnd(8)} = ${tierCounts[t]} (e.g. ${examplesPerTier[t].slice(0, 4).join(", ")})`);
  }
}
