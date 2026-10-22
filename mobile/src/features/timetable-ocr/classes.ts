/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
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
// the same class as the whole name when the short one has at least this many characters and shows a sign of being
// cut (`looksCut`). A whole name that is the start of another, as a course and its `연습` section, stays apart.
export const SHORT_NAME = 6;

export interface NamedTime {
  name: string;
  time: ReadTime;
  // Whether the block's name shows a sign of being cut short.
  cut?: boolean;
  // Whether the name was printed cut, with `…`.
  marked?: boolean;
}

interface Building {
  key: string;
  cut: boolean;
  value: ReadClass;
}

// Whether a block of `key` belongs with a class: the same name, or one of the two a name cut short whose whole name
// is the other. Its time must not cross one of the class's (same day), nor make an eleventh.
function belongs(candidate: Building, key: string, cut: boolean, time: ReadTime): boolean {
  const [shorter, longer, shorterCut] =
    candidate.key.length <= key.length ? [candidate.key, key, candidate.cut] : [key, candidate.key, cut];
  const same =
    shorter === longer || (shorterCut && Array.from(shorter).length >= SHORT_NAME && longer.startsWith(shorter));
  return (
    same && candidate.value.times.length < MOST_TIMES && !candidate.value.times.some((other) => crosses(other, time))
  );
}

// A name printed cut with `…` is the whole name it starts when exactly one whole name in the timetable starts with it
// (`스튜디오…` and `스튜디오 뮤직 메이킹`); with two or none (`물리…` beside 물리학 and 물리학실험) it stays as read.
function completeMarked(blocks: readonly NamedTime[]): NamedTime[] {
  const whole = new Map<string, string>();
  for (const block of blocks) {
    if (block.marked !== true) {
      whole.set(block.name.replaceAll(/\s+/gu, ''), block.name);
    }
  }
  return blocks.map((block) => {
    const key = block.name.replaceAll(/\s+/gu, '');
    const starts = [...whole.keys()].filter((name) => name !== key && name.startsWith(key));
    const [only] = starts;
    return block.marked === true && starts.length === 1 && only !== undefined
      ? { ...block, name: whole.get(only) ?? block.name, marked: false }
      : block;
  });
}

// Blocks whose names are the same once spaces are removed become one class with a time per block, in the order of
// the week; a name cut short joins its whole name, which the class keeps. A time that would cross one already in the
// class (same day) starts another class of the same name, since the server refuses a class whose own times cross;
// so does an eleventh time.
export function mergeClasses(blocks: readonly NamedTime[]): ReadClass[] {
  const sorted = completeMarked(blocks).toSorted((one, other) => compareTimes(one.time, other.time));
  const classes: Building[] = [];
  for (const { name, time, cut = false } of sorted) {
    const key = name.replaceAll(/\s+/gu, '');
    const home = classes.find((candidate) => belongs(candidate, key, cut, time));
    if (home === undefined) {
      classes.push({ key, cut, value: { name, times: [time] } });
    } else {
      home.value.times.push(time);
      if (key.length > home.key.length) {
        home.key = key;
        home.cut = cut;
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
