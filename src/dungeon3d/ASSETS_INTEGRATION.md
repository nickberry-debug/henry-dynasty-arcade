# 🐦 Assets Integration Guide — From Kenney to Game

This guide walks you through downloading free assets from Kenney.nl and integrating them into Dungeon3D.

---

## Quick Start (5 Steps)

### Step 1: Create Asset Directories
Already done ✅ — folders created at:
```
C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\
├── models/
│   ├── dungeon/
│   ├── characters/
│   ├── enemies/
│   └── items/
├── audio/
│   ├── music/
│   └── sfx/
├── sprites/
└── ui/
```

### Step 2: Download Assets from Kenney.nl

**Visit:** https://kenney.nl/assets

**Download in this order:**

1. **Dungeon Pack** (walls, floors, props)
   - URL: https://kenney.nl/assets/dungeon-pack
   - Extract to: `assets/models/dungeon/`
   - Size: ~50MB

2. **RPG Enemies** (skeleton, goblin, orc, etc.)
   - URL: https://kenney.nl/assets/rpg-enemies
   - Extract to: `assets/models/enemies/`
   - Size: ~40MB

3. **RPG Characters** (player models)
   - URL: https://kenney.nl/assets/rpg-characters
   - Extract to: `assets/models/characters/`
   - Size: ~30MB

4. **RPG Items** (weapons, armor, loot)
   - URL: https://kenney.nl/assets/rpg-items
   - Extract to: `assets/models/items/`
   - Size: ~25MB

5. **RPG Music** (dungeon themes)
   - URL: https://kenney.nl/assets/rpg-music
   - Extract to: `assets/audio/music/`
   - Size: ~100MB

6. **RPG Sound Pack** (SFX)
   - URL: https://kenney.nl/assets/rpg-sound-pack
   - Extract to: `assets/audio/sfx/`
   - Size: ~50MB

7. **RPG Icons** (UI)
   - URL: https://kenney.nl/assets/game-icons
   - Extract to: `assets/ui/`
   - Size: ~20MB

**Total Download:** ~315MB
**Uncompressed:** ~600MB

---

### Step 3: Update Dungeon3D.tsx to Use Real Assets

Replace old procedural fallbacks with Kenney assets:

```typescript
import { loadKenneyAssets, createAudioListener, playMusic } from '../engine/assetLoaderKenney';

// In initGame():
const kenneyAssets = await loadKenneyAssets();
const audioListener = createAudioListener(camera);

// Use dungeon models instead of procedural:
const wallMesh = kenneyAssets.models.dungeon['wall'].clone();
const floorMesh = kenneyAssets.models.dungeon['floor'].clone();

// Use real enemy meshes:
const enemyMesh = kenneyAssets.models.enemies['goblin'].clone();

// Play music on floor:
const floorTheme = kenneyAssets.audio.music[`floor${currentFloor}`];
playMusic(audioListener, floorTheme, true, 0.5);
```

### Step 4: Add SFX to Combat

In combat.ts, when damage happens:

```typescript
import { playSFX } from '../engine/assetLoaderKenney';

// On hit:
playSFX(audioListener, kenneyAssets.audio.sfx['hit'], 0.7);

// On crit:
playSFX(audioListener, kenneyAssets.audio.sfx['hit-crit'], 0.8);

// On ability cast:
playSFX(audioListener, kenneyAssets.audio.sfx['ability-cast'], 0.6);

// On enemy death:
playSFX(audioListener, kenneyAssets.audio.sfx['enemy-death'], 0.7);
```

### Step 5: Test Asset Loading

Run the game and check:
- [ ] Dungeon walls render correctly
- [ ] Enemy models replace procedural meshes
- [ ] Music plays on each floor
- [ ] SFX plays on hit/ability/death
- [ ] No console errors in DevTools

---

## Detailed Asset Map

### 3D Models (Dungeon)

