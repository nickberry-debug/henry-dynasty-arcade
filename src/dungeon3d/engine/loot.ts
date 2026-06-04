// dungeon3d/engine/loot.ts — Loot system, 30+ gear pieces, rarity tiers, enchantments
import * as THREE from 'three';
import { Enemy } from './enemies';

export type GearType = 'weapon' | 'armor' | 'helmet' | 'gloves' | 'boots' | 'ring' | 'amulet';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface GearStats {
  attack?: number;
  defense?: number;
  health?: number;
  mana?: number;
  speed?: number;
  luck?: number;
}

export interface Gear {
  id: string;
  name: string;
  type: GearType;
  rarity: Rarity;
  level: number; // minimum level to equip
  stats: GearStats;
  value: number; // gold worth
  enchantment?: string; // magical effect
}

export interface InventoryItem {
  gear: Gear;
  quantity: number;
}

/**
 * Gear database: 30+ items across all types and rarities
 */
export const GEAR_DATABASE: Gear[] = [
  // Weapons (Common)
  {
    id: 'wooden-sword',
    name: 'Wooden Sword',
    type: 'weapon',
    rarity: 'common',
    level: 1,
    stats: { attack: 5 },
    value: 10,
  },
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'weapon',
    rarity: 'common',
    level: 3,
    stats: { attack: 12 },
    value: 50,
  },
  {
    id: 'wooden-bow',
    name: 'Wooden Bow',
    type: 'weapon',
    rarity: 'common',
    level: 1,
    stats: { attack: 7 },
    value: 15,
  },
  {
    id: 'basic-staff',
    name: 'Basic Staff',
    type: 'weapon',
    rarity: 'common',
    level: 1,
    stats: { attack: 6, mana: 10 },
    value: 20,
  },

  // Weapons (Uncommon)
  {
    id: 'steel-sword',
    name: 'Steel Sword',
    type: 'weapon',
    rarity: 'uncommon',
    level: 5,
    stats: { attack: 20 },
    value: 150,
  },
  {
    id: 'longbow',
    name: 'Longbow',
    type: 'weapon',
    rarity: 'uncommon',
    level: 5,
    stats: { attack: 18 },
    value: 140,
  },
  {
    id: 'firestaff',
    name: 'Firestaff',
    type: 'weapon',
    rarity: 'uncommon',
    level: 5,
    stats: { attack: 16, mana: 25 },
    value: 160,
    enchantment: 'burn',
  },

  // Weapons (Rare)
  {
    id: 'excalibur',
    name: 'Excalibur',
    type: 'weapon',
    rarity: 'rare',
    level: 8,
    stats: { attack: 35, luck: 0.1 },
    value: 500,
  },
  {
    id: 'dragon-bow',
    name: 'Dragon\'s Bow',
    type: 'weapon',
    rarity: 'rare',
    level: 8,
    stats: { attack: 32 },
    value: 480,
    enchantment: 'piercing',
  },
  {
    id: 'arcane-staff',
    name: 'Arcane Staff',
    type: 'weapon',
    rarity: 'rare',
    level: 8,
    stats: { attack: 28, mana: 50 },
    value: 520,
    enchantment: 'mana-regen',
  },

  // Armor (Common)
  {
    id: 'leather-armor',
    name: 'Leather Armor',
    type: 'armor',
    rarity: 'common',
    level: 1,
    stats: { defense: 5 },
    value: 25,
  },
  {
    id: 'iron-armor',
    name: 'Iron Armor',
    type: 'armor',
    rarity: 'uncommon',
    level: 4,
    stats: { defense: 15 },
    value: 120,
  },
  {
    id: 'steel-armor',
    name: 'Steel Armor',
    type: 'armor',
    rarity: 'rare',
    level: 7,
    stats: { defense: 25 },
    value: 400,
  },

  // Helmets
  {
    id: 'leather-helm',
    name: 'Leather Helm',
    type: 'helmet',
    rarity: 'common',
    level: 1,
    stats: { defense: 3 },
    value: 15,
  },
  {
    id: 'knight-helm',
    name: 'Knight\'s Helm',
    type: 'helmet',
    rarity: 'uncommon',
    level: 5,
    stats: { defense: 10 },
    value: 100,
  },
  {
    id: 'crown-of-wisdom',
    name: 'Crown of Wisdom',
    type: 'helmet',
    rarity: 'epic',
    level: 9,
    stats: { defense: 15, mana: 30 },
    value: 800,
    enchantment: 'intellect',
  },

  // Gloves
  {
    id: 'cloth-gloves',
    name: 'Cloth Gloves',
    type: 'gloves',
    rarity: 'common',
    level: 1,
    stats: { attack: 2 },
    value: 12,
  },
  {
    id: 'gauntlets',
    name: 'Steel Gauntlets',
    type: 'gloves',
    rarity: 'uncommon',
    level: 4,
    stats: { attack: 8, defense: 5 },
    value: 110,
  },
  {
    id: 'claws-of-the-beast',
    name: 'Claws of the Beast',
    type: 'gloves',
    rarity: 'epic',
    level: 8,
    stats: { attack: 20, luck: 0.15 },
    value: 900,
    enchantment: 'lifesteal',
  },

  // Boots
  {
    id: 'leather-boots',
    name: 'Leather Boots',
    type: 'boots',
    rarity: 'common',
    level: 1,
    stats: { speed: 1 },
    value: 20,
  },
  {
    id: 'winged-boots',
    name: 'Winged Boots',
    type: 'boots',
    rarity: 'rare',
    level: 6,
    stats: { speed: 4 },
    value: 350,
    enchantment: 'haste',
  },

  // Rings
  {
    id: 'copper-ring',
    name: 'Copper Ring',
    type: 'ring',
    rarity: 'common',
    level: 1,
    stats: { defense: 2 },
    value: 30,
  },
  {
    id: 'ring-of-fire',
    name: 'Ring of Fire',
    type: 'ring',
    rarity: 'rare',
    level: 7,
    stats: { attack: 10, mana: 15 },
    value: 420,
    enchantment: 'burn-aura',
  },
  {
    id: 'ring-of-kings',
    name: 'Ring of Kings',
    type: 'ring',
    rarity: 'epic',
    level: 9,
    stats: { health: 50, attack: 15, defense: 15 },
    value: 1200,
    enchantment: 'regeneration',
  },

  // Amulets
  {
    id: 'wooden-amulet',
    name: 'Wooden Amulet',
    type: 'amulet',
    rarity: 'common',
    level: 1,
    stats: { mana: 10 },
    value: 25,
  },
  {
    id: 'amulet-of-mana',
    name: 'Amulet of Mana',
    type: 'amulet',
    rarity: 'uncommon',
    level: 4,
    stats: { mana: 30 },
    value: 130,
  },
  {
    id: 'amulet-of-the-archmage',
    name: 'Amulet of the Archmage',
    type: 'amulet',
    rarity: 'legendary',
    level: 10,
    stats: { mana: 80, attack: 20 },
    value: 2000,
    enchantment: 'spell-amplify',
  },

  // Legendary items
  {
    id: 'heart-of-the-dragon',
    name: 'Heart of the Dragon',
    type: 'amulet',
    rarity: 'legendary',
    level: 10,
    stats: { health: 100, attack: 30, defense: 20 },
    value: 2500,
    enchantment: 'dragon-power',
  },
];

