/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// A meal answer's kind of food on screen, which the main server keeps in the input and puts first, and the other meal
// of the day, which the bar offers (P05 ticket 15, for P04 ticket 16). Both are optional: a main server before them
// sends neither.

const withInput = (more: object): unknown => ({ ...MEAL_ANSWER, input: { ...MEAL_ANSWER.input, ...more } });

const withOtherMeal = (otherMeal: unknown): unknown => ({ ...MEAL_ANSWER, otherMeal });

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

describe('The other meal of the day', () => {
  it.each([
    ['dinner from 17:00', { meal: 'dinner', start: '17:00' }],
    ['lunch under way', { meal: 'lunch', start: '12:16' }],
    ['none', null],
  ])('is believed as %s', (_, otherMeal) => {
    expect(isAnswerReply(withOtherMeal(otherMeal))).toBe(true);
  });

  it('may be absent', () => {
    expect(isAnswerReply(MEAL_ANSWER)).toBe(true);
  });

  it.each([
    ['breakfast', { meal: 'breakfast', start: '08:00' }],
    ['without its start', { meal: 'dinner' }],
  ])('is refused as %s', (_, otherMeal) => {
    expect(isAnswerReply(withOtherMeal(otherMeal))).toBe(false);
  });
});
