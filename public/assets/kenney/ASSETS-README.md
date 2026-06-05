# Kenney CC0 Art Packs — install drop point

The arcade's shared art foundation (`src/art/`) renders **procedurally**
right now — parallax backgrounds, particles, shadows, lighting, and juice
all work with zero downloaded files. That's why the arcade already looks
cohesive.

To upgrade to real Kenney sprite art (sharper characters, tilesets,
textured particles), download these **free CC0** packs from
https://kenney.nl/assets and unzip them into the folders below. No
attribution is required (CC0 = public domain). No code changes needed —
flip the matching `installed: true` in `src/art/kenney-manifest.ts` and
consumers pick them up automatically.

## Packs → folders

| Kenney pack | Unzip into |
|---|---|
| Toon Characters 1 | `public/assets/kenney/toon-characters/` |
| Platformer Pack Redux | `public/assets/kenney/platformer/` |
| Background Elements Redux | `public/assets/kenney/backgrounds/` |
| Sports Pack | `public/assets/kenney/sports/` |
| Particle Pack | `public/assets/kenney/particles/` |
| UI Pack + RPG Expansion | `public/assets/kenney/ui/` |
| Tiny Dungeon / Tiny Town | `public/assets/kenney/tiny/` |
| Impact / RPG / Sci-Fi Audio | `public/assets/kenney/audio/` |

## After dropping files in

1. Open `src/art/kenney-manifest.ts`
2. For each asset whose real file now exists, change `a("...path...")`
   to `a("...path...", true)` (the second arg marks it installed)
3. Commit + push — Vercel redeploys, and the games swap procedural art
   for the real sprites where available.

Everything degrades gracefully: any asset still marked not-installed
keeps using the procedural renderer, so the arcade is never broken
mid-migration.
