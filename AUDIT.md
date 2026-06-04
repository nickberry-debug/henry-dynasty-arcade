# Henry Dynasty Arcade — Codebase Audit

**Audited:** 2026-06-01
**Path:** `C:\Projects\Arcade\source\henry-dynasty`
**Version:** 1.9.1 (package.json) — but `CHANGELOG.md` only documents up to v1.4 (≈5 minor versions stale)
**Stack:** Vite 5 + React 18 + TypeScript 5.7 + Tailwind + Zustand + Dexie (IndexedDB) + Framer Motion + react-router 6, PWA
**Scale:** 298 `.ts/.tsx` source files, ~64,250 lines of code, 0 unit tests
**Branding:** "Berry Kid's Arcade" (for Henry & Beckett)

---

## TL;DR

> The arcade is **architecturally ambitious and substantively complete** — 9 distinct games, IndexedDB persistence, full error boundaries, voice I/O, AI calls, PWA, accessibility hooks. The reason it *feels* buggy/unpolished is **not** the simulation cores (baseball, football, battleforge are well-built), it's **death by a thousand polish papercuts** sitting on top of solid bones:
>
> 1. **Zero lazy-loading** — every one of the ~73 routes (Three.js-free but still huge) is statically imported in `App.tsx`. First-load JS is enormous.
> 2. **~600KB+ of dead dependencies** still shipped to clients: `three`, `howler`, `recharts` are in `package.json` and **imported by zero files**. `firebase` is imported by 2 files in `src/sync/*` that don't appear to be wired into the app.
> 3. **No bundled image assets** — `public/` contains only PWA icons. Every sprite, portrait, logo, terrain tile and UI flourish is procedurally drawn at runtime in `<canvas>`, SVG, or CSS gradients. **Kenney/itch.io assets are *named* in `ASSETS.md` as a future option but have never been integrated.** This is why the look feels inconsistent across games — every game's artist is a different code path.
> 4. **Two-tier persistence inconsistency** — baseball, football, mogul, olympus get full Dexie tables with migration versioning. cosmic, temporal, potionlab, wordplay, scorekeeper, battleforge use raw `localStorage` keys. Saves silently disappear if the 5 MB quota is hit or storage is cleared.
> 5. **301 `any` casts** and **14 `useEffect(…, [])` empty-dep patterns** — at least one of which (in `Landing.tsx`) the team has *already* hit as an infinite-loop bug. There are more landmines like it.
>
> The dungeon crawler should be built as a **brand-new top-level game module** under `src/dungeon/` following the cosmic/temporal/olympus pattern, but with the cleanup wins below baked in from day 1.

---

## 1. Game Inventory

The arcade's `Landing` page lists **9 game tiles** (the user-visible truth), but several of those are *hubs* containing many sub-games. The "~29 apps" figure is **actually 73 distinct routes** registered in `src/App.tsx`, organised into 9 top-level games.

### 1.1 Top-level games (the 9 Landing cards)

| # | Game | Emoji | Route(s) | Module dir | Persistence | Engine kind |
|---|---|---|---|---|---|---|
| 1 | **Baseball – Diamond Dynasty** | ⚾ | `/baseball`, `/dashboard`, `/teams`, `/team/:id`, `/player/:id`, `/standings`, `/schedule`, `/stats`, `/freeagency`, `/draft`, `/playoffs`, `/history`, `/news`, `/settings`, `/coach`, `/allstar`, `/league`, `/save`, `/play/:gameId`, `/score`, `/training` + 8 training sub-routes, `/live` | `src/pages/`, `src/engine/`, `src/components/`, `src/scorekeeper/`, `src/generators/` | Dexie `leagues` table + `localStorage` lite backup | Full season-sim engine, ~15 files |
| 2 | **Football – Gridiron League** | 🏈 | `/football/hub`, `/football` + 7 children, `/football/game/:id` | `src/football/` | Dexie `footballLeagues` | Drive-by-drive sim |
| 3 | **Olympus – Greek RPG** | ⚔️ | `/olympus` + 7 children, `/olympus/party` | `src/olympus/` | Dexie `olympusHeroes` + `olympusAdventures` | AI text adventure, voice I/O |
| 4 | **Beckett Movie Studios (Mogul)** | 🎬 | `/mogul`, `/mogul/studio` + 5 children | `src/mogul/` | Dexie `mogulStudios` | Hollywood tycoon sim |
| 5 | **Wordplay Hub** | 💬 | `/wordplay` + **36 sub-routes** | `src/wordplay/` | `localStorage` only | AI + template library (`templates.ts` is 47 KB) |
| 6 | **Cosmic Squad – Space Combat** | 🚀 | `/cosmic` + 3 children | `src/cosmic/` | `localStorage` only | Turn-based grid combat |
| 7 | **Temporal Order – Time-travel** | 🕰️ | `/temporal` + 4 children | `src/temporal/` | `localStorage` only | AI mystery mission gen |
| 8 | **Beckett's Battle Forge** | ⚔️ | `/battleforge` | `src/battleforge/` | None — stateless | Canvas2D iso pixel-art sim |
| 9 | **Potion Lab** | 🧪 | `/potion-lab` + 3 children | `src/potionlab/` | `localStorage` only | Recipe-discovery mini-game |

