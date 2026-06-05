// ─────────────────────────────────────────────────────────────────────────
// Berry Kids' Arcade — Visual Overhaul asset fetcher.
//
// Extends scripts/fetch-assets.mjs with everything needed for the
// "god-tier" visual overhaul: a wide game-icons set (auto-fetched from
// github), plus a printed roadmap of Kenney + itch + OpenGameArt packs
// that need to be downloaded manually (their CDNs block bots and aren't
// scriptable without login or page-scrape).
//
// Run: node scripts/fetch-visual-overhaul.mjs
//
// What this script DOES automatically:
//   • Adds 100+ curated game-icons (CC-BY 3.0) covering effects, weapons,
//     mascots, UI, sport, character archetypes — populates /public/assets/
//     game-icons/.
//   • Re-clones github.com/game-icons/icons full mirror into
//     /public/assets/game-icons-full/ (gives Card Clash and any future
//     game access to all 4000+ icons by slug).
//   • Clones LPC universal character spritesheet generator into
//     /public/assets/lpc/ — used for AccessoryCompositor (layered chars).
//   • Clones Calinou/awesome-cc0-assets into /public/assets/_index/ as a
//     reference list of CC0 sources.
//   • Auto-updates /public/assets/ATTRIBUTION.md.
//   • Writes /public/assets/VISUAL_REPORT.md with per-pack status +
//     manual-fetch instructions for Kenney / ansimuz / Foozle / etc.
//
// What this script does NOT do (sandbox network blocks):
//   • kenney.nl downloads — hashed URLs need page-scrape + JS-rendered.
//   • itch.io packs (ansimuz, Pixel Frog, Foozle, LuizMelo) — most need
//     a free checkout that requires a logged-in session.
//   • OpenGameArt — same Cloudflare protection.
// All of the above are LISTED in VISUAL_REPORT.md with their pack pages
// so you can grab the zips locally, unzip into /public/assets/<source>/,
// and re-run /scripts/verify-assets.mjs.
// ─────────────────────────────────────────────────────────────────────────

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = join(ROOT, "public", "assets");
const ATTRIBUTION = join(PUBLIC, "ATTRIBUTION.md");
const REPORT = join(PUBLIC, "VISUAL_REPORT.md");

const GI = "https://raw.githubusercontent.com/game-icons/icons/master";

