// dungeon3d/engine/fogofwar.ts — Fog-of-war: reveal explored rooms, darken unexplored
import * as THREE from 'three';
import { Room, DungeonLayout } from './generator';

export interface FogOfWarState {
  exploredRooms: Set<number>;
  roomOpacity: Map<number, number>; // room index -> opacity (0 = fully dark, 1 = fully revealed)
  revealRadius: number;
}

/**
 * Initialize fog-of-war state (all rooms dark except start)
 */
export function initFogOfWar(layout: DungeonLayout): FogOfWarState {
  const state: FogOfWarState = {
    exploredRooms: new Set([layout.playerStartRoom]),
    roomOpacity: new Map(),
    revealRadius: 15, // distance within which rooms auto-reveal
  };

  // Initialize all rooms as dark except start
  for (let i = 0; i < layout.rooms.length; i++) {
    state.roomOpacity.set(i, i === layout.playerStartRoom ? 1 : 0.2);
  }

  return state;
}

/**
 * Update fog-of-war based on player position
 * Reveal rooms within revealRadius, fade others
 */
export function updateFogOfWar(
  fogState: FogOfWarState,
  layout: DungeonLayout,
  playerPos: THREE.Vector3
) {
  for (let i = 0; i < layout.rooms.length; i++) {
    const room = layout.rooms[i];
    const roomCenter = new THREE.Vector3(room.x, 0, room.z);
    const distance = playerPos.distanceTo(roomCenter);

    // Reveal if within radius
    if (distance < fogState.revealRadius) {
      fogState.exploredRooms.add(i);
      fogState.roomOpacity.set(i, 1); // fully bright
    } else if (!fogState.exploredRooms.has(i)) {
      // Unexplored: stay dark
      fogState.roomOpacity.set(i, 0.2); // very dim
    } else {
      // Explored but out of radius: slightly darker than revealed
      fogState.roomOpacity.set(i, 0.7);
    }
  }
}

/**
 * Apply fog-of-war opacity to room meshes
 * Reduces opacity of dark/unexplored rooms to visually hide them
 */
export function applyFogOfWarToMesh(
  roomMesh: THREE.Group,
  opacity: number
) {
  roomMesh.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.opacity = opacity;
      child.material.transparent = opacity < 1;
    }
  });
}

/**
 * Check if a room is explored
 */
export function isRoomExplored(fogState: FogOfWarState, roomIndex: number): boolean {
  return fogState.exploredRooms.has(roomIndex);
}
