# Dungeon Crawler — Session 1 (v1.11.0)

Top-down action-RPG vertical slice. Move → fight → loot → descend, on a real dungeon built from `kenney/tiny-dungeon` tiles with animated `luizmelo` heroes and monsters. All Maze Muncher lessons applied to the viewport + input chain.

---

## ⚠️ Scope notes surfaced

### Session 1 (this pass) — foundation built
- Animated player (martial-hero sprites, 6 anim states)
- Procedural dungeon (4-6 rooms per level, L-shaped corridors, stairs in farthest room)
- 3 enemy types (Goblin / Skeleton / Mushroom) with chase + attack AI
- Combat: melee attack with hit-stop, hit-flash, particles, HP bars
- Loot: coins from enemies + chests, magnetic pickup
- Camera follows player smoothly (lerp), DPR-safe canvas, NO viewport drift
- Touch controls: virtual joystick (left half) + attack button; keyboard WASD/arrows + Space/J
- Per-profile cloud-synced save (totalCoins, totalKills, deepestLevel, runsCompleted)
- Registered, routed `/dungeon` + `/dungeon/run`, in **Adventure & RPG** category

### Asset substitution surfaced ⚠️
**User asked for `modular-dungeon-kit`**, but on-disk inspection found that pack ships **3D models (FBX/GLB/OBJ)** with thumbnail render previews — NOT usable as top-down 2D tiles. I substituted **`kenney/tiny-dungeon`** (the proper 2D analog: 132 16×16 sprite tiles with a complete tilemap) for the dungeon source. The 3D pack stays unused for now — could be revisited later if the project ever moves to a 3D renderer.

### Movement/feel needs device check ⚠️
Headless can verify engine correctness (23/23 assertions pass: movement, collision, combat, loot, descend, adversarial dt all confirmed). But "fun to control" is a device judgement. **Open `/dungeon/run` on the reporting iPad** and confirm:
- Joystick is responsive and finds the right comfort radius
- Attack button reach is comfortable thumb-side
- Camera follow doesn't feel laggy or jittery
- Sprite scale (player drawn at 42% of 200px frame = ~84px on screen; enemies at 54% of 150px = ~81px) looks right relative to the 32px tiles
- Tile indices for floor / wall / stairs / chest / torch look CORRECT — these are educated picks from the `tiny-dungeon` set (the pack ships no documented index → kind map, so I sampled from the included `sampleMap.tmx`). Swapping any tile is a one-line change in `sprites.ts → TILE_INDICES`. If the floor renders as a coin or the wall looks like a sword on the device, that's where to swing.

### Deferred to later sessions (explicitly NOT in Session 1)
- Hero classes (knight / archer / mage variants)
- Gear with rarities + stats (weapons, armor, accessories)
- Bosses on every 3rd or final floor
- Meta-progression between runs (permanent upgrades, currency carry)
- Biomes beyond the dungeon (crypts, lava, ice, etc.)
- Creature-companion tie-in (import companions from Olympus / Survivor)
- Multiplayer / co-op
- Pathfinding-aware enemy AI (current AI walks straight at player; corridors with elbows can briefly stall enemies)
- Visible/equippable inventory beyond the coin counter
- Sound design beyond the existing SFX library hooks

### Verification gaps I'm aware of
- **No live in-browser test** of the actual frame loop on a device. The engine logic is verified; the React/canvas rendering is code-reviewed but not iPad-confirmed.
- **No SFX wired in beyond `playSfx("powerUp")` on level descend** — placeholder. Combat hit sounds, footsteps, ambient sting on enemy spot — all worth adding in Session 2.
- **No visible inventory beyond coin count** — chests just drop coins this pass; rarity gear comes later.

---

## Architecture (new files)

```
src/dungeon/
├── engine.ts                — 350 lines. Game state, dungeon gen, step(),
│                              combat resolution, AI, particles, camera.
├── sprites.ts               — 200 lines. Image cache, animation sheet
│                              specs (martial-hero player + 3 monsters),
│                              tile index map, draw helpers, shadows.
├── store.ts                 — 70 lines. Per-profile save with cloud
│                              blob sync (totalCoins / kills / depth).
└── pages/
    ├── DungeonHub.tsx       — Hub landing: totals, ENTER DUNGEON.
    └── DungeonRun.tsx       — Canvas page: rAF loop, input wiring,
                                draw, virtual joystick, attack button.
```

**Wired** in `src/App.tsx` (`/dungeon`, `/dungeon/run` lazy routes) and `src/config/games.ts` (Adventure & RPG category, order 5).

---

## Engine details

