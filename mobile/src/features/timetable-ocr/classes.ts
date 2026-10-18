/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ClassSave, Weekday } from '@/api/types';

// ⑤ One class with several times, and the pipeline's output.

export interface ReadTime {
  weekday: Weekday;
  // "10:00", Korea's time as the screenshot shows it.
  start: string;
  end: string;
  // "311-1", the part after the building, or null.
  room: string | null;
  placeId: string | null;
}

export interface ReadClass {
  name: string;
  times: ReadTime[];
}

const WEEK: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
// The main server's limit on a class's times.
const MOST_TIMES = 10;

export function compareTimes(one: ReadTime, other: ReadTime): number {
  return WEEK.indexOf(one.weekday) - WEEK.indexOf(other.weekday) || one.start.localeCompare(other.start);
}

function crosses(one: ReadTime, other: ReadTime): boolean {
  return one.weekday === other.weekday && one.start < other.end && other.start < one.end;
}

// A name read short, its last syllables wrapped to a line that was not read ("컴퓨터프로그래" for 컴퓨터프로그래밍), is
// the same class as the whole name when the short one has at least this many characters.
export const SHORT_NAME = 6;

function sameName(one: string, other: string): boolean {
  const [shorter, longer] = one.length <= other.length ? [one, other] : [other, one];
  return shorter === longer || (Array.from(shorter).length >= SHORT_NAME && longer.startsWith(shorter));
}

// Blocks whose names are the same once spaces are removed become one class with a time per block, in the order of
// the week; a name read short joins its whole name, which the class keeps. A time that would cross one already in
// the class (same day) starts another class of the same name, since the server refuses a class whose own times
// cross; so does an eleventh time.
export function mergeClasses(blocks: readonly { name: string; time: ReadTime }[]): ReadClass[] {
  const sorted = blocks.toSorted((one, other) => compareTimes(one.time, other.time));
  const classes: { key: string; value: ReadClass }[] = [];
  for (const { name, time } of sorted) {
    const key = name.replaceAll(/\s+/gu, '');
    const home = classes.find(
      (candidate) =>
        sameName(candidate.key, key) &&
        candidate.value.times.length < MOST_TIMES &&
        !candidate.value.times.some((other) => crosses(other, time)),
    );
    if (home === undefined) {
      classes.push({ key, value: { name, times: [time] } });
    } else {
      home.value.times.push(time);
      if (key.length > home.key.length) {
        home.key = key;
        home.value.name = name;
      }
    }
  }
  return classes.map(({ value }) => value);
}

// The classes as the main server takes them: P13-03's `checkedClasses` reads these.
export function classSaves(classes: readonly ReadClass[]): ClassSave[] {
  return classes.map((lesson) => ({
    courseName: lesson.name,
    times: lesson.times.map((time) => ({
      weekday: time.weekday,
      startTime: time.start,
      endTime: time.end,
      placeId: time.placeId,
      room: time.room,
    })),
  }));
}
