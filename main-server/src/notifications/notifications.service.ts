/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { koreaTime } from '../assistant/korea-time.js';
import { SignalsService } from '../common/signals.service.js';
import { type Notification } from '../generated/prisma/client.js';
import { type Card, cardAddress } from './card-address.js';
import { type NotificationDto } from './dto/notification.dto.js';
import { identityOf, type NotificationKind, type Told } from './notification.js';
import { type Kept, NotificationStore } from './notification-store.js';
import { wordsOf } from './notification-words.js';

const KINDS: ReadonlySet<string> = new Set<NotificationKind>([
  'accepted',
  'declined',
  'leave-by',
  'room-declined',
  'room-agreed',
  'room-ending',
  'room-window',
  'interest-new',
]);

function kept(told: Told, at: Date): Kept {
  const words = wordsOf(told, at);
  // A card no address opens is refused before it is kept: every later reading of the User's list would fail on it.
  cardAddress(words.card);
  return { kind: told.kind, at, ...words };
}

// A row of a kind this version does not know, such as one a later version kept, is left out of the list.
function isKnown(row: Notification): row is Notification & { kind: NotificationKind } {
  return KINDS.has(row.kind);
}

// The one place that keeps a Notification, writes its words and gives it its address. The caller gives the time.
@Injectable()
export class NotificationsService {
  constructor(
    private readonly store: NotificationStore,
    private readonly signals: SignalsService,
  ) {}

  async schedule(userId: string, told: Told, at: Date): Promise<void> {
    await this.store.keep(userId, kept(told, at));
    this.signals.send([userId], 'notice');
  }

  // Only when one is kept under the same identity.
  async replace(userId: string, told: Told, at: Date): Promise<boolean> {
    const replaced = await this.store.replace(userId, kept(told, at));
    if (replaced) {
      this.signals.send([userId], 'notice');
    }
    return replaced;
  }

  // `about` names the person of a kind that is kept for each one, such as the Friend who answered. Tells the User only
  // when one was kept.
  async cancel(userId: string, kind: NotificationKind, card: Card, about: string | null = null): Promise<void> {
    if (await this.store.forget(userId, kind, card, about)) {
      this.signals.send([userId], 'notice');
    }
  }

  async listFor(userId: string): Promise<NotificationDto[]> {
    return (await this.store.readAll(userId))
      .filter((row) => isKnown(row))
      .map((row) => {
        const card = { kind: row.cardKind, id: row.cardId };
        return {
          id: identityOf(row.kind, card, row.about === '' ? null : row.about),
          kind: row.kind,
          title: row.title,
          ahead: row.ahead,
          line: row.line,
          at: koreaTime(row.at),
          url: cardAddress(card),
        };
      });
  }
}
