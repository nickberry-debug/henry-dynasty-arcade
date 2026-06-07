# HARDBALL -- Arcade-Action Baseball -- Progress

Resume command: **"continue Hardball"**

Genre: Tecmo Bowl / Retro Bowl feel, but baseball. 2D retro pixel, fast, juicy,
pick-up-and-play.

**SEPARATE GAME** from the existing Baseball season-sim at `/baseball`
(`src/pages/BaseballHub.tsx`). Hardball lives entirely under `src/hardball/`
and the `/hardball` route. The existing Baseball sim was NOT touched.

---

## Phases

| # | Phase                                | Status     | Notes |
|---|--------------------------------------|------------|-------|
| 0 | Assets (sprites, SFX, manifest)      | DONE       | Procedural canvas sprites + Web Audio synth. CC0 Kenney packs flagged as polish upgrade path. |
| 1 | Core gameplay loop                   | DONE       | Quick play, 3-inning default, pitch tracers, swing timing window, scoreboard. Device-verified at iPhone 390x844 on /hardball. |
| 2 | Modes + audio/feel upgrade           | SHIPPED -- partial | Home Run Derby + 4-team Tournament are live. Walk-up jingles, K-call SFX, win fanfare, steal whistle, pitcher fatigue helpers all wired. Match.tsx Phase-2 surface (2P handoff overlay, in-match steal button, weather wind, day/night, win celebration, spray chart) was edited but reverted by parallel agents twice -- see "Multi-agent contention" below. Engine + audio modules are intact. |
| 3 | 20-features polish + Match Phase-2 reapply | QUEUED | Re-apply the Match.tsx Phase-2 edits cleanly when parallel pressure drops. Add: hit-spray chart overlay, pitch counts on scoreboard, slide animations, replay slow-mo, stadium-skin per home team, photo finish, batter cards, jumbotron, real CC0 sprite swap. |

---

## Architecture

```
src/hardball/
|-- engine/
|   |-- audio.ts        -- Web Audio synth: bat crack, glove pop, crowd,
|   |                       walk-up jingles (5 per-team motifs),
|   |                       strikeout K-call, win fanfare, steal whistle.
|   |-- bracket.ts      -- 4-team single-elim state machine.
|   |-- derby.ts        -- Home Run Derby state (pitches, homers, longest).
|   |-- fatigue.ts      -- Pitcher fatigue + WALK_UP team-to-jingle map.
|   |-- field.ts        -- Ball-in-play physics, landing prediction.
|   |-- match.ts        -- Top/bottom of inning, count, runners, score.
|   |-- pitch.ts        -- 4 pitch types with distinct trajectory math.
|   `-- swing.ts        -- Timing window -> whiff/foul/grounder/liner/fly/HR.
|-- pages/
|   |-- HardballHub.tsx     -- 4 mode buttons (Quick/2P/Derby/Bracket).
|   |-- HardballMatch.tsx   -- Phase-1 canvas + tracer + scoreboard.
|   |-- HardballDerby.tsx   -- One-batter HR Derby canvas + counter.
|   `-- HardballBracket.tsx -- 4-team bracket UI + localStorage save.
`-- sprites.ts          -- Procedural pixel sprites painted at boot.

public/assets/hardball/
|-- manifest.json       -- Inventory + Kenney CC0 upgrade targets.
`-- README.md           -- Why procedural + swap notes.
```

## Routes (src/App.tsx)

- `/hardball` -- Hub (Quick / 2P / Derby / Bracket)
- `/hardball/play` -- Match canvas (Phase 1 + bracket return params)
- `/hardball/derby` -- HR Derby canvas
- `/hardball/bracket` -- 4-team bracket UI

## Multi-agent contention (read this first if confused)

This game was built during a parallel-agent surge with 6+ tasks
(Hardball, Racing, Glam Studio, Strike Rescue, Wrestling, Monster Forge
Phase 3) editing shared files (`src/App.tsx`, `src/config/games.ts`,
the project-wide `tsconfig.tsbuildinfo`) and occasionally doing destructive
working-tree resets that wiped untracked or modified files. Symptoms seen:

- HardballMatch.tsx was stubbed by an AETHERSONG cleanup pass mid-flight,
  then I restored it from git.
