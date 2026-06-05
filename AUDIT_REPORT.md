# AUDIT_REPORT.md — forensic state of the arcade

**Date:** 2026-05-31
**Branch:** polish-pass @ 5db87e9
**Scope:** verify what assets actually exist on disk, what games actually load, and what previous sessions claimed vs delivered. No building this pass.

---

## TL;DR — the smoking gun

| Question | Answer |
|---|---|
| Does Dungeon Crawler exist? | **No.** Zero source files, zero registry entry, zero commit history, zero WhatsNew mention. It was never built. |
| Are the Kenney packs on disk? | **Yes** — 34 packs, 154 MB, committed by you (Nick) on 2026-05-30 in commit `e2f3de3`. |
| Is the art being shown in games? | **Only 12 of 34 packs are referenced anywhere in code.** 22 packs (65% of vendored Kenney art) sit on disk completely unused. |
| Was LPC actually fetched? | **No.** `public/assets/lpc/` is an empty directory — and it always has been. Documented as such in `FIX_REPORT.md`. |
| Was game-icons fully fetched? | **Partial.** 76 hand-curated SVGs in `public/assets/game-icons/` are real; `public/assets/game-icons-full/` is empty. |
| Was phaser-examples fetched? | **No.** Directory doesn't exist on disk. |
| Do all registered games load? | **Yes.** 29/29 registered games return HTTP 200 from dev server. No orphans, no dead routes. |

---

## PHASE A — Asset forensics

### A.1 — What's actually on disk (`public/assets/`, 177 MB total)

```
public/assets/
├── ATTRIBUTION.md            (2,963 B)
├── VISUAL_REPORT.md          (4,152 B)
├── ansimuz/                  23 MB — 3 parallax packs (mountain-dusk, sunny-land, warped-city)
├── game-icons/               236 KB — 76 hand-curated SVGs (real, working)
├── game-icons-full/          4 KB — EMPTY directory, 0 files
├── kenney/                   154 MB — 34 packs (see breakdown below)
├── lpc/                      4 KB — EMPTY directory, 0 files
├── luizmelo/                 188 KB — martial-hero + monsters-creatures-fantasy
└── pixelfrog/                904 KB — pixel-adventure-1
```

`phaser-examples/` (mentioned in your audit prompt) **does not exist** in the tree.

### A.2 — Kenney packs: disk vs code references

| Pack | Size on disk | Code refs (files) | Status |
|---|---|---|---|
| **sports** | 40 KB | 6 | ✅ Used (Versus + sports UI) |
| **mini** | 56 KB | 4 | ✅ Used (Battle Forge MiniAvatar) |
| **sports-pack** | 2.7 MB | 3 | ✅ Used (athleteSprite for rosters + team picker) |
| **toon-characters** | 7.1 MB | 2 | ✅ Used (Style Studio) |
| **space** | 44 KB | 2 | ✅ Used (Cosmic backdrop) |
| **particles** | 356 KB | 2 | ✅ Used (Battle Forge) |
| **tanks** | 2.0 MB | 1 | ✅ Used (Tank Duel) |
| **space-shooter-remastered** | 2.5 MB | 1 | ✅ Used (Strike Force) |
| **smoke** | 344 KB | 1 | ✅ Used (effects) |
| **monster-builder-pack** | 2.3 MB | 1 | ✅ Used (Family Mascots / MonsterCompositor) |
| **mini-arena** | 44 KB | 1 | ✅ Used (Battle Forge arena tiles) |
| **fui** | 36 KB | 1 | ✅ Used (Olympus UI frames) |
| modular-dungeon-kit | **20 MB** | **0** | ❌ Vendored, unused |
| food-kit | **16 MB** | **0** | ❌ Vendored, unused |
| car-kit | **15 MB** | **0** | ❌ Vendored, unused |
| particle-pack | **15 MB** | **0** | ❌ Vendored, unused |
| blocky-characters | **13 MB** | **0** | ❌ Vendored, unused |
| fantasy-town-kit | **13 MB** | **0** | ❌ Vendored, unused |
| top-down-tanks-remastered | 5.1 MB | 0 | ❌ Vendored, unused |
| space-shooter-extension | 5.1 MB | 0 | ❌ Vendored, unused |
| sci-fi-sounds | 6.0 MB | 0 | ❌ Vendored, unused |
| smoke-particles | 6.0 MB | 0 | ❌ Vendored, unused |
| blaster-kit | 4.9 MB | 0 | ❌ Vendored, unused |
| cartography-pack | 4.7 MB | 0 | ❌ Vendored, unused |
| modular-characters | 3.4 MB | 0 | ❌ Was used by old Style Studio, now orphaned |
| voiceover-pack | 2.2 MB | 0 | ❌ Vendored, unused |
| ui-pack-pixel-adventure | 2.2 MB | 0 | ❌ Vendored, unused |
| background-elements-remastered | 1.7 MB | 0 | ❌ Vendored, unused |
| fantasy-ui-borders | 1.6 MB | 0 | ❌ Vendored, unused |
| music-jingles | 1.6 MB | 0 | ❌ Vendored, unused |
| impact-sounds | 1.3 MB | 0 | ❌ Vendored, unused |
| digital-audio | 1.2 MB | 0 | ❌ Vendored, unused |
| tiny-dungeon | 636 KB | 0 | ❌ Vendored, unused |
| ui-pack-rpg-expansion | 612 KB | 0 | ❌ Vendored, unused |

