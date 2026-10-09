/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import {
  expectStatus,
  getPositions,
  ON_CAMPUS,
  setFriendSharing,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { enter, getMyParty, leaveParty, partyOf, partyOfHolders, setPartySharing } from './parties.js';
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

// The signals of this name sent to the User, each with the Users it names and what it carries.
function received(user: TestUser, name: string): unknown[] {
  return watcher
    .for(user)
    .filter((signal) => signal.name === name)
    .map(({ userIds, payload }) => ({ userIds, payload }));
}

async function expectRemoved(viewer: TestUser, subject: TestUser): Promise<void> {
  await vi.waitFor(() => {
    expect(received(viewer, 'position-removed')).toContainEqual({
      userIds: [viewer.id],
      payload: { userId: subject.id },
    });
  });
}

// Two Users in one Party, not Friends, who have turned their Master Switches on.
async function sharingMembers(): Promise<[TestUser, TestUser]> {
  const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
  await partyOfHolders(app, leader, [member]);
  await Promise.all([
    expectStatus(setMasterSwitch(app, leader, true), 204),
    expectStatus(setMasterSwitch(app, member, true), 204),
  ]);
  return [leader, member];
}

// As sharingMembers, each with a position on campus.
async function seeingEachOther(): Promise<[TestUser, TestUser]> {
  const [leader, member] = await sharingMembers();
  await Promise.all([expectStatus(uploadPosition(app, leader), 200), expectStatus(uploadPosition(app, member), 200)]);
  return [leader, member];
}

describe('Members of a Party', () => {
  it('see each other, and the Party says so for each member', async () => {
    const [leader, member] = await seeingEachOther();

    expect((await getPositions(app, leader)).body).toMatchObject([{ userId: member.id }]);
    expect((await getMyParty(app, leader)).body).toMatchObject({
      sharing: true,
      members: [
        { id: leader.id, visible: false },
        { id: member.id, visible: true },
      ],
    });
  });

  it('get each other’s positions pushed', async () => {
    const [leader, member] = await sharingMembers();
    const measuredAt = new Date().toISOString();

    await expectStatus(uploadPosition(app, member, { measuredAt }), 200);

    await vi.waitFor(() => {
      expect(received(leader, 'position')).toEqual([
        { userIds: [leader.id], payload: { userId: member.id, ...ON_CAMPUS, measuredAt } },
      ]);
    });
  });

  it('see a member whom the friendship’s switch hides', async () => {
    const [user, friend] = await sharingFriends(app);
    await expectStatus(setFriendSharing(app, user, friend.id, false), 204);
    await enter(app, friend, await partyOf(app, user, { joinPolicy: 'open' }));

    await expectStatus(uploadPosition(app, friend), 200);

    expect((await getPositions(app, user)).body).toMatchObject([{ userId: friend.id }]);
  });
});

describe('The Party’s switch', () => {
  it.each(['leader', 'member'] as const)('turned off by the %s hides the two from each other at once', async (who) => {
    const [leader, member] = await seeingEachOther();

    expect((await setPartySharing(app, who === 'leader' ? leader : member, false)).status).toBe(204);

    await expectRemoved(leader, member);
    await expectRemoved(member, leader);
    expect((await getPositions(app, leader)).body).toEqual([]);
    expect((await getMyParty(app, leader)).body).toMatchObject({
      sharing: who === 'member',
      members: [{ visible: false }, { visible: false }],
    });
  });

  it('turned on again lets the two see each other again', async () => {
    const [leader, member] = await seeingEachOther();
    await setPartySharing(app, member, false);

    await setPartySharing(app, member, true);

    expect((await getPositions(app, leader)).body).toMatchObject([{ userId: member.id }]);
  });

  it('is refused to a User in no Party', async () => {
    const user = await signInUser(app);

    const response = await setPartySharing(app, user, false);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });
});

describe('Leaving a Party', () => {
  it('hides the one who left and the members from each other at once', async () => {
    const [leader, member] = await seeingEachOther();

    await leaveParty(app, member);

    await expectRemoved(leader, member);
    await expectRemoved(member, leader);
    expect((await getPositions(app, member)).body).toEqual([]);
  });
});
