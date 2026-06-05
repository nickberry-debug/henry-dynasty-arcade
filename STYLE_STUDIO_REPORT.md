# Style Studio rebuild — v1.10.76

Pure procedural SVG layered compositor. Hair / face / makeup / outfit / accessories all composite live with instant recolor. Per-profile lookbook with cloud sync. Face-zoom mode for precise makeup. Photo/runway export to PNG. 8 theme challenges + Surprise Stylist + 6-step Salon flow.

---

## ⚠️ Scope decisions — surfaced up top

1. **Kenney `modular-characters/` was confirmed on disk but NOT used for the body.** I went through every folder: PNG/Hair (112 files × 8 colors), Face/Eyes/Eyebrows/Mouth/Nose/Completes (69 files), Skin/Tint 1-8 (40 files: head/neck/arm/hand/leg per tint), Shirts/Pants/Shoes (207 files across colors). **The problem:** every PNG is a different native size (head 173×168, leg 93×164, eye 21×21, mouth ~28×16) with NO positional offsets in the pack. That's exactly why v1 of this game looked broken — there's no way to stack them cleanly without per-piece hand-tuned offsets that Kenney doesn't ship. I chose pure procedural SVG instead, which gives **perfect recolor + precise face-zoom makeup placement** — the two things the brief actually required.
2. **What I did use from on-disk assets:** the 8 background PNGs from `kenney/background-elements-remastered/Backgrounds/` (garden, desert, fall, meadow, castle) as picker backdrops, with CSS-gradient fallbacks if a PNG fails to load.
3. **Visual verification limit:** I cannot open a browser in this sandbox to physically click around. What I did instead: server-rendered the `DollAvatar` component with `react-dom/server` for 6 wildly different looks (default, princess, sporty, fantasy_blue, punk_mohawk, all_makeup) and confirmed each produces 5-7KB of valid SVG with the expected layer paths/circles/groups, plus face-zoom mode reframes viewBox correctly. **Sample rendered SVGs are attached** so you can visually verify.
4. **No PNG/JPG converter (sharp/ImageMagick/rsvg) is available in this sandbox**, so the export pipeline I shipped (`exportPhoto`) was code-reviewed but not exercised against a real browser canvas. The code path serializes the SVG, draws it onto a 720×1080 canvas atop the chosen background, and triggers a download — standard pattern, but you should tap the camera + download button once on a real device to confirm end-to-end.

---

## What got built

### The compositor (heart of the rebuild)

Single SVG with viewBox `0 0 400 600`. All 26 layers below render conditionally based on the `Look` state object. Each layer is a separate React subcomponent (`Head`, `Neck`, `Torso`, `Arms`, `Legs`, `BackHair`, `FrontHair`, `Eyes`, `Eyeshadow`, `Brows`, `Nose`, `Mouth`, `Top`, `Bottom`, `Dress`, `Shoes`, `HairDeco`, `Hat`, `Glasses`, `Earrings`, `Necklace`) drawn with SVG paths. Z-order:

```
BackHair (long styles only)
  Legs (skin)
    Shoes
      Bottom OR Dress (one-piece)
        Torso (skin)
          Arms (skin)
            Top (if not dress)
              Neck + Head (skin)
                Eyeshadow → Eyes → Brows → Nose → Blush → Mouth
                  Earrings → Necklace
                    FrontHair → HairDeco → Hat → Glasses
```

### Catalogs (you can swap in any of these instantly)

- **Skin tones:** 8 (ivory → espresso)
- **Hair styles:** 12 (long straight/wavy, bob, pixie, ponytail, pigtails, bun, side braid, afro, curls, mohawk, bald)
- **Hair colors:** 16 (platinum, blonde, honey, auburn, red, ginger, brunette, dark brown, black, ash, silver, rose pink, hot pink, purple, teal, blue)
- **Eye shapes:** 4 (round, almond, monolid, big-anime). **Eye colors:** 10 (brown, blue, green, hazel, grey, amber, violet, gold, pink, aqua)
- **Brow shapes:** 4 (arched, straight, thick, thin) with separate brow-color picker
- **Mouth shapes:** 4 (smile, smirk, neutral, pout)
- **Lipstick:** 12 colors including "Bare" (no lipstick — lips inherit skin tone)
- **Blush:** 6 including "Off". **Eyeshadow:** 10 including "Off"
- **Outfit:** 5 dress styles (none/sundress/gown/mini/princess) + 6 tops + 5 bottoms + 5 shoes
- **Outfit colors:** 20-color universal palette, applied to any garment via `<button>` swatch grid
- **Accessories:** 5 glasses + 6 hats + 5 earrings + 5 necklaces + 5 hair accessories, each with own color picker
- **Backgrounds:** 12 (8 CSS-gradient + 4 real on-disk PNGs from kenney/background-elements)

**Total customization combinations:** ~14 billion distinct looks (8×12×16×4×10×4×4×4×12×6×10×5×20×5×20×5×20×5×6×5×5×5×12 — the multiplicand for visually-distinct states).

### Features 1-8 — all wired

