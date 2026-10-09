/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import {
  answerFriendRequest,
  befriend,
  endFriendship,
  requestFriendship,
  sendFriendRequest,
  signInUser,
  TestUser,
} from './friends.js';
import { SignalWatcher } from './signals.js';
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

// Waits until `friends-changed` has gone to both Users `times` times in all, each time naming the two of them alone.
async function expectFriendsChanged(first: TestUser, second: TestUser, times: number): Promise<void> {
  const both = [first.id, second.id].toSorted();
  await vi.waitFor(() => {
    const signals = watcher.for(first);
    expect(signals).toHaveLength(times);
    for (const { userIds, name, payload } of signals) {
      expect({ userIds: userIds?.toSorted(), name, payload }).toEqual({
        userIds: both,
        name: 'friends-changed',
        payload: undefined,
      });
    }
  });
}

describe('friends-changed on a Friend Request', () => {
  it('goes to both Users when a Friend Request is sent', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);

    await sendFriendRequest(app, sender, receiver.friendId);

    await expectFriendsChanged(sender, receiver, 1);
  });

  it.each(['accept', 'decline'] as const)(
    'goes to both Users when a Friend Request is answered: %s',
    async (answer) => {
      const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
      const requestId = await requestFriendship(app, sender, receiver);

      await answerFriendRequest(app, receiver, requestId, answer);

      await expectFriendsChanged(sender, receiver, 2);
    },
  );

  it('goes to both Users when a Friend Request is cancelled', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);

    await answerFriendRequest(app, sender, requestId, 'cancel');

    await expectFriendsChanged(receiver, sender, 2);
  });

  it('goes to both Users when crossing requests make them Friends', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    await requestFriendship(app, first, second);

    await sendFriendRequest(app, second, first.friendId);

    await expectFriendsChanged(first, second, 2);
  });
});

describe('friends-changed on a friendship', () => {
  it('goes to both Users when a friendship ends', async () => {
    const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, user, friend);

    await endFriendship(app, user, friend.id);

    await expectFriendsChanged(friend, user, 3);
  });

  // Signals reach Redis in the order they are sent, so one sent for a refusal would come before the last one.
  it('is not sent when a request is refused', async () => {
    const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, user, friend);

    await sendFriendRequest(app, user, friend.friendId);
    await sendFriendRequest(app, user, user.friendId);
    await endFriendship(app, friend, friend.id);
    await endFriendship(app, friend, user.id);

    await expectFriendsChanged(user, friend, 3);
  });
});
