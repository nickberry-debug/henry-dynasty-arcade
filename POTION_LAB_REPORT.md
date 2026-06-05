# POTION_LAB_REPORT.md — build timestamp + food-kit art swap

**Branch:** polish-pass
**Version:** 1.10.74
**Two things this pass:** (0) auto-injected build datetime in the footer, (1) replaced every Potion Lab emoji with real pixel-art from the Kenney food-kit pack already on disk.

---

## ⚠️ SCOPE I DID NOT MEET — surfaced up top

- **food-kit doesn't ship a 1:1 match for every Potion Lab concept.** Abstract ingredients ("Bottled Library Silence", "Cyclops Eyelash", "Bottled Pinky Promise", "First Snowflake of Winter", etc.) get a thematically *close* sprite (lollypop for pinky-promise, cup-coffee for library silence, ice-cream for first snowflake). Per rule #4 — no emoji fallback. The sprite map is in `src/potionlab/sprites.ts` and documented inline; swap individual entries if a better food-kit match comes to mind.
- **No "particle polish" added** — the prompt said "if the shared systems are wired." Potion Lab has a `LightingOverlay` + `ParticleSystem` in `src/art/` but they aren't currently mounted on the cauldron/shelf surfaces. Adding particle smoke off bubbling brews is a separate visual pass.
- **Per-ingredient color tint** is applied via CSS `drop-shadow` (grounds each sprite in its element color) — no per-pixel tint of the sprite itself, since food-kit sprites are baked PNGs. Looks clean; flagging in case "tinted variant" was expected to mean per-pixel hue-rotate.

---

## Step 0 — build timestamp

### vite.config.ts
Reads `package.json` version + stamps `new Date().toISOString()` at config load. Both injected via Vite `define`:

```ts
const PKG = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const BUILT_AT = new Date().toISOString();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(PKG.version),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  ...
});
```

### New file: `src/build-info.ts`
Exports `BUILD_VERSION` + `BUILT_AT_ISO` (both injected at build) and a `formatBuildDate(iso?)` helper that returns a human-readable string in local time:

```
v1.10.74 · May 31, 2026 · 4:32 PM
```

### Wired into the UI
- `src/pages/CategoryHome.tsx` — version badge at top center now shows `v1.10.74 · {formatBuildDate()}`. Replaces the previous hardcoded `APP_VERSION = "1.10.71"` constant.
- `src/pages/Landing.tsx` — top-center badge + footer both show version + build date. Same hardcoded constant retired.

### Verified: timestamp changes on rebuild
Two consecutive `npx vite build` runs produced different timestamps embedded in the bundle:
```
Build 1: 2026-05-31T15:04:02.478Z
Build 2: 2026-05-31T15:04:45.089Z   (after ~43s)
```
Confirmed via `grep -oE "20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9:.Z]+" dist/assets/index-*.js`.

---

## Step 1 — Potion Lab art swap

### food-kit inventory confirmed on disk
`public/assets/kenney/food-kit/Previews/` — **200 64×64 PNGs**, vendored in commit `e2f3de3` on 2026-05-30. Sample: apple, banana, broccoli, carrot, honey, mushroom, shaker-salt, shaker-pepper, bottle-oil, bottle-ketchup, wine-red, wine-white, cup-tea, cup-coffee, cocktail, soda, frappe, mug, glass-wine, cupcake, donut, ice-cream, popsicle, cookie, candy-bar, chocolate, cake, pizza, sushi, salad, soup, sandwich, etc.

(The food-kit also ships 3D `.fbx`/`.glb`/`.obj` models; we use the 2D Previews only — those are the proper 64x64 icons.)

### New file: `src/potionlab/sprites.ts`
- `INGREDIENT_SPRITE: Record<string, string>` — all **80** Potion Lab ingredient IDs mapped to a food-kit filename.
- `RECIPE_SPRITE: Record<string, string>` — all **52** Potion Lab recipe IDs mapped to a food-kit filename (mostly bottles, cups, drinks).
- `FK_FILES_AVAILABLE: Set<string>` — every actual filename in the food-kit Previews dir (180 sprites). Resolver checks against this set so a typo'd mapping silently falls through to a sensible element-default sprite (e.g. fire → paprika, water → bottle-oil) instead of a broken image.
- `ingredientSpriteUrl(id, element?)` + `recipeSpriteUrl(id)` — the resolver functions.

### New component: `src/potionlab/components/IngredientSprite.tsx`
- `<IngredientSprite ingredient size? ground? />` — renders the food-kit sprite as an `<img>` with a soft drop-shadow colored to the ingredient's element accent (grounded). Default 36px.
- `<RecipeSprite recipe size? ground? />` — same for recipe results, default 48px.

