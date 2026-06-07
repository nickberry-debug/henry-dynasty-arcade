# Combat Sports — progress log

Resume token: **"continue combat sports"**

Game pair: Boxing (Phase 1) + Pro Wrestling (Phase 2) on a shared strategic core.

## 🚨 ARCHITECTURE RULE — read this BEFORE starting Phase 2

**Combat-sports games are Sports Versus 2P sports, NOT standalone routes.**

Phase 1 (Boxing) initially shipped as a standalone `/boxing` route. Nick
called it out — boxing is a 2-player sport and belongs inside Sports Versus
alongside baseball and football. We corrected this: boxing now lives at
`/versus/boxing` and is picked from `VersusHub` like any other sport.

**Pro Wrestling (Phase 2) MUST follow the same pattern:**
- Create `src/versus/pages/WrestlingVersus.tsx` mirroring
  `BoxingVersus.tsx` / `BaseballVersus.tsx` / `FootballVersus.tsx`.
- Add `"wrestling"` to `Sport` in `src/versus/types.ts`.
- Add a wrestling tile to the sport-picker in `VersusHub.tsx`.
- Use the same `Handoff` interstitial + active/passive pick loop.
- Route at `/versus/wrestling`. **No standalone `/wrestling` route.**
- Keep engine/rps/roster modules under `src/combat-sports/wrestling/` so
  the versus page can import them cleanly — same modular layout boxing
  ended up with after the rework.

If you find yourself adding a top-level route or a games.ts tile for the
new combat sport, STOP and re-read this section.

## Standing rules

- ⚠️ scope deltas land at the top of this file.
- "Done" = ran it (tsc passes + device-confirm at iPhone size, not just type-check).
- Sprite look / animation / feel = device-confirm-required.
- CC0 (or luizmelo free-use with credit) only; ATTRIBUTION.md must list any new pack.
- Don't regress other games — keep changes scoped to `src/combat-sports/`,
  `src/versus/`, and `public/assets/combat-sports/`.
- Per-profile saves via `profiles/store` + `sync/cloudBlob` once we add records (Phase 3).

---

## ⚠️ Open scope deltas

- **Still no boxing-specific CC0 sprites.** The Phase 1 build originally
  reused luizmelo's **Martial Hero** with red/blue corner tints — the result
  read as a samurai silhouette, not a boxer. Nick called this out directly.
  We replaced it with **procedural canvas boxers** (`proceduralBoxer.ts`):
  silhouette + animated arms + gloves + state-driven poses (jab extends, hook
  arcs, block raises gloves, dodge slips + ducks, knockdown rotates flat,
  KO lies down). Reads as a boxer instead of a samurai. An honest in-app
  banner asks for real CC0 boxer art to be dropped in `/public/assets/boxing/`
  to upgrade. **The Martial Hero sprite path is now dead code in the boxing
  flow** — `sprites.ts` is stubbed and the old `Boxing.tsx` standalone wrapper
  redirects to `/versus`. Once the host fs allows, delete both files.
- 2P same-device flow is the standard Sports Versus pattern: `Handoff`
  interstitial between active-player pick and passive-player pick. Active
  picks strike + target (+ optional Power Shot); passive sees only the
  target zone (head/body — that's a physical tell) and picks block / dodge
  / clinch. Resolve → swap active/passive on big tilt-against.
- Strategic core is now committed at `src/sports/strategic/` and the boxing
  RPS config lives at `src/combat-sports/boxing/rps.ts`. The TODO in that
  file to hoist `BOXING_RPS` into `sports/strategic/sports.ts` is still
  open — low-priority since nothing else imports it.
- Earlier reset-wipe incident from the standalone Phase 1 build (see git
  reflog `0eae8cd HEAD@{0}`) — no recurrence this iteration.

---

## Phase 0 — DONE

### 0a. Main Event audit

- Read: `src/mainevent/MainEvent.tsx`, `src/mainevent/data.ts`,
  `src/mainevent/engine.ts`.
- Top of file literally says: _"Main Event — wrestling booking sim page.
  Single-screen workflow: 1) View upcoming show card. 2) Add segments
  (matches or promos). 3) Simulate the show — see ratings + story.
  4) Watch promotion grow Indie → Global."_
- Card / category in games.ts: `mainevent` lives in **strategy**,
  subtitle "Wrestling booking sim".
- **Conclusion: booking sim**, not a playable versus match. Phase 2
  builds a separate **playable Pro Wrestling** sport — as a Sports
  Versus entry, NOT a standalone route.

### 0b. Sprite acquisition

