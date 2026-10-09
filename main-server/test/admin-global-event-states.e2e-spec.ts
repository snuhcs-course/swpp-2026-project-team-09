/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { changeState, createDraft, patchGlobalEvent, type StateChange } from './global-event-changes.js';
import { eventDetailSchema, getAdminGlobalEvent, publishedAmong } from './global-event-lists.js';
import { connectToDatabase, place132, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { signIn, signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let accessToken: string;
let userToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
  ({ accessToken } = await signInAsAdministrator(app));
  ({ accessToken: userToken } = await signIn(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const fullDraft = {
  startsAt: '2099-10-13T17:00:00+09:00',
  endsAt: '2099-10-13T19:00:00+09:00',
  place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
  ...place132,
};

describe('Publishing a Draft', () => {
  it('makes it a published event with its version raised, which Users then list', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    const response = await changeState(app, accessToken, draft.id, 'publish', 1);

    expect(response.status).toBe(200);
    expect(eventDetailSchema.parse(response.body)).toEqual({ ...draft, state: 'published', version: 2 });
    expect(await publishedAmong(app, userToken, [draft.id])).toMatchObject([{ id: draft.id, title: draft.title }]);
  });

  it.each([
    ['a start', { startsAt: null, endsAt: null }, ['startsAt']],
    ['a position', { latitude: null, longitude: null }, ['position']],
    [
      'a start and a position',
      { startsAt: null, endsAt: null, latitude: null, longitude: null },
      ['startsAt', 'position'],
    ],
  ])('without %s is refused with what it misses, and changes nothing', async (_case, without, missing) => {
    const draft = await createDraft(app, accessToken, { ...fullDraft, ...without });

    const response = await changeState(app, accessToken, draft.id, 'publish', 1);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_INCOMPLETE', missing });
    expect((await getAdminGlobalEvent(app, accessToken, draft.id)).body).toEqual(draft);
  });
});

describe('An edit of a published event', () => {
  it.each([
    ['its position', { latitude: null, longitude: null }, ['position']],
    ['its start', { startsAt: null }, ['startsAt']],
  ])('that would remove %s is refused with what it would miss, and changes nothing', async (_case, change, missing) => {
    const event = await storeEvent(prisma);
    const before: unknown = (await getAdminGlobalEvent(app, accessToken, event.id)).body;

    const response = await patchGlobalEvent(app, accessToken, event.id, { version: 1, ...change });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_INCOMPLETE', missing });
    expect((await getAdminGlobalEvent(app, accessToken, event.id)).body).toEqual(before);
  });
});

describe('Discarding a Draft', () => {
  it('makes it a discarded event with its version raised, which Users never list', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    const response = await changeState(app, accessToken, draft.id, 'discard', 1);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...draft, state: 'discarded', version: 2, missing: [] });
    expect(await publishedAmong(app, userToken, [draft.id])).toEqual([]);
  });
});

describe('Cancelling a published event', () => {
  it('makes it a cancelled event with its version raised, which Users no longer list', async () => {
    const event = await storeEvent(prisma);

    const response = await changeState(app, accessToken, event.id, 'cancel', 1);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: event.id, state: 'cancelled', version: 2 });
    expect(await publishedAmong(app, userToken, [event.id])).toEqual([]);
  });
});

describe('A Draft', () => {
  it('is not listed for Users', async () => {
    const draft = await createDraft(app, accessToken, fullDraft);

    expect(await publishedAmong(app, userToken, [draft.id])).toEqual([]);
  });
});

describe('A change of state that is not allowed', () => {
  it.each([
    ['publish', 'published'],
    ['publish', 'cancelled'],
    ['publish', 'discarded'],
    ['discard', 'published'],
    ['discard', 'cancelled'],
    ['discard', 'discarded'],
    ['cancel', 'draft'],
    ['cancel', 'cancelled'],
    ['cancel', 'discarded'],
  ] as [StateChange, 'draft' | 'published' | 'cancelled' | 'discarded'][])(
    'is refused: %s an event that is %s, which keeps its state and version',
    async (change, state) => {
      const event = await storeEvent(prisma, { state });

      const response = await changeState(app, accessToken, event.id, change, 1);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_STATE', state });
      expect((await getAdminGlobalEvent(app, accessToken, event.id)).body).toMatchObject({ state, version: 1 });
    },
  );
});

describe('A change of state', () => {
  it.each(['publish', 'discard', 'cancel'] as StateChange[])(
    'to %s from an older version is refused with the stored version',
    async (change) => {
      const event = await storeEvent(prisma, { state: change === 'cancel' ? 'published' : 'draft', version: 3 });

      const response = await changeState(app, accessToken, event.id, change, 2);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_CHANGED', version: 3 });
    },
  );

  it.each(['publish', 'discard', 'cancel'] as StateChange[])(
    'to %s an unknown event is refused with 404',
    async (change) => {
      const response = await changeState(app, accessToken, randomUUID(), change, 1);

      expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
    },
  );

  it.each([
    ['an id that is not a UUID', 'not-a-uuid', { version: 1 }],
    ['no version', randomUUID(), {}],
    ['a version that is not a whole number', randomUUID(), { version: 1.5 }],
  ])('with %s is refused with 400', async (_case, id, body) => {
    const response = await patchGlobalEvent(app, accessToken, id, body);

    expect(response.status).toBe(400);
  });
});

describe('The checks of a change', () => {
  it('refuse an event in another state before an older version', async () => {
    const event = await storeEvent(prisma, { state: 'cancelled', version: 3 });

    const response = await changeState(app, accessToken, event.id, 'publish', 2);

    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_STATE' });
  });

  it('refuse an older version before what publishing misses', async () => {
    const event = await storeEvent(prisma, { state: 'draft', startsAt: null, endsAt: null, version: 3 });

    const response = await changeState(app, accessToken, event.id, 'publish', 2);

    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_CHANGED' });
  });
});
