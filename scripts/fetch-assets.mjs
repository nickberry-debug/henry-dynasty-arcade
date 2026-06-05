// ─────────────────────────────────────────────────────────────────────────
// Berry Kids' Arcade — autonomous asset pipeline (fetcher).
//
// Zero-dependency Node ESM script (uses only node: builtins) so it runs
// anywhere with `node scripts/fetch-assets.mjs` — no npm install, no tsx.
//
// What it does:
//   1. Reads the NEEDS registry below (logical asset needs per game).
//   2. Resolves each need to a concrete, license-clean, directly-fetchable
//      URL from an APPROVED source.
//   3. Downloads into /public/assets/{source}/{group}/{file}, skipping
//      anything already recorded in the lockfile whose file still exists
//      (deterministic re-runs, no re-download).
//   4. Logs every CC-BY asset into /public/assets/ATTRIBUTION.md.
//   5. Writes /scripts/assets.lock.json.
//
// SOURCE REALITY (important): from a hardened/sandboxed network, the only
// reliably reachable asset host is raw.githubusercontent.com. The big
// asset portals (kenney.nl, opengameart.org, quaternius.com, dicebear,
// freesound) sit behind Cloudflare/bot-protection and return 403 to
// scripted requests. So the live, working source wired here is
// game-icons.net's official GitHub mirror (CC-BY 3.0). Kenney CC0 packs
// are added to /public/assets/kenney/ by hand (the developer drops the
// zip in chat and Claude wires it) — the manifest treats both identically.
//
// To extend: add entries to NEEDS. Each entry that points at a github-raw
// URL will fetch automatically; entries from bot-protected hosts are
// marked `manual: true` and skipped with a logged note (never blocks).
// ─────────────────────────────────────────────────────────────────────────

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = join(ROOT, "public", "assets");
const LOCKFILE = join(__dirname, "assets.lock.json");
const ATTRIBUTION = join(PUBLIC, "ATTRIBUTION.md");

const GI = "https://raw.githubusercontent.com/game-icons/icons/master";

// ── Approved sources ───────────────────────────────────────────────────────
const SOURCES = {
  "game-icons": { license: "CC-BY-3.0", home: "https://game-icons.net", attribution: true },
  kenney:       { license: "CC0-1.0",   home: "https://kenney.nl",       attribution: false },
};

// ── NEEDS: logical asset needs, resolved to concrete fetchable URLs ─────────
// Each: { game, intent, dest (under /public/assets), url, source, author }
// game-icons paths are author-scoped; authors verified to exist on master.
const NEEDS = [
  // Shared / arcade UI
  { game: "shared", intent: "icon_play",     dest: "game-icons/gamepad-cross.svg",  url: `${GI}/lorc/gamepad-cross.svg`,        source: "game-icons", author: "Lorc" },
  { game: "shared", intent: "icon_console",  dest: "game-icons/game-console.svg",   url: `${GI}/delapouite/game-console.svg`,   source: "game-icons", author: "Delapouite" },
  { game: "shared", intent: "icon_trophy",   dest: "game-icons/trophy.svg",         url: `${GI}/lorc/trophy.svg`,               source: "game-icons", author: "Lorc" },
  { game: "shared", intent: "icon_podium",   dest: "game-icons/podium.svg",         url: `${GI}/delapouite/podium.svg`,         source: "game-icons", author: "Delapouite" },
  // Battle Forge
  { game: "battleforge", intent: "icon_swords",   dest: "game-icons/crossed-swords.svg", url: `${GI}/lorc/crossed-swords.svg`,   source: "game-icons", author: "Lorc" },
  { game: "battleforge", intent: "icon_lightning",dest: "game-icons/lightning-tree.svg", url: `${GI}/lorc/lightning-tree.svg`,   source: "game-icons", author: "Lorc" },
  { game: "battleforge", intent: "icon_burst",    dest: "game-icons/embrassed-energy.svg",url: `${GI}/lorc/embrassed-energy.svg`,source: "game-icons", author: "Lorc" },
  // Baseball
  { game: "baseball", intent: "icon_bat",    dest: "game-icons/baseball-bat.svg",   url: `${GI}/delapouite/baseball-bat.svg`,   source: "game-icons", author: "Delapouite" },
  { game: "baseball", intent: "icon_glove",  dest: "game-icons/baseball-glove.svg", url: `${GI}/delapouite/baseball-glove.svg`, source: "game-icons", author: "Delapouite" },
  // Football
  { game: "football", intent: "icon_ball",   dest: "game-icons/american-football-ball.svg", url: `${GI}/delapouite/american-football-ball.svg`, source: "game-icons", author: "Delapouite" },
  { game: "football", intent: "icon_whistle",dest: "game-icons/whistle.svg",        url: `${GI}/delapouite/whistle.svg`,        source: "game-icons", author: "Delapouite" },
  // Olympus
  { game: "olympus", intent: "icon_temple",  dest: "game-icons/greek-temple.svg",   url: `${GI}/delapouite/greek-temple.svg`,   source: "game-icons", author: "Delapouite" },
  { game: "olympus", intent: "icon_helmet",  dest: "game-icons/spartan-helmet.svg", url: `${GI}/delapouite/spartan-helmet.svg`, source: "game-icons", author: "Delapouite" },
  { game: "olympus", intent: "icon_zeus",    dest: "game-icons/zeus-sword.svg",     url: `${GI}/lorc/zeus-sword.svg`,           source: "game-icons", author: "Lorc" },
  // Cosmic Squad
  { game: "cosmic", intent: "icon_rocket",   dest: "game-icons/rocket.svg",         url: `${GI}/lorc/rocket.svg`,               source: "game-icons", author: "Lorc" },
  // Temporal Order
  { game: "temporal", intent: "icon_hourglass", dest: "game-icons/hourglass.svg",   url: `${GI}/lorc/hourglass.svg`,            source: "game-icons", author: "Lorc" },
  // Movie Studio
  { game: "mogul", intent: "icon_clapper",   dest: "game-icons/clapperboard.svg",   url: `${GI}/delapouite/clapperboard.svg`,   source: "game-icons", author: "Delapouite" },
  { game: "mogul", intent: "icon_film",      dest: "game-icons/film-strip.svg",     url: `${GI}/delapouite/film-strip.svg`,     source: "game-icons", author: "Delapouite" },
  // Wordplay + Spell
  { game: "wordplay", intent: "icon_chat",   dest: "game-icons/chat-bubble.svg",    url: `${GI}/delapouite/chat-bubble.svg`,    source: "game-icons", author: "Delapouite" },
  { game: "spell", intent: "icon_book",      dest: "game-icons/book-cover.svg",     url: `${GI}/delapouite/book-cover.svg`,     source: "game-icons", author: "Delapouite" },
  { game: "spell", intent: "icon_cap",       dest: "game-icons/graduate-cap.svg",   url: `${GI}/delapouite/graduate-cap.svg`,   source: "game-icons", author: "Delapouite" },
  // Potion Lab
  { game: "potionlab", intent: "icon_flask", dest: "game-icons/bubbling-flask.svg", url: `${GI}/lorc/bubbling-flask.svg`,       source: "game-icons", author: "Lorc" },
  { game: "potionlab", intent: "icon_potion",dest: "game-icons/potion-ball.svg",    url: `${GI}/lorc/potion-ball.svg`,          source: "game-icons", author: "Lorc" },
  { game: "potionlab", intent: "icon_swirl", dest: "game-icons/magic-swirl.svg",    url: `${GI}/lorc/magic-swirl.svg`,          source: "game-icons", author: "Lorc" },
];

