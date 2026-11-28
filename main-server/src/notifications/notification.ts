/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Card } from './card-address.js';

// A 파티 gone by the Leader's doing: ended, told to each other member and to whoever waited on it, or the User removed.
export type GoneKind = 'party-ended' | 'party-removed' | 'join-cancelled' | 'invitation-cancelled';

// The member who leads a Quest now: the Leader `left` it and they entered earliest, or the Leader `handed` it over.
export interface NewLeader {
  kind: 'became-leader';
  questId: string;
  questTitle: string;
  formerName: string;
  how: 'left' | 'handed';
}

export interface PartyGone {
  kind: GoneKind;
  questId: string;
  questTitle: string;
  leaderName: string;
}

// The facts of each kind, from which the service writes the words. The kinds are a closed list.
export type Told =
  | { kind: 'accepted'; questId: string; questTitle: string; friendId: string; friendName: string }
  | { kind: 'declined'; questId: string; questTitle: string; friendId: string; friendName: string }
  // The Leader's answer to a request to join, told to the one who asked.
  | { kind: 'join-accepted'; questId: string; questTitle: string; leaderName: string }
  | { kind: 'join-declined'; questId: string; questTitle: string; leaderName: string }
  // The requests to join that wait for the Leader: the newest one's name, and how many wait in all.
  | { kind: 'join-asked'; questId: string; questTitle: string; name: string; waiting: number }
  | PartyGone
  | NewLeader
  // The Quest's Party opened, told to each other Holder by the one who opened it.
  | { kind: 'party-activated'; questId: string; questTitle: string; byName: string }
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
  // What words between a party's members would have said, told to the other Holders. `startsAt` is the step's time,
  // null for a step without one; `arriveAt` is Korea time with the offset, null when the way has no arrival.
  | {
      kind: 'step-changed';
      questId: string;
      byId: string;
      byName: string;
      stepTitle: string;
      startsAt: Date | null;
      cancelled: boolean;
    }
  | { kind: 'arrived'; questId: string; userId: string; name: string; placeLabel: string }
  | {
      kind: 'late';
      questId: string;
      questTitle: string;
      userId: string;
      name: string;
      minutes: number;
      arriveAt: string | null;
    }
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
