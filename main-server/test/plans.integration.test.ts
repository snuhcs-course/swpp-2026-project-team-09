/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { getInvitations } from './quest-recruiting.js';
import { getQuests } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { ANY_STRING, refused, SignalWatcher, signalsWhile } from './signals.js';

// A Plan made into a Quest with its invitations, at POST /plans over the started server with the scripted model, the
// seed's walking table, and Places: the design's worked example (a Tuesday at 11:50) with 민수, and with 민수 and 지은,
// the refusals, and a repeat. Each test stands on a Tuesday of January to March 2088, which no other file uses.

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

const replySchema = z.object({
  quest: z.custom<QuestDto>(),
  invitations: z.array(z.object({ id: z.string(), userId: z.string() })),
});

const instantOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    new Date(`${date}T${clock}:00+09:00`).toISOString();

function makePlanQuest(body: object, key: string = randomUUID()): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/plans'), stage.asker.accessToken)
    .set('Idempotency-Key', key)
    .send(body);
}

// The asker of the worked example: Classes in 301동 until 11:50 and in 24동 from 13:00.
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

const inputOf = (date: string, people: string[]): PlanInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: people.map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
});

// The Quests the User holds, without the day's Class Quests.
async function storedQuests(user: Named): Promise<QuestDto[]> {
  const quests = z.array(z.custom<QuestDto>()).parse((await getQuests(stage.app, user)).body);
  return quests.filter(({ classQuest }) => !classQuest);
}

async function invitedQuestIds(user: Named): Promise<string[]> {
  const listed = z
    .array(z.object({ quest: z.object({ id: z.string() }) }))
    .parse((await getInvitations(stage.app, user)).body);
  return listed.map(({ quest }) => quest.id);
}

const steps = ({ subQuests }: QuestDto): object[] =>
  subQuests.map(({ title, startsAt, endsAt, place }) => ({ title, startsAt, endsAt, placeId: place?.placeId }));

describe('Lunch with 민수 made into a Quest (the worked example)', () => {
  it('makes the Quest of 302동식당 from 12:15 to 12:43, invites 민수, and tells both', async () => {
    const date = '2088-01-06';
    const at = instantOn(date);
    await workedExample(date);
    const friend = await minsu();
    const restaurant = await stage.numbered('302');
    let response: request.Response | undefined;

    const signals = await signalsWhile(stage.app, watcher, 'quests-changed', async () => {
      response = await makePlanQuest({
        input: inputOf(date, [stage.asker.id, friend.id]),
        planId: '302동식당',
        startAt: `${date}T12:15:00+09:00`,
        location: null,
      });
    });

    expect(response?.status).toBe(201);
    const { quest, invitations } = replySchema.parse(response?.body);
    expect(quest).toMatchObject({
      title: '302동식당에서 점심',
      globalEvent: null,
      leader: { id: stage.asker.id, name: '유상', department: '컴퓨터공학부' },
      capacity: 4,
      joinPolicy: 'closed',
      board: null,
      holders: [{ id: stage.asker.id, name: '유상', department: '컴퓨터공학부' }],
      classQuest: false,
    });
    expect(steps(quest)).toEqual([
      { title: '302동식당에서 식사', startsAt: at('12:15'), endsAt: at('12:43'), placeId: restaurant.id },
    ]);
    expect(invitations).toEqual([{ id: ANY_STRING, userId: friend.id }]);
    expect(await storedQuests(stage.asker)).toEqual([quest]);
    expect(await invitedQuestIds(friend)).toEqual([quest.id]);
    expect(signals.filter(({ userIds }) => userIds?.includes(stage.asker.id) === true)).toHaveLength(1);
    expect(signals.filter(({ userIds }) => userIds?.includes(friend.id) === true)).toHaveLength(1);
  });
});

