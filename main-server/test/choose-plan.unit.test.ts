/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { runFeature } from '../src/assistant/adapter.js';
import {
  type AnswerReply,
  NO_CONTEXT,
  type Plan,
  type PlanInput,
  type RequestContext,
  requestContextSchema,
} from '../src/assistant/dto/answer.dto.js';
import {
  type ClientCapability,
  defineTool,
  type Feature,
  type Request,
  type ToolContext,
} from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { choosePlan } from '../src/assistant/gathering/choose-plan.js';
import { replyBody } from '../src/assistant/reply-body.js';
import { ScriptedModel } from './scripted-model.js';

// A plan of the meal answer on screen chosen in words (P05 ticket 51). On the user's phone (2026-11-26), "2번으로 할게"
// over a dinner answer of six places was planned again at 예술계식당 alone, a new answer numbered 1. Expected values:
// the plan at that number or name in the list the app sends, which the reply asks the app to show.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const MEAL: PlanInput = {
  kind: 'meal',
  date: '2027-03-02',
  meal: 'dinner',
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
};

const LISTED = ['학생회관식당', '예술계식당', '두레미담', '아워홈(901동)', '자하연식당 2층', '자하연식당 3층'];

const ON_SCREEN: RequestContext = { ...NO_CONTEXT, conditions: MEAL, planId: '학생회관식당', planIds: LISTED };

