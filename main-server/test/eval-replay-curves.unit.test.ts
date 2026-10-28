/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { curveGroup, type EventRow, labelledRows } from '../eval/replay/curve-metrics.ts';
import { type StageAnswer } from '../eval/replay/stages.ts';
import {
  type Impression,
  koreaWeek,
  needCells,
  openingsOf,
  sliceOf,
  suggestionCells,
  weightedAcceptance,
} from '../eval/replay/suggestion-metrics.ts';

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
    eligible: ['lunch_with_free_friend'],
    propensity: 0.9,
    holdback: false,
    shownAt: SHOWN,
    outcome,
    outcomeAt,
    typedTemplate: null,
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
  impression('accepted', 1, {
    template: 'route_to_next_class',
    eligible: ['route_to_next_class'],
    shownAt: new Date('2026-11-02T03:00:00Z'),
  }),
  // Nothing shown: the lunch was eligible, and the User then asked the chat for it.
  impression('silent', null, { template: null, propensity: null, typedTemplate: 'lunch_with_free_friend' }),
  impression('silent', null, { template: null, propensity: null, eligible: [] }),
];

describe("The suggestions' rates", () => {
  it('count the shown rows per week, template and arm, a late outcome as ignored', () => {
    const cells = suggestionCells(impressions);

    expect(cells.map(({ slice, week, template, holdback, shown }) => [slice, week, template, holdback, shown])).toEqual(
      [
        ['all', '2026-W44', 'lunch_with_free_friend', true, 1],
        ['all', '2026-W44', 'lunch_with_free_friend', false, 5],
        ['all', '2026-W45', 'route_to_next_class', false, 1],
      ],
    );
    expect(cells[1]).toMatchObject({
      acceptance: { k: 3, n: 5 },
      confirmedWithin10Minutes: { k: 1, n: 5 },
      dismissal: { k: 1, n: 5 },
      ignored: { k: 2, n: 5 },
    });
  });

  it('weigh each shown row by the inverse of its propensity', () => {
    const [, learning] = weightedAcceptance(impressions);
    const weights = 4 / 0.9 + 1 / 0.025;

    expect(learning).toMatchObject({ template: 'lunch_with_free_friend', holdback: false, shown: 5 });
    expect(learning?.acceptance).toBeCloseTo((2 / 0.9 + 1 / 0.025) / weights, 10);
  });
});

describe("The suggestions' needs and slices", () => {
  it('count missed needs and false alarms per template and arm, over the rows where it could have shown', () => {
    const cells = needCells(impressions);

    expect(cells.map(({ slice, template, holdback }) => [slice, template, holdback])).toEqual([
      ['all', 'lunch_with_free_friend', true],
      ['all', 'lunch_with_free_friend', false],
      ['all', 'route_to_next_class', false],
    ]);
    expect(cells[1]).toMatchObject({
      shown: 5,
      accepted: { k: 3, n: 5 },
      falseAlarm: { k: 2, n: 5 },
      eligibleNotShown: 1,
      missedNeed: { k: 1, n: 1 },
      recall: { k: 3, n: 4 },
      typedWhatWasShown: 0,
    });
    expect(openingsOf(impressions)).toEqual([{ slice: 'all', openings: 9, silent: 2, silentThenTyped: 1 }]);
  });

  it('split the rows at --final-from into the tuning and the final slice', () => {
    const finalFrom = new Date('2026-11-01T15:00:00Z');

    expect(sliceOf(new Date('2026-11-01T14:59:59Z'), finalFrom)).toBe('tuning');
    expect(sliceOf(finalFrom, finalFrom)).toBe('final');
    expect(sliceOf(finalFrom, null)).toBe('all');
    expect(suggestionCells(impressions, finalFrom).map(({ slice, template }) => [slice, template])).toEqual([
      ['final', 'route_to_next_class'],
      ['tuning', 'lunch_with_free_friend'],
      ['tuning', 'lunch_with_free_friend'],
    ]);
    expect(openingsOf(impressions, finalFrom).map(({ slice, openings }) => [slice, openings])).toEqual([
      ['final', 1],
      ['tuning', 8],
    ]);
  });
});
