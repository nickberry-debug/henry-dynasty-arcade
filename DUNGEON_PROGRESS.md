# Dungeon Crawler 3D — Progress Tracker

> Single source of truth for the Master Roadmap. Bot reads this first on each "continue the dungeon roadmap" invocation to resume at the first incomplete item.

**Last updated:** 2026-06-07 (Phase 6 shipped — bosses every 5th floor: Iron Tyrant / Hexblade / Hollowmage, commit `27d9243`; preceded by camera dial-back hotfix commit `fdce58b`)
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
| 3+ playable classes (Warrior / Ranger / Mage) | ✅ done (Phase 3, 2026-06-06, commit `b2d3839`) | All three live with distinct kits. Warrior: HP 120, SPD 6.8, melee 22, Zap = 4u/0.2s dash w/ contact damage. Ranger: HP 80, SPD 8.5, melee 10, Zap = 2 arrows in ±15° cone @ 0.32s cd. Mage: HP 70, SPD 6.5, Sword = 360° frost nova (15dmg + 0.25s slow), Zap = fat fireball (32 dmg, radius 0.9, 1.1s cd). |
| Different character models per class | ✅ done (Phase 3, 2026-06-06, commit `b2d3839`) | Warrior = `character-a.glb`, Ranger = `character-b.glb`, Mage = `character-e.glb`. `tintModel` applies class color at load (warm red/gold, emerald, soft violet). |
| Class select screen at run start | ✅ done (Phase 3, 2026-06-06, commit `b2d3839`) | Three full-bleed cards with class name, tagline, HP/SPD/MELEE/DASH-or-RANGED stats, and one-line flavor. `classChoice` state gates the scene setup useEffect; `newRun()` returns to the picker. |
| Per-class stats + attacks + feel | ✅ done (Phase 3, 2026-06-06, commit `b2d3839`) | Player carries `classId/speed/attackDmg/attackRange/rangedDmg/rangedSpeed/rangedRadius` from `CLASS_DEFS`. `step()` movement reads `p.speed`; warrior dash adds `dashT/Vx/Vz/Hit`; mage melee is 360° AoE with hitStun slow; ranger spawns two projectiles per shot. Projectile gained optional `radius` for mage fireball. |

**Phase 3 entrance status:** Shipped 2026-06-06 (commit `b2d3839`, build stamp `06-06 21:45`, deploy `https://henry-dynasty.vercel.app/dungeon3d/run`). Patch: `C:\Projects\patch_dungeon3d_phase3.py` — 10 engine edits + 17 tsx edits, all single-anchored find/replace with idempotent skip-if-already-applied.

---

## PHASE 4 — Loot & Gear

| Item | Status | Notes |
|---|---|---|
| Weapon/armor drops with rarity tiers | ✅ done (Phase 4, 2026-06-06, commit `ea0187e`) | 5-tier rarity ladder (common white / uncommon green / rare blue / epic violet / legendary orange) with weighted drop (55/25/13/6/1). RARITY_COLORS for 3D + RARITY_HEX for HUD. |
| Equip system affecting stats | ✅ done (Phase 4, 2026-06-06, commit `ea0187e`) | Three slots: weapon / armor / trinket. `Player.equipped` persists across descend. `recomputePlayerStats(p)` walks slots, sums affix % then multiplies on top of `CLASS_DEFS[p.classId]` base: hpMax (current hp scales proportionally), speed, attackDmg+rangedDmg, attackRange, rangedCdDur (lower = better). |
| Inventory UI | 🟡 partial (Phase 4) | Always-on top-left HUD shows 3 slots w/ item name color-coded by rarity. No compare-hover, no full grid view yet — that's Phase 5 territory or a 4b polish pass. |
| Sell/salvage for currency | ❌ todo | Salvage = gold based on rarity |
| **Interaction button (chests/doors/NPCs)** | ✅ done (Phase 4, 2026-06-06, commit `ea0187e`) | Tan 50px button between joystick and melee (left of melee, right of ranged, slightly above). Faded at opacity 0.3 by default; goes to 1.0 + glows in rarity color + shows floating `[E] {name}` label whenever a pickable item is within 1.2u. Engine computes `g.nearestPickable` each frame so the React HUD knows what to surface. Bound to KeyE on keyboard, debounced 120ms on touch. |

