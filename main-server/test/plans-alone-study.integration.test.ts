/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { MealPlanStage } from './meal-plan.js';
import * as planQuests from './plan-quests.js';
import { withAccessToken } from './sign-in.js';

// "일정에 넣기" on a study place for the asker alone (P10 ticket 24): the Plan saved at POST /plans as a Quest held alone,
// as a meal's is, over the started server with the seed's study spaces and hours. The asker has no Class that day and
// sent no location, so every plan starts at the time asked.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const DATE = '2088-01-06';

const takenSchema = z.object({
  quest: z.custom<QuestDto>(),
  invitations: z.array(z.unknown()),
  alone: z.object({ lines: z.array(z.array(z.object({ text: z.string(), strong: z.boolean() }))) }),
});

const studyInput = (together = false): object => ({
  kind: 'study',
  date: DATE,
  what: 'any',
  people: [{ userId: stage.asker.id, constraints: [] }],
  together,
  window: { from: null, until: null },
  area: null,
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
});

async function firstPlan(): Promise<AnswerReply['plans'][number]> {
  const response = await withAccessToken(
    request(stage.app.getHttpServer()).post('/assistant/answers'),
    stage.asker.accessToken,
  ).send({ clientCapabilities: ['library', 'answer', 'study-plan'], input: studyInput(), location: null });
  const [first] = z.custom<AnswerReply>().parse(response.body).plans;
  if (first === undefined) {
    throw new Error('The study answer has no plan');
  }
  return first;
}

// Expected values: the study answer's first plan, saved as the meal's are (`plans-alone-meal`).
describe('"일정에 넣기" on a study place for the asker alone', () => {
  beforeAll(async () => {
    await stage.asking(DATE, '11:50');
  });

  it('makes it a Quest held alone, with the stay at the place as its step', async () => {
    const plan = await firstPlan();

    const response = await planQuests.makePlanQuest(stage, {
      input: studyInput(),
      planId: plan.id,
      startAt: plan.startAt,
      location: null,
    });

    expect(response.status).toBe(201);
    const { quest, invitations, alone } = takenSchema.parse(response.body);
    expect(quest).toMatchObject({
      title: `${plan.id}에서 공부`,
      capacity: 1,
      takenAlone: true,
      holders: [{ id: stage.asker.id }],
    });
    expect(quest.subQuests).toHaveLength(1);
    expect(quest.subQuests[0]).toMatchObject({ title: `${plan.id}에서 공부` });
    expect(invitations).toEqual([]);
    expect(alone.lines[0]?.[0]).toEqual({ text: plan.place.label, strong: true });
  });

  it('is refused with 409 PLAN_CHANGED for a time no longer the plan’s', async () => {
    const plan = await firstPlan();

    const response = await planQuests.makePlanQuest(stage, {
      input: studyInput(),
      planId: plan.id,
      startAt: `${DATE}T06:00:00+09:00`,
      location: null,
    });

    expect(response.status).toBe(409);
  });
});

// Expected values: the group study room's request (P10 ticket 12), not a Quest taken alone.
describe('"일정에 넣기" on a study together', () => {
  beforeAll(async () => {
    await stage.asking(DATE, '11:50');
  });

  it('is refused with 400 PLAN_KIND, the group study room’s request', async () => {
    const response = await planQuests.makePlanQuest(stage, {
      input: studyInput(true),
      planId: 'any',
      startAt: `${DATE}T12:00:00+09:00`,
      location: null,
    });

    expect(response.status).toBe(400);
    expect(z.object({ code: z.string() }).parse(response.body).code).toBe('PLAN_KIND');
  });
});
