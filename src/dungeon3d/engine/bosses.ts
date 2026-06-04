// dungeon3d/engine/bosses.ts — Boss encounters with mechanics, phases, arena effects
import * as THREE from 'three';
import { Enemy, EnemyAI } from './enemies';

export interface BossEncounter {
  id: string;
  name: string;
  title: string;
  floor: number;
  description: string;
  healthPool: number;
  phases: BossPhase[];
  mechanics: BossMechanic[];
  minions?: () => Enemy[]; // spawn minions
  loot: { experience: number; goldMin: number; goldMax: number; legendaryChance: number };
}

export interface BossPhase {
  healthThreshold: number; // trigger at % health
  attacks: BossAttack[];
  mechanics: string[]; // mechanic ids to activate
}

export interface BossAttack {
  id: string;
  name: string;
  cooldown: number;
  range: number;
  damage: number;
  execute: (boss: Enemy, target: THREE.Vector3) => void;
}

export interface BossMechanic {
  id: string;
  name: string;
  execute: () => void;
}

/**
 * Boss 1: Lich King (Floor 9)
 */
export const LICH_KING: BossEncounter = {
  id: 'lich-king',
  name: 'Lich King',
  title: 'Master of the Undead',
  floor: 9,
  description: 'An ancient skeletal sorcerer commanding dark magic and legions of undead',
  healthPool: 500,
  loot: { experience: 5000, goldMin: 1000, goldMax: 2000, legendaryChance: 0.4 },
  phases: [
    {
      healthThreshold: 1.0,
      attacks: [
        {
          id: 'death-bolt',
          name: 'Death Bolt',
          cooldown: 2,
          range: 40,
          damage: 30,
          execute: (boss, target) => {
            // Cast projectile at target
            console.log(`${boss.type} casts Death Bolt at`, target);
          },
        },
        {
          id: 'bone-curse',
          name: 'Bone Curse',
          cooldown: 4,
          range: 25,
          damage: 20,
          execute: (boss, target) => {
            // Apply curse effect
            console.log(`${boss.type} curses the player`);
          },
        },
      ],
      mechanics: ['minion-summon'],
    },
    {
      healthThreshold: 0.66, // Phase 2 at 66% health
      attacks: [
        {
          id: 'death-bolt',
          name: 'Death Bolt',
          cooldown: 1.5, // faster
          range: 40,
          damage: 35,
          execute: (boss, target) => {
            console.log(`${boss.type} casts multiple Death Bolts`);
          },
        },
        {
          id: 'bone-storm',
          name: 'Bone Storm',
          cooldown: 5,
          range: 30,
          damage: 40,
          execute: (boss, target) => {
            // AoE attack
            console.log(`${boss.type} summons a bone storm`);
          },
        },
      ],
      mechanics: ['minion-summon', 'arena-hazard'],
    },
    {
      healthThreshold: 0.33, // Phase 3 at 33% health
      attacks: [
        {
          id: 'death-bolt',
          name: 'Death Bolt',
          cooldown: 1,
          range: 40,
          damage: 40,
          execute: (boss, target) => {
            console.log(`${boss.type} casts rapid Death Bolts`);
          },
        },
        {
          id: 'death-explosion',
          name: 'Death Explosion',
          cooldown: 3,
          range: 15,
          damage: 60,
          execute: (boss, target) => {
            console.log(`${boss.type} self-destructs`);
          },
        },
      ],
      mechanics: ['minion-summon', 'arena-hazard', 'enrage'],
    },
  ],
  mechanics: [
    {
      id: 'minion-summon',
      name: 'Minion Summon',
      execute: () => {
        console.log('Lich King summons skeleton minions');
        // Spawn 2-3 skeleton adds
      },
    },
    {
      id: 'arena-hazard',
      name: 'Arena Hazard',
      execute: () => {
        console.log('Cursed ground appears');
        // Create damaging floor zones
      },
    },
    {
      id: 'enrage',
      name: 'Enrage',
      execute: () => {
        console.log('Lich King enrages, gaining +50% attack speed');
      },
    },
  ],
};

/**
 * Boss 2: Abyss Tyrant (Floor 10 - Final Boss)
 */
