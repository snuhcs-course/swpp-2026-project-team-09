/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { find } from './library.js';
import { type Step } from './scripted-model.js';
import {
  ANSWERS_APP,
  askerConstraints,
  chainFrom,
  clock,
  DATE,
  meal,
  OLD_APP,
  originOf,
  said,
  seatAt,
  StepsStage,
} from './steps-stage.js';

// The steps of one message over every answer, for an app that says `answers` (P05 ticket 74), on the stage of
// `steps-stage.ts`. A later step that can move sets out from the step before it when that one ends; one at a fixed time
// stays, and says when it cannot be reached.

const steps = new StepsStage();
const { stage } = steps;
const asked = steps.asked.bind(steps);
const eventAt = steps.eventAt.bind(steps);

beforeAll(() => steps.start());

afterAll(() => steps.stop());

beforeEach(() => steps.morning());

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

// Fault A2, by time alone: a seat that starts inside the dinner window before an hour-long dinner could come first is
// before it; one later is after it, whatever order the model called the tools in.
describe('A seat inside the dinner window and dinner', () => {
  it.each([
    ['an app that says answers', ANSWERS_APP, 'step'],
    ['an app before it', OLD_APP, 'asker'],
  ])('sets dinner out from 관정 when a seat from 17:30 ends, for %s', async (_case, app, source) => {
    const kwanjeong = await stage.numbered('62-1');
    const reply = await asked(
      [find(['7F-7A-zone2']), seatAt('17:30', '19:00'), meal('dinner'), said],
      '5시 반부터 관정 있다가 저녁',
      app,
    );

    expect(askerConstraints(reply.answer?.input)).toEqual(chainFrom(kwanjeong.id, '19:00', source));
  });

  it.each([
    ['an app that says answers', ANSWERS_APP],
    ['an app before it', OLD_APP],
  ])('keeps dinner before a seat from 19:00 booked first, for %s', async (_case, app) => {
    const reply = await asked(
      [find(['7F-7A-zone2']), seatAt('19:00', '21:00'), meal('dinner'), said],
      '저녁 먹고 7시부터 관정',
      app,
    );

    expect(askerConstraints(reply.answer?.input)).toEqual([]);
    expect(Date.parse(reply.answer?.plans[0]?.endAt ?? '')).toBeLessThanOrEqual(Date.parse(`${DATE}T19:00:00+09:00`));
  });
});
