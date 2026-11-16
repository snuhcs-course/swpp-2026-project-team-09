/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { Board, JoinPolicy, Person, UserSummary } from './types';

// The main server's lists of what waits for the User, which 알림 and the badge on 파티 are composed from.

// GET /friend-requests: the waiting requests sent to the User and those the User sent, the newest first.
// The other User's `id` tells a 파티's member rows who was asked; a main server before P06-08 sends none.
export interface FriendRequests {
  received: { id: string; sender: RequestUser; sentAt: string }[];
  sent: { id: string; receiver: RequestUser; sentAt: string }[];
}

export type RequestUser = UserSummary & { id?: string };

// A Quest as the lists of what waits and the list of recruiting Quests show it, as it is now.
export interface QuestSummary {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
  leader: Person;
  holderCount: number;
  capacity: number;
  joinPolicy: JoinPolicy;
  board: Board | null;
  description: string;
  createdAt: string;
}

// GET /quest-invitations, the newest first: the Leader's invitations into a Quest.
export interface QuestInvitation {
  id: string;
  quest: QuestSummary;
  sentAt: string;
}

// GET /quest-join-requests, the newest first: the User's waiting requests to join an Approval Quest.
export interface MyJoinRequest {
  id: string;
  quest: QuestSummary;
  sentAt: string;
}

// GET /quests/:questId/join-requests: the requests to join a Quest the User leads.
export interface JoinRequest {
  id: string;
  user: Person;
  sentAt: string;
  // On a request to join: the Leader removed its User from the Quest before. Never on an invitation.
  removedBefore?: boolean;
}

// GET /quest-removals: the Quests the Leader removed the User from, which the User comes back to only by asking.
export interface QuestRemoval {
  questId: string;
  removedAt: string;
}

// GET /notifications, the latest first: the Notifications the main server keeps for the User. `at` is Korea's time with
// its offset, and `url` the card's address, `/main?card=<kind>:<id>`. Kinds: `accepted`, `declined` and `leave-by`, with
// more to come.
export interface KeptNotification {
  id: string;
  kind: string;
  title: string;
  // The title while `at` is still to come. Null for a kind that has none; absent from an older main server.
  ahead?: string | null;
  line: string;
  at: string;
  url: string;
}
