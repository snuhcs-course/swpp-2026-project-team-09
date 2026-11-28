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
import { befriend, signInUser, TestUser } from './friends.js';
import { answerJoinRequest, endQuest, invitationOf, joinRequestOf, removeHolder } from './quest-recruiting.js';
import { connectToDatabase, ownQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// 11:58 in Korea.
const NOW = new Date('2026-11-14T02:58:00Z');
const AT = '2026-11-14T11:58:00+09:00';

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

const GONE_KINDS = new Set(['party-ended', 'party-removed', 'join-cancelled', 'invitation-cancelled']);

// The User's Notifications of the kinds a 파티 gone keeps.
async function goneNotices(user: TestUser): Promise<unknown[]> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
  const notices = z.array(z.looseObject({ kind: z.string() })).parse(response.body);
  return notices.filter(({ kind }) => GONE_KINDS.has(kind));
}

function ringsOf(user: TestUser, kind: string): Promise<{ rings: boolean } | null> {
  return prisma.notification.findFirst({ where: { userId: user.id, kind }, select: { rings: true } });
}

// The Leader 홍길동's Approval Quest `점심 같이`, with a member, one whose request waits, and one invited.
async function party(): Promise<{
  leader: TestUser;
  member: TestUser;
  asker: TestUser;
  invitee: TestUser;
  questId: string;
}> {
  const [leader, member, asker, invitee] = await Promise.all([
    signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
    signInUser(app, { name: '김철수', department: '경영학과' }),
    signInUser(app, { name: '이영희', department: '경제학부' }),
    signInUser(app, { name: '박민수', department: '물리천문학부' }),
  ]);
  const questId = await ownQuest(app, leader, { title: '점심 같이', joinPolicy: 'approval' });
  const requestId = await joinRequestOf(app, member, questId);
  expect((await answerJoinRequest(app, leader, { questId, requestId }, 'accept')).status).toBe(204);
  await joinRequestOf(app, asker, questId);
  await befriend(app, leader, invitee);
  await invitationOf(app, leader, questId, invitee);
  return { leader, member, asker, invitee, questId };
}

describe('The Leader ending a 파티', () => {
  it('keeps a ringing Notification for each other member, which says the 파티 is gone', async () => {
    const { leader, member, questId } = await party();

    expect((await endQuest(app, leader, questId)).status).toBe(204);

    await vi.waitFor(async () => {
      expect(await goneNotices(member)).toEqual([
        {
          id: `party-ended:party-gone:${questId}`,
          kind: 'party-ended',
          title: '파티가 없어졌어요',
          ahead: null,
          line: '점심 같이 · 홍길동님이 없앴어요',
          at: AT,
          url: `/main?card=party-gone:${questId}`,
        },
      ]);
    });
    expect(await ringsOf(member, 'party-ended')).toEqual({ rings: true });
    expect(await goneNotices(leader)).toEqual([]);
  });

  it('tells the one whose request waited and the one invited in 알림 only, without a push', async () => {
    const { leader, asker, invitee, questId } = await party();

    expect((await endQuest(app, leader, questId)).status).toBe(204);

    await vi.waitFor(async () => {
      expect(await goneNotices(asker)).toEqual([
        expect.objectContaining({
          kind: 'join-cancelled',
          title: '파티가 없어져 신청이 취소됐어요',
          line: '점심 같이 · 홍길동님의 파티',
          url: `/main?card=party-gone:${questId}`,
        }),
      ]);
      expect(await goneNotices(invitee)).toEqual([
        expect.objectContaining({
          kind: 'invitation-cancelled',
          title: '파티가 없어져 초대가 취소됐어요',
          line: '점심 같이 · 홍길동님의 파티',
          url: `/main?card=party-gone:${questId}`,
        }),
      ]);
    });
    expect(await ringsOf(asker, 'join-cancelled')).toEqual({ rings: false });
    expect(await ringsOf(invitee, 'invitation-cancelled')).toEqual({ rings: false });
  });
});

describe('The Leader removing a member', () => {
  it('keeps a ringing Notification for the one removed, and none for the others', async () => {
    const { leader, member, asker, questId } = await party();

    expect((await removeHolder(app, leader, questId, member.id)).status).toBe(204);

    await vi.waitFor(async () => {
      expect(await goneNotices(member)).toEqual([
        {
          id: `party-removed:party-gone:${questId}`,
          kind: 'party-removed',
          title: '파티에서 내보내졌어요',
          ahead: null,
          line: '점심 같이 · 홍길동님의 파티',
          at: AT,
          url: `/main?card=party-gone:${questId}`,
        },
      ]);
    });
    expect(await ringsOf(member, 'party-removed')).toEqual({ rings: true });
    expect(await goneNotices(asker)).toEqual([]);
  });
});
