/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { cardsOf, normaliseArgs, outcomeOf, roleOf } from '../eval/normalise.ts';
import { normaliseResult } from '../eval/normalise-result.ts';
import { call, FRIEND, names, OTHER_FRIEND, PLACE, QUEST } from './eval-traces.ts';

// The normalisers of the 공강 tools (P04 ticket 03): their arguments, what they answer and the Restaurant cards, read
// one way. The tools do not exist yet, so these are the spec's shapes. No app, no model.

const restaurants = (key: string): string | undefined => (key === '학생회관식당' ? key : undefined);

describe('The arguments of the 공강 tools', () => {
  const CLASS = '0b0e3f5e-0000-4000-8000-000000000006';
  const items = (id: string): string | undefined => (id === CLASS ? '멀티코어컴퓨팅 (월)' : names(id));

  it('read an item id as its seed, a clock time as HH:MM, and now and end as they are', () => {
    const args = { date: '2026-11-02T00:00:00+09:00', from: CLASS, to: '14:00:00', board: '취미' };

    expect(normaliseArgs('findFreeTimeEvents', args, items)).toEqual({
      date: '2026-11-02',
      from: '멀티코어컴퓨팅 (월)',
      to: '14:00',
      board: 'hobby',
    });
    expect(normaliseArgs('findFreeTimeEvents', { from: 'now', to: 'end' }, items)).toEqual({ from: 'now', to: 'end' });
    expect(normaliseArgs('findFreeTimeEvents', { from: '2026-11-02T05:00:00Z' }, items)).toEqual({ from: '14:00' });
  });

  it('read a departure Place by seed and a leave-by time as HH:MM', () => {
    expect(normaliseArgs('findMealRestaurants', { departurePlace: PLACE, leaveBy: '16:30' }, names)).toEqual({
      departurePlace: '학생회관',
      leaveBy: '16:30',
    });
  });
});

describe('The arguments of the meal tools', () => {
  it('read Friends by seed as a set and a window as two clock times', () => {
    const args = { date: '2026-11-02', meal: 'lunch', friendIds: [OTHER_FRIEND, FRIEND] };

    expect(normaliseArgs('findFreeFriends', args, names)).toEqual({
      date: '2026-11-02',
      meal: 'lunch',
      friends: ['김민수', '이민수'],
    });
    expect(normaliseArgs('findMealRestaurants', { window: { from: '12:00:00', to: '13:00' } }, names)).toEqual({
      window: { from: '12:00', to: '13:00' },
    });
  });

  it("read showRestaurants' keys as the seeds they are", () => {
    expect(normaliseArgs('showRestaurants', { keys: ['학생회관식당', '301동식당'] }, names)).toEqual({
      keys: ['301동식당', '학생회관식당'],
    });
  });

  it('give each tool its role', () => {
    const lookups = ['getMyDay', 'findFreeTimeEvents', 'findFreeFriends', 'findMealRestaurants'];

    expect(lookups.filter((tool) => roleOf(tool) !== 'lookup')).toEqual([]);
    expect(roleOf('showRestaurants')).toBe('presenter');
  });
});

describe('A tool that needs an answer', () => {
  it('reads as needs, whichever way the result says it', () => {
    const needs = { side: 'before', item: '논리설계' };

    expect(outcomeOf(call('findFreeTimeEvents', {}, { result: 'needs', needs }))).toBe('needs');
    expect(outcomeOf(call('findMealRestaurants', {}, { needs }))).toBe('needs');
  });
});

describe("A 공강 tool's result, as the labels write it", () => {
  it('reads a gap and its candidates by seed, times as HH:MM, without their words', () => {
    const answer = {
      result: 'found',
      gaps: [
        {
          start: '2026-11-02T12:15:00+09:00',
          end: '2026-11-02T05:00:00.000Z',
          before: '멀티코어컴퓨팅',
          after: '현대암호학개론',
        },
      ],
      candidates: [
        {
          kind: 'quest',
          id: QUEST,
          title: '<data label="quest.title">농구 파티</data>',
          start: '2026-11-02T13:00:00+09:00',
          end: null,
          travel: { mode: 'shuttle', minutes: 27 },
          leaveBy: '13:32',
          endUnknown: true,
        },
      ],
    };

    expect(normaliseResult(answer, names)).toEqual({
      result: 'found',
      gaps: [{ start: '12:15', end: '14:00', before: '멀티코어컴퓨팅', after: '현대암호학개론' }],
      candidates: [
        {
          seed: '농구 파티',
          kind: 'quest',
          start: '13:00',
          end: null,
          travel: { mode: 'shuttle', minutes: 27 },
          leaveBy: '13:32',
          endUnknown: true,
        },
      ],
    });
  });
});

describe("The meal tools' results, as the labels write them", () => {
  it('read free Friends by seed, with their department and name left out', () => {
    const answer = {
      result: 'found',
      freeTime: [{ start: '12:15', end: '14:00' }],
      friends: [
        {
          id: FRIEND,
          name: '<data label="friend.name">이민수</data>',
          department: '경제학부',
          overlap: [{ start: '12:15', end: '14:00' }],
        },
      ],
    };

    expect(normaliseResult(answer, names)).toEqual({
      result: 'found',
      freeTime: [{ start: '12:15', end: '14:00' }],
      friends: [{ seed: '이민수', overlap: [{ start: '12:15', end: '14:00' }] }],
    });
  });
});

describe("A Restaurant in a tool's result, as the labels write it", () => {
  it('is read by its key, and each person by name', () => {
    const answer = {
      result: 'found',
      collectedAt: '2026-11-02T07:00:00+09:00',
      shared: [{ start: '12:15', end: '12:55' }],
      restaurants: [
        {
          key: '학생회관식당',
          name: '학생회관식당',
          place: { id: PLACE, name: '학생회관' },
          lines: ['<data label="menu.line">제육볶음</data>'],
          start: '2026-11-02T12:35:00+09:00',
          eatingMinutes: 16,
          people: [
            { name: '나', mode: 'shuttle', minutes: 16, longest: true },
            { name: '<data label="friend.name">이민수</data>', mode: null, minutes: null, longest: false },
          ],
        },
      ],
    };

    expect(normaliseResult(answer, restaurants)).toEqual({
      result: 'found',
      shared: [{ start: '12:15', end: '12:55' }],
      restaurants: [
        {
          seed: '학생회관식당',
          start: '12:35',
          eatingMinutes: 16,
          people: [
            { name: '나', mode: 'shuttle', minutes: 16, longest: true },
            { name: '이민수', mode: null, minutes: null, longest: false },
          ],
        },
      ],
    });
  });
});

describe('What a tool needs, as the labels write it', () => {
  it('is read by the name of the item, however it is given', () => {
    const named = { needs: { side: 'before', item: '논리설계' } };
    const withId = { result: 'needs', needs: { side: 'after', item: { id: 'x', name: '과외' } } };

    expect(normaliseResult(named, names)).toEqual(named);
    expect(normaliseResult(withId, names)).toEqual({ result: 'needs', needs: { side: 'after', item: '과외' } });
  });
});

describe("The reply's Restaurant cards", () => {
  it('are read by their key, which is the seed', () => {
    const cards = [{ kind: 'restaurant', restaurant: { key: '학생회관식당', name: '학생회관식당' } }];

    expect(cardsOf(cards, restaurants)).toEqual([{ kind: 'restaurant', name: '학생회관식당' }]);
  });
});
