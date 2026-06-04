# Integration Patch — Wire HUD + Audio into Dungeon3D.tsx

Copy-paste these changes into `Dungeon3D.tsx` to wire everything together.

---

## Step 1: Add Imports (Top of File)

```typescript
import { GameHUD } from './components/GameHUD';
import { createGameIntegration, GameIntegration } from './engine/gameIntegration';
import { loadKenneyAssets } from './engine/assetLoaderKenney';
```

---

## Step 2: Add State Variables (In Component)

```typescript
// Before return statement in component
const [assets, setAssets] = useState<KenneyAssets | null>(null);
const [gameIntegration, setGameIntegration] = useState<GameIntegration | null>(null);
const [isPaused, setIsPaused] = useState(false);
const [hudState, setHudState] = useState({
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  level: 1,
  experience: 0,
  currentFloor: 1,
  statusEffects: [],
  cooldowns: new Map(),
});
```

---

## Step 3: Load Assets on Mount

```typescript
// In useEffect (add this)
useEffect(() => {
  loadKenneyAssets().then((loadedAssets) => {
    setAssets(loadedAssets);
    console.log('✅ Kenney assets loaded');
  }).catch(err => {
    console.warn('⚠️ Assets not found (using procedural fallbacks):', err);
  });
}, []);
```

---

## Step 4: Initialize Game Integration

```typescript
// In initGame() function, after creating scene/camera:
const integration = createGameIntegration(scene, camera, assets, gameState.heroStats);
setGameIntegration(integration);

// Play floor 1 music
integration.playMusic(1);
```

---

## Step 5: Update Game Loop

```typescript
// In animation loop (requestAnimationFrame), add:
if (gameIntegration && !isPaused) {
  gameIntegration.updateGameState(deltaTime);
  
  // Update HUD state
  setHudState({
    health: gameState.heroStats.health,
    maxHealth: gameState.heroStats.maxHealth,
    mana: gameState.heroStats.mana,
    maxMana: gameState.heroStats.maxMana,
    level: gameState.heroStats.level,
    experience: gameState.heroStats.experience,
    currentFloor: gameState.currentFloor,
    statusEffects: gameState.heroStats.statusEffects,
    cooldowns: gameState.heroStats.cooldowns,
  });
}
```

---

## Step 6: Wire Combat Events

```typescript
// When dealing damage:
if (isCritical) {
  gameIntegration?.onEnemyHit(true);
} else {
  gameIntegration?.onEnemyHit(false);
}

// When enemy dies:
gameIntegration?.onEnemyDeath();

// When ability cast:
gameIntegration?.onAbilityCast(ability.name);

// When level up:
if (newLevel > oldLevel) {
  gameIntegration?.onLevelUp();
}

// When boss appears:
if (floor === 9 || floor === 10) {
  gameIntegration?.onBossAppear(bossName);
}
```

---

## Step 7: Change Floor Music

```typescript
// When descending to new floor:
gameIntegration?.playMusic(newFloor);
```

---

## Step 8: Add HUD Component to Render

```typescript
// In return JSX, add:
<canvas ref={canvasRef} style={{ width: '100%', height: '100vh' }} />

{assets && (
  <GameHUD
    hero={hudState}
    currentXpForLevel={hudState.experience}
    nextLevelXp={getNextLevelXp(hudState.level)}
    currentFloor={hudState.currentFloor}
    abilities={gameState.abilities}
    cooldowns={hudState.cooldowns}
    statusEffects={hudState.statusEffects}
    isPaused={isPaused}
    onTogglePause={() => setIsPaused(!isPaused)}
  />
)}
```

---

## Step 9: Pause Menu Handler

```typescript
// Add keyboard listener for P to pause:
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'p' || e.key === 'P') {
    setIsPaused(!isPaused);
  }
};

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isPaused]);
```

---

## Summary of Changes

| File | Change | Size |
|------|--------|------|
| `Dungeon3D.tsx` | Add imports, state, hooks, event wiring | ~50 lines |
| `GameHUD.tsx` | ✅ Created | 5.4 KB |
| `hud.css` | ✅ Created | 10 KB |
| `audioManager.ts` | ✅ Created | 3.3 KB |
| `gameIntegration.ts` | ✅ Created | 5.2 KB |

---

## Quick Test Checklist

After integrating:
- [ ] Game loads without console errors
- [ ] HUD appears with correct values
- [ ] Health bar updates when taking damage
- [ ] Mana bar decreases when casting
- [ ] Cooldown timers count down
- [ ] SFX plays on hit
- [ ] Music plays on floor entry
- [ ] Pause menu opens with P key
- [ ] Status effects show on HUD

---

## Troubleshooting

**HUD not showing?**
- Verify CSS is imported: `import '../styles/hud.css'`
- Check z-index in canvas (should be less than 100)

**No audio?**
- Verify assets are loaded: Check browser console for asset load errors
- Check audio listener is added to camera: `camera.add(audioListener)`

**Cooldowns not counting down?**
- Verify `updateCooldowns()` is called in game loop
- Check cooldown values in abilities.ts

---

**Done! HUD + Audio now fully integrated. 🐦**
