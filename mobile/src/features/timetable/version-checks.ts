/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import type { ClassSave } from '@/api/types';

// The main server's rules for a class (`main-server/README.md`, "Timetable"), checked on the phone before a new
// version's classes reach it, and its refusals that no retry changes.

const MOST_CLASSES = 15;
const MOST_TIMES = 10;
const NAME_LENGTH = 30;
const ROOM_LENGTH = 20;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

type Time = ClassSave['times'][number];

// What a check left out: whole classes, and times of classes that were kept.
export interface Dropped {
  classes: number;
  times: number;
}

function validTime({ startTime, endTime }: Time): boolean {
  return CLOCK.test(startTime) && CLOCK.test(endTime) && startTime < endTime;
}

function crosses(one: Time, other: Time): boolean {
  return one.weekday === other.weekday && one.startTime < other.endTime && other.startTime < one.endTime;
}

// A class's times that the main server takes: valid, with a room of at most 20 characters or none, not crossing an
// earlier one on the same weekday, at most 10.
function keptTimes(times: readonly Time[]): Time[] {
  const kept: Time[] = [];
  for (const time of times) {
    const room = time.room?.trim() ?? '';
    const cleaned = { ...time, room: room === '' ? null : room };
    if (
      kept.length < MOST_TIMES &&
      validTime(cleaned) &&
      room.length <= ROOM_LENGTH &&
      !kept.some((other) => crosses(other, cleaned))
    ) {
      kept.push(cleaned);
    }
  }
  return kept;
}

// The classes the main server takes, at most 15, each named in 1 to 30 characters with at least one time. The rest is
// left out, and counted, rather than refused, so that an import keeps what it can.
export function checkedClasses(classes: readonly ClassSave[]): { classes: ClassSave[]; dropped: Dropped } {
  const kept: ClassSave[] = [];
  const dropped: Dropped = { classes: 0, times: 0 };
  for (const lesson of classes) {
    const courseName = lesson.courseName.trim();
    const times = keptTimes(lesson.times);
    if (kept.length >= MOST_CLASSES || courseName === '' || courseName.length > NAME_LENGTH || times.length === 0) {
      dropped.classes += 1;
    } else {
      dropped.times += lesson.times.length - times.length;
      kept.push({ courseName, times });
    }
  }
  return { classes: kept, dropped };
}

// A refusal of one class that sending it again does not change: any 4xx but 401 (the sign-in handles it), 408 and 429.
export function refusedForGood(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401, 408, 429].includes(error.status)
  );
}
