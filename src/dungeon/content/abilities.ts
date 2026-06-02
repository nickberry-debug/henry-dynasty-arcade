// content/abilities.ts — Hero + enemy abilities.

import type { Ability } from "../types";

export const ABILITIES: Record<string, Ability> = {
  // ─── Universal basic attack (always available, free) ────────────────────
  attack: {
    id: "attack",
    name: "Attack",
    emoji: "🗡️",
    description: "Strike with your equipped weapon.",
    cost: 0, cooldown: 0, range: 1,
    target: "enemy",
    damageMult: 1.0,
    damageType: "physical",
  },

  // ─── Warrior ────────────────────────────────────────────────────────────
  slash: {
    id: "slash",
    name: "Cleaving Slash",
    emoji: "⚔️",
    description: "Heavy melee strike. 150% weapon damage, 25% chance to bleed.",
    cost: 0, cooldown: 2, range: 1,
    target: "enemy",
    damageMult: 1.5,
    damageType: "physical",
    inflicts: [{ kind: "bleed", duration: 3, power: 4 }],
  },
  shield_bash: {
    id: "shield_bash",
    name: "Shield Bash",
    emoji: "🛡️",
    description: "Stun a foe for 2 turns and crack their guard.",
    cost: 5, cooldown: 4, range: 1,
    target: "enemy",
    damageMult: 0.8,
    damageType: "physical",
    inflicts: [{ kind: "stun", duration: 2, power: 0 }],
  },
  whirlwind: {
    id: "whirlwind",
    name: "Whirlwind",
    emoji: "🌀",
    description: "Hit every adjacent enemy for 130% weapon damage.",
    cost: 12, cooldown: 5, range: 1,
    target: "all-enemies",
    damageMult: 1.3,
    damageType: "physical",
    aoe: 1,
  },

  // ─── Ranger ─────────────────────────────────────────────────────────────
  quick_shot: {
    id: "quick_shot",
    name: "Quick Shot",
    emoji: "🏹",
    description: "Fast bow shot at range. 120% weapon damage, +20% crit.",
    cost: 0, cooldown: 1, range: 6,
    target: "enemy",
    damageMult: 1.2,
    damageType: "physical",
    selfBuff: [{ kind: "haste", duration: 1, power: 20, source: "Quick Shot" }],
  },
  piercing_arrow: {
    id: "piercing_arrow",
    name: "Piercing Arrow",
    emoji: "➡️",
    description: "Pierces through enemies in a line. 160% weapon damage.",
    cost: 8, cooldown: 3, range: 8,
    target: "enemy",
    damageMult: 1.6,
    damageType: "physical",
    inflicts: [{ kind: "bleed", duration: 2, power: 3 }],
  },
  rain_of_arrows: {
    id: "rain_of_arrows",
    name: "Rain of Arrows",
    emoji: "☔",
    description: "Volley over an area. Damages all enemies in 2-tile radius.",
    cost: 14, cooldown: 6, range: 6,
    target: "all-enemies",
    damageMult: 1.1,
    damageType: "physical",
    aoe: 2,
  },

  // ─── Mage ───────────────────────────────────────────────────────────────
  spark: {
    id: "spark",
    name: "Spark",
    emoji: "⚡",
    description: "Free arc of lightning. 100% intellect-scaled damage.",
    cost: 0, cooldown: 1, range: 5,
    target: "enemy",
    flatDamage: 4, // scales with int below
    damageType: "lightning",
  },
  fireball: {
    id: "fireball",
    name: "Fireball",
    emoji: "🔥",
    description: "Explodes on impact. Burns enemies in 1-tile radius.",
    cost: 10, cooldown: 3, range: 6,
    target: "enemy",
    flatDamage: 12,
    damageType: "fire",
    aoe: 1,
    inflicts: [{ kind: "burn", duration: 3, power: 4 }],
  },
  frost_nova: {
    id: "frost_nova",
    name: "Frost Nova",
    emoji: "❄️",
    description: "Freeze every nearby enemy in place for 2 turns.",
    cost: 16, cooldown: 6, range: 1,
    target: "all-enemies",
    flatDamage: 6,
    damageType: "ice",
    aoe: 3,
    inflicts: [{ kind: "slow", duration: 2, power: 50 }, { kind: "stun", duration: 1, power: 0 }],
  },

  // ─── Healing / Utility (potions reuse this engine) ──────────────────────
  potion_heal: {
    id: "potion_heal",
    name: "Healing Potion",
    emoji: "🧪",
    description: "Restore 40 HP instantly.",
    cost: 0, cooldown: 0, range: 0,
    target: "self",
    heal: 40,
  },
  potion_mana: {
    id: "potion_mana",
    name: "Mana Vial",
    emoji: "💧",
    description: "Restore 30 MP instantly.",
    cost: 0, cooldown: 0, range: 0,
    target: "self",
    // negative cost = restore in engine
    flatDamage: -30, // re-purposed as mana restore (handled in engine)
  },

  // ─── Enemy abilities ────────────────────────────────────────────────────
  bite: {
    id: "bite",
    name: "Bite",
    emoji: "🦷",
    description: "Vicious bite. 110% damage with chance to bleed.",
    cost: 0, cooldown: 2, range: 1,
    target: "enemy",
    damageMult: 1.1,
    damageType: "physical",
    inflicts: [{ kind: "bleed", duration: 3, power: 3 }],
  },
  venom_spit: {
    id: "venom_spit",
    name: "Venom Spit",
    emoji: "🟢",
    description: "Spits venom that poisons for 4 turns.",
    cost: 0, cooldown: 3, range: 4,
    target: "enemy",
    flatDamage: 4,
    damageType: "poison",
    inflicts: [{ kind: "poison", duration: 4, power: 3 }],
  },
  dark_bolt: {
    id: "dark_bolt",
    name: "Dark Bolt",
    emoji: "🟣",
    description: "Shadow magic, ignores armor.",
    cost: 0, cooldown: 2, range: 5,
    target: "enemy",
    flatDamage: 10,
    damageType: "shadow",
  },
  boss_smash: {
    id: "boss_smash",
    name: "Cataclysm",
    emoji: "💥",
    description: "Boss-only. Devastating AoE strike.",
    cost: 0, cooldown: 4, range: 1,
    target: "all-enemies",
    damageMult: 1.8,
    damageType: "physical",
    aoe: 2,
    inflicts: [{ kind: "stun", duration: 1, power: 0 }],
  },
  boss_summon: {
    id: "boss_summon",
    name: "Summon Minions",
    emoji: "👹",
    description: "Boss-only. Calls reinforcements.",
    cost: 0, cooldown: 6, range: 0,
    target: "self",
  },
};

export function getAbility(id: string): Ability {
  return ABILITIES[id] || ABILITIES.attack;
}
