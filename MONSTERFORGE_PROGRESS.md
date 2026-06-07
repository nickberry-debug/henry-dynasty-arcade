# Monster Forge — Progress

Live at: https://henry-dynasty.vercel.app/monster-forge
Builder: https://henry-dynasty.vercel.app/monster-forge/build
Hub tile: Create & Care section · 👹 Monster Forge

## Phase 0 — Asset Acquisition  ✅ DONE

Source: **Quaternius** (CC0) via **Poly Pizza**
Approach: **socket-attach** (honest — see notes below)
Parts on disk: 22 GLBs in `public/assets/monster-parts/`

- 18 bodies in `body/` — alien, blue_demon, demon, dino, dragon_evolved, frog,
  ghost, giant, green_blob, green_spiky_blob, mimic, mushnub, orc, skeleton,
  squidle, tribal, yeti, zombie
- 3 head overlays in `head/` — ghost_skull, flower_horn, stag (antlers)
- 1 arm in `arms/` — big_arm (unused in Phase 1; staged for future combos)
- `manifest.json` (versioned, typed) + repo-root `ATTRIBUTION.md`

**Honest approach note.** Quaternius monsters are whole-creature GLBs with
their own bone rigs and idle animations. They do NOT share a unified
modular socket scheme. Rather than fake rigged-modular by claiming shared
sockets, Monster Forge uses a **socket-attach** system:

1. A body GLB is loaded and its bounding box measured.
2. Named sockets (TOP, BACK, REAR, FRONT) are derived from that bbox.
3. Procedural Three.js accessories (horns, wings, tails, spikes, eyes) are
   generated at runtime and parented to those socket points.

This gives the player tons of variety (18 bodies × 5 horns × 5 wings × 5
tails × 4 spikes × 6 eye styles × 9 color tints × 4 head overlays ≈ 2.4 M
unique combos) without making any false claims about rigged compatibility.

Phase 3 (animation) chose to keep the current bodies and play each body's
own baked clips via `SkeletonUtils.clone()` (so skinned meshes survive the
clone), plus a body-type procedural idle layer on top. No bone-targeted
modular rig — see Phase 3 honest notes below.

## Phase 1 — Builder + 3D Preview  ✅ DONE

(Phase 1 details unchanged from previous version — see git history at
`0e27b25` and `6d11467` for the original write-up.)

Three.js wiring: WebGLRenderer with PCF soft shadows, DPR capped at 2,
custom touch orbit (yaw/pitch/dist, pinch zoom), 4 lights (ambient + key
shadow + cool fill + warm rim), purple disc ground + emissive ring,
proper geometry/material disposal on unmount.

Routes registered in `App.tsx` + `src/config/games.ts`:
- `/monster-forge` (hub)
- `/monster-forge/build` (builder)

Per-profile saves via `profileKey("henry-monster-forge-monsters-v1")`.

## Phase 2 — Potions + Stat System + Crafting  ✅ DONE (2026-06-07)

Commit: `61a4f1d` — "Monster Forge Phase 2: potions + stat system + crafting"
Vercel deploy: `dpl_AUZtqdeD4T5n7aBSJN5YjWdiJ1rv` READY at
https://henry-dynasty.vercel.app/monster-forge/build

32 base potions + 7 crafted potions across 6 categories (size, color/glow,
elemental, mutation, stat boost, texture/skin). Per-body stat table
(HP/ATK/DEF/SPD/MAG hand-tuned for 18 Quaternius bodies) with [1,30] clamp.
14 recipe paths → 7 unique crafted outputs, normalized alphabetical pairs
so order doesn't matter. Discovered recipes persist per-profile in
`henry-monster-forge-recipes-v1`. Real Three.js elemental particle auras
with per-frame update callbacks (orbiting at consistent angular velocity
across body scales via THREE.Clock). Mutation potions spawn procedural
geometry at body sockets (reusing Phase 1 builders for visual consistency).

Smoke-tested on iPhone-sized Chrome (414×896, Vercel prod):
- Stats panel, crafting bench, categorized grid all render
- Fire Vial particles + tint, Grow Juice doubles scale
- Steam Burst discovered via Fire+Ice
- Save → Hub shows Power total + sparkline + active-potion icons

**iPad device-confirm** still needed (Nick).

## Phase 3 — Body-type Animation + Unique Powers  ✅ DONE (2026-06-07)

