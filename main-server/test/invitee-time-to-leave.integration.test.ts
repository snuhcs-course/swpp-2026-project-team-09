/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { type TestUser } from './friends.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { firstPlan, jieun, minsu, type Party, partyOf, workedExample } from './plan-quests.js';
import { answerInvitation, endQuest, removeHolder } from './quest-recruiting.js';
import { dropQuest, editSubQuest, getQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';

// An invited User's own time to leave, kept in GET /notifications when they accept a party made at POST /plans from
// the design's worked example (a Tuesday at 11:50), gone when they leave the Quest or it ends, and kept again by the
// same rule when its step is changed (P06 ticket 25). Each test stands on
// a Tuesday of July or August 2088, which no other file posts menus for.

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

function accept(user: TestUser, { invitations }: Party): request.Test {
  const invitation = invitations.find(({ userId }) => userId === user.id);
  if (invitation === undefined) {
    throw new Error('The party invited nobody of that id');
  }
  return answerInvitation(stage.app, user, invitation.id, 'accept');
}

// 민수's own way to the party of 민수 and 지은, on the seed's walking table: his Class in 302동 ends at 12:15; 302동 to
// 301동 is 160 s (3 minutes) and 301동 to the Student Center (63동) 858 s (15 minutes), against 981 s (17 minutes)
// straight, so the meeting at 301동 at 12:18 is 3 + 15 - 17 = 1 minute out of his way, within the detour allowed. He
// sets out at 12:18 - 3 = 12:15 and walks 3 + 15 = 18 minutes, to arrive at 12:33.
async function workedParty(date: string): Promise<{ party: Party; friend: Named; other: Named }> {
  await workedExample(stage, date);
  const [friend, other] = [await minsu(stage), await jieun(stage)];
  const people = [stage.asker.id, friend.id, other.id];
  const party = await partyOf(stage, { date, people, planId: '학생회관식당', startAt: `${date}T12:33:00+09:00` });
  return { party, friend, other };
}

async function minsuAccepted(date: string): Promise<{ questId: string; friend: Named }> {
  const { party, friend } = await workedParty(date);
  expect((await accept(friend, party)).status).toBe(201);
  await vi.waitFor(async () => {
    expect((await getNotifications(friend)).body).toHaveLength(1);
  });
  return { questId: party.quest.id, friend };
}

// Accepts, waits until the time to leave has been worked out, and finds none kept.
async function expectNoneKept(friend: Named, party: Party): Promise<void> {
  const { InviteeTimeToLeave } = await import('../src/plans/invitee-time-to-leave.service.js');
  const keep = vi.spyOn(stage.app.get(InviteeTimeToLeave), 'keep');

  try {
    expect((await accept(friend, party)).status).toBe(201);

    await vi.waitFor(() => {
      expect(keep.mock.settledResults).toEqual([{ type: 'fulfilled', value: undefined }]);
    });
  } finally {
    keep.mockRestore();
  }
  expect((await getNotifications(friend)).body).toEqual([]);
}

describe('An invited User who accepts the party of 민수 and 지은', () => {
  it('keeps 민수’s own time to leave at 12:15, to 63동 in 18 minutes, and none for 지은, who has not answered', async () => {
    const date = '2088-07-06';
    const { party, friend, other } = await workedParty(date);
    const questId = party.quest.id;

    expect((await accept(friend, party)).status).toBe(201);

    await vi.waitFor(async () => {
      expect((await getNotifications(friend)).body).toEqual([
        {
          id: `leave-by:party:${questId}`,
          kind: 'leave-by',
          title: '지금 나서요',
          ahead: '12:15 나설 시각',
          line: '학생회관식당까지 걸어서 18분',
          at: `${date}T12:15:00+09:00`,
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    expect((await getNotifications(other)).body).toEqual([]);
  });
});

describe('An invited User with no time to leave', () => {
  it('keeps none for one with no Class before the party and no position', async () => {
    const date = '2088-07-13';
    await workedExample(stage, date);
    const free = await stage.friend('지수');
    const people = [stage.asker.id, (await minsu(stage)).id, free.id];
    const { id: planId, startAt } = await firstPlan(stage, date, people);

    await expectNoneKept(free, await partyOf(stage, { date, people, planId, startAt }));
  });

  it('keeps none for one whose Class is in the Restaurant’s own building', async () => {
    const date = '2088-08-17';
    await workedExample(stage, date);
    const friend = await minsu(stage);
    const people = [stage.asker.id, friend.id];

    await expectNoneKept(
      friend,
      await partyOf(stage, { date, people, planId: '302동식당', startAt: `${date}T12:15:00+09:00` }),
    );
  });
});

describe('An invited User’s accepting when the time to leave cannot be kept', () => {
  it('is answered as before, and a warning is logged', async () => {
    const { party, friend } = await workedParty('2088-07-20');
    const { NotificationsService } = await import('../src/notifications/notifications.service.js');
    const schedule = vi
      .spyOn(stage.app.get(NotificationsService), 'schedule')
      .mockRejectedValue(new Error('Redis refused the write'));
    const warn = vi.spyOn(Logger.prototype, 'warn');

    try {
      const accepted = await accept(friend, party);

      expect(accepted.status).toBe(201);
      expect(accepted.body).toMatchObject({ id: party.quest.id });
      await vi.waitFor(() => {
        expect(warn).toHaveBeenCalledWith(
          `An invited User's time to leave was not kept: Error: Redis refused the write`,
        );
      });
    } finally {
      schedule.mockRestore();
      warn.mockRestore();
    }
    expect((await getNotifications(friend)).body).toEqual([]);
  });
});

describe('An invited User who leaves the party', () => {
  it.each([
    ['drops it', '2088-07-27', (questId: string, friend: Named): request.Test => dropQuest(stage.app, friend, questId)],
    [
      'is removed by the Leader',
      '2088-08-03',
      (questId: string, friend: Named): request.Test => removeHolder(stage.app, stage.asker, questId, friend.id),
    ],
  ])('loses their time to leave when the User %s', async (_case, date, leave) => {
    const { questId, friend } = await minsuAccepted(date);

    expect((await leave(questId, friend)).status).toBe(204);

    // A User removed is told so (P06 ticket 22); the time to leave is gone either way.
    await vi.waitFor(async () => {
      expect((await getNotifications(friend)).body).not.toContainEqual(expect.objectContaining({ kind: 'leave-by' }));
    });
  });
});

describe('Ending a party an invited User accepted', () => {
  it('removes the invited User’s time to leave too', async () => {
    const { questId, friend } = await minsuAccepted('2088-08-10');

    expect((await endQuest(stage.app, stage.asker, questId)).status).toBe(204);

    // The party is gone, which is told (P06 ticket 22), and its time to leave with it.
    await vi.waitFor(async () => {
      expect((await getNotifications(friend)).body).not.toContainEqual(expect.objectContaining({ kind: 'leave-by' }));
    });
  });
});

const stepsSchema = z.object({
  subQuests: z.array(z.object({ id: z.string(), place: z.object({ placeId: z.string() }).nullable() })),
});
const keptSchema = z.array(z.object({ kind: z.string(), at: z.string(), line: z.string() }));

describe('A step the Leader changes in the room', () => {
  it('keeps 민수’s time to leave again for the new time by his Timetable, and tells him of the change', async () => {
    const date = '2088-08-24';
    const { questId, friend } = await minsuAccepted(date);
    const [step] = stepsSchema.parse((await getQuest(stage.app, stage.asker, questId)).body).subQuests;
    const placeId = step?.place?.placeId ?? '';

    // Half an hour later at the same Restaurant: 민수 still comes from his Class in 302동, which ends at 12:15.
    const edited = await editSubQuest(
      stage.app,
      stage.asker,
      { questId, subQuestId: step?.id ?? '' },
      { title: '학생회관식당에서 식사', startsAt: `${date}T13:00:00+09:00`, place: { placeId } },
    );

    expect(edited.status).toBe(200);
    await vi.waitFor(async () => {
      const kept = keptSchema.parse((await getNotifications(friend)).body);
      expect(kept.map(({ kind }) => kind).toSorted()).toEqual(['leave-by', 'step-changed']);
      const leaveBy = kept.find(({ kind }) => kind === 'leave-by');
      // One time to leave, once his Class has ended at 12:15 and before the new start.
      expect(leaveBy?.at.localeCompare(`${date}T12:15:00+09:00`)).toBeGreaterThanOrEqual(0);
      expect(leaveBy?.at.localeCompare(`${date}T13:00:00+09:00`)).toBe(-1);
      expect(leaveBy?.line).toMatch(/^학생회관식당까지 /u);
    });
  });
});
