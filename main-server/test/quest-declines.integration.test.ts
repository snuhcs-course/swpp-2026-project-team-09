/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type TestUser } from './friends.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { answerInvitation, getInvitations, getSentInvitations, invitationOf } from './quest-recruiting.js';
import { getQuest, ownQuest } from './quests.js';

// A decline kept as a row of its own: the Quest a Holder reads lists the User who declined, after the invited, while
// the lists of invitations do not hold it; an invitation sent again makes the User invited anew. The test stands on a
// Tuesday of October 2088, which no other file uses, at 11:50.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const membersOf = async (user: TestUser, questId: string): Promise<object[]> =>
  z
    .object({ members: z.array(z.object({ user: z.object({ id: z.string() }), state: z.string() }).loose()) })
    .parse((await getQuest(stage.app, user, questId)).body)
    .members.map(({ user: { id }, state, lateMinutes }) => ({ id, state, lateMinutes }));

const questIdsIn = (body: unknown): string[] =>
  z
    .array(z.object({ quest: z.object({ id: z.string() }) }).loose())
    .parse(body)
    .map(({ quest }) => quest.id);

const userIdsIn = (body: unknown): string[] =>
  z
    .array(z.object({ user: z.object({ id: z.string() }) }).loose())
    .parse(body)
    .map(({ user }) => user.id);

const member = (user: TestUser, state: string): object => ({ id: user.id, state, lateMinutes: null });

describe('민수 declining the Leader’s invitation, then invited again', () => {
  const date = '2088-10-26';
  let minsu: Named;
  let jieun: Named;
  let questId: string;

  beforeAll(async () => {
    await stage.asking(date, '11:50');
    minsu = await stage.friend('민수');
    jieun = await stage.friend('지은');
    questId = await ownQuest(stage.app, stage.asker, {
      title: '점심',
      subQuest: { title: '점심', startsAt: `${date}T12:33:00+09:00`, endsAt: `${date}T12:55:00+09:00` },
    });
    const minsuInvitation = await invitationOf(stage.app, stage.asker, questId, minsu);
    await invitationOf(stage.app, stage.asker, questId, jieun);
    await answerInvitation(stage.app, minsu, minsuInvitation, 'decline');
  });

  it('lists him as declined, after the invited', async () => {
    expect(await membersOf(stage.asker, questId)).toEqual([
      member(stage.asker, 'accepted'),
      member(jieun, 'invited'),
      member(minsu, 'declined'),
    ]);
  });

  it('leaves the invitation out of his list and the Leader’s', async () => {
    expect(questIdsIn((await getInvitations(stage.app, minsu)).body)).not.toContain(questId);
    expect(userIdsIn((await getSentInvitations(stage.app, stage.asker, questId)).body)).toEqual([jieun.id]);
  });

  it('lists him as invited once invited again, and as accepted once he accepts, with no decline left', async () => {
    const again = await invitationOf(stage.app, stage.asker, questId, minsu);

    expect(await membersOf(stage.asker, questId)).toEqual([
      member(stage.asker, 'accepted'),
      member(jieun, 'invited'),
      member(minsu, 'invited'),
    ]);

    await answerInvitation(stage.app, minsu, again, 'accept');

    expect(await membersOf(stage.asker, questId)).toEqual([
      member(stage.asker, 'accepted'),
      member(minsu, 'accepted'),
      member(jieun, 'invited'),
    ]);
  });
});