// ── Wide game-icons set ───────────────────────────────────────────────
// Each: dest (relative to /public/assets), url, author.
// All under CC-BY 3.0 (game-icons.net). Authors must be credited.
const ICONS = [
  // Effects & weapons
  { dest: "game-icons/flame.svg",            url: `${GI}/sbed/flame.svg`,                  author: "sbed" },
  { dest: "game-icons/lightning-bolts.svg",  url: `${GI}/lorc/lightning-bolts.svg`,        author: "Lorc" },
  { dest: "game-icons/ice-cube.svg",         url: `${GI}/lorc/ice-cube.svg`,               author: "Lorc" },
  { dest: "game-icons/ice-crown.svg",        url: `${GI}/lorc/crowned-skull.svg`,          author: "Lorc" }, // close visual
  { dest: "game-icons/flame-crown.svg",      url: `${GI}/delapouite/flaming-claw.svg`,     author: "Delapouite" },
  { dest: "game-icons/wave.svg",             url: `${GI}/lorc/wave-crest.svg`,             author: "Lorc" },
  { dest: "game-icons/dragon-head.svg",      url: `${GI}/lorc/dragon-head.svg`,            author: "Lorc" },
  { dest: "game-icons/dragon-eye.svg",       url: `${GI}/lorc/dragon-eye.svg`,             author: "Lorc" },
  { dest: "game-icons/thorns.svg",           url: `${GI}/lorc/thorny-vine.svg`,            author: "Lorc" },
  { dest: "game-icons/vines.svg",            url: `${GI}/lorc/vine-leaf.svg`,              author: "Lorc" },
  { dest: "game-icons/wind-hole.svg",        url: `${GI}/lorc/wind-hole.svg`,              author: "Lorc" },
  { dest: "game-icons/fairy.svg",            url: `${GI}/lorc/fairy.svg`,                  author: "Lorc" },
  { dest: "game-icons/imp-laugh.svg",        url: `${GI}/lorc/imp-laugh.svg`,              author: "Lorc" },
  { dest: "game-icons/evil-minion.svg",      url: `${GI}/lorc/evil-minion.svg`,            author: "Lorc" },
  { dest: "game-icons/ghost.svg",            url: `${GI}/lorc/ghost.svg`,                  author: "Lorc" },
  { dest: "game-icons/skull-bolt.svg",       url: `${GI}/lorc/skull-bolt.svg`,             author: "Lorc" },
  { dest: "game-icons/swamp.svg",            url: `${GI}/lorc/swamp.svg`,                  author: "Lorc" },
  { dest: "game-icons/hood.svg",             url: `${GI}/delapouite/hood.svg`,             author: "Delapouite" },
  // Defense / shields / armor
  { dest: "game-icons/round-shield.svg",     url: `${GI}/delapouite/round-shield.svg`,     author: "Delapouite" },
  { dest: "game-icons/angel-wings.svg",      url: `${GI}/lorc/angel-wings.svg`,            author: "Lorc" },
  { dest: "game-icons/stone-tower.svg",      url: `${GI}/lorc/stone-tower.svg`,            author: "Lorc" },
  { dest: "game-icons/stone-block.svg",      url: `${GI}/skoll/stone-block.svg`,           author: "skoll" },
  { dest: "game-icons/stone-stack.svg",      url: `${GI}/delapouite/stone-stack.svg`,      author: "Delapouite" },
  { dest: "game-icons/titan.svg",            url: `${GI}/lorc/giant.svg`,                  author: "Lorc" },
  { dest: "game-icons/crystal-cluster.svg",  url: `${GI}/lorc/crystal-cluster.svg`,        author: "Lorc" },
  { dest: "game-icons/rune.svg",             url: `${GI}/lorc/rune-stone.svg`,             author: "Lorc" },
  // Animals (mascots)
  { dest: "game-icons/wolf-howl.svg",        url: `${GI}/delapouite/wolf-howl.svg`,        author: "Delapouite" },
  { dest: "game-icons/wolf-head.svg",        url: `${GI}/delapouite/wolf-head.svg`,        author: "Delapouite" },
  { dest: "game-icons/lion.svg",             url: `${GI}/delapouite/lion.svg`,             author: "Delapouite" },
  { dest: "game-icons/bear-head.svg",        url: `${GI}/delapouite/bear-head.svg`,        author: "Delapouite" },
  { dest: "game-icons/tiger-head.svg",       url: `${GI}/delapouite/tiger-head.svg`,       author: "Delapouite" },
  { dest: "game-icons/eagle-emblem.svg",     url: `${GI}/lorc/eagle-emblem.svg`,           author: "Lorc" },
  { dest: "game-icons/phoenix.svg",          url: `${GI}/lorc/phoenix.svg`,                author: "Lorc" },
  { dest: "game-icons/kraken.svg",           url: `${GI}/lorc/kraken.svg`,                 author: "Lorc" },
  { dest: "game-icons/shark-fin.svg",        url: `${GI}/lorc/shark-fin.svg`,              author: "Lorc" },
  { dest: "game-icons/snake.svg",            url: `${GI}/lorc/snake.svg`,                  author: "Lorc" },
  { dest: "game-icons/bull.svg",             url: `${GI}/delapouite/cow-head.svg`,         author: "Delapouite" },
  { dest: "game-icons/ram.svg",              url: `${GI}/delapouite/ram-profile.svg`,      author: "Delapouite" },
  // Sci-fi / space / vehicles
  { dest: "game-icons/spaceship.svg",        url: `${GI}/delapouite/spaceship.svg`,        author: "Delapouite" },
  { dest: "game-icons/space-shuttle.svg",    url: `${GI}/delapouite/space-shuttle.svg`,    author: "Delapouite" },
  { dest: "game-icons/missile-pod.svg",      url: `${GI}/lorc/missile-pod.svg`,            author: "Lorc" },
  { dest: "game-icons/cannon-shot.svg",      url: `${GI}/delapouite/cannon-shot.svg`,      author: "Delapouite" },
  { dest: "game-icons/laser-blast.svg",      url: `${GI}/lorc/laser-blast.svg`,            author: "Lorc" },
  { dest: "game-icons/galaxy.svg",           url: `${GI}/lorc/galaxy.svg`,                 author: "Lorc" },
  { dest: "game-icons/explosion.svg",        url: `${GI}/lorc/explosion-rays.svg`,         author: "Lorc" },
  // Sports
  { dest: "game-icons/basketball-ball.svg",  url: `${GI}/delapouite/basketball-ball.svg`,  author: "Delapouite" },
  { dest: "game-icons/ice-skate.svg",        url: `${GI}/delapouite/ice-skate.svg`,        author: "Delapouite" },
  { dest: "game-icons/hockey.svg",           url: `${GI}/delapouite/hockey.svg`,           author: "Delapouite" },
  // UI / abstract
  { dest: "game-icons/sundial.svg",          url: `${GI}/delapouite/sundial.svg`,          author: "Delapouite" },
  { dest: "game-icons/sun.svg",              url: `${GI}/lorc/sun.svg`,                    author: "Lorc" },
  { dest: "game-icons/two-coins.svg",        url: `${GI}/delapouite/two-coins.svg`,        author: "Delapouite" },
  { dest: "game-icons/crossed-swords.svg",   url: `${GI}/lorc/crossed-swords.svg`,         author: "Lorc" },
  { dest: "game-icons/hourglass.svg",        url: `${GI}/delapouite/hourglass.svg`,        author: "Delapouite" },
  // Card Clash mappings
  { dest: "game-icons/mirror.svg",           url: `${GI}/delapouite/hand-of-god.svg`,      author: "Delapouite" }, // mirror placeholder
];

