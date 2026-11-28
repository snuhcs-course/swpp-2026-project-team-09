/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { axisHours, blockTimes, clock, dayOf, minutesOf, tidy, type Weekday, WEEKDAYS } from './labels.js';
import { type ModelAnswer } from './reading-model.js';

// P15-52: the code's half of reading a timetable screenshot. The model reports what is printed (reading-model.ts);
// this turns it into classes the way the phone's reader does, and leaves out, with the reason, every block that fails
// a check, rather than repairing it by a guess. Pure, so that it is tested on saved answers.

// A room as SNUTT and 에브리타임 print it: a building number and up to three more parts (`302-311-1`, `43-2-B101`,
// `500-L308`, `43-1`, `26-404`). The phone's reader uses the same (`block-text.ts`).
export const ROOM_PATTERN = /^\d{1,3}(?:-[A-Z]?\d{1,4}){0,3}$/u;
// The main server's limits on a class: its name's length and its times. A longer name is cut to it, as the phone's
// reader cuts it (`block-text.ts`): a timetable prints a long name cut with `…` anyway (P05 ticket 90).
export const NAME_LENGTH = 30;
// The most a block's text may be before it is left out unread: name lines, characters in one line or in the room. A
// block of an hour or so holds two or three short lines, one of three hours a long name over seven or eight (에브리타임,
// P05 ticket 90); the bounds keep a crafted answer from costing the server time.
export const MOST_NAME_LINES = 12;
export const LINE_LENGTH = 60;
// More blocks than a week of classes has; the rest are left out unread.
export const MOST_BLOCKS = 80;
export const MOST_TIMES = 10;
// The shortest slot an app draws.
const SHORTEST_MINUTES = 15;

export interface ReadTime {
  weekday: Weekday;
  // "13:00", 24-hour, on five minutes.
  start: string;
  end: string;
  // The room as printed, "302-311-1", or null.
  room: string | null;
}

export interface ReadClass {
  name: string;
  times: ReadTime[];
}

export type LeftOutReason =
  // The model saw the block's top or bottom hidden or faded.
  | 'cut'
  // Its day is not a weekday letter.
  | 'no-day'
  // A time is not "H:MM", or its hour is not on the axis.
  | 'time-unreadable'
  // Its start is not before its end, or it is shorter than a slot.
  | 'outside-day'
  // No name, or one without a letter or a digit.
  | 'no-name'
  // More name lines, or longer ones, than a block holds.
  | 'too-long'
  // The name is not its lines joined, with or without a space at each break.
  | 'name-unchecked'
  // One more time than a class may have, or a time crossing another of the same class.
  | 'too-many-times';

export interface LeftOut {
  weekday: Weekday | null;
  name: string;
  start: string | null;
  end: string | null;
  reason: LeftOutReason;
  // The numbers behind the reason, for the server's log alone, never with any words read ("name lines 14, at most
  // 12"): the route answers without it (P05 ticket 90).
  measure?: string;
}

export type TimetableReading =
  | { kind: 'read'; title: string | null; classes: ReadClass[]; leftOut: LeftOut[] }
  // No timetable: fewer than two hour labels, or labels that are not consecutive hours.
  | { kind: 'none' };

// Whether `name` is the lines joined with no space or one space at each break, and nothing else: each line in turn,
// exactly, then at most one space before the next. Linear in the name's length (P15-52 review: the earlier check made
// every joining, 2 to the number of breaks).
export function isJoining(name: string, lines: readonly string[]): boolean {
  const kept = lines.filter((line) => line !== '');
  let at = 0;
  for (const [index, line] of kept.entries()) {
    if (!name.startsWith(line, at)) {
      return false;
    }
    at += line.length;
    if (index < kept.length - 1 && name[at] === ' ') {
      at += 1;
    }
  }
  return kept.length > 0 && at === name.length;
}

