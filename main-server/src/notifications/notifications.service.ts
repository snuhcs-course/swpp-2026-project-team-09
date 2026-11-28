/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { koreaTime } from '../assistant/korea-time.js';
import { SignalsService } from '../common/signals.service.js';
import { type Notification } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type Card, cardAddress, openedAddress } from './card-address.js';
import { type NotificationDto } from './dto/notification.dto.js';
import { identityOf, type NotificationKind, type Told } from './notification.js';
import { type Kept, NotificationStore } from './notification-store.js';
import { wordsOf } from './notification-words.js';

const KINDS: ReadonlySet<string> = new Set<NotificationKind>([
  'accepted',
  'declined',
  'join-accepted',
  'join-declined',
  'join-asked',
  'party-ended',
  'party-removed',
  'join-cancelled',
  'invitation-cancelled',
  'became-leader',
  'party-activated',
  'leave-by',
  'room-declined',
  'room-agreed',
  'room-ending',
  'room-window',
  'interest-new',
  'step-changed',
  'arrived',
  'late',
]);

function kept(told: Told, at: Date): Kept {
  const words = wordsOf(told, at);
  // A card no address opens is refused before it is kept: every later reading of the User's list would fail on it.
  cardAddress(words.card);
  return { kind: told.kind, at, ...words };
}

function isKind(kind: string): kind is NotificationKind {
  return KINDS.has(kind);
}

// A row of a kind this version does not know, such as one a later version kept, is left out of the list.
function isKnown(row: Notification): row is Notification & { kind: NotificationKind } {
  return isKind(row.kind);
}

// The one place that keeps a Notification, writes its words and gives it its address. The caller gives the time.
@Injectable()
export class NotificationsService {
  constructor(
    private readonly store: NotificationStore,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async schedule(userId: string, told: Told, at: Date): Promise<void> {
    await this.store.keep(userId, kept(told, at));
    this.signals.send([userId], 'notice');
  }

  // Rings only when none is kept under the same identity: one kept is rewritten, and is not sent again once sent.
  async renew(userId: string, told: Told, at: Date): Promise<void> {
    await this.store.renew(userId, kept(told, at));
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

  // Those whose time has come: one kept ahead is read when it has rung and 알림 is opened again.
  async markRead(userId: string): Promise<void> {
    await this.store.markRead(userId, this.clock.now());
  }

  // One of the User's by the list's identity, `<kind>:<card kind>:<card id>[:<about>]`, as a swipe in 알림 deletes it.
  // An identity that names none of the User's deletes nothing.
  async delete(userId: string, id: string): Promise<void> {
    const [kind, cardKind, cardId, about, ...more] = id.split(':');
    if (kind === undefined || !isKind(kind) || cardKind === undefined || cardId === undefined || more.length > 0) {
      return;
    }
    await this.cancel(userId, kind, { kind: cardKind, id: cardId }, about ?? null);
  }

  // Those whose time has come by `until`, now by default: one kept ahead, such as tomorrow's 지금 나서요, is listed when
  // it rings. A later `until` reads what is kept for later, as the tests that keep it do.
  async listFor(userId: string, until: Date = this.clock.now()): Promise<NotificationDto[]> {
    return (await this.store.readCome(userId, until))
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
          url: openedAddress(row.kind, card),
          read: row.readAt !== null,
        };
      });
  }
}
