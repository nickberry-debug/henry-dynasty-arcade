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

## Phase 2 — Potions  ⏳ QUEUED (waiting for Nick "continue Monster Forge")

Per spec: ingredients → discoverable potions → modifiers applied to monsters
(stat boosts? color shifts? new accessory unlocks?). Schema sketch:
`henry-monster-forge-potions-v1` per profile, recipe table, brew UI.

## Phase 3 — Animation + Powers  ⏳ QUEUED

- Re-bind body GLB animation clips to the cloned skeleton (currently mixer
  is dropped because skinned meshes don't survive `.clone(true)` without
  `SkeletonUtils.clone` — see how `src/dungeon3d/modelCache.ts` does it).
- Per-monster unique power: choose from N abilities; show as a card.

## Phase 4 — Stats / Battles / Collection  ⏳ QUEUED

## Phase 5 — 20 features + polish  ⏳ QUEUED

---

To resume: say **"continue Monster Forge"** — Phase 2 (potions) is up next.
