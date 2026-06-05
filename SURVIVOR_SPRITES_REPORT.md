# Survivor — animated monster sprites (v1.10.78)

Wired luizmelo's monsters-creatures-fantasy spritesheets in place of the procedural canvas silhouettes for all 7 enemy archetypes. Grounded shadows, facing flip, damage-flash recoil frames.

---

## ⚠️ Scope notes — surfaced at top

1. **"Saw them animate in a run" — I could not visually verify in this sandbox.** No headless Chromium, no node-canvas, no SVG/PNG converter available. What I DID verify: every spritesheet PNG serves 200 OK via the dev server with correct URL encoding (including the space in `Flying eye/`), animatedSprites.ts + SurvivorRun.tsx compile cleanly, prod build clean. The render path is standard Canvas2D `drawImage(spritesheet, srcX, 0, 150, 150, dx, dy, dw, dh)` from preloaded `HTMLImageElement`s — low runtime-break risk, but you should open `/survivor/run` on a real device to confirm the animation cadence, scale tuning, and tint overlay look right before declaring it shipped.
2. **Player/hero upgrade DEFERRED.** `luizmelo/martial-hero/Sprites/` is on disk (Idle/Run/Attack1/Attack2/Take Hit/Jump/Fall/Death, 1600×200 idle, 1200×200 attacks). But it's a **single warrior character** — using it for all 6 hero classes (Spartan/Mage/Huntress/Berserker/Monk/Pyrekit) would be a regression vs the current class-distinct canvas drawers (Spartan has shield+plume, Mage has robe+staff, Huntress has bow stance, etc.). A clean hero upgrade needs 6 distinct on-disk character packs, which we don't have. Flagged; left current canvas heroes in place.
3. **Weapon visuals DEFERRED.** Survivor weapons render as procedural canvas FX (aura, wave, orbit, motion trails). There's no clean on-disk swap that would visibly improve them — `kenney/blaster-kit` ships Models/Previews (3D model renders, not animated 2D), not projectile sprite sheets. Flagged.
4. **The "emoji fallback" the state check flagged was actually never firing in v1.10.77.** Every archetype already had a procedural canvas drawer in `sprites.ts`. The fallback path at `SurvivorRun.tsx:335` only fires if `drawSprite` returns false, which never happened for the 7 known archetypes. So the prior state-check overstated the issue. This pass still adds value (real animated PNG monsters look much better than the procedural silhouettes), but the "emoji-leak" framing was incorrect.
5. **No game logic / balance touched.** Spawn rules, wave logic, HP, damage, scaling — all untouched. Pure visual layer.

---

## On-disk inventory

`public/assets/luizmelo/monsters-creatures-fantasy/` confirmed. Per-monster animation files + frame counts (all 150-px-tall, frames laid out horizontally):

| Monster | Idle | Move | Attack | Take Hit | Death | Notes |
|---|---|---|---|---|---|---|
| Goblin | Idle.png (4) | Run.png (8) | Attack.png (8) | Take Hit.png (4) | Death.png (4) | small, agile |
| Skeleton | Idle.png (4) | Walk.png (**4**) | Attack.png (8) | Take Hit.png (4) | Death.png (4) | humanoid; Walk ships at 600×150 (4 frames), not 1200×150 like the others — caught + corrected |
| Mushroom | Idle.png (4) | Run.png (8) | Attack.png (8) | Take Hit.png (4) | Death.png (4) | chunky tank-like |
| Flying eye | (no Idle file) | Flight.png (8) | Attack.png (8) | Take Hit.png (4) | Death.png (4) | aerial; we use Flight as both idle + move |

---

## Archetype → monster mapping

Survivor ships 7 enemy archetypes; we have 4 monsters. Mapping reuses + tints:

| Archetype | Monster | Scale | Tint | Why |
|---|---|---|---|---|
| `swarm` | Goblin | 0.85× | none | small + agile → goblin fits |
| `fast` | Flying eye | 1.0× | none (flying shadow) | speed + altitude → aerial monster |
| `tank` | Mushroom | 1.15× | none | chunky lumbering body |
| `ranged` | Skeleton | 1.0× | none | humanoid attacker w/ arms-up attack frame |
| `shooter` | Goblin | 1.0× | purple wash (`rgba(80,40,140,0.45)`) | small + ranged caster vibe |
| `miniboss` | Mushroom | 1.45× | red wash (`rgba(200,40,40,0.45)`) | scaled tank → boss flavor |
| `boss` | Skeleton | 1.7× | crimson wash (`rgba(200,20,40,0.55)`) | giant menacing humanoid |

