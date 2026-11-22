/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { Redis } from 'ioredis';
import { koreaDate } from '../assistant/korea-time.js';
import { PrismaClient } from '../generated/prisma/client.js';

// The rest of what a UAT command touches: the menus, what Redis keeps, the signals, and one tester's own rows.

// Lunch menus on the day, which a meal Plan needs. When no Collection has written the day yet, the newest day that has
// lunch is copied onto it, restaurant by restaurant. Answers what was done, in Korean.
export async function ensureLunch(prisma: PrismaClient, day: string, now: Date): Promise<string> {
  const date = new Date(`${day}T00:00:00Z`);
  const lunch = { lines: { some: { meal: 'lunch' as const } } };
  const held = await prisma.restaurantDay.count({ where: { date, ...lunch } });
  if (held > 0) {
    return `${day} 점심 메뉴: 식당 ${String(held)}곳 (수집된 그대로).`;
  }
  const newest = await prisma.restaurantDay.findFirst({
    where: lunch,
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  if (newest === null) {
    return `주의: 점심 메뉴가 하나도 없어요. UAT-5 7단계(점심 계획)가 나오지 않아요. 수집이 도는지 확인하세요.`;
  }
  const source = await prisma.restaurantDay.findMany({
    where: { date: newest.date, ...lunch },
    include: { lines: true },
  });
  await prisma.restaurantDay.deleteMany({ where: { date } });
  for (const { source: from, restaurant, lines } of source) {
    await prisma.restaurantDay.create({
      data: {
        source: from,
        date,
        restaurant,
        collectedAt: now,
        lines: {
          create: lines.map(({ meal, position, text, kind, name, price }) => ({
            meal,
            position,
            text,
            kind,
            name,
            price,
          })),
        },
      },
    });
  }
  return `${day} 점심 메뉴가 없어서 ${koreaDate(newest.date)}의 메뉴를 옮겼어요: 식당 ${String(source.length)}곳.`;
}

// As SignalsService sends a signal, over NestJS's Redis messaging.
export function signal(redis: Redis, data: { userIds?: string[]; name: string }): Promise<number> {
  return redis.publish('signal', JSON.stringify({ pattern: 'signal', data }));
}

// What the phones and the Assistant keep outside the database: each User's position and today's count of Assistant
// messages. Then every connected app is told to fetch its lists again.
export async function clearKept(redis: Redis, cleared: string[], told: string[], now: Date): Promise<void> {
  if (cleared.length > 0) {
    await redis.del(
      ...cleared.map((id) => `position:${id}`),
      ...cleared.map((id) => `assistant:messages:${id}:${koreaDate(now)}`),
    );
  }
  await tellApps(redis, told);
}

// `userIds` are whom the lists are told to; the events are told to everyone.
export async function tellApps(redis: Redis, userIds: string[]): Promise<void> {
  await Promise.all([
    signal(redis, { name: 'global-events-changed' }),
    ...['quests-changed', 'party-changed', 'friends-changed'].map((name) => signal(redis, { userIds, name })),
  ]);
}

// Everything one tester made or entered, and what others made with them, so that the tester can be set back alone.
// Quests the tester leads go with all they hold; in a Quest another leads, only the tester's own rows go.
export async function emptyTester(prisma: PrismaClient, id: string): Promise<void> {
  const led = { leaderId: id };
  await prisma.$transaction([
    prisma.party.deleteMany({ where: { OR: [led, { quest: led }] } }),
    prisma.partyMember.deleteMany({ where: { userId: id } }),
    prisma.partyJoinRequest.deleteMany({ where: { userId: id } }),
    prisma.partyInvitation.deleteMany({ where: { userId: id } }),
    prisma.roomRequest.deleteMany({ where: { requesterId: id } }),
    prisma.roomConsent.deleteMany({ where: { userId: id } }),
    prisma.roomNotice.deleteMany({ where: { userId: id } }),
    prisma.quest.deleteMany({ where: led }),
    prisma.questHolder.deleteMany({ where: { userId: id } }),
    prisma.questJoinRequest.deleteMany({ where: { userId: id } }),
    prisma.questInvitation.deleteMany({ where: { userId: id } }),
    prisma.questDecline.deleteMany({ where: { userId: id } }),
    prisma.questRemoval.deleteMany({ where: { userId: id } }),
    prisma.friendship.deleteMany({ where: { OR: [{ userAId: id }, { userBId: id }] } }),
    prisma.inviteLink.deleteMany({ where: { senderId: id } }),
    prisma.timetableClass.deleteMany({ where: { userId: id } }),
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.globalEventFavorite.deleteMany({ where: { userId: id } }),
    prisma.watchedInterest.deleteMany({ where: { userId: id } }),
    prisma.privateZone.deleteMany({ where: { userId: id } }),
  ]);
}
