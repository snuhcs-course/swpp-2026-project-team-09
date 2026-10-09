/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ClassSave, ClassTime, Place, TimetableClass, Weekday } from '@/api/types';

// The class form of the `TimetableClassForm` frame: one course name, a set of weekdays, one start and end, one Place
// and one room. The main server's class has one or more times; the form's is saved as one time per chosen weekday.

export const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'] as const;
const WEEK: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface ClassDraft {
  name: string;
  // 0 for Monday to 6 for Sunday.
  days: readonly number[];
  // "10:30", or "" before a time is chosen.
  start: string;
  end: string;
  place: Place | null;
  room: string;
}

export const EMPTY_DRAFT: ClassDraft = { name: '', days: [], start: '', end: '', place: null, room: '' };

// A class whose times differ in hours, Place or room opens with its first time's.
export function draftOf(lesson: TimetableClass, places: readonly Place[]): ClassDraft {
  const [first] = lesson.times;
  return {
    name: lesson.courseName,
    days: [...new Set(lesson.times.map(({ weekday }) => WEEK.indexOf(weekday)))],
    start: first?.startTime ?? '',
    end: first?.endTime ?? '',
    place: places.find(({ id }) => id === first?.placeId) ?? null,
    room: first?.room ?? '',
  };
}

export function endNotAfterStart({ start, end }: ClassDraft): boolean {
  return start !== '' && end !== '' && end <= start;
}

export function isReady(draft: ClassDraft): boolean {
  return (
    draft.name.trim() !== '' &&
    draft.days.length > 0 &&
    draft.start !== '' &&
    draft.end !== '' &&
    !endNotAfterStart(draft) &&
    draft.place !== null
  );
}

export function saveOf(draft: ClassDraft): ClassSave {
  const room = draft.room.trim();
  return {
    courseName: draft.name.trim(),
    times: draft.days
      .toSorted((one, other) => one - other)
      .flatMap((day) => {
        const weekday = WEEK[day];
        return weekday === undefined
          ? []
          : [
              {
                weekday,
                startTime: draft.start,
                endTime: draft.end,
                placeId: draft.place?.id ?? null,
                room: room === '' ? null : room,
              },
            ];
      }),
  };
}

// "월·수 10:30–12:00": the days of each set of hours, in the order of the week.
export function timesText(times: readonly ClassTime[]): string {
  const hours = new Map<string, string[]>();
  for (const { weekday, startTime, endTime } of times.toSorted(
    (one, other) => WEEK.indexOf(one.weekday) - WEEK.indexOf(other.weekday),
  )) {
    const key = `${startTime}–${endTime}`;
    hours.set(key, [...(hours.get(key) ?? []), DAY_NAMES[WEEK.indexOf(weekday)] ?? '']);
  }
  return [...hours].map(([key, days]) => `${days.join('·')} ${key}`).join(', ');
}

// "제1공학관 301동", or the name alone for a Place without a number.
export function placeText(place: Place): string {
  return place.number === null ? place.name : `${place.name} ${place.number}동`;
}

// "제1공학관 301동 118호" from the class's first time, or "장소 미정".
export function whereText(lesson: TimetableClass, places: readonly Place[]): string {
  const [first] = lesson.times;
  const place = places.find(({ id }) => id === first?.placeId);
  if (place === undefined) {
    return '장소 미정';
  }
  return first?.room === null || first?.room === undefined ? placeText(place) : `${placeText(place)} ${first.room}`;
}

// The main server's rule: the same weekday, each starting before the other ends; times that touch do not cross. One
// line for each other class the draft crosses, with the times it crosses.
export function crossingLines(draft: ClassDraft, classes: readonly TimetableClass[], ownId: string | null): string[] {
  if (draft.days.length === 0 || draft.start === '' || draft.end === '' || endNotAfterStart(draft)) {
    return [];
  }
  const weekdays = new Set(draft.days.map((day) => WEEK[day]));
  return classes.flatMap(({ id, courseName, times }) => {
    const crossed = times.filter(
      (time) => weekdays.has(time.weekday) && draft.start < time.endTime && time.startTime < draft.end,
    );
    return id === ownId || crossed.length === 0 ? [] : [`${courseName} (${timesText(crossed)})와 시간이 겹쳐요`];
  });
}

// The hour and the minute of "10:30", each "" before it is chosen.
export function hourOf(time: string): string {
  return time.split(':')[0] ?? '';
}

export function minuteOf(time: string): string {
  return time.split(':')[1] ?? '';
}

// As the frame: an hour without a minute takes 00, and no hour clears the time.
export function withHour(time: string, hour: string): string {
  return hour === '' ? '' : `${hour}:${minuteOf(time) || '00'}`;
}

export function withMinute(time: string, minute: string): string {
  if (time === '') {
    return minute === '' ? '' : `00:${minute}`;
  }
  return `${hourOf(time)}:${minute || '00'}`;
}
