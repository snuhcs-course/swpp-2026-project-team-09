/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Board, JoinPolicy, Person, UserSummary } from './types';

// The main server's lists of what waits for the User, which 알림 and the badge on 파티 are composed from.

// GET /friend-requests: the waiting requests sent to the User and those the User sent, the newest first.
export interface FriendRequests {
  received: { id: string; sender: UserSummary; sentAt: string }[];
  sent: { id: string; receiver: UserSummary; sentAt: string }[];
}

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
}
