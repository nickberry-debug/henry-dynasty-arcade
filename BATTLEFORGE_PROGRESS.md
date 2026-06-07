# Battle Forge — June 2026 sprite + zoom + select revamp

Shipped commit: `91531e9` — *Battle Forge: distinct sprites + user zoom + redone character select*
Deploy: https://henry-dynasty.vercel.app/battleforge

## What changed

Three fixes for Beckett's Battle Forge, all art-mapping / camera / UI —
combat logic, hit detection, damage formulas, AI, and win/lose
conditions were NOT touched.

### Item 1 — distinct fighters matched to identities

Fighters used to look interchangeable because the renderer drew every
unit from one ~6-pixel-wide humanoid template with only a palette
swap. Replaced with luizmelo PNG sprites loaded from
`/public/assets/luizmelo/`, with per-fighter color tinting + size
scaling on top.

New file: `src/battleforge/luizmeloSprites.ts` — pack loader, frame
slicer, tinter, cache.

Modified: `src/battleforge/spriteFactory.ts` — `getSpriteSheet()` now
returns the luizmelo sheet when its pack has loaded; falls back to the
existing procedural pixel-art if assets aren't loaded yet.

#### Fighter → sprite pack mapping

The Battle Forge roster is ~385 fighters auto-classified by the
existing `archetypeFor()` heuristic into 5 archetypes. Each archetype
maps to one luizmelo pack:

| Archetype | luizmelo pack | Source frames | Resemblance reasoning |
|---|---|---|---|
| swordsman | `martial-hero` | 200×200 | Humanoid with sword + shield — natural match for melee humanoids. Used by every `melee` fighter not classified as cavalry/monster (Achilles, Thor, Joan of Arc, Lancelot, Mulan, etc.). |
| archer | `skeleton` | 150×150 | Undead humanoid walker; we have no bow-pack — skeleton's lean silhouette + slim weapon reads "archer" in iso view. The existing projectile-VFX layer handles the actual arrow shot. |
| mage | `flying-eye` | 150×150 | Floating arcane creature → unmistakably magical caster. Used for wizards/witches/clerics/cosmic. |
| monster (tiny/small/medium) | `goblin` | 150×150 | Stocky green melee creature; reads "monster" with claws + weapon. |
| monster (large/huge/colossal) | `mushroom` | 150×150 | Bulkier silhouette than goblin; with the renderer's `sizeMul` of 1.6× for huge and 2.0× for colossal, this becomes the kaiju silhouette (T-Rex, Elephant, Blue Whale). |
| cavalry | `mushroom` | 150×150 | ⚠️ **Flagged** — no horse-mounted luizmelo pack exists. Mushroom stands in (low-slung, four-direction creature). See "Unmet scope" below. |

Per-fighter distinctness within a shared pack comes from three layers:

1. **Signature-color tint** — each `CharacterDef.color` is applied as a
   ~34% `source-atop` color wash over the visible sprite pixels
   (`bakeFrame()` in `luizmeloSprites.ts`). Thor's blue and Boudicca's
   orange now read distinct even though both use the martial-hero
   sprite.
2. **Size scaling** — the renderer's existing per-size `sizeMul`
   (tiny 0.6× → colossal 2.0×) is preserved and stacks on top of the
   pack's `fitScale`. A "Hummingbird" still draws at 60% of a "Thor"
   even though both ranged fighters might use the same sprite.
3. **Power-effect color** — the special-VFX layer (`AbilityVfxType`)
   was untouched but now reads against a tinted sprite background;
   lightning/fire/frost/laser auras visually link to the fighter's
   signature color.

Animation states wired: idle (frame 0), walk (4 frames evenly
distributed from source `Run.png`/`Walk.png`), attack (3 frames from
`Attack.png`/`Attack1.png`), death (last frame from `Death.png`).
Facings: NE/SE use the canonical right-facing pose; SW/NW are
horizontal flips. Sheets are cached by `(pack, team, accent)` so the
per-frame tint cost is paid once.

Loading is async with a synchronous fallback: `getSpriteSheet()` keeps
returning the procedural pixel-art sheet until the PNGs are loaded,
then automatically switches to luizmelo on the next call (the renderer
calls `getSpriteSheet` every frame). Asset preload kicks off on
module import — by the time the player finishes character-select +
forging, packs are ready.

### Item 2 — dynamic user-controlled zoom + pan

Added to `src/battleforge/BattleCanvas.tsx`:

- **Pinch-to-zoom** — two-finger touchmove computes a ratio against
  the start distance, multiplies `userZoomRef`. Clamped 0.5× — 2.5×.
- **Mouse wheel** — desktop trackpad/wheel uses `Math.pow(1.0015,
  -deltaY)` per tick for smooth zoom in/out.
- **On-screen buttons** — `+` / `−` / readout (`100%`) / `RESET`
  overlay in the top-right of the canvas. 44×44 touch targets with
  rounded gold borders. Reset appears only when zoom or pan ≠ default.
- **Drag-pan** — single-finger touchmove pans the camera (in world
  units, reverse-projected from screen pixels) when zoom > 1×, so taps
  at default zoom don't accidentally pan.

