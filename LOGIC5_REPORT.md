# Logic Fix Batch — 5 items (v1.11.2)

Five logic/gameplay fixes across five different games. All headless-verifiable (40/40 assertions pass). Card art is excluded per scope (handled separately).

---

## ⚠️ Scope notes surfaced

1. **Item 5 (3D Dungeon) needs iPad confirm.** The facing math, zoom level, and fog-of-war state are headless-verified. The visual result — character now faces correctly while moving, camera frames the dungeon more comfortably, undiscovered rooms hidden — is **device-only.** Open `/dungeon3d/run` on the reporting iPad.
2. **Item 1 (20Q) AI-side behavior depends on Claude obeying the new stage prompt.** I added explicit phase markers (`PHASE 1: WIDEST SPLITS`, `PHASE 2: CATEGORY NARROWING`, `PHASE 3: SPECIFIC ATTRIBUTES`) tied to question number. The tiered fallback bank is deterministic and verified, but the AI's questions when a key is present are model-driven — a session where Claude ignores the stage hint would still produce odd ordering. The deterministic fallback covers the no-key path AND the AI-repeat path; the stage prompt covers the AI-cooperating path. Multi-layer defense.
3. **Item 3 (Card Clash tap-to-reveal) — card art is explicitly NOT addressed this pass.** Per user scope: tap-to-reveal is logic only. The existing CSS gradient + game-icons SVG card visuals are unchanged; the modal shows full ability text + stats. Real card illustrations are a separate art pass.
4. **Item 2 (Tank Duel) ammo bookkeeping** — I added 3 new weapons (mortar/piercing/scatter) to the `WEAPONS` array but didn't change the default ammo distribution. Each new weapon defaults to 1-2 ammo per round (defined in the weapon table). If the loadout feels unbalanced on a real device, the `ammo:` field on each new weapon is a one-line tune.

---

## Item-by-item

### Item 1 — 20Q / Akinator broad→specific funnel ✅

**Fix:** Replaced flat `THING_FALLBACKS` / `CHARACTER_FALLBACKS` arrays with **3-tier banks** (`*_FALLBACKS_TIERED`). `pickFallback()` now takes a `questionNumber` arg and selects from the appropriate tier:

- **Tier 1 (Q1-Q3) — widest splits:** "Is it alive?", "Is it man-made?", "Is it bigger than a breadbox?", "Are they a real person, not fictional?", "Are they human?"
- **Tier 2 (Q4-Q9) — category narrowing:** "Is it found mostly outdoors?", "Is it a vehicle?", "Are they from a movie or TV show?", "Are they a superhero?"
- **Tier 3 (Q10+) — specific attributes:** "Is it made of metal?", "Is it warm to the touch?", "Do they wear a costume?", "Are they known for being funny?"

System prompt also tightened: **explicit PHASE markers** keyed to question number. Phase 1 says *"NEVER ask about specific colors, sizes, or attributes yet."* Phase 3 says *"by Q15 with a confident hypothesis, GUESS."*

`isDuplicate()` (Jaccard ≥0.7 token overlap) continues to gate the AI's own repeats; if the AI repeats, we fall back to the tier-appropriate bank.

### Item 2 — Tank Duel bigger maps + variety + more weapons ✅

**Map size:** `720×480` → **`1200×560`** (66% wider, 17% taller).
**Max projectile range:** scaled with map. `POWER_BASE_SPEED=220` + `POWER_RANGE_SPEED=540` → max launch speed 760 px/s → range at 45° ≈ **2063px (1.72× the map width)** so the farthest tank is always reachable.

**Terrain variety:** random phase shifts each round (`ph1..ph4 = Math.random() * 2π`) + a profile roll:
- 33% **mountainous** (big amp 120, mid 45)
- 33% **rolling hills** (big amp 90, mid 38)
- 33% **standard** (big amp 70, mid 30)

Plus a 4th harmonic for fine detail, clamped to `[70, H-30]` so the surface never clips off-screen.

**Weapons:** 6 → **9** (existing: shell, cluster, nuke, bouncer, dirt-mover, homing). New:
- **Mortar 🚀** — adds `arcBias: -0.55` (forces upward arc regardless of aim) + `speedMult: 0.85` (slower, higher trajectory). Lob over tall terrain.
- **Rail Slug ⚡** — `piercing: true` + `speedMult: 1.35` (fast). Doesn't explode on impact — passes through tanks and terrain, damaging each in turn.
- **Scatter Pod 🌟** — on impact, spawns 5 mini-projectiles in a half-circle upward fan, each carrying ~55% damage at ~60% radius. Wide area denial.

Fire pipeline updated: `triggerExplosion()` handles scatter spawn. `tick()` skips explosion for piercing rounds (continues with friction). All visible discharges flow through the existing bullet renderer.

### Item 3 — Card Clash tap-to-reveal abilities (logic only) ✅

