/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ClassSave, TimetableClass } from '@/api/types';
import { koreaCalendar, koreaYear } from '@/korea-time';

// The pure parts of the timetable versions.

// The semester of the day, which names the first version: `{year}-1학기` from March to August, `{year}-2학기` from
// September to February, January and February counting as the year before.
export function semesterName(at: Date): string {
  const year = koreaYear(at);
  const { month } = koreaCalendar(at);
  if (month >= 3 && month <= 8) {
    return `${year}-1학기`;
  }
  return `${month >= 9 ? year : year - 1}-2학기`;
}

export function saveOf({ courseName, times }: TimetableClass): ClassSave {
  return {
    courseName,
    times: times.map(({ weekday, startTime, endTime, placeId, room }) => ({
      weekday,
      startTime,
      endTime,
      placeId,
      room,
    })),
  };
}

function timeOf({ weekday, startTime, endTime, placeId, room }: ClassSave['times'][number]): string {
  return [weekday, startTime, endTime, placeId ?? '', room ?? ''].join(' ');
}

// `새 시간표 N` with the smallest N from 1 that no version's name already uses.
export function newVersionName(names: readonly string[]): string {
  const taken = new Set(names);
  let number = 1;
  while (taken.has(`새 시간표 ${number}`)) {
    number += 1;
  }
  return `새 시간표 ${number}`;
}

// The same for the same classes in any order, whatever their ids.
export function fingerprint(classes: readonly ClassSave[]): string {
  const lessons = classes.map(({ courseName, times }) =>
    [courseName, ...times.map((time) => timeOf(time)).toSorted()].join('|'),
  );
  return JSON.stringify(lessons.toSorted());
}
