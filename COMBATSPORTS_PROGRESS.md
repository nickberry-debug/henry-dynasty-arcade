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
