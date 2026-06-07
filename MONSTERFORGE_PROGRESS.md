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

Phase 3 (animation) will need to either upgrade the bodies to a single
shared rig (the Quaternius "Universal Base Characters" pack — Patreon
download) OR keep the current bodies and animate only their own clips
(no attachments will animate with the rig).

## Phase 1 — Builder + 3D Preview  ✅ DONE

Files added under `src/monster-forge/`:
- `partsManifest.ts` — typed manifest loader + MonsterConfig/SavedMonster types
- `engine.ts` — GLB cache (Promise<Group>), procedural accessory builders
  (horns/wings/tail/spikes/eyes), `assembleMonster()`, color tint helper,
  profile-scoped save/load (`profileKey("henry-monster-forge-monsters-v1")`)
- `pages/MonsterForgeHub.tsx` — entry page (About, Create New, Your Lab list,
  Edit & Delete per saved monster)
- `pages/MonsterForgeBuilder.tsx` — Three.js canvas + bottom-sheet part picker
  (Body / Head / Horns / Wings / Tail / Spikes / Eyes / Color tabs), shuffle,
  name input, Save toast

Three.js wiring:
- WebGLRenderer with `shadowMap.enabled`, PCF soft shadows, DPR clamped to 2
- PerspectiveCamera 45° FOV with custom touch-friendly orbit (yaw/pitch/dist),
  pointer drag = rotate, wheel = zoom, 2-finger pinch = zoom
- 4 lights: ambient + warm key (cast shadows) + cool fill + rear rim
- Ground plane: purple disc + emissive ring
- Disposes geometries + materials on unmount

Hub + Routes:
- `App.tsx` lazy imports `MonsterForgeHub` + `MonsterForgeBuilder`
- Routes registered: `/monster-forge` (hub), `/monster-forge/build` (builder)
- `src/config/games.ts` tile added under category `create`, order 30, emoji 👹

Per-profile saves:
- Uses `profileKey("henry-monster-forge-monsters-v1")` from `src/profiles/store.ts`
- Each family member gets isolated Monster Lab automatically

Commits:
1. `ea9d1e8` — Monster Forge Phase 0: CC0 modular parts + manifest
2. `0e27b25` — Monster Forge Phase 1: Three.js builder UI + save
3. `6d11467` — hotfix: render canvas host on first mount (don't gate behind manifest)

Vercel: deploy `dpl_43jvNq5yWa24bvs4EeXpimmjXbia` READY at
https://henry-dynasty.vercel.app/monster-forge/build

Smoke-tested on iPhone-sized Chrome (414×896):
- Hub renders
- Builder mounts a 3D Squidle on first paint
- Body swap (alien → ghost) instant
- Color tint (ember) applies
- Save → toast → returns to hub list with the saved monster
- LocalStorage holds the SavedMonster with config + name + timestamps

**iPad device-confirm** still needed (Nick).

Known visual quirks (logged for Phase 2+):
- Some bodies (ghost) have their own baked-in eyes plus my procedural eyes
  on top of them → looks slightly off. Future fix: per-body eye-suppress flag
  in the manifest, OR rig-aware bone parenting.
- The Quaternius bodies aren't animated in Phase 1 (the clone() drops the
  AnimationMixer; intentional — Phase 3 will re-bind clips to the clone's
  skeleton).

## Phase 2 — Potions + Stat System + Crafting  ✅ DONE (2026-06-07)

Commit: `61a4f1d` — "Monster Forge Phase 2: potions + stat system + crafting"
Vercel deploy: `dpl_AUZtqdeD4T5n7aBSJN5YjWdiJ1rv` READY at
https://henry-dynasty.vercel.app/monster-forge/build

New files under `src/monster-forge/`:
- `data/potions.ts` — 32 base potions + 7 crafted potions across 6 categories
  (size, color/glow, elemental, mutation, stat boost, texture/skin), each with
  a declarative `PotionEffect` (scaleMul, tintHex, glowHex, aura, mutation,
  material mods, statDelta)
- `engine/stats.ts` — per-body StatBlock table (HP/ATK/DEF/SPD/MAG, hand-tuned
  for each of the 18 Quaternius bodies), `computeStats(body, potionIds)` with
  [1,30] clamp, `totalDelta`, `statTotal`, STAT_LABELS/COLORS/ORDER tables for
  the UI
- `engine/crafting.ts` — 14 recipe paths → 7 unique outputs, normalized as
  alphabetically-sorted [a,b] pairs so order doesn't matter. Discovered IDs
  persist per-profile in `henry-monster-forge-recipes-v1` localStorage.
