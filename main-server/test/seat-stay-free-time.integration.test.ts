/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply, type MealInput } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// A seat's stay is no busy time (P05-14, the review of PR 336): a User at a seat still eats, meets and goes out, so a
// 2-hour seat changes no meal plan, neither the User's own nor a Friend's that plans with them. A return ends the
// stay's Quest with its leave-by. Over the started server: the design's worked example (a Tuesday at 11:50, a Class in
// 301동 until 11:50 and in 24동 from 13:00) with the seed's walking table.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];
const SEAT = '7F-7A-zone2';

const stayResponse = z.object({ quest: z.object({ id: z.string() }), leaveAt: z.string().nullable() });

function post(who: Named, path: string, body: object, key = false): request.Test {
  const sent = withAccessToken(request(stage.app.getHttpServer()).post(path), who.accessToken);
  return (key ? sent.set('Idempotency-Key', randomUUID()) : sent).send(body);
}

async function stay(who: Named, date: string, start: string, minutes: number): Promise<z.infer<typeof stayResponse>> {
  const response = await post(who, '/library/seat-stays', { spaceId: SEAT, date, start, minutes }, true).expect(201);
  return stayResponse.parse(response.body);
}

// The Plans of a meal for these people, each by its Restaurant and times.
async function plansOf(who: Named, date: string, people: readonly Named[]): Promise<string[]> {
  const input: MealInput = {
    kind: 'meal',
    date,
    meal: 'lunch',
    people: people.map(({ id }) => ({ userId: id, constraints: [] })),
    window: { from: null, until: null },
    placeId: null,
  };
  const response = await post(who, '/assistant/answers', { input, location: null }).expect(200);
  const { plans } = z.custom<AnswerReply>().parse(response.body);
  return plans.map(({ id, startAt, endAt }) => `${id} ${startAt}–${endAt}`);
}

async function exampleOn(date: string): Promise<void> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

async function leaveBys(who: Named): Promise<unknown[]> {
  const response = await withAccessToken(request(stage.app.getHttpServer()).get('/notifications'), who.accessToken);
  return z
    .array(z.object({ kind: z.string() }))
    .parse(response.body)
    .filter(({ kind }) => kind === 'leave-by');
}

// Partitions: the User alone, and a Friend who plans with the User; a seat of 2 hours over the lunch. Expected values:
// the same Plans with the seat as without it.
describe('A seat from 11:00 to 13:00', () => {
  it('changes none of the Plans of "배고파" at 11:50', async () => {
    const date = '2087-05-13';
    await exampleOn(date);
    const before = await plansOf(stage.asker, date, [stage.asker]);

    await stay(stage.asker, date, '11:00', 120);

    expect(before.length).toBeGreaterThan(0);
    expect(await plansOf(stage.asker, date, [stage.asker])).toEqual(before);
  });

  it("changes none of the Plans of a Friend's meal with the User", async () => {
    const date = '2087-05-20';
    await exampleOn(date);
    const asker = stage.asker;
    const friend = await stage.friend('민수');
    const before = await plansOf(friend, date, [friend, asker]);

    await stay(asker, date, '11:00', 120);

    expect(before.length).toBeGreaterThan(0);
    expect(await plansOf(friend, date, [friend, asker])).toEqual(before);
  });
});

// Partitions: a stay with a leave-by for the Class in 24동 at 13:00, then returned. Expected values: the Quest and the
// leave-by gone.
describe('A seat returned', () => {
  it('ends the stay and its leave-by', async () => {
    const date = '2087-05-27';
    await exampleOn(date);
    const { quest, leaveAt } = await stay(stage.asker, date, '12:00', 120);
    expect(leaveAt).not.toBeNull();
    expect(await leaveBys(stage.asker)).toHaveLength(1);

    await withAccessToken(
      request(stage.app.getHttpServer()).delete(`/quests/${quest.id}`),
      stage.asker.accessToken,
    ).expect(204);

    await withAccessToken(
      request(stage.app.getHttpServer()).get(`/quests/${quest.id}`),
      stage.asker.accessToken,
    ).expect(404);
    expect(await leaveBys(stage.asker)).toEqual([]);
  });

  it('has its leave-by gone by the answer, however long cancelling it takes', async () => {
    const date = '2087-06-03';
    await exampleOn(date);
    const { quest } = await stay(stage.asker, date, '12:00', 120);
    // The app's own, loaded after its settings.
    const notifications = stage.app.get(
      (await import('../src/notifications/notifications.service.js')).NotificationsService,
    );
    const cancel = notifications.cancel.bind(notifications);
    const slow = vi.spyOn(notifications, 'cancel').mockImplementation(async (...args) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return cancel(...args);
    });

    await withAccessToken(
      request(stage.app.getHttpServer()).delete(`/quests/${quest.id}`),
      stage.asker.accessToken,
    ).expect(204);

    expect(await leaveBys(stage.asker)).toEqual([]);
    slow.mockRestore();
  });
});
