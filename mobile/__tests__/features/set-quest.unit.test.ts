/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealSet } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { changedLineOf, setQuestOf } from '@/features/assistant/set-quest';

// P04 ticket 17: the Quest an answer stands beside, in one shape for every planner's answer, read for now from a meal
// answer's `mealSet` (P05 ticket 16). Expected values: the main server's field as P05 wrote it.

const LUNCH: MealSet = {
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-10-01T12:16:00+09:00',
  place: '302동식당',
  friendNames: ['민수'],
  shared: false,
};

// Partitions: none, absent, held alone, shared.
describe('the Quest an answer stands beside', () => {
  it('is none without `mealSet`, and when it is null', () => {
    expect(setQuestOf(MEAL_ANSWER_ALONE)).toBeNull();
    expect(setQuestOf({ ...MEAL_ANSWER_ALONE, mealSet: null })).toBeNull();
  });

  it('names a lunch the User may change', () => {
    expect(setQuestOf({ ...MEAL_ANSWER_ALONE, mealSet: LUNCH })).toEqual({
      questId: 'q-lunch',
      title: '302동식당에서 점심',
      startAt: '2026-10-01T12:16:00+09:00',
      place: '302동식당',
      people: ['민수'],
      shared: false,
      changeable: true,
      inPlace: false,
    });
  });

  it('names a shared one, which is changed in its 파티 and not here', () => {
    expect(setQuestOf({ ...MEAL_ANSWER_ALONE, mealSet: { ...LUNCH, shared: true } })).toMatchObject({
      shared: true,
      changeable: false,
    });
  });
});

// Partitions: the meeting changed with one, two, and more Friends, and with none. Expected values: the orchestrator's
// wording of the answer after a meeting's 바꾸기.
describe('the line after a meeting was changed in place', () => {
  const AT = '2026-10-01T15:00:00+09:00';

  it('names the Friends told', () => {
    expect(changedLineOf(AT, ['김민수'])).toBe('약속을 15:00으로 바꿨어요. 김민수에게 알렸어요');
    expect(changedLineOf(AT, ['김민수', '이지은'])).toBe('약속을 15:00으로 바꿨어요. 김민수, 이지은에게 알렸어요');
    expect(changedLineOf(AT, ['김민수', '이지은', '박서준'])).toBe(
      '약속을 15:00으로 바꿨어요. 김민수 외 2명에게 알렸어요',
    );
  });

  it('says only the time when nobody else holds it', () => {
    expect(changedLineOf(AT, [])).toBe('약속을 15:00으로 바꿨어요');
  });
});