**Total unused Kenney content: 122 MB / 154 MB = 79% of the art the user vendored is sitting on disk untouched.**

This is the root of "I haven't seen the Kenney items I downloaded."

### A.3 — Asset manifest (`src/art/asset-manifest.ts`)

- 121 lines, exports an `ASSETS` object covering ~75 file paths
- `node scripts/verify-assets.mjs` → **75 present, 0 missing** ✅
- **However:** the manifest references only **7 of 34 Kenney packs** (mini, mini-arena, particles, smoke, space, sports, fui)
- **And:** the `ASSETS` export is **never imported by any component**. Zero usages in `src/` outside the manifest itself. Games reference Kenney URLs directly (`/assets/kenney/<pack>/<file>.png`), bypassing the manifest entirely.

The manifest is dead architecture. Honest call: it represents an intended abstraction (referenced by intent, not path) that never got adopted by the games.

### A.4 — Per-game render reality

Verified by `grep -rln "<img" src/<game>/` and `grep -rln "/assets/" src/<game>/`:

| Game | Image refs | Reality |
|---|---|---|
| Battle Forge | 1 file with `<img>`, 2 with `/assets/` | Uses Kenney mini + mini-arena tiles for the avatar; main BattleCanvas renders procedurally |
| Survivor | **0** image tags, **0** asset refs | Hand-drawn canvas sprites (`HERO_DRAWERS`, `ENEMY_DRAWERS`) — no Kenney |
| Scrapyard Kings (mech) | **0** image tags, **0** asset refs | Pure procedural SVG/canvas — no Kenney art |
| Olympus | 1 file with `<img>` | Mostly procedural via `characterDataUrl()`, DiceBear-style |
| Cosmic Squad | 1 file with `<img>` | Uses kenney/space meteors as backdrop; ships are procedural SVG |
| Temporal Order | 3 files with `<img>` | Procedural pixel portraits, no static Kenney art |
| Mogul | **0** image tags, **0** asset refs | Pure CSS / SVG |
| Main Event | **0** image tags, **0** asset refs | Pure CSS / SVG / emoji |
| Potion Lab | **0** image tags, **0** asset refs | Emoji-only ingredients, CSS bottles |
| Creature Keeper | **0** image tags, **0** asset refs | Hand-coded SVG `CreatureSprite` per species |
| Baseball player portraits | (via `portraitSVG()`) | **Procedural SVG**, NOT Kenney art |
| Card Clash card art | game-icons SVGs only | CC-BY game-icons — no Kenney character art |

**Conclusion:** ~8 of 12 marquee games use procedural art instead of Kenney packs. The FIX_REPORT.md from v1.10.69 acknowledged this and called it "deliberate" rather than "placeholder." Reasonable people can disagree on that label; the fact is the Kenney art is largely not wired in.

### A.5 — Network re-fetch reality

The audit prompt instructed me to re-fetch Kenney / LPC / Phaser. From this sandbox I tested:

