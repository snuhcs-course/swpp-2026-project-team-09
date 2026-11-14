/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: a new match of a watched interest for an event and for a recruiting party. Expected values: P05 ticket
// 08 and main-server's README, Interests (the Notification of a new match).

import type { KeptNotification } from '@/api/waiting-types';
import { type NoticeSources, toNotices } from '@/features/notifications/adapter';

const NONE: NoticeSources = {
  parties: [],
  friendRequests: null,
  invitations: [],
  joinRequests: [],
  kept: [],
  now: new Date('2026-11-17T13:00:00+09:00'),
};

// A job fair that matches the User's watched interest "채용", published at 09:00 on 17 November 2026.
const MATCH: KeptNotification = {
  id: 'interest-new:event:e1',
  kind: 'interest-new',
  title: '채용박람회가 떴어요',
  line: '10:00 문화관',
  at: '2026-11-17T09:00:00+09:00',
  url: '/main?card=event:e1',
};

describe('toNotices of a new match of a watched interest', () => {
  it("an event's → the calendar, its words, the event's card, and its time", () => {
    expect(toNotices({ ...NONE, kept: [MATCH] })).toEqual([
      {
        key: 'notice-interest-new:event:e1',
        kind: 'interest-new',
        icon: 'calendar',
        title: '채용박람회가 떴어요',
        sub: '10:00 문화관',
        questId: null,
        address: '/main?card=event:e1',
        time: '09:00',
      },
    ]);
  });

  it("a recruiting party's → the people's icon", () => {
    const recruiting = { ...MATCH, title: '배드민턴 모임 모집이 떴어요', url: '/main?card=party:q7' };
    expect(toNotices({ ...NONE, kept: [recruiting] })[0]).toMatchObject({ kind: 'interest-new', icon: 'users' });
  });
});
