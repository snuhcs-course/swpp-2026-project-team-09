/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type CompiledRule } from '../../places/induced-rules.js';
import { correctCount, type Verdict } from './scoring.js';

// GEPA's candidate pool and its Pareto sampling (Agrawal et al., ICLR 2026, research note 11 §3.1), over rule sets
// scored instance by instance: a candidate stays on the front unless another is right on everything it is right on
// and more, and a parent is drawn from the front with a weight of how many instances it is right on. The paper's
// ablation had this beat the greedy and beam choice of parent.

export interface Candidate {
  rules: CompiledRule[];
  // One per training instance.
  verdicts: Verdict[];
}

// Whether `a` is right on everything `b` is right on, and on more.
export function dominates(a: Candidate, b: Candidate): boolean {
  let more = false;
  for (const [index, { correct }] of b.verdicts.entries()) {
    const own = a.verdicts[index]?.correct ?? false;
    if (correct && !own) {
      return false;
    }
    if (own && !correct) {
      more = true;
    }
  }
  return more;
}

export function paretoFront(candidates: readonly Candidate[]): Candidate[] {
  return candidates.filter((candidate) => !candidates.some((other) => dominates(other, candidate)));
}

// A random number source from a seed, the same sequence for the same seed (mulberry32), so that a run repeats.
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// One of the front, by how many instances each is right on; one right on none weighs as one.
export function sampleFront(front: readonly Candidate[], random: () => number): Candidate {
  const weights = front.map(({ verdicts }) => Math.max(1, correctCount(verdicts)));
  let left = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (const [index, weight] of weights.entries()) {
    left -= weight;
    const candidate = front[index];
    if (left < 0 && candidate !== undefined) {
      return candidate;
    }
  }
  const last = front.at(-1);
  if (last === undefined) {
    throw new Error('The front is empty');
  }
  return last;
}

// Up to `count` of the items, each at most once, in random order.
export function sampleSome<Item>(items: readonly Item[], count: number, random: () => number): Item[] {
  const pool = [...items];
  const taken: Item[] = [];
  while (taken.length < count && pool.length > 0) {
    const [item] = pool.splice(Math.floor(random() * pool.length), 1);
    if (item !== undefined) {
      taken.push(item);
    }
  }
  return taken;
}
