/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { liveStepsOf, shownStepsOf, stepLine } from '@/features/assistant/steps-scene';
import type { ChatBubble } from '@/features/assistant/use-chat';

// The steps of several requests as they stand now (P10 ticket 29): they outlast the app's own bubbles, a booking's done
// message or a card it adds, and end with a new turn; the answer's step follows the Plan on screen once it is not the
// reply's first, and the booking's step the time its card holds.

const KWANJEONG = { placeId: 'p62-1', label: '62-1동', latitude: 37.45903, longitude: 126.95247 };

const SEAT: ReplyStep = {
  kind: 'seat',
  title: '7층 7A 열람실 2 구역',
  place: KWANJEONG,
  from: null,
  startAt: '2026-11-17T11:00:00+09:00',
  endAt: '2026-11-17T12:00:00+09:00',
  status: 'shown',
  reason: null,
  shows: { kind: 'card', key: 'book:7F-7A-zone2:2026-11-17:1100:60' },
};

const [FIRST, SECOND] = MEAL_ANSWER.plans;
if (FIRST === undefined || SECOND === undefined) {
  throw new Error('The meal answer has fewer than two Plans');
}

// The meal's step as the main server makes it of the reply's first Plan (`answerStep`).
const MEAL: ReplyStep = {
  kind: 'meal',
  title: FIRST.title,
  place: FIRST.place,
  from: KWANJEONG,
  startAt: FIRST.startAt,
  endAt: FIRST.endAt,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer' },
};

const base = { cards: [], mapButtons: [], proposal: null, failure: null };
const asked: ChatBubble = { ...base, id: 1, role: 'user', text: '관정 갔다가 점심' };
const reply: ChatBubble = { ...base, id: 2, role: 'assistant', text: '', answer: MEAL_ANSWER, steps: [SEAT, MEAL] };
const own = (id: number, text: string): ChatBubble => ({ ...base, id, role: 'assistant', text, own: true });

// Partitions: the reply alone, followed by the app's own bubbles, and a new turn after it.
describe('the steps of the turn on screen', () => {
  it('outlast the app’s own bubbles after the reply: a done message, 예약 안 함, a card it adds', () => {
    const steps = { bubbleId: 2, steps: [SEAT, MEAL] };

    expect(shownStepsOf([asked, reply])).toEqual(steps);
    expect(shownStepsOf([asked, reply, own(3, '✓ 예약했어요')])).toEqual(steps);
    expect(shownStepsOf([asked, reply, own(3, '예약하지 않았어요'), own(4, '좌석 현황이에요.')])).toEqual(steps);
  });

  it('end with a new turn, and with another reply in the turn', () => {
    const next: ChatBubble = { ...base, id: 3, role: 'user', text: '고마워' };
    const words: ChatBubble = { ...base, id: 4, role: 'assistant', text: '네' };

    expect(shownStepsOf([asked, reply, next, words])).toBeNull();
    expect(shownStepsOf([asked, reply, words])).toBeNull();
  });
});

const shown = { bubbleId: 2, steps: [SEAT, MEAL] };
const asSent = { reply: MEAL_ANSWER, answer: MEAL_ANSWER, plan: FIRST, index: 0 };

// Partitions: the Plan sent, another Plan on screen, an answer with no Plan; the card's time kept, and changed.
describe('the steps as they stand now', () => {
  it('are the reply’s while its first Plan is on screen and the card holds the time sent', () => {
    const slot = { date: '2026-11-17', start: '11:00', minutes: 60 };

    expect(
      liveStepsOf(shown, { ...asSent, card: { key: SEAT.shows?.kind === 'card' ? SEAT.shows.key : '', slot } }),
    ).toEqual(shown);
  });

  it('draw the answer’s step at the Plan on screen: another candidate, or a recalculated answer', () => {
    const [, meal] = liveStepsOf(shown, { ...asSent, plan: SECOND, index: 1, card: null }).steps;

    expect(meal).toMatchObject({
      title: SECOND.title,
      place: SECOND.place,
      startAt: SECOND.startAt,
      endAt: SECOND.endAt,
      status: 'shown',
    });
  });

  it('say the answer’s step was not done once the answer on screen has no Plan, with its reasons', () => {
    const noPlan = {
      ...MEAL_ANSWER,
      plans: [],
      noPlan: { reason: 'no-fit' as const, lines: [[{ text: '같이 빈 시간이 없어요', strong: false }]] },
    };
    const [, meal] = liveStepsOf(shown, { reply: MEAL_ANSWER, answer: noPlan, plan: null, index: 0, card: null }).steps;

    expect(meal).toMatchObject({ status: 'not-done', place: null, reason: '같이 빈 시간이 없어요' });
  });

  it('draw the booking’s step at the time its card holds', () => {
    const key = SEAT.shows?.kind === 'card' ? SEAT.shows.key : '';
    const card = { key, slot: { date: '2026-11-17', start: '10:30', minutes: 90 } };
    const [seat] = liveStepsOf(shown, { ...asSent, card }).steps;

    expect(seat).toMatchObject({ startAt: '2026-11-17T10:30:00+09:00', endAt: '2026-11-17T12:00:00+09:00' });
  });
});

// Partitions: a booking's step booked, and not. Expected values: the lone booking's "예약됨" (P01 ticket 03).
describe('a step’s flag line', () => {
  it('says a booked seat as booked', () => {
    const at = new Date('2026-11-17T01:00:00.000Z');

    expect(stepLine(SEAT, '7193', at, true)).toBe('7193번 11:00–12:00 · 예약됨');
    expect(stepLine(SEAT, '7193', at)).toBe('7193번 11:00–12:00');
  });
});
