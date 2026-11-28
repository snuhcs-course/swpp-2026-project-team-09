/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { runFeature } from '../src/assistant/adapter.js';
import { type AnswerReply, type MealInput, NO_CONTEXT, type PlanInput } from '../src/assistant/dto/answer.dto.js';
import {
  type ClientCapability,
  defineTool,
  type Feature,
  type Request,
  type ToolContext,
} from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';
import { askPastTime } from '../src/assistant/past-time.js';
import { ScriptedModel } from './scripted-model.js';

// The reply of a message that asked back about a time of today that has passed (P05 ticket 80), through the run that
// answers it: the question alone, whatever its tools drew, and the feature's steps never run. A meal over for today asks
// so only when the User named it.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const at = (time: string): Date => new Date(`2026-11-28T${time}:00+09:00`);

function contextAt(time: string): ToolContext {
  return {
    userId: ME,
    now: at(time),
    context: NO_CONTEXT,
    capabilities: new Set<ClientCapability>(['answer', 'answers']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

const model = new ScriptedModel();
const LIMITS = { maxSteps: 6, timeoutMs: 5000, maxOutputTokens: 1000 };
const asker: Request = { userId: ME, now: at('11:13'), capabilities: ['answer', 'answers'], context: NO_CONTEXT };
const MEAL: PlanInput = {
  kind: 'meal',
  date: '2026-11-28',
  meal: 'lunch',
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
};
const drawn: AnswerReply = { input: MEAL, chips: [], plans: [], dropped: [], noPlan: null };
const afterRun = vi.fn<(context: ToolContext) => Promise<void>>(() => Promise.resolve());
// A tool of another kind that draws, as a seat booking's card or a meal's plan would, in the same message.
const FEATURE: Feature = {
  instructions: 'test',
  afterRun,
  tools: {
    askPastTime: askPastTime(),
    draw: defineTool({
      description: 'Draws.',
      input: z.object({}),
      run: (_input, { presented }) => {
        presented.answer = drawn;
        presented.answers = [drawn];
        presented.mapButtons.push('dining');
        presented.offers = [{ kind: 'ask', label: '다른 것', text: '다른 것' }];
        return Promise.resolve({ result: 'planned' });
      },
    }),
  },
};
const WORDS = [{ role: 'user' as const, text: '아침 7시에 도서관 갔다가 점심' }];

describe('A message that asked back', () => {
  beforeEach(() => afterRun.mockClear());

  it('draws nothing and replies with the question and its two buttons alone', async () => {
    model.script(
      { tool: 'draw', input: {} },
      { tool: 'askPastTime', input: { named: '아침 7시', at: '07:00' } },
      { text: '내일 아침 7시로 볼게요.' },
    );

    const reply = await runFeature(model.model, FEATURE, asker, WORDS, LIMITS);

    expect(reply).toEqual({
      text: '오늘 아침 7시는 지났어요. 내일로 볼까요?',
      mapButtons: [],
      cards: [],
      proposal: null,
      answer: null,
      lookup: null,
      refusal: null,
      offers: [
        { kind: 'ask', label: '내일로', text: '내일 아침 7시로 해 줘' },
        { kind: 'ask', label: '오늘 지금부터', text: '오늘 지금부터 해 줘' },
      ],
      noTextFinishReason: null,
    });
    expect(afterRun).not.toHaveBeenCalled();
  });

  it('answers as before when the time named is still to come', async () => {
    model.script(
      { tool: 'askPastTime', input: { named: '저녁 7시', at: '19:00' } },
      { tool: 'draw', input: {} },
      { text: '저녁 7시로 짰어요.' },
    );

    const reply = await runFeature(model.model, FEATURE, asker, WORDS, LIMITS);

    expect(reply).toMatchObject({ text: '저녁 7시로 짰어요.', answer: drawn });
    expect(afterRun).toHaveBeenCalledOnce();
  });
});

// planMeal over a service that plans nothing, as a meal over for today: named, it asks for the whole message; named by
// no time ("배고파" at 21:20, a request for now), its 내일 점심으로 stands beside the reply, and the rest is answered as
// asked.
const noPlans = planMeal({
  restaurantPlaceId: () => null,
  asked: (_askerId, input: MealInput) => Promise.resolve({ input, alreadyIn: [] }),
  planned: (_askerId, input: MealInput) => {
    const answer: AnswerReply = { input, chips: [], plans: [], dropped: [], noPlan: { reason: 'no-fit', lines: [] } };
    return Promise.resolve({ answer, served: new Map() });
  },
});

describe("planMeal's meal over for today", () => {
  it('asks for the whole message when the User named it', async () => {
    const context = contextAt('15:00');

    expect(await noPlans.run({ date: '2026-11-28', meal: 'lunch' }, context)).toMatchObject({ result: 'asked' });
    expect(context.presented.asks?.text).toBe('오늘 점심 시간은 지났어요. 오늘 저녁이나 내일 점심으로 볼까요?');
  });

  it('offers 내일 점심으로 beside the reply when the User named no meal', async () => {
    const context = contextAt('21:20');

    expect(await noPlans.run({ date: '2026-11-28', now: true }, context)).toMatchObject({ result: 'none' });
    expect(context.presented.asks).toBeUndefined();
    expect(context.presented.offers).toEqual([{ kind: 'ask', label: '내일 점심으로', text: '내일 점심으로 해 줘' }]);
  });

  it('answers another request of the message as asked when the User named no meal', async () => {
    const feature: Feature = { ...FEATURE, tools: { ...FEATURE.tools, planMeal: noPlans } };
    model.script(
      { tool: 'draw', input: {} },
      { tool: 'planMeal', input: { date: '2026-11-28', now: true } },
      { text: '공부할 곳이에요. 오늘 식사 시간은 지났어요.' },
    );

    const reply = await runFeature(model.model, feature, { ...asker, now: at('21:20') }, WORDS, LIMITS);

    expect(reply.text).toBe('공부할 곳이에요. 오늘 식사 시간은 지났어요.');
    expect(reply.answers?.[0]).toBe(drawn);
    expect(reply.offers).toEqual([{ kind: 'ask', label: '내일 점심으로', text: '내일 점심으로 해 줘' }]);
  });
});
