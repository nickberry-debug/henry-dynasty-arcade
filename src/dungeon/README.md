# Dungeon Crawler

Minecraft Dungeons + Diablo hybrid. Pick a hero, dive 10 floors, fight enemies,
loot gear, kill the boss, save the realm.

## Structure
- `types.ts` — shared types
- `rng.ts` — seeded random
- `state/` — Zustand store + Dexie persistence
- `engine/` — generator, combat, loot, AI (pure logic, no React)
- `content/` — item DB, enemy DB, abilities, quest beats
- `components/` — reusable UI (HUD, sprites, tiles)
- `pages/` — top-level routes (Hub, Select, Run, Shop, GameOver)

## Routes
- `/dungeon` — Hub: choose hero / continue run
- `/dungeon/select` — Hero select / create
- `/dungeon/run` — Active dungeon view (canvas + HUD)
- `/dungeon/shop` — Merchant between floors
- `/dungeon/end` — Victory / defeat screen

## Persistence
Dexie tables `dungeonHeroes` and `dungeonRuns` (DB v6).
Save state writes every floor transition, after combat, after shop visit.
