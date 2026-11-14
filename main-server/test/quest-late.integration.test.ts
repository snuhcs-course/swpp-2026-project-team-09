/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { type TestUser } from './friends.js';
import { pointOf } from './invitation-card.js';
import { MealPlanStage, type Named, type Place } from './meal-plan.js';
import { answerInvitation } from './quest-recruiting.js';
import { getQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { refused, type SignalEvent, SignalWatcher, signalsWhile } from './signals.js';

// A late Holder's report at POST /quests/:questId/late over the started server: the Leader makes the worked example's
// lunch with 민수 and 지은 from its Plan (the meeting at 301동 from 12:18, the meal at the Student Center from 12:33),
// and 민수, whose Class in 302동 ends at 12:15, reports. Each test stands on a Tuesday of October 2088, which no other
// file uses, at 11:50.

const stage = new MealPlanStage();
let watcher: SignalWatcher;

beforeAll(async () => {
  [watcher] = await Promise.all([SignalWatcher.start(), stage.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await stage.stop();
});

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

interface Lunch {
  minsu: Named;
  jieun: Named;
  questId: string;
  invitationOf: (user: Named) => string;
}

const inputOf = (date: string, people: string[]): PlanInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: people.map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
});

const madeSchema = z.object({
  quest: z.object({ id: z.string() }),
  invitations: z.array(z.object({ id: z.string(), userId: z.string() })),
});

// The worked example's lunch made into a Quest, with 민수 and 지은 invited.
async function lunchOn(date: string): Promise<Lunch> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '11:00', '12:15', '8');
  await stage.classAt(jieun, '13:00', '14:15', '8');
  const response = await withAccessToken(request(stage.app.getHttpServer()).post('/plans'), stage.asker.accessToken)
    .set('Idempotency-Key', randomUUID())
    .send({
      input: inputOf(date, [stage.asker.id, minsu.id, jieun.id]),
      planId: '학생회관식당',
      startAt: `${date}T12:33:00+09:00`,
      location: null,
    });
  const { quest, invitations } = madeSchema.parse(response.body);
  const invitationOf = (user: Named): string => {
    const found = invitations.find(({ userId }) => userId === user.id);
    if (found === undefined) {
      throw new Error(`${user.name} was not invited`);
    }
    return found.id;
  };
  return { minsu, jieun, questId: quest.id, invitationOf };
}