// The name kept: the model's, once spaces are tidied, when it is its lines joined (`isJoining`); else null. The model
// decides where a break fell inside a word (it reads the words), and the code only checks that nothing was added,
// dropped or changed.
export function checkedName(name: string, lines: readonly string[]): string | null {
  const tidied = tidy(name);
  if (lines.length === 0) {
    return tidied === '' ? null : tidied;
  }
  return isJoining(
    tidied,
    lines.map((line) => tidy(line)),
  )
    ? tidied
    : null;
}

// The room as printed with spaces around its hyphens removed, when it is one; null for no room or text that is none.
export function checkedRoom(room: string | null): string | null {
  const tidied =
    room
      ?.normalize('NFC')
      .replaceAll(/\s*-\s*/gu, '-')
      .trim() ?? '';
  return ROOM_PATTERN.test(tidied) ? tidied : null;
}

function crosses(one: ReadTime, other: ReadTime): boolean {
  return one.weekday === other.weekday && one.start < other.end && other.start < one.end;
}

function compareTimes(one: ReadTime, other: ReadTime): number {
  return WEEKDAYS.indexOf(one.weekday) - WEEKDAYS.indexOf(other.weekday) || one.start.localeCompare(other.start);
}

type Block = ModelAnswer['blocks'][number];

// One block's time, name and room, or why it is left out.
// Whether a block's text is past the bounds a timetable block holds; it is then left out unread.
function tooLong(block: Block): boolean {
  const fields = [block.day, block.start, block.end, block.room ?? ''];
  return (
    block.nameLines.length > MOST_NAME_LINES ||
    block.nameLines.some((line) => line.length > LINE_LENGTH) ||
    block.name.length > LINE_LENGTH * MOST_NAME_LINES ||
    fields.some((field) => field.length > LINE_LENGTH)
  );
}

// A block left out unread, past the bounds, with how far.
function unread(weekday: Weekday | null, measure: string): LeftOut {
  return { weekday, name: '', start: null, end: null, reason: 'too-long', measure };
}

// A time its class cannot take: one past MOST_TIMES, or one crossing another of its times.
function oneTimeTooMany(name: string, time: ReadTime, times: readonly ReadTime[]): LeftOut {
  const crossing = times.some((other) => crosses(other, time));
  const measure = `times ${times.length + 1}, at most ${MOST_TIMES}; crosses another ${crossing}`;
  return { weekday: time.weekday, name, start: time.start, end: time.end, reason: 'too-many-times', measure };
}

// How far a block's text is past the bounds, in numbers alone.
function tooLongMeasure(block: Block): string {
  const longest = Math.max(0, ...block.nameLines.map((line) => line.length));
  const field = Math.max(...[block.day, block.start, block.end, block.room ?? ''].map((one) => one.length));
  return [
    `name lines ${block.nameLines.length}, at most ${MOST_NAME_LINES}`,
    `longest line ${longest}, at most ${LINE_LENGTH}`,
    `name ${block.name.length} characters, at most ${LINE_LENGTH * MOST_NAME_LINES}`,
    `longest day, time or room ${field}, at most ${LINE_LENGTH}`,
  ].join('; ');
}

function checkedBlock(
  block: Block,
  labels: readonly string[],
  hours: readonly number[],
): { name: string; time: ReadTime } | LeftOut {
  if (tooLong(block)) {
    return unread(dayOf(block.day.slice(0, LINE_LENGTH)), tooLongMeasure(block));
  }
  const weekday = dayOf(block.day);
  const name = checkedName(block.name, block.nameLines);
  const starts = minutesOf(block.start, labels, hours);
  const ends = minutesOf(block.end, labels, hours);
  const times = blockTimes(starts, ends);
  const start = times?.[0] ?? (starts.length === 1 ? (starts[0] ?? null) : null);
  const end = times?.[1] ?? (ends.length === 1 ? (ends[0] ?? null) : null);
  const leftOut = (reason: LeftOutReason, measure?: string): LeftOut => ({
    weekday,
    name: name ?? block.name.trim(),
    start: start === null ? null : clock(start),
    end: end === null ? null : clock(end),
    reason,
    ...(measure === undefined ? {} : { measure }),
  });
  if (block.cut) {
    return leftOut('cut');
  }
  if (weekday === null) {
    return leftOut('no-day');
  }
  if (starts.length === 0 || ends.length === 0) {
    return leftOut('time-unreadable');
  }
  if (times === null || start === null || end === null || end - start < SHORTEST_MINUTES) {
    const minutes = start === null || end === null ? 'unknown' : String(end - start);
    return leftOut('outside-day', `minutes ${minutes}, at least ${SHORTEST_MINUTES}`);
  }
  const lines = `name lines ${block.nameLines.length}, name ${Array.from(block.name.trim()).length} characters`;
  if (name === null) {
    return leftOut(block.name.trim() === '' ? 'no-name' : 'name-unchecked', lines);
  }
  if (!/[\p{L}\p{N}]/u.test(name)) {
    return leftOut('no-name', lines);
  }
  return { name, time: { weekday, start: clock(start), end: clock(end), room: checkedRoom(block.room) } };
}

