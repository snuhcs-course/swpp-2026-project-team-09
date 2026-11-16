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
import { readExample, travel } from './events-example.js';
import { MealPlanStage } from './meal-plan.js';
import { recalculate } from './plan-answers.js';
import { makePlanQuest } from './plan-quests.js';
import { invite } from './quest-recruiting.js';
import { attend, connectToDatabase, getQuest } from './quests.js';
import { jobFairOn } from './recruiting-parties.js';
import { refused } from './signals.js';
import { withAccessToken } from './sign-in.js';

// What keeps a Quest taken alone apart from a 파티 (P03 ticket 17), over the started server with the seed's walking
// table and the design's job fair (a Friday at 13:50): the party form reaching a Quest taken alone, "여기로" meeting the
// User's own 파티 for the event, and an invitation or a change of settings into a Quest taken alone. Each test stands on
// a Friday of January 2069, which no other file uses.

const stage = new MealPlanStage(travel);
let prisma: PrismaClient;
const events: string[] = [];

beforeAll(async () => {
  await readExample();
  await stage.start();
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.quest.deleteMany({ where: { globalEventId: { in: events } } });
  await prisma.globalEvent.deleteMany({ where: { id: { in: events } } });
  await prisma.$disconnect();
  await stage.stop();
});

const questSchema = z.object({ quest: z.custom<QuestDto>() });

// The asker of the worked example with Classes in 24동 until 13:50 and in 301동 from 15:30, and the job fair.
async function jobFairDay(date: string): Promise<GlobalEvent> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const jobFair = await jobFairOn(stage, prisma, date);
  events.push(jobFair.id);
  return jobFair;
}

// "여기로" on the job fair's Plan of the events answer.
async function takeAlone(date: string, event: GlobalEvent): Promise<request.Response> {
  const input = { kind: 'events', date, eventIds: null };
  const { plans } = z.custom<AnswerReply>().parse((await recalculate(stage, input)).body);
  const plan = plans.find(({ id }) => id === event.id);
  return makePlanQuest(stage, { input, planId: event.id, startAt: plan?.startAt, location: null });
}

async function leaveByCount(): Promise<number> {
  const response = await withAccessToken(
    request(stage.app.getHttpServer()).get('/notifications'),
    stage.asker.accessToken,
  );
  return z
    .array(z.object({ kind: z.string() }))
    .parse(response.body)
    .filter(({ kind }) => kind === 'leave-by').length;
}

function patch(questId: string, body: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).patch(`/quests/${questId}`), stage.asker.accessToken).send(
    body,
  );
}

// Partitions: the party form reaching the Quest taken alone. Expected values: the mark off, the usual capacity, the
// leave-by gone, and the form's settings then taken.
describe('the party form for an event the User took alone', () => {
  it('turns the Quest taken alone into one that gathers others, and its leave-by goes', async () => {
    const jobFair = await jobFairDay('2069-01-04');
    const { quest } = questSchema.parse((await takeAlone('2069-01-04', jobFair)).body);
    expect(await leaveByCount()).toBe(1);

    const attended = await attend(stage.app, stage.asker, jobFair.id);

    expect(attended.status).toBe(201);
    expect(attended.body).toMatchObject({ id: quest.id, takenAlone: false, capacity: 4 });
    expect(await leaveByCount()).toBe(0);
    const posted = await patch(quest.id, { joinPolicy: 'open', board: 'career', description: '같이 가요' });
    expect(posted.status).toBe(200);
  });
});

// Partitions: a 공개 파티 of the User's own for the event that nobody joined yet. Expected values: 409 SHARED_QUEST_HELD,
// and the party stays as it was.
describe('"여기로" on an event the User posted a 파티 for', () => {
  it('is refused, and the 파티 stays', async () => {
    const date = '2069-01-11';
    const jobFair = await jobFairDay(date);
    const { id } = z.object({ id: z.string() }).parse((await attend(stage.app, stage.asker, jobFair.id)).body);
    await patch(id, { joinPolicy: 'open', board: 'career', description: '같이 가요' }).expect(200);

    const response = await takeAlone(date, jobFair);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect((await getQuest(stage.app, stage.asker, id)).body).toMatchObject({ id, joinPolicy: 'open' });
  });
});

// Partitions: an invitation of a Friend, and a change of settings. Expected values: 409 QUEST_TAKEN_ALONE for both, and
// the Quest as it was.
describe('a Quest taken alone', () => {
  it('takes no invitation and no change of its settings', async () => {
    const date = '2069-01-18';
    const jobFair = await jobFairDay(date);
    const friend = await stage.friend('민수');
    const { quest } = questSchema.parse((await takeAlone(date, jobFair)).body);

    const invited = await invite(stage.app, stage.asker, quest.id, friend.id);
    const changed = await patch(quest.id, { capacity: 4, joinPolicy: 'open', board: 'career' });

    expect(invited.status).toBe(409);
    expect(invited.body).toMatchObject(refused(409, 'QUEST_TAKEN_ALONE'));
    expect(changed.status).toBe(409);
    expect(changed.body).toMatchObject(refused(409, 'QUEST_TAKEN_ALONE'));
    expect((await getQuest(stage.app, stage.asker, quest.id)).body).toMatchObject({
      takenAlone: true,
      capacity: 1,
      joinPolicy: 'closed',
    });
  });
});