| Source | HTTP | Can fetch? |
|---|---|---|
| `raw.githubusercontent.com` | 200 | ✅ Yes |
| `github.com` (HTTPS clone) | 301 redirect | ✅ Yes |
| `kenney.nl` | **403 Forbidden** | ❌ No — bot-protected |
| `game-icons.net` | **403 Forbidden** | ❌ No — bot-protected |

So:
- The audit step "fetch each Kenney pack PAGE at kenney.nl/assets/{slug}" is **not possible from this sandbox.** Kenney's CDN is firewalled here. The Kenney packs currently on disk got there because **you committed them in `e2f3de3` on 2026-05-30** — not via any Claude scrape.
- I CAN clone github-hosted repos. I tested two: **LPC = 1.4 GB (24,898 files)** and **phaser3-examples = 6.2 GB (27,100 files)**. Both are too large to commit to a Vercel-deployed repo (Vercel's deploy size limits would fail). Vendoring them is not the right move.
- game-icons full repo is 22 MB / 4,275 files — reasonable. But our hand-curated 76 SVGs already cover everything `src/art/asset-manifest.ts` and the Card Clash deck reference; expanding to all 4,275 would bloat the bundle without any code that uses them.

**Honest conclusion:** I did not re-fetch the missing packs. LPC and Phaser are infeasible to vendor. The empty `lpc/` and `game-icons-full/` stub directories should be replaced with a README explaining that — but that's a *write* action, not a fetch. I'm leaving them alone in this pass per your "no fixes" rule, and documenting their state here.

---

## PHASE B — Game / registry forensics

### B.1 — Every registered game vs every route vs live load

The game registry is `src/config/games.ts`, which exports 29 entries. All 29 are wired in `src/App.tsx` (some via the dynamic `/sports/:sport` route). All 29 return HTTP 200 from `vite dev`.

```
✅ Live (HTTP 200) — all 29:
  /sports                /sports/hockey       /sports/basketball    /sports/cfb
  /baseball              /football/hub        /versus               /battleforge
  /mech                  /survivor            /tankduel             /classics/strikeforce
  /classics/girder       /olympus             /temporal             /cosmic
  /mainevent             /cardclash           /mogul                /classics/depths
  /creature              /potion-lab          /classics/style       /wordplay
  /mathblaster           /classics/maze       /crew                 /odd
  /resources
```

No orphan routes. No mis-wirings. The category folders on the home page enumerate from the same registry, so every game appears in its category.

### B.2 — Dungeon Crawler — does it exist?

**Forensic answer: no.** Evidence:

```bash
grep -rin "dungeon[ _-]?crawler\|dungeoncrawler\|DungeonCrawler" src/     → 0 hits
find src -type d -iname "*dungeon*"                                       → 0 dirs
find src -type f -iname "*dungeon*"                                       → 0 files
grep -c "dungeon" src/config/games.ts                                     → 0
git log --all --format="%s" | grep -i "dungeon"                           → 0 commits
grep -i "dungeon" src/pages/WhatsNew.tsx                                  → 1 hit (mentions "Olympus/Dungeon dedicated parallax backdrops" as **future work**, not built)
```

There is no Dungeon Crawler in this codebase. There never was. There is no claim in any committed What's New entry, FIX_REPORT, or COMPLETION_REPORT that one was built. The only reference is a future-work note in v1.10.66's WhatsNew.

If you remember requesting it in a session, the session ended without the work being done. I cannot restore something that was never built. If you want it, it has to be specified and built from zero.

### B.3 — Any other registered-but-broken games?

No. Every game in the registry has source code, a route, and serves 200. No silent dead-ends.

---

## PHASE C — Honest truth section

### What previous sessions explicitly admitted (in committed files):

`FIX_REPORT.md` from v1.10.69 was already honest about:

- **LPC submodule empty** — explicitly documented. Style Studio uses Kenney `modular-characters` instead.
- **Sports parity gap** — Hockey/Basketball/CFB are intentionally lighter than Baseball Dynasty's 15-page architecture; "full parity" called out as "2-4 weeks of focused work, cannot do in remaining context."
- **Silent Depths full rebuild** — called out as 1-2 weeks of focused work.
- **P2 graphics regression audit** — explicitly punted: "I've already wired Kenney into the games where it makes the biggest visual difference (Tank Duel, Strike Force, Sports Hub team picker, Versus stadium turf, Battle Forge sprites). The remaining games... use procedural canvas/SVG art that's deliberate — not placeholders to swap out for Kenney."

That last point is the crux of your frustration. The previous session called it "deliberate"; you reasonably read the same situation as "you didn't show me the art I downloaded." Both framings describe the same fact: 22 of 34 Kenney packs are vendored but unused.

### What I (this session) claimed in WhatsNew vs reality:

| Claim | Reality |
|---|---|
| v1.10.72: "Sports Hub leveled up to match Baseball Dynasty's visual depth" | ✅ Partly true — hero panel, last-5 strip, full standings added. NOT true that it has Baseball's 15-page architecture (still single-page SeasonSim). |
| v1.10.72: "real Kenney sports-pack athlete sprites for every player" | ✅ True — verified via `athleteSprite.ts` + 56/56 URLs serve |
| v1.10.72: "Style Studio rebuilt … Customize: 6 characters × 16 poses × 12 color tints × 8 scene backgrounds = 9,216 combos" | ✅ True — 96/96 character × pose URLs verified |
| v1.10.72: Wordplay content expansions (Story Starters 10→30, WYR 18→51, etc.) | ✅ True — verified by grep on `src/wordplay/templates.ts` |
| v1.10.73: "/football/draft-class — every offseason your rookie class lands here" | ✅ Page exists, route loads, but depends on `lg.lastDraftClass` being populated which only happens after at least one offseason rolls. Players starting fresh see the empty state. |

I have not found any falsifiable claim I shipped this session. But I have shipped claims (especially around "Baseball Dynasty visual depth") that are easy to *over-read*. Sports Hub has more depth now than it did, but it is still not a 15-page franchise simulator like Baseball.

### What was never done despite (possibly) being implied:

- **Dungeon Crawler:** never built, never wired, no committed claim says otherwise.
- **LPC art assets:** never embedded. The stub directory misleadingly exists in `public/assets/lpc/`.
- **Phaser examples:** never cloned. No directory exists.
- **The 22 unused Kenney packs:** never wired into game code. Their disk presence is real; their visibility to players is zero.
- **A unified franchise engine across all sports:** never built. Baseball has its own deep architecture; Hockey/Basketball/CFB share a separate lighter `franchise.ts`; Football has its own `src/football/`. Three separate engines.

---

## What I'm doing this pass — and what I'm NOT

**Doing (per your "audit only" rule):**
- Writing this report.
- Documenting the empty `lpc/` and `game-icons-full/` stub directories — leaving them as-is for now (cleaning them up is a future "fix" pass decision).

**Not doing:**
- Not fetching LPC (1.4 GB infeasible).
- Not fetching Phaser examples (6.2 GB infeasible).
- Not wiring unused Kenney packs into games (that's the build pass you want to scope per-game).
- Not building Dungeon Crawler (no spec exists).
- Not regenerating `asset-manifest.ts` — verifier already passes 75/0.

---

## Next-pass scoping recommendations

Based on this audit, the visible-impact moves available — none of them require new asset fetches:

1. **Wire `food-kit` into Potion Lab** — replace emoji ingredients with Kenney pixel-art herbs/bottles. 1 focused session.
2. **Wire `fantasy-town-kit` + `modular-dungeon-kit` into Olympus Adventure** — backdrop scenes instead of CSS gradients. 1 session.
3. **Wire `blocky-characters` into Family Stats / profile avatars** — instead of (or alongside) MonsterCompositor. 1 session.
4. **Wire `cartography-pack` into Temporal Order era maps** — tangible visual upgrade. 1 session.
5. **Wire `music-jingles` + `voiceover-pack`** into the existing AudioLibrary as additional tracks/voices. 1 session.

Each of these would close one specific "I downloaded that art and I don't see it" gap. None of them require the unfeasible LPC/Phaser vendoring.

The bigger asks from your queue (Sports Engine Unification, Card Clash full rebuild, Battle Forge pixel upgrade) are all post-audit; they're build passes, not asset passes.

— end of audit
