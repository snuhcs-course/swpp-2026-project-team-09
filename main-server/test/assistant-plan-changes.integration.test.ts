/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type PersonConstraint, type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A Plan changed from words, at the Assistant's endpoint with the scripted model, the seed's walking table, and Places:
// the design's worked example (a Tuesday at 11:50) under an end, a start, or a Place the User fixed, a person's
// constraint kept from the conditions on screen, the ids on screen or tapped, the lines the model reads, and the
// refusals.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

const summary = ({ plans }: AnswerReply): string[] =>
  plans.map(({ id, startAt, endAt, togetherMinutes }) => `${id} ${startAt}–${endAt} (${togetherMinutes})`);

const planMeal = (date: string, friendIds: string[], more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds, ...more },
});

async function workedExample(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

async function minsu(): Promise<Named> {
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '11:00', '12:15', '302');
  return friend;
}

async function jieun(): Promise<Named> {
  const friend = await stage.friend('지은');
  await stage.classAt(friend, '11:00', '12:15', '8');
  await stage.classAt(friend, '13:00', '14:15', '8');
  return friend;
}

// The conditions on screen of a lunch with these Friends, each with the constraints given.
function conditions(date: string, friends: { userId: string; constraints?: PersonConstraint[] }[]): PlanInput {
  return {
    kind: 'meal',
    date,
    meal: 'lunch',
    people: [{ userId: stage.asker.id }, ...friends].map(({ userId, constraints = [] }) => ({ userId, constraints })),
    window: { from: null, until: null },
    placeId: null,
  };
}

describe('An end the User fixed', () => {
  it('ends every plan by then, and drops what no longer fits', async () => {
    const date = '2087-03-18';
    const time = timeOn(date);
    await workedExample(date);
    const [first, second] = [await minsu(), await jieun()];

    const response = await stage.send([
      resolve('민수'),
      resolve('지은'),
      planMeal(date, [first.id, second.id], { until: '12:50' }),
      { text: '12:50까지로 바꿨어요.' },
    ]);

    expect(response.status).toBe(200);
    expect(summary(answerIn(response.body))).toEqual([
      `3식당 ${time('12:31')}–${time('12:50')} (19)`,
      `학생회관식당 ${time('12:33')}–${time('12:50')} (17)`,
      `자하연식당 2층 ${time('12:35')}–${time('12:50')} (15)`,
    ]);
  });
});

describe('A start the User fixed', () => {
  it('starts every plan then at the earliest', async () => {
    const date = '2087-03-25';
    const time = timeOn(date);
    await workedExample(date);
    const friend = await minsu();

    const response = await stage.send([
      resolve('민수'),
      planMeal(date, [friend.id], { from: '12:40' }),
      { text: '12:40부터로 바꿨어요.' },
    ]);

    expect(summary(answerIn(response.body))).toEqual([
      `학생회관식당 ${time('12:40')}–${time('12:59')} (19)`,
      `자하연식당 2층 ${time('12:40')}–${time('12:55')} (15)`,
    ]);
  });
});

describe('A Place the User fixed', () => {
  it('plans only its Restaurants', async () => {
    const date = '2087-05-20';
    const time = timeOn(date);
    await workedExample(date);
    const friend = await minsu();
    const { id: placeId } = await stage.numbered('63');

    const response = await stage.send([
      resolve('민수'),
      { tool: 'resolvePlace', input: { words: '학생회관' } },
      planMeal(date, [friend.id], { placeId }),
      { text: '학생회관식당으로 바꿨어요.' },
    ]);

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'one', candidate: { id: placeId } });
    expect(summary(answerIn(response.body))).toEqual([`학생회관식당 ${time('12:33')}–${time('12:59')} (26)`]);
  });
});

