/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type Tool, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { mealByClock } from '../src/assistant/free-time/meal-fit.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';
import { MEAL_WINDOWS } from '../src/travel/judgement-constants.js';

// The meal a plan takes when the User names none, judged by the clock at Monday 2026-11-16 (the first-path run's day),
// and planMeal filling it in before it plans. Lunch is served 11:00–14:30 and dinner 17:00–19:30.

const TODAY = '2026-11-16';
const TOMORROW = '2026-11-17';
const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const at = (clock: string): Date => new Date(`${TODAY}T${clock}:00+09:00`);

it('reads the windows these edges stand on', () => {
  expect(MEAL_WINDOWS).toEqual({ lunch: { from: '11:00', to: '14:30' }, dinner: { from: '17:00', to: '19:30' } });
});

describe('Today, with no start asked for', () => {
  it.each([
    ['09:00', 'before lunch (11:00–14:30) opens', 'lunch'],
    ['14:29', "in lunch's last minute (to 14:30)", 'lunch'],
    ['14:30', 'as lunch (to 14:30) ends', 'dinner'],
    ['14:31', 'just after lunch (to 14:30) ends', 'dinner'],
    ['15:00', 'between lunch (to 14:30) and dinner (from 17:00)', 'dinner'],
    ['17:00', 'as dinner (17:00–19:30) opens', 'dinner'],
    ['19:31', 'after dinner (to 19:30) ends, which then has no time left', 'dinner'],
  ])('at %s, %s, takes %s', (clock, _window, meal) => {
    expect(mealByClock(TODAY, at(clock))).toBe(meal);
  });
});

describe('Another day', () => {
  it('takes lunch, whatever the clock now', () => {
    expect(mealByClock(TOMORROW, at('15:00'))).toBe('lunch');
    expect(mealByClock(TOMORROW, at('21:00'))).toBe('lunch');
  });

  it('takes dinner for a start asked for after lunch (to 14:30) ends', () => {
    expect(mealByClock(TOMORROW, at('15:00'), '18:00')).toBe('dinner');
    expect(mealByClock(TOMORROW, at('15:00'), '14:29')).toBe('lunch');
  });
});

describe('Today, with a start asked for', () => {
  it('takes dinner for a start after lunch (to 14:30) ends, asked before it', () => {
    expect(mealByClock(TODAY, at('10:00'), '15:00')).toBe('dinner');
    expect(mealByClock(TODAY, at('10:00'), '12:00')).toBe('lunch');
  });

  it('judges no earlier than now', () => {
    expect(mealByClock(TODAY, at('15:00'), '12:00')).toBe('dinner');
  });
});

// planMeal with a service that keeps the input it is given and answers no plan.
function planned(): { tool: Tool; inputs: MealInput[] } {
  const inputs: MealInput[] = [];
  const tool = planMeal({
    restaurantPlaceId: () => null,
    asked: (_askerId, input) => Promise.resolve({ input, alreadyIn: [] }),
    planned: (_askerId, input) => {
      inputs.push(input);
      const answer: AnswerReply = {
        input,
        chips: [],
        plans: [],
        dropped: [],
        noPlan: { reason: 'no-shared-time', lines: [] },
      };
      return Promise.resolve({ answer, served: new Map() });
    },
  });
  return { tool, inputs };
}

function contextAt(clock: string, conditions: MealInput | null = null): ToolContext {
  return {
    userId: ME,
    now: at(clock),
    context: { ...NO_CONTEXT, conditions },
    capabilities: new Set<ClientCapability>(['library', 'answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

describe('planMeal without a meal', () => {
  it('plans the one the clock takes, and tells the model which', async () => {
    const { tool, inputs } = planned();

    const result = await tool.run({ date: TODAY }, contextAt('15:00'));

    expect(inputs.map(({ meal }) => meal)).toEqual(['dinner']);
    expect(result).toMatchObject({ result: 'none', meal: 'dinner' });
  });

  it('takes lunch on another day', async () => {
    const { tool, inputs } = planned();

    await tool.run({ date: TOMORROW }, contextAt('15:00'));

    expect(inputs.map(({ meal }) => meal)).toEqual(['lunch']);
  });

  it("keeps each person's constraints of the conditions on screen for the meal it takes", async () => {
    const { tool, inputs } = planned();
    const notBefore = { kind: 'notBefore' as const, time: '18:00', source: 'asker' as const };
    const shown: MealInput = {
      kind: 'meal',
      date: TODAY,
      meal: 'dinner',
      people: [{ userId: ME, constraints: [notBefore] }],
      window: { from: null, until: null },
      placeId: null,
    };

    await tool.run({ date: TODAY }, contextAt('15:00', shown));

    expect(inputs[0]?.people).toEqual([{ userId: ME, constraints: [notBefore] }]);
  });
});

describe('planMeal with a meal the User named', () => {
  it('plans that meal, also one that is over', async () => {
    const { tool, inputs } = planned();

    await tool.run({ date: TODAY, meal: 'lunch' }, contextAt('15:00'));

    expect(inputs.map(({ meal }) => meal)).toEqual(['lunch']);
  });
});
