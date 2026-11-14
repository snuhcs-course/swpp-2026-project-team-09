/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { type Notification } from '../generated/prisma/client.js';
import { type Card } from './card-address.js';
import { type NotificationKind, type NotificationWords } from './notification.js';

// A Notification as the service gives it to be kept: its kind, its time and its words.
export interface Kept extends NotificationWords {
  kind: NotificationKind;
  at: Date;
}

type Key = Pick<Notification, 'userId' | 'kind' | 'cardKind' | 'cardId' | 'about'>;
type Fields = Pick<Notification, 'at' | 'title' | 'ahead' | 'line' | 'body' | 'rings'>;

function keyOf(userId: string, kind: string, card: Card, about: string | null): Key {
  return { userId, kind, cardKind: card.kind, cardId: card.id, about: about ?? '' };
}

function fieldsOf({ at, title, ahead, line, body, rings }: Kept): Fields {
  return { at, title, ahead, line, body, rings };
}

// The table `notifications`, one row a Notification.
@Injectable()
export class NotificationStore {
  constructor(private readonly prisma: PrismaService) {}

  // A schedule makes it to be sent again, even when it was sent.
  async keep(userId: string, kept: Kept): Promise<void> {
    const key = keyOf(userId, kept.kind, kept.card, kept.about);
    await this.prisma.notification.upsert({
      where: { userId_kind_cardKind_cardId_about: key },
      create: { ...key, ...fieldsOf(kept) },
      update: { ...fieldsOf(kept), sentAt: null },
    });
  }

  // A replace keeping the time does not send a sent one again; one that moves the time does, at the new time.
  async replace(userId: string, kept: Kept): Promise<boolean> {
    const key = keyOf(userId, kept.kind, kept.card, kept.about);
    const [sameTime, newTime] = await this.prisma.$transaction([
      this.prisma.notification.updateMany({ where: { ...key, at: kept.at }, data: fieldsOf(kept) }),
      this.prisma.notification.updateMany({
        where: { ...key, at: { not: kept.at } },
        data: { ...fieldsOf(kept), sentAt: null },
      }),
    ]);
    return sameTime.count + newTime.count > 0;
  }

  async forget(userId: string, kind: NotificationKind, card: Card, about: string | null): Promise<void> {
    await this.prisma.notification.deleteMany({ where: keyOf(userId, kind, card, about) });
  }

  // The latest time first.
  readAll(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: [{ at: 'desc' }, { createdAt: 'desc' }] });
  }
}
