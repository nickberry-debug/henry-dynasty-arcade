# STATE_CHECK — v1.10.75 honest inventory

Generated 2026-05-31. Branch `polish-pass`. TS clean, prod build clean (12 chunks, 306 PWA entries).

---

## ⚠️ Surprises up top

1. **No "chopper"/helicopter game exists.** Registry has 28 game entries; none are a helicopter game. The word "chopper" appears only as a baseball groundball description in `BaseballTrainingHit.tsx:41`, `TrainingPitch.tsx:371`, `TrainingHit.tsx:322`. The word "helicopter" appears once in an improv prompt at `wordplay/templates.ts:506`. If you remember playing one, it's not in this codebase — was probably a different project or has never been built here.
2. **Style Studio Dressup is conceptually hollow, not technically broken.** It loads and renders Kenney pose PNGs cleanly, but the v1 layered compositor (hair / outfit / shoes / makeup) was ripped out and replaced with a pose+tint+scene picker. The card still markets it as "Mix hair, face, outfits, shoes" — that copy is currently a lie. (Source: `src/classics/stylestudio/StyleStudioDressup.tsx:3-8` comment confirms the rewrite.)
3. **Olympus narrative is skeletal without an API key.** Hero creation (7-step flow) and roster work, but `Adventure.tsx` falls back to a flat, non-branching scene list when no Anthropic key is present. The three-act structure is a code comment, not a real decision tree (`olympus/pages/Adventure.tsx:153-157, 356, 363-365`).
4. **Scrapyard Kings bots are "dumb-by-design."** Combat AI is literally "fire on cooldown if target in range" — no positioning, no targeting strategy (`mech/combat.ts:71-82`). Comment at `mech/MechHub.tsx` line ~292: "Battles arrive in a follow-up build" — i.e. the combat is admitted-incomplete.
5. **Survivor enemy sprites fall back to emoji.** Hero silhouettes are real canvas art, but enemies fall through to `ctx.fillText(e.glyph, …)` (an emoji) when no `drawSprite` is defined (`survivor/pages/SurvivorRun.tsx:335-341`). Coverage isn't enumerated.
6. **Maze Muncher does NOT have the "player flies off-screen" bug.** Player is bounded by maze walls; the only quirk is asymmetric tunnel-wrap (`mazemuncher/MazeMuncher.tsx:152-153`, `p.x < 0 → W-2` vs `p.x > W → 2`). Cosmetic stutter at the tunnel edge, but no escape. **The reported bug does not reproduce in code.** Could be device-specific (touch joystick drift?) or have been fixed already.
7. **Card Clash works fine** in code review — full 6-turn engine, win/loss reachable, drag-and-drop hit-testing wired (`cardclash/CardClash.tsx:390-419`, `engine.ts:81-100`). The "ugly/unplayable" report is likely a visual-polish complaint (procedural SVG card art, not real card illustrations), not a functional break. Cards are CSS gradient boxes + game-icons SVG emblems — fine but plain.

---

## Per-game inventory

Legend:  
**Loads** — does the page render without crash? (Y means tsc-clean, lazy chunk exists, no missing imports.)  
**Playable** — is the gameplay loop reachable end-to-end? (Y / Partial / N)  
**Art** — Real (sprite files on disk) / Procedural (canvas/SVG drawn from code) / Placeholder (emoji/CSS) / Mix  
**Verified** — How: read = code-read in depth, build = build-passed proxy, route = curl returned 200