async function accept(user: Named, lunch: Lunch): Promise<void> {
  const response = await answerInvitation(stage.app, user, lunch.invitationOf(user), 'accept');
  if (response.status !== 201) {
    throw new Error(`Accepting answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

function reportLate(user: TestUser, questId: string, body: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post(`/quests/${questId}/late`), user.accessToken).send(
    body,
  );
}

const ofQuest = (signals: SignalEvent[], questId: string): SignalEvent[] =>
  signals.filter(
    ({ payload }) => typeof payload === 'object' && payload !== null && Reflect.get(payload, 'questId') === questId,
  );

const membersOf = async (user: TestUser, questId: string): Promise<object[]> =>
  z
    .object({ members: z.array(z.object({ user: z.object({ id: z.string() }), state: z.string() }).loose()) })
    .parse((await getQuest(stage.app, user, questId)).body)
    .members.map(({ user: { id }, state, lateMinutes }) => ({ id, state, lateMinutes }));

interface Reported {
  lunch: Lunch;
  reply: request.Response;
  late: SignalEvent[];
  questsChanged: SignalEvent[];
}

// The lunch with both Friends in, and 민수's report of 5 minutes with the signals it sends.
async function fiveLate(date: string): Promise<Reported> {
  const lunch = await lunchOn(date);
  await accept(lunch.minsu, lunch);
  await accept(lunch.jieun, lunch);
  let reply: request.Response | undefined;
  let late: SignalEvent[] = [];
  const questsChanged = await signalsWhile(stage.app, watcher, 'quests-changed', async () => {
    late = await signalsWhile(stage.app, watcher, 'late', async () => {
      reply = await reportLate(lunch.minsu, lunch.questId, { minutes: 5, location: null });
    });
  });
  if (reply === undefined) {
    throw new Error('No reply to the report');
  }
  return { lunch, reply, late, questsChanged };
}

// 민수's way 5 minutes late: out at 12:20 from 302동, straight, 17 minutes, there at 12:37.
const fiveLateWayOf = (date: string, p302: Place): object => ({
  status: 'ok',
  origin: { place: pointOf(p302, '302동'), basis: 'timetable' },
  leaveAt: `${date}T12:20:00+09:00`,
  walkMinutes: 17,
  arriveAt: `${date}T12:37:00+09:00`,
  meeting: null,
  lines: [
    [
      { text: '12:37에야 도착해요.', strong: true },
      { text: ' 걸어서 17분.', strong: false },
    ],
  ],
});

describe('민수, 5 minutes late', () => {
  const date = '2088-10-05';
  let reported: Reported;

  beforeAll(async () => {
    reported = await fiveLate(date);
  });

  it('is answered with his way: out at 12:20, straight, 17 minutes, there at 12:37', async () => {
    expect(reported.reply.status).toBe(200);
    expect(reported.reply.body).toMatchObject(fiveLateWayOf(date, await stage.numbered('302')));
  });

  it('tells the Leader and 지은 the minutes and the arrival, and not 민수', () => {
    const { lunch, late } = reported;
    const told = ofQuest(late, lunch.questId);

    expect(told).toHaveLength(1);
    expect(told[0]?.userIds?.toSorted()).toEqual([stage.asker.id, lunch.jieun.id].toSorted());
    expect(told[0]?.payload).toEqual({
      questId: lunch.questId,
      userId: lunch.minsu.id,
      minutes: 5,
      arriveAt: `${date}T12:37:00+09:00`,
    });
  });

  it('tells every Holder that their Quests changed', () => {
    const { lunch, questsChanged } = reported;
    const told = questsChanged.flatMap(({ userIds }) => userIds ?? []);

    expect(told).toEqual(expect.arrayContaining([stage.asker.id, lunch.minsu.id, lunch.jieun.id]));
  });

  it('lists 민수 as late by 5 minutes among the members', async () => {
    const { lunch } = reported;

    expect(await membersOf(stage.asker, lunch.questId)).toEqual([
      { id: stage.asker.id, state: 'accepted', lateMinutes: null },
      { id: lunch.minsu.id, state: 'late', lateMinutes: 5 },
      { id: lunch.jieun.id, state: 'accepted', lateMinutes: null },
    ]);
  });
});

describe('A second report', () => {
  it('replaces the minutes, and the way follows them', async () => {
    const date = '2088-10-12';
    const lunch = await lunchOn(date);
    await accept(lunch.minsu, lunch);
    await reportLate(lunch.minsu, lunch.questId, { minutes: 5, location: null });

    const second = await reportLate(lunch.minsu, lunch.questId, { minutes: 15, location: null });

    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ leaveAt: `${date}T12:30:00+09:00`, arriveAt: `${date}T12:47:00+09:00` });
    expect(await membersOf(stage.asker, lunch.questId)).toContainEqual({
      id: lunch.minsu.id,
      state: 'late',
      lateMinutes: 15,
    });
  });
});

describe('Refused', () => {
  const date = '2088-10-19';
  let lunch: Lunch;

  beforeAll(async () => {
    lunch = await lunchOn(date);
    await accept(lunch.minsu, lunch);
  });

  it('with 404 for an invited User who has not answered', async () => {
    const response = await reportLate(lunch.jieun, lunch.questId, { minutes: 5, location: null });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect(await membersOf(stage.asker, lunch.questId)).toContainEqual({
      id: lunch.jieun.id,
      state: 'invited',
      lateMinutes: null,
    });
  });

  it.each([
    ['0 minutes', 0],
    ['121 minutes', 121],
    ['1.5 minutes', 1.5],
  ])('with 400 for %s', async (_, minutes) => {
    const response = await reportLate(lunch.minsu, lunch.questId, { minutes, location: null });

    expect(response.status).toBe(400);
    expect(await membersOf(stage.asker, lunch.questId)).toContainEqual({
      id: lunch.minsu.id,
      state: 'accepted',
      lateMinutes: null,
    });
  });
});
