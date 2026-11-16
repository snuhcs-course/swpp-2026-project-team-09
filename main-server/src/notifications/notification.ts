/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Card } from './card-address.js';

// The facts of each kind, from which the service writes the words. The kinds are a closed list.
export type Told =
  | { kind: 'accepted'; questId: string; questTitle: string; friendId: string; friendName: string }
  | { kind: 'declined'; questId: string; questTitle: string; friendId: string; friendName: string }
  // Given for a Plan taken alone: `toward`, the next item the walk is for, "13:00 수업"; `by`, a way by shuttle.
  | {
      kind: 'leave-by';
      questId: string;
      placeLabel: string;
      walkMinutes: number;
      toward?: { start: string; word: '수업' | '일정' };
      by?: 'shuttle';
    }
  | {
      kind: 'room-declined';
      questId: string;
      roomLabel: string;
      friendId: string;
      friendName: string;
      moreNeeded: number;
    }
  | {
      kind: 'room-agreed';
      questId: string;
      roomLabel: string;
      date: string;
      start: string;
      minutes: number;
      names: string[];
    }
  | { kind: 'room-ending'; questId: string; roomLabel: string; end: string }
  | { kind: 'room-window'; questId: string; date: string; start: string; minutes: number }
  | {
      kind: 'interest-new';
      subject: 'event' | 'quest';
      id: string;
      title: string;
      startsAt: Date | null;
      placeLabel: string | null;
    };

export type NotificationKind = Told['kind'];

export interface NotificationWords {
  title: string;
  // The title while the time is still to come. Null for a kind that has none.
  ahead: string | null;
  line: string;
  card: Card;
  // Whom, beside the card, the Notification is about: the Friend who answered. Null when the card says it all.
  about: string | null;
  // Whether it is pushed to the User's phone when its time comes, with `body` under the title.
  rings: boolean;
  body: string | null;
}

// At most one Notification of a kind about a card, and about the same person, for a User: two Friends who accept
// into one Quest are two Notifications.
export function identityOf(kind: NotificationKind, card: Card, about: string | null = null): string {
  return [kind, card.kind, card.id, ...(about === null ? [] : [about])].join(':');
}
