/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, signInUser, TestUser } from './friends.js';
import { getMyParty, partyOfHolders } from './parties.js';
import { endQuest, getInvitations, getSentJoinRequests, invitationOf, joinRequestOf } from './quest-recruiting.js';
import { getQuest, getQuests, joinQuest, ownQuest } from './quests.js';
import { refused, SignalWatcher } from './signals.js';
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

// An Open Quest of the Leader that the Holder joined.
async function sharedQuest(leader: TestUser, holder: TestUser): Promise<string> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
  await joinQuest(app, holder, questId);
  return questId;
}

describe('The Leader ending a Quest', () => {
  it('deletes it with its requests to join and its invitations, and tells the Leader and the Users who waited', async () => {
    const [leader, other, asking, invited] = await Promise.all([
      signInUser(app),
      signInUser(app),
      signInUser(app),
      signInUser(app),
    ]);
    await befriend(app, leader, invited);
    const questId = await ownQuest(app, leader, { joinPolicy: 'approval' });
    await joinRequestOf(app, asking, questId);
    await invitationOf(app, leader, questId, invited);
    const kept = await ownQuest(app, other);
    await vi.waitFor(() => {
      expect(signalsTo(asking)).toBe(0);
      expect(signalsTo(invited)).toBe(1);
    });
    const before = [leader, asking, invited].map((user) => signalsTo(user));

    const response = await endQuest(app, leader, questId);

    expect(response.status).toBe(204);
    expect((await getQuest(app, leader, questId)).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect((await getQuests(app, leader)).body).toEqual([]);
    expect((await getQuests(app, other)).body).toMatchObject([{ id: kept }]);
    expect((await getSentJoinRequests(app, asking)).body).toEqual([]);
    expect((await getInvitations(app, invited)).body).toEqual([]);
    await vi.waitFor(() => {
      expect([leader, asking, invited].map((user) => signalsTo(user))).toEqual(before.map((count) => count + 1));
    });
  });
});

describe('The Leader ending a Shared Quest', () => {
  it('ends it for the other Holders too, and tells them', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(leader, holder);
    await vi.waitFor(() => {
      expect(signalsTo(holder)).toBe(1);
    });

    await endQuest(app, leader, questId);

    expect((await getQuest(app, holder, questId)).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    await vi.waitFor(() => {
      expect(signalsTo(holder)).toBe(2);
    });
  });
});

describe('The Leader ending the Quest of a running Party', () => {
  it('leaves the Party going on, tied to no Quest', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId } = await partyOfHolders(app, leader, [member]);

    await endQuest(app, leader, questId);

    expect((await getMyParty(app, member)).body).toMatchObject({
      id: partyId,
      quest: null,
      members: [{ id: leader.id }, { id: member.id }],
    });
  });
});

describe('Ending a Quest is refused', () => {
  it('when repeated', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader);
    await endQuest(app, leader, questId);

    const response = await endQuest(app, leader, questId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });

  it('to another Holder, and the Quest stays', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(leader, holder);

    const response = await endQuest(app, holder, questId);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject(refused(403, 'NOT_QUEST_LEADER'));
    expect((await getQuest(app, leader, questId)).status).toBe(200);
  });

  it('to a User who does not hold the Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader);

    const response = await endQuest(app, user, questId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect((await getQuest(app, leader, questId)).status).toBe(200);
  });
});
