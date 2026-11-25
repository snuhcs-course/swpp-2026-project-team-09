/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ClassTime, Place, TimetableClass, Weekday } from '@/api/types';

// The hours the week on 내 정보 shows at least: from 09:00 to 22:00, its rows labelled "09" to "21". A class outside
// them widens the week (see `weekHours`).
export const FIRST_HOUR = 9;
export const LAST_HOUR = 22;

const WEEKDAYS: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DAY_LETTERS = ['월', '화', '수', '목', '금', '토', '일'] as const;
// 월 to 금 always; 토 and 일 only for a class on them.
const WORKDAYS = 5;

// One time of a class in the week on 내 정보.
export interface ClassBlockView {
  key: string;
  // A class that meets on two days has two blocks with one `classId`.
  classId: string;
  // 0 for Monday to 6 for Sunday.
  day: number;
  // In hours of the day: 10.5 for 10:30.
  start: number;
  end: number;
  // "운영체제"
  name: string;
  // "301-118": the Place's number and the room without 호; "301동" without a room; "118호" without a number; or "".
  where: string;
  // "10:30–12:00"
  time: string;
  // The class's place in the timetable, which gives its colour.
  order: number;
}

function hoursOf(clock: string): number {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours + minutes / 60;
}

function whereOf(time: ClassTime, places: readonly Place[]): string {
  const number = places.find(({ id }) => id === time.placeId)?.number ?? null;
  const { room } = time;
  if (number !== null && room !== null) {
    return `${number}-${room.replace(/호$/u, '')}`;
  }
  return number === null ? (room ?? '') : `${number}동`;
}

// The blocks of the week, Monday to Sunday, each whole.
export function toWeekBlocks(classes: readonly TimetableClass[], places: readonly Place[]): ClassBlockView[] {
  return classes.flatMap((lesson, order) =>
    lesson.times.flatMap((time) => {
      const day = WEEKDAYS.indexOf(time.weekday);
      const start = hoursOf(time.startTime);
      const end = hoursOf(time.endTime);
      // The main server keeps only times that end after they start on the same day (00:00 to 23:59), so a time
      // across midnight cannot come; one that did would be left out rather than drawn wrong.
      if (day < 0 || end <= start) {
        return [];
      }
      return [
        {
          key: time.id,
          classId: lesson.id,
          day,
          start,
          end,
          name: lesson.courseName,
          where: whereOf(time, places),
          time: `${time.startTime}–${time.endTime}`,
          order,
        },
      ];
    }),
  );
}

// The whole hours the week shows: 09 to 22, widened to the hour before the earliest block and after the latest, so
// that every block is drawn whole.
export function weekHours(blocks: readonly ClassBlockView[]): { first: number; last: number } {
  const first = Math.min(FIRST_HOUR, ...blocks.map(({ start }) => Math.floor(start)));
  const last = Math.max(LAST_HOUR, ...blocks.map(({ end }) => Math.ceil(end)));
  return { first: Math.max(0, first), last: Math.min(24, last) };
}

// How many days the week shows: 월 to 금, to 토 for a class on Saturday, and to 일 for one on Sunday.
export function weekDays(blocks: readonly ClassBlockView[]): number {
  return Math.max(WORKDAYS, ...blocks.map(({ day }) => day + 1));
}
