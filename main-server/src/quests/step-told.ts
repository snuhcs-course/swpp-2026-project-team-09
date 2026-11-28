/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable, type Logger } from '@nestjs/common';
import { type NotificationsService } from '../notifications/notifications.service.js';

// What a change of a Quest's steps tells its Holders, whether the room's 일정 수정 made it or the Assistant's change in
// place (P05 tickets 17 and 21), so that a change means the same whether typed or tapped: every other Holder is told
// of the 파티, who changed it and which step it became (`step-changed`), and every Holder's time to leave, worked out
// for the steps as they were, is forgotten and kept again for the steps as they are (P06 ticket 25).

export interface StepChanged {
  questId: string;
  questTitle: string;
  byId: string;
  byName: string;
  stepTitle: string;
  startsAt: Date | null;
  cancelled: boolean;
}

// Keeps a Holder's time to leave for a Quest's steps as they are now, from their Timetable, by the rule an accepted
// invitation's uses. A Holder whose way cannot be worked out gets none. It never fails.
export type KeepTimeToLeave = (userId: string, questId: string) => Promise<void>;

// The listeners that keep a time to leave once steps change, as InvitationsService.onAccepted's hear an acceptance:
// plans/invitee-time-to-leave.service.ts gives the Timetable rule, since this module cannot import that one.
@Injectable()
export class TimesToLeave {
  private readonly keepers: KeepTimeToLeave[] = [];

  onStepsChanged(keeper: KeepTimeToLeave): void {
    this.keepers.push(keeper);
  }

  async keepAgain(userIds: readonly string[], questId: string): Promise<void> {
    await Promise.all(this.keepers.flatMap((keep) => userIds.map((userId) => keep(userId, questId))));
  }
}

// Awaited for the times to leave, as leaving the Quest awaits it; neither ever fails the change. `byTimetable` are the
// Holders whose time to leave is kept again by the Timetable rule: every Holder, unless the caller keeps one its own way.
export async function tellStepChanged(
  {
    notifications,
    logger,
    timesToLeave,
  }: { notifications: NotificationsService; logger: Logger; timesToLeave: TimesToLeave },
  holderIds: readonly string[],
  changed: StepChanged,
  { now, byTimetable = holderIds }: { now: Date; byTimetable?: readonly string[] },
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
  await timesToLeave.keepAgain(byTimetable, changed.questId);
}
