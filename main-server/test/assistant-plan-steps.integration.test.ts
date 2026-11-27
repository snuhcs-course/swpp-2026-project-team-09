/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type ReplyStep } from '../src/assistant/dto/answer.dto.js';
import { find } from './library.js';
import { MealPlanStage, type Place } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// One message that asks for a 관정 seat and then lunch (P03), at the Assistant's endpoint with the scripted model, the
// seed's walking table and Places. On a Tuesday at 09:00 the asker has a Class in 301동 from 09:30 to 10:45, so a
// lunch planned on its own sets out from 301동; after the seat it sets out from 관정 (62-1동) when the seat ends.

const stage = new MealPlanStage();
const DATE = '2087-01-07';
const NEXT_DAY = '2087-01-08';
const WORDS = '11시에 관정 갔다가 13시쯤 점심 먹으려고 하는데 7층 자리 잡고 스케줄 짜줘';
const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

let kwanjeong: Place;
let b301: Place;

beforeAll(async () => {
  await stage.start();
  await stage.asking(DATE, '09:00');
  kwanjeong = await stage.numbered('62-1');
  b301 = await stage.numbered('301');
});

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  cards: z.array(z.object({ kind: z.string(), library: z.object({ key: z.string() }).optional() })),
  steps: z.custom<ReplyStep[]>().optional(),
});

type Reply = z.infer<typeof replySchema>;

async function asked(steps: Step[], text = WORDS, clock = '09:00', more: object = {}): Promise<Reply> {
  await stage.asking(DATE, clock);
  await stage.menusOn(DATE, RESTAURANTS);
  await stage.classAt(stage.asker, '09:30', '10:45', '301');
  const response = await stage.send(steps, more, text);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

const seat = (date = DATE): Step => ({
  tool: 'proposeLibraryBooking',
  input: { spaceId: '7F-7A-zone2', date, start: '11:00', end: '13:00' },
});
const lunch = (more: object = {}, date = DATE): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', from: '13:00', ...more },
});
const said: Step = { text: '11:00–13:00 관정 7층 자리 카드를 보여 드렸고, 점심은 그다음에 먹어요.' };

const originOf = (answer: AnswerReply | null): { placeId: string; basis: string } | null => {
  const origin = answer?.plans[0]?.parts[0]?.origin ?? null;
  return origin === null ? null : { placeId: origin.place.placeId, basis: origin.basis };
};

describe('A seat and then lunch in one message', () => {
  it('answers both, in time order: the seat card first, then lunch from 관정 when the seat ends', async () => {
    const reply = await asked([find(['7F-7A-zone2']), seat(), lunch(), said]);

    expect(reply.cards.map(({ library }) => library?.key)).toEqual(['book:7F-7A-zone2:2087-01-07:1100:120']);
    expect(reply.steps?.map(({ kind, status, shows }) => ({ kind, status, shows }))).toEqual([
      { kind: 'seat', status: 'shown', shows: { kind: 'card', key: 'book:7F-7A-zone2:2087-01-07:1100:120' } },
      { kind: 'meal', status: 'shown', shows: { kind: 'answer' } },
    ]);
    expect(reply.steps?.[0]).toMatchObject({
      title: '7층 7A 열람실 2 구역',
      place: { placeId: kwanjeong.id, label: '62-1동' },
      startAt: `${DATE}T11:00:00+09:00`,
      endAt: `${DATE}T13:00:00+09:00`,
    });
    expect(reply.steps?.[1]?.from).toMatchObject({ placeId: kwanjeong.id, label: '62-1동' });
    expect(originOf(reply.answer)).toEqual({ placeId: kwanjeong.id, basis: 'chosen' });
    expect(Date.parse(reply.answer?.plans[0]?.startAt ?? '')).toBeGreaterThanOrEqual(
      Date.parse(`${DATE}T13:00:00+09:00`),
    );
  });
});