| # | Game | Cat | Loads | Playable | Art | Known issue | On-disk art to fix it | Verified |
|---|------|-----|:---:|:---:|---|---|---|:---:|
| 1 | Sports Hub | sports | Y | Y | Procedural crests | None | n/a | read |
| 2 | Hockey | sports | Y | Y | Procedural crests | Season runs via shared SeasonSim engine | kenney sports-pack on disk if upgrade wanted | read |
| 3 | Basketball | sports | Y | Y | Procedural crests | Same as hockey | kenney sports-pack | read |
| 4 | College Football | sports | Y | Y | Procedural crests | 5-system college layer wired (recruit/dev/portal/rank/bowls) | n/a | read |
| 5 | Baseball | sports | Y | Y | Mix (kenney sports + procedural) | Stable | already wired | build |
| 6 | Football | sports | Y | Y | Mix | Stable | already wired | build |
| 7 | Sports Versus | sports | Y | Y | Inherits parent sports | Online lobby works | n/a | build |
| 8 | Battle Forge | action | Y | Y | Procedural pixel-art sprites (4-dir, walk/attack/death frames) | **None** — most polished game in the suite | n/a | read |
| 9 | Scrapyard Kings | action | Y | **Partial** | Procedural SVG silhouettes | Dumb bot AI (fires on cooldown only); no matchmaking; no shops; no animation on the mechs | kenney `blaster-kit` + `tanks` on disk (Models/Previews) — would need wiring, not fetching | read |
| 10 | Survivor | action | Y | **Partial** | Mix — heroes have hand-drawn canvas sprites, enemies fall back to emoji | Enemy sprite coverage incomplete (`SurvivorRun.tsx:335-341` `ctx.fillText(glyph)` fallback) | kenney `monster-builder-pack` (Spritesheet), `tiny-dungeon` on disk; luizmelo monsters (Goblin/Skeleton/Mushroom/Flying eye) on disk | read |
| 11 | Tank Duel | action | Y | Y | kenney `top-down-tanks-remastered` | Stable | wired | build |
| 12 | Strike Force | action | Y | Y | kenney `space-shooter-remastered` | Stable | wired | build |
| 13 | Girder Climb | action | Y | Y | Canvas-drawn | Stable | n/a | build |
| 14 | Olympus | adventure | Y | **Partial** | DiceBear procedural heroes + SVG companions | Adventure narrative is skeletal without API key — fallback is flat (`olympus/pages/Adventure.tsx:153-157, 363-365`); character-select for "go on adventure" UX is implicit not explicit | n/a (this is a content/logic problem, not an art problem) | read |
| 15 | Temporal Order | adventure | Y | Y | DiceBear + procedural | Same AI-fallback concern as Olympus but flow tolerates it better; trophies wired | n/a | build |
| 16 | Cosmic Squad | space | Y | Y | Procedural ships + ansimuz space backgrounds | Stable as of polish-pass (meteor pass added earlier) | wired | build |
| 17 | Main Event | strategy | Y | Y | Procedural crests + emoji segment icons | Stable | n/a | read (header) |
| 18 | Card Clash | strategy | Y | Y | CSS gradient cards + game-icons SVG emblems | Visually plain (no real card illustrations); functionally complete | game-icons-full folder on disk (already wired) | read |
| 19 | Movie Studios | strategy | Y | Y | Procedural posters | Stable | n/a | build |
| 20 | Silent Depths | strategy | Y | Y | Canvas-drawn | Stable | n/a | build |
| 21 | Creature Keeper | create | Y | Y | Procedural creature sprites | Stable | luizmelo monsters on disk if upgrade wanted | build |
| 22 | Potion Lab | create | Y | Y | kenney `food-kit` (wired v1.10.74) | Stable | wired | build |
| 23 | Style Studio | create | Y | **Partial** | kenney `toon-characters` PNG poses + CSS hue-rotate | **Lab gutted — no hair/makeup/outfit layering.** Card copy promises "Mix hair, face, outfits, shoes"; reality is pose+tint+scene selector. (`StyleStudioDressup.tsx:3-8`) | kenney `toon-characters` already on disk; `modular-characters` (PNG layered) on disk would support real layered compositor | read |
| 24 | Wordplay Hub | brain | Y | Y | Emoji icons | 25 sub-games, all wired; 20Q + Akinator rebuilt v1.10.75; Quiet Game slider added; Spell removed | n/a | build |
| 25 | Math Blaster | brain | Y | Y | kenney `space-shooter` | Stable; age-scaled | wired | build |
| 26 | Maze Muncher | brain | Y | Y | Canvas-drawn (circles, bezier) | **Reported "player flies off-screen" does NOT reproduce in code.** Only quirk is asymmetric tunnel wrap (cosmetic stutter at edge: `MazeMuncher.tsx:152-153`). If the bug is real, it's runtime-only (touch input drift?) and needs device repro. | n/a — fix is a 2-character symmetry tweak | read |
| 27 | Crew Traitor | party | Y | Y | Procedural avatars | Stable | n/a | build |
| 28 | Odd One Out | party | Y | Y | Procedural avatars | Stable | n/a | build |
| 29 | Beckett's Corner | resources | Y | Y | Emoji + icons | Stable | n/a | build |

