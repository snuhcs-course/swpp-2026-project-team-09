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
import { eventDetailSchema, getAdminGlobalEvent } from './global-event-lists.js';
import { postNumbersFrom } from './global-events.js';
import { connectToDatabase, place132, storeEvent } from './quests.js';
import { refused } from './signals.js';
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

const newPost = postNumbersFrom(930_000);

describe('A Global Event read by an Administrator', () => {
  it.each(['draft', 'published', 'cancelled', 'discarded'] as const)(
    'is answered in the state %s, as a list entry with its description',
    async (state) => {
      const postNumber = newPost();
      const event = await storeEvent(prisma, {
        state,
        description: '- 일시: 2099. 10. 13.(화) 17:00',
        startsAt: new Date('2099-10-13T08:00:00Z'),
        endsAt: null,
        version: 3,
        postNumber,
        sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
      });

      const response = await getAdminGlobalEvent(app, accessToken, event.id);

      expect(response.status).toBe(200);
      expect(eventDetailSchema.parse(response.body)).toEqual({
        id: event.id,
        title: '지능형통신 연합전공 설명회',
        description: '- 일시: 2099. 10. 13.(화) 17:00',
        startsAt: '2099-10-13T08:00:00.000Z',
        endsAt: null,
        place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
        ...place132,
        state,
        version: 3,
        postNumber,
        sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
        missing: [],
      });
    },
  );
});

describe('A Global Event read by an Administrator', () => {
  it('names what publishing a Draft needs', async () => {
    const event = await storeEvent(prisma, {
      state: 'draft',
      startsAt: null,
      endsAt: null,
      latitude: null,
      longitude: null,
    });

    const response = await getAdminGlobalEvent(app, accessToken, event.id);

    expect(response.body).toMatchObject({ missing: ['startsAt', 'position'] });
  });

  it('is refused with 404 for an unknown id', async () => {
    const response = await getAdminGlobalEvent(app, accessToken, randomUUID());

    expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
  });

  it('is refused with 400 for an id that is not a UUID', async () => {
    expect((await getAdminGlobalEvent(app, accessToken, 'not-a-uuid')).status).toBe(400);
  });
});
