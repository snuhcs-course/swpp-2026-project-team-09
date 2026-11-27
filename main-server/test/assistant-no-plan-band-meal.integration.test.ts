/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named, planMeal } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// A meal's answer without a plan keeps its time card (P05 ticket 65). On the user's phone (2026-11-27), "+ 같이" on a
// lunch plan answered "같이 비는 시간이 없어요" and the card was gone, so the Friend could not be taken out again;
// "배고파" in a Class did the same. Every way to such an answer carries `noPlan.band`: everyone's lanes over the meal's
// window, from now when it has begun, the Friends who could be added and the Classes left out. Each test stands on a
// Tuesday of March or April 2061, which no other file uses.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당'];

const replied = (body: unknown): AnswerReply => z.object({ answer: z.custom<AnswerReply>() }).parse(body).answer;

const recalculated = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

const timeOn =
  (date: string): ((clock: string) => string) =>
  (clock) =>
    `${date}T${clock}:00+09:00`;

function recalculate(input: MealInput): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
    location: null,
  });
}

const lunchOf = (date: string, people: readonly { id: string }[], more: Partial<MealInput> = {}): MealInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: people.map(({ id }) => ({ userId: id, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
  ...more,
});

// The asker, free at 11:30; 민수, in a Class in 302동 all lunch; and 지은, a Friend not asked, in 83동 from 13:00.
async function minsuInClass(date: string): Promise<{ minsu: Named; jieun: Named }> {
  await stage.asking(date, '11:30');
  await stage.menusOn(date, RESTAURANTS);
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '14:30', '302');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '13:00', '14:00', '83');
  return { minsu, jieun };
}

describe('A lunch without a plan, asked in the chat, keeps its time card', () => {
  it('"배고파" in a Class that fills the rest of lunch: the asker\'s lane from now to the end of lunch', async () => {
    const date = '2061-03-01';
    const at = timeOn(date);
    await stage.asking(date, '12:10');
    await stage.menusOn(date, RESTAURANTS);
    await stage.classAt(stage.asker, '12:00', '14:30', '301');

    const answer = replied((await stage.send([planMeal(date), { text: '…' }], {}, '배고파')).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.reason).toBe('no-shared-time');
    expect(answer.noPlan?.band).toEqual({
      range: { startAt: at('12:00'), endAt: at('14:30') },
      now: at('12:10'),
      lanes: [
        {
          userId: stage.asker.id,
          name: '나',
          busy: [{ startAt: at('12:00'), endAt: at('14:30'), label: '301동 수업' }],
        },
      ],
      others: [],
      startAt: at('12:10'),
      endAt: at('14:30'),
      text: '12:10–14:30',
    });
  });

  it('a day whose menus are not posted: the band', async () => {
    const date = '2061-04-12';
    const at = timeOn(date);
    await stage.asking(date, '10:00');

    const answer = replied((await stage.send([planMeal(date), { text: '…' }], {}, '점심 뭐 먹지')).body);

    expect(answer.noPlan?.reason).toBe('no-menu');
    expect(answer.noPlan?.band).toMatchObject({
      lanes: [{ userId: stage.asker.id, name: '나', busy: [] }],
      startAt: at('11:00'),
      endAt: at('14:30'),
    });
  });
});

describe('A lunch without a plan, recalculated with a Friend added, keeps its time card', () => {
  it('"+ 같이" with a Friend in a Class all lunch: every lane, and the Friend who could be added', async () => {
    const date = '2061-03-08';
    const at = timeOn(date);
    const { minsu, jieun } = await minsuInClass(date);
    expect(recalculated((await recalculate(lunchOf(date, [stage.asker]))).body).plans.length).toBeGreaterThan(0);

    const answer = recalculated((await recalculate(lunchOf(date, [stage.asker, minsu]))).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.reason).toBe('no-shared-time');
    expect(answer.noPlan?.band).toEqual({
      range: { startAt: at('11:30'), endAt: at('14:30') },
      now: at('11:30'),
      lanes: [
        { userId: stage.asker.id, name: '나', busy: [] },
        { userId: minsu.id, name: '민수', busy: [{ startAt: at('11:30'), endAt: at('14:30'), label: '302동 수업' }] },
      ],
      others: [
        {
          userId: jieun.id,
          name: '지은',
          busy: [{ startAt: at('13:00'), endAt: at('14:00'), label: '83동 수업' }],
          walkMinutes: null,
        },
      ],
      startAt: at('11:30'),
      endAt: at('14:30'),
      text: '11:30–14:30',
    });
  });
});

describe('A lunch without a plan, recalculated with its window narrowed, keeps its time card', () => {
  it('a window narrowed to a Class: the lanes over the window said', async () => {
    const date = '2061-03-15';
    const at = timeOn(date);
    await stage.asking(date, '10:00');
    await stage.menusOn(date, RESTAURANTS);
    await stage.classAt(stage.asker, '12:00', '13:00', '301');

    const window = { from: '12:00', until: '13:00' };
    const answer = recalculated((await recalculate(lunchOf(date, [stage.asker], { window }))).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band).toEqual({
      range: { startAt: at('12:00'), endAt: at('13:00') },
      now: at('10:00'),
      lanes: [
        {
          userId: stage.asker.id,
          name: '나',
          busy: [{ startAt: at('12:00'), endAt: at('13:00'), label: '301동 수업' }],
        },
      ],
      others: [],
      startAt: at('12:00'),
      endAt: at('13:00'),
      text: '12:00–13:00',
    });
  });
});

