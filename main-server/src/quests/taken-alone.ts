/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Logger } from '@nestjs/common';
import { type Prisma } from '../generated/prisma/client.js';
import { type NotificationsService } from '../notifications/notifications.service.js';

// What ends a Quest taken alone as one (P03 tickets 15 and 17).

// A new Quest's capacity when none is given, as the schema's default.
export const PARTY_CAPACITY = 4;

// The Quest, if the User took it alone, from now on gathers others: it is no longer taken alone and takes the usual
// capacity. True when it was taken alone.
export async function gatheringFrom(questId: string, tx: Prisma.TransactionClient): Promise<boolean> {
  const { count } = await tx.quest.updateMany({
    where: { id: questId, takenAlone: true },
    data: { takenAlone: false, capacity: PARTY_CAPACITY },
  });
  return count > 0;
}

// The leave-by of a Quest the User took alone goes with it, and never fails the change.
export async function forgetLeaveBy(
  notifications: NotificationsService,
  logger: Logger,
  { userId, questId }: { userId: string; questId: string },
): Promise<void> {
  await notifications.cancel(userId, 'leave-by', { kind: 'party', id: questId }).catch((error: unknown) => {
    logger.warn(`The time to leave of a Quest taken alone was not cancelled: ${String(error)}`);
  });
}
