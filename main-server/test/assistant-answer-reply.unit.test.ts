/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { FIXED_SENTENCE, runFeature } from '../src/assistant/adapter.js';
import { type AnswerReply, NO_CONTEXT, type RequestContext } from '../src/assistant/dto/answer.dto.js';
import { defineTool, type Feature, type Request } from '../src/assistant/feature.js';
import { ScriptedModel } from './scripted-model.js';

// What a run carries between the request and the reply for an answer drawn on the map: the request context every tool
// is given, and the answer a tool puts in the reply.

const LIMITS = { maxSteps: 4, timeoutMs: 5000, maxOutputTokens: 1000 };

const ANSWER: AnswerReply = {
  input: {
    kind: 'meal',
    date: '2027-03-02',
    meal: 'lunch',
    people: [{ userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', constraints: [] }],
    window: { from: null, until: null },
    placeId: null,
  },
  chips: [],
  plans: [],
  dropped: [],
  noPlan: { reason: 'no-menu', lines: [] },
};

const model = new ScriptedModel();

// One tool, `plan`, that tells what location it was run with and puts `answer` in the reply.
function featureAnswering(answer: AnswerReply | null): Feature {
  return {
    instructions: () => 'test',
    tools: {
      plan: defineTool({
        description: 'Plans a meal.',
        input: z.object({}),
        run: (_, { context, presented }) => {
          presented.answer = answer;
          return Promise.resolve({ location: context.location });
        },
      }),
    },
  };
}

function asker(context: RequestContext): Request {
  return { userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', now: new Date(), capabilities: ['answer'], context };
}

const ask = [{ role: 'user' as const, text: '배고파' }];

describe("A run's request context and answer", () => {
  it("gives every tool the asker's location", async () => {
    const location = { latitude: 37.4599, longitude: 126.9519 };
    model.script({ tool: 'plan', input: {} }, { text: '네' });

    await runFeature(model.model, featureAnswering(null), asker({ ...NO_CONTEXT, location }), ask, LIMITS);

    expect(model.toolResults()).toEqual([{ location }]);
  });

  it('replies with the answer a tool put there', async () => {
    model.script({ tool: 'plan', input: {} }, { text: '학생회관식당 어때요?' });

    const reply = await runFeature(model.model, featureAnswering(ANSWER), asker(NO_CONTEXT), ask, LIMITS);

    expect(reply).toMatchObject({ text: '학생회관식당 어때요?', answer: ANSWER });
  });

  it('replies with no answer when no tool put one there', async () => {
    model.script({ text: '안녕하세요!' });

    const reply = await runFeature(model.model, featureAnswering(ANSWER), asker(NO_CONTEXT), ask, LIMITS);

    expect(reply.answer).toBeNull();
  });

  it('says the fixed sentence over an answer when no step wrote text', async () => {
    model.script({ tool: 'plan', input: {} }, { text: '' });

    const reply = await runFeature(model.model, featureAnswering(ANSWER), asker(NO_CONTEXT), ask, LIMITS);

    expect(reply).toMatchObject({ text: FIXED_SENTENCE, answer: ANSWER, noTextFinishReason: 'stop' });
  });
});