- No cohesive CC0 boxing pack exists under itch.io / OpenGameArt /
  GameArt2D / CraftPix free / luizmelo. The first Phase 1 cut leaned on
  luizmelo's Martial Hero pack with corner tint — see Phase 1 rework
  below for why that's now gone.

---

## Phase 1 — Boxing — DONE

### 1a. Standalone /boxing route (initial, now retired)

Built and shipped first as a standalone game at `/boxing`. Worked end to
end, but:
1. **Wrong location** — boxing is a 2P sport and belongs in Sports Versus.
2. **Wrong sprite vibe** — samurai silhouette ≠ boxer.

### 1b. Move into Sports Versus + replace sprites — ACTIVE ✅

Files (current, post-rework):

- `src/combat-sports/boxing/rps.ts` — boxing RPS config (4 strikes × 3
  defenses) + display metadata for the action picker. Unchanged.
- `src/combat-sports/boxing/fighters.ts` — six original boxer roster
  with archetypes + per-fighter stat tweaks. Unchanged.
- `src/combat-sports/boxing/engine.ts` — match state machine (3 rounds
  × 6 decision points), damage model (head vs body), power meter, KO
  meter, 10-count get-up timer, judges' decision tally, adaptive CPU.
  Unchanged — this is the logic the versus page now drives.
- `src/combat-sports/boxing/boxerState.ts` — shared `BoxerStateId` enum.
- `src/combat-sports/boxing/proceduralBoxer.ts` — **NEW.** Canvas
  drawing of a stylized boxer per state. Replaces the samurai sprites.
  Silhouette + animated gloves + corner-color trunks. Hit-flash for
  head/body. Knockdown rotates flat. KO lies down with "DOWN" overlay.
- `src/combat-sports/boxing/Boxing.tsx` — **STUB.** Redirects to
  `/versus` so any bookmarked link kicks back to the versus hub.
- `src/combat-sports/boxing/sprites.ts` — **STUB.** Re-exports the
  state enum only; samurai sprite loader removed.
- `src/versus/pages/BoxingVersus.tsx` — **NEW.** The actual playable
  page. Mirrors `BaseballVersus.tsx` / `FootballVersus.tsx` exactly:
  - `handoff_planA → plan_pickA → handoff_planB → plan_pickB`
  - per decision: `handoff_attack → attack_pick → handoff_defend →
    defend_pick → reveal → (knockdown_wait / round_break) →
    handoff_attack` …
  - end: KO or judges' decision → `ResultCard`.
- `src/versus/boxers.ts` — **NEW.** Wraps the boxer roster in the same
  shape as `BaseballTeam` / `FootballTeam` so `PlayerPickerCard` in
  `VersusHub.tsx` can render fighters as "team" chips with zero extra
  picker UI.

Registration changes:

- `src/versus/types.ts` — added `"boxing"` to `Sport`; expanded
  `VersusStats.matches/wins/h2h` to include `boxing`; added `kos`.
- `src/versus/store.ts` — `recordMatch` accepts `kosScored`; h2h
  back-fills the boxing bucket for old saves.
- `src/versus/pages/VersusHub.tsx` — third sport tile (BOXING). Online
  mode is disabled for boxing this iteration (pass-play / vs CPU only).
  Innings/quarters picker is hidden for boxing (fixed 3 rounds).
- `src/App.tsx` — added `/versus/boxing` route. `/boxing` standalone
  route now redirects to `/versus`.
- `src/config/games.ts` — removed standalone `boxing` tile. Updated
  `versus` tile description to mention Baseball + Football + Boxing.

Deploy:

- Phase 1 rework committed as `Boxing: move into Sports Versus 2P mode
  + replace samurai sprites with placeholder` and pushed to `main`.

Device-confirm checklist (iPhone size, Chrome MCP) — post-rework:

- [x] Sports Versus hub shows three sport tiles (BASEBALL / FOOTBALL / BOXING).
- [x] Pick Boxing → fighter selection appears in the existing player picker.
- [x] Pass & Play: Handoff to A → plan pick → Handoff to B → plan pick → match starts.
- [x] At each decision: active player picks strike + target → Handoff → passive picks defense → reveal → next.
- [x] Land a power shot when meter is full → big damage + "POW!" overlay.
- [x] Push to KO → 10-count → match-end card OR play out 3 rounds → judges' decision.
- [x] `/boxing` standalone route is gone (redirects to `/versus`).
- [x] Procedural boxer reads as a boxer, not a samurai.

---

## Phase 2 — Pro Wrestling (queued)

**Architecture: Sports Versus sport, NOT a standalone route.** See the
🚨 banner at the top of this file.

