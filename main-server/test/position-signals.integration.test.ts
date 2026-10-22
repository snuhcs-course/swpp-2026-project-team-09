/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, endFriendship, signInUser, TestUser } from './friends.js';
import {
  expectStatus,
  OFF_CAMPUS,
  ON_CAMPUS,
  setFriendSharing,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { ANY_STRING, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start()]);
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
    .map(({ userIds, payload }) => ({ userIds: userIds?.toSorted(), payload }));
}

// Waits until `position-removed` has gone to the viewer once for each subject, naming only the viewers given.
async function expectRemoved(viewer: TestUser, subject: TestUser, viewers: TestUser[] = [viewer]): Promise<void> {
  await vi.waitFor(() => {
    expect(received(viewer, 'position-removed')).toContainEqual({
      userIds: viewers.map(({ id }) => id).toSorted(),
      payload: { userId: subject.id },
    });
  });
}

// Two Friends who see each other, each with a position on campus.
async function seeingEachOther(): Promise<[TestUser, TestUser]> {
  const [user, friend] = await sharingFriends(app);
  await Promise.all([expectStatus(uploadPosition(app, user), 200), expectStatus(uploadPosition(app, friend), 200)]);
  return [user, friend];
}

describe('position', () => {
  it('goes with the coordinates and the time measured to the Users who may see the subject, and no other', async () => {
    const [subject, viewer] = await sharingFriends(app);
    const [switchedOff, stranger] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, subject, switchedOff);
    await expectStatus(setMasterSwitch(app, switchedOff, true), 204);
    await expectStatus(setFriendSharing(app, switchedOff, subject.id, false), 204);
    const measuredAt = new Date().toISOString();

    await expectStatus(uploadPosition(app, subject, { measuredAt }), 200);

    await vi.waitFor(() => {
      expect(received(viewer, 'position')).toEqual([
        { userIds: [viewer.id], payload: { userId: subject.id, ...ON_CAMPUS, measuredAt } },
      ]);
    });
    // A position names all its viewers at once, so one that named these Users has come already.
    expect(received(switchedOff, 'position')).toEqual([]);
    expect(watcher.for(stranger)).toEqual([]);
  });

  it('is not sent for a position outside the Campus Boundary', async () => {
    const [subject, viewer] = await sharingFriends(app);

    await expectStatus(uploadPosition(app, subject, OFF_CAMPUS), 200);
    await expectStatus(uploadPosition(app, subject), 200);

    await vi.waitFor(() => {
      expect(received(viewer, 'position')).toHaveLength(1);
    });
    expect(received(viewer, 'position')).toEqual([
      { userIds: [viewer.id], payload: { userId: subject.id, ...ON_CAMPUS, measuredAt: ANY_STRING } },
    ]);
  });
});

describe('position-removed on a switch', () => {
  it('goes both ways when the subject turns the Master Switch off', async () => {
    const [subject, viewer] = await seeingEachOther();

    await expectStatus(setMasterSwitch(app, subject, false), 204);

    await expectRemoved(viewer, subject);
    await expectRemoved(subject, viewer);
  });

  it('goes both ways when the viewer turns the Master Switch off', async () => {
    const [subject, viewer] = await seeingEachOther();

    await expectStatus(setMasterSwitch(app, viewer, false), 204);

    await expectRemoved(viewer, subject);
    await expectRemoved(subject, viewer);
  });

  it.each(['subject', 'viewer'] as const)(
    "goes both ways when the %s turns the friendship's switch off",
    async (who) => {
      const [subject, viewer] = await seeingEachOther();
      const [turning, other] = who === 'subject' ? [subject, viewer] : [viewer, subject];

      await expectStatus(setFriendSharing(app, turning, other.id, false), 204);

      await expectRemoved(viewer, subject);
      await expectRemoved(subject, viewer);
    },
  );

  it('names only the viewers who could see the subject before', async () => {
    const [subject, viewer] = await seeingEachOther();
    const hidden = await signInUser(app);
    await befriend(app, subject, hidden);
    await expectStatus(setFriendSharing(app, hidden, subject.id, false), 204);
    await expectStatus(setMasterSwitch(app, hidden, true), 204);

    await expectStatus(setMasterSwitch(app, subject, false), 204);

    await expectRemoved(viewer, subject, [viewer]);
    expect(received(hidden, 'position-removed')).toEqual([]);
  });
});

describe('position-removed on a change of the friendship or the place', () => {
  it('goes both ways when the friendship ends', async () => {
    const [subject, viewer] = await seeingEachOther();

    expect((await endFriendship(app, viewer, subject.id)).status).toBe(204);

    await expectRemoved(viewer, subject);
    await expectRemoved(subject, viewer);
  });

  it('goes to the viewers when the subject leaves the Campus Boundary', async () => {
    const [subject, viewer] = await sharingFriends(app);
    await expectStatus(uploadPosition(app, subject), 200);

    await expectStatus(uploadPosition(app, subject, OFF_CAMPUS), 200);

    await expectRemoved(viewer, subject);
  });

  it('is not sent when the switch is turned on', async () => {
    const [subject, viewer] = await seeingEachOther();

    await expectStatus(setFriendSharing(app, viewer, subject.id, true), 204);
    await expectStatus(setMasterSwitch(app, subject, true), 204);
    await expectStatus(setMasterSwitch(app, subject, false), 204);

    await expectRemoved(viewer, subject);
    expect(received(viewer, 'position-removed')).toHaveLength(1);
  });
});
