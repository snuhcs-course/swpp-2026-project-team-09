/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { RECRUITING_RULES } from '../src/assistant/recruiting/recruiting-tools.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { readExample, travel } from './events-example.js';
import { COURSE, MealPlanStage, ROOM } from './meal-plan.js';
import { answerIn, EVENTS_APP, recalculate, replySchema, texts, toolNames } from './plan-answers.js';
import { connectToDatabase } from './quests.js';
import { activityParty, badmintonParties, jobFairOn, jobFairParties, stranger, timeOn } from './recruiting-parties.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { refused } from './signals.js';

// Recruiting Quests planned on the map, at the Assistant's endpoint with the scripted model, the seed's walking table
// with the design's shuttle, and Places: the design's row 4 (a Friday at 13:50, the job fair's parties) and row 5 (a
// Thursday at 16:45, two badminton parties), what the model is given, the recalculation, and the refusals. Each test
// works on a Thursday or a Friday of March 2089, which no other file uses; recruiting Quests are read by their ids or
// their Global Event, so another file's never meet these.

// The parties are made by their Users through the routes, which takes a few seconds.
vi.setConfig({ testTimeout: 30_000 });

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

// Row 4: the asker with Classes in 24동 until 13:50 and in 301동 from 15:30, and the job fair's parties at 13:30 and at
// 14:20, which 민수 entered.
async function rowFour(date: string): Promise<{ jobFair: string; at1420: string }> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const minsu = await stage.friend('민수');
  const jobFair = await jobFairOn(stage, prisma, date);
  events.push(jobFair.id);
  const { at1420 } = await jobFairParties(stage, [jobFair, date], [minsu]);
  return { jobFair: jobFair.id, at1420 };
}

// Row 5: the asker with a Class in 301동 until 16:45, and the badminton parties at the gymnasium at 17:00 and 18:00.
async function rowFive(date: string): Promise<{ at17: string; at18: string }> {
  await stage.asking(date, '16:45');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'thursday');
  return badmintonParties(stage, date);
}

const planQuests = (input: object): Step => ({ tool: 'planQuests', input });

const searchBadminton = (date: string): Step => ({
  tool: 'searchRecruitingQuests',
  input: { from: date, to: date, words: ['배드민턴'] },
});

describe('Row 4: the job fair’s parties', () => {
  it('plans the 14:20 party with 민수, from 14:20 to 15:12, and drops the 13:30 party as started', async () => {
    const date = '2089-03-11';
    const time = timeOn(date);
    const { jobFair, at1420 } = await rowFour(date);

    const response = await stage.send(
      [planQuests({ globalEventId: jobFair }), { text: '14:20 문화관 파티에 민수가 있어요.' }],
      EVENTS_APP,
      '민수가 있는 파티',
    );

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.input).toEqual({ kind: 'quests', globalEventId: jobFair, questIds: null });
    expect(answer.plans.map(({ id }) => id)).toEqual([at1420]);
    expect(answer.plans[0]).toMatchObject({
      title: '채용박람회 같이 가요',
      startAt: time('14:20'),
      endAt: time('15:12'),
      togetherMinutes: 52,
      parts: [{ leaveAt: time('14:16'), walkMinutes: 4, leaveBy: time('15:12') }],
      quest: { id: at1420, holderCount: 3, capacity: 4, joinPolicy: 'open' },
      friendNames: ['민수'],
    });
    expect(texts(answer)).toEqual([['14:20 문화관 파티에', '민수가 있어요']]);
    expect(answer.dropped.map(({ reason }) => reason)).toEqual(['13:30 파티 · 이미 시작했어요']);
  });
});

describe('Row 5: the badminton parties', () => {
  it('plans the 18:00 party by shuttle, setting out at 17:43, and drops the 17:00 party, reached at 17:02', async () => {
    const date = '2089-03-10';
    const time = timeOn(date);
    const { at17, at18 } = await rowFive(date);

    const response = await stage.send(
      [searchBadminton(date), planQuests({ questIds: [at17, at18] }), { text: '18:00 체육관 파티에 17:43에 나서요.' }],
      EVENTS_APP,
      '배드민턴 칠 사람',
    );

    const answer = answerIn(response.body);
    expect(answer.plans.map(({ id }) => id)).toEqual([at18]);
    expect(answer.plans[0]).toMatchObject({
      startAt: time('18:00'),
      parts: [{ leaveAt: time('17:43'), walkMinutes: 17, mode: 'shuttle' }],
      quest: { id: at18, holderCount: 3 },
      friendNames: [],
    });
    expect(texts(answer)).toEqual([['18:00 체육관 · 17:43에 나서요']]);
    expect(answer.dropped.map(({ reason }) => reason)).toEqual(['17:00 파티는 17:02에야 도착해요']);
  });
});

