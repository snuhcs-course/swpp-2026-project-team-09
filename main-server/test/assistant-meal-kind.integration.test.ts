/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { answerIn } from './plan-answers.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { sendAsWorker } from './worker.js';

// The kind of food on screen (P05 ticket 15): planMeal sets it when the User names a kind, the conditions on screen
// keep it for the same day and meal, 'any' lets it go, and the plans of the Restaurants that serve it come first while
// every candidate stays. The kinds are written as a Collection would have kept them, under this file's own dish names.

const stage = new MealPlanStage();
let prisma: PrismaClient;

beforeAll(async () => {
  await stage.start();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
  await prisma.dishCuisine.createMany({
    data: [
      { name: '종류시험짜장면', cuisine: 'chinese' },
      { name: '종류시험된장찌개', cuisine: 'korean' },
      { name: '종류시험파스타', cuisine: 'western' },
    ],
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), stage.stop()]);
});

const SERVED: [string, string][] = [
  ['301동식당', '종류시험짜장면'],
  ['학생회관식당', '종류시험된장찌개'],
  ['자하연식당 2층', '종류시험파스타'],
];

async function lunchOn(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  const restaurants = SERVED.map(([name, dish]) =>
    restaurant({ name, lines: [{ meal: 'lunch', text: `${dish} : 6,000원`, kind: 'dish', name: dish, price: 6000 }] }),
  );
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
}

const planMealWith = (date: string, more: object = {}): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', ...more },
});

describe('A kind of food the User names', () => {
  it('puts the Restaurants that serve it first, keeps every candidate, and tells the model which serve it', async () => {
    const date = '2089-07-26';
    await lunchOn(date);

    const response = await stage.send([planMealWith(date, { cuisine: '양식' }), { text: '…' }], {}, '양식');

    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ kind: 'meal', cuisine: '양식' });
    expect(answer.plans[0]?.id).toBe('자하연식당 2층');
    expect(answer.plans[0]?.menu?.dishes).toEqual([{ name: '종류시험파스타', price: 6000, cuisine: '양식' }]);
    expect(answer.plans.map(({ id }) => id).toSorted()).toEqual(SERVED.map(([name]) => name).toSorted());
    expect(stage.model.toolResults()[0]).toMatchObject({ cuisine: '양식', servedBy: ['자하연식당 2층'] });
  });

  it('is kept from the conditions on screen when the model names none, and let go with any', async () => {
    const date = '2089-08-02';
    await lunchOn(date);
    const named = answerIn((await stage.send([planMealWith(date, { cuisine: '중식' }), { text: '…' }])).body);
    const context = { conditions: named.input };

    const kept = answerIn((await stage.send([planMealWith(date), { text: '…' }], { context }, '더 싼 데')).body);
    const letGo = answerIn(
      (await stage.send([planMealWith(date, { cuisine: 'any' }), { text: '…' }], { context }, '아무거나')).body,
    );

    expect(kept.input).toMatchObject({ cuisine: '중식' });
    expect(kept.plans[0]?.id).toBe('301동식당');
    expect(letGo.input).not.toHaveProperty('cuisine');
  });
});

describe('The kind on screen in a recalculation', () => {
  it('comes back unchanged in the input, its Restaurants first', async () => {
    const date = '2089-08-09';
    await lunchOn(date);
    const input: MealInput = {
      kind: 'meal',
      date,
      meal: 'lunch',
      people: [{ userId: stage.asker.id, constraints: [] }],
      window: { from: null, until: null },
      placeId: null,
      cuisine: '한식',
    };

    const response = await withAccessToken(
      request(stage.app.getHttpServer()).post('/assistant/answers'),
      stage.asker.accessToken,
    ).send({ input });

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    expect(answer.input).toEqual(input);
    expect(answer.plans[0]?.id).toBe('학생회관식당');
  });
});
