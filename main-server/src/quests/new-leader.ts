/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Logger } from '@nestjs/common';
import { type Prisma } from '../generated/prisma/client.js';
import { type NewLeader } from '../notifications/notification.js';
import { type NotificationsService } from '../notifications/notifications.service.js';

// What the member who becomes a Quest's Leader is told (P06 ticket 32): `became-leader`, in 알림 only, whether the
// Leader left and the Holder who entered earliest leads now, or the Leader handed the role over.

// Read in the change's transaction, as it stands before the Leader goes: the Quest's title and the Leader's name.
export async function newLeaderTold(
  questId: string,
  formerId: string,
  how: NewLeader['how'],
  tx: Prisma.TransactionClient,
): Promise<NewLeader> {
  const [{ title }, { name }] = await Promise.all([
    tx.quest.findUniqueOrThrow({ where: { id: questId }, select: { title: true } }),
    tx.user.findUniqueOrThrow({ where: { id: formerId }, select: { name: true } }),
  ]);
  return { kind: 'became-leader', questId, questTitle: title, formerName: name, how };
}

// Not awaited: the Notification never fails the change.
export function tellNewLeader(
  { notifications, logger }: { notifications: NotificationsService; logger: Logger },
  newLeaderId: string,
  told: NewLeader,
  now: Date,
): void {
  notifications.schedule(newLeaderId, told, now).catch((error: unknown) => {
    logger.warn(`The new Leader was not told: ${String(error)}`);
  });
}
