/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { type Told } from '../notifications/notification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { QUEST_INCLUDE } from '../quests/dto/quest.dto.js';
import { InvitationsService } from '../quests/invitations.service.js';
import { TimesToLeave } from '../quests/step-told.js';
import { placeLabel } from './own-way.js';
import { OwnWayReader } from './own-way-reader.service.js';

// A Holder's own time to leave by their Timetable: an invited User's for a Quest they accept, kept as the Leader's is
// when a Plan becomes a party, and every Holder's again once its steps change (P06 ticket 25). Registered with
// InvitationsService and TimesToLeave, which cannot import this module.
@Injectable()
export class InviteeTimeToLeave implements OnModuleInit {
  private readonly logger = new Logger(InviteeTimeToLeave.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
    private readonly reader: OwnWayReader,
    private readonly notifications: NotificationsService,
    private readonly timesToLeave: TimesToLeave,
  ) {}

  onModuleInit(): void {
    this.invitations.onAccepted((userId, questId) => {
      void this.keep(userId, questId);
    });
    this.timesToLeave.register((userId, questId) => this.keep(userId, questId));
  }

  // Never fails: the accept does not wait for it.
  async keep(userId: string, questId: string): Promise<void> {
    try {
      const kept = await this.timeToLeave(userId, questId);
      if (kept !== null) {
        await this.notifications.schedule(userId, kept.told, kept.at);
      }
    } catch (error) {
      this.logger.warn(`An invited User's time to leave was not kept: ${String(error)}`);
    }
  }

  // Their way as their invitation's card works it out, from their Timetable alone: the accept carries no position.
  private async timeToLeave(userId: string, questId: string): Promise<{ told: Told; at: Date } | null> {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId }, include: QUEST_INCLUDE });
    if (quest === null || !quest.holders.some((each) => each.userId === userId)) {
      return null;
    }
    const now = this.reader.now();
    const { gathered } = this.reader.stepsOf(quest, userId, now);
    if (gathered === null) {
      return null;
    }
    // Holding the Quest now puts its own steps in the User's day; the card, read before, had none of them.
    const leaveOut = quest.subQuests.map(({ id }) => id);
    const { leaveAt, walkMinutes, mode } = await this.reader.way(gathered, userId, quest.leader.name, {
      now,
      position: null,
      leaveOut,
    });
    if (leaveAt === null || walkMinutes === null || walkMinutes === 0) {
      return null;
    }
    const { destination } = gathered;
    const placeName = mealPlaceOf(destination.title) ?? placeLabel(this.reader.placeOf(destination.placeId));
    const by = mode === 'shuttle' ? { by: 'shuttle' as const } : {};
    return { told: { kind: 'leave-by', questId, placeLabel: placeName, walkMinutes, ...by }, at: new Date(leaveAt) };
  }
}

// A Plan's meal step is titled "<Restaurant>에서 식사", and the Leader's line names the Restaurant, so the invitee's
// names it too.
function mealPlaceOf(title: string): string | null {
  return /^(?<place>.+)에서 식사$/u.exec(title)?.groups?.place ?? null;
}