export const ABYSS_TYRANT: BossEncounter = {
  id: 'abyss-tyrant',
  name: 'Abyss Tyrant',
  title: 'Lord of the Abyss',
  floor: 10,
  description: 'A primordial demon of immense power, commanding infernal forces and cosmic destruction',
  healthPool: 800,
  loot: { experience: 10000, goldMin: 3000, goldMax: 5000, legendaryChance: 1.0 },
  phases: [
    {
      healthThreshold: 1.0,
      attacks: [
        {
          id: 'infernal-strike',
          name: 'Infernal Strike',
          cooldown: 2,
          range: 25,
          damage: 40,
          execute: (boss, target) => {
            console.log(`${boss.type} strikes with infernal power`);
          },
        },
        {
          id: 'meteor-rain',
          name: 'Meteor Rain',
          cooldown: 5,
          range: 50,
          damage: 50,
          execute: (boss, target) => {
            console.log(`${boss.type} calls down meteors`);
          },
        },
      ],
      mechanics: ['demon-minion-summon'],
    },
    {
      healthThreshold: 0.5,
      attacks: [
        {
          id: 'infernal-strike',
          name: 'Infernal Strike',
          cooldown: 1.5,
          range: 25,
          damage: 50,
          execute: (boss, target) => {
            console.log(`${boss.type} strikes rapidly`);
          },
        },
        {
          id: 'meteor-rain',
          name: 'Meteor Rain',
          cooldown: 3,
          range: 50,
          damage: 60,
          execute: (boss, target) => {
            console.log(`${boss.type} massive meteor barrage`);
          },
        },
        {
          id: 'void-rupture',
          name: 'Void Rupture',
          cooldown: 6,
          range: 40,
          damage: 70,
          execute: (boss, target) => {
            console.log(`${boss.type} tears open a void`);
          },
        },
      ],
      mechanics: ['demon-minion-summon', 'infernal-arena', 'phase-transition'],
    },
    {
      healthThreshold: 0.0,
      attacks: [
        {
          id: 'void-rupture',
          name: 'Void Rupture',
          cooldown: 2,
          range: 50,
          damage: 80,
          execute: (boss, target) => {
            console.log(`${boss.type} constantly ruptures space`);
          },
        },
        {
          id: 'annihilation',
          name: 'Annihilation',
          cooldown: 4,
          range: 60,
          damage: 100,
          execute: (boss, target) => {
            console.log(`${boss.type} initiates annihilation sequence`);
          },
        },
      ],
      mechanics: ['demon-minion-summon', 'infernal-arena', 'world-ending-power'],
    },
  ],
  mechanics: [
    {
      id: 'demon-minion-summon',
      name: 'Demon Minion Summon',
      execute: () => {
        console.log('Abyss Tyrant summons demon minions');
      },
    },
    {
      id: 'infernal-arena',
      name: 'Infernal Arena',
      execute: () => {
        console.log('Arena fills with lava and fire');
      },
    },
    {
      id: 'phase-transition',
      name: 'Phase Transition',
      execute: () => {
        console.log('Abyss Tyrant enters final form');
      },
    },
    {
      id: 'world-ending-power',
      name: 'World Ending Power',
      execute: () => {
        console.log('Abyss Tyrant channels apocalyptic power');
      },
    },
  ],
};

/**
 * Get boss encounter by ID
 */
export function getBossEncounter(bossId: string): BossEncounter | null {
  const bosses: Record<string, BossEncounter> = {
    'lich-king': LICH_KING,
    'abyss-tyrant': ABYSS_TYRANT,
  };
  return bosses[bossId] || null;
}

/**
 * Create boss mesh
 */
export function createBossMesh(bossId: string): THREE.Group {
  const group = new THREE.Group();

  if (bossId === 'lich-king') {
    // Skeletal form
    const skullGeom = new THREE.SphereGeometry(0.8, 8, 8);
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0x00ff00 });
    const skull = new THREE.Mesh(skullGeom, skullMat);
    skull.castShadow = true;
    skull.position.y = 3;
    group.add(skull);

    const bodyGeom = new THREE.CylinderGeometry(0.6, 0.7, 2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.position.y = 1;
    group.add(body);

    // Staff
    const staffGeom = new THREE.CylinderGeometry(0.1, 0.1, 3, 6);
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const staff = new THREE.Mesh(staffGeom, staffMat);
    staff.castShadow = true;
    staff.position.set(0.8, 2, 0);
    group.add(staff);
  } else if (bossId === 'abyss-tyrant') {
    // Demonic form
    const bodyGeom = new THREE.OctahedronGeometry(1.5, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 0.8 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.position.y = 2;
    group.add(body);

    // Spikes
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spikeGeom = new THREE.ConeGeometry(0.3, 1.5, 4);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
      const spike = new THREE.Mesh(spikeGeom, spikeMat);
      spike.castShadow = true;
      spike.position.set(Math.cos(angle) * 1.5, 2, Math.sin(angle) * 1.5);
      spike.lookAt(0, 2, 0);
      group.add(spike);
    }

    // Aura
    const auraGeom = new THREE.SphereGeometry(2.5, 16, 16);
    const auraMat = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff2200,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
    const aura = new THREE.Mesh(auraGeom, auraMat);
    aura.position.y = 2;
    group.add(aura);
  }

  return group;
}

/**
 * Get current boss phase based on health
 */
export function getCurrentPhase(encounter: BossEncounter, healthPercent: number): BossPhase {
  for (let i = encounter.phases.length - 1; i >= 0; i--) {
    if (healthPercent <= encounter.phases[i].healthThreshold) {
      return encounter.phases[i];
    }
  }
  return encounter.phases[0];
}
