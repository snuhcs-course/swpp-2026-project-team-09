/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { runFeature } from '../src/assistant/adapter.js';
import { type AnswerReply, type MealInput, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { defineTool, type Feature, type Request } from '../src/assistant/feature.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';
import { ScriptedModel } from './scripted-model.js';

// A number the model writes as a string (P05 ticket 84). On the user's phone on 2026-11-28, "7000원 이하" after a lunch
// answer ended with the cheapest first and no ceiling ("7,000원 이하로 거르는 건 적용되지 않아서"): maxPrice's schema is
// a whole number or the word 'any', and a ceiling written "7000" or "7,000" is refused, with no null for the repair to
// leave out. A field that takes a number now reads a number written as a string; a field that takes a string keeps its
// digits. Partitions: digits, digits with commas, with 원, a whole-number field, a word, a string field, a null beside.

const model = new ScriptedModel();
const LIMITS = { maxSteps: 3, timeoutMs: 5000, maxOutputTokens: 1000 };
const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const asker: Request = {
  userId: ME,
  now: new Date('2026-11-28T10:00:00+09:00'),
  capabilities: ['answer'],
  context: NO_CONTEXT,
};

const received: unknown[] = [];

const FEATURE: Feature = {
  instructions: 'test',
  tools: {
    plan: defineTool({
      description: 'Plans.',
      input: z.object({
        date: z.iso.date(),
        maxPrice: z.union([z.number().int().positive(), z.literal('any')]).optional(),
        minutes: z.number().int().optional(),
        building: z.string().optional(),
        from: z.string().optional(),
      }),
      run: (input) => {
        received.push(input);
        return Promise.resolve({ result: 'planned' });
      },
    }),
  },
};

beforeEach(() => {
  received.length = 0;
});

async function called(feature: Feature, tool: string, input: object): Promise<void> {
  model.script({ tool, input }, { text: '…' });
  await runFeature(model.model, feature, asker, [{ role: 'user', text: '7000원 이하' }], LIMITS);
}

describe('A number the model writes as a string', () => {
  it.each([
    ['7000', 7000],
    ['7,000', 7000],
    ['7000원', 7000],
    [' 7,000 원 ', 7000],
  ])('%s on a field that takes a number is read as %d', async (written, read) => {
    await called(FEATURE, 'plan', { date: '2026-11-30', maxPrice: written });

    expect(received).toEqual([{ date: '2026-11-30', maxPrice: read }]);
  });

  it('is read on a whole-number field, beside a null left out, and a string field keeps its digits', async () => {
    await called(FEATURE, 'plan', { date: '2026-11-30', minutes: '90', from: null, building: '301' });

    expect(received).toEqual([{ date: '2026-11-30', minutes: 90, building: '301' }]);
  });

  it("keeps 'any', which the field takes as it is", async () => {
    await called(FEATURE, 'plan', { date: '2026-11-30', maxPrice: 'any' });

    expect(received).toEqual([{ date: '2026-11-30', maxPrice: 'any' }]);
  });

  it('is still refused when it is no number', async () => {
    await called(FEATURE, 'plan', { date: '2026-11-30', maxPrice: '많이' });

    expect(received).toEqual([]);
  });
});

// planMeal over a service that plans nothing: the conditions it planned hold the ceiling.
const shown: MealInput[] = [];
const MEALS: Feature = {
  instructions: 'test',
  tools: {
    planMeal: planMeal({
      restaurantPlaceId: () => null,
      asked: (_askerId, input: MealInput) => Promise.resolve({ input, alreadyIn: [] }),
      planned: (_askerId, input: MealInput) => {
        shown.push(input);
        const answer: AnswerReply = {
          input,
          chips: [],
          plans: [],
          dropped: [],
          noPlan: { reason: 'no-fit', lines: [] },
        };
        return Promise.resolve({ answer, served: new Map() });
      },
    }),
  },
};

describe("planMeal's ceiling written as a string, in the message after a lunch answer", () => {
  it.each([
    ['today', '2026-11-28'],
    ['a later day', '2026-11-30'],
  ])('%s: plans with the ceiling', async (_day, date) => {
    shown.length = 0;

    await called(MEALS, 'planMeal', { date, meal: 'lunch', friendIds: [], maxPrice: '7,000' });

    expect(shown.at(-1)).toMatchObject({ date, meal: 'lunch', maxPrice: 7000 });
  });
});

// Every price wording of the rule that names a number, as the model gives it written as a string, in the same message
// as the meal and in the next, the lunch on screen; today and a later day.
const WORDINGS: [string, string, number][] = [
  ['5천원 이하', '5000', 5000],
  ['5천원까지', '5,000', 5000],
  ['만원 안쪽', '10,000', 10_000],
  ['6천원 정도', '6000원', 6000],
  ['7000원 이하', '7,000', 7000],
];

const lunchOn = (date: string): MealInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
});

describe.each([
  ['today', '2026-11-28'],
  ['a later day', '2026-11-30'],
])("A price wording's ceiling written as a string, %s", (_day, date) => {
  it.each(WORDINGS)('%s (%s) in the same message plans with %d', async (words, written, read) => {
    shown.length = 0;
    model.script({ tool: 'planMeal', input: { date, meal: 'lunch', maxPrice: written } }, { text: '…' });

    await runFeature(model.model, MEALS, asker, [{ role: 'user', text: `점심 ${words}` }], LIMITS);

    expect(shown.at(-1)).toMatchObject({ maxPrice: read });
  });

  it.each(WORDINGS)('%s (%s) in the next message plans with %d', async (words, written, read) => {
    shown.length = 0;
    const onScreen: Request = { ...asker, context: { ...NO_CONTEXT, conditions: lunchOn(date) } };
    model.script({ tool: 'planMeal', input: { date, meal: 'lunch', friendIds: [], maxPrice: written } }, { text: '…' });

    await runFeature(model.model, MEALS, onScreen, [{ role: 'user', text: words }], LIMITS);

    expect(shown.at(-1)).toMatchObject({ maxPrice: read });
  });
});
