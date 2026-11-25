/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { mealWordsOf } from '@/screens/main/answer/meal-words';

// The words over a meal answer's list, the first the low sheet shows (P04 ticket 61, the dock's rule of PR 477's
// review, back by PR 545's): the Assistant's words while its first pick is on screen, else the chosen place's own
// line. Expected values: the stored answer's first pick, 302동식당 at 12:15, and its second, 301동식당; 김민수 is its
// Friend.
const FIRST = {
  answer: MEAL_ANSWER_MENUS,
  source: MEAL_ANSWER_MENUS,
  index: 0,
  plan: MEAL_ANSWER_MENUS.plans[0] ?? null,
};

// Partitions: the first pick with the model's words and without; another place chosen; the answer recalculated; one
// Friend in the Plan and three; one place kept of many.
describe('the meal words', () => {
  it('are the Assistant’s words while its first pick is on screen', () => {
    expect(mealWordsOf('302동식당이 좋아요.', FIRST)).toBe('302동식당이 좋아요.');
  });

  it('are the chosen place’s own line without the model’s words', () => {
    expect(mealWordsOf('아래에서 확인해 보세요.', FIRST)).toMatch(/^302동식당 · 12:15 · /u);
  });

  it('name the place chosen once another is chosen', () => {
    const second = { ...FIRST, index: 1, plan: MEAL_ANSWER_MENUS.plans[1] ?? null };

    expect(mealWordsOf('302동식당이 좋아요.', second)).toMatch(/^301동식당 · /u);
  });

  it('name the chosen place once the answer is recalculated', () => {
    const recalculated = { ...FIRST, answer: { ...MEAL_ANSWER_MENUS } };

    expect(mealWordsOf('302동식당이 좋아요.', recalculated)).toMatch(/^302동식당 · 12:15 · /u);
  });

  it('end with the Plan’s Friends, the first by name and the rest counted', () => {
    const person = MEAL_ANSWER_MENUS.chips.find(({ kind }) => kind === 'person');
    const three = {
      ...MEAL_ANSWER_MENUS,
      chips: person === undefined ? [] : [person, { ...person, text: '이서준' }, { ...person, text: '안진영' }],
    };

    expect(mealWordsOf('', { ...FIRST, answer: MEAL_ANSWER_MENUS })).toMatch(/ · 김민수와$/u);
    expect(mealWordsOf('', { ...FIRST, answer: three })).toMatch(/ · 김민수 외 2명과$/u);
  });

  it('say that the one place kept alone fits the Friend’s time', () => {
    const [first, ...rest] = MEAL_ANSWER_MENUS.plans.slice(0, 3);
    const dropped = rest.map(({ place }) => ({ place, reason: '김민수는 10분밖에 못 있어요' }));
    const kept = { ...MEAL_ANSWER_MENUS, plans: first === undefined ? [] : [first], dropped };

    expect(mealWordsOf('', { answer: kept, source: MEAL_ANSWER_MENUS, index: 0, plan: first ?? null })).toMatch(
      /^김민수와 시간이 맞는 곳은 302동식당뿐이에요 · \d{2}:\d{2}/u,
    );
  });
});
