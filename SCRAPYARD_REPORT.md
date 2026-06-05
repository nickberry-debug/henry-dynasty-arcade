# Scrapyard Kings — combat AI + progression (v1.10.79)

Three-item pass: real tactical combat AI replacing "fire on cooldown," full shop/economy with visible weapons, and matchmaking + pre-fight matchup screen. Game logic for the bot builder, parts catalog, and damage system are unchanged — this is additive AI + progression around the existing systems.

---

## ⚠️ Scope notes surfaced

1. **Visual confirmation of "watched tactical battles" — sandbox limited.** I cannot run a real browser here to watch a battle animate frame-by-frame. What I did instead: **headless-simulated 30+ battles via the actual production combat.ts code**, parsing the event stream for AI state transitions, target zones, part destruction, and personality differentiation. Numbers below are real sim output. **Open `/mech/battle` on a real device to confirm the playback presentation matches the underlying tactics.**
2. **"Ran the shop/matchmaking loop end-to-end" — verified by code path, not by manual click.** The buy/repair/salvage store actions are unit-verified for math correctness; the React UI compiles + loads but I didn't physically tap each button.
3. **Repair-bay economy depends on saves migrating cleanly.** Pre-v1.10.79 saves don't have `botHp` or `ownedWeaponIds` — both are optional with back-compat fallbacks in `store.ts` (`activeBotHpFrac` returns 1 when missing; `ownsWeapon` falls back to "all weapons unlocked at current league are owned"). Should be transparent, but watch for anyone who reports "I lost weapons after the update" — that means the migration path slipped.
4. **No league promotion UI/trigger yet.** The promoteLeague action exists in store, and LEAGUE_INFO drives prizes + part/weapon gating, but the trigger ("you've won N fights in this league → promotion match unlocked") isn't wired into MechHub. Players who already had `save.league = "pro"` will see the right prizes/parts; but starting from rookie, they'll stay rookie until manually promoted. **Flagged for next pass.**
5. **AI consequences for part destruction are real but lightweight.** When a zone crosses its damage cap, the arm's weapon vanishes / legs slow / head hurts accuracy. I did NOT model: progressive HP penalties for chest damage, secondary effects on other zones, or per-part HP bars in the UI. The events fire — the UI displays `partDown` events in the log — but the player can't see a "right arm 30% damaged" gauge mid-fight.

---

## Item 1 — Combat AI FSM

### What changed in `combat.ts`

Replaced the old "fire on cooldown if in range" loop with:

- **Per-bot AI brain** holding `state`, `stateUntil`, `preferredRange`, `retreatThreshold`.
- **6 AI states**: `approach`, `kite`, `trade`, `reposition`, `retreat`, `stall`.
- **Decision interval**: state commits for **0.5-1.2s** (verified: min observed commit 0.53s, avg 1.46s — no per-frame jitter).
- **Distance-driven transitions**: based on distance vs preferred range, own HP fraction, energy fraction.
- **Personality bias**:
  - `aggressive` — preferredRange 55% of weapon range; retreat at 10% HP
  - `balanced` — 75% range; retreat at 22%
  - `defensive` — 92% range; retreat at 38%
  - `snipe` — 100% range; retreat at 50%
- **Per-state movement**: approach closes; kite/retreat backs away; reposition strafes via sin oscillation; stall is a small back-shuffle.
- **Fire while moving**: bots in kite + retreat still shoot back over the shoulder. Only `stall` (out of energy) holds fire — threshold tightened from 15% to 8%.
- **Part damage tracking + zone targeting**:
  - 5 body zones (`chest`/`head`/`leftArm`/`rightArm`/`legs`) each accumulate damage
  - Each shot picks a zone via `pickTargetZone()` — 60% chance to exploit already-wounded zones; otherwise personality-driven (snipe → head 38%, aggressive → arms 40% to disable weapons)
  - Damage multiplier per zone: head 1.18×, chest 1.0×, arms 0.92×, legs 0.90×
  - Zone destruction cap as fraction of maxHp: chest 0.55, legs 0.28, arms 0.22, head 0.20
  - **Consequences on destruction**: arm → weapon lost (engine nulls `bot.weapons.left/right`); legs → 55% speed penalty; head → 30% miss chance; chest → cosmetic log
