// dungeon3d/engine/combat.ts — Combat system (Phase 2)
import * as THREE from 'three';
import { Character } from './character';
import { Enemy, damageEnemy } from './enemies';

export interface AttackResult {
  hit: boolean;
  damage: number;
  crit: boolean;
  direction: THREE.Vector3;
}

/**
 * Player attacks an enemy
 */
export function playerAttack(player: Character, target: Enemy, ability: string = 'melee'): AttackResult {
  const distance = player.position.distanceTo(target.position);
  const hitRange = ability === 'melee' ? 2 : ability === 'ranged' ? 25 : 15;
  
  if (distance > hitRange) {
    return { hit: false, damage: 0, crit: false, direction: new THREE.Vector3() };
  }

  const baseDamage = 10 + Math.random() * 5;
  const crit = Math.random() < 0.2; // 20% crit chance
  const damage = crit ? baseDamage * 1.5 : baseDamage;
  const direction = target.position.clone().sub(player.position).normalize();

  damageEnemy(target, damage);

  return { hit: true, damage: Math.floor(damage), crit, direction };
}

/**
 * Enemy attacks player
 */
export function enemyAttack(enemy: Enemy, player: Character): number {
  const distance = enemy.position.distanceTo(player.position);
  if (distance > enemy.range + 2) return 0;

  const damage = enemy.damage + (Math.random() - 0.5) * 4;
  return Math.max(1, Math.floor(damage));
}

/**
 * Add juice to combat (knockback, screen shake, etc.)
 */
export function applyCombatJuice(target: THREE.Group, direction: THREE.Vector3, force: number = 5) {
  // Knockback (simple linear push)
  const knockback = direction.multiplyScalar(force * 0.1);
  target.position.add(knockback);

  // Flash effect (lighten color temporarily)
  target.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const originalColor = child.material.color.getHex();
      child.material.color.setHex(0xffffff);
      setTimeout(() => {
        child.material.color.setHex(originalColor);
      }, 100);
    }
  });
}