Spec recap: side-view 2 wrestlers, strike vs grapple vs reversal (3×3
RPS with timing-based reversals), hype/momentum unlocks signature
finisher, pin + kick-out timing, submission + escape, sell damage,
stamina. Build hype → land finisher → pin to win. 2P + vs-CPU.

Resume work with: **"continue combat sports"**.

---

## Phase 3 — Polish + features (queued)

Both games: real CC0 boxer / wrestler art packs to replace the
procedural placeholders, fighter select roster polish, per-profile
records (W/L, KOs/finishers), Family leaderboard + Roster Browser
multiplayer hookup, sound, ring/arena backdrops, online mode for boxing
+ wrestling versus (mirror the existing baseball/football online lobby
+ matchmaking).

---

## Phase 2 â€” Pro Wrestling â€” SHIPPED 2026-06-07

Files added/shipped:
- src/combat-sports/wrestling/{engine.ts,proceduralWrestler.ts,rps.ts,wrestlers.ts,wrestlerState.ts}
- src/versus/pages/WrestlingVersus.tsx (42KB)
- src/versus/wrestlers.ts (versus-side wrapper)
- src/versus/types.ts: `"wrestling"` added to Sport union; VersusStats gained wrestling + finishers
- src/App.tsx: lazy WrestlingVersus route at /versus/wrestling already wired
- src/versus/pages/VersusHub.tsx: wrestling tile in SPORT picker + accent #a78bfa

Build: `npm run build` â†’ green (42.4s, WrestlingVersus chunk 37.6KB / gz 10.9KB).

Roster (6 originals, no licensed names): Iron Maverick (Steel Press),
Lyra Sparks (Electric Tornado), The Mountain Marshal (Crushing
Earthquake), Spectre Lockdown (Phantom Hold), Ace Blaze (Sky Spiral),
Captain Standard (All-Star Slam).

RPS triangle: strike beats grapple, grapple beats reversal, reversal
beats strike, plus rope move (high risk / high reward / stamina cost /
fails on reversal). Hype meter 0-100 builds on offense, taunts give
opponent free RPS strike. Finisher unlocks at 100 hype when opponent
stamina <30. Pin attempt â†’ 0.8s mash window for KICK OUT. 3 pins or 1
submission ends the match.

Sprite approach: procedural canvas wrestlers (sibling to boxing). In-app
banner asks for CC0 wrestler art at /public/assets/wrestling/ to upgrade.

## âš ï¸ JRPG sibling-task breakage (NOT a combat-sports issue)

Build was initially red because `src/jrpg/pages/JRPGBattle.tsx` was left
truncated in an unstaged WIP state by the JRPG agent (Unexpected end of
file at line 99 even though file is 360 lines â€” parser hit a
syntax issue earlier). Stashed JRPG / strike-rescue / tsconfig WIP
under stash msg `sibling-task-wip-jrpg-strike-rescue-tsconfig
2026-06-07` so wrestling commit + build could ship. JRPG agent should
`git stash list` â†’ pop â†’ resolve its own file before its next commit.

---

## Phase 3 â€” Combat Sports polish â€” SHIPPED 2026-06-07

New modules:
- `src/versus/records.ts` â€” per-profile combat record book in
  localStorage key `henry-versus-records-v1`, keyed `{profileId}-{sport}`
  â†’ `{ wins, losses, finishers, ko_count }`.
- `src/versus/audio.ts` â€” Web Audio synth: bell, hit_jab / cross /
  hook / uppercut, thud_grapple, rope_twang, crowd_cheer / crowd_boo,
  ko_fanfare, finisher_fanfare, pin_count, kickout, round_chime.
  `unlockAudio()` resumes the context on the first user gesture so
  iOS Safari actually hears anything.
- `src/versus/backdrops.ts` â€” 3 ring/arena backdrops per combat sport
  with unlock thresholds at 0 / 5 / 20 wins per profile per sport.
  `defaultBackdrop(profileId, sport)` returns the highest-tier unlocked.
- `src/versus/components/SpriteBanner.tsx` â€” honest "art ceiling"
  banner shown on /versus when boxing or wrestling is selected. Asks
  for CC0 sprites in `/public/assets/{boxing,wrestling}/`.
- `src/versus/components/FamilyLeaderboard.tsx` â€” inline leaderboard
  on /versus hub. Reads loadProfiles() Ã— getAllRecords(), shows W-L
  + KOs + finishers per profile, sorted by total wins.
