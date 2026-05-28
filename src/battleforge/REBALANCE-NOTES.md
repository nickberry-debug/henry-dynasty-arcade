# Battle Forge — Preset Character Rebalance

_Polish-pass, May 2026._ Stats and ranges were redistributed across all
**385** preset characters using a five-tier system so matchups feel
intuitive (a kid should be able to predict that Galactus beats
Achilles, but Achilles obliterates the Caffeinated Squirrel).

## Tier System

| Tier | HP | Attack | Size | Range | Speed (tiles/turn) | Example |
| --- | --- | --- | --- | --- | --- | --- |
| **COSMIC / GODLIKE** | 2000-4000 | 200-500 | huge / colossal | 20+ tiles (planet-buster, omega beam) | 5 (slow, doesn't need to move) | Galactus, Thanos, Saitama, Shiva, Goku, Sentry, Sauron |
| **TOP-TIER SUPERS** | 800-1200 | 100-200 | large | 10-15 tiles (long-range) | 8-10 | Thor, Wonder Woman, Captain Marvel, Iron Man, Gandalf, Doom Slayer |
| **A-LIST SUPERS** | 200-400 | 30-80 | medium | 6-10 tiles (ranged) | 10-14 | Spider-Man, Wolverine, Cap America, Black Panther, Cyclops, Storm |
| **B-LIST / SIDEKICKS** | 100-200 | 15-40 | small / medium | 3-5 tiles (short-range) | 10 | Honey Badger, Robin Hood, Bart Simpson, Einstein, conspiracy guy |
| **MOOK / HUMAN / KID** | 50-150 | 5-20 | tiny / small | 1-2 tiles (melee) | 8 | Grandma, caffeinated squirrel, hummingbird, Karen Manager, dancing toaster |

## Range Bands

- **Melee** (`1-2 tiles`): swords, claws, fists.
- **Short-range** (`3-5 tiles`): thrown knives, extended claws, whip.
- **Ranged** (`6-10 tiles`): arrows, webs, sidearms, repulsors.
- **Long-range** (`10-15 tiles`): lasers, eye-beams, energy beams.
- **Cosmic** (`20+ tiles`): planet-busters, omega beams, world-eating
  AoEs. Anything tier=COSMIC gets `cosmic` reach regardless of
  attackType.

## Speed Bands

- **Cosmic** = 5 tiles/turn. They don't *need* to move fast — the
  universe comes to them.
- **Heavy hitters** (Hulk, Thor) = 6-8.
- **Average** = 10.
- **Fast specialists** = 14.
- **Sprinter-tier** (Spider-Man, Tracer, Hermes, Neo, Zenitsu, Ninja)
  = 18.
- **Speedster cosmic** (Flash, Usain Bolt, Killua Godspeed, Blur Demon)
  = 20.

## Engine vs. Comment Units

Comments use *real-world* tiles/turn so the spec reads cleanly. The
simulation engine still operates on its original 1-1000 stat scale
(speed/defense/special). Conversion lookup lives in
`scripts/rebalance.cjs` — re-run it any time to re-derive everything
deterministically.

## Final Tier Distribution

| Tier | Count | Notes |
| --- | --- | --- |
| Cosmic | 39 | Marquee god-tier + canon "above gods" characters. |
| Top-tier | 54 | Big-name supers, mech pilots, mythic gods, top kaiju supports. |
| A-list | 218 | The bulk of the roster — recognizable named fighters. |
| B-list | 60 | Sidekicks, scholars, animals in the small-to-medium band. |
| Mook | 14 | Kids, household objects, tiny critters, comedic civilians. |

## Source of Truth

This file is documentation, not the data source. The canonical numbers
live in `src/battleforge/presets.ts` (each character now carries a
single-line `// TIER [LABEL] Name: blurb. HP …, atk …, range …, speed
….` comment immediately above its `c(...)` definition).

To re-run the rebalance after editing tiers or overrides:

```bash
node scripts/rebalance.cjs
```

The script is idempotent — it strips its own previous comments before
re-emitting them.
