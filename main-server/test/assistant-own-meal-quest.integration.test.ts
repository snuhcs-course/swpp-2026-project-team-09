/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { MealPlanStage } from './meal-plan.js';
import { answerIn } from './plan-answers.js';
import { firstPlan, inputOf, makePlanQuest } from './plan-quests.js';
import { ownQuest } from './quests.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// A meal asked for when the User already put that meal in their schedule (P05 ticket 16): in use of the released app,
// "점심 뭐 먹지?" after a lunch Quest was made answered that there was nowhere to go, since the kept lunch filled the
// lunch window. It is set aside now, making the new Plan replaces it, and a lunch shared with others is never dropped.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];

const PLAN_MEAL = (date: string): Step => ({ tool: 'planMeal', input: { date, meal: 'lunch' } });

// A lunch the asker put in their schedule from the first Plan with these people, at 11:50 on `date`.
async function lunchKept(date: string, people: string[] = [stage.asker.id]): Promise<string> {
  const plan = await firstPlan(stage, date, people);
  const made = await makePlanQuest(stage, {
    input: inputOf(date, people),
    planId: plan.id,
    startAt: plan.startAt,
    location: null,
  });
  expect(made.status).toBe(201);
  return z.object({ quest: z.object({ id: z.string() }) }).parse(made.body).quest.id;
}

async function lunchOn(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
}

const questRead = (questId: string): request.Test =>
  withAccessToken(request(stage.app.getHttpServer()).get(`/quests/${questId}`), stage.asker.accessToken);

describe('A meal asked for again, with that meal in the schedule', () => {
  it('is planned as if the lunch kept were not there, and the answer and the model name the lunch kept', async () => {
    const date = '2089-08-16';
    await lunchOn(date);
    const kept = await lunchKept(date);

    const response = await stage.send([PLAN_MEAL(date), { text: '…' }], {}, '점심 뭐 먹지?');

    const answer = answerIn(response.body);
    expect(answer.noPlan).toBeNull();
    expect(answer.plans.length).toBeGreaterThan(0);
    expect(answer.mealSet).toMatchObject({ questId: kept, friendNames: [], shared: false });
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'planned', alreadySet: { shared: false } });
  });

  it('replaces the lunch kept when the new Plan is put in the schedule, leaving one lunch', async () => {
    const date = '2089-08-23';
    await lunchOn(date);
    const kept = await lunchKept(date);

    const made = await lunchKept(date);

    expect(made).not.toBe(kept);
    expect((await questRead(kept)).status).toBe(404);
    expect((await questRead(made)).status).toBe(200);
  });
});

describe('A lunch kept with an invited Friend', () => {
  it('is set aside in the plans and named shared, and is never dropped by making another', async () => {
    const date = '2089-08-30';
    await lunchOn(date);
    const friend = await stage.friend('민수');
    const kept = await lunchKept(date, [stage.asker.id, friend.id]);
    const plan = await firstPlan(stage, date, [stage.asker.id]);

    const made = await makePlanQuest(stage, {
      input: inputOf(date, [stage.asker.id]),
      planId: plan.id,
      startAt: plan.startAt,
      location: null,
    });

    expect(made.status).toBe(409);
    expect(made.body).toMatchObject({ code: 'MEAL_ALREADY_SET', questId: kept });
    expect((await questRead(kept)).status).toBe(200);
    const asked = answerIn((await stage.send([PLAN_MEAL(date), { text: '…' }], {}, '점심 뭐 먹지?')).body);
    expect(asked.mealSet).toMatchObject({ questId: kept, friendNames: ['민수'], shared: true });
  });
});

describe('Another Quest over lunch', () => {
  it('still fills the time, and the model is told what fills it', async () => {
    const date = '2089-09-06';
    await lunchOn(date);
    await ownQuest(stage.app, stage.asker, {
      title: '스터디',
      subQuest: { title: '스터디', startsAt: `${date}T11:40:00+09:00`, endsAt: `${date}T14:30:00+09:00` },
    });

    const answer = answerIn((await stage.send([PLAN_MEAL(date), { text: '…' }], {}, '점심 뭐 먹지?')).body);

    expect(answer.noPlan?.reason).toBe('no-shared-time');
    expect(answer.mealSet).toBeNull();
    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'none',
      busy: [expect.objectContaining({ isClass: false, start: '11:40', end: '14:30' })],
    });
  });
});
