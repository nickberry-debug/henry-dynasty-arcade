# Hardball assets

Phase 0 ships **zero binary assets**. All sprites are painted procedurally to
canvas at boot, and all sound effects are synthesized via the Web Audio API
at runtime. See `manifest.json` for inventory.

Why: cohesive CC0 baseball-specific pixel sprites with per-frame animation
(wind-up / swing / dive / slide / HR trot) are not freely available. Kenney's
sports pack is top-down icon-style — beautiful but not animated. Rather than
mix mismatched sources, we paint everything in a consistent two-tone chunky
pixel style and document the swap targets for later polish in `manifest.json`.

This folder contributes no third-party content. See project root
`ATTRIBUTION.md` for the arcade-wide attribution registry.
