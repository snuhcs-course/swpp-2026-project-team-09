/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { BetterPlanStage, betterSchema, time } from './better-plan.js';

// A Quest changed at PUT /plans/:questId tells its Holders as the room's 일정 수정 does (P05 ticket 17, rule D): each
// other Holder is told with `step-changed` and loses the time to leave kept for the old steps, nobody goes back to
// waiting, and the Leader's own time to leave is kept again for the new plan. On the worked example after 지은
// declined, 민수 having accepted.

const stage = new BetterPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const kindsSchema = z.array(z.object({ kind: z.string() }));

describe('A plan changed in place', () => {
  it('tells 민수 with step-changed, forgets his time to leave, and keeps the Leader’s again', async () => {
    const date = '2088-12-21';
    const { minsu, questId } = await stage.declined(date);
    await vi.waitFor(async () => {
      expect(kindsSchema.parse((await stage.notificationsOf(minsu)).body).map(({ kind }) => kind)).toContain(
        'leave-by',
      );
    });
    const { input } = betterSchema.parse((await stage.getBetter(stage.asker, questId)).body);

    const response = await stage.changePlan(stage.asker, questId, {
      input,
      planId: '302동식당',
      startAt: time(date, '12:15'),
      location: null,
    });

    expect(response.status).toBe(200);
    await vi.waitFor(async () => {
      expect(kindsSchema.parse((await stage.notificationsOf(minsu)).body)).toEqual([{ kind: 'step-changed' }]);
    });
    await vi.waitFor(async () => {
      expect((await stage.notificationsOf(stage.asker)).body).toContainEqual(
        expect.objectContaining({ id: `leave-by:party:${questId}`, at: `${date}T12:12:00+09:00` }),
      );
    });
  });
});