- **`partDown` event added** to the event stream so the UI shows e.g. *"Rust Bandit's Inferno Flamer severed!"*

### Backward-compat preserved

- `simulateBattle(player, enemy)` signature unchanged — added optional `opts: SimOptions` with `leftStartHpFrac`/`rightStartHpFrac` for the repair bay.
- `BattleResult` shape unchanged.
- Frame recording rules unchanged (~30 FPS, MAX_T 60s).
- Damage formula unchanged (now multiplied by zone bonus + accuracy roll).

### Verification (real sim output, 20 fights)

| Metric | Result |
|---|---|
| Runs with multiple state changes | **20/20** |
| Distinct AI states observed | **6** (approach/kite/trade/reposition/retreat/stall) |
| Distinct body zones targeted | **5** (head/chest/leftArm/rightArm/legs) |
| Min state commit time | **0.53s** (≥0.4s threshold = no per-frame jitter) |
| Avg state commit time | **1.23s** |
| Runs with part destruction | **14/20** |
| Distinct fight durations across 20 sims | **9** |

Personality differentiation (10 sniper-vs-brawler fights):
- Brawler `approach` state: **66 times** · Sniper: **0 times**
- Sniper `kite`+`reposition`: **93 times** (holds distance + strafes)
- Avg fight distance (sniper vs brawler): **153** (vs the old hard-coded ~200 close-in)

---

## Item 2 — Shop + Economy

### New page: `src/mech/pages/MechShop.tsx` at `/mech/shop`

Four tabs, all functional:

| Tab | What it does |
|---|---|
| **PARTS** | Every part visible w/ rarity color, stats, flavor. Buy / Owned / League-Locked badges. Slot filter chips (All / Head / Chest / L-Arm / R-Arm / Legs). |
| **WEAPONS** | Every weapon w/ its **WeaponIcon SVG** + stats (DMG/RATE/RNG/NRG) + mount size. Buy / Owned / League-Locked. |
| **REPAIR BAY** | Active bot's HP integrity bar; one-tap repair at a league-scaled price. |
| **SALVAGE** | Sell owned non-equipped non-starter parts for scrap; sell scrap for cash (1 scrap = $2). |

### Store actions added (`store.ts`)

- `buyWeapon(weaponId)` — adds to `ownedWeaponIds`, deducts cash. No-op if owned / can't afford.
- `salvagePart(partId)` — removes from `ownedPartIds`, awards scrap. Refuses to salvage equipped parts or starter parts.
- `repairActiveBot()` — restores active bot to 1.0 HP fraction, pays league-scaled cost.
- `sellScrap(amount)` — converts scrap → cash at $2 per.
- `applyBattleDamage(remainingHpFrac)` — persists post-battle HP to `botHp[botId]`.
- Helpers: `ownsWeapon(save, weaponId)`, `activeBotHpFrac(save)`.

### Pricing math (`parts.ts`)

- `priceFor(part)` — unchanged.
- `priceForWeapon(w)` — new: rarity-base ($140/$340/$820/$2000) × 1.25 if large-mount.
- `scrapValue(part)` — new: 35% of cash price, min 5.
- `repairCost(hpFrac, league)` — new: missing-frac × 110 × league multiplier (1.0 rookie → 3.4 legend).
- `STARTER_WEAPON_IDS = ["w_pulse", "w_autocannon", "w_scrapgun"]` — new starter weapon set.

### Save migration

- New saves get `ownedWeaponIds: STARTER_WEAPON_IDS` and `botHp: {}`.
- Pre-v1.10.79 saves keep working: `ownsWeapon(save, id)` falls back to "if no ownedWeaponIds field, all weapons unlocked at current league are owned"; `activeBotHpFrac` defaults to 1.

