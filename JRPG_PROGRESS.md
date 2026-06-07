# JRPG — Master Progress Log

> **Resume hint:** "continue the JRPG"
> Build a brand-new original JRPG (FF-inspired genre only — 100% original IP, world, cast, story) for Berry Kids'' Arcade. The most ambitious title in the arcade. Phased and resumable.

**Working title:** **AETHERSONG — The First Refrain**
**Route:** `/jrpg`
**Lead file:** `src/jrpg/`
**World bible:** `WORLD_BIBLE.md`
**Attribution:** `ATTRIBUTION.md` (root)
**Asset root:** `public/assets/jrpg/`

---

## Phase status

| Phase | Description | Status |
|-------|-------------|--------|
| 0a | World bible (story / cast / antagonist / chapter outline) | DONE |
| 0b | Asset acquisition & style lock (cohesive CC0 anime set) | DONE |
| 1  | Vertical slice — title screen, one town, one dungeon, cinematic ATB battle, one boss, leveling | DONE |
| 2  | Party expansion (recruit Toren in Ch.2), equipment slots, ability menu with MP cost | queued |
| 3  | Overdrive limit-breaks + status effects (Burn, Hush, Hush-Resist) | queued |
| 4  | Chapter 2 overworld + Vellanthe cathedral city + 2nd dungeon | queued |
| 5  | Boss-juice pass — multi-phase bosses, screen shake budget, victory cinematic | queued |
| 6  | Audio pass — chiptune to orchestral track upgrade if a CC0 source can be found | queued |
| 7  | Save/load polish — slot UI, autosave, per-profile persistence audit | queued |

---

## Standing rules

- **100% original IP.** No Final Fantasy names/characters/places. Inspired-by-genre only.
- **CC0 / clearly-permissive assets only.** Every borrowed file gets a row in `ATTRIBUTION.md`.
- **Per-profile saves** via the existing profiles system — don''t trample other games'' state.
- **Don''t regress** other arcade games (Battle Forge, Sports Versus, Combat Sports, Monster Forge, Dungeon3D, etc.).
- **WARNING: Unmet scope goes at the top of every Nick-facing message.**
- **"Done" = ran it.** Battle juice & look-feel = device-confirm-required (Nick on iPad).
- Stop at a clean phase boundary if runway is short.

---

## Phase 0 — Notes

- **World bible** locked: `Saevora`, the Song-world. Hero **Liora Vey**, party of four planned, antagonist **The Unisonist**. See `WORLD_BIBLE.md`.
- **Asset cohesion:** Battle visuals are **fully cohesive** (LuizMelo anime side-view, single artist). Overworld is **stitched** — see Phase 1 notes for cohesion gaps.
- **Title font / branding:** Inline CSS web font (Cinzel for title, system for body) — no remote font fetches at runtime, all CDN-resolved at build.

## Phase 1 — Notes

- One town: **Threnfall** (Liora''s seaside village, ~5 buildings, ~10 NPCs, inn, shop, save shrine).
- One dungeon: **The Silent Chapel** (3 rooms + boss room, treasure chest, trash encounters).
- One boss: **Hush Echo** (a silver wraith, ~2x normal stats, signature ability "Silver Silence").
- Battle system: ATB-style, side-view, Liora solo for the slice. Attack / Verse (ability) / Item / Run.
- Leveling: linear XP curve, +HP/+ATK/+VOICE on level up.
- Save system: per-profile localStorage, save shrines + autosave on dungeon clear.

## Phase 1 — Cohesion gaps (honest read)

- Battler sprites: **LuizMelo** (256x256 anime canvas, ~120x80 visible pixels). Cohesive across hero + 4 monsters.
- Overworld tiles: programmatic canvas painting (grass, path, water, stone, roof) — solid colors with pixel borders. Matches no specific external pack but reads as cohesive low-res tile art.
- Overworld characters: 24x24 mini-sprites synthesized in-engine to match the tile resolution. Liora wears the silver lantern.
- Backgrounds: Ansimuz "Mountain Dusk" parallax (sky / mountains / trees) — slight resolution mismatch vs battlers (battlers are ~3x larger), but reads cinematically.
- Audio: Kenney 8-bit jingles for stinger/victory; longer looping music synthesized (Web Audio oscillator loop) for battle/town/dungeon to avoid mismatched chiptune-with-anime feel.

## Phase 1 hotfix — June 2026 — battle engagement

