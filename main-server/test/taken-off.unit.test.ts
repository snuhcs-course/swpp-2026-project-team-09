/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerReply,
  type MealInput,
  NO_CONTEXT,
  type PlanInput,
  type ReplyStep,
  type RequestContext,
  type StudyInput,
} from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type FeatureReply, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';
import { requestKey } from '../src/assistant/presented.js';
import { refuse } from '../src/assistant/refusals/refusal-tools.js';
import { replyBody } from '../src/assistant/reply-body.js';
import { answersOnScreen, takenOff } from '../src/assistant/taken-off.js';

// Which answers on screen a request that ends with none takes off the map (P05 ticket 79). The main server never sends
// `clears` to an app that says `answers`, so it names the keys of those answers in `withdrawn`. Before, it named none
// for a day out of reach: "내일 점심", then "다다음주 월요일 점심", left tomorrow's plan, its time card and 일정에 넣기
// under the refusal's words, the fault the user saw on 2026-11-26.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const TODAY = '2026-11-26';
const TOMORROW = '2026-11-27';
const OUT_OF_REACH = '2026-12-07';

const meal = (which: MealInput['meal'], date = TOMORROW): MealInput => ({
  kind: 'meal',
  date,
  meal: which,
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
});

const study = (together: boolean): StudyInput => ({
  kind: 'study',
  date: TOMORROW,
  what: 'any',
  people: [{ userId: ME, constraints: [] }],
  together,
  window: { from: null, until: null },
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
  area: null,
});

const LUNCH = meal('lunch');
const DINNER = meal('dinner');
const LUNCH_KEY = requestKey(LUNCH);
const DINNER_KEY = requestKey(DINNER);

// The answers on screen, under the keys the server gave them.
const screen = (...inputs: PlanInput[]): ReadonlyMap<string, PlanInput> =>
  new Map(inputs.map((input) => [requestKey(input), input]));

