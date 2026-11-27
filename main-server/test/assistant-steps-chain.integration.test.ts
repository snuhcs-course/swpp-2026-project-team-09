/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type PlanInput, type ReplyStep } from '../src/assistant/dto/answer.dto.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { find } from './library.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { type Step } from './scripted-model.js';
import { sendAsWorker } from './worker.js';

// The steps of one message over every answer, for an app that says `answers` (P05 ticket 74), at the Assistant's
// endpoint with the scripted model, the seed's walking table, Places and study spaces. On a Tuesday at 09:00 the asker
// has a Class in 301동 from 09:30 to 10:45. A later step that can move sets out from the step before it when that one
// ends; one at a fixed time stays, and says when it cannot be reached.

const stage = new MealPlanStage();
let prisma: PrismaClient;
const stored: string[] = [];

const DATE = '2088-03-09';
const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];
const ANSWERS_APP = { clientCapabilities: ['library', 'answer', 'events', 'study-plan', 'answers'] };
const OLD_APP = { clientCapabilities: ['library', 'answer', 'events', 'study-plan'] };

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
  steps: z.custom<ReplyStep[]>().optional(),
});

type Reply = z.infer<typeof replySchema>;

async function asked(steps: Step[], text: string, app: object = ANSWERS_APP, context?: object): Promise<Reply> {
  const response = await stage.send(steps, context === undefined ? app : { ...app, context }, text);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

const meal = (which: 'lunch' | 'dinner', more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date: DATE, meal: which, ...more },
});
const said: Step = { text: '순서대로 짰어요.' };

const originOf = (answer: AnswerReply | undefined): { placeId: string; basis: string } | null => {
  const origin = answer?.plans[0]?.parts[0]?.origin ?? null;
  return origin === null ? null : { placeId: origin.place.placeId, basis: origin.basis };
};

const askerConstraints = (input: PlanInput | undefined): unknown =>
  input !== undefined && 'people' in input ? input.people[0]?.constraints : null;

const clock = (at: string | null | undefined): string | null =>
  at === null || at === undefined ? null : at.slice(11, 16);

// The one event of the day: the events planned are the day's, which only a search of the message could narrow.
async function eventAt(title: string, start: string, end: string): Promise<string> {
  await prisma.globalEvent.deleteMany({ where: { id: { in: stored.splice(0) } } });
  const { latitude, longitude } = await stage.numbered('73');
  const event = await storeEvent(prisma, {
    title,
    startsAt: new Date(`${DATE}T${start}:00+09:00`),
    endsAt: new Date(`${DATE}T${end}:00+09:00`),
    place: '문화관',
    latitude,
    longitude,
  });
  stored.push(event.id);
  return event.id;
}

describe('Lunch and then dinner', () => {
  it('are two steps, each showing its own answer, and dinner sets out from lunch when it ends', async () => {
    const reply = await asked([meal('lunch'), meal('dinner'), said], '점심이랑 저녁 짜줘');
    const [lunch, dinner] = reply.answers ?? [];

    expect(reply.steps?.map(({ kind, status, shows }) => ({ kind, status, shows }))).toEqual([
      { kind: 'meal', status: 'shown', shows: { kind: 'answer', key: lunch?.key } },
      { kind: 'meal', status: 'shown', shows: { kind: 'answer', key: dinner?.key } },
    ]);
    expect(originOf(dinner)).toEqual({ placeId: lunch?.plans[0]?.place.placeId, basis: 'chosen' });
    expect(askerConstraints(dinner?.input)).toEqual([
      { kind: 'from', placeId: lunch?.plans[0]?.place.placeId, source: 'step' },
      { kind: 'notBefore', time: clock(lunch?.plans[0]?.endAt), source: 'step' },
    ]);
    expect(reply.steps?.[1]?.from?.placeId).toBe(lunch?.plans[0]?.place.placeId);
    // Free from lunch's end, the asker is not told of the morning's Class as too soon to eat before.
    expect(dinner?.chips.filter(({ kind }) => kind !== 'origin')).toEqual([]);
  });

  it('dinner sets out from the Class between them instead, when there is one', async () => {
    await stage.classAt(stage.asker, '15:00', '16:30', '302');
    const b302 = await stage.numbered('302');

    const reply = await asked([meal('lunch'), meal('dinner'), said], '점심이랑 저녁 짜줘');

    expect(originOf(reply.answers?.[1])).toEqual({ placeId: b302.id, basis: 'timetable' });
    expect(reply.steps).toHaveLength(2);
  });

  it('chains dinner even when the model plans it first', async () => {
    const reply = await asked([meal('dinner'), meal('lunch'), said], '점심이랑 저녁 짜줘');
    const [dinner, lunch] = reply.answers ?? [];

    expect(originOf(dinner)).toEqual({ placeId: lunch?.plans[0]?.place.placeId, basis: 'chosen' });
    expect(reply.steps?.map(({ shows }) => shows)).toEqual([
      { kind: 'answer', key: lunch?.key },
      { kind: 'answer', key: dinner?.key },
    ]);
  });

  it('has no steps for an app that does not say answers, as before', async () => {
    const reply = await asked([meal('lunch'), meal('dinner'), said], '점심이랑 저녁 짜줘', OLD_APP);

    expect(reply).not.toHaveProperty('steps');
    expect(reply.answer?.input).toMatchObject({ meal: 'dinner' });
  });
});

