/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type GlobalEvent, type PrismaClient } from '../src/generated/prisma/client.js';
import { readExample, travel } from './events-example.js';
import { type TestUser } from './friends.js';
import { MealPlanStage } from './meal-plan.js';
import { recalculate } from './plan-answers.js';
import { addSubQuest, attend, connectToDatabase, storeEvent } from './quests.js';
import { jobFairOn, stranger, timeOn } from './recruiting-parties.js';
import { withAccessToken } from './sign-in.js';

// "같이 갈 파티" of an event (the smoke test of 2026-11-16, row 13): a recruiting party for a Global Event is judged at
// the event's place even when no step names a Place of the list, as the party form and a party made by attending make
// it. Over the recalculation endpoint with the seed's walking table and the design's shuttle. Each test stands on a
// Friday of January 2072, which no other file uses.

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

// The asker with Classes in 24동 until 13:50 and in 301동 from 15:30 to 16:45, and the concert at 18:00 in 두레문예관
// (the Place numbered 67), which is written as its point and its words, as every Global Event is.
async function concertDay(date: string): Promise<GlobalEvent> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const { latitude, longitude } = await stage.numbered('67');
  const concert = await storeEvent(prisma, {
    title: '동아리 정기공연',
    startsAt: new Date(timeOn(date)('18:00')),
    endsAt: null,
    place: '두레문예관',
    latitude,
    longitude,
  });
  events.push(concert.id);
  return concert;
}

// An Open party a stranger posts for the event, whose one step is attending it.
async function attendingParty(event: GlobalEvent): Promise<{ id: string; leader: TestUser }> {
  const leader = await stranger(stage, '하나');
  const made = await attend(stage.app, leader, event.id).expect(201);
  const { id } = z.object({ id: z.string() }).parse(made.body);
  await withAccessToken(request(stage.app.getHttpServer()).patch(`/quests/${id}`), leader.accessToken)
    .send({ title: '같이 가요', joinPolicy: 'open', board: 'show', description: '같이 봐요' })
    .expect(200);
  return { id, leader };
}

// Partitions: a party whose only step is attending the event. Expected values: the design's 6.3 (the concert reached
// by shuttle, setting out at 17:42).
describe('"같이 갈 파티" of an event', () => {
  it("plans a party whose only step is the event, at the event's place", async () => {
    const concert = await concertDay('2072-01-01');
    const { id: party } = await attendingParty(concert);

    const response = await recalculate(stage, { kind: 'quests', globalEventId: concert.id, questIds: null });

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    expect(answer.noPlan).toBeNull();
    expect(answer.plans.map(({ quest }) => quest?.id)).toEqual([party]);
    expect(answer.plans[0]).toMatchObject({ startAt: timeOn('2072-01-01')('18:00') });
  });
});

// Partitions: a party that meets after its event started, at a point the form wrote with no Place id. Expected values:
// the job fair from 10:00, asked at 13:50; the party meets in front of 문화관 at 14:20, so it is judged then and there
// rather than on the attending step, which has started.
describe('"같이 갈 파티" of an event under way', () => {
  it('judges a party on the step its Holder wrote, at the Place of its point', async () => {
    const date = '2072-01-08';
    await stage.asking(date, '13:50');
    await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
    await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
    const jobFair = await jobFairOn(stage, prisma, date);
    events.push(jobFair.id);
    const { id: party, leader } = await attendingParty(jobFair);
    const { latitude, longitude } = await stage.numbered('73');
    const place = { label: '문화관 앞', latitude, longitude };
    await addSubQuest(stage.app, leader, party, { title: '모이기', startsAt: timeOn(date)('14:20'), place }).expect(
      201,
    );

    const response = await recalculate(stage, { kind: 'quests', globalEventId: jobFair.id, questIds: null });

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    expect(answer.plans.map(({ quest }) => quest?.id)).toEqual([party]);
    expect(answer.plans[0]).toMatchObject({ startAt: timeOn(date)('14:20') });
  });
});
