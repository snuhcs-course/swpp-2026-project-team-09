/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type NewQuestInput } from '../src/assistant/dto/answer.dto.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { readExample, travel } from './events-example.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { recalculate } from './plan-answers.js';
import { getInvitations } from './quest-recruiting.js';
import { attend, connectToDatabase, getQuests, joinQuest } from './quests.js';
import { jobFairOn, partyFor, stranger } from './recruiting-parties.js';
import { withAccessToken } from './sign-in.js';
import { ANY_STRING, refused, SignalWatcher, signalsWhile } from './signals.js';

// A new recruiting Quest made at POST /plans over the started server, the seed's walking table with the design's
// shuttle, and Places: the design's row 4 (a Friday at 13:50, the job fair, with 지은) and row 5 (a Thursday at 16:45,
// badminton with 서준), a Quest held alone for the event replaced, a Shared Quest refusing, a Plan that changed, and a
// repeat. Each test works on a Thursday or a Friday of April 2089 that no other file uses.

// The parties are made by their Users through the routes, which takes a few seconds.
vi.setConfig({ testTimeout: 30_000 });

const stage = new MealPlanStage(travel);
let prisma: PrismaClient;
let watcher: SignalWatcher;
const events: string[] = [];

beforeAll(async () => {
  await readExample();
  [watcher] = await Promise.all([SignalWatcher.start(), stage.start()]);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.quest.deleteMany({ where: { globalEventId: { in: events } } });
  await prisma.globalEvent.deleteMany({ where: { id: { in: events } } });
  await prisma.$disconnect();
  await watcher.stop();
  await stage.stop();
});

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

// The making of the first Plan the recalculation answers.
async function makingOf(input: NewQuestInput): Promise<object> {
  const answer = z.custom<AnswerReply>().parse((await recalculate(stage, input).expect(200)).body);
  const [plan] = answer.plans;
  if (plan === undefined) {
    throw new Error(`No plan: ${JSON.stringify(answer.noPlan)}`);
  }
  return { input, planId: plan.id, startAt: plan.startAt, location: null };
}

// The Quests the User holds, without the day's Class Quests.
async function storedQuests(user: Named): Promise<string[]> {
  const quests = z.array(z.custom<QuestDto>()).parse((await getQuests(stage.app, user)).body);
  return quests.filter(({ classQuest }) => !classQuest).map(({ id }) => id);
}

async function invitedQuestIds(user: Named): Promise<string[]> {
  const listed = z
    .array(z.object({ quest: z.object({ id: z.string() }) }))
    .parse((await getInvitations(stage.app, user)).body);
  return listed.map(({ quest }) => quest.id);
}

const steps = ({ subQuests }: QuestDto): object[] =>
  subQuests.map(({ attending, title, startsAt, endsAt, place }) => ({
    attending,
    title,
    startsAt,
    endsAt,
    placeId: place?.placeId ?? null,
  }));

const inputOf = (date: string, more: Partial<NewQuestInput>, friendIds: string[]): NewQuestInput => ({
  kind: 'new-quest',
  date,
  globalEventId: null,
  title: null,
  placeId: null,
  time: null,
  people: [stage.asker.id, ...friendIds].map((userId) => ({ userId, constraints: [] })),
  ...more,
});

// Row 4: the asker with Classes in 24동 until 13:50 and in 301동 from 15:30, 지은 with a Class in 38동 until 13:50, and
// the job fair; its input for a new Quest on the career Board with these Friends.
async function rowFour(date: string): Promise<{ jobFair: string; jieun: Named }> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '13:00', '13:50', '38', 'friday');
  const event = await jobFairOn(stage, prisma, date);
  events.push(event.id);
  return { jobFair: event.id, jieun };
}

const jobFairInput = (date: string, jobFair: string, friendIds: string[]): NewQuestInput =>
  inputOf(date, { globalEventId: jobFair, board: 'career' }, friendIds);

describe('Row 4: the job fair with 지은', () => {
  it('posts the asker’s Open Quest for the event, meeting at 14:10, and invites 지은, telling both', async () => {
    const date = '2089-04-15';
    const at = instantOn(date);
    const { jobFair, jieun } = await rowFour(date);
    const culture = (await stage.numbered('73')).id;
    const making = await makingOf(jobFairInput(date, jobFair, [jieun.id]));
    let response: request.Response | undefined;

    const signals = await signalsWhile(stage.app, watcher, 'quests-changed', async () => {
      response = await makePlanQuest(making);
    });

    expect(response?.status).toBe(201);
    const { quest, invitations } = replySchema.parse(response?.body);
    expect(quest).toMatchObject({
      title: '채용박람회',
      globalEvent: { id: jobFair, title: '채용박람회' },
      leader: { id: stage.asker.id },
      capacity: 4,
      joinPolicy: 'open',
      board: 'career',
      holders: [{ id: stage.asker.id }],
      members: [
        { user: { id: stage.asker.id }, state: 'accepted' },
        { user: { id: jieun.id }, state: 'invited' },
      ],
    });
    const meeting = { attending: false, startsAt: at('14:10'), endsAt: at('15:12'), placeId: culture };
    expect(steps(quest)).toEqual([
      { attending: true, title: '채용박람회', startsAt: at('10:00'), endsAt: at('17:00'), placeId: null },
      { ...meeting, title: '유상, 지은: 문화관 앞에서 만나기' },
      { ...meeting, title: '15:12까지 채용박람회 · 301동으로 나서기' },
    ]);
    expect(invitations).toEqual([{ id: ANY_STRING, userId: jieun.id }]);
    expect(await invitedQuestIds(jieun)).toEqual([quest.id]);
    for (const userId of [stage.asker.id, jieun.id]) {
      expect(signals.filter(({ userIds }) => userIds?.includes(userId) === true)).toHaveLength(1);
    }
  });
});

