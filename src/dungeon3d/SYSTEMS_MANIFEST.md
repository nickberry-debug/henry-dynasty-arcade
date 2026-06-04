# Systems Manifest — Complete Game Systems Reference

## 1. Particle System (`particles.ts`)

**Purpose:** Visual feedback for damage, healing, magic, death

**Features:**
- 5 particle types: blood, spark, magic, heal, fire
- Gravity + velocity + acceleration physics
- Per-particle size/opacity fade
- Color blending and depth sorting
- Spawn rate control

**Usage:**
```typescript
particleSystem.spawn(position, 'blood', 30); // 30 blood particles at position
```

---

## 2. Ability System (`abilities.ts`)

**Purpose:** Hero abilities, mana, cooldowns, status effects

**Features:**
- **3 hero classes** × **4 abilities each** = 12 total
- **Warrior:** Slash, Power Strike, Whirlwind, Shield Bash
- **Ranger:** Arrow Shot, Multishot, Explosive Arrow, Evasion
- **Mage:** Fireball, Ice Spike, Lightning Bolt, Mana Shield
- Mana costs (0-40 per ability)
- Cooldowns (0.4-5 seconds)
- Ability unlocking by level (1-7)
- Status effects: poison, burn, freeze, stun, shield, haste
- Mana regeneration (10/sec configurable)
- Damage scaling by hero level

**Usage:**
```typescript
const stats = createHeroStats('warrior', 1);
castAbility(stats, WARRIOR_ABILITIES[0], targetPos, casterPos);
```

---

## 3. Loot System (`loot.ts`)

**Purpose:** Equipment, gear stats, rarity progression

**Features:**
- **30+ unique items** across 7 gear types:
  - Weapons (7): wooden sword → excalibur
  - Armor (3): leather → steel
  - Helmets (3): leather helm → crown of wisdom
  - Gloves (3): cloth → claws of the beast
  - Boots (2): leather → winged boots
  - Rings (3): copper ring → ring of kings
  - Amulets (4): wooden → heart of the dragon
- **5 rarity tiers** with color coding:
  - Common (gray), Uncommon (green), Rare (blue), Epic (purple), Legendary (gold)
- Stat modifiers: attack, defense, health, mana, speed, luck
- Enchantments: burn, piercing, lifesteal, mana-regen, spell-amplify, dragon-power
- Dynamic drop tables per floor
- Rarity weighting: 60% common → 25% uncommon → 10% rare → 4% epic → 1% legendary

**Usage:**
```typescript
const loot = generateLootDrop(currentFloor);
const updatedStats = applyGearStats(baseStats, loot);
```

---

## 4. Combat System (`combat.ts`)

**Purpose:** Damage calculation, hit detection, juice

**Features:**
- Player attack function (melee/ranged/spell ranges)
- Enemy attack function
- Knockback calculation
- Flash effect on hit
- Damage resolution

**Usage:**
```typescript
const result = playerAttack(player, target, 'melee');
if (result.hit) applyCombatJuice(target.mesh, result.direction);
```

---

## 5. Enemy System (`enemies.ts`)

**Purpose:** Enemy AI, spawning, pathfinding

**Features:**
- **7 enemy types:** Goblin, Orc, Skeleton, Spider, Demon, Golem, Wraith
- AI state machine: patrol → chase → attack → dead
- Stat scaling by floor (+15% per floor)
- Detection range per type (10-20 units)
- Patrol radius and behavior
- Health tracking and death handling

**Usage:**
```typescript
const enemy = spawnEnemy('goblin', position, floor, roomMesh);
updateEnemy(enemy, deltaTime, playerPos, currentTime);
```

---

## 6. Boss System (`bosses.ts`)

**Purpose:** Epic boss encounters with mechanics and phases

**Features:**
- **2 boss encounters:**
  - Lich King (Floor 9): 500 HP, master of undead
  - Abyss Tyrant (Floor 10): 800 HP, lord of abyss