describe('Dinner and then an event at a fixed time', () => {
  it('keeps the event where it is, and says it cannot be reached when dinner ends after it starts', async () => {
    const id = await eventAt('동아리 정기공연', '18:30', '20:00');

    const reply = await asked(
      [meal('dinner', { from: '18:00' }), { tool: 'planEvents', input: { date: DATE } }, said],
      '18시에 저녁 먹고 공연 가자',
    );

    const dinnerEnd = clock(reply.answers?.[0]?.plans[0]?.endAt);
    expect(reply.steps?.map(({ kind, status }) => ({ kind, status }))).toEqual([
      { kind: 'meal', status: 'shown' },
      { kind: 'events', status: 'not-done' },
    ]);
    expect(reply.steps?.[1]?.reason).toBe(`앞 일정이 ${dinnerEnd}에 끝나 제때 갈 수 없어요`);
    expect(reply.steps?.[1]?.shows).toEqual({ kind: 'answer', key: reply.answers?.[1]?.key });
    expect(reply.answers?.[1]?.plans[0]?.id).toBe(id);
  });

  it('shows the event as a step after dinner when it can be reached', async () => {
    const id = await eventAt('밤 공연', '20:30', '21:30');

    const reply = await asked(
      [meal('dinner', { from: '18:00' }), { tool: 'planEvents', input: { date: DATE } }, said],
      '18시에 저녁 먹고 공연 가자',
    );

    expect(reply.steps?.map(({ kind, status }) => ({ kind, status }))).toEqual([
      { kind: 'meal', status: 'shown' },
      { kind: 'events', status: 'shown' },
    ]);
    expect(reply.answers?.[1]?.plans[0]?.id).toBe(id);
  });
});

describe('A 관정 seat and then a study place', () => {
  it('sets the study place out from 관정 when the seat ends', async () => {
    const kwanjeong = await stage.numbered('62-1');
    const seat: Step = {
      tool: 'proposeLibraryBooking',
      input: { spaceId: '7F-7A-zone2', date: DATE, start: '11:00', end: '13:00' },
    };

    const reply = await asked(
      [find(['7F-7A-zone2']), seat, { tool: 'planStudy', input: { what: 'any', from: '13:00' } }, said],
      '11시부터 13시까지 관정 7층 자리 잡고, 그다음 공부할 곳',
    );

    expect(reply.steps?.map(({ kind }) => kind)).toEqual(['seat', 'study']);
    expect(askerConstraints(reply.answers?.[0]?.input)).toEqual([
      { kind: 'from', placeId: kwanjeong.id, source: 'step' },
      { kind: 'notBefore', time: '13:00', source: 'step' },
    ]);
    expect(reply.steps?.[1]?.from?.placeId).toBe(kwanjeong.id);
  });
});

const seatAt = (start: string, end: string): Step => ({
  tool: 'proposeLibraryBooking',
  input: { spaceId: '7F-7A-zone2', date: DATE, start, end },
});

const chainFrom = (placeId: string, time: string, source = 'step'): object[] => [
  { kind: 'from', placeId, source },
  { kind: 'notBefore', time, source },
];

