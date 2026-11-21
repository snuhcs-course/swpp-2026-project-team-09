/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// The meal the User already holds for that meal and day, which the plans set aside and making one replaces (P05 ticket
// 16, drawn as 바꾸기 and 그대로 두기). Optional: a main server before it sends none.

const SET = {
  questId: '6f0f8a50-6a0f-4c38-9b1a-6f1f2f6a1c11',
  title: '302동식당에서 점심',
  startAt: '2026-11-23T12:16:00+09:00',
  place: '302동식당',
  friendNames: [],
  shared: false,
};

const withMealSet = (mealSet: unknown): unknown => ({ ...MEAL_ANSWER, mealSet });

describe("A meal answer's meal already set", () => {
  it.each([
    ['held alone', SET],
    ['shared with a Friend', { ...SET, friendNames: ['민수'], shared: true }],
    ['as none', null],
  ])('is believed %s', (_, mealSet) => {
    expect(isAnswerReply(withMealSet(mealSet))).toBe(true);
  });

  it('may be absent', () => {
    expect(isAnswerReply(MEAL_ANSWER)).toBe(true);
  });

  it.each([
    ['without its Quest', { ...SET, questId: undefined }],
    ['with shared as words', { ...SET, shared: 'no' }],
    ['with a Friend not by name', { ...SET, friendNames: [3] }],
  ])('is refused %s', (_, mealSet) => {
    expect(isAnswerReply(withMealSet(mealSet))).toBe(false);
  });
});