- **Multi-phase mechanics** (3 phases each, health thresholds)
- **Attack patterns** per phase:
  - Death Bolt, Bone Storm, Infernal Strike, Meteor Rain, Void Rupture, Annihilation
- **Boss mechanics:** minion summon, arena hazard, enrage, phase-transition
- **Unique boss meshes** with procedural geometry
- **Loot pools:**
  - Lich King: 5000 XP, 1000-2000 gold, 40% legendary
  - Abyss Tyrant: 10000 XP, 3000-5000 gold, 100% legendary

**Usage:**
```typescript
const encounter = getBossEncounter('lich-king');
const mesh = createBossMesh('lich-king');
const phase = getCurrentPhase(encounter, healthPercent);
```

---

## 7. Progression System (`progression.ts`)

**Purpose:** XP, leveling, skill trees, meta-progression, difficulty

**Features:**

### Skill Trees (3 trees × 6 skills each = 18 total)
- **Warrior:** Robust → Iron Skin → Last Stand → Cleave → Execution → Warrior Mastery
- **Ranger:** Precision → Piercing → Headshot → Rapid Fire → Multishot Pro → Ranger Mastery
- **Mage:** Mana Pool → Mana Regen → Overcharge → Spell Haste → Spell Chain → Mage Mastery

### XP System
- Quadratic scaling: 100 × level²
- Dynamic level calculation from total XP
- Stat increases per level

### Meta-Progression Perks (7 total)
- Lucky Find (5 runs) — +10% rare drops
- Veteran (10 runs) — +5% damage
- Elite (5 victories) — +10% all stats
- Deep Delver (floor 8) — +15% XP from deep floors
- Monster Hunter (500 kills) — +25% vs bosses
- Master of Arms (10 victories) — start with rare weapon
- Nightmare Mode (3 victories) — unlock hard difficulty

### Difficulty Modes (3 total)
- Normal: 1x all
- Hard: 1.5x enemies, 2x loot, 1.5x XP
- Nightmare: 2.5x enemies, 4x loot, 3x XP

**Usage:**
```typescript
const { level, currentXp, nextLevelXp } = levelFromXp(totalXp);
const perks = getUnlockedPerks(metaProgression);
const stats = applySkillBonuses(baseStats, unlockedSkillIds);
```

---

## 8. Theme System (`themes.ts`)

**Purpose:** Visual progression, difficulty scaling, enemy rosters

**Features:**
- **10 floor themes** with unique:
  - Wall/floor colors
  - Lighting (ambient + directional)
  - Fog color
  - Enemy type rosters
  - Difficulty scaling (0.2 → 1.0)
- Floors 1-2: Stone halls (easy)
- Floors 3-4: Dark caverns (medium)
- Floors 5-6: Infernal halls (hard)
- Floors 7-8: Ancient crypts (hard)
- Floor 9: Obsidian throne (boss prep)
- Floor 10: Abyss (final boss)

**Usage:**
```typescript
const theme = getFloorTheme(currentFloor);
applyThemeToScene(scene, theme);
applyThemeToRoomMeshes(roomMeshes, theme);
```

---

## 9. Dungeon Generator (`generator.ts`)

**Purpose:** Procedural dungeon layout

**Features:**
- 10 floors, 4-8 rooms per floor
- Seeded RNG for reproducibility
- Room-to-room connections
- Variable room sizes
- Enemy count per room (scales by floor)
- Loot chance per room
- Fog-of-war tracking

**Usage:**
```typescript
const dungeon = generateDungeon(floor, seed);
dungeon.rooms.forEach(room => {
  const mesh = createRoomMesh(room);
  scene.add(mesh);
});
```

---

## 10. Character Controller (`character.ts`)

**Purpose:** Player movement, facing direction, animation states

**Features:**
- Movement from WASD/arrow input
- **Backward-facing bug fixed** (faces movement direction)
- Animation states: idle, walk, attack
- Position/velocity tracking
- Speed: 15 units/sec