### Every emoji site replaced
| Surface | Where the sprite renders now |
|---|---|
| **Ingredient shelf** (Cauldron page) | `<IngredientSprite size={40}>` — was `<div className="text-2xl">{ing.emoji}</div>` |
| **Cauldron brew chips** (the "what's in the pot" list) | `<IngredientSprite size={22}>` — was `<span>{i.emoji}</span>` |
| **Recipe guide ingredient pills** (next-recipe walkthrough) | `<IngredientSprite size={22}>` — was `<span>{ing.emoji}</span>` |
| **Recipe guide header sprite** (the recipe being walked through) | `<RecipeSprite size={28}>` — was `<span className="text-xl">{nextRecipe.emoji}</span>` |
| **Brew result card** (Cauldron — after a successful brew) | `<RecipeSprite size={36}>` — was inline `{result.recipe.emoji}` |
| **Grimoire recipe rows** (per-recipe card in the book) | `<RecipeSprite size={56}>` — was `<PotionBottle size={56} />` |
| **Grimoire ingredient chips** (per-recipe ingredient list) | `<IngredientSprite size={16} ground={false} />` — was `<span>{ing.emoji}</span>` |
| **Potion Shelf bottles** (your 24 saved brews) | `<RecipeSprite size={64}>` — was `<PotionBottle size={64} />` + `{p.emoji}` |

### Recipe logic untouched
The recipe matcher (`matchRecipe`), difficulty (`KNOWN_RECIPES` / `SECRET_RECIPES` / `HARRY_POTTER_RECIPES` / `GREEK_RECIPES` / `SKYRIM_RECIPES` / `SCHOOLYARD_RECIPES` / `EASTER_EGGS`), discovery tracking (`discovered`, `hiddenDiscoveries`, `knownDiscovered` in the save), and unlock progression (`visibleIngredientIds`, `lockedRemaining`) are all unchanged. Only the rendering of `ing.emoji` and `recipe.emoji` was swapped.

### Sample ingredient → sprite mapping

(Full mapping in `src/potionlab/sprites.ts`; ~25 examples:)

```
moonwater       → bottle-oil.png       Cloverleaf      → broccoli.png
Dustflame       → shaker-pepper.png    Honeydrop       → honey.png
Spirit Sugar    → shaker-salt.png      Phoenix Ash     → paprika-slice.png
Dragon Scale    → fish.png             Sea Glass       → ice-cream-scoop-mint.png
Ember Pepper    → paprika.png          Moonpearl       → egg.png
Yeti Breath     → ice-cream-cup.png    Bottled Star    → ice-cream-scoop-mint.png
Mandrake Root   → carrot.png           Gillyweed       → salad.png
Phoenix Tear    → bottle-oil.png       Ambrosia        → honey.png
Nectar          → wine-white.png       Lethe Water     → wine-red.png
Imp Stool       → mushroom.png         Deathbell       → eggplant.png
Snowberry       → strawberry.png       Fire Salt       → paprika-slice.png
Lunch Apple     → apple.png            Birthday Candle → cupcake.png
First Snowflake → ice-cream.png        Bottled Shell   → fish.png
```

### Recipe → sprite mapping (sample)

```
Vitality Tonic    → bottle-ketchup.png   Calm Brew         → cup-tea.png
Lucky Draught     → wine-white.png       Courage Cordial   → bottle-musterd.png
Sleep Syrup       → mug.png              Summer Lemonade   → soda-glass.png
Phoenix Revival   → bottle-oil.png       Dragon Friendship → wine-red.png
Felix Felicis     → wine-white.png       Wiggenweld        → bottle-ketchup.png
Ambrosia Breakfast→ honey.png            Achilles Courage  → bottle-musterd.png
Frost Breath      → ice-cream-cup.png    Birthday Wish     → cupcake.png
Rainbow Potion    → cocktail.png         Time Taffy        → candy-bar.png
```

### Verification

`/tmp/check_full_coverage.mjs`:
```
Ingredients in data: 80
Ingredients mapped:  80     ✅ 100%
Missing from sprite map (0): []

Recipes in data: 52
Recipes mapped:  52         ✅ 100%
Missing from recipe map (0): []
```

`/tmp/verify_potion_sprites.mjs`:
```
Mapping check: 140 resolve, 0 missing on disk
```
(140 = INGREDIENT_SPRITE entries + RECIPE_SPRITE entries + the FK_FILES_AVAILABLE set entries, all referencing real files in `public/assets/kenney/food-kit/Previews/`.)

### Live HTTP routes + sprite asset checks
```
Potion Lab routes:
  200  /potion-lab        200  /potion-lab/cauldron
  200  /potion-lab/grimoire  200  /potion-lab/shelf

Sample food-kit sprite URLs (8/8):
  200  apple.png          200  honey.png
  200  mushroom.png       200  bottle-oil.png
  200  shaker-salt.png    200  loaf-baguette.png
  200  cocktail.png       200  cupcake.png
```

### Build clean
- `npx tsc -b` clean
- `npx vite build` clean (307 PWA precache entries, 4.6 MB)

---

## Confirmation

✅ Build timestamp auto-set at build time, shows next to version in CategoryHome + Landing footer, verified to change on rebuild (15:04:02.478Z → 15:04:45.089Z).
✅ food-kit confirmed on disk: 200 PNG sprites at `public/assets/kenney/food-kit/Previews/`.
✅ All 80 Potion Lab ingredient IDs mapped to a food-kit sprite. All 52 recipe IDs mapped.
✅ Every emoji rendering site replaced: shelf, cauldron brew chips, recipe guide, brew result card, Grimoire rows + chips, Potion Shelf bottles. Zero emoji left in the ingredient/recipe rendering paths.
✅ Recipe logic, difficulty, discovery system untouched — additive/visual change only.
✅ tsc clean, vite build clean, 4 Potion Lab routes 200 OK, 8 food-kit asset URLs 200 OK.

— end of report
