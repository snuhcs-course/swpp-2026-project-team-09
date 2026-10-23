/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { getFriendRequests, getFriends, requestFriendship, signInUser } from './friends.js';
import { acceptInviteLink, createInviteLink, getInviteLink, postInviteLink } from './invite-links.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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

describe('Creating an Invite Link', () => {
  it("answers an address on the server's public address with a random token, valid for 24 hours", async () => {
    const sender = await signInUser(app);
    const createdAt = Date.now();

    const response = await postInviteLink(app, sender);

    expect(response.status).toBe(201);
    const { url, expiresAt } = z.object({ url: z.string(), expiresAt: z.iso.datetime() }).parse(response.body);
    expect(url).toMatch(/^https:\/\/snunow\.example\/invite\/[\w-]{43}$/u);
    const lifetime = Date.parse(expiresAt) - createdAt;
    expect(lifetime).toBeGreaterThanOrEqual(DAY_MS);
    expect(lifetime).toBeLessThan(DAY_MS + 60_000);
  });

  it('lets a User hold several unused links, each usable', async () => {
    const sender = await signInUser(app);
    const [first, second] = [await createInviteLink(app, sender), await createInviteLink(app, sender)];
    const receiver = await signInUser(app);

    expect(first).not.toBe(second);
    expect((await getInviteLink(app, receiver, first)).body).toMatchObject({ status: 'usable' });
    expect((await getInviteLink(app, receiver, second)).body).toMatchObject({ status: 'usable' });
  });
});

describe('Looking up an Invite Link', () => {
  it("answers the sender's name and department and that the link can be used", async () => {
    const sender = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const token = await createInviteLink(app, sender);
    const receiver = await signInUser(app);

    const response = await getInviteLink(app, receiver, token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sender: { name: '홍길동', department: '컴퓨터공학부' }, status: 'usable' });
  });

  it("answers 'own' to the link's sender", async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);

    expect((await getInviteLink(app, sender, token)).body).toMatchObject({ status: 'own' });
  });

  it('answers that a declined link stays usable, since declining sends nothing', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);
    const [decliner, later] = await Promise.all([signInUser(app), signInUser(app)]);
    await getInviteLink(app, decliner, token);

    expect((await getInviteLink(app, later, token)).body).toMatchObject({ status: 'usable' });
    expect((await acceptInviteLink(app, later, token)).status).toBe(204);
  });
});

describe('Accepting an Invite Link', () => {
  it('makes the two Users Friends at once and uses the link up', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);
    const receiver = await signInUser(app);

    const response = await acceptInviteLink(app, receiver, token);

    expect(response.status).toBe(204);
    expect((await getFriends(app, sender)).body).toMatchObject([{ id: receiver.id }]);
    expect((await getFriends(app, receiver)).body).toMatchObject([{ id: sender.id }]);
    expect((await getInviteLink(app, await signInUser(app), token)).body).toMatchObject({ status: 'used' });
  });

  it.each([
    ['the sender', 'sender'],
    ['the receiver', 'receiver'],
  ] as const)('turns a Friend Request that %s sent into the friendship', async (_case, requester) => {
    const users = { sender: await signInUser(app), receiver: await signInUser(app) };
    await requestFriendship(app, users[requester], requester === 'sender' ? users.receiver : users.sender);
    const token = await createInviteLink(app, users.sender);

    expect((await acceptInviteLink(app, users.receiver, token)).status).toBe(204);
    expect((await getFriends(app, users.sender)).body).toMatchObject([{ id: users.receiver.id }]);
    expect((await getFriendRequests(app, users.sender)).body).toEqual({ received: [], sent: [] });
  });

  it('sends friends-changed to both Users', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);
    const receiver = await signInUser(app);

    await acceptInviteLink(app, receiver, token);

    await vi.waitFor(() => {
      expect(watcher.for(sender)).toEqual([
        { userIds: expect.arrayContaining([sender.id, receiver.id]) as unknown, name: 'friends-changed' },
      ]);
    });
  });
});
