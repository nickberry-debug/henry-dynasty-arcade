// dungeon3d/engine/core.ts — Three.js scene setup, camera, lighting
import * as THREE from 'three';

export interface CoreScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cleanup: () => void;
}

export function initCore(canvas: HTMLCanvasElement): CoreScene {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 50, 200); // fog-of-war base

  // Camera: isometric-ish view, pulled back for better dungeon visibility
  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(20, 25, 25); // elevated, back-right view
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(30, 40, 30);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  scene.add(directionalLight);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(window.devicePixelRatio);

  // Handle window resize
  const onWindowResize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', onWindowResize);

  // Cleanup
  const cleanup = () => {
    window.removeEventListener('resize', onWindowResize);
    renderer.dispose();
  };

  return { scene, camera, renderer, cleanup };
}

/**
 * Update camera to follow a target (e.g., player character)
 * Maintains isometric angle while keeping target in view
 */
export function updateCameraTarget(
  camera: THREE.PerspectiveCamera,
  targetPos: THREE.Vector3,
  distance: number = 35
) {
  const offsetAngle = Math.atan2(camera.position.z - targetPos.z, camera.position.x - targetPos.x);
  camera.position.x = targetPos.x + Math.cos(offsetAngle) * distance;
  camera.position.y = targetPos.y + 25; // keep height constant
  camera.position.z = targetPos.z + Math.sin(offsetAngle) * distance;
  camera.lookAt(targetPos);
}
