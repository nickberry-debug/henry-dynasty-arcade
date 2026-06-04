// dungeon3d/engine/abilities.ts — Hero abilities, cooldowns, mana, status effects
import * as THREE from 'three';

export interface StatusEffect {
  type: 'poison' | 'burn' | 'freeze' | 'stun' | 'shield' | 'haste';
  duration: number;
  power: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  type: 'melee' | 'ranged' | 'spell' | 'defensive';
  manaCost: number;
  cooldown: number; // seconds
  range: number;
  damage: number | ((level: number) => number);
  effects: StatusEffect[];
  unlockLevel: number;
}

export interface HeroStats {
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number; // crit chance
  statusEffects: StatusEffect[];
  cooldowns: Map<string, number>; // ability id -> remaining cooldown
}

/**
 * Warrior abilities
 */
export const WARRIOR_ABILITIES: Ability[] = [
  {
    id: 'slash',
    name: 'Slash',
    description: 'Basic melee attack',
    type: 'melee',
    manaCost: 0,
    cooldown: 0.5,
    range: 2,
    damage: (level) => 10 + level * 2,
    effects: [],
    unlockLevel: 1,
  },
  {
    id: 'power-strike',
    name: 'Power Strike',
    description: 'Heavy blow dealing 1.5x damage',
    type: 'melee',
    manaCost: 20,
    cooldown: 3,
    range: 2.5,
    damage: (level) => (10 + level * 2) * 1.5,
    effects: [],
    unlockLevel: 3,
  },
  {
    id: 'whirlwind',
    name: 'Whirlwind',
    description: 'Spin attack hitting all nearby enemies',
    type: 'melee',
    manaCost: 40,
    cooldown: 5,
    range: 4,
    damage: (level) => 8 + level,
    effects: [],
    unlockLevel: 6,
  },
  {
    id: 'shield-bash',
    name: 'Shield Bash',
    description: 'Block damage and knock back enemies',
    type: 'defensive',
    manaCost: 15,
    cooldown: 2,
    range: 2,
    damage: (level) => 5 + level,
    effects: [{ type: 'stun', duration: 1, power: 1 }],
    unlockLevel: 5,
  },
];

/**
 * Ranger abilities
 */
export const RANGER_ABILITIES: Ability[] = [
  {
    id: 'arrow-shot',
    name: 'Arrow Shot',
    description: 'Quick ranged attack',
    type: 'ranged',
    manaCost: 0,
    cooldown: 0.4,
    range: 30,
    damage: (level) => 8 + level,
    effects: [],
    unlockLevel: 1,
  },
  {
    id: 'multishot',
    name: 'Multishot',
    description: 'Fire 3 arrows',
    type: 'ranged',
    manaCost: 25,
    cooldown: 2.5,
    range: 30,
    damage: (level) => (8 + level) * 0.8,
    effects: [],
    unlockLevel: 4,
  },
  {
    id: 'explosive-arrow',
    name: 'Explosive Arrow',
    description: 'Arrow that explodes on impact',
    type: 'ranged',
    manaCost: 35,
    cooldown: 4,
    range: 35,
    damage: (level) => 20 + level * 2,
    effects: [{ type: 'burn', duration: 3, power: 2 }],
    unlockLevel: 7,
  },
  {
    id: 'evasion',
    name: 'Evasion',
    description: 'Dodge next attack and gain haste',
    type: 'defensive',
    manaCost: 20,
    cooldown: 3,
    range: 0,
    damage: 0,
    effects: [{ type: 'haste', duration: 3, power: 1.5 }],
    unlockLevel: 5,
  },
];

/**
 * Mage abilities
 */
export const MAGE_ABILITIES: Ability[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Cast a ball of fire',
    type: 'spell',
    manaCost: 20,
    cooldown: 1.5,
    range: 25,
    damage: (level) => 12 + level * 1.5,
    effects: [{ type: 'burn', duration: 2, power: 1 }],
    unlockLevel: 1,
  },
  {
    id: 'ice-spike',
    name: 'Ice Spike',
    description: 'Freeze enemies in place',
    type: 'spell',
    manaCost: 25,
    cooldown: 2,
    range: 20,
    damage: (level) => 10 + level,
    effects: [{ type: 'freeze', duration: 2, power: 1 }],
    unlockLevel: 3,
  },
  {
    id: 'lightning-bolt',
    name: 'Lightning Bolt',
    description: 'Chain damage to nearby enemies',
    type: 'spell',
    manaCost: 30,
    cooldown: 2.5,
    range: 40,
    damage: (level) => 15 + level * 2,
    effects: [],
    unlockLevel: 5,
  },
  {
    id: 'mana-shield',
    name: 'Mana Shield',
    description: 'Absorb damage with mana',
    type: 'defensive',
    manaCost: 30,
    cooldown: 4,
    range: 0,
    damage: 0,
    effects: [{ type: 'shield', duration: 5, power: 50 }],
    unlockLevel: 6,
  },
];

