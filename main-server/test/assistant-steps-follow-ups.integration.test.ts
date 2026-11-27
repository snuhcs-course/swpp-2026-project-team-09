/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { find } from './library.js';
import {
  ANSWERS_APP,
  askerConstraints,
  chainFrom,
  clock,
  DATE,
  meal,
  OLD_APP,
  said,
  seatAt,
  StepsStage,
} from './steps-stage.js';

// Follow-ups on the steps on screen, and the words of a step the server planned again, for an app that says `answers`
// and one before it (P05 ticket 74), on the stage of `steps-stage.ts`. The app sends back the steps on screen and every
// answer's conditions.

const steps = new StepsStage();
const { stage } = steps;
const asked = steps.asked.bind(steps);
const eventAt = steps.eventAt.bind(steps);

beforeAll(() => steps.start());

afterAll(() => steps.stop());

beforeEach(() => steps.morning());

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

// Fault G5: the model planned lunch before the seat, worded that lunch, and answered something else besides.
describe('Lunch planned before the seat it follows', () => {
  const WORDS = '11시에 301동식당에서 점심 먹어요. 셔틀은 12:10에 와요.';

  it.each([
    ['an app that says answers', ANSWERS_APP],
    ['an app before it', OLD_APP],
  ])(
    'stands as planned again from the seat; the words stay whole, with one sentence for lunch, for %s',
    async (_case, app) => {
      const reply = await asked(
        [meal('lunch'), find(['7F-7A-zone2']), seatAt('11:00', '13:00'), { text: WORDS }],
        '11시부터 13시까지 관정 7층 잡고 점심, 그리고 셔틀 몇 시야?',
        app,
      );

      const lunch = reply.answer;
      expect(Date.parse(lunch?.plans[0]?.startAt ?? '')).toBeGreaterThanOrEqual(Date.parse(`${DATE}T13:00:00+09:00`));
      expect(reply.text).toBe(
        `${WORDS} 앞 일정에 맞춰 ${clock(lunch?.plans[0]?.startAt)} ${lunch?.plans[0]?.title ?? ''}으로 바꿨어요.`,
      );
    },
  );

  it('adds nothing when the plan the model worded is the one drawn', async () => {
    const reply = await asked(
      [find(['7F-7A-zone2']), seatAt('11:00', '13:00'), meal('lunch'), { text: WORDS }],
      '11시부터 13시까지 관정 7층 잡고 점심, 그리고 셔틀 몇 시야?',
    );

    expect(reply.text).toBe(WORDS);
  });
});

// Fault 1 of the read of #703: dinner asked again finds nothing, beside lunch kept from an earlier reply.
describe('Dinner withdrawn beside lunch on screen', () => {
  it('names dinner withdrawn and does not take lunch off the screen', async () => {
    const first = await asked([meal('lunch'), meal('dinner'), said], '점심이랑 저녁 짜줘');
    const [lunch, dinner] = first.answers ?? [];
    stage.standAt(`${DATE}T20:10:30+09:00`);

    const context = { conditions: dinner?.input, answers: [lunch?.input, dinner?.input], steps: first.steps };
    const reply = await asked(
      [meal('dinner'), { text: '오늘 저녁은 끝났어요.' }],
      '저녁 다른 데',
      ANSWERS_APP,
      context,
    );

    expect(reply.withdrawn).toEqual([dinner?.key]);
    expect(reply).not.toHaveProperty('clears');
    expect(reply.answers).toEqual([]);
  });
});