**`Card.tsx`:** added `onInfo?: () => void` prop. When set, an `i` button appears in the bottom-right corner of the card. Tap → fires `onInfo`, doesn't propagate to the card's main `onClick` (which is "play card" in the hand). Works on touch + desktop (`onPointerDown` + `onClick` both wired with `stopPropagation`).

**`CardDetailModal`:** new exported component. Full-screen overlay (z-60, `position: fixed`) with the card's name, element, rarity, cost gem, power, keyword, and full ability text in a styled panel. Dismissed by tapping the backdrop or the X button.

**`CardClash.tsx`:** added `viewingCard` state. All 8 `<Card>` usages now wire `onInfo` (4 in `MatchView` via the new `onCardInfo` prop, 4 in the outer menu/deck/result screens). Modal mounted in 4 phase-return blocks so it's always available regardless of game phase.

**Untouched:** card visuals (CSS gradient + game-icons SVG) — that's a separate art pass per scope.

### Item 4 — Maze Muncher ghost timer + dead ends ✅

**Vulnerable window:** `6s` → **`12s`** (2× longer). Flash-warning window `2s` → **`4s`** (matching the 33% proportion).

**Dead-end auto-patcher:** new `patchDeadEnds` loop inside `parseMaze()`. Walks the grid in up to 4 passes; for every open cell whose open-neighbor count is ≤1 (excluding tunnel-row edges and ghost-pen interior cells), opens one adjacent wall — preferring the wall directly opposite the existing neighbour so the corridor extends naturally into a loop. Headless verified: **starting from the existing hardcoded maze (18 dead-ends), the patched grid has 0 remaining dead-ends.**

Pellet count recalculated AFTER patching so the new openings (which become pellets) are counted toward the win condition.

### Item 5 — 3D Dungeon zoom + fog-of-war + facing ✅

**Camera zoom:** ortho `d=8` → **`d=14`** (75% more world visible). Camera position rescaled from `(12, 15, 12)` → `(18, 22, 18)` so the iso angle stays the same — just pulled back.

**Facing bug:** the old `Math.atan2(input.ax, -input.az)` rotated the model `π` away from its travel direction (the model's default forward is `+Z` in Three.js GLTF convention, but the `-az` negation flipped the mapping). Fixed to `Math.atan2(input.ax, input.az)` for player and enemy. Now:
- input.az = +1 (move south) → rotation.y = 0 → model faces +Z (south) ✓
- input.ax = +1 (move east) → rotation.y = π/2 → model faces +X (east) ✓

**Fog of war:** `DungeonLevel` now carries:
- `rooms: Array<{x, z, w, h}>` — the rectangular rooms produced by gen
- `visited: Set<string>` — per-cell discovery, keyed `"x,z"`
- `visitedRooms: Set<number>` — room indices the player has entered

Each step, `updateFogOfWar(g)` reveals a 1-cell radius around the player AND any room the player is currently inside (all room cells get marked at once for a clean "room lights up on entry" reveal).

Renderer iterates `dungeonGroup.children` each frame; each placed tile has `userData.gx / .gz / .isWall`. Floors only show if their cell is visited. Walls show if any adjacent floor cell is visited (so the room boundaries appear when the player enters). Enemies + chests hidden until their cell is revealed.

---

## Verification (40/40 headless assertions)

```
=== ITEM 1: 20 Questions ===  8/8
=== ITEM 2: Tank Duel ===     9/9 (max range 2063px > 1200px map; 9 weapons; terrain variety)
=== ITEM 3: Card Clash ===    9/9 (8 onInfo wires, 4 modal mount points)
=== ITEM 4: Maze Muncher ===  4/4 (12s timer, 4s flash, patcher reduces 18 dead-ends to 0)
=== ITEM 5: 3D Dungeon ===   10/10 (d=14, facing math fixed, fog state + reveal wired)
```

```
npx tsc -b        # exit 0
npx vite build    # exit 0
```

### What I did NOT verify

- **Live iPad confirmation** for any of the 5 items, especially Item 5 (look + perf are device-only)
- **AI-driven 20Q sessions with a real Claude key** (sandbox can't make those calls)
- **In-browser test of the card detail modal touch behavior** (logic-verified; UX feel needs device)

---

## Files changed

```
M  src/wordplay/pages/TwentyQuestions.tsx
M  src/tankduel/TankDuel.tsx
M  src/cardclash/Card.tsx
M  src/cardclash/CardClash.tsx
M  src/classics/mazemuncher/MazeMuncher.tsx
M  src/dungeon3d/engine.ts
M  src/dungeon3d/pages/Dungeon3DRun.tsx
M  package.json   (1.11.1 → 1.11.2)
```

### Untouched
- Existing combat AI / shop / parts in Scrapyard Kings
- All other games not in the 5-item scope
- 2D Dungeon Crawler (separate codebase from 3D)
- Existing on-disk assets (no new fetches)
