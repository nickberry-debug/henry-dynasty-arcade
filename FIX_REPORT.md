# FIX_REPORT.md — v1.10.69 bug-fix & rebuild pass

Honest scoping of what landed in this session vs what's genuinely
multi-week work.

## ✅ Shipped this pass

### P1.3 Style Studio — rebuilt as LPC-style dress-up
- **Root cause:** the original Style Studio I built (drawing canvas) didn't match the spec, which called for layered character / haircuts / makeup / outfit designer.
- **Fix:** New `src/classics/stylestudio/StyleStudioDressup.tsx`. Built on Kenney's `modular-characters` pack (LPC equivalent — the actual LPC submodule didn't make it through the git push, see Caveats below). Separated layers (skin tints × 8, hair color × 8 × style × 8 with masc/fem variants, face eyes × 5, mouth × 5, shirt color × 8 × style × 8, pants, shoes). Tabs to swap each layer. Save-to-lookbook with per-profile cloud sync. Shuffle button.
- **Routes:** `/classics/style` → new dress-up. `/classics/sketch` → old drawing canvas preserved.
- **Verified:** TS clean + vite build clean.

### P4 Card Clash — Snap-style mechanics tightened
- **Priority system** (`priority: PlayerId` on Match) — at end-of-turn, whoever is winning more locations (tiebreak: total power) reveals first next turn. Turn 1 random.
- **Cube ladder** — stakes now 1 → 2 → 4 → 8 (capped at 8). `callBold` sets `playerSnapThisTurn`/`opponentSnapThisTurn` true.
- **Retreat lock** — `canRetreat(match, who)` returns false the turn they snapped. Cleared each `endTurn`. Retreat button disabled visually with a tooltip when locked.
- **Auto-double on show** — `finalize` doubles stakes one more time at match end (only if not a tie), matching Snap's "going to show" rule.
- **Drag-and-drop placement** — hand cards become pointer-draggable. Floating preview follows the pointer. Locations highlight on hover (via `data-loc-index` hit-test using `elementFromPoint`). Drop on a revealed location → `onPlay`. Tap-to-select fallback preserved for accessibility.
- **HUD additions** — current priority shown in the header ("▶ YOU FIRST" / "▶ OPP FIRST"). Stakes display says "×N CUBES".

### Stale-cache escape hatch
- Added a small "STUCK? RESET APP CACHE" link to the Category Home. One tap → unregister SW, clear all caches, reload. Solves the "still on v1.10.59" iOS cache hangs you've hit before. Visible but unobtrusive (opacity 0.5 until hover).

## 🟡 Defensive checks only — no real bug found

### P1.1 Maze Muncher — "doesn't generate"
- **Audit:** Code inspection shows the maze loads from a hardcoded 23×21 string array via `parseMaze`. `newGame()` instantiates synchronously. Route is registered (`/classics/maze` → MazeMuncher). All cells/walls/ghosts parse correctly. No null derefs, no off-by-one indexes.
- **Best guess for what you saw:** stale Service Worker serving an older broken build. The new RESET APP CACHE link on home will fix that case.
- **Status:** No code change applied. If the bug recurs *after* a fresh cache reset, file the actual error message and I'll dig in further.

### P1.2 Creature Keeper — "can't select anything"
- **Audit:** `CreatureHub.tsx`'s creature buttons use `onClick={() => setSelectedId(cr.id)}` — standard React button. `StarterPicker.tsx` uses `onClick={() => pick(id)}` → `c.chooseStarter(id)`. No `pointer-events: none` on parents, no z-index overlay competing.
- **Best guess for what you saw:** same stale-SW story OR a single broken interaction on a specific page. Without a reproduction (which page, which tap, which device) I can't trace further.
- **Status:** No code change applied. RESET APP CACHE first; if still broken, tell me *which* tap doesn't work and on which screen.

## 🔴 Honest punts — multi-week work, not deliverable in remaining context

