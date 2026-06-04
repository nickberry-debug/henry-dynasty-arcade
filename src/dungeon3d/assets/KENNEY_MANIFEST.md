# Kenney Asset Manifest — What Goes Where

This file maps all Kenney asset files to their correct locations after download.

---

## Download Overview

**Total Download:** 315MB across 7 ZIP files  
**Uncompressed:** ~600MB  
**Time:** 30-60 minutes depending on connection

---

## Asset Packs & Extraction

### 1. Dungeon Pack (50MB)
**URL:** https://kenney.nl/assets/dungeon-pack

**Extract to:** `models/dungeon/`

**Expected files:**
```
dungeon-pack/
├── dungeon_walls_thick_v1/
│   ├── wall_corner.glb
│   ├── wall_edge.glb
│   ├── wall_corner_inv.glb
│   └── ... (12+ wall variations)
├── dungeon_items/
│   ├── barrel_closed.glb
│   ├── barrel_open.glb
│   ├── bookshelf.glb
│   ├── chest_full.glb
│   ├── chest_open.glb
│   ├── pedestal.glb
│   └── ... (15+ items)
├── dungeon_floors/
│   ├── floor_base.glb
│   ├── floor_checkered.glb
│   ├── floor_gravel.glb
│   └── ... (8+ floor types)
└── dungeon_doors/
    ├── door_frame.glb
    ├── door_double.glb
    ├── door_frame_double.glb
    └── ... (6+ door variations)
```

**Usage in game:**
- Walls: `assets/models/dungeon/wall_*.glb`
- Floors: `assets/models/dungeon/floor_*.glb`
- Doors: `assets/models/dungeon/door_*.glb`
- Props: `assets/models/dungeon/{barrel,chest,bookshelf}.glb`

---

### 2. RPG Enemies (40MB)
**URL:** https://kenney.nl/assets/rpg-enemies

**Extract to:** `models/enemies/`

**Expected files:**
```
rpg-enemies/
├── skeleton/
│   ├── skeleton_idle.glb
│   ├── skeleton_walk.glb
│   ├── skeleton_attack.glb
│   └── skeleton.glb (combined)
├── goblin/
│   ├── goblin_idle.glb
│   ├── goblin_walk.glb
│   ├── goblin_attack.glb
│   └── goblin.glb
├── orc/
│   ├── orc.glb
│   ├── orc_idle.glb
│   └── orc_attack.glb
├── spider/
│   ├── spider.glb
│   ├── spider_idle.glb
│   └── spider_attack.glb
├── demon/
│   ├── demon.glb
│   ├── demon_idle.glb
│   └── demon_attack.glb
├── golem/
│   ├── golem.glb
│   ├── golem_idle.glb
│   └── golem_attack.glb
└── wraith/
    ├── wraith.glb
    ├── wraith_idle.glb
    └── wraith_attack.glb
```

**Usage in game:**
- Enemy meshes: `assets/models/enemies/{enemy_type}.glb`
- For animations, use the `_{action}.glb` variants

---

### 3. RPG Characters (30MB)
**URL:** https://kenney.nl/assets/rpg-characters

**Extract to:** `models/characters/`

**Expected files:**
```
rpg-characters/
├── male/
│   ├── male_idle.glb
│   ├── male_walk.glb
│   ├── male_attack.glb
│   └── male.glb
├── female/
│   ├── female_idle.glb
│   ├── female_walk.glb
│   ├── female_attack.glb
│   └── female.glb
├── warrior/
│   ├── warrior_idle.glb
│   ├── warrior_walk.glb
│   ├── warrior_attack.glb
│   └── warrior.glb
├── ranger/
│   ├── ranger_idle.glb
│   ├── ranger_walk.glb
│   ├── ranger_attack.glb
│   └── ranger.glb
└── mage/
    ├── mage_idle.glb
    ├── mage_walk.glb
    ├── mage_cast.glb
    └── mage.glb
```

**Usage in game:**
- Player character: `assets/models/characters/{class}.glb`
- Animations: Use `_{action}.glb` variants

---

### 4. RPG Items (25MB)
**URL:** https://kenney.nl/assets/rpg-items

**Extract to:** `models/items/`