// Fault C2 and a follow-up on one step: the app sends back the steps on screen and every answer's conditions.
describe('A follow-up that moves the seat', () => {
  it('plans lunch again from the seat at its new end, gives it back by its key, and gives every step', async () => {
    const kwanjeong = await stage.numbered('62-1');
    const first = await asked(
      [find(['7F-7A-zone2']), seatAt('11:00', '13:00'), meal('lunch'), said],
      '11시부터 13시까지 관정 7층 잡고 점심',
    );
    const [lunch] = first.answers ?? [];
    expect(askerConstraints(lunch?.input)).toEqual(chainFrom(kwanjeong.id, '13:00'));

    const context = { conditions: lunch?.input, answers: [lunch?.input], steps: first.steps };
    const reply = await asked(
      [find(['7F-7A-zone2']), seatAt('11:00', '12:00'), { text: '자리를 12시까지로 줄였어요.' }],
      '자리는 12시까지만',
      ANSWERS_APP,
      context,
    );

    expect(reply.answers?.map(({ key }) => key)).toEqual([lunch?.key]);
    expect(askerConstraints(reply.answers?.[0]?.input)).toEqual(chainFrom(kwanjeong.id, '12:00'));
    expect(reply.steps?.map(({ kind, endAt }) => ({ kind, end: clock(endAt) }))).toEqual([
      { kind: 'seat', end: '12:00' },
      { kind: 'meal', end: clock(reply.answers?.[0]?.plans[0]?.endAt) },
    ]);
    expect(reply.steps?.[1]?.shows).toEqual({ kind: 'answer', key: lunch?.key });
  });
});

describe('A follow-up that moves dinner later', () => {
  it('brings the event on screen back as not done, without giving its answer again', async () => {
    await eventAt('저녁 공연', '19:00', '20:30');
    const first = await asked(
      [meal('dinner', { from: '17:30' }), { tool: 'planEvents', input: { date: DATE } }, said],
      '5시 반에 저녁 먹고 공연 가자',
    );
    expect(first.steps?.map(({ status }) => status)).toEqual(['shown', 'shown']);
    const [dinner, events] = first.answers ?? [];

    const context = { conditions: dinner?.input, answers: [dinner?.input, events?.input], steps: first.steps };
    const reply = await asked(
      [meal('dinner', { from: '18:30' }), { text: '저녁을 6시 반으로 옮겼어요.' }],
      '저녁 6시 반으로',
      ANSWERS_APP,
      context,
    );

    expect(reply.answers?.map(({ key }) => key)).toEqual([dinner?.key]);
    expect(reply.steps?.map(({ kind, status, shows }) => ({ kind, status, shows }))).toEqual([
      { kind: 'meal', status: 'shown', shows: { kind: 'answer', key: dinner?.key } },
      { kind: 'events', status: 'not-done', shows: { kind: 'answer', key: events?.key } },
    ]);
  });
});

// Fault G5: the model planned lunch before the seat, and worded that lunch.
describe('Lunch planned before the seat it follows', () => {
  it('stands as planned again from the seat, and the steps say it in the place of the words of the model', async () => {
    const reply = await asked(
      [meal('lunch'), find(['7F-7A-zone2']), seatAt('11:00', '13:00'), { text: '11시에 301동식당에서 점심 먹어요.' }],
      '11시부터 13시까지 관정 7층 잡고 점심',
    );

    const lunch = reply.answers?.[0];
    expect(Date.parse(lunch?.plans[0]?.startAt ?? '')).toBeGreaterThanOrEqual(Date.parse(`${DATE}T13:00:00+09:00`));
    expect(reply.text).toBe(
      `11:00 7층 7A 열람실 2 구역. ${clock(lunch?.plans[0]?.startAt)} ${lunch?.plans[0]?.title ?? ''}.`,
    );
  });
});

// Fault A2: the model was told to call the tools in time order, so the seat it showed first comes before dinner.
describe('A seat that starts inside the dinner window, then dinner', () => {
  it.each([
    ['an app that says answers', ANSWERS_APP, 'step'],
    ['an app before it', OLD_APP, 'asker'],
  ])('sets dinner out from 관정 when the seat ends, for %s', async (_case, app, source) => {
    const kwanjeong = await stage.numbered('62-1');
    const reply = await asked(
      [find(['7F-7A-zone2']), seatAt('17:30', '19:00'), meal('dinner'), said],
      '5시 반부터 관정 있다가 저녁',
      app,
    );

    expect(askerConstraints(reply.answer?.input)).toEqual(chainFrom(kwanjeong.id, '19:00', source));
  });
});