Plus a non-game **Resources / Beckett's Corner** with 8 routes (training notes, journal, FitCoach, etc.).

### 1.2 Wordplay sub-games (36 — this is where most of the "29 apps" feeling comes from)

Located in `src/wordplay/pages/`:

**V1 (13 games):**
MadLibs, Jokes, QuizShow, StoryStarter, FortuneCookie, MagicEightBall, TwentyQuestions, WouldYouRather, WhatAmI, ImprovScenes, ConversationStarters, WordChain, PersonalityQuiz.

**V2 (10 games):**
Storyteller (39 KB — outlier), ChooseAdventure, MysteryBox, RapBattle, HeroMaker, LiarLiar, LyricLab, ArgumentSettler, Charades, QuietGame.

**Codex additions (13 games):**
VideoGameHelper, StoryChain, OneWordAtATime, CompanionPet, GameShow, DetectiveMystery, ExplainIt, SocialCoach, WhatHappensIf, CuriosityCamera, ScienceSidekick, AskMeAnything, JustWantTalk.

### 1.3 Module layout pattern

The "mature" games (cosmic, temporal, olympus, mogul, football, potionlab) all follow the same shape:

```
src/<game>/
  store.ts          — Zustand store + Dexie/localStorage adapter
  types.ts          — domain types
  engine(.ts|/)     — pure sim/business logic
  ai.ts             — Anthropic API wrapper (per-game)
  pages/*.tsx       — routed screens
  components/*.tsx  — reusable game widgets
  data/             — static content (recipes, eras, templates)
```

**This is the pattern the dungeon crawler should follow.** It is consistent, testable, and module-scoped.

---

## 2. Code Quality Issues

### 2.1 Bundle weight (the #1 reason it feels sluggish)

`src/App.tsx` does **130 static `import`s at the top** — every page, every component, every game's pages and components are bundled into the initial chunk. **There is not one `React.lazy()`, not one dynamic `import()`** anywhere in `App.tsx`. Combined with:

- `vite.config.ts` sets `chunkSizeWarningLimit: 1500` (1.5 MB), which strongly suggests the team already knows their main chunk is huge and silenced the warning instead of fixing it.
- **No `manualChunks` config** — every vendor lib lands in the same `vendor` chunk.

**Dead dependencies still in `package.json` (confirmed via grep — 0 imports in `src/`):**

| Lib | `package.json` version | Imports in `src/` | Estimated cost |
|---|---|---|---|
| `three` | ^0.184.0 | **0** | ~600 KB min |
| `@types/three` | ^0.184.1 | 0 | (dev only) |
| `howler` | ^2.2.4 | **0** | ~30 KB min |
| `@types/howler` | ^2.2.12 | 0 | (dev only) |
| `recharts` | ^2.13.3 | **0** | ~120 KB min |
| `firebase` | ^12.13.0 | 2 files in `src/sync/` only | ~400 KB min (modular tree-shakes some) |

Three.js was removed when BattleForge was rewritten to Canvas2D pixel-art (see `src/battleforge/ASSETS.md` and `REBALANCE-NOTES.md`) but **the dependency was never removed from `package.json`**. Same story for Howler and Recharts.

**Estimated saving from removing dead deps + adding `React.lazy` per top-level game: ~1.5 MB off first load.**

