/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type MeetInput } from '../src/assistant/dto/answer.dto.js';
import { MEET_RULES } from '../src/assistant/gathering/meet-tools.js';
import { expectStatus, shareAt, uploadPosition } from './location-sharing.js';
import { COURSE, MealPlanStage, type Named, resolve, ROOM } from './meal-plan.js';
import { answerIn, recalculate, toolNames } from './plan-answers.js';
import { type Step } from './scripted-model.js';

// "만나고 싶다" at the Assistant's endpoint with the scripted model and at the recalculation, over the started server with
// the seed's walking table, Places, and study spaces: boards a5 and a6 of the design's row 6 (a Tuesday at 12:10), what
// the model is given, and an app that does not draw a meet. Each test works on a Tuesday of March 2086.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const MEET_APP = { clientCapabilities: ['library', 'answer', 'meet'] };

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

const summary = (answer: AnswerReply): string[] =>
  answer.plans.map(({ id, startAt, endAt, togetherMinutes }) => `${id} ${startAt}–${endAt} (${togetherMinutes})`);

// The asker at 301동 after a Class there, with Classes in 24동 at 13:00 and in 58동 at 17:00, and 민수 seen at the
// building level in 302동, with Classes there until 12:15 and from 15:30. The Restaurants open that day stand in 301동,
// 302동, and 학생회관.
async function a5(date: string): Promise<{ friend: Named; at: { latitude: number; longitude: number } }> {
  await stage.asking(date, '12:10');
  await stage.menusOn(date, ['301동식당', '302동식당', '학생회관식당']);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  await stage.classAt(stage.asker, '17:00', '18:15', '58');
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '11:00', '12:15', '302');
  await stage.classAt(friend, '15:30', '16:45', '302');
  await shareAt(stage.app, stage.asker, friend, 'building');
  const { latitude: friendLatitude, longitude: friendLongitude } = await stage.numbered('302');
  await expectStatus(uploadPosition(stage.app, friend, { latitude: friendLatitude, longitude: friendLongitude }), 200);
  const { latitude, longitude } = await stage.numbered('301');
  return { friend, at: { latitude, longitude } };
}

const planMeet = (date: string, friendIds: string[]): Step => ({ tool: 'planMeet', input: { date, friendIds } });

const meetInput = (date: string, friendId: string, window: MeetInput['window']): MeetInput => ({
  kind: 'meet',
  date,
  people: [
    { userId: stage.asker.id, constraints: [] },
    { userId: friendId, constraints: [] },
  ],
  window,
  placeId: null,
});

// Board a5's two Plans, then the next three of the longest time together, ties by the earlier start.
const a5Plans = (time: (clock: string) => string): string[] => [
  `302동 앞 ${time('12:15')}–${time('12:43')} (28)`,
  `301동 앞 ${time('12:18')}–${time('12:45')} (27)`,
  `유회진 학술정보관 앞 ${time('12:19')}–${time('12:46')} (27)`,
  `신양학술정보관 앞 ${time('12:25')}–${time('12:52')} (27)`,
  `학생회관 ${time('12:32')}–${time('12:59')} (27)`,
];

const a5Band = (time: (clock: string) => string): object => ({
  range: { startAt: time('12:00'), endAt: time('18:30') },
  lanes: [
    {
      name: '나',
      busy: [
        { startAt: time('13:00'), endAt: time('13:50'), label: '24동 수업' },
        { startAt: time('17:00'), endAt: time('18:15'), label: '58동 수업' },
      ],
    },
    {
      name: '민수',
      busy: [
        { startAt: time('12:00'), endAt: time('12:15'), label: '302동 수업' },
        { startAt: time('15:30'), endAt: time('16:45'), label: '302동 수업' },
      ],
    },
  ],
  text: '12:15–12:43 · 함께 28분',
});

// What the model is told of a5's first Plan: the place's name, clock times, minutes, and names.
const A5_FIRST_IN_WORDS = {
  place: '302동 앞',
  start: '12:15',
  end: '12:43',
  togetherMinutes: 28,
  meeting: null,
  people: [
    { name: '나', from: '301동', walkMinutes: 3, by: 'walk', leaveAt: '12:12', leaveBy: '12:43' },
    {
      name: '<data label="friend.name">민수</data>',
      from: '302동',
      walkMinutes: 0,
      by: 'walk',
      leaveAt: '12:15',
      leaveBy: '15:30',
    },
  ],
};

