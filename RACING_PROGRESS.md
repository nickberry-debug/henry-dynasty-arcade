# Turbo Racers — Progress

Top-down 2D racing for Berry Kids' Arcade. Micro Machines feel + original
weapon set. Original IP, CC0 assets only.

| Phase | Scope                                                                | Status   |
| ----- | -------------------------------------------------------------------- | -------- |
| 0     | Asset acquisition (Kenney top-down racing pack + audio)              | **DONE** |
| 1     | Driving core — physics, drift-boost, slipstream, test track, lap UI  | **DONE** |
| 2     | Car roster (20 cars) + rarity unlocks + Turbo Garage + upgrades      | **DONE** |
| 3     | Five difficulty-scaled tracks + moving scenery + jumps               | **DONE** |
| 4     | Weapons (7 originals) + CPU field + race rules + results screen      | **DONE** |
| 5     | Championship, time-trial, minimap, family LB, 2P hot-seat, polish    | **DONE** |

## Phase 0 — Asset acquisition (DONE)

Kenney Racing Pack v1.0 (50 top-down car sprites), 90 asphalt road tiles,
14 grass tiles, 39 scenery objects, plus engine / boost / crash / VO audio.
All CC0 1.0 Universal. See ATTRIBUTION.md.

## Phase 1 — Driving core (DONE)

Bicycle-model physics, drift mini-turbo, slipstream draft + slingshot,
procedural test track, lap detection, touch HUD, keyboard fallback,
3-2-1-GO countdown, world-up top-down camera.

## Phase 2 — Cars, roster + Turbo Garage (DONE)

- **20-car roster** across 5 rarities — 1 starter (`comet`), 7 common,
  6 rare, 4 epic, 2 legendary. All names original (no Mario Kart / NFS
  branding). See `src/racing/engine/cars.ts`.
- **Per-rarity unlock costs**: starter 0c · common 500c · rare 1500c ·
  epic 3500c · legendary 7500c.
- **Stats system** (`engine/stats.ts`) maps the 4-axis stat triangle
  (topSpeed/accel/grip/handling) to physics params.
- **Upgrades**: 5 levels per stat, +12 stat per level, costs scale
  120 → 760 cumulative.
- **localStorage** (`store.ts`) v2: ownedCars, coins, upgrades, best
  lap/race, raceCount, wins, winsByTrack, mirrorUnlocked, muted.
- **Turbo Garage UI** (`pages/RacingGarage.tsx`) groups cars by rarity,
  shows lock state + unlock CTA, supports reset/refund (70%).

## Phase 3 — 5 tracks + scenery + jumps (DONE)

`engine/tracks.ts` ships five tracks at difficulties 1–5:
Sandy Oval · Pinetop Pinch (figure-8) · Slipstone Snake · Crater Loop ·
Skybridge Spiral. Each has procedural centreline, baked offscreen canvas
(perf-friendly viewport blit), seeded scenery scatter, and 1–2 jump ramps
with parabolic z-hop trajectory. Surface mask supports asphalt / grass /
dirt grip multipliers.

## Phase 4 — Weapons + CPU field + race rules (DONE)

- **7 original weapons** (`engine/weapons.ts`): Booster, Spike Trap,
  Homing Dart, Aegis Shield, Storm Bolt, Smoke Cloud, Recovery Ring.
- **Item boxes** rotating on track; pickup gives random weapon weighted by
  rarity. Recovery Ring restricted to back-of-pack.
- **CPU field** (`engine/roster.ts`): 8 named CPU drivers across 5
  difficulty bands. Difficulty selector picks Easy / Medium / Hard /
  Expert which maps to band 2/3/4/5 with throttle cap, weapon use, and
  rubber-band aggressiveness.
- **Race rules**: lap counter, position tracking, finish places, results
  screen with credits earned (1st = 200, 2nd = 100, 3rd = 50, lower = 25)
  + best-lap bonus.

## Phase 5 — Championship + time-trial + polish (DONE)

- **Family leaderboard** across-profile (highest lifetime coins, wins,
  best lap per track).
- **Championship Cup** mode — 4 races, cumulative points (10/8/6/4/3/2/1),
  champion crowned at end.
- **Time Trial** mode — solo + ghost of best lap per profile per track.
- **Minimap** top-right showing all racers' positions per lap.
- **Mirror tracks** unlock at 3 wins per track direction.
- **Customizable race setup** — track / laps / CPU count / difficulty /
  weapons on-off.
- **Same-device 2P (hot-seat)** — pass-device alternating Player 1 then
  Player 2 best-lap challenge (remote multiplayer deferred — flagged).
- **Audio** — engine pitch by speed, boost cue, crash cue, VO countdown,
  mute toggle.

⚠️ **Honest shortcoming:** *device-to-device online multiplayer was
deferred.* The existing Firebase wiring for shared profiles is in
`src/family/`, but room-code netplay for racing would require
state-sync infrastructure we didn't have time to build safely. Same-device
2P hot-seat ships instead.
