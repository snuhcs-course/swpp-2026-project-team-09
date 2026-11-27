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
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { endParty, leaveParty, partyOf, sharedQuest } from './parties.js';
import { connectToDatabase } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// Activating a 파티 rings its other Holders, with one Notification a 파티 (P06 ticket 21).

// 11:58 in Korea.
const NOW = new Date('2026-11-14T02:58:00Z');

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

beforeEach(() => {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function activationNotices(user: TestUser): Promise<unknown[]> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
  return z
    .array(z.looseObject({ kind: z.string() }))
    .parse(response.body)
    .filter(({ kind }) => kind === 'party-activated');
}

// The Leader 홍길동's Quest `저녁 같이 먹어요`, which 김철수 and 이영희 hold too.
async function holders(): Promise<{ leader: TestUser; first: TestUser; second: TestUser; questId: string }> {
  const [leader, first, second] = await Promise.all([
    signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
    signInUser(app, { name: '김철수', department: '경영학과' }),
    signInUser(app, { name: '이영희', department: '경제학부' }),
  ]);
  return { leader, first, second, questId: await sharedQuest(app, leader, [first, second]) };
}

describe('Activating a 파티', () => {
  it('keeps a ringing Notification for each other Holder, which opens the 파티', async () => {
    const { leader, first, second, questId } = await holders();

    await partyOf(app, leader, { questId });

    for (const holder of [first, second]) {
      // oxlint-disable-next-line no-await-in-loop -- one Holder at a time
      await vi.waitFor(async () => {
        expect(await activationNotices(holder)).toEqual([
          {
            id: `party-activated:party:${questId}`,
            kind: 'party-activated',
            title: '홍길동님이 저녁 같이 먹어요를 활성화했어요',
            ahead: null,
            line: '나도 참여하면 서로 위치를 볼 수 있어요',
            at: '2026-11-14T11:58:00+09:00',
            url: `/main?card=party:${questId}`,
          },
        ]);
      });
    }
    expect(
      await prisma.notification.findFirst({
        where: { userId: first.id, kind: 'party-activated' },
        select: { rings: true },
      }),
    ).toEqual({ rings: true });
    expect(await activationNotices(leader)).toEqual([]);
  });

  it('again after it closed keeps one Notification a 파티', async () => {
    const { leader, first, questId } = await holders();
    await partyOf(app, leader, { questId });
    await vi.waitFor(async () => {
      expect(await activationNotices(first)).toHaveLength(1);
    });
    expect((await endParty(app, leader)).status).toBe(204);

    await partyOf(app, leader, { questId });

    await vi.waitFor(async () => {
      expect(await activationNotices(first)).toHaveLength(1);
    });
  });
});

describe('Activating a Party without a Quest', () => {
  it('tells nobody', async () => {
    const leader = await signInUser(app);

    await partyOf(app, leader);

    expect(await prisma.notification.count({ where: { kind: 'party-activated', userId: leader.id } })).toBe(0);
  });
});

describe('Closing an activation', () => {
  it('by its end forgets its Notification', async () => {
    const { leader, first, questId } = await holders();
    await partyOf(app, leader, { questId });
    await vi.waitFor(async () => {
      expect(await activationNotices(first)).toHaveLength(1);
    });

    expect((await endParty(app, leader)).status).toBe(204);

    expect(await activationNotices(first)).toEqual([]);
  });

  it('by its last member leaving forgets its Notification', async () => {
    const { leader, first, questId } = await holders();
    await partyOf(app, leader, { questId });
    await vi.waitFor(async () => {
      expect(await activationNotices(first)).toHaveLength(1);
    });

    expect((await leaveParty(app, leader)).status).toBe(204);

    expect(await activationNotices(first)).toEqual([]);
  });
});
