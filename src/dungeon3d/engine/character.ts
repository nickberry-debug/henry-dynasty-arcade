// dungeon3d/engine/character.ts — Player character, movement, orientation (fixes backward-facing)
import * as THREE from 'three';

export interface Character {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  direction: THREE.Vector3; // normalized movement direction
  speed: number;
  facingDirection: number; // angle in radians (0 = +Z, PI/2 = +X, etc.)
  animationState: 'idle' | 'walk' | 'attack';
}

/**
 * Create a character (capsule + simple geometry for now)
 * Will be replaced with Kenney GLB models later
 */
export function createCharacter(position: THREE.Vector3 = new THREE.Vector3(0, 1, 0)): Character {
  const group = new THREE.Group();

  // Body (capsule-like: cylinder)
  const bodyGeom = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  body.position.y = 0.75;
  group.add(body);

  // Head (sphere)
  const headGeom = new THREE.SphereGeometry(0.35, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xa0826d });
  const head = new THREE.Mesh(headGeom, headMat);
  head.castShadow = true;
  head.position.y = 1.6;
  group.add(head);

  // Weapon indicator (small cube, will face forward)
  const weaponGeom = new THREE.BoxGeometry(0.2, 0.2, 0.8);
  const weaponMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0 });
  const weapon = new THREE.Mesh(weaponGeom, weaponMat);
  weapon.castShadow = true;
  weapon.position.z = 0.6; // extends forward
  weapon.position.y = 1;
  group.add(weapon);

  group.position.copy(position);

  return {
    mesh: group,
    position: position.clone(),
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(0, 0, -1), // default facing -Z
    speed: 15, // units per second
    facingDirection: Math.PI, // facing -Z (180°)
    animationState: 'idle',
  };
}

/**
 * Update character position and orientation
 * FIX: Character now faces the direction of movement, not backward
 */
export function updateCharacter(char: Character, deltaTime: number, inputDir: THREE.Vector3) {
  // Update velocity from input
  char.velocity.copy(inputDir).multiplyScalar(char.speed);

  // Update position
  char.position.add(char.velocity.clone().multiplyScalar(deltaTime));
  char.mesh.position.copy(char.position);

  // Update facing direction: character rotates to face movement direction
  if (inputDir.lengthSq() > 0.01) {
    // Get the angle of movement direction in XZ plane
    const angle = Math.atan2(inputDir.x, inputDir.z);
    char.facingDirection = angle;
    char.direction.copy(inputDir).normalize();
    char.animationState = 'walk';
  } else {
    char.animationState = 'idle';
  }

  // Rotate the mesh to face the direction
  // NOTE: This is the key fix — character Y rotation = facing direction
  char.mesh.rotation.y = char.facingDirection;

  // Update animation state (will trigger walk/idle clip in renderer)
  // (actual animation clip playback happens in the render loop)
}

/**
 * Get character movement input from keyboard
 */
export function getMovementInput(keys: Set<string>): THREE.Vector3 {
  const input = new THREE.Vector3();
  if (keys.has('w') || keys.has('ArrowUp')) input.z -= 1;
  if (keys.has('s') || keys.has('ArrowDown')) input.z += 1;
  if (keys.has('a') || keys.has('ArrowLeft')) input.x -= 1;
  if (keys.has('d') || keys.has('ArrowRight')) input.x += 1;
  return input.normalize();
}
