/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PrismaClient } from '../src/generated/prisma/client.js';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type LeftOutClass, type MeetInput } from '../src/assistant/dto/answer.dto.js';
import { readExample, travel } from './events-example.js';
import { COURSE, MealPlanStage, resolve } from './meal-plan.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// A Class the User leaves out for the conversation ("1시 수업 휴강이야", P05 ticket 70), for every kind of answer and not
// for a meal alone, at the Assistant's endpoint with the scripted model and at POST /assistant/answers. Partitions: the
// kind of answer (a meet, a study place, the events of a day, a new 파티), how the conversation carries it (the reply
// gives it back, the next message sends it with another kind or with no answer on screen, a day before today, put
// back), the tool that leaves it out without planning, and a recalculation. Each test is on a Friday of its own, in
// 2094, which no other test uses.

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

const APP = { clientCapabilities: ['library', 'answer', 'events', 'meet', 'area', 'study-plan'] };

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  skipped: z.array(z.object({ date: z.string(), classId: z.string() })).optional(),
});

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

async function sent(
  steps: Step[],
  more: object = {},
  text = '1시 수업 휴강이야',
): Promise<z.infer<typeof replySchema>> {
  const response = await stage.send(steps, { ...APP, ...more }, text);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

function answerOf(reply: z.infer<typeof replySchema>): AnswerReply {
  if (reply.answer === null) {
    throw new Error('The reply has no answer');
  }
  return reply.answer;
}

const answerSchema = z.custom<AnswerReply>();

const endOf = (answer: AnswerReply): number => new Date(answer.plans[0]?.endAt ?? '').getTime();

const band = (answer: AnswerReply): AnswerReply['plans'][number]['band'] | undefined => answer.plans[0]?.band;

// The asker's lane of the first Plan, as "HH:MM–HH:MM" stretches.
const lane = (answer: AnswerReply): string[] =>
  (band(answer)?.lanes[0]?.busy ?? []).map(({ startAt, endAt }) => `${startAt.slice(11, 16)}–${endAt.slice(11, 16)}`);

describe('A Class left out of the events of a day', () => {
  it('makes the events of the day attendable over it, is drawn apart on the band, and is said to the model', async () => {
    const date = '2094-05-07';
    const time = timeOn(date);
    await stage.asking(date, '13:50');
    await stage.classAt(stage.asker, '13:00', '13:50', '24', 'friday');
    const later = await stage.classAt(stage.asker, '15:30', '16:45', '301', 'friday');
    const { latitude, longitude } = await stage.numbered('73');
    const event = await storeEvent(prisma, {
      title: '기업 설명회',
      startsAt: new Date(time('16:00')),
      endsAt: new Date(time('17:00')),
      place: '문화관',
      latitude,
      longitude,
    });
    stored.push(event.id);

    const reply = await sent([{ tool: 'planEvents', input: { date, skipClasses: ['15:30'] } }, { text: '…' }]);

    const answer = answerOf(reply);
    expect(answer.plans[0]?.lines.flat().map(({ text }) => text)).not.toContain('15:30 수업과 겹쳐요');
    expect(band(answer)?.skipped).toEqual([
      { id: later, startAt: time('15:30'), endAt: time('16:45'), label: '301동 수업' },
    ]);
    expect(lane(answer)).not.toContain('15:30–16:45');
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned', skipped: [`15:30 ${COURSE}`] });
    expect(reply.skipped).toEqual([{ date, classId: later }]);
  });
});

describe('A Class left out of a meet or a study place', () => {
  it('frees a meet to start in its time, with the Class drawn apart', async () => {
    const date = '2094-05-14';
    await stage.asking(date, '10:00');
    const morning = await stage.classAt(stage.asker, '10:00', '12:00', '301', 'friday');
    const friend = await stage.friend('민수');

    const reply = await sent([
      resolve('민수'),
      { tool: 'planMeet', input: { date, friendIds: [friend.id], skipClasses: ['10:00'] } },
      { text: '…' },
    ]);

    const answer = answerOf(reply);
    expect(new Date(answer.plans[0]?.startAt ?? '').getTime()).toBeLessThan(new Date(timeOn(date)('12:00')).getTime());
    expect(band(answer)?.skipped?.map(({ id }) => id)).toEqual([morning]);
    expect(reply.skipped).toEqual([{ date, classId: morning }]);
  });

  it('lets a study place be kept over it, with the Class drawn apart', async () => {
    const date = '2094-05-21';
    await stage.asking(date, '10:00');
    const noon = await stage.classAt(stage.asker, '11:00', '12:15', '301', 'friday');

    const kept = answerOf(
      await sent([{ tool: 'planStudy', input: { what: 'any', date } }, { text: '…' }], {}, '공부할 데'),
    );
    const freed = answerOf(
      await sent([{ tool: 'planStudy', input: { what: 'any', date, skipClasses: ['11:00'] } }, { text: '…' }]),
    );

    expect(endOf(kept)).toBeLessThanOrEqual(new Date(timeOn(date)('11:00')).getTime());
    expect(endOf(freed)).toBeGreaterThan(new Date(timeOn(date)('11:00')).getTime());
    expect(band(freed)?.skipped?.map(({ id }) => id)).toEqual([noon]);
    expect(stage.model.toolResults()[0]).toMatchObject({ skipped: [`11:00 ${COURSE}`] });
  });
});

describe('A Class left out of a new 파티', () => {
  it('frees a new 파티 at its time, with the Class drawn apart', async () => {
    const date = '2094-05-28';
    await stage.asking(date, '10:00');
    const evening = await stage.classAt(stage.asker, '18:30', '20:00', '301', 'friday');
    const place = await stage.numbered('301');

    const reply = await sent([
      { tool: 'resolvePlace', input: { words: '301동' } },
      {
        tool: 'planNewQuest',
        input: { date, title: '탁구', placeId: place.id, time: '19:00', skipClasses: ['18:30'] },
      },
      { text: '…' },
    ]);

    const answer = answerOf(reply);
    expect(answer.plans[0]?.startAt).toBe(timeOn(date)('19:00'));
    expect(band(answer)?.skipped?.map(({ id }) => id)).toEqual([evening]);
    expect(reply.skipped).toEqual([{ date, classId: evening }]);
  });
});

describe('The Classes left out, as the conversation carries them', () => {
  it('are left out of the next answer of another kind, with no answer on screen, and read by the model', async () => {
    const date = '2094-06-04';
    await stage.asking(date, '10:00');
    const noon = await stage.classAt(stage.asker, '11:00', '12:15', '301', 'friday');
    const first = await sent([{ tool: 'leaveClassesOut', input: { date, skipClasses: ['11:00'] } }, { text: '…' }]);

    const next = await sent(
      [{ tool: 'planStudy', input: { what: 'any', date } }, { text: '…' }],
      { context: { conditions: null, skipped: first.skipped } },
      '공부할 데',
    );

    expect(first.answer).toBeNull();
    expect(first.skipped).toEqual([{ date, classId: noon }]);
    expect(band(answerOf(next))?.skipped?.map(({ id }) => id)).toEqual([noon]);
    expect(next.skipped).toEqual([{ date, classId: noon }]);
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain(`[Classes left out: ${date} 11:00 ${COURSE}]`);
  });

  it('are put back when the User says they go, and the reply gives back none', async () => {
    const date = '2094-06-11';
    await stage.asking(date, '10:00');
    const noon = await stage.classAt(stage.asker, '11:00', '12:15', '301', 'friday');
    const skipped: LeftOutClass[] = [{ date, classId: noon }];

    const reply = await sent(
      [{ tool: 'planStudy', input: { what: 'any', date, attendClasses: ['11:00'] } }, { text: '…' }],
      { context: { skipped } },
      '아 1시 수업 휴강 아니래',
    );

    expect(band(answerOf(reply))).not.toHaveProperty('skipped');
    expect(reply.skipped).toEqual([]);
  });
});

describe('The Classes left out of a day before today, or never sent', () => {
  it('are dropped for a day before today, and an app that sends none is given none back', async () => {
    const date = '2094-06-18';
    await stage.asking(date, '10:00');
    const noon = await stage.classAt(stage.asker, '11:00', '12:15', '301', 'friday');

    const past = await sent([{ text: '…' }], { context: { skipped: [{ date: '2094-06-11', classId: noon }] } }, '안녕');
    const none = await sent([{ text: '…' }], {}, '안녕');

    expect(past.skipped).toBeUndefined();
    expect(none.skipped).toBeUndefined();
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).not.toContain('[Classes left out: 2094');
  });

  it('a word that names no Class of the day plans nothing and gives the day’s Classes to ask which', async () => {
    const date = '2094-06-25';
    await stage.asking(date, '10:00');
    await stage.classAt(stage.asker, '11:00', '12:15', '301', 'friday');

    const reply = await sent([
      { tool: 'planStudy', input: { what: 'any', date, skipClasses: ['17:00'] } },
      { text: '…' },
    ]);

    expect(reply.answer).toBeNull();
    expect(reply.skipped).toBeUndefined();
    expect(stage.model.toolResults()[0]).toEqual({
      result: 'unknownClass',
      unknown: ['17:00'],
      classes: [`11:00 ${COURSE}`],
    });
  });
});

