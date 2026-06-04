// dungeon3d/engine/themes.ts — Floor themes (visual variation by depth)
import * as THREE from 'three';

export interface FloorTheme {
  name: string;
  wallColor: number;
  floorColor: number;
  ambientColor: number;
  directionalColor: number;
  fogColor: number;
  enemyTypes: string[]; // which enemy types spawn on this floor
  difficulty: number; // 0-1 scale
}

/**
 * Floor themes progression (floors 1-10)
 */
export const FLOOR_THEMES: FloorTheme[] = [
  // Floor 1-2: Stone halls (surface dungeons)
  {
    name: 'Stone Hall',
    wallColor: 0x8b8b8b,
    floorColor: 0x696969,
    ambientColor: 0xcccccc,
    directionalColor: 0xffffff,
    fogColor: 0x2a2a3a,
    enemyTypes: ['goblin', 'skeleton'],
    difficulty: 0.2,
  },
  {
    name: 'Underground Quarry',
    wallColor: 0x7a7a7a,
    floorColor: 0x606060,
    ambientColor: 0xbbbbbb,
    directionalColor: 0xeeeeee,
    fogColor: 0x1a1a2a,
    enemyTypes: ['goblin', 'orc'],
    difficulty: 0.35,
  },
  // Floor 3-4: Dark caverns
  {
    name: 'Dark Caverns',
    wallColor: 0x4a4a5a,
    floorColor: 0x3a3a4a,
    ambientColor: 0x888888,
    directionalColor: 0xaaaacc,
    fogColor: 0x0a0a1a,
    enemyTypes: ['spider', 'orc', 'skeleton'],
    difficulty: 0.5,
  },
  {
    name: 'Crystalline Depths',
    wallColor: 0x5a5a7a,
    floorColor: 0x4a4a6a,
    ambientColor: 0x9999bb,
    directionalColor: 0xbbccff,
    fogColor: 0x0a0a2a,
    enemyTypes: ['spider', 'demon'],
    difficulty: 0.65,
  },
  // Floor 5-6: Demonic realm
  {
    name: 'Infernal Halls',
    wallColor: 0x6a3a2a,
    floorColor: 0x5a2a1a,
    ambientColor: 0xbb6655,
    directionalColor: 0xff8844,
    fogColor: 0x4a1a0a,
    enemyTypes: ['demon', 'orc', 'golem'],
    difficulty: 0.7,
  },
  {
    name: 'Lava Chambers',
    wallColor: 0x8a4a2a,
    floorColor: 0x7a3a1a,
    ambientColor: 0xdd7744,
    directionalColor: 0xff9955,
    fogColor: 0x6a2a0a,
    enemyTypes: ['demon', 'wraith', 'golem'],
    difficulty: 0.8,
  },
  // Floor 7-8: Ancient tombs
  {
    name: 'Ancient Crypts',
    wallColor: 0x5a5a5a,
    floorColor: 0x4a4a4a,
    ambientColor: 0x777777,
    directionalColor: 0x99ccff,
    fogColor: 0x0a0a1a,
    enemyTypes: ['skeleton', 'wraith'],
    difficulty: 0.75,
  },
  {
    name: 'Sanctum of the Dead',
    wallColor: 0x4a4a4a,
    floorColor: 0x3a3a3a,
    ambientColor: 0x666666,
    directionalColor: 0x88bbee,
    fogColor: 0x000000,
    enemyTypes: ['wraith', 'skeleton', 'demon'],
    difficulty: 0.85,
  },
  // Floor 9: Boss floor
  {
    name: 'Obsidian Throne',
    wallColor: 0x2a2a3a,
    floorColor: 0x1a1a2a,
    ambientColor: 0x555577,
    directionalColor: 0xcc99ff,
    fogColor: 0x000000,
    enemyTypes: ['demon', 'wraith', 'golem'],
    difficulty: 0.9,
  },
  // Floor 10: Final boss floor
  {
    name: 'Abyss',
    wallColor: 0x0a0a1a,
    floorColor: 0x000010,
    ambientColor: 0x333355,
    directionalColor: 0xff00ff,
    fogColor: 0x000000,
    enemyTypes: ['demon', 'wraith'],
    difficulty: 1.0,
  },
];

/**
 * Get theme for a specific floor (1-10)
 */
export function getFloorTheme(floor: number): FloorTheme {
  const index = Math.min(floor - 1, FLOOR_THEMES.length - 1);
  return FLOOR_THEMES[index];
}

/**
 * Apply theme to the scene
 */
export function applyThemeToScene(scene: THREE.Scene, theme: FloorTheme) {
  // Update fog
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.setHex(theme.fogColor);
  }

  // Update ambient light
  const ambientLights = scene.children.filter((c) => c instanceof THREE.AmbientLight);
  ambientLights.forEach((light) => {
    if (light instanceof THREE.AmbientLight) {
      light.color.setHex(theme.ambientColor);
    }
  });

  // Update directional light
  const directionalLights = scene.children.filter((c) => c instanceof THREE.DirectionalLight);
  directionalLights.forEach((light) => {
    if (light instanceof THREE.DirectionalLight) {
      light.color.setHex(theme.directionalColor);
    }
  });
}

/**
 * Apply theme colors to room meshes
 */
export function applyThemeToRoomMeshes(roomMeshes: THREE.Group[], theme: FloorTheme) {
  roomMeshes.forEach((roomMesh) => {
    roomMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const currentColor = (child.material as any).color?.getHex?.();
        
        // Determine if it's a wall or floor and apply theme color
        if (currentColor === 0x4a4a6a || currentColor === 0x3a3a5a) {
          // Wall
          child.material.color.setHex(theme.wallColor);
        } else if (currentColor === 0x4a4a4a || currentColor === 0x6a6a6a) {
          // Floor
          child.material.color.setHex(theme.floorColor);
        }
      }
    });
  });
}
