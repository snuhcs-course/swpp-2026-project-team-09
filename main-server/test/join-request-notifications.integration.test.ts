/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { answerJoinRequest, joinRequestOf, withdrawJoinRequest } from './quest-recruiting.js';
import { connectToDatabase, ownQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

// 11:58 in Korea.
const NOW = new Date('2026-11-14T02:58:00Z');
const AT = '2026-11-14T11:58:00+09:00';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

beforeEach(() => {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getNotifications(user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
}

// The rows the sender reads: whether each rings, and whether it was sent.
function keptRows(user: TestUser): Promise<{ kind: string; title: string; rings: boolean; sentAt: Date | null }[]> {
  return prisma.notification.findMany({
    where: { userId: user.id },
    select: { kind: true, title: true, rings: true, sentAt: true },
  });
}

async function expectNoticeTo(user: TestUser): Promise<void> {
  await vi.waitFor(() => {
    expect(watcher.for(user).map(({ name }) => name)).toContain('notice');
  });
}

// The Leader 홍길동's Approval Quest `점심 같이`, and 김철수, who asks to join it.
async function asked(): Promise<{ leader: TestUser; user: TestUser; questId: string; requestId: string }> {
  const [leader, user] = await Promise.all([
    signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
    signInUser(app, { name: '김철수', department: '경영학과' }),
  ]);
  const questId = await ownQuest(app, leader, { title: '점심 같이', joinPolicy: 'approval' });
  return { leader, user, questId, requestId: await joinRequestOf(app, user, questId) };
}

describe('The Leader accepting a request to join', () => {
  it('keeps one Notification for the one who asked, which rings and opens the party', async () => {
    const { leader, user, questId, requestId } = await asked();

    expect((await answerJoinRequest(app, leader, { questId, requestId }, 'accept')).status).toBe(204);

    await vi.waitFor(async () => {
      expect((await getNotifications(user)).body).toEqual([
        {
          id: `join-accepted:party:${questId}`,
          kind: 'join-accepted',
          title: '참여 신청이 수락됐어요',
          ahead: null,
          line: '점심 같이 · 홍길동님의 파티',
          at: AT,
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    expect(await keptRows(user)).toEqual([expect.objectContaining({ rings: true, sentAt: null })]);
    await expectNoticeTo(user);
  });
});

describe('The Leader declining a request to join', () => {
  it('keeps one Notification for the one who asked, which rings and opens 찾기', async () => {
    const { leader, user, questId, requestId } = await asked();

    expect((await answerJoinRequest(app, leader, { questId, requestId }, 'decline')).status).toBe(204);

    await vi.waitFor(async () => {
      expect((await getNotifications(user)).body).toEqual([
        {
          id: `join-declined:find-parties:${questId}`,
          kind: 'join-declined',
          title: '참여 신청이 거절됐어요',
          ahead: null,
          line: '점심 같이 · 홍길동님의 파티',
          at: AT,
          url: `/main?card=find-parties:${questId}`,
        },
      ]);
    });
    expect(await keptRows(user)).toEqual([expect.objectContaining({ rings: true, sentAt: null })]);
  });
});

describe('Asking to join', () => {
  it('keeps one Notification for the Leader, which rings and opens the party', async () => {
    const { leader, questId } = await asked();

    await vi.waitFor(async () => {
      expect((await getNotifications(leader)).body).toEqual([
        {
          id: `join-asked:party:${questId}`,
          kind: 'join-asked',
          title: '새 참여 신청 1명',
          ahead: null,
          line: '점심 같이 · 김철수님',
          at: AT,
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    expect(await keptRows(leader)).toEqual([expect.objectContaining({ rings: true, sentAt: null })]);
    await expectNoticeTo(leader);
  });
});

describe('Asking to join while others wait', () => {
  it('rewrites the one Notification and does not ring it again', async () => {
    const { leader, questId } = await asked();
    await vi.waitFor(async () => {
      expect(await keptRows(leader)).toHaveLength(1);
    });
    // As the sender marks it once it has pushed it.
    await prisma.notification.updateMany({ where: { userId: leader.id }, data: { sentAt: NOW } });
    const second = await signInUser(app, { name: '이영희', department: '경제학부' });

    await joinRequestOf(app, second, questId);

    await vi.waitFor(async () => {
      expect((await getNotifications(leader)).body).toEqual([
        expect.objectContaining({
          id: `join-asked:party:${questId}`,
          title: '새 참여 신청 2명',
          line: '점심 같이 · 이영희님 외 1명',
        }),
      ]);
    });
    expect(await keptRows(leader)).toEqual([expect.objectContaining({ sentAt: NOW })]);
  });
});

describe('Asking to join once no request waits', () => {
  it('is told again by a new ring once the Leader has answered every request', async () => {
    const { leader, questId, requestId } = await asked();
    await vi.waitFor(async () => {
      expect(await keptRows(leader)).toHaveLength(1);
    });
    await prisma.notification.updateMany({ where: { userId: leader.id }, data: { sentAt: NOW } });

    expect((await answerJoinRequest(app, leader, { questId, requestId }, 'decline')).status).toBe(204);
    await vi.waitFor(async () => {
      expect(await keptRows(leader)).toEqual([]);
    });
    const second = await signInUser(app, { name: '이영희', department: '경제학부' });
    await joinRequestOf(app, second, questId);

    await vi.waitFor(async () => {
      expect(await keptRows(leader)).toEqual([expect.objectContaining({ title: '새 참여 신청 1명', sentAt: null })]);
    });
  });
});

describe('A request to join withdrawn', () => {
  it('leaves the Leader the requests that still wait', async () => {
    const { leader, user, questId, requestId } = await asked();
    const second = await signInUser(app, { name: '이영희', department: '경제학부' });
    const secondId = await joinRequestOf(app, second, questId);

    expect((await withdrawJoinRequest(app, second, secondId)).status).toBe(204);
    await vi.waitFor(async () => {
      expect(await keptRows(leader)).toEqual([expect.objectContaining({ title: '새 참여 신청 1명' })]);
    });
    expect((await withdrawJoinRequest(app, user, requestId)).status).toBe(204);

    await vi.waitFor(async () => {
      expect(await keptRows(leader)).toEqual([]);
    });
  });
});

describe('Asking to join when the Leader cannot be told', () => {
  it('is answered as before', async () => {
    const { NotificationsService } = await import('../src/notifications/notifications.service.js');
    vi.spyOn(app.get(NotificationsService), 'schedule').mockRejectedValue(new Error('the database refused the write'));
    const warn = vi.spyOn(Logger.prototype, 'warn');

    const { leader } = await asked();

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        'The Leader was not told of the requests to join: Error: the database refused the write',
      );
    });
    expect((await getNotifications(leader)).body).toEqual([]);
  });
});
