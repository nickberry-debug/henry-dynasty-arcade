# Berry Kids' Arcade — Asset Pipeline

A self-managing pipeline that fetches license-clean (CC0 / CC-BY) art and
wires it into a single manifest every game reads from by *intent*.

## Run it

```bash
npm run fetch-assets    # download + place + log attribution + lockfile
npm run verify-assets   # assert every manifest/lockfile asset is on disk
```

Both are zero-dependency Node scripts (`node:` builtins only) — no
`npm install`, no `tsx`. They run on any machine, in CI, or in a
Claude Code session.

## Parts

| File | Role |
|---|---|
| `scripts/fetch-assets.mjs` | Resolves a NEEDS registry → concrete URLs, downloads, places under `public/assets/{source}/`, writes the lockfile, logs CC-BY attribution. Deterministic: re-runs skip already-fetched files. |
| `scripts/assets.lock.json` | Records every fetched asset (url, source, author, bytes, timestamp). |
| `src/art/asset-manifest.ts` | `ASSETS` — logical intent → file path, the single source of truth every game imports. |
| `src/art/variants.ts` | Programmatic palette-swap (`recolorFilter`/`spriteFilter`) + stable `variantIndex` — one base sprite → many distinct characters, zero extra downloads. |
| `src/art/{ParticleSystem,ShadowRenderer,ParallaxBackground,LightingOverlay,JuiceKit}` | Shared render systems every game reuses. |
| `public/assets/ATTRIBUTION.md` | Auto-generated. Lists every CC-BY asset (author + license + source). |
| `scripts/verify-assets.mjs` | Fails if any manifest/lockfile asset is missing. |

## Sources & the network reality

Approved, license-clean sources: **Kenney** (CC0), **game-icons.net**
(CC-BY 3.0), OpenGameArt (CC0/CC-BY), Quaternius (CC0).

From a hardened/sandboxed network, the only reliably script-fetchable host
is `raw.githubusercontent.com`. The big portals (kenney.nl, opengameart,
quaternius, dicebear, freesound) sit behind Cloudflare/bot-protection and
return 403 to scripted requests. So:

- **game-icons.net** is wired live via its official GitHub mirror — the
  fetcher pulls real CC-BY SVGs automatically (24 icons across all games).
- **Kenney CC0 packs** are dropped into `public/assets/kenney/…` (the zip
  is provided and unpacked); the manifest treats them identically.

The pipeline never blocks: a need from a bot-protected host is marked
`manual: true` and logged, not fetched, so a single unreachable source
never stops the run.

## Adding a need

Append to `NEEDS` in `fetch-assets.mjs`:

```js
{ game: "olympus", intent: "icon_shield", dest: "game-icons/shield.svg",
  url: `${GI}/lorc/shield.svg`, source: "game-icons", author: "Lorc" },
```

Then add the path to `ASSETS` in `asset-manifest.ts`, run `npm run
fetch-assets`, and `npm run verify-assets`.
