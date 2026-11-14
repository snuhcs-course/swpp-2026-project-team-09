/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: each kind of 알림 row, with and without what it names, a list that failed, the rows' order, the kept
// Notifications and their time on and off today in Korea, and who takes requests to join. Expected values: P19-02's
// criteria (iteration 1), P05-02's criteria and GLOSSARY (Join Policy, Leader).

import type { Party, Person, Quest } from '@/api/types';
import type { FriendRequests, JoinRequest, KeptNotification, QuestInvitation } from '@/api/waiting-types';
import { type NoticeSources, takesJoinRequests, toNotices } from '@/features/notifications/adapter';

const ME: Person = { id: 'me', name: '홍길동', department: '컴퓨터공학부' };
const MIN_JUN: Person = { id: 'min-jun', name: '김민준', department: '산업공학과' };

function party(id: string, holdsQuest: boolean, more: Partial<Party> = {}): Party {
  return {
    id,
    title: '설명회 같이',
    memberCount: 2,
    capacity: 4,
    joinPolicy: 'closed',
    quest: { id: `quest-${id}`, title: '설명회', globalEvent: null },
    leader: { id: 'min-jun', name: '김민준' },
    holdsQuest,
    friends: [],
    ...more,
  };
}

function quest(id: string, more: Partial<Quest> = {}): Quest {
  return {
    id,
    title: '저녁 같이 먹어요',
    globalEvent: null,
    leader: ME,
    capacity: 4,
    joinPolicy: 'approval',
    holders: [ME],
    subQuests: [],
    classQuest: false,
    waitingJoinRequests: 0,
    board: 'meal',
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
    ...more,
  };
}

const FRIEND_REQUESTS: FriendRequests = {
  received: [{ id: 'fr1', sender: { name: '김민준', department: '산업공학과' }, sentAt: '2026-10-06T03:00:00Z' }],
  sent: [{ id: 'fr2', receiver: { name: '이서연', department: '경영학과' }, sentAt: '2026-10-06T03:00:00Z' }],
};

const INVITATION: QuestInvitation = {
  id: 'inv1',
  quest: {
    id: 'q2',
    title: 'MT 가요',
    globalEvent: null,
    leader: MIN_JUN,
    holderCount: 2,
    capacity: 8,
    joinPolicy: 'closed',
    board: null,
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
  },
  sentAt: '2026-10-06T03:00:00Z',
};

const JOIN_REQUEST: JoinRequest = { id: 'jr1', user: MIN_JUN, sentAt: '2026-10-06T03:00:00Z' };

// 17 November 2026, 13:00 in Korea.
const NOW = new Date('2026-11-17T13:00:00+09:00');

const NONE: NoticeSources = {
  parties: [],
  friendRequests: null,
  invitations: [],
  joinRequests: [],
  kept: [],
  now: NOW,
};

describe('toNotices of Parties and Friend Requests', () => {
  it("a Party running for a Quest the User holds → its Leader's words, opening the Quest's room", () => {
    expect(toNotices({ ...NONE, parties: [party('p1', true), party('p2', false)] })).toEqual([
      {
        key: 'party-p1',
        kind: 'party',
        icon: 'pin',
        title: '김민준님이 파티를 활성화했어요',
        sub: '설명회 같이 · 참여하면 위치를 공유해요',
        questId: 'quest-p1',
        address: null,
        time: null,
      },
    ]);
  });

  it('a Party whose entry names no Leader → the plain words', () => {
    const { leader: _, ...unnamed } = party('p1', true);
    expect(toNotices({ ...NONE, parties: [unnamed] })[0]?.title).toBe('파티가 활성화됐어요');
  });

  it('a Party tied to no Quest → no room', () => {
    expect(toNotices({ ...NONE, parties: [party('p1', true, { quest: null })] })[0]?.questId).toBeNull();
  });

  it('Friend Requests received and sent → a row for each one received only', () => {
    expect(toNotices({ ...NONE, friendRequests: FRIEND_REQUESTS })).toEqual([
      {
        key: 'friend-request-fr1',
        kind: 'friend-request',
        icon: 'user',
        title: '김민준님의 친구 요청',
        sub: '산업공학과',
        questId: null,
        address: null,
        time: null,
      },
    ]);
  });
});

