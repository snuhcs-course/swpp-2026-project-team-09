/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, type ReplyStep } from '../src/assistant/dto/answer.dto.js';
import {
  answerStep,
  chainedInput,
  inTimeOrder,
  refusedBookingStep,
  stepBefore,
} from '../src/assistant/steps/plan-steps.js';

// The order of a message's steps and the step a meal sets out from (P03), on a made-up Tuesday.

const DATE = '2087-01-07';
const KWANJEONG = { placeId: 'kwanjeong', label: '62-1동', latitude: 37.4596, longitude: 126.9497 };
const ASKER = 'asker';

const dinner = (constraints: MealInput['people'][number]['constraints'] = []): MealInput => ({
  kind: 'meal',
  date: DATE,
  meal: 'dinner',
  people: [{ userId: ASKER, constraints }],
  window: { from: '19:00', until: null },
  placeId: null,
});

const stepAt = (start: string | null, end: string | null, date = DATE, title = '7층 7A 열람실 2 구역'): ReplyStep => ({
  kind: 'seat',
  title,
  place: KWANJEONG,
  from: null,
  startAt: start === null ? null : `${date}T${start}:00+09:00`,
  endAt: end === null ? null : `${date}T${end}:00+09:00`,
  status: 'shown',
  reason: null,
  shows: null,
});

describe('The steps of one message', () => {
  it('come in time order, a step without a time last', () => {
    const late = stepAt('19:00', null, DATE, 'b');
    const untimed = stepAt(null, null, DATE, 'c');
    const early = stepAt('16:00', '19:00', DATE, 'a');

    expect(inTimeOrder([late, untimed, early]).map(({ title }) => title)).toEqual(['a', 'b', 'c']);
  });

  it('give a meal the latest step on its day that starts before it', () => {
    const morning = stepAt('09:30', '12:00', DATE, 'morning');
    const afternoon = stepAt('16:00', '19:00', DATE, 'afternoon');
    const after = stepAt('20:00', '22:00', DATE, 'after');
    const otherDay = stepAt('17:00', '18:30', '2087-01-06', 'other day');

    expect(stepBefore([morning, after, otherDay, afternoon], dinner())?.title).toBe('afternoon');
    expect(stepBefore([after, otherDay], dinner())).toBeNull();
  });

  it("set the meal's start at the step's place, free from when it ends", () => {
    expect(chainedInput(dinner(), stepAt('16:00', '19:00'))?.people[0]?.constraints).toEqual([
      { kind: 'from', placeId: 'kwanjeong', source: 'asker' },
      { kind: 'notBefore', time: '19:00', source: 'asker' },
    ]);
  });

  it('leave a start the User set as it is', () => {
    const own = dinner([{ kind: 'from', placeId: '301', source: 'asker' }]);

    expect(chainedInput(own, stepAt('16:00', '19:00'))).toBeNull();
  });

  it('keep a refused booking with its time and every reason', () => {
    const space = { floor: 7, name: '7A 열람실 2 구역', unit: 'seat' as const };

    expect(
      refusedBookingStep(space, { date: DATE, start: '16:00', minutes: 180 }, ['좌석은 당일만 예약할 수 있어요']),
    ).toEqual({
      kind: 'seat',
      title: '7층 7A 열람실 2 구역',
      place: null,
      from: null,
      startAt: `${DATE}T16:00:00+09:00`,
      endAt: `${DATE}T19:00:00+09:00`,
      status: 'not-done',
      reason: '좌석은 당일만 예약할 수 있어요',
      shows: null,
    });
  });
});

// An answer of these conditions that found no plan.
const none = (input: AnswerReply['input']): AnswerReply => ({
  input,
  chips: [],
  plans: [],
  dropped: [],
  noPlan: { reason: 'no-fit', lines: [[{ text: '그 시간에는 비는 시간이 없어요', strong: false }]] },
});

describe('A plan that found nothing', () => {
  it('is named by its meal or its kind, with its lines as the reason', () => {
    expect(answerStep(none(dinner()))).toMatchObject({
      title: '저녁',
      startAt: `${DATE}T19:00:00+09:00`,
      status: 'not-done',
      reason: '그 시간에는 비는 시간이 없어요',
    });
    expect(answerStep(none({ kind: 'events', date: DATE, eventIds: null })).title).toBe('행사');
  });
});
