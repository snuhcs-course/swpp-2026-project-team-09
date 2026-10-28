/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { curveFlags, replayFlags, suggestionFlags } from '../eval/replay/flags.ts';
import { GOLD_FILE } from '../eval/replay/gold.ts';
import { stageMetrics, type Scored } from '../eval/replay/replay-metrics.ts';
import { type StageAnswer } from '../eval/replay/stages.ts';
import { rate, shown } from '../eval/replay/wilson.ts';

// The replay's rates (P07 ticket 05): the Wilson interval on known values, a stage's numbers on hand-made answers,
// and the command lines.

describe('The Wilson interval', () => {
  it('gives the known 95% bounds', () => {
    const none = rate(0, 10);
    const half = rate(5, 10);
    const most = rate(95, 100);

    expect([none.low, none.high]).toEqual([0, expect.closeTo(0.2775, 4)]);
    expect([half.low, half.high]).toEqual([expect.closeTo(0.2366, 4), expect.closeTo(0.7634, 4)]);
    expect([most.low, most.high]).toEqual([expect.closeTo(0.8882, 4), expect.closeTo(0.9785, 4)]);
    expect(rate(10, 10).high).toBe(1);
  });

  it('has no value with no n, and shows as a table cell', () => {
    expect(rate(0, 0)).toEqual({ k: 0, n: 0, value: null, low: null, high: null });
    expect(shown(rate(0, 0))).toBe('—');
    expect(shown(rate(5, 10))).toBe('50.0% [23.7, 76.3] 5/10');
  });
});

function answer(result: StageAnswer['result'], candidates: string[], more: Partial<StageAnswer> = {}): StageAnswer {
  return { result, candidates, tier: result === 'none' ? null : 'generated', source: null, ...more };
}

const eleven = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'd'];

const scored: Scored[] = [
  { accept: new Set(['a']), answer: answer('one', ['a'], { tier: 'exact' }) },
  { accept: new Set(['b']), answer: answer('several', ['x', 'b']) },
  { accept: new Set(['c']), answer: answer('none', []) },
  { accept: new Set(), answer: answer('none', []) },
  { accept: new Set(), answer: answer('one', ['y'], { tier: 'alias', source: 'curated' }) },
  { accept: new Set(['d']), answer: answer('several', eleven, { tier: 'alias', source: 'global' }) },
];

describe("A stage's numbers", () => {
  it('count recall within the first 10 and top-1 over the items that accept a Place', () => {
    const metrics = stageMetrics(scored);

    expect(metrics.recallAt10).toMatchObject({ k: 2, n: 4 });
    expect(metrics.top1).toMatchObject({ k: 1, n: 4 });
  });

  it('count resolution and none over every item, false none and precision of one apart', () => {
    const metrics = stageMetrics(scored);

    expect(metrics.n).toBe(6);
    expect(metrics.resolution).toMatchObject({ k: 4, n: 6 });
    expect(metrics.none).toMatchObject({ k: 2, n: 6 });
    expect(metrics.falseNone).toMatchObject({ k: 1, n: 4 });
    expect(metrics.precisionOfOne).toMatchObject({ k: 1, n: 2 });
  });

  it('count the candidates shown, at most 10, the tiers and the alias hits by source', () => {
    const metrics = stageMetrics(scored);

    expect(metrics.meanCandidates).toBe((1 + 2 + 1 + 10) / 4);
    expect(metrics.tiers).toEqual({ exact: 1, generated: 1, none: 2, alias: 2 });
    expect(metrics.aliasHits).toEqual({ curated: 1, learned: 1 });
  });
});

describe('The command lines', () => {
  const now = new Date('2026-10-28T05:00:00Z');

  it('replay the test set of the gold file with everything learned so far, unless told otherwise', () => {
    expect(replayFlags([], now)).toEqual({ gold: GOLD_FILE, asOf: now, development: false });
    expect(replayFlags(['--gold', 'mine.yaml', '--as-of', '2026-11-10', '--development'], now)).toEqual({
      gold: 'mine.yaml',
      asOf: new Date('2026-11-09T15:00:00Z'),
      development: true,
    });
  });

  it('read days in Korea, a week a step by default, and refuse a bad day, step or order', () => {
    expect(curveFlags(['--from', '2026-10-01', '--to', '2026-10-29'])).toEqual({
      from: new Date('2026-09-30T15:00:00Z'),
      to: new Date('2026-10-28T15:00:00Z'),
      stepDays: 7,
    });
    expect(suggestionFlags(['--from', '2026-10-01', '--to', '2026-10-01']).until).toEqual(
      new Date('2026-10-01T15:00:00Z'),
    );
    expect(() => curveFlags(['--from', '2026-10-01'])).toThrow('--to is required');
    expect(() => curveFlags(['--from', '2026-10-01', '--to', '2026-10-29', '--step', '0'])).toThrow('--step');
    expect(() => suggestionFlags(['--from', '2026-10-02', '--to', '2026-10-01'])).toThrow('before');
    expect(() => replayFlags(['--as-of', '2026-13-01'], now)).toThrow('YYYY-MM-DD');
  });
});
