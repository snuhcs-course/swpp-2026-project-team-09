/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// A meal answer's kind of food on screen, which the main server keeps in the input and puts first (P05 ticket 15, for
// P04 ticket 16). It is optional: a main server before it sends none. The other meal of the day, which the main server
// still sends, is no longer read (P04 ticket 82).

const withInput = (more: object): unknown => ({ ...MEAL_ANSWER, input: { ...MEAL_ANSWER.input, ...more } });

describe("A meal answer's kind of food on screen", () => {
  it.each([
    ['as one of the five', { cuisine: '한식' }],
    ['as none', { cuisine: null }],
    ['when absent', {}],
  ])('is believed %s', (_, more) => {
    expect(isAnswerReply(withInput(more))).toBe(true);
  });

  it.each([
    ['a kind not of the five', { cuisine: '기타' }],
    ["the server's word for it", { cuisine: 'korean' }],
  ])('is refused as %s', (_, more) => {
    expect(isAnswerReply(withInput(more))).toBe(false);
  });
});

describe('The other meal of the day, which the main server still sends', () => {
  it('leaves the answer believed, and unread', () => {
    expect(isAnswerReply({ ...MEAL_ANSWER, otherMeal: { meal: 'dinner', start: '17:00' } })).toBe(true);
  });
});
