/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Logger } from '@nestjs/common';
import { type NotificationsService } from '../notifications/notifications.service.js';

// What a change of a Quest's steps tells its Holders, whether the room's 일정 수정 made it or the Assistant's change in
// place (P05 tickets 17 and 21), so that a change means the same whether typed or tapped: every other Holder is told
// who changed which step (`step-changed`), and every Holder's time to leave, worked out for the steps as they were, is
// forgotten. One for a time that no longer holds is worse than none, and the push stands in for it.

export interface StepChanged {
  questId: string;
  byId: string;
  byName: string;
  stepTitle: string;
  startsAt: Date | null;
  cancelled: boolean;
}

// Awaited for the times to leave, as leaving the Quest awaits it; neither ever fails the change.
export async function tellStepChanged(
  { notifications, logger }: { notifications: NotificationsService; logger: Logger },
  holderIds: readonly string[],
  changed: StepChanged,
  now: Date,
): Promise<void> {
  const told = { kind: 'step-changed' as const, ...changed };
  for (const holderId of holderIds.filter((id) => id !== changed.byId)) {
    notifications.schedule(holderId, told, now).catch((error: unknown) => {
      logger.warn(`A Holder was not told of a changed step: ${String(error)}`);
    });
  }
  await Promise.all(
    holderIds.map((holderId) =>
      notifications.cancel(holderId, 'leave-by', { kind: 'party', id: changed.questId }).catch((error: unknown) => {
        logger.warn(`A Holder's time to leave was not cancelled: ${String(error)}`);
      }),
    ),
  );
}
