/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { sharedQuest } from './parties.js';
import { handOver } from './quest-recruiting.js';
import { connectToDatabase, dropQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// The member who becomes a 파티's Leader is told in 알림, without a push (P06 ticket 32).

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

async function leaderNotices(user: TestUser): Promise<unknown[]> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
  return z
    .array(z.looseObject({ kind: z.string() }))
    .parse(response.body)
    .filter(({ kind }) => kind === 'became-leader');
}

// The Leader 홍길동's Quest `저녁 같이 먹어요`, which 김철수 and then 이영희 joined.
async function party(): Promise<{ leader: TestUser; first: TestUser; second: TestUser; questId: string }> {
  const [leader, first, second] = await Promise.all([
    signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
    signInUser(app, { name: '김철수', department: '경영학과' }),
    signInUser(app, { name: '이영희', department: '경제학부' }),
  ]);
  return { leader, first, second, questId: await sharedQuest(app, leader, [first, second]) };
}

describe('The Leader leaving a 파티', () => {
  it('tells the Holder who joined first, who leads now, in 알림 only', async () => {
    const { leader, first, second, questId } = await party();

    expect((await dropQuest(app, leader, questId)).status).toBe(204);

    await vi.waitFor(async () => {
      expect(await leaderNotices(first)).toEqual([
        {
          id: `became-leader:party:${questId}`,
          kind: 'became-leader',
          title: '파티장이 됐어요',
          ahead: null,
          line: '저녁 같이 먹어요 · 홍길동님이 나갔어요',
          at: '2026-11-14T11:58:00+09:00',
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    expect(
      await prisma.notification.findFirst({
        where: { userId: first.id, kind: 'became-leader' },
        select: { rings: true },
      }),
    ).toEqual({ rings: false });
    expect(await leaderNotices(second)).toEqual([]);
  });
});

describe('A member leaving a 파티', () => {
  it('tells nobody that they lead', async () => {
    const { leader, first, questId } = await party();

    expect((await dropQuest(app, first, questId)).status).toBe(204);

    expect(await leaderNotices(leader)).toEqual([]);
  });
});

describe('The Leader handing the 파티 over', () => {
  it('tells the new Leader in 알림 only', async () => {
    const { leader, second, questId } = await party();

    expect((await handOver(app, leader, questId, second.id)).status).toBe(204);

    await vi.waitFor(async () => {
      expect(await leaderNotices(second)).toEqual([
        expect.objectContaining({ title: '파티장이 됐어요', line: '저녁 같이 먹어요 · 홍길동님이 넘겼어요' }),
      ]);
    });
    expect(
      await prisma.notification.findFirst({
        where: { userId: second.id, kind: 'became-leader' },
        select: { rings: true },
      }),
    ).toEqual({ rings: false });
  });

  it('to the Leader themselves tells nobody', async () => {
    const { leader, questId } = await party();

    expect((await handOver(app, leader, questId, leader.id)).status).toBe(204);

    expect(await leaderNotices(leader)).toEqual([]);
  });
});