**Counts:** 28 enabled games + 1 hub (Sports Hub counted as game 1). 24 fully WORKING. 4 PARTIAL (Style Studio, Mech, Survivor, Olympus). 0 BROKEN-broken. 0 unreachable. 0 registered-but-missing-component.

**No orphans:** every entry in `src/config/games.ts` has a matching route in `App.tsx`. Every lazy `lz(...)` import resolves (build passed). The only routes in App.tsx without a registry card are `/classics/sketch` (StyleStudio Sketch mode, intentionally a sub-route mentioned in the Style Studio description) and `/classics/depths-arcade` (Silent Depths Arcade mode, sub-route). Both reachable from their parent.

---

## Most-broken-first priority list

1. **Style Studio (Dressup)** — biggest gap between marketed feature and reality. Card promises a dress-up lab; product is a pose picker. Fix needs a real layered compositor (hair / outfit / shoes / makeup) — `kenney/modular-characters` is on disk and was originally meant for this. **Largest "lie surface" in the arcade.**
2. **Olympus** — adventure flow is hollow without an API key. The "AI Greek RPG" copy needs an AI to back it up; the no-key fallback shipped as a slideshow. Either deepen the offline fallback into a real branching scene tree, or surface a clear "Enable AI to unlock full mode" UX.
3. **Scrapyard Kings** — combat is "fire on cooldown" with no positioning, no shop, no progression layer. Promises 4 tiers and "bigger purses as you climb"; reality is a one-shot battle vs procedural bot.
4. **Survivor** — sprite coverage is partial; the emoji fallback fires for enemies missing `drawSprite`. Cosmetic but visible. `luizmelo/monsters-creatures-fantasy` (Goblin, Skeleton, Mushroom, Flying eye) is on disk and would slot directly into the existing sprite loader.
5. **Maze Muncher** — **deprioritize for now.** Reported "fly off-screen" does not reproduce in code review. Needs device-side repro before chasing. Only known issue is a 2-character tunnel-wrap symmetry quirk.
6. **Card Clash** — works; the "ugly/unplayable" complaint is plausibly about visual polish (no real card illustrations, just CSS gradients + SVG emblems). If the goal is "snap-killer art quality," the procedural cards need a real illustration pass (out of on-disk scope — would need AI generation or a real artist).
7. Everything else — stable on this pass.

---

## On-disk art available to fix priority items

Confirmed in `public/assets/`:
- **Style Studio fix** — `kenney/modular-characters/` (PNG + Vector + Spritesheet variants on disk) supports a real layered compositor. `kenney/toon-characters/` already wired for poses.
- **Survivor enemy fix** — `luizmelo/monsters-creatures-fantasy/` has Goblin, Skeleton, Mushroom, Flying eye sprite folders ready. `kenney/monster-builder-pack/Spritesheet/` also on disk. `kenney/tiny-dungeon/` for additional enemies.
- **Scrapyard Kings polish** — `kenney/blaster-kit/Models+Previews/` and `kenney/tanks/PNG+Spritesheet/` on disk, but these are 3D model previews + top-down tanks — would need actual integration work, not just a swap. The procedural SVG silhouettes are probably fine; the gameplay layer (AI, matchmaking) is the bigger gap.
- **Olympus / Maze Muncher / Card Clash** — fixes are logic/UX/polish, not art-fetching. No new on-disk art needed.

---

## What I actually did to verify

- Read full registry: `src/config/games.ts` (319 lines)
- Read full route table: `src/App.tsx` (639 lines) — confirmed every registry route resolves
- `npx tsc -b` exit 0
- `npx vite build` exit 0 (12 chunks built, 306 PWA precache entries)
- Deep code-read of 8 named games (Maze, Card Clash, Style Studio, Mech, Battle Forge, Survivor, Olympus, + sweep for "chopper")
- `find public/assets -maxdepth 3` to inventory on-disk art folders
- Grep'd whole tree for `chopper|helicopter|copter` — confirmed no game by that name exists
- For unnamed games: relied on build-pass + spot reads (registry-claimed status accepted unless I had reason to doubt). Marked Verified column honestly: "read" = I opened the file; "build" = build-pass proxy; "route" = HTTP 200.

What I did NOT do:
- Live-play each game in a browser session
- Test touch/mobile input paths (Maze Muncher reported bug might live here)
- Audit every wordplay sub-game individually (covered last batch)
- Verify the AI-backed paths (Olympus/Temporal/wordplay) against a live Haiku endpoint
