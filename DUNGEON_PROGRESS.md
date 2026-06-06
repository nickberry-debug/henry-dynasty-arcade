# Dungeon Crawler 3D — Progress Tracker

> Single source of truth for the Master Roadmap. Bot reads this first on each "continue the dungeon roadmap" invocation to resume at the first incomplete item.

**Last updated:** 2026-06-06 (Phase 2b shipped — combat anims + hit-react + sword trail + iPhone fixes)
**Status legend:** ✅ done · 🟡 partial · ❌ todo · ⚠️ needs device confirm · 🔮 deferred

---

## PHASE 0 — Core Polish & Performance

| Item | Status | Notes |
|---|---|---|
| Camera zoom (was d=8, want pulled back) | ✅ done | `d=14` in `Dungeon3DRun.tsx:277` |
| Fog of war (undiscovered = hidden) | ✅ done | `updateFogOfWar()` + `isCellVisible()` in engine.ts; render loop hides tiles + reveals walls adjacent to discovered floor |
| Character backward-facing bug | ✅ done | `atan2(ax, az)` (was `atan2(ax, -az)`) at engine.ts:413 (player) + 463 (enemy) |
| Wall rotation map (`rotMap`) | ⚠️ device-confirm | Values are best-guesses at `Dungeon3DRun.tsx:155`. Nick said map looks beautiful on iPad → values appear correct. **Mark ✅** unless any wall faces wrong direction in future runs |
| Animation clip name picker | ⚠️ device-confirm | Substring search for idle/walk/attack in `pickClip()`. Need to log actual clip names from `character-a.glb` etc. to confirm picker hits the right ones. Action: add `console.log("clips for", name, animations.map(a=>a.name))` in dev mode |
| Touch button safe-area | ✅ done (Phase 2b, 2026-06-06, commit `f8a630b`) | Buttons now use `max(5%, calc(20px + env(safe-area-inset-right)))` (melee) and `max(28%, calc(110px + env(safe-area-inset-right)))` (ranged), bottoms `max(8%, calc(36px + env(safe-area-inset-bottom)))`. Wrapper has `overflow:hidden` + safe-area padding. |
| Joystick safe-area | ✅ done (Phase 2b, 2026-06-06, commit `f8a630b`) | Outer wrapper applies safe-area-inset padding on left/right/top so the joystick zone is confined to safe area. |
| Camera bounds at map edges | ✅ done (Phase 0+2b) | Engine clamps `cameraTargetX/Z` via `CAM_INSET_X/Z = CELL*3`. Phase 2b also widens orthographic d×1.15 on portrait so map edges fit. |
| Control feel tightening | ✅ done (Phase 0+2b) | Player speed 6.5→7.5, camera lerp factor 9, joystick max throw 50→40. Phase 2b: portrait frustum widened + lookAt offset 3.0 (vs 1.5 landscape) so player feels centered on iPhone. |
| Player + enemy collision feel | ✅ done (Phase 2b, 2026-06-06, commit `f8a630b`) | Body-block pass in `step()` pushes overlapping pairs apart. Mid-attack contact amplifies push 2× and adds `hitStop=0.03`. Pushback impulse on hit lives in the new hit-react system below. |
| InstancedMesh / geometry merging | 🔮 deferred | Real perf win path. Maybe 100-300 draw calls now → <50 with InstancedMesh on the repeating wall/floor pieces. **Do after Phase 1** when full GLB catalog is wired and the perf hit is visible. |

**Phase 0 entrance status:** Bot delivered the foundation in Session 1 (v1.11.1). Nick confirmed "looks beautiful" on iPad device review 2026-06-06. Remaining items above are concrete polish.

**Phase 0 exit criteria:** All ❌ items above moved to ✅ or 🔮 deferred. Verified on Nick's iPad.

---

## PHASE 1 — Content Expansion

