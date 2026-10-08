import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { deleteFriendship } from './admin-users.js';
import { befriend, getFriends, signInUser, TestUser } from './friends.js';
import { expectStatus, sharingFriends, uploadPosition } from './location-sharing.js';
import { meetupBetween, statesOf } from './meetups.js';
import { refused, SignalWatcher } from './signals.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;
let accessToken: string;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function namesTo(user: TestUser): string[] {
  return watcher.for(user).map(({ name }) => name);
}

describe('Ending a friendship', () => {
  it('leaves neither among the Friends of the other, and tells both', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, first, second);

    expect((await deleteFriendship(app, accessToken, first.id, second.id)).status).toBe(204);

    expect((await getFriends(app, first)).body).toEqual([]);
    expect((await getFriends(app, second)).body).toEqual([]);
    await vi.waitFor(() => {
      for (const user of [first, second]) {
        expect(namesTo(user).filter((name) => name === 'friends-changed')).toHaveLength(3);
      }
    });
  });

  it('takes the two Users in either order', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, first, second);

    expect((await deleteFriendship(app, accessToken, second.id, first.id)).status).toBe(204);

    expect((await getFriends(app, first)).body).toEqual([]);
  });
});

describe('Ending a friendship as either User would', () => {
  it('removes the position of each from the other, when they saw each other', async () => {
    const [user, friend] = await sharingFriends(app);
    await Promise.all([expectStatus(uploadPosition(app, user), 200), expectStatus(uploadPosition(app, friend), 200)]);

    await expectStatus(deleteFriendship(app, accessToken, user.id, friend.id), 204);

    await vi.waitFor(() => {
      expect(watcher.for(user)).toContainEqual({
        userIds: [user.id],
        name: 'position-removed',
        payload: { userId: friend.id },
      });
      expect(watcher.for(friend)).toContainEqual({
        userIds: [friend.id],
        name: 'position-removed',
        payload: { userId: user.id },
      });
    });
  });

  it('withdraws a Meetup proposed between the two, and tells both', async () => {
    const [proposer, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, proposer, receiver);
    const meetupId = await meetupBetween(app, proposer, receiver);

    await expectStatus(deleteFriendship(app, accessToken, receiver.id, proposer.id), 204);

    expect(await statesOf(app, meetupId, proposer, receiver)).toEqual({ proposer: 'withdrawn', receiver: 'withdrawn' });
    await vi.waitFor(() => {
      expect(namesTo(proposer).filter((name) => name === 'meetups-changed')).toHaveLength(2);
      expect(namesTo(receiver).filter((name) => name === 'meetups-changed')).toHaveLength(2);
    });
  });
});

describe('Ending a friendship is refused', () => {
  it('with 404 between two Users who are not Friends', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);

    const response = await deleteFriendship(app, accessToken, first.id, second.id);

    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
  });

  it('with 404 for Users who do not exist', async () => {
    const response = await deleteFriendship(app, accessToken, randomUUID(), randomUUID());

    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
  });

  it('with 400 for an id that is not a UUID', async () => {
    const user = await signInUser(app);

    expect((await deleteFriendship(app, accessToken, user.id, 'not-a-uuid')).status).toBe(400);
  });
});
