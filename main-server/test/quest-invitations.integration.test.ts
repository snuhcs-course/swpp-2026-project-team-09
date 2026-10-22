/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, signInUser, TestUser } from './friends.js';
import { answerInvitation, getInvitations, invitationOf, invite, setQuest } from './quest-recruiting.js';
import { getQuest, joinQuest, ownQuest } from './quests.js';
import { ANY_STRING, refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function signalsTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'quests-changed').length;
}

// A Leader and a Friend of theirs.
async function friends(): Promise<[TestUser, TestUser]> {
  const [leader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, leader, friend);
  return [leader, friend];
}

// A Quest of the Leader, with an invitation of the Friend into it.
async function invited(
  leader: TestUser,
  friend: TestUser,
  body: object = {},
): Promise<{ questId: string; invitationId: string }> {
  const questId = await ownQuest(app, leader, body);
  return { questId, invitationId: await invitationOf(app, leader, questId, friend) };
}

describe('The Leader inviting a Friend', () => {
  it('leaves an invitation the Friend lists with the Quest and its Leader, and tells the Friend', async () => {
    const leader = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const friend = await signInUser(app);
    await befriend(app, leader, friend);
    const questId = await ownQuest(app, leader, { title: '저녁 같이' });

    const response = await invite(app, leader, questId, friend.id);

    expect(response.status).toBe(204);
    expect((await getInvitations(app, friend)).body).toEqual([
      {
        id: ANY_STRING,
        quest: {
          id: questId,
          title: '저녁 같이',
          globalEvent: null,
          leader: { id: leader.id, name: '홍길동', department: '컴퓨터공학부' },
          holderCount: 1,
          capacity: 4,
          joinPolicy: 'closed',
          board: null,
          description: '',
          createdAt: ANY_STRING,
        },
        sentAt: ANY_STRING,
      },
    ]);
    expect((await getQuest(app, friend, questId)).status).toBe(404);
    await vi.waitFor(() => {
      expect(signalsTo(friend)).toBe(1);
    });
  });
});

describe('Inviting is refused', () => {
  it('for a User who is not the Leader’s Friend', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader);

    const response = await invite(app, leader, questId, user.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
    expect((await getInvitations(app, user)).body).toEqual([]);
  });

  it('for a Holder of the Quest', async () => {
    const [leader, friend] = await friends();
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    await joinQuest(app, friend, questId);

    const response = await invite(app, leader, questId, friend.id);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_HOLDER'));
  });

  it('for a second invitation of the same Friend', async () => {
    const [leader, friend] = await friends();
    const { questId } = await invited(leader, friend);

    const response = await invite(app, leader, questId, friend.id);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_INVITATION_ALREADY_SENT'));
  });
});

describe('The Leader’s part of invitations', () => {
  it('is refused to another Holder', async () => {
    const [leader, holder] = await friends();
    const friend = await signInUser(app);
    await befriend(app, holder, friend);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    await joinQuest(app, holder, questId);

    const response = await invite(app, holder, questId, friend.id);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject(refused(403, 'NOT_QUEST_LEADER'));
    expect((await getInvitations(app, friend)).body).toEqual([]);
  });

  it('is refused to a User who does not hold the Quest', async () => {
    const [leader, user] = await friends();
    const questId = await ownQuest(app, leader);

    const response = await invite(app, user, questId, leader.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});

describe('Accepting an invitation', () => {
  it.each(['open', 'approval', 'closed'])(
    'makes the User a Holder of a %s Quest, ends the invitation, and tells the Holders',
    async (joinPolicy) => {
      const [leader, friend] = await friends();
      const { questId, invitationId } = await invited(leader, friend, { joinPolicy });

      const response = await answerInvitation(app, friend, invitationId, 'accept');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ id: questId, holders: [{ id: leader.id }, { id: friend.id }] });
      expect((await getInvitations(app, friend)).body).toEqual([]);
      await vi.waitFor(() => {
        // Making the Quest and the entry; the invitation and the entry.
        expect(signalsTo(leader)).toBe(2);
        expect(signalsTo(friend)).toBe(2);
      });
    },
  );
});

describe('Accepting an invitation is refused', () => {
  it('when the Quest is full, and the invitation still waits', async () => {
    const [leader, friend] = await friends();
    const { invitationId } = await invited(leader, friend, { capacity: 1 });

    const response = await answerInvitation(app, friend, invitationId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_FULL'));
    expect((await getInvitations(app, friend)).body).toHaveLength(1);
  });

  it('when the Quest has no Sub Quest ahead', async () => {
    const [leader, friend] = await friends();
    const endsAt = new Date(Date.now() - 1000).toISOString();
    const { invitationId } = await invited(leader, friend, { subQuest: { title: '점심', endsAt } });

    const response = await answerInvitation(app, friend, invitationId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_ENDED'));
  });

  it('to another User', async () => {
    const [leader, friend] = await friends();
    const { invitationId } = await invited(leader, friend);

    const response = await answerInvitation(app, leader, invitationId, 'accept');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_INVITATION_NOT_FOUND'));
  });

  it('for a full Quest, after which it works once the Leader raises the capacity', async () => {
    const [leader, friend] = await friends();
    const { questId, invitationId } = await invited(leader, friend, { capacity: 1 });
    await answerInvitation(app, friend, invitationId, 'accept');
    await setQuest(app, leader, questId, { capacity: 2 });

    expect((await answerInvitation(app, friend, invitationId, 'accept')).status).toBe(201);
  });
});

describe('Declining an invitation', () => {
  it('ends it, leaves the User out of the Quest, and tells the User', async () => {
    const [leader, friend] = await friends();
    const { questId, invitationId } = await invited(leader, friend);

    const response = await answerInvitation(app, friend, invitationId, 'decline');

    expect(response.status).toBe(204);
    expect((await getInvitations(app, friend)).body).toEqual([]);
    expect((await getQuest(app, friend, questId)).status).toBe(404);
    await vi.waitFor(() => {
      expect(signalsTo(friend)).toBe(2);
    });
    expect((await answerInvitation(app, friend, invitationId, 'accept')).body).toMatchObject(
      refused(404, 'QUEST_INVITATION_NOT_FOUND'),
    );
  });
});
