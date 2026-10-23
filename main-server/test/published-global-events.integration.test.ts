/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { getGlobalEvents, publishedAmong } from './global-event-lists.js';
import { connectToDatabase, place132, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { signIn, signInAsAdministrator, signInBeforeOnboarding } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
  ({ accessToken } = await signIn(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("A User's list of Global Events", () => {
  it('shows a published event with what the app shows of it', async () => {
    const event = await storeEvent(prisma, {
      description: '설명회를 엽니다.',
      startsAt: new Date('2099-10-13T08:00:00Z'),
      endsAt: new Date('2099-10-13T10:00:00Z'),
      postNumber: null,
      sourceUrl: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=1',
    });

    expect(await publishedAmong(app, accessToken, [event.id])).toEqual([
      {
        id: event.id,
        title: '지능형통신 연합전공 설명회',
        description: '설명회를 엽니다.',
        startsAt: '2099-10-13T08:00:00.000Z',
        endsAt: '2099-10-13T10:00:00.000Z',
        place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
        ...place132,
        sourceUrl: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=1',
      },
    ]);
  });
});

describe("A User's list of Global Events", () => {
  it.each(['draft', 'cancelled', 'discarded'] as const)('leaves out a %s event', async (state) => {
    const published = await storeEvent(prisma);
    const other = await storeEvent(prisma, { state });

    const listed = await publishedAmong(app, accessToken, [published.id, other.id]);

    expect(listed.map(({ id }) => id)).toEqual([published.id]);
  });

  it('is ordered by start, then by title', async () => {
    const later = await storeEvent(prisma, { title: '가 행사', startsAt: new Date('2099-11-02T01:00:00Z') });
    const second = await storeEvent(prisma, { title: '나 행사', startsAt: new Date('2099-11-01T01:00:00Z') });
    const first = await storeEvent(prisma, { title: '가 행사', startsAt: new Date('2099-11-01T01:00:00Z') });

    const listed = await publishedAmong(app, accessToken, [later.id, second.id, first.id]);

    expect(listed.map(({ id }) => id)).toEqual([first.id, second.id, later.id]);
  });
});

describe("A User's list of Global Events", () => {
  it("refuses an Administrator's access token with 401", async () => {
    const administrator = await signInAsAdministrator(app);

    expect((await getGlobalEvents(app, administrator.accessToken)).status).toBe(401);
  });

  it('refuses a User before onboarding with 403', async () => {
    const newUser = await signInBeforeOnboarding(app);

    const response = await getGlobalEvents(app, newUser.accessToken);

    expect(response.body).toMatchObject(refused(403, 'ONBOARDING_REQUIRED'));
  });
});