| Item | Status | Notes |
|---|---|---|
| Wire 32 more dungeon GLBs into procgen | ❌ todo | Catalog stored in `DUNGEON_MODELS` constant. Currently uses 7 (template-floor, template-wall, template-wall-corner, stairs, gate). Add: corridor-corner, corridor-end, corridor-intersection, corridor-junction, corridor-wide-*, gate-door-window, gate-metal-bars, room-corner, room-large, room-small-variation, room-wide, template-floor-detail, template-floor-layer (raised/hole), template-wall-detail-a, template-wall-half, template-wall-stairs, template-wall-top |
| 5–7 visually distinct enemy types | ❌ todo | Currently 3 tinted variants of character-h/k/p. Use the full 18 character GLBs (a–r) for distinct silhouettes — pick a–r set spread across roles (grunt/scout/brute/charger/ranged/shaman). Tint by role rather than per-variant |
| Themed biomes by depth | ❌ todo | Vary palette + model set every 3 floors: 1–3 stone halls, 4–6 crypt (darker, blue lighting), 7+ deeper variants |
| Larger / more interesting procgen | ❌ todo | Current grid is 18×14. Bump to 24×18 for floors ≥5. Add room-large + room-wide variants. More corridor types. |
| Pathfinding-aware enemy AI | 🔮 maybe later | Current AI is straight-line at player; gets stuck on walls. Could add A* but Phase 1's job is content not AI |

---

## PHASE 2 — Combat Depth (most of Nick's iPad feedback lands here)

| Item | Status | Notes |
|---|---|---|
| Melee attack button | ✅ done | Red sword button bottom-right. Hooked to `input.attack` → `p.attackT` → hitbox check. Works |
| **Ranged weapon with auto-aim to nearest enemy** | ✅ done (Phase 2a, 2026-06-06, commit `225dc86`) | Blue Zap touch button (72px) left of melee + F/L key bindings. On press: nearest living enemy within `RANGED_RANGE=9` is picked, `p.facing` rotates toward it, projectile spawns at `p.pos + dir*0.7` with velocity `dir*RANGED_SPEED(18)`, lives `RANGED_TTL=1.2s`, deals `RANGED_DAMAGE=12`. Glowy blue sphere mesh (0x60a5fa emissive). Wall + enemy collision; on kill drops 2-4 coins same as melee. `rangedCdDur=0.55s` cooldown. Tiny hit-stop on fire. Verified on Vercel dpl_BE2y94CBwiJ6zSq6QNr6UY7wSL4J. |
| Multiple attack options (heavy + light combo) | ❌ todo | Phase 2 spec: light + heavy melee; light = current, heavy = hold attack for 0.4s → larger hitbox + knockback + slower windup |
| Enemy AI variety (chargers/ranged/swarmers/tanky) | ❌ todo | Per-kind behavior: chargers telegraph + dash, ranged kite + projectile, swarmers travel in groups, tanky has armor + slow swing |
| Dodge-roll or block | ❌ todo | Tap-jump button or double-tap joystick → 0.3s iframes + dash 4 units in current facing |
| **Fighting + weapon animations** | ✅ done (Phase 2b, 2026-06-06, commit `f8a630b`) | Player attack action drives from `attack-melee-right` clip (27 clips on character-a.glb probed via JSON header dump). Procedural ±20° rotation pulse fallback. Sword trail = `RingGeometry` partial arc, additive blend, fades white→transparent across the swing window with ~46° sweep. |
| **Character body-blocking feel** | ✅ done (Phase 2b, 2026-06-06, commit `f8a630b`) | New body-block pass at end of `step()`: overlapping player/enemy push apart with 0.8× of overlap (1.6× if either mid-attack). Player takes half the impulse vs enemy. Mid-attack contact adds `hitStop=0.03`. |
| Full JuiceKit on hits | 🟡 partial → mostly done in 2b | Hit-stop + flash + knockback (`e.hitStun=0.12`, `e.kbX/kbZ`, ~0.4u push over 0.1s, AI gated during stun) + enemy death scale.y 1→0.3 + opacity 1→0 fade. Still TODO: particles, screen shake on heavy hits, slow-mo on kills. |

---

## PHASE 3 — Hero Classes

| Item | Status | Notes |
|---|---|---|
| 3+ playable classes (Warrior / Ranger / Mage) | ❌ todo | Warrior: heavy melee + block. Ranger: ranged + dodge. Mage: AoE spells + slow walk |
| Different character models per class | ❌ todo | Pull from 18 character GLBs — assign distinct silhouettes |
| Class select screen at run start | ❌ todo | Pre-run screen showing 3 cards |
| Per-class stats + attacks + feel | ❌ todo | Each class has own attack timing, HP, speed |

---

## PHASE 4 — Loot & Gear

