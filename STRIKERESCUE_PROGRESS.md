# Strike Rescue — Progress

Top-down vertical-scroll vehicle rescue shooter for Berry Kids' Arcade.
Jackal (NES) **genre-inspired** — no Halo/Master Chief/Warthog IP, no Jackal IP.

## Hard rules

- Original armored sci-fi soldier driving an original rugged military buggy.
- CC0 / clearly-permissive assets only — see `/ATTRIBUTION.md`.
- Vertical forced-scroll, player centered, no backtracking.
- Kid-friendly: respawn at checkpoints, no gore.

## Phase table

| Phase | Status | What ships |
|---|---|---|
| 0 — Asset acquisition | ✅ DONE | manifest.json, README, ATTRIBUTION addendum. Procedural sprites + Web Audio synth (web fetches blocked in build env; Kenney upgrade path documented). |
| 1 — Core gameplay loop | ✅ DONE | Vertical forced-scroll camera, top-down buggy drive (joystick + WASD), machine gun (hold to fire), grenade (tap, arcing), 3 enemy types (foot soldier, turret, jeep), HP + respawn at checkpoints, hit feedback + explosions + screen shake, one test level (~2000px). |
| 2 — POW rescue + extraction + upgrades | ✅ DONE | POW pickups scattered through level, weapon upgrade drops (rapid / spread / dual / health), extraction chopper LZ at top of level — drive POWs into LZ to extract for bonus score. |
| 3 — 4 levels + bosses | ✅ DONE | Jungle / Base / River-Bridge / Fortress. Boss at end of each: Tank, Attack Chopper, Bunker, Mega-Tank. Level select on hub, post-level summary. |
| 4 — Polish + same-device 2P co-op | ✅ DONE | Same-device 2P (shared screen, second buggy on IJKL+/), pause menu, settings (SFX volume, difficulty), mini-map, vehicle skins, score persistence (localStorage), victory + game-over screens, on-screen P1/P2 HP. |
| 5 — Remote co-op (deferred) | ⏸ DEFERRED | Device-to-device Firebase co-op was flagged as overnight-risky and deferred per Nick's directive. Same-device 2P ships in Phase 4. |

## Controls

- **P1 keyboard:** WASD or arrows to drive, Space to fire, G to grenade, P/Esc to pause.
- **P2 keyboard:** IJKL to drive, `.` (period) to fire, `/` (slash) to grenade.
- **Touch:** lower-left joystick + lower-right FIRE/GRENADE for P1. In 2P, upper-right joystick + upper-left FIRE/GRENADE for P2.

## File layout

```
public/assets/strikerescue/
  manifest.json
  README.md

src/strike-rescue/
  sprites.ts                — procedural canvas sprite renderers
  engine/
    scroll.ts               — forced vertical-scroll camera (DPR-safe)
    vehicle.ts              — top-down vehicle physics (analog + 8-way)
    weapons.ts              — bullets, grenades, weapon upgrades
    enemies.ts              — foot soldier, turret, jeep, boss AI
    health.ts               — HP + checkpoints + damage + respawn
    audio.ts                — Web Audio synth (SFX + engine rumble + boss loop)
    level.ts                — 4 level definitions + boss data
    pickups.ts              — POW + upgrade pickups, chopper extraction
    persistence.ts          — high score / best level / settings (localStorage)
  pages/
    StrikeRescueHub.tsx     — entry / level select / settings
    StrikeRescueMatch.tsx   — match canvas + HUD + game loop
```

## Verification

Each phase verified by:
1. `npm run build` clean (no new TS errors).
2. Push to main + Vercel deploy ready.
3. Smoke-test via Chrome MCP at 390×844 (iPhone): load → start → drive → shoot → take damage → respawn → reach next checkpoint.

## Known limitations / honest flags

- ⚠️ **No CC0 image bytes bundled** — all sprites are procedural canvas drawings. The Kenney drop-in path is fully documented in `public/assets/strikerescue/README.md`; swap takes ~30 minutes of `drawImage` replacements.
- ⚠️ **No CC0 audio bytes bundled** — all SFX synthesized via Web Audio. Same drop-in path documented.
- ⏸ **Remote co-op** is Phase 5 (deferred). Same-device 2P ships in Phase 4 per Nick's overnight directive.
- The hero is intentionally drawn as a generic armored visor-helmet figure (gray plate, blue accent) — **explicitly not Master Chief** (no green armor, no chest emblem, no Mjolnir visor pattern). Likewise the buggy is olive-drab with exposed roll-cage and twin-MG turret — **explicitly not a Warthog** (different proportions, no Halo-blue accents, no UNSC markings).
