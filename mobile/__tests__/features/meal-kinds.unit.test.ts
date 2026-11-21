/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Cuisine, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { kindChipsOf, kindOn, otherMealInput, showing, withKind } from '@/features/assistant/meal-kinds';

// The kinds of food as chips (P04 ticket 16, board 24): each kind the candidates' dishes hold, with its count of
// places, the most served first.

const [base] = MEAL_ANSWER.plans;

function planServing(...kinds: (Cuisine | null)[]): Plan {
  if (base === undefined) {
    throw new Error('The stored answer has no Plan');
  }
  const dishes = kinds.map((cuisine, at) => ({ name: `요리 ${String(at)}`, price: 5000, cuisine }));
  return { ...base, menu: { price: null, dishes } };
}

// Partitions: kinds with several places and one place; a kind nobody serves; dishes without a kind; one kind; none.
describe('the kind chips of a meal answer', () => {
  it('counts the places of each kind, the most served first, and leaves out kinds nobody serves', () => {
    const plans = [
      planServing('한식', '한식', null),
      planServing('한식', '양식'),
      planServing('한식'),
      planServing(null),
    ];

    expect(kindChipsOf(plans)).toEqual([
      { kind: '한식', places: 3 },
      { kind: '양식', places: 1 },
    ]);
  });

  it('puts kinds of the same count in the order 한식, 중식, 일식, 양식, 분식', () => {
    expect(
      kindChipsOf([planServing('분식'), planServing('중식'), planServing('한식')]).map(({ kind }) => kind),
    ).toEqual(['한식', '중식', '분식']);
  });

  it('gives no chip with fewer than two kinds, nor for dishes without a kind or Plans without a menu', () => {
    expect(kindChipsOf([planServing('한식'), planServing('한식', null)])).toEqual([]);
    expect(kindChipsOf([planServing(null), planServing(null)])).toEqual([]);
    expect(kindChipsOf(MEAL_ANSWER.plans)).toEqual([]);
  });
});

function answerOf(...plans: Plan[]): AnswerReply {
  return { ...MEAL_ANSWER, plans: plans.map((plan, at) => ({ ...plan, id: `plan-${String(at)}` })) };
}

// Partitions: a kind the pick serves, one it does not, clearing, and a press on a candidate without the kind.
describe('a kind chosen on the phone', () => {
  const answer = answerOf(planServing('양식'), planServing('한식'), planServing('한식', '양식'));

  it('puts the kind into the conditions and keeps a pick that serves it', () => {
    const { answer: next, index } = withKind({ answer, index: 0 }, '양식');

    expect(kindOn(next)).toBe('양식');
    expect(next?.input).toMatchObject({ kind: 'meal', cuisine: '양식' });
    expect(index).toBe(0);
  });

  it('moves the pick to the first candidate that serves it when the pick does not', () => {
    expect(withKind({ answer, index: 0 }, '한식').index).toBe(1);
  });

  it('leaves the conditions without a kind and the pick where it is when cleared', () => {
    const chosen = withKind({ answer, index: 0 }, '한식');
    const cleared = withKind(chosen, null);

    expect(cleared.index).toBe(1);
    expect(cleared.answer?.input).not.toHaveProperty('cuisine');
  });

  it('clears the kind when a candidate without it is shown, and keeps it for one with it', () => {
    const chosen = withKind({ answer, index: 0 }, '한식');

    expect(kindOn(showing(chosen, 0).answer)).toBeNull();
    expect(kindOn(showing(chosen, 2).answer)).toBe('한식');
  });
});

describe("the conditions of the day's other meal", () => {
  it('switch the meal, and drop the window, the constraints, the Place, and the kind', () => {
    const input = {
      ...MEAL_ANSWER.input,
      window: { from: '12:30', until: '13:00' },
      placeId: 'place-1',
      cuisine: '한식' as const,
      people: MEAL_ANSWER.input.people.map(({ userId }) => ({
        userId,
        constraints: [{ kind: 'notBefore' as const, time: '12:30', source: 'asker' as const }],
      })),
    };

    expect(otherMealInput(input, 'dinner')).toEqual({
      kind: 'meal',
      date: MEAL_ANSWER.input.date,
      meal: 'dinner',
      window: { from: null, until: null },
      placeId: null,
      people: MEAL_ANSWER.input.people.map(({ userId }) => ({ userId, constraints: [] })),
    });
  });
});
