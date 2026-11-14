/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import request from 'supertest';
import { type TestUser } from './friends.js';
import { MealPlanStage } from './meal-plan.js';
import { firstPlan, jieun, minsu, partyOf, workedExample } from './plan-quests.js';
import { withAccessToken } from './sign-in.js';

// The Leader's time to leave, kept in GET /notifications when POST /plans makes a party from the design's worked
// example (a Tuesday at 11:50), and gone when the Leader ends the Quest. Each test stands on a Tuesday of April or May
// 2088, which no other file uses.

const stage = new MealPlanStage();

beforeAll(async () => {
  await stage.start();
});

afterAll(async () => {
  await stage.stop();
});

function getNotifications(user: TestUser): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).get('/notifications'), user.accessToken);
}

async function makeParty(date: string, people: string[], planId: string, startAt: string): Promise<string> {
  return (await partyOf(stage, { date, people, planId, startAt })).quest.id;
}

describe('A party made from the worked example with 민수 and 지은', () => {
  it('keeps the Leader’s time to leave at 12:18, to 학생회관식당 in 15 minutes, and nobody else’s', async () => {
    const date = '2088-04-06';
    await workedExample(stage, date);
    const [first, second] = [await minsu(stage), await jieun(stage)];

    const questId = await makeParty(
      date,
      [stage.asker.id, first.id, second.id],
      '학생회관식당',
      `${date}T12:33:00+09:00`,
    );

    await vi.waitFor(async () => {
      expect((await getNotifications(stage.asker)).body).toEqual([
        {
          id: `leave-by:party:${questId}`,
          kind: 'leave-by',
          title: '지금 나서요',
          ahead: '12:18 나설 시각',
          line: '학생회관식당까지 걸어서 15분',
          at: `${date}T12:18:00+09:00`,
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    expect((await getNotifications(first)).body).toEqual([]);
    expect((await getNotifications(second)).body).toEqual([]);
  });
});

describe('A party made from the worked example with 민수', () => {
  it('keeps the Leader’s time to leave at 12:12, to 302동식당 in 3 minutes', async () => {
    const date = '2088-04-13';
    await workedExample(stage, date);
    const friend = await minsu(stage);

    const questId = await makeParty(date, [stage.asker.id, friend.id], '302동식당', `${date}T12:15:00+09:00`);

    await vi.waitFor(async () => {
      expect((await getNotifications(stage.asker)).body).toEqual([
        expect.objectContaining({
          id: `leave-by:party:${questId}`,
          ahead: '12:12 나설 시각',
          line: '302동식당까지 걸어서 3분',
          at: `${date}T12:12:00+09:00`,
        }),
      ]);
    });
  });
});

describe('A party whose Leader has no time to leave', () => {
  it.each([
    ['whose starting Place is unknown', '2088-04-20', null, null],
    ['who does not walk', '2088-04-27', '302', 0],
  ])('keeps none for a Leader %s', async (_case, date, from, walkMinutes) => {
    await workedExample(stage, date, from);
    const people = [stage.asker.id, (await minsu(stage)).id];
    const plan = await firstPlan(stage, date, people);
    const leader = plan.parts.find(({ me }) => me);
    expect(leader?.walkMinutes).toBe(walkMinutes);
    const { NotificationsService } = await import('../src/notifications/notifications.service.js');
    const schedule = vi.spyOn(stage.app.get(NotificationsService), 'schedule');

    try {
      await makeParty(date, people, plan.id, plan.startAt);

      expect(schedule).not.toHaveBeenCalled();
    } finally {
      schedule.mockRestore();
    }
    expect((await getNotifications(stage.asker)).body).toEqual([]);
  });
});

describe('A party made when the time to leave cannot be kept', () => {
  it('is answered as before, and a warning is logged', async () => {
    const date = '2088-05-04';
    await workedExample(stage, date);
    const friend = await minsu(stage);
    const { NotificationsService } = await import('../src/notifications/notifications.service.js');
    const schedule = vi
      .spyOn(stage.app.get(NotificationsService), 'schedule')
      .mockRejectedValue(new Error('Redis refused the write'));
    const warn = vi.spyOn(Logger.prototype, 'warn');

    try {
      await makeParty(date, [stage.asker.id, friend.id], '302동식당', `${date}T12:15:00+09:00`);

      await vi.waitFor(() => {
        expect(warn).toHaveBeenCalledWith(`The Leader's time to leave was not kept: Error: Redis refused the write`);
      });
    } finally {
      schedule.mockRestore();
      warn.mockRestore();
    }
    expect((await getNotifications(stage.asker)).body).toEqual([]);
  });
});

describe('Ending the party', () => {
  it('removes the Leader’s time to leave', async () => {
    const date = '2088-05-11';
    await workedExample(stage, date);
    const friend = await minsu(stage);
    const questId = await makeParty(date, [stage.asker.id, friend.id], '302동식당', `${date}T12:15:00+09:00`);
    await vi.waitFor(async () => {
      expect((await getNotifications(stage.asker)).body).toHaveLength(1);
    });

    const ended = await withAccessToken(
      request(stage.app.getHttpServer()).post(`/quests/${questId}/end`),
      stage.asker.accessToken,
    );

    expect(ended.status).toBe(204);
    await vi.waitFor(async () => {
      expect((await getNotifications(stage.asker)).body).toEqual([]);
    });
  });
});
