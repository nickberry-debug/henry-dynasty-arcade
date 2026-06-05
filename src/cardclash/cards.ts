// Card Clash — 40-card balanced launch roster. Marvel-Snap-style:
// vanilla power curve, abilities priced as power tradeoffs. All
// ORIGINAL — no franchise IP, no copied card names or art. Icons map
// to /assets/game-icons (CC-BY 3.0) by file slug.

export type Element = "ember" | "tide" | "stone" | "gale" | "spark" | "shade";
export type Keyword = "arrival" | "aura" | "lastStand" | "echo" | "link" | "vanilla";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface CardDef {
  id: string;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5 | 6;
  power: number;
  element: Element;
  keyword: Keyword;
  /** Ability text (player-facing). */
  text: string;
  /** Codified ability spec the engine reads. */
  effect: AbilityEffect | null;
  /** Lookup into /assets/game-icons for the emblem (filename without .svg). */
  icon: string;
  rarity: Rarity;
}

// ── Ability spec ────────────────────────────────────────────────────

export type AbilityEffect =
  // On reveal effects
  | { kind: "draw"; count: number }
  | { kind: "addTokenToHand"; token: { name: string; cost: number; power: number; element: Element; icon: string } }
  | { kind: "energyNext"; amount: number }
  | { kind: "powerOtherCardsHere"; amount: number; ownerOnly: true }
  | { kind: "debuffEnemyHere"; amount: number; pickRandom?: boolean }
  | { kind: "destroyEnemyHereIfPowerLte"; threshold: number }
  | { kind: "discardFromHand"; count: number }
  | { kind: "copyPowerHere" }
  | { kind: "moveEnemyHere" }
  | { kind: "splitDamageHere"; total: number }
  | { kind: "bonusPowerPerEmptySlotHere"; perSlot: number }
  | { kind: "destroyOthersHereAndAbsorb" }
  | { kind: "addTwoSixCostsToHand" }
  // Aura (ongoing)
  | { kind: "auraSelfPowerIfAlone"; amount: number }
  | { kind: "auraSelfPenaltyIfBigCardInPlay"; amount: number }
  | { kind: "auraCannotGainPower" }
  | { kind: "auraEnemyHereDebuff"; amount: number }
  | { kind: "auraOtherLocationsBuff"; amount: number; ownerOnly: true }
  | { kind: "auraEnemyHereCostBump"; amount: number }
  | { kind: "auraLowCostBuff"; ownerOnly: true; amount: number; maxCost: number }
  | { kind: "auraLastStandDoubles" }
  | { kind: "auraOnePlayLeft" }
  | { kind: "auraImmune" }
  // Echo (end-of-turn)
  | { kind: "echoPlusOnePerCardPlayedHere"; ownerOnly: true }
  | { kind: "echoSelfPlusOne" }
  | { kind: "echoBoostHereEachTurn"; amount: number }
  // Last stand
  | { kind: "lastStandBuffOthersHere"; amount: number; ownerOnly: true }
  | { kind: "lastStandReturnToHandPlusN"; amount: number }
  // Link (conditional)
  | { kind: "linkBeastHere"; amount: number };

const C = (
  id: string, name: string, cost: 1 | 2 | 3 | 4 | 5 | 6, power: number,
  element: Element, keyword: Keyword, text: string, effect: AbilityEffect | null,
  icon: string, rarity: Rarity = "common",
): CardDef => ({ id, name, cost, power, element, keyword, text, effect, icon, rarity });

// ── 40-card launch roster ───────────────────────────────────────────

