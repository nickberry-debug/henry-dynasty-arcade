# Turbo Racers — Progress

Top-down 2D racing for Berry Kids' Arcade. Micro Machines feel + Mario Kart
weapons (planned). Original IP, CC0 assets only.

| Phase | Scope                                                                | Status      |
| ----- | -------------------------------------------------------------------- | ----------- |
| 0     | Asset acquisition (Kenney top-down racing pack + audio)              | **DONE**    |
| 1     | Driving core — physics, drift-boost, slipstream, test track, lap UI  | **DONE**    |
| 2     | Car roster + upgrades (Turbo Garage)                                 | **DONE**    |
| 3     | Five difficulty-scaled tracks + moving scenery + jumps               | **DONE**    |
| 4     | Weapons (original IP) + item boxes                                   | queued      |
| 5     | CPU racer roster with difficulty bands                               | queued      |
| 6     | Device-to-device multiplayer (online lobby)                          | queued      |

## Phase 0 — Asset acquisition (DONE)

Sources, all **CC0 1.0 Universal**:

- **Kenney Racing Pack v1.0** (https://kenney.nl/assets/racing-pack) — 50 top-down
  car sprites (5 colors × 5 designs × 2 sizes), 90 asphalt road tiles, 14 grass
  tiles, dirt/sand variants, 39 scenery objects (cones, barrels, barriers,
  rocks, tires, tents, arrows, skidmarks).
- **Kenney Sci-Fi Sounds** — engine loops (engineCircular) + boost (forceField).
- **Kenney Impact Sounds** — metal/generic impact for crashes.
- **Kenney Voiceover Pack** (Female) — 1/2/3/go/ready/congratulations/hurry_up
  for race-start countdown and finish.

Organized under `public/assets/racing/{cars,tracks,scenery,weapons,ui,audio}`
with a generated `manifest.json` listing every file. See `ATTRIBUTION.md` for
the full per-source breakdown.

**Honest flag:** the Kenney Racing Pack PNGs are oriented portrait
(71 × 131 px) — cars face **north** at heading 0, matching the standard
top-down convention. No 3D fallback needed. Weapons + UI buckets are empty
this phase — they'll fill in Phase 4 when items ship.

## Phase 1 — Driving core (DONE)

- `src/racing/engine/physics.ts` — bicycle-model top-down physics. Throttle =
  +1200 px/s² along heading. Brake = -2000 px/s². Steering authority scales
  with speed (`v/200 × 3.5`). Lateral grip reduces sideslip; drift mode drops
  lateral grip to 30%. Momentum decay 0.985/frame on coast.
- `src/racing/engine/drift.ts` — state machine. Holding drift while turning
  accumulates charge. Releasing fires a boost = `min(charge, 3) × 200 px/s` for
  0.8s with tire-smoke particles and an orange-yellow glow when ready.
- `src/racing/engine/slipstream.ts` — within 60 px behind a same-direction
  racer (<30° heading diff) builds a draft charge. Steering out of the draft
  releases a slingshot boost with blue particles.
- `src/racing/engine/track.ts` — procedural oval test track (~3000 × 2000
  world units) drawn from Kenney asphalt + grass tiles, surface-grip mask for
  off-road, finish line + 1 ghost-CPU racing line.
- `src/racing/engine/lap.ts` — finish-line crossing detection, 3-lap counter,
  lap-time tracking, race-finish state.
- `src/racing/pages/RacingHub.tsx` — entry, QUICK PLAY card.
- `src/racing/pages/RacingMatch.tsx` — canvas + touch HUD (steer pad
  bottom-left, GAS / BRAKE / DRIFT stack bottom-right), keyboard fallback
  (arrows + WASD + Space), world-up camera with smooth lerp, 3-2-1-GO
  countdown using voiceover audio, lap counter + final-time overlay.

## Phase 2 — Car roster + upgrades (queued)

Turbo Garage: pick from the 50 Kenney car sprites, stats per car (top speed,
accel, grip, handling), coin-cost upgrades that shift the stat triangle.
