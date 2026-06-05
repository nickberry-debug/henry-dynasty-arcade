// "Family Brawl" — turns each family profile into a Battle Forge fighter
// so two kids on the same device can brawl their own mascots. The fighter's
// stats are derived from the profile's cross-game wins so kids who play
// more get a slight edge (but everyone stays in a fair band).

import type { CharacterDef } from "./types";
import { loadProfiles, loadStats, type Profile } from "../profiles/store";

const FAMILY_CATEGORY = "👨‍👩‍👧‍👦 Family Brawl";

/** Derive a fighter from a profile. */
export function familyFighterFor(profile: Profile): CharacterDef {
  // Pull cross-game stats — every game records via recordGameSession.
  const stats = loadStats(profile.id);
  const totalWins = Object.values(stats).reduce((s, v) => s + (v.wins ?? 0), 0);
  const totalSessions = Object.values(stats).reduce((s, v) => s + (v.sessions ?? 0), 0);

  // Stat curve — anchored at 350 base + a modest experience bump.
  // Every fighter ends up in the 280–620 range so brawls stay close.
  const xp = Math.min(80, totalWins * 2 + totalSessions);
  const hp     = 320 + xp * 2;
  const power  = 50  + Math.floor(xp * 0.6);
  const speed  = 780 + xp * 2;
  const defense= 260 + xp * 2;
  const special= 540 + xp * 3;

  // Pick an emoji from the profile's avatar slot — fallback to a generic.
  // The handle (HenryTheHero) reads better than the real name in a fight.
  return {
    id: `family_${profile.id}`,
    name: profile.handle || profile.name,
    emoji: emojiForProfile(profile),
    category: FAMILY_CATEGORY,
    size: "medium",
    attackType: "melee",
    stats: { hp, power, speed, defense, special },
    color: profile.color,
    cry: `For the family!`,
    specialName: `${profile.name}'s Finisher`,
  };
}

function emojiForProfile(p: Profile): string {
  // Stable per-profile emoji so the picker reads consistently.
  // Hashes the id so future-added profiles get something distinct.
  const POOL = ["⭐", "🛡️", "⚡", "🏹", "🗡️", "🔥", "🌟", "💎", "🦅", "🐉"];
  let h = 2166136261 >>> 0;
  for (let i = 0; i < p.id.length; i++) { h ^= p.id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return POOL[Math.abs(h) % POOL.length];
}

/** All current family fighters, in original profile order. */
export function loadFamilyFighters(): CharacterDef[] {
  return loadProfiles().map(familyFighterFor);
}

export { FAMILY_CATEGORY };
