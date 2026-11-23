/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerLine, type AnswerReply, type Plan } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, planMeal, resolve } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { withAccessToken } from './sign-in.js';
import { sendAsWorker } from './worker.js';

// A meal Plan says its Restaurant's menu and when it closes (P01 ticket 22), at the Assistant's endpoint with the
// scripted model on the worked example's Tuesday at 11:50: on the card, in 근거, to the model, and in the recalculation.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const dish = (name: string, price: number): object => ({
  meal: 'lunch',
  text: `${name} : ${price.toLocaleString('ko-KR')}원`,
  kind: 'dish',
  name,
  price,
});

const MENUS: Record<string, object[]> = {
  '301동식당': [dish('부대짬뽕&군만두', 6500), dish('순댓국', 6500)],
  '302동식당': [
    { meal: 'lunch', text: '<뷔페> 6,500원', kind: 'heading', name: null, price: 6500 },
    { meal: 'lunch', text: '잡곡밥', kind: null, name: null, price: null },
    { meal: 'lunch', text: '돈까스', kind: null, name: null, price: null },
    { meal: 'lunch', text: '그린샐러드', kind: null, name: null, price: null },
  ],
  학생회관식당: [dish('눈꽃치즈닭갈비', 6000), dish('수제탕수육', 6000)],
  '3식당': [dish('치즈한장부대찌개', 6000)],
  '자하연식당 2층': [dish('나가사키꼬치어묵', 5500)],
};

const replySchema = z.object({ answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

const words = (line: AnswerLine | undefined): string => (line ?? []).map(({ text }) => text).join('');

function planAt(answer: AnswerReply, key: string): Plan {
  const plan = answer.plans.find(({ id }) => id === key);
  if (plan === undefined) {
    throw new Error(`No plan at ${key}`);
  }
  return plan;
}

// The asker of the worked example, Classes in 301동 until 11:50 and in 24동 from 13:00, with each Restaurant's menu,
// and 301동식당's lunch read as served 11:30–13:30.
async function workedExample(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  const restaurants = Object.entries(MENUS).map(([name, lines]) => restaurant({ name, lines }));
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
  stage.hoursAre({ '301동식당': { lunch: { opensAt: '11:30', closesAt: '13:30' } } });
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

describe("A meal Plan's menu", () => {
  it('stands second on the card with when serving ends, and whole at the end of 근거', async () => {
    const date = '2098-09-02';
    await workedExample(date);
    const answer = answerIn((await stage.send([planMeal(date), { text: '…' }]).expect(200)).body);
    const here = planAt(answer, '301동식당');
    expect(here.lines.map((line) => words(line))).toEqual([
      '점심 301동식당 · 식사 55분',
      '오늘 부대짬뽕&군만두 외 1 · 13:30까지 배식',
      '12:45엔 나서야 해요',
    ]);
    expect(here.basis.slice(-2)).toEqual(['부대짬뽕&군만두 6,500원 · 순댓국 6,500원', '메뉴와 배식 시각: 오늘의 식단']);
    const buffet = planAt(answer, '302동식당');
    expect(buffet.lines[1]).toEqual([
      { text: '오늘 ', strong: false },
      { text: '돈까스', strong: true },
      { text: ' 외 1', strong: false },
    ]);
    expect(buffet.basis.slice(-2)).toEqual(['뷔페 6,500원: 돈까스 · 그린샐러드', '메뉴: 오늘의 식단']);
  });

  it('stands on the Plans with a Friend too', async () => {
    const date = '2098-09-09';
    await workedExample(date);
    const friend = await stage.friend('민수');
    await stage.classAt(friend, '11:00', '12:15', '302');
    const response = await stage.send([resolve('민수'), planMeal(date, [friend.id]), { text: '…' }]).expect(200);
    const plan = answerIn(response.body).plans.find(({ id }) => id === '302동식당');
    expect(words(plan?.lines[1])).toBe('오늘 돈까스 외 1');
  });
});

describe("A meal Plan's menu to the model", () => {
  it('is given to the model in words with the closing time, and the recalculation says the same', async () => {
    const date = '2098-09-16';
    await workedExample(date);
    const answer = answerIn((await stage.send([planMeal(date), { text: '…' }]).expect(200)).body);
    const [result] = stage.model.toolResults();
    expect(result).toMatchObject({
      result: 'planned',
      plans: expect.arrayContaining([
        expect.objectContaining({
          restaurant: '301동식당',
          menu: ['부대짬뽕&군만두 6,500원 · 순댓국 6,500원'],
          closesAt: '13:30',
        }),
        expect.objectContaining({
          restaurant: '302동식당',
          menu: ['뷔페 6,500원: 돈까스 · 그린샐러드'],
          closesAt: null,
        }),
      ]) as unknown,
    });
    const again = await withAccessToken(
      request(stage.app.getHttpServer()).post('/assistant/answers'),
      stage.asker.accessToken,
    )
      .send({ input: answer.input, location: null })
      .expect(200);
    expect(
      z
        .custom<AnswerReply>()
        .parse(again.body)
        .plans.map(({ lines }) => lines),
    ).toEqual(answer.plans.map(({ lines }) => lines));
  });

  it('chosen by its food plans at that Restaurant, and a name no Restaurant has is refused', async () => {
    const date = '2098-09-23';
    await workedExample(date);
    const step = { tool: 'planMeal', input: { date, meal: 'lunch', restaurant: '302동식당' } };
    const answer = answerIn((await stage.send([step, { text: '…' }], {}, '돈까스 먹고 싶어').expect(200)).body);
    expect(answer.plans.map(({ id }) => id)).toEqual(['302동식당']);
    expect(answer.input).toMatchObject({ kind: 'meal', placeId: answer.plans[0]?.place.placeId });
    const unknown = { tool: 'planMeal', input: { date, meal: 'lunch', restaurant: '없는식당' } };
    await stage.send([unknown, { text: '…' }], {}, '없는식당 가자').expect(200);
    expect(JSON.stringify(stage.model.toolResults())).toContain('No Restaurant is named 없는식당');
  });
});
