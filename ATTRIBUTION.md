# Attribution — Monster Forge assets

All 3D assets used in **Monster Forge** (`public/assets/monster-parts/`) are
released under **CC0 1.0 Universal (Public Domain Dedication)** and were sourced
from [Quaternius](https://quaternius.com/) via [Poly Pizza](https://poly.pizza/).
Attribution is not legally required for CC0 work, but is provided here as a
courtesy and so the source can be re-verified.

## Source & License

- **Author:** Quaternius (https://quaternius.com/)
- **Mirror:** Poly Pizza (https://poly.pizza/)
- **License:** CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/

## What's used

### Bodies — 18 files in `public/assets/monster-parts/body/`

Each is a complete CC0 GLB animated creature from the Quaternius monster catalog.

| File | Poly Pizza ID | Source URL |
|---|---|---|
| alien.glb | sUTLXji0aL | https://poly.pizza/m/sUTLXji0aL |
| blue_demon.glb | S7jYW6Amye | https://poly.pizza/m/S7jYW6Amye |
| demon.glb | Mo2ky6vkf8 | https://poly.pizza/m/Mo2ky6vkf8 |
| dino.glb | wuerCFCWNR | https://poly.pizza/m/wuerCFCWNR |
| dragon_evolved.glb | LlwD0QNUPj | https://poly.pizza/m/LlwD0QNUPj |
| frog.glb | 37wofOCOzG | https://poly.pizza/m/37wofOCOzG |
| ghost.glb | Iip30bDHmu | https://poly.pizza/m/Iip30bDHmu |
| giant.glb | BldaiPtyJa | https://poly.pizza/m/BldaiPtyJa |
| green_blob.glb | y4kJh8EeYS | https://poly.pizza/m/y4kJh8EeYS |
| green_spiky_blob.glb | IoWG5F9WUc | https://poly.pizza/m/IoWG5F9WUc |
| mimic.glb | B8HrWzkuNp | https://poly.pizza/m/B8HrWzkuNp |
| mushnub.glb | LWKmS30Xxl | https://poly.pizza/m/LWKmS30Xxl |
| orc.glb | 5vO2YJsPEf | https://poly.pizza/m/5vO2YJsPEf |
| skeleton.glb | DM4QScSmbS | https://poly.pizza/m/DM4QScSmbS |
| squidle.glb | 54QyRcsogk | https://poly.pizza/m/54QyRcsogk |
| tribal.glb | t91lDHaqRW | https://poly.pizza/m/t91lDHaqRW |
| yeti.glb | S1E7idPFhe | https://poly.pizza/m/S1E7idPFhe |
| zombie.glb | VlXjG0N8Eg | https://poly.pizza/m/VlXjG0N8Eg |

### Head overlays — 3 files in `public/assets/monster-parts/head/`

| File | Poly Pizza ID | Source URL |
|---|---|---|
| ghost_skull.glb | TX8r9WBXpe | https://poly.pizza/m/TX8r9WBXpe |
| flower_horn.glb | ExfO0SGWmf | https://poly.pizza/m/ExfO0SGWmf |
| stag.glb | tQdzbZ1Cmw | https://poly.pizza/m/tQdzbZ1Cmw |

### Arm — 1 file in `public/assets/monster-parts/arms/`

| File | Poly Pizza ID | Source URL |
|---|---|---|
| big_arm.glb | KaVJET0WHx | https://poly.pizza/m/KaVJET0WHx |

### Procedural accessories

Wings, horns, tails, spikes, and eyes are generated **at runtime** by Monster Forge
itself using Three.js primitives. No additional asset downloads are required.

## License full text

> CC0 1.0 Universal (CC0 1.0) Public Domain Dedication
> The person who associated a work with this deed has dedicated the work to the
> public domain by waiving all of his or her rights to the work worldwide under
> copyright law, including all related and neighboring rights, to the extent
> allowed by law. You can copy, modify, distribute and perform the work, even
> for commercial purposes, all without asking permission.
>
> https://creativecommons.org/publicdomain/zero/1.0/

## Sources skipped

During the Monster Forge build I evaluated and skipped:
- **Poly by Google / Anonymous uploaders / Other artists on Poly Pizza** — license
  not clearly marked CC0 on the model page, so omitted to stay strictly within
  the project's CC0-only policy.
- **Quaternius drive.google.com bulk packs** — require interactive Google Drive
  download and weren't worth blocking on while the individual GLBs on Poly
  Pizza are direct-downloadable and identical.


---

## 2. Combat Sports — Boxing (luizmelo Martial Hero reuse)

The new **Boxing** game (`src/combat-sports/boxing/`, route `/boxing`)
reuses the **luizmelo Martial Hero** character sprite pack from
`public/assets/luizmelo/martial-hero/Sprites/`. The pack ships with a
license file (`License.txt` in the same folder) that allows free use
including in commercial projects with credit.

Credit line:
> Character sprites by luizmelo — https://luizmelo.itch.io/

The mapping into boxing animation states is documented in
`public/assets/combat-sports/boxing/manifest.json`:

| Boxing state | Martial Hero source |
|---|---|
| idle / block | Idle.png (8 frames) |
| move | Run.png (8 frames) |
| jab / cross | Attack1.png (6 frames) |
| hook / uppercut | Attack2.png (6 frames) |
| hit | Take Hit.png (4 frames) |
| dodge | Jump.png (2 frames) |
| knockdown | Fall.png (2 frames) |
| ko | Death.png (6 frames) |

At runtime the loader (`src/combat-sports/boxing/sprites.ts`) bakes a
per-corner color tint onto the silhouette via `source-atop` so the red
and blue corners read as distinct fighters. Original luizmelo art is
never redistributed in modified form — tints are applied on the client.

### ⚠️ Open flag

A true CC0 boxing-specific sprite sheet was NOT found on itch.io,
OpenGameArt, GameArt2D free, or CraftPix free during the June 2026
audit — the Martial Hero swordsman silhouette stands in for now.
Dedicated boxing art (gloves overlay, trunks, boxer pose) is queued
for **Phase 3 polish** of the Combat Sports work (see
`COMBATSPORTS_PROGRESS.md`).

## AETHERSONG — JRPG (Phase 0)

The JRPG (route `/jrpg`) reuses several existing in-repo CC0 / CC-BY assets,
organized under `public/assets/jrpg/`:

### Battlers — LuizMelo (CC-BY 4.0)

- `assets/jrpg/battlers/hero/*` — sourced from **LuizMelo Martial Hero**
  (https://luizmelo.itch.io). 200x200 frames, anime side-view, 6 anims.
- `assets/jrpg/battlers/enemies/{goblin,mushroom,skeleton,flying_eye}/*` —
  sourced from **LuizMelo Monsters Creatures Fantasy**
  (https://luizmelo.itch.io). 150x150 frames, same artist, same style —
  cohesive battle visuals.
- License: CC-BY 4.0. Attribution: **LuizMelo**, https://luizmelo.itch.io
- License text: https://creativecommons.org/licenses/by/4.0/

### Battle Parallax Backgrounds — Ansimuz (CC0)

- `assets/jrpg/backgrounds/bg_*.png` — sourced from **Ansimuz Super
  Mountain Dusk** asset pack (https://ansimuz.com). CC0 — public domain.
  Credit retained: **Ansimuz**.

### Music & SFX — Kenney (CC0)

- `assets/jrpg/music/victory.ogg`, `assets/jrpg/music/fanfare.ogg` —
  sourced from **Kenney Music Jingles** (CC0). Credit retained:
  **Kenney**, https://kenney.nl.
- Looping background tracks (town / dungeon / battle / boss) are
  synthesized at runtime in `src/jrpg/engine/audio.ts` via Web Audio
  oscillators. No remote assets used at runtime.

### Generated / Synthesized

- Overworld tiles (grass / path / water / stone / roof / sand) are
  painted procedurally onto a canvas at build-init via
  `src/jrpg/engine/tileset.ts`. Original work, no third-party assets.
- Overworld character mini-sprites (24x24) are drawn procedurally via
  `src/jrpg/engine/minisprite.ts`. Original work.

### Honest cohesion note

- Battle sprites: **cohesive** — all from LuizMelo, same artist, same era.
- Battle background: **mostly cohesive** — Ansimuz parallax has a slight
  resolution mismatch with the LuizMelo battlers (parallax layers are
  ~320x180 native upscaled, battlers render at ~120 visible px). Reads
  cinematic, not jarring.
- Overworld vs battle: **stitched** — top-down view uses procedural
  flat-color tiles + 24x24 mini-sprites. This is deliberately distinct
  from the cinematic side-view battlers, which is how classic JRPGs
  have always handled the mode switch.
