/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { UserDayService } from '../assistant/free-time/user-day.service.js';
import { MINUTE_MS } from '../assistant/gathering/gathering.js';
import { koreaDate } from '../assistant/korea-time.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Told } from '../notifications/notification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QUEST_INCLUDE, toSubQuestDto } from '../quests/dto/quest.dto.js';
import { InvitationsService } from '../quests/invitations.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { toCardStep } from './invitation-card.service.js';
import { gatheringOf, ownWay, placeLabel } from './own-way.js';

// An invited User's own time to leave for a Quest they accept, kept as the Leader's is when a Plan becomes a party.
// Registered with InvitationsService, which cannot import this module.
@Injectable()
export class InviteeTimeToLeave implements OnModuleInit {
  private readonly logger = new Logger(InviteeTimeToLeave.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    private readonly notifications: NotificationsService,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.invitations.onAccepted((userId, questId) => {
      void this.keep(userId, questId);
    });
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
    const holder = quest?.holders.find((each) => each.userId === userId);
    if (quest === null || holder === undefined) {
      return null;
    }
    const now = new Date(Math.ceil(this.clock.now().getTime() / MINUTE_MS) * MINUTE_MS);
    const gathered = gatheringOf(
      quest.subQuests.map((subQuest) => toCardStep(toSubQuestDto(subQuest, quest.globalEvent, userId, now))),
      this.travel,
    );
    if (gathered === null) {
      return null;
    }
    const { destination } = gathered;
    // Holding the Quest now puts its own steps in the User's day; the card, read before, had none of them.
    const steps = new Set(quest.subQuests.map(({ id }) => id));
    const items = (await this.days.itemsOn(userId, koreaDate(destination.start))).filter(({ id }) => !steps.has(id));
    const placeOf = (placeId: string): PlaceDto => {
      const place = this.places.byId(placeId);
      if (place === null) {
        throw new Error(`No Place ${placeId}`);
      }
      return place;
    };
    const { leaveAt, walkMinutes } = ownWay({
      gathered,
      invitee: { id: userId, name: holder.user.name },
      leaderName: quest.leader.name,
      items,
      location: null,
      now,
      travel: this.travel,
      placeOf,
    });
    if (leaveAt === null || walkMinutes === null || walkMinutes === 0) {
      return null;
    }
    const placeName = placeLabel(placeOf(destination.placeId));
    return { told: { kind: 'leave-by', questId, placeLabel: placeName, walkMinutes }, at: new Date(leaveAt) };
  }
}