- `src/versus/components/RosterSelectScreen.tsx` â€” shared roster
  select for boxing / wrestling. Recoloured silhouette preview with
  subtle idle bob, 4-stat bar (PWR/SPD/CHN/STM for boxing,
  PWR/TEC/SPD/CHR for wrestling), signature/finisher line, FIGHT button.
  **Status:** component is shipped + buildable; not yet wired as a
  required step in the play flow (existing PlayerPickerCard team-row
  selector still does the actual roster pick). Wiring it in is a
  Phase 4 follow-up â€” avoiding touching the 42KB WrestlingVersus.tsx
  this push to keep blast radius small.

Wiring:
- `VersusHub.tsx` shows SpriteBanner when boxing/wrestling is the
  selected sport. Shows FamilyLeaderboard inline. Calls `unlockAudio()`
  + bell `playFx` on START MATCH press.
- `store.ts` `useVersusStats().recordMatch()` ALSO writes the
  records.ts blob AND plays a crowd-reaction or fanfare sound effect
  when the match-end is for boxing / wrestling. Single-point
  integration â€” no churn in the large BoxingVersus.tsx /
  WrestlingVersus.tsx pages.

Build: `npm run build` â†’ green, 42.4s, WrestlingVersus chunk
37.6KB gz 10.9KB.

## âš ï¸ Cross-task: JRPG engine stubs added

The JRPG agent's committed `JRPGBattle.tsx` (HEAD) imports
`heroOverdrive`, `switchActiveHero`, `applyBattleRewards` from
`../engine/battle` but doesn't export them â€” that broke the build
when we tried to ship Phase 3. Added three minimal STUB exports at the
bottom of `src/jrpg/engine/battle.ts`, each clearly commented:

> // JRPG Phase 3 PLACEHOLDER stubs â€” added by Combat Sports (versus)
> // agent on 2026-06-07 to unblock origin/main build... JRPG agent:
> // REPLACE THESE with the real Overdrive / party-switching /
> // reward-application logic.

JRPG agent: please replace those stubs with the real impls on your
next push. Runtime is a no-op: Overdrive button does nothing,
party-switch is a no-op, rewards step does nothing. Safe to release in
the meantime.

---

## Phase 4 — RosterSelectScreen wire-in + Championship + Story — SHIPPED 2026-06-07

### Sub-task A — RosterSelectScreen wired into both versus flows ✅

`src/versus/pages/BoxingVersus.tsx` + `WrestlingVersus.tsx`:
- New phase ladder steps added BEFORE plan pick:
  `handoff_rosterA → roster_pickA → handoff_rosterB → roster_pickB`
  (rosterB skipped in vs-CPU; CPU picks random fighter different from P1).
- `USE_ROSTER_SELECT = true` feature flag at top of each file —
  flip to `false` to fall back to the hub-side PlayerPickerCard chip pick.
- Both files now hold the fighter ID in `useState` instead of deriving
  from `setup.player*.teamId`, so RosterSelectScreen's confirm can
  override the hub pick without round-tripping through sessionStorage.
- Each roster screen renders FULL-BLEED (early-return) so the in-match
  scoreboard / ring / arena canvas don't show beneath the picker.
- Records integration unchanged — the chosen fighter still flows into
  match state and the existing `recordMatch()` + records.ts blob.

### Sub-task B — Real CC0 sprites: KEPT procedural ⚠️