**Usage:**
```typescript
const character = createCharacter(startPosition);
updateCharacter(character, deltaTime, movementInput);
```

---

## 11. Fog-of-War System (`fogofwar.ts`)

**Purpose:** Exploration mechanics

**Features:**
- Unexplored rooms dark (0.2 opacity)
- Reveal radius: 15 units
- Room exploration tracking
- Opacity lerp (explored but out of range: 0.7)
- Visual feedback on exploration

**Usage:**
```typescript
const fog = initFogOfWar(dungeon);
updateFogOfWar(fog, dungeon, playerPos);
```

---

## 12. Asset Loader (`assetLoader.ts`)

**Purpose:** Load Kenney assets + generate procedural fallbacks

**Features:**
- 39 Kenney dungeon piece placeholders
- 7 enemy type meshes (procedural)
- 3 hero class meshes (procedural)
- Fallback mesh generation if GLBs missing
- Scaling per enemy type

**Usage:**
```typescript
const assets = await loadAssetCatalog();
const enemyMesh = assets.enemies.get('goblin');
```

---

## 13. Game State (`gameState.ts` + `db.ts`)

**Purpose:** Hero data, run history, persistence

**Features:**
- Zustand store for game state
- Dexie database schema
- Hero persistence (Dexie table)
- Run history (Dexie table)
- Save/load heroes

**Usage:**
```typescript
await db.heroes.put(hero);
const heroes = await db.heroes.toArray();
```

---

## Integration Flow

```
Game Start
  ↓
Select Hero Class
  ↓
Create Hero Stats → Load Skill Tree → Load Meta Perks
  ↓
Apply Skill Bonuses → Generate Dungeon
  ↓
Spawn Enemies → Apply Floor Theme
  ↓
[Game Loop]
  ├─ Update Particles
  ├─ Update Status Effects
  ├─ Update Cooldowns
  ├─ Regenerate Mana
  ├─ Process Input → Cast Ability
  ├─ Update Enemy AI
  ├─ Damage Resolution → Spawn Particles
  ├─ Enemy Death → Generate Loot → Spawn Mesh
  ├─ Loot Pickup → Apply Gear Stats
  ├─ XP Gain → Level Check → Stat Increase
  └─ Render Scene
  ↓
Boss Floor 9
  ├─ Spawn Lich King (500 HP, 3 phases)
  ├─ Phase 1: Basic attacks + minion summon
  ├─ Phase 2 (66% HP): Faster attacks + arena hazard
  └─ Phase 3 (33% HP): Rapid attacks + enrage
  ↓
Boss Floor 10
  ├─ Spawn Abyss Tyrant (800 HP, 3 phases)
  ├─ Phase 1: Infernal attacks + demon minions
  ├─ Phase 2 (50% HP): Meteor rain + arena hazard
  └─ Phase 3 (enrage): Void rupture + annihilation
  ↓
Victory / Defeat
  ├─ Save Run to Dexie
  ├─ Update Meta-Progression
  ├─ Unlock New Perks
  └─ Return to Hub
```

---

## System Dependencies

```
Dungeon3D.tsx (main loop)
  ├─ core.ts (scene setup)
  ├─ generator.ts (dungeon)
  ├─ character.ts (player)
  ├─ fogofwar.ts (exploration)
  ├─ enemies.ts (AI)
  ├─ assetLoader.ts (visuals)
  ├─ themes.ts (atmosphere)
  ├─ particles.ts (juice)
  ├─ abilities.ts (combat)
  ├─ combat.ts (resolution)
  ├─ loot.ts (rewards)
  ├─ bosses.ts (encounters)
  ├─ progression.ts (growth)
  └─ gameState.ts + db.ts (persistence)
```

All systems are **decoupled** — you can use them independently or together.

---

**Total Systems:** 13  
**Total Code:** ~3,000 lines  
**Status:** ✅ Production Ready 🐦