- HardballHub.tsx + engine/audio.ts Phase-2 edits were silently dropped
  on first attempt; the SECOND attempt landed cleanly under `7204ce5`.
- Two of my Phase-2 commits (engine modules + new pages) ended up swept
  into ANOTHER agent's commit because they ran `git add -A` while my files
  were untracked. End state is correct (HEAD has my code), just attribution
  is muddled.

Net result on `main` after the surge:

- `src/hardball/engine/audio.ts` -- has Phase-2 walk-up + K-call + fanfare + whistle exports.
- `src/hardball/engine/{derby,fatigue,bracket}.ts` -- present.
- `src/hardball/pages/{HardballHub,HardballDerby,HardballBracket}.tsx` -- present.
- `src/hardball/pages/HardballMatch.tsx` -- Phase 1 only (Phase-2 mods reverted; reapply in Phase 3).
- `src/App.tsx` -- 4 hardball routes wired.

## Phase 0 notes (assets)

Cohesive baseball-specific pixel sprites with full per-frame animation
(wind-up, swing, dive, slide, HR trot) are not freely available CC0.
Kenney's Sports Pack is gold-standard CC0 but top-down icon-style -- no
animation. Itch.io baseball packs are mostly paid or asset-flip quality.

Shipped: procedural pixel sprites + Web Audio synth. Chunky two-tone
silhouettes painted at boot; bat crack via noise burst + downward sine,
crowd ambience via low-pass pink noise, organ jingles via triangle
arpeggio. Same Retro Bowl minimalist look, zero license risk.

Phase 3 swap target: Kenney Casino Audio + Impact Sounds + Sports Pack --
declared in `public/assets/hardball/manifest.json#upgradeTo`.

## Phase 1 notes (gameplay)

Pitching: pick pitch type (Fast/Curve/Slider/Changeup), tap to aim, throw.
Fading-dot tracer in the pitch's color (white/red/yellow/green).

Batting: big SWING button. Timing window opens when ball crosses the
front of the plate (~620 ms fastball, ~980 ms changeup).
- +/-30 ms: CRACK (HR if location matches sweet spot)
- +/-60 ms: liner / fly / grounder
- +/-100 ms: foul tip
- > 100 ms: whiff

Hit feedback: white flash + bat-crack on contact, screen shake on HR,
particles burst from bat, ball arcs in real-time, crowd roar delayed
200 ms on fly balls / HR.

Scoreboard: pixel digits top-center -- BALLS / STRIKES / OUTS / INNING /
SCORE.

Teams: Berry Bears, Latte Lightning, Wave Walkers, Roman Reds, Unicorn United.

## Phase 2 -- shipped feature list (modes track)

- Home Run Derby mode (1 batter, pitching machine, 5/10/15/25 pitches,
  count HR + longest blast).
- 4-team single-elim Tournament with localStorage save and bracket
  advancement via `/hardball/play?mid=...&ret=bracket`.
- Walk-up jingles, 5 team-themed motifs (bear growl, thunder, wave swell,
  Roman brass, unicorn chime) selected by team id.
- Strikeout K-call SFX, Win fanfare, Steal whistle exported in audio.ts.
- Pitcher fatigue helpers (newFatigue / tickFatigue / fatigueTravelMul /
  fatigueAimDrift) ready for the Match.tsx reapply.

## Phase 3 -- queued (resume "continue Hardball")

- Reapply Match.tsx Phase-2 features (handoff overlay, in-match steal
  button, weather wind, day/night, win celebration, spray chart, fatigue
  read on scoreboard).
- 20 features per Nick's spec: K animation, slide anims, replay slow-mo,
  stadium upgrades, walk-up music selector, batter cards, pitch counts on
  scoreboard, hit spray chart overlay, photo finish, weather visuals,
  day/night background, crowd waves, jumbotron, win celebration polish,
  base stealing UI polish, season standings, fielder upgrade tree,
  pitcher arsenal upgrade, optional CC0 sprite swap.

## Don't touch list

- `src/pages/BaseballHub.tsx` and all `/baseball` training/sim screens
- `src/sportshub/*`
- Other games' folders
