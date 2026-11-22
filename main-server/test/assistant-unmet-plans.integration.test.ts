/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// Conditions that cannot be met (P02-14), a meal planned at the Assistant's endpoint with the scripted model, the
// seed's walking table, and Places, and recalculated as the app's buttons and chips ask: board n11 ("민수, 지은이랑 지금
// 점심" with no time the three share now), n11b (13:00 이후), and n12 (a Restaurant that closes first), each on a
// Tuesday of 2080.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({ text: z.string(), answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

// The text of each line, its parts joined.
const textsOf = (lines: AnswerReply['plans'][number]['lines'] = []): string[] =>
  lines.map((line) => line.map(({ text }) => text).join(''));

const planMeal = (date: string, friendIds: string[], more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds, ...more },
});

// The body is sent as it is, so that a test may give a window the contract refuses.
function recalculate(input: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
    location: null,
  });
}

// Board n11's day: the asker in 301동 until 11:50 and in 24동 from 14:00, 민수 in 302동 until 12:15, and 지은 in 두산인문관
// until 11:50 and again from 12:00 to 12:50.
async function n11Day(date: string): Promise<[Named, Named]> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '14:00', '14:50', '24');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  const jieun = await stage.friend('지은');
  await stage.classAt(jieun, '11:00', '11:50', '8');
  await stage.classAt(jieun, '12:00', '12:50', '8');
  return [minsu, jieun];
}

async function askN11(date: string): Promise<{ answer: AnswerReply; jieun: Named; text: string }> {
  const [minsu, jieun] = await n11Day(date);
  const response = await stage.send(
    [
      resolve('민수'),
      resolve('지은'),
      planMeal(date, [minsu.id, jieun.id], { now: true }),
      { text: '지금은 셋이 같이 먹을 때가 없어요.' },
    ],
    {},
    '민수, 지은이랑 지금 점심',
  );
  expect(response.status).toBe(200);
  return { answer: answerIn(response.body), jieun, text: replySchema.parse(response.body).text };
}

describe('Board n11: 민수, 지은이랑 지금 점심', () => {
  it('keeps 지금 in the conditions, picks nothing, and says who has a Class again and when', async () => {
    const { answer } = await askN11('2080-01-02');

    expect(answer.input).toMatchObject({ window: { from: null, until: null, now: true } });
    expect(answer.plans).toEqual([]);
    expect(textsOf(answer.noPlan?.lines)).toEqual(['지금은 셋이 먹을 때가 없어요', '지은이 12:00에 다시 수업이에요']);
    expect(answer.chips.map(({ text }) => text)).toEqual(['301동에서', '지금', '민수', '지은']);
  });

  it('offers to leave out 지은 and to eat from 13:00', async () => {
    const { answer, jieun } = await askN11('2080-01-09');

    expect(answer.noPlan?.relax).toEqual([
      { kind: 'without', userId: jieun.id, label: '지은 빼고 보기' },
      { kind: 'from', time: '13:00', label: '13:00 이후' },
    ]);
  });

  it('tells the model there is no time now, without naming anyone', async () => {
    await askN11('2080-01-16');

    expect(stage.model.toolResults().at(-1)).toEqual({
      result: 'none',
      meal: 'lunch',
      reason: 'There is no time now when everyone can eat together; the app offers buttons to ease it.',
    });
  });
});

describe('The recalculations the buttons and chips of board n11 ask for', () => {
  it('plans from 13:00 with the from chip marked relaxed, saying what was eased (board n11b)', async () => {
    const { answer } = await askN11('2080-01-23');
    const input = z.custom<MealInput>().parse(answer.input);

    const response = await recalculate({ ...input, window: { ...input.window, from: '13:00' } });

    expect(response.status).toBe(200);
    const eased = z.custom<AnswerReply>().parse(response.body);
    expect(textsOf(eased.plans[0]?.lines)).toEqual([
      '13:06 301동식당 · 셋이 39분',
      '오늘 제육볶음',
      '지금 대신 13:00으로 미뤘어요',
    ]);
    expect(eased.chips[1]).toEqual({ kind: 'from', text: '13:00 이후', userId: null, mark: 'relaxed' });
    expect(eased.plans[0]?.basis[0]).toBe('지은이 12:50까지 수업이라 13:00부터 셋이 돼요');

    const back = await recalculate({ ...input, window: { ...input.window, from: null } });

    expect(z.custom<AnswerReply>().parse(back.body).noPlan?.relax).toHaveLength(2);
  });

  it('plans now without 지은', async () => {
    const { answer, jieun } = await askN11('2080-01-30');
    const input = z.custom<MealInput>().parse(answer.input);

    const response = await recalculate({ ...input, people: input.people.filter(({ userId }) => userId !== jieun.id) });

    const without = z.custom<AnswerReply>().parse(response.body);
    expect(without.noPlan).toBeNull();
    expect(without.plans[0]).toMatchObject({ id: '301동식당', startAt: '2080-01-30T12:18:00+09:00' });
  });

  it('refuses a window whose now is not true or false', async () => {
    const { answer } = await askN11('2080-02-06');
    const input = z.custom<MealInput>().parse(answer.input);

    const response = await recalculate({ ...input, window: { from: null, until: null, now: 'yes' } });

    expect(response.status).toBe(400);
  });
});

describe("Board n12: 배고파 at 13:47, 학생회관식당's lunch closing at 14:00", () => {
  it('drops it with its closing time and names it in the lines of the pick', async () => {
    const date = '2080-02-13';
    await stage.asking(date, '13:47');
    await stage.menusOn(date, RESTAURANTS);
    await stage.classAt(stage.asker, '12:30', '13:45', '24');
    stage.hoursAre({ 학생회관식당: { lunch: { opensAt: '11:00', closesAt: '14:00' } } });

    const response = await stage.send([planMeal(date, []), { text: '13:52에 자하연식당 2층에서 먹어요.' }]);

    const answer = answerIn(response.body);
    expect(answer.dropped.map(({ place, reason }) => `${place.label} ${reason}`)).toEqual([
      '학생회관식당 14:00 닫아요',
    ]);
    expect(answer.plans[0]?.id).toBe('자하연식당 2층');
    expect(textsOf(answer.plans[0]?.lines)).toEqual([
      '자하연식당 2층 · 13:52 도착',
      '오늘 제육볶음',
      '학생회관식당은 14:00에 닫아요',
    ]);
  });
});
