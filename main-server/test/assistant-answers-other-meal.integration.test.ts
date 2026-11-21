/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { withAccessToken } from './sign-in.js';
import { sendAsWorker } from './worker.js';

// The other meal of the same day, which the app's bar offers beside the Plan ("저녁 17:00 ›") and recalculates at POST
// /assistant/answers without the model: the kept input with its meal switched, and what was fixed for the first meal's
// times cleared, as the chat clears it when the meal changes.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];

const answerIn = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

function recalculate(input: MealInput): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
  });
}

// A restaurant serving lunch and dinner.
const bothMeals = (name: string): object =>
  restaurant({
    name,
    lines: [
      { meal: 'lunch', text: '제육볶음 : 6,000원', kind: 'dish', name: '제육볶음', price: 6000 },
      { meal: 'dinner', text: '돈까스 : 6,500원', kind: 'dish', name: '돈까스', price: 6500 },
    ],
  });

describe('The other meal of the same day', () => {
  it("is planned from the kept input with its meal switched and what was fixed for the first meal's times cleared", async () => {
    const date = '2089-07-12';
    await stage.asking(date, '11:50');
    await sendAsWorker(
      stage.app,
      '/menus/collected',
      menusMessage([{ date, restaurants: RESTAURANTS.map((name) => bothMeals(name)) }]),
    );
    await stage.classAt(stage.asker, '11:00', '11:50', '301');
    const friend = await stage.friend('민수');
    await stage.classAt(friend, '11:00', '12:15', '302');
    const lunch: MealInput = {
      kind: 'meal',
      date,
      meal: 'lunch',
      people: [
        { userId: stage.asker.id, constraints: [] },
        { userId: friend.id, constraints: [{ kind: 'notBefore', time: '12:20', source: 'asker' }] },
      ],
      window: { from: '12:40', until: null },
      placeId: null,
    };
    const kept = answerIn((await recalculate(lunch)).body);
    expect(kept.plans.length).toBeGreaterThan(0);

    const response = await recalculate({
      ...lunch,
      meal: 'dinner',
      window: { from: null, until: null },
      people: lunch.people.map(({ userId }) => ({ userId, constraints: [] })),
      placeId: null,
    });

    expect(response.status).toBe(200);
    const dinner = answerIn(response.body);
    expect(dinner.input).toMatchObject({ kind: 'meal', date, meal: 'dinner' });
    expect(dinner.plans.length).toBeGreaterThan(0);
    expect(dinner.plans.every(({ startAt }) => startAt >= `${date}T17:00:00+09:00`)).toBe(true);
  });
});
