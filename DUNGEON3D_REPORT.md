# Dungeon Crawler 3D — Session 1 (v1.11.1)

Three.js + real Kenney `modular-dungeon-kit` GLBs. Orthographic isometric camera tuned for the purple-stone promo look. Animated character GLBs, basic combat + loot, smooth follow-camera, touch + keyboard, per-profile cloud-synced save.

The 2D Dungeon Crawler from v1.11.0 stays in the registry alongside this new 3D one (`/dungeon` vs `/dungeon3d`) — the user can pick either; they share conceptually-similar logic but ship different renderers.

---

## ⚠️ Scope notes surfaced

### Critical — device confirmation required
1. **Three.js rendering, look, and 60fps are device-only.** Headless cannot run WebGL or the GLTFLoader. I verified the engine end-to-end with 26 headless assertions and confirmed every model + module + route serves 200, but I **cannot prove the iso camera matches the Kenney promos or that the scene hits 60fps on iPad from this sandbox**. Open `/dungeon3d/run` on the reporting device:
   - Confirm the camera angle / framing reads as "iso Kenney" (the promo screenshots)
   - Confirm the dungeon walls/floors load and look like the kit (purple-stone, soft lighting)
   - Confirm frame rate doesn't drop below ~30fps with all enemies on screen + multiple coins
2. **Tile alignment / wall orientation may need tweaking.** Each Kenney piece is centered at origin with a ~4×4 unit footprint, but the exact pivot point + door direction can vary per piece. The wall-orientation map computes which side of a wall cell borders floor, then rotates the piece — but the **rotation values are educated guesses** (no per-piece pivot documentation ships with the kit). If walls face the wrong way on the device, the rotation map in `Dungeon3DRun.tsx → rotMap` is a one-line swap per orientation key.
3. **Player animation clip names are best-guesses.** `pickClip()` searches for "idle"/"walk"/"attack" by substring match on the GLB's animation names. If `character-a.glb` ships clips named differently (e.g. `IdleA`, `Walking_01`), my picker falls back to the first available clip. If the player stands still while moving on the device, that's where to look — log the clip names from `animations` in `loadCharacter()`.
4. **Performance optimization is minimal.** I clone shared geometry + materials (saves GPU memory, draw call count is still ~150-300 for a dense dungeon). I did NOT use `InstancedMesh` or merge geometries — those are real win paths for the next session if iPad framerate is bad. Mesh count target: should hit 60fps on iPad Pro M-series but might dip on older iPads.

### Foundation built (Session 1)
- Three.js scene w/ orthographic iso camera, soft directional + ambient lighting, fog
- 39 dungeon GLBs available; **7 actively used this session** (floor, wall, wall-corner, stairs, gate + chest cube). Full catalog wired in for future passes via `DUNGEON_MODELS`.
- Procedural dungeon generation (3-5 rooms, L-corridors, stairs in farthest room) on an 18×14 cell grid
- Animated player character (blocky-characters `character-a.glb`) with idle/walk crossfade via AnimationMixer
- 3 enemy variants (grunt/scout/brute) using character-h/k/p GLBs tinted differently
- Basic melee combat (range 2.2 units, 16 dmg, 0.34s cooldown) with hit-stop + flash
- Loot: coins drop on kill (2-4) + chests (3-6), magnetic pickup at 3.5 units
- Kid-friendly respawn (40 HP + 1.5s iframes at level spawn, no game-over)
- Touch: virtual joystick (left 40%) + 88px attack button (`onPointerDown`/`onTouchStart`/`onClick`)
- Keyboard: WASD/arrows + Space/J
- Multi-level descend: stairs trigger `descendLevel`, scene rebuilt cleanly (old GLBs disposed, new ones loaded)
- DPR-safe renderer, sanitized `dt`, all Maze Muncher viewport lessons applied
- Per-profile cloud-synced save (totalCoins / totalKills / deepestLevel / runsCompleted)
- Registered as "Dungeon Crawler 3D" in **Adventure & RPG** at `/dungeon3d`