**Files to expect in `assets/models/dungeon/`:**
```
wall.glb / wall_texture.png
floor.glb / floor_texture.png
door.glb
torch.glb
chest.glb
pillar.glb
stairs.glb
fence.glb
table.glb
chair.glb
```

### 3D Models (Enemies)

**Files to expect in `assets/models/enemies/`:**
```
skeleton.glb
goblin.glb
orc.glb
spider.glb
demon.glb
golem.glb
wraith.glb
```

### 3D Models (Characters)

**Files to expect in `assets/models/characters/`:**
```
male.glb / male_texture.png
female.glb / female_texture.png
warrior.glb
ranger.glb
mage.glb
```

### 3D Models (Items)

**Files to expect in `assets/models/items/`:**
```
sword.glb
shield.glb
bow.glb
staff.glb
armor.glb
helmet.glb
ring.glb
amulet.glb
potion.glb
```

### Audio (Music)

**Files to expect in `assets/audio/music/`:**
```
dungeon1.ogg / dungeon1.wav
dungeon2.ogg / dungeon2.wav
...
boss_theme.ogg / boss_theme.wav
victory.ogg / victory.wav
defeat.ogg / defeat.wav
```

### Audio (SFX)

**Files to expect in `assets/audio/sfx/`:**
```
hit.ogg / hit.wav
hit_crit.ogg / hit_crit.wav
ability_cast.ogg / ability_cast.wav
fireball.ogg / fireball.wav
freeze.ogg / freeze.wav
lightning.ogg / lightning.wav
heal.ogg / heal.wav
level_up.ogg / level_up.wav
enemy_death.ogg / enemy_death.wav
loot_drop.ogg / loot_drop.wav
boss_appear.ogg / boss_appear.wav
```

---

## Integration Code Examples

### Load All Assets at Startup

```typescript
// In Dungeon3D.tsx game component:

const [assets, setAssets] = useState<KenneyAssets | null>(null);
const [audioListener, setAudioListener] = useState<THREE.AudioListener | null>(null);
const [currentMusic, setCurrentMusic] = useState<THREE.Audio | null>(null);

useEffect(() => {
  // Load assets on mount
  loadKenneyAssets().then((loaded) => {
    setAssets(loaded);
    const listener = createAudioListener(camera);
    setAudioListener(listener);
  });
}, []);
```

### Spawn Enemy with Kenney Mesh

```typescript
function spawnEnemyWithKenneyMesh(
  type: 'goblin' | 'orc' | 'skeleton' | 'spider' | 'demon' | 'golem' | 'wraith',
  position: THREE.Vector3,
  assets: KenneyAssets
): THREE.Group {
  const mesh = assets.models.enemies[type].clone();
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
```

### Play Floor Music

```typescript
function setFloorMusic(floor: number, assets: KenneyAssets, audioListener: THREE.AudioListener) {
  // Stop previous music
  if (currentMusic) {
    currentMusic.stop();
  }

  // Play new floor theme
  const musicKey = `floor${floor}`;
  const musicUrl = assets.audio.music[musicKey];
  
  if (musicUrl) {
    const music = playMusic(audioListener, musicUrl, true, 0.4);
    setCurrentMusic(music);
  }
}
```

### Play Hit SFX on Damage

```typescript
function dealDamage(
  target: Enemy,
  amount: number,
  isCrit: boolean,
  assets: KenneyAssets,
  audioListener: THREE.AudioListener
) {
  target.health -= amount;

  // Play SFX
  const sfxKey = isCrit ? 'hit-crit' : 'hit';
  const sfxUrl = assets.audio.sfx[sfxKey];
  playSFX(audioListener, sfxUrl, isCrit ? 0.8 : 0.6);

  // Spawn damage particle
  particleSystem.spawn(target.position, isCrit ? 'spark' : 'blood', 15);
}
```

### Boss Appearance SFX + Theme

