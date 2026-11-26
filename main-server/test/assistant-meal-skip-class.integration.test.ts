/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// A Class the asker leaves out of a meal's plan for the conversation ("내일 1시 수업 휴강이야. 점심 뭐 먹을까?"),
// at the Assistant's endpoint and at POST /assistant/answers. Partitions: how planMeal names it (its start, its name,
// several, one that names none or several Classes), the conditions on screen (none, with a Class left out, then put
// back), a recalculation (its own Class, an id that is none of them, an id of another shape), and the Class left out
// before the meal or after it. Expected values: the Tuesday below, where lunch is 11:00 to 14:30.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const TUESDAY = '2097-09-03';
const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];
const at = (clock: string): string => `${TUESDAY}T${clock}:00+09:00`;

const answerSchema = z.object({ answer: z.custom<AnswerReply | null>() });

interface Day {
  morning: string;
  noon: string;
  afternoon: string;
}

// A Tuesday asked at 10:00: 운영체제 09:00–10:45 in 301동, 자료구조 12:00–13:15 in 302동, and 자료구조실습 15:00–16:15
// in 301동.
async function tuesday(): Promise<Day> {
  await stage.asking(TUESDAY, '10:00');
  await stage.menusOn(TUESDAY, RESTAURANTS);
  return {
    morning: await stage.classAt(stage.asker, '09:00', '10:45', '301', 'tuesday', '운영체제'),
    noon: await stage.classAt(stage.asker, '12:00', '13:15', '302', 'tuesday', '자료구조'),
    afternoon: await stage.classAt(stage.asker, '15:00', '16:15', '301', 'tuesday', '자료구조실습'),
  };
}

const lunchWith = (more: object): Step => ({
  tool: 'planMeal',
  input: { date: TUESDAY, meal: 'lunch', friendIds: [], ...more },
});

async function asked(more: object, context?: object): Promise<AnswerReply | null> {
  const response = await stage.send([lunchWith(more), { text: '…' }], context === undefined ? {} : { context });
  expect(response.status).toBe(200);
  return answerSchema.parse(response.body).answer;
}

function planned(answer: AnswerReply | null): AnswerReply {
  if (answer === null) {
    throw new Error('Expected a meal answer');
  }
  return answer;
}

const mine = (answer: AnswerReply): AnswerReply['plans'][number]['parts'][number] | undefined =>
  answer.plans[0]?.parts.find(({ me }) => me);

function recalculate(input: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
  });
}

describe('A Class left out by planMeal', () => {
  it('by its start is free for the meal: kept in the input, drawn apart on the band, and the next item moves on', async () => {
    const { noon } = await tuesday();

    const answer = planned(await asked({ skipClasses: ['12:00'] }));

    expect(answer.input).toMatchObject({ skipped: [noon] });
    const band = answer.plans[0]?.band;
    expect(band?.skipped).toEqual([{ id: noon, startAt: at('12:00'), endAt: at('13:15'), label: '302동 수업' }]);
    expect(band?.lanes[0]?.busy.map(({ startAt }) => startAt)).not.toContain(at('12:00'));
    expect(mine(answer)?.next?.startAt).toBe(at('15:00'));
  });

  it("reaches the band's range over the time it frees, to the meal's end", async () => {
    await tuesday();

    const answer = planned(await asked({ skipClasses: ['12:00'] }));

    expect(answer.plans[0]?.band.range.endAt).toBe(at('14:30'));
  });

  it('by its name, and several at once', async () => {
    const { noon, afternoon } = await tuesday();

    expect(planned(await asked({ skipClasses: ['자료구조'] })).input).toMatchObject({ skipped: [noon] });
    expect(planned(await asked({ skipClasses: ['자료구조', '15:00'] })).input).toMatchObject({
      skipped: [noon, afternoon],
    });
  });

  it('says what it left out to the model', async () => {
    await tuesday();

    await asked({ skipClasses: ['12:00'] });

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned', skipped: ['12:00 자료구조'] });
  });
});

describe('A word of planMeal that names no Class of the day, or several', () => {
  it.each([
    ['a start of no Class', '17:00'],
    ['a part of the names of several Classes', '자료'],
  ])('plans nothing for %s, and gives the day’s Classes to ask which', async (_, word) => {
    await tuesday();

    const answer = await asked({ skipClasses: [word] });

    expect(answer).toBeNull();
    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'unknownClass',
      unknown: [word],
      classes: ['09:00 운영체제', '12:00 자료구조', '15:00 자료구조실습'],
    });
  });
});

describe('A Class left out, on the conditions on screen', () => {
  it('stays left out on the same day, and comes back when the User says they go', async () => {
    const { noon } = await tuesday();
    const first = planned(await asked({ skipClasses: ['12:00'] }));

    const kept = planned(await asked({}, { conditions: first.input }));
    const back = planned(await asked({ attendClasses: ['12:00'] }, { conditions: first.input }));

    expect(kept.input).toMatchObject({ skipped: [noon] });
    expect(back.input).not.toHaveProperty('skipped');
    expect(back.plans[0]?.band).not.toHaveProperty('skipped');
  });
});

describe('A recalculation with Classes left out', () => {
  it("keeps the asker's own Class of the day, and drops an id that is none of them", async () => {
    const { noon } = await tuesday();
    const input: MealInput = {
      kind: 'meal',
      date: TUESDAY,
      meal: 'lunch',
      people: [{ userId: stage.asker.id, constraints: [] }],
      window: { from: null, until: null },
      placeId: null,
      skipped: [noon, randomUUID()],
    };

    const response = await recalculate(input);

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>((value) => value !== null).parse(response.body);
    expect(answer.input).toMatchObject({ skipped: [noon] });
    expect(answer.plans[0]?.band.skipped?.map(({ id }) => id)).toEqual([noon]);
  });

  it('is refused with an id of another shape', async () => {
    await tuesday();
    const input = {
      kind: 'meal',
      date: TUESDAY,
      meal: 'lunch',
      people: [{ userId: stage.asker.id, constraints: [] }],
      window: { from: null, until: null },
      placeId: null,
      skipped: ['12:00'],
    };

    expect((await recalculate(input)).status).toBe(400);
  });
});

describe('The Class before the meal left out', () => {
  it('sets the asker out from the item before it', async () => {
    await stage.asking(TUESDAY, '07:30');
    await stage.menusOn(TUESDAY, RESTAURANTS);
    await stage.classAt(stage.asker, '08:00', '09:00', '301', 'tuesday', '운영체제');
    await stage.classAt(stage.asker, '10:00', '11:00', '302', 'tuesday', '자료구조');

    const answer = planned(await asked({ skipClasses: ['10:00'] }));

    expect(mine(answer)?.origin).toMatchObject({ place: { label: '301동' }, basis: 'timetable' });
  });
});