describe("A person's constraint on screen", () => {
  const notBefore: PersonConstraint = { kind: 'notBefore', time: '12:20', source: 'asker' };

  it('is kept when the plan on screen is of the same day and meal', async () => {
    const date = '2087-05-27';
    const time = timeOn(date);
    await workedExample(date);
    const friend = await minsu();

    const response = await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '…' }], {
      context: { conditions: conditions(date, [{ userId: friend.id, constraints: [notBefore] }]) },
    });

    expect(summary(answerIn(response.body))[0]).toBe(`302동식당 ${time('12:20')}–${time('12:43')} (23)`);
  });

  it('is not kept when the plan on screen is of another day', async () => {
    const date = '2087-06-24';
    const time = timeOn(date);
    await workedExample(date);
    const friend = await minsu();

    const response = await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '…' }], {
      context: { conditions: conditions('2087-06-25', [{ userId: friend.id, constraints: [notBefore] }]) },
    });

    expect(summary(answerIn(response.body))[0]).toBe(`302동식당 ${time('12:15')}–${time('12:43')} (28)`);
  });
});

const REFUSED = 'No tool returned these ids';

describe('Ids the model did not resolve in this message', () => {
  it('are accepted for a Friend of the conditions on screen, and refused without them', async () => {
    const date = '2087-07-01';
    await workedExample(date);
    const friend = await minsu();

    await stage.send([planMeal(date, [friend.id]), { text: '…' }], {
      context: { conditions: conditions(date, [{ userId: friend.id }]) },
    });
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned' });

    await stage.send([planMeal(date, [friend.id]), { text: '…' }]);
    expect(JSON.stringify(stage.model.toolResults()[0])).toContain(REFUSED);
  });

  it('are accepted for a tapped Friend', async () => {
    const date = '2087-07-08';
    await workedExample(date);
    const friend = await minsu();

    await stage.send([planMeal(date, [friend.id]), { text: '…' }], {
      context: { tapped: { kind: 'friend', userId: friend.id } },
    });

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned' });
  });

  it('are accepted for a tapped Place given as placeId, and refused without the tap', async () => {
    const date = '2087-07-15';
    await workedExample(date);
    const { id: placeId } = await stage.numbered('63');

    await stage.send([planMeal(date, [], { placeId }), { text: '…' }], {
      context: { tapped: { kind: 'place', placeId } },
    });
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned' });

    await stage.send([planMeal(date, [], { placeId }), { text: '…' }]);
    expect(JSON.stringify(stage.model.toolResults()[0])).toContain(REFUSED);
  });
});

describe('The lines of the request context', () => {
  it("follow the User's message the model receives", async () => {
    const date = '2087-07-22';
    await stage.asking(date, '11:50');
    const friend = await stage.friend('민수');
    const { id: placeId } = await stage.numbered('63');

    await stage.send([{ text: '…' }], {
      context: {
        conditions: { ...conditions(date, [{ userId: friend.id }]), window: { from: null, until: '12:30' } },
        planId: '학생회관식당',
        tapped: { kind: 'place', placeId },
      },
    });

    const message = stage.model.received()[0]?.prompt.findLast(({ role }) => role === 'user');
    const text = message?.role === 'user' && message.content[0]?.type === 'text' ? message.content[0].text : '';
    expect(
      text.endsWith(
        `\n\n[Plan on screen: {"plan":"학생회관식당","date":"${date}","meal":"lunch","friendIds":["${friend.id}"],` +
          `"from":null,"until":"12:30","placeId":null}]\n\n[Tapped: place ${placeId}]`,
      ),
    ).toBe(true);
  });
});

describe('A request context whose conditions are not the asker’s', () => {
  it('is refused with 400, and the model is not called', async () => {
    const date = '2087-07-29';
    await stage.asking(date, '11:50');
    const friend = await stage.friend('민수');
    const theirs = { ...conditions(date, []), people: [{ userId: friend.id, constraints: [] }] };

    const response = await stage.send([{ text: '…' }], { context: { conditions: theirs } });

    expect(response.status).toBe(400);
    expect(stage.model.received()).toHaveLength(0);
  });
});

describe('A start not before the end', () => {
  it('goes back to the model as the tool’s error, and nothing is planned', async () => {
    const date = '2087-08-05';
    await workedExample(date);

    const response = await stage.send([planMeal(date, [], { from: '12:40', until: '12:40' }), { text: '…' }]);

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('Expected from before until');
    expect(replySchema.parse(response.body).answer).toBeNull();
  });
});