export const CARDS: CardDef[] = [
  // ── Cost 1 (baseline 2) ─────────────────────────────────────────────
  C("ember_pup",       "Ember Pup",       1, 2, "ember", "vanilla",  "—",                                                           null,                                                                              "wolf-howl",         "common"),
  C("mosswood_sprite", "Mosswood Sprite", 1, 1, "gale",  "arrival",  "Arrival: Draw a card.",                                       { kind: "draw", count: 1 },                                                        "fairy",             "rare"),
  C("cliff_pebble",    "Cliff Pebble",    1, 2, "stone", "aura",     "Aura: +3 power if it's your only card here.",                 { kind: "auraSelfPowerIfAlone", amount: 3 },                                       "stone-block",       "common"),
  C("pocket_gremlin",  "Pocket Gremlin",  1, 1, "spark", "arrival",  "Arrival: Add a 1/1 Gremlin token to your hand.",              { kind: "addTokenToHand", token: { name: "Gremlin Token", cost: 1, power: 1, element: "spark", icon: "imp-laugh" } }, "imp-laugh", "common"),
  C("sun_squire",      "Sun Squire",      1, 3, "spark", "aura",     "Aura: -2 power if you have any 5+ cost card in play.",        { kind: "auraSelfPenaltyIfBigCardInPlay", amount: 2 },                             "sundial",           "common"),
  C("hex_imp",         "Hex Imp",         1, 2, "shade", "arrival",  "Arrival: -1 power to an enemy card here.",                    { kind: "debuffEnemyHere", amount: 1, pickRandom: true },                          "evil-minion",       "common"),

  // ── Cost 2 (baseline 3) ─────────────────────────────────────────────
  C("stone_sentinel",  "Stone Sentinel",  2, 3, "stone", "vanilla",  "—",                                                           null,                                                                              "stone-tower",       "common"),
  C("frost_wisp",      "Frost Wisp",      2, 2, "tide",  "arrival",  "Arrival: -2 power to a random enemy card here.",              { kind: "debuffEnemyHere", amount: 2, pickRandom: true },                          "ice-cube",          "common"),
  C("twin_blades",     "Twin Blades",     2, 4, "ember", "aura",     "Aura: Cannot gain power from abilities.",                     { kind: "auraCannotGainPower" },                                                   "crossed-swords",    "rare"),
  C("gale_dancer",     "Gale Dancer",     2, 2, "gale",  "echo",     "Echo: +1 power each time you play a card here.",              { kind: "echoPlusOnePerCardPlayedHere", ownerOnly: true },                         "wind-hole",         "rare"),
  C("coin_goblin",     "Coin Goblin",     2, 2, "spark", "arrival",  "Arrival: +1 bonus energy next turn.",                         { kind: "energyNext", amount: 1 },                                                 "two-coins",         "rare"),
  C("loyal_hound",     "Loyal Hound",     2, 3, "stone", "link",     "Link: +3 power if you control a Beast card.",                 { kind: "linkBeastHere", amount: 3 },                                              "wolf-head",         "common"),

  // ── Cost 3 (baseline 5) ─────────────────────────────────────────────
  C("iron_vanguard",   "Iron Vanguard",   3, 5, "stone", "vanilla",  "—",                                                           null,                                                                              "round-shield",      "common"),
  C("stormcaller",     "Stormcaller",     3, 3, "spark", "arrival",  "Arrival: +2 power to your other cards here.",                 { kind: "powerOtherCardsHere", amount: 2, ownerOnly: true },                       "lightning-bolts",   "rare"),
  C("shadow_stalker",  "Shadow Stalker",  3, 3, "shade", "aura",     "Aura: Enemy cards here have -1 power.",                       { kind: "auraEnemyHereDebuff", amount: 1 },                                        "hood",              "rare"),
  C("vine_beast",      "Vine Beast",      3, 4, "gale",  "echo",     "Echo: +1 power each turn.",                                   { kind: "echoSelfPlusOne" },                                                       "vines",             "common"),
  C("mystic_scholar",  "Mystic Scholar",  3, 2, "tide",  "arrival",  "Arrival: Draw 2 cards.",                                      { kind: "draw", count: 2 },                                                        "book-cover",        "epic"),
  C("bog_lurker",      "Bog Lurker",      3, 6, "shade", "arrival",  "Arrival: Discard a card from your hand.",                     { kind: "discardFromHand", count: 1 },                                             "swamp",             "rare"),
  C("mirror_mage",     "Mirror Mage",     3, 3, "tide",  "arrival",  "Arrival: Copy the power of another card here.",               { kind: "copyPowerHere" },                                                         "round-shield",      "epic"),

  // ── Cost 4 (baseline 6) ─────────────────────────────────────────────
  C("crystal_titan",   "Crystal Titan",   4, 6, "stone", "vanilla",  "—",                                                           null,                                                                              "crystal-cluster",   "common"),
  C("flame_warden",    "Flame Warden",    4, 5, "ember", "arrival",  "Arrival: Destroy an enemy card here with 3 power or less.",   { kind: "destroyEnemyHereIfPowerLte", threshold: 3 },                              "flame",             "epic"),
  C("storm_drake",     "Storm Drake",     4, 4, "gale",  "aura",     "Aura: Your cards at OTHER locations have +1 power.",          { kind: "auraOtherLocationsBuff", amount: 1, ownerOnly: true },                    "dragon-head",       "epic"),
  C("bramble_knight",  "Bramble Knight",  4, 7, "gale",  "lastStand","Last Stand: +3 power to your other cards here.",              { kind: "lastStandBuffOthersHere", amount: 3, ownerOnly: true },                   "thorns",            "rare"),
  C("tidecaller",      "Tidecaller",      4, 5, "tide",  "arrival",  "Arrival: Move an enemy card here to another location.",       { kind: "moveEnemyHere" },                                                         "wave",              "epic"),
  C("runesmith",       "Runesmith",       4, 3, "spark", "aura",     "Aura: Your 1- and 2-cost cards have +2 power.",               { kind: "auraLowCostBuff", ownerOnly: true, amount: 2, maxCost: 2 },               "rune",              "rare"),

  // ── Cost 5 (baseline 8) ─────────────────────────────────────────────
  C("granite_colossus","Granite Colossus",5, 8, "stone", "vanilla",  "—",                                                           null,                                                                              "stone-stack",       "common"),
  C("inferno_lord",    "Inferno Lord",    5, 6, "ember", "arrival",  "Arrival: Deal 3 power-damage split among enemy cards here.",  { kind: "splitDamageHere", total: 3 },                                             "flame-crown",       "epic"),
  C("frost_monarch",   "Frost Monarch",   5, 5, "tide",  "aura",     "Aura: Enemy cards here cost 1 more.",                         { kind: "auraEnemyHereCostBump", amount: 1 },                                      "ice-crown",         "epic"),
  C("thunder_roc",     "Thunder Roc",     5, 7, "spark", "arrival",  "Arrival: +2 power for each empty slot here.",                 { kind: "bonusPowerPerEmptySlotHere", perSlot: 2 },                                "eagle-emblem",      "rare"),
  C("soul_warden",     "Soul Warden",     5, 4, "shade", "aura",     "Aura: Your Last Stand abilities trigger twice.",              { kind: "auraLastStandDoubles" },                                                  "ghost",             "epic"),
  C("doom_herald",     "Doom Herald",     5, 12, "shade","aura",     "Aura: You can only play 1 more card this game.",              { kind: "auraOnePlayLeft" },                                                       "skull-bolt",        "legendary"),

  // ── Cost 6 (baseline 10) ────────────────────────────────────────────
  C("worldbreaker",    "Worldbreaker",    6, 12, "stone","vanilla",  "—",                                                           null,                                                                              "titan",             "legendary"),
  C("astral_dragon",   "Astral Dragon",   6, 9, "gale",  "arrival",  "Arrival: +3 power for each other card you have here.",       { kind: "powerOtherCardsHere", amount: 3, ownerOnly: true },                       "dragon-eye",        "legendary"),
  C("eternal_guardian","Eternal Guardian",6, 10,"stone", "aura",     "Aura: Cannot be destroyed or have power reduced.",            { kind: "auraImmune" },                                                            "angel-wings",       "legendary"),
  C("void_leviathan",  "Void Leviathan",  6, 8, "shade", "arrival",  "Arrival: Destroy all OTHER cards here and absorb their power.", { kind: "destroyOthersHereAndAbsorb" },                                          "kraken",            "legendary"),
  C("celestial_phoenix","Celestial Phoenix",6,7,"ember", "lastStand","Last Stand: Return to your hand with +3 power.",              { kind: "lastStandReturnToHandPlusN", amount: 3 },                                 "phoenix",           "legendary"),
  C("time_weaver",     "Time Weaver",     6, 6, "tide",  "arrival",  "Arrival: Add two random 6-cost cards to your hand.",          { kind: "addTwoSixCostsToHand" },                                                  "hourglass",         "legendary"),
];

export const ELEMENT_COLOR: Record<Element, string> = {
  ember: "#fb923c", tide: "#67e8f9", stone: "#a16207",
  gale:  "#86efac", spark: "#fde047", shade: "#a78bfa",
};
export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9aa6bf", rare: "#67e8f9", epic: "#a78bfa", legendary: "#fde047",
};

export function getCard(id: string): CardDef | undefined {
  return CARDS.find(c => c.id === id);
}

/** Starter deck — 12 balanced cards for a new player. */
export const STARTER_DECK_IDS = [
  "ember_pup", "mosswood_sprite", "cliff_pebble",
  "stone_sentinel", "frost_wisp", "loyal_hound",
  "iron_vanguard", "stormcaller", "vine_beast",
  "crystal_titan", "flame_warden",
  "granite_colossus",
];