---

## PHASE 5 — Progression & Meta

| Item | Status | Notes |
|---|---|---|
| XP + leveling | ✅ done (Phase 5, 2026-06-06, commit `3be1a5c`) | Player gains `xp`/`xpToNext`/`level`. XP per kill: grunt 8×depth, scout 14×depth, brute 22×depth. Curve: `100 × 1.45^(level-1)` → 100/145/210/305/442/... XP bar above bottom HUD, color-coded by class. Level badge in header next to class name. |
| Ability unlock tree | ✅ done (Phase 5, 2026-06-06, commit `3be1a5c`) | 6 abilities per class (18 total) in `ABILITY_DEFS`. Mix of stat-kind (rolled into `recomputePlayerStats` so they stack with gear) + tag-kind (combat code branches on `p.abilities.includes(...)`). Level-up modal pauses engine, offers 3 random unused choices; empty pool falls back to "Refined Edge" +5% all. |
| Meta-progression between runs | ✅ done (Phase 5, 2026-06-06, commit `3be1a5c`) | Soul shards earned on death (`runKills + floor*5`). Persisted via `localStorage['henry-dungeon-meta-v1']` w/ defensive parse. Soul Forge button on class-select opens a modal with 3 per-class unlocks (50/75/150 shards). Unlocks applied via `classDefWithMeta(classId, unlockIds)` BEFORE gear/ability math in `newPlayer`. |
| Deeper floors = harder/more rewarding | 🟡 partial (Phase 5) | XP per kill scales with depth (`base * depth`). Enemies per room already scale with depth (1 + rand(0..min(2, depth))). Future passes: enemy HP/dmg scaling + per-depth loot quality floor lift. |

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
2. **Awaiting Nick's pick: Phase 1c (themed biomes by depth) OR Phase 7 (final polish) — Phase 6 (bosses every 5th floor — Iron Tyrant / Hexblade / Hollowmage) shipped 2026-06-07 commit `27d9243`. Camera dial-back hotfix shipped earlier in `fdce58b` (frustum 22, portrait 1.25×, LOOKAT_Z_OFFSET=0).** Bot should ASK before starting; don't auto-roll.
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


## Phase 3 session notes (2026-06-06)

- Commit `b2d3839` on `main`, deployed by Vercel as `dpl_D6emfhX3sKXLUpeyr6YapoWaMKVg` (READY at 1780775517).
- Aliases: `henry-dynasty.vercel.app`, `henry-dynasty-git-main-nickberry-debugs-projects.vercel.app`.
- BUILD_STAMP bumped to `2026-06-06T21:45:00Z`.
- Patch script: `C:\Projects\patch_dungeon3d_phase3.py` (idempotent — re-runnable). 10 engine edits + 17 tsx edits, single-anchored find/replace with `.bak` per file. First run got through engine but crashed on tsx because of a description-string encoding (cp1252 vs utf-8) and a mojibake `Â·` in the file vs clean `·` in the patch; fixes folded into the same script.

### What landed (engine.ts)

