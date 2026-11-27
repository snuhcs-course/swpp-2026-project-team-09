/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { sendAsWorker } from './worker.js';

// One message that asks for two plans (P05 ticket 73), at the Assistant's endpoint with the scripted model, the seed's
// walking table and Places: an app that says `answers` gets both, and an app before it gets the reply it always got,
// the last answer alone.

const stage = new MealPlanStage();
let prisma: PrismaClient;
const stored: string[] = [];

const DATE = '2088-03-09';
const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];
const OLD_APP = { clientCapabilities: ['library', 'answer', 'events'] };
const ANSWERS_APP = { clientCapabilities: ['library', 'answer', 'events', 'answers'] };

const bothMeals = (name: string): object =>
  restaurant({
    name,
    lines: [
      { meal: 'lunch', text: '제육볶음 : 6,000원', kind: 'dish', name: '제육볶음', price: 6000 },
      { meal: 'dinner', text: '돈까스 : 6,500원', kind: 'dish', name: '돈까스', price: 6500 },
    ],
  });

beforeAll(async () => {
  await stage.start();
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.globalEvent.deleteMany({ where: { id: { in: stored } } });
  await prisma.$disconnect();
  await stage.stop();
});

beforeEach(async () => {
  await stage.asking(DATE, '09:00');
  await sendAsWorker(
    stage.app,
    '/menus/collected',
    menusMessage([{ date: DATE, restaurants: RESTAURANTS.map((name) => bothMeals(name)) }]),
  );
  await stage.classAt(stage.asker, '09:30', '10:45', '301');
});

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  answers: z.custom<AnswerReply[]>().optional(),
  lookup: z.unknown(),
});

type Reply = z.infer<typeof replySchema>;

async function asked(steps: Step[], app: object, text: string): Promise<Reply> {
  const response = await stage.send(steps, app, text);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

const meal = (which: 'lunch' | 'dinner', more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date: DATE, meal: which, ...more },
});

const kindOf = ({ input }: AnswerReply): string => (input.kind === 'meal' ? input.meal : input.kind);

const LUNCH_AND_DINNER = [meal('lunch'), meal('dinner'), { text: '점심과 저녁을 짰어요.' }];

describe('Lunch and dinner in one message', () => {
  it('gives an app that says answers both, in the order planned, and dinner as the answer', async () => {
    const reply = await asked(LUNCH_AND_DINNER, ANSWERS_APP, '점심이랑 저녁 짜줘');

    expect(reply.answers?.map((each) => kindOf(each))).toEqual(['lunch', 'dinner']);
    expect(reply.answers?.every(({ plans }) => plans.length > 0)).toBe(true);
    expect(new Set(reply.answers?.map(({ key }) => key)).size).toBe(2);
    expect(reply.answer === null ? null : kindOf(reply.answer)).toBe('dinner');
  });

  it('gives an app before it dinner alone, as before', async () => {
    const reply = await asked(LUNCH_AND_DINNER, OLD_APP, '점심이랑 저녁 짜줘');

    expect(reply).not.toHaveProperty('answers');
    expect(reply.answer === null ? null : kindOf(reply.answer)).toBe('dinner');
  });

  it('keeps one lunch when lunch is planned again with other conditions', async () => {
    const reply = await asked(
      [meal('lunch'), meal('dinner'), meal('lunch', { from: '12:30' }), { text: '점심은 12시 반 이후로 짰어요.' }],
      ANSWERS_APP,
      '점심이랑 저녁 짜줘, 점심은 12시 반 이후로',
    );

    expect(reply.answers?.map((each) => kindOf(each))).toEqual(['lunch', 'dinner']);
    expect(reply.answers?.[0]?.input).toMatchObject({ window: { from: '12:30' } });
  });
});

describe('Dinner and then an event in one message', () => {
  it('gives an app that says answers the dinner and the events of the day; an app before it the events alone', async () => {
    const { latitude, longitude } = await stage.numbered('73');
    const event = await storeEvent(prisma, {
      title: '동아리 정기공연',
      startsAt: new Date(`${DATE}T19:30:00+09:00`),
      endsAt: new Date(`${DATE}T21:00:00+09:00`),
      place: '문화관',
      latitude,
      longitude,
    });
    stored.push(event.id);
    const steps = [meal('dinner'), { tool: 'planEvents', input: { date: DATE } }, { text: '저녁 먹고 공연 봐요.' }];

    const reply = await asked(steps, ANSWERS_APP, '저녁 먹고 그 공연 가자');
    expect(reply.answers?.map((each) => kindOf(each))).toEqual(['dinner', 'events']);
    expect(reply.answers?.[1]?.plans.map(({ id }) => id)).toContain(event.id);

    const before = await asked(steps, OLD_APP, '저녁 먹고 그 공연 가자');
    expect(before).not.toHaveProperty('answers');
    expect(before.answer === null ? null : kindOf(before.answer)).toBe('events');
  });
});

describe('A lookup after a plan in one message', () => {
  it('leaves the plan in the answers, and takes the one answer away as before', async () => {
    const steps = [
      meal('lunch'),
      { tool: 'findDay', input: { date: DATE } },
      { text: '오늘 수업 하나, 점심은 짰어요.' },
    ];

    const reply = await asked(steps, ANSWERS_APP, '오늘 일정이랑 점심');
    expect(reply.answers?.map((each) => kindOf(each))).toEqual(['lunch']);
    expect(reply.answer).toBeNull();
    expect(reply.lookup).not.toBeNull();

    const before = await asked(steps, OLD_APP, '오늘 일정이랑 점심');
    expect(before).not.toHaveProperty('answers');
    expect(before.answer).toBeNull();
    expect(before.lookup).not.toBeNull();
  });
});

const recalculate = (input: unknown, app: { clientCapabilities: string[] }): request.Test =>
  withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
    clientCapabilities: app.clientCapabilities,
  });

// The bar's other meal recalculates lunch as dinner through POST /assistant/answers: another request, as a Friend added
// makes a study place one together.
describe('An answer recalculated into another request', () => {
  it('comes back with the key of the request it now answers, the one a later reply gives it; to an app before, none', async () => {
    const lunch = await asked([meal('lunch'), { text: '점심을 짰어요.' }], ANSWERS_APP, '점심 짜줘');
    const input = lunch.answers?.[0]?.input;
    const dinnerInput = input?.kind === 'meal' ? { ...input, meal: 'dinner' } : null;

    const response = await recalculate(dinnerInput, ANSWERS_APP);
    expect(response.status).toBe(200);
    const recalculated = z.custom<AnswerReply>().parse(response.body);
    const dinner = await asked([meal('dinner'), { text: '저녁을 짰어요.' }], ANSWERS_APP, '저녁 짜줘');

    expect(recalculated.key).not.toBe(lunch.answers?.[0]?.key);
    expect(recalculated.key).toBe(dinner.answers?.[0]?.key);
    const before = await recalculate(dinnerInput, OLD_APP);
    expect(before.body).not.toHaveProperty('key');
  });
});
