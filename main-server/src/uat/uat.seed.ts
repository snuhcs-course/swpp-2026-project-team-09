/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { Redis } from 'ioredis';
import { koreaDate } from '../assistant/korea-time.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { accountOf, type Letter, type Tester, UAT_ACCOUNT_LIST } from './uat-accounts.js';
import {
  clearKept,
  emptyTester,
  emptyWhatUsersMade,
  ensureLunch,
  places,
  readUsers,
  removeOtherUsers,
  signal,
  tellApps,
  type Users,
  writeClasses,
  writeEvents,
  writeFriendships,
  writeQuests,
  writeUser,
  writeUsers,
} from './uat-rows.js';
import { ASKED_QUEST, classesOf, daysFrom, friendsOf, ownQuest, prepared, UAT_EVENT } from './uat-scenarios.js';

// The data of the User Acceptance Test (cycle 2) on swpp-a (README.md: UAT data). `setup` leaves the database as the
// sheet's first step needs it, whatever it held; `reset` sets one tester back and leaves the others as they are;
// `s2-cancel` cancels "[UAT] Event"; `status` reads where everyone stands. Each answers what the host reads, in Korean.

export async function setUpUat(prisma: PrismaClient, redis: Redis | null, now: Date): Promise<string[]> {
  const days = daysFrom(now);
  const data = prepared(days);
  const place = await places(prisma);
  await emptyWhatUsersMade(prisma);
  const users = await writeUsers(prisma, data.masterSwitchOn, now);
  const warning = await removeOtherUsers(prisma, users);
  await writeEvents(prisma, place, days, data.events);
  await writeFriendships(prisma, users, now, data.friends);
  await writeQuests(prisma, place, users, now, data.quests);
  await writeClasses(prisma, place, users, data.classes);
  const lunch = await ensureLunch(prisma, data.lunchDay, now);
  if (redis !== null) {
    const ids = Object.values(users);
    await clearKept(redis, ids, ids, now);
  }
  return [...data.notes, lunch, ...(warning === null ? [] : [warning])];
}

// One tester as before the first step: Friends with C and E only, 위치 공유 off and never turned off, the two classes,
// the request to "[UAT] 공강 신청함", the party of two of their own, and nothing else. What the tester made, and what
// the helpers did in it, goes; what the other testers and the helpers hold stays.
export async function resetTester(
  prisma: PrismaClient,
  redis: Redis | null,
  tester: Tester,
  now: Date,
): Promise<string[]> {
  const days = daysFrom(now);
  const place = await places(prisma);
  const held = await readUsers(prisma);
  const missing = (['C', 'E'] satisfies Letter[]).filter((letter) => held[letter] === undefined);
  if (missing.length > 0) {
    throw new Error(`${missing.join(', ')} 계정이 없어요. 먼저 setup을 돌리세요.`);
  }
  if (held[tester] !== undefined) {
    await emptyTester(prisma, held[tester]);
  }
  const id = await writeUser(prisma, accountOf(tester), false, now);
  const users = { ...held, [tester]: id } as Users;
  await writeFriendships(prisma, users, now, friendsOf(tester));
  await writeClasses(prisma, place, users, classesOf(tester, days));
  await writeQuests(prisma, place, users, now, [ownQuest(tester, days)]);
  const asked = await prisma.quest.findUnique({ where: { id: ASKED_QUEST }, select: { id: true } });
  if (asked !== null) {
    await prisma.questJoinRequest.create({ data: { questId: ASKED_QUEST, userId: id } });
  }
  if (redis !== null) {
    await clearKept(redis, [id], Object.values(users), now);
  }
  const { name } = accountOf(tester);
  return [
    `${tester} ${name}: 친구는 C, E뿐 · 위치 공유 꺼짐(끈 적 없음) · 수업 2개 · [UAT] 2인 파티 · ${name} · 오늘 AI 메시지 0개.`,
    `${tester}가 만든 파티와 B·D가 거기서 한 일은 지웠어요. 다른 테스터와 B, D의 나머지는 그대로예요.`,
    ...(asked === null ? ['주의: [UAT] 공강 신청함이 없어서 참여 신청은 넣지 못했어요. setup을 먼저 돌리세요.'] : []),
    `${tester}의 폰에서 앱을 껐다 켜세요.`,
  ];
}

