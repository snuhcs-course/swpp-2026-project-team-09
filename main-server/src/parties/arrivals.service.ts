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
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type SubQuestDto } from '../quests/dto/quest.dto.js';
import { QuestsService } from '../quests/quests.service.js';

export const ARRIVAL_METRES = 50;
const AHEAD_MS = 30 * 60_000;
// Longer than any step lasts, so that a member is told arrived once per step.
const TOLD_LIFETIME_MS = 24 * 60 * 60_000;

// The step a Holder's map shows the Quest at: of those not ended, the attending one, or the first.
export function shownStep(steps: readonly SubQuestDto[]): SubQuestDto | null {
  const open = steps.filter(({ ended }) => !ended);
  return open.find(({ attending }) => attending) ?? open[0] ?? null;
}

// Tells the other Holders of a Party's Quest that a member sharing with the Party has reached the shown step's point,
// once per member and step, from 30 minutes before the step's time until it ends.
@Injectable()
export class ArrivalsService implements OnModuleInit {
  private readonly logger = new Logger(ArrivalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationSharing: LocationSharingService,
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
    const now = this.clock.now();
    const near = metresBetween(position, { latitude: place.latitude, longitude: place.longitude }) <= ARRIVAL_METRES;
    if (!near || new Date(step.startsAt).getTime() - now.getTime() > AHEAD_MS) {
      return;
    }
    if ((await this.redis.set(`arrived:${userId}:${step.id}`, '1', 'PX', TOLD_LIFETIME_MS, 'NX')) === null) {
      return;
    }
    const name = quest.holders.find(({ id }) => id === userId)?.name ?? '';
    const told = { kind: 'arrived' as const, questId, userId, name, placeLabel: place.label };
    await Promise.all(
      quest.holders.filter(({ id }) => id !== userId).map(({ id }) => this.notifications.schedule(id, told, now)),
    );
  }
}