const stepOf = (key: string): ReplyStep => ({
  kind: 'meal',
  title: key,
  place: null,
  from: null,
  startAt: null,
  endAt: null,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

// Lunch and dinner as the steps of one reply, as an app that says `answers` sends them back.
const STEPS: Pick<RequestContext, 'conditions' | 'answers' | 'steps'> = {
  conditions: DINNER,
  answers: [LUNCH, DINNER],
  steps: [stepOf(LUNCH_KEY), stepOf(DINNER_KEY)],
};

// Partitions: the same request, its day as it may be; another meal; another kind (a study, events);
// breakfast, which no answer is; a study alone or together; a step among others; a refusal plainly not about the plans.
describe('The answers on screen a request that ends with none takes off', () => {
  it.each<[string, Parameters<typeof takenOff>[0], ReadonlyMap<string, PlanInput>, string[]]>([
    ["lunch, on any day, over tomorrow's lunch (A)", { kind: 'meal', meal: 'lunch' }, screen(LUNCH), [LUNCH_KEY]],
    ["dinner, over tomorrow's lunch (B)", { kind: 'meal', meal: 'dinner' }, screen(LUNCH), []],
    ["a study, over tomorrow's lunch", { kind: 'study', together: false }, screen(LUNCH), []],
    ["events, over tomorrow's lunch", { kind: 'events' }, screen(LUNCH), []],
    ["breakfast, over tomorrow's lunch", { kind: 'meal', meal: 'breakfast' }, screen(LUNCH), []],
    ['a study together, over a study alone', { kind: 'study', together: true }, screen(study(false)), []],
    [
      'a study alone, over a study alone',
      { kind: 'study', together: false },
      screen(study(false)),
      [requestKey(study(false))],
    ],
    ['dinner, over lunch and dinner as steps', { kind: 'meal', meal: 'dinner' }, answersOnScreen(STEPS), [DINNER_KEY]],
    [
      'a refusal plainly not about them, over lunch and dinner',
      { kind: 'unrelated' },
      answersOnScreen(STEPS),
      [LUNCH_KEY, DINNER_KEY],
    ],
  ])('%s', (_case, failed, onScreen, expected) => {
    expect(takenOff(failed, onScreen)).toEqual(expected);
  });
});

// Partitions: nothing on screen; one answer open; steps, whose keys stay as the first reply gave them.
describe('The answers on screen', () => {
  it('are none when no answer is open', () => {
    expect([...answersOnScreen(NO_CONTEXT)]).toEqual([]);
  });

  it('are the one open, under the key the server gave it', () => {
    expect([...answersOnScreen({ ...NO_CONTEXT, conditions: LUNCH })]).toEqual([[LUNCH_KEY, LUNCH]]);
  });

  it("are the steps' answers under the keys on screen, even when a recalculation made one another request", () => {
    const changed = { ...STEPS, answers: [LUNCH, meal('lunch', '2026-11-28')] };

    expect([...answersOnScreen(changed).keys()]).toEqual([LUNCH_KEY, DINNER_KEY]);
    expect(takenOff({ kind: 'meal', meal: 'lunch' }, answersOnScreen(changed))).toEqual([LUNCH_KEY, DINNER_KEY]);
  });
});

function contextAt(clock: string, request: RequestContext, capabilities: ClientCapability[]): ToolContext {
  return {
    userId: ME,
    now: new Date(`${TODAY}T${clock}:00+09:00`),
    context: request,
    capabilities: new Set(capabilities),
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

const bodyOf = (context: ToolContext): ReturnType<typeof replyBody> => {
  const reply: FeatureReply = { text: '계획할 수 없어요.', noTextFinishReason: null, ...context.presented };
  return replyBody(reply, undefined, [...context.capabilities]);
};

const ON_SCREEN_LUNCH: RequestContext = { ...NO_CONTEXT, conditions: LUNCH };

// Partitions: a day out of reach (A); a meal over for today, of another request (B) or of the same; a refusal. And an
// app before `answers`.
describe('The reply of a request that ends with none, to an app that says answers', () => {
  it("names tomorrow's lunch for lunch on a day out of reach (A), and sends no clears", async () => {
    const context = contextAt('10:00', ON_SCREEN_LUNCH, ['answer', 'answers']);
    await planning.run({ date: OUT_OF_REACH, meal: 'lunch' }, context);

    const body = bodyOf(context);

    expect(body.withdrawn).toEqual([LUNCH_KEY]);
    expect(body).not.toHaveProperty('clears');
  });

  it("names none of tomorrow's lunch for tonight's dinner, over for today (B)", async () => {
    const context = contextAt('21:30', ON_SCREEN_LUNCH, ['answer', 'answers']);
    await planning.run({ date: TODAY, meal: 'dinner' }, context);

    expect(bodyOf(context).withdrawn ?? []).not.toContain(LUNCH_KEY);
  });

  it("names today's lunch for today's lunch, over for today", async () => {
    const today = meal('lunch', TODAY);
    const context = contextAt('15:00', { ...NO_CONTEXT, conditions: today }, ['answer', 'answers']);
    await planning.run({ date: TODAY, meal: 'lunch' }, context);

    expect(bodyOf(context).withdrawn).toEqual([requestKey(today)]);
  });

  it('names both answers of the steps for a refusal plainly not about them', async () => {
    const context = contextAt('10:00', { ...NO_CONTEXT, ...STEPS }, ['answer', 'answers']);
    const sources = {
      friends: { list: (): Promise<never[]> => Promise.resolve([]) },
      days: { itemsOn: (): Promise<never[]> => Promise.resolve([]) },
      places: { byId: (): null => null, nearTo: (): null => null },
    };
    await refuse(sources).run({ kind: 'off-campus' }, context);

    expect(bodyOf(context).withdrawn).toEqual([LUNCH_KEY, DINNER_KEY]);
  });
});

describe('The reply of a request that ends with none, to an app before answers', () => {
  it('says the plan on screen leaves, as before, and names no key', async () => {
    const context = contextAt('10:00', ON_SCREEN_LUNCH, ['answer']);
    await planning.run({ date: OUT_OF_REACH, meal: 'lunch' }, context);

    const body = bodyOf(context);

    expect(body).toMatchObject({ clears: true });
    expect(body).not.toHaveProperty('withdrawn');
  });
});