describe('a5: "민수랑 만나고 싶어"', () => {
  const date = '2086-03-05';
  const time = timeOn(date);
  let friend: Named;
  let status = 0;
  let body: unknown = null;

  beforeAll(async () => {
    const asked = await a5(date);
    friend = asked.friend;
    const response = await stage.send(
      [resolve('민수'), planMeet(date, [friend.id]), { text: '12:15에 302동 앞에서 만나요.' }],
      { ...MEET_APP, context: { location: asked.at } },
      '민수랑 만나고 싶어',
    );
    status = response.status;
    body = response.body as unknown;
  });

  it('meets at 302동 앞 from 12:15 to 12:43, then at 301동 앞, five Plans in all', () => {
    expect(status).toBe(200);
    const answer = answerIn(body);
    expect(summary(answer)).toEqual(a5Plans(time));
    expect(answer.input).toEqual(meetInput(date, friend.id, { from: null, until: null }));
  });

  it("gives board a5's chips and band, each busy stretch named by its Class", () => {
    const answer = answerIn(body);
    expect(answer.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지', '민수']);
    expect(answer.plans[0]?.band).toMatchObject(a5Band(time));
  });

  it('gives the model names, clock times, and minutes, and nobody a course name', () => {
    expect(stage.model.toolResults()[1]).toMatchObject({
      result: 'planned',
      plans: expect.arrayContaining([A5_FIRST_IN_WORDS]) as unknown,
    });
    const given = JSON.stringify(stage.model.toolResults()[1]);
    for (const secret of ['latitude', friend.id, COURSE, ROOM]) {
      expect(given).not.toContain(secret);
    }
    expect(JSON.stringify(body)).not.toContain(COURSE);
  });
});

describe('a6: the band let go at 14:00', () => {
  // A way to 302동 앞 by the Tuesday shuttle is faster than the walk, so the meet starts 3 minutes earlier.
  it('is recalculated without the model, 302동 앞 first and 신양학술정보관 앞 from 14:00 to 15:20 among the plans', async () => {
    const date = '2086-03-12';
    const time = timeOn(date);
    const { friend } = await a5(date);
    stage.model.script();

    const response = await recalculate(stage, meetInput(date, friend.id, { from: '14:00', until: null }));

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    const plans = summary(answer);
    expect(plans[0]).toBe(`302동 앞 ${time('14:04')}–${time('15:30')} (86)`);
    expect(plans).toContain(`신양학술정보관 앞 ${time('14:00')}–${time('15:20')} (80)`);
    expect(answer.chips).toEqual([
      { kind: 'origin', text: '24동에서', userId: null },
      { kind: 'from', text: '14:00부터', userId: null },
      { kind: 'person', text: '민수', userId: friend.id },
    ]);
    expect(answer.plans[0]?.scene.people.find(({ userId }) => userId === friend.id)?.source).toBe('timetable');
    expect(stage.model.received()).toEqual([]);
  });

  it('refuses a meet without a Friend', async () => {
    const date = '2086-03-19';
    await stage.asking(date, '12:10');

    const response = await recalculate(stage, {
      kind: 'meet',
      date,
      people: [{ userId: stage.asker.id, constraints: [] }],
      window: { from: null, until: null },
      placeId: null,
    });

    expect(response.status).toBe(400);
  });
});

describe('The Friends not in a meet', () => {
  // Board a5, with 지수 sharing the exact position in 301동 and 하늘 sharing nothing.
  it("are in each Plan's band in the order of the Friend list, with stretches as a lane's and walks only when seen", async () => {
    const date = '2086-04-02';
    const time = timeOn(date);
    const { friend } = await a5(date);
    const [seen, hidden] = [await stage.friend('지수'), await stage.friend('하늘')];
    await stage.classAt(seen, '11:00', '12:30', '24');
    await stage.classAt(hidden, '17:00', '19:00', '58');
    await shareAt(stage.app, stage.asker, seen, 'exact');
    const { latitude, longitude } = await stage.numbered('301');
    await expectStatus(uploadPosition(stage.app, seen, { latitude, longitude }), 200);

    const response = await recalculate(stage, meetInput(date, friend.id, { from: null, until: null }));

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    expect(answer.plans[0]?.band).toMatchObject({
      range: { startAt: time('12:00'), endAt: time('18:30') },
      others: [
        {
          userId: seen.id,
          name: '지수',
          busy: [{ startAt: time('12:00'), endAt: time('12:30'), label: '24동 수업' }],
          walkMinutes: expect.any(Number) as unknown,
        },
        {
          userId: hidden.id,
          name: '하늘',
          busy: [{ startAt: time('17:00'), endAt: time('18:30'), label: '58동 수업' }],
          walkMinutes: null,
        },
      ],
    });
    for (const { band } of answer.plans) {
      expect(band.others?.map(({ userId }) => userId)).toEqual([seen.id, hidden.id]);
    }
  });
});

describe('An app that does not draw a meet', () => {
  it('is offered neither planMeet nor its rules, and the prompt it had before', async () => {
    await stage.asking('2086-03-26', '12:10');
    const systems: Record<string, string> = {};

    for (const [kind, clientCapabilities] of [
      ['answer', ['library', 'answer']],
      ['events', ['library', 'answer', 'events']],
      ['plain', ['library']],
      ['meet alone', ['meet']],
      ['answer and meet', ['library', 'answer', 'meet']],
    ] as const) {
      // oxlint-disable-next-line no-await-in-loop -- the scripted model answers one message at a time
      await stage.send([{ text: '네' }], { clientCapabilities }, '민수랑 만나고 싶어');
      systems[kind] = stage.model.system();
      const meets = kind === 'answer and meet';
      expect(toolNames(stage).includes('planMeet')).toBe(meets);
      expect(stage.model.system().includes(MEET_RULES)).toBe(meets);
    }
    expect(systems['answer and meet']?.replace(`\n\n${MEET_RULES}`, '')).toBe(systems.answer);
  });
});
