/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type {
  ServerLeftOut,
  ServerReadClass,
  ServerReadTime,
  ServerTimetableReading,
} from '@/api/timetable-reading-types';
import type { Weekday } from '@/api/types';
import { isText, isTextOrNull } from './answers';
import { call } from './http';

// P15-52: the main server reads a timetable screenshot (`POST /timetable/readings`). Every field is checked, since the
// import saves what it reads; an answer of another shape is no answer, and the phone reads the picture itself.

const WEEKDAYS = new Set<unknown>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const CLOCK = /^\d{2}:\d{2}$/u;

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
}

function isWeekday(value: unknown): value is Weekday {
  return WEEKDAYS.has(value);
}

function isClock(value: unknown): value is string {
  return typeof value === 'string' && CLOCK.test(value);
}

function isClockOrNull(value: unknown): value is string | null {
  return value === null || isClock(value);
}

function isReadTime(value: unknown): value is ServerReadTime {
  return (
    isWeekday(field(value, 'weekday')) &&
    isClock(field(value, 'start')) &&
    isClock(field(value, 'end')) &&
    isTextOrNull(field(value, 'room'))
  );
}

function isReadClass(value: unknown): value is ServerReadClass {
  const times = field(value, 'times');
  return isText(field(value, 'name')) && Array.isArray(times) && times.every((time) => isReadTime(time));
}

function isLeftOut(value: unknown): value is ServerLeftOut {
  const weekday = field(value, 'weekday');
  return (
    (weekday === null || isWeekday(weekday)) &&
    isText(field(value, 'name')) &&
    isClockOrNull(field(value, 'start')) &&
    isClockOrNull(field(value, 'end')) &&
    isText(field(value, 'reason'))
  );
}

// `usedGrid` is a boolean, or absent from a server before it was added.
function isUsedGrid(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

export function isTimetableReading(value: unknown): value is ServerTimetableReading {
  const kind = field(value, 'kind');
  if (kind === 'none') {
    return true;
  }
  const classes = field(value, 'classes');
  const leftOut = field(value, 'leftOut');
  return (
    kind === 'read' &&
    isTextOrNull(field(value, 'title')) &&
    isUsedGrid(field(value, 'usedGrid')) &&
    Array.isArray(classes) &&
    classes.every((lesson) => isReadClass(lesson)) &&
    Array.isArray(leftOut) &&
    leftOut.every((out) => isLeftOut(out))
  );
}

export const timetableReadingClient: Pick<ApiClient, 'readTimetableImage'> = {
  readTimetableImage: (image, grid) =>
    call('POST', '/timetable/readings', isTimetableReading, { body: { image, grid } }),
};