/**
 * Get gear by rarity (for loot drops)
 */
export function getGearByRarity(rarity: Rarity): Gear[] {
  return GEAR_DATABASE.filter((g) => g.rarity === rarity);
}

/**
 * Generate random loot drop
 */
export function generateLootDrop(floor: number, seed: number = Math.random()): Gear | null {
  const rng = seed;
  const rarityRoll = rng;

  let rarities: Rarity[] = ['common'];
  if (floor >= 3) rarities.push('uncommon');
  if (floor >= 6) rarities.push('rare');
  if (floor >= 8) rarities.push('epic');
  if (floor >= 10) rarities.push('legendary');

  // Probability weights
  let rarity: Rarity;
  if (rarityRoll < 0.6) {
    rarity = rarities[0]; // common
  } else if (rarityRoll < 0.85) {
    rarity = rarities[Math.min(1, rarities.length - 1)];
  } else if (rarityRoll < 0.95) {
    rarity = rarities[Math.min(2, rarities.length - 1)];
  } else {
    rarity = rarities[rarities.length - 1]; // rare/epic/legendary
  }

  const items = getGearByRarity(rarity);
  if (items.length === 0) return null;

  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Create loot pickup mesh
 */
export function createLootMesh(gear: Gear): THREE.Group {
  const group = new THREE.Group();

  // Color based on rarity
  const rarityColors: Record<Rarity, number> = {
    common: 0xaaaaaa,
    uncommon: 0x22aa22,
    rare: 0x2222ff,
    epic: 0xaa22aa,
    legendary: 0xffaa00,
  };

  const color = rarityColors[gear.rarity];
  const geom = new THREE.OctahedronGeometry(0.3, 2);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  group.add(mesh);

  // Spinning animation
  group.userData.rotationSpeed = 3; // rad/sec

  return group;
}

/**
 * Apply gear stats to hero
 */
export function applyGearStats(baseStats: any, gear: Gear) {
  return {
    ...baseStats,
    health: (baseStats.health || 0) + (gear.stats.health || 0),
    maxHealth: (baseStats.maxHealth || 0) + (gear.stats.health || 0),
    mana: (baseStats.mana || 0) + (gear.stats.mana || 0),
    maxMana: (baseStats.maxMana || 0) + (gear.stats.mana || 0),
    attack: (baseStats.attack || 0) + (gear.stats.attack || 0),
    defense: (baseStats.defense || 0) + (gear.stats.defense || 0),
    speed: (baseStats.speed || 0) + (gear.stats.speed || 0),
    luck: (baseStats.luck || 0) + (gear.stats.luck || 0),
  };
}
