// dungeon3d/engine/gameIntegration.ts — Wires all systems together into game loop
import * as THREE from 'three';
import { ParticleSystem } from './particles';
import { HeroStats, updateStatusEffects, updateCooldowns, regenerateMana } from './abilities';
import { AudioManager } from './audioManager';
import { KenneyAssets } from './assetLoaderKenney';

export interface GameIntegration {
  particleSystem: ParticleSystem;
  audioManager: AudioManager;
  updateGameState: (deltaTime: number) => void;
  playSFX: (key: string) => void;
  playMusic: (floorNumber: number) => void;
  onEnemyHit: (isCrit: boolean) => void;
  onEnemyDeath: () => void;
  onAbilityCast: (abilityName: string) => void;
  onLevelUp: () => void;
  onBossAppear: (bossName: string) => void;
}

/**
 * Create game integration layer
 */
export function createGameIntegration(
  scene: THREE.Scene,
  camera: THREE.Camera,
  assets: KenneyAssets | null,
  heroStats: HeroStats
): GameIntegration {
  const particleSystem = new ParticleSystem();
  const audioListener = new THREE.AudioListener();
  camera.add(audioListener);

  const audioManager = new AudioManager(audioListener);
  scene.add(particleSystem.mesh);

  // SFX effects map
  const sfxMap: Record<string, string> = {
    'hit': '/assets/audio/sfx/hit.ogg',
    'hit-crit': '/assets/audio/sfx/hit-crit.ogg',
    'ability-cast': '/assets/audio/sfx/ability-cast.ogg',
    'fireball': '/assets/audio/sfx/fireball.ogg',
    'freeze': '/assets/audio/sfx/freeze.ogg',
    'lightning': '/assets/audio/sfx/lightning.ogg',
    'heal': '/assets/audio/sfx/heal.ogg',
    'level-up': '/assets/audio/sfx/level-up.ogg',
    'enemy-death': '/assets/audio/sfx/enemy-death.ogg',
    'loot-drop': '/assets/audio/sfx/loot-drop.ogg',
    'boss-appear': '/assets/audio/sfx/boss-appear.ogg',
  };

  // Music map
  const musicMap: Record<number, string> = {
    1: '/assets/audio/music/dungeon1.ogg',
    2: '/assets/audio/music/dungeon2.ogg',
    3: '/assets/audio/music/dungeon3.ogg',
    4: '/assets/audio/music/dungeon4.ogg',
    5: '/assets/audio/music/dungeon5.ogg',
    6: '/assets/audio/music/dungeon6.ogg',
    7: '/assets/audio/music/dungeon7.ogg',
    8: '/assets/audio/music/dungeon8.ogg',
    9: '/assets/audio/music/boss-floor.ogg',
    10: '/assets/audio/music/boss-floor.ogg',
  };

  // Update game state each frame
  const updateGameState = (deltaTime: number) => {
    // Update particles with gravity
    particleSystem.update(deltaTime);

    // Update hero status effects
    updateStatusEffects(heroStats, deltaTime);

    // Update cooldowns
    updateCooldowns(heroStats, deltaTime);

    // Regenerate mana
    regenerateMana(heroStats, deltaTime, 10);

    // Keep health in bounds
    heroStats.health = Math.min(heroStats.maxHealth, Math.max(0, heroStats.health));
    heroStats.mana = Math.min(heroStats.maxMana, Math.max(0, heroStats.mana));
  };

  // Play SFX by key
  const playSFX = (key: string) => {
    const url = sfxMap[key];
    if (url) {
      audioManager.playSFX(url);
    }
  };

  // Play music by floor
  const playMusic = (floorNumber: number) => {
    const url = musicMap[floorNumber];
    if (url) {
      audioManager.fadeOutMusic(500); // fade out previous
      setTimeout(() => {
        audioManager.playMusic(url, 0.5);
      }, 500);
    }
  };

  // On enemy hit
  const onEnemyHit = (isCrit: boolean) => {
    const sfxKey = isCrit ? 'hit-crit' : 'hit';
    playSFX(sfxKey);
    particleSystem.spawn(new THREE.Vector3(0, 0, 0), isCrit ? 'spark' : 'blood', 15);
  };

  // On enemy death
  const onEnemyDeath = () => {
    playSFX('enemy-death');
    playSFX('loot-drop');
  };

  // On ability cast
  const onAbilityCast = (abilityName: string) => {
    playSFX('ability-cast');

    // Map ability to specific SFX
    switch (abilityName.toLowerCase()) {
      case 'fireball':
        playSFX('fireball');
        break;
      case 'ice spike':
      case 'freeze':
        playSFX('freeze');
        break;
      case 'lightning bolt':
        playSFX('lightning');
        break;
      case 'heal':
      case 'mana shield':
        playSFX('heal');
        break;
    }
  };

  // On level up
  const onLevelUp = () => {
    playSFX('level-up');
    particleSystem.spawn(new THREE.Vector3(0, 0, 0), 'magic', 50);
  };

  // On boss appear
  const onBossAppear = (bossName: string) => {
    playSFX('boss-appear');
    playMusic(9); // Boss theme
  };

  return {
    particleSystem,
    audioManager,
    updateGameState,
    playSFX,
    playMusic,
    onEnemyHit,
    onEnemyDeath,
    onAbilityCast,
    onLevelUp,
    onBossAppear,
  };
}

/**
 * Quick reference: How to use in Dungeon3D.tsx
 *
 * const gameIntegration = createGameIntegration(scene, camera, assets, heroStats);
 *
 * // In animation loop:
 * gameIntegration.updateGameState(deltaTime);
 *
 * // On events:
 * gameIntegration.onEnemyHit(true);  // critical hit
 * gameIntegration.onAbilityCast('Fireball');
 * gameIntegration.onEnemyDeath();
 * gameIntegration.onLevelUp();
 * gameIntegration.onBossAppear('Lich King');
 *
 * // Change floor music:
 * gameIntegration.playMusic(3);  // floor 3 music
 *
 * // Play any SFX:
 * gameIntegration.playSFX('freeze');
 */
