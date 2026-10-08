import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, signInUser, TestUser } from './friends.js';
import { expectStatus, setMasterSwitch, uploadPosition } from './location-sharing.js';
import {
  endParty,
  getInvitations,
  getMyParty,
  getSentJoinRequests,
  invitationOf,
  joinParty,
  joinRequestOf,
  partyOfHolders,
} from './parties.js';
import { getQuests, joinQuest } from './quests.js';
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

// The signals of this name sent to the User, each with what it carries.
function received(user: TestUser, name: string): unknown[] {
  return watcher
    .for(user)
    .filter((signal) => signal.name === name)
    .map(({ payload }) => payload);
}

describe('The Leader ending the Party', () => {
  it('takes every member out and ends its requests and invitations, and leaves the Quest as it is', async () => {
    const [leader, member, asking, invited] = await Promise.all([
      signInUser(app),
      signInUser(app),
      signInUser(app),
      signInUser(app),
    ]);
    await befriend(app, member, asking);
    await befriend(app, leader, invited);
    const { partyId, questId } = await partyOfHolders(app, leader, [member], { joinPolicy: 'approval' });
    await joinRequestOf(app, asking, partyId);
    await invitationOf(app, leader, invited);

    const response = await endParty(app, leader);

    expect(response.status).toBe(204);
    expect((await getMyParty(app, leader)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    expect((await getMyParty(app, member)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    expect((await getQuests(app, member)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
    expect((await getSentJoinRequests(app, asking)).body).toEqual([]);
    expect((await getInvitations(app, invited)).body).toEqual([]);
    expect((await joinParty(app, member, partyId)).body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
  });
});

describe('The Party’s end', () => {
  it('is told to the members, the Holders of its Quest and the Friends of its members', async () => {
    const [leader, member, holder, friend] = await Promise.all([
      signInUser(app),
      signInUser(app),
      signInUser(app),
      signInUser(app),
    ]);
    await befriend(app, member, friend);
    const { questId } = await partyOfHolders(app, leader, [member]);
    await joinQuest(app, holder, questId);
    const audience = [leader, member, holder, friend];
    await vi.waitFor(() => {
      // The opening and the member's entry; the Holder joined after both.
      expect(audience.map((user) => received(user, 'party-changed').length)).toEqual([2, 2, 0, 1]);
    });

    await endParty(app, leader);

    await vi.waitFor(() => {
      expect(audience.map((user) => received(user, 'party-changed').length)).toEqual([3, 3, 1, 2]);
    });
  });

  it('stops the positions the members saw of each other at once', async () => {
    const users = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const [leader, ...others] = users;
    await partyOfHolders(app, leader, others);
    await Promise.all(
      users.map(async (user) => {
        await expectStatus(setMasterSwitch(app, user, true), 204);
        await expectStatus(uploadPosition(app, user), 200);
      }),
    );

    await endParty(app, leader);

    await vi.waitFor(() => {
      for (const viewer of users) {
        const removed = users.filter((subject) => subject !== viewer).map(({ id }) => ({ userId: id }));
        expect(received(viewer, 'position-removed')).toEqual(expect.arrayContaining(removed));
        expect(received(viewer, 'position-removed')).toHaveLength(2);
      }
    });
  });
});

describe('Ending the Party is refused', () => {
  it('when repeated', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    await partyOfHolders(app, leader, [member]);
    await endParty(app, leader);

    const response = await endParty(app, leader);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });

  it('to another member, and the Party goes on', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId } = await partyOfHolders(app, leader, [member]);

    const response = await endParty(app, member);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject(refused(403, 'NOT_PARTY_LEADER'));
    expect((await getMyParty(app, leader)).body).toMatchObject({ id: partyId });
  });
});
