/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { mealWordsOf } from '@/screens/main/answer/meal-words';

// The words over a meal answer's list, the first the low sheet shows (P04 ticket 61, the dock's rule of PR 477's
// review, back by PR 545's): the Assistant's words while the reply's own Plans are on screen, whichever of them is
// chosen (P04 ticket 79), else the chosen place's own line. Expected values: the stored answer's first pick,
// 302동식당 at 12:15, and its second, 301동식당; 김민수 is its Friend.
const FIRST = {
  answer: MEAL_ANSWER_MENUS,
  source: MEAL_ANSWER_MENUS,
  index: 0,
  plan: MEAL_ANSWER_MENUS.plans[0] ?? null,
};
const SECOND = { ...FIRST, index: 1, plan: MEAL_ANSWER_MENUS.plans[1] ?? null };
const WORDS = '둘 다 가까운 302동식당을 추천해요.';

// Partitions: the first pick with the model's words and without; another place chosen; a kind chosen on the phone; the
// answer recalculated, at its first place and another; one Friend in the Plan and three; one place kept of many.
describe('the meal words', () => {
  it('are the Assistant’s words while its first pick is on screen', () => {
    expect(mealWordsOf(WORDS, FIRST)).toBe(WORDS);
  });

  it('are the chosen place’s own line without the model’s words', () => {
    expect(mealWordsOf('아래에서 확인해 보세요.', FIRST)).toMatch(/^302동식당 · 12:15 · /u);
  });

  it('stay the Assistant’s words once another of its places is chosen', () => {
    expect(mealWordsOf(WORDS, SECOND)).toBe(WORDS);
  });

  it('stay the Assistant’s words with a kind chosen on the phone, which keeps the reply’s Plans', () => {
    const korean = { ...MEAL_ANSWER_MENUS, input: { ...MEAL_ANSWER_MENUS.input, cuisine: '한식' as const } };

    expect(mealWordsOf(WORDS, { ...SECOND, answer: korean })).toBe(WORDS);
  });

  it('name the chosen place once the answer is recalculated, at its first place and another', () => {
    const recalculated = { ...MEAL_ANSWER_MENUS, plans: [...MEAL_ANSWER_MENUS.plans] };

    expect(mealWordsOf(WORDS, { ...FIRST, answer: recalculated })).toMatch(/^302동식당 · 12:15 · /u);
    expect(mealWordsOf(WORDS, { ...SECOND, answer: recalculated })).toMatch(/^301동식당 · /u);
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

    expect(mealWordsOf('', { answer: kept, source: MEAL_ANSWER_MENUS, plan: first ?? null })).toMatch(
      /^김민수와 시간이 맞는 곳은 302동식당뿐이에요 · \d{2}:\d{2}/u,
    );
  });
});
