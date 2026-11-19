/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { metresBetween, type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { REDIS } from '../common/redis.module.js';
import { LocationSharingService } from '../location-sharing/location-sharing.service.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type SubQuestDto } from '../quests/dto/quest.dto.js';
import { QuestsService } from '../quests/quests.service.js';

export const ARRIVAL_METRES = 50;
const AHEAD_MS = 30 * 60_000;
// How long after its start a step with no end time is still arrived at.
const OPEN_ENDED_MS = 24 * 60 * 60_000;

// The step a Holder's map shows the Quest at: of those not ended, the attending one, or the first.
export function shownStep(steps: readonly SubQuestDto[]): SubQuestDto | null {
  const open = steps.filter(({ ended }) => !ended);
  return open.find(({ attending }) => attending) ?? open[0] ?? null;
}

// Tells the other Holders of a Party's Quest who see the member's position that the member, sharing with the Party,
// has reached the shown step's point: once per member and per step's time and point, from 30 minutes before the step's
// time until it ends.
@Injectable()
export class ArrivalsService implements OnModuleInit {
  private readonly logger = new Logger(ArrivalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationSharing: LocationSharingService,
    private readonly visibility: VisibilityService,
    private readonly quests: QuestsService,
    private readonly notifications: NotificationsService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.locationSharing.onKept((userId, position) => {
      this.check(userId, position).catch((error: unknown) => {
        this.logger.warn(`An arrival was not checked: ${String(error)}`);
      });
    });
  }

  async check(userId: string, position: Position): Promise<void> {
    const member = await this.prisma.partyMember.findUnique({
      where: { userId },
      select: { sharing: true, party: { select: { questId: true } } },
    });
    const questId = member?.sharing === true ? member.party.questId : null;
    if (questId === null || (await this.prisma.questHolder.count({ where: { questId, userId } })) === 0) {
      return;
    }
    const quest = await this.quests.read(userId, questId);
    const step = shownStep(quest.subQuests);
    const place = step?.place ?? null;
    if (
      step === null ||
      step.startsAt === null ||
      place === null ||
      place.latitude === null ||
      place.longitude === null
    ) {
      return;
    }
    const now = this.clock.now().getTime();
    const startsAt = new Date(step.startsAt).getTime();
    const endsAt = step.endsAt === null ? startsAt + OPEN_ENDED_MS : new Date(step.endsAt).getTime();
    const near = metresBetween(position, { latitude: place.latitude, longitude: place.longitude }) <= ARRIVAL_METRES;
    if (!near || startsAt - now > AHEAD_MS || endsAt <= now) {
      return;
    }
    // A step moved to another time or point is arrived at anew.
    const key = `arrived:${userId}:${step.id}:${startsAt}:${place.latitude},${place.longitude}`;
    if ((await this.redis.set(key, '1', 'PX', endsAt - now, 'NX')) === null) {
      return;
    }
    const viewers = await this.visibility.viewersOf(userId);
    const name = quest.holders.find(({ id }) => id === userId)?.name ?? '';
    const told = { kind: 'arrived' as const, questId, userId, name, placeLabel: place.label };
    await Promise.all(
      quest.holders
        .filter(({ id }) => id !== userId && viewers.get(id) === 'exact')
        .map(({ id }) => this.notifications.schedule(id, told, new Date(now))),
    );
  }
}
