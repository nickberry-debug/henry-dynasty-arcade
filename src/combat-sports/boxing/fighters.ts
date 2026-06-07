// src/combat-sports/boxing/fighters.ts
//
// Original boxer roster — six fighters with archetype + per-stat tweaks.
// All names + nicknames are original to keep IP clean for the family
// arcade.

export type Archetype = "swarmer" | "boxer-puncher" | "out-boxer" | "slugger";

export interface BoxerDef {
  id: string;
  name: string;
  nickname: string;
  archetype: Archetype;
  color: string;
  bio: string;
  stats: {
    power: number;
    speed: number;
    chin:  number;
    stamina: number;
  };
}

export const BOXERS: BoxerDef[] = [
  { id: "tank",   name: "Tank Tannerly",  nickname: "The Concrete Wall", archetype: "slugger",       color: "#dc2626",
    bio: "Heavy-handed slugger from the docks. Hits like a wrecking ball, breathes like a bellows.",
    stats: { power: 9, speed: 4, chin: 8, stamina: 6 } },
  { id: "flash",  name: "Flash Forester", nickname: "Lightning Hands",   archetype: "swarmer",       color: "#fbbf24",
    bio: "All-jab all-the-time pressure fighter. Wears you down with volume.",
    stats: { power: 5, speed: 9, chin: 6, stamina: 8 } },
  { id: "iris",   name: "Iris Ironside",  nickname: "The Surgeon",       archetype: "boxer-puncher", color: "#a78bfa",
    bio: "Picks her shots like a surgeon picks a scalpel. Every punch has a plan.",
    stats: { power: 7, speed: 7, chin: 7, stamina: 7 } },
  { id: "kid",    name: "Kid Kolomon",    nickname: "The Ghost",         archetype: "out-boxer",     color: "#67e8f9",
    bio: "Slick, never there. Wins on footwork and frustrates the rest.",
    stats: { power: 4, speed: 10, chin: 5, stamina: 9 } },
  { id: "diesel", name: "Diesel DuPont",  nickname: "Engine Block",      archetype: "boxer-puncher", color: "#86efac",
    bio: "Workhorse pro who outlasts every round. Never out of gas.",
    stats: { power: 6, speed: 6, chin: 8, stamina: 10 } },
  { id: "ruby",   name: "Ruby Roxbury",   nickname: "The Hammer",        archetype: "slugger",       color: "#f9a8d4",
    bio: "One-punch power. Loves the trade. Hates the rope-a-dope.",
    stats: { power: 10, speed: 5, chin: 6, stamina: 5 } },
];

export function boxerById(id: string): BoxerDef {
  return BOXERS.find(b => b.id === id) ?? BOXERS[0];
}
