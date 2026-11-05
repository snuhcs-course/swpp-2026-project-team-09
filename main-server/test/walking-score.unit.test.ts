/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { scoreWalks, type TestWalk, withinRevisedTolerance, withinTwoMinutes } from '../scripts/walking/score.ts';

// Pairs that both predictions get right, with the pair names the eight telling pairs do not use.
function exact(count = 10): TestWalk[] {
  return Array.from({ length: count }, (_, index) => ({
    pair: `x${index}`,
    walked: 300,
    table: 300,
    baseline: 300,
  }));
}

// The first `misses` pairs off by `seconds`, for the table or the baseline.
function missing(walks: TestWalk[], misses: number, seconds: number, prediction: 'table' | 'baseline'): TestWalk[] {
  return walks.map((walk, index) => (index < misses ? { ...walk, [prediction]: walk.walked + seconds } : walk));
}

describe('the revised tolerance, min(0.25 × walked, 120 s)', () => {
  it('allows a quarter of a short walk, either way, counting the limit itself as within', () => {
    expect(withinRevisedTolerance(250, 200)).toBe(true);
    expect(withinRevisedTolerance(249, 200)).toBe(true);
    expect(withinRevisedTolerance(251, 200)).toBe(false);
    expect(withinRevisedTolerance(150, 200)).toBe(true);
    expect(withinRevisedTolerance(149, 200)).toBe(false);
  });

  it('allows 120 s on a long walk, where a quarter would be more', () => {
    expect(withinRevisedTolerance(720, 600)).toBe(true);
    expect(withinRevisedTolerance(719, 600)).toBe(true);
    expect(withinRevisedTolerance(721, 600)).toBe(false);
    expect(withinRevisedTolerance(480, 600)).toBe(true);
    expect(withinRevisedTolerance(479, 600)).toBe(false);
  });

  it('counts a 1-minute walk read as 2 minutes as wrong', () => {
    expect(withinRevisedTolerance(119, 58)).toBe(false);
  });
});

describe('±2 minutes', () => {
  it('allows 120 s either way, whatever the walk, counting the limit itself as within', () => {
    expect(withinTwoMinutes(178, 58)).toBe(true);
    expect(withinTwoMinutes(179, 58)).toBe(false);
    expect(withinTwoMinutes(480, 600)).toBe(true);
    expect(withinTwoMinutes(479, 600)).toBe(false);
  });
});

describe('the shares and the threshold', () => {
  it('names the pairs within each tolerance, for the table and the baseline', () => {
    const walks = [
      { pair: 'a', walked: 200, table: 250, baseline: 300 },
      { pair: 'b', walked: 600, table: 700, baseline: 610 },
    ];

    const { table, baseline } = scoreWalks(walks);

    expect(table.withinTwoMinutes).toEqual(['a', 'b']);
    expect(table.withinRevised).toEqual(['a', 'b']);
    expect(baseline.withinTwoMinutes).toEqual(['a', 'b']);
    expect(baseline.withinRevised).toEqual(['b']);
  });

  it('is met with 70% of the pairs within and the MAE below the baseline', () => {
    const walks = missing(missing(exact(), 3, 200, 'table'), 10, 70, 'baseline');

    const { table, baseline, verdicts } = scoreWalks(walks);

    expect(table.mae).toBe(60);
    expect(baseline.mae).toBe(70);
    expect(verdicts).toEqual({ twoMinutes: true, revised: true });
  });

  it('is missed with fewer than 70% within', () => {
    const walks = missing(missing(exact(), 4, 130, 'table'), 10, 70, 'baseline');

    expect(scoreWalks(walks).verdicts).toEqual({ twoMinutes: false, revised: false });
  });

  it('is missed when the MAE equals the baseline', () => {
    const walks = missing(missing(exact(), 3, 200, 'table'), 10, 60, 'baseline');

    expect(scoreWalks(walks).verdicts).toEqual({ twoMinutes: false, revised: false });
  });

  it('can be met under ±2 minutes and missed under the revised tolerance', () => {
    // 100 s off a 300 s walk is within 2 minutes but more than a quarter of it.
    const walks = missing(missing(exact(), 4, 100, 'table'), 10, 50, 'baseline');

    const { table, verdicts } = scoreWalks(walks);

    expect(table.withinTwoMinutes).toHaveLength(10);
    expect(table.withinRevised).toHaveLength(6);
    expect(verdicts).toEqual({ twoMinutes: true, revised: false });
  });
});

describe('the diagnostics', () => {
  it('counts as late only a walk more than 120 s longer than predicted', () => {
    const walks = [
      { pair: 'a', walked: 400, table: 280, baseline: 279 },
      { pair: 'b', walked: 400, table: 700, baseline: 200 },
    ];

    const { table, baseline } = scoreWalks(walks);

    expect(table.late).toEqual([]);
    expect(baseline.late).toEqual(['a', 'b']);
  });

  it('gives k, the one factor that best scales the table to the walks', () => {
    const walks = [
      { pair: 'a', walked: 50, table: 100, baseline: 0 },
      { pair: 'b', walked: 100, table: 200, baseline: 0 },
      { pair: 'c', walked: 200, table: 100, baseline: 0 },
    ];

    // (5,000 + 20,000 + 20,000) / (10,000 + 40,000 + 10,000)
    expect(scoreWalks(walks).k).toBe(0.75);
  });

  it('gives the MAE over pairs 5, 11, 15, 20, 22, 23, 24 and 27 alone', () => {
    const telling = ['5', '11', '15', '20', '22', '23', '24', '27'].map((pair) => ({
      pair,
      walked: 300,
      table: 340,
      baseline: 280,
    }));
    const walks = [...exact(22), ...telling];

    const { table, baseline } = scoreWalks(walks);

    expect(table.tellingMae).toBe(40);
    expect(baseline.tellingMae).toBe(20);
    expect(table.mae).toBeCloseTo((8 * 40) / 30);
  });
});
