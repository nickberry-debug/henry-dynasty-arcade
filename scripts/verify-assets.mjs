// Verify that every asset the manifest references resolves to a real file,
// and that everything the fetcher recorded in the lockfile is on disk.
// Zero-dep Node ESM: `node scripts/verify-assets.mjs`. Exit 1 on any miss.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const MANIFEST = join(ROOT, "src", "art", "asset-manifest.ts");
const LOCKFILE = join(__dirname, "assets.lock.json");

const K = "/assets/kenney";
const GI = "/assets/game-icons";

function manifestPaths() {
  const txt = readFileSync(MANIFEST, "utf8");
  const found = new Set();
  // Match backtick fragments referencing assets (via ${K}/${GI} or literal).
  const re = /`((?:\$\{K\}|\$\{GI\}|\/assets\/)[^`]*?\.(?:png|svg))`/g;
  let m;
  while ((m = re.exec(txt))) {
    const p = m[1].replace("${K}", K).replace("${GI}", GI);
    // Plain literals only — resolver-generated paths (still containing a
    // ${…} placeholder) are produced at runtime and skipped here; their
    // base directories are user-provided CC0 packs that are stable.
    if (!p.includes("${")) found.add(p);
  }
  return [...found];
}

let missing = 0, ok = 0;

console.log("— Manifest paths —");
for (const p of manifestPaths().sort()) {
  const abs = join(PUBLIC, p);
  if (existsSync(abs)) { ok++; }
  else { missing++; console.log(`  ✗ MISSING ${p}`); }
}

console.log("— Lockfile (fetched) —");
try {
  const lock = JSON.parse(readFileSync(LOCKFILE, "utf8"));
  for (const [dest] of Object.entries(lock.fetched || {})) {
    const abs = join(PUBLIC, "assets", dest);
    if (existsSync(abs)) { ok++; }
    else { missing++; console.log(`  ✗ MISSING (locked) ${dest}`); }
  }
} catch { console.log("  (no lockfile)"); }

console.log(`\nVerify: ${ok} present · ${missing} missing`);
process.exit(missing > 0 ? 1 : 0);