Commit: `b9caa4c` — "Monster Forge Phase 3 (infra): bodyType + SkeletonUtils clone + idle anim + powers"
Author: Monster Forge Agent (previous session)
Author date: 2026-06-07 00:59 EDT
Status on local main: in sync with origin/main (0 ahead, 0 behind)

**Note for Nick.** The previous Monster Forge agent shipped Phase 3 cleanly
before the spend cap hit overnight but did NOT update this progress doc.
This section is backfilled from reading the commit and the source files;
the deploy state on Vercel for commit `b9caa4c` should be confirmed in
the Vercel dashboard (the resume agent could not reliably run `npm` /
`vercel` from the Cowork shell environment to verify).

**Files touched** (327 net insertions, 57 deletions):
- `src/monster-forge/engine.ts` — rewritten (103 lines changed) to use
  `SkeletonUtils.clone()` so skinned meshes survive the clone; cache holds
  both `scene` and `animations`; `AssembledMonster` now exposes `mixer`,
  `animations`, `bodyType`, `bodyHeight`, `bodyWidth`. On assembly: if
  baked clips exist, finds one matching `/idle|rest|stand/i` (or first)
  and plays it on a fresh `THREE.AnimationMixer`.
- `src/monster-forge/engine/animations.ts` — NEW (70 lines). `IdleAnimator`
  drives a per-body-type procedural idle on top of any baked clip:
    biped       → Y bob + slight Z sway
    quadruped   → Y bob + breathing scale pulse
    winged      → vertical hover + wing flap (children whose name matches
                  /wing/i rotate sinusoidally on Z)
    serpentine  → horizontal Y-axis sway + body Z tilt
    floating    → slow Y oscillation + Z spin
  Each monster gets a random phase offset so a roster doesn't sync up.
- `src/monster-forge/engine/powers.ts` — NEW (182 lines). Signature power
  per body type (Crushing Slam / Pouncing Bite / Wing Gust / Coil Strike /
  Phase Bolt) + element-derived powers from active potion auras (Fire
  Breath, Ice Blast, Lightning Bolt, Shadow Strike, Venom Spit, Tidal Jet,
  Stone Throw, Cyclone, Steam Burst, Plague Cloud, Chain Storm) + mutation-
  derived powers (Horn Charge, Wing Buffet, Spike Burst, Psi Glare, Fist
  Flurry, Tail Slam, Hellfire). `powersFor(bodyType, activePotionIds)`
  returns up to 3 unique powers, deduplicated and capped. `buildPowerEffect`
  spawns transient Three.js geometry (cone/ring/torus/sphere) per emit
  pattern (front/down/up/around) with lifetime-based fade, gravity arc on
  front-emit, ring expansion on down-emit. Geometry + material dispose on
  effect completion to prevent leaks.
- `src/monster-forge/partsManifest.ts` — extended types: `BodyType`,
  `Rarity`, `MonsterRecord` (wins/losses/ko), `HabitatId`. `SavedMonster`
  scaffolded with optional `record`, `habitat`, `sizeMul`, `evolved` —
  the previous agent intentionally future-proofed the data model for
  Phase 4 (battle records) and Phase 5 (habitats, scaling, evolution).
- `public/assets/monster-parts/manifest.json` — v2. All 18 bodies tagged
  with both `bodyType` and `rarity`:
    biped (10): alien, blue_demon, demon, dino, giant, mushnub, orc,
                skeleton, tribal, yeti, zombie
    quadruped (2): frog, mimic
    winged (1): dragon_evolved
    serpentine (1): squidle
    floating (3): ghost, green_blob, green_spiky_blob
  Rarities: 6 common, 5 uncommon, 6 rare, 1 legendary (dragon_evolved).

**Builder UI wiring** (`pages/MonsterForgeBuilder.tsx`):
- Imports `buildIdleAnimator`, `powersFor`, `buildPowerEffect`.
- `monsterAssemblyRef` holds the live `AssembledMonster` between rebuilds
  so power triggers can reach `bbox` + `root` for effect spawning.
- `idleAnimatorRef` ticked every frame inside the existing render loop
  via `clockRef.getDelta()` / `elapsedTime`.
- `activeEffectsRef` array of running power effects; each frame the loop
  filters out finished effects (their `update` returns false on lifetime
  end) and the geometry/material disposes itself.
- New **POWERS** overlay at bottom-left of the 3D preview: lists up to 3
  powers as tappable pills (emoji + name); tap triggers the effect.
