// Seeded RNG + helpers
let _seed = Date.now();

export function setSeed(seed: number) { _seed = seed >>> 0; }

export function rand(): number {
  // mulberry32
  let t = (_seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rnd(min: number, max: number) { return rand() * (max - min) + min; }
export function irnd(min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min; }
export function choice<T>(arr: readonly T[]): T { return arr[Math.floor(rand() * arr.length)]; }
export function weighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
export function gauss(mean = 0, sd = 1) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
export function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
export function uid(prefix = "id"): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