// 관정 named as the place to study, with no space and no booking, from an app that says `study-plan` (P10 ticket 28):
// a seat for the library tools, so that "관정 … + 밥" keeps its steps, as before the app said it. With `study-plan`
// only a place to study with no 관정 named is planStudy's.
describe('관정 named as the place to study, and then lunch, from an app that says study-plan', () => {
  const STUDY_APP = { clientCapabilities: ['library', 'answer', 'study-plan'] };
  const words = '11시에 관정에서 공부하다가 13시쯤 점심 먹을래';

  it('is told to the model as a seat for the library tools, not planStudy', async () => {
    await asked([find(['7F-7A-zone2']), seat(), lunch(), said], words, '09:00', STUDY_APP);

    expect(stage.model.system()).toContain('관정 named as the place to study');
    expect(stage.model.system()).toContain('관정에서 공부할래');
  });

  it('keeps the seat and the lunch as the steps of one message', async () => {
    const reply = await asked([find(['7F-7A-zone2']), seat(), lunch(), said], words, '09:00', STUDY_APP);

    expect(reply.steps?.map(({ kind, status }) => ({ kind, status }))).toEqual([
      { kind: 'seat', status: 'shown' },
      { kind: 'meal', status: 'shown' },
    ]);
    expect(reply.steps?.[1]?.from).toMatchObject({ placeId: kwanjeong.id });
  });
});

describe('The start of the step after the seat', () => {
  it('shows the start as a chip the User can change, and keeps it in the conditions sent back to recalculate', async () => {
    const { answer } = await asked([find(['7F-7A-zone2']), seat(), lunch(), said]);

    expect(answer?.chips).toContainEqual({ kind: 'origin', text: '62-1동에서', userId: null });
    expect(answer?.input.kind === 'meal' ? answer.input.people[0]?.constraints : null).toEqual([
      { kind: 'from', placeId: kwanjeong.id, source: 'asker' },
      { kind: 'notBefore', time: '13:00', source: 'asker' },
    ]);
  });

  it('gives the model the lunch it plans after the seat as the app shows it, from 관정', async () => {
    const reply = await asked([find(['7F-7A-zone2']), seat(), lunch(), said]);

    const planned = z
      .object({ plans: z.array(z.object({ restaurant: z.string(), people: z.array(z.object({ from: z.string() })) })) })
      .parse(stage.model.toolResults()[2]);
    expect(planned.plans[0]?.people[0]?.from).toBe('62-1동');
    expect(planned.plans[0]?.restaurant).toBe(reply.answer?.plans[0]?.id);
  });

  it('plans lunch from 관정 even when the model plans it before it shows the seat', async () => {
    const reply = await asked([lunch(), find(['7F-7A-zone2']), seat(), said]);

    expect(reply.steps?.map(({ kind }) => kind)).toEqual(['seat', 'meal']);
    expect(originOf(reply.answer)).toEqual({ placeId: kwanjeong.id, basis: 'chosen' });
  });

  it('keeps the start the User named for the meal', async () => {
    const reply = await asked(
      [
        find(['7F-7A-zone2']),
        seat(),
        { tool: 'resolvePlace', input: { words: '301동' } },
        lunch({ startPlaceId: b301.id }),
        said,
      ],
      '11시에 관정 갔다가 13시에 301동에서 출발해서 점심 먹을래',
    );

    expect(originOf(reply.answer)).toEqual({ placeId: b301.id, basis: 'chosen' });
    expect(reply.steps?.[1]?.from?.placeId).toBe(b301.id);
  });
});

