/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput, type PersonConstraint } from '../src/assistant/dto/answer.dto.js';
import { REDIS } from '../src/common/redis.module.js';
import { keptButHidden, keptPositionIn } from './location-sharing.js';
import { MealPlanStage, type Named, planMeal, resolve } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// The recalculation of a meal's plan from its input, at POST /assistant/answers over the started server with the
// scripted model, the seed's walking table, and Places: the design's worked example (a Tuesday at 11:50) under what the
// User fixed, without the model and without counting the User's messages, and its refusals.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({ answer: z.custom<AnswerReply>() });

const answerIn = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

function recalculate(body: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send(
    body,
  );
}

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

const summary = ({ plans }: AnswerReply): string[] =>
  plans.map(({ id, startAt, endAt, togetherMinutes }) => `${id} ${startAt}–${endAt} (${togetherMinutes})`);

// The asker of the worked example and 민수: Classes in 301동 until 11:50 and in 24동 from 13:00, and in 302동 until 12:15.
async function withMinsu(date: string): Promise<Named> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '11:00', '12:15', '302');
  return friend;
}

const inputOf = (date: string, friendIds: string[], more: Partial<MealInput> = {}): MealInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: [stage.asker.id, ...friendIds].map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
  ...more,
});

describe('The input of an answer of the Assistant, posted back unchanged', () => {
  it('gives the same answer, and the model is not called', async () => {
    const date = '2087-04-01';
    const friend = await withMinsu(date);
    const asked = await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '…' }]);
    const { answer } = replySchema.parse(asked.body);
    stage.model.script();

    const response = await recalculate({ input: answer.input, location: null });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(answer);
    expect(stage.model.received()).toEqual([]);
  });
});

describe('What the User fixed', () => {
  it('narrows the window, the plans starting no earlier than its start', async () => {
    const date = '2087-04-08';
    const time = timeOn(date);
    const friend = await withMinsu(date);

    const response = await recalculate({
      input: inputOf(date, [friend.id], { window: { from: '12:40', until: null } }),
    });

    expect(response.status).toBe(200);
    expect(summary(answerIn(response.body))).toEqual([
      `학생회관식당 ${time('12:40')}–${time('12:59')} (19)`,
      `자하연식당 2층 ${time('12:40')}–${time('12:55')} (15)`,
    ]);
  });

  it('plans only at the fixed Place, and says so when nothing is open there', async () => {
    const date = '2087-04-15';
    const friend = await withMinsu(date);
    const [studentCenter, science] = [await stage.numbered('63'), await stage.numbered('24')];

    const there = await recalculate({ input: inputOf(date, [friend.id], { placeId: studentCenter.id }) });
    const nowhere = await recalculate({ input: inputOf(date, [friend.id], { placeId: science.id }) });

    expect(answerIn(there.body).plans.map(({ id }) => id)).toEqual(['학생회관식당']);
    expect(answerIn(nowhere.body).noPlan).toEqual({
      reason: 'no-fit',
      lines: [[{ text: '그곳에는 여는 식당이 없어요', strong: false }]],
    });
  });

  it('moves when a person is ready by their constraint: 민수 at 12:20', async () => {
    const date = '2087-04-22';
    const time = timeOn(date);
    const friend = await withMinsu(date);
    const input = inputOf(date, [friend.id]);
    input.people[1] = {
      userId: friend.id,
      constraints: [{ kind: 'notBefore', time: '12:20', source: 'asker' }],
    };

    const response = await recalculate({ input });

    expect(summary(answerIn(response.body))).toContain(`302동식당 ${time('12:20')}–${time('12:43')} (23)`);
  });
});

// 민수, and 지은 with Classes in 8동 until 12:15 and from 13:00.
async function withBoth(date: string): Promise<string[]> {
  const minsu = await withMinsu(date);
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '11:00', '12:15', '8');
  await stage.classAt(jieun, '13:00', '14:15', '8');
  return [minsu.id, jieun.id];
}

describe('"여기면 어때?": a Place pressed during the Plan with 민수 and 지은', () => {
  // 민수 takes the shuttle, 16 minutes against 19 on foot by way of 301동, so nobody meets on the way (P05 ticket 39).
  it("a7: plans 자하연식당 with each person's earliest arrival, 나 12:07, 민수 12:31, 지은 12:18", async () => {
    const date = '2088-07-20';
    const time = timeOn(date);
    const friendIds = await withBoth(date);
    const jahayeon = await stage.numbered('109');

    const response = await recalculate({ input: inputOf(date, friendIds, { placeId: jahayeon.id }) });

    expect(response.status).toBe(200);
    const [plan] = answerIn(response.body).plans;
    expect(plan).toMatchObject({
      id: '자하연식당 2층',
      startAt: time('12:31'),
      endAt: time('12:55'),
      togetherMinutes: 24,
    });
    expect(plan?.parts.map(({ arriveAt }) => arriveAt)).toEqual([time('12:07'), time('12:31'), time('12:18')]);
  });

  it("a8: drops 301동식당 with each person's part, and names 지은, who stays shortest, and why", async () => {
    const date = '2088-07-27';
    const time = timeOn(date);
    const friendIds = await withBoth(date);
    const place301 = await stage.numbered('301');

    const response = await recalculate({ input: inputOf(date, friendIds, { placeId: place301.id }) });

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.plans).toEqual([]);
    expect(answer.dropped.map(({ place, parts }) => [place.label, parts?.map(({ arriveAt }) => arriveAt)])).toEqual([
      ['301동식당', [time('11:50'), time('12:18'), time('12:31')]],
    ]);
    expect(answer.noPlan).toEqual({
      reason: 'no-fit',
      lines: [
        [{ text: '지은은 12:31에 도착해 13분만 먹어요', strong: false }],
        [{ text: '13:00 수업에 가려면 12:44엔 나서야 해요', strong: false }],
      ],
    });
  });
});