describe('Lunch with 민수 and 지은 made into a Quest (the worked example)', () => {
  it('holds the meeting at 301동 at 12:18 first, then 학생회관식당 from 12:33 to 12:55, and invites both', async () => {
    const date = '2088-01-13';
    const at = instantOn(date);
    await workedExample(date);
    const [first, second] = [await minsu(), await jieun()];
    const [place301, studentCenter] = [await stage.numbered('301'), await stage.numbered('63')];

    const response = await makePlanQuest({
      input: inputOf(date, [stage.asker.id, first.id, second.id]),
      planId: '학생회관식당',
      startAt: `${date}T12:33:00+09:00`,
      location: null,
    });

    expect(response.status).toBe(201);
    const { quest, invitations } = replySchema.parse(response.body);
    expect(quest).toMatchObject({
      title: '학생회관식당에서 점심',
      leader: { id: stage.asker.id },
      capacity: 4,
      joinPolicy: 'closed',
      board: null,
      holders: [{ id: stage.asker.id }],
    });
    expect(steps(quest)).toEqual([
      { title: '유상, 민수: 301동 앞에서 만나기', startsAt: at('12:18'), endsAt: at('12:33'), placeId: place301.id },
      { title: '학생회관식당에서 식사', startsAt: at('12:33'), endsAt: at('12:55'), placeId: studentCenter.id },
    ]);
    expect(invitations).toEqual([
      { id: ANY_STRING, userId: first.id },
      { id: ANY_STRING, userId: second.id },
    ]);
    expect(await invitedQuestIds(first)).toEqual([quest.id]);
    expect(await invitedQuestIds(second)).toEqual([quest.id]);
  });
});

// The asker of the worked example with 민수, and a User who is no Friend of the asker's.
async function refusalStage(date: string): Promise<{ friend: Named; stranger: Named }> {
  await workedExample(date);
  const asker = stage.asker;
  await stage.asking(date, '11:50', '낯선 사람');
  const stranger = stage.asker;
  stage.asker = asker;
  return { friend: await minsu(), stranger };
}

const making = (input: PlanInput, planId: string, startAt: string): object => ({ input, planId, startAt });

describe('Refused with 409 PLAN_CHANGED', () => {
  const date = '2088-01-20';
  let friend: Named;

  beforeAll(async () => {
    ({ friend } = await refusalStage(date));
  });

  it.each<[string, () => object]>([
    [
      'a Plan of an id the recalculation does not have',
      (): object => making(inputOf(date, [stage.asker.id, friend.id]), '없는식당', `${date}T12:15:00+09:00`),
    ],
    [
      'a Plan that starts at another time',
      (): object => making(inputOf(date, [stage.asker.id, friend.id]), '302동식당', `${date}T12:16:00+09:00`),
    ],
  ])('%s', async (_, body) => {
    const response = await makePlanQuest(body());

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PLAN_CHANGED'));
    expect(await storedQuests(stage.asker)).toEqual([]);
  });
});

describe('Refused with 400', () => {
  const date = '2088-02-03';
  let friend: Named;
  let stranger: Named;

  beforeAll(async () => {
    ({ friend, stranger } = await refusalStage(date));
  });

  it('PLAN_ALONE: a Plan with no Friend', async () => {
    const response = await makePlanQuest(
      making(inputOf(date, [stage.asker.id]), '301동식당', `${date}T11:50:00+09:00`),
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, 'PLAN_ALONE'));
    expect(await storedQuests(stage.asker)).toEqual([]);
  });

  it.each<[string, () => object]>([
    [
      'a person who is not the asker’s Friend',
      (): object => making(inputOf(date, [stage.asker.id, stranger.id]), '302동식당', `${date}T12:15:00+09:00`),
    ],
    [
      'a date before today',
      (): object =>
        making(inputOf('2088-02-02', [stage.asker.id, friend.id]), '302동식당', '2088-02-02T12:15:00+09:00'),
    ],
  ])('%s', async (_, body) => {
    const response = await makePlanQuest(body());

    expect(response.status).toBe(400);
    expect(await storedQuests(stage.asker)).toEqual([]);
    expect(await invitedQuestIds(stranger)).toEqual([]);
  });
});

describe('A repeat with the same Idempotency-Key', () => {
  it('answers the same Quest and makes one Quest with one invitation', async () => {
    const date = '2088-01-27';
    await workedExample(date);
    const friend = await minsu();
    const body = {
      input: inputOf(date, [stage.asker.id, friend.id]),
      planId: '302동식당',
      startAt: `${date}T12:15:00+09:00`,
    };
    const key = randomUUID();

    const first = await makePlanQuest(body, key);
    const second = await makePlanQuest(body, key);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const made = replySchema.parse(first.body);
    expect(replySchema.parse(second.body).quest.id).toBe(made.quest.id);
    expect((await storedQuests(stage.asker)).map(({ id }) => id)).toEqual([made.quest.id]);
    expect(await invitedQuestIds(friend)).toEqual([made.quest.id]);
  });
});
