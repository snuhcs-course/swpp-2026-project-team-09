/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { Quest, TimetableClass, Weekday } from '@/api/types';
import type { KeptNotification } from '@/api/waiting-types';
import { ACCEPTED, DINNER, ME_ID } from './server';

// 오늘's day (A04 ticket 10), on Tuesday 6 October 2026 at 13:00 in Korea, as the main server and the timetable give it.

// A Quest of the User's alone on the day of `start` and `end`, in Korea's time.
function quest(id: string, title: string, start: string, end: string, more: Partial<Quest> = {}): Quest {
  const [subQuest] = DINNER.subQuests;
  if (subQuest === undefined) {
    throw new Error('DINNER has a Sub Quest');
  }
  return {
    ...DINNER,
    id,
    title,
    subQuests: [{ ...subQuest, id: `${id}-step`, title, startsAt: start, endsAt: end }],
    ...more,
  };
}

const ME = { id: ME_ID, name: '홍길동', department: '컴퓨터공학부' };

// Today's class still to come, a Class Quest; the main server sends no class over or of tomorrow (the timetable does).
export const CLASS_LATER = quest('q-class', '알고리즘', '2026-10-06T15:00:00+09:00', '2026-10-06T16:15:00+09:00', {
  classQuest: true,
  holders: [ME],
  joinPolicy: 'closed',
});

function lesson(id: string, courseName: string, weekday: Weekday, startTime: string, endTime: string): TimetableClass {
  return {
    id,
    courseName,
    times: [{ id: `${id}-1`, weekday, startTime, endTime, placeId: null, room: null }],
    overlaps: [],
  };
}

// Two classes over by 13:00 on Tuesday, the one to come, and one on Wednesday.
export const TIMETABLE: TimetableClass[] = [
  lesson('c1', '선형대수', 'tuesday', '09:00', '10:00'),
  lesson('c2', '자료구조', 'tuesday', '11:00', '12:15'),
  lesson('c3', '알고리즘', 'tuesday', '15:00', '16:15'),
  lesson('c4', '운영체제', 'wednesday', '10:00', '11:15'),
];
export const TOMORROW_PARTY = quest('q-party-2', '보드게임', '2026-10-07T18:30:00+09:00', '2026-10-07T20:00:00+09:00');

// Seven kept Notifications, a minute apart, the newest at 12:58.
export const KEPT: KeptNotification[] = Array.from({ length: 7 }, (_, index) => ({
  ...ACCEPTED,
  id: `n${String(index)}`,
  // Not "알림 N", which 알림's own title with its count reads.
  title: `소식 ${String(index + 1)}`,
  at: `2026-10-06T12:${String(52 + index)}:00+09:00`,
  read: true,
}));