User zoom + pan **multiply on top of** the existing auto-camera
(centroid-tracking + size-aware base zoom). Auto-follow continues —
e.g. when the user has pinched in to 1.6× and a colossal joins the
field, the auto-zoom still pulls back; the user's 1.6× just stays as a
multiplier. RESET clears both pan and zoom.

CSS `touchAction: "none"` on the canvas container prevents the page
from scrolling while pinching.

### Item 3 — character-select redo

Rebuilt the per-team picker (`MultiCharPicker` in `BattleForge.tsx`)
as a fighting-game roster:

- **Live preview pane** at the top of each picker — animated luizmelo
  idle sprite playing on a canvas, name in big colored text, archetype
  + size label, all five stat bars (HP/PWR/SPD/DEF/SPC), special move
  name highlighted in gold. Tapping any portrait in the grid below
  updates this pane instantly. New `<FighterPreview>` component owns
  the canvas + animation loop.
- **Portrait grid** — went from 3-column to `grid-cols-3 md:grid-cols-4`
  (more roster visible on tablets). Active card pops with the
  fighter's signature color glow + a small dot indicator. Heightened
  the scroll viewport from 240px → 280px.
- **Responsive layout** — team-A vs team-B parent went from always-
  side-by-side to `flex-col md:flex-row`. On phones, team A stacks
  above team B with a centered `VS` divider; on tablets+ they're
  side-by-side as before. Both pickers still support up to 3 slots
  with per-slot fighter counts.

The existing slot tabs, count picker (±1 / ±10), AI character
generator, search, and category filters all remain — the redo is
additive (preview pane + improved grid + responsive layout) not a
replacement of functionality.

### Bonus — built-in attribution

`ATTRIBUTION.md` at repo root already contained the luizmelo section
(merged in by the sibling JRPG Phase 0 commit which uses the same
sprite packs). No additional attribution work needed for Battle Forge
beyond what's already there. Battle Forge's mapping table + tint /
scale notes are documented above and in `BATTLEFORGE_PROGRESS.md`
(this file).

## Unmet scope

⚠️ **Cavalry archetype has no mounted-rider sprite.** luizmelo
inventory on disk: martial-hero / skeleton / goblin / mushroom /
flying-eye. None is a horse, wolf-rider, or chariot. Cavalry fighters
(Sir Lancelot, El Cid, Charging Bull, Wolf Pack, etc.) currently use
the mushroom pack as the best-available stand-in. To fix: drop a
horse-mounted luizmelo pack (or KingsAndPigs / Cute Pixel Knights
cavalry) into `/public/assets/luizmelo/` and add an entry to
`PACKS` in `luizmeloSprites.ts` keyed `"cavalry"`. Recommend Nick
download a "Mounted Knight" or "Horse Rider" pack from
https://luizmelo.itch.io/ or https://opengameart.org/ tagged CC0/CC-BY.

⚠️ **No dedicated archer pack.** Skeleton is melee; we re-use it for
ranged units. Visually distinct from martial-hero / mushroom /
flying-eye so the silhouette still reads "different from a swordsman",
but archers do not have a visible bow. Same fix path — drop in a
luizmelo archer/bow pack and add to PACKS.

## Files changed

- `src/battleforge/luizmeloSprites.ts` (new, ~430 lines)
- `src/battleforge/spriteFactory.ts` — luizmelo-first sheet selection,
  procedural fallback
- `src/battleforge/BattleCanvas.tsx` — user zoom/pan refs, touch +
  wheel handlers, overlay buttons, camera math composition
- `src/battleforge/BattleForge.tsx` — `FighterPreview` component,
  `MiniStatBar` component, redesigned `MultiCharPicker`, responsive
  parent layout

## What needs device-confirm on iPad / iPhone

- **Sprite look** — visual identity of each archetype on the actual
  device. Tint strength (0.32–0.40) and per-pack `fitScale` /
  `srcFeetY` may need a small calibration nudge after seeing them
  live. Adjustable in `PACKS` in `luizmeloSprites.ts`.
- **Zoom feel** — pinch sensitivity, wheel acceleration, pan drag
  speed. Tunable constants: `ZOOM_MIN`, `ZOOM_MAX`,
  `pinchStartZoom * ratio`, the wheel `1.0015` base.
- **Default framing** — the existing auto-camera defaults were
  preserved; user can now adjust freely so "zoom feels off" is
  user-fixable on first touch.

## What was NOT touched (safety)

- `src/battleforge/simulation.ts` — damage, hit detection, AI,
  win/lose conditions
- `src/battleforge/types.ts` — schema unchanged
- `src/battleforge/presets.ts` — roster definitions unchanged
- `src/battleforge/familyFighters.ts` — family-brawl unchanged
- All other arcade games (dungeon3d, Monster Forge, baseball/versus,
  cardclash, etc.) — only Battle Forge files in the commit

Sibling-task work that was sitting uncommitted in the working tree
when this task ran (combat-sports/, src/jrpg/, BaseballVersus, etc.)
was preserved via `git stash` and not touched.
