/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, type PersonConstraint } from '../src/assistant/dto/answer.dto.js';
import { type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { type AnswerPerson, mealAnswer } from '../src/assistant/gathering/meal-answer.js';
import { conditionsOf } from '../src/assistant/gathering/plan-conditions.js';
import { gatherMeal, withHours } from '../src/assistant/gathering/unmet-plans.js';
import { type Hours } from '../src/menus/restaurant-hours.js';
import { type SeedTravel } from '../src/travel/travel.js';
import { at, DATE, gatheringPerson, placeOf, readWorld, restaurants } from './worked-example.js';
import { readFrozenTravel } from './frozen-travel.js';

// A meal's answer as MealPlanService makes it, for the tests of conditions that cannot be met (P02-14), on the worked
// example's Places and the seed's walking table. Call `readUnmetWorld` in a beforeAll first.

let travel: SeedTravel | null = null;

export async function readUnmetWorld(): Promise<void> {
  await readWorld();
  travel = await readFrozenTravel();
}

export interface Asking {
  people: [AnswerPerson, ...AnswerPerson[]];
  clock: string;
  meal?: MealInput['meal'];
  window?: MealInput['window'];
  candidates?: GatheringPlace[];
  // Each candidate's hours, as RestaurantHours reads them; none read when left out.
  hours?: (Hours | null)[];
  // Each person's constraints, in the order of the people.
  constraints?: PersonConstraint[][];
  placeId?: string | null;
}

export const NOW_WINDOW: MealInput['window'] = { from: null, until: null, now: true };

// The answer as MealPlanService makes it: the hours, the gathering, and what could not be met.
export function answerFor({
  people,
  clock,
  meal = 'lunch',
  window: bounds,
  candidates = restaurants(),
  hours,
  constraints = [],
  placeId = null,
}: Asking): AnswerReply {
  if (travel === null) {
    throw new Error('Read the world first');
  }
  const now = at(clock);
  const input: MealInput = {
    kind: 'meal',
    date: DATE,
    meal,
    people: people.map(({ userId }, index) => ({ userId, constraints: constraints[index] ?? [] })),
    window: bounds ?? { from: null, until: null },
    placeId,
  };
  const { places, ...served } = withHours(input, candidates, hours ?? candidates.map(() => null));
  const [first, ...rest] = people.map(({ userId, items }, index) => ({
    ...gatheringPerson(userId, items, null, now),
    ...conditionsOf(input.people[index]?.constraints ?? [], DATE),
  }));
  if (first === undefined) {
    throw new Error('No asker');
  }
  const { gathering, unmet } = gatherMeal([first, ...rest], places, { input, now, ...served }, travel);
  return mealAnswer({ input, now, people, gathering, aloneMinutes: null, menus: 'open', placeOf, unmet });
}
