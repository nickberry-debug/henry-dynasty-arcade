# Dungeon Crawler 3D — Progress Tracker

> Single source of truth for the Master Roadmap. Bot reads this first on each "continue the dungeon roadmap" invocation to resume at the first incomplete item.

**Last updated:** 2026-06-06 (Phase 2a shipped — ranged auto-aim weapon)
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
| Touch button safe-area | ❌ todo (Nick: "buttons trail off screen") | Buttons use `right:24, bottom:36` — doesn't account for iOS home-indicator. Use `calc(36px + env(safe-area-inset-bottom))` |
| Joystick safe-area | ❌ todo | Same issue, joystick zone is `left:0, bottom:0` — should respect `env(safe-area-inset-bottom)` and `env(safe-area-inset-left)` |
| Camera bounds at map edges | ❌ todo (Nick: "mild clipping at end point of map") | Camera lerps toward player without bounds; at map edges shows out-of-world void. Clamp `cameraTargetX/Z` to map interior (e.g. `clamp(p.x, CELL*2, WORLD_W - CELL*2)`) |
| Control feel tightening | ❌ todo (Nick: "controls slightly tighter, screen control is a little stiff") | Try: camera lerp factor 5 → 8, player speed 6.5 → 7.5, joystick deadzone tighter |
| Player + enemy collision feel | ❌ todo (Nick: "characters just bump into each other") | Currently `tryMove` slides; needs hit-stop on body-block + maybe pushback impulse |
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
| **Fighting + weapon animations** | ❌ todo (Nick request) | Wire attack/heavy/hit-react/death clips from the character GLBs. Per-clip duration drives `attackDur`. Sword swing trail (Three.js TubeGeometry on a sweep arc) for visual juice. |
| **Character body-blocking feel** | ❌ todo (Nick: "characters just bump into each other") | Add hit-stop on collision, plus a small pushback impulse on body-on-body contact so it feels physical, not slidey. Maybe a soft contact "thud" particle/sound. |
| Full JuiceKit on hits | 🟡 partial | Hit-stop + flash exist; needs particles, knockback (enemy is currently static through hit), screen shake on heavy hits, slow-mo on kills |

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
2. **Phase 2b queued next** (fighting + weapon animations, then body-blocking feel). Phase 1c biomes is the user's alternative — they will pick one on next ping.
3. Otherwise resume at the first ❌ item.
4. Complete & verify it. Update this file.
5. Advance through as many items as you can cleanly. STOP at a completed phase boundary if you run out of runway.

## Phase 2a session notes (2026-06-06)

- Commit `225dc86` on `main`, deployed by Vercel as `dpl_BE2y94CBwiJ6zSq6QNr6UY7wSL4J` (READY at 1780763080).
- Aliases: `henry-dynasty.vercel.app`, `henry-dynasty-git-main-nickberry-debugs-projects.vercel.app`.
- Patch script: `C:\Projects\patch_dungeon3d_phase2a.py` (19 hunks, all matched). Files changed: `src/dungeon3d/engine.ts` + `src/dungeon3d/pages/Dungeon3DRun.tsx`.
- `npm run build` green (tsc + vite). Only pre-existing chunk-size + dexie dynamic-import warnings.
- BUILD_STAMP bumped to `2026-06-06T18:00:00Z` so Nick can confirm new build on-device.