### 2.2 Known anti-patterns

| Pattern | Count (grep) | Risk |
|---|---|---|
| `any` type (`: any`, `as any`, `<any>`) | **301** | Type safety holes; AI response shapes are particular suspects |
| `useEffect(…, [])` empty deps | 14 | Stale closures, missed re-syncs, hydration races |
| `requestAnimationFrame` / `setInterval` | scattered across ~15 files | Need careful cleanup; mostly clean but `FootballHome.tsx` has 8 timers |
| `TODO` / `FIXME` / `XXX` / `HACK` | 6 | Modest — no time-bomb backlog |
| `console.*` left in code | 25 | Acceptable for a kid's local-only app, but should strip on prod build |

### 2.3 Real bugs / smells found during inspection

1. **Wordplay shared API-key key collision.**
   `src/wordplay/ai.ts:getApiKey()` resolves in order: `dd_anthropic_api_key` (canonical), then `dd_wordplay_api_key`, `dd_mogul_api_key`, `dd_olympus_api_key`. The same value will *also* be returned by `olympus`'s and `mogul`'s own resolvers, but `setApiKey()` always writes to the **per-game** localStorage key. That means **setting a key from one game does not update the others' state** until they reread localStorage. Users who set the key in one game then go to another may be told "no key configured."

2. **`MadLibs.start()` has no error path for malformed AI output that *also* has no matching local fallback.**
   In `src/wordplay/pages/MadLibs.tsx:48-58`, if the AI returns nothing parseable *and* the chosen category has no matching `MAD_LIB_TEMPLATES` entry, the fallback `MAD_LIB_TEMPLATES[Math.floor(Math.random() * MAD_LIB_TEMPLATES.length)]` works — but the user gets a story whose category does not match what they picked, with no feedback that this happened. (Several other wordplay games have a similar pattern.)

3. **`Landing.tsx` already burned by Zustand-selector returning new reference.**
   The file's own comment (lines 30-35) warns:
   > `CRITICAL: never .filter()/.map()/.sort() inside a Zustand selector — each call returns a new reference, useSyncExternalStore sees the snapshot change every render, and React infinite-loops.`
   The team already paid the price. Given **301 `any` casts** and the lack of typed selector helpers, there are almost certainly more of these latent. A repo-wide grep for `useStore(s\s*=>\s*s\.\w+\.(filter|map|sort|slice))` is warranted.

4. **CHANGELOG is 5 minor versions stale.**
   `package.json` is 1.9.1, `CHANGELOG.md` documents only up through 1.4. This means no one has a written record of what changed in 1.5 → 1.9.1 — making bug regressions hard to bisect.

5. **`Settings.tsx` is 35 KB / ~1000+ lines.**
   This is a maintainability hazard; settings sprawl tends to be where state-shape bugs hide.

6. **`olympus/ai.ts` is 97 KB.**
   At nearly 100 KB of one TS file (and 42 KB of types), Olympus is the most likely game to have hidden coupling bugs. It also imports the most files.

7. **`mogul/pages/StudioManage.tsx` (47 KB) and `wordplay/pages/Storyteller.tsx` (39 KB)** are similar single-file behemoths. These almost certainly have re-render storms; very few large components in this codebase use `React.memo` / `useMemo` / `useCallback` rigorously.

8. **No service-worker `skipWaiting` / `clientsClaim` ergonomics documented.**
   `index.html` ships a *good* 8-second boot fallback that lets users clear caches manually if a stale SW serves a broken build — which means **the team has empirically been bitten by stale-SW issues** and worked around them client-side instead of fixing the SW config. PWA `autoUpdate` mode with `vite-plugin-pwa` can deadlock new tabs on old code.

9. **`useStore` baseball selector returns full objects.**
   In `Landing.tsx`: `const league = useStore(s => s.league)` returns the whole league object (with hundreds of players, schedule, etc.). Every store mutation invalidates the entire subscription. Acceptable for a tiny screen like Landing; bad pattern when copy-pasted elsewhere.

### 2.4 Missing error handling