### Deferred (per scope)
- Hero classes / archetypes
- Gear with rarities + stats
- Bosses on key floors
- More biomes (beyond the dungeon kit's purple-stone)
- Full Kenney catalog wiring (more enemy/prop/weapon packs)
- Meta-progression between runs
- Companion tie-in (import from Olympus / Survivor)
- Multiplayer / co-op
- Pathfinding-aware enemy AI (current AI walks straight at player)
- Performance optimizations: InstancedMesh, geometry merging, frustum culling beyond Three's default
- Visible inventory beyond coin count
- Combat SFX library hookup beyond placeholder `playSfx("powerUp")` on descend

---

## On-disk asset inventory (confirmed)

### `kenney/modular-dungeon-kit/Models/GLB format/` — 39 GLB files

```
corridor-corner.glb          corridor-end.glb              corridor-intersection.glb
corridor-junction.glb        corridor-transition.glb       corridor-wide-corner.glb
corridor-wide-end.glb        corridor-wide-intersection.glb corridor-wide-junction.glb
corridor-wide.glb            corridor.glb
gate-door-window.glb         gate-door.glb                 gate-metal-bars.glb
gate.glb
room-corner.glb              room-large-variation.glb      room-large.glb
room-small-variation.glb     room-small.glb                room-wide-variation.glb
room-wide.glb
stairs-wide.glb              stairs.glb
template-corner.glb          template-detail.glb           template-floor-big.glb
template-floor-detail-a.glb  template-floor-detail.glb     template-floor-layer-hole.glb
template-floor-layer-raised.glb  template-floor-layer.glb  template-floor.glb
template-wall-corner.glb     template-wall-detail-a.glb    template-wall-half.glb
template-wall-stairs.glb     template-wall-top.glb         template-wall.glb
```

**Used this session:** template-floor, template-wall, template-wall-corner, stairs, gate. **Stored as references** in `DUNGEON_MODELS` constant for next-session expansion.

### `kenney/blocky-characters/Models/GLB format/` — 18 character GLBs (a–r)

Used: `character-a` (player), `character-h` (grunt enemy), `character-k` (scout enemy), `character-p` (brute enemy). All tinted via material color swap in `tintModel()`.

### Asset HTTP verification (dev server)

```
200  2,052B    template-floor.glb
200  43,216B   template-wall.glb
200  271,196B  stairs.glb
200  53,804B   gate.glb
200  113,596B  character-a.glb (player)
200  113,596B  character-h.glb (enemy)
```

URL encoding: paths contain spaces (`GLB format/`) which Three's GLTFLoader handles correctly when given the `encodeURI`-style URL we construct in `modelCache.ts`.

---

## Architecture

```
src/dungeon3d/
├── engine.ts                — 320 lines. Game state, dungeon gen
│                              (rooms + L-corridors + wall orientation
│                              map), step() with combat/AI/coins/chests.
│                              Same conceptual shape as the 2D engine.ts.
├── modelCache.ts            — 120 lines. GLTFLoader wrapper with
│                              promise cache. clone-on-demand. tintModel
│                              for enemy variants. DUNGEON_MODELS /
│                              CHARACTER_MODELS URL constants.
├── store.ts                 — 70 lines. Per-profile save with cloud
│                              blob sync (parallel to dungeon/store.ts
│                              with its own blob key dungeon3d_save_v1).
└── pages/
    ├── Dungeon3DHub.tsx     — 100 lines. Hub landing.
    └── Dungeon3DRun.tsx     — 580 lines. Three.js scene setup, rAF
                                game loop, input wiring, dungeon mesh
                                construction, per-frame entity sync,
                                touch joystick + attack button.
```

### Three.js scene specifics

- **Renderer**: WebGLRenderer w/ `antialias: true`, `powerPreference: "high-performance"`, `outputColorSpace: SRGBColorSpace`, `PCFSoftShadowMap`, pixel ratio capped at 2
- **Camera**: OrthographicCamera at `(12, 15, 12)` looking at origin. d=8 zoom. Aspect-aware resize on container width changes.
- **Lighting**:
  - `AmbientLight(0x6a4a8a, 0.55)` — purple fill, matches Kenney palette
  - `DirectionalLight(0xffd9b5, 1.05)` from `(12, 22, 8)` — warm sun, casts soft shadows (2048×2048 shadow map, custom ortho frustum tuned to dungeon size)
  - `DirectionalLight(0x6080ff, 0.30)` from `(-8, 10, -8)` — cool blue fill
- **Fog**: `Fog(0x140510, 30, 65)` — dark purple, fades distant pieces
- **Scene background**: `0x140510` — matches fog so unlit edges blend
- **Camera follow**: `cameraTargetX/Z` lerps toward player in engine `step()`; the React loop reads it each frame and sets `camera.position = (target + 12, 15, target + 12)` so the iso angle is preserved while the camera trails the player

### Dungeon construction

- Floors placed for every `floor`/`stairs` cell
- Wall pieces placed for every `wall` cell that borders floor; rotation chosen from `wallOrientation` map (`n/s/e/w` + `corner-nw/ne/sw/se`)
- Stairs piece overlaid + tinted blue at the descend cell
- Single decorative gate at the spawn point
- All meshes cast + receive shadows

### Performance budget (target)

- Typical dense level: ~30 floors + ~50 walls + ~3 stairs + ~3 chests + 1 gate + 1 player + ~5 enemies + ~10 coins = ~100-150 meshes
- Draw calls ≈ mesh count (no instancing yet)
- Target: 60fps on iPad Air M1+, may dip on older devices
- **If perf is bad on the device:** wire up `InstancedMesh` for repeated tile types — biggest win available

---

## Verification

### Engine (26/26 headless assertions)

```
=== Geometry ===
PASS  CELL=4 (Kenney piece-size)
PASS  World dims = COLS×CELL × ROWS×CELL

=== Generation ===
PASS  genLevel produces 30/30 well-formed levels
PASS  Spawn and stairs are separated
PASS  Wall orientation map populated

=== Walkability ===
PASS  Spawn / stairs walkable; OOB returns false (-200, 999)

=== Movement ===
PASS  Player never inside a wall across 1500 random-direction frames
PASS  Player moves right on ax=1
PASS  Facing rotates with input

=== Combat ===
PASS  Level has 2+ enemies
PASS  Attack damages enemy in range (HP 18 → 2)
PASS  Player can kill an enemy (52 frames @ 60fps = ~0.87s)
PASS  Coins drop on kill (7 coins)

=== Loot / chests ===
PASS  Player picks up nearby coin
PASS  Chest opens + drops 6 coins on overlap

=== Descend ===
PASS  state → "descending" on stairs
PASS  descendLevel increments depth + carries totals
PASS  Player teleports to new spawn
PASS  Run advances through 4 depths

=== Safety ===
PASS  NaN / Infinity / negative / huge dt cannot corrupt coords
PASS  Player coords stay within world bounds
```

### Build

```
npx tsc -b        # exit 0
npx vite build    # exit 0 (Three.js + GLTFLoader chunked separately)
```

### HTTP serving

```
200  /dungeon3d         + /dungeon3d/run
200  All 5 source modules in dev server
200  All critical GLBs (template-floor, template-wall, stairs, gate,
     character-a, character-h) with correct URL-encoded paths
```

### What headless CANNOT verify (sandbox limit)

- WebGL renderer init on actual device
- GLTFLoader successfully parsing each GLB (only network-200 confirmed)
- Camera angle matches the Kenney promo look on a real screen
- Soft shadows / lighting tonality
- 60fps on iPad
- Animation clip names match Kenney's convention (player walk/idle anim picks)
- Touch joystick + attack button feel
- Wall-piece rotation values render correctly on the device

---

## Files changed

```
A  src/dungeon3d/engine.ts                ~320 lines
A  src/dungeon3d/modelCache.ts            ~120 lines
A  src/dungeon3d/store.ts                  ~70 lines
A  src/dungeon3d/pages/Dungeon3DHub.tsx   ~100 lines
A  src/dungeon3d/pages/Dungeon3DRun.tsx   ~580 lines
M  src/App.tsx                            (+ /dungeon3d, /dungeon3d/run lazy routes)
M  src/config/games.ts                    (+ Dungeon Crawler 3D entry, order 4)
M  package.json                           (1.11.0 → 1.11.1)
```

### Untouched
- The v1.11.0 2D Dungeon Crawler files (preserved alongside the new 3D version)
- All other games + shared infrastructure
- Three.js dep version (already at v0.184 — no upgrade needed)
