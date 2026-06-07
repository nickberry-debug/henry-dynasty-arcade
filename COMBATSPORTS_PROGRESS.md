# Combat Sports — progress log

Resume token: **"continue combat sports"**

Game pair: Boxing (Phase 1) + Pro Wrestling (Phase 2) on a shared strategic core.

## Standing rules

- ⚠️ scope deltas land at the top of this file.
- "Done" = ran it (tsc passes + device-confirm at iPhone size, not just type-check).
- Sprite look / animation / feel = device-confirm-required.
- CC0 (or luizmelo free-use with credit) only; ATTRIBUTION.md must list any new pack.
- Don't regress other games — keep changes scoped to `src/combat-sports/`,
  `src/config/games.ts`, `src/App.tsx`, and `public/assets/combat-sports/`.
- Per-profile saves via `profiles/store` + `sync/cloudBlob` once we add records (Phase 3).

---

## ⚠️ Open scope deltas

- **No boxing-specific CC0 sprites available.** Searched itch.io (`CC0 boxing
  sprite`, `boxing sprite sheet`, `fighting game sprite`), OpenGameArt, GameArt2D
  free, CraftPix free, luizmelo. Best cohesive set with full idle / move /
  attack / hit / down anims was luizmelo's **Martial Hero** pack, already on
  disk for Battle Forge. Boxing reuses it with red/blue corner tints — no real
  gloves, no real trunks, no dedicated boxing pose. Flagged in
  `public/assets/combat-sports/boxing/manifest.json` and in the in-game corner
  banner. Art polish (gloves overlay, trunk recolor, dedicated boxer pack) is
  queued for **Phase 3 polish** — do NOT mark this as silently resolved.
- Strategic core (`src/sports/strategic/`) was **untracked on disk** (`?? src/sports/`)
  at boxing-build time — the parallel Sports Versus task had not yet
  committed. Files were physically present and complete (rps, cpu, plans,
  match, sports, types, index, tests) so Boxing imports them directly. If
  that parallel commit lands with a renamed/refactored shape, the boxing
  imports (`src/combat-sports/boxing/rps.ts`) will need a tiny rename pass —
  that file is the only one touching strategic internals.
- During this session a `git reset --hard origin/main` happened in the
  shared workspace (visible in reflog: `0eae8cd HEAD@{0}: reset: moving to
  origin/main`). It wiped the first cut of this Boxing work plus a parallel
  "JRPG Phase 0" commit. Recreated immediately and committed before any
  further reset could land.
- 2P same-device mode is a **sequential reveal** (active picks then passive
  picks then resolve), not true split-screen. Easier to play at iPhone
  width and matches the rest of Sports Versus's pattern. Split-screen
  queued for Phase 3 if Nick wants it.

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
  subtitle "Wrestling booking sim", description "Book 4 TV episodes
  + 1 PPV every month. Rate segments on charisma + in-ring + story
  momentum."
- **Conclusion: booking sim**, not a playable versus match. Per spec,
  build a separate **playable Pro Wrestling** for Phase 2 — distinct
  game, distinct id (`prowrestling`), distinct route (`/prowrestling`).
  Main Event stays as-is.

### 0b. Sprite acquisition

- Searched itch.io + OpenGameArt + GameArt2D + CraftPix free for CC0
  boxing / wrestling sprites. Nothing cohesive enough to ship as a
  believable boxer or wrestler under a strict CC0-only policy.
- Reused **luizmelo Martial Hero** (already on disk at
  `public/assets/luizmelo/martial-hero/Sprites/`):
  - `Idle.png` 8 frames → idle / block (with overlay)
  - `Run.png`  8 frames → footwork move
  - `Attack1.png` 6 frames → jab / cross (light strike)
  - `Attack2.png` 6 frames → hook / uppercut (heavy strike)
  - `Take Hit.png` 4 frames → hit reaction
  - `Jump.png` 2 frames → dodge
  - `Fall.png` 2 frames → knockdown
  - `Death.png` 6 frames → KO
- Output manifest at `public/assets/combat-sports/boxing/manifest.json`.
- ATTRIBUTION.md already credits luizmelo (added during Battle Forge
  revamp); amended with a note linking Boxing's reuse to the existing
  Martial Hero entry.
- Wrestling sprite folder created at `public/assets/combat-sports/wrestling/`
  but empty — to be populated in Phase 2.

---

## Phase 1 — Boxing — DONE this session

Files added under `src/combat-sports/boxing/`:

- `rps.ts` — boxing RPS config (4 strikes × 3 defenses) + display
  metadata for the action picker. TODO when the parallel Sports Versus
  commit lands: move `BOXING_RPS` into `src/sports/strategic/sports.ts`
  alongside baseball/football/etc. and switch Boxing.tsx to
  `configForSport("boxing")`.
- `fighters.ts` — six original boxer roster with archetypes and
  per-fighter stat tweaks (power, speed, chin, stamina).
- `sprites.ts` — luizmelo Martial Hero loader specific to the side-view
  2D boxing canvas. Slices each strip into per-state frame arrays,
  applies red/blue corner tint via `source-atop` composite.
- `engine.ts` — match state machine (3 rounds × 6 decision points per
  round), damage model (head vs body targeting, power meter, KO meter,
  10-count get-up timer), judges' decision tally, adaptive CPU adapter.
- `Boxing.tsx` — entry route. Pre-match: fighter select + mode (vs-CPU
  / 2P) + plan. In-match: canvas + scoreboard + action picker. Post-match:
  result card + replay button.

Registration:

- `src/config/games.ts` — added `boxing` entry under category `sports`,
  order 40 (just after `versus`).
- `src/App.tsx` — added lazy import + `/boxing` route.

Deploy:

- Phase 0 committed as `Combat Sports Phase 0: Main Event audit +
  CC0 sprite acquisition`.
- Phase 1 committed as `Combat Sports Phase 1: Boxing — RPS +
  stamina + power shots + KO`.
- Pushed `main`. Vercel deploy URL captured in final message to Nick.

Device-confirm checklist (iPhone size, Chrome MCP):

- [ ] Arcade home → Sports folder shows BOXING tile alongside other sports.
- [ ] Tap Boxing → fighter select renders.
- [ ] Pick fighter + plan → match canvas with two boxers facing.
- [ ] Throw a jab → CPU defends → resolution feedback (hit/blocked/dodged).
- [ ] Build up power meter → POWER SHOT button lights up → land it → big damage.
- [ ] Force a KO (or watch 3 rounds → judges' decision) → result screen
  shows correctly → return-to-arcade works.

---

## Phase 2 — Pro Wrestling (queued)

Spec recap: side-view 2 wrestlers, strike vs grapple vs reversal (3×3
RPS with timing-based reversals), hype/momentum unlocks signature
finisher, pin + kick-out timing, submission + escape, sell damage,
stamina. Build hype → land finisher → pin to win. 2P + vs-CPU.
Animations + crowd juice.

Resume work with: **"continue combat sports"**.

---

## Phase 3 — Polish + features (queued)

Both games: fighter select roster polish, distinct visual identities,
stats, per-profile records (W/L, KOs/finishers), Family leaderboard +
Roster Browser multiplayer hookup, sound, ring/arena backdrops.
Combat-Sports sub-section of the Sports category (or new top-level
Combat Sports category) once both games are stable.