describe('A recalculation with the conversation’s Classes left out', () => {
  it('leaves those of its day out of a meet, and ignores those of another day', async () => {
    const date = '2094-07-02';
    await stage.asking(date, '10:00');
    const morning = await stage.classAt(stage.asker, '10:00', '12:00', '301', 'friday');
    const friend = await stage.friend('지은');
    const input: MeetInput = {
      kind: 'meet',
      date,
      people: [
        { userId: stage.asker.id, constraints: [] },
        { userId: friend.id, constraints: [] },
      ],
      window: { from: null, until: null },
      placeId: null,
    };

    const recalculate = (skipped: LeftOutClass[]): request.Test =>
      withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
        input,
        skipped,
      });
    const freed = await recalculate([{ date, classId: morning }]).expect(200);
    const elsewhere = await recalculate([{ date: '2094-07-09', classId: morning }]).expect(200);

    expect(band(answerSchema.parse(freed.body))?.skipped?.map(({ id }) => id)).toEqual([morning]);
    expect(band(answerSchema.parse(elsewhere.body))).not.toHaveProperty('skipped');
  });
});

describe('The tools and the rules', () => {
  it('offer the Classes left out to every planning tool, and one rule for every kind', async () => {
    await stage.asking('2094-07-16', '10:00');

    await sent([{ text: '…' }], {}, '안녕');

    const tools = stage.model.received()[0]?.tools ?? [];
    const takes = (name: string): boolean =>
      JSON.stringify(tools.find((tool) => tool.name === name) ?? {}).includes('skipClasses');
    expect(
      ['planMeal', 'planMeet', 'planStudy', 'planEvents', 'planNewQuest', 'leaveClassesOut'].filter((name) =>
        takes(name),
      ),
    ).toEqual(['planMeal', 'planMeet', 'planStudy', 'planEvents', 'planNewQuest', 'leaveClassesOut']);
    expect(stage.model.system()).toContain('Never say that a Class can be left out of only one kind of answer.');
  });
});
