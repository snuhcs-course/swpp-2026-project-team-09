/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { type Card } from './card-address.js';

// The facts of each kind, from which the service writes the words. The kinds are a closed list.
export type Told =
  | { kind: 'accepted'; questId: string; questTitle: string; friendId: string; friendName: string }
  | { kind: 'declined'; questId: string; questTitle: string; friendId: string; friendName: string };

export type NotificationKind = Told['kind'];

export interface NotificationWords {
  title: string;
  line: string;
  card: Card;
  // Whom, beside the card, the Notification is about: the Friend who answered. Null when the card says it all.
  about: string | null;
}

// A Notification as it is kept for its User. `at` is the time it is for.
export interface KeptNotification extends Omit<NotificationWords, 'about'> {
  kind: NotificationKind;
  at: Date;
}

// At most one Notification of a kind about a card, and about the same person, for a User: two Friends who accept
// into one Quest are two Notifications.
export function identityOf(kind: NotificationKind, card: Card, about: string | null = null): string {
  return [kind, card.kind, card.id, ...(about === null ? [] : [about])].join(':');
}
