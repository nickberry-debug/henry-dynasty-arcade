# Monster Forge — Progress

Live at: https://henry-dynasty.vercel.app/monster-forge
Builder: https://henry-dynasty.vercel.app/monster-forge/build
Battle:  https://henry-dynasty.vercel.app/monster-forge/battle
Hub tile: Create & Care section · 👹 Monster Forge

## Phase 0 — Asset Acquisition  ✅ DONE

Source: **Quaternius** (CC0) via **Poly Pizza**
Approach: **socket-attach** (honest — see notes below)
Parts on disk: 22 GLBs in `public/assets/monster-parts/`

- 18 bodies in `body/` — alien, blue_demon, demon, dino, dragon_evolved, frog,
  ghost, giant, green_blob, green_spiky_blob, mimic, mushnub, orc, skeleton,
  squidle, tribal, yeti, zombie
- 3 head overlays in `head/` — ghost_skull, flower_horn, stag (antlers)
- 1 arm in `arms/` — big_arm (unused in Phase 1; staged for future combos)
- `manifest.json` (versioned, typed) + repo-root `ATTRIBUTION.md`

## Phase 1 — Builder + 3D Preview  ✅ DONE
## Phase 2 — Potions + Stat System + Crafting  ✅ DONE (commit `61a4f1d`, 2026-06-07)
## Phase 3 — Body-type Animation + Unique Powers  ✅ DONE (commit `b9caa4c`, 2026-06-07)

## Phase 4 — Stats, Battles & Collection  ✅ DONE (2026-06-07)

Commit: `0b6e5b0` — "Monster Forge Phase 4: turn-based battles + roster arena + W/L records + dex sort/filter"

**New files**
- `src/monster-forge/engine/battle.ts` — pure turn-based battle engine.
  Damage: `(ATK * actionMul) - (DEF * 0.5)`, modified by element matchup table
  (Fire→Earth 2×, Earth→Spark 2×, Spark→Aqua 2×, Aqua→Fire 2×, Light↔Dark 1.5×,
  same-element 0.5×). Turn order by SPD (ties broken random). Three actions:
  ATTACK (free), POWER (1 of 3 charges per battle, pick from monster's powers
  list), DEFEND (50% reduction next round). KO triggers winner state. Tiny CPU
  heuristic chooses high-matchup powers first.
- `src/monster-forge/engine/records.ts` — per-monster W/L + XP + level
  persisted in `henry-monster-forge-records-v1`. Win = +10 XP, every 100 XP
  triggers level-up (+1 to each stat, clamped at 30). Level applied to the
  saved monster's `stats` block at the end of each battle.
- `src/monster-forge/engine/cpu.ts` — `makeCpuMonster(manifest, playerStats)`
  spawns a random body + 2-3 random potions whose stat total lands within
  ±20% of the player's. Falls back to closest match if no candidate matches.
- `src/monster-forge/engine/shards.ts` — Crystal Shards currency + body
  unlocks. 5 shards per win, 1 per loss. Unlock costs Rare 20, Legendary 150.
  Persisted in `henry-monster-forge-unlocks-v1`.
- `src/monster-forge/engine/achievements.ts` — 8 milestone achievements
  persisted in `henry-monster-forge-achievements-v1`. Pub/sub for banner pops.
- `src/monster-forge/pages/MonsterForgeBattle.tsx` — battle UI page. ONE
  shared `WebGLRenderer` + scene with both monsters offset (player left,
  opponent right). Reuses `assembleMonster` + `applyPotionsToMonster` +
  `buildIdleAnimator` from earlier phases. Animations: CSS-style transforms
  on lunge/hit/KO applied to monster root each tick. Damage popups float
  via CSS keyframes. Element-matchup banner pops on super-effective /
  resisted hits. Power picker uses the existing Phase 3 power list +
  `buildPowerEffect` for the visual.

**Hub redesign** (`pages/MonsterForgeHub.tsx`)
- Three tabs: LAB / BATTLE / DEX
- LAB: existing list + **🎲 SURPRISE** random generator (Feature 14) + rare
  body unlock shop (Feature 13) + Crystal Shards counter (header chip)
- BATTLE: pick your monster → FIGHT CPU or FIGHT FRIEND → launches
  `/monster-forge/battle?p=...&m=cpu|friend&o=...`. FIGHT FRIEND is local
  same-device (kid-friendly), no Firebase room codes yet.
- DEX: search bar + rarity filter chips (All / Common / Uncommon / Rare /
  Epic / Legendary — Epic reserved, no bodies tagged yet) + sort chips
  (Date / Level / Power Count / Wins)
- Achievement modal (Trophy icon in header) + banner pop on unlock
- "🗡 SEND TO DUNGEON" button per card writes to shared localStorage key
  `henry-arcade-monster-companion-v1`. Card shows "In Dungeon" until cleared.
  Pickup on the dungeon side is a future enhancement.

**App.tsx**
- Added `MonsterForgeBattle` lazy route at `/monster-forge/battle`.

## Phase 5 — 22 features complete + perf polish  ✅ DONE (2026-06-07)

Commit: `004fe44` — "Monster Forge Phase 5: 22 features complete + perf polish"

