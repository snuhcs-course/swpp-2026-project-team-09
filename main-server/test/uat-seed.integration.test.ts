/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { NOW, inKorea, UatStage } from './uat-stage.js';

// What every preparation of a UAT scenario does to whatever the database holds: an earlier scenario's rows, the
// Heuristic Evaluation's Users and a Collection's events.

const stage = new UatStage();

// What the Heuristic Evaluation left: another User, signed in, a Friend of A's who leads a recruiting Quest. And A has
// used up the day's Assistant messages.
async function leaveOldData(): Promise<void> {
  const { prisma, redis } = stage;
  const other = await prisma.user.create({
    data: { googleSubject: 'he-s3', email: 'he-s3@he.invalid', name: '오세린', friendId: 'HESC2345', onboardedAt: NOW },
  });
  const a = await prisma.user.findUniqueOrThrow({ where: { googleSubject: 'uat-a' } });
  const [userAId = '', userBId = ''] = [a.id, other.id].toSorted();
  await prisma.friendship.create({ data: { userAId, userBId, senderId: other.id, acceptedAt: NOW } });
  await prisma.quest.create({
    data: {
      title: '남은 파티',
      leaderId: other.id,
      joinPolicy: 'open',
      board: 'hobby',
      holders: { create: [{ userId: other.id }] },
      subQuests: { create: { title: '남은 파티', startsAt: new Date(inKorea('2026-11-17T19:00')) } },
    },
  });
  await redis.set(`assistant:messages:${a.id}:2026-11-16`, '50');
}

function rowCounts(): Promise<number[]> {
  const { prisma } = stage;
  return Promise.all([
    prisma.user.count(),
    prisma.friendship.count(),
    prisma.quest.count(),
    prisma.globalEvent.count(),
  ]);
}

beforeAll(async () => {
  await stage.start();
  await leaveOldData();
  await stage.prepare('risk5');
});

afterAll(() => stage.stop());

describe('Any preparation', () => {
  it('keeps the phones signed in, past Onboarding, under the names of the UAT accounts', async () => {
    const me = z.object({ name: z.string() });

    expect(me.parse(await stage.bodyOf('/users/me/profile', 'A')).name).toBe('김서연');
    expect(me.parse(await stage.bodyOf('/users/me/profile', 'B')).name).toBe('이도현');
    expect(me.parse(await stage.bodyOf('/users/me/profile', 'C')).name).toBe('박지호');
  });

  it('removes every other User and what they made', async () => {
    expect(await stage.prisma.user.count()).toBe(3);
    expect(await stage.recruiting()).toStrictEqual([]);
  });

  it('cancels the collected events of today and tomorrow, and leaves the later ones', async () => {
    expect(await stage.eventTitles()).toStrictEqual(['수집 사흘 뒤']);
  });

  it("starts A's count of Assistant messages again", async () => {
    const a = await stage.prisma.user.findUniqueOrThrow({ where: { googleSubject: 'uat-a' } });

    expect(await stage.redis.get(`assistant:messages:${a.id}:2026-11-16`)).toBeNull();
  });

  it('gives the same rows when it runs again', async () => {
    const before = await rowCounts();

    await stage.prepare('risk5');

    expect(await rowCounts()).toStrictEqual(before);
  });
});

describe('Risk 5', () => {
  it('makes A and B Friends, leaves C out and posts nothing', async () => {
    expect(await stage.friendsOf('A')).toStrictEqual(['이도현']);
    expect(await stage.friendsOf('C')).toStrictEqual([]);
    expect(await stage.recruiting()).toStrictEqual([]);
  });
});

describe('Risk 2, after Risk 5', () => {
  beforeAll(() => stage.prepare('risk2'));

  it('leaves nobody Friends, nothing posted, and 친구와 위치 공유 off', async () => {
    expect(await stage.friendsOf('A')).toStrictEqual([]);
    expect(await stage.friendsOf('B')).toStrictEqual([]);
    expect(await stage.recruiting()).toStrictEqual([]);
    expect(await stage.prisma.user.count({ where: { masterSwitchOn: true } })).toBe(0);
  });
});