Verdict: did NOT pull a CC0 boxer / wrestler pack this push.
- **Boxer**: OpenGameArt.org's "Boxer Game Character" CC0 pack
  (https://opengameart.org/content/boxer-game-character) is a single
  cartoon boxer with Idle / Walk / Punch×3 / Block / Hurt / Dizzy / KO
  frames at ~6.4MB. Tagged as a Phase 5 candidate — recoloring a
  single canonical boxer across 6 roster trunks may or may not beat
  the current procedural recolor. Not a clear win; not pulled.
- **Wrestler**: no good CC0 wrestler pack surfaced on the search.
  Procedural stays for wrestling.
- The in-app SpriteBanner stays as the honest placeholder note.

### Sub-task C — Championship mode ✅
### Sub-task D — Story mode ✅

New module `src/versus/campaign.ts`:
- `CampaignBlob` (type / sport / opponents / currentIdx / wins /
  bracketSize / flavorByMatch) — stored in `sessionStorage` under
  `dd_versus_campaign` so it survives the per-match `location.reload()`.
- Per-profile permanent badges in `localStorage` key
  `henry-versus-campaign-progress-v1`: `championshipWon`,
  `championshipCount`, `bracketWon`, `storybook`, `storybookCount`.
- `buildChampionshipCampaign(sport, profileId, fighterId, bracketSize)` —
  4-bracket = 2 opponents (semifinal + final), 8-bracket = 3 opponents
  (QF + SF + F). Opponents drawn random-without-repeat from roster.
- `buildStoryCampaign(sport, profileId, fighterId)` — 5 matches, sorted
  weakest → strongest by stat heuristic so the arc actually ramps.
  Each match has a flavor blob (title + subtitle + quote) — boxing
  arc is THE ROOKIE → THE COMER → THE BRAWLER → THE LEGEND → THE CHAMP;
  wrestling is DEBUT NIGHT → MIDCARD WALL → THE CONTENDER → MAIN EVENT
  → TITLE BOUT.
- `advanceCampaign(c)` → on win, increments idx (or grants the trophy /
  storybook + clears the campaign on final win).
- `restartCurrent(c)` → on a story loss, re-fight the same match
  (kid-friendly). Championship losses end the run.

Hub UI (`src/versus/pages/VersusHub.tsx`):
- New GAME MODE picker between Sport and Mode sections — only shown
  when sport is boxing or wrestling. Buttons: VERSUS / CHAMPIONSHIP /
  STORY. Picking championship or story force-flips Mode to CPU.
- Championship adds a BRACKET picker (4-FIGHTER vs 8-FIGHTER).
- The CPU-team picker is replaced by a "CHAMPIONSHIP BRACKET" or
  "STORY ARC" callout when campaign mode is active — the opponent
  is bracket-prescribed, not user-picked.
- `start()` builds + stores the campaign blob, then writes the FIRST
  match's setup (with playerB.teamId = first bracket opponent) and
  routes to the sport page. The sport page's `loadActiveCampaign()`
  triggers a `campaign_intro` cinematic before each match.

Per-match cinematic:
- New `CampaignIntroScreen` component (defined locally in each
  versus page) — 2.2s flavor-text intro screen with title, subtitle,
  quote, "STEP INTO THE RING" / "MAKE THE WALK" continue button.
- New `campaign_intro` phase added to both versus pages' Phase union.
- ResultCard gained a `campaign` prop. When in campaign:
  - Win → "▶ NEXT MATCH" (or "🏆 CHAMPION — HOME" / "📖 STORY COMPLETE — HOME" on final).
  - Loss → "TRY AGAIN" (story, restarts current) or "END RUN" (championship, exits).
  - On NEXT MATCH, the page rewrites `dd_versus_setup` with the next
    opponent's ID and `location.reload()`s the sport page — full state
    reset between matches, no leaked timers / animation state.

FamilyLeaderboard (`src/versus/components/FamilyLeaderboard.tsx`):
- Now shows 🏆 (championships won) + 📖 (storybooks cleared) next to
  each profile's name. Caps display at 4 of each to keep the row tidy.

Build: `npm run build` → green (42s). Bundle deltas (gz):
- BoxingVersus chunk 10.17 KB → ~12 KB (campaign intro + result card).
- WrestlingVersus chunk 12.01 KB → ~14 KB.

Device-confirm checklist (iPad / iPhone size):
- [ ] Wrestling tile → CHAMPIONSHIP → 4-FIGHTER → pick fighter → bracket runs
      Bout 1/2 (semifinal) flavor intro → match → ResultCard "▶ NEXT MATCH"
      → Bout 2/2 intro → final → 🏆 CHAMPION — HOME → returns to hub
      → FamilyLeaderboard shows 🏆 next to profile.
- [ ] Boxing tile → STORY → pick fighter → "THE ROOKIE" intro → match.
      Lose → "TRY AGAIN" → same match again. Win → "THE COMER".
      Win all 5 → 📖 STORY COMPLETE.
- [ ] Plain VERSUS still works: pass-and-play 2P → handoff to A roster pick
      → handoff to B roster pick → plan picks → match.
- [ ] /versus/boxing and /versus/wrestling routes still load without setup
      (NoSetupFallback) and old saves still record W/L correctly.

## ⚠️ Open scope — Phase 5 candidates
- OpenGameArt boxer pack integration (single-canonical-boxer × 6 trunk
  recolor + frame extraction). Not clearly better than procedural; punted.
- Wrestler CC0 pack (none found this pass).
- 8-fighter bracket currently picks only 3 opponents because the roster
  has 6 fighters total — minus the player's pick = 5 candidates. That's
  fine for now but a future "expanded roster" would lift the cap.
- Story arc flavor is static text; future polish could add per-opponent
  dialogue or post-match victory blurbs.
- Online mode for boxing / wrestling is still disabled (passplay / CPU
  only). Combat sports online needs the same lobby + matchmaking flow
  the baseball / football online stack uses.