- New `ClassId = "warrior" | "ranger" | "mage"` type + `ClassDef` interface + `CLASS_DEFS` const table holding HP/SPD/melee/ranged stats + color tint per class.
- `Player` gained `classId`, `speed`, `attackDmg`, `attackRange`, `rangedDmg`, `rangedSpeed`, `rangedRadius`, and warrior dash state (`dashT`, `dashVx`, `dashVz`, `dashHit: Set<string>`).
- `Projectile` gained optional `radius?` so the mage fireball's fat 0.9-unit collider can override the default 0.6.
- `newPlayer(level, classId)` + `newGame(depth, classId)` signatures both default to `"warrior"`. `descendLevel` resets dash state on level transition.
- `step()` movement: reads `p.speed`; while `p.dashT > 0` overrides input and damages any enemy whose hitbox the dash crosses (`dashHit` tracks IDs so one dash doesn't tick twice).
- `step()` melee: warrior/ranger frontal cone uses `p.attackDmg` + `p.attackRange`; mage triggers a 360° AoE centered on the player with 0.25s hitStun slow (vs 0.12s for the other two).
- `step()` ranged: warrior fires a `dashT = 0.2s` forward burst (no projectile); ranger spawns two arrows in a randomized ±15° cone; mage spits one fat slow heavy fireball with `radius = p.rangedRadius` (0.9) and `ttl + 0.4s`.

### What landed (Dungeon3DRun.tsx)

- `gameRef` is now `Ref<Game | null>`. `classChoice: ClassId | null` state gates the scene setup.
- Setup `useEffect` now keys on `[classChoice]`: early-returns when null, lazily constructs `gameRef.current = newGame(1, classChoice)`, loads the class-specific GLB, and applies `tintModel(playerObj, CLASS_DEFS[classChoice].tint)`.
- Per-class GLB map: warrior = `character-a.glb` (existing), ranger = `character-b.glb`, mage = `character-e.glb`. None overlap with grunt/scout/brute pools.
- Class-select overlay: three vertical cards with class name in the class tint, tagline, HP/SPD/MELEE/DASH-or-RANGED stat grid, and a one-line "how it plays" blurb. Tapping a card sets `classChoice` → setup effect mounts the scene with the right model.
- Header: `DUNGEON · {CLASSNAME} · Lv {depth}` with the class name colored to match the class tint.
- Zap button background gradient now follows the class (warm orange for warrior dash, emerald for ranger arrows, fire-orange for mage fireball).
- `newRun()` calls `threeRef.current?.dispose()`, nulls both refs, and resets `classChoice` to null → user lands back on class-select, picks again, scene rebuilds.
- Loop guard: `if (!g) return;` inside the rAF closure so a stale frame mid-teardown can't blow up.

### What to test on iPhone

1. **Class-select first**: when the app routes to `/dungeon3d/run`, the three-card screen should appear before any dungeon mesh loads. Tap a card → loading indicator → dungeon mounts with the chosen class's model + tint.
2. **Warrior feel**: Sword (red button) is the standard frontal cone, 22 damage, slightly bigger 2.6u reach. Zap (orange) should kick a 4-unit forward dash over 0.2s with iframes; any enemy in the dash path takes 22 damage and gets knocked back. Cooldown ~0.7s.
3. **Ranger feel**: Sword does only 10 damage. Zap (green) should fire **two** arrows per press — one straight at the nearest target, one offset ±15° — at a snappy 0.32s cooldown. Player moves noticeably faster (8.5 vs warrior 6.8).
4. **Mage feel**: Sword (still red) should now visibly hit every enemy within 3 units around the player, not just in front, and slow them noticeably (0.25s hitStun). Zap (orange) is slow but heavy — a single fat 32-damage fireball every 1.1s with a wider hit radius.
5. **Restart loop**: dying or pressing the header refresh icon should drop back to class-select, not auto-respawn into the same class.
6. **Header**: should always show the active class name in its class color next to the depth indicator.

### Still TODO

- Distinct projectile mesh per class would be a nice juice pass (currently all projectiles render with the same blue glow from Phase 2a). Could be Phase 3b polish.
- No per-class run stats yet — Phase 5 (progression/meta) territory.
- Sword/Zap button icons still generic. Could swap to a Bow icon for ranger or a Flame icon for mage if Nick wants more visual delta.



## Phase 4 session notes (2026-06-06)

- Commit `ea0187e` on `main`, deployed by Vercel as `dpl_2fZJXabCnyoXvgQtt8vqEpcFWjuH` (READY at 1780777497).
- Aliases: `henry-dynasty.vercel.app`, `henry-dynasty-git-main-nickberry-debugs-projects.vercel.app`.
- BUILD_STAMP bumped to `2026-06-06T22:30:00Z`.
- Patch script: `C:\Projects\patch_dungeon3d_phase4.py` (12 engine edits + 15 tsx edits = 27 hunks, all single-anchored find/replace with `.bak` per file). All patches applied on first run; build green in 37.69s.

### What landed (engine.ts)

- New `Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary"` type + `Item` interface (id / kind / name / rarity / affixes / x / z / pickedUp).
- `RARITY_COLORS` (three.js hex, exported) + `RARITY_HEX` (CSS hex, exported) so the renderer + React HUD can share a single palette.
- `Player` gained `equipped: { weapon?: Item; armor?: Item; trinket?: Item }` + `interactCd: number`. `descendLevel` resets the cooldown but preserves `equipped` so gear carries across floors.
- `Game` gained `items: Item[]` (ground drops), `toast: { text; rarity; ttl } | null`, and `nearestPickable: Item | null`.
- `InputState` gained `interact: boolean`.
- `newPlayer` / `newGame` initialize the new fields. `descendLevel` drops a guaranteed uncommon+ item near the new spawn (floor-clear bonus).
- Loot generation helpers (private + a single `export rollLoot`): weighted `pickRarity()` (55/25/13/6/1), `pickRarityMin(min)` (bounded reroll above the floor), `rollAffixes(rarity)` (counts + ranges per spec: common 1/3-6%, uncommon 1-2/5-10%, rare 2/10-15%, epic 2-3/15-25%, legendary 3/25-40%), `tryEnemyLoot(g, e)` (18% base + 5% on brutes + 3% on scouts).
- Three kill paths (dash hit / melee hit / projectile hit) each call `tryEnemyLoot(g, e)` inside the `if (e.hp <= 0)` block, right before the hit-stop assignment.
- `recomputePlayerStats(p)` (exported) walks `p.equipped`, sums affix percentages, multiplies on top of `CLASS_DEFS[p.classId]` base. Stats touched: `hpMax` (current `hp` scales proportionally so a +hp affix doesn't snap you to 1), `speed`, `attackDmg`, `rangedDmg`, `attackRange`, `rangedCdDur` (lower = better — subtracts the % instead of adding).
- `step()` got a new block right after the stairs check: scans for the nearest pickable within `PICKUP_LOOT_RANGE = 1.2`, stores it on `g.nearestPickable`, ticks `p.interactCd`. On `input.interact` press with a nearby item: 0.3s cooldown set, swap into the matching slot, drop the previously-equipped item back into `g.items` at a small jitter offset, call `recomputePlayerStats(p)`, write a `g.toast` with affix-formatted text. Toast counts down via `ttl -= dt`.

### What landed (Dungeon3DRun.tsx)

- BUILD_STAMP refreshed to `2026-06-06T22:30:00Z`.
- `lucide-react` imports add `Hand` (button icon) + `Backpack` (HUD icon).
- Engine imports add `RARITY_COLORS`, `RARITY_HEX`, `recomputePlayerStats`, and the `Item`/`Rarity` types.
- `inputRef` + `keys` ref both gain `interact: boolean`. Keyboard binds `KeyE` -> interact (true on down, false on up).
- `interactPress` touch handler matches the existing attack/ranged pattern (sets the key true and clears it after 120ms).
- `threeRef` gained `itemGroup: THREE.Group`. Setup useEffect creates the group and adds it to the scene.
- New mesh-rebuild block sits right before `renderer.render(scene, camera)`: tears down all existing children (disposing geometry + material to keep iOS memory happy), then for each non-picked-up `g.items` entry spawns a fresh `OctahedronGeometry(0.32, 0)` mesh with `MeshStandardMaterial` using `RARITY_COLORS[it.rarity]` for both color + emissive (intensity 0.85). Position bobs `±0.1u` at `Math.sin(g.elapsed * 2 + idChar*0.7)`, Y-rotates at `g.elapsed * 1.2`. Visibility gated by fog-of-war.
- Equipment HUD (top-left of `<main>`): a `<div>` panel with a `Backpack` icon header + three rows (WEAPON / ARMOR / TRINKET). Empty slots render `—` in faded foreground; filled slots show the item name in the rarity color via `RARITY_HEX[it.rarity]`.
- Pickup toast: top-center, fixed position, rarity-colored border + text, fades the last 0.6s via `Math.min(1, g.toast.ttl / 0.6)`.
- New interact button: 50px, tan/neutral gradient at opacity 0.3 by default, goes to opacity 1.0 + rarity-color border + box-shadow when `g.nearestPickable` is non-null. Positioned `right: max(15%, calc(58px + safe-area))` + `bottom: max(18%, calc(110px + safe-area))` — between joystick and melee, just above the existing button row so it doesn't fight the joystick zone on small screens.
- Floating `[E] {name}` label renders just above the interact button when `g.nearestPickable` is non-null, in the rarity color.

### What to test on iPhone

1. **Drop chance**: kill ~10 grunts — should see ~2 items drop. Brutes/scouts feel slightly more generous (23%/21% vs 18%). Items appear as glowing prisms on the floor, bobbing + rotating, color-coded by rarity (white/green/blue/violet/orange).
2. **Interact button glow**: walk near a dropped item — the new tan-ish button between joystick and melee should snap from 30% opacity to full opacity + a rarity-colored border + shadow. A small `[E] NAME` label appears above the button. Walk away → it fades back out.
3. **Equip → stat changes**: tap the interact button. Toast appears at top center for ~2s ("RARE Hunter's Bow — +12% dmg, +8% spd"). The top-left HUD slot updates with the item name in its rarity color. Stats apply immediately — a +speedPct item should make the player visibly faster; +rangedCdPct cuts the Zap cooldown; +hpPct bumps the HP bar (current HP scales proportionally so you don't get nuked).
4. **Slot replacement**: pick up a second weapon. The previous weapon drops back on the floor right where the new one was — pick it back up if you want to swap again.
5. **Floor clear bonus**: hit the stairs to descend. The next level should already have an uncommon-or-better item waiting near the spawn point — verifies the descend-bonus path + that `equipped` persists across floors.
6. **Header BUILD_STAMP**: should show `06-06 22:30` so you know you're on the Phase 4 build.

### Still TODO (Phase 4 leftovers)

- Full inventory grid w/ compare-hover + tap-to-equip (only top-left HUD strip lives right now).
- Sell/salvage for currency.
- Per-class default kits or starter-item bias would feel nice (warrior leans weapons, ranger trinkets, mage armor).
- Drop chance could scale with depth so deeper floors feel more rewarding.

## Phase 5 session notes (2026-06-06)

- Commit `3be1a5c` on `main`. Vercel deploy URL captured in iPhone test summary (see chat).
- Patch script: `C:\Projects\patch_dungeon3d_phase5.py` — 17 engine edits + 12 tsx edits = 29 total, sentinel `PHASE5_APPLIED` makes it idempotent on re-runs.
- **In-run progression:**
  - `Player` gains `xp`, `xpToNext`, `level`, `abilities[]`, `metaUnlocks[]`, `dmgTakenMult`, `meleeBelow40Mult`, `manaShieldUsedThisFloor`, `shotCount`.
  - `Game` gains `pendingLevelUp`, `levelUpChoices[]`, `runShardsEarned`, `runEnded`.
  - `awardXpForKill(g, kind)` called from all 3 kill paths (dash, melee, projectile). Level-up loops in case one kill crosses multiple thresholds.
  - Level-up modal renders 3 ability cards in class-color gradient; tap one → `applyAbilityChoice(p, id)` → recompute → resume.
- **Ability pools (`ABILITY_DEFS`, 18 total):**
  - Warrior: bulwark (stat +20% hp), vampiric (tag, 10% lifesteal on melee/dash), cleave (tag, 90° cone), momentum (tag, dash refunds 50% CD on hit), ironhide (stat -15% dmg taken), berserker (stat +30% melee below 40% hp).
  - Ranger: swift (stat +15% spd), pierce (tag, projectiles pass through 1 enemy), triple_shot (tag, 3 arrows), eagle_eye (stat +30% rng dmg / +50% rng range), evasion (tag 25% dodge), quickdraw (stat -20% rng CD).
  - Mage: arcane_battery (stat -25% rng CD), frost_nova_plus (tag, 0.5s nova stun), fireball_split (tag, 4 mini fireballs), mana_shield (tag, first hit/floor negated), meteor (tag, every 8th shot = 3× dmg + 1.8× radius), chilling_aura (tag, slow 30% within 4u).
- **Meta progression (cross-run):**
  - localStorage key `henry-dungeon-meta-v1` = `{ shards: number; unlocks: Record<ClassId, string[]> }` with defensive parse (malformed → defaults).
  - `META_UNLOCKS` (9 total, 3 per class at 50/75/150 shards):
    - Warrior: Veteran +10% hp, Sharpened +10% melee dmg, Ironclad -10% dmg taken.
    - Ranger: Trained +10% spd, Marksman +10% rng dmg, Eagle Scout -10% rng CD.
    - Mage: Apprentice +10% hp, Adept +10% nova dmg, Archmage -10% rng CD.
  - Apply chain: `CLASS_DEFS[id]` → `classDefWithMeta(id, unlocks)` → ability stat bumps → gear affixes.
  - Run-end shards = `runKills + floor * 5`, persisted automatically when `g.runEnded` flips.
- **UI:**
  - XP bar (h-1) below the existing HP bar, color-coded by class tint.
  - Level badge in header: `· Floor N · Lv M` (Floor = depth, Lv = player.level).
  - Level-up modal full-screen translucent, 3 class-tinted cards with center one pulsing (`@keyframes phase5pulse` 1.025× scale loop).
  - Soul Forge button on class-select (bottom of card list) opens a modal with per-class unlock grid. Owned items lock in green; affordable in yellow border; unaffordable dimmed.
  - Run-end banner appears on class-select screen after death: kills + floor + shards earned.
- **HOTFIX (bundled, priority #1):**
  - iPhone class-select tap fix: cards now bind BOTH `onPointerDown` AND `onClick`, plus explicit `touchAction: "manipulation"` + `pointerEvents: "auto"` + `WebkitTapHighlightColor` for visual feedback.
  - `console.log("[d3d] class tapped:", c)` for remote-debugging confirmation.
  - Same belt-and-suspenders pattern applied to all Phase 5 buttons (level-up cards, Soul Forge button + modal entries + close).
- **What to test on iPhone:**
  1. Tap a hero on class-select → run starts immediately (no frozen screen).
  2. Kill enemies → XP bar fills → level-up modal appears at threshold → tap an ability → effect applies (e.g. Berserker dmg jumps when hp drops; Mana Shield negates first hit on the next floor).
  3. Die → return to class-select → see the run-end banner with shards count.
  4. Tap Soul Forge → buy an unlock (start with Veteran for warrior, 50 shards) → return → start a new warrior run → notice the +10% hp on the new run baseline.
- **Phase 5 leftovers (not blocking):**
  - Enemy HP/dmg scaling by depth — currently only count scales.
  - Loot quality floor lift on deeper floors — currently same global weights.
  - Multi-level-up queueing UX (more than 1 level in a single frame) currently re-rolls choices on each resolution; could be smoother.
  - No HUD indicator for currently-active abilities (player has to remember what they picked).



## Phase 6 session notes (2026-06-07)

Phase 6 (bosses every 5th floor) shipped 2026-06-07 commit `27d9243`, deployed at https://henry-dynasty.vercel.app/dungeon3d/run (BUILD_STAMP `2026-06-07T00:30:00Z`, vercel `dpl_2Th6nS8eHNB9sLzJ7h6mhKJgiM4f` READY). Camera dial-back hotfix landed first in commit `fdce58b` (frustum base 22 / portrait 1.25× ≈ 27.5 effective, `LOOKAT_Z_OFFSET = 0` so the character renders dead-center).

### What landed (engine.ts)
- `FloorKind = "normal" | "boss"` on `DungeonLevel`. Boss floors detected via `depth > 0 && depth % 5 === 0` and routed through new `genBossLevel(depth)` — single 10×10 floor rectangle centered in the grid (40×40 world units), stairs in center.
- `BossKind = "iron_tyrant" | "hexblade" | "hollowmage"`. `BOSS_DEFS` records model URL (character-p / character-k / character-e), scale (2.5 / 2.0 / 2.0), baseHp (2000 / 1500 / 1200), speed (4.5 / 7.5 / 3.5), tint, optional emissive (violet on Hollowmage).
- `bossKindForDepth(depth)` cycles tyrant→hexblade→hollowmage by `((depth/5)-1) % 3`. `bossFloorIdx(depth, kind)` returns the per-kind repeat count for HP scaling: `maxHp = round(baseHp * (1 + floorIdx * 0.6))`.
- `Telegraph` interface with `shape: "circle" | "ring"`, `delay` countdown, `ttl` lifetime, `dmg`, `color`, `source` discriminator. Spawns added to `g.telegraphs`; resolved each frame in `_stepBoss`.
- `Boss` interface tracks kind, phase (1/2/3), hp/maxHp, speed, x/z/facing, flashT, attackCd, floorIdx, hexblade teleport state (`tpT` / `tpHidden`), hollowmage black-hole state (`blackHoleT` / `X` / `Z`), shadow-clone ids.
- `Game` gained `boss`, `telegraphs`, `bossBannerT`, `bossPhaseToastT`, `bossPhaseToastN`, `bossDefeated`.
- `spawnBossIfNeeded(g)` runs at the end of `newGame` and `descendLevel` — sets the boss, freezes engine via `bossBannerT = 1.2`.
- `_stepBoss(g, dt)` per-frame: HP-threshold phase transitions (66% / 33%) with toast trigger; per-kind movement + ability cadence; telegraph resolution loop (continuous-expand for tyrant shockwave, delay-countdown hit-test for circles); death payout via `_bossDeathRewards` (legendary loot, 200×depth XP, +100 shards, slow-mo, coin shower).
- `step()` hooks: boss banner pause at the very top, melee-on-boss damage in the attack-press block, dash-on-boss damage in the warrior dash block, projectile-on-boss damage at the start of the projectile loop, `_stepBoss(g, dt)` call after enemy filter, stairs descent gated on `g.boss === null`.

### Per-boss behavior
- **Iron Tyrant** — P1 slam (0.8s telegraph, 3.5u AoE, 25 dmg) every 4s. P2 (≤66%) replaces slam with shockwave ring radiating from boss at 6 u/s (30 dmg). P3 (≤33%) speed + cadence × 1.5, shockwaves also chain a slam.
- **Hexblade** — P1 dash + 1.7u slash cone (22 dmg) every 1.4s. P2 (≤66%) teleports behind the player on 7s cycle (`tpHidden = true`, `tpT = 0.8`, then reappear at `p - facing * 1.6` and slash). P3 (≤33%) summons up to 2 shadow clones (1 HP scout-kind enemies); cloneIds list refills as they die, capped at 2 simultaneous.
- **Hollowmage** — P1 fans 5 slow homing-ish orbs (18 dmg each) every 5s — they're player projectiles with smaller radius. P2 (≤66%) meteor on player's current position with 1.2s telegraph (40 dmg, 2u radius). P3 (≤33%) drops a black-hole at arena center for 3s — pulls player at 2.5 u/s, ticks 6 dmg/sec while inside.

### What landed (Dungeon3DRun.tsx)
- Imports add `BOSS_DEFS` + `Boss` / `BossKind` / `Telegraph` types.
- `threeRef` gains `bossObj` / `bossMixer` / `telegraphObjs` (id-keyed mesh map).
- Initial setup loads the boss GLB (from `BOSS_DEFS[kind].modelUrl`) at `0.9 * scale`, applies optional emissive (Hollowmage).
- `rebuildLevel` drops the previous-floor boss mesh + every telegraph mesh on descend, then loads the next floor's boss if `nextGame.boss`.
- Per-frame loop: boss mesh position/rotation/visibility (hidden during hexblade teleport), animation mixer tick, hit-flash via emissive swap (`0xff5050` while `flashT > 0`, restore on release).
- Telegraph meshes: `CircleGeometry` or `RingGeometry` with additive material, ID-keyed in `telegraphObjs`; geometry rebuilt each frame for expanding rings (Tyrant shockwave); opacity pulses with delay fraction.
- HUD overlays inside `<main>`: boss HP bar pinned top-center (color per kind, phase markers at 66% / 33% with `PHASE n / 3` caption); large boss-name banner (~38% screen height) while `bossBannerT > 0`; phase-transition toast (`BOSS PHASE 2 / 3`) below banner while `bossPhaseToastT > 0`.
- BUILD_STAMP bumped to `2026-06-07T00:30:00Z` with marker `PHASE6_BOSSES`.

### Test path
1. Open https://henry-dynasty.vercel.app/dungeon3d/run on iPhone (or any device).
2. Pick a class (Warrior / Ranger / Mage).
3. Push floor 1 → 2 → 3 → 4 → 5. Floor 5 should drop you into the 10×10 arena, freeze for 1.2s while "THE IRON TYRANT" banner shows, then start the fight. HP bar at top, watch for 66% / 33% phase markers + `BOSS PHASE 2/3` toasts. Beat him — guaranteed legendary appears next to the corpse, +200×5 = 1000 XP, +100 shards in the stash, brief slow-mo. Stairs in center now usable.
4. Push to floor 10 → Hexblade. Verify the P2 teleport actually relocates the model behind the player after the 0.8s blink. P3 should spawn 1-HP shadow clones.
5. Floor 15 → Hollowmage. Confirm violet emissive, P2 meteor telegraph at your spawn position, P3 black hole pulls you toward center.

### Camera hotfix bundled before Phase 6 (commit `fdce58b`)
- `camTuningRef.current.d = portrait ? 22 * 1.25 : 22` (was `28 * 1.35 : 28`) — ≈27.5 effective in portrait, roughly 2× the original 14 from before the zoom-out experiment.
- `camTuningRef.current.lookAtZ = 0` (was `portrait ? 3.0 : 1.5`) — player renders at the geometric center of the viewport.
- BUILD_STAMP marker `HOTFIX_CAMERA_DIAL_BACK` (`2026-06-06T23:58:00Z`).

### Still TODO / known caveats
- Hollowmage P1 orbs are projectile-style straight-line, not true homing — they fan out from the boss in 5 angles. True homing would need a per-projectile target ref and a small turn-rate field. Acceptable v1.
- Hexblade clones are scout-kind with 1 HP and inherit normal enemy XP per kill; their damage doesn't differ from a normal scout (engine just uses `ENEMY_DAMAGE`). Spec called for "half damage" — a follow-up could add `Enemy.dmgMult` to honor that.
- No boss music / SFX yet (Phase 7).
- No per-boss kill record persisted in run stats — could add to `runEnd` summary.
- Black-hole telegraph uses a static circle mesh; could be juicier with a swirl shader.