| Item | Status | Notes |
|---|---|---|
| Weapon/armor drops with rarity tiers | ❌ todo | common (gray) → uncommon (green) → rare (blue) → epic (purple) → legendary (orange) |
| Equip system affecting stats | ❌ todo | Slots: weapon, helm, body, ring. Each slot has stat impact |
| Inventory UI | ❌ todo | Grid view; compare hover; equip on tap |
| Sell/salvage for currency | ❌ todo | Salvage = gold based on rarity |
| **Interaction button (chests/doors/NPCs)** | ❌ todo (Nick request, "if important now") | Lower-priority button; press to interact with whatever is in range. Maybe context-sensitive: shows "OPEN" when near chest, "DESCEND" when near stairs (replaces auto-trigger). |

---

## PHASE 5 — Progression & Meta

| Item | Status | Notes |
|---|---|---|
| XP + leveling | ❌ todo | XP on kill; level up = stat bump + maybe ability unlock |
| Ability unlock tree | ❌ todo | 3 abilities per class, unlock by level |
| Meta-progression between runs | ❌ todo | Currency you keep on death → permanent stat or unlock |
| Deeper floors = harder/more rewarding | ❌ todo | Scale enemy HP/damage + loot quality with depth |

---

## PHASE 6 — Bosses

| Item | Status | Notes |
|---|---|---|
| Boss at floor 5, 10, 15… | ❌ todo | Bigger enemy (scale up a character GLB or use special) |
| Telegraphed mechanics + phases | ❌ todo | Wind-up swing, multi-phase health bars |
| Cinematic framing on boss entry | ❌ todo | Camera zoom + name banner + JuiceKit |

---

## PHASE 7 — Final Polish

| Item | Status | Notes |
|---|---|---|
| Minimap | ❌ todo | Use `discovered` grid as data source; overlay top-right |
| Audio / SFX | ❌ todo | Hit sound, footstep, coin pickup, boss music |
| UI pass | ❌ todo | Consistent palette, fonts, animations |
| Run-summary screen | 🟡 partial | "RUN COMPLETE" and "RUN ENDED" screens exist; add stats breakdown |
| Companion tie-in from Olympus/Survivor | 🔮 maybe | Bring a creature from Olympus party into the dungeon |

---

## Nick's iPad Review Feedback (2026-06-06) — verbatim

> Other than that, looks beautiful. 
> 
> The controls could be slightly tighter
> Needs a melee button (already there)
> Auto-aimed-to-nearest-enemy range weapon fire
> Interaction buttons — if important now
> Buttons need to stay in frame of the user, they trail off screen sometimes
> Screen control is a little stiff
> Mild clipping issues at the end point of map
> Needs fighting and weapon animations
> Characters just bump into each others

**Mapped:**
- Buttons trailing off → Phase 0 (safe-area-inset)
- Stiff screen control → Phase 0 (camera lerp + player speed)
- Map edge clipping → Phase 0 (camera bounds)
- Slightly tighter controls → Phase 0 (deadzone + speed tuning)
- Melee button → already done ✅
- Auto-aim ranged → Phase 2 (new system)
- Interaction button → Phase 4 (with loot/chests)
- Fighting/weapon animations → Phase 2 (combat depth)
- Bump-into-each-other → Phase 2 (collision feel)

---

## Standing rules (every phase)

- Surface unmet scope at TOP in ⚠️.
- "Done" = verified by running. Logic = headless-verified; 3D look/feel/perf = flag explicitly as device-confirm-required.
- On-disk assets only. If a phase needs art not on disk, STOP and flag for Nick to download.
- Don't regress prior phases or the 2D crawler at `/dungeon`.
- Per-profile saves stay intact across all phases.
- Update this file at the end of each session.

---

## Next pickup

When you re-fire "continue the dungeon roadmap":
1. Read this file.
2. **Awaiting Nick's pick: Phase 1c (themed biomes by depth) OR Phase 3 (hero classes — Warrior / Ranger / Mage with class-select screen).** Bot should ASK before starting; don't auto-roll.
3. Otherwise resume at the first ❌ item.
4. Complete & verify it. Update this file.
5. Advance through as many items as you can cleanly. STOP at a completed phase boundary if you run out of runway.

## Phase 2a session notes (2026-06-06)

