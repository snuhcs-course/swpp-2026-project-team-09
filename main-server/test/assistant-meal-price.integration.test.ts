/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { answerIn } from './plan-answers.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { sendAsWorker } from './worker.js';

// A meal plan with a price ceiling through the server (P05 ticket 53): planMeal's maxPrice puts the Restaurants whose
// list price is at or under it first, every candidate stays, the conditions on screen keep it on another day, 'any'
// lets it go, and a recalculation takes and gives it back. The prices are written under this file's own dish names.

const stage = new MealPlanStage();

beforeAll(async () => {
  await stage.start();
});

afterAll(async () => {
  await stage.stop();
});

const SERVED: [string, string, number][] = [
  ['301동식당', '가격시험돈까스', 6000],
  ['학생회관식당', '가격시험라면', 4500],
  ['자하연식당 2층', '가격시험파스타', 7000],
];

async function lunchOn(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  const restaurants = SERVED.map(([name, dish, price]) =>
    restaurant({
      name,
      lines: [{ meal: 'lunch', text: `${dish} : ${price.toLocaleString('ko-KR')}원`, kind: 'dish', name: dish, price }],
    }),
  );
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
}

const planMealWith = (date: string, more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', ...more },
});

const ids = (answer: AnswerReply): string[] => answer.plans.map(({ id }) => id);

// Partitions: a ceiling one Restaurant fits, and one none fits. Expected values: the ticket's order.
describe('A price ceiling the User names', () => {
  it('puts the Restaurants under it first, keeps every candidate, and tells the model which fit', async () => {
    const date = '2089-09-13';
    await lunchOn(date);

    const response = await stage.send([planMealWith(date, { maxPrice: 5000 }), { text: '…' }], {}, '5천원 이하');

    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ kind: 'meal', maxPrice: 5000 });
    expect(ids(answer)[0]).toBe('학생회관식당');
    expect(ids(answer).toSorted()).toEqual(SERVED.map(([name]) => name).toSorted());
    expect(stage.model.toolResults().at(-1)).toMatchObject({
      maxPrice: 5000,
      fitting: 1,
      plans: [{ restaurant: '학생회관식당', cheapest: '가격시험라면 4,500원', fits: true }, {}, {}],
    });
  });

  it('puts every plan cheapest first when none is under it', async () => {
    const date = '2089-10-11';
    await lunchOn(date);

    const response = await stage.send([planMealWith(date, { maxPrice: 4000 }), { text: '…' }], {}, '4천원 이하');

    expect(ids(answerIn(response.body))).toEqual(['학생회관식당', '301동식당', '자하연식당 2층']);
    expect(stage.model.toolResults().at(-1)).toMatchObject({ maxPrice: 4000, fitting: 0, noneUnder: true });
  });
});

describe('The price on screen', () => {
  it("is kept on another day when the model names none, and let go with 'any'", async () => {
    // The next day is seeded first, so that the clock stands on the first day.
    const [first, next] = ['2089-09-20', '2089-09-21'];
    await lunchOn(next);
    await lunchOn(first);
    const named = answerIn((await stage.send([planMealWith(first, { maxPrice: 5000 }), { text: '…' }])).body);
    const context = { conditions: named.input };

    const kept = answerIn((await stage.send([planMealWith(next), { text: '…' }], { context }, '다음 주는?')).body);
    const letGo = answerIn(
      (await stage.send([planMealWith(next, { maxPrice: 'any' }), { text: '…' }], { context }, '가격은 상관없어')).body,
    );

    expect(kept.input).toMatchObject({ date: next, maxPrice: 5000 });
    expect(ids(kept)[0]).toBe('학생회관식당');
    expect(letGo.input).not.toHaveProperty('maxPrice');
  });
});

function recalculate(input: MealInput): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
  });
}

const inputOn = (date: string, condition: object): MealInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: [{ userId: stage.asker.id, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
  ...condition,
});

// Partitions: a ceiling with cheapFirst, and a ceiling of 0 won. Expected values: the input schema.
describe('A price condition in a recalculation', () => {
  it('comes back unchanged in the input, the Restaurants under it first', async () => {
    const date = '2089-10-04';
    await lunchOn(date);
    const asked = inputOn(date, { maxPrice: 6500, cheapFirst: true });

    const response = await recalculate(asked);

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    expect(answer.input).toEqual(asked);
    expect(ids(answer)).toEqual(['학생회관식당', '301동식당', '자하연식당 2층']);
  });

  it('is refused at 0 won', async () => {
    const response = await recalculate(inputOn('2089-10-04', { maxPrice: 0 }));

    expect(response.status).toBe(400);
  });
});