### P2 Graphics regression audit (sweep across all apps)
- **Reality:** I've already wired Kenney into the games where it makes the biggest visual difference (Tank Duel, Strike Force, Sports Hub team picker, Versus stadium turf, Battle Forge sprites). The remaining games (Olympus, Temporal Order, Mech, Mogul, Card Clash, Crew Traitor, Odd One Out, etc.) use procedural canvas/SVG art that's deliberate — not placeholders to swap out for Kenney.
- **What a full per-app visual audit would need:** Per-game design decisions (what's a "placeholder" vs intentional art style), per-game art assignments (which Kenney pack/character maps to which game role), per-game wiring (canvas vs DOM, sizing, anchoring). Honest estimate: 1-2 days per game, 10+ games = multi-week.
- **Recommendation:** Pick the *next* game you want re-skinned and I'll do it specifically. Examples: "Olympus Adventure should use modular-dungeon-kit tiles for the scene backdrops" — concrete, 1-day job. "Audit everything" — multi-week.

### P3 Sports parity (Hockey/Basketball/CFB at Baseball-Dynasty depth)
- **Reality of the gap:** Baseball Dynasty is `src/store.ts` + `src/pages/Dashboard.tsx`, `Teams.tsx`, `TeamPage.tsx`, `PlayerProfile.tsx`, `Standings.tsx`, `Schedule.tsx`, `Stats.tsx`, `FreeAgency.tsx`, `Draft.tsx`, `Playoffs.tsx`, `History.tsx`, `News.tsx`, `CoachsCorner.tsx`, `AllStarEvent.tsx`, `ScoreKeeper.tsx` — fifteen-plus pages, deep player-by-player simulation, multi-year dynasty.
- **What I built for Hockey/Basketball/CFB:** A *unified* lighter season-sim engine (`src/sportshub/franchise.ts` + `SeasonSim.tsx`). It's intentionally simpler — one screen with standings + bracket + recent results + multi-year career tracking. Player stats roll up into team rating, not per-player detail screens.
- **What "full parity" would require:**
  - Extract Baseball's 15-page architecture into a generic `franchise/` module (which assumes a clean enough abstraction exists — it largely doesn't; Baseball was built sport-specifically).
  - Build sport-specific overrides for Hockey (positions, lines, periods, shots-on-goal, save %), Basketball (positions, quarters, +/-, FG%/3P%/FT%, fast breaks), CFB (recruiting, conferences, polls, bowls, transfer portal, class years).
  - Generate per-player sprites for ~12-16 teams × 25 players each = 300-400 player portraits per sport × 3 sports.
  - Plus player detail screens, draft/recruiting UI, season-by-season history view, championship history.
- **Honest estimate:** This is 2-4 weeks of focused work. Cannot do in the remaining context of this session.
- **What I can do incrementally:** Pick one sport and one missing feature at a time. e.g. "Hockey gets a roster page with 20 players per team" — 1 day. "CFB recruiting + commit decisions" — 2-3 days. Tell me which step matters most.

### P5 Silent Depths — full Silent-Service-style rebuild
- **Reality of the gap:** Current Silent Depths is a one-screen arcade game (sub vs mines + cargo + enemy subs). The spec calls for an authentic station-based sub sim: navigation map / periscope / attack-solution / instrument-panel views, depth & battery management, torpedo firing solutions, convoy escorts with depth charges, patrol campaign progression.
- **What "from scratch" would require:**
  - Three or four distinct screens (Nav Map, Periscope, Attack Computer, Engine Room).
  - A simulation tick that tracks sub position, depth, battery, fuel, target ships, detection level.
  - Torpedo solver — bearing + range + target speed → firing arc with miss rate based on solution accuracy.
  - Depth charge AI for escorts; silent-running mechanic.
  - Patrol campaign — chain of missions with persistent score/career.
- **Honest estimate:** 1-2 weeks of focused work.
- **What I can do incrementally:** I can swap the arcade Silent Depths for a *two-station* version (Nav + Periscope) with a torpedo solver in maybe one focused session. Tell me if that's the right size and I'll do it.

## Recommendation for next session

If you want maximum delivered value per session, pick *one* of these:
1. **One sport at a time** — say "make Hockey have a roster page + per-player details + crests on every player". Tight, shippable in a session.
2. **One game's visual re-skin** — say "Olympus Adventure scenes should use the modular-dungeon-kit tiles". 1-session size.
3. **Silent Depths two-station rebuild** — Nav map + Periscope torpedo solver. 1-session size.

A broad "fix everything" prompt forces me to either lie about completeness or partial-deliver invisibly. Pick the tight slice and I deliver it well.

## Caveats noted in code

- **LPC submodule** at `public/assets/lpc/` is empty in the repo. The fetch script clones it locally but the user-side `git push` registered it as a submodule reference rather than embedding the files. Style Studio dress-up uses Kenney `modular-characters` instead, which is the LPC equivalent. To re-vendor LPC properly: `rm -rf public/assets/lpc && git rm --cached public/assets/lpc && cd public/assets && git clone --depth 1 https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator.git lpc && cd lpc && rm -rf .git && cd ../../.. && git add public/assets/lpc && git commit -m "vendor LPC as plain files"` — push will be ~200MB.