// A plan at that Restaurant: only its id is read here.
const planAt = (id: string): Plan => ({
  id,
  title: `${id}에서 저녁`,
  place: { placeId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', label: id, latitude: 0, longitude: 0 },
  startAt: '2027-03-02T17:30:00+09:00',
  endAt: '2027-03-02T18:30:00+09:00',
  togetherMinutes: 60,
  meeting: null,
  parts: [],
  subQuests: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: {
    range: { startAt: '2027-03-02T17:00:00+09:00', endAt: '2027-03-02T19:00:00+09:00' },
    now: '2027-03-02T16:47:00+09:00',
    lanes: [],
    startAt: '2027-03-02T17:30:00+09:00',
    endAt: '2027-03-02T18:30:00+09:00',
    text: '17:30–18:30 · 식사 60분',
  },
});

// The answer a planMeal of the same message drew: the dish's Restaurants first, or the plans with a Friend added.
const answerOf = (ids: readonly string[]): AnswerReply => ({
  input: MEAL,
  chips: [],
  plans: ids.map((id) => planAt(id)),
  dropped: [],
  noPlan: null,
});

function contextOf(context: RequestContext): ToolContext {
  return {
    userId: ME,
    now: new Date('2027-03-02T16:47:00+09:00'),
    context,
    capabilities: new Set<ClientCapability>(['answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

async function chosen(
  input: { number?: number; restaurant?: string },
  context = ON_SCREEN,
  drawn: AnswerReply | null = null,
): Promise<{ result: unknown; select: string | undefined }> {
  const toolContext = contextOf(context);
  toolContext.presented.answer = drawn;
  const result = await choosePlan().run(input, toolContext);
  return { result, select: toolContext.presented.select };
}

// Partitions: by number, inside and past the list; by name, exact, part of a listed name, holding one, several, and
// none; a list not sent, by an app before it, and an answer on screen that is not a meal's.
describe('A plan chosen in words', () => {
  it('is the plan at that number in the list', async () => {
    expect(await chosen({ number: 2 })).toEqual({
      result: { result: 'chosen', number: 2, restaurant: '예술계식당' },
      select: '예술계식당',
    });
  });

  it.each([
    ['두레미담', '두레미담', 3],
    ['아워홈', '아워홈(901동)', 4],
    ['학생회관 식당', '학생회관식당', 1],
  ])('is the plan whose name the words give: %s', async (words, restaurant, number) => {
    expect(await chosen({ restaurant: words })).toEqual({
      result: { result: 'chosen', number, restaurant },
      select: restaurant,
    });
  });

  it('asks which when the words name several', async () => {
    expect(await chosen({ restaurant: '자하연' })).toEqual({
      result: { result: 'several', restaurants: ['자하연식당 2층', '자하연식당 3층'] },
      select: undefined,
    });
  });

  it('says how many are listed for a number past the list', async () => {
    expect(await chosen({ number: 7 })).toEqual({ result: { result: 'none', listed: 6 }, select: undefined });
  });

  it('says a place is not listed when no plan has its name', async () => {
    expect(await chosen({ restaurant: '감골식당' })).toEqual({ result: { result: 'notListed' }, select: undefined });
  });

  it('sends the model to planMeal when the app sent no list, or no meal is on screen', async () => {
    const before = await chosen({ number: 2 }, { ...ON_SCREEN, planIds: undefined });
    const noMeal = await chosen({ number: 2 }, { ...NO_CONTEXT, planIds: LISTED });

    expect(before).toMatchObject({ result: { result: 'none', listed: 0 }, select: undefined });
    expect(noMeal).toMatchObject({ result: { result: 'none', listed: 0 }, select: undefined });
  });
});

// TaeHyun79's review of PR 596: a dish picked from the plans' menus runs planMeal, then choosePlan; and "2번으로 하고
// 지은이도 불러 줘" chooses with a change. The choice is then of the new answer, which the app opens at it.
describe('A plan chosen after a planMeal of the same message', () => {
  const drawn = answerOf(['두레미담', '학생회관식당', '예술계식당']);

  it('is chosen by name among the plans it drew', async () => {
    expect(await chosen({ restaurant: '두레미담' }, ON_SCREEN, drawn)).toEqual({
      result: { result: 'chosen', number: 1, restaurant: '두레미담' },
      select: '두레미담',
    });
  });

  it('is chosen by the number on screen when the plans it drew hold that place', async () => {
    expect(await chosen({ number: 2 }, ON_SCREEN, drawn)).toEqual({
      result: { result: 'chosen', number: 3, restaurant: '예술계식당' },
      select: '예술계식당',
    });
  });

  it('is not listed when the plans it drew do not hold that place', async () => {
    expect(await chosen({ number: 4 }, ON_SCREEN, drawn)).toEqual({
      result: { result: 'notListed' },
      select: undefined,
    });
  });
});

const model = new ScriptedModel();
const FEATURE: Feature = { instructions: 'test', tools: { choosePlan: choosePlan() } };
const LIMITS = { maxSteps: 4, timeoutMs: 5000, maxOutputTokens: 1000 };
const asker: Request = { userId: ME, now: new Date(), capabilities: ['answer'], context: ON_SCREEN };
const ask = [{ role: 'user' as const, text: '2번으로 할게' }];

// A planMeal that draws the dish's Restaurants first.
const PLANNING: Feature = {
  instructions: 'test',
  tools: {
    planMeal: defineTool({
      description: 'Plans a meal.',
      input: z.object({}),
      run: (_, { presented }) => {
        presented.answer = answerOf(['두레미담', '학생회관식당', '예술계식당']);
        return Promise.resolve({ result: 'planned' });
      },
    }),
    choosePlan: choosePlan(),
  },
};

describe('A reply that chooses a plan in words', () => {
  it('draws no answer of its own and carries the plan chosen', async () => {
    model.script({ tool: 'choosePlan', input: { number: 2 } }, { text: '2번 예술계식당으로 골랐어요.' });

    const reply = await runFeature(model.model, FEATURE, asker, ask, LIMITS);

    expect(reply).toMatchObject({ text: '2번 예술계식당으로 골랐어요.', answer: null, select: '예술계식당' });
  });

  it('carries the new answer and the plan chosen in it when planMeal ran first', async () => {
    model.script(
      { tool: 'planMeal', input: {} },
      { tool: 'choosePlan', input: { restaurant: '두레미담' } },
      { text: '' },
    );

    const reply = await runFeature(model.model, PLANNING, asker, [{ role: 'user', text: '돈까스 먹고 싶어' }], LIMITS);

    expect(reply).toMatchObject({ text: '두레미담으로 골랐어요.', select: '두레미담' });
    expect(replyBody(reply)).toMatchObject({
      answer: { plans: [{ id: '두레미담' }, {}, {}] },
      select: { planId: '두레미담' },
    });
  });

  it('says its one sentence when the model wrote none', async () => {
    model.script({ tool: 'choosePlan', input: { number: 2 } }, { text: '' });

    const reply = await runFeature(model.model, FEATURE, asker, ask, LIMITS);

    expect(reply).toMatchObject({ text: '예술계식당으로 골랐어요.', select: '예술계식당' });
  });
});

// What the app gets: the plan chosen, beside no answer of the reply's own. An app before ticket 51 reads the words alone.
describe("The reply's plan chosen on the wire", () => {
  const reply = {
    text: '2번 예술계식당으로 골랐어요.',
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: null,
    lookup: null,
    refusal: null,
    noTextFinishReason: null,
  };

  it('is the plan chosen', () => {
    expect(replyBody({ ...reply, select: '예술계식당' })).toMatchObject({ select: { planId: '예술계식당' } });
  });

  it("is kept beside the reply's own answer that holds it, which the app opens at it", () => {
    const answer = answerOf(['두레미담', '예술계식당']);

    expect(replyBody({ ...reply, answer, select: '예술계식당' })).toMatchObject({ select: { planId: '예술계식당' } });
  });

  it("is left out of a reply with none, and beside the reply's own answer that does not hold it", () => {
    const answer = answerOf(['두레미담']);

    expect(replyBody(reply)).not.toHaveProperty('select');
    expect(replyBody({ ...reply, answer, select: '예술계식당' })).not.toHaveProperty('select');
  });
});

// TaeHyun79's review of PR 596: a main server before ticket 51 refuses a context with planIds, since the schema is
// strict. So the app sends them only over a meal answer that says `choosable`, which only a main server that takes
// them sends.
describe('A request context with planIds', () => {
  const sent = { conditions: MEAL, planId: '학생회관식당', planIds: LISTED };

  it('is refused by the schema of a main server before them', () => {
    const before = requestContextSchema.omit({ planIds: true });

    expect(before.safeParse(sent).success).toBe(false);
    expect(before.safeParse({ conditions: MEAL, planId: '학생회관식당' }).success).toBe(true);
  });

  it('is taken by this one', () => {
    expect(requestContextSchema.parse(sent)).toMatchObject({ planIds: LISTED });
  });
});