After Nick's first iPad test he could move Liora freely in the dungeon but
never triggered a battle. Diagnosis: dungeon-room-1 spawn was at `(2, 3)` —
one tile west of the town-exit door at `(3, 3)`. Walking right immediately
re-triggered the exit and bounced Liora back to town **before** the per-step
4% encounter roll could fire enough times to land a hit. Walking down was
gated through a 5-tile-long corridor before opening up, so cumulative
encounter probability per traversal was only ~18% — playable but easy to
mistake for "encounters are broken".

Fix shipped in this commit:

- Spawn moved to `(8, 8)` in dungeon-room-1 (open chapel center, one tile
  west of the save chime). Room-2 and room-3 spawns also re-centered.
- Encounter rate bumped: room-1 4% → 10%, room-2/3 6% → 12%.
- Encounter-tile check switched to center-based `Math.floor((pos + TILE/2) / TILE)`
  so it agrees with the exit-tile check (was using left-edge `floor(pos / TILE)`
  — off-by-one inconsistency).
- Every per-step roll now console-logs `[AETHERSONG] step (x,y) roll=X.XXX
  rate=Y -> BATTLE/ok` so the next "encounters broken" report can be
  diagnosed from console alone.
- New **DEBUG: FIGHT NOW** button in the dungeon HUD (top-right, under the
  Sound button) force-triggers a random encounter so the battle pipeline can
  be sanity-checked independently of the RNG.

## Phase 1 art upgrade — June 2026 — overworld tileset v2

Nick's read on the Phase-1 art: *"Map also looks like NES Zelda game, not
Final Fantasy. Get better from 3rd party site."* The Phase-1 overworld used
procedural painted 16×16 tiles (solid colors + pixel noise), deliberately
chosen so the style break vs. the LuizMelo anime battlers was obvious. It
landed too blocky for an FF-style read.

Shipped in this commit:

- New sheet at `public/assets/jrpg/overworld-v2/roguelikeSheet_transparent.png`
  — **Kenney "Roguelike/RPG pack" v1.0** (CC0, 1700 tiles, 16×16 with 1px
  margin). Direct CC0 download from kenney.nl, no login required.
- New module `src/jrpg/engine/tilesetV2.ts` — extracts per-glyph canvases from
  the sheet at the coords mapped in `public/assets/jrpg/overworld-v2/tileset-v2.json`.
  Two context maps (`town` and `dungeon`) so the same glyph can render as
  grass in town and stone-floor in the chapel.
- `USE_V2_TILES` feature flag in `tilesetV2.ts` switches the renderer between
  v2 (Kenney) and v1 (procedural). Defaults to v2. The renderer falls through
  to the v1 procedural tile if a glyph isn't mapped in v2.
- Hush-shimmer (`X`) is the grass tile + a translucent silver radial composite
  — bespoke since no pack ships an "AETHERSONG anomaly" tile.
- `public/assets/ATTRIBUTION.md` updated. Kenney is CC0 so attribution isn't
  required but it's there for hygiene.

### Honest visual ceiling

Cainos *Pixel Art Top Down - Basic* was Nick's preferred first-choice for the
FF/Stardew aesthetic. It IS free ("name your own price" with a $0 option) but
its itch.io download flow is a JS-driven popup → fresh download page → JS
click event → signed CDN URL. `curl -L` can't follow it without a session
cookie, and the download URL isn't exposed anywhere I can scrape. Stealthix,
Limezu *Serene Village*, and Finalbossblues *Time Fantasy* all live on the
same itch.io flow.

Kenney was the best CC0 pack on the open web that I could pull with one
`Invoke-WebRequest`. The verdict: **clearly better than the NES-Zelda
procedural blocks**, but the style sits at "cozy 16-bit village" rather
than "FF6 anime cathedral". It reads as a cohesive overworld pack, no longer
as solid color blocks.

To upgrade further, the cleanest path is:

1. Nick logs into itch.io once on the laptop.
2. Downloads `Pixel Art Top Down - Basic v1.2.3.zip` (2.5 MB) from
   <https://cainos.itch.io/pixel-art-top-down-basic>.
3. Drops the zip in `~/downloads` or wherever I can read it.
4. I swap the sheet path + remap the tileset-v2.json coords.

The wiring (USE_V2_TILES, context-aware tileset module, Hush composite, glyph
manifest) is built to accommodate any 16×16 or 32×32 tile sheet — only the
JSON coord table and the `TILE_V2_SHEET` constant need to change.

---

## Files of record

- `JRPG_PROGRESS.md` — this file
- `WORLD_BIBLE.md` — world & story
- `ATTRIBUTION.md` — asset credits
- `src/jrpg/` — game code
- `public/assets/jrpg/manifest.json` — asset inventory
