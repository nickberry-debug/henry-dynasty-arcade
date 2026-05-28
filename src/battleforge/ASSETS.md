# Battle Forge — AoE1-Style Visual Assets

## Strategy

**Path chosen: A — code-rendered pixel art.**

Every sprite drawn by the Battle Forge renderer is generated at runtime
inside `spriteFactory.ts` by writing pixels onto offscreen `<canvas>`
elements. **No external image assets are bundled or downloaded, and no AI
image generation is performed.** The previous Three.js / TABS-style 3D
renderer (which mixed procedural meshes with AI-generated character
attempts) has been retired.

Why Path A:

- Zero asset-pipeline complexity (no build-time downloads, no manifests).
- Zero licensing ambiguity — every pixel is written by code in this repo,
  so we own the output unambiguously.
- Aesthetic stays consistent across all 200+ preset characters because the
  archetype templates are shared.
- Honours Nick's directive: "right now these graphics have been
  pre-rendered or rendered on the spot if the character is AI generated.
  Fix this."

## Generated Sprite Sheets

`spriteFactory.ts` produces, per character + team pair:

- 4 facings (NE / SE / SW / NW) — left-facing facings are mirrored from
  the canonical right-facing render to halve draw work.
- Per facing: 1 idle frame, 4 walk frames, 3 attack frames.
- 1 shared death pose.

Each frame is a 64×64 canvas with the unit's feet anchored at (32, 56).
Sheets are cached by `(archetype, team, accent_color)` so the per-pixel
cost is paid once per flavour, then reused.

### Archetypes

Characters are mapped to one of five archetypes by heuristics on
`CharacterDef.id`, `category`, `attackType`, and `size`:

- `swordsman` — generic melee humanoid with sword + shield + helmet
- `archer` — hooded ranged humanoid with bow
- `cavalry` — humanoid rider on a quadruped mount, with lance
- `monster` — large brute silhouette with claws + glowing eyes
- `mage` — robed humanoid with pointy hat and staff (ranged casters)

## Terrain Tiles

Tiles are also drawn procedurally as filled iso diamonds (`drawIsoDiamond`
in `BattleCanvas.tsx`) with three-tone shading and a per-tile colour
variant for visual interest. Tile kinds:

- `grass`, `dirt`, `water`, `sand`, `stone`

Biome selection per map is rule-based (see `biomeForMap`) so e.g.
"Snowy Mountain Pass" reads as stone+dirt+water and "Desert Canyon" as
sand+dirt, while the diamond's water "stream" stays visible on grassy and
forest maps to satisfy the "≥3 tile types" requirement.

## Licensing

All sprite generation code is part of this repository and inherits the
repository's license. There are no third-party image assets to credit.

Should a future polish pass want to swap in higher-fidelity hand-painted
tiles or unit sprites, the recommended sources are:

- **Kenney.nl** — `https://kenney.nl/assets` (CC0)
  - Specifically the *Isometric Tiles* and *Isometric Buildings* packs
- **OpenGameArt.org** — filter to CC0 or CC-BY 3.0+
  - Notable: "Isometric 64×64 Outside Tileset" by Yar (CC0)
- **Liberated Pixel Cup (LPC)** characters — CC-BY-SA 3.0 / GPL 3.0
  (top-down rather than iso; would need pose remapping)

If any of these are ever bundled into `public/assets/aoe/`, **add a
matching `<source>: <license>: <author>: <url>` line in this file at the
time of import**.

## Roll-back

The pre-AoE Three.js renderer is preserved on the git tag
`v1.8.2-pre-aoe`. To restore:

```
git checkout v1.8.2-pre-aoe
```
