/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ClassTime, Place, TimetableClass, Weekday } from '@/api/types';

// The hours the week on 내 정보 shows: from 09 to 18.
export const FIRST_HOUR = 9;
export const LAST_HOUR = 18;

const WEEKDAYS: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const DAY_LETTERS = ['월', '화', '수', '목', '금'] as const;

// One time of a class in the week on 내 정보.
export interface ClassBlockView {
  key: string;
  // 0 for Monday to 4 for Friday.
  day: number;
  // In hours of the day, held between 09 and 18: 10.5 for 10:30.
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

// The blocks of the week, Monday to Friday from 09 to 18. A time on Saturday or Sunday is not drawn, and neither are
// its hours outside 09–18.
export function toWeekBlocks(classes: readonly TimetableClass[], places: readonly Place[]): ClassBlockView[] {
  return classes.flatMap((lesson, order) =>
    lesson.times.flatMap((time) => {
      const day = WEEKDAYS.indexOf(time.weekday);
      const start = Math.max(hoursOf(time.startTime), FIRST_HOUR);
      const end = Math.min(hoursOf(time.endTime), LAST_HOUR);
      if (day < 0 || end <= start) {
        return [];
      }
      return [
        {
          key: time.id,
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