describe('What the model is given', () => {
  it('is the plans in words and minutes, with no coordinates, course names, or rooms', async () => {
    const { jobFair } = await rowFour('2089-03-18');

    const response = await stage.send([planQuests({ globalEventId: jobFair }), { text: '…' }], EVENTS_APP, '파티');

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'planned',
      plans: [
        {
          title: '<data label="quest.title">채용박람회 같이 가요</data>',
          place: '<data label="quest.place">문화관</data>',
          start: '14:20',
          setOut: '14:16',
          stayMinutes: 52,
          leaveBy: '15:12',
          holderCount: 3,
          capacity: 4,
          join: 'open',
          friends: ['민수'],
        },
      ],
    });
    const given = JSON.stringify(stage.model.toolResults()[0]);
    for (const secret of ['latitude', COURSE, ROOM]) {
      expect(given).not.toContain(secret);
    }
    const replied = JSON.stringify(response.body);
    expect(replied).not.toContain(COURSE);
    expect(replied).not.toContain(ROOM);
  });
});

describe('The input of the answer', () => {
  it('posted back unchanged gives the same answer, and the model is not called', async () => {
    const date = '2089-03-17';
    const { at17, at18 } = await rowFive(date);
    const asked = await stage.send(
      [searchBadminton(date), planQuests({ questIds: [at17, at18] }), { text: '…' }],
      EVENTS_APP,
      '배드민턴',
    );
    const answer = answerIn(asked.body);
    stage.model.script();

    const response = await recalculate(stage, answer.input);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(answer);
    expect(stage.model.received()).toEqual([]);
  });

  it.each([
    ['neither a Global Event nor Quests', { globalEventId: null, questIds: null }],
    ['both', { globalEventId: randomUUID(), questIds: [randomUUID()] }],
  ])('naming %s is refused with 400', async (_, named) => {
    await stage.asking('2089-03-17', '16:45');

    const response = await recalculate(stage, { kind: 'quests', ...named });

    expect(response.status).toBe(400);
  });
});

describe('POST /plans', () => {
  it('refuses the input with 400 PLAN_KIND: joining stays the User’s press', async () => {
    const date = '2089-03-24';
    const { at18 } = await rowFive(date);

    const response = await withAccessToken(request(stage.app.getHttpServer()).post('/plans'), stage.asker.accessToken)
      .set('Idempotency-Key', randomUUID())
      .send({
        input: { kind: 'quests', globalEventId: null, questIds: [at18] },
        planId: at18,
        startAt: `${date}T18:00:00+09:00`,
        location: null,
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, 'PLAN_KIND'));
  });
});

describe('Quests no search returned in the message', () => {
  it('are refused, and nothing is planned', async () => {
    const { at18 } = await rowFive('2089-03-31');

    const response = await stage.send([planQuests({ questIds: [at18] }), { text: '…' }], EVENTS_APP, '배드민턴');

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
    expect(replySchema.parse(response.body).answer).toBeNull();
  });
});

describe('No party to reach', () => {
  it('answers no plan, says so, and tells the model none', async () => {
    const date = '2089-03-24';
    await stage.asking(date, '16:45');
    await stage.classAt(stage.asker, '15:30', '16:45', '301', 'thursday');
    const party = await activityParty(stage, {
      leader: await stranger(stage, '아홉'),
      title: '배드민턴 칠 사람',
      meets: [date, '16:50', '71'],
    });

    const response = await stage.send(
      [searchBadminton(date), planQuests({ questIds: [party] }), { text: '…' }],
      EVENTS_APP,
      '배드민턴',
    );

    const answer = answerIn(response.body);
    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toEqual({
      reason: 'no-fit',
      lines: [[{ text: '제시간에 갈 수 있는 파티가 없어요', strong: false }]],
    });
    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'none' });
  });
});

describe('An app that does not draw events', () => {
  it('is offered neither planQuests nor its rules, and one that does is offered both', async () => {
    await stage.asking('2089-03-25', '16:45');

    for (const clientCapabilities of [['library', 'answer'], ['library']]) {
      // oxlint-disable-next-line no-await-in-loop -- the scripted model answers one message at a time
      await stage.send([{ text: '네' }], { clientCapabilities }, '배드민턴');

      expect(toolNames(stage)).not.toContain('planQuests');
      expect(stage.model.system()).not.toContain(RECRUITING_RULES);
    }
    await stage.send([{ text: '네' }], EVENTS_APP, '배드민턴');

    expect(toolNames(stage)).toEqual(expect.arrayContaining(['planQuests', 'planEvents', 'searchRecruitingQuests']));
    expect(stage.model.system()).toContain(RECRUITING_RULES);
  });
});
