/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { chosenOnReply, mayChooseStep, stepIdOf } from '@/features/assistant/step-choice';

// Which step of several is chosen (P03 ticket 21), by the rules the user decided on 2026-11-28: on the first reply the
// step due first, or the step of a plan chosen in words; on a later one the first step whose answer the reply drew, else
// the step chosen before while it is there, else the step due first; and no change while Friends are being picked.

const NOW = new Date('2026-11-28T09:00:00+09:00');

const stepOf = (key: string, start: string, end: string): ReplyStep => ({
  kind: 'meal',
  title: key,
  place: null,
  from: null,
  startAt: `2026-11-28T${start}:00+09:00`,
  endAt: `2026-11-28T${end}:00+09:00`,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

const SEAT: ReplyStep = {
  ...stepOf('', '07:00', '08:00'),
  kind: 'seat',
  title: '7층',
  shows: { kind: 'card', key: 'book' },
};
const LUNCH = stepOf('lunch', '12:00', '13:00');
const DINNER = stepOf('dinner', '18:00', '19:00');
const STEPS = [SEAT, LUNCH, DINNER];

const answer = (key: string): AnswerReply => ({ ...MEAL_ANSWER, key });

// Partitions: first reply with and without `select.key`; later reply that drew an answer, that drew none with the step
// before still there or gone; picking open or not.
describe('The step chosen as a reply arrives', () => {
  it('is the step due first on the first reply, the seat over by 09:00 left behind', () => {
    expect(chosenOnReply(STEPS, {}, null, NOW)).toBe(1);
  });

  it('is the step of a plan chosen in words, on the first reply or a later one', () => {
    expect(chosenOnReply(STEPS, { selectKey: 'dinner' }, null, NOW)).toBe(2);
    expect(chosenOnReply(STEPS, { selectKey: 'dinner', answers: [answer('lunch')] }, stepIdOf(LUNCH), NOW)).toBe(2);
  });

  it('is on a later reply the first step in their order whose answer the reply drew', () => {
    expect(chosenOnReply(STEPS, { answers: [answer('dinner')] }, stepIdOf(LUNCH), NOW)).toBe(2);
  });

  it('is on a later reply that drew none the step chosen before, else the step due first', () => {
    expect(chosenOnReply(STEPS, { answers: [] }, stepIdOf(DINNER), NOW)).toBe(2);
    expect(chosenOnReply([SEAT, LUNCH], { answers: [] }, stepIdOf(DINNER), NOW)).toBe(1);
  });
});

describe('A step chosen by a press', () => {
  it('is refused while Friends are being picked', () => {
    expect(mayChooseStep({ adding: true })).toBe(false);
    expect(mayChooseStep({ adding: false })).toBe(true);
  });
});
