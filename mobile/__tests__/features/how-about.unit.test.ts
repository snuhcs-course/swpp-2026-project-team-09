/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_FIXED_PLACE, MEAL_ANSWER_THREE, MEAL_ANSWER_UNFIT_PLACE } from '@/api/mock/data/meal-answers';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import type { Place } from '@/api/types';
import { fixedAt, howAboutOf, howAboutScene, noteOf, pointOf, rowsOf, titleOf } from '@/features/assistant/how-about';

// "여기면 어때?" (P02 ticket 26) over the stored answer to "배고파" with 민수 and 지은 and the main server's replies of
// boards a7 and a8.

const JAHAYEON: Place = {
  id: 'b56be928-cbfe-5c4b-aaa1-40171ba126d1',
  number: null,
  name: '자하연식당',
  latitude: 37.46098,
  longitude: 126.95252,
};
const ENGINEERING_1: Place = {
  id: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
  number: '301',
  name: '제1공학관',
  latitude: 37.45016,
  longitude: 126.95259,
};

function plan(answer: { plans: Plan[] }): Plan {
  const first = answer.plans[0];
  if (first === undefined) {
    throw new Error('The stored answer has no Plan');
  }
  return first;
}

const CURRENT = plan(MEAL_ANSWER_THREE);

// Partitions: a meal's conditions and a meet's. Expected values: the decision that only the Place changes.
describe('the conditions asked', () => {
  it("are the meal's on screen with only the Place fixed", () => {
    expect(fixedAt(MEAL_ANSWER_THREE.input, JAHAYEON.id)).toEqual({ ...MEAL_ANSWER_THREE.input, placeId: JAHAYEON.id });
  });

  it('are none for a meet', () => {
    expect(fixedAt(MEET_ANSWER.input, JAHAYEON.id)).toBeNull();
  });
});

// Partitions: a Place that fits, one that does not, and the time together shorter, longer, and the same. Expected
// values: boards a7 and a8.
describe('the card of a pressed Place', () => {
  it('reads the arrivals and the time together of a7', () => {
    const answer = howAboutOf(MEAL_ANSWER_FIXED_PLACE, JAHAYEON.id);
    if (!answer.fits) {
      throw new Error('a7 fits');
    }

    expect(rowsOf(answer.plan.parts).map(({ name, words }) => `${name} ${words}`)).toEqual([
      '나 12:35 도착',
      '민수 12:35 도착',
      '지은 12:18 도착',
    ]);
    expect(noteOf(answer.plan, CURRENT)).toBe('12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요');
    expect(titleOf(JAHAYEON, MEAL_ANSWER_FIXED_PLACE)).toBe('자하연식당 2층');
  });

  it('reads the dropped Place of a8, the User already there', () => {
    const answer = howAboutOf(MEAL_ANSWER_UNFIT_PLACE, ENGINEERING_1.id);
    if (answer.fits) {
      throw new Error('a8 does not fit');
    }

    expect(rowsOf(answer.parts).map(({ name, words }) => `${name} ${words}`)).toEqual([
      '나 지금 여기 있어요',
      '민수 12:18 도착',
      '지은 12:31 도착',
    ]);
    expect(answer.lines.map((line) => line.map(({ text }) => text).join(''))).toEqual([
      '지은은 12:31에 도착해 13분만 먹어요',
      '13:00 수업에 가려면 12:44엔 나서야 해요',
    ]);
    expect(titleOf(ENGINEERING_1, MEAL_ANSWER_UNFIT_PLACE)).toBe('301동식당');
  });

  it('says a longer and an equal time together', () => {
    const next = plan(MEAL_ANSWER_FIXED_PLACE);

    expect(noteOf({ ...next, togetherMinutes: 25 }, CURRENT)).toBe('12:35–12:55 함께 25분 · 지금 계획보다 3분 길어요');
    expect(noteOf({ ...next, togetherMinutes: 22 }, CURRENT)).toBe('12:35–12:55 함께 22분 · 시간은 지금 계획과 같아요');
  });

  it('names the building while it is asked', () => {
    expect(titleOf(ENGINEERING_1, null)).toBe('301동');
    expect(titleOf(JAHAYEON, null)).toBe('자하연식당');
  });
});

// Expected values: the decision that the Plan on screen's pick keeps its number as "지금 계획", each person has a line
// to the pressed Place, and the User's line to the pick is faded.
describe('the map while a Place is asked about', () => {
  it('keeps the pick as "지금 계획", with a line from each person to the pressed Place and the faded one', () => {
    const scene = howAboutScene(CURRENT, pointOf(JAHAYEON));

    expect(scene.places).toEqual([{ place: CURRENT.place, role: 'pick', tag: '지금 계획 · 학생회관식당' }]);
    expect(scene.routes.map(({ role, to }) => `${role} ${String(to.latitude)}`)).toEqual([
      `alt ${String(CURRENT.place.latitude)}`,
      'me 37.46098',
      'friend 37.46098',
      'friend 37.46098',
    ]);
    expect(scene.people).toBe(CURRENT.scene.people);
    expect(scene.flags).toEqual([]);
  });
});

describe('the note on equal minutes', () => {
  // In the usage test of 2026-11-21 another restaurant with the same minutes read "지금 계획과 같아요".
  it('says the plan is the same only at its own place', () => {
    const next = plan(MEAL_ANSWER_FIXED_PLACE);

    expect(noteOf({ ...next, place: CURRENT.place, togetherMinutes: 22 }, CURRENT)).toBe(
      '12:35–12:55 함께 22분 · 지금 계획과 같아요',
    );
    expect(next.place.placeId).not.toBe(CURRENT.place.placeId);
  });
});
