/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { type NotificationsService } from '../src/notifications/notifications.service.js';
import { signInUser } from './friends.js';
import { connectToDatabase } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// A 파티's own news, kept on the 파티's card as before, is listed with its room's address, those kept before the change
// included (P06 ticket 37).

const QUEST_ID = '6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const AT = new Date('2026-11-14T02:58:00Z');

let app: INestApplication<Server>;
let notifications: NotificationsService;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  // Imported after startApp, so that it is the one AppModule registers.
  const { NotificationsService: registered } = await import('../src/notifications/notifications.service.js');
  notifications = app.get(registered);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const listed = z.array(z.looseObject({ kind: z.string(), line: z.string(), url: z.string() }));

async function listOf(accessToken: string): Promise<z.infer<typeof listed>> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/notifications'), accessToken);
  return listed.parse(response.body);
}

const stepChanged = (byName: string) =>
  ({
    kind: 'step-changed',
    questId: QUEST_ID,
    questTitle: '저녁 같이',
    byId: FRIEND_ID,
    byName,
    stepTitle: '저녁',
    startsAt: null,
    cancelled: false,
  }) as const;

describe('A 파티’s own news in GET /notifications', () => {
  it('opens the 파티’s room, while it is kept on the 파티’s card', async () => {
    const user = await signInUser(app);

    await notifications.schedule(user.id, stepChanged('민수'), AT);

    expect(await listOf(user.accessToken)).toEqual([
      expect.objectContaining({ kind: 'step-changed', url: `/main?card=room:${QUEST_ID}` }),
    ]);
    expect(await prisma.notification.findMany({ where: { userId: user.id }, select: { cardKind: true } })).toEqual([
      { cardKind: 'party' },
    ]);
  });

  it('replaces one of the same 파티 and member on a second, as before', async () => {
    const user = await signInUser(app);

    await notifications.schedule(user.id, stepChanged('민수'), AT);
    await notifications.schedule(
      user.id,
      { ...stepChanged('민수'), stepTitle: '2차' },
      new Date(AT.getTime() + 60_000),
    );

    const rows = await listOf(user.accessToken);
    expect(rows).toEqual([expect.objectContaining({ url: `/main?card=room:${QUEST_ID}` })]);
    expect(rows[0]?.line).toContain('2차');
  });

  it('opens the room for one kept before the change too, which the table holds on the 파티’s card', async () => {
    const user = await signInUser(app);
    await prisma.notification.create({
      data: {
        userId: user.id,
        kind: 'became-leader',
        cardKind: 'party',
        cardId: QUEST_ID,
        at: AT,
        title: '파티장이 됐어요',
        line: '저녁 같이 · 홍길동님이 나갔어요',
        rings: true,
      },
    });

    expect(await listOf(user.accessToken)).toEqual([
      expect.objectContaining({ kind: 'became-leader', url: `/main?card=room:${QUEST_ID}` }),
    ]);
  });
});
