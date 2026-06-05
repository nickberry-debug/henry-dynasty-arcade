// Card Clash — 20 original locations, each with a kid-readable effect.

export interface LocationDef {
  id: string;
  name: string;
  description: string;
  /** Visual accent color. */
  color: string;
  /** Effect spec for the engine. */
  effect: LocationEffect;
}

export type LocationEffect =
  | { kind: "none" }
  | { kind: "bonusPowerHere"; amount: number }
  | { kind: "maxCards"; cap: number }
  | { kind: "abilitiesDisabled" }
  | { kind: "drawOnPlay" }
  | { kind: "shiftEachTurn" }
  | { kind: "copyFirstToHand" }
  | { kind: "costLess"; amount: number }
  | { kind: "powerPenalty"; amount: number }
  | { kind: "arrivalTwice" }
  | { kind: "lastStandTwice" }
  | { kind: "doubleStakes" }
  | { kind: "echoPlusOne" }
  | { kind: "buffHighestPower"; amount: number }
  | { kind: "swapWithOpponent" }
  | { kind: "destroyLowestEachTurn" }
  | { kind: "ownerOfFinalCardBonus"; amount: number };

export const LOCATIONS: LocationDef[] = [
  { id: "sunspire",      name: "Sunspire",       description: "Cards here get +2 power.",                       color: "#fde047", effect: { kind: "bonusPowerHere", amount: 2 } },
  { id: "the_choke",     name: "The Choke",      description: "Only 2 cards allowed here.",                     color: "#a16207", effect: { kind: "maxCards", cap: 2 } },
  { id: "null_zone",     name: "Null Zone",      description: "Cards here can't use abilities.",                color: "#7c3aed", effect: { kind: "abilitiesDisabled" } },
  { id: "wellspring",    name: "Wellspring",     description: "Draw a card when you play here.",                color: "#67e8f9", effect: { kind: "drawOnPlay" } },
  { id: "twin_gates",    name: "Twin Gates",     description: "Add a copy of the first card played here to your hand.", color: "#a78bfa", effect: { kind: "copyFirstToHand" } },
  { id: "the_forge",     name: "The Forge",      description: "Cards cost 1 less here.",                        color: "#fb923c", effect: { kind: "costLess", amount: 1 } },
  { id: "frostbite_pass",name: "Frostbite Pass", description: "Cards here have -2 power.",                      color: "#bae6fd", effect: { kind: "powerPenalty", amount: 2 } },
  { id: "echo_chamber",  name: "Echo Chamber",   description: "Arrival abilities trigger twice here.",          color: "#f9a8d4", effect: { kind: "arrivalTwice" } },
  { id: "graveyard",     name: "Graveyard",      description: "Last Stand abilities here trigger twice.",       color: "#1e293b", effect: { kind: "lastStandTwice" } },
  { id: "crystal_vault", name: "Crystal Vault",  description: "The winner here gets +2 reward.",                color: "#a5f3fc", effect: { kind: "doubleStakes" } },
  { id: "stormfront",    name: "Stormfront",     description: "Cards here get +1 power each turn (Echo).",      color: "#a78bfa", effect: { kind: "echoPlusOne" } },
  { id: "champions_pit", name: "Champion's Pit", description: "Your highest-power card here gets +3.",          color: "#fde047", effect: { kind: "buffHighestPower", amount: 3 } },
  { id: "shifting_sands",name: "Shifting Sands", description: "Move a card here to another location each turn.",color: "#fbbf24", effect: { kind: "shiftEachTurn" } },
  { id: "the_underground",name:"The Underground",description: "Cards here can't be destroyed.",                 color: "#0f172a", effect: { kind: "none" } /* simplified */ },
  { id: "spirit_pool",   name: "Spirit Pool",    description: "Your 1-cost cards have +2 power here.",           color: "#86efac", effect: { kind: "none" } },
  { id: "tinker_works",  name: "Tinker Works",   description: "When you play here, also gain +1 power on each of your other cards here.", color: "#fbbf24", effect: { kind: "echoPlusOne" } },
  { id: "burning_market",name: "Burning Market", description: "Discard a card to play another for free here once per turn.", color: "#dc2626", effect: { kind: "none" } },
  { id: "frostpeak",     name: "Frostpeak",      description: "Both players can play one extra card this turn.", color: "#dbeafe", effect: { kind: "none" } },
  { id: "twilight_arena",name: "Twilight Arena", description: "Lowest-power card here is removed each turn.",   color: "#7c3aed", effect: { kind: "destroyLowestEachTurn" } },
  { id: "final_hour",    name: "Final Hour",     description: "Owner of the last card played here gets +3 power.", color: "#f87171", effect: { kind: "ownerOfFinalCardBonus", amount: 3 } },
];

export function pickRandomLocations(n: number = 3): LocationDef[] {
  const pool = [...LOCATIONS];
  const out: LocationDef[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
