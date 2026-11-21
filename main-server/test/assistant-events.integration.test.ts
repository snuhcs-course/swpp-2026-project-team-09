/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { EVENT_RULES } from '../src/assistant/events/event-tools.js';
import { type GlobalEvent, type PrismaClient } from '../src/generated/prisma/client.js';
import { readExample, travel } from './events-example.js';
import { COURSE, MealPlanStage, ROOM } from './meal-plan.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// The events of a day planned on the map, at the Assistant's endpoint with the scripted model, the seed's walking
// table with the design's shuttle, and Places: the design's worked example (section 6.3, a Friday at 13:50), what the
// model is given, the recalculation, and an app that does not draw them. Each test works on a Friday of early 2089.

const stage = new MealPlanStage(travel);
let prisma: PrismaClient;
const stored: string[] = [];

beforeAll(async () => {
  await readExample();
  await stage.start();
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.globalEvent.deleteMany({ where: { id: { in: stored } } });
  await prisma.$disconnect();
  await stage.stop();
});

const EVENTS_APP = { clientCapabilities: ['library', 'answer', 'events'] };
const ASKED = '오늘 볼 만한 거 있어?';

const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

const summary = ({ plans }: AnswerReply): string[] =>
  plans.map(({ title, startAt, endAt, togetherMinutes }) => `${title} ${startAt}–${endAt} (${togetherMinutes})`);

// A published event of that day at the building of that number.
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

// The asker of the worked example, with Classes in 24동 until 13:50 and in 301동 from 15:30 to 16:45, and the day's
// three events.
async function workedExample(date: string): Promise<{ jobFair: string; session: string; concert: string }> {
  await stage.asking(date, '13:50');
  await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
  await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
  const jobFair = await eventAt(date, '채용박람회', ['10:00', '17:00'], ['73', '문화관']);
  const session = await eventAt(date, '기업 설명회', ['16:00', '17:00'], ['73', '문화관']);
  const concert = await eventAt(date, '동아리 정기공연', ['18:00', null], ['67', '두레문예관']);
  return { jobFair: jobFair.id, session: session.id, concert: concert.id };
}

const planEvents = (date: string, eventIds?: string[]): Step => ({
  tool: 'planEvents',
  input: eventIds === undefined ? { date } : { date, eventIds },
});

function recalculate(body: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send(
    body,
  );
}

describe('The worked example', () => {
  it('plans the job fair, then the concert by shuttle, then the company session that clashes with the Class', async () => {
    const date = '2089-01-07';
    const time = timeOn(date);
    const ids = await workedExample(date);

    const response = await stage.send(
      [planEvents(date), { text: '채용박람회에서 78분 볼 수 있어요.' }],
      EVENTS_APP,
      ASKED,
    );

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(summary(answer)).toEqual([
      `채용박람회 ${time('13:54')}–${time('15:12')} (78)`,
      `동아리 정기공연 ${time('18:00')}–${time('18:30')} (30)`,
      `기업 설명회 ${time('16:00')}–${time('17:00')} (60)`,
    ]);
    expect(answer.plans.map(({ id }) => id)).toEqual([ids.jobFair, ids.concert, ids.session]);
    expect(answer.plans.map(({ lines }) => lines.map((line) => line.map(({ text }) => text).join('')))).toEqual([
      ['채용박람회 · 문화관 10:00–17:00', '13:54 도착 · 78분 볼 수 있어요', '15:30 수업이라 15:12엔 나서요'],
      ['동아리 정기공연 · 18:00 시작', '17:42에 셔틀로 가요'],
      ['기업 설명회 · 16:00 문화관', '15:30 수업과 겹쳐요'],
    ]);
    expect(answer.plans[1]?.parts[0]?.mode).toBe('shuttle');
    expect(answer.dropped).toEqual([]);
    expect(answer.input).toEqual({ kind: 'events', date, eventIds: null });
  });
});

