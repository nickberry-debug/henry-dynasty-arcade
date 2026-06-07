# HARDBALL — Arcade-Action Baseball — Progress

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
| 0 | Assets (sprites, SFX, manifest)      | ✅ Done    | Procedural canvas sprites + Web Audio synth. CC0 Kenney packs flagged as polish upgrade path. |
| 1 | Core gameplay loop                   | ✅ Done    | Quick play, 3-inning default, pitch tracers, swing timing window, scoreboard. iPad/iPhone device-confirm required. |
| 2 | 20-features pass + modes + polish    | ⏸ Queued  | Home Run Derby, 2P pass-device, more pitch types, fielder upgrades, crowd waves, walkup music, season bracket, optional CC0 sprite swap. |


---

## Architecture

```
src/hardball/
├── engine/
│   ├── match.ts     — state machine: top/bottom of inning, count, outs, runners
│   ├── pitch.ts     — 4 pitch types with distinct trajectories
│   ├── swing.ts     — timing window → whiff/foul/grounder/liner/fly/HR
│   ├── field.ts     — arcade fielder AI, nearest-fielder switch, throws
│   └── audio.ts     — Web Audio synth: bat crack, glove pop, crowd, organ
├── pages/
│   ├── HardballHub.tsx    — Quick Play (1P vs CPU), 2P + HR Derby (queued)
│   └── HardballMatch.tsx  — the canvas + touch controls + scoreboard
└── sprites.ts       — procedural pixel sprites painted at boot

public/assets/hardball/
├── manifest.json    — inventory + source/license
└── README.md        — attribution + upgrade notes
```

## Phase 0 — assets (honest read)

Cohesive baseball-specific pixel sprites with full animation states (wind-up,
swing, dive, slide, HR trot) are not freely available CC0. Kenney's Sports
Pack is gold-standard CC0 but top-down icon-style — no per-frame animation.
itch.io baseball sprites are mostly paid or asset-flip quality.

Shipped: **procedural pixel sprites + Web Audio synth**. Chunky two-tone
retro silhouettes painted at boot; bat-crack via noise burst + downward sine,
crowd ambience via low-pass pink noise, organ jingles via triangle arpeggio.
Same Retro Bowl minimalist look, zero license risk, near-zero bytes shipped.

Phase 2 swap target: Kenney Casino Audio + Impact Sounds + Sports Pack —
declared in `public/assets/hardball/manifest.json#upgradeTo`.

## Phase 1 — gameplay summary

**Pitching:** pick pitch type (F/C/S/CH), drag to aim, release. Fading-dot
tracer in the pitch's color.

**Batting:** big SWING button. Timing window opens when ball crosses the
front edge of the plate (~600 ms fastball → ~1000 ms changeup).
- ±30 ms: CRACK (HR if location matches sweet spot)
- ±60 ms: liner / fly / grounder
- ±100 ms: foul tip
- > 100 ms: whiff

**Hit feedback:** white flash + bat-crack SFX on contact, screen shake on HR,
particles burst from bat, ball arcs in real-time, crowd roar delayed 200 ms.

**Fielding:** auto-switch to nearest fielder, d-pad to move, CATCH on landing,
tap base to throw.

**Scoreboard:** pixel digits top-center — BALLS / STRIKES / OUTS / INNING / SCORE.

**Teams:** Berry Bears, Latte Lightning, Wave Walkers, Roman Reds, Unicorn United.

---

## Don't touch list

- `src/pages/BaseballHub.tsx` + all `/baseball` training/sim screens
- `src/sportshub/*`
- Other games' folders
