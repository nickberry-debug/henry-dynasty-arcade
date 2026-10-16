import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
assert.match(read('src/config/games.ts'), /id: "berry-fighter"/, 'arcade registry contains game');
assert.match(read('src/App.tsx'), /path="\/berry-fighter"/, 'arcade route exists');
const page = read('src/berry-fighter/BerryFighter.tsx');
assert.match(page, /\/games\/berry-fighter\/index.html/, 'play launches same-site game');
assert.match(page, /\/downloads\/berry-fighter-windows.zip/, 'Windows download is on arcade');
const vercel = JSON.parse(read('vercel.json'));
const rewrite = new RegExp('^' + vercel.rewrites[0].source + '$');
assert.equal(rewrite.test('/games/berry-fighter/index.wasm'), false, 'WASM cannot become SPA HTML');
assert.equal(rewrite.test('/downloads/berry-fighter-windows.zip'), false, 'download cannot become SPA HTML');
const config = read('vite.config.ts');
assert.match(config, /navigateFallbackDenylist:[^\n]*games/, 'service worker excludes game navigation');
assert.ok(existsSync(new URL('../public/games/berry-fighter/index.wasm', import.meta.url)), 'web export exists');
assert.ok(existsSync(new URL('../public/downloads/berry-fighter-windows.zip', import.meta.url)), 'Windows download exists');
console.log('Berry Fighter site integration checks PASS');