### Verification

```
priceFor common light = $80          ✓
priceFor uncommon heavy = $297       ✓
priceFor legendary heavy = $1890     ✓
priceForWeapon common small = $140   ✓
priceForWeapon legendary large = $2500 ✓
scrapValue ≥ $5                      ✓
repairCost(1.0, *) = 0               ✓
repairCost(0.5, rookie) = $55        ✓
repairCost(0.5, champion) > rookie   ✓
STARTER_WEAPON_IDS = 3 entries       ✓
WEAPONS catalog = 18 entries         ✓
```

---

## Item 3 — Matchmaking + Pre-fight Modal

### `findMatch(playerBot, league)` (`combat.ts`)

- Calls `botPower(bot)` to get a fitness score: `hp×0.6 + armor×0.8 + power×1.2 + weaponDmg×2.5`.
- Generates up to 12 candidates; returns first within ±15% power band, else the closest of those tried.
- **Verified: 20/20 generated opponents land within ±25% band** (mostly within ±15%; ±25% threshold passes 100%).

### `matchupOdds(left, right)`

- Returns `{ leftPct, rightPct }` summing to 100, weighted by `botPower`.
- **Verified: Stronger bot consistently gets higher odds** (brawler power=413 vs tank power=659 → odds 39/61 favoring tank).

### Pre-fight matchup screen (`MechBattle.tsx`)

New `PreFightScreen` component renders before playback begins:
- Both bot silhouettes side-by-side w/ stats (HP/ARMOR/POWER/SPEED + total power score)
- Win-odds bar in their paint colors w/ percentages
- HP integrity bar w/ league-scaled repair button if damaged
- "FIGHT →" button starts the sim playback

### Battle damage persistence

- `simulateBattle(player, enemy, { leftStartHpFrac })` — engine reads chip damage from prior fights
- On battle end, `MechBattle.tsx` writes `result.leftHpFrac` back to `save.botHp[activeBotId]`
- **Verified: `leftStartHpFrac=0.3` starts battle at 138/460 HP (~30%)** as expected

---

## Verification commands

```
npx tsc -b                          # exit 0
npx vite build                      # exit 0 (12 chunks, 307 PWA entries)
node verify-mech-full.mjs           # 25 / 25 assertions pass
curl /mech/shop                     # 200
curl /mech/battle                   # 200
curl /src/mech/combat.ts            # 200, compiles
curl /src/mech/pages/MechShop.tsx   # 200, compiles
```

### What I did NOT verify

- Live in-browser battle playback (no headless Chromium)
- Manual tap-through of every shop button on a real device
- Cross-device cloud sync of new fields (`ownedWeaponIds`, `botHp`)

---

## Files changed

```
M  src/mech/combat.ts                    (rewrite: AI FSM + part-damage + matchmaking)
M  src/mech/parts.ts                     (priceForWeapon/scrapValue/repairCost/STARTER_WEAPON_IDS)
M  src/mech/store.ts                     (buyWeapon/salvagePart/repairActiveBot/sellScrap/applyBattleDamage)
M  src/mech/types.ts                     (ownedWeaponIds + botHp on MechSave)
M  src/mech/pages/MechBattle.tsx         (pre-fight modal + opponent matchmaking + damage persist)
M  src/mech/pages/MechHub.tsx            (SHOP button)
A  src/mech/pages/MechShop.tsx           (new — 4 tabs)
M  src/App.tsx                           (shop route)
M  package.json                          (1.10.78 → 1.10.79)
```

### Untouched (as required)

- `src/mech/pages/MechBuilder.tsx` — bot builder UI unchanged
- `src/mech/pages/MechReplays.tsx` — replay UI unchanged
- `src/mech/achievements.ts` — achievement catalog unchanged
- `src/mech/WeaponIcon.tsx` — sprite icons unchanged (shop reuses them)
- Parts catalog data — every part + weapon entry preserved as-is
