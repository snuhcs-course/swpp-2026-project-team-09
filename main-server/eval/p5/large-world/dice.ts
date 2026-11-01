/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The generator's random numbers, the same on every machine for one seed (P05 ticket 02b).

// mulberry32: a small generator that gives the same numbers on every machine and version of Node.
export function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = Math.trunc(state + 0x6d_2b_79_f5);
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = Math.trunc(t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export class Dice {
  private readonly random: () => number;

  constructor(seed: number) {
    this.random = randomFrom(seed);
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }

  // From `low` to `high`, both held.
  between(low: number, high: number): number {
    return low + Math.floor(this.random() * (high - low + 1));
  }

  pick<Item>(items: readonly Item[]): Item {
    const item = items[Math.floor(this.random() * items.length)];
    if (item === undefined) {
      throw new Error('Nothing to pick from');
    }
    return item;
  }

  weighted<Item>(items: readonly (readonly [Item, number])[]): Item {
    const total = items.reduce((sum, [, weight]) => sum + weight, 0);
    let left = this.random() * total;
    for (const [item, weight] of items) {
      left -= weight;
      if (left < 0) {
        return item;
      }
    }
    throw new Error('Nothing to pick from');
  }
}
