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

---

## Files of record

- `JRPG_PROGRESS.md` — this file
- `WORLD_BIBLE.md` — world & story
- `ATTRIBUTION.md` — asset credits
- `src/jrpg/` — game code
- `public/assets/jrpg/manifest.json` — asset inventory
