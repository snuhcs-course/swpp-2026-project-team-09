/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { getAdminGlobalEvents, listedAmong } from './global-event-lists.js';
import { postNumbersFrom } from './global-events.js';
import { connectToDatabase, place132, storeEvent } from './quests.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const newPost = postNumbersFrom(920_000);

describe("An Administrator's list of Drafts", () => {
  it('shows a Draft with its source and what publishing it needs', async () => {
    const postNumber = newPost();
    const draft = await storeEvent(prisma, {
      state: 'draft',
      startsAt: null,
      endsAt: null,
      postNumber,
      sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
    });

    expect(await listedAmong(app, accessToken, 'draft', [draft.id])).toEqual([
      {
        id: draft.id,
        title: '지능형통신 연합전공 설명회',
        startsAt: null,
        endsAt: null,
        place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
        ...place132,
        state: 'draft',
        version: 1,
        postNumber,
        sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
        missing: ['startsAt'],
      },
    ]);
  });
});

// A Draft starting at `time`.
function draftAt(time: string): object {
  return { state: 'draft', startsAt: new Date(time), endsAt: null };
}

describe("An Administrator's lists", () => {
  it('each hold the events of their state and leave out the others', async () => {
    const events = await Promise.all(
      (['draft', 'published', 'cancelled', 'discarded'] as const).map((state) => storeEvent(prisma, { state })),
    );
    const ids = events.map(({ id }) => id);

    const drafts = await listedAmong(app, accessToken, 'draft', ids);
    const published = await listedAmong(app, accessToken, 'published', ids);

    expect(drafts.map(({ id }) => id)).toEqual([ids[0]]);
    expect(published.map(({ id }) => id)).toEqual([ids[1]]);
  });

  it('are ordered by start, the events without a start last, then by title', async () => {
    const noStartB = await storeEvent(prisma, { state: 'draft', title: '나 행사', startsAt: null, endsAt: null });
    const noStartA = await storeEvent(prisma, { state: 'draft', title: '가 행사', startsAt: null, endsAt: null });
    const later = await storeEvent(prisma, { title: '가 행사', ...draftAt('2099-11-02T01:00:00Z') });
    const secondB = await storeEvent(prisma, { title: '나 행사', ...draftAt('2099-11-01T01:00:00Z') });
    const firstA = await storeEvent(prisma, { title: '가 행사', ...draftAt('2099-11-01T01:00:00Z') });
    const ids = [noStartB, noStartA, later, secondB, firstA].map(({ id }) => id);

    const listed = await listedAmong(app, accessToken, 'draft', ids);

    expect(listed.map(({ id }) => id)).toEqual([firstA.id, secondB.id, later.id, noStartA.id, noStartB.id]);
  });
});

describe("An Administrator's lists", () => {
  it.each([
    ['a Draft without a position', { state: 'draft', latitude: null, longitude: null }, ['position']],
    [
      'a Draft without a start or a position',
      { state: 'draft', startsAt: null, endsAt: null, latitude: null, longitude: null },
      ['startsAt', 'position'],
    ],
    ['a Draft that has both', { state: 'draft' }, []],
    ['a published event', { state: 'published' }, []],
  ] as const)('name for %s what publishing needs: %j', async (_case, changes, missing) => {
    const event = await storeEvent(prisma, changes);

    const [listed] = await listedAmong(app, accessToken, changes.state, [event.id]);

    expect(listed.missing).toEqual(missing);
  });

  it.each([
    ['without a state', {}],
    ['for a cancelled state', { state: 'cancelled' }],
    ['for an unknown state', { state: 'finished' }],
  ])('refuse a request %s with 400', async (_case, query) => {
    expect((await getAdminGlobalEvents(app, accessToken, query)).status).toBe(400);
  });
});