```typescript
function spawnBoss(bossId: 'lich-king' | 'abyss-tyrant', assets: KenneyAssets, audioListener: THREE.AudioListener) {
  // Play boss appear sound
  playSFX(audioListener, assets.audio.sfx['boss-appear'], 1.0);

  // Switch to boss music
  const music = playMusic(audioListener, assets.audio.music['boss-floor'], true, 0.5);
  
  // Spawn boss mesh
  const bossMesh = createBossMesh(bossId);
  scene.add(bossMesh);
}
```

---

## Troubleshooting

### "Failed to load model" errors

**Cause:** Asset not found at expected path
**Fix:** Verify files are in correct directory:
```powershell
dir C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\models\enemies\ | grep .glb
```

### Music plays but no SFX

**Cause:** Audio listener not properly initialized
**Fix:** Ensure audio listener is added to camera:
```typescript
const listener = createAudioListener(camera);
camera.add(listener); // Important!
```

### Assets load but look wrong

**Cause:** Material/texture missing or wrong scale
**Fix:** Check Kenney asset folders for texture files (PNG, JPG)
- May need to load textures separately
- Scale may need adjustment (Kenney uses different unit scales)

### Performance issues with 300MB assets

**Cause:** Loading all assets at once
**Fix:** Lazy-load assets per floor:
```typescript
// Load floor theme assets on demand
const floorAssets = await loadFloorAssets(currentFloor);
```

---

## Next Steps (After Assets Loaded)

1. **HUD Layer** (2-3 hours)
   - Health/mana bars
   - Ability cooldown display
   - Loot notifications
   - XP/level display

2. **Audio Manager** (1-2 hours)
   - Music crossfade between floors
   - SFX volume control
   - Mute toggle

3. **Mobile Optimization** (3-4 hours)
   - Touch controls instead of keyboard
   - Responsive HUD scaling
   - Battery optimization

4. **Story/Polish** (4-6 hours)
   - Boss intro cutscenes
   - Victory/defeat screens
   - Run summary stats

---

## Asset Attribution

All assets from **Kenney.nl** are licensed under **CC0 (Public Domain)** — no attribution required, free to use commercially.

- Designer: Kenney (kenney.nl)
- License: CC0
- Terms: Use freely, no restrictions

---

## File Structure After Downloads

```
C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\
├── models/
│   ├── dungeon/
│   │   ├── wall.glb
│   │   ├── floor.glb
│   │   ├── door.glb
│   │   ├── torch.glb
│   │   ├── chest.glb
│   │   └── ... (40+ files)
│   ├── enemies/
│   │   ├── skeleton.glb
│   │   ├── goblin.glb
│   │   ├── orc.glb
│   │   ├── spider.glb
│   │   ├── demon.glb
│   │   ├── golem.glb
│   │   └── wraith.glb
│   ├── characters/
│   │   ├── male.glb
│   │   └── female.glb
│   └── items/
│       ├── sword.glb
│       ├── bow.glb
│       ├── staff.glb
│       └── ... (20+ items)
└── audio/
    ├── music/
    │   ├── dungeon1.ogg
    │   ├── dungeon2.ogg
    │   ├── ... (10 themes)
    │   ├── boss_theme.ogg
    │   └── victory.ogg
    └── sfx/
        ├── hit.ogg
        ├── hit_crit.ogg
        ├── ability_cast.ogg
        ├── fireball.ogg
        ├── ... (20+ effects)
        └── loot_drop.ogg
```

**Total: 150+ files, ~600MB uncompressed**

---

## Summary

- ✅ Asset folders created
- 📥 Download 315MB from Kenney.nl (7 packs)
- 📦 Extract to correct directories
- 🔧 Update Dungeon3D.tsx to use assetLoaderKenney.ts
- 🎵 Add music/SFX to game loop
- ✅ Test in browser

**Estimated time:** 1-2 hours (mostly download)  
**Result:** Full commercial-quality game with professional assets 🐦
