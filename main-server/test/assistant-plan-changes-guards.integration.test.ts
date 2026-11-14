/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Redis } from 'ioredis';
import { z } from 'zod';
import { type AnswerReply, type PersonConstraint, type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { REDIS } from '../src/common/redis.module.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A Plan changed from words, at the Assistant's endpoint with the scripted model, the seed's walking table, and Places:
// the design's worked example (a Tuesday at 11:50) with a Friend taken out or a constraint kept for the one who stays,
// the ids it refuses, and what an app without answers or a refused context leaves untouched.

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

const planMeal = (date: string, friendIds: string[]): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds },
});

async function workedExample(date: string): Promise<[Named, Named]> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '11:00', '12:15', '8');
  await stage.classAt(jieun, '13:00', '14:15', '8');
  return [minsu, jieun];
}

// A signed-in User of that date who is not the asker's Friend.
async function stranger(date: string): Promise<Named> {
  const asker = stage.asker;
  await stage.asking(date, '11:50', '낯선 사람');
  const user = stage.asker;
  stage.asker = asker;
  return user;
}

// The conditions on screen of a lunch with these people after the asker, each with the constraints given.
function conditions(date: string, others: { userId: string; constraints?: PersonConstraint[] }[]): PlanInput {
  return {
    kind: 'meal',
    date,
    meal: 'lunch',
    people: [{ userId: stage.asker.id }, ...others].map(({ userId, constraints = [] }) => ({ userId, constraints })),
    window: { from: null, until: null },
    placeId: null,
  };
}

describe('A Friend taken out of the Plan on screen', () => {
  it('leaves the plans of the one who stays', async () => {
    const date = '2087-08-12';
    const time = timeOn(date);
    const [minsu, jieun] = await workedExample(date);

    const response = await stage.send([planMeal(date, [jieun.id]), { text: '…' }], {
      context: { conditions: conditions(date, [{ userId: minsu.id }, { userId: jieun.id }]) },
    });

    expect(summary(answerIn(response.body))).toEqual([
      `자하연식당 2층 ${time('12:18')}–${time('12:55')} (37)`,
      `학생회관식당 ${time('12:20')}–${time('12:55')} (35)`,
      `3식당 ${time('12:25')}–${time('12:50')} (25)`,
    ]);
  });
});

describe('A constraint of the Plan on screen', () => {
  it('is kept for the one who stays', async () => {
    const date = '2087-08-19';
    const time = timeOn(date);
    const [minsu, jieun] = await workedExample(date);
    const notBefore: PersonConstraint = { kind: 'notBefore', time: '12:20', source: 'asker' };

    const response = await stage.send([planMeal(date, [minsu.id]), { text: '…' }], {
      context: { conditions: conditions(date, [{ userId: minsu.id, constraints: [notBefore] }, { userId: jieun.id }]) },
    });

    expect(summary(answerIn(response.body))[0]).toBe(`302동식당 ${time('12:20')}–${time('12:43')} (23)`);
  });
});

const NOT_FRIENDS = "Only the asker's Friends can be in a plan";

describe('A User who is not the asker’s Friend', () => {
  it('is refused on screen with the service’s refusal, and nothing is planned', async () => {
    const date = '2087-08-26';
    await workedExample(date);
    const other = await stranger(date);

    const response = await stage.send([planMeal(date, [other.id]), { text: '…' }], {
      context: { conditions: conditions(date, [{ userId: other.id }]) },
    });

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain(NOT_FRIENDS);
    expect(replySchema.parse(response.body).answer).toBeNull();
  });

  it('is refused when tapped with the service’s refusal, and nothing is planned', async () => {
    const date = '2087-09-02';
    await workedExample(date);
    const other = await stranger(date);

    const response = await stage.send([planMeal(date, [other.id]), { text: '…' }], {
      context: { tapped: { kind: 'friend', userId: other.id } },
    });

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain(NOT_FRIENDS);
    expect(replySchema.parse(response.body).answer).toBeNull();
  });
});

describe("The asker's own id among the Friends", () => {
  it('is refused as an id no tool returned, with conditions on screen', async () => {
    const date = '2087-09-09';
    const [minsu] = await workedExample(date);

    await stage.send([planMeal(date, [stage.asker.id]), { text: '…' }], {
      context: { conditions: conditions(date, [{ userId: minsu.id }]) },
    });

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
  });
});

describe('A request context whose conditions start with another User', () => {
  it('does not count the message', async () => {
    const date = '2087-09-16';
    const [minsu] = await workedExample(date);
    const redis = stage.app.get<Redis>(REDIS);
    const key = `assistant:messages:${stage.asker.id}:${date}`;
    await redis.set(key, '3');
    const theirs = { ...conditions(date, []), people: [{ userId: minsu.id, constraints: [] }] };

    const response = await stage.send([{ text: '…' }], { context: { conditions: theirs } });

    expect(response.status).toBe(400);
    expect(stage.model.received()).toHaveLength(0);
    expect(await redis.get(key)).toBe('3');
    await redis.del(key);
  });
});

describe('An app that does not draw answers', () => {
  it('sends the context, and the model reads the User’s message without its lines', async () => {
    const date = '2087-09-23';
    const [minsu] = await workedExample(date);
    const { id: placeId } = await stage.numbered('63');

    await stage.send([{ text: '…' }], {
      clientCapabilities: ['library'],
      context: {
        conditions: conditions(date, [{ userId: minsu.id }]),
        planId: '학생회관식당',
        tapped: { kind: 'place', placeId },
      },
    });

    const message = stage.model.received()[0]?.prompt.findLast(({ role }) => role === 'user');
    const text = message?.role === 'user' && message.content[0]?.type === 'text' ? message.content[0].text : '';
    expect(text).not.toContain('[Plan on screen:');
    expect(text).not.toContain('[Tapped:');
  });
});
