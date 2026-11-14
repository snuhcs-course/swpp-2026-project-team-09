/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Card } from './card-address.js';

// The facts of each kind, from which the service writes the words. The kinds are a closed list.
export type Told =
  | { kind: 'accepted'; questId: string; questTitle: string; friendName: string }
  | { kind: 'declined'; questId: string; questTitle: string; friendName: string };

export type NotificationKind = Told['kind'];

export interface NotificationWords {
  title: string;
  line: string;
  card: Card;
}

// A Notification as it is kept for its User. `at` is the time it is for.
export interface KeptNotification extends NotificationWords {
  kind: NotificationKind;
  at: Date;
}

// At most one Notification of a kind about a card for a User.
export function identityOf(kind: NotificationKind, card: Card): string {
  return `${kind}:${card.kind}:${card.id}`;
}
