/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { StartedTestContainer } from 'testcontainers';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { redisSettings, startRedis } from './containers.js';
import { changeState, createDraft, patchGlobalEvent } from './global-event-changes.js';
import { connectToDatabase, place132, storeEvent } from './quests.js';
import { signInAsAdministrator } from './sign-in.js';
import { SignalEvent, SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
// Other files publish, edit and cancel Global Events too. The server sends its signals to a Redis of its own, so that
// theirs never reach a check that none is sent.
let redis: StartedTestContainer;
let watcher: SignalWatcher;
let accessToken: string;

beforeAll(async () => {
  redis = await startRedis();
  const settings = { ...inject('settings'), ...redisSettings(redis) };
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start(settings)]);
  prisma = connectToDatabase();
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
  await redis.stop();
});

function changedWhile(act: () => Promise<unknown>): Promise<SignalEvent[]> {
  return signalsWhile(app, watcher, 'global-events-changed', act);
}

const complete = {
  startsAt: '2099-10-13T17:00:00+09:00',
  place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
  ...place132,
};

describe("An Administrator's change sends global-events-changed once", () => {
  it('when a Draft is published', async () => {
    const draft = await createDraft(app, accessToken, complete);

    expect(await changedWhile(() => changeState(app, accessToken, draft.id, 'publish', 1).expect(200))).toEqual([
      { name: 'global-events-changed' },
    ]);
  });

  it('when a published event is edited', async () => {
    const event = await storeEvent(prisma);

    expect(
      await changedWhile(() =>
        patchGlobalEvent(app, accessToken, event.id, { version: 1, title: '설명회' }).expect(200),
      ),
    ).toEqual([{ name: 'global-events-changed' }]);
  });

  it('when a published event is cancelled', async () => {
    const event = await storeEvent(prisma);

    expect(await changedWhile(() => changeState(app, accessToken, event.id, 'cancel', 1).expect(200))).toEqual([
      { name: 'global-events-changed' },
    ]);
  });
});

describe("An Administrator's change sends no global-events-changed", () => {
  it('when a Draft is created', async () => {
    expect(await changedWhile(() => createDraft(app, accessToken, complete))).toEqual([]);
  });

  it('when a Draft is edited', async () => {
    const draft = await createDraft(app, accessToken);

    expect(
      await changedWhile(() =>
        patchGlobalEvent(app, accessToken, draft.id, { version: 1, title: '박람회' }).expect(200),
      ),
    ).toEqual([]);
  });

  it('when a Draft is discarded', async () => {
    const draft = await createDraft(app, accessToken);

    expect(await changedWhile(() => changeState(app, accessToken, draft.id, 'discard', 1).expect(200))).toEqual([]);
  });

  it.each([
    ['publishing a Draft that misses its start', { state: 'draft' as const, startsAt: null }, 'publish', 1],
    ['cancelling from an older version', { version: 2 }, 'cancel', 1],
    ['cancelling a Draft', { state: 'draft' as const }, 'cancel', 1],
  ] as const)('when a change is refused: %s', async (_case, stored, change, version) => {
    const event = await storeEvent(prisma, stored);

    expect(await changedWhile(() => changeState(app, accessToken, event.id, change, version).expect(409))).toEqual([]);
  });

  it('when an edit of a published event is refused', async () => {
    const event = await storeEvent(prisma);

    expect(
      await changedWhile(() =>
        patchGlobalEvent(app, accessToken, event.id, { version: 1, latitude: null, longitude: null }).expect(409),
      ),
    ).toEqual([]);
  });
});
