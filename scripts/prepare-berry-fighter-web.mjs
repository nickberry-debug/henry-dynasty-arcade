import { readFileSync, writeFileSync } from 'node:fs';

// Run after every Godot Web export. Standard Godot installs the worker
// after loading the engine; precache its binaries so first-load offline
// reopening does not depend on a second online visit.
const sw = new URL('../public/games/berry-fighter/index.service.worker.js', import.meta.url);
const source = readFileSync(sw, 'utf8');
if (!source.includes('cache.addAll(CACHED_FILES)') && !source.includes('cache.addAll(FULL_CACHE)')) {
  throw new Error('Godot service-worker format changed; review offline caching before shipping.');
}
writeFileSync(sw, source.replace('cache.addAll(CACHED_FILES)', 'cache.addAll(FULL_CACHE)'));
const htmlPath = new URL('../public/games/berry-fighter/index.html', import.meta.url);
let html = readFileSync(htmlPath, 'utf8');
if (!html.includes('berry-offline-status')) {
  html = html.replace('</body>', `<div id="berry-offline-status" role="status" style="position:fixed;bottom:4px;right:8px;z-index:20;padding:4px 8px;border-radius:6px;background:#0d252e;color:#d0eb84;font:12px sans-serif;pointer-events:none">Saving for offline play…</div>
<script>
(async () => {
  const note = document.getElementById('berry-offline-status');
  if (!('serviceWorker' in navigator)) { note.textContent = 'Offline play unavailable'; return; }
  const scope = new URL('./', location.href).href;
  for (let i = 0; i < 120; i++) {
    const reg = await navigator.serviceWorker.getRegistration(scope).catch(() => null);
    if (reg && reg.scope === scope && reg.active && reg.active.state === 'activated') {
      note.textContent = 'Ready for offline play';
      setTimeout(() => note.remove(), 6000);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  note.textContent = 'Offline saving incomplete — stay online';
})();
</script></body>`);
  writeFileSync(htmlPath, html);
}
console.log('Berry Fighter first-install offline cache prepared.');
