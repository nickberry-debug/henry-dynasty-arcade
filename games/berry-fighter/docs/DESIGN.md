# Berry Fighter — base engine milestone

The user's approved first milestone is the base engine, two provisional models and one base level. Build inside `nickberry-debug/henry-dynasty-arcade`; no separate repository. The arcade is the entry point for browser play, iPad Home Screen installation and a Windows ZIP. Keep this separate from Alfred/manufacturing. No production release before playtest approval.

## Playable milestone
Two provisional Blender-built fighters: Pip, a quick berry scout, and Bramble, a slower, heavier stone guardian. One floating garden arena. CPU sparring, stationary-dummy training and two-human local versus. Keyboard, controller, and multi-touch input share one combat simulation. No weapons. Final roster/art direction remains the user's decision. Story, bosses, campaign saves, additional levels, networking and native iOS distribution are deferred until the base feels right.

## Architecture
Godot 4.7.2 compatibility renderer, 60 Hz simulation. Pure GDScript simulation owns positions, velocity, platform collision, jumps, attack timing, shields, damage, knockback, invulnerability, hitstop, stocks, timer and results. Views use original GLB meshes exported by Blender 5.2.2 with procedural poses and an orthographic camera on a 2D fighting plane. Menus/HUD are native Godot controls. Queued input events retain taps between ticks. Data-driven attacks provide a future weapon extension point. Source lives under `games/berry-fighter`; compiled web files under `public/games/berry-fighter`; site launcher at `/berry-fighter`.

## Rules
Three stocks and 180 seconds in versus/sparring. Training has unlimited stocks and a stationary dummy. Jump buffering and coyote time make movement forgiving. Attacks have windup, active, and recovery frames; each swing hits a target once. Shields drain/regenerate; ring-outs remove a stock and respawn invulnerably. Pause freezes combat, including on focus loss. The single-threaded web export has its own scoped PWA; root arcade caching and host rewrites exclude game/download paths.

## Verification and limits
Headless tests exercise real simulation: jumping, one-way platforms, attack timing, per-swing hit deduplication, shielding, damage-dependent knockback, ring-outs, respawn, timeout and hitstop. Test input retention and scene transitions. Import/run source, Windows export and browser launch through the arcade. Inspect screenshots. Real controller feel, iPad performance and fun require hardware playtesting. Do not call this a polished finished game or publish it to production before approval.

## Reference
https://github.com/doldecomp/melee — reviewed as a GameCube decompilation and architecture reference, not used as engine or source. All implementation and assets here are original. No Nintendo source, data, characters, stages, or sounds are included.
