// dungeon3d/engine/generator.ts — Procedural dungeon layout generation
import * as THREE from 'three';

export interface Room {
  x: number;
  z: number;
  width: number;
  height: number;
  enemies: number;
  loot: boolean;
  explored: boolean; // fog-of-war flag
}

export interface DungeonLayout {
  rooms: Room[];
  connections: [number, number][]; // room index pairs
  playerStartRoom: number;
  bossRoom: number;
}

/**
 * Generate a 10-floor dungeon layout procedurally
 * Each floor has 4-8 rooms connected via corridors
 */
export function generateDungeon(floor: number, seed: number): DungeonLayout {
  const rng = seededRandom(seed + floor * 1000);
  const roomCount = 4 + Math.floor(rng() * 5); // 4-8 rooms per floor
  const rooms: Room[] = [];
  const connections: [number, number][] = [];

  // Generate rooms in a grid with some randomness
  const gridSize = Math.ceil(Math.sqrt(roomCount));
  for (let i = 0; i < roomCount; i++) {
    const gridX = i % gridSize;
    const gridZ = Math.floor(i / gridSize);
    const x = gridX * 15 + (rng() - 0.5) * 5;
    const z = gridZ * 15 + (rng() - 0.5) * 5;

    rooms.push({
      x,
      z,
      width: 10 + rng() * 5,
      height: 10 + rng() * 5,
      enemies: floor < 3 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3),
      loot: rng() > 0.6,
      explored: false,
    });
  }

  // Connect adjacent rooms
  for (let i = 0; i < roomCount - 1; i++) {
    connections.push([i, i + 1]);
    if (rng() > 0.5 && i + gridSize < roomCount) {
      connections.push([i, i + gridSize]);
    }
  }

  return {
    rooms,
    connections,
    playerStartRoom: 0,
    bossRoom: roomCount - 1,
  };
}

/**
 * Seeded RNG for reproducible dungeons
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Create a 3D room mesh (box with floor, walls, ceiling)
 */
export function createRoomMesh(room: Room): THREE.Group {
  const group = new THREE.Group();

  // Floor
  const floorGeom = new THREE.PlaneGeometry(room.width, room.height);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a4a6a, roughness: 0.7 });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  group.add(floor);

  // Walls (simplified as box outline)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a5a, roughness: 0.8 });
  const wallHeight = 6;

  // Front wall
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(room.width, wallHeight, 0.5), wallMat);
  frontWall.position.set(0, wallHeight / 2, -room.height / 2);
  frontWall.receiveShadow = true;
  frontWall.castShadow = true;
  group.add(frontWall);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(room.width, wallHeight, 0.5), wallMat);
  backWall.position.set(0, wallHeight / 2, room.height / 2);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  group.add(backWall);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallHeight, room.height), wallMat);
  leftWall.position.set(-room.width / 2, wallHeight / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true;
  group.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallHeight, room.height), wallMat);
  rightWall.position.set(room.width / 2, wallHeight / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.castShadow = true;
  group.add(rightWall);

  group.position.set(room.x, 0, room.z);
  return group;
}
