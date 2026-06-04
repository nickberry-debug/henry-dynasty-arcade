# Integration Guide — Wiring Game Systems into Dungeon3D

This guide shows exactly how to integrate the combat, loot, boss, and progression systems into the main game loop.

## Step 1: Import All Systems

Add to `Dungeon3D.tsx` top-level imports:

```typescript
import { ParticleSystem } from '../engine/particles';
import { getClassAbilities, createHeroStats, castAbility, updateStatusEffects, updateCooldowns, regenerateMana } from '../engine/abilities';
import { generateLootDrop, createLootMesh, applyGearStats } from '../engine/loot';
import { getBossEncounter, createBossMesh, getCurrentPhase } from '../engine/bosses';
import { applySkillBonuses, getUnlockedPerks, levelFromXp } from '../engine/progression';
```

## Step 2: Initialize Game Systems

In `initGame()`, after creating the character:

```typescript
// Create particle system
const particleSystem = new ParticleSystem();
core.scene.add(particleSystem.mesh);

// Create hero stats based on class (default warrior, level 1)
const heroClass = 'warrior';
let heroStats = createHeroStats(heroClass, 1);

// Load skill tree for the class
const classAbilities = getClassAbilities(heroClass);

// Load meta-progression (from Dexie or default)
const metaProgression = { /* load from db */ };
const unlockedPerks = getUnlockedPerks(metaProgression);

// Apply perks to stats
heroStats = applySkillBonuses(heroStats, unlockedPerks.map(p => p.id));

// Track active loot pickups
const lootPickups: Array<{ mesh: THREE.Group; gear: Gear; position: THREE.Vector3 }> = [];

// Track boss encounter (null until boss floor)
let currentBoss: Enemy | null = null;
let bossEncounter: BossEncounter | null = null;
```

## Step 3: Update Game Loop

In the animation frame handler (`animate`), add these updates:

```typescript
// Update particle system
particleSystem.update(deltaTime);

// Update hero status effects
updateStatusEffects(heroStats, deltaTime);

// Update ability cooldowns
updateCooldowns(heroStats, deltaTime);

// Regenerate mana
regenerateMana(heroStats, deltaTime, 10); // 10 mana/sec

// Update loot pickups (spinning animation + collision detection)
lootPickups.forEach((loot) => {
  loot.mesh.rotation.y += 3 * deltaTime; // spin
  
  // Check if player picks it up
  if (character.position.distanceTo(loot.position) < 2) {
    // Apply gear stats
    heroStats = applyGearStats(heroStats, loot.gear);
    
    // Remove from scene
    core.scene.remove(loot.mesh);
    lootPickups = lootPickups.filter(l => l !== loot);
    
    // Spawn healing particle effect
    particleSystem.spawn(loot.position, 'heal', 20);
  }
});

// Update boss if active
if (currentBoss && bossEncounter) {
  updateEnemy(currentBoss, deltaTime, character.position, currentTime / 1000);
  
  // Get current boss phase
  const healthPercent = currentBoss.health / currentBoss.maxHealth;
  const currentPhase = getCurrentPhase(bossEncounter, healthPercent);
  
  // Boss attacks player (simplified)
  if (Math.random() < 0.02 * deltaTime) { // 2% per second to attack
    const damage = currentPhase.attacks[0].damage; // use first attack
    heroStats.health -= damage;
    particleSystem.spawn(character.position, 'blood', 15);
  }
}
```

## Step 4: Input Handling

Add ability casting to keyboard input:

```typescript
// In keyboard handler
if (keysRef.current.has('q')) { // Q for ability 1
  const ability = classAbilities[0];
  if (castAbility(heroStats, ability, enemyTarget.position, character.position)) {
    console.log(`Cast ${ability.name}`);
    particleSystem.spawn(character.position, 'magic', 30);
  }
}

if (keysRef.current.has('e')) { // E for ability 2
  const ability = classAbilities[1];
  if (castAbility(heroStats, ability, enemyTarget.position, character.position)) {
    console.log(`Cast ${ability.name}`);
    particleSystem.spawn(character.position, 'spark', 20);
  }
}
```

## Step 5: Enemy Death Handling

When an enemy dies:

