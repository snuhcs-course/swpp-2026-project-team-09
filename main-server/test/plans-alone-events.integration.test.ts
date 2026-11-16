/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type GlobalEvent, type PrismaClient } from '../src/generated/prisma/client.js';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { ALONE_CAPACITY } from '../src/quests/quests.service.js';
import { readExample, travel } from './events-example.js';
import { MealPlanStage } from './meal-plan.js';
import { recalculate } from './plan-answers.js';
import { makePlanQuest } from './plan-quests.js';
import { connectToDatabase, getQuests, getRecruitingQuests, storeEvent, storeSharedQuest } from './quests.js';
import { refused } from './signals.js';
import { withAccessToken } from './sign-in.js';

// "여기로" for an event (P03 ticket 15): an events Plan taken alone at POST /plans over the started server with the
// seed's walking table, the design's shuttle, and Places: the design's worked example (section 6.3, a Friday at 13:50,
// Alone 2 and 3), taking an event again, a Shared Quest held for it, and what another User reads. Each test stands on a
// Friday of January or February 2075, which no other file uses.

const stage = new MealPlanStage(travel);
let prisma: PrismaClient;
const stored: string[] = [];

beforeAll(async () => {
  await readExample();
  await stage.start();
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.quest.deleteMany({ where: { globalEventId: { in: stored } } });
  await prisma.globalEvent.deleteMany({ where: { id: { in: stored } } });
  await prisma.$disconnect();
  await stage.stop();
});

const takenSchema = z.object({
  quest: z.custom<QuestDto>(),
  alone: z.object({ lines: z.array(z.array(z.object({ text: z.string() }))), remindAt: z.string().nullable() }),
});

const rowsSchema = z.array(z.object({ kind: z.string(), line: z.string(), url: z.string() }));

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

const words = (lines: { text: string }[][]): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

async function eventAt(
  date: string,
  title: string,
  [start, end]: [string, string | null],
  [number, place]: [string, string],
): Promise<GlobalEvent> {
  const { latitude, longitude } = await stage.numbered(number);
  const time = timeOn(date);
  const event = await storeEvent(prisma, {
    title,
    startsAt: new Date(time(start)),
    endsAt: end === null ? null : new Date(time(end)),
    place,
    latitude,
    longitude,
  });
  stored.push(event.id);
  return event;
}

// The asker of the worked example, with Classes in 24동 until 13:50 and in 301동 from 15:30 to 16:45, the job fair, and
// the concert.
async function workedExample(date: string): Promise<{ jobFair: GlobalEvent; concert: GlobalEvent }> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const jobFair = await eventAt(date, '채용박람회', ['10:00', '17:00'], ['73', '문화관']);
  const concert = await eventAt(date, '동아리 정기공연', ['18:00', null], ['67', '두레문예관']);
  return { jobFair, concert };
}

// The event's Plan as the events answer gives it, taken alone.
async function take(date: string, event: GlobalEvent): Promise<request.Response> {
  const input = { kind: 'events', date, eventIds: null };
  const { plans } = z.custom<AnswerReply>().parse((await recalculate(stage, input)).body);
  const plan = plans.find(({ id }) => id === event.id);
  if (plan === undefined) {
    throw new Error(`The events answer has no Plan of ${event.title}`);
  }
  return makePlanQuest(stage, { input, planId: plan.id, startAt: plan.startAt, location: null });
}

async function leaveBys(): Promise<z.infer<typeof rowsSchema>> {
  const response = await withAccessToken(
    request(stage.app.getHttpServer()).get('/notifications'),
    stage.asker.accessToken,
  );
  return rowsSchema.parse(response.body).filter(({ kind }) => kind === 'leave-by');
}

async function held(): Promise<QuestDto[]> {
  const quests = z.array(z.custom<QuestDto>()).parse((await getQuests(stage.app, stage.asker)).body);
  return quests.filter(({ classQuest }) => !classQuest);
}