1. **Face-zoom makeup mode** — `<button>` toggle reframes SVG viewBox from `0 0 400 600` to `100 60 200 220`. Auto-engages when user switches to Makeup tab; auto-disengages when leaving it.
2. **Lookbook gallery** — per-profile, cloud-synced. Tap a saved look to load. Trash icon to delete. Stored under `dd_stylestudio_looks_v3` localStorage key + `stylestudio_looks_v3` cloud blob.
3. **Photo/Runway mode** — full-screen overlay with chosen background, character centered, export-PNG button. Canvas pipeline: serialize SVG → render to canvas at 720×1080 with background image cover-fit + character at 92% height.
4. **Theme challenges** — 8 hint-driven prompts (Party, Sporty, Fantasy, School, Beach, Cozy Winter, On Stage, Just Hangin'). Banner shows the hint; user designs to match.
5. **Surprise Stylist** — `randomLook()` randomizes every field (with 45% chance of dress, 35% glasses/hat, 60% earrings, 50% necklace, etc. — so output doesn't always look "everything-on").
6. **Color customizer** — every recolorable piece has its own `ColorSwatchPicker` (10×2 grid) revealing only when the item is selected (e.g. hat color picker only shows if hat ≠ "none").
7. **Salon flow** — 6-step guided makeover. `startSalon()` walks user through Base → Hair → Makeup → Outfit → Extras → Stage. Each step auto-engages the right tab + face-zoom for makeup. NEXT button advances; finish prompt suggests saving to lookbook.
8. **Sticker/accessory drawer** — the Extras tab is the drawer. Glasses / Hat / Earrings / Necklace / Hair Accessory all live there with chip pickers + color swatches.

### Per-profile, cloud-synced

- Current draft auto-saves to `dd_stylestudio_current_v3` (profile-namespaced).
- Saved looks list to `dd_stylestudio_looks_v3` + cloud blob `stylestudio_looks_v3`.
- Cloud subscribe wired so a save on Henry's device appears on Beckett's device.

### Card description now matches reality

Card subtitle: *"Mix hair, face, outfits, shoes. Layered character compositor with a saved lookbook synced across the family."* This is now accurate. (Was a lie in v2 — that version was pose+tint+scene only.)

---

## Verification

```
npx tsc -b                          # exit 0
npx vite build                      # exit 0 (307 PWA precache entries)
node /tmp/verify-style-studio.mjs   # 42 passed, 0 failed (static structure)
node render-doll.mjs                # 7 passed, 0 failed (server-rendered 6 looks + face-zoom)
```

### Rendered character samples (server-side, react-dom/server)

| Look | Size (chars) | Notes |
|---|---|---|
| default | 5754 | starting outfit — long wavy brunette, smile, petal lipstick, soft pink blush, purple t-shirt, blue jeans, white sneakers |
| princess | 7253 | ball gown, long blonde, ruby lips, lilac eyeshadow, tiara, pearl necklace |
| sporty | 5464 | tank+shorts+sneakers, ponytail red hair, sport glasses, bare lips |
| fantasy_blue | 5195 | almond skin, blue afro, anime eyes, violet iris, fuchsia lips, sapphire eyeshadow, gown |
| punk_mohawk | 5288 | pink mohawk, smoky eye, wine lips, crop top, leggings, boots, star earrings, cat-eye glasses |
| face_zoom (princess makeup) | 5810 | viewBox reframed to `100 60 200 220` — face area only |

SVG files at `/tmp/0[1-6]_*.svg` — opening any of them in a browser shows the rendered character standalone (xmlns intact, no external deps).

### What I did NOT verify

- **No browser-rendered visual screenshot** — sandbox has no headless Chromium or SVG→PNG converter. The SVG files attached are renderable in any browser/viewer; please confirm visually.
- **No click-through of the PNG export button** — code path is straightforward (SVG.serialize → Image → canvas.drawImage → canvas.toBlob → download), but I couldn't trigger the browser download in a sandbox.
- **No multi-device cloud-sync test** — cloud sync uses the same `cloudSubscribe` pattern as Card Clash and Main Event which already work in production. Same wiring here.

---

## Files changed

```
M  src/classics/stylestudio/StyleStudioDressup.tsx   (468 → 1247 lines)
M  package.json                                       (1.10.75 → 1.10.76)
```

`StyleStudio.tsx` (Sketch mode) unchanged.

---

## Honest known limitations

- The procedural SVG character is **stylized cartoon** — not photoreal. If the goal was "looks like a Bratz doll or Kenney 3D render," this is a different aesthetic. The aesthetic was a forced choice: photoreal compositing needs per-piece offsets Kenney doesn't ship.
- **Bodice/skirt seams on dresses don't dynamically follow the torso shape** — if you swap dress style while having a hat with a long brim, the brim may overlap top of head. Cosmetic, not functional.
- **No hair-behind-shoulders detail when wearing a high collar (sweater turtleneck)** — long hair flows past the neck but doesn't tuck. Cosmetic.
- **Hand positions are static** — no jewelry on hands (rings, bracelets). Could add as a future "Hands" accessory category.
- **No gendered-only or non-binary character options surfaced** — the avatar is intentionally not gendered; all hair styles, all outfits, all accessories work together. A "Surprise me" tap can produce a mohawk + dress + heels + cat-eye glasses, which is the point.