No emoji fallback path remains exercised. (Emoji branch in code retained as a paranoia safety net only.)

---

## What got built

### `src/survivor/animatedSprites.ts` (new, 168 lines)

- `MONSTERS` table — folder + per-animation file + frame count per monster.
- `getImage(url)` — lazy `Image()` cache with failure flagging (one console warn on miss, then silent).
- `preloadMonsterSprites()` — fires every sheet on game start so first enemies don't blink.
- `getTintedSheet(monster, anim, tint)` — bakes a tinted off-screen canvas via `source-atop`, cached per `(monster, anim, tint)` key so the render loop doesn't recompute per-frame.
- `drawAnimatedMonster(ctx, x, y, monster, opts)` — picks the animation (`hit` when flash > 0, else `opts.anim` or `"move"`), computes the current frame via `Math.floor(Date.now() / 1000 * 10) % frames`, drawImages it centered with optional horizontal flip for facing, then overlays a `lighter`-blended copy at 0.4 alpha for the damage flash wash.
- `drawGroundShadow(ctx, x, y, r, flying)` — ellipse shadow at the entity's feet (or lower + smaller for flying enemies to imply altitude).
- `ARCHETYPE_MAP` — the 7-archetype lookup table above.

### `src/survivor/pages/SurvivorRun.tsx` (modified)

- Added imports + `preloadMonsterSprites()` on mount (in the existing `unlockAudio` effect — no new effect needed).
- Enemy render block now: (1) draws grounded shadow, (2) tries `drawAnimatedMonster` via ARCHETYPE_MAP with the right scale/tint/facing, (3) falls back to existing `drawSprite` canvas silhouette if the PNG isn't loaded yet, (4) emoji as a third-tier last resort that should never fire.
- Facing: `g.hero.x < e.x ? -1 : 1` — enemies face the hero.
- Game logic untouched.

### Game logic / balance — UNTOUCHED

Confirmed: no edits to `engine.ts`, `choices.ts`, `catalog.ts`, `types.ts`, `arena.ts`. Spawn timing, HP, damage, scaling, wave logic — all unchanged.

---

## Verification

```
npx tsc -b                          # exit 0
npx vite build                      # exit 0
curl /assets/luizmelo/...           # 200 for all 5 verified URLs (Goblin/Skeleton/Mushroom/Flying eye)
curl /src/survivor/animatedSprites.ts  # 200, compiles
curl /survivor/run                  # 200
```

### What I did NOT verify (sandbox limits)

- **Live in-browser run.** No headless Chromium / node-canvas / Puppeteer in this sandbox. Cannot confirm animation cadence, scale, or tint look right from inside the box.
- **PNG → canvas drawImage at runtime.** Standard Canvas2D API; should "just work," but you should tap `/survivor/run` on a real device to confirm.
- **Tinted miniboss/boss legibility.** The `source-atop` tint baked into a cached off-screen canvas is the standard pattern; visual contrast tuning may need a knob.

---

## Files changed

```
A  src/survivor/animatedSprites.ts   (new, 168 lines)
M  src/survivor/pages/SurvivorRun.tsx (added preload + new render branch)
M  package.json                       (1.10.77 → 1.10.78)
```

Nothing touched in `engine.ts`, `catalog.ts`, `choices.ts`, `types.ts`, `arena.ts`, `sprites.ts`, `store.ts`.

---

## Recommended follow-ups (out of scope this pass)

- **Visual QA on a real device** — confirm the sprite scale (3.6× radius) reads right; tune per-archetype if needed.
- **Attack-frame trigger.** Currently enemies always render `move`. Could add an attack frame swap when collision-radius overlaps the hero — but it requires a small engine hook (last-attack timestamp on Enemy), which crosses into game logic. Defer until you want it.
- **Death animation.** Currently enemies pop out instantly when HP ≤ 0. A 0.4s death-frame animation before removal would feel better but again needs a small engine state addition.
- **Hero packs.** Find 6 distinct character spritesheets (or commission/AI-generate) so we can drop the procedural canvas heroes.
- **Weapon FX** — current procedural effects work; if you want sprite-based projectiles, a dedicated VFX pack would be needed.
