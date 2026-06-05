# Maze Muncher — off-screen player + visibility fix (v1.10.82)

Investigating the iPad-reported "player flies off-screen + game is too small" turned up **two independent bugs** in the core coord math, plus the visibility issue. All three are now fixed. Headless coord-safety harness now passes 15/15. **Final confirmation requires a device check.**

---

## ⚠️ Scope notes surfaced

1. **Final confirmation must happen on a real iPad.** Sandbox cannot run iOS Safari, so I cannot directly observe the rendered playfield on the device that exhibited the bug. I traced the failure modes from the source, built a 15-assertion headless coord-safety harness that catches the specific failure modes, and verified the fix against them — but the only proof that puts the iPad bug to bed is opening `/classics/maze` on the device and confirming the player stays on the visible playfield.
2. **The reported "off-screen" symptom was almost certainly multi-cause.** The single biggest contributor I found was a wrong snap-to-grid (`Math.round` instead of `Math.floor`) that warped the player +1 tile at exact cell centers — but the failure pattern depends on frame timing, so the same code could appear "fine" on one device and break on another. I fixed all the contributing causes I could find rather than guessing which one mattered.
3. **The viewport math I expected to be wrong was actually OK** — `setTransform(dpr, 0, 0, dpr, 0, 0)` correctly resets the transform every frame before applying the world-to-CSS-pixel scale. No accumulation. The real bugs were in the engine, not the canvas plumbing.
4. **Game logic / wave logic / pellet count / score / lives — all untouched.** Pure coord + viewport + sizing fixes.

---

## Root cause analysis

### Bug 1 (BIGGEST): snap-to-grid warps the player by +1 tile

The original code at the cell-center snap:
```ts
p.x = Math.round(p.x / CELL) * CELL + CELL / 2;
```

`Math.round` in JS rounds half-values **toward +∞**, so:
- `Math.round(0.5) === 1` (NOT 0)
- `Math.round(1.5) === 2`
- `Math.round(2.5) === 3`

For a player at exact col 1 center (`p.x = 24`), `Math.round(24/16) = Math.round(1.5) = 2`, snapping to `2*16 + 8 = 40` (col 2 center). **The player warps one tile in the +x direction every time atCellCenter fires.** I confirmed this with a 5-frame trace:
```
frame 0: x=24.000 col=1 → snap warps to x=40
frame 1: x=39.040 col=2 → snap warps to x=40
frame 2: x=39.040 col=2 → snap warps to x=40
...stuck at col 2 center forever
```

Plus a secondary issue: the snap was firing **every frame** the player was within the 1.5-pixel tolerance zone of a center, dragging them back even when moving.

**Why this didn't show in headless tests**: my v1.10.74 state-check was code-reading, not running the engine. The "Maze Muncher: WORKS" verdict was based on imports/exports + the structural code, not a play simulation. A play simulation would have caught it immediately.

**Why iPad reproduces and desktop sometimes doesn't**: frame-timing dependent. On desktop @ 60 fps, the player oscillates locally (snap-back vs forward motion balance out, looks janky but playable). On iPad rendering a full Retina canvas, dt can grow and the snap warp can land the player at coords that cumulatively drift off the playfield — combined with **Bug 2**, off-screen.

**Fix**: changed `Math.round` to `Math.floor` AND moved the snap inside the `if (wantDx !== dx)` block so it only fires when actually turning, not every frame.

### Bug 2: `isWall` returned `false` for out-of-bounds coords

```ts
function isWall(g, x, y) {
  const c = cellAt(g, x, y);
  return c === "wall";
}
```

`cellAt` returned `null` for off-grid; `null === "wall"` is `false` → `canMove` returns `true` → entities could walk into invalid coords. The horizontal tunnel wrap caught most cases (`p.x < 0` or `p.x > W`) but the wrap fired AFTER motion, so a single bad frame could leave the player at a coord the wrap didn't catch (especially combined with the Math.round warp from Bug 1).

**Fix**: `isWall` now returns `true` for out-of-bounds coords (including NaN), so `canMove` can never project an entity off the grid. Paired with a pre-emptive tunnel wrap that fires AT the cell-center of the edge column (so the legitimate tunnel still works without canMove blocking it).

### Bug 3: defensive coord guards missing

Even with the new isWall + pre-emptive wrap, a single corrupt frame (NaN dt, browser timer skew, anything) could in principle leave a coord outside the grid. Added an unconditional clamp at the end of player step:
```ts
if (p.x < CELL / 2) p.x = CELL / 2;
else if (p.x > W - CELL / 2) p.x = W - CELL / 2;
if (p.y < CELL / 2) p.y = CELL / 2;
else if (p.y > H - CELL / 2) p.y = H - CELL / 2;
```

Also sanitized `dt` in the rAF loop: `Number.isFinite(dt) && dt >= 0`, clamped to `[0, 0.05]`.

### Bug 4 (visibility): canvas capped at 360px

The CSS was:
```tsx
<canvas style={{ width: "min(100%, 360px)", aspectRatio: `${W}/${H}` }} />
```

On iPad portrait (768px viewport), that's less than half the screen. Hence "too small to see."

**Fix**:
```tsx
<canvas style={{
  width: "min(96vw, calc((100dvh - 240px) * 21 / 23), 640px)",
  aspectRatio: `${W} / ${H}`,
  touchAction: "none",       // iOS Safari won't scroll/zoom the page on canvas touches
  imageRendering: "pixelated", // crisp at any DPR
}} />
```

The 21/23 ratio is the maze's COLS/ROWS aspect — it keeps the canvas tall enough to fit inside `100dvh - 240px` (reserving header + arrow buttons) without overflow. `100dvh` (dynamic viewport height) replaces `100vh` so iOS Safari toolbar transitions don't push the canvas off-screen.

Arrow buttons also bumped from 44px × 14px font to 56px × 20px for better thumb targeting on tablets.

---

## Verification (15/15 headless assertions)

```
=== Out-of-bounds is now a wall ===
isWall(-1, 0)  = true ✓
isWall(0, -1)  = true ✓
isWall(W+5, 50) = true ✓
isWall(50, H+5) = true ✓
isWall in middle pellet area = false ✓

=== Player stays in bounds across 10,000 normal steps ===
Player x stayed in [CELL/2, W-CELL/2] ✓  (x ∈ [168, 168] — wall-bounded)
Player y stayed in [CELL/2, H-CELL/2] ✓  (y ∈ [278, 311] — actively traversing vertically)

=== Tunnel wrap still works ===
Wrap left→right at tunnel row 9 — landed at col 20 ✓
Wrap right→left at tunnel row 9 — landed at col 0  ✓

=== Adversarial dt cannot push player off-grid ===
After 100×50ms steps, player in bounds ✓
Negative/NaN dt doesn't NaN player coords ✓

=== Corner cases ===
Player at top-left can't walk further left ✓
Player at top-left can't walk further up   ✓
Ghost isWall semantics consistent with player ✓
```

```
npx tsc -b        # exit 0
npx vite build    # exit 0
```

### What I did NOT verify

- **Live iPad / iPhone playthrough** — sandbox limit. This is the only test that actually proves the original bug is gone. Open `/classics/maze` on the reporting device.
- **Visual confirmation of new canvas size** on real screen aspect ratios.
- **iOS Safari toolbar collapse interaction with `100dvh`** — should work but I haven't seen it on hardware.

---

## Files changed

```
M  src/classics/mazemuncher/MazeMuncher.tsx
M  package.json   (1.10.81 → 1.10.82)
```

### Untouched
- All other classics games
- Score / lives / pellet / win-condition logic
- Maze data