### Dungeon generation (`genLevel`)
- Grid: **32 cols × 24 rows** of 32px cells = 1024×768 world units per level
- 4-6 rectangular rooms placed non-overlapping w/ rejection sampling (200 attempts cap)
- L-shaped corridors connect consecutive rooms (random horizontal-first vs vertical-first)
- Stairs placed in the LAST room (farthest from spawn so the run isn't a 2-step walk)
- Torches sprinkled on room edges as decor + light source
- 1-4 enemies per non-spawn room, scaling with depth
- Chests in interior rooms with ~60% probability

### Movement
- Player speed: **145 px/sec**, normalized to magnitude-1 input axis
- `tryMove` splits x + y so a corner doesn't lock the entity
- 4-corner radius check with `isWalkable` for clean wall sliding
- Camera lerps to player at exp(-dt × 6) — smooth follow, no jitter

### Combat
- Attack range: **38 px wedge** in front of player based on facing
- 14 dmg per hit, 0.32s cooldown between swings
- Hit-stop: 120ms on kill, 50ms on damage (whole sim slows to 25% for that window)
- Particles: yellow on hit (8), red on kill (14)
- Coins: 1-3 per enemy kill, 3-6 per chest
- Enemy HP: Goblin 18, Skeleton 26, Mushroom 38
- Enemy AI: idle → chase when player within 200px → attack within 30px (0.9s cooldown)
- Enemy damage: 8 to player, 0.6s iframes on player damage
- Kid-friendly death: player respawns at level spawn with 40 HP + 1.5s iframes (instead of game-over)

### Loot
- Coins bob (sin wave) for visual life
- Magnetic pickup within 80px (force pulls toward player)
- Auto-collect on close contact (< 14px)
- 12s TTL so the floor doesn't pile up indefinitely

### Camera + viewport (Maze Muncher lessons applied)
- `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` **every frame** (no accumulation)
- Canvas fills `<main>` 100% × 100% via flexbox; sized by parent, not by hardcoded dims
- `touchAction: "none"` on canvas + buttons (iOS Safari can't scroll the page on touches)
- `dt` clamped to `[0, 0.05]` with `Number.isFinite` guard (NaN / negative / huge dt safe)
- Camera offset: `offX = screenW/2 - cameraX`, `offY = screenH/2 - cameraY` — player always around center
- Tile rendering culled to the visible viewport range (no waste off-screen)

### Touch controls
- **Virtual joystick** on the left ~40% of the canvas (bottom-half): tap+drag, max radius 50px, visible ring when active
- **Attack button** in bottom-right: 88px circle, `onPointerDown` + `onTouchStart` + `onClick` (belt-and-suspenders), `userSelect: none`, `WebkitTapHighlightColor: transparent`
- Auto-clear 80ms after press so a single tap = a single attack (not held-for-spam)

---

## Verification (23/23 headless assertions)

```
=== Dungeon generation ===
PASS  genLevel produces well-formed levels 50/50

=== Walkability ===
PASS  Spawn / stairs walkable; OOB returns false

=== Player movement ===
PASS  Player moves on input
PASS  Player stays in level bounds across random walk
PASS  Player never inside a wall across 1000 random-direction frames (0 violations)

=== Combat ===
PASS  Level has enemies to fight (5 spawned at depth 1)
PASS  Attack damages enemy in range (HP 38 → 24)
PASS  Player can kill an enemy (in 27 frames @ 60fps = ~0.45s)
PASS  Coins drop on enemy kill (4 coins)

=== Loot ===
PASS  Player picks up a nearby coin
PASS  Chest opens on overlap
PASS  Chest drops 3-6 coins

=== Descend ===
PASS  State → "descending" when player overlaps stairs
PASS  descendLevel produces new level at depth+1
PASS  Run totals (coins, kills) carry across descend
PASS  Player respawns at new spawn point

=== Multi-depth run ===
PASS  Run advances through 3+ depths (final depth=4, visited 1→2→3)

=== Adversarial dt safety ===
PASS  NaN / negative / Infinity / 999 dt cannot corrupt coords
PASS  Coords stay in level bounds under all dt variants
```

```
npx tsc -b              # exit 0
npx vite build          # exit 0
curl /dungeon           # 200
curl /dungeon/run       # 200
curl /assets/luizmelo/martial-hero/Sprites/Run.png      # 200
curl /assets/kenney/tiny-dungeon/Tiles/tile_0040.png    # 200
```

---

## Files changed

```
A  src/dungeon/engine.ts            (~350 lines — generation, AI, combat, particles)
A  src/dungeon/sprites.ts           (~200 lines — animation sheets, draw helpers)
A  src/dungeon/store.ts             (~70 lines — per-profile save w/ cloud sync)
A  src/dungeon/pages/DungeonHub.tsx (~110 lines — hub landing page)
A  src/dungeon/pages/DungeonRun.tsx (~370 lines — canvas, input, draw)
M  src/App.tsx                      (+/dungeon, /dungeon/run lazy routes)
M  src/config/games.ts              (+Dungeon Crawler entry in Adventure & RPG)
M  package.json                     (1.10.83 → 1.11.0 — first Session 1 vertical slice)
```

### Untouched
- No existing games modified
- No shared infrastructure touched
- v1.10.83 Maze Muncher coord-safety machinery left as-is
