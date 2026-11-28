/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { recalculatedWords } from '@/features/assistant/recalculated-words';
import { objectParticle } from '@/features/map/short-name';
import { koreaClock } from '@/korea-time';

// The words over an answer once it is recalculated, for every kind (P04 ticket 97). The user's phone on 2026-11-28: a
// meal answer whose bar he moved read "302동식당 · 11:30 · 걸음 4분 · 목살김치찌개 외 5 · 6,500원", the list's row
// again, in place of a sentence. The stored answer for the User alone: its first pick 301동식당 at 11:50, its second
// another Restaurant.

const [FIRST, SECOND] = MEAL_ANSWER_ALONE.plans;
if (FIRST === undefined || SECOND === undefined) {
  throw new Error('The stored answer has fewer than two Plans');
}
const SAID = `${FIRST.place.label}을 추천해요.`;
const shown = (answer: AnswerReply): { answer: AnswerReply; source: AnswerReply } => ({
  answer,
  source: MEAL_ANSWER_ALONE,
});
const recalculatedTo = (plans: AnswerReply['plans']): AnswerReply => ({ ...MEAL_ANSWER_ALONE, plans });
const at = (startAt: string): AnswerReply['plans'][number] => ({ ...FIRST, startAt });

// Partitions: not recalculated; recalculated with the same first place; with another first place the sentence names;
// with a sentence that names none; with the first's time moved, named or not; no words at all; no Plan.
describe('The words of a recalculated answer', () => {
  it('are the reply’s sentence while the answer is the reply’s', () => {
    expect(recalculatedWords(SAID, { answer: MEAL_ANSWER_ALONE, source: MEAL_ANSWER_ALONE })).toBe(SAID);
  });

  it('stay the reply’s sentence when the recalculated answer keeps its first place', () => {
    expect(recalculatedWords(SAID, shown(recalculatedTo([FIRST, SECOND])))).toBe(SAID);
  });

  it('are one plain sentence of the new first place, with its time, when the reply’s sentence names another', () => {
    const place = SECOND.place.label;

    // It starts at another time than the reply's first did, so the sentence says when.
    expect(recalculatedWords(SAID, shown(recalculatedTo([SECOND, FIRST])))).toBe(
      `${koreaClock(SECOND.startAt)}에 ${place}${objectParticle(place)} 추천해요.`,
    );
    expect(recalculatedWords(SAID, shown(recalculatedTo([SECOND, FIRST])))).not.toContain(' · ');
  });

  it('stay a sentence that names no place', () => {
    expect(recalculatedWords('점심을 짰어요.', shown(recalculatedTo([SECOND, FIRST])))).toBe('점심을 짰어요.');
  });

  it('say the new time when the first moved and the sentence named the old one', () => {
    const moved = recalculatedTo([at('2026-10-07T12:30:00+09:00')]);

    expect(recalculatedWords(`11:50에 ${SAID}`, shown(moved))).toBe(`12:30에 ${SAID}`);
    expect(recalculatedWords(SAID, shown(moved))).toBe(SAID);
  });

  it('are the plain sentence of the first place without the model’s words', () => {
    expect(recalculatedWords('', { answer: MEAL_ANSWER_ALONE, source: MEAL_ANSWER_ALONE })).toBe(SAID);
  });

  it('are the reply’s sentence for an answer with no Plan', () => {
    expect(recalculatedWords('없어요.', shown(recalculatedTo([])))).toBe('없어요.');
  });
});
