/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, resolve } from './meal-plan.js';
import { answerIn } from './plan-answers.js';
import { firstPlan, inputOf, makePlanQuest } from './plan-quests.js';
import { type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// A meal's or a meeting's answer names the asker's Quests of that day it touches (P05 ticket 17, slice 1b): the one it
// sets aside as `planSet`, and the others of the kind asked for or with a Friend asked for as `related`, whether or
// not they limit the plans. The model is told them.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];

const MEET_APP = { clientCapabilities: ['library', 'answer', 'meet'] };

const questIdOf = (body: unknown): string => z.object({ quest: z.object({ id: z.string() }) }).parse(body).quest.id;

// A lunch taken alone and a meeting with 민수 at 14:00, made from their Plans on `date`, asked at 10:30.
async function dayWithQuests(date: string): Promise<{ lunch: string; meeting: string; minsu: string }> {
  await stage.asking(date, '10:30');
  await stage.menusOn(date, RESTAURANTS);
  const minsu = await stage.friend('민수');
  const lunchPlan = await firstPlan(stage, date, [stage.asker.id]);
  const lunch = await makePlanQuest(stage, {
    input: inputOf(date, [stage.asker.id]),
    planId: lunchPlan.id,
    startAt: lunchPlan.startAt,
    location: null,
  });
  const meetInput = {
    kind: 'meet',
    date,
    people: [stage.asker.id, minsu.id].map((userId) => ({ userId, constraints: [] })),
    window: { from: '14:00', until: null },
    placeId: null,
  };
  const recalculated = await withAccessToken(
    request(stage.app.getHttpServer()).post('/assistant/answers'),
    stage.asker.accessToken,
  ).send({ input: meetInput });
  const [meetPlan] = z.custom<AnswerReply>().parse(recalculated.body).plans;
  const meeting = await makePlanQuest(stage, {
    input: meetInput,
    planId: meetPlan?.id,
    startAt: meetPlan?.startAt,
    location: null,
  });
  expect([lunch.status, meeting.status]).toEqual([201, 201]);
  return { lunch: questIdOf(lunch.body), meeting: questIdOf(meeting.body), minsu: minsu.id };
}

const planMeal = (date: string, friendIds: string[] = []): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds },
});

describe("A meal's answer", () => {
  it('names the lunch kept as the Quest it sets aside, and not as related', async () => {
    const date = '2089-11-07';
    const { lunch } = await dayWithQuests(date);

    const answer = answerIn((await stage.send([planMeal(date), { text: '…' }], {}, '점심 뭐 먹지?')).body);

    expect(answer.planSet).toMatchObject({ questId: lunch, kind: 'meal-lunch', mine: true, changeable: true });
    expect(answer.mealSet).toMatchObject({ questId: lunch });
    expect(answer.related ?? []).toEqual([]);
  });

  it('names a meeting with a Friend asked for as related, and the model is told it', async () => {
    const date = '2089-11-14';
    const { meeting, minsu } = await dayWithQuests(date);

    const answer = answerIn(
      (await stage.send([resolve('민수'), planMeal(date, [minsu]), { text: '…' }], {}, '민수랑 점심 먹자')).body,
    );

    expect(answer.related).toMatchObject([
      { questId: meeting, kind: 'meet', people: [{ name: '민수', answer: 'waiting' }] },
    ]);
    expect(stage.model.toolResults()[1]).toMatchObject({ related: [{ ref: meeting, kind: 'meet' }] });
  });
});

describe("A meeting's answer", () => {
  it('names the meeting with the Friend asked for as related, and no Quest set aside', async () => {
    const date = '2089-11-21';
    const { meeting, minsu } = await dayWithQuests(date);

    const response = await stage.send(
      [resolve('민수'), { tool: 'planMeet', input: { date, friendIds: [minsu], from: '16:00' } }, { text: '…' }],
      MEET_APP,
      '민수랑 4시에 보자',
    );

    const answer = answerIn(response.body);
    expect(answer.planSet).toBeNull();
    expect(answer.related).toMatchObject([{ questId: meeting, kind: 'meet' }]);
    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'planned', related: [{ ref: meeting }] });
  });
});
