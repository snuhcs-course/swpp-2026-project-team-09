/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { stepCardOf } from '@/screens/main/answer/answer-top-card';

// What the chosen step's top card is drawn from (P03 ticket 23): the card its own answer draws alone. A seat's step its
// card's booking while it stands; an answer step its answer, with a 관정관 a study answer opened; a step with neither,
// nothing, and the steps card keeps its strip.

const step = (
  kind: ReplyStep['kind'],
  shows: ReplyStep['shows'],
  status: ReplyStep['status'] = 'shown',
): ReplyStep => ({
  kind,
  title: kind,
  place: null,
  from: null,
  startAt: '2026-11-28T12:00:00+09:00',
  endAt: '2026-11-28T13:00:00+09:00',
  status,
  reason: null,
  shows,
});

const SEAT_CARD = { card: { key: 'seat-7' } };
const OTHER_CARD = { card: { key: 'seat-5' } };
const OPENED: { card: { key: string }; inPlan: true } = { card: { key: 'opened' }, inPlan: true };

// Partitions: a card step with its own card standing, another's, none; a room's; a step refused; an answer step with
// and without a key, done and not; with a 관정관 opened, with a seat's card standing.
describe("The chosen step's top card", () => {
  it("is a seat step's own booking card while it stands, and nothing otherwise", () => {
    const seat = step('seat', { kind: 'card', key: 'seat-7' });
    expect(stepCardOf(seat, SEAT_CARD)).toEqual({ kind: 'booking', booking: SEAT_CARD });
    expect(stepCardOf(seat, OTHER_CARD)).toBeNull();
    expect(stepCardOf(seat, null)).toBeNull();
    expect(stepCardOf(step('room', { kind: 'card', key: 'room-1' }), null)).toBeNull();
  });

  it('is nothing for a step refused, whose booking was not made', () => {
    expect(stepCardOf(step('seat', null, 'not-done'), SEAT_CARD)).toBeNull();
  });

  it("is an answer step's own answer, done or not, when the steps name their answers", () => {
    expect(stepCardOf(step('meal', { kind: 'answer', key: 'lunch' }), null)).toEqual({ kind: 'answer', opened: null });
    expect(stepCardOf(step('meal', { kind: 'answer', key: 'lunch' }, 'not-done'), null)).toEqual({
      kind: 'answer',
      opened: null,
    });
  });

  it("is, without keys, the reply's one answer for a step done and nothing for a step not done", () => {
    expect(stepCardOf(step('meal', { kind: 'answer' }), null)).toEqual({ kind: 'answer', opened: null });
    expect(stepCardOf(step('meal', { kind: 'answer' }, 'not-done'), null)).toBeNull();
  });

  it("brings a study answer's 관정관 opened, never another step's seat card", () => {
    const study = step('study', { kind: 'answer', key: 'study' });
    expect(stepCardOf(study, OPENED)).toEqual({ kind: 'answer', opened: OPENED });
    expect(stepCardOf(study, SEAT_CARD)).toEqual({ kind: 'answer', opened: null });
  });
});
