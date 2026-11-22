/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealSet } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { changedLineOf, keptTagOf, leftLineOf, setQuestOf } from '@/features/assistant/set-quest';

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
      word: '점심',
    });
  });

  it('calls a meal of a main server that says no kind a dinner from 16:00', () => {
    const dinner = { ...LUNCH, startAt: '2026-10-01T16:00:00+09:00' };

    expect(setQuestOf({ ...MEAL_ANSWER_ALONE, mealSet: dinner })?.word).toBe('저녁');
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

// Partitions: the kinds a tag names, and the line with and without a place. Expected values: P04 ticket 20's words.
describe('the words of a Quest already set', () => {
  const AT = '2026-10-01T12:16:00+09:00';

  it.each([
    ['meal-lunch', '잡힌 점심 12:16'],
    ['meal-dinner', '잡힌 저녁 12:16'],
    ['meet', '잡힌 약속 12:16'],
    ['event', '잡힌 일정 12:16'],
  ] as const)('tag a %s "%s"', (kind, tag) => {
    expect(keptTagOf({ kind, startAt: AT })).toBe(tag);
  });

  it('say it was left as it is, with its place when it has one', () => {
    expect(leftLineOf({ startAt: AT, place: '302동식당', word: '점심' })).toBe('12:16 302동식당 점심을 그대로 뒀어요');
    expect(leftLineOf({ startAt: AT, place: '', word: '약속' })).toBe('12:16 약속을 그대로 뒀어요');
  });
});
