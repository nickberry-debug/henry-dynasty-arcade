# Free Asset Sources for Dungeon Crawler 3D

This document maps all free, CC0/CC-BY licensed assets you can download for the game.

## Priority Assets Needed

### 1. 3D Models (GLB/GLTF)

#### Kenney (kenney.nl)
- **Dungeon Pack** — https://kenney.nl/assets/dungeon-pack
  - Walls, floors, doors, chests, props
  - Format: GLB/GLTF
  - License: CC0
  - Size: ~50MB
  
- **RPG Characters** — https://kenney.nl/assets/rpg-characters
  - Character models (male/female)
  - Format: GLB/GLTF
  - License: CC0
  - Size: ~30MB

- **RPG Enemies** — https://kenney.nl/assets/rpg-enemies
  - 7+ enemy types (skeleton, orc, goblin, demon, etc.)
  - Format: GLB/GLTF
  - License: CC0
  - Size: ~40MB

- **RPG Items** — https://kenney.nl/assets/rpg-items
  - Weapons, armor, rings, potions
  - Format: GLB/GLTF
  - License: CC0
  - Size: ~25MB

#### Quaternius (Sketchfab)
- **Low Poly Dungeon Assets** — https://sketchfab.com/quaternius
  - Free download (CC0)
  - Walls, doors, torches, barrels
  - Format: GLB
  - Size: varies

### 2. Audio Assets

#### Kenney Audio (kenney.nl/assets)
- **RPG Music** — https://kenney.nl/assets/rpg-music
  - 8+ dungeon/boss themes
  - Format: OGG/WAV
  - License: CC0
  - Size: ~100MB

- **RPG SFX** — https://kenney.nl/assets/rpg-sound-pack
  - 100+ sound effects (hit, magic, abilities, enemies)
  - Format: OGG/WAV
  - License: CC0
  - Size: ~50MB

#### Eric Matyas (Free Music Archive)
- **Boss Music** — https://www.ericmatyas.com/
  - High-quality dungeon/boss themes
  - License: CC0
  - Format: MP3/WAV

#### OpenGameArt (opengameart.org)
- **Fantasy Music** — Search "dungeon" or "boss"
- **SFX Packs** — Combat, magic, ambient sounds
- License: CC0 or CC-BY

### 3. Sprites/2D Art

#### Kenney
- **RPG Icons** — https://kenney.nl/assets/game-icons
  - UI icons, ability icons, item icons
  - Format: PNG
  - License: CC0
  - Size: ~20MB

- **Game UI** — https://kenney.nl/assets/game-icons-expansion
  - Health bars, buttons, backgrounds
  - Format: PNG

#### OpenGameArt
- **LPC Character Generator** — Free character sprites
- **Dungeon Tilesets** — 2D parallax backgrounds

### 4. Download Strategy

**Best Approach:**
1. Visit kenney.nl → Click each pack → Download ZIP
2. Extract to `C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\`
3. Organize by type: `models/`, `audio/`, `sprites/`, `ui/`

**Files to Download (in order):**
1. Dungeon Pack (walls, floors, props)
2. RPG Enemies (skeleton, goblin, orc, etc.)
3. RPG Characters (player models)
4. RPG Items (weapons, armor, loot)
5. RPG Music (dungeon themes, boss themes)
6. RPG SFX (hit, magic, ambient, death)
7. RPG Icons (UI, abilities)

**Total Download:** ~250-300MB (uncompressed)
**Disk Space Needed:** ~500MB

### 5. License Verification

All Kenney assets are **CC0 (Public Domain)** — use freely, no attribution required.
All OpenGameArt assets are **CC0 or CC-BY** — check individual files.

---

## Setup Instructions

### Step 1: Create Asset Directories

```powershell
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\models
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\models\dungeon
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\models\characters
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\models\enemies
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\models\items
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\audio\music
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\audio\sfx
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\sprites
mkdir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\ui
```

### Step 2: Download Assets

Visit each Kenney URL above and extract ZIPs into corresponding directories.

### Step 3: Update Loader

The assetLoader.ts will auto-discover GLBs in:
- `assets/models/dungeon/`
- `assets/models/enemies/`
- `assets/models/items/`

### Step 4: Update Audio

Add music/SFX to audio manager (to be built):
- `assets/audio/music/` → floor themes
- `assets/audio/sfx/` → ability/hit sounds

---

## Asset Usage in Code

### Load a Model

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
const dungeon = await loader.loadAsync('/assets/models/dungeon/wall.glb');
scene.add(dungeon.scene);
```

### Play Music

```typescript
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

const music = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/assets/audio/music/floor1-theme.ogg', (buffer) => {
  music.setBuffer(buffer);
  music.setLoop(true);
  music.play();
});
```

### Play SFX

```typescript
const sfx = new THREE.Audio(audioListener);
sfxLoader.load('/assets/audio/sfx/hit.ogg', (buffer) => {
  sfx.setBuffer(buffer);
  sfx.play();
});
```

---

## Recommended Priority Order

1. **Day 1 Priority (Hours 1-2):**
   - Dungeon Pack
   - RPG Enemies
   - RPG Music
   - RPG SFX

2. **Day 1 Priority (Hours 3-4):**
   - RPG Characters
   - RPG Items
   - RPG Icons

3. **Optional (Nice-to-Have):**
   - Additional music packs
   - UI assets
   - Particle effect sprites

---

## Status

- [ ] Kenney Dungeon Pack downloaded
- [ ] Kenney RPG Enemies downloaded
- [ ] Kenney RPG Music downloaded
- [ ] Kenney RPG SFX downloaded
- [ ] Kenney RPG Characters downloaded
- [ ] Kenney RPG Items downloaded
- [ ] Kenney RPG Icons downloaded
- [ ] Assets extracted to correct directories
- [ ] assetLoader.ts updated to load real models
- [ ] Audio manager implemented
- [ ] Music plays on floor entry
- [ ] SFX plays on hit/ability/death

---

**Total Assets:** 500+ items  
**Total Size:** ~300MB download  
**Setup Time:** 30-60 minutes  
**IGN Rating:** 10/10 📱🐦