describe('A Friend the Friend view puts at the Timetable, whose position is kept', () => {
  it('is recalculated from their Timetable alone, and the reply holds nothing of the position', async () => {
    const date = '2088-07-13';
    const friend = await withMinsu(date);
    await keptButHidden(stage.app, stage.asker, friend);

    const response = await recalculate({ input: inputOf(date, [friend.id]), location: null });

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.plans.length).toBeGreaterThan(0);
    for (const plan of answer.plans) {
      expect(plan.parts[1]?.origin).toMatchObject({ basis: 'timetable', place: { label: '302동' } });
      expect(plan.scene.people.find(({ userId }) => userId === friend.id)?.source ?? 'timetable').toBe('timetable');
    }
    expect(keptPositionIn(response.body)).toEqual([]);
  });
});

describe("The User's daily messages", () => {
  it('are not counted, and a User past the limit still gets an answer', async () => {
    const date = '2087-04-29';
    const friend = await withMinsu(date);
    const redis = stage.app.get<Redis>(REDIS);
    const key = `assistant:messages:${stage.asker.id}:${date}`;
    await redis.set(key, '1000');

    const response = await recalculate({ input: inputOf(date, [friend.id]) });

    expect(response.status).toBe(200);
    expect(await redis.get(key)).toBe('1000');
    await redis.del(key);
  });
});

// A study plan's input (P10 ticket 02) is taken, as a request's context will carry it; its answer comes with P10 ticket
// 03, and until then a recalculation of it is refused with 422, never a failure of the server.
describe("A study plan's input", () => {
  beforeAll(async () => {
    await stage.asking('2087-01-07', '11:50');
  });

  it('is refused with 422 until study plans are answered', async () => {
    const response = await recalculate({
      input: {
        kind: 'study',
        date: '2087-01-07',
        what: 'quiet',
        people: [{ userId: stage.asker.id, constraints: [] }],
        window: { from: null, until: null },
        area: null,
        minutes: null,
        chosen: { seatSpaceId: null, roomSpaceId: null },
      },
      location: null,
    });

    expect(response.status).toBe(422);
  });
});

describe('Refused with 400', () => {
  const date = '2087-05-06';
  let friend: Named;
  let stranger: Named;

  beforeAll(async () => {
    friend = await withMinsu(date);
    const asker = stage.asker;
    await stage.asking(date, '11:50', '낯선 사람');
    stranger = stage.asker;
    stage.asker = asker;
  });

  const constrained = (constraint: PersonConstraint): MealInput => {
    const input = inputOf(date, [friend.id]);
    input.people[1] = { userId: friend.id, constraints: [constraint] };
    return input;
  };

  it.each<[string, () => object]>([
    ['a body of another shape', (): object => ({ input: inputOf(date, [friend.id]), extra: true })],
    ['a body without the input', (): object => ({ location: null })],
    [
      'an input whose first person is not the asker',
      (): object => ({ input: { ...inputOf(date, []), people: [{ userId: friend.id, constraints: [] }] } }),
    ],
    ['a person who is not the asker’s Friend', (): object => ({ input: inputOf(date, [stranger.id]) })],
    ['the same User twice', (): object => ({ input: inputOf(date, [friend.id, friend.id]) })],
    ['a date before today', (): object => ({ input: inputOf('2087-05-05', [friend.id]) })],
    ['a date more than a week ahead', (): object => ({ input: inputOf('2087-05-14', [friend.id]) })],
    [
      'a constraint the person set',
      (): object => ({ input: constrained({ kind: 'notBefore', time: '12:20', source: 'person' }) }),
    ],
    [
      'an unknown Place to set out from',
      (): object => ({ input: constrained({ kind: 'from', placeId: randomUUID(), source: 'asker' }) }),
    ],
    ['an unknown fixed Place', (): object => ({ input: inputOf(date, [friend.id], { placeId: randomUUID() }) })],
  ])('%s', async (_, body) => {
    stage.model.script();

    const response = await recalculate(body());

    expect(response.status).toBe(400);
    expect(stage.model.received()).toEqual([]);
  });
});

describe('A window whose start is not before its end, refused with 400', () => {
  const date = '2087-05-13';

  beforeAll(() => stage.asking(date, '11:50'));

  it.each([
    ['12:30', '12:30'],
    ['13:00', '12:30'],
  ])('from %s until %s', async (from, until) => {
    stage.model.script();

    const response = await recalculate({ input: inputOf(date, [], { window: { from, until } }) });

    expect(response.status).toBe(400);
    expect(stage.model.received()).toEqual([]);
  });
});