describe('The asker’s Quest for the job fair', () => {
  it('held alone is replaced by the new one', async () => {
    const date = '2089-04-29';
    const { jobFair } = await rowFour(date);
    const alone = z.object({ id: z.string() }).parse((await attend(stage.app, stage.asker, jobFair).expect(201)).body);

    const response = await makePlanQuest(await makingOf(jobFairInput(date, jobFair, [])));

    expect(response.status).toBe(201);
    const { quest, invitations } = replySchema.parse(response.body);
    expect(invitations).toEqual([]);
    expect(await storedQuests(stage.asker)).toEqual([quest.id]);
    expect(quest.id).not.toBe(alone.id);
  });

  it('shared with others refuses the new one with 409 SHARED_QUEST_HELD', async () => {
    const date = '2089-04-29';
    const { jobFair } = await rowFour(date);
    const making = await makingOf(jobFairInput(date, jobFair, []));
    const event = await prisma.globalEvent.findUniqueOrThrow({ where: { id: jobFair } });
    const leader = await stranger(stage, '하나');
    const shared = await partyFor(stage, event, { leader, title: '같이 가요', meets: [date, '14:30', '73'] });
    await joinQuest(stage.app, stage.asker, shared).expect(201);

    const response = await makePlanQuest(making);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect(await storedQuests(stage.asker)).toEqual([shared]);
  });
});

// Row 5: the asker with a Class in 301동 until 16:45, and 서준 with a Class in 24동 until 16:45; the input of badminton
// at the gymnasium with these Friends.
async function rowFive(date: string): Promise<Named> {
  await stage.asking(date, '16:45');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'thursday');
  const seojun = await stage.friend('서준');
  await stage.classAt(seojun, '15:30', '16:45', '24', 'thursday');
  return seojun;
}

const badmintonInput = async (date: string, friendIds: string[]): Promise<NewQuestInput> =>
  inputOf(date, { title: '배드민턴', placeId: (await stage.numbered('71')).id }, friendIds);

describe('Row 5: badminton with 서준', () => {
  it('posts an Open Quest on the hobby Board at 17:10 at the gymnasium, and invites 서준', async () => {
    const date = '2089-04-14';
    const at = instantOn(date);
    const seojun = await rowFive(date);
    const gym = (await stage.numbered('71')).id;

    const response = await makePlanQuest(await makingOf(await badmintonInput(date, [seojun.id])));

    expect(response.status).toBe(201);
    const { quest, invitations } = replySchema.parse(response.body);
    expect(quest).toMatchObject({
      title: '배드민턴',
      globalEvent: null,
      capacity: 4,
      joinPolicy: 'open',
      board: 'hobby',
      holders: [{ id: stage.asker.id }],
    });
    const step = { attending: false, startsAt: at('17:10'), endsAt: at('17:40'), placeId: gym };
    expect(steps(quest)).toEqual([
      { ...step, title: '유상, 서준: 체육관 앞에서 만나기' },
      { ...step, title: '배드민턴' },
    ]);
    expect(invitations).toEqual([{ id: ANY_STRING, userId: seojun.id }]);
  });

  it('alone is posted with no invitation', async () => {
    const date = '2089-04-28';
    await rowFive(date);

    const response = await makePlanQuest(await makingOf(await badmintonInput(date, [])));

    expect(response.status).toBe(201);
    expect(replySchema.parse(response.body).invitations).toEqual([]);
  });
});

describe('The making refused or repeated', () => {
  it('is refused with 409 PLAN_CHANGED for a Plan that starts at another time, and makes nothing', async () => {
    const date = '2089-04-28';
    const seojun = await rowFive(date);
    const making = await makingOf(await badmintonInput(date, [seojun.id]));

    const response = await makePlanQuest({ ...making, startAt: `${date}T17:20:00+09:00` });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PLAN_CHANGED'));
    expect(await storedQuests(stage.asker)).toEqual([]);
  });

  it('made twice with the same Idempotency-Key makes one Quest with one invitation', async () => {
    const date = '2089-04-14';
    const seojun = await rowFive(date);
    const making = await makingOf(await badmintonInput(date, [seojun.id]));
    const key = randomUUID();

    const first = await makePlanQuest(making, key);
    const second = await makePlanQuest(making, key);

    expect(first.status).toBe(201);
    const made = replySchema.parse(first.body);
    expect(replySchema.parse(second.body).quest.id).toBe(made.quest.id);
    expect(await storedQuests(stage.asker)).toEqual([made.quest.id]);
    expect(await invitedQuestIds(seojun)).toEqual([made.quest.id]);
  });
});
