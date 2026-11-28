/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LeftOutClass, Plan } from '@/api/assistant-types';
import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { QUESTS } from '@/api/mock/data/quests';
import type { ShownBooking } from '@/features/assistant/booking-scene';
import { type CardRoom, cardPlace, type ChatBubble } from '@/features/assistant/use-chat';
import { timeCardSkips } from '@/screens/main/answer/time-card-skips';

// Whether the folded time card on top makes room for the line of Classes left out (P01 ticket 40): only when a band on
// top draws one. The mocks' day, 2026-10-01: the Class 자료구조 at 301동 from 14:00 to 15:15 (Sub Quest `c1`), and a
// seat booked from 14:30 for an hour, which runs into it.

const KEY = 'book:7F-7A-zone2:2026-10-01:1430:60';
const SEAT = libraryCard(KEY, 'book', {
  space: READING_ROOM,
  date: '2026-10-01',
  start: '14:30',
  minutes: 60,
  notes: SEAT_NOTES,
});
const BOOKING: ShownBooking = {
  bubbleId: 2,
  place: cardPlace(2, KEY),
  card: SEAT,
  space: READING_ROOM,
  point: { placeId: 'p62-1', label: '중앙도서관 관정관', latitude: 37.45903, longitude: 126.95247 },
  booked: false,
};

function chatLeaving(skipped: LeftOutClass[]): Parameters<typeof timeCardSkips>[1] {
  const reply: ChatBubble = {
    id: 2,
    role: 'assistant',
    text: '',
    cards: [],
    mapButtons: [],
    proposal: null,
    failure: null,
    skipped,
  };
  return {
    bubbles: [reply],
    rooms: new Map(),
    showRoom: jest.fn<void, [string, CardRoom | null]>(),
    outcomes: new Map(),
  };
}

const CLASS = { date: '2026-10-01', classId: 'c1' };
const NO_CLASS = { date: '2026-10-01', classId: 'not-a-class-of-the-day' };

function planLeaving(): Plan {
  const [plan] = MEAL_ANSWER.plans;
  if (plan === undefined) {
    throw new Error('MEAL_ANSWER has no Plan');
  }
  const skipped = [
    { id: 'c1', startAt: '2026-10-01T14:00:00+09:00', endAt: '2026-10-01T15:15:00+09:00', label: '301동 수업' },
  ];
  return { ...plan, band: { ...plan.band, skipped } };
}

// Partitions: the booking's bar with a Class of its day left out, with an id that is no Class of that day, under the
// steps' bar, booked; a Plan's band with one; nothing left out. Expected values: a line only where a band on top draws one.
describe('The time card on top', () => {
  it("makes room for the line when the booking's bar leaves a Class of its day out", () => {
    expect(timeCardSkips({ plan: null, booking: BOOKING, steps: false }, chatLeaving([CLASS]), QUESTS)).toBe(true);
  });

  it('makes no room for an id that is no Class of the booking’s day, which the bar does not draw', () => {
    expect(timeCardSkips({ plan: null, booking: BOOKING, steps: false }, chatLeaving([NO_CLASS]), QUESTS)).toBe(false);
  });

  it('makes no room for the booking while several requests’ bar stands on top in its place', () => {
    expect(timeCardSkips({ plan: null, booking: BOOKING, steps: true }, chatLeaving([CLASS]), QUESTS)).toBe(false);
  });

  it('makes no room once the seat is booked, when the booking has no bar', () => {
    const booked = { ...BOOKING, booked: true };

    expect(timeCardSkips({ plan: null, booking: booked, steps: false }, chatLeaving([CLASS]), QUESTS)).toBe(false);
  });

  it("makes room for the line of a Plan's band", () => {
    expect(timeCardSkips({ plan: planLeaving(), booking: null, steps: false }, chatLeaving([]), QUESTS)).toBe(true);
  });

  it('makes no room with nothing left out', () => {
    expect(timeCardSkips({ plan: null, booking: BOOKING, steps: false }, chatLeaving([]), QUESTS)).toBe(false);
  });
});
