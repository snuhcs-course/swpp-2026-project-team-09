/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// A meeting's, a new party's and a study together's answer without a plan keep their time card (P05 ticket 65), as a
// meal's does (assistant-no-plan-band-meal): the first answer in the chat and the answer recalculated both carry
// `noPlan.band`, everyone's lanes over the window asked. Each test stands on a Tuesday of April or May 2061, which no
// other file uses.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const MEET_APP = ['library', 'answer', 'meet'];
const EVENTS_APP = ['library', 'answer', 'events'];
const STUDY_APP = ['library', 'answer', 'study-plan', 'study-group'];

const replied = (body: unknown): AnswerReply => z.object({ answer: z.custom<AnswerReply>() }).parse(body).answer;

const recalculated = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

function recalculate(input: object, clientCapabilities: string[] = ['library', 'answer']): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
    location: null,
    clientCapabilities,
  });
}

const peopleOf = (...people: { id: string }[]): object[] => people.map(({ id }) => ({ userId: id, constraints: [] }));

// The asker, free from 13:00, and 민수, in a Class in 302동 from 14:00 to 16:00.
async function minsuFrom(date: string, clock: string): Promise<Named> {
  await stage.asking(date, clock);
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '14:00', '16:00', '302');
  return minsu;
}

const MEET_WINDOW = { from: '14:30', until: '15:30' };

// Both lanes over 14:30–15:30, 민수 in his Class all of it.
function meetBand(date: string, minsu: Named): object {
  const at = timeOn(date);
  return {
    range: { startAt: at('14:30'), endAt: at('15:30') },
    now: at('13:00'),
    lanes: [
      { userId: stage.asker.id, name: '나', busy: [] },
      { userId: minsu.id, name: '민수', busy: [{ startAt: at('14:30'), endAt: at('15:30'), label: '302동 수업' }] },
    ],
    others: [],
    startAt: at('14:30'),
    endAt: at('15:30'),
    text: '14:30–15:30',
  };
}

// 탁구 at 15:00 at 301동, while the asker is in a Class there from 14:30 to 16:00.
async function inClassAt301(date: string): Promise<string> {
  await stage.asking(date, '10:00');
  await stage.classAt(stage.asker, '14:30', '16:00', '301');
  return (await stage.numbered('301')).id;
}

function partyBand(date: string): object {
  const at = timeOn(date);
  return {
    startAt: at('15:00'),
    lanes: [{ userId: stage.asker.id, name: '나', busy: [{ startAt: at('14:30'), label: '301동 수업' }] }],
  };
}

const STUDY_WINDOW = { from: '15:00', until: '17:00' };

// The asker in a Class in 301동 from 14:00 to 17:30, over all of the window, and 민수 free.
async function askerInClass(date: string): Promise<Named> {
  await stage.asking(date, '10:00');
  await stage.classAt(stage.asker, '14:00', '17:30', '301');
  return stage.friend('민수');
}

function studyBand(date: string, minsu: Named): object {
  const at = timeOn(date);
  const inClass = [{ startAt: at('15:00'), endAt: at('17:00'), label: '301동 수업' }];
  return {
    range: { startAt: at('15:00'), endAt: at('17:00') },
    now: at('10:00'),
    lanes: [
      { userId: stage.asker.id, name: '나', busy: inClass },
      { userId: minsu.id, name: '민수', busy: [] },
    ],
    others: [],
    startAt: at('15:00'),
    endAt: at('17:00'),
    text: '15:00–17:00',
  };
}

describe('A meeting without a plan keeps its time card', () => {
  it('asked in the chat with a Friend in a Class all of the window', async () => {
    const date = '2061-04-19';
    const minsu = await minsuFrom(date, '13:00');

    const steps = [resolve('민수'), { tool: 'planMeet', input: { date, friendIds: [minsu.id], ...MEET_WINDOW } }];
    const sent = await stage.send([...steps, { text: '…' }], { clientCapabilities: MEET_APP }, '민수랑 2시 반에 만나');
    const answer = replied(sent.body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.reason).toBe('no-shared-time');
    expect(answer.noPlan?.band).toEqual(meetBand(date, minsu));
  });

  it("recalculated with the window narrowed to the Friend's Class", async () => {
    const date = '2061-04-26';
    const minsu = await minsuFrom(date, '13:00');
    const anyTime = { from: null, until: null };
    const input = { kind: 'meet', date, people: peopleOf(stage.asker, minsu), window: anyTime, placeId: null };
    expect(recalculated((await recalculate(input, MEET_APP)).body).plans.length).toBeGreaterThan(0);

    const answer = recalculated((await recalculate({ ...input, window: MEET_WINDOW }, MEET_APP)).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band).toEqual(meetBand(date, minsu));
  });
});

describe('A new party without a plan keeps its time card', () => {
  it('asked in the chat at a time the asker is in a Class', async () => {
    const date = '2061-05-03';
    const placeId = await inClassAt301(date);

    const steps = [
      { tool: 'resolvePlace', input: { words: '301동' } },
      { tool: 'planNewQuest', input: { date, title: '탁구', placeId, time: '15:00' } },
      { text: '…' },
    ];
    const answer = replied((await stage.send(steps, { clientCapabilities: EVENTS_APP }, '3시 301동 탁구')).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.reason).toBe('no-fit');
    expect(answer.noPlan?.band).toMatchObject(partyBand(date));
  });

  it('recalculated at that time', async () => {
    const date = '2061-05-10';
    const placeId = await inClassAt301(date);
    const input = { kind: 'new-quest', date, globalEventId: null, title: '탁구', placeId, time: '15:00' };

    const answer = recalculated((await recalculate({ ...input, people: peopleOf(stage.asker) }, EVENTS_APP)).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band).toMatchObject(partyBand(date));
  });
});

describe('A study together without a plan keeps its time card', () => {
  it('asked in the chat with a Friend', async () => {
    const date = '2061-05-17';
    const minsu = await askerInClass(date);

    const input = { friendIds: [minsu.id], date, ...STUDY_WINDOW };
    const steps = [resolve('민수'), { tool: 'planStudyGroup', input }, { text: '…' }];
    const sent = await stage.send(steps, { clientCapabilities: STUDY_APP }, '민수랑 3시부터 5시까지 공부');
    const answer = replied(sent.body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.reason).toBe('no-shared-time');
    expect(answer.noPlan?.band).toEqual(studyBand(date, minsu));
  });

  it('recalculated with the Friend', async () => {
    const date = '2061-05-24';
    const minsu = await askerInClass(date);
    const chosen = { seatSpaceId: null, roomSpaceId: null };
    const people = peopleOf(stage.asker, minsu);
    const input = { kind: 'study', date, what: 'any', people, together: true, window: STUDY_WINDOW, area: null };

    const answer = recalculated((await recalculate({ ...input, minutes: null, chosen }, STUDY_APP)).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band).toEqual(studyBand(date, minsu));
  });
});
