/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: what a party's members would have said, for the room has no chat: a step changed, a member arrived, a
// member late. Expected values: P15 ticket 62 and main-server's README, Notifications.

import type { KeptNotification } from '@/api/waiting-types';
import { type NoticeSources, toNotices } from '@/features/notifications/adapter';

const NONE: NoticeSources = {
  parties: [],
  friendRequests: null,
  invitations: [],
  joinRequests: [],
  kept: [],
  now: new Date('2026-11-19T14:00:00+09:00'),
};

// 민수 is 5 minutes late for 저녁 같이, told at 13:58 on 19 November 2026.
const LATE: KeptNotification = {
  id: 'late:party:q1:u2',
  kind: 'late',
  title: '민수가 5분 늦어요',
  line: '14:05 도착 · 저녁 같이',
  at: '2026-11-19T13:58:00+09:00',
  url: '/main?card=party:q1',
};

describe('toNotices of what a party’s members would have said', () => {
  it('a member late → the clock, its words, the party’s card, and its time', () => {
    expect(toNotices({ ...NONE, kept: [LATE] })).toEqual([
      {
        key: 'notice-late:party:q1:u2',
        kind: 'late',
        icon: 'clock',
        title: '민수가 5분 늦어요',
        sub: '14:05 도착 · 저녁 같이',
        questId: null,
        address: '/main?card=party:q1',
        time: '13:58',
      },
    ]);
  });

  it.each([
    ['step-changed', 'calendar'],
    ['arrived', 'pin'],
  ])('a party’s %s → its own kind with the %s icon', (kind, icon) => {
    const [row] = toNotices({ ...NONE, kept: [{ ...LATE, kind }] });
    expect(row).toMatchObject({ kind, icon, address: '/main?card=party:q1' });
  });
});