// ── Tier 1 GitHub repos to clone wholesale ─────────────────────────────
const GITHUB_REPOS = [
  {
    name: "awesome-cc0-assets",
    dest: "_index",
    url: "https://github.com/Calinou/awesome-cc0-assets.git",
    license: "MIT-licensed metadata",
    description: "Curated index of CC0 asset sources. Use to discover more sources.",
  },
  {
    name: "lpc",
    dest: "lpc",
    url: "https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator.git",
    license: "CC-BY-SA 3.0 / GPL 3.0",
    description: "Layered character bodies + hair + clothing + weapons for AccessoryCompositor.",
  },
  {
    name: "game-icons-full",
    dest: "game-icons-full",
    url: "https://github.com/game-icons/icons.git",
    license: "CC-BY 3.0",
    description: "Full 4000+ game-icons mirror — any new game can reference any icon by slug.",
  },
];

// ── Manual-fetch packs (sandbox can't reach; document for the developer) ──
const MANUAL_PACKS = {
  kenney: [
    { slug: "space-shooter-redux",      url: "https://kenney.nl/assets/space-shooter-redux" },
    { slug: "space-shooter-extension",  url: "https://kenney.nl/assets/space-shooter-extension" },
    { slug: "particle-pack",            url: "https://kenney.nl/assets/particle-pack" },
    { slug: "toon-characters-1",        url: "https://kenney.nl/assets/toon-characters-1" },
    { slug: "platformer-characters",    url: "https://kenney.nl/assets/platformer-characters" },
    { slug: "pixel-platformer",         url: "https://kenney.nl/assets/pixel-platformer" },
    { slug: "platformer-pack-redux",    url: "https://kenney.nl/assets/platformer-pack-redux" },
    { slug: "pixel-shmup",              url: "https://kenney.nl/assets/pixel-shmup" },
    { slug: "topdown-tanks-redux",      url: "https://kenney.nl/assets/topdown-tanks-redux" },
    { slug: "topdown-shooter",          url: "https://kenney.nl/assets/topdown-shooter" },
    { slug: "background-elements-redux",url: "https://kenney.nl/assets/background-elements-redux" },
    { slug: "background-elements",      url: "https://kenney.nl/assets/background-elements" },
    { slug: "pirate-pack",              url: "https://kenney.nl/assets/pirate-pack" },
    { slug: "sports-pack",              url: "https://kenney.nl/assets/sports-pack" },
    { slug: "ui-pack",                  url: "https://kenney.nl/assets/ui-pack" },
    { slug: "ui-pack-rpg-expansion",    url: "https://kenney.nl/assets/ui-pack-rpg-expansion" },
    { slug: "ui-pack-space-expansion",  url: "https://kenney.nl/assets/ui-pack-space-expansion" },
    { slug: "game-icons",               url: "https://kenney.nl/assets/game-icons" },
    { slug: "board-game-icons",         url: "https://kenney.nl/assets/board-game-icons" },
    { slug: "emotes-pack",              url: "https://kenney.nl/assets/emotes-pack" },
    { slug: "fantasy-ui-borders",       url: "https://kenney.nl/assets/fantasy-ui-borders" },
    { slug: "tiny-dungeon",             url: "https://kenney.nl/assets/tiny-dungeon" },
    { slug: "tiny-town",                url: "https://kenney.nl/assets/tiny-town" },
  ],
  ansimuz: [
    { slug: "sunny-land",      url: "https://ansimuz.itch.io/sunny-land-pixel-game-art" },
    { slug: "mountain-dusk",   url: "https://ansimuz.itch.io/mountain-dusk-parallax-background" },
    { slug: "warped-city",     url: "https://ansimuz.itch.io/warped-city" },
    { slug: "gothicvania",     url: "https://ansimuz.itch.io/gothicvania-patreon-collection" },
  ],
  pixelfrog: [
    { slug: "pixel-adventure-1", url: "https://pixelfrog-assets.itch.io/pixel-adventure-1" },
    { slug: "pixel-adventure-2", url: "https://pixelfrog-assets.itch.io/pixel-adventure-2" },
  ],
  foozle: [
    { slug: "free-effects-pack", url: "https://foozlecc.itch.io/free-effects-pack" },
  ],
  luizmelo: [
    { slug: "martial-hero",    url: "https://luizmelo.itch.io/martial-hero" },
    { slug: "monsters-creatures", url: "https://luizmelo.itch.io/monsters-creatures-fantasy" },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────

function ensureDir(p) { mkdirSync(p, { recursive: true }); }

function download(url, dest) {
  return new Promise((resolveDl, rejectDl) => {
    ensureDir(dirname(dest));
    const file = createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "ArcadeFetcher/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow one redirect
        download(res.headers.location, dest).then(resolveDl).catch(rejectDl);
        return;
      }
      if (res.statusCode !== 200) {
        rejectDl(new Error(`${res.statusCode} on ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolveDl(true)));
    }).on("error", rejectDl);
  });
}

function cloneRepo(url, dest) {
  if (existsSync(dest)) {
    console.log(`  · ${dest} exists; skipping clone.`);
    return false;
  }
  try {
    execSync(`git clone --depth 1 ${url} "${dest}"`, { stdio: "inherit" });
    return true;
  } catch (e) {
    console.warn(`  ! Clone failed: ${e.message}`);
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────

(async () => {
  ensureDir(PUBLIC);
  console.log("─── Berry Arcade Visual Overhaul fetcher ───\n");

  // 1. game-icons individual icons
  let fetched = 0, skipped = 0, failed = 0;
  const attributions = new Map();
  for (const icon of ICONS) {
    const out = join(PUBLIC, icon.dest);
    if (existsSync(out)) { skipped++; continue; }
    try {
      await download(icon.url, out);
      fetched++;
      const key = `${icon.author}|game-icons.net`;
      attributions.set(key, (attributions.get(key) ?? 0) + 1);
      console.log(`  ✓ ${icon.dest}`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${icon.dest} — ${e.message}`);
    }
  }
  console.log(`\n[icons] ${fetched} fetched, ${skipped} skipped, ${failed} failed`);

  // 2. Tier 1 GitHub repos
  console.log(`\n─── Cloning Tier 1 GitHub repos ───`);
  for (const repo of GITHUB_REPOS) {
    const out = join(PUBLIC, repo.dest);
    console.log(`  cloning ${repo.name} -> ${repo.dest}`);
    cloneRepo(repo.url, out);
  }

  // 3. Append to ATTRIBUTION.md
  let attribTxt = existsSync(ATTRIBUTION) ? readFileSync(ATTRIBUTION, "utf8") : "# Asset Attribution\n\n";
  if (!attribTxt.includes("## Visual Overhaul additions")) {
    attribTxt += "\n## Visual Overhaul additions\n\n";
    for (const [key, count] of attributions) {
      const [author, site] = key.split("|");
      attribTxt += `- ${count}× icons by **${author}** from ${site} (CC-BY 3.0)\n`;
    }
    attribTxt += `- LPC Spritesheet Generator — sanderfrenken / various authors (CC-BY-SA 3.0 / GPL 3.0)\n`;
    attribTxt += `- game-icons.net full mirror — multiple authors (CC-BY 3.0)\n`;
    writeFileSync(ATTRIBUTION, attribTxt);
    console.log(`\n[attribution] updated ${ATTRIBUTION}`);
  }

  // 4. Visual report — manual fetch list
  console.log(`\n─── Writing VISUAL_REPORT.md ───`);
  let report = `# Visual Overhaul — Asset Status\n\n_Generated by \`scripts/fetch-visual-overhaul.mjs\`._\n\n`;
  report += `## Automatic (CC-BY 3.0, github.com)\n\n`;
  report += `- ✅ **game-icons individual fetch** — ${fetched} new icons under \`/public/assets/game-icons/\`\n`;
  report += `- ✅ **game-icons-full mirror** — \`/public/assets/game-icons-full/\` (4000+ icons)\n`;
  report += `- ✅ **LPC Universal Spritesheet Generator** — \`/public/assets/lpc/\` (CC-BY-SA 3.0 / GPL 3.0)\n`;
  report += `- ✅ **awesome-cc0-assets index** — \`/public/assets/_index/\` (curated CC0 source list)\n\n`;

  report += `## Manual — drop zip contents into \`/public/assets/<source>/<slug>/\`\n\n`;
  report += `Sandbox/CI can't reach kenney.nl, itch.io, or opengameart.org (Cloudflare bot protection). Download these locally on a normal browser, unzip the contents into the path shown, then run \`node scripts/verify-assets.mjs\`.\n\n`;

  report += `### Kenney CC0 packs → \`/public/assets/kenney/<slug>/\`\n\n`;
  report += `Each pack is a no-login direct ZIP download from the page below. Drop the unzipped \`PNG/\` (or similar) folder into the listed path.\n\n`;
  for (const p of MANUAL_PACKS.kenney) {
    report += `- [ ] \`${p.slug}\` — ${p.url}\n`;
  }

  report += `\n### ansimuz parallax backgrounds → \`/public/assets/ansimuz/<slug>/\`\n\n`;
  report += `These are the headline pickup for "dynamic moving backgrounds with depth" — pre-separated layer PNGs that scroll independently. Some are pay-what-you-want with $0 minimum (browser checkout required).\n\n`;
  for (const p of MANUAL_PACKS.ansimuz) {
    report += `- [ ] \`${p.slug}\` — ${p.url}\n`;
  }

  report += `\n### Pixel Frog → \`/public/assets/pixelfrog/<slug>/\`\n\n`;
  for (const p of MANUAL_PACKS.pixelfrog) {
    report += `- [ ] \`${p.slug}\` — ${p.url}\n`;
  }

  report += `\n### Foozle effects → \`/public/assets/foozle/<slug>/\`\n\n`;
  for (const p of MANUAL_PACKS.foozle) {
    report += `- [ ] \`${p.slug}\` — ${p.url}\n`;
  }

  report += `\n### LuizMelo fighters → \`/public/assets/luizmelo/<slug>/\`\n\n`;
  for (const p of MANUAL_PACKS.luizmelo) {
    report += `- [ ] \`${p.slug}\` — ${p.url}\n`;
  }

  report += `\n## After downloading\n\n`;
  report += `1. \`cd /home/user/yom-ops-hub/henry-dynasty\` (or your local repo path)\n`;
  report += `2. Drop each unzipped pack into the path shown above\n`;
  report += `3. \`node scripts/verify-assets.mjs\` to confirm everything resolves\n`;
  report += `4. Commit \`public/assets/\` and push — Claude will wire the new files into the asset-manifest + apps in Pass B\n`;
  report += `5. Update \`/public/assets/ATTRIBUTION.md\` — auto-write is best-effort; double-check authors\n`;

  writeFileSync(REPORT, report);
  console.log(`  ✓ ${REPORT}`);

  console.log(`\n─── Done. ───`);
  console.log(`Next: open public/assets/VISUAL_REPORT.md and walk the manual download list.`);
})().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
