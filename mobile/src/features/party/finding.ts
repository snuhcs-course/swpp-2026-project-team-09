/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { Board, TimetableClass, Weekday } from '@/api/types';
import { koreaClock, koreaDaysAfter, koreaMinutes, koreaWeekday, koreaWeekdayName } from '@/korea-time';
import { boardName } from './boards';
import type { PostView } from './posts';

// 찾기's search and order, and the reasons 파티 모집글 gives for recommending a post.

function squeezed(words: string): string {
  return words.replaceAll(/\s/gu, '');
}

// Whether the post's title, text or place hold the words, spaces and every '#' left out.
export function matchesSearch(post: PostView, search: string): boolean {
  const words = squeezed(search).replaceAll('#', '');
  const where = squeezed(`${post.title}${post.description}${post.place}`);
  return words === '' || where.includes(words);
}

// 모집 중인 파티: the posts the User did not hide that match the search, in the order given.
export function findPosts(
  posts: readonly PostView[],
  { search, hidden }: { search: string; hidden: readonly string[] },
): PostView[] {
  return posts.filter((post) => !hidden.includes(post.questId) && matchesSearch(post, search));
}

// 찾기's filter: one board, or 전체.
export type BoardFilter = Board | 'all';

// The posts on the board, in the order given; 전체 keeps them all.
export function postsOnBoard(posts: readonly PostView[], board: BoardFilter): PostView[] {
  return posts.filter((post) => board === 'all' || post.board === board);
}

// What 찾기 says when nothing is left: "식사 게시판에 모집 중인 파티가 없어요" for a board, "결과 없음" for 전체 and a
// search.
export function noPostsWords(board: BoardFilter): string {
  return board === 'all' ? '결과 없음' : `${boardName(board)}에 모집 중인 파티가 없어요`;
}

export interface Reasons {
  time: string;
  // Null when no Friend is among the members.
  friend: string | null;
}

const WEEKDAYS: readonly Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function minutesOf(clock: string): number {
  const [hour = 0, minute = 0] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

// "오늘", "내일", or "목요일".
function dayWords(start: Date, today: Date): string {
  const days = koreaDaysAfter(today, start);
  if (days === 0) {
    return '오늘';
  }
  return days === 1 ? '내일' : `${koreaWeekdayName(start)}요일`;
}

// Whether the User's timetable leaves the post's time free: the class at that time, or the last one before it. Null
// classes are a timetable that could not be read.
export function timeReason(startsAt: string | null, classes: readonly TimetableClass[] | null, today: Date): string {
  if (startsAt === null) {
    return '아직 시간이 정해지지 않았어요.';
  }
  if (classes === null) {
    return '시간표를 불러오지 못했어요.';
  }
  const start = new Date(startsAt);
  const weekday = WEEKDAYS[koreaWeekday(start)];
  const minute = koreaMinutes(start);
  const clock = koreaClock(startsAt);
  const day = dayWords(start, today);
  const times = classes.flatMap(({ courseName, times: classTimes }) =>
    classTimes
      .filter((time) => time.weekday === weekday)
      .map(({ startTime, endTime }) => ({ courseName, startTime, endTime })),
  );
  const during = times.find(({ startTime, endTime }) => minutesOf(startTime) <= minute && minute < minutesOf(endTime));
  if (during !== undefined) {
    return `${day} ${clock}에는 ${during.courseName} 수업이 있어요.`;
  }
  const ended = times
    .map(({ endTime }) => endTime)
    .filter((endTime) => minutesOf(endTime) <= minute)
    .toSorted((one, other) => minutesOf(other) - minutesOf(one))[0];
  if (ended !== undefined) {
    return `${day} 수업이 ${ended}에 끝나서 ${clock}에 비어 있어요.`;
  }
  // A day with no Class at all, such as a Sunday, is free all day, not "until" the 파티's time.
  return times.length === 0 ? `${day}은 수업이 없는 날이에요.` : `${day}은 ${clock}까지 수업이 없어서 비어 있어요.`;
}

// "친구 최유나님이 모집했어요.", or the Friends who joined.
function friendReason({ leader, friends }: PostView): string | null {
  if (friends.length === 0) {
    return null;
  }
  return friends[0] === leader.name
    ? `친구 ${leader.name}님이 모집했어요.`
    : `친구 ${friends.join(', ')}님이 참여하고 있어요.`;
}

// 추천 이유: whether the User's timetable leaves the time free, and the Friends among the members.
export function reasonsFor(
  post: PostView,
  { classes, today }: { classes: readonly TimetableClass[] | null; today: Date },
): Reasons {
  return {
    time: timeReason(post.startsAt, classes, today),
    friend: friendReason(post),
  };
}
