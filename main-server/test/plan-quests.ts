/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { type MealPlanStage, type Named } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// The design's worked example on a Tuesday at 11:50, for the tests of a Plan made into a Quest at POST /plans.

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const partySchema = z.object({
  quest: z.object({ id: z.string() }),
  invitations: z.array(z.object({ id: z.string(), userId: z.string() })),
});

export type Party = z.infer<typeof partySchema>;

const planSchema = z.object({
  id: z.string(),
  startAt: z.string(),
  parts: z.array(z.object({ me: z.boolean(), origin: z.unknown(), walkMinutes: z.number().nullable() })),
});

export const inputOf = (date: string, people: string[]): PlanInput => ({
  kind: 'meal',
  date,
  meal: 'lunch',
  people: people.map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
});

export function makePlanQuest(stage: MealPlanStage, body: object, key: string = randomUUID()): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/plans'), stage.asker.accessToken)
    .set('Idempotency-Key', key)
    .send(body);
}

// The party the asker makes of the Plan named, without a position.
export async function partyOf(
  stage: MealPlanStage,
  { date, people, planId, startAt }: { date: string; people: string[]; planId: string; startAt: string },
): Promise<Party> {
  const response = await makePlanQuest(stage, { input: inputOf(date, people), planId, startAt, location: null });
  expect(response.status).toBe(201);
  return partySchema.parse(response.body);
}

// The first Plan the recalculation answers, as the app would show it.
export async function firstPlan(
  stage: MealPlanStage,
  date: string,
  people: string[],
): Promise<z.infer<typeof planSchema>> {
  const response = await withAccessToken(
    request(stage.app.getHttpServer()).post('/assistant/answers'),
    stage.asker.accessToken,
  ).send({ input: inputOf(date, people), location: null });
  return z.object({ plans: z.array(planSchema).min(1) }).parse(response.body).plans[0];
}

// The day's menus, and the asker's Classes until 11:50 in the Place numbered `from` and in 24동 from 13:00. With
// `from` null the asker has no Class before lunch.
export async function workedExample(stage: MealPlanStage, date: string, from: string | null = '301'): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  if (from !== null) {
    await stage.classAt(stage.asker, '11:00', '11:50', from);
  }
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

export async function minsu(stage: MealPlanStage): Promise<Named> {
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '11:00', '12:15', '302');
  return friend;
}

export async function jieun(stage: MealPlanStage): Promise<Named> {
  const friend = await stage.friend('지은');
  await stage.classAt(friend, '11:00', '12:15', '8');
  await stage.classAt(friend, '13:00', '14:15', '8');
  return friend;
}
