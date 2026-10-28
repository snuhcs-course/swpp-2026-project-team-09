/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type StageAnswer } from './stages.ts';
import { type Rate, rate } from './wilson.ts';

// The numbers of one stage over the gold items (research note 08 §4), each rate with its n and Wilson interval.

// The most candidates a resolver gives the model (src/assistant/tools/resolved.ts), and so the k of recall@k.
export const SHOWN_MAX = 10;

export interface Scored {
  // The ids the item accepts; empty when its words name no Place.
  accept: ReadonlySet<string>;
  answer: StageAnswer;
}

export interface StageMetrics {
  n: number;
  // Not none, over every item.
  resolution: Rate;
  // A `one` that names an accepted Place, over the `one` answers.
  precisionOfOne: Rate;
  // An accepted Place among the first 10 candidates, over the items that accept one.
  recallAt10: Rate;
  // The first candidate accepted, over the items that accept one.
  top1: Rate;
  // None, over every item.
  none: Rate;
  // None for an item that accepts a Place, over those items.
  falseNone: Rate;
  // The candidates shown, at most 10, over the answers that are not none.
  meanCandidates: number | null;
  // How many items each tier answered, `none` for those nothing answered.
  tiers: Record<string, number>;
  // Items answered on the alias tier by the curated groups, and by an alias learned from Users.
  aliasHits: { curated: number; learned: number };
}

function count<Item>(items: readonly Item[], test: (item: Item) => boolean): number {
  return items.filter((item) => test(item)).length;
}

function accepted({ accept, answer }: Scored, upTo: number): boolean {
  return answer.candidates.slice(0, upTo).some((id) => accept.has(id));
}

export function stageMetrics(scored: readonly Scored[]): StageMetrics {
  const targeted = scored.filter(({ accept }) => accept.size > 0);
  const ones = scored.filter(({ answer }) => answer.result === 'one');
  const answered = scored.filter(({ answer }) => answer.result !== 'none');
  const isNone = ({ answer }: Scored): boolean => answer.result === 'none';
  const tiers: Record<string, number> = {};
  for (const { answer } of scored) {
    const tier = answer.tier ?? 'none';
    tiers[tier] = (tiers[tier] ?? 0) + 1;
  }
  const onAlias = scored.filter(({ answer }) => answer.tier === 'alias');
  const shown = answered.reduce((total, { answer }) => total + Math.min(answer.candidates.length, SHOWN_MAX), 0);
  return {
    n: scored.length,
    resolution: rate(answered.length, scored.length),
    precisionOfOne: rate(
      count(ones, (item) => accepted(item, 1)),
      ones.length,
    ),
    recallAt10: rate(
      count(targeted, (item) => accepted(item, SHOWN_MAX)),
      targeted.length,
    ),
    top1: rate(
      count(targeted, (item) => accepted(item, 1)),
      targeted.length,
    ),
    none: rate(
      count(scored, (item) => isNone(item)),
      scored.length,
    ),
    falseNone: rate(
      count(targeted, (item) => isNone(item)),
      targeted.length,
    ),
    meanCandidates: answered.length === 0 ? null : shown / answered.length,
    tiers,
    aliasHits: {
      curated: count(onAlias, ({ answer }) => answer.source === 'curated'),
      learned: count(onAlias, ({ answer }) => answer.source === 'personal' || answer.source === 'global'),
    },
  };
}
