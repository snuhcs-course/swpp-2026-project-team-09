import type { Party, Quest } from '@/api/types';
import type { FriendRequests, JoinRequest, Meetups, QuestInvitation } from '@/api/waiting-types';
import { koreaClock, koreaDay } from '@/korea-time';

// What a row of 알림 is about. Every kind but `friend-request` concerns 파티.
export type NoticeKind = 'party' | 'friend-request' | 'invitation' | 'meetup' | 'join-requests';

// One row of 알림.
export interface NoticeView {
  key: string;
  kind: NoticeKind;
  // In the row's round, by its name in the design system.
  icon: 'pin' | 'user' | 'calendar' | 'users';
  // "김민준님의 친구 요청"
  title: string;
  // "산업공학과"
  sub: string;
}

// The lists 알림 is composed from. A list that failed is null and gives no rows.
export interface NoticeSources {
  parties: readonly Party[] | null;
  friendRequests: FriendRequests | null;
  invitations: readonly QuestInvitation[] | null;
  meetups: Meetups | null;
  // Each Quest the User leads that others ask to join, with its requests.
  joinRequests: readonly { quest: Quest; requests: readonly JoinRequest[] }[] | null;
  now: Date;
}

// A Party running for a Quest the User holds, which the User is not in: `GET /parties` lists no Party of the User's.
function partyNotices(parties: readonly Party[]): NoticeView[] {
  return parties
    .filter(({ holdsQuest }) => holdsQuest)
    .map(({ id, title, leader }) => ({
      key: `party-${id}`,
      kind: 'party',
      icon: 'pin',
      title: leader === undefined ? '파티가 활성화됐어요' : `${leader.name}님이 파티를 활성화했어요`,
      sub: `${title} · 참여하면 위치를 공유해요`,
    }));
}

function friendRequestNotices({ received }: FriendRequests): NoticeView[] {
  return received.map(({ id, sender }) => ({
    key: `friend-request-${id}`,
    kind: 'friend-request',
    icon: 'user',
    title: `${sender.name}님의 친구 요청`,
    sub: sender.department,
  }));
}

function invitationNotices(invitations: readonly QuestInvitation[]): NoticeView[] {
  return invitations.map(({ id, quest }) => ({
    key: `invitation-${id}`,
    kind: 'invitation',
    icon: 'calendar',
    title: `${quest.leader.name}님의 파티 초대`,
    sub: quest.title,
  }));
}

// "학관 점심 · 내일 12:10"
function meetupNotices({ received }: Meetups, now: Date): NoticeView[] {
  return received
    .filter(({ state }) => state === 'proposed')
    .map(({ id, title, startsAt, proposer }) => ({
      key: `meetup-${id}`,
      kind: 'meetup',
      icon: 'calendar',
      title: `${proposer.name}님의 파티 초대`,
      sub: `${title} · ${koreaDay(startsAt, now)} ${koreaClock(startsAt)}`,
    }));
}

function joinRequestNotices(joinRequests: NonNullable<NoticeSources['joinRequests']>): NoticeView[] {
  return joinRequests
    .filter(({ requests }) => requests.length > 0)
    .map(({ quest, requests }) => ({
      key: `join-requests-${quest.id}`,
      kind: 'join-requests',
      icon: 'users',
      title: `참여 신청 ${requests.length}명`,
      sub: quest.title,
    }));
}

// The rows of 알림, in the `Profile` frame's order: the Parties opened, the Friend Requests, the invitations to 파티,
// and the requests to join.
export function toNotices({
  parties,
  friendRequests,
  invitations,
  meetups,
  joinRequests,
  now,
}: NoticeSources): NoticeView[] {
  return [
    ...(parties === null ? [] : partyNotices(parties)),
    ...(friendRequests === null ? [] : friendRequestNotices(friendRequests)),
    ...(invitations === null ? [] : invitationNotices(invitations)),
    ...(meetups === null ? [] : meetupNotices(meetups, now)),
    ...(joinRequests === null ? [] : joinRequestNotices(joinRequests)),
  ];
}

// Whether others ask the User to let them into the Quest: the User leads it, and its Join Policy is Approval.
export function takesJoinRequests(quest: Quest, meId: string): boolean {
  return !quest.classQuest && quest.joinPolicy === 'approval' && quest.leader?.id === meId;
}
