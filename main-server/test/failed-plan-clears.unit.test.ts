/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type FeatureReply, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';
import { refuse } from '../src/assistant/refusals/refusal-tools.js';
import { replyBody } from '../src/assistant/reply-body.js';

// A request for another plan that ends with nothing drawn takes the plan on screen off the map (P05 ticket 55). On the
// user's phone (2026-11-26), "다다음주 월요일 점심" over tomorrow's lunch was refused in words, while the map, the time
// card "내일(금) 점심 11:30–12:30" and 일정에 넣기 of tomorrow's plan stayed under them.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const TODAY = '2026-11-26';

function contextAt(clock: string): ToolContext {
  return {
    userId: ME,
    now: new Date(`${TODAY}T${clock}:00+09:00`),
    context: { ...NO_CONTEXT },
    capabilities: new Set<ClientCapability>(['answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

// planMeal over a service that plans nothing for the input.
const planning = planMeal({
  restaurantPlaceId: () => null,
  asked: (_askerId, input: MealInput) => Promise.resolve({ input, alreadyIn: [] }),
  planned: (_askerId, input: MealInput) => {
    const answer: AnswerReply = { input, chips: [], plans: [], dropped: [], noPlan: { reason: 'no-fit', lines: [] } };
    return Promise.resolve({ answer, served: new Map() });
  },
});

async function clearsAfter(input: object, clock = '10:00'): Promise<boolean> {
  const context = contextAt(clock);
  await planning.run(input, context);
  return context.presented.clears === true;
}

// Partitions: a day past, a day more than a week ahead, breakfast, a meal over for today; and a day in reach, which
// draws its answer.
describe('A meal plan asked that cannot be made', () => {
  it.each([
    ['a day past', { date: '2026-11-25', meal: 'lunch' }, '10:00'],
    ['a day more than a week ahead', { date: '2026-12-07', meal: 'lunch' }, '10:00'],
    ['breakfast', { date: '2026-11-27', meal: 'breakfast' }, '10:00'],
    ['a meal over for today', { date: TODAY, meal: 'lunch' }, '15:00'],
  ])('takes the plan on screen off the map: %s', async (_case, input, clock) => {
    expect(await clearsAfter(input, clock)).toBe(true);
  });

  it('leaves it to the answer drawn for a day in reach', async () => {
    expect(await clearsAfter({ date: '2026-11-27', meal: 'lunch' })).toBe(false);
  });
});

describe('A refusal', () => {
  const sources = {
    friends: { list: (): Promise<never[]> => Promise.resolve([]) },
    days: { itemsOn: (): Promise<never[]> => Promise.resolve([]) },
    places: {
      byId: (): null => null,
      nearTo: (): null => null,
    },
  };

  it.each(['off-campus', 'general-work', 'who-looked', 'not-watched-shuttle'])(
    'of a request plainly not about the plan on screen takes it off the map: %s',
    async (kind) => {
      const context = contextAt('10:00');
      await refuse(sources).run({ kind }, context);

      expect(context.presented.clears).toBe(true);
    },
  );

  // A typo or half a sentence over a plan keeps it, as words alone do (review of PR 612).
  it.each(['vague', 'not-understood'])('of words that are vague or cannot be read keeps the plan: %s', async (kind) => {
    const context = contextAt('10:00');
    await refuse(sources).run({ kind }, context);

    expect(context.presented.refusal).not.toBeNull();
    expect(context.presented.clears).toBeUndefined();
  });
});

describe('The reply the app gets', () => {
  const reply: FeatureReply = {
    text: '다다음주 월요일은 일주일 뒤라 계획할 수 없어요.',
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: null,
    lookup: null,
    refusal: null,
    noTextFinishReason: null,
    clears: true,
  };

  it('says the plan on screen leaves when nothing else is drawn', () => {
    expect(replyBody(reply)).toMatchObject({ clears: true });
  });

  it('leaves it out beside an answer of its own, which takes the screen anyway, and when not set', () => {
    const answer: AnswerReply = {
      input: {
        kind: 'meal',
        date: TODAY,
        meal: 'dinner',
        people: [{ userId: ME, constraints: [] }],
        window: { from: null, until: null },
        placeId: null,
      },
      chips: [],
      plans: [],
      dropped: [],
      noPlan: { reason: 'no-fit', lines: [] },
    };

    expect(replyBody({ ...reply, answer })).not.toHaveProperty('clears');
    expect(replyBody({ ...reply, clears: undefined })).not.toHaveProperty('clears');
  });
});