```typescript
if (damageEnemy(enemy, attackDamage)) { // returns true if killed
  // Spawn blood particles
  particleSystem.spawn(enemy.position, 'blood', 30);
  
  // Gain experience
  heroStats.experience += 50 + floor * 10;
  
  // Check level up
  const { level } = levelFromXp(heroStats.experience);
  if (level > heroStats.level) {
    heroStats.level = level;
    heroStats.maxHealth += 20;
    heroStats.maxMana += 15;
    console.log(`Level up: ${level}`);
  }
  
  // Generate loot
  const loot = generateLootDrop(currentFloor);
  if (loot) {
    const lootMesh = createLootMesh(loot);
    lootMesh.position.copy(enemy.position);
    core.scene.add(lootMesh);
    lootPickups.push({
      mesh: lootMesh,
      gear: loot,
      position: enemy.position.clone(),
    });
  }
}
```

## Step 6: Boss Floor Setup

When spawning a boss floor (floor 9 or 10):

```typescript
if (currentFloor === 9) {
  bossEncounter = getBossEncounter('lich-king');
  const bossMesh = createBossMesh('lich-king');
  bossMesh.position.set(0, 1, 50); // center of arena
  core.scene.add(bossMesh);
  
  currentBoss = {
    id: 'lich-king-boss',
    type: 'skeleton',
    mesh: bossMesh,
    position: new THREE.Vector3(0, 1, 50),
    health: bossEncounter!.healthPool,
    maxHealth: bossEncounter!.healthPool,
    speed: 3,
    damage: 30,
    range: 30,
    ai: {
      state: 'attack',
      target: character.position,
      patrolCenter: new THREE.Vector3(0, 1, 50),
      patrolRadius: 30,
      detectionRange: 50,
      lastAttackTime: 0,
    },
  };
}
```

## Step 7: UI Integration (Pseudo-code)

Add a HUD layer (in JSX):

```tsx
<div className="hud">
  {/* Health Bar */}
  <div className="health-bar">
    <div className="fill" style={{ width: `${(heroStats.health / heroStats.maxHealth) * 100}%` }} />
    <span>{heroStats.health} / {heroStats.maxHealth}</span>
  </div>
  
  {/* Mana Bar */}
  <div className="mana-bar">
    <div className="fill" style={{ width: `${(heroStats.mana / heroStats.maxMana) * 100}%` }} />
  </div>
  
  {/* Ability Bar */}
  <div className="ability-bar">
    {classAbilities.map((ability, i) => (
      <div key={i} className="ability-slot">
        <span>{ability.name}</span>
        {heroStats.cooldowns.get(ability.id) > 0 && (
          <div className="cooldown">{heroStats.cooldowns.get(ability.id)?.toFixed(1)}s</div>
        )}
      </div>
    ))}
  </div>
  
  {/* Level & XP */}
  <div className="level-info">
    Level {heroStats.level} | XP: {heroStats.experience}
  </div>
  
  {/* Status Effects */}
  <div className="status-effects">
    {heroStats.statusEffects.map((effect, i) => (
      <span key={i} className={`effect effect-${effect.type}`}>
        {effect.type} ({effect.duration.toFixed(1)}s)
      </span>
    ))}
  </div>
</div>
```

## Step 8: Run Completion

When player reaches a boss or dies:

```typescript
const runStats = {
  heroClass,
  level: heroStats.level,
  experience: heroStats.experience,
  gold: goldCollected,
  floorsDefeated: currentFloor - 1,
  enemiesKilled: enemiesKilledCount,
  damage: totalDamageDealt,
  timePlayedSeconds: (Date.now() - runStartTime) / 1000,
  victory: currentFloor >= 10, // victory if reached floor 10
};

// Save run to Dexie
await db.runs.add({
  id: `run-${Date.now()}`,
  heroId: hero.id,
  ...runStats,
  timestamp: Date.now(),
});

// Update meta-progression
metaProgression.totalRuns++;
metaProgression.totalKills += runStats.enemiesKilled;
metaProgression.totalGoldEarned += runStats.gold;
metaProgression.highestFloor = Math.max(metaProgression.highestFloor, currentFloor);
if (runStats.victory) metaProgression.victories++;

// Check for new perk unlocks
const newPerks = getUnlockedPerks(metaProgression);
```

---

## Testing Checklist

- [ ] Particle effects spawn on damage/heal
- [ ] Mana regenerates over time
- [ ] Ability cooldowns countdown correctly
- [ ] Player can cast abilities with Q/E
- [ ] Enemy loot drops spawn and rotate
- [ ] Loot pickup applies stat bonuses
- [ ] XP gain on enemy kill
- [ ] Level ups increase stats
- [ ] Boss spawn on floor 9/10
- [ ] Boss attacks player
- [ ] Loot with rarities drops per floor
- [ ] Status effects apply and expire
- [ ] Run saves to database

---

**Result:** Full game loop with combat, loot, progression, and bosses, all wired and testable. 🐦
