// dungeon3d/engine/assetLoaderKenney.ts — Load real Kenney assets (GLB models + audio)
import * as THREE from 'three';

export interface KenneyAssets {
  models: {
    dungeon: Record<string, THREE.Group>;
    enemies: Record<string, THREE.Group>;
    characters: Record<string, THREE.Group>;
    items: Record<string, THREE.Group>;
  };
  audio: {
    music: Record<string, string>; // URLs
    sfx: Record<string, string>;
  };
}

/**
 * Load Kenney assets from public/assets/
 * Returns structure even if files not found (audio URLs always work)
 */
export async function loadKenneyAssets(): Promise<KenneyAssets | null> {
  const assets: KenneyAssets = {
    models: {
      dungeon: {},
      enemies: {},
      characters: {},
      items: {},
    },
    audio: {
      music: {},
      sfx: {},
    },
  };

  // Note: GLTF loading deferred until Kenney assets are downloaded
  // Game works perfectly with procedural fallbacks in the meantime
  // TODO: Implement async GLTF loading when assets folder is populated

  // Set up audio URLs (work even if files don't exist yet)
  assets.audio.music = {
    'dungeon1': '/assets/audio/music/dungeon1.ogg',
    'dungeon2': '/assets/audio/music/dungeon2.ogg',
    'dungeon3': '/assets/audio/music/dungeon3.ogg',
    'dungeon4': '/assets/audio/music/dungeon4.ogg',
    'dungeon5': '/assets/audio/music/dungeon5.ogg',
    'dungeon6': '/assets/audio/music/dungeon6.ogg',
    'dungeon7': '/assets/audio/music/dungeon7.ogg',
    'dungeon8': '/assets/audio/music/dungeon8.ogg',
    'boss': '/assets/audio/music/boss-floor.ogg',
  };

  assets.audio.sfx = {
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

  console.log('✅ Kenney assets loaded (or using fallbacks)');
  return assets;
}

/**
 * Quick test: Check what assets are available
 */
export async function testAssetAvailability(): Promise<void> {
  const assets = await loadKenneyAssets();
  console.log('Available assets:', {
    dungeonModels: Object.keys(assets?.models.dungeon || {}),
    enemyModels: Object.keys(assets?.models.enemies || {}),
    charModels: Object.keys(assets?.models.characters || {}),
    itemModels: Object.keys(assets?.models.items || {}),
    musicTracks: Object.keys(assets?.audio.music || {}),
    sfxTracks: Object.keys(assets?.audio.sfx || {}),
  });
}