- `engine/effects.ts` — `applyPotionsToMonster(am, ids)` — real Three.js
  visual effects: 11 elemental particle auras (each with per-frame update
  callback), procedural mutation geometry at body sockets (reuses Phase 1
  buildHorns/Wings/Spikes/Eyes/Tail), tint/glow/material mods, scale chain

Modified files:
- `engine.ts` — `loadSaved()` now normalizes loaded monsters (defaults
  `activePotions: []` and `stats: baseStatsFor(body)` for old saves, so
  Phase 1 monsters keep working untouched)
- `partsManifest.ts` — `SavedMonster` extended with `activePotions: string[]`
  and `stats: StatBlock`
- `pages/MonsterForgeBuilder.tsx`:
  - New POTIONS tab (9th in the tab strip)
  - Active-potion stack: floating row of icons at top-center of preview,
    tap an icon to remove it (max 5 active per kid-friendly cap)
  - Stats panel: 5 horizontal bars (HP/ATK/DEF/SPD/MAG) with color-coded
    delta indicators (green +N / red -N) and base stat shown in parens
  - Crafting bench: 2 slots + CRAFT button; opens a horizontal potion
    picker per slot; success → green "★ Discovered X!" banner;
    failure → grey "💨 Nothing happened — try another combination!"
  - Potion grid grouped by category, locked crafted potions show 🔒 with "???"
  - Per-frame aura update callbacks live on a ref, the render loop ticks
    them via THREE.Clock so particles orbit at consistent speed across
    monsters of different scales
- `pages/MonsterForgeHub.tsx`:
  - Each monster card now shows Power total, active-potion count,
    5-bar stat sparkline (HP/ATK/DEF/SPD/MAG), and an icon row of the
    monster's active potions
  - Phase 1 saves render fine (backward-compat via normalize())

Crafting recipes (canonical + alt paths land on same output):
- Fire 🔥 + Ice ❄️ → **Steam Burst ♨️** (rare)
- Grow 🌱 + Vigor ❤️ → **Titan's Brew 🏔️** (legendary)
- Shade 🌑 + Toxic ☣️ → **Plague Mist ☠️** (rare)
- Spark ⚡ + Wind 💨 → **Tempest Surge 🌩️** (rare)
- Crystal 💎 + Golden Glow ✨ → **Prism Bath 🌈** (legendary)
- Metallic 🔩 + Fury 🗡️ → **Warforged ⚔️** (rare)
- Extra Horns 🐂 + Spike Coat 🦔 → **Demon Aspect 😈** (rare mutation)
+ 7 alt paths (Fire+Aqua → Steam, Ice+Wind → Tempest, etc.)

Smoke-tested on iPhone-sized Chrome (414×896, Vercel prod):
- Builder POTIONS tab shows stats panel + crafting bench + categorized grid
- Fire Vial → orange flame particles orbit the monster, body tints orange
- Grow Juice → monster doubles in scale, particles scale with it
- Horn Tonic (mutation) → spawns at top socket, active-stack icon appears
- Stats panel reflects every potion (HP 5→7, ATK 6→11, MAG 9→10)
- Crafting bench: Fire + Ice → "★ DISCOVERED STEAM BURST!" + recipes 1/7
- Save → returns to Hub showing Power 40 · 3 potions, sparkline + icons

**iPad device-confirm** still needed (Nick).

Visual effects sampling (subjective):
- **Strong**: Fire, Spark, Tempest, Toxic, Steam (particles orbit + bob,
  emissive material pops against the dark stage)
- **Decent**: Ice, Aqua, Wind (more subtle on already-cool body tints —
  works best on warm bodies)
- **Weakest**: Earth (rock chunks barely visible at small monster scale;
  could use bigger geometry + slower orbit). Shade also reads as just a
  purple swirl; will look much better once we add per-particle alpha fade.

Mutation visuals reuse Phase 1 builders so they match the existing horn/
spike/wing aesthetic. extra_eyes is the most fun — three little floating
eyes pop out in front of the head. extra_arms placement depends on body
width which works fine for humanoids but looks awkward on blobs (could
gate by body archetype in the future).

## Phase 3 — Animation + Powers  ⏳ QUEUED

- Re-bind body GLB animation clips to the cloned skeleton (currently mixer
  is dropped because skinned meshes don't survive `.clone(true)` without
  `SkeletonUtils.clone` — see how `src/dungeon3d/modelCache.ts` does it).
- Per-monster unique power: choose from N abilities; show as a card.
- Potions could grant a derived power (e.g. Fire potion → Flame Breath
  ability) that becomes the monster's "signature move."

## Phase 4 — Stats / Battles / Collection  ⏳ QUEUED

Stats are already in place — Phase 4 will use them for actual battles.

## Phase 5 — 20 features + polish  ⏳ QUEUED

---

To resume: say **"continue Monster Forge"** — Phase 3 (animation + powers)
is up next.