- `setActiveLeague(id)` in `dexie.ts` calls `localStorage.setItem` with no try/catch — Safari private mode and quota-exceeded will throw and there's no recovery.
- Anthropic AI calls (`callAI` in `wordplay/ai.ts`) **return `null` on any error and swallow the exception silently**. The UI then quietly falls back to template content. The user gets *no signal* that the AI is unreachable or out-of-credit. Several other game `ai.ts` files do the same.
- The Anthropic API key is read from `localStorage` and POSTed with `anthropic-dangerous-direct-browser-access: true`. **This is documented as dangerous by Anthropic** — the key is visible to anything that can read the page. For a local-only kid's arcade on Henry's iPad this is *acceptable* but should be called out in `README.md` (currently not mentioned).
- Voice input (`useVoiceInput` in `wordplay/voice.ts`) needs `MicErrorBanner` to surface permission errors — the component exists but is only wired up in some screens.

### 2.5 Performance hot spots

- **No `React.memo` on `GameCard`** in `Landing.tsx` (motion components don't memoize by default). Every store change on any game re-renders all 9 cards.
- **`Landing` hydrates 5 different game stores on mount** (`loadFootball`, `loadOlympus`, `loadMogul`, `loadCosmic`, `loadTemporal`) regardless of which card the user is about to click. This is ~5 Dexie reads serialised on page load.
- `BattleForge` (`BattleCanvas.tsx`) **is well-built**: DPR clamp at 2, sprite-sheet pre-warm, lerp interpolation between sim ticks, ResizeObserver, proper RAF cleanup. The 50 KB file size reflects feature scope, not bloat. **This is the highest-quality renderer in the codebase and should be the template for the dungeon crawler.**

---

## 3. Asset & Graphics Integration

### 3.1 What's actually in `public/`

```
public/
  favicon.svg              (604 B)
  icon-192.png             (4.9 KB)  — PWA icon
  icon-512.png             (15.4 KB) — PWA icon
  icon-512-maskable.png    (15.4 KB) — PWA icon
```

**That is all.** There are zero sprite folders, no Kenney pack, no itch.io art, no audio files, no fonts (fonts are loaded from Google Fonts CDN: Bebas Neue, Oswald, Anton, Russo One, Cinzel, EB Garamond, JetBrains Mono, Inter).

### 3.2 What that means in practice

**Every visual element in the arcade is generated procedurally in code:**

- **Battle Forge characters** — `src/battleforge/spriteFactory.ts` writes 64×64 pixel sprites onto offscreen `<canvas>` per archetype × team × accent color, cached. 5 archetypes (swordsman, archer, cavalry, monster, mage). 4 facings, idle/walk/attack/death frames per facing.
- **Battle Forge terrain** — `BattleCanvas.drawIsoDiamond()` fills iso tile diamonds at runtime in 5 biome variants.
- **Baseball player portraits** — `src/generators/portrait.ts` (24 KB) writes pixel-art faces.
- **Team logos** — `src/generators/logo.ts` + `logoShapes.ts` + `logoSymbols.ts` (40 KB combined) compose SVG/Canvas logos from primitives.
- **Stadium art** — `src/generators/stadiumArt.ts`.
- **Baseball/football/cosmic sprites** — `src/components/{BatterSprite, CatcherSprite, PitcherSprite, BatterAtPlate, PitcherOnMound}.tsx`, `src/cosmic/components/ShipSprite.tsx`, `src/football/components/FootballField.tsx`, `src/temporal/engine/sprites.ts`, `src/olympus/components/{HeroSprite, CompanionSprite, CharacterSprite}.tsx`, `src/potionlab/components/PotionBottle.tsx`. **All SVG / inline JSX.**
- **All UI ornaments** — Tailwind + gradients + CSS-keyframe stick figures (for drill demos).

### 3.3 Kenney / itch.io — the gap

`src/battleforge/ASSETS.md` is explicit:

> **Path chosen: A — code-rendered pixel art.**
> Every sprite drawn by the Battle Forge renderer is generated at runtime … **No external image assets are bundled or downloaded.**
>
> Should a future polish pass want to swap in higher-fidelity hand-painted tiles or unit sprites, the recommended sources are:
> - **Kenney.nl** — `https://kenney.nl/assets` (CC0)
> - **OpenGameArt.org**
> - **Liberated Pixel Cup (LPC)**

**No `public/assets/` directory exists** to hold these. **No code path loads images from `public/`** (grep for `.png`/`.jpg`/`.webp` in src returns 0). The team chose procedural rendering deliberately and never circled back.

### 3.4 Why this contributes to the "buggy/unpolished" feel

Procedural pixel art is **internally consistent within a single game** (BattleForge looks coherent because one factory draws everything), but **wildly inconsistent across games**:

- Battle Forge has detailed 64×64 isometric pixel sprites.
- Cosmic has SVG ship icons.
- Olympus has emoji-and-CSS hero portraits.
- Baseball has hand-coded canvas portraits.
- Potion Lab is mostly emojis + gradients.
- Wordplay sub-games are pure text + emoji + Tailwind colour palettes.

**The arcade looks like 9 different student projects glued together.** A user bouncing between Battle Forge → Olympus → Wordplay feels the seams.

### 3.5 The opportunity (especially for a dungeon crawler)

A dungeon crawler is *the* archetypal use case for Kenney's free packs:

- **Kenney "Roguelike Dungeon"** (CC0, 16×16) — walls, floors, doors, stairs, chests, traps, items.
- **Kenney "Tiny Dungeon"** (CC0, 16×16) — characters, monsters, NPCs.
- **Kenney "Roguelike Indoors"** (CC0) — furniture, decoration.
- **Kenney "1-Bit Pack"** or **"RPG Audio"** for SFX.

If we bring in Kenney for the dungeon crawler and use it as the **flagship art style going forward**, we can incrementally migrate the older games and unify the arcade's visual identity.

---

## 4. Structural Problems (why it feels unpolished)

Ranked by how much they degrade the "feel":

### 4.1 ⚠️ Slow first load + stale-service-worker recovery surface
- ~1.5 MB of dead vendor code (`three`, `howler`, `recharts`, large parts of `firebase`)
- No code splitting per game — choosing "Potion Lab" downloads all of Mogul, Olympus, Baseball, Football, etc.
- Boot fallback at 8 s in `index.html` says the team **already knows** the first load can stall.
- Stale SW workaround is client-side ("CLEAR CACHE & RELOAD" button) instead of a proper SW versioning strategy.

### 4.2 ⚠️ Persistence inconsistency
- Tier-1 games (baseball, football, olympus, mogul): proper Dexie tables with `version().stores()` migration ladder, dedicated save UIs, multi-slot, rename, duplicate.
- Tier-2 games (cosmic, temporal, potion lab, wordplay, scorekeeper): raw `localStorage` JSON blobs.
- Storage failures (Safari 7-day eviction, quota-exceeded, private mode) are handled in tier-1 (with a lite localStorage backup written from `mutate`/`mutateUndoable`) but **silently swallowed in tier-2**.
- The result: kid plays Potion Lab on iPad, comes back two weeks later, save is gone, no warning, no recovery.

### 4.3 ⚠️ Wide variance in art / motion polish
- BattleForge: AAA-feel for a kid's arcade — interpolated sprite motion, particles, biomes.
- Wordplay sub-games: text + emoji.
- Olympus: text + minimal CSS portraits.
- Cosmic: SVG grid.
- Same arcade, three art directions, no shared component library beyond `src/components/` (which is 95% baseball-flavoured).

### 4.4 ⚠️ No shared UI primitives across games
- Each game's `pages/*.tsx` re-invents buttons, modals, cards, tabs, transitions from Tailwind primitives. Tiny inconsistencies (font weights, border radii, focus rings, hover states) accumulate into visual noise.
- The lone shared bits — `Layout.tsx`, `Breadcrumb.tsx`, `EmptyState.tsx`, `NumberStepper.tsx`, `Tooltip.tsx`, `ConfirmDialog.tsx`, `Newspaper.tsx`, `Sparkline.tsx`, `AnimatedNumber.tsx`, `HelpButton.tsx`, `GuidedTip.tsx`, `CommandBar.tsx`, etc. — are mostly baseball-specific (`BaseballCard`, `BatterSprite`, `StatCastBaseball`, `TeamLogo`, `PlayerPortrait`).
- There is no `src/ui/` (or `src/shared/`) with `<Button variant="primary">`, `<Modal>`, `<Card accent="..." gradient="...">`, `<GameShell>`, etc. Every game's "Shell" component (`WordplayShell`, `OlympusShell`, `MogulShell`, `TemporalShell`, `ResourcesShell`, `CosmicShell`, `PotionLabShell`, `FootballShell`) is a one-off.

### 4.5 ⚠️ Documentation / process drift
- `CHANGELOG.md` 5 versions stale.
- `README.md` is tiny (~900 B) and does not mention the API-key local-storage caveat.
- `RUNBOOK.md` exists but `BOOTSTRAP.md`-style discovery is hard for a new contributor.
- No tests at all (no `__tests__`, no `*.test.ts`, no `vitest.config`). For 64 KLoC this is a significant gap.

### 4.6 ⚠️ TypeScript hygiene
- 301 `any` escape hatches.
- `tsconfig.json` is only 691 B — let me note we should ensure `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` for new code.

### 4.7 ⚠️ Three.js + Firebase + Howler ghost dependencies
Carrying ~1 MB of vendor code that no production code path uses is the single largest mechanical reason the app feels heavy.

---

## 5. Recommendations — Cleanup Before the Dungeon Crawler

Ordered by leverage. Do **1–3 first**; they're cheap and unblock everything else.

### 5.1 Quick wins (≤ 1 day, very high impact)

1. **Remove dead dependencies.**
   ```
   npm uninstall three @types/three howler @types/howler recharts
   ```
   Confirm nothing breaks (it won't — grep proved zero imports). Expected savings: **~750 KB gzipped off first load**.

2. **Audit Firebase usage.**
   `src/sync/firebase.ts` and `src/sync/heroes.ts` are the only consumers. Check whether they're actually wired in (search for `import.*from.*sync`). If they're an unfinished experiment, remove the directory and uninstall `firebase` (another ~400 KB+).

3. **Code-split top-level games with `React.lazy`.**
   In `App.tsx`, every top-level game's pages should be `React.lazy(() => import("./<game>/pages/..."))` wrapped in `<Suspense>` with a skeleton. Initial bundle becomes the Landing + small chrome; each game loads on click. **Single biggest perceived-speed win available.**

4. **Add `manualChunks` in `vite.config.ts`** to split vendor sanely:
   ```ts
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           react: ["react", "react-dom", "react-router-dom"],
           motion: ["framer-motion"],
           db: ["dexie", "zustand", "immer"],
           icons: ["lucide-react"],
         },
       },
     },
   },
   ```

### 5.2 Medium wins (1–3 days)

5. **Build a shared `src/ui/` primitive kit.** Even 10 components — `Button`, `Card`, `Modal`, `GameShell`, `Tabs`, `Pill`, `Toast`, `StatBlock`, `EmptyState`, `LoadingSkeleton` — will sand off most cross-game visual inconsistency and become the dungeon crawler's foundation.

6. **Unify persistence under Dexie for the tier-2 games.** Add tables for `cosmicSaves`, `temporalSaves`, `potionLabSessions`, `wordplayHistory`, `scorecards` (already exists), and `dungeonRuns`. Pattern off `src/store/index.ts`'s `mutate` / `mutateUndoable` / `writeLocalStorageBackup`.

7. **Strip `any` casts from AI-response parsing first** — that's where they're most dangerous. Define `zod` schemas (or hand-rolled type guards) for the JSON each `parseJSON<T>()` is expected to return.

8. **Strip `console.*` on production builds** via Vite `esbuild.drop: ["console", "debugger"]`.

9. **Bring `CHANGELOG.md` current to 1.9.1** — even a one-liner per version. Future you will thank present you when something regresses.

10. **Re-audit the 14 `useEffect(…, [])` empty-deps for hydration races**, especially in store-loader hooks (`Landing.tsx`'s mega-`useEffect`, the per-game `loadFromDb`s).

### 5.3 Bigger wins (1–2 weeks; do after dungeon crawler ships once)

11. **Adopt Kenney "Roguelike Dungeon" / "Tiny Dungeon" packs as the arcade's flagship art style.** Put them in `public/assets/kenney/<pack-slug>/` with a `LICENSE.txt` (CC0) and a manifest. Build a `src/ui/Sprite.tsx` component that knows how to load a tile by name and reuse it. Migrate Battle Forge's terrain to those tiles as a polish pass; let the unit sprites stay procedural where they're working.

12. **Stand up Vitest** with even 10 smoke tests:
    - `migrate()` in `src/store/index.ts` handles each version-bump path
    - `simulation.ts` `tickSimulation()` is deterministic for a given seed
    - `mulberry32(seed)` is stable
    - `parseJSON()` rejects malformed AI output
    - `getApiKey()` resolves through every fallback
    - Dexie schemas open at every version

13. **PWA service-worker versioning.** Move from `registerType: "autoUpdate"` to a deliberate "new version available — reload to update" toast. Removes the need for the 8-second `index.html` fallback as a primary recovery path.

---

## 6. Where to Build the Dungeon Crawler

### 6.1 Location

```
src/dungeon/
  store.ts             — Zustand + Dexie adapter (mirrors src/cosmic/store.ts ergonomics; adds undo stack and lite localStorage backup like src/store/index.ts)
  types.ts             — Run, Floor, Tile, Entity, Item, StatusEffect, etc.
  engine/
    fov.ts             — symmetric shadowcasting (compact, well-known algo)
    pathfinding.ts     — A* on the grid for monsters
    procgen.ts         — BSP or rooms+corridors floor generator (seeded)
    combat.ts          — pure damage/turn-resolution functions
    rules.ts           — turn loop, action validation
  ai.ts                — Anthropic wrapper (per-room flavour text, boss banter) — fully optional, game playable without it
  data/
    tilesets.ts        — Kenney "Roguelike Dungeon" tile id → asset path map
    monsters.ts        — monster definitions
    items.ts           — item definitions
    floors.ts          — floor themes (sewer / catacombs / library / forge / throne)
  pages/
    DungeonHub.tsx     — landing card detail / save-slot picker / new run setup
    Run.tsx            — the main playable screen (grid + HUD + log)
    RunOver.tsx        — victory / death recap
  components/
    DungeonShell.tsx   — chrome + back-to-arcade + save indicator + theme
    DungeonGrid.tsx    — Canvas2D renderer (lifted from BattleCanvas patterns)
    DungeonHUD.tsx     — HP / mana / inventory bar
    DungeonLog.tsx     — scrolling combat log
    InventoryPanel.tsx — shared with Olympus? evaluate, fork if needed
```

Add the route in `App.tsx` lazily:

```ts
const DungeonHub = lazy(() => import("./dungeon/pages/DungeonHub"));
const Run = lazy(() => import("./dungeon/pages/Run"));
const RunOver = lazy(() => import("./dungeon/pages/RunOver"));
```

```tsx
<Route path="/dungeon" element={<R><Suspense fallback={<GameSkeleton/>}><DungeonHub/></Suspense></R>} />
<Route path="/dungeon/run/:slotId" element={<R><Suspense fallback={<GameSkeleton/>}><Run/></Suspense></R>} />
<Route path="/dungeon/run/:slotId/over" element={<R><Suspense fallback={<GameSkeleton/>}><RunOver/></Suspense></R>} />
```

And the Landing card:

```tsx
<GameCard
  emoji="🗝️"
  name="Dungeon Crawler"
  subtitle="Roguelike Descent"
  description="Descend procedurally generated dungeons. Permadeath runs. Treasure, traps, terrible things, and the soft glow of Kenney pixel tiles."
  ...
/>
```

### 6.2 Architecture pattern — the recipe

**Follow the BattleForge + cosmic hybrid.** BattleForge for the renderer, cosmic for the run/mission scaffolding. Concretely:

1. **Pure-function engine, side-effect-free renderer, Zustand for game state.**
   - `engine/` exports `step(state, action) → newState` and only that. No DOM, no localStorage, no fetch. Trivially unit-testable.
   - `store.ts` owns the current `Run`, persists via Dexie, exposes `useDungeon()` hooks. Mirrors the baseball-store undo stack + localStorage lite backup pattern.
   - `DungeonGrid.tsx` reads from the store and draws onto a single `<canvas>`. Uses the **exact patterns from `src/battleforge/BattleCanvas.tsx`**: DPR clamp at 2, `imageSmoothingEnabled = false`, `image-rendering: pixelated`, ResizeObserver-driven resize, single RAF loop, sprite-sheet cache, depth-sorted draw.

2. **Use Kenney art from day one.**
   - Put `public/assets/kenney/roguelike-dungeon/` (tiles) and `public/assets/kenney/tiny-dungeon/` (characters) in the repo.
   - Add `public/assets/kenney/LICENSE.txt` (CC0, credit Kenney as good practice).
   - Build a tiny `loadTileset(url)` → `HTMLImageElement` loader that warms a sprite-sheet `Map<TileId, {sx,sy,sw,sh}>` at game start and is **awaited inside the `DungeonHub` "New Run" button** so the renderer never has to defensively check for half-loaded textures.

3. **Seeded determinism.**
   - Floor generation, mob spawning, loot drops all take a `seed: number` from the run state. Reuse `mulberry32` from `BattleCanvas.tsx`.
   - Means runs are replayable, debuggable, and "share this seed" becomes a feature.

4. **Strict TS, no `any`.**
   - Add an override in `tsconfig.json` or a per-folder `tsconfig.dungeon.json` with `noUncheckedIndexedAccess: true`. This module starts clean.

5. **AI is sprinkled, never required.**
   - Per-room flavour text + boss banter via `ai.ts` → Anthropic, but with `await Promise.race([call, timeout(2000)])` and a rich local fallback library so latency or a missing API key never blocks gameplay. Olympus and Temporal already paid this tax — copy the pattern, learn from their `try/catch` swallow.

6. **Test the engine.**
   - At least: floor generator produces a connected map; FoV is symmetric; combat is deterministic; save/load round-trips identically. Vitest, ten tests, two hours of work. This is the test bed for the rest of the arcade's eventual test suite.

7. **Lazy-load.**
   - Static import only `DungeonHub` (small). `Run` (the renderer + engine + tileset loader) is `React.lazy`. The dungeon's bundle never touches a player that never clicks the card.

8. **Use the shared `src/ui/` kit if you build it first** (recommendation 5). Otherwise the dungeon crawler will accidentally introduce **a tenth visual style** to the arcade.

### 6.3 What *not* to do

- ❌ Don't pull in a roguelike framework (rot.js, etc.). The Vite bundle is already heavy and rolling your own FOV + A* is < 200 lines.
- ❌ Don't try Three.js again. Canvas2D with Kenney tiles will look better on iPad than procedural 3D and ships in a fraction of the bundle.
- ❌ Don't generate dungeon maps with the AI. Procgen is solved; AI for content (item names, boss taunts) only.
- ❌ Don't put dungeon state in the existing baseball/football stores. Module-scope only.
- ❌ Don't ship without lazy-loading. The arcade already has a first-load problem; don't compound it.

---

## 7. Severity Matrix

| Issue | Severity | Effort | Touch before dungeon crawler? |
|---|---|---|---|
| Dead deps (`three`, `howler`, `recharts`, possibly `firebase`) | **High** | 30 min | **Yes** |
| No `React.lazy` on routes | **High** | 2-3 hr | **Yes** (do dungeon lazy from day 1; backfill others same PR) |
| Vendor `manualChunks` | **Medium** | 30 min | Yes |
| Persistence inconsistency (localStorage tier-2 games) | **Medium** | 1 day | Defer; dungeon should be Dexie from day 1 |
| 301 `any` casts | Medium | Days | Defer; keep dungeon at zero |
| Visual / UI primitive sprawl | **Medium** | Days | Optional but high payoff if done first |
| No Kenney assets bundled | **High** for cohesion | 1 day | **Yes** — adopt for dungeon and unify going forward |
| `useEffect(…, [])` audit | Low-Medium | 2-3 hr | Defer |
| CHANGELOG drift | Low | 1 hr | Yes (cheap) |
| No tests | Medium | 1 day for initial suite | Add as part of dungeon work |
| Stale-SW workaround instead of fix | Low (workaround exists) | 1 day | Defer |
| Wordplay key-collision UX | Low | 1 hr | Defer |

---

## 8. One-Sentence Verdict

> The foundation is strong, the simulation cores are real, and the polish gap is **almost entirely tractable in 2–3 days of cleanup** before the dungeon crawler lands — the dead deps, lazy routes, vendor chunking, and a shared UI primitive kit will, *by themselves*, make the existing 9 games feel meaningfully snappier and more cohesive, without changing a single piece of game logic.
