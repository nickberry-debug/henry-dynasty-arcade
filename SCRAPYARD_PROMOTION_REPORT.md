# Scrapyard Kings — League Promotion UX (v1.10.81)

Closes the loop on the league progression flagged in v1.10.79's report: the `promoteLeague` action existed but nothing in the UX called it. Now wins-per-league are tracked, a "PROMOTION FIGHT" CTA unlocks at the threshold, and beating a named league champion advances the player up the ladder.

---

## ⚠️ Scope notes surfaced

1. **Live "I played the loop end-to-end" — sandbox limit.** I simulated the full ladder climb (rookie → amateur → pro → champion → legend) in production code via 42 headless assertions; every transition checks out (counter increments, threshold unlocks, promotion-win advances league + resets counter + adds trophy, terminal Legend correctly blocks further promotion). **Open `/mech` on a real device to confirm the in-browser presentation matches the engine output.**
2. **Existing combat AI / shop / parts / repair / matchmaking — confirmed untouched.** Regression test re-ran a fresh combat sim: 58 AI state-change events fire in a single fight (the same FSM from v1.10.79), and the shop / repair / matchmaking modules were not edited. The only mutation to MechBattle's existing battle-end block is the addition of the leagueWins/promotion branch — money/scrap/wins/losses/botHp/battles/trophies mutations from the prior pass are intact.
3. **Promotion trophy is added on advance, but a dedicated promotion-victory celebration screen wasn't built.** The existing battle-end overlay handles the win the same way it handles any other (prize toast + KO summary); the player can see the league change on the next visit to the Hub. A "YOU'VE ADVANCED TO AMATEUR ARENA" full-screen burst would be nice polish but is out of scope for this fix.
4. **Promotion match shares the same pre-fight modal as regular fights** — no special "championship intro" framing. The opponent's name (`Crushlock, the Rookie Champion` / `Iron Marlene, Amateur Arena Champion` / etc.) shows in the matchup card, and the bot's paint is crimson, but otherwise the framing is the same as a normal fight.

---

## What got built

### `src/mech/types.ts`
- `MechSave.leagueWins?: Partial<Record<League, number>>` — per-league win counter (optional, backward-compat).
- `WINS_FOR_PROMOTION: Record<League, number>` — 5 / 6 / 7 / 8 / Infinity (Legend is terminal).

### `src/mech/store.ts`
- `winsInCurrentLeague(save)` helper — reads `leagueWins[save.league]` with safe `?? 0` fallback.
- `winsNeededForPromotion(league)` helper — returns the threshold for any league.
- `isPromotionReady(save)` helper — true iff wins ≥ threshold AND not at Legend.
- `LEAGUE_CHAMPION_NAMES: Record<League, string>` — named champions per league (Crushlock / Iron Marlene / Voidcrown / Aegis Prime).
- New action: `recordLeagueWin()` — increments the per-league counter.
- Modified action: `promoteLeague()` — now also resets the new league's counter to 0 on advance so the player isn't instantly promotion-ready again.

### `src/mech/pages/MechHub.tsx`
- New "LEAGUE PROGRESSION" card sits below the active-bot panel.
- Shows current league label + "League wins: X / N" + progress bar (gradient yellow when climbing, gradient red when ready).
- When `isPromotionReady`, the card glows red and reveals a prominent **"⚔ PROMOTION FIGHT"** button with the named champion's flavor text ("Beat *Crushlock, the Rookie Champion* — a tougher fight than your usual rivals — and advance to *Amateur Arena*.").
- When not ready, shows "Win N more fights to unlock the promotion match" hint.
- Trophy chips render below the bar when promotions have happened.
- Legend league shows a special "top of the ladder" state — no promotion exists.
- Tap on **PROMOTION FIGHT** sets `sessionStorage.dd_mech_promotion = "1"` and navigates to `/mech/battle`.

### `src/mech/pages/MechBattle.tsx`
- New `isPromotion` flag pulled from sessionStorage on mount (consumed once, same pattern as the existing family-duel `dd_mech_challenger` handoff).
- When `isPromotion` is true, the opponent generator runs 6 `findMatch` candidates and picks the strongest, then re-skins it as the named league champion (`LEAGUE_CHAMPION_NAMES[save.league]`), paints it crimson `#ef4444`, sets personality to `balanced`, and bumps HP +25% / armor +20% / power +20%.
- In the battle-end save mutation block:
  - **Regular win** → bumps `leagueWins[save.league]` by 1 (in addition to the existing total `wins`).
  - **Promotion win** → advances `cur.league` to the next entry in `LEAGUE_ORDER`, resets the new league's counter to 0, adds a `{ league, wonAt, bracket: "Promotion Match" }` trophy, and grants a bonus prize of 50% of the new league's regular prize.
  - **Loss in a promotion match** → no advance; player goes back to grinding regular wins until they choose to retry.

---

## Verification (42/42 assertions pass)

```
=== Promotion thresholds ===
Rookie needs 5 wins · Amateur 6 · Pro 7 · Champion 8 · Legend ∞

=== Helper functions ===
winsInCurrentLeague / winsNeededForPromotion / isPromotionReady — all correct

=== Battle-end mutation: regular win ===
5 regular wins → leagueWins.rookie climbs 1→2→3→4→5
After 5 wins: isPromotionReady = TRUE

=== Battle-end mutation: promotion win ===
league = rookie → amateur
leagueWins.amateur = 0 (reset)
isPromotionReady = false (must re-earn)
Trophy added: { league: amateur, bracket: "Promotion Match" }

=== Full ladder climb ===
rookie → amateur → pro → champion → legend
4 promotions complete (5 + 6 + 7 + 8 = 26 total wins to reach Legend)

=== Top league behavior ===
Legend: isPromotionReady = false
Legend: winsNeededForPromotion = Infinity

=== Pre-v1.10.81 save backward-compat ===
Missing leagueWins field → 0, isPromotionReady = false (correct)

=== Combat AI regression check ===
simulateBattle still returns frames
58 AI state-change events fire in a single sim
```

```
npx tsc -b              # exit 0
npx vite build          # exit 0
curl /mech              # 200
curl /mech/battle       # 200
curl /mech/shop         # 200
curl /mech/builder      # 200
```

### What I did NOT verify

- Live in-browser playthrough on a real device (sandbox can't run headless Chromium)
- The promotion-fight modal presentation (text, layout, button sizing)
- Cross-device sync of `leagueWins` (same blob shape as before, should serialize fine)

---

## Files changed

```
M  src/mech/types.ts                (+leagueWins on MechSave, +WINS_FOR_PROMOTION constant)
M  src/mech/store.ts                (+helpers + recordLeagueWin + reset counter on promote + LEAGUE_CHAMPION_NAMES)
M  src/mech/pages/MechHub.tsx       (+league-progression card with bar + CTA + trophy chips)
M  src/mech/pages/MechBattle.tsx    (+isPromotion handoff, champion-enemy generation, battle-end ladder advance)
M  package.json                     (1.10.80 → 1.10.81)
```

### Untouched (no regression to last-pass systems)

- `src/mech/combat.ts` — combat FSM unchanged
- `src/mech/pages/MechShop.tsx` — shop UI unchanged
- `src/mech/pages/MechBuilder.tsx` — builder unchanged
- `src/mech/pages/MechReplays.tsx` — replays unchanged
- `src/mech/parts.ts` — parts/weapons/pricing unchanged
- `src/mech/WeaponIcon.tsx` — sprite icons unchanged
- `src/mech/achievements.ts` — achievement catalog unchanged