/**
 * Apply status effect to hero
 */
export function applyStatusEffect(stats: HeroStats, effect: StatusEffect) {
  stats.statusEffects.push(effect);
}

/**
 * Update status effects (decay duration)
 */
export function updateStatusEffects(stats: HeroStats, deltaTime: number) {
  for (let i = stats.statusEffects.length - 1; i >= 0; i--) {
    stats.statusEffects[i].duration -= deltaTime;
    if (stats.statusEffects[i].duration <= 0) {
      stats.statusEffects.splice(i, 1);
    }
  }
}

/**
 * Update cooldowns
 */
export function updateCooldowns(stats: HeroStats, deltaTime: number) {
  const toDelete: string[] = [];
  stats.cooldowns.forEach((remaining, abilityId) => {
    stats.cooldowns.set(abilityId, remaining - deltaTime);
    if (remaining - deltaTime <= 0) {
      toDelete.push(abilityId);
    }
  });
  toDelete.forEach((id) => stats.cooldowns.delete(id));
}

/**
 * Regenerate mana
 */
export function regenerateMana(stats: HeroStats, deltaTime: number, regenRate: number = 10) {
  stats.mana = Math.min(stats.maxMana, stats.mana + regenRate * deltaTime);
}

/**
 * Cast an ability
 */
export function castAbility(
  caster: HeroStats,
  ability: Ability,
  target: THREE.Vector3,
  casterPos: THREE.Vector3
): boolean {
  // Check cooldown
  if ((caster.cooldowns.get(ability.id) ?? 0) > 0) {
    return false; // On cooldown
  }

  // Check mana
  if (caster.mana < ability.manaCost) {
    return false; // Not enough mana
  }

  // Cast
  caster.mana -= ability.manaCost;
  caster.cooldowns.set(ability.id, ability.cooldown);

  // Apply effects (damage, status, etc.)
  ability.effects.forEach((effect) => {
    applyStatusEffect(caster, effect);
  });

  return true;
}

/**
 * Get active ability set based on class
 */
export function getClassAbilities(heroClass: string): Ability[] {
  switch (heroClass) {
    case 'warrior':
      return WARRIOR_ABILITIES;
    case 'ranger':
      return RANGER_ABILITIES;
    case 'mage':
      return MAGE_ABILITIES;
    default:
      return WARRIOR_ABILITIES;
  }
}

/**
 * Create initial hero stats
 */
export function createHeroStats(heroClass: string, level: number = 1): HeroStats {
  let baseHealth: number, baseMana: number, baseAttack: number, baseDefense: number;

  switch (heroClass) {
    case 'warrior':
      baseHealth = 120;
      baseMana = 50;
      baseAttack = 15;
      baseDefense = 12;
      break;
    case 'ranger':
      baseHealth = 90;
      baseMana = 80;
      baseAttack = 12;
      baseDefense = 8;
      break;
    case 'mage':
      baseHealth = 70;
      baseMana = 150;
      baseAttack = 10;
      baseDefense = 5;
      break;
    default:
      baseHealth = 100;
      baseMana = 100;
      baseAttack = 10;
      baseDefense = 10;
  }

  const healthPerLevel = baseHealth * 0.2;
  const manaPerLevel = baseMana * 0.15;
  const attackPerLevel = baseAttack * 0.1;
  const defensePerLevel = baseDefense * 0.08;

  return {
    level,
    health: baseHealth + healthPerLevel * (level - 1),
    maxHealth: baseHealth + healthPerLevel * (level - 1),
    mana: baseMana + manaPerLevel * (level - 1),
    maxMana: baseMana + manaPerLevel * (level - 1),
    attack: baseAttack + attackPerLevel * (level - 1),
    defense: baseDefense + defensePerLevel * (level - 1),
    speed: 10,
    luck: 0.15, // 15% crit chance base
    statusEffects: [],
    cooldowns: new Map(),
  };
}