const CUT_MARK = /\s*(?:…|\.{3})$/u;

// A name printed cut with `…` (SNUTT cuts a long name so) is the whole name it starts when exactly one name printed
// whole in the reading starts with it (`스튜디오…` beside `스튜디오 뮤직 메이킹`); with none or two (`물리…` beside
// 물리학 and 물리학실험) it is the part shown, without the mark. As the phone's reader does (`classes.ts`).
// A name without its spaces.
function bare(text: string): string {
  return text.replaceAll(/\s+/gu, '');
}

// A name as a class may have it: past NAME_LENGTH characters, its first ones without the `…` it was printed cut with.
export function fittedName(name: string): string {
  return Array.from(name).length <= NAME_LENGTH
    ? name
    : Array.from(name.replace(CUT_MARK, '')).slice(0, NAME_LENGTH).join('').trim();
}

export function completedNames(names: readonly string[]): string[] {
  const whole = names.filter((name) => !CUT_MARK.test(name));
  return names.map((name) => {
    if (!CUT_MARK.test(name)) {
      return name;
    }
    const shown = name.replace(CUT_MARK, '');
    const starts = [...new Set(whole.filter((other) => bare(other).startsWith(bare(shown))))];
    return starts.length === 1 && starts[0] !== undefined ? starts[0] : shown;
  });
}

// The classes of a model's answer: blocks whose names are exactly equal are one class, each time with its own room,
// in the order of the week. A time that would cross one of its class, or an eleventh, is left out.
export function checkedReading(answer: ModelAnswer): TimetableReading {
  const hours = axisHours(answer.axis);
  if (hours === null) {
    return { kind: 'none' };
  }
  const classes = new Map<string, ReadTime[]>();
  const leftOut: LeftOut[] = [];
  const read: { name: string; time: ReadTime }[] = [];
  for (const [index, block] of answer.blocks.entries()) {
    const outcome =
      index < MOST_BLOCKS
        ? checkedBlock(block, answer.axis, hours)
        : unread(null, `block ${index + 1}, at most ${MOST_BLOCKS}`);
    if ('reason' in outcome) {
      leftOut.push(outcome);
    } else {
      read.push(outcome);
    }
  }
  const names = completedNames(read.map(({ name }) => name));
  const named = read.map((one, index) => ({ name: fittedName(names[index] ?? one.name), time: one.time }));
  for (const { name, time } of named.toSorted((one, other) => compareTimes(one.time, other.time))) {
    const times = classes.get(name) ?? [];
    if (times.length >= MOST_TIMES || times.some((other) => crosses(other, time))) {
      leftOut.push(oneTimeTooMany(name, time, times));
      continue;
    }
    classes.set(name, [...times, time]);
  }
  const title = answer.title?.trim() ?? '';
  return {
    kind: 'read',
    title: title === '' ? null : title,
    classes: [...classes].map(([name, times]) => ({ name, times })),
    leftOut,
  };
}

// The left-out blocks as the route answers them: the numbers behind each reason are for the server's log alone.
export function servedLeftOut(leftOut: readonly LeftOut[]): LeftOut[] {
  return leftOut.map(({ weekday, name, start, end, reason }) => ({ weekday, name, start, end, reason }));
}