describe('A seat that cannot be booked, and then lunch', () => {
  it('says which step was not done and why, and still plans lunch from 관정', async () => {
    await stage.menusOn(NEXT_DAY, RESTAURANTS);
    const reply = await asked([find(['7F-7A-zone2']), seat(NEXT_DAY), lunch({}, NEXT_DAY), said]);

    expect(reply.cards).toEqual([]);
    expect(reply.steps?.map(({ kind, status }) => ({ kind, status }))).toEqual([
      { kind: 'seat', status: 'not-done' },
      { kind: 'meal', status: 'shown' },
    ]);
    expect(reply.steps?.[0]?.reason).toContain('당일만 예약할 수 있어요');
    expect(reply.steps?.[0]?.place?.placeId).toBe(kwanjeong.id);
    expect(originOf(reply.answer)).toEqual({ placeId: kwanjeong.id, basis: 'chosen' });
  });
});

describe('A seat refused because 관정 is closed then', () => {
  // Asked at 05:30 for 06:00, before 관정 opens at 07:00: a seat for a later day is refused for its day alone.
  it('has no place, and lunch does not set out from 관정', async () => {
    const early: Step = {
      tool: 'proposeLibraryBooking',
      input: { spaceId: '7F-7A-zone2', date: DATE, start: '06:00', end: '08:00' },
    };
    const reply = await asked([find(['7F-7A-zone2']), early, lunch(), said], WORDS, '05:30');

    expect(reply.steps?.[0]).toMatchObject({ kind: 'seat', status: 'not-done', place: null });
    expect(reply.steps?.[0]?.reason).toContain('07:00–23:00에 이용할 수 있어요');
    expect(originOf(reply.answer)?.placeId).not.toBe(kwanjeong.id);
  });
});

describe('A seat refused and then asked again in the same message', () => {
  it('lists the seat once, as shown, and lunch after it', async () => {
    const tooLong: Step = {
      tool: 'proposeLibraryBooking',
      input: { spaceId: '7F-7A-zone2', date: DATE, start: '11:00', end: '19:00' },
    };
    const reply = await asked([find(['7F-7A-zone2']), tooLong, seat(), lunch(), said]);

    expect(reply.steps?.map(({ kind, status }) => ({ kind, status }))).toEqual([
      { kind: 'seat', status: 'shown' },
      { kind: 'meal', status: 'shown' },
    ]);
  });

  it('has no steps when the seat was all it asked for', async () => {
    const tooLong: Step = {
      tool: 'proposeLibraryBooking',
      input: { spaceId: '7F-7A-zone2', date: DATE, start: '11:00', end: '19:00' },
    };
    const reply = await asked(
      [find(['7F-7A-zone2']), tooLong, seat(), { text: '카드를 보여 드렸어요.' }],
      '7층 11시부터',
    );

    expect(reply).not.toHaveProperty('steps');
    expect(reply.cards).toHaveLength(1);
  });
});

describe('A seat that starts as the meal window opens', () => {
  it('is the step lunch follows, when the User named no time for lunch', async () => {
    const reply = await asked(
      [find(['7F-7A-zone2']), seat(), { tool: 'planMeal', input: { date: DATE, meal: 'lunch' } }, said],
      '11시부터 2시간 관정 7층 자리 잡고 점심도 짜줘',
    );

    expect(originOf(reply.answer)).toEqual({ placeId: kwanjeong.id, basis: 'chosen' });
  });
});

describe('A single request', () => {
  it('stays as it was: lunch alone sets out from the Class before it, and the reply has no steps', async () => {
    const reply = await asked(
      [lunch(), { text: '수업 끝나고 바로 갈 수 있는 301동식당을 추천해요.' }],
      '13시쯤 점심 먹자',
    );

    expect(reply).not.toHaveProperty('steps');
    expect(originOf(reply.answer)).toEqual({ placeId: b301.id, basis: 'timetable' });
  });

  it('stays as it was: a seat alone has no steps', async () => {
    const reply = await asked(
      [find(['7F-7A-zone2']), seat(), { text: '카드를 보여 드렸어요.' }],
      '11시부터 13시까지 7층 자리',
    );

    expect(reply).not.toHaveProperty('steps');
    expect(reply.cards).toHaveLength(1);
  });
});
