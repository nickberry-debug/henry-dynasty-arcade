// dungeon3d/engine/progression.ts — XP, leveling, skill trees, meta-progression, unlockables
import * as THREE from 'three';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number; // XP or points to unlock
  effect: string; // +10% attack, +20 health, etc.
  prerequisite?: string; // required skill id
}

export interface SkillTree {
  class: string;
  nodes: SkillNode[];
}

export interface RunStats {
  heroClass: string;
  level: number;
  experience: number;
  gold: number;
  floorsDefeated: number;
  enemiesKilled: number;
  damage: number;
  timePlayedSeconds: number;
  victory: boolean;
}

export interface MetaProgression {
  totalRuns: number;
  totalKills: number;
  totalGoldEarned: number;
  highestFloor: number;
  victories: number;
  unlockedPerks: string[];
  unlockedDifficulties: string[];
}

/**
 * Skill trees for each class
 */
export const WARRIOR_SKILL_TREE: SkillTree = {
  class: 'warrior',
  nodes: [
    { id: 'robust', name: 'Robust', description: '+20 max health', cost: 100, effect: 'health+20' },
    { id: 'iron-skin', name: 'Iron Skin', description: '+10% defense', cost: 150, effect: 'defense*1.1', prerequisite: 'robust' },
    { id: 'last-stand', name: 'Last Stand', description: 'Gain shield at 25% HP', cost: 200, effect: 'shield-on-low-hp', prerequisite: 'iron-skin' },
    { id: 'cleave', name: 'Cleave', description: 'Melee hits nearby enemies', cost: 120, effect: 'aoe-melee' },
    { id: 'execution', name: 'Execution', description: '+50% damage to low-HP enemies', cost: 180, effect: 'execute-threshold', prerequisite: 'cleave' },
    { id: 'warrior-mastery', name: 'Warrior Mastery', description: '+30% melee damage', cost: 250, effect: 'melee*1.3', prerequisite: 'execution' },
  ],
};

export const RANGER_SKILL_TREE: SkillTree = {
  class: 'ranger',
  nodes: [
    { id: 'precision', name: 'Precision', description: '+15% crit chance', cost: 100, effect: 'crit*1.15' },
    { id: 'piercing', name: 'Piercing', description: 'Arrows pass through enemies', cost: 150, effect: 'piercing-arrows', prerequisite: 'precision' },
    { id: 'headshot', name: 'Headshot', description: '+100% crit damage', cost: 200, effect: 'crit-damage*2', prerequisite: 'piercing' },
    { id: 'rapid-fire', name: 'Rapid Fire', description: 'Attack 20% faster', cost: 120, effect: 'attack-speed*1.2' },
    { id: 'multishot-pro', name: 'Multishot Pro', description: 'Multishot hits 5 targets', cost: 180, effect: 'multishot-spread', prerequisite: 'rapid-fire' },
    { id: 'ranger-mastery', name: 'Ranger Mastery', description: '+30% ranged damage', cost: 250, effect: 'ranged*1.3', prerequisite: 'multishot-pro' },
  ],
};

export const MAGE_SKILL_TREE: SkillTree = {
  class: 'mage',
  nodes: [
    { id: 'mana-pool', name: 'Mana Pool', description: '+50 max mana', cost: 100, effect: 'mana+50' },
    { id: 'mana-regen', name: 'Mana Regen', description: '+5 mana/sec', cost: 150, effect: 'regen+5', prerequisite: 'mana-pool' },
    { id: 'overcharge', name: 'Overcharge', description: 'Spend mana for +20% spell damage', cost: 200, effect: 'spell-amp', prerequisite: 'mana-regen' },
    { id: 'spell-haste', name: 'Spell Haste', description: '-20% ability cooldowns', cost: 120, effect: 'cooldown*0.8' },
    { id: 'spell-chain', name: 'Spell Chain', description: 'Spells chain to nearby enemies', cost: 180, effect: 'chain-cast', prerequisite: 'spell-haste' },
    { id: 'mage-mastery', name: 'Mage Mastery', description: '+30% spell damage', cost: 250, effect: 'spell*1.3', prerequisite: 'spell-chain' },
  ],
};

/**
 * Global perks (unlocked through meta-progression)
 */
export interface Perk {
  id: string;
  name: string;
  description: string;
  unlocksAt: {
    runs?: number;
    victories?: number;
    floor?: number;
    kills?: number;
  };
}

