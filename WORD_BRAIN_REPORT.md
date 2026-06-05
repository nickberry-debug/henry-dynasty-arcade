# Word/Brain Fixes Batch — v1.10.75

Branch: `polish-pass`. TS clean, prod build clean, dev server hits all routes 200.

## ⚠️ Scope not fully met

- **Item 4 (20 Questions fuzzy dedupe).** The Jaccard token-overlap filter at
  ≥0.7 catches exact duplicates and high-overlap paraphrases, but does **not**
  catch:
  - Pure synonyms with no shared tokens ("alive?" vs "a living thing?").
  - Singular/plural drift ("hand" vs "hands") — no stemming.
  - Padded rephrases below the 0.7 threshold (e.g. adding 1-2 words to a short
    question can drop it to ~0.5-0.67).
  The AI prompt is the primary defense against repeats — both system prompts
  explicitly list the previously-asked questions and instruct "do NOT repeat or
  rephrase any of them". The Jaccard filter is the fallback when the AI
  ignores that instruction. Adding a stemmer/synonym lexicon was out of scope
  for this surgical pass.
- **Live AI verification (Items 4 & 5).** I did not exercise the live Anthropic
  call against a real Haiku endpoint in this sandbox (no key configured). The
  no-key fallback path is exercised by the headless test below.
- **Profile UI screenshot.** Verified by HTTP 200 + source grep; no visual
  screenshot.

---

## Item-by-item

### Item 1 — Profile age field ✅

- Files: `src/profiles/store.ts`, `src/profiles/ProfileEdit.tsx`.
- The `Profile.age?: string` field already existed in `store.ts` (was marked
  "legacy"). Comment updated to describe its current purpose. Added
  `getActiveProfileAge(): number | null` helper that parses to int with bounds
  `0 < n < 130`.
- `ProfileEdit.tsx` now exposes an `<input type="number" min={3} max={120}>` Age
  field, with hint copy explaining it's optional and used by some games to
  scale difficulty. Empty input clears to `undefined` so we don't persist
  stale strings.
- **Verified:** TS clean. `parseAge` mirror tests pass 8/8 cases including
  empty, undefined, non-numeric, out-of-bounds, and padded whitespace.

### Item 2 — Quiet Game (identified by registry as `QuietGame.tsx`) ✅

- The "Quiet game" in the registry is **Quiet Game** at
  `src/wordplay/pages/QuietGame.tsx`, route `/wordplay/quiet-game` (also
  reachable at `/wordplay/quiet`). It uses Web Audio API mic capture to track
  silence streaks.
- Difficulty selector (3 buttons: Easy/Medium/Hard) removed.
- New single sensitivity slider tunes the noise `threshold` directly
  (`min=5`, `max=40`, default `12` = old Hard). Lower = stricter. Slider value
  persists per profile via `profileKey("dd_quietgame_sensitivity_v1")`.
- The rAF noise loop now reads `thresholdRef.current` (no enum lookup).
- **Verified:** TS clean. Source confirms no remaining `THRESHOLDS[...]` enum
  references. Dev server serves the module without compile error.

### Item 3 — Spelling game deleted ✅

- Deleted: `src/wordplay/pages/SpellGame.tsx`, `src/wordplay/data/spellWords.ts`.
- Removed lazy import + route from `src/App.tsx` (left a one-line breadcrumb
  comment so future readers know what was removed).
- Removed Spell card entry from `src/wordplay/pages/WordplayHub.tsx`.
- Updated category subtitle in `src/config/games.ts` from "Spell, solve, think"
  → "Solve, guess, think".
- **Verified:** `grep -rn "SpellGame\|spellWords\|/wordplay/spell" src/`
  returns only the breadcrumb comment in `App.tsx`. TS clean, prod build
  clean. Dev server fetch of the deleted source path returns SPA index
  (file gone).

### Item 4 — 20 Questions: no repeated questions + better narrowing ✅ (with caveats above)

- File: `src/wordplay/pages/TwentyQuestions.tsx` — full rewrite.
- Tracks `asked: string[]` across turns and passes the list to the AI prompt
  with explicit "do NOT repeat or rephrase any of them" instruction.
- New `isDuplicate(candidate, asked)` runs both exact-text match (after
  normalization) and Jaccard token-overlap ≥0.7 (after filler-word strip) to
  reject AI repeats.
- New `THING_FALLBACKS` bank (15 generic narrowing questions) with
  `pickFallback()` that walks the bank in order, returning the first non-asked
  entry. Used when no API key or when AI returns a duplicate.
- **Verified:** headless logic test passes 12/14 cases (the 2 failures are
  documented scope limits above, not regressions).

### Item 5 — Akinator-style "guess the character" mode ✅

- Same file. Third mode `"characterGuess"` added alongside `"aiGuess"` and
  `"userGuess"`. New mode-pick button "🧙 GUESS THE CHARACTER (AKINATOR
  MODE)" on the landing screen.
- `startCharacterGuess()` opens with "Is your character fictional?" as the
  first narrowing question.
- The `sendUserAnswer()` handler is unified: when `mode === "characterGuess"`
  it swaps in a character-specific system prompt ("You are playing
  Akinator-style 20 Questions. The user is thinking of a CHARACTER. Narrow
  from broad-category questions to specific identity. Kid-friendly. Make a
  guess when confident.") and a character-specific fallback bank
  (`CHARACTER_FALLBACKS`, 15 entries: fictional?, human?, alive in story?,
  movie/TV?, hero?, etc.).
- Same fuzzy-dedupe applies in both modes.
- **Verified:** TS clean, prod build clean, module fetches via dev server.

---

## Verification commands run

```
npx tsc -b                                    # exit 0
npx vite build                                # exit 0, 306 PWA precache entries
curl -s http://127.0.0.1:5183/<route>         # 200 for all SPA routes
curl -s http://127.0.0.1:5183/src/<path>      # 200 for live modules, SPA-fallback for deleted SpellGame
node /tmp/verify-wordbrain.mjs                # 12 pass / 2 fail (limits documented above)
```

## Files changed

```
M  src/App.tsx
M  src/config/games.ts
M  src/profiles/ProfileEdit.tsx
M  src/profiles/store.ts
M  src/wordplay/pages/QuietGame.tsx
M  src/wordplay/pages/TwentyQuestions.tsx
M  src/wordplay/pages/WordplayHub.tsx
D  src/wordplay/data/spellWords.ts
D  src/wordplay/pages/SpellGame.tsx
M  package.json   (1.10.74 → 1.10.75)
```