// ── HTTP GET (follows one redirect; resolves status + body) ─────────────────
function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { "User-Agent": "berry-arcade-asset-pipeline" } }, r => {
      if (r.statusCode === 301 || r.statusCode === 302) {
        r.resume();
        return get(r.headers.location).then(res, rej);
      }
      const chunks = [];
      r.on("data", c => chunks.push(c));
      r.on("end", () => res({ status: r.statusCode, body: Buffer.concat(chunks) }));
    }).on("error", rej);
  });
}

function loadLock() {
  try { return JSON.parse(readFileSync(LOCKFILE, "utf8")); } catch { return { fetched: {} }; }
}

async function main() {
  const lock = loadLock();
  let fetched = 0, skipped = 0, failed = 0, manual = 0;
  const ccbyEntries = [];

  for (const need of NEEDS) {
    const outPath = join(PUBLIC, need.dest);
    const key = need.dest;

    if (need.manual) {
      manual++;
      console.log(`↷ manual  ${need.intent} (${need.dest}) — source ${need.source} not script-fetchable; drop file by hand`);
      continue;
    }

    // Deterministic: skip if locked AND the file still exists.
    if (lock.fetched[key] && existsSync(outPath)) {
      skipped++;
      if (SOURCES[need.source]?.attribution) ccbyEntries.push(need);
      continue;
    }

    try {
      const { status, body } = await get(need.url);
      if (status !== 200 || body.length < 32) {
        failed++;
        console.log(`✗ FAIL   ${need.intent} → ${status} (${need.url})`);
        continue;
      }
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, body);
      lock.fetched[key] = { url: need.url, source: need.source, author: need.author, bytes: body.length, at: new Date().toISOString() };
      fetched++;
      if (SOURCES[need.source]?.attribution) ccbyEntries.push(need);
      console.log(`✓ fetch  ${need.intent} → ${need.dest} (${body.length}b)`);
    } catch (e) {
      failed++;
      console.log(`✗ ERROR  ${need.intent} — ${e.message}`);
    }
  }

  writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + "\n");
  writeAttribution(ccbyEntries);

  console.log(`\nPipeline: ${fetched} fetched · ${skipped} cached · ${failed} failed · ${manual} manual`);
  if (failed > 0) process.exitCode = 0; // never hard-fail the whole run on one miss
}

function writeAttribution(ccby) {
  const bySource = {};
  for (const n of ccby) (bySource[n.source] ??= []).push(n);
  let md = `# Asset Attribution

This file is generated by \`scripts/fetch-assets.mjs\`. It lists every
non-CC0 asset bundled in the arcade and its required attribution.

CC0 assets (Kenney packs under \`public/assets/kenney/\`, \`mini\`,
\`mini-arena\`, \`particles\`, \`smoke\`, \`space\`, \`sports\`, \`fui\`) are
public domain and require no attribution, so they are not listed here.

`;
  for (const [src, items] of Object.entries(bySource)) {
    const meta = SOURCES[src];
    md += `## ${src} — ${meta.license}\n\nSource: ${meta.home}\n\n`;
    const seen = new Set();
    for (const it of items.sort((a, b) => a.dest.localeCompare(b.dest))) {
      if (seen.has(it.dest)) continue;
      seen.add(it.dest);
      md += `- \`${it.dest}\` — by **${it.author}** (${meta.license}), via ${meta.home}\n`;
    }
    md += `\nLicense text: https://creativecommons.org/licenses/by/3.0/\n\n`;
  }
  mkdirSync(PUBLIC, { recursive: true });
  writeFileSync(ATTRIBUTION, md);
  console.log(`Attribution written → ${ATTRIBUTION}`);
}

main();