// Cancels "[UAT] Event" as an Administrator would on the admin site, which cannot sign in over plain HTTP, and tells
// the apps.
export async function cancelUatEvent(prisma: PrismaClient, redis: Redis | null): Promise<string[]> {
  const { count } = await prisma.globalEvent.updateMany({
    where: { id: UAT_EVENT, state: 'published' },
    data: { state: 'cancelled', version: { increment: 1 } },
  });
  if (redis !== null) {
    await signal(redis, { name: 'global-events-changed' });
    await tellApps(redis, Object.values(await readUsers(prisma)));
  }
  return [count === 1 ? '[UAT] Event를 취소했어요.' : '취소할 [UAT] Event가 없어요 (이미 취소됐거나 setup을 돌리지 않았어요).'];
}

async function accountLine(prisma: PrismaClient, redis: Redis | null, letter: Letter, id: string, now: Date): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { name: true, masterSwitchOn: true, masterOffAskedAt: true, _count: { select: { sessions: { where: { endedAt: null } } } } },
  });
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: id }, { userBId: id }] },
    select: { userAId: true, userBId: true, acceptedAt: true, userA: { select: { name: true } }, userB: { select: { name: true } } },
  });
  const friends = friendships
    .map(({ userAId, userA, userB, acceptedAt }) => `${userAId === id ? userB.name : userA.name}${acceptedAt === null ? '(요청 중)' : ''}`)
    .toSorted();
  const quests = await prisma.questHolder.findMany({
    where: { userId: id },
    select: { quest: { select: { title: true, leaderId: true } } },
  });
  const asked = await prisma.questJoinRequest.findMany({ where: { userId: id }, select: { quest: { select: { title: true } } } });
  const invited = await prisma.questInvitation.findMany({ where: { userId: id }, select: { quest: { select: { title: true } } } });
  const messages = redis === null ? '?' : ((await redis.get(`assistant:messages:${id}:${koreaDate(now)}`)) ?? '0');
  return [
    `${letter} ${user.name}: 로그인 ${String(user._count.sessions)}대 · 위치 공유 ${user.masterSwitchOn ? '켬' : '끔'}${user.masterOffAskedAt === null ? '' : '(끈 적 있음)'} · AI ${messages}개`,
    `   친구: ${friends.join(', ') || '없음'}`,
    `   파티: ${quests.map(({ quest }) => `${quest.title}${quest.leaderId === id ? '(파티장)' : ''}`).join(', ') || '없음'}`,
    ...(asked.length === 0 ? [] : [`   신청 중: ${asked.map(({ quest }) => quest.title).join(', ')}`]),
    ...(invited.length === 0 ? [] : [`   받은 초대: ${invited.map(({ quest }) => quest.title).join(', ')}`]),
  ].join('\n');
}

// Where every account stands, and the UAT's events.
export async function uatStatus(prisma: PrismaClient, redis: Redis | null, now: Date): Promise<string[]> {
  const users = await readUsers(prisma);
  const lines: string[] = [];
  for (const { letter } of UAT_ACCOUNT_LIST) {
    const id = users[letter];
    lines.push(id === undefined ? `${letter}: 계정 없음 (setup 전)` : await accountLine(prisma, redis, letter, id, now));
  }
  const events = await prisma.globalEvent.findMany({
    where: { title: { startsWith: '[UAT]' } },
    orderBy: { startsAt: 'asc' },
    select: { title: true, state: true, startsAt: true, endsAt: true },
  });
  const local = (at: Date | null): string => (at === null ? '?' : new Date(at.getTime() + 9 * 3600 * 1000).toISOString().slice(5, 16).replace('T', ' '));
  lines.push(
    `행사: ${events.length === 0 ? '없음' : ''}`,
    ...events.map(({ title, state, startsAt, endsAt }) => `   ${title} · ${state} · ${local(startsAt)}–${local(endsAt)}${endsAt !== null && endsAt <= now ? ' (끝남)' : ''}`),
  );
  return lines;
}
