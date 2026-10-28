/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { curveGroup, type EventRow, labelledRows } from '../eval/replay/curve-metrics.ts';
import { type StageAnswer } from '../eval/replay/stages.ts';
import { type Impression, koreaWeek, suggestionCells, weightedAcceptance } from '../eval/replay/suggestion-metrics.ts';

// The learning curve's labels and rates, and the suggestions' weekly rates and weighted acceptance (P07 ticket 05), on
// hand-made rows.

const MINUTE_MS = 60 * 1000;
const START = new Date('2026-10-26T01:00:00Z').getTime();

function event(id: string, userId: string, outcome: EventRow['outcome'], minute: number, chosenId?: string): EventRow {
  return {
    id,
    userId,
    words: '학관',
    outcome,
    chosenId: chosenId ?? null,
    createdAt: new Date(START + minute * MINUTE_MS),
  };
}

describe('The rows a learning curve scores', () => {
  it("are the answered rows with the User's later labels of the same words, until they ask again", () => {
    const rows = labelledRows([
      event('a3', 'u1', 'answered', 3),
      event('a1', 'u1', 'answered', 0),
      event('l1', 'u1', 'chosen', 1, 'p1'),
      event('a2', 'u2', 'answered', 0),
      event('r3', 'u1', 'rejected', 4, 'p1'),
      event('e3', 'u1', 'edited', 5, 'p2'),
    ]);

    expect(rows.map(({ row, labels, truth }) => [row.id, labels.map(({ id }) => id), truth])).toEqual([
      ['a1', ['l1'], 'p1'],
      ['a3', ['r3', 'e3'], 'p2'],
    ]);
  });

  it('have no Place to score top-1 by when the User only rejected', () => {
    const [row] = labelledRows([event('a', 'u', 'answered', 0), event('r', 'u', 'rejected', 1, 'p1')]);

    expect(row?.truth).toBeNull();
  });
});

function answer(result: StageAnswer['result'], candidates: string[]): StageAnswer {
  return { result, candidates, tier: null, source: null };
}

describe("A learning curve's point", () => {
  it('asks over every row and is right at top-1 over the rows whose User chose a Place', () => {
    const group = curveGroup([
      { truth: 'p1', rules: answer('several', ['p0', 'p1']), learned: answer('one', ['p1']) },
      { truth: 'p2', rules: answer('several', ['p2', 'p0']), learned: answer('several', ['p2', 'p0']) },
      { truth: null, rules: answer('one', ['p3']), learned: answer('none', []) },
    ]);

    expect(group).toMatchObject({
      n: 3,
      askRules: { k: 2, n: 3 },
      askLearned: { k: 1, n: 3 },
      top1Rules: { k: 1, n: 2 },
      top1Learned: { k: 2, n: 2 },
    });
  });
});

describe('The week of a suggestion', () => {
  it('is the ISO week in Korea', () => {
    expect(koreaWeek(new Date('2026-10-28T05:00:00Z'))).toBe('2026-W44');
    expect(koreaWeek(new Date('2026-10-25T15:30:00Z'))).toBe('2026-W44');
    expect(koreaWeek(new Date('2026-10-25T14:30:00Z'))).toBe('2026-W43');
    expect(koreaWeek(new Date('2027-01-01T05:00:00Z'))).toBe('2026-W53');
  });
});

const SHOWN = new Date('2026-10-28T03:00:00Z');

function impression(
  outcome: Impression['outcome'],
  minutes: number | null,
  more: Partial<Impression> = {},
): Impression {
  const outcomeAt = minutes === null ? null : new Date(SHOWN.getTime() + minutes * MINUTE_MS);
  return {
    template: 'lunch_with_free_friend',
    propensity: 0.9,
    holdback: false,
    shownAt: SHOWN,
    outcome,
    outcomeAt,
    ...more,
  };
}

const impressions = [
  impression('accepted', 1),
  impression('confirmed', 5),
  impression('confirmed', 20, { propensity: 0.025 }),
  impression('dismissed', 2),
  impression('shown', null),
  impression('shown', null, { holdback: true }),
  impression('accepted', 1, { template: 'route_to_next_class', shownAt: new Date('2026-11-02T03:00:00Z') }),
];

describe("The suggestions' rates", () => {
  it('count per week, template and arm, a late outcome as ignored', () => {
    const cells = suggestionCells(impressions);

    expect(cells.map(({ week, template, holdback, shown }) => [week, template, holdback, shown])).toEqual([
      ['2026-W44', 'lunch_with_free_friend', true, 1],
      ['2026-W44', 'lunch_with_free_friend', false, 5],
      ['2026-W45', 'route_to_next_class', false, 1],
    ]);
    expect(cells[1]).toMatchObject({
      acceptance: { k: 3, n: 5 },
      confirmedWithin10Minutes: { k: 1, n: 5 },
      dismissal: { k: 1, n: 5 },
      ignored: { k: 2, n: 5 },
    });
  });

  it('weigh each impression by the inverse of its propensity', () => {
    const [, learning] = weightedAcceptance(impressions);
    const weights = 4 / 0.9 + 1 / 0.025;

    expect(learning).toMatchObject({ template: 'lunch_with_free_friend', holdback: false, shown: 5 });
    expect(learning?.acceptance).toBeCloseTo((2 / 0.9 + 1 / 0.025) / weights, 10);
  });
});
