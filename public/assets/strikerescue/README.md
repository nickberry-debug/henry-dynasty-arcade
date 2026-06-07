# Strike Rescue — Asset Folder

Procedural sprites + Web Audio synth (overnight build). Kenney CC0 upgrade path
documented in `manifest.json`. See `/ATTRIBUTION.md` for license terms.

When network access is restored, swap `drawX(ctx,x,y)` bodies in
`src/strike-rescue/sprites.ts` for `ctx.drawImage(loadedImage, x, y)` and swap
the synth functions in `src/strike-rescue/engine/audio.ts` for
`new Audio(...).play()`. Each function name matches a key in manifest.json.