describe('toNotices of invitations and requests to join', () => {
  it("an invitation into a Quest → its Leader's invitation, under the Quest's title", () => {
    expect(toNotices({ ...NONE, invitations: [INVITATION] })).toEqual([
      {
        key: 'invitation-inv1',
        kind: 'invitation',
        icon: 'calendar',
        title: '김민준님의 파티 초대',
        sub: 'MT 가요',
        questId: null,
        address: '/main?card=invitation:inv1',
        time: null,
      },
    ]);
  });

  it('a led Quest with two requests to join, and one with none → one row counting them', () => {
    const joinRequests = [
      { quest: quest('q1'), requests: [JOIN_REQUEST, { ...JOIN_REQUEST, id: 'jr2' }] },
      { quest: quest('q3'), requests: [] },
    ];
    expect(toNotices({ ...NONE, joinRequests })).toEqual([
      {
        key: 'join-requests-q1',
        kind: 'join-requests',
        icon: 'users',
        title: '참여 신청 2명',
        sub: '저녁 같이 먹어요',
        questId: 'q1',
        address: null,
        time: null,
      },
    ]);
  });
});

describe('toNotices of every list', () => {
  it('every kind at once → Parties, Friend Requests, invitations, then requests to join', () => {
    const rows = toNotices({
      parties: [party('p1', true)],
      friendRequests: FRIEND_REQUESTS,
      invitations: [INVITATION],
      joinRequests: [{ quest: quest('q1'), requests: [JOIN_REQUEST] }],
      kept: [],
      now: NOW,
    });
    expect(rows.map(({ kind }) => kind)).toEqual(['party', 'friend-request', 'invitation', 'join-requests']);
  });

  it('every list failed → no row', () => {
    const failed = { parties: null, friendRequests: null, invitations: null, joinRequests: null, kept: null, now: NOW };
    expect(toNotices(failed)).toEqual([]);
  });
});

function kept(id: string, at: string, more: Partial<KeptNotification> = {}): KeptNotification {
  return {
    id,
    kind: 'accepted',
    title: '이서연님이 수락했어요',
    line: '저녁 같이 먹어요',
    at,
    url: '/main?card=party:q1',
    ...more,
  };
}

describe('toNotices of the kept Notifications', () => {
  it("an accepted invitation kept today → the invitation's icon, its words, its address and its time", () => {
    expect(toNotices({ ...NONE, kept: [kept('n1', '2026-11-17T11:58:00+09:00')] })).toEqual([
      {
        key: 'notice-n1',
        kind: 'accepted',
        icon: 'calendar',
        title: '이서연님이 수락했어요',
        sub: '저녁 같이 먹어요',
        questId: null,
        address: '/main?card=party:q1',
        time: '11:58',
      },
    ]);
  });

  it('kept Notifications out of order, and rows that wait → the kept ones first, the latest first', () => {
    const rows = toNotices({
      ...NONE,
      invitations: [INVITATION],
      kept: [kept('n1', '2026-11-16T09:00:00+09:00'), kept('n2', '2026-11-17T11:58:00+09:00')],
    });
    expect(rows.map(({ key, time }) => [key, time])).toEqual([
      ['notice-n2', '11:58'],
      ['notice-n1', '11월 16일'],
      ['invitation-inv1', null],
    ]);
  });

  it.each([
    ['midnight in Korea, given in UTC', '2026-11-16T15:00:00Z', '00:00'],
    ['a minute before midnight in Korea', '2026-11-16T23:59:00+09:00', '11월 16일'],
    ['the same UTC day, the day before in Korea', '2026-11-16T14:59:00Z', '11월 16일'],
  ])('a time at %s (%s), with now at 00:30 in Korea → %p', (_, at, time) => {
    const now = new Date('2026-11-17T00:30:00+09:00');
    expect(toNotices({ ...NONE, now, kept: [kept('n1', at)] })[0]?.time).toBe(time);
  });

  it("a kind the app does not know → shown with the invitation's icon", () => {
    const [row] = toNotices({ ...NONE, kept: [kept('n1', '2026-11-17T11:58:00+09:00', { kind: 'seat-ready' })] });
    expect(row?.icon).toBe('calendar');
    expect(row?.title).toBe('이서연님이 수락했어요');
  });

  it('a failed list of kept Notifications → the other rows alone', () => {
    const rows = toNotices({ ...NONE, invitations: [INVITATION], kept: null });
    expect(rows.map(({ key }) => key)).toEqual(['invitation-inv1']);
  });
});

describe('takesJoinRequests', () => {
  it.each([
    ['an Approval Quest the User leads', quest('q1'), true],
    ['an Open Quest the User leads', quest('q1', { joinPolicy: 'open' }), false],
    ['a Closed Quest the User leads', quest('q1', { joinPolicy: 'closed' }), false],
    ['an Approval Quest another leads', quest('q1', { leader: MIN_JUN }), false],
    ['a Class Quest', quest('q1', { classQuest: true, leader: null }), false],
  ])('%s → %s', (_, subject, expected) => {
    expect(takesJoinRequests(subject, ME.id)).toBe(expected);
  });
});
