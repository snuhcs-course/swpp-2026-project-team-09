/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { PushService } from '../push/push.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { cardAddress } from './card-address.js';

const MOST_A_STEP = 100;
const KEPT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Claimed {
  userId: string;
  title: string;
  body: string | null;
  cardKind: string;
  cardId: string;
}

// Sends each Notification that rings a phone once its time has come, at most once: it is marked sent before it is
// pushed, so a pod that stops in between sends nothing.
@Injectable()
export class NotificationSender {
  private readonly logger = new Logger(NotificationSender.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // How many it sent. Never throws.
  async sendDue(): Promise<number> {
    try {
      const now = this.clock.now();
      const claimed = await this.claim(now);
      for (const notification of claimed) {
        this.ring(notification);
      }
      await this.prisma.notification.deleteMany({
        where: { at: { lt: new Date(now.getTime() - KEPT_DAYS * DAY_MS) } },
      });
      return claimed.length;
    } catch (error) {
      this.logger.warn(
        `A step of the Notifications' sender failed: ${error instanceof Error ? error.name : typeof error}`,
      );
      return 0;
    }
  }

  // SKIP LOCKED lets two pods' steps at once take different rows instead of the same one twice.
  private claim(now: Date): Promise<Claimed[]> {
    return this.prisma.$queryRaw<Claimed[]>`
      UPDATE notifications SET sent_at = ${now}
      WHERE id IN (
        SELECT id FROM notifications
        WHERE rings AND sent_at IS NULL AND at <= ${now}
        ORDER BY at
        LIMIT ${MOST_A_STEP}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING user_id AS "userId", title, body, card_kind AS "cardKind", card_id AS "cardId"`;
  }

  private ring({ userId, title, body, cardKind, cardId }: Claimed): void {
    try {
      void this.push.send([userId], { title, body: body ?? '', url: cardAddress({ kind: cardKind, id: cardId }) });
      this.signals.send([userId], 'notice');
    } catch (error) {
      this.logger.warn(`A Notification was not sent: ${error instanceof Error ? error.name : typeof error}`);
    }
  }
}