**Expected files:**
```
rpg-items/
├── weapons/
│   ├── sword.glb
│   ├── sword_gold.glb
│   ├── sword_silver.glb
│   ├── bow.glb
│   ├── staff.glb
│   ├── staff_magic.glb
│   ├── axe.glb
│   ├── hammer.glb
│   ├── spear.glb
│   └── ... (15+ weapons)
├── armor/
│   ├── armor_plate.glb
│   ├── armor_leather.glb
│   ├── armor_mail.glb
│   ├── helmet.glb
│   ├── helmet_crown.glb
│   ├── gloves.glb
│   ├── boots.glb
│   └── ... (10+ armor pieces)
├── accessories/
│   ├── ring.glb
│   ├── ring_gold.glb
│   ├── amulet.glb
│   ├── amulet_magic.glb
│   ├── shield.glb
│   ├── shield_gold.glb
│   └── ... (8+ accessories)
└── consumables/
    ├── potion_red.glb
    ├── potion_blue.glb
    ├── potion_green.glb
    ├── scroll.glb
    └── ... (5+ consumables)
```

**Usage in game:**
- Loot pickups: `assets/models/items/{item_type}.glb`
- Displayed on ground with rotation animation

---

### 5. RPG Music (100MB)
**URL:** https://kenney.nl/assets/rpg-music

**Extract to:** `audio/music/`

**Expected files:**
```
rpg-music/
├── dungeon/
│   ├── ambience_dungeon_1.ogg
│   ├── ambience_dungeon_2.ogg
│   ├── ambience_dungeon_3.ogg
│   └── ... (8+ tracks)
├── boss/
│   ├── music_boss_1.ogg
│   ├── music_boss_2.ogg
│   ├── music_boss_3.ogg
│   └── ... (4+ boss themes)
├── victory/
│   ├── music_victory.ogg
│   ├── music_defeat.ogg
│   └── music_game_over.ogg
└── ambient/
    ├── ambient_medieval.ogg
    ├── ambient_dungeon.ogg
    ├── ambient_boss.ogg
    └── ... (more ambient tracks)
```

**Mapping to floors (in gameIntegration.ts):**
```typescript
const musicMap: Record<number, string> = {
  1: '/assets/audio/music/dungeon1.ogg',   // or ambience_dungeon_1.ogg
  2: '/assets/audio/music/dungeon2.ogg',
  3: '/assets/audio/music/dungeon3.ogg',
  4: '/assets/audio/music/dungeon4.ogg',
  5: '/assets/audio/music/dungeon5.ogg',
  6: '/assets/audio/music/dungeon6.ogg',
  7: '/assets/audio/music/dungeon7.ogg',
  8: '/assets/audio/music/dungeon8.ogg',
  9: '/assets/audio/music/boss-floor.ogg',     // boss theme
  10: '/assets/audio/music/boss-floor.ogg',    // final boss theme
};
```

---

### 6. RPG Sound Pack (50MB)
**URL:** https://kenney.nl/assets/rpg-sound-pack

**Extract to:** `audio/sfx/`

**Expected files:**
```
rpg-sound-pack/
├── combat/
│   ├── sword_slash_1.wav
│   ├── sword_slash_2.wav
│   ├── sword_hit_flesh_1.wav
│   ├── sword_hit_flesh_2.wav
│   ├── arrow_release_1.wav
│   ├── arrow_hit_1.wav
│   ├── arrow_hit_2.wav
│   ├── magic_fire.wav
│   ├── magic_ice.wav
│   ├── magic_lightning.wav
│   └── ... (15+ combat sounds)
├── character/
│   ├── hurt_grunt_1.wav
│   ├── hurt_grunt_2.wav
│   ├── death_1.wav
│   ├── death_2.wav
│   ├── level_up.wav
│   ├── heal.wav
│   ├── buff.wav
│   └── ... (8+ character sounds)
├── ui/
│   ├── menu_click.wav
│   ├── button_click.wav
│   ├── toggle_on.wav
│   ├── toggle_off.wav
│   └── ... (5+ ui sounds)
├── world/
│   ├── item_pickup.wav
│   ├── door_open.wav
│   ├── chest_open.wav
│   ├── loot_drop.wav
│   └── ... (8+ world sounds)
└── boss/
    ├── boss_appear.wav
    ├── boss_laugh.wav
    ├── boss_attack.wav
    ├── boss_death.wav
    └── ... (6+ boss sounds)
```

**Mapping to in-game events (in gameIntegration.ts):**
```typescript
const sfxMap: Record<string, string> = {
  'hit': '/assets/audio/sfx/sword_hit_flesh_1.ogg',
  'hit-crit': '/assets/audio/sfx/sword_hit_flesh_2.ogg',
  'ability-cast': '/assets/audio/sfx/magic_fire.ogg',
  'fireball': '/assets/audio/sfx/magic_fire.ogg',
  'freeze': '/assets/audio/sfx/magic_ice.ogg',
  'lightning': '/assets/audio/sfx/magic_lightning.ogg',
  'heal': '/assets/audio/sfx/heal.ogg',
  'level-up': '/assets/audio/sfx/level_up.ogg',
  'enemy-death': '/assets/audio/sfx/death_1.ogg',
  'loot-drop': '/assets/audio/sfx/item_pickup.ogg',
  'boss-appear': '/assets/audio/sfx/boss_appear.ogg',
};
```

