/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ClassSave, ClassTime, Place, TimetableClass, Weekday } from '@/api/types';

// The class form of the `TimetableClassForm` frame: one course name and one or more time slots. A slot is a set of
// weekdays with one start and end, one Place and one room; a class whose hours or room differ by day takes a slot for
// each. A weekday belongs to one slot at most. The Place and the room are optional, as on the main server: a class
// read from a screenshot often has neither. The main server's class has one or more times; each slot is saved as one
// time per chosen weekday.

export const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'] as const;
const WEEK: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
// A slot for each weekday at most.
export const MOST_SLOTS = 7;
const ORDINALS = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째'] as const;

export interface SlotDraft {
  // 0 for Monday to 6 for Sunday.
  days: readonly number[];
  // "10:30", or "" before a time is chosen.
  start: string;
  end: string;
  place: Place | null;
  room: string;
  // A slot after the first takes the first slot's Place and room.
  same: boolean;
}

export interface ClassDraft {
  name: string;
  slots: readonly SlotDraft[];
}

export const EMPTY_SLOT: SlotDraft = { days: [], start: '', end: '', place: null, room: '', same: false };
export const EMPTY_DRAFT: ClassDraft = { name: '', slots: [EMPTY_SLOT] };

function dayText(days: readonly number[]): string {
  return days
    .toSorted((one, other) => one - other)
    .map((day) => DAY_NAMES[day] ?? '')
    .join('·');
}

// A class's times as slots: the times of the same hours, Place and room are one slot, in the order of the week. A
// slot after the first whose Place and room are the first's opens with `same` on.
export function draftOf(lesson: TimetableClass, places: readonly Place[]): ClassDraft {
  const slots: SlotDraft[] = [];
  const keys: string[] = [];
  for (const time of lesson.times.toSorted(
    (one, other) =>
      WEEK.indexOf(one.weekday) - WEEK.indexOf(other.weekday) || one.startTime.localeCompare(other.startTime),
  )) {
    const key = [time.startTime, time.endTime, time.placeId ?? '', time.room ?? ''].join('|');
    const index = keys.indexOf(key);
    const day = WEEK.indexOf(time.weekday);
    const held = slots[index];
    if (held === undefined) {
      keys.push(key);
      slots.push({
        days: [day],
        start: time.startTime,
        end: time.endTime,
        place: places.find(({ id }) => id === time.placeId) ?? null,
        room: time.room ?? '',
        same: false,
      });
    } else if (!held.days.includes(day)) {
      slots[index] = { ...held, days: [...held.days, day] };
    }
  }
  const [first] = slots;
  for (const slot of slots.slice(1)) {
    slot.same =
      first?.place !== null &&
      first?.place !== undefined &&
      slot.place?.id === first.place.id &&
      slot.room === first.room;
  }
  return { name: lesson.courseName, slots: first === undefined ? [EMPTY_SLOT] : slots };
}

export function endNotAfterStart({ start, end }: Pick<SlotDraft, 'start' | 'end'>): boolean {
  return start !== '' && end !== '' && end <= start;
}

function slotReady(slot: SlotDraft): boolean {
  return slot.days.length > 0 && slot.start !== '' && slot.end !== '' && !endNotAfterStart(slot);
}

export function isReady(draft: ClassDraft): boolean {
  return draft.name.trim() !== '' && draft.slots.length > 0 && draft.slots.every((slot) => slotReady(slot));
}

// A slot's name, as its card's header and its controls' labels read it: "월·수 10:30–12:00", the days alone before
// the hours are right, or "첫 번째 수업" before a day is chosen.
export function slotName(slot: SlotDraft, index: number): string {
  if (slot.days.length === 0) {
    return `${ORDINALS[index] ?? `${String(index + 1)}번째`} 수업`;
  }
  const hours = slot.start !== '' && slot.end !== '' && !endNotAfterStart(slot) ? ` ${slot.start}–${slot.end}` : '';
  return `${dayText(slot.days)}${hours}`;
}

// The days other slots hold, which this slot cannot take.
export function takenDays(draft: ClassDraft, index: number): number[] {
  return draft.slots.flatMap((slot, other) => (other === index ? [] : slot.days));
}

// The Place and the room a slot is saved with: the first slot's when it says `same`.
export function whereOf(draft: ClassDraft, index: number): Pick<SlotDraft, 'place' | 'room'> {
  const slot = draft.slots[index];
  const first = draft.slots[0];
  const from = index > 0 && slot?.same === true && first !== undefined ? first : slot;
  return { place: from?.place ?? null, room: from?.room ?? '' };
}

export function saveOf(draft: ClassDraft): ClassSave {
  const times = draft.slots.flatMap((slot, index) => {
    const where = whereOf(draft, index);
    const room = where.room.trim();
    return slot.days.flatMap((day) => {
      const weekday = WEEK[day];
      return weekday === undefined
        ? []
        : [
            {
              weekday,
              startTime: slot.start,
              endTime: slot.end,
              placeId: where.place?.id ?? null,
              room: room === '' ? null : room,
            },
          ];
    });
  });
  return {
    courseName: draft.name.trim(),
    times: times.toSorted(
      (one, other) =>
        WEEK.indexOf(one.weekday) - WEEK.indexOf(other.weekday) || one.startTime.localeCompare(other.startTime),
    ),
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

// "제1공학관 301동 118호" from the class's first time, the room alone without a Place, or "장소 미정".
export function whereText(lesson: TimetableClass, places: readonly Place[]): string {
  const [first] = lesson.times;
  const place = places.find(({ id }) => id === first?.placeId);
  if (place === undefined) {
    return first?.room ?? '장소 미정';
  }
  return first?.room === null || first?.room === undefined ? placeText(place) : `${placeText(place)} ${first.room}`;
}

// The main server's rule: the same weekday, each starting before the other ends; times that touch do not cross. One
// line for each other class the draft's slots cross, with the times it crosses.
export function crossingLines(draft: ClassDraft, classes: readonly TimetableClass[], ownId: string | null): string[] {
  const slots = draft.slots.filter((slot) => slotReady(slot));
  return classes.flatMap(({ id, courseName, times }) => {
    const crossed = times.filter((time) =>
      slots.some(
        (slot) =>
          slot.days.some((day) => WEEK[day] === time.weekday) && slot.start < time.endTime && time.startTime < slot.end,
      ),
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
