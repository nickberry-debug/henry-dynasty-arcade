# SPORTS_ARCHITECTURE.md — refactor plan

## What "shared engine" means here

After reading Baseball's full state shape (`Player` with HitterRatings & PitcherRatings, `pitches[]` arsenal, contracts, awards, hof, dev history, traits, appearance — ~120 lines of fields per player) and Football's (`FootballPlayer` with a flat ratings record — ~50 lines), forcing a unified `BasePlayer<T>` type would cascade through ~3,500 lines of Baseball-specific code. That's a multi-day refactor with high regression risk on Baseball — the gold standard we don't want broken.

**The shared engine is INFRASTRUCTURE, not a unified data model.** The reusable code across both sports is the franchise-lifecycle infrastructure — phases, storylines, news log, save plumbing, schedule frame. The sport-specific parts (player shape, game sim, ratings, awards) stay in each sport's module. Both sports become **adapters** that wire their concrete state into the shared engine's lifecycle.

## What gets shared

| Module | What it does | Consumers |
|---|---|---|
| `/src/sports-engine/storylines.ts` | Generic `Storyline<TSubject>` tracker. Sport calls `openStoryline()` / `advance()` / `resolve()`. Same shape feeds both News pages + ticker. | Baseball, Football |
| `/src/sports-engine/news.ts` | News item shape, push/search/filter, reactions, memorable pinning. Already-existing concepts unified under a common interface. | Baseball, Football |
| `/src/sports-engine/phases.ts` | Phase enum + transition guards. Stable across sports. | Both |
| `/src/sports-engine/schedule.ts` | Round-robin builder with sport-config (games-per-team, divisions, conferences). | Both |

## What stays sport-specific

- `Player`, `Team`, `Game` types (different shapes per sport)
- Game simulation (Baseball: pitch-by-pitch; Football: drive-by-drive)
- Ratings shape + age curve (different rating fields per sport)
- Award selection (different award names)
- Position lists + lineup logic

## Migration sequence (safe-incremental)

1. **Phase B (this pass):** Create `/src/sports-engine/storylines.ts` as the shared storyline tracker. Adapt Baseball's `DramaState.storylines: Storyline[]` and Football's `FootballLeague.storylines` to use the same `Storyline<string>` shape and the same `updateStorylines()` lifecycle hook. **Baseball behavior unchanged** (its drama engine doesn't currently populate storylines beyond the type) — verified.
2. **Phase C (this pass):** Wire `updateStorylines()` into Football's per-week sim cycle. Storylines actively populate from this pass forward. Same hook is wired (and ready) for Baseball; activating it for Baseball is a future toggle when we want to enrich Baseball's drama too.
3. **Phase D (this pass):** Build an interactive Football draft to match Baseball's interactive draft. Both consume the **same shared draft phase contract** (phase = "draft" → user makes picks → CPU auto-picks remainder → transition to next season).
4. **Phase D continued (this pass):** Decide & document Coach's Corner / All-Star / LiveGame parity. Baseball HAS each of these. So they ARE parity gaps. Building them per-sport in one session would either silently cut quality on each or break Baseball; per the user's rule #1, those gaps surface as ⚠️ scope-not-met for follow-up.
5. **Phase E (this pass):** Verify both Baseball and Football run full seasons end-to-end with the shared storyline engine.

## Future passes (out of scope here)

- Migrate news log push/filter from sport-specific code into shared `news.ts`
- Migrate schedule generator into shared `schedule.ts`
- Hockey/Basketball/CFB onto the same shared engine (they become trivial config modules once the contract is solid)
- Baseball Coach's Corner / All-Star / LiveGame parity for Football