describe('A lunch without a plan, recalculated with a Class left out, keeps its time card', () => {
  it('a Class left out, with a Friend in a Class all lunch: the Class in `skipped`, in no lane', async () => {
    const date = '2061-03-22';
    const at = timeOn(date);
    await stage.asking(date, '10:00');
    await stage.menusOn(date, RESTAURANTS);
    const noon = await stage.classAt(stage.asker, '12:00', '13:00', '301');
    const minsu = await stage.friend('민수');
    await stage.classAt(minsu, '11:00', '14:30', '302');

    const answer = recalculated((await recalculate(lunchOf(date, [stage.asker, minsu], { skipped: [noon] }))).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band).toEqual({
      range: { startAt: at('11:00'), endAt: at('14:30') },
      now: at('10:00'),
      lanes: [
        { userId: stage.asker.id, name: '나', busy: [] },
        { userId: minsu.id, name: '민수', busy: [{ startAt: at('11:00'), endAt: at('14:30'), label: '302동 수업' }] },
      ],
      others: [],
      skipped: [{ id: noon, startAt: at('12:00'), endAt: at('13:00'), label: '301동 수업' }],
      startAt: at('11:00'),
      endAt: at('14:30'),
      text: '11:00–14:30',
    });
  });
});

describe('A lunch without a plan, recalculated with a price and a kind of food, keeps its time card', () => {
  it('a price and a kind of food set on it: the same band', async () => {
    const date = '2061-03-29';
    const at = timeOn(date);
    const { minsu } = await minsuInClass(date);
    const plain = recalculated((await recalculate(lunchOf(date, [stage.asker, minsu]))).body);

    const chosen = lunchOf(date, [stage.asker, minsu], { maxPrice: 5000, cuisine: '한식' });
    const answer = recalculated((await recalculate(chosen)).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band).toEqual(plain.noPlan?.band);
    expect(answer.noPlan?.band).toMatchObject({ startAt: at('11:30'), endAt: at('14:30') });
  });
});

describe('A lunch without a plan, recalculated at a fixed Place, keeps its time card', () => {
  it('a Place where no Restaurant serves lunch: the band, without a plan to draw', async () => {
    const date = '2061-04-05';
    const at = timeOn(date);
    await stage.asking(date, '10:00');
    await stage.menusOn(date, RESTAURANTS);
    const { id: placeId } = await stage.numbered('83');

    const answer = recalculated((await recalculate(lunchOf(date, [stage.asker], { placeId }))).body);

    expect(answer.noPlan?.reason).toBe('no-fit');
    expect(answer.noPlan?.band).toMatchObject({
      range: { startAt: at('11:00'), endAt: at('14:30') },
      lanes: [{ userId: stage.asker.id, name: '나', busy: [] }],
      startAt: at('11:00'),
      endAt: at('14:30'),
    });
  });
});

// The fixture the app's time card is written against (no-plan-band.json): this answer with each id and the day as the
// fixture gives them. Asked on a Wednesday at 12:10, the asker leaves out a Class in 301동 from 12:00 to 13:00 and adds
// 민수, in a Class in 302동 all lunch, and 서준, in 24동 from 13:00; 지은, in 83동 from 13:00, is not asked.
const FIXTURE_DATE = '2026-11-04';
const FIXTURE_IDS = {
  asker: 'a3f1c2d4-0000-4000-8000-000000000000',
  minsu: 'a3f1c2d4-0000-4000-8000-0000000000a1',
  seojun: 'a3f1c2d4-0000-4000-8000-0000000000a2',
  jieun: 'a3f1c2d4-0000-4000-8000-0000000000a3',
  noon: 'c1a55e00-0000-4000-8000-000000000001',
};

type FixtureIds = Record<keyof typeof FIXTURE_IDS, string>;

function asFixture(answer: AnswerReply, ids: FixtureIds, date: string): unknown {
  let text = JSON.stringify(answer).replaceAll(date, FIXTURE_DATE);
  for (const who of ['asker', 'minsu', 'seojun', 'jieun', 'noon'] as const) {
    text = text.replaceAll(ids[who], FIXTURE_IDS[who]);
  }
  return JSON.parse(text);
}

async function fixtureDay(date: string): Promise<FixtureIds> {
  await stage.asking(date, '12:10');
  await stage.menusOn(date, RESTAURANTS);
  const noon = await stage.classAt(stage.asker, '12:00', '13:00', '301', 'wednesday');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '14:30', '302', 'wednesday');
  const seojun = await stage.friend('서준');
  await stage.classAt(seojun, '13:00', '14:30', '24', 'wednesday');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '13:00', '14:00', '83', 'wednesday');
  return { asker: stage.asker.id, minsu: minsu.id, seojun: seojun.id, jieun: jieun.id, noon };
}

describe('The fixture of the app', () => {
  it('is the answer of "+ 같이" with two Friends and a Class left out', async () => {
    const date = '2061-06-08';
    const ids = await fixtureDay(date);
    const people = [ids.asker, ids.minsu, ids.seojun].map((id) => ({ id }));

    const answer = recalculated((await recalculate(lunchOf(date, people, { skipped: [ids.noon] }))).body);

    const fixture: unknown = JSON.parse(readFileSync(new URL('fixtures/no-plan-band.json', import.meta.url), 'utf8'));
    expect(asFixture(answer, ids, date)).toEqual(fixture);
  });
});
