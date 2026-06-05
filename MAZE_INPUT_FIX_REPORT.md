# Maze Muncher — unresponsive controls fix (v1.10.83)

The v1.10.82 off-screen warp fix exposed a latent bug: the turn-evaluation block only fires when `atCellCenter` is true, but a player blocked by a wall stops in a **dead zone** outside the cell-center tolerance, so inputs never reach the engine. Fixed: turn evaluation now also fires when the player is blocked by a wall, plus instant reversal regardless of position.

---

## ⚠️ Scope notes surfaced

1. **Final confirmation requires the iPad.** Headless harness now passes 9/9 input scenarios including the exact dead-zone reproduction (player blocked at `p.x = 22.08, col=1`, `atCellCenter` false, then UP input correctly turns and moves up). But the only proof that the original device report is closed out is opening `/classics/maze` on the reporting iPad and tapping the arrows.
2. **The last pass DID expose this bug — but didn't create it.** The latent dead-zone bug always existed in the engine. The previous `Math.round` snap was accidentally masking it by warping the player +1 tile every time `atCellCenter` fired during normal motion — which sometimes landed the player at a position where the next frame's `atCellCenter` triggered and inputs took effect. Switching to `Math.floor` + snap-on-turn preserved real coords, exposing the dead zone in places like wall stops.
3. **Movement math + scaling fix from last pass are intact.** Verified by re-running the v1.10.82 coord-safety assertions — player still stays in bounds, tunnel wraps still work, NaN/negative dt still safe.

---

## Root cause (precise)

When the player walks LEFT into a wall, `canMove` permits motion until the leading edge (`p.x − speed − 6`) would land in the wall column. At spawn-row left-wall (col 0), the player stops at `p.x ≈ 22` — leading edge at col 1's leftmost pixel, one frame shy of crossing into col 0.

At `p.x = 22.08`:
- `p.x % 16 = 6.08`
- Distance from cell center (`8`): `1.92`
- `atCellCenter` tolerance: `< 1.5`
- → **`atCellCenter` returns false**

The turn block was gated:
```ts
if (atCellCenter(p.x, p.y)) {
  if (p.wantDx !== p.dx || p.wantDy !== p.dy) { /* apply turn */ }
}
```

So while the player is stopped at the wall, `wantDx`/`wantDy` get written by the touch handler but the engine never reads them. The player is alive, the input listener fires, the state is mutated — but the gate keeps it from taking effect.

**Why the previous pass's `Math.round` masked it:** the old snap fired every frame the player was anywhere within the 1.5-tolerance zone of a center, and it used `Math.round` which warped the player +1 tile in their travel direction. That warp could land them at coords where the next frame's `atCellCenter` fired, accidentally giving inputs an opportunity. Switching to `Math.floor` + snap-only-on-turn (my last fix) preserved real coords and exposed the dead zone.

**Why headless tests didn't catch it earlier:** the v1.10.82 coord-safety harness tested random direction changes — every 30 frames it picked a random direction. The player rarely got truly wall-stuck because the directions changed too often. The deterministic "walk into wall, then press a turn" scenario was missing.

---

## Fix

```ts
// INSTANT REVERSAL: opposite-direction inputs apply immediately
// without waiting for a cell-center alignment. Real Pac-Man does
// this — makes controls feel snappy.
if (p.wantDx === -p.dx && p.wantDx !== 0) { p.dx = p.wantDx; p.dy = p.wantDy; }
else if (p.wantDy === -p.dy && p.wantDy !== 0) { p.dx = p.wantDx; p.dy = p.wantDy; }

// Turn evaluation now fires when at cell center OR when blocked by
// a wall. The wall-stop case is the one that was eating inputs.
const canKeepMoving = canMove(g, p, speed);
const atCenter = atCellCenter(p.x, p.y);
if (atCenter || !canKeepMoving) {
  if (p.wantDx !== p.dx || p.wantDy !== p.dy) {
    const snapX = Math.floor(p.x / CELL) * CELL + CELL / 2;
    const snapY = Math.floor(p.y / CELL) * CELL + CELL / 2;
    if (canMove(g, { x: snapX, y: snapY, dx: p.wantDx, dy: p.wantDy }, speed)) {
      p.x = snapX; p.y = snapY;
      p.dx = p.wantDx; p.dy = p.wantDy;
    }
  }
  // Tunnel wrap only when actually at cell center, not when blocked.
  if (atCenter) { /* ... */ }
}
```

Plus belt-and-suspenders on the touch button: added `onTouchStart` + `onClick` alongside `onPointerDown`, plus `userSelect: none` and `WebkitTapHighlightColor: transparent` to keep iOS Safari from absorbing the gesture visually.

Plus tightened the canvas height reserve from 240px → 280px so the arrow buttons can't fall off the bottom of the iPad-landscape viewport.

---

## Verification (9/9 input assertions)

```
=== Scenario: walk left into wall, then turn up ===
PASS  Player stopped at a wall (didn't escape grid)
PASS  Stuck position is in the atCellCenter DEAD ZONE (this was the bug)
      stuckX % CELL = 6.08 (center is 8) — exactly the predicted bug condition
PASS  UP input from stuck position turns player and moves up
      dy=-1 y delta=-2.88 over 3 frames

=== Scenario: instant reversal mid-cell ===
PASS  Reversal applies INSTANTLY mid-cell (no need to reach center)
PASS  Player moves rightward after reversal

=== Scenario: turn at junction (normal Pac-Man turn) ===
PASS  LEFT input from a moving state turns the player (input buffer)

=== Scenario: input from spawn (initial turn) ===
PASS  DOWN input from spawn turns the player downward

=== Scenario: invalid turn into a wall is ignored ===
PASS  Player stays stuck when pressing INTO wall (correct behavior)
```

```
npx tsc -b              # exit 0
npx vite build          # exit 0
```

### Regression check vs last pass

The v1.10.82 coord-safety properties still hold:
- `isWall` returns true for out-of-bounds + NaN coords
- Player stays in `[CELL/2, W-CELL/2] × [CELL/2, H-CELL/2]`
- Tunnel wrap still moves player col 0 → col 20 and back
- `dt` clamping safe across NaN / negative / 50ms+ values

### What I did NOT verify

- **Live iPad / iPhone tap response.** Sandbox can't run iOS Safari. This is the only test that proves the original bug is closed out. Open `/classics/maze` on the reporting iPad.
- The `onTouchStart` fallback wasn't strictly needed for the input bug (the engine-gate was the real issue), but it costs nothing and protects against older iOS variants.

---

## Files changed

```
M  src/classics/mazemuncher/MazeMuncher.tsx   (turn-gate fix + instant reversal + harden touch button + canvas reserve)
M  package.json                                (1.10.82 → 1.10.83)
```

### Untouched
- Maze data, score/lives/pellet/win logic, ghost AI structure
- All other classics games
- v1.10.82 coord-safety machinery (isWall, defensive clamps, dt sanitization, pre-emptive tunnel wrap)
