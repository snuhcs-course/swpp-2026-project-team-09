/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { expectSchema } from '../eval/expect.ts';
import { scoreTurn } from '../eval/score.ts';
import { call, expectOf, turn } from './eval-traces.ts';

// What the 공강 tools add to a case's `expect` (P04 ticket 03), on hand-made traces. No app, no model.

describe('Restaurant cards', () => {
  const key = '학생회관식당';
  const restaurants = (seed: string): string | undefined => (seed === key ? seed : undefined);
  const trace = turn({
    steps: [[call('showRestaurants', { keys: [key] }, { result: 'shown' })]],
    text: '찾았어요',
    cards: [{ kind: 'restaurant', restaurant: { key, name: key } }],
  });

  it('are checked by seed and by count, like the other kinds', () => {
    const written = { actions: ['TOOL'], cards: [{ kind: 'restaurant', seeds: [key], max: 1 }] };

    expect(scoreTurn(trace, expectOf(written), restaurants).passed).toBe(true);
  });

  it('fail on one that is not shown', () => {
    const written = { actions: ['TOOL'], cards: [{ kind: 'restaurant', seeds: ['301동식당'] }] };

    expect(scoreTurn(trace, expectOf(written), restaurants).passed).toBe(false);
  });
});

const RESULTS = {
  findFreeTimeEvents: {
    args: { date: '2026-11-02', from: '멀티코어컴퓨팅 (월)', to: '현대암호학개론 (월)' },
    result: 'found',
    gaps: [{ start: '12:15', end: '14:00', before: '멀티코어컴퓨팅', after: '현대암호학개론' }],
    candidates: [
      {
        kind: 'quest',
        seed: '농구 파티',
        start: '13:00',
        end: null,
        travel: { mode: 'shuttle', minutes: 27 },
        leaveBy: '13:32',
        endUnknown: true,
      },
    ],
  },
  findFreeFriends: {
    args: { date: '2026-11-02', meal: 'lunch' },
    result: 'found',
    freeTime: [{ start: '12:15', end: '14:00' }],
    friends: [{ seed: '이민수', overlap: [{ start: '12:15', end: '14:00' }] }],
  },
  findMealRestaurants: {
    args: { date: '2026-11-02', meal: 'lunch', friends: ['이민수'] },
    result: 'none',
    why: 'no-menu',
  },
  getMyDay: {
    args: { date: '2026-11-05' },
    result: 'found',
    items: [{ seed: '논리설계 (목)', start: '09:30', end: '10:45' }],
  },
};

describe('What a tool must answer', () => {
  it('holds what each 공강 tool must answer', () => {
    expect(expectSchema.safeParse({ actions: ['TOOL'], results: RESULTS }).success).toBe(true);
  });

  it('holds what a tool needs in place of its results', () => {
    const results = {
      findFreeTimeEvents: {
        args: { date: '2026-11-05' },
        result: 'needs',
        needs: { side: 'before', item: '논리설계' },
      },
    };

    expect(expectSchema.safeParse({ actions: ['TOOL'], results }).success).toBe(true);
  });

  it.each([
    { getMenus: { result: 'found' } },
    { findFreeTimeEvents: { result: 'found', args: {}, gaps: [{ start: '12:15' }] } },
  ])('is refused when it is %j', (results) => {
    expect(expectSchema.safeParse({ actions: ['TOOL'], results }).success).toBe(false);
  });
});
