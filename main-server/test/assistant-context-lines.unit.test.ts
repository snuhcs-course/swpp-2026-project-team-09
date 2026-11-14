/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { runFeature } from '../src/assistant/adapter.js';
import { contextLines } from '../src/assistant/context-lines.js';
import { NO_CONTEXT, type PlanInput, type RequestContext } from '../src/assistant/dto/answer.dto.js';
import { defineTool, type Feature, type Request } from '../src/assistant/feature.js';
import { ScriptedModel } from './scripted-model.js';

// What the app knew as the User asked, as the lines the model reads after their message: the Plan on screen with its
// conditions, and what they tapped on the map.

const ASKER = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const MINSU = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const JIEUN = '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b';
const PLACE = '3f333df6-90a4-4fda-8dd3-9485d27cee36';

const CONDITIONS: PlanInput = {
  kind: 'meal',
  date: '2087-01-07',
  meal: 'lunch',
  people: [
    { userId: ASKER, constraints: [] },
    { userId: MINSU, constraints: [{ kind: 'notBefore', time: '12:20', source: 'asker' }] },
    { userId: JIEUN, constraints: [] },
  ],
  window: { from: null, until: '12:50' },
  placeId: PLACE,
};

const PLAN_LINE =
  `[Plan on screen: {"plan":"학생회관식당","date":"2087-01-07","meal":"lunch","friendIds":["${MINSU}","${JIEUN}"],` +
  `"from":null,"until":"12:50","placeId":"${PLACE}"}]`;

describe('The lines of a request context', () => {
  it('give the plan on screen with its conditions', () => {
    expect(contextLines({ ...NO_CONTEXT, conditions: CONDITIONS, planId: '학생회관식당' })).toEqual([PLAN_LINE]);
  });

  it('give a tapped Friend', () => {
    expect(contextLines({ ...NO_CONTEXT, tapped: { kind: 'friend', userId: MINSU } })).toEqual([
      `[Tapped: friend ${MINSU}]`,
    ]);
  });

  it('give a tapped Place', () => {
    expect(contextLines({ ...NO_CONTEXT, tapped: { kind: 'place', placeId: PLACE } })).toEqual([
      `[Tapped: place ${PLACE}]`,
    ]);
  });

  it('give the plan before what was tapped', () => {
    const context: RequestContext = {
      ...NO_CONTEXT,
      conditions: CONDITIONS,
      planId: '학생회관식당',
      tapped: { kind: 'place', placeId: PLACE },
    };

    expect(contextLines(context)).toEqual([PLAN_LINE, `[Tapped: place ${PLACE}]`]);
  });

  it('give no Plan for a planId without conditions', () => {
    expect(contextLines({ ...NO_CONTEXT, planId: '학생회관식당' })).toEqual([]);
  });

  it('are none for a context with neither', () => {
    expect(contextLines(NO_CONTEXT)).toEqual([]);
  });
});

const LIMITS = { maxSteps: 4, timeoutMs: 5000, maxOutputTokens: 1000 };

const model = new ScriptedModel();

const feature: Feature = {
  instructions: () => 'test',
  tools: { plan: defineTool({ description: 'Plans a meal.', input: z.object({}), run: () => Promise.resolve({}) }) },
};

const asker = (context: RequestContext, capabilities: Request['capabilities'] = ['answer']): Request => ({
  userId: ASKER,
  now: new Date(),
  capabilities,
  context,
});

const conversation = [
  { role: 'user' as const, text: '배고파' },
  { role: 'assistant' as const, text: '학생회관식당 어때요?', cards: [], proposal: null },
  { role: 'user' as const, text: '여기서 먹자' },
];

// The text of each User's message the model received on its first call.
function userTexts(): string[] {
  const prompt = model.received()[0]?.prompt ?? [];
  return prompt.flatMap((message) =>
    message.role === 'user' ? message.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])) : [],
  );
}

const FULL_CONTEXT: RequestContext = {
  ...NO_CONTEXT,
  conditions: CONDITIONS,
  planId: '학생회관식당',
  tapped: { kind: 'place', placeId: PLACE },
};

describe("The User's last message, as the model reads it", () => {
  it('is their text followed by the lines of the context', async () => {
    model.script({ text: '네' });

    await runFeature(model.model, feature, asker(FULL_CONTEXT), conversation, LIMITS);

    expect(userTexts()).toEqual(['배고파', `여기서 먹자\n\n${PLAN_LINE}\n\n[Tapped: place ${PLACE}]`]);
  });

  it('is their text alone without a context', async () => {
    model.script({ text: '네' });

    await runFeature(model.model, feature, asker(NO_CONTEXT), conversation, LIMITS);

    expect(userTexts()).toEqual(['배고파', '여기서 먹자']);
  });

  it('is their text alone for an app that does not draw answers', async () => {
    model.script({ text: '네' });

    await runFeature(model.model, feature, asker(FULL_CONTEXT, ['library']), conversation, LIMITS);

    expect(userTexts()).toEqual(['배고파', '여기서 먹자']);
  });
});
