/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { MeetupPlace } from './room-types';
import type { Board, JoinPolicy, Person, SubQuest, UserSummary } from './types';

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

export type MeetupState = 'proposed' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

export interface Meetup {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  place: SubQuest['place'];
  state: MeetupState;
  proposer: Person;
  receiver: Person;
}

// POST /meetups: a proposal to one Friend. The place is a Place of the list or a point with its words.
export interface MeetupProposal {
  receiverId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  place: MeetupPlace;
}

// GET /meetups: those proposed to the User and those the User proposed, the newest first, every state included.
export interface Meetups {
  received: Meetup[];
  sent: Meetup[];
}

// GET /quests/:questId/join-requests: the requests to join a Quest the User leads.
export interface JoinRequest {
  id: string;
  user: Person;
  sentAt: string;
}
