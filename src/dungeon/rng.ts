// rng.ts — Deterministic seeded RNG (Mulberry32). Same seed → same dungeon.

export class RNG {
  private state: number;

  constructor(seed: number | string) {
    if (typeof seed === "string") {
      // Simple string hash → 32-bit
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      this.state = h >>> 0;
    } else {
      this.state = (seed >>> 0) || 1;
    }
  }

  /** Returns float in [0,1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick one element. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Weighted pick. Weights need not sum to 1. */
  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    const total = items.reduce((s, x) => s + x.weight, 0);
    let r = this.next() * total;
    for (const x of items) {
      r -= x.weight;
      if (r <= 0) return x.item;
    }
    return items[items.length - 1].item;
  }

  /** Coin flip with probability p of true. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Shuffle in-place (Fisher-Yates). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Fork a new RNG with derived seed (for sub-systems). */
  fork(salt: number): RNG {
    return new RNG(this.state ^ (salt * 0x9e3779b9));
  }
}

export function rollD(rng: RNG, sides: number): number {
  return rng.int(1, sides);
}