describe('What the model is given', () => {
  it('is the plans in words and minutes, with no coordinates, course names, or rooms', async () => {
    const date = '2089-01-14';
    await workedExample(date);

    const response = await stage.send([planEvents(date), { text: '…' }], EVENTS_APP, ASKED);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'planned',
      plans: [
        {
          title: '<data label="globalEvent.title">채용박람회</data>',
          place: '<data label="globalEvent.place">문화관</data>',
          arrive: '13:54',
          stayMinutes: 78,
          leaveBy: '15:12',
          clash: null,
        },
        {
          title: '<data label="globalEvent.title">동아리 정기공연</data>',
          place: '<data label="globalEvent.place">두레문예관</data>',
          arrive: '18:00',
          stayMinutes: 30,
          leaveBy: null,
          clash: null,
        },
        {
          title: '<data label="globalEvent.title">기업 설명회</data>',
          place: '<data label="globalEvent.place">문화관</data>',
          arrive: '16:00',
          stayMinutes: 60,
          leaveBy: null,
          clash: { at: '15:30', with: 'Class' },
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

describe('The input of the answer, posted back unchanged', () => {
  it('gives the same answer, and the model is not called', async () => {
    const date = '2089-01-21';
    await workedExample(date);
    const asked = await stage.send([planEvents(date), { text: '…' }], EVENTS_APP, ASKED);
    const answer = answerIn(asked.body);
    stage.model.script();

    const response = await recalculate({ input: answer.input, location: null });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(answer);
    expect(stage.model.received()).toEqual([]);
  });

  it('is refused with 400 when it is of an unknown kind', async () => {
    const date = '2089-01-21';
    await stage.asking(date, '13:50');

    const response = await recalculate({ input: { kind: 'concerts', date, eventIds: null }, location: null });

    expect(response.status).toBe(400);
  });
});

describe('Events a search returned', () => {
  it('are the only ones planned', async () => {
    const date = '2089-01-28';
    const { concert } = await workedExample(date);

    const response = await stage.send(
      [
        { tool: 'searchGlobalEvents', input: { from: date, to: date, words: ['공연'] } },
        planEvents(date, [concert]),
        { text: '…' },
      ],
      EVENTS_APP,
      '오늘 공연 있어?',
    );

    expect(answerIn(response.body).plans.map(({ id }) => id)).toEqual([concert]);
    expect(answerIn(response.body).input).toEqual({ kind: 'events', date, eventIds: [concert] });
  });

  it('are refused when no search returned them in the message, and nothing is planned', async () => {
    const date = '2089-02-04';
    const { jobFair } = await workedExample(date);

    const response = await stage.send([planEvents(date, [jobFair]), { text: '…' }], EVENTS_APP, ASKED);

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
    expect(replySchema.parse(response.body).answer).toBeNull();
  });
});

describe('A day with nothing to attend', () => {
  it('answers no plan and says so, and tells the model none', async () => {
    const date = '2089-02-11';
    await stage.asking(date, '13:50');

    const response = await stage.send([planEvents(date), { text: '…' }], EVENTS_APP, ASKED);

    const answer = answerIn(response.body);
    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toEqual({
      reason: 'no-fit',
      lines: [[{ text: '오늘은 다녀올 만한 행사가 없어요', strong: false }]],
    });
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
  });
});

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('An app that does not draw events', () => {
  it('is offered neither planEvents nor its rules, whether or not it draws answers', async () => {
    await stage.asking('2089-02-18', '13:50');

    for (const clientCapabilities of [['library', 'answer'], ['library'], ['events']]) {
      // oxlint-disable-next-line no-await-in-loop -- the scripted model answers one message at a time
      await stage.send([{ text: '네' }], { clientCapabilities }, ASKED);

      expect(toolNames()).not.toContain('planEvents');
      expect(stage.model.system()).not.toContain(EVENT_RULES);
    }
  });

  it('is told apart from one that does, which is offered planEvents and its rules beside planMeal', async () => {
    await stage.asking('2089-02-18', '13:50');

    await stage.send([{ text: '네' }], EVENTS_APP, ASKED);

    expect(toolNames()).toEqual(expect.arrayContaining(['planEvents', 'planMeal', 'searchGlobalEvents']));
    expect(stage.model.system()).toContain(EVENT_RULES);
  });
});
