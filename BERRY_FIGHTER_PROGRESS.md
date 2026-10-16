# Berry Fighter — base engine review build

Approved scope: two provisional models and one base level. Source is `games/berry-fighter`; arcade route `/berry-fighter`; compiled web app `/games/berry-fighter/index.html`; Windows download `/downloads/berry-fighter-windows.zip`. Existing arcade repository only; no separate repo or production merge.

Implemented: Pip/Bramble original Blender models, garden level, fixed-step movement/double jump/platform drop, light/heavy/aerial/special attacks, shield/dodge, damage/knockback/hitstun/hitstop, stocks/timer/results/rematch, CPU sparring, training dummy, local versus, keyboard/controller/multi-touch input. Story/bosses/weapons are deferred.

Verification: 23 simulation checks; quick tap/repeat/controller ownership/touch input regressions; scene selection/pause/rematch and hitstop tests. Standard web and Windows exports succeed. Windows executable rendered a screenshot and exited with code 0. Full arcade Vite production build succeeds. Independent code review findings were fixed with focused regressions.
Chromium launch through the arcade, keyboard input/pause, install manifest and fresh-profile first-load/offline reopening all passed with zero browser errors. Feature branch `feat/berry-fighter` is uploaded as draft PR https://github.com/nickberry-debug/henry-dynasty-arcade/pull/1. Production is unchanged.

Whole-repo TypeScript checking still reports four existing errors in `src/monster-forge/engine/battle.ts` and `src/monster-forge/pages/MonsterForgeBattle.tsx`. Those files are unchanged by this branch. No Berry Fighter TypeScript error was reported. Existing large-chunk and mixed-import build warnings remain.

Godot's Web export must be followed by `node scripts/prepare-berry-fighter-web.mjs`; this enables first-install engine/pack caching and displays offline readiness. The arcade root service worker and Vercel rewrites exclude game/download paths. Standard Godot license notices accompany the Windows ZIP and are accessible alongside the web export.

Remaining acceptance checks: real iPad/Safari performance, real controller mappings and feel, two-player hardware test, multi-finger touchscreen play, and subjective movement/combat/art feedback. Automated browser tests do not certify actual iPad compatibility or a sustained 60 FPS on all devices. Native iOS distribution is deferred.
