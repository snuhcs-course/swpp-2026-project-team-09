/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { newFriendId } from '../src/users/friend-id.js';
import { publishedAmong, setFavorite } from './global-event-lists.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

async function favoriteOf(accessToken: string, id: string): Promise<boolean | undefined> {
  return (await publishedAmong(app, accessToken, [id])).at(0)?.favorite;
}

describe('A Favorite Event', () => {
  it('is not one until the User stars it, and the list gives no publishing time yet', async () => {
    const { accessToken } = await signIn(app);
    const event = await storeEvent(prisma);

    expect(await publishedAmong(app, accessToken, [event.id])).toMatchObject([
      { id: event.id, favorite: false, publishedAt: null },
    ]);
  });

  it('is starred for the User who stars it only', async () => {
    const [starring, other] = await Promise.all([signIn(app), signIn(app)]);
    const event = await storeEvent(prisma);

    expect((await setFavorite(app, starring.accessToken, event.id)).status).toBe(204);

    expect(await favoriteOf(starring.accessToken, event.id)).toBe(true);
    expect(await favoriteOf(other.accessToken, event.id)).toBe(false);
  });

  it('stays starred when starred again', async () => {
    const { accessToken } = await signIn(app);
    const event = await storeEvent(prisma);
    await setFavorite(app, accessToken, event.id);

    expect((await setFavorite(app, accessToken, event.id)).status).toBe(204);

    expect(await favoriteOf(accessToken, event.id)).toBe(true);
  });

  it('is no longer one once the star is cleared, and clearing it again changes nothing', async () => {
    const { accessToken } = await signIn(app);
    const event = await storeEvent(prisma);
    await setFavorite(app, accessToken, event.id);

    expect((await setFavorite(app, accessToken, event.id, false)).status).toBe(204);
    expect((await setFavorite(app, accessToken, event.id, false)).status).toBe(204);

    expect(await favoriteOf(accessToken, event.id)).toBe(false);
  });
});

describe('A Favorite Event', () => {
  it('is gone with its event', async () => {
    const { accessToken } = await signIn(app);
    const event = await storeEvent(prisma);
    await setFavorite(app, accessToken, event.id);

    await prisma.globalEvent.delete({ where: { id: event.id } });

    expect(await prisma.globalEventFavorite.count({ where: { globalEventId: event.id } })).toBe(0);
  });

  it('is gone with its User', async () => {
    const event = await storeEvent(prisma);
    const subject = randomUUID();
    const user = await prisma.user.create({
      data: { googleSubject: subject, email: `${subject}@snu.ac.kr`, friendId: newFriendId() },
    });
    await prisma.globalEventFavorite.create({ data: { userId: user.id, globalEventId: event.id } });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.globalEventFavorite.count({ where: { globalEventId: event.id } })).toBe(0);
  });
});

describe('Starring a Global Event and clearing its star', () => {
  it.each([
    ['star', 'draft', true],
    ['star', 'cancelled', true],
    ['star', 'discarded', true],
    ['clear', 'draft', false],
    ['clear', 'cancelled', false],
    ['clear', 'discarded', false],
  ] as const)('refuses to %s a %s event with 404', async (_, state, favorite) => {
    const { accessToken } = await signIn(app);
    const event = await storeEvent(prisma, { state });

    expect((await setFavorite(app, accessToken, event.id, favorite)).body).toMatchObject(
      refused(404, 'GLOBAL_EVENT_NOT_FOUND'),
    );
    expect(await prisma.globalEventFavorite.count({ where: { globalEventId: event.id } })).toBe(0);
  });

  it('refuses an id no event has with 404', async () => {
    const { accessToken } = await signIn(app);

    expect((await setFavorite(app, accessToken, randomUUID())).body).toMatchObject(
      refused(404, 'GLOBAL_EVENT_NOT_FOUND'),
    );
  });

  it('refuses an id that is not a UUID with 400', async () => {
    const { accessToken } = await signIn(app);

    expect((await setFavorite(app, accessToken, 'not-an-id')).status).toBe(400);
  });
});