export const PERKS: Perk[] = [
  {
    id: 'lucky-find',
    name: 'Lucky Find',
    description: '+10% rare loot drop rate',
    unlocksAt: { runs: 5 },
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: '+5% damage',
    unlocksAt: { runs: 10 },
  },
  {
    id: 'elite',
    name: 'Elite',
    description: '+10% all stats',
    unlocksAt: { victories: 5 },
  },
  {
    id: 'deep-delver',
    name: 'Deep Delver',
    description: '+15% experience from deeper floors',
    unlocksAt: { floor: 8 },
  },
  {
    id: 'monster-hunter',
    name: 'Monster Hunter',
    description: '+25% damage to bosses',
    unlocksAt: { kills: 500 },
  },
  {
    id: 'master-of-arms',
    name: 'Master of Arms',
    description: 'Start with rare weapon',
    unlocksAt: { victories: 10 },
  },
  {
    id: 'nightmare-mode',
    name: 'Nightmare Mode',
    description: 'Unlock hard difficulty (+50% enemy stats, +2x rewards)',
    unlocksAt: { victories: 3 },
  },
];

/**
 * Calculate XP needed for next level
 */
export function xpForLevel(level: number): number {
  return 100 * level * level;
}

/**
 * Calculate total XP needed to reach level
 */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/**
 * Get current level from XP
 */
export function levelFromXp(totalXp: number): { level: number; currentXp: number; nextLevelXp: number } {
  let level = 1;
  let xpSpent = 0;

  while (xpSpent + xpForLevel(level + 1) <= totalXp) {
    xpSpent += xpForLevel(level + 1);
    level++;
  }

  return {
    level,
    currentXp: totalXp - xpSpent,
    nextLevelXp: xpForLevel(level + 1),
  };
}

/**
 * Check which perks are unlocked
 */
export function getUnlockedPerks(meta: MetaProgression): Perk[] {
  return PERKS.filter((perk) => {
    const unlock = perk.unlocksAt;
    if (unlock.runs && meta.totalRuns < unlock.runs) return false;
    if (unlock.victories && meta.victories < unlock.victories) return false;
    if (unlock.floor && meta.highestFloor < unlock.floor) return false;
    if (unlock.kills && meta.totalKills < unlock.kills) return false;
    return true;
  });
}

/**
 * Get difficulty modifiers
 */
export interface DifficultyModifier {
  name: string;
  enemyStatMultiplier: number;
  lootMultiplier: number;
  xpMultiplier: number;
  unlockedAt?: string; // perk id or 'default'
}

export const DIFFICULTIES: Record<string, DifficultyModifier> = {
  normal: {
    name: 'Normal',
    enemyStatMultiplier: 1,
    lootMultiplier: 1,
    xpMultiplier: 1,
    unlockedAt: 'default',
  },
  hard: {
    name: 'Hard',
    enemyStatMultiplier: 1.5,
    lootMultiplier: 2,
    xpMultiplier: 1.5,
    unlockedAt: 'nightmare-mode',
  },
  nightmare: {
    name: 'Nightmare',
    enemyStatMultiplier: 2.5,
    lootMultiplier: 4,
    xpMultiplier: 3,
    unlockedAt: 'nightmare-mode', // requires beating hard first
  },
};

/**
 * Apply skill tree bonuses to stats
 */
export function applySkillBonuses(baseStats: any, unlockedSkills: string[]): any {
  let stats = { ...baseStats };

  const skillEffects: Record<string, (s: any) => any> = {
    'health+20': (s) => ({ ...s, maxHealth: (s.maxHealth || 0) + 20 }),
    'defense*1.1': (s) => ({ ...s, defense: (s.defense || 0) * 1.1 }),
    'crit*1.15': (s) => ({ ...s, luck: (s.luck || 0) * 1.15 }),
    'attack-speed*1.2': (s) => ({ ...s, speed: (s.speed || 0) * 1.2 }),
  };

  unlockedSkills.forEach((skillId) => {
    const allTrees = [WARRIOR_SKILL_TREE, RANGER_SKILL_TREE, MAGE_SKILL_TREE];
    for (const tree of allTrees) {
      const node = tree.nodes.find((n) => n.id === skillId);
      if (node && skillEffects[node.effect]) {
        stats = skillEffects[node.effect](stats);
      }
    }
  });

  return stats;
}
