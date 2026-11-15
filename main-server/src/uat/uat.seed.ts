/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { Redis } from 'ioredis';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  clearKept,
  emptyWhatUsersMade,
  places,
  removeMenus,
  removeOtherUsers,
  signal,
  writeClasses,
  writeEvents,
  writeFriendships,
  writeQuests,
  writeUsers,
} from './uat-rows.js';
import { daysFrom, PREPARATIONS, UAT_EVENT, type UatScenario } from './uat-scenarios.js';

// The data of the User Acceptance Test on swpp-a. Each scenario of the UAT sheet has one preparation, run right before
// it: whatever the database holds, it leaves the three UAT accounts, signed in as they are, with exactly what the
// sheet's Setup asks for, and nothing of an earlier scenario. Answers what the host reads before the scenario.
export async function prepareUatScenario(
  prisma: PrismaClient,
  redis: Redis | null,
  scenario: UatScenario,
  now: Date,
): Promise<string[]> {
  const days = daysFrom(now);
  const prepared = PREPARATIONS[scenario](days);
  const place = await places(prisma);
  await emptyWhatUsersMade(prisma);
  const users = await writeUsers(prisma, prepared.masterSwitchOn, now);
  const warning = await removeOtherUsers(prisma, users);
  await writeEvents(prisma, place, days, prepared.events);
  await writeFriendships(prisma, users, now, prepared.friends);
  await writeQuests(prisma, place, users, now, prepared.quests);
  await writeClasses(prisma, place, users, prepared.classes);
  if (prepared.noMenuDay !== null) {
    await removeMenus(prisma, prepared.noMenuDay);
  }
  if (redis !== null) {
    await clearKept(redis, users, now);
  }
  return [...prepared.notes, ...(warning === null ? [] : [warning])];
}

// Cancels Risk 4's "[UAT] Event" as an Administrator would on the admin site, and tells the apps.
export async function cancelUatEvent(prisma: PrismaClient, redis: Redis | null): Promise<string[]> {
  const { count } = await prisma.globalEvent.updateMany({
    where: { id: UAT_EVENT, state: 'published' },
    data: { state: 'cancelled', version: { increment: 1 } },
  });
  if (redis !== null) {
    await signal(redis, { name: 'global-events-changed' });
  }
  return [
    count === 1
      ? '[UAT] Event를 취소했어요.'
      : '취소할 [UAT] Event가 없어요 (이미 취소됐거나 risk4를 준비하지 않았어요).',
  ];
}
