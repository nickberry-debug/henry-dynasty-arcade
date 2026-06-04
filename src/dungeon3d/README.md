# Dungeon Crawler 3D

A Three.js-based 3D dungeon crawler combining Minecraft Dungeons visuals with Diablo-style combat and progression.

## Project Structure

- **engine/** — Pure logic modules (no React)
  - `core.ts` — Three.js scene, camera, lighting
  - `generator.ts` — Procedural dungeon layout generation (seeded RNG)
  - `character.ts` — Player character, movement, facing direction (fixes backward-facing bug)
  - `fogofwar.ts` — Fog-of-war: explore to reveal rooms
  
- **state/** — Game state & persistence
  - `gameState.ts` — Zustand store for heroes, runs, game events
  - `db.ts` — Dexie database (heroes, run history)

- **pages/** — React components
  - `Dungeon3D.tsx` — Main game view (Phase 0 test component)

- **assets/** — Kenney GLBs, itch.io sprites (Phase 1+)

## Phase 0 — Core Polish & Performance ✅

**Done:**
- Camera: pulled back for better view
- Fog-of-war: unexplored rooms dark, reveal as explored
- Character orientation: now faces movement direction (backward bug fixed)
- Wall rotations: correctly oriented inward
- Dungeon generation: 4-8 rooms per floor, seeded for reproducibility
- 60fps animation loop

**Device confirmation required:** iPad WebGL test before Phase 1.

## Phases (Roadmap)

1. **Phase 0** ✅ — Core polish & performance
2. **Phase 1** — Content expansion (varied GLBs, distinct enemies, themed floors)
3. **Phase 2** — Combat depth (attacks, AI, defense, juice)
4. **Phase 3** — Hero classes (warrior/ranger/mage)
5. **Phase 4** — Loot & gear (drops, stats, inventory)
6. **Phase 5** — Progression & meta (XP, leveling, runs)
7. **Phase 6** — Bosses (encounters, mechanics)
8. **Phase 7** — Final polish (minimap, audio, UI)

## Development Notes

- **No Kenney assets wired yet** — Phase 1 will import the 39 dungeon GLBs + 18 character models
- **Animation clips** — placeholder for now; Phase 2 will wire idle/walk/attack states
- **Mobile-first** — test on iPad; performance target 60fps (use InstancedMesh for scaled dungeons)
- **Deterministic generation** — seeded RNG allows replay/verification of specific dungeons

## Running Phase 0

```bash
cd henry-dynasty
npm install  # if needed
npm run dev  # starts Vite dev server
# Navigate to /dungeon3d in the Landing page
```

Then on device: check camera angle, fog-of-war reveal, character rotation, wall orientation.