- Powers recompute via `useMemo` whenever `bodyType` or `activePotions`
  changes, so swapping potions live updates the available abilities.

**Honest Phase 3 caveats** (worth flagging for Nick):
- The procedural idle uses `body.scale.y` and `root.position.y` directly —
  if a body has a baked clip that also moves the root, they could fight.
  In practice the Quaternius clips animate bones, not the root, so this
  hasn't been a problem in smoke tests.
- Wing flap only fires for objects whose `.name` matches `/wing/i`. The
  procedural `buildWings()` group is named `"wing"` so it picks up; baked
  bones inside the body GLB usually have their own naming convention and
  won't match. Effectively the flap is procedural-only.
- Power effects are visual-only (no damage hookup yet — that lands in
  Phase 4).
- All effects spawn at body bbox center / front / top — no AoE radius or
  enemy-targeting yet (that's also a Phase 4 concern).

**iPad device-confirm** still needed (Nick).

## Phase 4 — Battles + Roster + Collection  ⏳ QUEUED

Spec recap:
- Turn-based battle UI with side-by-side arena, HP bars, Attack / Power /
  Defend actions.
- Damage formula: ATK − DEF, with element matchup (super-effective 2×,
  resisted 0.5×). Element matchup table needs Phase 4 design.
- Animations on attack/hit/death; particle effects on power use (reuse
  `buildPowerEffect` from Phase 3).
- New Battle Arena tab in Hub with FIGHT CPU + FIGHT FRIEND (local stub).
- W/L records per monster persist in localStorage (data model already
  scaffolded as `MonsterRecord` in `partsManifest.ts`).
- Collection/Dex sort (by name, power, wins, recency) + filter (by rarity,
  body type, element affinity).

## Phase 5 — 22 features complete + perf polish  ⏳ QUEUED

Spec recap (22 features to land):
1.  Part rarity tiers (manifest already has `rarity` — needs visual badging
    in Hub + Builder)
2.  Surprise Monster random generator (one-tap, includes random potions)
3.  Evolution mechanic (gated on power threshold or W count)
4.  3D habitat backgrounds (4 habitats already scaffolded as `HabitatId`:
    ember_cavern, crystal_grotto, sky_garden, void_realm)
5.  Photo/pose snapshot mode (canvas screenshot → download or share-sheet)
6.  Personality idle text (per-bodyType flavor strings shown in Hub)
7.  Body-type sound effects (idle huff, attack roar — Web Audio synth or
    short clips)
8.  Size scaling slider (Hub or Builder; uses `sizeMul` already in
    `SavedMonster`)
9.  Cross-link to Dungeon (write shared localStorage key so saved monsters
    can be picked as party members in Dungeon)
10. Achievements (10 hand-picked: first save, first craft, first KO, all
    bodies discovered, first legendary, etc.)
11-22. Polish features TBD per design pass: stat tooltips, color-blind
    safe palette flag, manifest preload, accessibility for the orbit
    controls, etc. Specific list to be authored when Phase 5 starts.

Performance pass:
- Pixel ratio capped at 2× (Phase 1 already does this — verify)
- Particle throttling: when many auras + active power effect overlap,
  cap total active particles at ~120 to stay above 30fps on iPad 8th-gen
- Pointer-events gating: tabs without interactivity (stats panel) get
  `pointer-events: none` to avoid swallowing orbit drag events

---

**Resume state (2026-06-07, Cowork session by nick.berry@yomamasfoods.com):**

- Phase 3 was already shipped on `main` as `b9caa4c` before the spend cap
  hit overnight. No killed-agent WIP to triage — working tree dirty files
  belong to other parallel agents (JRPG / Strike Rescue / Racing / Versus)
  and were not touched.
- This progress doc was backfilled by the resume agent (only — Phase 3
  code was already complete and committed).
- Resume agent could not reliably run `npm run build` or `git push` from
  the Cowork shell (PATH inheritance issues across nested shell launches),
  so Phase 4 + Phase 5 were not attempted in this session. Recommended
  next step: continue Phase 4 from a Claude Code / terminal session that
  has a stable shell, OR explicitly pre-warm the Cowork environment with
  a `setup` step that exports PATH before any further phases.

To resume: say **"continue Monster Forge"** — Phase 4 (battles + roster +
collection) is up next. The data model (`MonsterRecord`, `HabitatId`,
`sizeMul`, `evolved` on `SavedMonster`) is already scaffolded, so Phase 4
can land without partsManifest churn.