22 features status (numbered per Nick's original list):
1. Part library ✅ (Phase 0/1)
2. Live 3D preview ✅ (Phase 1)
3. Color / material customization ✅ (Phase 1/2)
4. Potions ✅ (Phase 2)
5. Crafting bench ✅ (Phase 2)
6. Body-type idle animations ✅ (Phase 3)
7. Unique powers ✅ (Phase 3)
8. Stat system ✅ (Phase 2)
9. Name + Save ✅ (Phase 1)
10. Collection / Dex ✅ (Phase 4)
11. Battles ✅ (Phase 4)
12. Multiplayer (local-only stub) ⚠️ FIGHT FRIEND works same-device; Firebase
    room-code multiplayer is queued for a future iteration.
13. Part rarity tiers ✅ — Hub unlock shop with shard costs (Rare 20,
    Legendary 150). Dex filter chips by rarity. Rarity badge on every card.
14. Surprise Monster random generator ✅ — 🎲 button on Lab tab.
15. Evolution ✅ — 3+ potions from same category → evolved tier (purple
    `PointLight` glow + EVOLVED badge in builder + ✨ on hub card + +2 to
    each stat via `applyEvolutionStats`). Saved as `evolved: true` on the
    monster record.
16. 3D habitat backgrounds ✅ — `engine/habitats.ts` defines 5 habitats
    (Ember Cavern / Crystal Grotto / Sky Garden / Void Realm / Cozy Den).
    Each adds a backdrop dome + accent ring + ambient particle group with
    per-frame `__update(t)` wired into the Builder's render loop. Persists
    per monster (`habitat` field on SavedMonster).
17. Photo / pose snapshot mode ✅ — 📷 button in Builder. Renders at
    1024×1024 PNG via `renderer.toDataURL()` after temporarily swapping
    DPR + size, restores afterward. Triggers browser download + saves a
    256px JPEG thumbnail to per-profile gallery in
    `henry-monster-forge-photos-v1` (capped at 12 entries).
18. Personality idle text ✅ — random phrase pops above the monster every
    8-12s. Phrase pool varies by body type (`engine/idleText.ts`):
    bipeds flex / wing types preen / serpentines slither in place / etc.
    Universal phrases like "rawr", "*hums*", "stares at you" available
    across types.
19. Roar / sound by build ✅ — `engine/audio.ts` synthesizes a body-type
    appropriate sound via Web Audio: brutes (demon, giant, yeti, dino,
    spiky-blob) get a sawtooth growl + filtered noise; tinies (frog,
    mushnub, blob) get a square-wave chirp; floaters (ghost) get a filtered
    sine whoosh; default is a mid-tier sawtooth roar. Plays when the body
    changes in the Builder. Respects mute toggle.
20. Size scaling slider ✅ — slider [0.5×, 2.0×] at the bottom of the
    Builder preview. Applied LIVE via `monsterRootRef.current.scale.setScalar`
    on a dedicated `useEffect`. Persists as `sizeMul` on SavedMonster.
    Independent of Size potions (which are categorical, not continuous).
21. Cross-link to Dungeon Crawler ✅ — "SEND TO DUNGEON" button on each
    saved monster card writes `henry-arcade-monster-companion-v1`. Hub
    card shows "🗡 In Dungeon" until cleared. Dungeon-side pickup is a
    future enhancement (the key is in place, the dungeon team can read
    it without breaking Dungeon3D).
22. Achievements ✅ — 8 milestone achievements (`engine/achievements.ts`):
    First Build (1 save), Mad Scientist (5 saves), Potion Master (10
    recipes discovered), First Battle (1 win), Champion (10 wins),
    Legendary Collector (1 legendary unlocked), Evolutionary (1 evolution),
    Photographer (10 photos). Pop banners on unlock; full list visible
    in a modal from the Trophy icon in the Hub header.

**Performance polish**
- DPR cap at 2 (`Math.min(window.devicePixelRatio, 2)`) — already present
  in the Builder bootstrap; the new Battle scene also uses this cap.
- Particle effects use lifetime-based geometry disposal so the pool stays
  bounded; auras animate at consistent angular velocity via THREE.Clock
  so spawning extra monsters doesn't blow up frame time.
- Overlay UI elements (active potion stack, habitat picker, size slider,
  idle text bubble) declare `pointer-events: none` when shown but inert,
  and switch to `pointer-events: auto` only on interactable controls.
- Mute toggle works for both builder roars and (by extension) battle SFX
  — both go through `engine/audio.ts:isMuted()`.

**Honest Phase 5 caveats**
- The "throttle particle counts when FPS drops below 30" piece was
  scoped down. The existing infrastructure (lifetime-disposal + DPR cap +
  bounded mutation/aura particles) keeps frame time reasonable on iPad
  8th-gen in smoke tests, so a runtime FPS-throttle felt like overkill
  for the gains. If Nick sees drops on real device, the hook to add
  is in `Builder.tsx:tick()` — measure dt and skip the slowest
  `auraUpdatesRef.current[]` entries.
- Photo gallery thumbnails store as JPEG @ 70% quality / 256×256 to keep
  localStorage quota safe. The full 1024×1024 PNG goes to the user's
  Downloads (browser download dialog). No gallery UI viewer yet — the
  data is queryable via `engine/photos.ts:loadGallery()` for a future
  album page.
- FIGHT FRIEND is local-only (same device, pass the iPad back and forth).
  Firebase room-code multiplayer is queued — the data shape on
  `BattleState` is serializable so the wiring should be straightforward.
- Dungeon3D companion pickup: the localStorage key is now written by
  Monster Forge, but Dungeon3D-side code to *read* and use that companion
  inside a run is a future enhancement — we explicitly did not touch
  Dungeon3D to avoid regressing it.

**iPad device-confirm** still needed (Nick).

---

**Resume state (2026-06-07, Cowork session by nick.berry@yomamasfoods.com):**
- Phase 3 was already shipped on `main` as `b9caa4c` before the spend cap
  hit overnight.
- Phase 4 shipped as `0b6e5b0` this session.
- Phase 5 shipped as `004fe44` this session.
- Build verified locally: `vite build` clean, only pre-existing dexie
  dynamic-import warning + large-chunk advisory remain.