// Partitions: an event under way left for the next Class, and one later in the day reached by shuttle. Expected values:
// the design's 6.3 Alone 2 and 3 (15:30 minus 18 minutes on foot from 문화관 to 301동; the concert by shuttle at 17:42).
describe('"여기로" on an events Plan', () => {
  it('makes the job fair a Quest held alone for it, and keeps the leave-by for 15:12 to the Class (Alone 3)', async () => {
    const date = '2075-01-04';
    const { jobFair } = await workedExample(date);

    const response = await take(date, jobFair);

    expect(response.status).toBe(201);
    const { quest, alone } = takenSchema.parse(response.body);
    expect(quest).toMatchObject({
      title: '채용박람회',
      globalEvent: { id: jobFair.id },
      capacity: ALONE_CAPACITY,
      joinPolicy: 'closed',
      board: null,
      holders: [{ id: stage.asker.id }],
    });
    expect(words(alone.lines)).toEqual(['채용박람회에 가요', '15:12에 나설 시각을 알려 드릴게요']);
    expect(alone.remindAt).toBe(new Date(timeOn(date)('15:12')).toISOString());
    expect(await leaveBys()).toEqual([
      { kind: 'leave-by', line: '301동까지 걸어서 18분', url: `/main?card=party:${quest.id}` },
    ]);
  });

  it('keeps the leave-by for the concert when to set out by shuttle, at 17:42 (Alone 2)', async () => {
    const date = '2075-01-11';
    const { concert } = await workedExample(date);

    const response = await take(date, concert);

    expect(response.status).toBe(201);
    const { quest, alone } = takenSchema.parse(response.body);
    expect(words(alone.lines)).toEqual(['동아리 정기공연에 가요', '17:42에 나설 시각을 알려 드릴게요']);
    expect(await leaveBys()).toEqual([
      { kind: 'leave-by', line: '두레문예관까지 셔틀로 18분', url: `/main?card=party:${quest.id}` },
    ]);
  });
});

// Partitions: the event taken alone already, and a Shared Quest held for it. Expected values: the one-Quest rule for a
// Global Event.
describe('an event taken alone again', () => {
  it('replaces the Quest held alone for it, with its leave-by', async () => {
    const date = '2075-01-18';
    const { jobFair } = await workedExample(date);
    await take(date, jobFair);

    const response = await take(date, jobFair);

    expect(response.status).toBe(201);
    const { quest } = takenSchema.parse(response.body);
    expect((await held()).map(({ id }) => id)).toEqual([quest.id]);
    expect((await leaveBys()).map(({ url }) => url)).toEqual([`/main?card=party:${quest.id}`]);
  });

  it('is refused with 409 SHARED_QUEST_HELD while the asker holds a 파티 for it', async () => {
    const date = '2075-01-25';
    const { jobFair } = await workedExample(date);
    const friend = await stage.friend('민수');
    await storeSharedQuest(prisma, jobFair, [friend.id, stage.asker.id]);

    const response = await take(date, jobFair);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
  });
});

// Expected values: the asker's Quest held alone is not in it.
describe('an event taken alone, as others read it', () => {
  it('is in no recruiting list of the event a Friend reads', async () => {
    const date = '2075-02-01';
    const { jobFair } = await workedExample(date);
    const friend = await stage.friend('민수');
    const { quest } = takenSchema.parse((await take(date, jobFair)).body);

    const response = await getRecruitingQuests(stage.app, friend, jobFair.id);

    expect(response.status).toBe(200);
    expect(
      z
        .array(z.object({ id: z.string() }))
        .parse(response.body)
        .map(({ id }) => id),
    ).not.toContain(quest.id);
  });
});

// Expected values: 지은, going alone and free from 13:50, offered as a candidate.
describe('a Friend who took an event alone', () => {
  it('is among the candidates of a new party for it', async () => {
    const date = '2075-02-08';
    const { jobFair } = await workedExample(date);
    const jieun = await stage.friend('지은');
    await stage.classAt(jieun, '13:00', '13:50', '38', 'friday');
    await prisma.quest.create({
      data: {
        title: jobFair.title,
        globalEventId: jobFair.id,
        leaderId: jieun.id,
        capacity: ALONE_CAPACITY,
        holders: { create: { userId: jieun.id, globalEventId: jobFair.id } },
        subQuests: { create: { attending: true } },
      },
    });

    const people = [{ userId: stage.asker.id, constraints: [] }];
    const input = {
      kind: 'new-quest',
      date,
      globalEventId: jobFair.id,
      title: null,
      placeId: null,
      time: null,
      people,
    };
    const response = await recalculate(stage, input);

    expect(response.status).toBe(200);
    const { plans } = z.custom<AnswerReply>().parse(response.body);
    expect(plans[0]?.candidates?.map(({ userId }) => userId)).toEqual([jieun.id]);
  });
});
