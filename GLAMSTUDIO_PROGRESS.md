# Glam Studio — 3D Fashion-Doll Stylist

**Replaces** the existing SVG-based dress-up at `src/classics/stylestudio/StyleStudioDressup.tsx` (route `/classics/style`). Note: `StyleStudio.tsx` (the *Sketch* canvas at `/classics/sketch`) is a separate game and is **not** affected.

> **OVERRIDE (Nick, evening of 6/7):** Phase 0 gate is **LIFTED**. Build all phases overnight on whatever assets I found, even at the stylized-charming ceiling. Nick will judge in the morning.

---

## Cuteness / Cohesion Report (Phase 0 — morning read)

### Headline verdict — brutally honest

> **The best free CC0 fashion-doll asset I could find is the Quaternius "Women" family on Poly Pizza** (Woman in Dress, Woman Casual, Woman in Tank Top, Animated Woman — all CC0, all rigged, all animated). They read as **stylized-charming** — Pixar-low-poly faces with painted eyes and chunky bodies. They are **NOT Barbie-cute** and **NOT Toca-Boca-cute.** Toy-like, yes. Doll-glam, no.
>
> **If you want true Barbie/Toca-Boca cuteness, recommended paid pack:**
>   - **Synty POLYGON Modular Fantasy Hero Characters** — ~$29.99 USD — https://syntystore.com/products/polygon-modular-fantasy-hero-characters — modular swappable parts, much cleaner aesthetic, still "stylized" not "Barbie."
>   - **Synty Sidekick Modular Characters** — $199.99 USD base + addons — https://syntystore.com/collections/sidekick-character-packs — feminine body types + true modular character creator. Closest commercial fit to a fashion-doll game, but still stylized-game-art, not realistic Barbie.
>   - **Custom commission for true Toca-Boca aesthetic** — est. $500-2000 for one base + 6 outfits + 8 hairstyles. The only way to hit that exact aesthetic.

### Cohesion verdict

**Better than feared.** Three of the four downloaded Quaternius women share the **same 31-bone rig** (woman_dress / woman_casual / woman_tank). That means clothing swap = swap whole GLB, animations carry across, and the doll stays on the same skeleton — true rig-compatible outfit variants from the same artist. The fourth (woman_animated) is on a different 41-bone rig and is kept as a "richer animation" alternate but not part of the swap group.

Approach chosen: **hybrid-socket-attach** (matches Monster Forge precedent).
- **Outfits:** whole-GLB swap on a shared rig (true modular)
- **Hair, makeup, accessories:** procedural Three.js geometry/textures attached at bbox-derived sockets (HEAD, FRONT, EARS). Separable CC0 hair/clothing meshes that fit a Quaternius-style female base do **not** exist on Poly Pizza or Sketchfab in usable form (verified June 2026).

### Asset inventory (what's actually on disk)

| Category | Count | Source | License |
|---|---:|---|---|
| Base / Outfit dolls | **4** | Quaternius via Poly Pizza | CC0 |
| Hair meshes (CC0) | 0 — procedural Three.js | — | n/a |
| Clothing meshes separable | 0 — outfits live on the base GLBs | — | n/a |
| Accessories | 0 — procedural Three.js (planned) | — | n/a |
| Total bundle size | **~3.0 MB** (well under the 30 MB deploy gate) | | |

Files (in `public/assets/glam/base/`):
- `woman_dress.glb` — 481 KB, 1,786 tris, 31 bones, 11 anims — *pink/rose dress*
- `woman_casual.glb` — 586 KB, 2,776 tris, 31 bones, 11 anims — *hoodie + pants*
- `woman_tank.glb` — 540 KB, 1,983 tris, 31 bones, 11 anims — *tank + shorts*
- `woman_animated.glb` — 1,380 KB, 1,908 tris, 41 bones, 10 anims — *alternate rig, animation showcase*

Full per-file metadata: `public/assets/glam/manifest.json`. Attribution: `ATTRIBUTION.md` (new "Glam Studio" section).

### Skipped / why

- **Sketchfab "Clothing And Character Kit 1.0"** — 764k triangles, "very rough" per uploader, license actually CC-BY-default not CC0 — too heavy + license-ambiguous.
- **Quaternius Witch** — CC-BY 3.0 (not CC0). Excluded to honor the CC0-only policy. Would be a cute add — flag for Phase 4 polish if you want to switch to CC-BY allowed.
- **Kenney "Modular Characters"** — actually 2D (despite the name).
- **KayKit Adventurers** (Kay Lousberg, CC0, 12 MB) — would be a great Phase 1 add for cuter heads, but it's a knight/mage/rogue *fantasy* pack, not a fashion pack.
- **Quaternius Ultimate Modular Women Pack** (10 chars × 4 modular parts × 24 anims, CC0) — only available as a bulk download from quaternius.com (~80-150 MB est.). Skipped for the Phase 0 bandwidth budget. Worth pulling in Phase 4 if approved.
- **Mixamo** — requires Adobe login. Skipped per hard rules.

### Approach pros/cons

| | Hybrid socket-attach (chosen) | Pure modular-rigged (rejected) |
|---|---|---|
| Asset availability | ✅ Works today with CC0 | ❌ Would need paid Synty/Quaternius Source |
| Cuteness ceiling | Stylized-charming | Same — paid packs are *not* automatically Barbie-cute |
| Cohesion | 3 outfits rig-compatible, procedural hair always fits | Better in-pack, worse across packs |
| Build complexity | Low — matches Monster Forge | Higher — bone retargeting code |

---

## Status

| Phase | Goal | Status |
|------:|------|:------:|
| **0** | Asset audit + cuteness/cohesion report + flag-gated scaffold | ✅ DONE |
| **1** | Doll viewer + camera + outfit swap + per-profile save | 🚧 BUILDING (overnight) |
| **2** | Procedural hair system (style + color) | 🚧 BUILDING (overnight) |
| **3** | Makeup (lipstick / eyeshadow / blush / face zoom) | 🚧 BUILDING (overnight) |
| **4** | Polish: 6-category UI, accessories, skin tint, pose | 🚧 BUILDING (overnight) |
| **5** | Cutover: `/classics/style` → GlamStudio, retire SVG dressup | 🚧 BUILDING (overnight) |

## Absolute rules
- Original fashion doll. **NOT Barbie.** No Mattel branding, names, silhouettes, or likeness.
- CC0 only (CC-BY allowed if attributed in `ATTRIBUTION.md`). All current assets are CC0.
- Per-profile save concept (`profileKey` + `cloudBlob`) carries over from the SVG version.

---

## Coordination

- Parallel tasks pushing to `main`. Before each push: `git pull --rebase origin main`.
- Conflicts on `src/config/games.ts` or `src/App.tsx`: **KEEP BOTH** (union resolve).
- Other conflicts: abort + document with `⚠️ BLOCKED` at top of this file.