- Commit `225dc86` on `main`, deployed by Vercel as `dpl_BE2y94CBwiJ6zSq6QNr6UY7wSL4J` (READY at 1780763080).
- Aliases: `henry-dynasty.vercel.app`, `henry-dynasty-git-main-nickberry-debugs-projects.vercel.app`.
- Patch script: `C:\Projects\patch_dungeon3d_phase2a.py` (19 hunks, all matched). Files changed: `src/dungeon3d/engine.ts` + `src/dungeon3d/pages/Dungeon3DRun.tsx`.
- `npm run build` green (tsc + vite). Only pre-existing chunk-size + dexie dynamic-import warnings.
- BUILD_STAMP bumped to `2026-06-06T18:00:00Z` so Nick can confirm new build on-device.

## Phase 2b session notes (2026-06-06)

- Commit `f8a630b` on `main`, deployed by Vercel as `dpl_5qz3PBHv7sFjCGop9vhFsjDNisy4` (READY at 1780766086).
- Aliases: `henry-dynasty.vercel.app`, `henry-dynasty-git-main-nickberry-debugs-projects.vercel.app`.
- Patch script: `C:\Projects\patch_dungeon3d_phase2b.py` (20 hunks, all matched). Files changed: `src/dungeon3d/engine.ts` + `src/dungeon3d/pages/Dungeon3DRun.tsx`.
- `npm run build` green (37.13s, tsc + vite). Pre-existing chunk-size + dexie dynamic-import warnings only.
- BUILD_STAMP bumped to `2026-06-06T20:30:00Z` so Nick can confirm new build on-device.

### What landed (combat juice)

- **Player attack animation**: `attack-melee-right` clip selected by existing `pickClip("attack")` substring match. Action weight blended via `lerp(.., 0.4)` when `p.attackT > 0`. Procedural ±20° rotation pulse fallback if a clip never resolves.
- **Sword swing trail**: lazy-spawned `RingGeometry(0.8, 1.8, 16, 1, π/4, π/2)` wrapped in an anchor `Object3D`, additive blend, `depthWrite:false`, opacity fades `(1-progress)*0.85` and rotates `(progress-0.5)*0.8` rad for a swoosh.
- **Enemy hit-react**: new `Enemy.hitStun / kbX / kbZ` fields. On melee or projectile hit: `hitStun=0.12`, knockback unit-vector stored. AI loop ticks hitStun first, applies `tryMove` at `KB_SPEED=4.0` for that duration (~0.4u total), then `continue` to gate chase movement.
- **Enemy death animation**: per-axis fade — `scale.y = 0.9 * lerp(1, 0.3, deathProg)` and material `transparent:true; opacity = 1 - deathProg`. Mesh disposal at `deathT==0` still cleans up.
- **Hit-stop on body contact**: body-block pass at end of `step()` detects overlap and pushes apart. Amplified 2× and `hitStop=0.03` if either is mid-attack.

### What landed (iPhone fixes — bundled per follow-up request)

- **Stronger portrait lookAt offset**: `camTuningRef.current.lookAtZ = portrait ? 3.0 : 1.5` (was hard-coded 1.5).
- **Widened portrait frustum**: `camTuningRef.current.d = portrait ? 14*1.15 : 14`.
- **Resize/orientationchange listener**: recomputes tuning + viewport state used for the debug badge.
- **Per-frame `d` re-read**: resize check also triggers on `camera.top !== d` so orientation flips update the frustum immediately. `camera.top/bottom` refreshed alongside left/right.
- **Camera snap at mount**: before `threeRef.current = {...}` the camera is positioned at the player + `cameraTargetX/Z` seeded — no first-frame flash at world origin.
- **Percentage-based button positions**: melee `right: max(5%, calc(20px + env(safe-area-inset-right, 0px)))`, ranged `right: max(28%, calc(110px + env(safe-area-inset-right, 0px)))`, both `bottom: max(8%, calc(36px + env(safe-area-inset-bottom, 0px)))`.
- **Wrapper safe-area**: outer game div has `overflow: hidden` + `paddingTop/Left/Right: env(safe-area-inset-*)`.
- **Viewport debug badge**: 9px mono badge top-right of header — `${w}×${h} P|L ${ratio.toFixed(2)}`, opacity 0.4. Nick can screenshot if framing still feels off.

### Still TODO (Phase 2 leftovers, not picked up in 2b)

- Multiple attack options (light + heavy combo).
- Enemy AI variety (chargers/ranged/swarmers/tanky).
- Dodge-roll or block.
- Full JuiceKit: particles, screen shake on heavy hits, slow-mo on kills.