---

### 7. RPG Icons (20MB)
**URL:** https://kenney.nl/assets/game-icons

**Extract to:** `ui/`

**Expected files:**
```
rpg-icons/
├── icon_sword.png
├── icon_bow.png
├── icon_staff.png
├── icon_shield.png
├── icon_armor.png
├── icon_helmet.png
├── icon_ring.png
├── icon_amulet.png
├── icon_potion_red.png
├── icon_potion_blue.png
├── icon_potion_green.png
├── icon_heart.png
├── icon_mana.png
├── icon_xp.png
├── icon_gold.png
└── ... (50+ icons)
```

**Usage in HUD:**
```tsx
// In GameHUD.tsx:
<img src="/assets/ui/icon_health.png" alt="Health" />
<img src="/assets/ui/icon_mana.png" alt="Mana" />
<img src="/assets/ui/icon_xp.png" alt="XP" />
```

---

## File Organization After Download

```
C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets\
│
├── models/
│   ├── dungeon/                    (50MB, 40+ files)
│   │   ├── wall_*.glb
│   │   ├── floor_*.glb
│   │   ├── door_*.glb
│   │   └── ... (props)
│   │
│   ├── enemies/                    (40MB, 40+ files)
│   │   ├── skeleton.glb, skeleton_idle.glb, skeleton_walk.glb
│   │   ├── goblin.glb, orc.glb, spider.glb
│   │   ├── demon.glb, golem.glb, wraith.glb
│   │   └── ... (variants)
│   │
│   ├── characters/                 (30MB, 25+ files)
│   │   ├── male.glb, female.glb
│   │   ├── warrior.glb, ranger.glb, mage.glb
│   │   └── ... (animation variants)
│   │
│   └── items/                      (25MB, 50+ files)
│       ├── sword.glb, bow.glb, staff.glb
│       ├── armor.glb, helmet.glb, gloves.glb
│       ├── ring.glb, amulet.glb, shield.glb
│       └── ... (all gear)
│
├── audio/
│   ├── music/                      (100MB, 20+ tracks)
│   │   ├── dungeon1.ogg - dungeon8.ogg
│   │   ├── boss-floor.ogg
│   │   ├── victory.ogg, defeat.ogg
│   │   └── ... (ambient tracks)
│   │
│   └── sfx/                        (50MB, 40+ effects)
│       ├── hit.ogg, hit-crit.ogg
│       ├── ability-cast.ogg
│       ├── fireball.ogg, freeze.ogg, lightning.ogg
│       ├── heal.ogg, level-up.ogg
│       ├── enemy-death.ogg, loot-drop.ogg
│       ├── boss-appear.ogg
│       └── ... (all SFX)
│
└── ui/                             (20MB, 50+ icons)
    ├── icon_sword.png
    ├── icon_shield.png
    ├── icon_health.png, icon_mana.png
    └── ... (all UI icons)
```

**Total after extraction:** ~600MB

---

## Download Checklist

- [ ] Dungeon Pack (50MB) → `models/dungeon/`
- [ ] RPG Enemies (40MB) → `models/enemies/`
- [ ] RPG Characters (30MB) → `models/characters/`
- [ ] RPG Items (25MB) → `models/items/`
- [ ] RPG Music (100MB) → `audio/music/`
- [ ] RPG Sound Pack (50MB) → `audio/sfx/`
- [ ] RPG Icons (20MB) → `ui/`

**Total: 315MB download → 600MB uncompressed**

---

## Mapping Reference

**For Code Integration:**

1. **Walls:** `assets/models/dungeon/wall_*.glb`
2. **Enemies:** `assets/models/enemies/{type}.glb`
3. **Player:** `assets/models/characters/{class}.glb`
4. **Items:** `assets/models/items/{item}.glb`
5. **Music:** `assets/audio/music/dungeon{1-8}.ogg`, `boss-floor.ogg`
6. **SFX:** `assets/audio/sfx/{event}.ogg`
7. **Icons:** `assets/ui/icon_{name}.png`

---

**Total Download Time (estimated):**
- Gigabit connection: 5-10 minutes
- 100Mbps connection: 30-40 minutes
- 10Mbps connection: 4-6 hours

All assets are **CC0 (public domain)** — free to use commercially with no attribution required.
