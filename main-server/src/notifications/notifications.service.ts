/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { koreaTime } from '../assistant/korea-time.js';
import { SignalsService } from '../common/signals.service.js';
import { type Card, cardAddress } from './card-address.js';
import { type NotificationDto } from './dto/notification.dto.js';
import { identityOf, type KeptNotification, type NotificationKind, type Told } from './notification.js';
import { NotificationStore } from './notification-store.js';
import { wordsOf } from './notification-words.js';

function kept(told: Told, at: Date): { identity: string; notification: KeptNotification } {
  const { about, ...words } = wordsOf(told);
  // A card no address opens is refused before it is kept: every later reading of the User's list would fail on it.
  cardAddress(words.card);
  return { identity: identityOf(told.kind, words.card, about), notification: { kind: told.kind, at, ...words } };
}

// The one place that keeps a Notification, writes its words and gives it its address. The caller gives the time.
@Injectable()
export class NotificationsService {
  constructor(
    private readonly store: NotificationStore,
    private readonly signals: SignalsService,
  ) {}

  async schedule(userId: string, told: Told, at: Date): Promise<void> {
    const { identity, notification } = kept(told, at);
    await this.store.keep(userId, identity, notification);
    this.signals.send([userId], 'notice');
  }

  // Only when one is kept under the same identity.
  async replace(userId: string, told: Told, at: Date): Promise<boolean> {
    const { identity, notification } = kept(told, at);
    const replaced = await this.store.replace(userId, identity, notification);
    if (replaced) {
      this.signals.send([userId], 'notice');
    }
    return replaced;
  }

  // `about` names the person of a kind that is kept for each one, such as the Friend who answered.
  async cancel(userId: string, kind: NotificationKind, card: Card, about: string | null = null): Promise<void> {
    await this.store.forget(userId, identityOf(kind, card, about));
    this.signals.send([userId], 'notice');
  }

  async listFor(userId: string): Promise<NotificationDto[]> {
    return (await this.store.readAll(userId)).map(({ identity, kind, title, line, at, card }) => ({
      id: identity,
      kind,
      title,
      line,
      at: koreaTime(at),
      url: cardAddress(card),
    }));
  }
}
