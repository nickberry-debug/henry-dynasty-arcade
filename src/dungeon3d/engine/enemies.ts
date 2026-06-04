// dungeon3d/engine/enemies.ts — Enemy AI, spawning, pathfinding
import * as THREE from 'three';
import { Room } from './generator';

export type EnemyType = 'goblin' | 'orc' | 'skeleton' | 'spider' | 'demon' | 'golem' | 'wraith';

export interface Enemy {
  id: string;
  type: EnemyType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  range: number;
  ai: EnemyAI;
}

export interface EnemyAI {
  state: 'patrol' | 'chase' | 'attack' | 'dead';
  target: THREE.Vector3 | null;
  patrolCenter: THREE.Vector3;
  patrolRadius: number;
  detectionRange: number;
  lastAttackTime: number;
}

/**
 * Enemy type stats (difficulty increases with floor)
 */
export function getEnemyStats(type: EnemyType, floor: number) {
  const baseStats = {
    goblin: { health: 20, damage: 3, speed: 8, range: 1.5, detection: 15 },
    orc: { health: 40, damage: 6, speed: 6, range: 1.5, detection: 12 },
    skeleton: { health: 30, damage: 4, speed: 7, range: 20, detection: 18 }, // ranged
    spider: { health: 25, damage: 5, speed: 10, range: 1.5, detection: 14 },
    demon: { health: 50, damage: 8, speed: 7, range: 1.5, detection: 16 },
    golem: { health: 60, damage: 7, speed: 4, range: 1.5, detection: 10 },
    wraith: { health: 35, damage: 5, speed: 9, range: 15, detection: 20 }, // ranged
  };

  const stats = baseStats[type];
  const floorMultiplier = 1 + (floor - 1) * 0.15; // scales with depth

  return {
    health: Math.floor(stats.health * floorMultiplier),
    damage: Math.ceil(stats.damage * floorMultiplier),
    speed: stats.speed,
    range: stats.range,
    detection: stats.detection,
  };
}

/**
 * Spawn an enemy in a room
 */
export function spawnEnemy(
  type: EnemyType,
  position: THREE.Vector3,
  floor: number,
  roomMesh: THREE.Group
): Enemy {
  const stats = getEnemyStats(type, floor);

  // Enemy mesh will be cloned from assetCatalog.enemies[type]
  // For now, create a placeholder
  const enemyMesh = new THREE.Group();
  const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const body = new THREE.Mesh(bodyGeom, mat);
  body.castShadow = true;
  body.position.y = 0.4;
  enemyMesh.add(body);

  enemyMesh.position.copy(position);

  return {
    id: `enemy-${Date.now()}-${Math.random()}`,
    type,
    mesh: enemyMesh,
    position: position.clone(),
    health: stats.health,
    maxHealth: stats.health,
    speed: stats.speed,
    damage: stats.damage,
    range: stats.range,
    ai: {
      state: 'patrol',
      target: null,
      patrolCenter: position.clone(),
      patrolRadius: 10,
      detectionRange: stats.detection,
      lastAttackTime: 0,
    },
  };
}

/**
 * Update enemy AI and movement
 */
export function updateEnemy(
  enemy: Enemy,
  deltaTime: number,
  playerPos: THREE.Vector3,
  currentTime: number
) {
  const distToPlayer = enemy.position.distanceTo(playerPos);

  // AI state machine
  if (enemy.ai.state === 'dead') return;

  if (distToPlayer < enemy.ai.detectionRange) {
    // Player detected
    enemy.ai.state = 'chase';
    enemy.ai.target = playerPos.clone();
  } else if (enemy.ai.state === 'chase') {
    // Lost player, go back to patrol
    enemy.ai.state = 'patrol';
    enemy.ai.target = null;
  }

  // Movement
  let moveDir = new THREE.Vector3();

  if (enemy.ai.state === 'patrol') {
    // Patrol: move towards a random point in patrol radius, return to center
    if (!enemy.ai.target || enemy.position.distanceTo(enemy.ai.target) < 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * enemy.ai.patrolRadius;
      enemy.ai.target = new THREE.Vector3(
        enemy.ai.patrolCenter.x + Math.cos(angle) * distance,
        enemy.ai.patrolCenter.y,
        enemy.ai.patrolCenter.z + Math.sin(angle) * distance
      );
    }
    moveDir = enemy.ai.target.clone().sub(enemy.position).normalize();
  } else if (enemy.ai.state === 'chase') {
    // Chase: move towards player
    if (distToPlayer > enemy.range) {
      moveDir = playerPos.clone().sub(enemy.position).normalize();
    } else {
      // In range, try to attack
      enemy.ai.state = 'attack';
    }
  } else if (enemy.ai.state === 'attack') {
    // Check if still in range
    if (distToPlayer > enemy.range + 2) {
      enemy.ai.state = 'chase';
    } else if (currentTime - enemy.ai.lastAttackTime > 1) {
      // Attack every 1 second
      enemy.ai.lastAttackTime = currentTime;
      // Damage player here (Phase 2)
    }
  }

  // Apply movement
  enemy.position.add(moveDir.multiplyScalar(enemy.speed * deltaTime));
  enemy.mesh.position.copy(enemy.position);

  // Face towards target or player
  if (enemy.ai.target || enemy.ai.state === 'chase') {
    const lookTarget = enemy.ai.state === 'chase' ? playerPos : enemy.ai.target;
    if (lookTarget) {
      const angle = Math.atan2(lookTarget.x - enemy.position.x, lookTarget.z - enemy.position.z);
      enemy.mesh.rotation.y = angle;
    }
  }
}

/**
 * Damage enemy
 */
export function damageEnemy(enemy: Enemy, amount: number) {
  enemy.health -= amount;
  if (enemy.health <= 0) {
    enemy.ai.state = 'dead';
    enemy.mesh.visible = false; // Will be removed in Phase 4 (loot drop)
    return true; // killed
  }
  return false;
}
