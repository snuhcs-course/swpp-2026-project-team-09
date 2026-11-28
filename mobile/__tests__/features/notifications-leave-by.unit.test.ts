/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions of the time to leave in 알림: its row, and its title with the time to come, come and past, with a title
// ahead, none and null. Expected values: P05's time to leave and P06 ticket 39 (the title ahead is never shown).

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

// The Leader's time to leave at 12:18 in Korea on 17 November 2026.
const LEAVE_BY: KeptNotification = {
  id: 'leave-by:party:q1',
  kind: 'leave-by',
  title: '지금 나서요',
  ahead: '12:18 나설 시각',
  line: '학생회관식당까지 걸어서 15분',
  at: '2026-11-17T12:18:00+09:00',
  url: '/main?card=party:q1',
};

const onThatDay = (clock: string): Date => new Date(`2026-11-17T${clock}:00+09:00`);

describe('toNotices of the time to leave', () => {
  it("the Leader's time to leave → the clock's icon, its words, its Quest, the party's card, and its time", () => {
    expect(toNotices({ ...NONE, now: onThatDay('12:10'), kept: [LEAVE_BY] })).toEqual([
      {
        key: 'notice-leave-by:party:q1',
        kind: 'leave-by',
        icon: 'clock',
        title: '지금 나서요',
        sub: '학생회관식당까지 걸어서 15분',
        questId: 'q1',
        address: '/main?card=party:q1',
        time: '12:18',
        at: '2026-11-17T12:18:00+09:00',
        keptId: 'leave-by:party:q1',
      },
    ]);
  });

  it.each([
    // The main server lists it only once its time has come (P06 ticket 39): its title ahead is never shown.
    ['a time still to come, with now at 12:10', '지금 나서요', '12:10', LEAVE_BY],
    ['a time that has come, with now at 12:18', '지금 나서요', '12:18', LEAVE_BY],
    ['a time past, with now at 12:30', '지금 나서요', '12:30', LEAVE_BY],
    ['no title ahead, with now at 12:10', '지금 나서요', '12:10', { ...LEAVE_BY, ahead: undefined }],
    ['a title ahead of null, with now at 12:10', '지금 나서요', '12:10', { ...LEAVE_BY, ahead: null }],
  ])('%s → %p', (_, title, clock, notification) => {
    expect(toNotices({ ...NONE, now: onThatDay(clock), kept: [notification] })[0]?.title).toBe(title);
  });
});
