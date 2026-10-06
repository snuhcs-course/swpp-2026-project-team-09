import type { JoinPolicy, Person, SubQuest } from './types';

// The main server's lists of what waits for the User, which 알림 and the badge on 파티 are composed from.

// GET /friend-requests: the waiting requests sent to the User and those the User sent, the newest first.
export interface FriendRequests {
  received: { id: string; sender: { name: string; department: string }; sentAt: string }[];
  sent: { id: string; receiver: { name: string; department: string }; sentAt: string }[];
}

// GET /quest-invitations, the newest first: the Leader's invitations into a Quest, the Quest as it is now.
export interface QuestInvitation {
  id: string;
  quest: {
    id: string;
    title: string;
    globalEvent: { id: string; title: string } | null;
    leader: Person;
    holderCount: number;
    capacity: number;
    joinPolicy: JoinPolicy;
  };
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
