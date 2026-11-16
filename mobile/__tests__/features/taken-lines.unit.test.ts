/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { goingTo, isMealAlone, takenLines } from '@/features/assistant/taken-lines';

// Partitions of the card after "여기로" (P05-14): a walk on of 5 minutes or more still to come (kept), one shorter
// (none), nothing next today, a time to leave already passed; eating where the User is, or walking there; 으로 or 로.
// Expected values: boards s4b and s4 and the design's rule that a walk alone gets a leave-by only for 5 minutes or more.

const korea = (clock: string): Date => new Date(`2026-11-17T${clock}:00+09:00`);
const [THERE, WALK] = MEAL_ANSWER_ALONE.plans;

function plan(base: Plan | undefined, part: Partial<Plan['parts'][number]>): Plan {
  if (base === undefined) {
    throw new Error('The stored answer has two Plans');
  }
  return { ...base, parts: base.parts.map((one) => (one.me ? { ...one, ...part } : one)) };
}

const text = (answer: AnswerReply, one: Plan, at: Date): string[] =>
  takenLines(answer, one, at).map((line) => line.map(({ text: words }) => words).join(''));

describe('takenLines', () => {
  it('keeps a leave-by for a walk on of 15 minutes, still to come (s4b)', () => {
    expect(text(MEAL_ANSWER_ALONE, plan(THERE, {}), korea('11:50'))).toEqual([
      '301동식당에서 먹어요',
      '12:45에 나설 시각을 알려 드릴게요',
    ]);
  });

  it('keeps none for a walk on of 1 minute (s4)', () => {
    expect(text(MEAL_ANSWER_ALONE, plan(WALK, {}), korea('11:50'))).toEqual([
      '학생회관식당으로 가요',
      '수업까지 1분이라 나설 알림은 없어요',
    ]);
  });

  it('says nothing follows today, and that the time to leave has passed', () => {
    expect(text(MEAL_ANSWER_ALONE, plan(THERE, { next: null, leaveBy: null }), korea('11:50'))[1]).toBe(
      '오늘은 다음 일정이 없어 나설 알림은 없어요',
    );
    expect(text(MEAL_ANSWER_ALONE, plan(THERE, {}), korea('12:50'))[1]).toBe('12:45엔 나서야 해요');
  });

  it('says 로 after a vowel or ㄹ, and 으로 after any other final consonant', () => {
    expect(goingTo('라운지').map(({ text: words }) => words)).toEqual(['라운지', '로 가요']);
    expect(goingTo('아워홈 감골').map(({ text: words }) => words)).toEqual(['아워홈 감골', '로 가요']);
    expect(goingTo('자하연식당').map(({ text: words }) => words)).toEqual(['자하연식당', '으로 가요']);
    expect(goingTo('동원관').map(({ text: words }) => words)).toEqual(['동원관', '으로 가요']);
    expect(goingTo('3식당 2층').map(({ text: words }) => words)).toEqual(['3식당 2층', '으로 가요']);
  });

  it('is for a meal of the User alone only', () => {
    expect(isMealAlone(MEAL_ANSWER_ALONE)).toBe(true);
    expect(isMealAlone(null)).toBe(false);
  });
});
